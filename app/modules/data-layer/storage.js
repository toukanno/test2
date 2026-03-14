const fs = require('fs');
const path = require('path');

/**
 * Ensure all required storage directories exist
 * @param {string} basePath - Base storage path
 */
function ensureDirectories(basePath) {
  const dirs = [
    basePath,
    path.join(basePath, 'projects'),
    path.join(basePath, 'outputs'),
    path.join(basePath, 'temp'),
    path.join(basePath, 'temp', 'images'),
    path.join(basePath, 'temp', 'audio'),
    path.join(basePath, 'temp', 'video'),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Clean up temporary files for a project
 */
function cleanupTemp(basePath, projectId) {
  const tempDir = path.join(basePath, 'temp', projectId);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = { ensureDirectories, cleanupTemp };
