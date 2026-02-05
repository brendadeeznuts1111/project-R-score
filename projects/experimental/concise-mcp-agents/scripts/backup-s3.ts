#!/usr/bin/env bun

// [BACKUP][S3][SYNC][BK-S3-001][v1.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-BK1][v1.0.0][ACTIVE]

import { execSync, spawn } from 'child_process';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

interface BackupConfig {
  s3Bucket: string;
  s3Prefix: string;
  includePaths: string[];
  excludePatterns: string[];
  schedule: string;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

class BackupManager {
  private config: BackupConfig;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): BackupConfig {
    const defaultConfig: BackupConfig = {
      s3Bucket: process.env.S3_BUCKET || 'bun-enhanced-agents-backup',
      s3Prefix: process.env.S3_PREFIX || 'backups/',
      includePaths: [
        'dashboards/',
        'config/',
        'scripts/',
        'logs/',
        'templates/'
      ],
      excludePatterns: [
        'node_modules/',
        '*.log',
        '*.tmp',
        '.git/',
        'dist/',
        '*.exe'
      ],
      schedule: '0 2 * * *', // Daily at 2 AM
      retention: {
        daily: 7,    // Keep 7 daily backups
        weekly: 4,   // Keep 4 weekly backups
        monthly: 12  // Keep 12 monthly backups
      }
    };

    // Try to load from config file
    try {
      const configFile = configPath || 'config/backup.json';
      const customConfig = JSON.parse(readFileSync(configFile, 'utf-8'));
      return { ...defaultConfig, ...customConfig };
    } catch {
      return defaultConfig;
    }
  }

  async createBackup(): Promise<{ success: boolean; message: string; archivePath?: string }> {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const archiveName = `backup-${timestamp}.tar.gz`;
      const archivePath = join(process.cwd(), 'tmp', archiveName);

      // Ensure tmp directory exists
      await Bun.$`mkdir -p tmp`.quiet();

      // Create tar archive with exclusions
      const excludeArgs = this.config.excludePatterns.flatMap(pattern => ['--exclude', pattern]);
      const includeArgs = this.config.includePaths;

      console.log(`📦 Creating backup archive: ${archiveName}`);

      await Bun.$`tar -czf ${archivePath} ${excludeArgs} ${includeArgs}`.quiet();

      console.log(`✅ Archive created: ${archivePath}`);

      return {
        success: true,
        message: `Backup archive created successfully`,
        archivePath
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create backup: ${error.message}`
      };
    }
  }

  async uploadToS3(archivePath: string): Promise<{ success: boolean; message: string }> {
    try {
      const filename = archivePath.split('/').pop()!;
      const s3Key = `${this.config.s3Prefix}${filename}`;

      console.log(`☁️  Uploading to S3: s3://${this.config.s3Bucket}/${s3Key}`);

      // Use AWS CLI to upload (assuming it's configured)
      await Bun.$`aws s3 cp ${archivePath} s3://${this.config.s3Bucket}/${s3Key}`.quiet();

      console.log(`✅ Upload complete`);

      return {
        success: true,
        message: `Backup uploaded to S3 successfully`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to upload to S3: ${error.message}`
      };
    }
  }

  async syncGit(): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 Syncing with git...`);

      // Add all changes
      await Bun.$`git add .`.quiet();

      // Check if there are changes to commit
      const status = await Bun.$`git status --porcelain`.quiet();
      const hasChanges = status.stdout.toString().trim().length > 0;

      if (hasChanges) {
        const timestamp = new Date().toISOString();
        await Bun.$`git commit -m "backup: Automated backup ${timestamp}"`.quiet();
      }

      // Push to remote
      await Bun.$`git push origin master`.quiet();

      console.log(`✅ Git sync complete`);

      return {
        success: true,
        message: `Git repository synced successfully`
      };

    } catch (error) {
      return {
        success: false,
        message: `Git sync failed: ${error.message}`
      };
    }
  }

  async fullBackup(): Promise<{ success: boolean; message: string }> {
    console.log(`🚀 Starting full backup process...`);

    // 1. Create backup archive
    const backupResult = await this.createBackup();
    if (!backupResult.success) {
      return backupResult;
    }

    // 2. Upload to S3
    const uploadResult = await this.uploadToS3(backupResult.archivePath!);
    if (!uploadResult.success) {
      return uploadResult;
    }

    // 3. Sync git
    const gitResult = await this.syncGit();
    if (!gitResult.success) {
      return gitResult;
    }

    // 4. Clean up local archive
    try {
      await Bun.$`rm ${backupResult.archivePath}`.quiet();
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      message: `Full backup completed successfully - Archive uploaded to S3 and git synced`
    };
  }

  async listBackups(): Promise<{ success: boolean; message: string; backups?: string[] }> {
    try {
      console.log(`📋 Listing S3 backups...`);

      const result = await Bun.$`aws s3 ls s3://${this.config.s3Bucket}/${this.config.s3Prefix}`.quiet();
      const backups = result.stdout.toString()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.split(/\s+/).slice(-1)[0])
        .sort()
        .reverse(); // Most recent first

      return {
        success: true,
        message: `Found ${backups.length} backups in S3`,
        backups
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to list backups: ${error.message}`
      };
    }
  }

  async cleanupOldBackups(): Promise<{ success: boolean; message: string }> {
    try {
      const listResult = await this.listBackups();
      if (!listResult.success || !listResult.backups) {
        return listResult;
      }

      const backups = listResult.backups;
      const toDelete: string[] = [];

      // Group by type (daily, weekly, monthly)
      const daily: string[] = [];
      const weekly: string[] = [];
      const monthly: string[] = [];

      for (const backup of backups) {
        const match = backup.match(/backup-(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})\.tar\.gz/);
        if (match) {
          const dateStr = match[1];
          const timeStr = match[2];
          const date = new Date(`${dateStr}T${timeStr.replace(/-/g, ':')}`);

          // Determine if it's start of week (Monday) or month
          const isWeekly = date.getDay() === 1; // Monday
          const isMonthly = date.getDate() === 1; // 1st of month

          if (isMonthly) {
            monthly.push(backup);
          } else if (isWeekly) {
            weekly.push(backup);
          } else {
            daily.push(backup);
          }
        }
      }

      // Keep only the specified number of each type
      toDelete.push(...daily.slice(this.config.retention.daily));
      toDelete.push(...weekly.slice(this.config.retention.weekly));
      toDelete.push(...monthly.slice(this.config.retention.monthly));

      if (toDelete.length === 0) {
        return {
          success: true,
          message: 'No old backups to clean up'
        };
      }

      console.log(`🧹 Cleaning up ${toDelete.length} old backups...`);

      for (const backup of toDelete) {
        const s3Key = `${this.config.s3Prefix}${backup}`;
        await Bun.$`aws s3 rm s3://${this.config.s3Bucket}/${s3Key}`.quiet();
      }

      return {
        success: true,
        message: `Cleaned up ${toDelete.length} old backups`
      };

    } catch (error) {
      return {
        success: false,
        message: `Cleanup failed: ${error.message}`
      };
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const manager = new BackupManager();

  if (args.length === 0) {
    console.log(`🚀 Backup Manager v1.0

USAGE:
  bun backup:s3              # Full backup (archive + S3 + git)
  bun backup:create          # Create local backup archive only
  bun backup:upload          # Upload existing archive to S3
  bun backup:git             # Sync with git repository
  bun backup:list            # List backups in S3
  bun backup:cleanup         # Remove old backups from S3

EXAMPLES:
  bun backup:s3              # Complete backup workflow
  bun backup:create          # Just create tar.gz archive
  bun backup:list            # See all backups in S3

CONFIG:
  Set S3_BUCKET and S3_PREFIX environment variables
  Or create config/backup.json for custom configuration

SCHEDULE:
  Run daily at 2 AM: 0 2 * * * bun backup:s3
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 's3':
        const result = await manager.fullBackup();
        if (result.success) {
          console.log(`✅ ${result.message}`);
        } else {
          console.error(`❌ ${result.message}`);
          process.exit(1);
        }
        break;

      case 'create':
        const createResult = await manager.createBackup();
        if (createResult.success) {
          console.log(`✅ ${createResult.message}`);
          console.log(`📦 Archive: ${createResult.archivePath}`);
        } else {
          console.error(`❌ ${createResult.message}`);
          process.exit(1);
        }
        break;

      case 'upload':
        // Look for .tar.gz files in tmp directory
        const archives = readdirSync('tmp').filter(f => f.endsWith('.tar.gz'));
        if (archives.length === 0) {
          console.error('No backup archives found in tmp/ directory');
          process.exit(1);
        }

        const latestArchive = join('tmp', archives.sort().pop()!);
        const uploadResult = await manager.uploadToS3(latestArchive);
        if (uploadResult.success) {
          console.log(`✅ ${uploadResult.message}`);
        } else {
          console.error(`❌ ${uploadResult.message}`);
          process.exit(1);
        }
        break;

      case 'git':
        const gitResult = await manager.syncGit();
        if (gitResult.success) {
          console.log(`✅ ${gitResult.message}`);
        } else {
          console.error(`❌ ${gitResult.message}`);
          process.exit(1);
        }
        break;

      case 'list':
        const listResult = await manager.listBackups();
        if (listResult.success) {
          console.log(`✅ ${listResult.message}`);
          if (listResult.backups && listResult.backups.length > 0) {
            console.log('\n📦 Backups:');
            listResult.backups.forEach(backup => console.log(`   ${backup}`));
          }
        } else {
          console.error(`❌ ${listResult.message}`);
          process.exit(1);
        }
        break;

      case 'cleanup':
        const cleanupResult = await manager.cleanupOldBackups();
        if (cleanupResult.success) {
          console.log(`✅ ${cleanupResult.message}`);
        } else {
          console.error(`❌ ${cleanupResult.message}`);
          process.exit(1);
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun backup:s3 --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
export { BackupManager };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
