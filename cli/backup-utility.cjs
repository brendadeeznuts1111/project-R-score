#!/usr/bin/env node

/**
 * FactoryWager Backup & Restore Utility
 * Comprehensive backup and restore system for CLI configuration and data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupUtility {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.configDir = path.join(process.cwd(), '.factory-wager');
        this.configFile = path.join(process.cwd(), '.fw-config.json');
        
        this.ensureBackupDir();
    }

    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    generateBackupName() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `factory-wager-backup-${timestamp}`;
    }

    async createBackup(options = {}) {
        const { includeDomains = true, includeConfig = true, includeLogs = false, description = '' } = options;
        
        console.log('🔄 Creating FactoryWager backup...');
        
        const backupName = this.generateBackupName();
        const backupPath = path.join(this.backupDir, backupName);
        fs.mkdirSync(backupPath, { recursive: true });
        
        const backupData = {
            name: backupName,
            timestamp: new Date().toISOString(),
            description: description || 'Manual backup',
            version: '1.0.0',
            files: []
        };

        try {
            // Backup configuration
            if (includeConfig) {
                console.log('  📋 Backing up configuration...');
                
                if (fs.existsSync(this.configFile)) {
                    const configContent = fs.readFileSync(this.configFile, 'utf8');
                    fs.writeFileSync(path.join(backupPath, 'config.json'), configContent);
                    backupData.files.push('config.json');
                }
                
                if (fs.existsSync(this.configDir)) {
                    this.copyDirectory(this.configDir, path.join(backupPath, 'config-dir'));
                    backupData.files.push('config-dir/');
                }
            }

            // Backup domains data
            if (includeDomains) {
                console.log('  🌐 Backing up domains data...');
                
                try {
                    const domains = await this.getDomainsFromAPI();
                    fs.writeFileSync(path.join(backupPath, 'domains.json'), JSON.stringify(domains, null, 2));
                    backupData.files.push('domains.json');
                } catch (error) {
                    console.log('  ⚠️  Could not fetch domains from API (offline mode)');
                }
            }

            // Backup CLI scripts
            console.log('  🔧 Backing up CLI scripts...');
            const cliFiles = [
                'factory-wager-cli.cjs',
                'status-badges.cjs',
                'health-monitor.js',
                'backup-utility.js',
                'fw-cli',
                'setup-cli.sh',
                'demo.sh'
            ];
            
            const cliBackupDir = path.join(backupPath, 'cli');
            fs.mkdirSync(cliBackupDir, { recursive: true });
            
            cliFiles.forEach(file => {
                const sourcePath = path.join(process.cwd(), 'cli', file);
                if (fs.existsSync(sourcePath)) {
                    const targetPath = path.join(cliBackupDir, file);
                    fs.copyFileSync(sourcePath, targetPath);
                    backupData.files.push(`cli/${file}`);
                }
            });

            // Backup batch configurations
            console.log('  📦 Backing up batch configurations...');
            const batchFiles = ['batch-domains.json', 'batch-accounts.json'];
            batchFiles.forEach(file => {
                const sourcePath = path.join(process.cwd(), 'cli', file);
                if (fs.existsSync(sourcePath)) {
                    const targetPath = path.join(backupPath, file);
                    fs.copyFileSync(sourcePath, targetPath);
                    backupData.files.push(file);
                }
            });

            // Backup logs if requested
            if (includeLogs) {
                console.log('  📝 Backing up logs...');
                const logsDir = path.join(process.cwd(), 'logs');
                if (fs.existsSync(logsDir)) {
                    this.copyDirectory(logsDir, path.join(backupPath, 'logs'));
                    backupData.files.push('logs/');
                }
            }

            // Create backup metadata
            fs.writeFileSync(path.join(backupPath, 'backup.json'), JSON.stringify(backupData, null, 2));
            
            // Create compressed archive
            console.log('  🗜️  Creating compressed archive...');
            await this.createArchive(backupPath, `${backupPath}.tar.gz`);
            
            // Remove uncompressed directory
            this.removeDirectory(backupPath);
            
            console.log(`✅ Backup created successfully!`);
            console.log(`📁 Location: ${backupPath}.tar.gz`);
            console.log(`📊 Size: ${this.getFileSize(`${backupPath}.tar.gz`)}`);
            
            return {
                success: true,
                backupPath: `${backupPath}.tar.gz`,
                backupData
            };

        } catch (error) {
            console.error('❌ Backup failed:', error.message);
            
            // Cleanup on failure
            if (fs.existsSync(backupPath)) {
                this.removeDirectory(backupPath);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async restoreBackup(backupPath, options = {}) {
        const { includeConfig = true, includeDomains = false, overwrite = false } = options;
        
        console.log('🔄 Restoring FactoryWager backup...');
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        const tempDir = path.join(this.backupDir, 'temp-restore');
        
        try {
            // Extract backup
            console.log('  📂 Extracting backup...');
            await this.extractArchive(backupPath, tempDir);
            
            // Read backup metadata
            const backupMetaPath = path.join(tempDir, 'backup.json');
            if (!fs.existsSync(backupMetaPath)) {
                throw new Error('Invalid backup file: missing metadata');
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupMetaPath, 'utf8'));
            console.log(`  📋 Restoring from: ${backupData.timestamp}`);
            console.log(`  📝 Description: ${backupData.description}`);
            
            // Restore configuration
            if (includeConfig && backupData.files.includes('config.json')) {
                console.log('  ⚙️  Restoring configuration...');
                
                if (!overwrite && fs.existsSync(this.configFile)) {
                    console.log('  ⚠️  Configuration already exists (use --overwrite to replace)');
                } else {
                    fs.copyFileSync(
                        path.join(tempDir, 'config.json'),
                        this.configFile
                    );
                    console.log('  ✅ Configuration restored');
                }
            }

            // Restore config directory
            if (includeConfig && backupData.files.includes('config-dir/')) {
                const sourceConfigDir = path.join(tempDir, 'config-dir');
                if (fs.existsSync(sourceConfigDir)) {
                    if (!overwrite && fs.existsSync(this.configDir)) {
                        console.log('  ⚠️  Config directory already exists (use --overwrite to replace)');
                    } else {
                        this.copyDirectory(sourceConfigDir, this.configDir);
                        console.log('  ✅ Config directory restored');
                    }
                }
            }

            // Restore CLI scripts
            if (backupData.files.some(f => f.startsWith('cli/'))) {
                console.log('  🔧 Restoring CLI scripts...');
                
                const sourceCliDir = path.join(tempDir, 'cli');
                if (fs.existsSync(sourceCliDir)) {
                    const targetCliDir = path.join(process.cwd(), 'cli');
                    this.copyDirectory(sourceCliDir, targetCliDir);
                    console.log('  ✅ CLI scripts restored');
                }
            }

            // Restore domains (if API access available)
            if (includeDomains && backupData.files.includes('domains.json')) {
                console.log('  🌐 Restoring domains data...');
                
                try {
                    const domainsData = JSON.parse(fs.readFileSync(path.join(tempDir, 'domains.json'), 'utf8'));
                    await this.restoreDomains(domainsData);
                    console.log('  ✅ Domains restored');
                } catch (error) {
                    console.log('  ⚠️  Could not restore domains (API access required)');
                }
            }

            // Cleanup
            this.removeDirectory(tempDir);
            
            console.log('✅ Backup restored successfully!');
            console.log('🔄 Please restart any running CLI processes');
            
            return {
                success: true,
                backupData
            };

        } catch (error) {
            console.error('❌ Restore failed:', error.message);
            
            // Cleanup on failure
            if (fs.existsSync(tempDir)) {
                this.removeDirectory(tempDir);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    listBackups() {
        console.log('📋 Available FactoryWager Backups:\n');
        
        if (!fs.existsSync(this.backupDir)) {
            console.log('No backups found.');
            return [];
        }

        const backups = [];
        
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.endsWith('.tar.gz'))
                .sort((a, b) => b.localeCompare(a)); // Sort by date (newest first)

            if (files.length === 0) {
                console.log('No backups found.');
                return [];
            }

            files.forEach(file => {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                
                // Extract metadata if available
                let metadata = null;
                try {
                    const tempDir = path.join(this.backupDir, 'temp-meta');
                    fs.mkdirSync(tempDir, { recursive: true });
                    
                    this.extractArchive(filePath, tempDir);
                    const metaPath = path.join(tempDir, 'backup.json');
                    
                    if (fs.existsSync(metaPath)) {
                        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    }
                    
                    this.removeDirectory(tempDir);
                } catch (error) {
                    // Metadata not available, continue without it
                }

                const backupInfo = {
                    filename: file,
                    path: filePath,
                    size: this.formatFileSize(stats.size),
                    created: stats.mtime.toLocaleString(),
                    description: metadata?.description || 'No description',
                    timestamp: metadata?.timestamp || stats.mtime.toISOString(),
                    files: metadata?.files?.length || 0
                };

                backups.push(backupInfo);

                console.log(`📦 ${backupInfo.filename}`);
                console.log(`   📅 Created: ${backupInfo.created}`);
                console.log(`   📊 Size: ${backupInfo.size}`);
                console.log(`   📝 ${backupInfo.description}`);
                console.log(`   📁 Files: ${backupInfo.files}`);
                console.log('');
            });

            return backups;

        } catch (error) {
            console.error('❌ Failed to list backups:', error.message);
            return [];
        }
    }

    async deleteBackup(backupPath) {
        console.log(`🗑️  Deleting backup: ${path.basename(backupPath)}`);
        
        try {
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file not found');
            }

            fs.unlinkSync(backupPath);
            console.log('✅ Backup deleted successfully');
            
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to delete backup:', error.message);
            return { success: false, error: error.message };
        }
    }

    async scheduleBackup(options = {}) {
        const { interval = 'daily', retention = 7, includeLogs = false } = options;
        
        console.log(`⏰ Scheduling automatic backups...`);
        console.log(`   Interval: ${interval}`);
        console.log(`   Retention: ${retention} days`);
        console.log(`   Include logs: ${includeLogs ? 'Yes' : 'No'}`);

        // Create scheduler script
        const schedulerScript = `#!/bin/bash
# FactoryWager Automatic Backup Scheduler

BACKUP_DIR="${this.backupDir}"
RETENTION_DAYS=${retention}
INTERVAL="${interval}"

# Create backup
node "${path.join(process.cwd(), 'cli/backup-utility.js')}" create --include-logs=${includeLogs}

# Clean old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Automatic backup completed at $(date)"
`;

        const schedulerPath = path.join(process.cwd(), 'scripts', 'auto-backup.sh');
        fs.mkdirSync(path.dirname(schedulerPath), { recursive: true });
        fs.writeFileSync(schedulerPath, schedulerScript);
        fs.chmodSync(schedulerPath, '755');

        console.log(`✅ Scheduler created: ${schedulerPath}`);
        console.log('');
        console.log('To enable automatic backups, add to your crontab:');
        
        let cronSchedule = '';
        switch (interval) {
            case 'hourly':
                cronSchedule = '0 * * * *';
                break;
            case 'daily':
                cronSchedule = '0 2 * * *';
                break;
            case 'weekly':
                cronSchedule = '0 2 * * 0';
                break;
            case 'monthly':
                cronSchedule = '0 2 1 * *';
                break;
        }

        console.log(`   ${cronSchedule} ${schedulerPath}`);
        console.log('');
        console.log('Or run manually:');
        console.log(`   ${schedulerPath}`);
    }

    // Helper methods
    copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    removeDirectory(dir) {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    async createArchive(sourcePath, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                execSync(`tar -czf "${outputPath}" -C "${path.dirname(sourcePath)}" "${path.basename(sourcePath)}"`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async extractArchive(archivePath, destPath) {
        return new Promise((resolve, reject) => {
            try {
                execSync(`tar -xzf "${archivePath}" -C "${destPath}"`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    getFileSize(filePath) {
        const stats = fs.statSync(filePath);
        return this.formatFileSize(stats.size);
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    async getDomainsFromAPI() {
        // This would integrate with the CLI to get domain data
        // For now, return empty object
        return {};
    }

    async restoreDomains(domainsData) {
        // This would integrate with the CLI to restore domains
        // For now, just log the operation
        console.log(`    Found ${Object.keys(domainsData).length} domains to restore`);
    }
}

// CLI usage
if (require.main === module) {
    const backup = new BackupUtility();
    
    const command = process.argv[2];
    const args = process.argv.slice(3);
    
    switch (command) {
        case 'create':
            const options = {};
            args.forEach(arg => {
                if (arg === '--include-logs') options.includeLogs = true;
                if (arg.startsWith('--description=')) options.description = arg.split('=')[1];
            });
            
            backup.createBackup(options)
                .then(result => {
                    if (result.success) {
                        console.log('\n✨ Backup completed successfully!');
                    } else {
                        process.exit(1);
                    }
                })
                .catch(error => {
                    console.error('❌ Backup failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'restore':
            if (args.length === 0) {
                console.error('❌ Please specify backup file to restore');
                process.exit(1);
            }
            
            const restoreOptions = {};
            args.forEach(arg => {
                if (arg === '--overwrite') restoreOptions.overwrite = true;
                if (arg === '--restore-domains') restoreOptions.includeDomains = true;
            });
            
            backup.restoreBackup(args[0], restoreOptions)
                .then(result => {
                    if (result.success) {
                        console.log('\n✨ Restore completed successfully!');
                    } else {
                        process.exit(1);
                    }
                })
                .catch(error => {
                    console.error('❌ Restore failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'list':
            backup.listBackups();
            break;
            
        case 'delete':
            if (args.length === 0) {
                console.error('❌ Please specify backup file to delete');
                process.exit(1);
            }
            
            backup.deleteBackup(args[0])
                .then(result => {
                    if (!result.success) {
                        process.exit(1);
                    }
                })
                .catch(error => {
                    console.error('❌ Delete failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'schedule':
            const scheduleOptions = {};
            args.forEach(arg => {
                if (arg.startsWith('--interval=')) scheduleOptions.interval = arg.split('=')[1];
                if (arg.startsWith('--retention=')) scheduleOptions.retention = parseInt(arg.split('=')[1]);
                if (arg === '--include-logs') scheduleOptions.includeLogs = true;
            });
            
            backup.scheduleBackup(scheduleOptions);
            break;
            
        default:
            console.log('FactoryWager Backup & Restore Utility');
            console.log('');
            console.log('Usage:');
            console.log('  node backup-utility.js create [--include-logs] [--description="text"]');
            console.log('  node backup-utility.js restore <backup-file> [--overwrite] [--restore-domains]');
            console.log('  node backup-utility.js list');
            console.log('  node backup-utility.js delete <backup-file>');
            console.log('  node backup-utility.js schedule [--interval=daily] [--retention=7] [--include-logs]');
            console.log('');
            console.log('Examples:');
            console.log('  node backup-utility.js create --description="Before deployment"');
            console.log('  node backup-utility.js restore backups/factory-wager-backup-2024-01-01.tar.gz --overwrite');
            console.log('  node backup-utility.js schedule --interval=daily --retention=14');
            break;
    }
}

module.exports = BackupUtility;
