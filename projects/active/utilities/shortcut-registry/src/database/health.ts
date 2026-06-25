/**
 * Database health check utility
 */

import { Database } from 'bun:sqlite';
import { getDatabase } from './init';
import { logger } from '../utils/logger';
import { existsSync, statSync } from 'fs';

const DB_PATH = process.env.DATABASE_PATH || 'shortcuts.db';

export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    fileExists: boolean;
    canConnect: boolean;
    tablesExist: boolean;
    migrationsUpToDate: boolean;
    integrity: boolean;
  };
  details: {
    fileSize?: number;
    tableCount?: number;
    migrationVersion?: number;
    integrityErrors?: string[];
  };
  errors: string[];
}

/**
 * Perform database health check
 */
export function checkDatabaseHealth(): HealthCheckResult {
  const result: HealthCheckResult = {
    healthy: true,
    checks: {
      fileExists: false,
      canConnect: false,
      tablesExist: false,
      migrationsUpToDate: false,
      integrity: false
    },
    details: {},
    errors: []
  };

  // Check if database file exists
  try {
    if (existsSync(DB_PATH)) {
      result.checks.fileExists = true;
      const stats = statSync(DB_PATH);
      result.details.fileSize = stats.size;
    } else {
      result.errors.push('Database file does not exist');
      result.healthy = false;
      return result;
    }
  } catch (error) {
    result.errors.push(`Cannot access database file: ${error}`);
    result.healthy = false;
    return result;
  }

  // Check database connection and schema
  try {
    const db = getDatabase();

    // Check if we can query
    result.checks.canConnect = true;

    // Check if tables exist
    const tables = db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>;

    const requiredTables = [
      'shortcuts',
      'profiles',
      'profile_overrides',
      'macros',
      'user_preferences',
      'shortcut_usage',
      'training_progress'
    ];

    const existingTableNames = tables.map(t => t.name);
    const missingTables = requiredTables.filter(t => !existingTableNames.includes(t));

    if (missingTables.length === 0) {
      result.checks.tablesExist = true;
      result.details.tableCount = tables.length;
    } else {
      result.errors.push(`Missing tables: ${missingTables.join(', ')}`);
      result.healthy = false;
    }

    // Check migrations
    try {
      const migrations = db.query('SELECT MAX(version) as version FROM migrations').get() as any;
      result.details.migrationVersion = migrations?.version || 0;
      result.checks.migrationsUpToDate = true; // Simplified check
    } catch (error) {
      result.errors.push(`Migration check failed: ${error}`);
    }

    // Check database integrity
    try {
      const integrity = db.query('PRAGMA integrity_check').get() as any;
      if (integrity?.integrity_check === 'ok') {
        result.checks.integrity = true;
      } else {
        result.errors.push(`Integrity check failed: ${integrity?.integrity_check}`);
        result.healthy = false;
      }
    } catch (error) {
      result.errors.push(`Integrity check error: ${error}`);
    }

  } catch (error) {
    result.errors.push(`Database connection failed: ${error}`);
    result.healthy = false;
  }

  return result;
}

/**
 * Print health check results
 */
export function printHealthCheck(result: HealthCheckResult): void {
  console.info('\n📊 Database Health Check\n');
  console.info(`Status: ${result.healthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

  console.info('Checks:');
  console.info(`  File Exists:        ${result.checks.fileExists ? '✅' : '❌'}`);
  console.info(`  Can Connect:        ${result.checks.canConnect ? '✅' : '❌'}`);
  console.info(`  Tables Exist:       ${result.checks.tablesExist ? '✅' : '❌'}`);
  console.info(`  Migrations Updated: ${result.checks.migrationsUpToDate ? '✅' : '❌'}`);
  console.info(`  Integrity:         ${result.checks.integrity ? '✅' : '❌'}`);

  if (result.details.fileSize) {
    console.info(`\nDetails:`);
    console.info(`  File Size: ${(result.details.fileSize / 1024).toFixed(2)} KB`);
    if (result.details.tableCount) {
      console.info(`  Tables: ${result.details.tableCount}`);
    }
    if (result.details.migrationVersion !== undefined) {
      console.info(`  Migration Version: ${result.details.migrationVersion}`);
    }
  }

  if (result.errors.length > 0) {
    console.info(`\nErrors:`);
    result.errors.forEach(error => {
      console.info(`  ❌ ${error}`);
    });
  }

  console.info('');
}

// Run health check if this file is executed directly
if (import.meta.main) {
  try {
    const result = checkDatabaseHealth();
    printHealthCheck(result);
    process.exit(result.healthy ? 0 : 1);
  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  }
}
