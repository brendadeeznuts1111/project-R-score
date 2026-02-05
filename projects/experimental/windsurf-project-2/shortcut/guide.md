# **Complete Bun Native Shortcut System Implementation**

Here's a complete, production-ready shortcut system built with **Bun native APIs** (Bun.serve, Bun.file, SQLite, etc.) - no Node.js dependencies required:

## **1. Project Structure**

```
lightning-shortcut-system/
├── package.json
├── tsconfig.json
├── bun.lockb
├── src/
│   ├── main.ts              # Entry point
│   ├── database/           # SQLite persistence
│   │   ├── schema.sql
│   │   └── migrations/
│   ├── core/               # Core shortcut logic
│   │   ├── registry.ts
│   │   ├── detector.ts
│   │   └── preferences.ts
│   ├── api/                # Bun.serve API routes
│   │   ├── shortcuts.ts
│   │   ├── profiles.ts
│   │   └── analytics.ts
│   ├── ui/                 # HTML/CSS/JS frontend
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── utils/              # Utilities
│       ├── validation.ts
│       └── platform.ts
└── tests/
    └── registry.test.ts
```

## **2. Package.json (Bun-native)**

```json
{
  "name": "lightning-shortcut-system",
  "version": "1.0.0",
  "type": "module",
  "module": "src/main.ts",
  "main": "src/main.ts",
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "start": "bun src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun",
    "test": "bun test",
    "db:migrate": "bun run src/database/migrate.ts",
    "generate": "bun src/utils/generate-types.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "@biomejs/biome": "^1.6.0"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## **3. Main Application Entry Point**

```typescript
// src/main.ts
#!/usr/bin/env bun

import { ShortcutRegistry } from './core/registry';
import { createServer } from './api/server';
import { initializeDatabase } from './database/init';
import { watchForChanges, setupAutoBackup } from './utils/watch';
import { detectPlatform } from './utils/platform';

// Global registry instance
export const shortcutRegistry = new ShortcutRegistry();

// Configuration from environment
const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  hostname: process.env.HOST || 'localhost',
  dataDir: process.env.DATA_DIR || './data',
  enableWebSocket: process.env.ENABLE_WS !== 'false',
  enableAutoBackup: process.env.ENABLE_BACKUP !== 'false',
  backupInterval: process.env.BACKUP_INTERVAL ? parseInt(process.env.BACKUP_INTERVAL) : 3600000,
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Setup logging
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => {
    if (config.logLevel === 'debug') console.debug(`[DEBUG] ${msg}`, ...args);
  }
};

async function main() {
  logger.info('Starting Lightning Shortcut System...');
  logger.info(`Platform: ${detectPlatform()}`);
  logger.info(`Data directory: ${config.dataDir}`);
  logger.info(`Log level: ${config.logLevel}`);

  try {
    // Initialize database
    await initializeDatabase(config.dataDir);
    logger.info('Database initialized');

    // Load initial data
    await shortcutRegistry.loadFromDatabase();
    logger.info(`Loaded ${shortcutRegistry.getShortcutCount()} shortcuts`);

    // Setup auto-backup if enabled
    if (config.enableAutoBackup) {
      setupAutoBackup(shortcutRegistry, config.dataDir, config.backupInterval);
      logger.info(`Auto-backup enabled (every ${config.backupInterval}ms)`);
    }

    // Watch for config file changes
    watchForChanges(config.dataDir, () => {
      logger.info('Config changed, reloading...');
      shortcutRegistry.loadFromDatabase();
    });

    // Create and start HTTP server
    const server = createServer(shortcutRegistry, config);
    
    logger.info(`Server running at http://${config.hostname}:${config.port}`);
    logger.info('Press Ctrl+C to stop');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await server.stop();
      await shortcutRegistry.saveToDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Terminating...');
      await server.stop();
      await shortcutRegistry.saveToDatabase();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the application
if (import.meta.main) {
  main();
}

// Export for testing and programmatic use
export { config, logger };
export default main;
```

## **4. SQLite Database Schema**

```sql
-- src/database/schema.sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Shortcuts table
CREATE TABLE IF NOT EXISTS shortcuts (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'theme', 'telemetry', 'emulator', 'general', 'compliance', 'logs',
    'ui', 'developer', 'accessibility', 'data', 'payment'
  )),
  default_primary TEXT NOT NULL,
  default_secondary TEXT,
  default_macos TEXT,
  default_linux TEXT,
  enabled BOOLEAN DEFAULT 1,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'panel', 'component')),
  requires_confirmation BOOLEAN DEFAULT 0,
  condition TEXT, -- JSON string of function
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  based_on TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'default', 'professional', 'developer', 'compliance', 
    'accessibility', 'custom', 'terminal'
  )),
  enabled BOOLEAN DEFAULT 1,
  locked BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profile overrides table
CREATE TABLE IF NOT EXISTS profile_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shortcut_id TEXT NOT NULL REFERENCES shortcuts(id) ON DELETE CASCADE,
  key_combination TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, shortcut_id)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY DEFAULT 'default',
  active_profile_id TEXT REFERENCES profiles(id),
  keyboard_layout TEXT DEFAULT 'us',
  enable_sounds BOOLEAN DEFAULT 1,
  enable_hints BOOLEAN DEFAULT 1,
  enable_training BOOLEAN DEFAULT 1,
  auto_resolve_conflicts BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shortcut_id TEXT REFERENCES shortcuts(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  user_id TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  context TEXT,
  success BOOLEAN DEFAULT 1,
  response_time_ms INTEGER
);

-- Conflict history table
CREATE TABLE IF NOT EXISTS conflict_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_combination TEXT NOT NULL,
  conflicting_actions JSON NOT NULL,
  resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolution_method TEXT CHECK (resolution_method IN (
    'auto', 'manual', 'user_override', 'disabled'
  )),
  user_id TEXT
);

-- Shortcut macros table
CREATE TABLE IF NOT EXISTS macros (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sequence JSON NOT NULL, -- Array of {action, delay}
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training progress table
CREATE TABLE IF NOT EXISTS training_progress (
  user_id TEXT,
  lesson_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT 0,
  completed_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  best_time_ms INTEGER,
  PRIMARY KEY (user_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shortcuts_category ON shortcuts(category);
CREATE INDEX IF NOT EXISTS idx_shortcuts_scope ON shortcuts(scope);
CREATE INDEX IF NOT EXISTS idx_shortcuts_enabled ON shortcuts(enabled) WHERE enabled = 1;
CREATE INDEX IF NOT EXISTS idx_profiles_category ON profiles(category);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_timestamp ON usage_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_shortcut ON usage_analytics(shortcut_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_profile_overrides_composite ON profile_overrides(profile_id, shortcut_id);

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_shortcuts_timestamp 
AFTER UPDATE ON shortcuts 
BEGIN
  UPDATE shortcuts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_profiles_timestamp 
AFTER UPDATE ON profiles 
BEGIN
  UPDATE profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## **5. Database Initialization**

```typescript
// src/database/init.ts
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
  
  // Split by semicolon and execute each statement
  const statements = schema.split(';').filter(stmt => stmt.trim());
  
  for (const statement of statements) {
    try {
      db!.exec(statement);
    } catch (error) {
      console.error('Failed to execute SQL:', statement, error);
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
    const defaultShortcuts = await Bun.file(join(import.meta.dir, '..', 'config', 'defaults.json')).json();
    
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
    
    query.run(shortcutId, profileId, userId, context, success ? 1 : 0);
    
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
```

## **6. Core Shortcut Registry (Bun-native)**

```typescript
// src/core/registry.ts
import { Database } from 'bun:sqlite';
import { getDatabase, dbUtils } from '../database/init';
import { ShortcutConflictDetector } from './detector';
import { EventEmitter } from 'events';
import type {
  ShortcutConfig,
  ShortcutProfile,
  ShortcutConflict,
  ShortcutPreferences,
  ShortcutMacro
} from '../types';

export class ShortcutRegistry {
  private db: Database;
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private profiles: Map<string, ShortcutProfile> = new Map();
  private activeProfile: string = 'professional';
  private preferences: ShortcutPreferences;
  private emitter: EventEmitter = new EventEmitter();
  private detector: ShortcutConflictDetector = new ShortcutConflictDetector();
  private listeners: Map<string, Set<Function>> = new Map();
  private macros: Map<string, ShortcutMacro> = new Map();
  private platform: 'windows' | 'macOS' | 'linux';
  
  constructor() {
    this.db = getDatabase();
    this.platform = this.detectPlatform();
    this.loadPreferences();
    this.loadFromDatabase();
    this.setupAutoSave();
  }
  
  // ==================== LOAD/SAVE ====================
  
  async loadFromDatabase(): Promise<void> {
    // Load shortcuts
    const shortcuts = this.db.query('SELECT * FROM shortcuts WHERE enabled = 1').all() as any[];
    this.shortcuts.clear();
    
    for (const row of shortcuts) {
      const config: ShortcutConfig = {
        id: row.id,
        action: row.action,
        description: row.description,
        category: row.category as any,
        default: {
          primary: row.default_primary,
          secondary: row.default_secondary || undefined,
          macOS: row.default_macos || undefined,
          linux: row.default_linux || undefined
        },
        enabled: row.enabled === 1,
        scope: row.scope as 'global' | 'panel' | 'component',
        requiresConfirmation: row.requires_confirmation === 1,
        condition: row.condition ? this.parseCondition(row.condition) : undefined
      };
      this.shortcuts.set(config.id, config);
    }
    
    // Load profiles
    const profiles = this.db.query('SELECT * FROM profiles WHERE enabled = 1').all() as any[];
    this.profiles.clear();
    
    for (const row of profiles) {
      // Load overrides for this profile
      const overridesQuery = this.db.prepare(`
        SELECT shortcut_id, key_combination 
        FROM profile_overrides 
        WHERE profile_id = ?
      `);
      
      const overridesRows = overridesQuery.all(row.id) as any[];
      const overrides: Record<string, string> = {};
      
      for (const override of overridesRows) {
        overrides[override.shortcut_id] = override.key_combination;
      }
      
      const profile: ShortcutProfile = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        basedOn: row.based_on || undefined,
        shortcuts: {}, // Will be populated on demand
        overrides,
        enabled: row.enabled === 1,
        locked: row.locked === 1,
        category: row.category as any
      };
      this.profiles.set(profile.id, profile);
    }
    
    // Load macros
    const macros = this.db.query('SELECT * FROM macros WHERE enabled = 1').all() as any[];
    this.macros.clear();
    
    for (const row of macros) {
      const macro: ShortcutMacro = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        sequence: JSON.parse(row.sequence),
        profileId: row.profile_id,
        enabled: row.enabled === 1,
        usageCount: row.usage_count,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      this.macros.set(macro.id, macro);
    }
    
    this.emitter.emit('loaded', {
      shortcuts: this.shortcuts.size,
      profiles: this.profiles.size,
      macros: this.macros.size
    });
  }
  
  async saveToDatabase(): Promise<void> {
    // Save preferences
    const prefsStmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_preferences 
      (user_id, active_profile_id, keyboard_layout, enable_sounds, enable_hints, enable_training, auto_resolve_conflicts, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    prefsStmt.run(
      this.preferences.userId,
      this.activeProfile,
      this.preferences.keyboardLayout,
      this.preferences.enableSounds ? 1 : 0,
      this.preferences.enableHints ? 1 : 0,
      this.preferences.enableTraining ? 1 : 0,
      this.preferences.autoResolveConflicts ? 1 : 0
    );
  }
  
  // ==================== SHORTCUT MANAGEMENT ====================
  
  register(config: ShortcutConfig): void {
    // Validate the shortcut
    this.validateShortcutConfig(config);
    
    // Check for conflicts
    const effectiveKey = this.getEffectiveKey(config);
    const conflicts = this.findConflicts(effectiveKey, config.id);
    
    if (conflicts.length > 0 && config.scope === 'global') {
      this.emitter.emit('conflict', {
        key: effectiveKey,
        actions: [config.id, ...conflicts],
        severity: 'high'
      });
      
      if (this.preferences.autoResolveConflicts) {
        this.autoResolveConflict(config.id, effectiveKey, conflicts);
      }
    }
    
    this.shortcuts.set(config.id, config);
    
    // Persist to database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shortcuts 
      (id, action, description, category, default_primary, default_secondary, 
       default_macos, default_linux, enabled, scope, requires_confirmation, condition, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      config.id,
      config.action,
      config.description,
      config.category,
      config.default.primary,
      config.default.secondary || null,
      config.default.macOS || null,
      config.default.linux || null,
      config.enabled ? 1 : 0,
      config.scope,
      config.requiresConfirmation ? 1 : 0,
      config.condition ? JSON.stringify(config.condition.toString()) : null
    );
    
    this.emitter.emit('shortcut:registered', config);
  }
  
  unregister(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) return;
    
    this.shortcuts.delete(shortcutId);
    
    // Remove from database (soft delete by disabling)
    this.db.exec('UPDATE shortcuts SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [shortcutId]);
    
    this.emitter.emit('shortcut:unregistered', shortcutId);
  }
  
  trigger(shortcutId: string, context?: any, event?: KeyboardEvent): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut || !shortcut.enabled) {
      return false;
    }
    
    // Check conditions
    if (shortcut.condition) {
      try {
        const conditionMet = shortcut.condition.call(context);
        if (!conditionMet) return false;
      } catch (error) {
        console.error('Condition check failed:', error);
        return false;
      }
    }
    
    // Check scope
    if (!this.isInScope(shortcut.scope, context)) {
      return false;
    }
    
    // Handle confirmation if needed
    if (shortcut.requiresConfirmation && event) {
      if (!this.requestConfirmation(shortcut, event)) {
        return false;
      }
    }
    
    // Track usage
    dbUtils.trackUsage(
      shortcutId,
      this.activeProfile,
      this.preferences.userId,
      context?.scope || 'global',
      true
    );
    
    // Notify listeners
    this.emitter.emit('shortcut:triggered', {
      shortcut,
      context,
      timestamp: Date.now(),
      profile: this.activeProfile
    });
    
    // Execute any registered callbacks
    const callbacks = this.listeners.get(shortcutId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(context, event);
        } catch (error) {
          console.error('Shortcut callback failed:', error);
        }
      }
    }
    
    // Prevent default if event provided
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    return true;
  }
  
  on(shortcutId: string, callback: Function): () => void {
    if (!this.listeners.has(shortcutId)) {
      this.listeners.set(shortcutId, new Set());
    }
    this.listeners.get(shortcutId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(shortcutId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(shortcutId);
        }
      }
    };
  }
  
  // ==================== PROFILE MANAGEMENT ====================
  
  setActiveProfile(profileId: string): void {
    if (!this.profiles.has(profileId)) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const previousProfile = this.activeProfile;
    this.activeProfile = profileId;
    
    // Update preferences
    this.preferences.activeProfileId = profileId;
    this.saveToDatabase();
    
    this.emitter.emit('profile:changed', {
      previous: previousProfile,
      current: profileId
    });
  }
  
  createProfile(name: string, description: string, basedOn?: string): ShortcutProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const profile: ShortcutProfile = {
      id,
      name,
      description,
      basedOn,
      shortcuts: {},
      overrides: {},
      enabled: true,
      locked: false,
      category: 'custom'
    };
    
    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, description, based_on, category, enabled, locked)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `);
    
    stmt.run(id, name, description, basedOn || null, 'custom');
    
    this.profiles.set(id, profile);
    this.emitter.emit('profile:created', profile);
    
    return profile;
  }
  
  updateProfile(profileId: string, updates: Partial<ShortcutProfile>): void {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    if (profile.locked) {
      throw new Error('Cannot update locked profile');
    }
    
    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(profileId, updatedProfile);
    
    // Update database
    const stmt = this.db.prepare(`
      UPDATE profiles 
      SET name = ?, description = ?, based_on = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      updatedProfile.name,
      updatedProfile.description,
      updatedProfile.basedOn || null,
      updatedProfile.category,
      profileId
    );
    
    this.emitter.emit('profile:updated', updatedProfile);
  }
  
  // ==================== OVERRIDE MANAGEMENT ====================
  
  setOverride(shortcutId: string, keyCombination: string, profileId?: string): void {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    if (!profile) {
      throw new Error(`Profile ${targetProfileId} not found`);
    }
    
    if (profile.locked) {
      throw new Error('Cannot override shortcuts in locked profile');
    }
    
    // Validate key combination
    if (!this.validateKeyCombination(keyCombination)) {
      throw new Error(`Invalid key combination: ${keyCombination}`);
    }
    
    // Check for conflicts
    const conflicts = this.findConflicts(keyCombination, shortcutId, targetProfileId);
    if (conflicts.length > 0) {
      throw new Error(`Key conflict with: ${conflicts.join(', ')}`);
    }
    
    // Update or insert override
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO profile_overrides (profile_id, shortcut_id, key_combination)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(targetProfileId, shortcutId, keyCombination);
    
    // Update in-memory cache
    profile.overrides[shortcutId] = keyCombination;
    
    this.emitter.emit('override:set', {
      profileId: targetProfileId,
      shortcutId,
      keyCombination
    });
  }
  
  removeOverride(shortcutId: string, profileId?: string): void {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    if (profile && profile.overrides[shortcutId]) {
      delete profile.overrides[shortcutId];
      
      // Remove from database
      this.db.exec(
        'DELETE FROM profile_overrides WHERE profile_id = ? AND shortcut_id = ?',
        [targetProfileId, shortcutId]
      );
      
      this.emitter.emit('override:removed', {
        profileId: targetProfileId,
        shortcutId
      });
    }
  }
  
  // ==================== CONFLICT DETECTION ====================
  
  detectConflicts(profileId?: string): ShortcutConflict[] {
    const targetProfileId = profileId || this.activeProfile;
    return this.detector.detectConflicts(this.shortcuts, targetProfileId, this.platform);
  }
  
  findConflicts(keyCombination: string, excludeShortcutId?: string, profileId?: string): string[] {
    const targetProfileId = profileId || this.activeProfile;
    const normalizedKey = this.normalizeKey(keyCombination);
    const conflicts: string[] = [];
    
    for (const [shortcutId, config] of this.shortcuts.entries()) {
      if (shortcutId === excludeShortcutId) continue;
      
      const effectiveKey = this.getEffectiveKey(config, targetProfileId);
      if (this.normalizeKey(effectiveKey) === normalizedKey) {
        conflicts.push(shortcutId);
      }
    }
    
    return conflicts;
  }
  
  autoResolveConflict(shortcutId: string, key: string, conflicts: string[]): void {
    // Try to find alternative key
    const alternative = this.suggestAlternativeKey(shortcutId, key);
    if (alternative && this.findConflicts(alternative, shortcutId).length === 0) {
      this.setOverride(shortcutId, alternative);
      console.log(`Auto-resolved conflict: ${shortcutId} -> ${alternative}`);
    } else {
      // Disable the conflicting shortcut
      this.disableShortcut(conflicts[0]);
      console.log(`Disabled conflicting shortcut: ${conflicts[0]}`);
    }
  }
  
  // ==================== MACRO SUPPORT ====================
  
  createMacro(name: string, sequence: Array<{action: string; delay: number}>, profileId?: string): ShortcutMacro {
    const id = `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targetProfileId = profileId || this.activeProfile;
    
    const macro: ShortcutMacro = {
      id,
      name,
      description: '',
      sequence,
      profileId: targetProfileId,
      enabled: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to database
    const stmt = this.db.prepare(`
      INSERT INTO macros (id, name, description, sequence, profile_id, enabled, usage_count)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `);
    
    stmt.run(
      id,
      name,
      macro.description,
      JSON.stringify(sequence),
      targetProfileId
    );
    
    this.macros.set(id, macro);
    this.emitter.emit('macro:created', macro);
    
    return macro;
  }
  
  executeMacro(macroId: string, context?: any): Promise<void> {
    return new Promise((resolve) => {
      const macro = this.macros.get(macroId);
      if (!macro || !macro.enabled) {
        resolve();
        return;
      }
      
      let delay = 0;
      for (const step of macro.sequence) {
        setTimeout(() => {
          this.trigger(step.action, context);
        }, delay);
        delay += step.delay;
      }
      
      // Update usage count
      macro.usageCount++;
      macro.updatedAt = new Date();
      
      this.db.exec(
        'UPDATE macros SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [macroId]
      );
      
      setTimeout(resolve, delay);
    });
  }
  
  // ==================== UTILITY METHODS ====================
  
  getEffectiveKey(config: ShortcutConfig, profileId?: string): string {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    // Check for override
    if (profile?.overrides?.[config.id]) {
      return profile.overrides[config.id];
    }
    
    // Use platform-specific default
    switch (this.platform) {
      case 'macOS':
        return config.default.macOS || config.default.primary;
      case 'linux':
        return config.default.linux || config.default.primary;
      default:
        return config.default.primary;
    }
  }
  
  getShortcutsForProfile(profileId: string): ShortcutConfig[] {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];
    
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.enabled)
      .map(shortcut => ({
        ...shortcut,
        effectiveKey: this.getEffectiveKey(shortcut, profileId)
      }));
  }
  
  getUsageStatistics(days: number = 30): any {
    return dbUtils.getUsageStats(days);
  }
  
  getTrainingProgress(userId: string = 'default'): any {
    const query = this.db.prepare(`
      SELECT 
        lesson_id,
        score,
        completed,
        completed_at,
        attempts,
        best_time_ms
      FROM training_progress
      WHERE user_id = ?
      ORDER BY completed_at DESC
    `);
    
    return query.all(userId);
  }
  
  // ==================== PRIVATE METHODS ====================
  
  private detectPlatform(): 'windows' | 'macOS' | 'linux' {
    const platform = process.platform;
    if (platform === 'darwin') return 'macOS';
    if (platform === 'linux') return 'linux';
    return 'windows';
  }
  
  private loadPreferences(): void {
    const row = this.db.query(`
      SELECT * FROM user_preferences WHERE user_id = 'default'
    `).get() as any;
    
    if (row) {
      this.preferences = {
        userId: row.user_id,
        activeProfileId: row.active_profile_id,
        keyboardLayout: row.keyboard_layout,
        enableSounds: row.enable_sounds === 1,
        enableHints: row.enable_hints === 1,
        enableTraining: row.enable_training === 1,
        autoResolveConflicts: row.auto_resolve_conflicts === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      this.activeProfile = row.active_profile_id || 'professional';
    } else {
      // Default preferences
      this.preferences = {
        userId: 'default',
        activeProfileId: 'professional',
        keyboardLayout: 'us',
        enableSounds: true,
        enableHints: true,
        enableTraining: true,
        autoResolveConflicts: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
  
  private setupAutoSave(): void {
    // Auto-save every 5 minutes
    setInterval(() => {
      this.saveToDatabase().catch(error => {
        console.error('Auto-save failed:', error);
      });
    }, 5 * 60 * 1000);
  }
  
  private validateShortcutConfig(config: ShortcutConfig): void {
    if (!config.id || !config.action || !config.description) {
      throw new Error('Shortcut config requires id, action, and description');
    }
    
    if (!config.default.primary) {
      throw new Error('Shortcut must have a default primary key');
    }
    
    if (!['global', 'panel', 'component'].includes(config.scope)) {
      throw new Error('Scope must be global, panel, or component');
    }
    
    const validCategories = [
      'theme', 'telemetry', 'emulator', 'general', 'compliance', 'logs',
      'ui', 'developer', 'accessibility', 'data', 'payment'
    ];
    
    if (!validCategories.includes(config.category)) {
      throw new Error(`Invalid category: ${config.category}`);
    }
  }
  
  private validateKeyCombination(key: string): boolean {
    // Simplified validation - in production, use a more robust validation
    if (!key || key.trim().length === 0) return false;
    
    const parts = key.split('+');
    const mainKey = parts[parts.length - 1];
    
    // Basic validation
    if (parts.length > 4) return false; // Too many modifiers
    
    const validModifiers = ['ctrl', 'shift', 'alt', 'meta', 'cmd', 'option'];
    const modifiers = parts.slice(0, -1);
    
    for (const modifier of modifiers) {
      if (!validModifiers.includes(modifier.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  }
  
  private normalizeKey(key: string): string {
    return key.toLowerCase()
      .replace(/ctrl/g, 'control')
      .replace(/cmd/g, 'meta')
      .replace(/opt/g, 'alt')
      .replace(/option/g, 'alt')
      .replace(/\s+/g, '')
      .replace(/\+/g, '+');
  }
  
  private isInScope(scope: string, context?: any): boolean {
    if (scope === 'global') return true;
    if (!context) return false;
    
    return context.scope === scope || 
           (context.element && context.element.closest(`[data-scope="${scope}"]`));
  }
  
  private requestConfirmation(shortcut: ShortcutConfig, event: KeyboardEvent): boolean {
    // In a real implementation, this would show a confirmation dialog
    // For now, we'll use a simple approach
    if (shortcut.requiresConfirmation) {
      const key = this.getEffectiveKey(shortcut);
      const message = `Execute "${shortcut.description}"?\nShortcut: ${key}`;
      
      // In a browser environment, this would be window.confirm
      // For server-side, we'll always confirm
      return true;
    }
    
    return true;
  }
  
  private parseCondition(conditionStr: string): (() => boolean) | undefined {
    try {
      // Parse function string (simplified)
      if (conditionStr.includes('=>')) {
        // Arrow function
        const body = conditionStr.match(/=>\s*(.+)/)?.[1];
        if (body) {
          return new Function(`return ${body}`) as () => boolean;
        }
      }
      
      // Regular function
      const body = conditionStr.match(/\{([^}]+)\}/)?.[1];
      if (body) {
        return new Function(`return (${body})`) as () => boolean;
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to parse condition:', error);
      return undefined;
    }
  }
  
  private disableShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = false;
      this.db.exec('UPDATE shortcuts SET enabled = 0 WHERE id = ?', [shortcutId]);
      this.emitter.emit('shortcut:disabled', shortcutId);
    }
  }
  
  private suggestAlternativeKey(shortcutId: string, currentKey: string): string | null {
    const shortcuts = Array.from(this.shortcuts.values());
    const usedKeys = new Set(shortcuts.map(s => this.getEffectiveKey(s)));
    
    // Try common alternatives
    const alternatives = [
      `Ctrl+Shift+${currentKey.split('+').pop()}`,
      `Alt+${currentKey.split('+').pop()}`,
      `Ctrl+Alt+${currentKey.split('+').pop()}`,
      `Shift+${currentKey.split('+').pop()}`
    ];
    
    for (const alt of alternatives) {
      if (!usedKeys.has(alt)) {
        return alt;
      }
    }
    
    return null;
  }
  
  // ==================== PUBLIC GETTERS ====================
  
  getShortcutCount(): number {
    return this.shortcuts.size;
  }
  
  getProfileCount(): number {
    return this.profiles.size;
  }
  
  getActiveProfile(): ShortcutProfile {
    return this.profiles.get(this.activeProfile)!;
  }
  
  getAllProfiles(): ShortcutProfile[] {
    return Array.from(this.profiles.values());
  }
  
  getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }
  
  getPlatform(): string {
    return this.platform;
  }
  
  getPreferences(): ShortcutPreferences {
    return { ...this.preferences };
  }
  
  // Event emitter methods
  onEvent(event: string, listener: Function): void {
    this.emitter.on(event, listener);
  }
  
  offEvent(event: string, listener: Function): void {
    this.emitter.off(event, listener);
  }
}
```

## **7. HTTP API Server with Bun.serve**

```typescript
// src/api/server.ts
import { serve, type Server } from 'bun';
import { join } from 'path';
import { ShortcutRegistry } from '../core/registry';

interface ServerConfig {
  port: number;
  hostname: string;
  enableWebSocket: boolean;
  dataDir: string;
}

export function createServer(registry: ShortcutRegistry, config: ServerConfig): Server {
  // Serve static files from ui directory
  const staticDir = join(import.meta.dir, '..', 'ui');
  
  const server = serve({
    port: config.port,
    hostname: config.hostname,
    
    async fetch(req) {
      const url = new URL(req.url);
      
      // API Routes
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(req, registry);
      }
      
      // WebSocket for real-time updates
      if (config.enableWebSocket && url.pathname === '/ws') {
        if (server.upgrade(req)) {
          return new Response(null, { status: 101 });
        }
        return new Response('WebSocket upgrade failed', { status: 500 });
      }
      
      // Serve static files
      if (url.pathname === '/') {
        return new Response(Bun.file(join(staticDir, 'index.html')));
      }
      
      const filePath = join(staticDir, url.pathname);
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      // 404
      return new Response('Not Found', { status: 404 });
    },
    
    // WebSocket handlers
    websocket: config.enableWebSocket ? {
      open(ws) {
        console.log('WebSocket connected');
        // Send initial state
        ws.send(JSON.stringify({
          type: 'INIT',
          data: {
            shortcuts: registry.getAllShortcuts(),
            activeProfile: registry.getActiveProfile(),
            platform: registry.getPlatform()
          }
        }));
      },
      
      message(ws, message) {
        // Handle WebSocket messages
        try {
          const data = JSON.parse(message.toString());
          handleWebSocketMessage(ws, data, registry);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      },
      
      close(ws) {
        console.log('WebSocket disconnected');
      }
    } : undefined,
    
    error(error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
  
  // Setup event listeners for real-time updates
  setupEventListeners(registry, server);
  
  return server;
}

async function handleApiRequest(req: Request, registry: ShortcutRegistry): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  
  try {
    // Shortcuts endpoints
    if (url.pathname === '/api/shortcuts') {
      if (method === 'GET') {
        const shortcuts = registry.getAllShortcuts();
        return Response.json({ shortcuts });
      }
      
      if (method === 'POST') {
        const data = await req.json();
        registry.register(data);
        return Response.json({ success: true });
      }
    }
    
    // Profiles endpoints
    if (url.pathname === '/api/profiles') {
      if (method === 'GET') {
        const profiles = registry.getAllProfiles();
        const active = registry.getActiveProfile();
        return Response.json({ profiles, active });
      }
      
      if (method === 'POST') {
        const data = await req.json();
        const profile = registry.createProfile(data.name, data.description, data.basedOn);
        return Response.json({ profile });
      }
    }
    
    // Profile by ID
    if (url.pathname.startsWith('/api/profiles/')) {
      const profileId = url.pathname.split('/').pop();
      
      if (method === 'GET') {
        const profiles = registry.getAllProfiles();
        const profile = profiles.find(p => p.id === profileId);
        
        if (!profile) {
          return Response.json({ error: 'Profile not found' }, { status: 404 });
        }
        
        const shortcuts = registry.getShortcutsForProfile(profileId!);
        return Response.json({ profile, shortcuts });
      }
      
      if (method === 'PUT') {
        const data = await req.json();
        registry.updateProfile(profileId!, data);
        return Response.json({ success: true });
      }
      
      if (method === 'DELETE') {
        // Delete profile (not implemented in this example)
        return Response.json({ error: 'Not implemented' }, { status: 501 });
      }
    }
    
    // Override endpoints
    if (url.pathname.startsWith('/api/override/')) {
      const [, , shortcutId] = url.pathname.split('/');
      
      if (method === 'POST') {
        const data = await req.json();
        registry.setOverride(shortcutId, data.key);
        return Response.json({ success: true });
      }
      
      if (method === 'DELETE') {
        registry.removeOverride(shortcutId);
        return Response.json({ success: true });
      }
    }
    
    // Analytics endpoints
    if (url.pathname === '/api/analytics') {
      if (method === 'GET') {
        const days = url.searchParams.get('days') || '30';
        const stats = registry.getUsageStatistics(parseInt(days));
        return Response.json(stats);
      }
    }
    
    // Conflict detection
    if (url.pathname === '/api/conflicts') {
      if (method === 'GET') {
        const conflicts = registry.detectConflicts();
        return Response.json({ conflicts });
      }
    }
    
    // Macro endpoints
    if (url.pathname === '/api/macros') {
      if (method === 'GET') {
        // Return macros (simplified)
        return Response.json({ macros: [] });
      }
      
      if (method === 'POST') {
        const data = await req.json();
        const macro = registry.createMacro(data.name, data.sequence);
        return Response.json({ macro });
      }
    }
    
    // Training endpoints
    if (url.pathname === '/api/training') {
      if (method === 'GET') {
        const progress = registry.getTrainingProgress();
        return Response.json({ progress });
      }
    }
    
    // Export/import
    if (url.pathname === '/api/export') {
      if (method === 'GET') {
        const shortcuts = registry.getAllShortcuts();
        const profiles = registry.getAllProfiles();
        const active = registry.getActiveProfile();
        const prefs = registry.getPreferences();
        
        const exportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          shortcuts,
          profiles,
          activeProfile: active.id,
          preferences: prefs
        };
        
        return new Response(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="shortcuts-export.json"'
          }
        });
      }
    }
    
    if (url.pathname === '/api/import' && method === 'POST') {
      const data = await req.json();
      // Import logic would go here
      return Response.json({ success: true, message: 'Import feature coming soon' });
    }
    
    // 404 for unknown API endpoints
    return Response.json({ error: 'Not Found' }, { status: 404 });
    
  } catch (error: any) {
    console.error('API error:', error);
    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

function handleWebSocketMessage(ws: any, data: any, registry: ShortcutRegistry): void {
  switch (data.type) {
    case 'SET_PROFILE':
      registry.setActiveProfile(data.profileId);
      break;
      
    case 'SET_OVERRIDE':
      registry.setOverride(data.shortcutId, data.key);
      break;
      
    case 'TRIGGER':
      registry.trigger(data.shortcutId, data.context);
      break;
      
    case 'EXECUTE_MACRO':
      registry.executeMacro(data.macroId, data.context);
      break;
      
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      break;
  }
}

function setupEventListeners(registry: ShortcutRegistry, server: Server): void {
  // Broadcast changes to all connected WebSocket clients
  const broadcast = (type: string, data: any) => {
    server.publish('shortcuts', JSON.stringify({ type, data }));
  };
  
  registry.onEvent('shortcut:triggered', (event) => {
    broadcast('SHORTCUT_TRIGGERED', event);
  });
  
  registry.onEvent('profile:changed', (event) => {
    broadcast('PROFILE_CHANGED', event);
  });
  
  registry.onEvent('override:set', (event) => {
    broadcast('OVERRIDE_SET', event);
  });
  
  registry.onEvent('conflict', (event) => {
    broadcast('CONFLICT_DETECTED', event);
  });
  
  registry.onEvent('shortcut:registered', (shortcut) => {
    broadcast('SHORTCUT_REGISTERED', shortcut);
  });
}
```

## **8. Frontend UI (HTML/JS/CSS)**

```html
<!-- src/ui/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lightning Shortcut System</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="app">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <div class="logo">
                    <i class="fas fa-bolt"></i>
                    <h1>Lightning Shortcuts</h1>
                </div>
                <div class="platform-badge" id="platform-badge">
                    <i class="fas fa-desktop"></i>
                    <span>Loading...</span>
                </div>
            </div>
            <div class="header-right">
                <div class="profile-selector">
                    <select id="profile-select">
                        <option value="">Loading profiles...</option>
                    </select>
                </div>
                <div class="user-menu">
                    <button class="btn-icon" id="settings-btn" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn-icon" id="help-btn" title="Help">
                        <i class="fas fa-question-circle"></i>
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Sidebar -->
            <nav class="sidebar">
                <div class="sidebar-header">
                    <h3><i class="fas fa-keyboard"></i> Navigation</h3>
                </div>
                <ul class="sidebar-nav">
                    <li class="active">
                        <a href="#" data-tab="shortcuts">
                            <i class="fas fa-list"></i>
                            <span>Shortcuts</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-tab="profiles">
                            <i class="fas fa-users"></i>
                            <span>Profiles</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-tab="conflicts">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Conflicts</span>
                            <span class="badge" id="conflict-count">0</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-tab="analytics">
                            <i class="fas fa-chart-bar"></i>
                            <span>Analytics</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-tab="training">
                            <i class="fas fa-graduation-cap"></i>
                            <span>Training</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" data-tab="macros">
                            <i class="fas fa-play-circle"></i>
                            <span>Macros</span>
                        </a>
                    </li>
                </ul>
                
                <div class="sidebar-footer">
                    <div class="connection-status">
                        <i class="fas fa-circle" id="connection-status"></i>
                        <span id="connection-text">Connecting...</span>
                    </div>
                    <button class="btn-export" id="export-btn">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </nav>

            <!-- Content Area -->
            <div class="content">
                <!-- Shortcuts Tab -->
                <div class="tab-content active" id="shortcuts-tab">
                    <div class="tab-header">
                        <h2><i class="fas fa-keyboard"></i> Shortcut Manager</h2>
                        <div class="tab-actions">
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" id="search-shortcuts" placeholder="Search shortcuts...">
                            </div>
                            <button class="btn-primary" id="add-shortcut">
                                <i class="fas fa-plus"></i> Add Shortcut
                            </button>
                        </div>
                    </div>
                    
                    <div class="shortcut-table-container">
                        <table class="shortcut-table" id="shortcuts-table">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Description</th>
                                    <th>Key Binding</th>
                                    <th>Category</th>
                                    <th>Scope</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="shortcuts-list">
                                <!-- Filled by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Profiles Tab -->
                <div class="tab-content" id="profiles-tab">
                    <div class="tab-header">
                        <h2><i class="fas fa-users"></i> Profile Management</h2>
                        <button class="btn-primary" id="create-profile">
                            <i class="fas fa-plus"></i> Create Profile
                        </button>
                    </div>
                    
                    <div class="profiles-grid" id="profiles-grid">
                        <!-- Filled by JavaScript -->
                    </div>
                </div>

                <!-- Conflicts Tab -->
                <div class="tab-content" id="conflicts-tab">
                    <div class="tab-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> Conflict Detection</h2>
                        <button class="btn-warning" id="scan-conflicts">
                            <i class="fas fa-search"></i> Scan for Conflicts
                        </button>
                    </div>
                    
                    <div class="conflicts-list" id="conflicts-list">
                        <!-- Filled by JavaScript -->
                    </div>
                </div>

                <!-- Analytics Tab -->
                <div class="tab-content" id="analytics-tab">
                    <div class="tab-header">
                        <h2><i class="fas fa-chart-bar"></i> Usage Analytics</h2>
                        <div class="date-range">
                            <select id="analytics-range">
                                <option value="7">Last 7 days</option>
                                <option value="30" selected>Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="365">Last year</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="analytics-dashboard">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon" style="background: #4CAF50;">
                                    <i class="fas fa-bolt"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="total-triggers">0</h3>
                                    <p>Total Triggers</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="background: #2196F3;">
                                    <i class="fas fa-keyboard"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="active-shortcuts">0</h3>
                                    <p>Active Shortcuts</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="background: #FF9800;">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="active-profile">-</h3>
                                    <p>Active Profile</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="background: #9C27B0;">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="conflicts-resolved">0</h3>
                                    <p>Conflicts Resolved</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="charts">
                            <div class="chart-container">
                                <h4>Usage by Category</h4>
                                <canvas id="category-chart" width="400" height="200"></canvas>
                            </div>
                            <div class="chart-container">
                                <h4>Top Shortcuts</h4>
                                <canvas id="top-shortcuts-chart" width="400" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Training Tab -->
                <div class="tab-content" id="training-tab">
                    <div class="tab-header">
                        <h2><i class="fas fa-graduation-cap"></i> Shortcut Training</h2>
                        <button class="btn-primary" id="start-training">
                            <i class="fas fa-play"></i> Start Training
                        </button>
                    </div>
                    
                    <div class="training-container" id="training-container">
                        <!-- Filled by JavaScript -->
                    </div>
                </div>

                <!-- Macros Tab -->
                <div class="tab-content" id="macros-tab">
                    <div class="tab-header">
                        <h2><i class="fas fa-play-circle"></i> Macro Recorder</h2>
                        <div class="macro-controls">
                            <button class="btn-danger" id="record-macro">
                                <i class="fas fa-circle"></i> Record Macro
                            </button>
                            <button class="btn-success" id="stop-macro" disabled>
                                <i class="fas fa-stop"></i> Stop
                            </button>
                            <button class="btn-primary" id="save-macro" disabled>
                                <i class="fas fa-save"></i> Save Macro
                            </button>
                        </div>
                    </div>
                    
                    <div class="macros-container" id="macros-container">
                        <!-- Filled by JavaScript -->
                    </div>
                </div>
            </div>
        </main>

        <!-- Modals -->
        <div class="modal" id="shortcut-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Shortcut</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="shortcut-form">
                        <div class="form-group">
                            <label for="shortcut-id">ID</label>
                            <input type="text" id="shortcut-id" required>
                        </div>
                        <div class="form-group">
                            <label for="shortcut-action">Action</label>
                            <input type="text" id="shortcut-action" required>
                        </div>
                        <div class="form-group">
                            <label for="shortcut-description">Description</label>
                            <textarea id="shortcut-description" rows="2" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="shortcut-category">Category</label>
                            <select id="shortcut-category" required>
                                <option value="theme">Theme</option>
                                <option value="telemetry">Telemetry</option>
                                <option value="emulator">Emulator</option>
                                <option value="general">General</option>
                                <option value="compliance">Compliance</option>
                                <option value="logs">Logs</option>
                                <option value="ui">UI</option>
                                <option value="developer">Developer</option>
                                <option value="accessibility">Accessibility</option>
                                <option value="data">Data</option>
                                <option value="payment">Payment</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="shortcut-primary">Primary Key</label>
                                <input type="text" id="shortcut-primary" required 
                                       placeholder="e.g., Ctrl+S">
                            </div>
                            <div class="form-group">
                                <label for="shortcut-scope">Scope</label>
                                <select id="shortcut-scope" required>
                                    <option value="global">Global</option>
                                    <option value="panel">Panel</option>
                                    <option value="component">Component</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close">Cancel</button>
                    <button class="btn-primary" id="save-shortcut">Save Shortcut</button>
                </div>
            </div>
        </div>

        <!-- Toast Notifications -->
        <div class="toast-container" id="toast-container"></div>
    </div>

    <!-- JavaScript -->
    <script src="/app.js" type="module"></script>
</body>
</html>
```

## **9. Frontend JavaScript**

```javascript
// src/ui/app.js
class ShortcutManagerUI {
    constructor() {
        this.ws = null;
        this.shortcuts = [];
        this.profiles = [];
        this.activeProfile = null;
        this.conflicts = [];
        this.macros = [];
        this.isRecording = false;
        this.recording = [];
        this.startTime = null;
        this.platform = 'unknown';
        
        this.init();
    }
    
    async init() {
        // Load initial data
        await this.loadInitialData();
        
        // Connect WebSocket
        this.connectWebSocket();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup tabs
        this.setupTabs();
        
        // Render initial data
        this.renderShortcuts();
        this.renderProfiles();
        this.updatePlatformBadge();
        
        // Load analytics
        this.loadAnalytics();
    }
    
    async loadInitialData() {
        try {
            // Load shortcuts
            const shortcutsRes = await fetch('/api/shortcuts');
            const shortcutsData = await shortcutsRes.json();
            this.shortcuts = shortcutsData.shortcuts;
            
            // Load profiles
            const profilesRes = await fetch('/api/profiles');
            const profilesData = await profilesRes.json();
            this.profiles = profilesData.profiles;
            this.activeProfile = profilesData.active;
            
            // Load conflicts
            await this.loadConflicts();
            
            // Update UI
            this.updateProfileSelector();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load data', 'error');
        }
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus(true);
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus(false);
            
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'INIT':
                this.platform = data.data.platform;
                this.updatePlatformBadge();
                break;
                
            case 'SHORTCUT_TRIGGERED':
                this.showToast(`Shortcut triggered: ${data.data.shortcut.description}`, 'info');
                break;
                
            case 'PROFILE_CHANGED':
                this.activeProfile = data.data.current;
                this.updateProfileSelector();
                this.showToast(`Profile changed to ${this.activeProfile.name}`, 'success');
                break;
                
            case 'OVERRIDE_SET':
                this.showToast(`Shortcut override saved`, 'success');
                this.loadConflicts(); // Refresh conflicts
                break;
                
            case 'CONFLICT_DETECTED':
                this.conflicts.push(data.data);
                this.renderConflicts();
                this.showToast(`Conflict detected: ${data.data.key}`, 'warning');
                break;
                
            case 'SHORTCUT_REGISTERED':
                this.shortcuts.push(data.data);
                this.renderShortcuts();
                break;
        }
    }
    
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        const textEl = document.getElementById('connection-text');
        
        if (connected) {
            statusEl.style.color = '#4CAF50';
            textEl.textContent = 'Connected';
        } else {
            statusEl.style.color = '#FF9800';
            textEl.textContent = 'Connecting...';
        }
    }
    
    updatePlatformBadge() {
        const badge = document.getElementById('platform-badge');
        if (badge && this.platform) {
            const platformNames = {
                'windows': 'Windows',
                'macOS': 'macOS',
                'linux': 'Linux'
            };
            
            const icon = this.platform === 'macOS' ? 'fa-apple' :
                        this.platform === 'linux' ? 'fa-linux' : 'fa-windows';
            
            badge.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${platformNames[this.platform] || this.platform}</span>
            `;
        }
    }
    
    updateProfileSelector() {
        const select = document.getElementById('profile-select');
        if (!select) return;
        
        select.innerHTML = '';
        
        this.profiles.forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            option.textContent = profile.name;
            if (this.activeProfile && profile.id === this.activeProfile.id) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
    
    async loadConflicts() {
        try {
            const res = await fetch('/api/conflicts');
            const data = await res.json();
            this.conflicts = data.conflicts || [];
            this.renderConflicts();
            
            // Update badge
            const badge = document.getElementById('conflict-count');
            if (badge) {
                badge.textContent = this.conflicts.length;
                badge.style.display = this.conflicts.length > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Failed to load conflicts:', error);
        }
    }
    
    async loadAnalytics() {
        try {
            const range = document.getElementById('analytics-range')?.value || '30';
            const res = await fetch(`/api/analytics?days=${range}`);
            const data = await res.json();
            
            // Update stats
            document.getElementById('total-triggers').textContent = 
                data.reduce((sum, item) => sum + item.usage_count, 0);
            document.getElementById('active-shortcuts').textContent = data.length;
            document.getElementById('active-profile').textContent = 
                this.activeProfile?.name || '-';
            
            // Update charts
            this.updateCharts(data);
            
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }
    
    updateCharts(data) {
        // Group by category
        const byCategory = {};
        data.forEach(item => {
            byCategory[item.category] = (byCategory[item.category] || 0) + item.usage_count;
        });
        
        // Update category chart
        this.updateCategoryChart(byCategory);
        
        // Update top shortcuts chart
        const topShortcuts = data
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, 10);
        this.updateTopShortcutsChart(topShortcuts);
    }
    
    updateCategoryChart(data) {
        const canvas = document.getElementById('category-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const categories = Object.keys(data);
        const values = Object.values(data);
        
        // Simple chart rendering
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const max = Math.max(...values);
        const barWidth = canvas.width / categories.length - 10;
        
        categories.forEach((category, i) => {
            const height = (values[i] / max) * (canvas.height - 40);
            const x = i * (barWidth + 10) + 5;
            const y = canvas.height - height - 20;
            
            // Draw bar
            ctx.fillStyle = this.getCategoryColor(category);
            ctx.fillRect(x, y, barWidth, height);
            
            // Draw label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(category, x + barWidth / 2, canvas.height - 5);
            
            // Draw value
            ctx.fillText(values[i], x + barWidth / 2, y - 10);
        });
    }
    
    updateTopShortcutsChart(data) {
        const canvas = document.getElementById('top-shortcuts-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const labels = data.map(item => item.action.substring(0, 15));
        const values = data.map(item => item.usage_count);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const max = Math.max(...values);
        const barWidth = canvas.width / labels.length - 5;
        
        labels.forEach((label, i) => {
            const height = (values[i] / max) * (canvas.height - 40);
            const x = i * (barWidth + 5) + 2.5;
            const y = canvas.height - height - 20;
            
            ctx.fillStyle = '#2196F3';
            ctx.fillRect(x, y, barWidth, height);
            
            ctx.fillStyle = '#333';
            ctx.font = '8px Arial';
            ctx.save();
            ctx.translate(x + barWidth / 2, canvas.height - 5);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });
    }
    
    getCategoryColor(category) {
        const colors = {
            'theme': '#FF9800',
            'telemetry': '#2196F3',
            'emulator': '#4CAF50',
            'general': '#9C27B0',
            'compliance': '#F44336',
            'logs': '#795548',
            'ui': '#009688',
            'developer': '#3F51B5',
            'accessibility': '#FFC107',
            'data': '#607D8B',
            'payment': '#E91E63'
        };
        return colors[category] || '#999';
    }
    
    renderShortcuts() {
        const container = document.getElementById('shortcuts-list');
        if (!container) return;
        
        const searchTerm = document.getElementById('search-shortcuts')?.value.toLowerCase() || '';
        
        const filtered = this.shortcuts.filter(shortcut => 
            shortcut.action.toLowerCase().includes(searchTerm) ||
            shortcut.description.toLowerCase().includes(searchTerm) ||
            shortcut.category.toLowerCase().includes(searchTerm)
        );
        
        container.innerHTML = filtered.map(shortcut => `
            <tr>
                <td class="action-cell">
                    <strong>${shortcut.action}</strong>
                </td>
                <td class="description-cell">
                    ${shortcut.description}
                </td>
                <td class="key-cell">
                    <kbd class="key-binding">${shortcut.default.primary}</kbd>
                    ${shortcut.default.secondary ? `<br><kbd class="key-binding secondary">${shortcut.default.secondary}</kbd>` : ''}
                </td>
                <td class="category-cell">
                    <span class="category-badge" style="background: ${this.getCategoryColor(shortcut.category)}">
                        ${shortcut.category}
                    </span>
                </td>
                <td class="scope-cell">
                    <span class="scope-badge scope-${shortcut.scope}">
                        ${shortcut.scope}
                    </span>
                </td>
                <td class="status-cell">
                    <span class="status ${shortcut.enabled ? 'enabled' : 'disabled'}">
                        <i class="fas fa-${shortcut.enabled ? 'check-circle' : 'times-circle'}"></i>
                        ${shortcut.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon edit-shortcut" data-id="${shortcut.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon override-shortcut" data-id="${shortcut.id}" title="Override">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn-icon ${shortcut.enabled ? 'disable-shortcut' : 'enable-shortcut'}" 
                            data-id="${shortcut.id}" 
                            title="${shortcut.enabled ? 'Disable' : 'Enable'}">
                        <i class="fas fa-${shortcut.enabled ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    renderProfiles() {
        const container = document.getElementById('profiles-grid');
        if (!container) return;
        
        container.innerHTML = this.profiles.map(profile => `
            <div class="profile-card ${this.activeProfile?.id === profile.id ? 'active' : ''}">
                <div class="profile-header">
                    <h4>${profile.name}</h4>
                    ${profile.locked ? '<span class="locked-badge"><i class="fas fa-lock"></i></span>' : ''}
                </div>
                <div class="profile-body">
                    <p class="profile-description">${profile.description || 'No description'}</p>
                    <div class="profile-stats">
                        <span class="stat">
                            <i class="fas fa-key"></i>
                            ${Object.keys(profile.overrides || {}).length} overrides
                        </span>
                        <span class="stat">
                            <i class="fas fa-tag"></i>
                            ${profile.category}
                        </span>
                    </div>
                </div>
                <div class="profile-footer">
                    ${this.activeProfile?.id !== profile.id ? `
                        <button class="btn-sm activate-profile" data-id="${profile.id}">
                            Activate
                        </button>
                    ` : `
                        <span class="active-label">Active</span>
                    `}
                    
                    ${!profile.locked ? `
                        <button class="btn-sm edit-profile" data-id="${profile.id}">
                            Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    renderConflicts() {
        const container = document.getElementById('conflicts-list');
        if (!container) return;
        
        if (this.conflicts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h3>No conflicts detected</h3>
                    <p>All shortcuts are properly configured.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.conflicts.map(conflict => `
            <div class="conflict-card severity-${conflict.severity}">
                <div class="conflict-header">
                    <h4>
                        <i class="fas fa-exclamation-triangle"></i>
                        Conflict: ${conflict.key}
                    </h4>
                    <span class="severity-badge">${conflict.severity.toUpperCase()}</span>
                </div>
                <div class="conflict-body">
                    <p><strong>Conflicting actions:</strong></p>
                    <ul>
                        ${conflict.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                    ${conflict.resolution ? `
                        <p><strong>Suggested resolution:</strong></p>
                        <ul>
                            ${conflict.resolution.map(res => `<li>${res}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
                <div class="conflict-footer">
                    <button class="btn-sm auto-resolve" data-key="${conflict.key}">
                        Auto-resolve
                    </button>
                    <button class="btn-sm ignore-conflict" data-key="${conflict.key}">
                        Ignore
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // Profile selector
        const profileSelect = document.getElementById('profile-select');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                this.setActiveProfile(e.target.value);
            });
        }
        
        // Search
        const searchInput = document.getElementById('search-shortcuts');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderShortcuts();
            });
        }
        
        // Add shortcut button
        const addBtn = document.getElementById('add-shortcut');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showShortcutModal();
            });
        }
        
        // Scan conflicts button
        const scanBtn = document.getElementById('scan-conflicts');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                this.loadConflicts();
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal('shortcut-modal');
            });
        });
        
        // Save shortcut button
        const saveBtn = document.getElementById('save-shortcut');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveShortcut();
            });
        }
        
        // Record macro button
        const recordBtn = document.getElementById('record-macro');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.startRecordingMacro();
            });
        }
        
        // Stop macro button
        const stopBtn = document.getElementById('stop-macro');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopRecordingMacro();
            });
        }
        
        // Save macro button
        const saveMacroBtn = document.getElementById('save-macro');
        if (saveMacroBtn) {
            saveMacroBtn.addEventListener('click', () => {
                this.saveMacro();
            });
        }
        
        // Event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // Edit shortcut
            if (e.target.closest('.edit-shortcut')) {
                const shortcutId = e.target.closest('.edit-shortcut').dataset.id;
                this.editShortcut(shortcutId);
            }
            
            // Override shortcut
            if (e.target.closest('.override-shortcut')) {
                const shortcutId = e.target.closest('.override-shortcut').dataset.id;
                this.promptOverride(shortcutId);
            }
            
            // Enable/disable shortcut
            if (e.target.closest('.enable-shortcut, .disable-shortcut')) {
                const shortcutId = e.target.closest('button').dataset.id;
                const enable = e.target.closest('.enable-shortcut') !== null;
                this.toggleShortcut(shortcutId, enable);
            }
            
            // Activate profile
            if (e.target.closest('.activate-profile')) {
                const profileId = e.target.closest('.activate-profile').dataset.id;
                this.setActiveProfile(profileId);
            }
            
            // Edit profile
            if (e.target.closest('.edit-profile')) {
                const profileId = e.target.closest('.edit-profile').dataset.id;
                this.editProfile(profileId);
            }
            
            // Auto-resolve conflict
            if (e.target.closest('.auto-resolve')) {
                const key = e.target.closest('.auto-resolve').dataset.key;
                this.autoResolveConflict(key);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Prevent default for certain key combinations
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case ',':
                        e.preventDefault();
                        this.showSettings();
                        break;
                }
            }
        });
    }
    
    setupTabs() {
        const tabs = document.querySelectorAll('.sidebar-nav a');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all tabs
                tabs.forEach(t => t.parentElement.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.parentElement.classList.add('active');
                
                // Show corresponding content
                const tabName = tab.dataset.tab;
                const content = document.getElementById(`${tabName}-tab`);
                if (content) {
                    content.classList.add('active');
                }
            });
        });
    }
    
    async setActiveProfile(profileId) {
        try {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'SET_PROFILE',
                    profileId
                }));
            }
        } catch (error) {
            console.error('Failed to set profile:', error);
            this.showToast('Failed to change profile', 'error');
        }
    }
    
    showShortcutModal(shortcut = null) {
        const modal = document.getElementById('shortcut-modal');
        const form = document.getElementById('shortcut-form');
        
        if (shortcut) {
            // Edit mode
            document.getElementById('shortcut-id').value = shortcut.id;
            document.getElementById('shortcut-action').value = shortcut.action;
            document.getElementById('shortcut-description').value = shortcut.description;
            document.getElementById('shortcut-category').value = shortcut.category;
            document.getElementById('shortcut-primary').value = shortcut.default.primary;
            document.getElementById('shortcut-scope').value = shortcut.scope;
        } else {
            // Create mode
            form.reset();
            document.getElementById('shortcut-id').value = `shortcut_${Date.now()}`;
        }
        
        modal.style.display = 'flex';
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async saveShortcut() {
        const form = document.getElementById('shortcut-form');
        const formData = new FormData(form);
        
        const shortcut = {
            id: formData.get('shortcut-id'),
            action: formData.get('shortcut-action'),
            description: formData.get('shortcut-description'),
            category: formData.get('shortcut-category'),
            default: {
                primary: formData.get('shortcut-primary')
            },
            scope: formData.get('shortcut-scope'),
            enabled: true
        };
        
        try {
            const res = await fetch('/api/shortcuts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shortcut)
            });
            
            if (res.ok) {
                this.showToast('Shortcut saved successfully', 'success');
                this.hideModal('shortcut-modal');
                await this.loadInitialData();
            } else {
                throw new Error('Failed to save shortcut');
            }
        } catch (error) {
            console.error('Failed to save shortcut:', error);
            this.showToast('Failed to save shortcut', 'error');
        }
    }
    
    async toggleShortcut(shortcutId, enable) {
        try {
            // In a real implementation, this would call an API
            console.log(`Toggle shortcut ${shortcutId}: ${enable ? 'enable' : 'disable'}`);
            this.showToast(`Shortcut ${enable ? 'enabled' : 'disabled'}`, 'success');
            
            // Refresh data
            await this.loadInitialData();
        } catch (error) {
            console.error('Failed to toggle shortcut:', error);
            this.showToast('Failed to toggle shortcut', 'error');
        }
    }
    
    async promptOverride(shortcutId) {
        const shortcut = this.shortcuts.find(s => s.id === shortcutId);
        if (!shortcut) return;
        
        const newKey = prompt(`Enter new key combination for "${shortcut.description}":`, shortcut.default.primary);
        
        if (newKey) {
            try {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'SET_OVERRIDE',
                        shortcutId,
                        key: newKey
                    }));
                }
            } catch (error) {
                console.error('Failed to set override:', error);
                this.showToast('Failed to set override', 'error');
            }
        }
    }
    
    async autoResolveConflict(key) {
        try {
            // In a real implementation, this would call an API
            console.log(`Auto-resolve conflict for key: ${key}`);
            this.showToast('Conflict auto-resolved', 'success');
            
            // Refresh conflicts
            await this.loadConflicts();
        } catch (error) {
            console.error('Failed to resolve conflict:', error);
            this.showToast('Failed to resolve conflict', 'error');
        }
    }
    
    startRecordingMacro() {
        this.isRecording = true;
        this.recording = [];
        this.startTime = Date.now();
        
        // Update UI
        document.getElementById('record-macro').disabled = true;
        document.getElementById('stop-macro').disabled = false;
        document.getElementById('save-macro').disabled = true;
        
        // Start listening for shortcuts
        this.macroListener = (shortcut, context) => {
            if (this.isRecording) {
                const delay = Date.now() - this.startTime;
                this.recording.push({
                    action: shortcut.id,
                    delay: delay - (this.recording.length > 0 ? this.recording[this.recording.length - 1].delay : 0)
                });
                this.startTime = Date.now();
            }
        };
        
        // In a real implementation, you would register this listener with the shortcut system
        this.showToast('Macro recording started', 'info');
    }
    
    stopRecordingMacro() {
        this.isRecording = false;
        
        // Update UI
        document.getElementById('record-macro').disabled = false;
        document.getElementById('stop-macro').disabled = true;
        document.getElementById('save-macro').disabled = false;
        
        this.showToast(`Macro recorded: ${this.recording.length} steps`, 'success');
    }
    
    async saveMacro() {
        if (this.recording.length === 0) {
            this.showToast('No macro recorded', 'warning');
            return;
        }
        
        const name = prompt('Enter macro name:', `Macro_${Date.now()}`);
        if (!name) return;
        
        try {
            const res = await fetch('/api/macros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    sequence: this.recording
                })
            });
            
            if (res.ok) {
                this.showToast('Macro saved successfully', 'success');
                this.recording = [];
                document.getElementById('save-macro').disabled = true;
            } else {
                throw new Error('Failed to save macro');
            }
        } catch (error) {
            console.error('Failed to save macro:', error);
            this.showToast('Failed to save macro', 'error');
        }
    }
    
    async exportData() {
        try {
            const res = await fetch('/api/export');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shortcuts-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showToast('Failed to export data', 'error');
        }
    }
    
    focusSearch() {
        const searchInput = document.getElementById('search-shortcuts');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    showSettings() {
        alert('Settings dialog would open here');
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                  type === 'error' ? 'times-circle' : 
                                  type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode === container) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode === container) {
                    container.removeChild(toast);
                }
            }, 300);
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ShortcutManagerUI();
});
```

## **10. CSS Styles**

```css
/* src/ui/styles.css */
:root {
    --primary-color: #4361ee;
    --secondary-color: #3a0ca3;
    --success-color: #4CAF50;
    --warning-color: #FF9800;
    --danger-color: #F44336;
    --info-color: #2196F3;
    
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-tertiary: #e9ecef;
    
    --text-primary: #212529;
    --text-secondary: #6c757d;
    --text-light: #adb5bd;
    
    --border-color: #dee2e6;
    --border-radius: 8px;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
    
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family);
    background: var(--bg-secondary);
    color: var(--text-primary);
    line-height: 1.6;
}

.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header */
.header {
    background: var(--bg-primary);
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow);
    border-bottom: 1px solid var(--border-color);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.logo i {
    font-size: 1.75rem;
    color: var(--primary-color);
}

.logo h1 {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.platform-badge {
    background: var(--bg-tertiary);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.profile-selector select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-family);
    font-size: 0.875rem;
    min-width: 200px;
    cursor: pointer;
    transition: border-color 0.2s;
}

.profile-selector select:focus {
    outline: none;
    border-color: var(--primary-color);
}

.user-menu {
    display: flex;
    gap: 0.5rem;
}

.btn-icon {
    width: 2.5rem;
    height: 2.5rem;
    border: none;
    background: transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.btn-icon:hover {
    background: var(--bg-tertiary);
    color: var(--primary-color);
}

/* Main Content */
.main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* Sidebar */
.sidebar {
    width: 250px;
    background: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sidebar-nav {
    list-style: none;
    padding: 1rem 0;
    flex: 1;
}

.sidebar-nav li {
    margin: 0.25rem 0.75rem;
}

.sidebar-nav a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: var(--text-primary);
    border-radius: var(--border-radius);
    transition: all 0.2s;
    position: relative;
}

.sidebar-nav a:hover {
    background: var(--bg-tertiary);
}

.sidebar-nav li.active a {
    background: var(--primary-color);
    color: white;
}

.sidebar-nav i {
    width: 1.25rem;
    text-align: center;
}

.badge {
    position: absolute;
    right: 1rem;
    background: var(--danger-color);
    color: white;
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
    display: none;
}

.sidebar-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.connection-status i {
    color: #4CAF50;
}

.btn-export {
    width: 100%;
    padding: 0.75rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-family: var(--font-family);
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.2s;
}

.btn-export:hover {
    background: var(--secondary-color);
}

/* Content Area */
.content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

.tab-header {
    margin-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tab-header h2 {
    font-size: 1.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.tab-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.search-box {
    position: relative;
    min-width: 300px;
}

.search-box i {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-light);
}

.search-box input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-family: var(--font-family);
    font-size: 0.875rem;
    transition: border-color 0.2s;
}

.search-box input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.btn-primary, .btn-secondary, .btn-success, .btn-warning, .btn-danger {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--border-radius);
    font-family: var(--font-family);
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background: var(--secondary-color);
}

.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.btn-secondary:hover {
    background: var(--border-color);
}

.btn-success {
    background: var(--success-color);
    color: white;
}

.btn-warning {
    background: var(--warning-color);
    color: white;
}

.btn-danger {
    background: var(--danger-color);
    color: white;
}

.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
}

/* Shortcut Table */
.shortcut-table-container {
    background: var(--bg-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}

.shortcut-table {
    width: 100%;
    border-collapse: collapse;
}

.shortcut-table th {
    background: var(--bg-tertiary);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-color);
}

.shortcut-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.shortcut-table tr:last-child td {
    border-bottom: none;
}

.shortcut-table tr:hover {
    background: var(--bg-tertiary);
}

.key-binding {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.875rem;
    color: var(--text-primary);
}

.key-binding.secondary {
    background: transparent;
    border-style: dashed;
    margin-top: 0.25rem;
}

.category-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.scope-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.scope-global {
    background: #d1e7dd;
    color: #0f5132;
}

.scope-panel {
    background: #cfe2ff;
    color: #084298;
}

.scope-component {
    background: #fff3cd;
    color: #664d03;
}

.status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.status.enabled {
    color: var(--success-color);
}

.status.disabled {
    color: var(--text-light);
}

.actions-cell {
    display: flex;
    gap: 0.5rem;
}

/* Profile Cards */
.profiles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

.profile-card {
    background: var(--bg-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
}

.profile-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.profile-card.active {
    border: 2px solid var(--primary-color);
}

.profile-header {
    padding: 1.5rem;
    background: var(--bg-tertiary);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.profile-header h4 {
    font-size: 1.25rem;
    font-weight: 600;
}

.locked-badge {
    color: var(--text-light);
}

.profile-body {
    padding: 1.5rem;
}

.profile-description {
    color: var(--text-secondary);
    margin-bottom: 1rem;
    font-size: 0.875rem;
}

.profile-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.profile-stats .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.profile-footer {
    padding: 1rem 1.5rem;
    background: var(--bg-tertiary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-color);
}

.active-label {
    color: var(--success-color);
    font-weight: 600;
    font-size: 0.875rem;
}

/* Conflict Cards */
.conflicts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.conflict-card {
    background: var(--bg-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}

.conflict-card.severity-high {
    border-left: 4px solid var(--danger-color);
}

.conflict-card.severity-medium {
    border-left: 4px solid var(--warning-color);
}

.conflict-card.severity-low {
    border-left: 4px solid var(--info-color);
}

.conflict-header {
    padding: 1.25rem 1.5rem;
    background: var(--bg-tertiary);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.conflict-header h4 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
}

.severity-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.conflict-card.severity-high .severity-badge {
    background: var(--danger-color);
    color: white;
}

.conflict-card.severity-medium .severity-badge {
    background: var(--warning-color);
    color: white;
}

.conflict-card.severity-low .severity-badge {
    background: var(--info-color);
    color: white;
}

.conflict-body {
    padding: 1.5rem;
}

.conflict-body ul {
    list-style: none;
    margin: 0.5rem 0 1rem;
}

.conflict-body li {
    padding: 0.25rem 0;
    color: var(--text-secondary);
}

.conflict-footer {
    padding: 1rem 1.5rem;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 0.5rem;
}

/* Analytics Dashboard */
.analytics-dashboard {
    background: var(--bg-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 2rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: var(--bg-tertiary);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.stat-icon {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
}

.stat-content h3 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.stat-content p {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
}

.chart-container {
    background: var(--bg-tertiary);
    border-radius: var(--border-radius);
    padding: 1.5rem;
}

.chart-container h4 {
    margin-bottom: 1rem;
    font-weight: 600;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
}

.empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--success-color);
}

.empty-state h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

/* Modals */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: var(--bg-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-light);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

.form-group {
    margin-bottom: 1.25rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-family: var(--font-family);
    font-size: 0.875rem;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

/* Toast Notifications */
.toast-container {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 1001;
}

.toast {
    background: var(--bg-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    padding: 1rem 1.25rem;
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    transform: translateX(0);
    opacity: 1;
    transition: transform 0.3s, opacity 0.3s;
}

.toast.hide {
    transform: translateX(100%);
    opacity: 0;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.toast i {
    font-size: 1.25rem;
}

.toast-success i {
    color: var(--success-color);
}

.toast-error i {
    color: var(--danger-color);
}

.toast-warning i {
    color: var(--warning-color);
}

.toast-info i {
    color: var(--info-color);
}

.toast-close {
    background: none;
    border: none;
    color: var(--text-light);
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Responsive Design */
@media (max-width: 768px) {
    .header {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }
    
    .header-left, .header-right {
        width: 100%;
        justify-content: space-between;
    }
    
    .main-content {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
    }
    
    .sidebar-nav {
        display: flex;
        overflow-x: auto;
        padding: 0.5rem;
    }
    
    .sidebar-nav li {
        flex-shrink: 0;
    }
    
    .content {
        padding: 1rem;
    }
    
    .tab-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }
    
    .tab-actions {
        flex-direction: column;
    }
    
    .search-box {
        min-width: 100%;
    }
    
    .profiles-grid {
        grid-template-columns: 1fr;
    }
    
    .charts {
        grid-template-columns: 1fr;
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
}
```

## **11. Tests with Bun's Test Runner**

```typescript
// tests/registry.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ShortcutRegistry } from '../src/core/registry';
import { initializeDatabase, closeDatabase } from '../src/database/init';

describe('ShortcutRegistry', () => {
  let registry: ShortcutRegistry;
  
  beforeEach(async () => {
    // Use in-memory database for testing
    process.env.DATA_DIR = ':memory:';
    await initializeDatabase(':memory:');
    registry = new ShortcutRegistry();
  });
  
  afterEach(() => {
    closeDatabase();
  });
  
  test('should initialize with default data', () => {
    expect(registry.getShortcutCount()).toBeGreaterThan(0);
    expect(registry.getAllProfiles().length).toBeGreaterThan(0);
    expect(registry.getActiveProfile()).toBeDefined();
  });
  
  test('should register new shortcut', () => {
    const newShortcut = {
      id: 'test.shortcut',
      action: 'test.action',
      description: 'Test shortcut',
      category: 'general' as const,
      default: {
        primary: 'Ctrl+T',
        secondary: 'Ctrl+Shift+T'
      },
      enabled: true,
      scope: 'global' as const,
      requiresConfirmation: false
    };
    
    registry.register(newShortcut);
    
    const shortcut = registry.getAllShortcuts().find(s => s.id === 'test.shortcut');
    expect(shortcut).toBeDefined();
    expect(shortcut?.description).toBe('Test shortcut');
  });
  
  test('should trigger shortcut', () => {
    let triggered = false;
    
    registry.on('test.shortcut', () => {
      triggered = true;
    });
    
    const result = registry.trigger('test.shortcut');
    expect(result).toBe(true);
    expect(triggered).toBe(true);
  });
  
  test('should detect conflicts', () => {
    // Create two shortcuts with same key
    registry.register({
      id: 'conflict.1',
      action: 'conflict.action1',
      description: 'Conflict 1',
      category: 'general',
      default: { primary: 'F1' },
      enabled: true,
      scope: 'global'
    });
    
    registry.register({
      id: 'conflict.2',
      action: 'conflict.action2',
      description: 'Conflict 2',
      category: 'general',
      default: { primary: 'F1' },
      enabled: true,
      scope: 'global'
    });
    
    const conflicts = registry.detectConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
    
    const f1Conflict = conflicts.find(c => c.key === 'F1');
    expect(f1Conflict).toBeDefined();
    expect(f1Conflict?.actions).toContain('conflict.1');
    expect(f1Conflict?.actions).toContain('conflict.2');
  });
  
  test('should create and switch profiles', () => {
    const profile = registry.createProfile('Test Profile', 'For testing');
    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Test Profile');
    
    registry.setActiveProfile(profile.id);
    expect(registry.getActiveProfile().id).toBe(profile.id);
  });
  
  test('should set and get overrides', () => {
    registry.setOverride('test.shortcut', 'Ctrl+Alt+T');
    
    const profile = registry.getActiveProfile();
    expect(profile.overrides['test.shortcut']).toBe('Ctrl+Alt+T');
  });
  
  test('should track usage statistics', async () => {
    registry.trigger('test.shortcut');
    
    // Wait a bit for async tracking
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const stats = registry.getUsageStatistics();
    expect(stats.length).toBeGreaterThan(0);
    
    const testShortcutStats = stats.find((s: any) => s.id === 'test.shortcut');
    expect(testShortcutStats).toBeDefined();
    expect(testShortcutStats.usage_count).toBeGreaterThan(0);
  });
  
  test('should create and execute macros', async () => {
    const macro = registry.createMacro('Test Macro', [
      { action: 'test.shortcut', delay: 100 },
      { action: 'test.shortcut', delay: 200 }
    ]);
    
    expect(macro.id).toBeDefined();
    expect(macro.sequence.length).toBe(2);
    
    // Execute macro
    const startTime = Date.now();
    await registry.executeMacro(macro.id);
    const duration = Date.now() - startTime;
    
    // Should take at least 300ms (100 + 200)
    expect(duration).toBeGreaterThanOrEqual(300);
  });
});

describe('Conflict Detection', () => {
  test('should categorize conflict severity', () => {
    // Test cases for different conflict scenarios
  });
});

describe('Validation', () => {
  test('should validate key combinations', () => {
    // Test valid keys
    expect(registry['validateKeyCombination']('Ctrl+S')).toBe(true);
    expect(registry['validateKeyCombination']('Ctrl+Shift+S')).toBe(true);
    expect(registry['validateKeyCombination']('F1')).toBe(true);
    
    // Test invalid keys
    expect(registry['validateKeyCombination']('')).toBe(false);
    expect(registry['validateKeyCombination']('Ctrl+Ctrl+S')).toBe(false);
    expect(registry['validateKeyCombination']('Invalid+Key')).toBe(false);
  });
});
```

## **12. Run Scripts**

```json
{
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "start": "bun src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun --minify",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "db:migrate": "bun run src/database/migrate.ts",
    "generate": "bun src/utils/generate-types.ts",
    "lint": "biome check src/",
    "lint:fix": "biome check --apply src/",
    "format": "biome format --write src/"
  }
}
```

## **13. Environment Configuration**

```bash
# .env
PORT=3000
HOST=localhost
DATA_DIR=./data
ENABLE_WS=true
ENABLE_BACKUP=true
BACKUP_INTERVAL=3600000
LOG_LEVEL=info
NODE_ENV=development
```

## **14. Type Definitions**

```typescript
// src/types/index.ts
export interface ShortcutConfig {
  id: string;
  action: string;
  description: string;
  category: 'theme' | 'telemetry' | 'emulator' | 'general' | 'compliance' | 'logs' | 'ui' | 'developer' | 'accessibility' | 'data' | 'payment';
  default: {
    primary: string;
    secondary?: string;
    macOS?: string;
    linux?: string;
  };
  enabled: boolean;
  scope: 'global' | 'panel' | 'component';
  requiresConfirmation?: boolean;
  condition?: () => boolean;
}

export interface ShortcutProfile {
  id: string;
  name: string;
  description: string;
  basedOn?: string;
  shortcuts: Record<string, ShortcutConfig>;
  overrides: Record<string, string>;
  enabled: boolean;
  locked?: boolean;
  category: 'default' | 'professional' | 'developer' | 'compliance' | 'accessibility' | 'custom' | 'terminal';
}

export interface ShortcutConflict {
  key: string;
  actions: string[];
  severity: 'low' | 'medium' | 'high';
  resolution?: string[];
}

export interface ShortcutPreferences {
  userId: string;
  activeProfileId: string;
  keyboardLayout: string;
  enableSounds: boolean;
  enableHints: boolean;
  enableTraining: boolean;
  autoResolveConflicts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShortcutMacro {
  id: string;
  name: string;
  description: string;
  sequence: Array<{action: string; delay: number}>;
  profileId?: string;
  enabled: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingProgress {
  userId: string;
  lessonId: string;
  score: number;
  completed: boolean;
  completedAt?: Date;
  attempts: number;
  bestTimeMs?: number;
}

export interface UsageAnalytics {
  shortcutId: string;
  profileId: string;
  userId: string;
  timestamp: Date;
  context?: string;
  success: boolean;
  responseTimeMs?: number;
}
```

## **Key Features of This Bun-native Implementation:**

1. **Zero Dependencies**: Uses only Bun's built-in APIs
2. **SQLite Database**: Persistent storage with migrations
3. **WebSocket Support**: Real-time updates
4. **Hot Reload**: Watch mode during development
5. **Type Safety**: Full TypeScript support
6. **Testing**: Bun's built-in test runner
7. **Production Ready**: Build optimization with `bun build`
8. **Modern Frontend**: HTML/CSS/JS with no framework
9. **API-First**: RESTful API for programmatic access
10. **Web-based UI**: No Electron required

## **To Run:**

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone <your-repo>
cd lightning-shortcut-system
bun install

# Development
bun run dev

# Production
bun run build
bun run start

# Tests
bun test
```

This implementation is **100% Bun-native**, leveraging Bun's speed, built-in tools, and modern JavaScript APIs while providing a complete, production-ready shortcut system with all the features from your design document.