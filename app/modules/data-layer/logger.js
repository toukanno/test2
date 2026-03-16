const fs = require('fs');
const path = require('path');

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.APP_LOG_LEVEL || 'info'];

// In-memory log buffer for UI display
const logBuffer = [];
const MAX_BUFFER_SIZE = 500;

// File logging (lazy init)
let logStream = null;
let logDir = null;

/**
 * Initialize file logging
 * @param {string} storagePath - Base storage path
 */
function initFileLogging(storagePath) {
  try {
    logDir = path.join(storagePath, 'logs');
    fs.mkdirSync(logDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logDir, `app-${date}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  } catch {
    // File logging is optional; don't crash if it fails
    logStream = null;
  }
}

/**
 * Create a logger instance for a module
 * @param {string} moduleName
 * @returns {object} Logger with info, warn, error, debug methods
 */
function createLogger(moduleName) {
  const log = (level, message, extra) => {
    if (LOG_LEVELS[level] > currentLevel) return;

    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      module: moduleName,
      message,
      extra: extra ? (extra instanceof Error ? { message: extra.message, stack: extra.stack } : extra) : undefined,
    };

    // Console output
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${moduleName}]`;
    if (level === 'error') {
      console.error(`${prefix} ${message}`, extra || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, extra || '');
    } else {
      console.log(`${prefix} ${message}`);
    }

    // File output
    if (logStream && !logStream.destroyed) {
      const line = extra
        ? `${prefix} ${message} ${JSON.stringify(entry.extra)}\n`
        : `${prefix} ${message}\n`;
      logStream.write(line);
    }

    // Buffer for UI
    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.shift();
    }
  };

  return {
    info: (msg, extra) => log('info', msg, extra),
    warn: (msg, extra) => log('warn', msg, extra),
    error: (msg, extra) => log('error', msg, extra),
    debug: (msg, extra) => log('debug', msg, extra),
  };
}

/**
 * Get recent log entries
 */
function getRecentLogs(count = 100) {
  return logBuffer.slice(-count);
}

module.exports = { createLogger, getRecentLogs, initFileLogging };
