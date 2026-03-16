const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Simple JSON-based persistent settings store
 * Replaces electron-store to avoid ESM compatibility issues
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
        return { ...this._defaults, ...JSON.parse(raw) };
      }
    } catch {
      // Corrupted file - reset to defaults
    }
    return { ...this._defaults };
  }

  _save() {
    try {
      const dir = path.dirname(this._filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._filePath, JSON.stringify(this._data, null, 2), 'utf-8');
    } catch {
      // Silently fail on write errors
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
