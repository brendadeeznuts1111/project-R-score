/**
 * Database migration system for ShortcutRegistry
 */

import { Database } from 'bun:sqlite';
import { getDatabase } from './init';
import { logger } from '../utils/logger';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

/**
 * Migration history table schema
 */
function createMigrationsTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get current database version
 */
function getCurrentVersion(db: Database): number {
  createMigrationsTable(db);
  const result = db.query('SELECT MAX(version) as version FROM migrations').get() as any;
  return result?.version || 0;
}

/**
 * Record migration as applied
 */
function recordMigration(db: Database, version: number, name: string): void {
  const stmt = db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)');
  stmt.run(version, name);
}

/**
 * Remove migration record (for rollback)
 */
function removeMigration(db: Database, version: number): void {
  const stmt = db.prepare('DELETE FROM migrations WHERE version = ?');
  stmt.run(version);
}

/**
 * Get all applied migrations
 */
export function getAppliedMigrations(db: Database): Array<{ version: number; name: string; applied_at: string }> {
  createMigrationsTable(db);
  return db.query('SELECT version, name, applied_at FROM migrations ORDER BY version').all() as any[];
}

/**
 * Define migrations
 * Add new migrations here in order
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: Database) => {
      // This migration is handled by init.ts schema creation
      // It's here for reference and future migrations
      logger.info('Migration 1: Initial schema already exists');
    },
    down: (db: Database) => {
      logger.warn('Cannot rollback initial schema');
    }
  },
  // Add future migrations here:
  // {
  //   version: 2,
  //   name: 'add_new_feature',
  //   up: (db: Database) => {
  //     db.exec('ALTER TABLE shortcuts ADD COLUMN new_field TEXT');
  //   },
  //   down: (db: Database) => {
  //     db.exec('ALTER TABLE shortcuts DROP COLUMN new_field');
  //   }
  // }
];

/**
 * Run migrations up to target version (or latest if not specified)
 */
export function migrate(targetVersion?: number): void {
  const db = getDatabase();
  const currentVersion = getCurrentVersion(db);
  const target = targetVersion || Math.max(...migrations.map(m => m.version));

  logger.info(`Current database version: ${currentVersion}`, { targetVersion: target });

  const migrationsToRun = migrations.filter(m => m.version > currentVersion && m.version <= target);

  if (migrationsToRun.length === 0) {
    logger.info('Database is up to date');
    return;
  }

  logger.info(`Running ${migrationsToRun.length} migration(s)`);

  for (const migration of migrationsToRun) {
    try {
      logger.info(`Running migration ${migration.version}: ${migration.name}`);
      db.exec('BEGIN TRANSACTION');
      migration.up(db);
      recordMigration(db, migration.version, migration.name);
      db.exec('COMMIT');
      logger.info(`Migration ${migration.version} completed successfully`);
    } catch (error) {
      db.exec('ROLLBACK');
      logger.error(`Migration ${migration.version} failed`, error as Error);
      throw error;
    }
  }

  logger.info(`Migration complete. Database version: ${target}`);
}

/**
 * Rollback migrations down to target version
 */
export function rollback(targetVersion: number): void {
  const db = getDatabase();
  const currentVersion = getCurrentVersion(db);

  if (targetVersion >= currentVersion) {
    logger.warn(`Cannot rollback to version ${targetVersion}. Current version is ${currentVersion}`);
    return;
  }

  logger.info(`Rolling back from version ${currentVersion} to ${targetVersion}`);

  const migrationsToRollback = migrations
    .filter(m => m.version > targetVersion && m.version <= currentVersion)
    .sort((a, b) => b.version - a.version); // Rollback in reverse order

  for (const migration of migrationsToRollback) {
    try {
      logger.info(`Rolling back migration ${migration.version}: ${migration.name}`);
      db.exec('BEGIN TRANSACTION');
      migration.down(db);
      removeMigration(db, migration.version);
      db.exec('COMMIT');
      logger.info(`Rollback ${migration.version} completed successfully`);
    } catch (error) {
      db.exec('ROLLBACK');
      logger.error(`Rollback ${migration.version} failed`, error as Error);
      throw error;
    }
  }

  logger.info(`Rollback complete. Database version: ${targetVersion}`);
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  currentVersion: number;
  latestVersion: number;
  pendingMigrations: number;
  migrations: Array<{ version: number; name: string; applied: boolean }>;
} {
  const db = getDatabase();
  const currentVersion = getCurrentVersion(db);
  const latestVersion = Math.max(...migrations.map(m => m.version), 0);
  const appliedMigrations = getAppliedMigrations(db);
  const appliedVersions = new Set(appliedMigrations.map(m => m.version));

  return {
    currentVersion,
    latestVersion,
    pendingMigrations: migrations.filter(m => m.version > currentVersion).length,
    migrations: migrations.map(m => ({
      version: m.version,
      name: m.name,
      applied: appliedVersions.has(m.version)
    }))
  };
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  try {
    migrate();
    const status = getMigrationStatus();
    console.log('\nMigration Status:');
    console.log(`  Current Version: ${status.currentVersion}`);
    console.log(`  Latest Version: ${status.latestVersion}`);
    console.log(`  Pending Migrations: ${status.pendingMigrations}`);
    console.log('\nApplied Migrations:');
    status.migrations.forEach(m => {
      console.log(`  ${m.applied ? '✓' : '✗'} ${m.version}: ${m.name}`);
    });
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
