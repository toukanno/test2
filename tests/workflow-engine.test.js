import { describe, expect, it, vi, beforeEach } from 'vitest';

const { WorkflowEngine, WORKFLOW_STEPS } = require('../app/modules/workflow-engine/index.js');

describe('WorkflowEngine', () => {
  describe('WORKFLOW_STEPS', () => {
    it('has 7 steps', () => {
      expect(WORKFLOW_STEPS).toHaveLength(7);
    });

    it('steps are in correct order', () => {
      const ids = WORKFLOW_STEPS.map((s) => s.id);
      expect(ids).toEqual([
        'script_generation',
        'scene_planning',
        'image_generation',
        'voice_generation',
        'subtitle_generation',
        'video_rendering',
        'metadata_generation',
      ]);
    });

    it('each step has id, name, and order', () => {
      for (const step of WORKFLOW_STEPS) {
        expect(step.id).toBeTruthy();
        expect(step.name).toBeTruthy();
        expect(typeof step.order).toBe('number');
      }
    });
  });

  describe('getSteps', () => {
    it('returns WORKFLOW_STEPS', () => {
      expect(WorkflowEngine.getSteps()).toBe(WORKFLOW_STEPS);
    });
  });

  describe('getStatus', () => {
    it('returns null when no workflow is active', () => {
      const engine = new WorkflowEngine({});
      expect(engine.getStatus('unknown-id')).toBeNull();
    });
  });

  describe('_calculateProgress', () => {
    it('returns 0 for null workflow', () => {
      const engine = new WorkflowEngine({});
      expect(engine._calculateProgress(null)).toBe(0);
    });

    it('returns 0 when no steps are completed', () => {
      const engine = new WorkflowEngine({});
      const workflow = {
        steps: WORKFLOW_STEPS.map((s) => ({ ...s, status: 'pending' })),
      };
      expect(engine._calculateProgress(workflow)).toBe(0);
    });

    it('calculates correct percentage', () => {
      const engine = new WorkflowEngine({});
      const workflow = {
        steps: WORKFLOW_STEPS.map((s, i) => ({
          ...s,
          status: i < 3 ? 'completed' : 'pending',
        })),
      };
      // 3/7 = 42.857... rounds to 43
      expect(engine._calculateProgress(workflow)).toBe(43);
    });

    it('returns 100 when all steps are completed', () => {
      const engine = new WorkflowEngine({});
      const workflow = {
        steps: WORKFLOW_STEPS.map((s) => ({ ...s, status: 'completed' })),
      };
      expect(engine._calculateProgress(workflow)).toBe(100);
    });
  });

  describe('startWorkflow', () => {
    it('throws when project is not found', async () => {
      const modules = {
        projectRepo: { get: vi.fn().mockReturnValue(null) },
      };
      const engine = new WorkflowEngine(modules);
      await expect(engine.startWorkflow('missing-id')).rejects.toThrow('Project not found: missing-id');
    });

    it('initializes workflow state and updates project status', async () => {
      const mockUpdate = vi.fn();
      const modules = {
        projectRepo: {
          get: vi.fn().mockReturnValue({ id: 'p1', theme: 'Test' }),
          update: mockUpdate,
          updateScript: vi.fn(),
          getScript: vi.fn().mockReturnValue({ scenes: [] }),
          saveScenes: vi.fn(),
          getScenes: vi.fn().mockReturnValue([]),
        },
        scriptGen: { generate: vi.fn().mockResolvedValue({}), generateYouTubeMeta: vi.fn().mockResolvedValue({}) },
        scenePlanner: { splitScenes: vi.fn().mockReturnValue([]) },
        imageGen: { storagePath: '/tmp' },
        voiceGen: { generate: vi.fn() },
        subtitleGen: { generateSRT: vi.fn() },
        videoGen: { render: vi.fn().mockResolvedValue({ outputPath: '/out.mp4' }) },
      };
      const engine = new WorkflowEngine(modules);

      const workflow = await engine.startWorkflow('p1');
      expect(workflow.projectId).toBe('p1');
      expect(workflow.status).toBe('running');
      expect(workflow.steps).toHaveLength(7);
      expect(mockUpdate).toHaveBeenCalledWith('p1', { status: 'processing' });
    });
  });

  describe('_executeWorkflow (full pipeline with mocks)', () => {
    it('runs all steps and marks workflow completed', async () => {
      const events = [];
      const modules = {
        projectRepo: {
          get: vi.fn().mockReturnValue({ id: 'p1', theme: 'Test' }),
          update: vi.fn(),
          updateScript: vi.fn(),
          getScript: vi.fn().mockReturnValue({ scenes: [] }),
          saveScenes: vi.fn(),
          getScenes: vi.fn().mockReturnValue([]),
        },
        scriptGen: { generate: vi.fn().mockResolvedValue({}), generateYouTubeMeta: vi.fn().mockResolvedValue({}) },
        scenePlanner: { splitScenes: vi.fn().mockReturnValue([]) },
        imageGen: { storagePath: '/tmp' },
        voiceGen: { generate: vi.fn() },
        subtitleGen: { generateSRT: vi.fn() },
        videoGen: { render: vi.fn().mockResolvedValue({ outputPath: '/out.mp4' }) },
      };
      const engine = new WorkflowEngine(modules);

      // Start workflow to set up state
      const workflow = await engine.startWorkflow('p1');

      // Wait for the async _executeWorkflow to complete
      // The workflow runs asynchronously via .catch(), give it time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify all module methods were called
      expect(modules.scriptGen.generate).toHaveBeenCalled();
      expect(modules.scenePlanner.splitScenes).toHaveBeenCalled();
      expect(modules.subtitleGen.generateSRT).toHaveBeenCalled();
      expect(modules.videoGen.render).toHaveBeenCalled();
      expect(modules.scriptGen.generateYouTubeMeta).toHaveBeenCalled();

      // Workflow should be cleaned up after completion
      expect(engine.getStatus('p1')).toBeNull();

      // Project status should be set to ready_for_review
      expect(modules.projectRepo.update).toHaveBeenCalledWith('p1', { status: 'ready_for_review' });
    });

    it('stops on failure and sets failed status', async () => {
      const modules = {
        projectRepo: {
          get: vi.fn().mockReturnValue({ id: 'p1', theme: 'Test' }),
          update: vi.fn(),
          updateScript: vi.fn(),
        },
        scriptGen: { generate: vi.fn().mockRejectedValue(new Error('API error')) },
      };
      const engine = new WorkflowEngine(modules);

      const errorEvents = [];
      engine.on('error', (e) => errorEvents.push(e));

      await engine.startWorkflow('p1');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].error).toBe('API error');
      expect(errorEvents[0].step).toBe('script_generation');

      expect(modules.projectRepo.update).toHaveBeenCalledWith('p1', {
        status: 'failed',
        failedStep: 'script_generation',
      });
    });
  });

  describe('_executeStep', () => {
    it('throws for unknown step', async () => {
      const modules = {
        projectRepo: { get: vi.fn().mockReturnValue({ id: 'p1' }) },
      };
      const engine = new WorkflowEngine(modules);
      await expect(engine._executeStep('p1', 'unknown_step')).rejects.toThrow('Unknown step: unknown_step');
    });
  });
});
