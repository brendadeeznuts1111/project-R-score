#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][MAINTENANCE][SCOPE][OPTIMIZATION][META][CARE][#REF]rename-templates-simple
 * 
 * Rename Templates Simple
 * Template management script
 * 
 * @fileoverview Ongoing maintenance and optimization tools
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category maintenance
 * @tags maintenance,template,structure
 */

#!/usr/bin/env bun

/**
 * Simple Template Renaming Script
 * Conservative approach to fixing template naming conventions
 * 
 * @fileoverview Automated template renaming for vault standards compliance
 * @author Odds Protocol Team
 * @version 2.0.0
 * @since 2025-11-18
 */

import { readdir, rename, stat } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import chalk from 'chalk';

interface RenameOperation {
    oldPath: string;
    newPath: string;
    oldName: string;
    newName: string;
}

class SimpleTemplateRenamer {
    private vaultPath: string;
    private templatesDir: string;
    private dryRun: boolean;
    private operations: RenameOperation[] = [];

    constructor(vaultPath: string, options: { dryRun?: boolean } = {}) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
        this.dryRun = options.dryRun ?? false;
    }

    /**
     * Scan templates directory for files that need renaming
     */
    async scanTemplates(): Promise<void> {
        console.log(chalk.blue.bold('🔍 Scanning templates for naming issues...'));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Found ${files.length} template files to analyze`));

            for (const filePath of files) {
                await this.analyzeFile(filePath);
            }

            console.log(chalk.green(`\n✅ Analysis complete: ${this.operations.length} files need renaming`));
        } catch (error) {
            console.error(chalk.red(`❌ Error scanning templates: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get all template files recursively
     */
    private async getAllTemplateFiles(): Promise<string[]> {
        const files: string[] = [];

        async function scanDirectory(dir: string): Promise<void> {
            try {
                const entries = await readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (entry.isFile() && entry.name.endsWith('.md')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Could not read directory ${dir}: ${error.message}`));
            }
        }

        await scanDirectory(this.templatesDir);
        return files;
    }

    /**
     * Analyze a single file for naming issues
     */
    private async analyzeFile(filePath: string): Promise<void> {
        const fileName = basename(filePath);
        const dirName = dirname(filePath);
        let nameWithoutExt = fileName.replace('.md', '');

        let needsRename = false;
        let newName = nameWithoutExt;

        // Rule 1: Replace spaces with hyphens (conservative approach)
        if (fileName.includes(' ')) {
            newName = newName.replace(/\s+/g, '-');
            needsRename = true;
        }

        // Rule 2: Add "Template" suffix if missing and it's clearly a template
        if (this.isTemplateFile(filePath) &&
            !newName.toLowerCase().includes('template') &&
            !newName.toLowerCase().includes('guide') &&
            !newName.toLowerCase().includes('system') &&
            !newName.toLowerCase().includes('configuration')) {
            newName = newName + '-Template';
            needsRename = true;
        }

        // Rule 3: Clean up problematic characters (but keep emojis)
        if (/[<>:"|?*]/.test(newName)) {
            newName = newName.replace(/[<>:"|?*]/g, '');
            needsRename = true;
        }

        // Rule 4: Fix multiple consecutive hyphens
        if (/--+/.test(newName)) {
            newName = newName.replace(/-+/g, '-');
            needsRename = true;
        }

        // Rule 5: Remove leading/trailing hyphens
        if (/^-|-$/g.test(newName)) {
            newName = newName.replace(/^-|-$/g, '');
            needsRename = true;
        }

        if (needsRename && newName !== nameWithoutExt) {
            const newFileName = `${newName}.md`;
            const newPath = join(dirName, newFileName);

            this.operations.push({
                oldPath: filePath,
                newPath: newPath,
                oldName: fileName,
                newName: newFileName
            });
        }
    }

    /**
     * Check if a file should be treated as a template
     */
    private isTemplateFile(filePath: string): boolean {
        const fileName = basename(filePath).toLowerCase();

        // Files that should have "Template" suffix
        const templatePatterns = [
            'template',
            'guide',
            'dashboard',
            'note',
            'project',
            'meeting',
            'research',
            'api',
            'specification',
            'tutorial',
            'documentation',
            'style',
            'configuration',
            'folder',
            'snippet',
            'system'
        ];

        return templatePatterns.some(pattern => fileName.includes(pattern));
    }

    /**
     * Execute the renaming operations
     */
    async executeRenames(): Promise<void> {
        if (this.operations.length === 0) {
            console.log(chalk.green('✅ No files need renaming!'));
            return;
        }

        console.log(chalk.blue.bold(`\n🔄 ${this.dryRun ? 'DRY RUN: Would rename' : 'Renaming'} ${this.operations.length} files...`));

        const results = {
            success: 0,
            failed: 0,
            skipped: 0
        };

        for (const operation of this.operations) {
            try {
                if (this.dryRun) {
                    console.log(chalk.cyan(`   ${operation.oldName} → ${operation.newName}`));
                    results.success++;
                } else {
                    // Check if target file already exists
                    try {
                        await stat(operation.newPath);
                        console.log(chalk.yellow(`   ⚠️  Skipping ${operation.oldName} - target already exists`));
                        results.skipped++;
                        continue;
                    } catch {
                        // Target doesn't exist, proceed with rename
                    }

                    await rename(operation.oldPath, operation.newPath);
                    console.log(chalk.green(`   ✅ ${operation.oldName} → ${operation.newName}`));
                    results.success++;
                }
            } catch (error) {
                console.log(chalk.red(`   ❌ Failed to rename ${operation.oldName}: ${error.message}`));
                results.failed++;
            }
        }

        console.log(chalk.blue.bold(`\n📊 Results:`));
        console.log(chalk.green(`   ✅ Success: ${results.success}`));
        console.log(chalk.yellow(`   ⚠️  Skipped: ${results.skipped}`));
        console.log(chalk.red(`   ❌ Failed: ${results.failed}`));
    }

    /**
     * Display detailed report of planned operations
     */
    displayReport(): void {
        if (this.operations.length === 0) {
            console.log(chalk.green('✅ All template files follow naming conventions!'));
            return;
        }

        console.log(chalk.blue.bold('\n📋 Renaming Report:'));
        console.log(chalk.gray('='.repeat(80)));

        // Group by directory
        const byDirectory = this.operations.reduce((acc, op) => {
            const dir = dirname(op.oldPath).replace(this.vaultPath + '/', '');
            if (!acc[dir]) acc[dir] = [];
            acc[dir].push(op);
            return acc;
        }, {} as Record<string, RenameOperation[]>);

        for (const [dir, ops] of Object.entries(byDirectory)) {
            console.log(chalk.cyan(`\n📁 ${dir}:`));
            for (const op of ops) {
                console.log(chalk.gray(`   ${op.oldName}`));
                console.log(chalk.green(`   → ${op.newName}`));
                console.log(chalk.gray('   ' + '-'.repeat(50)));
            }
        }

        console.log(chalk.blue.bold(`\n📊 Summary: ${this.operations.length} files need renaming`));
    }

    /**
     * Generate shell commands for manual execution
     */
    generateCommands(): void {
        if (this.operations.length === 0) {
            console.log(chalk.green('✅ No commands needed!'));
            return;
        }

        console.log(chalk.blue.bold('\n🔧 Generated Commands:'));
        console.log(chalk.gray('#!/bin/bash'));
        console.log(chalk.gray('# Template renaming commands'));

        for (const op of this.operations) {
            const relativeOld = op.oldPath.replace(this.vaultPath + '/', '');
            const relativeNew = op.newPath.replace(this.vaultPath + '/', '');
            console.log(chalk.cyan(`mv "${relativeOld}" "${relativeNew}"`));
        }
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = process.cwd();

    const options = {
        dryRun: args.includes('--dry-run'),
        report: args.includes('--report'),
        commands: args.includes('--commands')
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('📋 Simple Template Renaming Script'));
        console.log(chalk.gray('Usage: bun rename-templates-simple.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --dry-run    Show what would be renamed without doing it'));
        console.log(chalk.gray('  --report     Show detailed report of planned changes'));
        console.log(chalk.gray('  --commands   Generate shell commands for manual execution'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        process.exit(0);
    }

    try {
        const renamer = new SimpleTemplateRenamer(vaultPath, options);

        await renamer.scanTemplates();

        if (options.report) {
            renamer.displayReport();
        }

        if (options.commands) {
            renamer.generateCommands();
        }

        if (!options.report && !options.commands) {
            await renamer.executeRenames();
        }

    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (import.meta.main) {
    main().catch(console.error);
}

export { SimpleTemplateRenamer, type RenameOperation };
