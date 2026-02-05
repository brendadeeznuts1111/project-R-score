import { Database } from 'bun:sqlite';
import { join } from 'path';

let db: Database | null = null;

export async function initializeDatabase(dataDir: string = './data'): Promise<Database> {
  // Create data directory if it doesn't exist
  try {
    await Bun.$`mkdir -p ${dataDir}`.quiet();
  } catch (error) {
    console.warn('Could not create data directory:', error);
  }

  const dbPath = join(dataDir, 'shortcuts.db');
  
  // Open SQLite database
  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  
  // Create tables
  await createTables();
  
  // Insert default data if empty
  await seedDefaultData();
  
  return db;
}

async function createTables(): Promise<void> {
  const schema = await Bun.file(join(import.meta.dir, 'schema.sql')).text();
  
  // Handle trigger statements properly by keeping BEGIN/END blocks together
  const lines = schema.split('\n');
  const statements: string[] = [];
  let currentStatement = '';
  let inTrigger = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('--') || trimmed === '') continue;
    
    currentStatement += line + '\n';
    
    // Check if we're entering a trigger
    if (trimmed.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true;
    }
    
    // Check if we're ending a trigger
    if (inTrigger && trimmed.toUpperCase() === 'END;') {
      statements.push(currentStatement.trim());
      currentStatement = '';
      inTrigger = false;
    }
    // For regular statements, end with semicolon
    else if (!inTrigger && trimmed.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  // Execute all statements
  for (const statement of statements) {
    try {
      if (statement.trim()) {
        db!.exec(statement);
      }
    } catch (error) {
      console.error('Failed to execute SQL:', statement.substring(0, 100) + '...', error);
      throw error;
    }
  }
}

async function seedDefaultData(): Promise<void> {
  // Check if we need to seed
  const { count } = db!.query('SELECT COUNT(*) as count FROM shortcuts').get() as { count: number };
  
  if (count === 0) {
    console.log('Seeding default data...');
    
    // Load default shortcuts from JSON file
    const defaultShortcuts = await Bun.file(join(import.meta.dir, '..', '..', 'config', 'defaults.json')).json();
    
    // Begin transaction
    db!.exec('BEGIN TRANSACTION');
    
    try {
      // Insert default shortcuts
      const insertShortcut = db!.prepare(`
        INSERT INTO shortcuts 
        (id, action, description, category, default_primary, default_secondary, 
         default_macos, default_linux, enabled, scope, requires_confirmation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const shortcut of defaultShortcuts.shortcuts) {
        insertShortcut.run(
          shortcut.id,
          shortcut.action,
          shortcut.description,
          shortcut.category,
          shortcut.default.primary,
          shortcut.default.secondary || null,
          shortcut.default.macOS || null,
          shortcut.default.linux || null,
          shortcut.enabled ? 1 : 0,
          shortcut.scope,
          shortcut.requiresConfirmation ? 1 : 0
        );
      }
      
      // Insert default profiles
      const insertProfile = db!.prepare(`
        INSERT INTO profiles (id, name, description, category, locked)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const profile of defaultShortcuts.profiles) {
        insertProfile.run(
          profile.id,
          profile.name,
          profile.description,
          profile.category,
          profile.locked ? 1 : 0
        );
      }
      
      // Set default user preferences
      db!.exec(`
        INSERT OR REPLACE INTO user_preferences 
        (user_id, active_profile_id, keyboard_layout, enable_sounds, enable_hints)
        VALUES ('default', 'professional', 'us', 1, 1)
      `);
      
      db!.exec('COMMIT');
      console.log('Default data seeded successfully');
    } catch (error) {
      db!.exec('ROLLBACK');
      console.error('Failed to seed default data:', error);
      throw error;
    }
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Utility functions for common operations
export const dbUtils = {
  // Get shortcuts for a profile with overrides applied
  getProfileShortcuts: (profileId: string) => {
    const query = db!.prepare(`
      SELECT 
        s.*,
        COALESCE(po.key_combination, 
          CASE 
            WHEN ? = 'macOS' THEN COALESCE(s.default_macos, s.default_primary)
            WHEN ? = 'linux' THEN COALESCE(s.default_linux, s.default_primary)
            ELSE s.default_primary
          END
        ) as effective_key
      FROM shortcuts s
      LEFT JOIN profile_overrides po ON s.id = po.shortcut_id AND po.profile_id = ?
      WHERE s.enabled = 1
      ORDER BY s.category, s.description
    `);
    
    const platform = process.platform === 'darwin' ? 'macOS' : 
                    process.platform === 'linux' ? 'linux' : 'windows';
    
    return query.all(platform, platform, profileId);
  },
  
  // Track shortcut usage
  trackUsage: (shortcutId: string, profileId: string, userId: string = 'default', context?: string, success: boolean = true) => {
    const query = db!.prepare(`
      INSERT INTO usage_analytics (shortcut_id, profile_id, user_id, context, success)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    query.run(shortcutId, profileId, userId, context || null, success ? 1 : 0);
    
    // Update shortcut usage count
    db!.exec(`
      UPDATE shortcuts 
      SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [shortcutId]);
  },
  
  // Get usage statistics
  getUsageStats: (days: number = 30) => {
    const query = db!.prepare(`
      SELECT 
        s.id,
        s.action,
        s.description,
        s.category,
        s.usage_count,
        s.last_used,
        COUNT(ua.id) as recent_usage,
        AVG(CASE WHEN ua.success = 1 THEN 1 ELSE 0 END) * 100 as success_rate
      FROM shortcuts s
      LEFT JOIN usage_analytics ua ON s.id = ua.shortcut_id 
        AND ua.timestamp > datetime('now', ?)
      GROUP BY s.id
      ORDER BY s.usage_count DESC
    `);
    
    return query.all(`-${days} days`);
  },
  
  // Detect conflicts
  detectConflicts: (profileId: string) => {
    const query = db!.prepare(`
      WITH effective_keys AS (
        SELECT 
          s.id,
          s.action,
          COALESCE(po.key_combination, 
            CASE 
              WHEN ? = 'macOS' THEN COALESCE(s.default_macos, s.default_primary)
              WHEN ? = 'linux' THEN COALESCE(s.default_linux, s.default_primary)
              ELSE s.default_primary
            END
          ) as key_combination,
          s.scope
        FROM shortcuts s
        LEFT JOIN profile_overrides po ON s.id = po.shortcut_id AND po.profile_id = ?
        WHERE s.enabled = 1
      )
      SELECT 
        key_combination,
        GROUP_CONCAT(action, ', ') as conflicting_actions,
        COUNT(*) as conflict_count,
        CASE 
          WHEN COUNT(*) = SUM(CASE WHEN scope = 'global' THEN 1 ELSE 0 END) THEN 'high'
          WHEN SUM(CASE WHEN scope = 'global' THEN 1 ELSE 0 END) > 0 THEN 'medium'
          ELSE 'low'
        END as severity
      FROM effective_keys
      WHERE key_combination IS NOT NULL
      GROUP BY key_combination
      HAVING COUNT(*) > 1
      ORDER BY severity DESC, conflict_count DESC
    `);
    
    const platform = process.platform === 'darwin' ? 'macOS' : 
                    process.platform === 'linux' ? 'linux' : 'windows';
    
    return query.all(platform, platform, profileId);
  }
};
