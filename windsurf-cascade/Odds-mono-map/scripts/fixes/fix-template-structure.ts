#!/usr/bin/env bun

/**
 * [DOMAIN][VAULT][TYPE][FIX][SCOPE][TEMPLATE][META][STRUCTURE][#REF]fix-template-structure
 * 
 * Template Structure Fix Script
 * Fixes template structure issues: multiple H1 headings, missing YAML frontmatter
 * 
 * @fileoverview Automated template structure fixing for vault standards compliance
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 * @category fixes
 * @tags template-fix,structure,h1-headings,frontmatter,yaml,standards-compliance
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface StructureIssue {
    filePath: string;
    issueType: 'multiple-h1' | 'missing-frontmatter' | 'missing-overview';
    details: any;
}

interface FixOperation {
    filePath: string;
    fixes: string[];
    originalContent: string;
    fixedContent: string;
}

class TemplateStructureFixer {
    private vaultPath: string;
    private templatesDir: string;
    private dryRun: boolean;
    private issues: StructureIssue[] = [];
    private fixes: FixOperation[] = [];

    constructor(vaultPath: string, options: { dryRun?: boolean } = {}) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
        this.dryRun = options.dryRun ?? false;
    }

    /**
     * Scan templates directory for structure issues
     */
    async scanTemplates(): Promise<void> {
        console.log(chalk.blue.bold('🔍 Scanning templates for structure issues...'));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Found ${files.length} template files to analyze`));

            for (const filePath of files) {
                await this.analyzeFile(filePath);
            }

            console.log(chalk.green(`\n✅ Analysis complete: ${this.issues.length} structure issues found`));
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
     * Analyze a single file for structure issues
     */
    private async analyzeFile(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.split('\n');

            // Check for missing YAML frontmatter
            if (!this.hasYamlFrontmatter(content)) {
                this.issues.push({
                    filePath,
                    issueType: 'missing-frontmatter',
                    details: { lineCount: lines.length }
                });
            }

            // Check for multiple H1 headings
            const h1Headings = this.findH1Headings(content);
            if (h1Headings.length > 1) {
                this.issues.push({
                    filePath,
                    issueType: 'multiple-h1',
                    details: { headings: h1Headings, count: h1Headings.length }
                });
            } else if (h1Headings.length === 0) {
                this.issues.push({
                    filePath,
                    issueType: 'missing-overview',
                    details: { needsH1: true }
                });
            }

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not analyze file ${filePath}: ${error.message}`));
        }
    }

    /**
     * Check if content has YAML frontmatter
     */
    private hasYamlFrontmatter(content: string): boolean {
        const trimmed = content.trimStart();
        return trimmed.startsWith('---') && trimmed.includes('---\n');
    }

    /**
     * Find all H1 headings in content
     */
    private findH1Headings(content: string): string[] {
        const lines = content.split('\n');
        const h1Headings: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) {
                h1Headings.push(trimmed);
            }
        }

        return h1Headings;
    }

    /**
     * Fix all identified structure issues
     */
    async fixIssues(): Promise<void> {
        if (this.issues.length === 0) {
            console.log(chalk.green('✅ No structure issues found!'));
            return;
        }

        console.log(chalk.blue.bold(`\n🔧 ${this.dryRun ? 'DRY RUN: Would fix' : 'Fixing'} ${this.issues.length} structure issues...`));

        // Group issues by file
        const issuesByFile = this.issues.reduce((acc, issue) => {
            if (!acc[issue.filePath]) acc[issue.filePath] = [];
            acc[issue.filePath].push(issue);
            return acc;
        }, {} as Record<string, StructureIssue[]>);

        const results = {
            success: 0,
            failed: 0
        };

        for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
            try {
                const fixOperation = await this.createFixOperation(filePath, fileIssues);

                if (fixOperation) {
                    this.fixes.push(fixOperation);

                    if (!this.dryRun) {
                        await writeFile(filePath, fixOperation.fixedContent, 'utf-8');
                        console.log(chalk.green(`   ✅ Fixed ${filePath}`));
                    } else {
                        console.log(chalk.cyan(`   🔧 Would fix ${filePath}:`));
                        for (const fix of fixOperation.fixes) {
                            console.log(chalk.gray(`      - ${fix}`));
                        }
                    }
                    results.success++;
                }
            } catch (error) {
                console.log(chalk.red(`   ❌ Failed to fix ${filePath}: ${error.message}`));
                results.failed++;
            }
        }

        console.log(chalk.blue.bold(`\n📊 Results:`));
        console.log(chalk.green(`   ✅ Success: ${results.success}`));
        console.log(chalk.red(`   ❌ Failed: ${results.failed}`));
    }

    /**
     * Create fix operation for a file with issues
     */
    private async createFixOperation(filePath: string, issues: StructureIssue[]): Promise<FixOperation | null> {
        try {
            const originalContent = await readFile(filePath, 'utf-8');
            let fixedContent = originalContent;
            const fixes: string[] = [];

            // Fix missing YAML frontmatter
            const missingFrontmatter = issues.find(i => i.issueType === 'missing-frontmatter');
            if (missingFrontmatter) {
                fixedContent = this.addYamlFrontmatter(fixedContent, filePath);
                fixes.push('Added YAML frontmatter');
            }

            // Fix multiple H1 headings
            const multipleH1 = issues.find(i => i.issueType === 'multiple-h1');
            if (multipleH1) {
                fixedContent = this.fixMultipleH1Headings(fixedContent, multipleH1.details.headings);
                fixes.push(`Fixed ${multipleH1.details.count} H1 headings`);
            }

            // Fix missing H1 heading
            const missingH1 = issues.find(i => i.issueType === 'missing-overview');
            if (missingH1) {
                fixedContent = this.addH1Heading(fixedContent, filePath);
                fixes.push('Added H1 heading');
            }

            return {
                filePath,
                fixes,
                originalContent,
                fixedContent
            };

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not create fix for ${filePath}: ${error.message}`));
            return null;
        }
    }

    /**
     * Add YAML frontmatter to content
     */
    private addYamlFrontmatter(content: string, filePath: string): string {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Template';
        const title = this.generateTitleFromFileName(fileName);

        const frontmatter = `---
type: template
title: ${title}
section: "06"
category: template
priority: medium
status: active
tags:
  - template
  - documentation
  - vault-standards
created: ${new Date().toISOString().split('T')[0]}T${new Date().toTimeString().split(' ')[0]}Z
updated: ${new Date().toISOString().split('T')[0]}T${new Date().toTimeString().split(' ')[0]}Z
author: system
review-date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0]}Z
---

`;

        // Insert frontmatter at the beginning
        return frontmatter + content;
    }

    /**
     * Generate title from filename
     */
    private generateTitleFromFileName(fileName: string): string {
        // Convert hyphens to spaces and capitalize words
        return fileName
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Api/g, 'API')
            .replace(/Html/g, 'HTML')
            .replace(/Css/g, 'CSS')
            .replace(/Js/g, 'JS')
            .replace(/Ts/g, 'TS');
    }

    /**
     * Fix multiple H1 headings
     */
    private fixMultipleH1Headings(content: string, headings: string[]): string {
        const lines = content.split('\n');
        let firstH1Found = false;

        const fixedLines = lines.map(line => {
            const trimmed = line.trim();

            if (trimmed.startsWith('# ')) {
                if (!firstH1Found) {
                    firstH1Found = true;
                    return line; // Keep the first H1
                } else {
                    // Convert subsequent H1s to H2s
                    return line.replace(/^# /, '## ');
                }
            }

            return line;
        });

        return fixedLines.join('\n');
    }

    /**
     * Add H1 heading if missing
     */
    private addH1Heading(content: string, filePath: string): string {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Template';
        const title = this.generateTitleFromFileName(fileName);

        // Find where to insert the H1 (after frontmatter or at beginning)
        const lines = content.split('\n');
        let insertIndex = 0;

        // Skip frontmatter if present
        if (lines[0]?.trim() === '---') {
            for (let i = 1; i < lines.length; i++) {
                if (lines[i]?.trim() === '---') {
                    insertIndex = i + 2; // Insert after the closing --- and an empty line
                    break;
                }
            }
        }

        // Insert H1 heading
        lines.splice(insertIndex, 0, '', `# ${title} - {{date:YYYY-MM-DD}}`, '');

        return lines.join('\n');
    }

    /**
     * Display detailed report of issues found
     */
    displayReport(): void {
        if (this.issues.length === 0) {
            console.log(chalk.green('✅ No template structure issues found!'));
            return;
        }

        console.log(chalk.blue.bold('\n📋 Structure Issues Report:'));
        console.log(chalk.gray('='.repeat(80)));

        // Group by issue type
        const byType = this.issues.reduce((acc, issue) => {
            if (!acc[issue.issueType]) acc[issue.issueType] = [];
            acc[issue.issueType].push(issue);
            return acc;
        }, {} as Record<string, StructureIssue[]>);

        for (const [issueType, issues] of Object.entries(byType)) {
            const typeLabel = {
                'multiple-h1': '🔴 Multiple H1 Headings',
                'missing-frontmatter': '🟡 Missing YAML Frontmatter',
                'missing-overview': '🟠 Missing H1 Heading'
            }[issueType] || issueType;

            console.log(chalk.cyan(`\n${typeLabel} (${issues.length} files):`));

            for (const issue of issues.slice(0, 5)) { // Show max 5 examples
                const relativePath = issue.filePath.replace(this.vaultPath + '/', '');
                console.log(chalk.gray(`   ${relativePath}`));
                if (issue.issueType === 'multiple-h1') {
                    console.log(chalk.gray(`      → ${issue.details.count} H1 headings found`));
                }
            }

            if (issues.length > 5) {
                console.log(chalk.gray(`   ... and ${issues.length - 5} more files`));
            }
        }

        console.log(chalk.blue.bold(`\n📊 Summary: ${this.issues.length} structure issues found`));
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
        report: args.includes('--report')
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('🔧 Template Structure Fix Script'));
        console.log(chalk.gray('Usage: bun fix-template-structure.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --dry-run    Show what would be fixed without doing it'));
        console.log(chalk.gray('  --report     Show detailed report of issues found'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        process.exit(0);
    }

    try {
        const fixer = new TemplateStructureFixer(vaultPath, options);

        await fixer.scanTemplates();

        if (options.report) {
            fixer.displayReport();
        } else {
            await fixer.fixIssues();
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

export { TemplateStructureFixer, type StructureIssue, type FixOperation };
