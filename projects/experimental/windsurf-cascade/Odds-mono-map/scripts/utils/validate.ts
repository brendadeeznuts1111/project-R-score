#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]validate
 * 
 * Validate
 * Validation and compliance script
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils,validation,compliance
 */

#!/usr/bin/env bun

/**
 * Vault Validation Script
 * Enhanced with Bun utilities and improved error reporting
 * Checks vault compliance with standards
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, relative } from 'path';
import { glob } from 'glob';
import { estimateShallowMemoryUsageOf } from 'bun:jsc';
import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext, logger } from '../../src/core/error-handler.js';
import { ValidationResult, FileStatistics } from '../../src/types/tick-processor-types.js';
import chalk from 'chalk';
import { YAML } from "bun";

// Bun utilities for enhanced functionality
const vaultPath = process.cwd();
const scriptPath = import.meta.path;
const isDirectExecution = import.meta.path === Bun.main;

interface ValidationIssue {
    file: string;
    fullPath: string;
    relativePath: string;
    type: 'error' | 'warning';
    message: string;
    line?: number;
    suggestion?: string;
}

interface ValidationResult {
    issues: ValidationIssue[];
    stats: {
        totalFiles: number;
        validFiles: number;
        errors: number;
        warnings: number;
        compliance: number;
    };
    executionInfo: {
        scriptPath: string;
        vaultPath: string;
        isDirectExecution: boolean;
        executionTime: number;
    };
}

class VaultValidator {
    private vaultPath: string;
    private issues: ValidationIssue[] = [];

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
    }

    async validateAll(): Promise<ValidationResult> {
        const startTime = Date.now();
        console.info(chalk.blue.bold('🔍 Enhanced Vault Validation...'));
        console.info(chalk.gray(`📁 Vault Path: ${this.vaultPath}`));
        console.info(chalk.gray(`🔧 Script: ${scriptPath}`));
        console.info(chalk.gray(`⚡ Direct Execution: ${isDirectExecution}`));
        console.info(chalk.gray(`🔧 Bun Version: ${Bun.version}`));

        // Clear previous issues
        this.issues = [];

        // Get all markdown files
        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**']
        });

        console.info(chalk.gray(`Found ${files.length} files to validate\n`));

        for (const file of files) {
            await this.validateFile(file);
        }

        // Calculate stats
        const stats = this.calculateStats(files.length);
        const executionTime = Date.now() - startTime;

        // Save results
        this.saveValidationResults(stats);

        // Display results with enhanced info
        this.displayResults(stats, executionTime);

        return {
            issues: this.issues,
            stats,
            executionInfo: {
                scriptPath,
                vaultPath,
                isDirectExecution,
                executionTime
            }
        };
    }

    private async validateFile(filePath: string): Promise<void> {
        const fullPath = join(this.vaultPath, filePath);

        try {
            const content = readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            // Check for YAML frontmatter
            this.validateFrontmatter(filePath, content, lines);

            // Check heading structure
            this.validateHeadings(filePath, lines);

            // Check line length
            this.validateLineLength(filePath, lines);

            // Check file naming
            this.validateFileName(filePath);

            // Check required sections
            this.validateRequiredSections(filePath, content);

        } catch (error) {
            this.addIssue(filePath, 'error', `Failed to read file: ${error}`);
        }
    }

    private validateFrontmatter(filePath: string, content: string, lines: string[]): void {
        if (!content.startsWith('---')) {
            this.addIssue(filePath, 'error', 'Missing YAML frontmatter');
            return;
        }

        try {
            const frontmatterEnd = lines.indexOf('---', 1);
            if (frontmatterEnd === -1) {
                this.addIssue(filePath, 'error', 'Unclosed YAML frontmatter');
                return;
            }

            const frontmatterContent = lines.slice(1, frontmatterEnd).join('\n');
            const frontmatter = parseYaml(frontmatterContent);

            // Check required fields
            const requiredFields = ['type', 'title', 'tags', 'created', 'updated', 'author'];
            for (const field of requiredFields) {
                if (!frontmatter[field]) {
                    this.addIssue(filePath, 'error', `Missing required field: ${field}`);
                }
            }

            // Check tag format
            if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
                for (const tag of frontmatter.tags) {
                    if (typeof tag === 'string' && tag.includes(' ')) {
                        this.addIssue(filePath, 'warning', `Tag contains spaces: ${tag}`);
                    }
                }
            }

        } catch (error) {
            this.addIssue(filePath, 'error', `Invalid YAML frontmatter: ${error}`);
        }
    }

    private validateHeadings(filePath: string, lines: string[]): void {
        let lastLevel = 0;
        const headings: { level: number; text: string; line: number }[] = [];

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2];

                headings.push({ level, text, line: i + 1 });

                // Check heading hierarchy
                if (level > lastLevel + 1) {
                    this.addIssue(filePath, 'warning', `Heading level jump from H${lastLevel} to H${level}`, i + 1);
                }
                lastLevel = level;
            }
        }

        // Check for duplicate headings
        const headingTexts = headings.map(h => h.text.toLowerCase());
        const duplicates = headingTexts.filter((text, index) => headingTexts.indexOf(text) !== index);
        for (const duplicate of duplicates) {
            const dupHeadings = headings.filter(h => h.text.toLowerCase() === duplicate);
            this.addIssue(filePath, 'warning', `Duplicate heading: "${duplicate}"`);
        }

        // Check for H1 count
        const h1Count = headings.filter(h => h.level === 1).length;
        if (h1Count === 0) {
            this.addIssue(filePath, 'error', 'Missing H1 heading');
        } else if (h1Count > 1) {
            this.addIssue(filePath, 'error', `Multiple H1 headings (${h1Count} found)`);
        }
    }

    private validateLineLength(filePath: string, lines: string[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip code blocks
            if (line.trim().startsWith('```')) continue;

            // Check line length (100 chars max)
            if (line.length > 100) {
                this.addIssue(filePath, 'warning', `Line too long (${line.length} chars, max 100)`, i + 1);
            }
        }
    }

    private validateFileName(filePath: string): void {
        const fileName = filePath.split('/').pop() || '';

        // Check for proper naming conventions
        if (fileName.includes(' ')) {
            this.addIssue(filePath, 'warning', 'File name contains spaces');
        }

        // Check for template naming
        if (fileName.includes('Template') && !fileName.endsWith('Template.md')) {
            this.addIssue(filePath, 'warning', 'Template files should end with "Template.md"');
        }
    }

    private validateRequiredSections(filePath: string, content: string): void {
        const lines = content.split('\n');

        // Look for common sections
        const commonSections = ['## Overview', '## Implementation', '## Usage', '## Notes'];
        const hasOverview = lines.some(line => line.trim().startsWith('## Overview'));

        if (!hasOverview && !filePath.includes('Dashboard') && !filePath.includes('Daily Note')) {
            this.addIssue(filePath, 'warning', 'Missing Overview section');
        }
    }

    private addIssue(file: string, type: 'error' | 'warning', message: string, line?: number, suggestion?: string): void {
        const fullPath = join(this.vaultPath, file);
        const relativePath = relative(this.vaultPath, fullPath);

        this.issues.push({
            file,
            fullPath,
            relativePath,
            type,
            message,
            line,
            suggestion: suggestion || this.generateSuggestion(type, message)
        });
    }

    private generateSuggestion(type: 'error' | 'warning', message: string): string {
        if (message.includes('Missing required field')) {
            return 'Add the missing field to YAML frontmatter';
        }
        if (message.includes('Line too long')) {
            return 'Break line at or before 100 characters';
        }
        if (message.includes('Multiple H1 headings')) {
            return 'Use H1 for main title only, use H2+ for sections';
        }
        if (message.includes('Missing H1 heading')) {
            return 'Add a main title with # heading';
        }
        if (message.includes('Missing Overview section')) {
            return 'Add an ## Overview section after the main title';
        }
        if (message.includes('Missing YAML frontmatter')) {
            return 'Add YAML frontmatter with --- delimiters';
        }
        if (message.includes('File name contains spaces')) {
            return 'Consider using hyphens or underscores instead of spaces';
        }
        if (message.includes('Template files should end')) {
            return 'Rename file to end with "Template.md" for consistency';
        }
        return 'Review and fix the identified issue';
    }

    private generateQuickFixCommand(file: string, line?: number): string {
        const lineInfo = line ? `, {line: ${line}}` : '';
        return `Bun.openInEditor('${file}'${lineInfo}, {editor: "vscode"});`;
    }

    private calculateStats(totalFiles: number) {
        const errors = this.issues.filter(i => i.type === 'error').length;
        const warnings = this.issues.filter(i => i.type === 'warning').length;
        const validFiles = totalFiles - this.issues.filter(i => i.type === 'error').length;
        const compliance = totalFiles > 0 ? Math.round((validFiles / totalFiles) * 100) : 0;

        return {
            totalFiles,
            validFiles,
            errors,
            warnings,
            compliance
        };
    }

    private saveValidationResults(stats: ValidationResult): void {
        const statusFile = join(this.vaultPath, '.vault-status.json');
        const statusData = {
            lastValidation: new Date().toISOString(),
            lastOrganization: null,
            issues: stats.errors,
            warnings: stats.warnings,
            compliance: stats.compliance,
            monitorActive: false,
            lastUpdate: new Date().toISOString()
        };
        writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
    }

    private displayResults(stats: ValidationResult, executionTime: number): void {
        console.info(chalk.blue.bold('\n📊 Enhanced Validation Results:'));
        console.info(chalk.gray(`Total files: ${stats.totalFiles}`));
        console.info(chalk.green(`Valid files: ${stats.validFiles}`));
        console.info(chalk.gray(`⚡ Execution time: ${executionTime}ms`));

        if (stats.errors > 0) {
            console.info(chalk.red(`❌ Errors: ${stats.errors}`));
        }

        if (stats.warnings > 0) {
            console.info(chalk.yellow(`⚠️  Warnings: ${stats.warnings}`));
        }

        const complianceColor = stats.compliance >= 90 ? chalk.green :
            stats.compliance >= 70 ? chalk.yellow : chalk.red;
        console.info(complianceColor(`📈 Compliance: ${stats.compliance}%`));

        // Show issues by file with enhanced info
        const issuesByFile = this.issues.reduce((acc, issue) => {
            if (!acc[issue.file]) acc[issue.file] = [];
            acc[issue.file].push(issue);
            return acc;
        }, {} as Record<string, ValidationIssue[]>);

        if (Object.keys(issuesByFile).length > 0) {
            console.info(chalk.blue.bold('\n🔍 Issues by File:'));

            for (const [file, fileIssues] of Object.entries(issuesByFile)) {
                const errorCount = fileIssues.filter(i => i.type === 'error').length;
                const warningCount = fileIssues.filter(i => i.type === 'warning').length;
                const firstIssue = fileIssues[0];

                console.info(chalk.white(`\n📄 ${file}`));
                console.info(chalk.gray(`   📍 Full path: ${firstIssue.fullPath}`));
                console.info(chalk.gray(`   📂 Relative: ${firstIssue.relativePath}`));

                if (errorCount > 0) {
                    console.info(chalk.red(`   ${errorCount} errors:`));
                    fileIssues.filter(i => i.type === 'error').forEach(issue => {
                        const lineInfo = issue.line ? ` (line ${issue.line})` : '';
                        console.info(chalk.red(`     ❌ ${issue.message}${lineInfo}`));
                        if (issue.suggestion) {
                            console.info(chalk.gray(`        💡 ${issue.suggestion}`));
                        }
                    });
                }

                if (warningCount > 0) {
                    console.info(chalk.yellow(`   ${warningCount} warnings:`));
                    fileIssues.filter(i => i.type === 'warning').forEach(issue => {
                        const lineInfo = issue.line ? ` (line ${issue.line})` : '';
                        console.info(chalk.yellow(`     ⚠️  ${issue.message}${lineInfo}`));
                        if (issue.suggestion) {
                            console.info(chalk.gray(`        💡 ${issue.suggestion}`));
                        }
                    });
                }
            }
        }

        console.info(chalk.blue.bold('\n🔧 Quick Actions:'));
        console.info(chalk.gray('   📝 Open files in editor: Bun.openInEditor(file_path, {line: 10, column: 5})'));
        console.info(chalk.gray('   🏃‍♂️ Run auto-fix: bun run vault:fix'));
        console.info(chalk.gray('   📊 View detailed report: cat .vault-status.json'));
        console.info(chalk.gray('   ⚙️  Configure editor: Edit bunfig.toml [debug] section'));

        // Show error statistics
        const errorTypes = this.issues.filter(i => i.type === 'error').reduce((acc, issue) => {
            const errorType = issue.message.split(':')[0] || 'Unknown';
            acc[errorType] = (acc[errorType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const warningTypes = this.issues.filter(i => i.type === 'warning').reduce((acc, issue) => {
            const warningType = issue.message.split(':')[0] || 'Unknown';
            acc[warningType] = (acc[warningType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        if (Object.keys(errorTypes).length > 0) {
            console.info(chalk.yellow('\n🚨 Error Breakdown:'));
            Object.entries(errorTypes).forEach(([type, count]) => {
                console.info(chalk.red(`   ❌ ${type}: ${count}`));
            });
        }

        if (Object.keys(warningTypes).length > 0) {
            console.info(chalk.yellow('\n⚠️  Warning Breakdown:'));
            Object.entries(warningTypes).slice(0, 5).forEach(([type, count]) => {
                console.info(chalk.yellow(`   ⚠️  ${type}: ${count}`));
            });
            if (Object.keys(warningTypes).length > 5) {
                console.info(chalk.gray(`   ... and ${Object.keys(warningTypes).length - 5} more`));
            }
        }

        if (stats.errors > 0) {
            console.info(chalk.yellow('\n💡 Error Resolution Strategy:'));
            console.info('1. Run: bun run vault:fix - Auto-fix common issues');
            console.info('2. Use Bun.openInEditor() to open problematic files directly');
            console.info('3. Check bunfig.toml for editor configuration');
        }
        if (stats.warnings > 0) {
            console.info('2. Review warnings and update files manually');
        }
        if (stats.compliance < 100) {
            console.info('3. Run: bun run vault:organize - Fix file organization');
        }

        // Show debugging information
        console.info(chalk.blue('\n🐛 Debugging Information:'));
        console.info(chalk.gray('   🔍 To debug validation: bun --inspect scripts/validate.ts'));
        console.info(chalk.gray('   📝 To create custom validation: cp scripts/validate.ts scripts/custom-validate.ts'));
        console.info(chalk.gray('   ⚙️  To change editor: Edit bunfig.toml [debug] editor setting'));
        console.info(chalk.gray('   🌍 To check environment: echo $EDITOR or echo $VISUAL'));
    }
}

// Enhanced main execution with Bun utilities
if (import.meta.main) {
    ErrorHandler.handleAsync(
        async () => {
            console.info(chalk.blue.bold('🚀 Starting Enhanced Vault Validation...'));
            console.info(chalk.gray(`🔧 Bun Version: ${Bun.version}`));
            console.info(chalk.gray(`📊 PID: ${process.pid}`));
            console.info(chalk.gray(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`));
            console.info(chalk.gray(`🏠 Main Entry: ${Bun.main}`));
            console.info(chalk.gray(`📁 Script Path: ${import.meta.path}`));

            // Demonstrate direct execution detection
            const isDirectExecution = import.meta.path === Bun.main;
            console.info(chalk.gray(`⚡ Direct Execution: ${isDirectExecution}`));

            if (isDirectExecution) {
                console.info(chalk.green('   ✅ Script is being run directly'));
            } else {
                console.info(chalk.yellow('   ⚠️  Script is being imported from another script'));
            }

            const startTime = Date.now();
            const validator = new VaultValidator();
            const result = await validator.validateAll();

            // Add Bun utilities demonstration
            console.info(chalk.blue.bold('\n🔧 Bun Utilities Available:'));
            console.info(chalk.gray('   📝 Open in editor: Bun.openInEditor(file_path, {line: 10, column: 5})'));
            console.info(chalk.gray('   ⏰ Sleep: await Bun.sleep(1000) or await Bun.sleep(new Date(Date.now() + 5000))'));
            console.info(chalk.gray('   💤 Sleep sync: Bun.sleepSync(ms) (blocking)'));
            console.info(chalk.gray('   🔍 Find executable: Bun.which("bin", { PATH: "/usr/bin", cwd: "/tmp" })'));
            console.info(chalk.gray('   👀 Peek promise: Bun.peek(promise)'));
            console.info(chalk.gray('   🌍 Environment: Bun.env.YOUR_VAR'));
            console.info(chalk.gray('   ⚖️  Deep equals: Bun.deepEquals(obj1, obj2, strict?)'));
            console.info(chalk.gray('   🛡️  Escape HTML: Bun.escapeHTML(unsafe_string)'));
            console.info(chalk.gray('   📏 String width: Bun.stringWidth(text, { countAnsiEscapeCodes: true, ambiguousIsNarrow: false })'));
            console.info(chalk.gray('   🕐 Nanoseconds: Bun.nanoseconds()'));
            console.info(chalk.gray('   📊 Inspect: Bun.inspect(object)'));
            console.info(chalk.gray('   🗂️  Path utilities: Bun.fileURLToPath(url), Bun.pathToFileURL(path)'));
            console.info(chalk.gray('   🗜️  Compression: Bun.gzipSync(), Bun.deflateSync(), Bun.zstdCompressSync()'));
            console.info(chalk.gray('   📊 Inspect: Bun.inspect(object), Bun.inspect.table(data, cols, { colors: true })'));
            console.info(chalk.gray('   🕐 Nanoseconds: Bun.nanoseconds() (high-precision timing)'));
            console.info(chalk.gray('   🗂️  Path utilities: Bun.fileURLToPath(url), Bun.pathToFileURL(path)'));
            console.info(chalk.gray('   📖 Stream utilities: Bun.readableStreamToText(stream), toArrayBuffer(), toJSON()'));
            console.info(chalk.gray('   🔧 Module resolve: Bun.resolveSync(module, root) (with import.meta.dir support)'));
            console.info(chalk.gray('   🎨 Strip ANSI: Bun.stripANSI(colored_text) (6-57x faster than npm)'));
            console.info(chalk.gray('   💾 Memory estimate: estimateShallowMemoryUsageOf(obj) from "bun:jsc"'));
            console.info(chalk.gray('   🔄 Serialize: serialize(obj), deserialize(buf) from "bun:jsc"'));
            console.info(chalk.gray('   📋 Version info: Bun.version, Bun.revision'));
            console.info(chalk.gray('   🏠 Main entry: Bun.main (absolute path to executed file)'));
            console.info(chalk.gray('   📁 Script path: import.meta.path (current file path)'));
            console.info(chalk.gray('   ⚡ Execution check: import.meta.path === Bun.main'));
            console.info(chalk.gray('   🛡️  HTML escape: Bun.escapeHTML(value) (480MB/s - 20GB/s performance)'));
            console.info(chalk.gray('   ⏰ Sleep utilities: await Bun.sleep(ms|date), Bun.sleepSync(ms)'));
            console.info(chalk.gray('   🔍 Find executable: Bun.which("bin", { PATH: "/usr/bin", cwd: "/tmp" })'));

            // Show environment variables info
            console.info(chalk.blue.bold('\n🌍 Environment Variables Status:'));
            console.info(chalk.gray(`   🎨 Colors enabled: ${Bun.env.NO_COLOR ? 'No (NO_COLOR=1)' : 'Yes'}`));
            console.info(chalk.gray(`   🎨 Force colors: ${Bun.env.FORCE_COLOR ? 'Yes (FORCE_COLOR=1)' : 'No'}`));
            console.info(chalk.gray(`   📊 Max HTTP requests: ${Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '256 (default)'}`));
            console.info(chalk.gray(`   🌐 Verbose fetch: ${Bun.env.BUN_CONFIG_VERBOSE_FETCH || 'Disabled'}`));
            console.info(chalk.gray(`   💾 Transpiler cache: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || 'Default location'}`));
            console.info(chalk.gray(`   📁 Temp directory: ${Bun.env.TMPDIR || 'System default'}`));
            console.info(chalk.gray(`   🚫 Do not track: ${Bun.env.DO_NOT_TRACK ? 'Enabled' : 'Disabled'}`));
            console.info(chalk.gray(`   ⚙️  Bun options: ${Bun.env.BUN_OPTIONS || 'None'}`));

            // Show bunfig configuration info
            console.info(chalk.blue.bold('\n⚙️  Bun Configuration & Execution Context:'));
            console.info(chalk.gray('   📝 Default editor: code (VS Code)'));
            console.info(chalk.gray('   🔧 Configure in: bunfig.toml [debug] section'));
            console.info(chalk.gray('   🌍 Environment fallback: $EDITOR or $VISUAL'));
            console.info(chalk.gray('   📋 Available editors: vscode, subl, idea, nvim, vim, emacs'));
            console.info(chalk.gray(`   🏠 Main entry point: ${Bun.main}`));
            console.info(chalk.gray(`   📁 Current script path: ${import.meta.path}`));
            console.info(chalk.gray(`   ⚡ Execution mode: ${import.meta.path === Bun.main ? 'direct' : 'imported'}`));

            // Check if bunfig exists and show status
            const bunfigPath = join(vaultPath, 'bunfig.toml');
            try {
                const bunfigExists = statSync(bunfigPath).isFile();
                if (bunfigExists) {
                    console.info(chalk.green('   ✅ bunfig.toml detected in vault root'));
                } else {
                    console.info(chalk.yellow('   ⚠️  bunfig.toml not found (using defaults)'));
                }
            } catch {
                console.info(chalk.yellow('   ⚠️  bunfig.toml not found (using defaults)'));
            }

            // Example of using Bun utilities for file operations
            if (result.stats.errors > 0) {
                console.info(chalk.yellow('\n🔧 Quick Fix Helper:'));
                console.info(chalk.gray('   You can open problematic files directly:'));

                const errorFiles = [...new Set(result.issues.filter(i => i.type === 'error').map(i => i.file))];
                errorFiles.slice(0, 3).forEach((file, index) => {
                    const issue = result.issues.find(i => i.file === file && i.type === 'error');
                    const lineInfo = issue?.line ? `, {line: ${issue.line}}` : '';
                    console.info(chalk.gray(`   ${index + 1}. Bun.openInEditor('${file}'${lineInfo});`));
                });

                // Demonstrate other utilities
                console.info(chalk.yellow('\n🔧 Other Utility Examples:'));
                console.info(chalk.gray(`   🎲 Generate unique ID: const id = Bun.randomUUIDv7();`));
                console.info(chalk.gray(`   📏 Measure text width: Bun.stringWidth("Your text")`));
                console.info(chalk.gray(`   🛡️  Escape HTML: Bun.escapeHTML("<script>alert('xss')</script>")`));
                console.info(chalk.gray(`   ⚖️  Compare objects: Bun.deepEquals(obj1, obj2, true)`));
                console.info(chalk.gray(`   🕐 High-precision timing: const start = Bun.nanoseconds();`));
                console.info(chalk.gray(`   🎨 Strip ANSI colors: const clean = Bun.stripANSI(coloredText);`));
                console.info(chalk.gray(`   📦 Compress data: const compressed = Bun.gzipSync(buffer);`));
                console.info(chalk.gray(`   🗂️  Convert paths: const path = Bun.fileURLToPath(url);`));
                console.info(chalk.gray(`   📊 Format tables: const table = Bun.inspect.table(data, ['col1', 'col2']);`));
                console.info(chalk.gray(`   🔧 Resolve modules: const resolved = Bun.resolveSync("./file", import.meta.dir);`));
                console.info(chalk.gray(`   🗜️  Compress data: const compressed = Bun.gzipSync(buffer);`));
                console.info(chalk.gray(`   📦 Decompress data: const original = Bun.gunzipSync(compressed);`));
                console.info(chalk.gray(`   💾 Estimate memory: const usage = estimateShallowMemoryUsageOf(obj);`));
                console.info(chalk.gray(`   🔄 Serialize data: const buf = serialize(object);`));

                // Show error handling examples
                console.info(chalk.yellow('\n🚨 Error Handling & Execution Examples:'));
                console.info(chalk.gray(`   🔍 Check executable: const bunPath = Bun.which('bun');`));
                console.info(chalk.gray(`   👀 Non-blocking promise check: const result = Bun.peek(myPromise);`));
                console.info(chalk.gray(`   🌍 Access environment: const nodeEnv = Bun.env.NODE_ENV;`));
                console.info(chalk.gray(`   ⏰ Add delay: await Bun.sleep(1000);`));
                console.info(chalk.gray(`   💤 Block thread: Bun.sleepSync(1000);`));
                console.info(chalk.gray(`   📅 Sleep until date: await Bun.sleep(new Date(Date.now() + 5000));`));
                console.info(chalk.gray(`   🛠️  Find with custom PATH: Bun.which('node', { PATH: '/usr/bin' });`));
                console.info(chalk.gray(`   📂 Find from directory: Bun.which('script', { cwd: '/tmp' });`));
                console.info(chalk.gray(`   🏠 Check execution mode: if (import.meta.path === Bun.main) { /* direct */ }`));
                console.info(chalk.gray(`   📁 Get current file: const currentFile = import.meta.path;`));
                console.info(chalk.gray(`   🎯 Get main entry: const mainFile = Bun.main;`));
            }

            // Show some practical examples of the new utilities
            console.info(chalk.blue.bold('\n📊 Live Utility Examples:'));
            const sampleId = Bun.randomUUIDv7();
            const nanoTime = Bun.nanoseconds();
            console.info(chalk.gray(`   🎲 Generated UUID v7: ${sampleId}`));
            console.info(chalk.gray(`   📏 Text width: Bun.stringWidth("Hello World") = ${Bun.stringWidth("Hello World")}`));
            console.info(chalk.gray(`   🛡️  HTML escaped: ${Bun.escapeHTML('<div>Hello</div>')}`));
            console.info(chalk.gray(`   🕐 Nanoseconds since start: ${Bun.nanoseconds()}`));
            console.info(chalk.gray(`   📋 Bun version: ${Bun.version}`));
            console.info(chalk.gray(`   🔖 Git revision: ${Bun.revision}`));
            console.info(chalk.gray(`   🏠 Main entry: ${Bun.main}`));

            // Demonstrate system utilities
            console.info(chalk.blue('\n🔧 System Utility Examples:'));
            const bunPath = Bun.which('bun');
            const nodePath = Bun.which('node');
            const codePath = Bun.which('code');
            console.info(chalk.gray(`   🔍 Bun executable: ${bunPath || 'Not found'}`));
            console.info(chalk.gray(`   🔍 Node executable: ${nodePath || 'Not found'}`));
            console.info(chalk.gray(`   🔍 VS Code executable: ${codePath || 'Not found'}`));

            // Demonstrate path utilities
            const currentFile = import.meta.path;
            const mainFile = Bun.main;
            const fileUrl = Bun.pathToFileURL(currentFile);
            const backToPath = Bun.fileURLToPath(fileUrl);
            console.info(chalk.gray(`   📁 Current file: ${currentFile}`));
            console.info(chalk.gray(`   🏠 Main entry: ${mainFile}`));
            console.info(chalk.gray(`   🌐 File URL: ${fileUrl}`));
            console.info(chalk.gray(`   🔄 Back to path: ${backToPath}`));
            console.info(chalk.gray(`   ✅ Path conversion works: ${currentFile === backToPath}`));

            // Demonstrate string utilities
            const coloredText = '\u001b[31mRed Text\u001b[0m';
            const plainText = Bun.stripANSI(coloredText);
            const ansiWidth = Bun.stringWidth(coloredText, { countAnsiEscapeCodes: true });
            const displayWidth = Bun.stringWidth(coloredText);
            console.info(chalk.gray(`   🎨 ANSI stripped: "${coloredText}" → "${plainText}"`));
            console.info(chalk.gray(`   📏 ANSI width (with codes): ${ansiWidth}`));
            console.info(chalk.gray(`   📏 Display width (visual): ${displayWidth}`));

            // Demonstrate deep equals with validation results
            const quickCheck = { errors: result.stats.errors, warnings: result.stats.warnings };
            const sameCheck = { errors: result.stats.errors, warnings: result.stats.warnings };
            console.info(chalk.gray(`   ⚖️  Deep equals test: ${Bun.deepEquals(quickCheck, sameCheck)}`));

            // Demonstrate compression utilities
            console.info(chalk.blue('\n📦 Compression Utility Examples:'));
            const testText = 'Hello World! '.repeat(50);
            const testBuffer = Buffer.from(testText);

            // GZIP compression
            const gzipped = Bun.gzipSync(testBuffer);
            const gunzipped = Bun.gunzipSync(gzipped);
            console.info(chalk.gray(`   📊 Original: ${testBuffer.length} bytes`));
            console.info(chalk.gray(`   🗜️  GZIP compressed: ${gzipped.length} bytes (${Math.round((1 - gzipped.length / testBuffer.length) * 100)}% reduction)`));
            console.info(chalk.gray(`   ✅ GZIP decompressed: ${gunzipped.length} bytes`));

            // DEFLATE compression
            const deflated = Bun.deflateSync(testBuffer);
            const inflated = Bun.inflateSync(deflated);
            console.info(chalk.gray(`   🗜️  DEFLATE compressed: ${deflated.length} bytes (${Math.round((1 - deflated.length / testBuffer.length) * 100)}% reduction)`));
            console.info(chalk.gray(`   ✅ DEFLATE decompressed: ${inflated.length} bytes`));

            // Zstandard compression
            const zstdCompressed = Bun.zstdCompressSync(testBuffer, { level: 6 });
            const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
            console.info(chalk.gray(`   🗜️  ZSTD compressed: ${zstdCompressed.length} bytes (${Math.round((1 - zstdCompressed.length / testBuffer.length) * 100)}% reduction)`));
            console.info(chalk.gray(`   ✅ ZSTD decompressed: ${zstdDecompressed.length} bytes`));

            // Demonstrate inspect utilities
            console.info(chalk.blue('\n📊 Inspect Utility Examples:'));
            const testObj = { name: 'Test', value: 42, nested: { active: true } };
            const testArray = new Uint8Array([1, 2, 3, 4, 5]);

            console.info(chalk.gray('   📋 Object inspection:'));
            console.info(chalk.gray(`      ${Bun.inspect(testObj).replace(/\n/g, '\n      ')}`));
            console.info(chalk.gray(`   📋 Array inspection: ${Bun.inspect(testArray)}`));

            // Table formatting
            const tableData = [
                { file: 'validate.ts', errors: 5, warnings: 10, status: '⚠️' },
                { file: 'demo.md', errors: 0, warnings: 2, status: '✅' },
                { file: 'test.js', errors: 1, warnings: 0, status: '❌' }
            ];
            const tableString = Bun.inspect.table(tableData, ['file', 'errors', 'warnings', 'status']);
            console.info(chalk.gray('   📊 Table format example:'));
            console.info(chalk.gray(`      ${tableString.replace(/\n/g, '\n      ')}`));

            // Demonstrate stream utilities
            console.info(chalk.blue('\n📖 Stream Utility Examples:'));
            console.info(chalk.gray('   🔄 Stream conversions available:'));
            console.info(chalk.gray('      • toArrayBuffer() - Convert to binary buffer'));
            console.info(chalk.gray('      • toBytes() - Convert to Uint8Array'));
            console.info(chalk.gray('      • toText() - Convert to string'));
            console.info(chalk.gray('      • toJSON() - Parse as JSON'));
            console.info(chalk.gray('      • toBlob() - Convert to Blob'));
            console.info(chalk.gray('      • toArray() - Get all chunks'));
            console.info(chalk.gray('      • toFormData() - Convert to form data'));

            // Demonstrate memory utilities
            console.info(chalk.blue('\n💾 Memory Utility Examples:'));
            const smallObj = { test: 'data', number: 42 };
            const largeBuffer = Buffer.alloc(1024);

            console.info(chalk.gray(`   📊 Small object memory: ~${estimateShallowMemoryUsageOf(smallObj)} bytes`));
            console.info(chalk.gray(`   📊 Large buffer memory: ~${estimateShallowMemoryUsageOf(largeBuffer)} bytes`));
            console.info(chalk.gray('   💡 Use Bun.generateHeapSnapshot() for accurate memory analysis'));
            // Demonstrate table formatting
            const sampleData = [
                { file: 'test.md', errors: 2, warnings: 5 },
                { file: 'demo.md', errors: 0, warnings: 1 }
            ];
            console.info(chalk.gray(`   📊 Sample table format available (Bun.inspect.table)`));

            // Practical example: Generate a validation report using Bun utilities
            console.info(chalk.blue.bold('\n📝 Generated Validation Report:'));
            const reportId = Bun.randomUUIDv7();
            const reportData = {
                id: reportId,
                timestamp: new Date().toISOString(),
                vaultPath: vaultPath,
                stats: result.stats,
                executionTime: result.executionInfo.executionTime
            };

            // Escape some sample HTML for safety
            const sampleHtml = `<script>alert('Validation complete!')</script>`;
            const escapedHtml = Bun.escapeHTML(sampleHtml);

            console.info(chalk.gray(`   📋 Report ID: ${reportId}`));
            console.info(chalk.gray(`   🛡️  HTML Safety: ${escapedHtml}`));
            console.info(chalk.gray(`   📏 Report width: ${Bun.stringWidth(JSON.stringify(reportData))} chars`));

            // Show how to open the report in editor
            console.info(chalk.yellow(`\n💾 To save this report, you could run:`));
            console.info(chalk.gray(`   const reportPath = 'validation-report-${reportId}.json';`));
            console.info(chalk.gray(`   Bun.write(reportPath, JSON.stringify(reportData, null, 2));`));
            console.info(chalk.gray(`   Bun.openInEditor(reportPath);`));

            console.info(chalk.green.bold('\n✅ Validation completed successfully!'));
        },
        ErrorSeverity.HIGH,
        ErrorCategory.VAULT,
        createErrorContext()
            .script('validate.ts')
            .function('main')
            .data({
                bunVersion: Bun.version,
                vaultPath: vaultPath
            })
            .build()
    );
}

export { VaultValidator };
