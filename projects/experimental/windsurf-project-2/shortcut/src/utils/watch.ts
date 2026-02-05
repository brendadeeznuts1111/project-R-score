import { watch } from 'fs';
import { join } from 'path';
import { ShortcutRegistry } from '../core/registry';
import { BunFile } from 'bun';

export function watchForChanges(dataDir: string, callback: () => void): void {
  const watcher = watch(dataDir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.json') || filename.endsWith('.db'))) {
      console.log(`File changed: ${filename}`);
      callback();
    }
  });
  
  // Clean up watcher on process exit
  process.on('exit', () => {
    watcher.close();
  });
}

export function setupAutoBackup(
  registry: ShortcutRegistry, 
  dataDir: string, 
  interval: number
): void {
  const backupDir = join(dataDir, 'backups');
  
  // Create backup directory
  try {
    Bun.$`mkdir -p ${backupDir}`.quiet();
  } catch (error) {
    console.warn('Could not create backup directory:', error);
    return;
  }
  
  const performBackup = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = join(backupDir, `shortcuts-backup-${timestamp}.json`);
      
      // Export current state
      const exportData = {
        timestamp: new Date().toISOString(),
        shortcuts: Array.from(registry['shortcuts'].entries()),
        profiles: Array.from(registry['profiles'].entries()),
        activeProfile: registry.getActiveProfile(),
        version: '1.0.0'
      };
      
      await Bun.write(backupFile, JSON.stringify(exportData, null, 2));
      console.log(`Backup created: ${backupFile}`);
      
      // Clean up old backups (keep last 10)
      await cleanupOldBackups(backupDir, 10);
      
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };
  
  // Perform initial backup
  performBackup();
  
  // Schedule regular backups
  setInterval(performBackup, interval);
}

async function cleanupOldBackups(backupDir: string, keepCount: number): Promise<void> {
  try {
    const glob = new Bun.Glob(`${backupDir}/shortcuts-backup-*.json`);
    const files = await Array.fromAsync(glob.scan());
    
    if (files.length > keepCount) {
      // Sort by filename (which includes timestamp)
      files.sort();
      
      // Remove oldest files
      const toRemove = files.slice(0, files.length - keepCount);
      
      for (const file of toRemove) {
        await Bun.$`rm ${file}`.quiet();
        console.log(`Removed old backup: ${file}`);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup old backups:', error);
  }
}

export async function restoreFromBackup(backupFile: string, registry: ShortcutRegistry): Promise<void> {
  try {
    const backupData = await Bun.file(backupFile).json();
    
    if (!backupData.shortcuts || !backupData.profiles) {
      throw new Error('Invalid backup file format');
    }
    
    // Restore shortcuts
    for (const [id, config] of backupData.shortcuts) {
      registry.register(config);
    }
    
    // Restore profiles
    for (const [id, profile] of backupData.profiles) {
      registry['profiles'].set(id, profile);
    }
    
    // Set active profile
    if (backupData.activeProfile) {
      registry.setActiveProfile(backupData.activeProfile);
    }
    
    // Save to database
    await registry.saveToDatabase();
    
    console.log(`Successfully restored from backup: ${backupFile}`);
    
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    throw error;
  }
}
