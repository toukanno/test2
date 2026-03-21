import { describe, expect, it, afterEach } from 'vitest';
const path = require('path');
const os = require('os');
const fs = require('fs');

const { ensureDirectories, cleanupTemp } = require('../app/modules/data-layer/storage.js');

describe('Storage', () => {
  const basePath = path.join(os.tmpdir(), `test-storage-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  afterEach(() => {
    try { fs.rmSync(basePath, { recursive: true, force: true }); } catch {}
  });

  describe('ensureDirectories', () => {
    it('creates all required directories', () => {
      ensureDirectories(basePath);

      expect(fs.existsSync(basePath)).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'projects'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'outputs'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'temp'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'temp', 'images'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'temp', 'audio'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'temp', 'video'))).toBe(true);
    });

    it('is idempotent (can be called twice without error)', () => {
      ensureDirectories(basePath);
      ensureDirectories(basePath); // Should not throw
      expect(fs.existsSync(basePath)).toBe(true);
    });
  });

  describe('cleanupTemp', () => {
    it('removes the project temp directory', () => {
      const projectTempDir = path.join(basePath, 'temp', 'project-123');
      fs.mkdirSync(projectTempDir, { recursive: true });
      fs.writeFileSync(path.join(projectTempDir, 'test.txt'), 'data');

      cleanupTemp(basePath, 'project-123');
      expect(fs.existsSync(projectTempDir)).toBe(false);
    });

    it('does nothing when temp directory does not exist', () => {
      // Should not throw
      cleanupTemp(basePath, 'non-existent-project');
    });
  });
});
