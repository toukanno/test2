const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { registerIpcHandlers } = require('./ipc-handlers');
const { initDatabase } = require('../modules/data-layer/database');
const { ensureDirectories } = require('../modules/data-layer/storage');
const { createLogger, initFileLogging, closeFileLogging } = require('../modules/data-layer/logger');

const logger = createLogger('main');
const isDev = !app.isPackaged;

let mainWindow = null;

/**
 * Check if FFmpeg is available on the system
 * @returns {Promise<{available: boolean, version: string|null}>}
 */
function checkFfmpeg() {
  return new Promise((resolve) => {
    const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg';
    execFile(ffmpegBin, ['-version'], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve({ available: false, version: null });
      } else {
        const match = stdout.match(/ffmpeg version (\S+)/);
        resolve({ available: true, version: match ? match[1] : 'unknown' });
      }
    });
  });
}

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
    // Relax CSP for webpack dev server (HMR websocket)
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data:; connect-src 'self' ws://localhost:*;",
          ],
        },
      });
    });
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

    // Initialize file logging
    initFileLogging(storagePath);

    // Initialize database
    const dbPath = isDev
      ? path.join(__dirname, '..', 'storage', 'app.db')
      : path.join(app.getPath('userData'), 'storage', 'app.db');
    initDatabase(dbPath);

    // Check FFmpeg availability
    const ffmpegStatus = await checkFfmpeg();
    if (ffmpegStatus.available) {
      logger.info(`FFmpeg found: ${ffmpegStatus.version}`);
    } else {
      logger.error('FFmpeg not found on system PATH');
    }

    // Register IPC handlers (pass getter function since mainWindow is not yet created)
    registerIpcHandlers(ipcMain, () => mainWindow, storagePath, { ffmpegStatus });

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

app.on('will-quit', () => {
  closeFileLogging();
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
