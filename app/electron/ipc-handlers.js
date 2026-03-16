const { dialog } = require('electron');
const path = require('path');
const { SimpleStore } = require('../modules/data-layer/simple-store');
const { ProjectRepository } = require('../modules/data-layer/repositories');
const { ScriptGenerator } = require('../modules/script-generator');
const { ScenePlanner } = require('../modules/scene-planner');
const { ImageGenerator } = require('../modules/image-generator');
const { VoiceGenerator } = require('../modules/voice-generator');
const { VideoGenerator } = require('../modules/video-generator');
const { SubtitleGenerator } = require('../modules/subtitle-generator');
const { YouTubePublisher } = require('../modules/youtube-publisher');
const { WorkflowEngine } = require('../modules/workflow-engine');
const { createAIProvider } = require('../modules/ai-provider');
const { createLogger } = require('../modules/data-layer/logger');

const logger = createLogger('ipc');

function registerIpcHandlers(ipcMain, getMainWindow, storagePath, systemInfo = {}) {
  // Persistent settings store
  const store = new SimpleStore({
    name: 'settings',
    defaults: {
      openaiApiKey: '',
      youtubeClientId: '',
      youtubeClientSecret: '',
    },
  });

  // Restore saved credentials to environment
  const savedKey = store.get('openaiApiKey');
  if (savedKey && !process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = savedKey;
  const savedYtId = store.get('youtubeClientId');
  if (savedYtId && !process.env.YOUTUBE_CLIENT_ID) process.env.YOUTUBE_CLIENT_ID = savedYtId;
  const savedYtSecret = store.get('youtubeClientSecret');
  if (savedYtSecret && !process.env.YOUTUBE_CLIENT_SECRET) process.env.YOUTUBE_CLIENT_SECRET = savedYtSecret;

  const aiProvider = createAIProvider('openai');
  const projectRepo = new ProjectRepository();
  const scriptGen = new ScriptGenerator(aiProvider);
  const scenePlanner = new ScenePlanner(aiProvider);
  const imageGen = new ImageGenerator(aiProvider, storagePath);
  const voiceGen = new VoiceGenerator(aiProvider, storagePath);
  const videoGen = new VideoGenerator(storagePath);
  const subtitleGen = new SubtitleGenerator();
  const youtubePublisher = new YouTubePublisher();
  const workflowEngine = new WorkflowEngine({
    scriptGen, scenePlanner, imageGen, voiceGen,
    videoGen, subtitleGen, youtubePublisher, projectRepo,
  });

  // Emit progress events to renderer
  const sendToRenderer = (channel, data) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, data);
  };
  workflowEngine.on('progress', (data) => sendToRenderer('workflow:progress', data));
  workflowEngine.on('stepComplete', (data) => sendToRenderer('workflow:stepComplete', data));
  workflowEngine.on('error', (data) => sendToRenderer('workflow:error', data));

  // === System info handler ===
  ipcMain.handle('system:info', async () => {
    return {
      success: true,
      data: {
        ffmpegAvailable: systemInfo.ffmpegStatus?.available || false,
        ffmpegVersion: systemInfo.ffmpegStatus?.version || null,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasYouTubeCredentials: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
      },
    };
  });

  // === Project handlers ===
  ipcMain.handle('project:create', async (_e, data) => {
    try {
      return { success: true, data: projectRepo.create(data) };
    } catch (err) {
      logger.error('project:create failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:list', async () => {
    try {
      return { success: true, data: projectRepo.list() };
    } catch (err) {
      logger.error('project:list failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:get', async (_e, id) => {
    try {
      return { success: true, data: projectRepo.get(id) };
    } catch (err) {
      logger.error('project:get failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:update', async (_e, id, data) => {
    try {
      return { success: true, data: projectRepo.update(id, data) };
    } catch (err) {
      logger.error('project:update failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:delete', async (_e, id) => {
    try {
      projectRepo.delete(id);
      return { success: true };
    } catch (err) {
      logger.error('project:delete failed', err);
      return { success: false, error: err.message };
    }
  });

  // === Script handlers ===
  ipcMain.handle('script:generate', async (_e, projectId, params) => {
    try {
      const result = await scriptGen.generate(params);
      projectRepo.updateScript(projectId, result);
      // Auto-split into scenes
      const scenes = scenePlanner.splitScenes(result);
      projectRepo.saveScenes(projectId, scenes);
      return { success: true, data: { script: result, scenes } };
    } catch (err) {
      logger.error('script:generate failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('script:get', async (_e, projectId) => {
    try {
      return { success: true, data: projectRepo.getScript(projectId) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('script:update', async (_e, projectId, script) => {
    try {
      projectRepo.updateScript(projectId, script);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // === Scene handlers ===
  ipcMain.handle('scene:list', async (_e, projectId) => {
    try {
      return { success: true, data: projectRepo.getScenes(projectId) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('scene:update', async (_e, sceneId, data) => {
    try {
      projectRepo.updateScene(sceneId, data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('scene:generateImage', async (_e, sceneId) => {
    try {
      const scene = projectRepo.getScene(sceneId);
      const result = await imageGen.generate(scene);
      projectRepo.updateScene(sceneId, { imageUrl: result.filePath, imageStatus: 'generated' });
      return { success: true, data: result };
    } catch (err) {
      logger.error('scene:generateImage failed', err);
      return { success: false, error: err.message };
    }
  });

  // === Voice handlers ===
  ipcMain.handle('voice:generate', async (_e, sceneId) => {
    try {
      const scene = projectRepo.getScene(sceneId);
      const result = await voiceGen.generate(scene.narration, sceneId);
      projectRepo.updateScene(sceneId, { audioPath: result.filePath, audioStatus: 'generated' });
      return { success: true, data: result };
    } catch (err) {
      logger.error('voice:generate failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('voice:importFile', async (_e, sceneId) => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }],
        properties: ['openFile'],
      });
      if (result.canceled) return { success: false, error: 'Canceled' };
      const filePath = result.filePaths[0];
      projectRepo.updateScene(sceneId, { audioPath: filePath, audioStatus: 'imported' });
      return { success: true, data: { filePath } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // === Video handlers ===
  ipcMain.handle('video:render', async (_e, projectId) => {
    try {
      if (!systemInfo.ffmpegStatus?.available) {
        return { success: false, error: 'FFmpegがインストールされていません。動画レンダリングにはFFmpegが必要です。' };
      }
      const project = projectRepo.get(projectId);
      const scenes = projectRepo.getScenes(projectId);
      const result = await videoGen.render(project, scenes, (progress) => {
        sendToRenderer('render:progress', { projectId, progress });
      });
      projectRepo.update(projectId, { outputPath: result.outputPath, status: 'rendered' });
      return { success: true, data: result };
    } catch (err) {
      logger.error('video:render failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('video:getStatus', async (_e, projectId) => {
    try {
      const project = projectRepo.get(projectId);
      return { success: true, data: { status: project.status, outputPath: project.outputPath } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // === YouTube handlers ===
  ipcMain.handle('youtube:auth', async () => {
    try {
      const result = await youtubePublisher.authenticate();
      return { success: true, data: result };
    } catch (err) {
      logger.error('youtube:auth failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('youtube:checkAuth', async () => {
    try {
      return { success: true, data: { authenticated: youtubePublisher.isAuthenticated() } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('youtube:logout', async () => {
    try {
      youtubePublisher.logout();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('youtube:generateMeta', async (_e, projectId) => {
    try {
      const project = projectRepo.get(projectId);
      const script = projectRepo.getScript(projectId);
      const meta = await scriptGen.generateYouTubeMeta(project, script);
      return { success: true, data: meta };
    } catch (err) {
      logger.error('youtube:generateMeta failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('youtube:upload', async (_e, projectId, meta) => {
    try {
      const project = projectRepo.get(projectId);
      const result = await youtubePublisher.upload(project.outputPath, meta, (progress) => {
        sendToRenderer('upload:progress', { projectId, progress });
      });
      projectRepo.update(projectId, { youtubeVideoId: result.videoId, status: 'uploaded' });
      return { success: true, data: result };
    } catch (err) {
      logger.error('youtube:upload failed', err);
      return { success: false, error: err.message };
    }
  });

  // === Workflow handlers ===
  ipcMain.handle('workflow:start', async (_e, projectId) => {
    try {
      // Guard against concurrent workflows for same project
      const existing = workflowEngine.getStatus(projectId);
      if (existing && existing.status === 'running') {
        return { success: false, error: 'このプロジェクトのワークフローは既に実行中です' };
      }
      workflowEngine.startWorkflow(projectId);
      return { success: true };
    } catch (err) {
      logger.error('workflow:start failed', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('workflow:getStatus', async (_e, projectId) => {
    try {
      return { success: true, data: workflowEngine.getStatus(projectId) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('workflow:retryStep', async (_e, projectId, step) => {
    try {
      await workflowEngine.retryStep(projectId, step);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // === Settings handlers ===
  ipcMain.handle('settings:get', async () => {
    return {
      success: true,
      data: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasYouTubeCredentials: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
      },
    };
  });

  ipcMain.handle('settings:update', async (_e, settings) => {
    // Update runtime + persist to store
    if (settings.openaiApiKey) {
      process.env.OPENAI_API_KEY = settings.openaiApiKey;
      store.set('openaiApiKey', settings.openaiApiKey);
    }
    if (settings.youtubeClientId) {
      process.env.YOUTUBE_CLIENT_ID = settings.youtubeClientId;
      store.set('youtubeClientId', settings.youtubeClientId);
    }
    if (settings.youtubeClientSecret) {
      process.env.YOUTUBE_CLIENT_SECRET = settings.youtubeClientSecret;
      store.set('youtubeClientSecret', settings.youtubeClientSecret);
    }
    return {
      success: true,
      data: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasYouTubeCredentials: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
      },
    };
  });

  ipcMain.handle('settings:validateApiKey', async () => {
    try {
      const valid = await aiProvider.validateKey();
      return { success: true, data: { valid } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // === Dialog handlers ===
  ipcMain.handle('dialog:selectFile', async (_e, options) => {
    const result = await dialog.showOpenDialog(options || {});
    if (result.canceled) return { success: false, error: 'Canceled' };
    return { success: true, data: result.filePaths };
  });

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return { success: false, error: 'Canceled' };
    return { success: true, data: result.filePaths[0] };
  });

  logger.info('IPC handlers registered');
}

module.exports = { registerIpcHandlers };
