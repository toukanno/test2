const { contextBridge, ipcRenderer } = require('electron');

// Expose only safe APIs to renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // System info
  system: {
    info: () => ipcRenderer.invoke('system:info'),
  },

  // Project management
  project: {
    create: (data) => ipcRenderer.invoke('project:create', data),
    list: () => ipcRenderer.invoke('project:list'),
    get: (id) => ipcRenderer.invoke('project:get', id),
    update: (id, data) => ipcRenderer.invoke('project:update', id, data),
    delete: (id) => ipcRenderer.invoke('project:delete', id),
  },

  // Script generation
  script: {
    generate: (projectId, params) => ipcRenderer.invoke('script:generate', projectId, params),
    get: (projectId) => ipcRenderer.invoke('script:get', projectId),
    update: (projectId, script) => ipcRenderer.invoke('script:update', projectId, script),
  },

  // Scene management
  scene: {
    list: (projectId) => ipcRenderer.invoke('scene:list', projectId),
    update: (sceneId, data) => ipcRenderer.invoke('scene:update', sceneId, data),
    generateImage: (sceneId) => ipcRenderer.invoke('scene:generateImage', sceneId),
  },

  // Voice/Audio
  voice: {
    generate: (sceneId) => ipcRenderer.invoke('voice:generate', sceneId),
    importFile: (sceneId) => ipcRenderer.invoke('voice:importFile', sceneId),
  },

  // Video rendering
  video: {
    render: (projectId) => ipcRenderer.invoke('video:render', projectId),
    getStatus: (projectId) => ipcRenderer.invoke('video:getStatus', projectId),
  },

  // YouTube publishing
  youtube: {
    auth: () => ipcRenderer.invoke('youtube:auth'),
    checkAuth: () => ipcRenderer.invoke('youtube:checkAuth'),
    logout: () => ipcRenderer.invoke('youtube:logout'),
    generateMeta: (projectId) => ipcRenderer.invoke('youtube:generateMeta', projectId),
    upload: (projectId, meta) => ipcRenderer.invoke('youtube:upload', projectId, meta),
  },

  // Workflow
  workflow: {
    start: (projectId) => ipcRenderer.invoke('workflow:start', projectId),
    getStatus: (projectId) => ipcRenderer.invoke('workflow:getStatus', projectId),
    retryStep: (projectId, step) => ipcRenderer.invoke('workflow:retryStep', projectId, step),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
    validateApiKey: () => ipcRenderer.invoke('settings:validateApiKey'),
  },

  // File dialogs
  dialog: {
    selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },

  // Event listeners for progress updates
  on: (channel, callback) => {
    const validChannels = [
      'workflow:progress',
      'workflow:stepComplete',
      'workflow:error',
      'render:progress',
      'upload:progress',
      'log:entry',
    ];
    if (validChannels.includes(channel)) {
      const listener = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },
});
