#!/usr/bin/env bun
// =============================================================================
// TYPE MIGRATION SCRIPT - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Automated migration script for type refactoring
// =============================================================================

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

interface MigrationConfig {
    dryRun: boolean;
    backup: boolean;
    verbose: boolean;
    targetDirectories: string[];
}

interface ImportMapping {
    old: string;
    new: string;
    domain: string;
}

interface MigrationStats {
    filesProcessed: number;
    importsUpdated: number;
    errors: string[];
    skipped: string[];
}

class TypeMigrationTool {
    private config: MigrationConfig;
    private stats: MigrationStats;
    private importMappings: ImportMapping[];

    constructor(config: MigrationConfig) {
        this.config = config;
        this.stats = {
            filesProcessed: 0,
            importsUpdated: 0,
            errors: [],
            skipped: []
        };
        this.importMappings = this.initializeImportMappings();
    }

    private initializeImportMappings(): ImportMapping[] {
        return [
            // Core Vault Types
            { old: 'VaultFile', new: 'vault/core-vault-types', domain: 'vault' },
            { old: 'VaultFolder', new: 'vault/core-vault-types', domain: 'vault' },
            { old: 'VaultNode', new: 'vault/core-vault-types', domain: 'vault' },
            { old: 'VaultRelationship', new: 'vault/core-vault-types', domain: 'vault' },
            { old: 'VaultGraph', new: 'vault/core-vault-types', domain: 'vault' },
            { old: 'VaultDocumentType', new: 'vault/core-vault-types', domain: 'vault' },
            { old: 'typeHeadingMap', new: 'vault/core-vault-types', domain: 'vault' },

            // Configuration Types
            { old: 'VaultConfig', new: 'config/vault-config-types', domain: 'config' },
            { old: 'VaultPaths', new: 'config/vault-config-types', domain: 'config' },
            { old: 'PluginConfigs', new: 'config/vault-config-types', domain: 'config' },
            { old: 'TasksPluginConfig', new: 'config/vault-config-types', domain: 'config' },
            { old: 'VaultStandards', new: 'config/vault-config-types', domain: 'config' },

            // Analytics Types
            { old: 'VaultAnalytics', new: 'analytics/vault-analytics-types', domain: 'analytics' },
            { old: 'AnalyticsOverview', new: 'analytics/vault-analytics-types', domain: 'analytics' },
            { old: 'ContentAnalytics', new: 'analytics/vault-analytics-types', domain: 'analytics' },
            { old: 'UsageAnalytics', new: 'analytics/vault-analytics-types', domain: 'analytics' },

            // Monitoring Types
            { old: 'VaultMetrics', new: 'monitoring/vault-monitoring-types', domain: 'monitoring' },
            { old: 'ValidationIssue', new: 'monitoring/vault-monitoring-types', domain: 'monitoring' },
            { old: 'MonitorStatus', new: 'monitoring/vault-monitoring-types', domain: 'monitoring' },
            { old: 'VaultEvent', new: 'monitoring/vault-monitoring-types', domain: 'monitoring' },

            // Template Types
            { old: 'BaseTemplate', new: 'templates/vault-template-types', domain: 'templates' },
            { old: 'TemplateContext', new: 'templates/vault-template-types', domain: 'templates' },
            { old: 'TemplateResult', new: 'templates/vault-template-types', domain: 'templates' },
            { old: 'ProjectTemplate', new: 'templates/vault-template-types', domain: 'templates' },

            // Validation Types
            { old: 'ValidationRule', new: 'validation/vault-validation-types', domain: 'validation' },
            { old: 'ValidationResult', new: 'validation/vault-validation-types', domain: 'validation' },
            { old: 'ValidationError', new: 'validation/vault-validation-types', domain: 'validation' },

            // Automation Types
            { old: 'AutomationEngine', new: 'automation/vault-automation-types', domain: 'automation' },
            { old: 'AutomationTask', new: 'automation/vault-automation-types', domain: 'automation' },
            { old: 'FileWatcher', new: 'automation/vault-automation-types', domain: 'automation' },
        ];
    }

    async migrate(): Promise<void> {
        console.log('🚀 Starting Type Migration Process...\n');

        if (this.config.backup) {
            await this.createBackup();
        }

        for (const directory of this.config.targetDirectories) {
            await this.processDirectory(directory);
        }

        this.printSummary();
    }

    private async createBackup(): Promise<void> {
        console.log('📦 Creating backup...');
        try {
            execSync('cp -r src src.backup.' + Date.now(), { stdio: 'inherit' });
            console.log('✅ Backup created successfully\n');
        } catch (error) {
            console.error('❌ Failed to create backup:', error);
        }
    }

    private async processDirectory(directory: string): Promise<void> {
        console.log(`📁 Processing directory: ${directory}`);

        try {
            const files = this.getTsFiles(directory);

            for (const file of files) {
                await this.processFile(file);
            }
        } catch (error) {
            this.stats.errors.push(`Failed to process directory ${directory}: ${error}`);
        }
    }

    private getTsFiles(directory: string): string[] {
        const files: string[] = [];

        const scan = (dir: string) => {
            const items = readdirSync(dir);

            for (const item of items) {
                const fullPath = join(dir, item);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    scan(fullPath);
                } else if (extname(item) === '.ts' && !item.includes('.test.ts')) {
                    files.push(fullPath);
                }
            }
        };

        scan(directory);
        return files;
    }

    private async processFile(filePath: string): Promise<void> {
        try {
            let content = readFileSync(filePath, 'utf-8');
            let updated = false;
            const originalContent = content;

            // Update import statements
            for (const mapping of this.importMappings) {
                const oldImportPattern = new RegExp(
                    `from ['"][^'"]*(?:tick-processor-types|vault-types)['"]`,
                    'g'
                );

                if (content.includes(mapping.old) && oldImportPattern.test(content)) {
                    content = this.updateImports(content, mapping);
                    updated = true;
                }
            }

            // Update generic imports from the old file
            content = this.updateGenericImports(content);
            if (content !== originalContent) {
                updated = true;
            }

            if (updated) {
                if (!this.config.dryRun) {
                    writeFileSync(filePath, content);
                }
                this.stats.importsUpdated++;

                if (this.config.verbose) {
                    console.log(`  ✅ Updated: ${relative(process.cwd(), filePath)}`);
                }
            }

            this.stats.filesProcessed++;
        } catch (error) {
            this.stats.errors.push(`Failed to process file ${filePath}: ${error}`);
        }
    }

    private updateImports(content: string, mapping: ImportMapping): string {
        const oldImportPattern = new RegExp(
            `(import\\s*{[^}]*}\\s*from\\s*['"][^'"]*(?:tick-processor-types|vault-types)['"])`,
            'g'
        );

        return content.replace(oldImportPattern, (match) => {
            // Check if the import contains the type we're mapping
            if (match.includes(mapping.old)) {
                // Replace with the new modular import
                return match.replace(
                    /tick-processor-types|vault-types/,
                    `types/${mapping.new}`
                );
            }
            return match;
        });
    }

    private updateGenericImports(content: string): string {
        // Update generic imports that don't specify specific types
        const genericPattern = new RegExp(
            `from ['"][^'"]*(?:tick-processor-types|vault-types)['"]`,
            'g'
        );

        return content.replace(genericPattern, "from './types'");
    }

    private printSummary(): void {
        console.log('\n📊 Migration Summary:');
        console.log(`  Files processed: ${this.stats.filesProcessed}`);
        console.log(`  Imports updated: ${this.stats.importsUpdated}`);
        console.log(`  Errors: ${this.stats.errors.length}`);
        console.log(`  Skipped: ${this.stats.skipped.length}`);

        if (this.stats.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.stats.errors.forEach(error => console.log(`  - ${error}`));
        }

        if (this.stats.skipped.length > 0) {
            console.log('\n⏭️  Skipped:');
            this.stats.skipped.forEach(file => console.log(`  - ${file}`));
        }

        console.log('\n🎉 Migration completed!');

        if (this.config.dryRun) {
            console.log('ℹ️  This was a dry run. No files were actually modified.');
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);

    const config: MigrationConfig = {
        dryRun: args.includes('--dry-run'),
        backup: args.includes('--backup'),
        verbose: args.includes('--verbose'),
        targetDirectories: ['src', 'scripts', 'tests']
    };

    if (args.includes('--help')) {
        console.log(`
Type Migration Tool - Odds Protocol

USAGE:
  bun run type-migration [OPTIONS]

OPTIONS:
  --dry-run     Show what would be changed without making changes
  --backup      Create backup before making changes
  --verbose     Show detailed output
  --help        Show this help message

EXAMPLES:
  bun run type-migration --dry-run --verbose
  bun run type-migration --backup
  bun run type-migration
        `);
        process.exit(0);
    }

    const migrator = new TypeMigrationTool(config);
    await migrator.migrate();
}

if (import.meta.main) {
    main().catch(console.error);
}
