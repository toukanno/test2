import { describe, expect, it, beforeEach, afterEach } from 'vitest';
const path = require('path');
const os = require('os');
const fs = require('fs');

const { initDatabase, closeDatabase } = require('../app/modules/data-layer/database.js');
const { ProjectRepository } = require('../app/modules/data-layer/repositories.js');

describe('ProjectRepository', () => {
  let repo;
  let dbPath;

  beforeEach(() => {
    // Use a unique temp file for each test to avoid conflicts
    dbPath = path.join(os.tmpdir(), `test-repo-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    initDatabase(dbPath);
    repo = new ProjectRepository();
  });

  afterEach(() => {
    closeDatabase();
    try { fs.unlinkSync(dbPath); } catch {}
  });

  // === Projects CRUD ===

  describe('create', () => {
    it('creates a project and returns it with an id', () => {
      const project = repo.create({ theme: 'AI入門' });
      expect(project).toBeTruthy();
      expect(project.id).toBeTruthy();
      expect(project.theme).toBe('AI入門');
      expect(project.status).toBe('draft');
    });

    it('uses theme as name when name is not provided', () => {
      const project = repo.create({ theme: 'テスト' });
      expect(project.name).toBe('テスト');
    });

    it('uses provided name over theme', () => {
      const project = repo.create({ name: 'My Project', theme: 'テスト' });
      expect(project.name).toBe('My Project');
    });

    it('sets default values for optional fields', () => {
      const project = repo.create({ theme: 'テスト' });
      expect(project.duration).toBe('5分');
      expect(project.tone).toBe('informative');
      expect(project.targetAudience).toBe('一般');
      expect(project.language).toBe('ja');
      expect(project.platform).toBe('youtube');
    });
  });

  describe('get', () => {
    it('returns null for non-existent id', () => {
      expect(repo.get('non-existent-id')).toBeNull();
    });

    it('returns the project by id', () => {
      const created = repo.create({ theme: 'テスト' });
      const fetched = repo.get(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.theme).toBe('テスト');
    });
  });

  describe('list', () => {
    it('returns empty array when no projects exist', () => {
      expect(repo.list()).toEqual([]);
    });

    it('returns all projects ordered by updated_at DESC', () => {
      const first = repo.create({ theme: 'First' });
      // Touch the second project so its updated_at is strictly later
      const second = repo.create({ theme: 'Second' });
      repo.update(second.id, { status: 'processing' });
      const projects = repo.list();
      expect(projects).toHaveLength(2);
      // Most recently updated should come first
      expect(projects[0].theme).toBe('Second');
    });
  });

  describe('update', () => {
    it('updates specified fields', () => {
      const project = repo.create({ theme: 'テスト' });
      const updated = repo.update(project.id, { status: 'processing', tone: 'casual' });
      expect(updated.status).toBe('processing');
      expect(updated.tone).toBe('casual');
      expect(updated.theme).toBe('テスト'); // unchanged
    });

    it('returns project unchanged when no fields provided', () => {
      const project = repo.create({ theme: 'テスト' });
      const updated = repo.update(project.id, {});
      expect(updated.id).toBe(project.id);
    });
  });

  describe('delete', () => {
    it('removes the project', () => {
      const project = repo.create({ theme: 'テスト' });
      repo.delete(project.id);
      expect(repo.get(project.id)).toBeNull();
    });
  });

  // === Scripts ===

  describe('updateScript / getScript', () => {
    it('inserts a script and retrieves it', () => {
      const project = repo.create({ theme: 'テスト' });
      const scriptData = { title: 'My Script', summary: 'A summary', tags: ['ai', 'video'] };
      repo.updateScript(project.id, scriptData);

      const retrieved = repo.getScript(project.id);
      expect(retrieved.title).toBe('My Script');
      expect(retrieved.summary).toBe('A summary');
    });

    it('updates existing script on second call', () => {
      const project = repo.create({ theme: 'テスト' });
      repo.updateScript(project.id, { title: 'V1' });
      repo.updateScript(project.id, { title: 'V2' });

      const retrieved = repo.getScript(project.id);
      expect(retrieved.title).toBe('V2');
    });

    it('returns null when no script exists', () => {
      const project = repo.create({ theme: 'テスト' });
      expect(repo.getScript(project.id)).toBeNull();
    });
  });

  // === Scenes ===

  describe('saveScenes / getScenes', () => {
    it('saves and retrieves scenes in order', () => {
      const project = repo.create({ theme: 'テスト' });
      const scenes = [
        { sceneNumber: 1, title: 'Intro', narration: 'Hello', duration: 5 },
        { sceneNumber: 2, title: 'Main', narration: 'Content', duration: 10 },
      ];
      repo.saveScenes(project.id, scenes);

      const retrieved = repo.getScenes(project.id);
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].title).toBe('Intro');
      expect(retrieved[0].sceneNumber).toBe(1);
      expect(retrieved[1].title).toBe('Main');
      expect(retrieved[1].sceneNumber).toBe(2);
    });

    it('replaces scenes on subsequent save', () => {
      const project = repo.create({ theme: 'テスト' });
      repo.saveScenes(project.id, [{ sceneNumber: 1, title: 'Old' }]);
      repo.saveScenes(project.id, [{ sceneNumber: 1, title: 'New' }]);

      const retrieved = repo.getScenes(project.id);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].title).toBe('New');
    });
  });

  describe('getScene / updateScene', () => {
    it('returns null for non-existent scene', () => {
      expect(repo.getScene('non-existent')).toBeNull();
    });

    it('updates scene fields', () => {
      const project = repo.create({ theme: 'テスト' });
      repo.saveScenes(project.id, [{ sceneNumber: 1, title: 'Test', narration: 'Hi' }]);
      const scenes = repo.getScenes(project.id);
      const sceneId = scenes[0].id;

      repo.updateScene(sceneId, { imagePath: '/tmp/img.png', imageStatus: 'generated' });
      const updated = repo.getScene(sceneId);
      expect(updated.imagePath).toBe('/tmp/img.png');
      expect(updated.imageStatus).toBe('generated');
    });

    it('does nothing when no fields provided', () => {
      const project = repo.create({ theme: 'テスト' });
      repo.saveScenes(project.id, [{ sceneNumber: 1, title: 'Test' }]);
      const scenes = repo.getScenes(project.id);
      // Should not throw
      repo.updateScene(scenes[0].id, {});
    });
  });
});
