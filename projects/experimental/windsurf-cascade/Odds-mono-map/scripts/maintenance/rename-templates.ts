#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][MAINTENANCE][SCOPE][OPTIMIZATION][META][CARE][#REF]rename-templates
 * 
 * Rename Templates
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
 * Template Renaming Script
 * Fixes template naming conventions by removing spaces and enforcing "Template.md" suffix
 * 
 * @fileoverview Automated template renaming for vault standards compliance
 * @author Odds Protocol Team
 * @version 1.0.0
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

class TemplateRenamer {
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

        // Rule 1: Remove spaces but keep essential structure
        if (fileName.includes(' ')) {
            // Replace multiple spaces with single space, then with hyphen
            newName = newName.replace(/\s+/g, '-');
            needsRename = true;
        }

        // Rule 2: Ensure "Template" suffix for template files (but be conservative)
        if (this.isTemplateFile(filePath) && !newName.toLowerCase().endsWith('template')) {
            // Don't add "Template" if it already has template-like words
            const templateWords = ['template', 'guide', 'dashboard', 'system', 'configuration'];
            const hasTemplateWord = templateWords.some(word =>
                newName.toLowerCase().includes(word)
            );

            if (!hasTemplateWord) {
                newName = newName + '-Template';
                needsRename = true;
            }
        }

        // Rule 3: Clean up special characters but keep emojis and essential punctuation
        // Remove problematic characters but keep emojis, hyphens, underscores, numbers
        if (/[^\w\-_🚀📋🔧🗂️📚🔐🌐💻📊📈🎨🎪📅📝🔗]/.test(newName)) {
            newName = newName.replace(/[^\w\-_🚀📋🔧🗂️📚🔐🌐💻📊📈🎨🎪📅📝🔗]/g, '');
            needsRename = true;
        }

        // Rule 4: Ensure proper filename format (Title Case with hyphens)
        if (newName && newName !== nameWithoutExt) {
            // Convert hyphen-separated words to title case
            newName = this.toHyphenatedTitleCase(newName);
            needsRename = true;
        }

        if (needsRename) {
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
     * Convert string to title case while preserving acronyms
     */
    private toTitleCase(str: string): string {
        // Define common acronyms to preserve
        const acronyms = ['API', 'MD', 'TS', 'JS', 'CSS', 'HTML', 'URL', 'URI', 'JSON', 'XML', 'SQL'];

        return str.replace(/\b\w+/g, (word) => {
            if (acronyms.includes(word.toUpperCase())) {
                return word.toUpperCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
    }

    /**
     * Convert hyphen-separated words to title case while preserving emojis and acronyms
     */
    private toHyphenatedTitleCase(str: string): string {
        // Define common acronyms to preserve
        const acronyms = ['API', 'MD', 'TS', 'JS', 'CSS', 'HTML', 'URL', 'URI', 'JSON', 'XML', 'SQL'];

        return str.split('-').map((word) => {
            // Handle words with emojis
            if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(word)) {
                // Keep emojis as-is, capitalize the text part
                return word.replace(/[a-zA-Z]+/g, (match) => {
                    if (acronyms.includes(match.toUpperCase())) {
                        return match.toUpperCase();
                    }
                    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
                });
            }

            if (acronyms.includes(word.toUpperCase())) {
                return word.toUpperCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join('-');
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
        console.log(chalk.blue.bold('📋 Template Renaming Script'));
        console.log(chalk.gray('Usage: bun rename-templates.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --dry-run    Show what would be renamed without doing it'));
        console.log(chalk.gray('  --report     Show detailed report of planned changes'));
        console.log(chalk.gray('  --commands   Generate shell commands for manual execution'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        process.exit(0);
    }

    try {
        const renamer = new TemplateRenamer(vaultPath, options);

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

export { TemplateRenamer, type RenameOperation };
