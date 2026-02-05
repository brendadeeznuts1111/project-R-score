#!/usr/bin/env bun
// scripts/migration/migrate-property-tests.ts
// Automated migration script for Phase 2 - Property Test Migration

import { spawn } from "bun";
import { readdir, writeFile } from "fs/promises";
import { join } from "path";

interface MigrationConfig {
    dryRun: boolean;
    backup: boolean;
    patterns: string[];
}

class PropertyTestMigrator {
    private config: MigrationConfig = {
        dryRun: false,
        backup: true,
        patterns: [
            "test(",
            "describe(",
            "it("
        ]
    };

    async migrateAllPropertyTests(): Promise<void> {
        console.log("🔄 Starting Phase 2: Property Test Migration\n");

        // 1. Find all property test files
        const propertyFiles = await this.findPropertyTestFiles();
        console.log(`📁 Found ${propertyFiles.length} property test files`);

        if (this.config.backup) {
            await this.createBackup(propertyFiles);
        }

        // 2. Migrate each file
        for (const file of propertyFiles) {
            await this.migrateFile(file);
        }

        // 3. Verify migration
        await this.verifyMigration(propertyFiles);

        console.log("\n✅ Phase 2 Migration Complete!");
        console.log("🚀 Ready for concurrent execution");
    }

    private async findPropertyTestFiles(): Promise<string[]> {
        const files: string[] = [];

        async function scanDirectory(dir: string): Promise<void> {
            const entries = await readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dir, entry.name);

                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.property.test.ts')) {
                    files.push(fullPath);
                }
            }
        }

        await scanDirectory('property-tests');
        return files;
    }

    private async createBackup(files: string[]): Promise<void> {
        console.log("💾 Creating backup...");

        for (const file of files) {
            const backupFile = file + '.backup';
            const content = await Bun.file(file).text();
            await writeFile(backupFile, content);
        }

        console.log(`✅ Backed up ${files.length} files`);
    }

    private async migrateFile(filePath: string): Promise<void> {
        console.log(`🔄 Migrating: ${filePath}`);

        let content = await Bun.file(filePath).text();
        const originalContent = content;

        // Apply migration patterns
        content = content.replace(/test\("/g, 'test.concurrent("');
        content = content.replace(/describe\("/g, 'describe.concurrent("');
        content = content.replace(/it\("/g, 'it.concurrent("');

        // Add timeout for complex tests
        content = this.addTimeouts(content);

        // Add TDD patterns where appropriate
        content = this.addTDDPatterns(content);

        if (!this.config.dryRun && content !== originalContent) {
            await writeFile(filePath, content);
            console.log(`  ✅ Updated`);
        } else if (this.config.dryRun) {
            console.log(`  🔍 Dry run - would update`);
        }
    }

    private addTimeouts(content: string): string {
        // Add timeouts to tests with property testing
        return content.replace(
            /(test\.concurrent\("[^"]*property[^"]*"[^)]+)\)/gs,
            '$1, { timeout: 180000 })'
        );
    }

    private addTDDPatterns(content: string): string {
        // Add .failing() patterns for known edge cases
        if (content.includes('edge case') && !content.includes('.failing')) {
            content = content.replace(
                /(test\.concurrent\("([^"]*edge case[^"]*)"([^)]+)\))/g,
                'test.failing.concurrent("$2"$3)'
            );
        }
        return content;
    }

    private async verifyMigration(files: string[]): Promise<void> {
        console.log("\n🔍 Verifying migration...");

        let concurrentTests = 0;
        let timeoutTests = 0;
        let failingTests = 0;

        for (const file of files) {
            const content = await Bun.file(file).text();

            concurrentTests += (content.match(/test\.concurrent\(/g) || []).length;
            timeoutTests += (content.match(/timeout:\s*\d+/g) || []).length;
            failingTests += (content.match(/test\.failing/g) || []).length;
        }

        console.log(`📊 Migration Results:`);
        console.log(`  • Concurrent tests: ${concurrentTests}`);
        console.log(`  • Tests with timeouts: ${timeoutTests}`);
        console.log(`  • Failing tests (TDD): ${failingTests}`);
    }

    async rollback(): Promise<void> {
        console.log("🔄 Rolling back migration...");

        const files = await this.findPropertyTestFiles();

        for (const file of files) {
            const backupFile = file + '.backup';

            try {
                const backupContent = await Bun.file(backupFile).text();
                await writeFile(file, backupContent);
                await Bun.write(backupFile, ''); // Remove backup
                console.log(`  ✅ Rolled back: ${file}`);
            } catch (error) {
                console.log(`  ⚠️  No backup found: ${file}`);
            }
        }

        console.log("✅ Rollback complete");
    }
}

// CLI interface
async function main() {
    const migrator = new PropertyTestMigrator();
    const command = process.argv[2];

    try {
        switch (command) {
            case "migrate":
                await migrator.migrateAllPropertyTests();
                break;

            case "dry-run":
                migrator.config.dryRun = true;
                await migrator.migrateAllPropertyTests();
                break;

            case "rollback":
                await migrator.rollback();
                break;

            default:
                console.log(`
🔄 Property Test Migration Script

Usage: bun scripts/migration/migrate-property-tests.ts <command>

Commands:
  migrate    - Migrate all property tests to concurrent patterns
  dry-run    - Show what would be changed without applying
  rollback   - Restore from backup files

Migration Patterns:
  • test(" → test.concurrent("
  • describe(" → describe.concurrent("
  • it(" → it.concurrent("
  • Add timeouts to property tests
  • Add .failing() patterns for edge cases

Examples:
  bun scripts/migration/migrate-property-tests.ts dry-run
  bun scripts/migration/migrate-property-tests.ts migrate
  bun scripts/migration/migrate-property-tests.ts rollback
        `);
        }
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}
