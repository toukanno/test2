const EventEmitter = require('events');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('workflow-engine');

/**
 * Workflow step definitions for video generation pipeline
 */
const WORKFLOW_STEPS = [
  { id: 'script_generation', name: '台本生成', order: 1 },
  { id: 'scene_planning', name: 'シーン分割', order: 2 },
  { id: 'image_generation', name: '画像生成', order: 3 },
  { id: 'voice_generation', name: '音声生成', order: 4 },
  { id: 'subtitle_generation', name: '字幕生成', order: 5 },
  { id: 'video_rendering', name: '動画結合', order: 6 },
  { id: 'metadata_generation', name: 'メタデータ生成', order: 7 },
];

class WorkflowEngine extends EventEmitter {
  constructor(modules) {
    super();
    this.modules = modules;
    this.activeWorkflows = new Map();
  }

  /**
   * Get workflow step definitions
   */
  static getSteps() {
    return WORKFLOW_STEPS;
  }

  /**
   * Start the full workflow for a project
   * @param {string} projectId
   */
  async startWorkflow(projectId) {
    const project = this.modules.projectRepo.get(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const workflow = {
      projectId,
      status: 'running',
      currentStep: null,
      steps: WORKFLOW_STEPS.map((s) => ({
        ...s,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        error: null,
      })),
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    this.activeWorkflows.set(projectId, workflow);
    this.modules.projectRepo.update(projectId, { status: 'processing' });

    // Run workflow steps sequentially
    this._executeWorkflow(projectId).catch((err) => {
      logger.error(`Workflow failed for project ${projectId}`, err);
    });

    return workflow;
  }

  /**
   * Execute workflow steps sequentially
   */
  async _executeWorkflow(projectId) {
    const workflow = this.activeWorkflows.get(projectId);
    if (!workflow) return;

    for (const step of workflow.steps) {
      try {
        step.status = 'running';
        step.startedAt = new Date().toISOString();
        workflow.currentStep = step.id;

        this.emit('progress', {
          projectId,
          step: step.id,
          stepName: step.name,
          status: 'running',
          overallProgress: this._calculateProgress(workflow),
        });

        logger.info(`Running step: ${step.name} for project ${projectId}`);
        await this._executeStep(projectId, step.id);

        step.status = 'completed';
        step.completedAt = new Date().toISOString();

        this.emit('stepComplete', {
          projectId,
          step: step.id,
          stepName: step.name,
          overallProgress: this._calculateProgress(workflow),
        });
      } catch (err) {
        step.status = 'failed';
        step.error = err.message;
        workflow.status = 'failed';

        logger.error(`Step ${step.name} failed: ${err.message}`);

        this.emit('error', {
          projectId,
          step: step.id,
          stepName: step.name,
          error: err.message,
        });

        // Save partial results
        this.modules.projectRepo.update(projectId, {
          status: 'failed',
          failedStep: step.id,
        });

        return; // Stop workflow on failure
      }
    }

    workflow.status = 'completed';
    workflow.completedAt = new Date().toISOString();
    this.modules.projectRepo.update(projectId, { status: 'ready_for_review' });

    this.emit('progress', {
      projectId,
      step: 'complete',
      stepName: '完了',
      status: 'completed',
      overallProgress: 100,
    });

    // Clean up completed workflow from memory
    this.activeWorkflows.delete(projectId);
    logger.info(`Workflow completed for project ${projectId}`);
  }

  /**
   * Execute a single workflow step
   */
  async _executeStep(projectId, stepId) {
    const project = this.modules.projectRepo.get(projectId);

    switch (stepId) {
      case 'script_generation': {
        const result = await this.modules.scriptGen.generate({
          theme: project.theme,
          duration: project.duration,
          tone: project.tone,
          targetAudience: project.targetAudience,
          language: project.language,
        });
        this.modules.projectRepo.updateScript(projectId, result);
        break;
      }

      case 'scene_planning': {
        const script = this.modules.projectRepo.getScript(projectId);
        const scenes = this.modules.scenePlanner.splitScenes(script);
        this.modules.projectRepo.saveScenes(projectId, scenes);
        break;
      }

      case 'image_generation': {
        const scenes = this.modules.projectRepo.getScenes(projectId);
        for (const scene of scenes) {
          if (scene.imageStatus !== 'generated' && scene.imageStatus !== 'imported') {
            try {
              const result = await this.modules.imageGen.generate(scene);
              this.modules.projectRepo.updateScene(scene.id, {
                imagePath: result.filePath,
                imageStatus: 'generated',
              });
            } catch (err) {
              logger.error(`Image generation failed for scene ${scene.sceneNumber}: ${err.message}`);
              // Use placeholder - don't fail entire workflow
              const placeholder = this.modules.imageGen.createPlaceholder(scene);
              this.modules.projectRepo.updateScene(scene.id, {
                imagePath: placeholder.filePath,
                imageStatus: 'placeholder',
              });
            }
          }
        }
        break;
      }

      case 'voice_generation': {
        const scenes = this.modules.projectRepo.getScenes(projectId);
        for (const scene of scenes) {
          if (scene.audioStatus !== 'generated' && scene.audioStatus !== 'imported') {
            if (scene.narration && scene.narration.trim()) {
              const result = await this.modules.voiceGen.generate(scene.narration, scene.id);
              this.modules.projectRepo.updateScene(scene.id, {
                audioPath: result.filePath,
                audioStatus: 'generated',
              });
            }
          }
        }
        break;
      }

      case 'subtitle_generation': {
        const scenes = this.modules.projectRepo.getScenes(projectId);
        const storagePath = this.modules.imageGen.storagePath;
        const path = require('path');
        const srtPath = path.join(storagePath, 'outputs', projectId, 'subtitles.srt');
        this.modules.subtitleGen.generateSRT(scenes, srtPath);
        break;
      }

      case 'video_rendering': {
        const scenes = this.modules.projectRepo.getScenes(projectId);
        const result = await this.modules.videoGen.render(project, scenes, (progress) => {
          this.emit('progress', {
            projectId,
            step: 'video_rendering',
            stepName: '動画結合',
            status: 'running',
            renderProgress: progress,
            overallProgress: this._calculateProgress(this.activeWorkflows.get(projectId)),
          });
        });
        this.modules.projectRepo.update(projectId, { outputPath: result.outputPath });
        break;
      }

      case 'metadata_generation': {
        const script = this.modules.projectRepo.getScript(projectId);
        const meta = await this.modules.scriptGen.generateYouTubeMeta(project, script);
        this.modules.projectRepo.update(projectId, { youtubeMeta: JSON.stringify(meta) });
        break;
      }

      default:
        throw new Error(`Unknown step: ${stepId}`);
    }
  }

  /**
   * Retry a specific failed step
   */
  async retryStep(projectId, stepId) {
    const workflow = this.activeWorkflows.get(projectId);
    if (!workflow) throw new Error('No active workflow found');

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    step.status = 'pending';
    step.error = null;
    workflow.status = 'running';

    try {
      step.status = 'running';
      step.startedAt = new Date().toISOString();
      await this._executeStep(projectId, stepId);
      step.status = 'completed';
      step.completedAt = new Date().toISOString();

      this.emit('stepComplete', { projectId, step: stepId });

      // Continue with remaining steps
      const stepIndex = workflow.steps.findIndex((s) => s.id === stepId);
      const remainingSteps = workflow.steps.slice(stepIndex + 1).filter((s) => s.status !== 'completed');

      for (const nextStep of remainingSteps) {
        await this._executeStep(projectId, nextStep.id);
        nextStep.status = 'completed';
        nextStep.completedAt = new Date().toISOString();
        this.emit('stepComplete', { projectId, step: nextStep.id });
      }

      workflow.status = 'completed';
      this.modules.projectRepo.update(projectId, { status: 'ready_for_review' });
    } catch (err) {
      step.status = 'failed';
      step.error = err.message;
      workflow.status = 'failed';
      this.emit('error', { projectId, step: stepId, error: err.message });
    }
  }

  /**
   * Get current workflow status
   */
  getStatus(projectId) {
    return this.activeWorkflows.get(projectId) || null;
  }

  /**
   * Calculate overall progress percentage
   */
  _calculateProgress(workflow) {
    if (!workflow) return 0;
    const completed = workflow.steps.filter((s) => s.status === 'completed').length;
    return Math.round((completed / workflow.steps.length) * 100);
  }
}

module.exports = { WorkflowEngine, WORKFLOW_STEPS };
