#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][FIX][SCOPE][AUTOMATION][META][CORRECTION][#REF]fix-template-line-length
 * 
 * Fix Template Line Length
 * Automated fixing script for common issues
 * 
 * @fileoverview Automated fixing and correction utilities
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category fixes
 * @tags fixes,automated-fix,correction,template,structure
 */

#!/usr/bin/env bun

/**
 * Template Line Length Fix Script
 * Fixes template line length issues by breaking long lines appropriately
 * 
 * @fileoverview Automated template line length fixing for vault standards compliance
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface LineLengthIssue {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    length: number;
}

interface FixOperation {
    filePath: string;
    linesFixed: number;
    originalContent: string;
    fixedContent: string;
}

class TemplateLineLengthFixer {
    private vaultPath: string;
    private templatesDir: string;
    private dryRun: boolean;
    private maxLineLength: number;
    private issues: LineLengthIssue[] = [];
    private fixes: FixOperation[] = [];

    constructor(vaultPath: string, options: { dryRun?: boolean; maxLineLength?: number } = {}) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
        this.dryRun = options.dryRun ?? false;
        this.maxLineLength = options.maxLineLength ?? 100;
    }

    /**
     * Scan templates directory for line length issues
     */
    async scanTemplates(): Promise<void> {
        console.log(chalk.blue.bold(`🔍 Scanning templates for lines > ${this.maxLineLength} characters...`));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Found ${files.length} template files to analyze`));

            for (const filePath of files) {
                await this.analyzeFile(filePath);
            }

            console.log(chalk.green(`\n✅ Analysis complete: ${this.issues.length} lines exceed ${this.maxLineLength} characters`));
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
     * Analyze a single file for line length issues
     */
    private async analyzeFile(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Skip certain lines that should be long
                if (this.shouldSkipLine(line)) {
                    continue;
                }

                if (line.length > this.maxLineLength) {
                    this.issues.push({
                        filePath,
                        lineNumber: i + 1,
                        lineContent: line,
                        length: line.length
                    });
                }
            }

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not analyze file ${filePath}: ${error.message}`));
        }
    }

    /**
     * Check if a line should be skipped from length checking
     */
    private shouldSkipLine(line: string): boolean {
        const trimmed = line.trim();

        // Skip YAML frontmatter
        if (trimmed.startsWith('---') && trimmed.length > 10) {
            return true;
        }

        // Skip URLs
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return true;
        }

        // Skip code blocks
        if (trimmed.startsWith('```') || trimmed.startsWith('    ')) {
            return true;
        }

        // Skip HTML tags
        if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
            return true;
        }

        // Skip template variables
        if (trimmed.includes('{{') && trimmed.includes('}}')) {
            return true;
        }

        return false;
    }

    /**
     * Fix all identified line length issues
     */
    async fixIssues(): Promise<void> {
        if (this.issues.length === 0) {
            console.log(chalk.green(`✅ No lines exceed ${this.maxLineLength} characters!`));
            return;
        }

        console.log(chalk.blue.bold(`\n🔧 ${this.dryRun ? 'DRY RUN: Would fix' : 'Fixing'} ${this.issues.length} line length issues...`));

        // Group issues by file
        const issuesByFile = this.issues.reduce((acc, issue) => {
            if (!acc[issue.filePath]) acc[issue.filePath] = [];
            acc[issue.filePath].push(issue);
            return acc;
        }, {} as Record<string, LineLengthIssue[]>);

        const results = {
            success: 0,
            failed: 0,
            totalLinesFixed: 0
        };

        for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
            try {
                const fixOperation = await this.createFixOperation(filePath, fileIssues);

                if (fixOperation) {
                    this.fixes.push(fixOperation);

                    if (!this.dryRun) {
                        await writeFile(filePath, fixOperation.fixedContent, 'utf-8');
                        console.log(chalk.green(`   ✅ Fixed ${filePath} (${fixOperation.linesFixed} lines)`));
                    } else {
                        console.log(chalk.cyan(`   🔧 Would fix ${filePath}: ${fixOperation.linesFixed} lines`));
                    }
                    results.success++;
                    results.totalLinesFixed += fixOperation.linesFixed;
                }
            } catch (error) {
                console.log(chalk.red(`   ❌ Failed to fix ${filePath}: ${error.message}`));
                results.failed++;
            }
        }

        console.log(chalk.blue.bold(`\n📊 Results:`));
        console.log(chalk.green(`   ✅ Success: ${results.success} files`));
        console.log(chalk.blue(`   📝 Lines fixed: ${results.totalLinesFixed}`));
        console.log(chalk.red(`   ❌ Failed: ${results.failed}`));
    }

    /**
     * Create fix operation for a file with issues
     */
    private async createFixOperation(filePath: string, issues: LineLengthIssue[]): Promise<FixOperation | null> {
        try {
            const originalContent = await readFile(filePath, 'utf-8');
            const lines = originalContent.split('\n');
            let linesFixed = 0;

            // Fix each long line
            for (const issue of issues) {
                const lineIndex = issue.lineNumber - 1;
                if (lineIndex >= 0 && lineIndex < lines.length) {
                    const fixedLine = this.fixLongLine(lines[lineIndex]);
                    if (fixedLine !== lines[lineIndex]) {
                        lines[lineIndex] = fixedLine;
                        linesFixed++;
                    }
                }
            }

            return {
                filePath,
                linesFixed,
                originalContent,
                fixedContent: lines.join('\n')
            };

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not create fix for ${filePath}: ${error.message}`));
            return null;
        }
    }

    /**
     * Fix a single long line
     */
    private fixLongLine(line: string): string {
        if (line.length <= this.maxLineLength) {
            return line;
        }

        // Strategy 1: Break at sentence boundaries
        const sentenceBreak = line.search(/([.!?])\s+/);
        if (sentenceBreak > this.maxLineLength * 0.7 && sentenceBreak < this.maxLineLength) {
            return line.substring(0, sentenceBreak + 1) + '\n' + ' '.repeat(this.getIndentLevel(line)) + line.substring(sentenceBreak + 2).trim();
        }

        // Strategy 2: Break at commas
        const commaBreak = line.lastIndexOf(',', this.maxLineLength);
        if (commaBreak > this.maxLineLength * 0.5) {
            return line.substring(0, commaBreak + 1) + '\n' + ' '.repeat(this.getIndentLevel(line)) + line.substring(commaBreak + 1).trim();
        }

        // Strategy 3: Break at spaces
        const spaceBreak = line.lastIndexOf(' ', this.maxLineLength);
        if (spaceBreak > this.maxLineLength * 0.3) {
            return line.substring(0, spaceBreak) + '\n' + ' '.repeat(this.getIndentLevel(line)) + line.substring(spaceBreak + 1).trim();
        }

        // Strategy 4: Force break at max length
        return line.substring(0, this.maxLineLength) + '\n' + ' '.repeat(this.getIndentLevel(line)) + line.substring(this.maxLineLength).trim();
    }

    /**
     * Get the indentation level of a line
     */
    private getIndentLevel(line: string): number {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }

    /**
     * Display detailed report of issues found
     */
    displayReport(): void {
        if (this.issues.length === 0) {
            console.log(chalk.green(`✅ No lines exceed ${this.maxLineLength} characters!`));
            return;
        }

        console.log(chalk.blue.bold(`\n📋 Line Length Issues Report (> ${this.maxLineLength} chars):`));
        console.log(chalk.gray('='.repeat(80)));

        // Group by file
        const byFile = this.issues.reduce((acc, issue) => {
            if (!acc[issue.filePath]) acc[issue.filePath] = [];
            acc[issue.filePath].push(issue);
            return acc;
        }, {} as Record<string, LineLengthIssue[]>);

        for (const [filePath, fileIssues] of Object.entries(byFile)) {
            const relativePath = filePath.replace(this.vaultPath + '/', '');
            console.log(chalk.cyan(`\n📄 ${relativePath} (${fileIssues.length} lines):`));

            // Show the worst offenders
            const sortedIssues = fileIssues.sort((a, b) => b.length - a.length);
            for (const issue of sortedIssues.slice(0, 3)) {
                const preview = issue.lineContent.substring(0, 50) + (issue.lineContent.length > 50 ? '...' : '');
                console.log(chalk.gray(`   Line ${issue.lineNumber} (${issue.length} chars): ${preview}`));
            }

            if (fileIssues.length > 3) {
                console.log(chalk.gray(`   ... and ${fileIssues.length - 3} more lines`));
            }
        }

        console.log(chalk.blue.bold(`\n📊 Summary: ${this.issues.length} lines exceed ${this.maxLineLength} characters`));
    }

    /**
     * Show statistics about the issues
     */
    displayStatistics(): void {
        if (this.issues.length === 0) {
            return;
        }

        const lengths = this.issues.map(issue => issue.length);
        const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
        const maxLength = Math.max(...lengths);
        const minLength = Math.min(...lengths);

        console.log(chalk.blue.bold('\n📊 Line Length Statistics:'));
        console.log(chalk.gray(`   Total issues: ${this.issues.length}`));
        console.log(chalk.gray(`   Average length: ${avgLength.toFixed(1)} characters`));
        console.log(chalk.gray(`   Max length: ${maxLength} characters`));
        console.log(chalk.gray(`   Min length: ${minLength} characters`));

        // Distribution
        const distribution = {
            '101-120': 0,
            '121-150': 0,
            '151-200': 0,
            '200+': 0
        };

        for (const length of lengths) {
            if (length <= 120) distribution['101-120']++;
            else if (length <= 150) distribution['121-150']++;
            else if (length <= 200) distribution['151-200']++;
            else distribution['200+']++;
        }

        console.log(chalk.blue.bold('\n📈 Distribution:'));
        for (const [range, count] of Object.entries(distribution)) {
            const percentage = ((count / this.issues.length) * 100).toFixed(1);
            console.log(chalk.gray(`   ${range} chars: ${count} (${percentage}%)`));
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
        stats: args.includes('--stats'),
        maxLineLength: 100
    };

    // Parse custom max line length
    const maxLengthArg = args.find(arg => arg.startsWith('--max-length='));
    if (maxLengthArg) {
        options.maxLineLength = parseInt(maxLengthArg.split('=')[1]);
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('📏 Template Line Length Fix Script'));
        console.log(chalk.gray('Usage: bun fix-template-line-length.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --dry-run         Show what would be fixed without doing it'));
        console.log(chalk.gray('  --report          Show detailed report of issues found'));
        console.log(chalk.gray('  --stats           Show statistics about line length issues'));
        console.log(chalk.gray('  --max-length=N    Set maximum line length (default: 100)'));
        console.log(chalk.gray('  --help, -h        Show this help message'));
        process.exit(0);
    }

    try {
        const fixer = new TemplateLineLengthFixer(vaultPath, options);

        await fixer.scanTemplates();

        if (options.report) {
            fixer.displayReport();
        }

        if (options.stats) {
            fixer.displayStatistics();
        }

        if (!options.report && !options.stats) {
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

export { TemplateLineLengthFixer, type LineLengthIssue, type FixOperation };
