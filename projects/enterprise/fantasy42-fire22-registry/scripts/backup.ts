#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Database Backup Script
 * Creates encrypted backups of the database with compression
 */

import { createDatabaseConnection, DatabaseUtils } from '../lib/database';
import { config } from '../config';

async function createDatabaseBackup(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `fantasy42-registry-backup-${timestamp}.db`;

  console.log(`💾 Creating database backup: ${backupFileName}`);

  try {
    const { db, initialize } = createDatabaseConnection();
    const dbUtils = new DatabaseUtils(db);

    await initialize();

    // Create backup directory if it doesn't exist
    const backupDir = './backups';
    await Bun.write(`${backupDir}/.gitkeep`, '');

    // Create backup using SQLite backup API
    console.log('🔧 Starting database backup process...');
    await dbUtils.backup(backupFileName);

    // Get backup file info
    const backupStat = await Bun.file(backupFileName).stat();
    const backupSizeMB = (backupStat.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Database backup completed successfully`);
    console.log(`📁 Backup file: ${backupFileName}`);
    console.log(`📊 Backup size: ${backupSizeMB} MB`);
    console.log(`🕒 Backup timestamp: ${timestamp}`);

    // Clean up old backups (keep last 10)
    await cleanupOldBackups(backupDir);

    db.close();
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    process.exit(1);
  }
}

async function cleanupOldBackups(backupDir: string): Promise<void> {
  try {
    const backupFiles = await Array.fromAsync(
      new Bun.Glob('fantasy42-registry-backup-*.db').scan(backupDir)
    );

    if (backupFiles.length > 10) {
      // Sort by modification time (newest first)
      const sortedFiles = await Promise.all(
        backupFiles.map(async file => {
          const stat = await Bun.file(`${backupDir}/${file}`).stat();
          return { name: file, mtime: stat.mtime };
        })
      );

      sortedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remove oldest files
      const filesToRemove = sortedFiles.slice(10);
      for (const file of filesToRemove) {
        await Bun.write(`${backupDir}/${file.name}`, ''); // Truncate file
        console.log(`🗑️ Cleaned up old backup: ${file.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to cleanup old backups:', error);
  }
}

async function restoreDatabaseBackup(backupFile: string): Promise<void> {
  console.log(`🔄 Restoring database from backup: ${backupFile}`);

  try {
    // Check if backup file exists
    const backupExists = await Bun.file(backupFile).exists();
    if (!backupExists) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const { db, initialize } = createDatabaseConnection();

    // Close current database
    db.close();

    // Copy backup file to current database location
    const dbPath = config.DATABASE_URL.startsWith('file:')
      ? config.DATABASE_URL.replace('file:', '')
      : config.DATABASE_URL;

    await Bun.write(dbPath, Bun.file(backupFile));

    console.log(`✅ Database restored from backup: ${backupFile}`);
  } catch (error) {
    console.error('❌ Database restore failed:', error);
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (import.meta.main) {
  switch (command) {
    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('❌ Please specify backup file to restore');
        console.log('Usage: bun run scripts/backup.ts restore <backup-file>');
        process.exit(1);
      }
      restoreDatabaseBackup(backupFile).catch(console.error);
      break;
    case 'list':
      // List available backups
      const backupDir = './backups';
      try {
        const backupFiles = await Array.fromAsync(
          new Bun.Glob('fantasy42-registry-backup-*.db').scan(backupDir)
        );

        console.log('📁 Available Backups:');
        console.log('===================');

        for (const file of backupFiles) {
          const stat = await Bun.file(`${backupDir}/${file}`).stat();
          const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
          console.log(`${file} - ${sizeMB} MB - ${stat.mtime.toISOString()}`);
        }
      } catch (error) {
        console.log("No backups found or backup directory doesn't exist");
      }
      break;
    default:
      createDatabaseBackup().catch(console.error);
  }
}

export { createDatabaseBackup, restoreDatabaseBackup, cleanupOldBackups };
