const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { registerIpcHandlers } = require('./ipc-handlers');
const { initDatabase } = require('../modules/data-layer/database');
const { ensureDirectories } = require('../modules/data-layer/storage');
const { createLogger } = require('../modules/data-layer/logger');

const logger = createLogger('main');
const isDev = !app.isPackaged;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'AI Video Generator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'build', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main window created');
}

app.whenReady().then(async () => {
  try {
    // Initialize storage directories
    const storagePath = isDev
      ? path.join(__dirname, '..', 'storage')
      : path.join(app.getPath('userData'), 'storage');
    ensureDirectories(storagePath);

    // Initialize database
    const dbPath = isDev
      ? path.join(__dirname, '..', 'storage', 'app.db')
      : path.join(app.getPath('userData'), 'storage', 'app.db');
    initDatabase(dbPath);

    // Register IPC handlers
    registerIpcHandlers(ipcMain, mainWindow, storagePath);

    createWindow();
    logger.info('Application started successfully');
  } catch (err) {
    logger.error('Failed to start application', err);
    dialog.showErrorBox('Startup Error', `Failed to start: ${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
