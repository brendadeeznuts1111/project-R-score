#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][ANALYSIS][SCOPE][PROJECT][META][ANALYTICS][#REF]enhanced-template-validation
 * 
 * Enhanced Template Validation
 * Template management script
 * 
 * @fileoverview Analytics and reporting functionality for vault insights
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category analytics
 * @tags analytics,template,structure
 */

#!/usr/bin/env bun

/**
 * Enhanced Template Validation Rules
 * Adds template-specific validation rules to the vault validation system
 * 
 * @fileoverview Template-specific validation rules for enhanced compliance
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface ValidationRule {
    name: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    check: (content: string, filePath: string) => ValidationResult[];
}

interface ValidationResult {
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    suggestion?: string;
}

interface TemplateValidationReport {
    filePath: string;
    results: ValidationResult[];
    score: number;
    issues: {
        errors: number;
        warnings: number;
        info: number;
    };
}

class EnhancedTemplateValidator {
    private vaultPath: string;
    private templatesDir: string;
    private rules: ValidationRule[] = [];

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
        this.initializeRules();
    }

    /**
     * Initialize template-specific validation rules
     */
    private initializeRules(): void {
        this.rules = [
            // Template Naming Rules
            {
                name: 'template-naming-convention',
                description: 'Template files should follow naming conventions',
                severity: 'warning',
                check: this.checkTemplateNaming.bind(this)
            },

            // Frontmatter Rules
            {
                name: 'template-frontmatter-completeness',
                description: 'Template frontmatter should be complete',
                severity: 'error',
                check: this.checkFrontmatterCompleteness.bind(this)
            },

            {
                name: 'template-frontmatter-type',
                description: 'Template should have correct type in frontmatter',
                severity: 'error',
                check: this.checkFrontmatterType.bind(this)
            },

            // Structure Rules
            {
                name: 'template-heading-hierarchy',
                description: 'Template should have proper heading hierarchy',
                severity: 'warning',
                check: this.checkHeadingHierarchy.bind(this)
            },

            {
                name: 'template-required-sections',
                description: 'Template should have required sections',
                severity: 'warning',
                check: this.checkRequiredSections.bind(this)
            },

            // Content Rules
            {
                name: 'template-examples',
                description: 'Template should include usage examples',
                severity: 'info',
                check: this.checkExamples.bind(this)
            },

            {
                name: 'template-variables',
                description: 'Template should use template variables appropriately',
                severity: 'info',
                check: this.checkTemplateVariables.bind(this)
            },

            // Performance Rules
            {
                name: 'template-file-size',
                description: 'Template file size should be reasonable',
                severity: 'warning',
                check: this.checkFileSize.bind(this)
            },

            {
                name: 'template-complexity',
                description: 'Template complexity should be manageable',
                severity: 'info',
                check: this.checkComplexity.bind(this)
            },

            // Standards Rules
            {
                name: 'template-tags-completeness',
                description: 'Template should have comprehensive tags',
                severity: 'warning',
                check: this.checkTagsCompleteness.bind(this)
            },

            {
                name: 'template-date-fields',
                description: 'Template should have proper date fields',
                severity: 'error',
                check: this.checkDateFields.bind(this)
            }
        ];
    }

    /**
     * Validate all template files
     */
    async validateAllTemplates(): Promise<TemplateValidationReport[]> {
        console.log(chalk.blue.bold('🔍 Running enhanced template validation...'));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Found ${files.length} template files to validate`));

            const reports: TemplateValidationReport[] = [];

            for (const filePath of files) {
                const report = await this.validateTemplate(filePath);
                reports.push(report);
            }

            this.displaySummary(reports);
            return reports;

        } catch (error) {
            console.error(chalk.red(`❌ Error validating templates: ${error.message}`));
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
     * Validate a single template file
     */
    private async validateTemplate(filePath: string): Promise<TemplateValidationReport> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const allResults: ValidationResult[] = [];

            // Run all validation rules
            for (const rule of this.rules) {
                const results = rule.check(content, filePath);
                allResults.push(...results);
            }

            // Calculate score and issues
            const issues = {
                errors: allResults.filter(r => r.severity === 'error').length,
                warnings: allResults.filter(r => r.severity === 'warning').length,
                info: allResults.filter(r => r.severity === 'info').length
            };

            const score = this.calculateScore(issues);

            return {
                filePath,
                results: allResults,
                score,
                issues
            };

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not validate ${filePath}: ${error.message}`));
            return {
                filePath,
                results: [],
                score: 0,
                issues: { errors: 1, warnings: 0, info: 0 }
            };
        }
    }

    /**
     * Calculate validation score (0-100)
     */
    private calculateScore(issues: { errors: number; warnings: number; info: number }): number {
        const totalIssues = issues.errors * 10 + issues.warnings * 3 + issues.info * 1;
        const maxScore = 100;
        return Math.max(0, maxScore - totalIssues);
    }

    // =============================================================================
    // VALIDATION RULE IMPLEMENTATIONS
    // =============================================================================

    /**
     * Check template naming convention
     */
    private checkTemplateNaming(content: string, filePath: string): ValidationResult[] {
        const fileName = filePath.split('/').pop() || '';
        const results: ValidationResult[] = [];

        // Check for spaces in filename
        if (fileName.includes(' ')) {
            results.push({
                rule: 'template-naming-convention',
                severity: 'warning',
                message: 'Template filename contains spaces',
                suggestion: 'Replace spaces with hyphens'
            });
        }

        // Check for "Template" suffix for template files
        const isTemplate = this.isTemplateFile(filePath);
        if (isTemplate && !fileName.replace('.md', '').toLowerCase().includes('template')) {
            results.push({
                rule: 'template-naming-convention',
                severity: 'warning',
                message: 'Template filename should include "Template" suffix',
                suggestion: 'Add "-Template" to filename'
            });
        }

        return results;
    }

    /**
     * Check frontmatter completeness
     */
    private checkFrontmatterCompleteness(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];

        if (!content.startsWith('---')) {
            results.push({
                rule: 'template-frontmatter-completeness',
                severity: 'error',
                message: 'Missing YAML frontmatter',
                suggestion: 'Add proper YAML frontmatter with required fields'
            });
            return results;
        }

        const frontmatter = this.extractFrontmatter(content);
        const requiredFields = ['type', 'title', 'section', 'category', 'created', 'updated'];

        for (const field of requiredFields) {
            if (!frontmatter[field]) {
                results.push({
                    rule: 'template-frontmatter-completeness',
                    severity: 'error',
                    message: `Missing required field: ${field}`,
                    suggestion: `Add ${field} to frontmatter`
                });
            }
        }

        return results;
    }

    /**
     * Check frontmatter type
     */
    private checkFrontmatterType(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];
        const frontmatter = this.extractFrontmatter(content);

        if (frontmatter.type) {
            const validTypes = ['template', 'documentation', 'guide', 'note'];
            if (!validTypes.includes(frontmatter.type)) {
                results.push({
                    rule: 'template-frontmatter-type',
                    severity: 'error',
                    message: `Invalid type: ${frontmatter.type}`,
                    suggestion: `Use one of: ${validTypes.join(', ')}`
                });
            }
        }

        return results;
    }

    /**
     * Check heading hierarchy
     */
    private checkHeadingHierarchy(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];
        const lines = content.split('\n');
        let previousLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#')) {
                const level = line.match(/^#+/)?.[0].length || 0;

                if (level > previousLevel + 1) {
                    results.push({
                        rule: 'template-heading-hierarchy',
                        severity: 'warning',
                        message: `Heading level jump from H${previousLevel} to H${level}`,
                        line: i + 1,
                        suggestion: 'Use sequential heading levels'
                    });
                }

                previousLevel = level;
            }
        }

        return results;
    }

    /**
     * Check required sections
     */
    private checkRequiredSections(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];
        const requiredSections = ['## Overview', '## Usage', '## Examples'];

        for (const section of requiredSections) {
            if (!content.includes(section)) {
                results.push({
                    rule: 'template-required-sections',
                    severity: 'warning',
                    message: `Missing required section: ${section}`,
                    suggestion: `Add ${section} section to template`
                });
            }
        }

        return results;
    }

    /**
     * Check for examples
     */
    private checkExamples(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];

        if (!content.includes('```') && !content.includes('Example')) {
            results.push({
                rule: 'template-examples',
                severity: 'info',
                message: 'Template lacks usage examples',
                suggestion: 'Add code examples or usage demonstrations'
            });
        }

        return results;
    }

    /**
     * Check template variables
     */
    private checkTemplateVariables(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];

        if (content.includes('{{') && content.includes('}}')) {
            // Check for proper variable formatting
            const variables = content.match(/\{\{[^}]+\}\}/g) || [];
            for (const variable of variables) {
                if (!variable.includes('{{date:') && !variable.includes('{{title') && !variable.includes('{{section')) {
                    results.push({
                        rule: 'template-variables',
                        severity: 'info',
                        message: `Unknown template variable: ${variable}`,
                        suggestion: 'Use standard template variables'
                    });
                }
            }
        }

        return results;
    }

    /**
     * Check file size
     */
    private checkFileSize(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];
        const sizeKB = content.length / 1024;

        if (sizeKB > 50) {
            results.push({
                rule: 'template-file-size',
                severity: 'warning',
                message: `Template file is large: ${sizeKB.toFixed(1)}KB`,
                suggestion: 'Consider splitting into smaller templates'
            });
        }

        return results;
    }

    /**
     * Check template complexity
     */
    private checkComplexity(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];

        const headings = (content.match(/^#+/gm) || []).length;
        const codeBlocks = (content.match(/```/g) || []).length / 2;
        const complexity = headings + codeBlocks;

        if (complexity > 20) {
            results.push({
                rule: 'template-complexity',
                severity: 'info',
                message: `Template is complex: ${complexity} sections`,
                suggestion: 'Consider simplifying or documenting structure'
            });
        }

        return results;
    }

    /**
     * Check tags completeness
     */
    private checkTagsCompleteness(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];
        const frontmatter = this.extractFrontmatter(content);

        if (frontmatter.tags) {
            const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
            if (tags.length < 3) {
                results.push({
                    rule: 'template-tags-completeness',
                    severity: 'warning',
                    message: `Template has few tags: ${tags.length}`,
                    suggestion: 'Add more descriptive tags'
                });
            }
        } else {
            results.push({
                rule: 'template-tags-completeness',
                severity: 'warning',
                message: 'Template missing tags',
                suggestion: 'Add relevant tags to frontmatter'
            });
        }

        return results;
    }

    /**
     * Check date fields
     */
    private checkDateFields(content: string, filePath: string): ValidationResult[] {
        const results: ValidationResult[] = [];
        const frontmatter = this.extractFrontmatter(content);

        const dateFields = ['created', 'updated', 'review-date'];
        for (const field of dateFields) {
            if (frontmatter[field]) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
                if (!dateRegex.test(frontmatter[field])) {
                    results.push({
                        rule: 'template-date-fields',
                        severity: 'error',
                        message: `Invalid date format for ${field}: ${frontmatter[field]}`,
                        suggestion: 'Use ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ'
                    });
                }
            }
        }

        return results;
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Check if file is a template
     */
    private isTemplateFile(filePath: string): boolean {
        const fileName = filePath.split('/').pop()?.toLowerCase() || '';
        return fileName.includes('template') ||
            fileName.includes('guide') ||
            fileName.includes('dashboard') ||
            filePath.includes('/06 - Templates/');
    }

    /**
     * Extract frontmatter from content
     */
    private extractFrontmatter(content: string): Record<string, any> {
        const frontmatter: Record<string, any> = {};

        if (!content.startsWith('---')) {
            return frontmatter;
        }

        const lines = content.split('\n');
        let inFrontmatter = false;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line === '---') {
                break;
            }

            if (line.includes(':')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();

                // Handle different value types
                if (value.startsWith('[') && value.endsWith(']')) {
                    frontmatter[key.trim()] = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
                } else {
                    frontmatter[key.trim()] = value.replace(/"/g, '');
                }
            }
        }

        return frontmatter;
    }

    /**
     * Display validation summary
     */
    private displaySummary(reports: TemplateValidationReport[]): void {
        const totalIssues = reports.reduce((acc, report) => ({
            errors: acc.errors + report.issues.errors,
            warnings: acc.warnings + report.issues.warnings,
            info: acc.info + report.issues.info
        }), { errors: 0, warnings: 0, info: 0 });

        const avgScore = reports.reduce((sum, report) => sum + report.score, 0) / reports.length;
        const perfectFiles = reports.filter(report => report.score === 100).length;

        console.log(chalk.blue.bold('\n📊 Enhanced Template Validation Summary:'));
        console.log(chalk.gray('='.repeat(60)));
        console.log(chalk.cyan(`Files validated: ${reports.length}`));
        console.log(chalk.green(`Perfect files: ${perfectFiles}/${reports.length}`));
        console.log(chalk.blue(`Average score: ${avgScore.toFixed(1)}/100`));

        console.log(chalk.red(`\n🔴 Errors: ${totalIssues.errors}`));
        console.log(chalk.yellow(`🟡 Warnings: ${totalIssues.warnings}`));
        console.log(chalk.blue(`🔵 Info: ${totalIssues.info}`));

        // Show worst files
        const worstFiles = reports.sort((a, b) => a.score - b.score).slice(0, 5);
        if (worstFiles.length > 0 && worstFiles[0].score < 80) {
            console.log(chalk.yellow('\n📉 Files needing attention:'));
            for (const report of worstFiles) {
                const fileName = report.filePath.split('/').pop() || '';
                console.log(chalk.gray(`   ${fileName}: ${report.score}/100 (${report.issues.errors}E, ${report.issues.warnings}W)`));
            }
        }
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('🔍 Enhanced Template Validator'));
        console.log(chalk.gray('Usage: bun enhanced-template-validation.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        process.exit(0);
    }

    try {
        const validator = new EnhancedTemplateValidator(vaultPath);
        await validator.validateAllTemplates();

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

export { EnhancedTemplateValidator, type ValidationRule, type ValidationResult, type TemplateValidationReport };
