#!/usr/bin/env bun
// =============================================================================
// PHASE 3 CLEANUP SCRIPT - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:26:00Z
// DESCRIPTION: Phase 3 cleanup - Remove legacy monolithic type file
// =============================================================================

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

interface CleanupConfig {
    dryRun: boolean;
    backup: boolean;
    force: boolean;
    verifyImports: boolean;
}

class Phase3Cleanup {
    private config: CleanupConfig;
    private legacyFilePath = 'src/types/tick-processor-types.ts';
    private indexPath = 'src/types/index.ts';

    constructor(config: CleanupConfig) {
        this.config = config;
    }

    async execute(): Promise<void> {
        console.log('🧹 Starting Phase 3 Cleanup Process...\n');

        // Step 1: Verify prerequisites
        await this.verifyPrerequisites();

        // Step 2: Check for legacy imports
        await this.checkLegacyImports();

        // Step 3: Update index file to remove legacy re-export
        await this.updateIndexFile();

        // Step 4: Remove legacy file
        await this.removeLegacyFile();

        // Step 5: Verify compilation
        await this.verifyCompilation();

        console.log('\n🎉 Phase 3 Cleanup completed successfully!');
    }

    private async verifyPrerequisites(): Promise<void> {
        console.log('📋 Verifying prerequisites...');

        // Check if migration script has been run
        if (!this.hasMigrationBeenRun()) {
            throw new Error('❌ Migration script must be run before cleanup. Run: bun run scripts/type-migration.ts');
        }

        // Check if all modular files exist
        const requiredFiles = [
            'src/types/vault/core-vault-types.ts',
            'src/types/config/vault-config-types.ts',
            'src/types/analytics/vault-analytics-types.ts',
            'src/types/monitoring/vault-monitoring-types.ts',
            'src/types/templates/vault-template-types.ts',
            'src/types/validation/vault-validation-types.ts',
            'src/types/automation/vault-automation-types.ts',
            'src/types/utils/vault-utility-types.ts'
        ];

        for (const file of requiredFiles) {
            if (!existsSync(file)) {
                throw new Error(`❌ Required modular file missing: ${file}`);
            }
        }

        console.log('✅ All prerequisites verified\n');
    }

    private hasMigrationBeenRun(): boolean {
        // Check if there are any imports from the legacy file
        try {
            const result = execSync('grep -r "tick-processor-types" src/ --exclude-dir=node_modules || true', { encoding: 'utf-8' });
            return !result.includes('from');
        } catch {
            return true; // No imports found, which is good
        }
    }

    private async checkLegacyImports(): Promise<void> {
        console.log('🔍 Checking for remaining legacy imports...');

        try {
            const result = execSync('grep -r "tick-processor-types" src/ --exclude-dir=node_modules --exclude="*.log" || true', { encoding: 'utf-8' });

            if (result.trim()) {
                console.log('⚠️  Found remaining legacy imports:');
                console.log(result);

                if (!this.config.force) {
                    throw new Error('❌ Legacy imports still exist. Use --force to override or run migration script first.');
                }
            } else {
                console.log('✅ No legacy imports found\n');
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('No legacy imports found')) {
                console.log('✅ No legacy imports found\n');
            } else {
                throw error;
            }
        }
    }

    private async updateIndexFile(): Promise<void> {
        console.log('📝 Updating index file to remove legacy re-export...');

        let content = readFileSync(this.indexPath, 'utf-8');

        // Remove the legacy re-export line
        const legacyExportPattern = /\/\/ Re-export from the old monolithic file for backward compatibility[\s\S]*?export \* from '\.\/tick-processor-types';[\s\S]*?\/\/ \[MIGRATION HELPERS\]/;

        const replacementText = '// =============================================================================\n// [MIGRATION HELPERS]';
        content = content.replace(legacyExportPattern, replacementText);

        if (!this.config.dryRun) {
            writeFileSync(this.indexPath, content);
            console.log('✅ Index file updated');
        } else {
            console.log('🔍 DRY RUN: Would update index file');
        }
    }

    private async removeLegacyFile(): Promise<void> {
        console.log('🗑️  Removing legacy monolithic file...');

        if (this.config.backup && existsSync(this.legacyFilePath)) {
            const backupPath = `${this.legacyFilePath}.backup.${Date.now()}`;
            writeFileSync(backupPath, readFileSync(this.legacyFilePath));
            console.log(`📦 Backup created: ${backupPath}`);
        }

        if (!this.config.dryRun && existsSync(this.legacyFilePath)) {
            unlinkSync(this.legacyFilePath);
            console.log('✅ Legacy file removed');
        } else if (this.config.dryRun) {
            console.log('🔍 DRY RUN: Would remove legacy file');
        }
    }

    private async verifyCompilation(): Promise<void> {
        console.log('🔧 Verifying compilation after cleanup...');

        try {
            if (!this.config.dryRun) {
                execSync('bun build src/types/index.ts --target=bun --outdir=dist --external=bun', { stdio: 'inherit' });
                console.log('✅ Compilation successful');

                // Also check TypeScript compilation
                execSync('bun tsc --noEmit --skipLibCheck src/types/index.ts', { stdio: 'inherit' });
                console.log('✅ TypeScript compilation successful');
            } else {
                console.log('🔍 DRY RUN: Would verify compilation');
            }
        } catch (error) {
            throw new Error(`❌ Compilation failed: ${error}`);
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);

    const config: CleanupConfig = {
        dryRun: args.includes('--dry-run'),
        backup: !args.includes('--no-backup'),
        force: args.includes('--force'),
        verifyImports: !args.includes('--skip-verify')
    };

    if (args.includes('--help')) {
        console.log(`
Phase 3 Cleanup Tool - Odds Protocol Type Refactoring

USAGE:
  bun run phase3-cleanup [OPTIONS]

OPTIONS:
  --dry-run        Show what would be changed without making changes
  --no-backup      Skip creating backup of legacy file
  --force          Force cleanup even if legacy imports are found
  --skip-verify    Skip verification of legacy imports
  --help           Show this help message

DESCRIPTION:
  This script removes the legacy monolithic type file after migration is complete.
  It verifies that no legacy imports remain, updates the index file, and removes
  the old tick-processor-types.ts file.

EXAMPLES:
  bun run phase3-cleanup --dry-run
  bun run phase3-cleanup --force
  bun run phase3-cleanup --no-backup
        `);
        process.exit(0);
    }

    try {
        const cleanup = new Phase3Cleanup(config);
        await cleanup.execute();
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main().catch(console.error);
}
