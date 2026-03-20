const { createLogger } = require('./logger');
const logger = createLogger('database');

let db = null;

/**
 * Initialize SQLite database with schema
 * @param {string} dbPath - Path to SQLite database file
 */
function initDatabase(dbPath) {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      theme TEXT NOT NULL,
      duration TEXT DEFAULT '5分',
      tone TEXT DEFAULT 'informative',
      target_audience TEXT DEFAULT '一般',
      language TEXT DEFAULT 'ja',
      platform TEXT DEFAULT 'youtube',
      status TEXT DEFAULT 'draft',
      output_path TEXT,
      youtube_video_id TEXT,
      youtube_meta TEXT,
      failed_step TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      title TEXT,
      title_alternatives TEXT,
      summary TEXT,
      full_script TEXT,
      tags TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scene_number INTEGER NOT NULL,
      title TEXT,
      description TEXT,
      narration TEXT,
      duration INTEGER DEFAULT 10,
      image_prompt TEXT,
      notes TEXT,
      image_path TEXT,
      image_status TEXT DEFAULT 'pending',
      audio_path TEXT,
      audio_status TEXT DEFAULT 'pending',
      subtitle_path TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scene_id TEXT,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT,
      mime_type TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS publish_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      platform TEXT DEFAULT 'youtube',
      status TEXT DEFAULT 'pending',
      video_id TEXT,
      video_url TEXT,
      privacy_status TEXT DEFAULT 'private',
      publish_at TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
    CREATE INDEX IF NOT EXISTS idx_publish_jobs_project ON publish_jobs(project_id);
  `);

  logger.info(`Database initialized at: ${dbPath}`);
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Close database connection gracefully
 */
function closeDatabase() {
  if (db) {
    try {
      db.close();
      logger.info('Database closed');
    } catch (err) {
      logger.error('Failed to close database', err);
    }
    db = null;
  }
}

module.exports = { initDatabase, getDatabase, closeDatabase };
