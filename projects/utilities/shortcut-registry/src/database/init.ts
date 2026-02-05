import { Database } from 'bun:sqlite';
import type { ShortcutUsage } from '../types';

let dbInstance: Database | null = null;

/**
 * Get or create the SQLite database instance
 */
export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database('shortcuts.db');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

/**
 * Initialize the database schema
 */
function initializeSchema(db: Database): void {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Create shortcuts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shortcuts (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      default_primary TEXT NOT NULL,
      default_secondary TEXT,
      default_macos TEXT,
      default_linux TEXT,
      enabled INTEGER DEFAULT 1,
      scope TEXT NOT NULL DEFAULT 'global',
      requires_confirmation INTEGER DEFAULT 0,
      condition TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      based_on TEXT,
      category TEXT NOT NULL DEFAULT 'custom',
      enabled INTEGER DEFAULT 1,
      locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (based_on) REFERENCES profiles(id)
    )
  `);

  // Create profile_overrides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_overrides (
      profile_id TEXT NOT NULL,
      shortcut_id TEXT NOT NULL,
      key_combination TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (profile_id, shortcut_id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (shortcut_id) REFERENCES shortcuts(id) ON DELETE CASCADE
    )
  `);

  // Create macros table
  db.exec(`
    CREATE TABLE IF NOT EXISTS macros (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sequence TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  // Create user_preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      active_profile_id TEXT NOT NULL,
      keyboard_layout TEXT NOT NULL DEFAULT 'us',
      enable_sounds INTEGER DEFAULT 1,
      enable_hints INTEGER DEFAULT 1,
      enable_training INTEGER DEFAULT 1,
      auto_resolve_conflicts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (active_profile_id) REFERENCES profiles(id)
    )
  `);

  // Create shortcut_usage table for tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS shortcut_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortcut_id TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'global',
      success INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shortcut_id) REFERENCES shortcuts(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  // Create training_progress table
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      score REAL DEFAULT 0,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      attempts INTEGER DEFAULT 0,
      best_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, lesson_id)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shortcuts_enabled ON shortcuts(enabled);
    CREATE INDEX IF NOT EXISTS idx_profiles_enabled ON profiles(enabled);
    CREATE INDEX IF NOT EXISTS idx_profile_overrides_profile ON profile_overrides(profile_id);
    CREATE INDEX IF NOT EXISTS idx_profile_overrides_shortcut ON profile_overrides(shortcut_id);
    CREATE INDEX IF NOT EXISTS idx_macros_profile ON macros(profile_id);
    CREATE INDEX IF NOT EXISTS idx_shortcut_usage_shortcut ON shortcut_usage(shortcut_id);
    CREATE INDEX IF NOT EXISTS idx_shortcut_usage_timestamp ON shortcut_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_training_progress_user ON training_progress(user_id);
  `);

  // Create default 'professional' profile if it doesn't exist
  const profileQuery = db.prepare('SELECT id FROM profiles WHERE id = ?');
  const existingProfile = profileQuery.get('professional') as any;
  if (!existingProfile) {
    db.exec(`
      INSERT INTO profiles (id, name, description, category, enabled, locked)
      VALUES ('professional', 'Professional', 'Default professional profile', 'general', 1, 0)
    `);
  }
}

/**
 * Database utility functions
 */
export const dbUtils = {
  /**
   * Track shortcut usage
   */
  trackUsage(
    shortcutId: string,
    profileId: string,
    userId: string,
    scope: string = 'global',
    success: boolean = true
  ): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO shortcut_usage (shortcut_id, profile_id, user_id, scope, success)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(shortcutId, profileId, userId, scope, success ? 1 : 0);
  },

  /**
   * Get usage statistics for a given number of days
   */
  getUsageStats(days: number = 30): any {
    const db = getDatabase();
    const query = db.prepare(`
      SELECT 
        s.id as shortcut_id,
        s.description,
        COUNT(u.id) as usage_count,
        SUM(CASE WHEN u.success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN u.success = 0 THEN 1 ELSE 0 END) as failure_count,
        MIN(u.timestamp) as first_used,
        MAX(u.timestamp) as last_used
      FROM shortcuts s
      LEFT JOIN shortcut_usage u ON s.id = u.shortcut_id
      WHERE u.timestamp >= datetime('now', '-' || ? || ' days')
         OR u.timestamp IS NULL
      GROUP BY s.id, s.description
      ORDER BY usage_count DESC
    `);

    return query.all(days);
  },

  /**
   * Get most used shortcuts
   */
  getMostUsedShortcuts(limit: number = 10): any {
    const db = getDatabase();
    const query = db.prepare(`
      SELECT 
        s.id,
        s.description,
        COUNT(u.id) as usage_count
      FROM shortcuts s
      LEFT JOIN shortcut_usage u ON s.id = u.shortcut_id
      GROUP BY s.id, s.description
      ORDER BY usage_count DESC
      LIMIT ?
    `);

    return query.all(limit);
  },

  /**
   * Get usage by profile
   */
  getUsageByProfile(profileId: string, days: number = 30): any {
    const db = getDatabase();
    const query = db.prepare(`
      SELECT 
        s.id as shortcut_id,
        s.description,
        COUNT(u.id) as usage_count
      FROM shortcuts s
      JOIN shortcut_usage u ON s.id = u.shortcut_id
      WHERE u.profile_id = ? 
        AND u.timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY s.id, s.description
      ORDER BY usage_count DESC
    `);

    return query.all(profileId, days);
  },

  /**
   * Clean up old usage records (older than specified days)
   */
  cleanupOldUsage(daysToKeep: number = 90): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM shortcut_usage
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `);
    const result = stmt.run(daysToKeep);
    return result.changes || 0;
  }
};

/**
 * Close the database connection (useful for cleanup)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
