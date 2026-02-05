/**
 * Database backup utility
 */

import { Database } from 'bun:sqlite';
import { getDatabase, closeDatabase } from './init';
import { logger } from '../utils/logger';
import { existsSync, copyFileSync, readdirSync, statSync } from 'fs';

const DB_PATH = process.env.DATABASE_PATH || 'shortcuts.db';

/**
 * Create a backup of the database
 */
export function backupDatabase(backupPath?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultBackupPath = backupPath || `shortcuts.backup.${timestamp}.db`;

  logger.info('Creating database backup', { source: DB_PATH, destination: defaultBackupPath });

  try {
    if (!existsSync(DB_PATH)) {
      throw new Error(`Database file not found: ${DB_PATH}`);
    }

    // Close any open connections
    closeDatabase();

    // Copy database file
    copyFileSync(DB_PATH, defaultBackupPath);

    const stats = statSync(defaultBackupPath);
    logger.info('Backup created successfully', {
      path: defaultBackupPath,
      size: `${(stats.size / 1024).toFixed(2)} KB`
    });

    return defaultBackupPath;
  } catch (error) {
    logger.error('Backup failed', error as Error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
export function restoreDatabase(backupPath: string): void {
  logger.info('Restoring database from backup', { backup: backupPath });

  try {
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Close any open connections
    closeDatabase();

    // Copy backup to database location
    copyFileSync(backupPath, DB_PATH);

    logger.info('Database restored successfully');
  } catch (error) {
    logger.error('Restore failed', error as Error);
    throw error;
  }
}

/**
 * List available backups
 */
export function listBackups(): string[] {
  const dir = process.cwd();
  const files = readdirSync(dir);
  
  return files
    .filter(file => file.startsWith('shortcuts.backup.') && file.endsWith('.db'))
    .sort()
    .reverse(); // Most recent first
}

// Run backup if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'restore' && args[1]) {
      restoreDatabase(args[1]);
      console.log('\n✓ Database restored');
    } else if (command === 'list') {
      const backups = listBackups();
      console.log('\nAvailable backups:');
      if (backups.length === 0) {
        console.log('  No backups found');
      } else {
        backups.forEach(backup => {
          const stats = statSync(backup);
          console.log(`  ${backup} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }
    } else {
      const backupPath = backupDatabase();
      console.log(`\n✓ Backup created: ${backupPath}`);
    }
  } catch (error) {
    console.error('\n✗ Operation failed:', error);
    process.exit(1);
  }
}
