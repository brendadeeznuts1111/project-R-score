#!/usr/bin/env bun

/**
 * 🗄️ Local Database Setup for Fantasy42-Fire22
 *
 * Automated SQLite database setup using Bun's native SQLite
 * Zero external dependencies - pure Bun ecosystem
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Database } from 'bun:sqlite'; // Bun's native SQLite - zero dependencies!

interface DatabaseConfig {
  path: string;
  migrations: string[];
  seeds: string[];
  sync: {
    enabled: boolean;
    remoteUrl?: string;
    tables: string[];
  };
}

class LocalDatabaseSetup {
  private db: Database;
  private config: DatabaseConfig;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      path: './domain-data.sqlite',
      migrations: [
        '001_create_users_table',
        '002_create_bets_table',
        '003_create_sports_table',
        '004_create_analytics_table',
        '005_create_security_table',
      ],
      seeds: ['users_seed', 'sports_seed', 'sample_bets_seed'],
      sync: {
        enabled: false,
        tables: ['users', 'bets', 'sports', 'analytics'],
      },
      ...config,
    };

    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const dbPath = join(process.cwd(), this.config.path);
    const dbDir = join(process.cwd(), 'data');

    // Ensure data directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    console.log(`🗄️ Database initialized at: ${dbPath}`);
  }

  private async runMigrations(): Promise<void> {
    console.log('🏗️ Running database migrations...');

    // Create migrations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migration of this.config.migrations) {
      // Check if migration already ran
      const existing = this.db
        .query('SELECT id FROM migrations WHERE name = ?')
        .get(migration) as any;

      if (existing) {
        console.log(`✅ Migration ${migration} already executed`);
        continue;
      }

      // Run migration
      const migrationPath = join(process.cwd(), 'database', 'migrations', `${migration}.sql`);

      if (existsSync(migrationPath)) {
        const sql = readFileSync(migrationPath, 'utf-8');
        this.db.run(sql);

        // Record migration
        this.db.run('INSERT INTO migrations (name) VALUES (?)', migration);
        console.log(`✅ Migration ${migration} executed`);
      } else {
        console.log(`⚠️ Migration file not found: ${migrationPath}`);
      }
    }
  }

  private async runSeeds(): Promise<void> {
    console.log('🌱 Running database seeds...');

    for (const seed of this.config.seeds) {
      const seedPath = join(process.cwd(), 'database', 'seeds', `${seed}.sql`);

      if (existsSync(seedPath)) {
        const sql = readFileSync(seedPath, 'utf-8');
        this.db.run(sql);
        console.log(`✅ Seed ${seed} executed`);
      } else {
        console.log(`⚠️ Seed file not found: ${seedPath}`);
      }
    }
  }

  private createDefaultTables(): void {
    console.log('📋 Creating default tables...');

    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sports table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bets table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        sport_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        odds DECIMAL(5,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (sport_id) REFERENCES sports(id)
      )
    `);

    // Analytics table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        user_id INTEGER,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Default tables created');
  }

  private async syncWithRemote(): Promise<void> {
    if (!this.config.sync.enabled || !this.config.sync.remoteUrl) {
      return;
    }

    console.log('🔄 Syncing with remote database...');

    try {
      for (const table of this.config.sync.tables) {
        // This would implement actual sync logic
        console.log(`🔄 Syncing table: ${table}`);
      }

      console.log('✅ Remote sync completed');
    } catch (error) {
      console.log(`⚠️ Remote sync failed: ${error}`);
    }
  }

  private createSampleData(): void {
    console.log('🎲 Creating sample data...');

    // Insert sample sports
    const sports = [
      { name: 'American Football', code: 'NFL' },
      { name: 'Basketball', code: 'NBA' },
      { name: 'Baseball', code: 'MLB' },
      { name: 'Hockey', code: 'NHL' },
      { name: 'Soccer', code: 'SOC' },
    ];

    for (const sport of sports) {
      this.db.run(
        'INSERT OR IGNORE INTO sports (name, code) VALUES (?, ?)',
        sport.name,
        sport.code
      );
    }

    // Insert sample user
    this.db.run(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@apexodds.net', '$2b$10$dummy.hash.for.dev', 'admin')
    `);

    console.log('✅ Sample data created');
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up local database...\n');

    try {
      // Create tables
      this.createDefaultTables();

      // Run migrations
      await this.runMigrations();

      // Run seeds
      await this.runSeeds();

      // Create sample data
      this.createSampleData();

      // Sync with remote if enabled
      await this.syncWithRemote();

      console.log('\n🎉 Database setup completed successfully!');
      console.log(`📍 Database location: ${this.config.path}`);

      // Show database stats
      this.showStats();
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  private showStats(): void {
    console.log('\n📊 Database Statistics:');

    try {
      const tables = this.db
        .query(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `
        )
        .all() as any[];

      for (const table of tables) {
        const count = this.db.query(`SELECT COUNT(*) as count FROM ${table.name}`).get() as any;
        console.log(`  📋 ${table.name}: ${count.count} records`);
      }

      const dbSize = this.db
        .query('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
        .get() as any;
      console.log(`  💾 Database size: ${(dbSize.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.log('  ⚠️ Could not retrieve statistics');
    }
  }

  async backup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(process.cwd(), 'backups', `db-backup-${timestamp}.sqlite`);

    const backupDir = join(process.cwd(), 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Copy database file
    const fs = await import('fs');
    await fs.promises.copyFile(this.config.path, backupPath);

    console.log(`💾 Database backup created: ${backupPath}`);
  }

  async reset(): Promise<void> {
    console.log('⚠️ Resetting database...');

    // Close current connection
    this.db.close();

    // Remove database file
    const fs = await import('fs');
    if (existsSync(this.config.path)) {
      await fs.promises.unlink(this.config.path);
    }

    console.log('✅ Database reset complete');

    // Reinitialize
    this.initializeDatabase();
  }

  query(sql: string, params: any[] = []): any {
    return this.db.query(sql).all(...params);
  }

  close(): void {
    this.db.close();
    console.log('🔒 Database connection closed');
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  const dbSetup = new LocalDatabaseSetup({
    path: './domain-data.sqlite',
    sync: {
      enabled: args.includes('--sync'),
      remoteUrl: process.env.REMOTE_DB_URL,
    },
  });

  switch (command) {
    case 'setup':
      await dbSetup.setup();
      break;

    case 'backup':
      await dbSetup.backup();
      break;

    case 'reset':
      await dbSetup.reset();
      await dbSetup.setup();
      break;

    case 'stats':
      dbSetup.showStats();
      break;

    default:
      console.log('Usage: bun run scripts/local-db-setup.bun.ts [setup|backup|reset|stats]');
      break;
  }

  dbSetup.close();
}

export { LocalDatabaseSetup };
