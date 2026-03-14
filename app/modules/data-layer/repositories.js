const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('./database');
const { createLogger } = require('./logger');
const logger = createLogger('repository');

class ProjectRepository {
  // === Projects ===

  create(data) {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, name, theme, duration, tone, target_audience, language, platform, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).run(
      id,
      data.name || data.theme,
      data.theme,
      data.duration || '5分',
      data.tone || 'informative',
      data.targetAudience || '一般',
      data.language || 'ja',
      data.platform || 'youtube',
      now, now
    );

    logger.info(`Project created: ${id}`);
    return this.get(id);
  }

  list() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all().map(this._mapProject);
  }

  get(id) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return row ? this._mapProject(row) : null;
  }

  update(id, data) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const fieldMap = {
      name: 'name', theme: 'theme', duration: 'duration', tone: 'tone',
      targetAudience: 'target_audience', language: 'language', platform: 'platform',
      status: 'status', outputPath: 'output_path', youtubeVideoId: 'youtube_video_id',
      youtubeMeta: 'youtube_meta', failedStep: 'failed_step',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.get(id);

    fields.push('updated_at = ?');
    values.push(now, id);

    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.get(id);
  }

  delete(id) {
    const db = getDatabase();
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    logger.info(`Project deleted: ${id}`);
  }

  // === Scripts ===

  updateScript(projectId, scriptData) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM scripts WHERE project_id = ?').get(projectId);

    if (existing) {
      db.prepare(`
        UPDATE scripts SET title = ?, title_alternatives = ?, summary = ?, full_script = ?, tags = ?, status = 'generated', updated_at = ?
        WHERE project_id = ?
      `).run(
        scriptData.title || '',
        JSON.stringify(scriptData.titleAlternatives || []),
        scriptData.summary || '',
        JSON.stringify(scriptData),
        JSON.stringify(scriptData.tags || []),
        now, projectId
      );
    } else {
      db.prepare(`
        INSERT INTO scripts (id, project_id, title, title_alternatives, summary, full_script, tags, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'generated', ?, ?)
      `).run(
        uuidv4(), projectId,
        scriptData.title || '',
        JSON.stringify(scriptData.titleAlternatives || []),
        scriptData.summary || '',
        JSON.stringify(scriptData),
        JSON.stringify(scriptData.tags || []),
        now, now
      );
    }
  }

  getScript(projectId) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scripts WHERE project_id = ?').get(projectId);
    if (!row) return null;
    try {
      return JSON.parse(row.full_script);
    } catch {
      return row;
    }
  }

  // === Scenes ===

  saveScenes(projectId, scenes) {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Clear existing scenes for this project
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);

    const stmt = db.prepare(`
      INSERT INTO scenes (id, project_id, scene_number, title, description, narration, duration,
        image_prompt, notes, image_path, image_status, audio_path, audio_status, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((sceneList) => {
      for (const scene of sceneList) {
        stmt.run(
          scene.id || uuidv4(), projectId, scene.sceneNumber, scene.title,
          scene.description, scene.narration, scene.duration,
          scene.imagePrompt, scene.notes, scene.imagePath || null,
          scene.imageStatus || 'pending', scene.audioPath || null,
          scene.audioStatus || 'pending', scene.status || 'draft', now, now
        );
      }
    });

    insertMany(scenes);
    logger.info(`Saved ${scenes.length} scenes for project ${projectId}`);
  }

  getScenes(projectId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number').all(projectId).map(this._mapScene);
  }

  getScene(sceneId) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get(sceneId);
    return row ? this._mapScene(row) : null;
  }

  updateScene(sceneId, data) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const fieldMap = {
      title: 'title', description: 'description', narration: 'narration',
      duration: 'duration', imagePrompt: 'image_prompt', notes: 'notes',
      imagePath: 'image_path', imageUrl: 'image_path', imageStatus: 'image_status',
      audioPath: 'audio_path', audioStatus: 'audio_status', subtitlePath: 'subtitle_path',
      status: 'status',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(now, sceneId);

    db.prepare(`UPDATE scenes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // === Helpers ===

  _mapProject(row) {
    return {
      id: row.id,
      name: row.name,
      theme: row.theme,
      duration: row.duration,
      tone: row.tone,
      targetAudience: row.target_audience,
      language: row.language,
      platform: row.platform,
      status: row.status,
      outputPath: row.output_path,
      youtubeVideoId: row.youtube_video_id,
      youtubeMeta: row.youtube_meta ? JSON.parse(row.youtube_meta) : null,
      failedStep: row.failed_step,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  _mapScene(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      sceneNumber: row.scene_number,
      title: row.title,
      description: row.description,
      narration: row.narration,
      duration: row.duration,
      imagePrompt: row.image_prompt,
      notes: row.notes,
      imagePath: row.image_path,
      imageStatus: row.image_status,
      audioPath: row.audio_path,
      audioStatus: row.audio_status,
      subtitlePath: row.subtitle_path,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = { ProjectRepository };
