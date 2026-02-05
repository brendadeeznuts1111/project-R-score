#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Database Migration Script
 * Handles database schema migrations and data transformations
 */

import { createDatabaseConnection, DatabaseUtils } from '../lib/database';

async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');

  try {
    const { db, initialize } = createDatabaseConnection();
    const dbUtils = new DatabaseUtils(db);

    await initialize();

    // Get current schema version
    const schemaVersion = await getCurrentSchemaVersion(db);

    console.log(`📊 Current schema version: ${schemaVersion}`);

    // Run pending migrations
    await runPendingMigrations(db, dbUtils, schemaVersion);

    // Update schema version
    await updateSchemaVersion(db);

    // Verify migrations
    await verifyMigrations(db);

    console.log('✅ Database migrations completed successfully');

    db.close();
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

async function getCurrentSchemaVersion(db: any): Promise<number> {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get migration count as version
  const result = db.prepare('SELECT COUNT(*) as version FROM schema_migrations').get();
  return result.version;
}

async function runPendingMigrations(
  db: any,
  dbUtils: DatabaseUtils,
  currentVersion: number
): Promise<void> {
  const migrations = [
    {
      version: 1,
      name: 'add_performance_indexes',
      up: () => {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_packages_download_count ON packages(download_count);
          CREATE INDEX IF NOT EXISTS idx_packages_star_count ON packages(star_count);
          CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_user ON audit_log(timestamp, user_id);
        `);
      },
    },
    {
      version: 2,
      name: 'add_package_metadata',
      up: () => {
        db.exec(`
          ALTER TABLE packages ADD COLUMN metadata TEXT;
          ALTER TABLE package_versions ADD COLUMN metadata TEXT;
        `);
      },
    },
    {
      version: 3,
      name: 'add_security_enhancements',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS package_dependencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            package_version_id INTEGER NOT NULL,
            dependency_name TEXT NOT NULL,
            dependency_version TEXT NOT NULL,
            dependency_type TEXT DEFAULT 'runtime',
            FOREIGN KEY (package_version_id) REFERENCES package_versions(id)
          );

          CREATE INDEX IF NOT EXISTS idx_dependencies_package ON package_dependencies(package_version_id);
          CREATE INDEX IF NOT EXISTS idx_dependencies_name ON package_dependencies(dependency_name);
        `);
      },
    },
  ];

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`🔧 Running migration: ${migration.name}`);

      try {
        await dbUtils.executeTransaction(async () => {
          migration.up();

          // Record migration
          db.prepare(
            `
            INSERT INTO schema_migrations (migration_name)
            VALUES (?)
          `
          ).run(migration.name);
        });

        console.log(`✅ Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
  }
}

async function updateSchemaVersion(db: any): Promise<void> {
  // This is handled automatically in runPendingMigrations
  console.log('📝 Schema version updated');
}

async function verifyMigrations(db: any): Promise<void> {
  // Verify critical tables exist
  const criticalTables = [
    'packages',
    'package_versions',
    'audit_log',
    'security_scans',
    'compliance_checks',
  ];

  for (const table of criticalTables) {
    const result = db
      .prepare(
        `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name=?
    `
      )
      .get(table);

    if (!result) {
      throw new Error(`Critical table '${table}' is missing`);
    }
  }

  console.log('✅ Migration verification completed');
}

// Rollback functionality for development
async function rollbackMigration(migrationName?: string): Promise<void> {
  console.log('⏪ Rolling back migrations...');

  const { db } = createDatabaseConnection();

  try {
    if (migrationName) {
      // Rollback specific migration
      const result = db
        .prepare(
          `
        DELETE FROM schema_migrations WHERE migration_name = ?
      `
        )
        .run(migrationName);

      if (result.changes > 0) {
        console.log(`✅ Rolled back migration: ${migrationName}`);
      } else {
        console.log(`⚠️ Migration not found: ${migrationName}`);
      }
    } else {
      // Rollback last migration
      const lastMigration = db
        .prepare(
          `
        SELECT migration_name FROM schema_migrations
        ORDER BY id DESC LIMIT 1
      `
        )
        .get();

      if (lastMigration) {
        db.prepare(
          `
          DELETE FROM schema_migrations WHERE migration_name = ?
        `
        ).run(lastMigration.migration_name);

        console.log(`✅ Rolled back migration: ${lastMigration.migration_name}`);
      } else {
        console.log('⚠️ No migrations to rollback');
      }
    }
  } catch (error) {
    console.error('❌ Migration rollback failed:', error);
  } finally {
    db.close();
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (import.meta.main) {
  switch (command) {
    case 'rollback':
      const migrationName = args[1];
      rollbackMigration(migrationName).catch(console.error);
      break;
    case 'status':
      // Show migration status
      const { db } = createDatabaseConnection();
      const migrations = db
        .prepare(
          `
        SELECT migration_name, executed_at
        FROM schema_migrations
        ORDER BY executed_at DESC
      `
        )
        .all();

      console.log('📊 Migration Status:');
      console.log('==================');
      if (migrations.length === 0) {
        console.log('No migrations executed');
      } else {
        migrations.forEach((migration: any) => {
          console.log(`${migration.executed_at} - ${migration.migration_name}`);
        });
      }
      db.close();
      break;
    default:
      runMigrations().catch(console.error);
  }
}

export { runMigrations, rollbackMigration };
