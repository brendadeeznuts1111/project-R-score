#!/usr/bin/env bun

/**
 * 🛡️ Automated Vault Validation System
 * 
 * Comprehensive validation system to prevent future vault violations
 * and maintain structural integrity over time.
 * 
 * @fileoverview Automated validation for vault structure, naming conventions, and link integrity
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category validation
 * @tags validation, automation, vault-health
 */

import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

interface ValidationRule {
    id: string;
    name: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    validate: (context: ValidationContext) => ValidationResult[];
}

interface ValidationContext {
    vaultPath: string;
    files: VaultFile[];
    directories: string[];
    config: ValidationConfig;
}

interface VaultFile {
    path: string;
    relativePath: string;
    name: string;
    extension: string;
    size: number;
    isDirectory: boolean;
    content?: string;
}

interface ValidationResult {
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    suggestion?: string;
}

interface ValidationConfig {
    templateNamingPattern: RegExp;
    requiredDirectories: string[];
    prohibitedPatterns: RegExp[];
    maxFileSize: number;
    allowedExtensions: string[];
}

interface ValidationReport {
    timestamp: string;
    summary: {
        totalFiles: number;
        totalDirectories: number;
        errors: number;
        warnings: number;
        info: number;
        complianceScore: number;
    };
    results: ValidationResult[];
    recommendations: string[];
}

class VaultValidator {
    private config: ValidationConfig;
    private rules: ValidationRule[] = [];

    constructor(config?: Partial<ValidationConfig>) {
        this.config = {
            templateNamingPattern: /^[A-Z][a-zA-Z0-9\s-]+\s+\(Bun Template\)\.md$|^TEMPLATE_MASTER_INDEX\.md$/,
            requiredDirectories: [
                '01 - Daily Notes',
                '01 - Daily Notes/01 - Reports',
                '01 - Daily Notes/02 - Journals',
                '02 - Architecture',
                '02 - Architecture/01 - Data Models',
                '02 - Architecture/02 - System Design',
                '03 - Development',
                '03 - Development/01 - Code Snippets',
                '03 - Development/02 - Testing',
                '03 - Development/Type System',
                '04 - Canvas Maps',
                '04 - Documentation',
                '04 - Documentation/01 - API',
                '04 - Documentation/02 - Guides',
                '04 - Documentation/02 - Technical',
                '04 - Documentation/03 - Dashboards',
                '04 - Documentation/03 - Reports',
                '04 - Documentation/04 - Reference',
                '05 - Assets',
                '05 - Assets/Excalidraw',
                '05 - Assets/Images',
                '06 - Templates',
                '06 - Templates/01 - Note Templates',
                '06 - Templates/02 - Project Templates',
                '06 - Templates/03 - Dashboard Templates',
                '06 - Templates/04 - Development Templates',
                '06 - Templates/05 - Design Templates',
                '06 - Templates/06 - Architecture Templates',
                '06 - Templates/07 - Configuration Templates',
                '06 - Templates/Base Templates',
                '06 - Templates/Canvas Templates',
                '07 - Archive',
                '07 - Archive/Old Notes',
                '08 - Logs',
                '08 - Logs/05 - Reports',
                '08 - Logs/src',
                '09 - Testing',
                '09 - Testing/01 - Unit',
                '10 - Benchmarking',
                '10 - Benchmarking/01 - Core Utilities',
                '10 - Benchmarking/02 - Table Rendering',
                '10 - Benchmarking/03 - String Width',
                '10 - Benchmarking/04 - Performance Analysis',
                '10 - Benchmarking/05 - Integration Demos',
                '10 - Benchmarking/06 - Documentation & Reports',
                '11 - Workshop',
                '11 - Workshop/Canvas Demos',
                '11 - Workshop/scripts'
            ],
            prohibitedPatterns: [
                /^[0-9]{2} - [^T].*\.md$/, // Numbered prefixes that aren't templates
                /📚|🔧|⚡|🎯|📊|🏆|🚀/, // Emojis in filenames
                /^\s+|\s+$/, // Leading/trailing whitespace
                /[A-Z]{3,}_/, // Multiple consecutive capitals with underscores
                /_.*_.*\.md$/ // Multiple underscores in filenames
            ],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedExtensions: ['.md', '.canvas', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.ts', '.js'],
            ...config
        };

        this.initializeRules();
    }

    private initializeRules(): void {
        this.rules = [
            // Template Naming Rules
            {
                id: 'template-naming',
                name: 'Template Naming Convention',
                description: 'Templates must follow naming pattern: [Name] Template.md',
                severity: 'error',
                validate: (ctx) => this.validateTemplateNaming(ctx)
            },

            // Directory Structure Rules
            {
                id: 'directory-structure',
                name: 'Required Directory Structure',
                description: 'Vault must have required directories',
                severity: 'error',
                validate: (ctx) => this.validateDirectoryStructure(ctx)
            },

            // File Organization Rules
            {
                id: 'file-organization',
                name: 'File Organization',
                description: 'Files must be in appropriate directories',
                severity: 'warning',
                validate: (ctx) => this.validateFileOrganization(ctx)
            },

            // Link Integrity Rules
            {
                id: 'link-integrity',
                name: 'Link Integrity',
                description: 'Internal links must be valid',
                severity: 'error',
                validate: (ctx) => this.validateLinkIntegrity(ctx)
            },

            // File Size Rules
            {
                id: 'file-size',
                name: 'File Size Limits',
                description: 'Files must not exceed size limits',
                severity: 'warning',
                validate: (ctx) => this.validateFileSize(ctx)
            },

            // Extension Rules
            {
                id: 'file-extensions',
                name: 'File Extensions',
                description: 'Files must have allowed extensions',
                severity: 'warning',
                validate: (ctx) => this.validateFileExtensions(ctx)
            },

            // Prohibited Pattern Rules
            {
                id: 'prohibited-patterns',
                name: 'Prohibited Patterns',
                description: 'Filenames must not contain prohibited patterns',
                severity: 'error',
                validate: (ctx) => this.validateProhibitedPatterns(ctx)
            }
        ];
    }

    async validateVault(vaultPath: string): Promise<ValidationReport> {
        console.log('🔍 Starting vault validation...');

        const context = await this.buildValidationContext(vaultPath);
        const results: ValidationResult[] = [];

        // Run all validation rules
        for (const rule of this.rules) {
            console.log(`  📋 Running rule: ${rule.name}`);
            const ruleResults = rule.validate(context);
            results.push(...ruleResults);
        }

        // Generate summary and recommendations
        const summary = this.generateSummary(context, results);
        const recommendations = this.generateRecommendations(results);

        const report: ValidationReport = {
            timestamp: new Date().toISOString(),
            summary,
            results,
            recommendations
        };

        return report;
    }

    private async buildValidationContext(vaultPath: string): Promise<ValidationContext> {
        const files: VaultFile[] = [];
        const directories: string[] = [];

        await this.scanDirectory(vaultPath, vaultPath, files, directories);

        // Read content for markdown files (needed for link validation)
        for (const file of files.filter(f => f.extension === '.md')) {
            try {
                file.content = await readFile(file.path, 'utf-8');
            } catch (error) {
                console.warn(`  ⚠️  Could not read content for ${file.relativePath}`);
            }
        }

        return {
            vaultPath,
            files,
            directories,
            config: this.config
        };
    }

    private async scanDirectory(
        rootPath: string,
        currentPath: string,
        files: VaultFile[],
        directories: string[]
    ): Promise<void> {
        const entries = await readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(currentPath, entry.name);
            const relativePath = relative(rootPath, fullPath);

            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                directories.push(relativePath);
                await this.scanDirectory(rootPath, fullPath, files, directories);
            } else if (entry.isFile() && !entry.name.startsWith('.')) {
                const stats = await stat(fullPath);
                files.push({
                    path: fullPath,
                    relativePath,
                    name: entry.name,
                    extension: extname(entry.name),
                    size: stats.size,
                    isDirectory: false
                });
            }
        }
    }

    private validateTemplateNaming(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];
        const templateFiles = ctx.files.filter(f =>
            f.relativePath.startsWith('06 - Templates/') &&
            f.extension === '.md'
        );

        for (const file of templateFiles) {
            if (!this.config.templateNamingPattern.test(file.name)) {
                results.push({
                    ruleId: 'template-naming',
                    severity: 'error',
                    message: `Template "${file.name}" does not follow naming convention`,
                    file: file.relativePath,
                    suggestion: `Rename to match pattern: [Descriptive Name] Template.md`
                });
            }
        }

        return results;
    }

    private validateDirectoryStructure(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const requiredDir of this.config.requiredDirectories) {
            if (!ctx.directories.includes(requiredDir)) {
                results.push({
                    ruleId: 'directory-structure',
                    severity: 'error',
                    message: `Missing required directory: ${requiredDir}`,
                    suggestion: `Create directory: ${requiredDir}`
                });
            }
        }

        return results;
    }

    private validateFileOrganization(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];
        const rootFiles = ctx.files.filter(f => !f.relativePath.includes('/'));

        for (const file of rootFiles) {
            if (file.extension === '.md' && file.name !== '00 - Dashboard.md') {
                results.push({
                    ruleId: 'file-organization',
                    severity: 'warning',
                    message: `Markdown file in root directory should be organized`,
                    file: file.relativePath,
                    suggestion: 'Move file to appropriate subdirectory'
                });
            }
        }

        return results;
    }

    private validateLinkIntegrity(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];
        const internalLinkPattern = /\[\[([^\]]+)\]\]/g;
        const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

        for (const file of ctx.files.filter(f => f.content)) {
            const content = file.content!;
            const filePath = file.relativePath;

            // Check wiki-style links
            let match;
            while ((match = internalLinkPattern.exec(content)) !== null) {
                const linkTarget = match[1];
                if (!this.isValidInternalLink(linkTarget, ctx)) {
                    results.push({
                        ruleId: 'link-integrity',
                        severity: 'error',
                        message: `Broken internal link: [[${linkTarget}]]`,
                        file: filePath,
                        suggestion: `Update or remove broken link reference`
                    });
                }
            }

            // Check markdown links
            while ((match = markdownLinkPattern.exec(content)) !== null) {
                const linkTarget = match[2];
                if (!linkTarget.startsWith('http') && !this.isValidMarkdownLink(linkTarget, ctx)) {
                    results.push({
                        ruleId: 'link-integrity',
                        severity: 'error',
                        message: `Broken markdown link: [${match[1]}](${linkTarget})`,
                        file: filePath,
                        suggestion: `Update or remove broken link reference`
                    });
                }
            }
        }

        return results;
    }

    private isValidInternalLink(target: string, ctx: ValidationContext): boolean {
        // Strip path components and check if file exists
        const cleanTarget = target.split('#')[0].split('|')[0];

        // Check exact matches
        if (ctx.files.some(f => f.relativePath === cleanTarget)) {
            return true;
        }

        // Check filename matches
        const filename = cleanTarget.split('/').pop() + '.md';
        return ctx.files.some(f => f.name === filename);
    }

    private isValidMarkdownLink(target: string, ctx: ValidationContext): boolean {
        // Check if it's a relative file path
        if (target.includes('/') || target.endsWith('.md')) {
            return ctx.files.some(f => f.relativePath === target);
        }

        return false;
    }

    private validateFileSize(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const file of ctx.files) {
            if (file.size > this.config.maxFileSize) {
                results.push({
                    ruleId: 'file-size',
                    severity: 'warning',
                    message: `File "${file.name}" exceeds size limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
                    file: file.relativePath,
                    suggestion: 'Consider splitting large files or optimizing content'
                });
            }
        }

        return results;
    }

    private validateFileExtensions(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const file of ctx.files) {
            if (file.extension && !this.config.allowedExtensions.includes(file.extension)) {
                results.push({
                    ruleId: 'file-extensions',
                    severity: 'warning',
                    message: `File "${file.name}" has unsupported extension: ${file.extension}`,
                    file: file.relativePath,
                    suggestion: `Use supported extensions: ${this.config.allowedExtensions.join(', ')}`
                });
            }
        }

        return results;
    }

    private validateProhibitedPatterns(ctx: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const file of ctx.files) {
            for (const pattern of this.config.prohibitedPatterns) {
                if (pattern.test(file.name)) {
                    results.push({
                        ruleId: 'prohibited-patterns',
                        severity: 'error',
                        message: `File "${file.name}" contains prohibited pattern`,
                        file: file.relativePath,
                        suggestion: 'Rename file to remove prohibited characters/patterns'
                    });
                    break; // Only report once per file
                }
            }
        }

        return results;
    }

    private generateSummary(ctx: ValidationContext, results: ValidationResult[]): ValidationReport['summary'] {
        const errors = results.filter(r => r.severity === 'error').length;
        const warnings = results.filter(r => r.severity === 'warning').length;
        const info = results.filter(r => r.severity === 'info').length;

        const totalIssues = errors + warnings + info;
        const maxPossibleIssues = ctx.files.length * 2; // Rough estimate
        const complianceScore = Math.max(0, Math.round(((maxPossibleIssues - totalIssues) / maxPossibleIssues) * 100));

        return {
            totalFiles: ctx.files.length,
            totalDirectories: ctx.directories.length,
            errors,
            warnings,
            info,
            complianceScore
        };
    }

    private generateRecommendations(results: ValidationResult[]): string[] {
        const recommendations: string[] = [];

        const errorCounts = results.reduce((acc, result) => {
            acc[result.ruleId] = (acc[result.ruleId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Generate recommendations based on most common issues
        if (errorCounts['template-naming'] > 0) {
            recommendations.push(`Fix ${errorCounts['template-naming']} template naming violations`);
        }

        if (errorCounts['directory-structure'] > 0) {
            recommendations.push(`Create ${errorCounts['directory-structure']} missing directories`);
        }

        if (errorCounts['link-integrity'] > 0) {
            recommendations.push(`Fix ${errorCounts['link-integrity']} broken internal links`);
        }

        if (errorCounts['file-organization'] > 0) {
            recommendations.push(`Organize ${errorCounts['file-organization']} misplaced files`);
        }

        return recommendations;
    }

    async generateReport(report: ValidationReport): Promise<string> {
        const { summary, results, recommendations } = report;

        let reportContent = `# 🔍 Vault Validation Report - ${new Date().toLocaleDateString()}

## 📊 Summary
- **Total Files**: ${summary.totalFiles}
- **Total Directories**: ${summary.totalDirectories}
- **Errors**: ${summary.errors}
- **Warnings**: ${summary.warnings}
- **Info**: ${summary.info}
- **Compliance Score**: ${summary.complianceScore}%

`;

        if (summary.errors > 0) {
            reportContent += `## ❌ Errors (${summary.errors})
`;
            const errors = results.filter(r => r.severity === 'error');
            for (const error of errors) {
                reportContent += `- ❌ ${error.message}`;
                if (error.file) reportContent += ` in ${error.file}`;
                if (error.suggestion) reportContent += ` (${error.suggestion})`;
                reportContent += '\n';
            }
            reportContent += '\n';
        }

        if (summary.warnings > 0) {
            reportContent += `## ⚠️ Warnings (${summary.warnings})
`;
            const warnings = results.filter(r => r.severity === 'warning');
            for (const warning of warnings) {
                reportContent += `- ⚠️ ${warning.message}`;
                if (warning.file) reportContent += ` in ${warning.file}`;
                if (warning.suggestion) reportContent += ` (${warning.suggestion})`;
                reportContent += '\n';
            }
            reportContent += '\n';
        }

        if (recommendations.length > 0) {
            reportContent += `## 🎯 Recommendations
`;
            for (const recommendation of recommendations) {
                reportContent += `- ${recommendation}\n`;
            }
        }

        return reportContent;
    }
}

// CLI Interface
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = args[0] || process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log('🛡️  Vault Validator');
        console.log('Usage: bun vault-validator.ts [vault-path] [options]');
        console.log('\nOptions:');
        console.log('  --help, -h     Show this help message');
        console.log('  --output, -o   Output report to file');
        console.log('  --fix          Attempt to auto-fix issues (experimental)');
        process.exit(0);
    }

    try {
        const validator = new VaultValidator();
        const report = await validator.validateVault(vaultPath);

        console.log('\n📋 Validation Results:');
        console.log(`  Errors: ${report.summary.errors}`);
        console.log(`  Warnings: ${report.summary.warnings}`);
        console.log(`  Compliance Score: ${report.summary.complianceScore}%`);

        if (args.includes('--output') || args.includes('-o')) {
            const reportContent = await validator.generateReport(report);
            const reportPath = join(vaultPath, `validation-report-${Date.now()}.md`);
            await writeFile(reportPath, reportContent, 'utf-8');
            console.log(`\n📄 Report saved to: ${reportPath}`);
        }

        if (report.summary.errors > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { VaultValidator, ValidationConfig, ValidationReport };
