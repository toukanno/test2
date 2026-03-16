const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { createLogger } = require('./logger');
const logger = createLogger('simple-store');

/**
 * Simple JSON-based persistent settings store
 * Replaces electron-store to avoid ESM compatibility issues
 * Uses atomic write (write-to-temp-then-rename) to prevent corruption
 */
class SimpleStore {
  constructor(options = {}) {
    const name = options.name || 'settings';
    const userDataPath = app.getPath('userData');
    this._filePath = path.join(userDataPath, `${name}.json`);
    this._defaults = options.defaults || {};
    this._data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this._filePath)) {
        const raw = fs.readFileSync(this._filePath, 'utf-8');
        if (raw.trim().length === 0) return { ...this._defaults };
        return { ...this._defaults, ...JSON.parse(raw) };
      }
    } catch (err) {
      logger.warn(`Store file corrupted, resetting to defaults: ${err.message}`);
    }
    return { ...this._defaults };
  }

  _save() {
    try {
      const dir = path.dirname(this._filePath);
      fs.mkdirSync(dir, { recursive: true });
      // Atomic write: write to temp file, then rename
      const tmpPath = this._filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(this._data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this._filePath);
    } catch (err) {
      logger.error(`Failed to save store: ${err.message}`);
    }
  }

  get(key) {
    return key ? this._data[key] : this._data;
  }

  set(key, value) {
    this._data[key] = value;
    this._save();
  }

  delete(key) {
    delete this._data[key];
    this._save();
  }
}

module.exports = { SimpleStore };
