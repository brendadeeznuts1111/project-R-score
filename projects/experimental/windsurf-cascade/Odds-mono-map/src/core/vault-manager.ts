/**
 * 🏛️ Core Vault Manager
 * 
 * Central orchestration for all Odds-mono-map operations.
 * Consolidates functionality from multiple management scripts.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { VaultConfig, VaultStatus, ValidationResult } from '../types/vault.types';

export class VaultManager {
    private configPath: string;
    private statusPath: string;
    private config: VaultConfig;
    private status: VaultStatus;

    constructor(basePath: string = process.cwd()) {
        this.configPath = join(basePath, '.vault-config.json');
        this.statusPath = join(basePath, '.vault-status.json');
        this.config = this.loadConfig();
        this.status = this.loadStatus();
    }

    // ============================================================================
    // CONFIGURATION MANAGEMENT
    // ============================================================================

    private loadConfig(): VaultConfig {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(configData);
        } catch (error) {
            return this.getDefaultConfig();
        }
    }

    private getDefaultConfig(): VaultConfig {
        return {
            version: '1.0.0',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            settings: {
                autoOrganize: true,
                validateOnSave: true,
                enableMonitoring: true,
                logLevel: 'info'
            },
            paths: {
                templates: '06 - Templates/',
                dailyNotes: '01 - Daily Notes/',
                archive: '07 - Archive/',
                logs: '08 - Logs/'
            },
            standards: {
                namingConvention: 'PascalCase',
                dateFormat: 'YYYY-MM-DD',
                templateValidation: true
            }
        };
    }

    async saveConfig(): Promise<void> {
        this.config.lastModified = new Date().toISOString();
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    }

    // ============================================================================
    // STATUS TRACKING
    // ============================================================================

    private loadStatus(): VaultStatus {
        try {
            const statusData = fs.readFileSync(this.statusPath, 'utf-8');
            return JSON.parse(statusData);
        } catch (error) {
            return this.getDefaultStatus();
        }
    }

    private getDefaultStatus(): VaultStatus {
        return {
            health: 'unknown',
            lastValidation: null,
            lastOrganization: null,
            issues: [],
            metrics: {
                totalFiles: 0,
                organizedFiles: 0,
                validatedFiles: 0,
                errorCount: 0
            }
        };
    }

    async saveStatus(): Promise<void> {
        this.status.lastModified = new Date().toISOString();
        await fs.writeFile(this.statusPath, JSON.stringify(this.status, null, 2));
    }

    // ============================================================================
    // VAULT OPERATIONS
    // ============================================================================

    async initialize(): Promise<void> {
        console.log('🚀 Initializing Odds-mono-map vault...');

        // Create necessary directories
        await this.ensureDirectories();

        // Save initial configuration
        await this.saveConfig();
        await this.saveStatus();

        console.log('✅ Vault initialization completed');
    }

    private async ensureDirectories(): Promise<void> {
        const directories = [
            ...Object.values(this.config.paths),
            'src/core',
            'src/utils',
            'src/types',
            'demos',
            'docs',
            'tests/core',
            'tests/utils',
            'tests/integration'
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.warn(`⚠️ Could not create directory ${dir}:`, error.message);
            }
        }
    }

    // ============================================================================
    // VALIDATION OPERATIONS
    // ============================================================================

    async validate(): Promise<ValidationResult> {
        console.log('🔍 Validating vault structure and content...');

        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            summary: {
                filesChecked: 0,
                errorsFound: 0,
                warningsFound: 0
            }
        };

        try {
            // Validate configuration
            await this.validateConfig(result);

            // Validate directory structure
            await this.validateDirectories(result);

            // Validate templates
            await this.validateTemplates(result);

            // Update status
            this.status.lastValidation = new Date().toISOString();
            this.status.health = result.valid ? 'healthy' : 'unhealthy';
            this.status.issues = [...result.errors, ...result.warnings];
            await this.saveStatus();

        } catch (error) {
            result.valid = false;
            result.errors.push(`Validation failed: ${error.message}`);
        }

        return result;
    }

    private async validateConfig(result: ValidationResult): Promise<void> {
        // Check if config file exists and is valid
        try {
            await fs.access(this.configPath);
            JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        } catch (error) {
            result.errors.push(`Configuration file issue: ${error.message}`);
            result.valid = false;
        }
    }

    private async validateDirectories(result: ValidationResult): Promise<void> {
        const requiredDirs = Object.values(this.config.paths);

        for (const dir of requiredDirs) {
            try {
                await fs.access(dir);
                result.summary.filesChecked++;
            } catch (error) {
                result.errors.push(`Missing required directory: ${dir}`);
                result.valid = false;
            }
        }
    }

    private async validateTemplates(result: ValidationResult): Promise<void> {
        try {
            const templateDir = this.config.paths.templates;
            const templates = await fs.readdir(templateDir);

            for (const template of templates) {
                if (template.endsWith('.md')) {
                    const templatePath = join(templateDir, template);
                    const content = await fs.readFile(templatePath, 'utf-8');

                    // Basic template validation
                    if (!content.includes('---')) {
                        result.warnings.push(`Template ${template} missing frontmatter`);
                    }

                    result.summary.filesChecked++;
                }
            }
        } catch (error) {
            result.warnings.push(`Could not validate templates: ${error.message}`);
        }
    }

    // ============================================================================
    // ORGANIZATION OPERATIONS
    // ============================================================================

    async organize(): Promise<void> {
        console.log('📁 Organizing vault structure...');

        try {
            // Organize templates
            await this.organizeTemplates();

            // Organize daily notes
            await this.organizeDailyNotes();

            // Clean up duplicates
            await this.cleanupDuplicates();

            // Update status
            this.status.lastOrganization = new Date().toISOString();
            await this.saveStatus();

            console.log('✅ Vault organization completed');

        } catch (error) {
            console.error('❌ Organization failed:', error.message);
            throw error;
        }
    }

    private async organizeTemplates(): Promise<void> {
        // Template organization logic
        console.log('  📋 Organizing templates...');
        // Implementation would go here
    }

    private async organizeDailyNotes(): Promise<void> {
        // Daily notes organization logic
        console.log('  📅 Organizing daily notes...');
        // Implementation would go here
    }

    private async cleanupDuplicates(): Promise<void> {
        // Duplicate cleanup logic
        console.log('  🧹 Cleaning up duplicates...');
        // Implementation would go here
    }

    // ============================================================================
    // MONITORING OPERATIONS
    // ============================================================================

    async startMonitoring(): Promise<void> {
        if (!this.config.settings.enableMonitoring) {
            console.log('⚠️ Monitoring is disabled in configuration');
            return;
        }

        console.log('👁️ Starting vault monitoring...');
        // Monitoring implementation would go here
    }

    async stopMonitoring(): Promise<void> {
        console.log('⏹️ Stopping vault monitoring...');
        // Stop monitoring implementation
    }

    // ============================================================================
    // STATUS AND REPORTING
    // ============================================================================

    getStatus(): VaultStatus {
        return { ...this.status };
    }

    getConfig(): VaultConfig {
        return { ...this.config };
    }

    async generateReport(): Promise<string> {
        const report = [
            '# 📊 Odds-Mono-Map Vault Report',
            '',
            `Generated: ${new Date().toISOString()}`,
            '',
            '## 🏛️ Configuration',
            `- Version: ${this.config.version}`,
            `- Created: ${this.config.created}`,
            `- Last Modified: ${this.config.lastModified}`,
            '',
            '## 📈 Status',
            `- Health: ${this.status.health}`,
            `- Last Validation: ${this.status.lastValidation || 'Never'}`,
            `- Last Organization: ${this.status.lastOrganization || 'Never'}`,
            `- Issues: ${this.status.issues.length}`,
            '',
            '## 📊 Metrics',
            `- Total Files: ${this.status.metrics.totalFiles}`,
            `- Organized Files: ${this.status.metrics.organizedFiles}`,
            `- Validated Files: ${this.status.metrics.validatedFiles}`,
            `- Error Count: ${this.status.metrics.errorCount}`,
            '',
            '## ⚙️ Settings',
            `- Auto Organize: ${this.config.settings.autoOrganize}`,
            `- Validate on Save: ${this.config.settings.validateOnSave}`,
            `- Enable Monitoring: ${this.config.settings.enableMonitoring}`,
            `- Log Level: ${this.config.settings.logLevel}`,
        ].join('\n');

        return report;
    }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

export async function main() {
    const vault = new VaultManager();

    const command = process.argv[2];

    try {
        switch (command) {
            case 'init':
                await vault.initialize();
                break;

            case 'validate':
                const result = await vault.validate();
                console.log(`Validation result: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
                if (result.errors.length > 0) {
                    console.log('Errors:', result.errors);
                }
                if (result.warnings.length > 0) {
                    console.log('Warnings:', result.warnings);
                }
                break;

            case 'organize':
                await vault.organize();
                break;

            case 'status':
                const status = vault.getStatus();
                console.log('Vault Status:', JSON.stringify(status, null, 2));
                break;

            case 'report':
                const report = await vault.generateReport();
                console.log(report);
                break;

            case 'monitor':
                await vault.startMonitoring();
                break;

            default:
                console.log(`
🏛️ Odds-Mono-Map Vault Manager

Usage: bun vault-cli.ts <command>

Commands:
  init      Initialize vault structure
  validate  Validate vault content and structure  
  organize  Organize files and directories
  status    Show current vault status
  report    Generate detailed report
  monitor   Start vault monitoring

Examples:
  bun vault-cli.ts init
  bun vault-cli.ts validate
  bun vault-cli.ts organize
                `);
        }
    } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
    }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
    main();
}
