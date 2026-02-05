#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]monitor
 * 
 * Monitor
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils
 */

#!/usr/bin/env bun

/**
 * Vault Monitoring Script
 * Continuously monitors vault for changes and auto-organizes
 */

import { watch, FSWatcher, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext, logger } from '../../src/core/error-handler.js';
import { MonitorStatus, VaultConfig, FileSystemWatcher } from '../../src/types/tick-processor-types.js';
import { TIME_CONSTANTS } from '../../src/constants/vault-constants.js';
import { VaultOrganizer } from './organize.js';
import { VaultValidator } from './validate.js';

interface MonitorConfig {
    interval: number;
    autoOrganize: boolean;
    autoValidate: boolean;
    logFile: string;
}

class VaultMonitor {
    private vaultPath: string;
    private config: MonitorConfig;
    private watcher: FSWatcher | null = null;
    private isRunning: boolean = false;
    private organizer: VaultOrganizer;
    private validator: VaultValidator;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.config = this.loadConfig();
        this.organizer = new VaultOrganizer(vaultPath);
        this.validator = new VaultValidator(vaultPath);
    }

    private loadConfig(): MonitorConfig {
        const configFile = join(this.vaultPath, '.vault-config.json');

        if (existsSync(configFile)) {
            try {
                const configData = JSON.parse(readFileSync(configFile, 'utf-8'));
                return {
                    interval: configData.automation?.monitorInterval || 5000,
                    autoOrganize: configData.automation?.autoOrganize ?? true,
                    autoValidate: configData.automation?.autoValidate ?? false,
                    logFile: join(this.vaultPath, 'logs', 'vault-automation.log')
                };
            } catch (error) {
                logger.warn('Could not load config, using defaults', {
                    error,
                    context: {
                        script: 'monitor.ts',
                        function: 'loadConfig'
                    }
                });
            }
        }

        return {
            interval: 5000,
            autoOrganize: true,
            autoValidate: false,
            logFile: join(this.vaultPath, 'logs', 'vault-automation.log')
        };
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log(chalk.yellow('⚠️  Monitor is already running'));
            return;
        }

        console.log(chalk.blue.bold('👁️  Starting Vault Monitor...'));
        console.log(chalk.gray(`Monitoring: ${this.vaultPath}`));
        console.log(chalk.gray(`Interval: ${this.config.interval}ms`));
        console.log(chalk.gray(`Auto-organize: ${this.config.autoOrganize}`));
        console.log(chalk.gray(`Auto-validate: ${this.config.autoValidate}`));

        this.isRunning = true;
        this.updateStatus(true);

        // Set up file watcher
        this.watcher = watch(this.vaultPath, { recursive: true }, (eventType, filename) => {
            if (filename && this.shouldProcessFile(filename)) {
                this.handleFileChange(eventType, filename);
            }
        });

        // Set up periodic validation
        if (this.config.autoValidate) {
            this.setupPeriodicValidation();
        }

        console.log(chalk.green('✅ Vault monitor started successfully'));
        console.log(chalk.gray('Press Ctrl+C to stop monitoring'));

        // Keep process running
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    private shouldProcessFile(filename: string): boolean {
        // Skip certain files and directories
        const skipPatterns = [
            /\.obsidian/,
            /node_modules/,
            /\.git/,
            /08 - Logs/,
            /\.vault-status\.json$/,
            /\.vault-config\.json$/,
            /^scripts\//
        ];

        return !skipPatterns.some(pattern => pattern.test(filename));
    }

    private async handleFileChange(eventType: string, filename: string): Promise<void> {
        try {
            const fullPath = join(this.vaultPath, filename);

            // Only process markdown files
            if (!filename.endsWith('.md')) {
                return;
            }

            console.log(chalk.blue(`📝 File ${eventType}: ${filename}`));

            if (eventType === 'rename' && this.config.autoOrganize) {
                // Give file system a moment to settle
                setTimeout(async () => {
                    if (existsSync(fullPath)) {
                        await this.organizeNewFile(filename);
                    }
                }, TIME_CONSTANTS.FILE_CHANGE_DELAY);
            }

            this.logActivity(`${eventType.toUpperCase()}: ${filename}`);

        } catch (error) {
            logger.error('Error handling file change', {
                error,
                context: {
                    script: 'monitor.ts',
                    function: 'onFileChange',
                    filePath: join(this.vaultPath, filename)
                }
            });
            this.logActivity(`ERROR: ${error}`);
        }
    }

    private async organizeNewFile(filename: string): Promise<void> {
        try {
            console.log(chalk.yellow(`🔄 Organizing new file: ${filename}`));

            // Run organization on just this file (would need to modify organizer)
            // For now, run full organization
            if (this.config.autoOrganize) {
                const result = await this.organizer.organizeAll();
                if (result.moved.length > 0 || result.renamed.length > 0) {
                    console.log(chalk.green(`✅ Auto-organized: ${filename}`));
                }
            }
        } catch (error) {
            logger.error('Auto-organization failed', {
                error,
                context: {
                    script: 'monitor.ts',
                    function: 'organizeNewFile',
                    filePath: filename
                }
            });
        }
    }

    private setupPeriodicValidation(): void {
        // Run validation every hour
        setInterval(async () => {
            if (this.config.autoValidate) {
                console.log(chalk.blue('🔍 Running periodic validation...'));
                try {
                    await this.validator.validateAll();
                } catch (error) {
                    logger.error('Periodic validation failed', {
                        error,
                        context: {
                            script: 'monitor.ts',
                            function: 'setupPeriodicValidation'
                        }
                    });
                }
            }
        }, TIME_CONSTANTS.PERIODIC_VALIDATION_INTERVAL); // 1 hour
    }

    private logActivity(message: string): void {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${message}\n`;

            // Append to log file
            const fs = require('fs');
            if (existsSync(this.config.logFile)) {
                fs.appendFileSync(this.config.logFile, logEntry);
            }
        } catch (error) {
            logger.warn('Logging failed', {
                error,
                context: {
                    script: 'monitor.ts',
                    function: 'logActivity'
                }
            });
        }
    }

    private updateStatus(active: boolean): void {
        const statusFile = join(this.vaultPath, '.vault-status.json');

        try {
            let statusData: MonitorStatus = {
                running: active,
                startTime: new Date(),
                eventsProcessed: 0,
                lastEvent: new Date(),
                errors: 0,
                warnings: 0
            };

            if (existsSync(statusFile)) {
                const existingData = JSON.parse(readFileSync(statusFile, 'utf-8'));
                statusData = { ...statusData, ...existingData, running: active };
            }

            statusData.monitorActive = active;
            statusData.lastUpdate = new Date().toISOString();

            writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
        } catch (error) {
            logger.warn('Status update failed', {
                error,
                context: {
                    script: 'monitor.ts',
                    function: 'updateStatus'
                }
            });
        }
    }

    stop(): void {
        if (!this.isRunning) {
            console.log(chalk.yellow('⚠️  Monitor is not running'));
            return;
        }
        if (!this.isRunning) {
            console.log(chalk.yellow('⚠️  Monitor is not running'));
            return;
        }

        console.log(chalk.blue('\n🛑 Stopping Vault Monitor...'));

        this.isRunning = false;
        this.updateStatus(false);

        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }

        console.log(chalk.green('✅ Vault monitor stopped'));
        process.exit(0);
    }

    getStatus(): void {
        const statusFile = join(this.vaultPath, '.vault-status.json');

        if (!existsSync(statusFile)) {
            console.log(chalk.red('❌ Status file not found. Run setup first.'));
            return;
        }

        try {
            const statusData = JSON.parse(readFileSync(statusFile, 'utf-8'));

            console.log(chalk.blue.bold('📊 Monitor Status:'));
            console.log(chalk.gray(`Active: ${statusData.monitorActive ? 'Yes' : 'No'}`));
            console.log(chalk.gray(`Last Update: ${statusData.lastUpdate}`));
            console.log(chalk.gray(`Last Validation: ${statusData.lastValidation || 'Never'}`));
            console.log(chalk.gray(`Last Organization: ${statusData.lastOrganization || 'Never'}`));
            console.log(chalk.gray(`Issues: ${statusData.issues || 0}`));
            console.log(chalk.gray(`Warnings: ${statusData.warnings || 0}`));
            console.log(chalk.blue(`Compliance: ${statusData.compliance || 0}%`));

            if (statusData.organizationStats) {
                console.log(chalk.blue.bold('\n📁 Organization Stats:'));
                console.log(chalk.gray(`Files Moved: ${statusData.organizationStats.moved}`));
                console.log(chalk.gray(`Files Renamed: ${statusData.organizationStats.renamed}`));
                console.log(chalk.gray(`Templates Applied: ${statusData.organizationStats.templated}`));
                console.log(chalk.gray(`Errors: ${statusData.organizationStats.errors}`));
            }

        } catch (error) {
            logger.error('Failed to read status', {
                error,
                context: {
                    script: 'monitor.ts',
                    function: 'showStatus',
                    filePath: statusFile
                }
            });
        }
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const monitor = new VaultMonitor();

    switch (command) {
        case 'start':
            await monitor.start();
            break;
        case 'stop':
            monitor.stop();
            break;
        case 'status':
            monitor.getStatus();
            break;
        default:
            console.log(chalk.blue('Vault Monitor Commands:'));
            console.log('  start   - Start monitoring');
            console.log('  stop    - Stop monitoring');
            console.log('  status  - Show monitor status');
            console.log('\nUsage: bun run vault:monitor [command]');
            break;
    }
}

// Run monitor with proper error handling
if (import.meta.main) {
    ErrorHandler.handleAsync(
        main,
        ErrorSeverity.HIGH,
        ErrorCategory.VAULT,
        createErrorContext()
            .script('monitor.ts')
            .function('main')
            .build()
    );
}

export { VaultMonitor };
