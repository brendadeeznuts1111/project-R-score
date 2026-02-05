/**
 * Empire Pro Backup Utility using Bun v1.3.6 Archive API
 * Creates compressed backups of critical system data
 */

import { Bun } from 'bun';

export class BackupManager {
  private readonly backupDir: string;

  constructor(backupDir = './backups') {
    this.backupDir = backupDir;
  }

  /**
   * Create a backup of configuration and data files
   */
  async createBackup(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name || `empire-pro-backup-${timestamp}`;
    
    try {
      // Gather critical files for backup
      const backupFiles = await this.gatherBackupFiles();
      
      // Create archive with gzip compression using Bun v1.3.6 Archive API
      const archive = new Bun.Archive(backupFiles, { 
        compress: 'gzip', 
        level: 9 // Maximum compression
      });
      
      // Write backup file
      const backupPath = `${this.backupDir}/${backupName}.tar.gz`;
      await Bun.write(backupPath, archive);
      
      console.log(`✅ Backup created: ${backupPath}`);
      console.log(`📦 Archive size: ${(await Bun.file(backupPath).size() / 1024 / 1024).toFixed(2)}MB`);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore from backup archive
   */
  async restoreBackup(backupPath: string, targetDir?: string): Promise<void> {
    const restoreDir = targetDir || `${this.backupDir}/restore-${Date.now()}`;
    
    try {
      // Read backup archive
      const archiveData = await Bun.file(backupPath).bytes();
      const archive = new Bun.Archive(archiveData);
      
      // Extract to target directory
      const fileCount = await archive.extract(restoreDir);
      
      console.log(`✅ Restored ${fileCount} files to ${restoreDir}`);
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  /**
   * Gather critical system files for backup
   */
  private async gatherBackupFiles(): Promise<Record<string, string | Uint8Array>> {
    const files: Record<string, string | Uint8Array> = {};
    
    try {
      // Configuration files
      const configFiles = [
        'config/empire-config.toml',
        'example.toml',
        'package.json',
        '.env.example'
      ];
      
      for (const file of configFiles) {
        try {
          const content = await Bun.file(file).text();
          files[`config/${file}`] = content;
        } catch (error) {
          console.warn(`⚠️ Could not backup ${file}:`, error.message);
        }
      }
      
      // Database exports (if available)
      try {
        const dbExport = await this.exportDatabase();
        if (dbExport) {
          files['data/database-export.json'] = dbExport;
        }
      } catch (error) {
        console.warn('⚠️ Database export failed:', error.message);
      }
      
      // System logs (recent)
      try {
        const logs = await this.gatherLogs();
        if (logs) {
          files['logs/system-recent.log'] = logs;
        }
      } catch (error) {
        console.warn('⚠️ Log collection failed:', error.message);
      }
      
      // Metadata
      files['metadata/backup-info.json'] = JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        bunVersion: process.version,
        platform: process.platform,
        filesCount: Object.keys(files).length
      }, null, 2);
      
    } catch (error) {
      console.error('❌ Failed to gather backup files:', error);
      throw error;
    }
    
    return files;
  }

  /**
   * Export database data (placeholder implementation)
   */
  private async exportDatabase(): Promise<string | null> {
    // In a real implementation, this would connect to your database
    // and export critical data in JSON format
    try {
      const mockData = {
        users: [],
        configurations: [],
        audit_logs: [],
        export_timestamp: new Date().toISOString()
      };
      
      return JSON.stringify(mockData, null, 2);
    } catch (error) {
      return null;
    }
  }

  /**
   * Gather recent system logs
   */
  private async gatherLogs(): Promise<string | null> {
    try {
      // In a real implementation, this would read from your log files
      const mockLogs = [
        `[${new Date().toISOString()}] INFO: Backup system initialized`,
        `[${new Date().toISOString()}] INFO: Gathering system files...`,
        `[${new Date().toISOString()}] INFO: Creating archive...`
      ];
      
      return mockLogs.join('\n');
    } catch (error) {
      return null;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await Array.fromAsync(
        new Deno.readDir(this.backupDir)
      );
      
      return files
        .filter(file => file.name.endsWith('.tar.gz'))
        .map(file => `${this.backupDir}/${file.name}`)
        .sort();
    } catch (error) {
      console.warn('⚠️ Could not list backups:', error.message);
      return [];
    }
  }

  /**
   * Clean up old backups (keep last 10)
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > 10) {
        const toDelete = backups.slice(0, backups.length - 10);
        
        for (const backup of toDelete) {
          await Deno.remove(backup);
          console.log(`🗑️ Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }
}

// CLI interface for backup operations
if (import.meta.main) {
  const backupManager = new BackupManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      await backupManager.createBackup();
      break;
    case 'list':
      const backups = await backupManager.listBackups();
      console.log('Available backups:');
      backups.forEach(backup => console.log(`  - ${backup}`));
      break;
    case 'cleanup':
      await backupManager.cleanupOldBackups();
      break;
    default:
      console.log('Usage: bun backup-manager.ts [create|list|cleanup]');
  }
}
