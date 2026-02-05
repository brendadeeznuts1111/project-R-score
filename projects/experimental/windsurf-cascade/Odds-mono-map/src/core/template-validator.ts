/**
 * 📋 Consolidated Template Validator
 * 
 * Consolidates all template validation functionality from:
 * - validate-template-system.ts
 * - enhanced-template-validation.ts
 * - template-analytics.ts
 * - template-performance-monitor.ts
 * - template-wizard.ts
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type {
    TemplateMetadata,
    ValidationResult,
    TemplateValidation,
    ValidationRule,
    ProcessingMetadata
} from '../types/vault.types';

export interface TemplateMetrics {
    totalTemplates: number;
    validTemplates: number;
    invalidTemplates: number;
    averageComplexity: number;
    mostUsedVariables: string[];
    validationTime: number;
}

export interface TemplateAnalytics {
    usageFrequency: { [templateName: string]: number };
    errorPatterns: { [errorType: string]: number };
    variableUsage: { [variableName: string]: number };
    performanceMetrics: TemplateMetrics;
}

export class TemplateValidator {
    private templatePath: string;
    private validationRules: ValidationRule[];
    private analytics: TemplateAnalytics;

    constructor(templatePath: string = '06 - Templates/') {
        this.templatePath = templatePath;
        this.validationRules = this.initializeValidationRules();
        this.analytics = this.initializeAnalytics();
    }

    // ============================================================================
    // CORE VALIDATION
    // ============================================================================

    async validateAll(): Promise<ValidationResult> {
        console.log('🔍 Starting comprehensive template validation...');

        const startTime = Date.now();
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            summary: {
                filesChecked: 0,
                errorsFound: 0,
                warningsFound: 0
            }
        };

        try {
            const templates = await this.getAllTemplates();

            for (const template of templates) {
                await this.validateTemplate(template, result);
                result.summary.filesChecked++;
            }

            // Calculate performance metrics
            const validationTime = Date.now() - startTime;
            this.updateAnalytics(result, validationTime);

        } catch (error) {
            result.valid = false;
            result.errors.push(`Validation system error: ${error.message}`);
        }

        return result;
    }

    async validateTemplate(templatePath: string, result?: ValidationResult): Promise<boolean> {
        const content = await fs.readFile(templatePath, 'utf-8');
        const metadata = await this.extractMetadata(content);

        let isValid = true;
        const localResult: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            summary: {
                filesChecked: 1,
                errorsFound: 0,
                warningsFound: 0
            }
        };

        // Validate frontmatter
        if (!this.hasValidFrontmatter(content)) {
            localResult.errors.push('Missing or invalid frontmatter');
            localResult.valid = false;
            isValid = false;
        }

        // Validate required sections
        const missingSections = this.findMissingSections(content, metadata);
        if (missingSections.length > 0) {
            localResult.warnings.push(`Missing recommended sections: ${missingSections.join(', ')}`);
        }

        // Validate template variables
        const variableIssues = this.validateVariables(content, metadata);
        localResult.errors.push(...variableIssues.errors);
        localResult.warnings.push(...variableIssues.warnings);

        // Validate content structure
        const structureIssues = this.validateStructure(content, metadata);
        localResult.errors.push(...structureIssues.errors);
        localResult.warnings.push(...structureIssues.warnings);

        // Apply custom validation rules
        for (const rule of this.validationRules) {
            const ruleResult = this.applyValidationRule(content, rule);
            if (ruleResult.failed) {
                if (rule.severity === 'error') {
                    localResult.errors.push(ruleResult.message);
                    localResult.valid = false;
                    isValid = false;
                } else {
                    localResult.warnings.push(ruleResult.message);
                }
            }
        }

        // Update analytics
        this.updateTemplateAnalytics(templatePath, localResult);

        // Merge results if provided
        if (result) {
            result.valid = result.valid && localResult.valid;
            result.errors.push(...localResult.errors);
            result.warnings.push(...localResult.warnings);
            result.summary.filesChecked += localResult.summary.filesChecked - 1;
            result.summary.errorsFound += localResult.errors.length;
            result.summary.warningsFound += localResult.warnings.length;
        }

        return isValid;
    }

    // ============================================================================
    // TEMPLATE METADATA EXTRACTION
    // ============================================================================

    async extractMetadata(content: string): Promise<TemplateMetadata> {
        const frontmatter = this.extractFrontmatter(content);

        return {
            name: frontmatter.name || 'Unknown Template',
            version: frontmatter.version || '1.0.0',
            description: frontmatter.description || '',
            author: frontmatter.author,
            tags: frontmatter.tags || [],
            variables: this.extractVariables(content),
            validation: frontmatter.validation || this.getDefaultValidation()
        };
    }

    private extractFrontmatter(content: string): any {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);

        if (!match) return {};

        try {
            // Simple YAML parsing (would use proper YAML parser in production)
            const yaml = match[1];
            const result: any = {};

            yaml.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    result[key.trim()] = this.parseYamlValue(value);
                }
            });

            return result;
        } catch (error) {
            console.warn('Failed to parse frontmatter:', error.message);
            return {};
        }
    }

    private parseYamlValue(value: string): any {
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
            return value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
        }

        // Handle booleans
        if (value === 'true') return true;
        if (value === 'false') return false;

        // Handle numbers
        const num = Number(value);
        if (!isNaN(num)) return num;

        // Handle strings
        return value.replace(/['"]/g, '');
    }

    private extractVariables(content: string): any[] {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        const variables = new Set<string>();
        let match;

        while ((match = variableRegex.exec(content)) !== null) {
            variables.add(match[1].trim());
        }

        return Array.from(variables).map(name => ({
            name,
            type: 'string' as const,
            required: !name.includes('?'),
            description: `Template variable: ${name}`
        }));
    }

    // ============================================================================
    // VALIDATION RULES
    // ============================================================================

    private initializeValidationRules(): ValidationRule[] {
        return [
            {
                name: 'required-frontmatter',
                description: 'Template must have valid YAML frontmatter',
                pattern: /^---\n[\s\S]*?\n---/,
                message: 'Template missing required YAML frontmatter',
                severity: 'error'
            },
            {
                name: 'title-section',
                description: 'Template should have a title section',
                pattern: /^#\s+.+/m,
                message: 'Template missing title section (# Title)',
                severity: 'warning'
            },
            {
                name: 'no-broken-variables',
                description: 'Template variables should be properly formatted',
                pattern: /\{\{[^}]*\}\}/g,
                message: 'Template contains malformed variable references',
                severity: 'error'
            },
            {
                name: 'reasonable-length',
                description: 'Template should not be excessively long',
                pattern: /^.{1,10000}$/m,
                message: 'Template exceeds recommended maximum length',
                severity: 'warning'
            }
        ];
    }

    private applyValidationRule(content: string, rule: ValidationRule): { failed: boolean; message: string } {
        if (!rule.pattern.test(content)) {
            return {
                failed: true,
                message: rule.message
            };
        }
        return { failed: false, message: '' };
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private async getAllTemplates(): Promise<string[]> {
        try {
            const entries = await fs.readdir(this.templatePath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
                .map(entry => join(this.templatePath, entry.name));
        } catch (error) {
            console.warn(`Could not read template directory ${this.templatePath}:`, error.message);
            return [];
        }
    }

    private hasValidFrontmatter(content: string): boolean {
        return /^---\n[\s\S]*?\n---/.test(content);
    }

    private findMissingSections(content: string, metadata: TemplateMetadata): string[] {
        const recommendedSections = ['## Description', '## Usage', '## Examples'];
        const missing: string[] = [];

        recommendedSections.forEach(section => {
            if (!content.includes(section)) {
                missing.push(section);
            }
        });

        return missing;
    }

    private validateVariables(content: string, metadata: TemplateMetadata): { errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for undefined variables
        const variables = this.extractVariables(content);
        const definedVariables = new Set(metadata.variables.map(v => v.name));

        variables.forEach(variable => {
            if (!definedVariables.has(variable.name)) {
                warnings.push(`Variable {{${variable.name}}} used but not defined in metadata`);
            }
        });

        // Check for required variables without defaults
        metadata.variables
            .filter(v => v.required && !v.defaultValue)
            .forEach(variable => {
                if (!content.includes(`{{${variable.name}}}`)) {
                    errors.push(`Required variable {{${variable.name}}} is not used in template`);
                }
            });

        return { errors, warnings };
    }

    private validateStructure(content: string, metadata: TemplateMetadata): { errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic structure validation
        if (!content.includes('#')) {
            warnings.push('Template has no heading structure');
        }

        if (content.length > 50000) {
            warnings.push('Template is very long, consider breaking into smaller templates');
        }

        if (content.split('\n').length < 3) {
            errors.push('Template is too short to be useful');
        }

        return { errors, warnings };
    }

    private getDefaultValidation(): TemplateValidation {
        return {
            required: ['name', 'description'],
            forbidden: ['TODO', 'FIXME'],
            patterns: {
                title: '^#\\s+.+$',
                variable: '\\{\\{[^}]+\\}\\}'
            },
            customRules: []
        };
    }

    // ============================================================================
    // ANALYTICS AND MONITORING
    // ============================================================================

    private initializeAnalytics(): TemplateAnalytics {
        return {
            usageFrequency: {},
            errorPatterns: {},
            variableUsage: {},
            performanceMetrics: {
                totalTemplates: 0,
                validTemplates: 0,
                invalidTemplates: 0,
                averageComplexity: 0,
                mostUsedVariables: [],
                validationTime: 0
            }
        };
    }

    private updateTemplateAnalytics(templatePath: string, result: ValidationResult): void {
        const templateName = templatePath.split('/').pop()?.replace('.md', '') || 'unknown';

        // Update usage frequency
        this.analytics.usageFrequency[templateName] = (this.analytics.usageFrequency[templateName] || 0) + 1;

        // Update error patterns
        result.errors.forEach(error => {
            const errorType = error.split(':')[0] || 'unknown';
            this.analytics.errorPatterns[errorType] = (this.analytics.errorPatterns[errorType] || 0) + 1;
        });
    }

    private updateAnalytics(result: ValidationResult, validationTime: number): void {
        this.analytics.performanceMetrics.totalTemplates = result.summary.filesChecked;
        this.analytics.performanceMetrics.validTemplates = result.summary.filesChecked - result.summary.errorsFound;
        this.analytics.performanceMetrics.invalidTemplates = result.summary.errorsFound;
        this.analytics.performanceMetrics.validationTime = validationTime;
        this.analytics.performanceMetrics.averageComplexity = this.calculateAverageComplexity(result);
    }

    private calculateAverageComplexity(result: ValidationResult): number {
        // Simple complexity calculation based on warnings and errors
        const totalIssues = result.summary.errorsFound + result.summary.warningsFound;
        const totalFiles = result.summary.filesChecked;
        return totalFiles > 0 ? totalIssues / totalFiles : 0;
    }

    // ============================================================================
    // WIZARD AND GENERATION
    // ============================================================================

    async createTemplateWizard(): Promise<TemplateMetadata> {
        console.log('🧙‍♂️ Template Creation Wizard');
        console.log('=============================\n');

        const metadata: TemplateMetadata = {
            name: await this.prompt('Template name: '),
            version: await this.prompt('Version (default: 1.0.0): ') || '1.0.0',
            description: await this.prompt('Description: '),
            author: await this.prompt('Author (optional): '),
            tags: (await this.prompt('Tags (comma-separated): ')).split(',').map(t => t.trim()).filter(Boolean),
            variables: [],
            validation: this.getDefaultValidation()
        };

        // Add variables interactively
        console.log('\n📝 Add template variables (press Enter to finish):');
        while (true) {
            const varName = await this.prompt('Variable name: ');
            if (!varName) break;

            const varType = await this.prompt('Type (string/number/boolean/date): ') || 'string';
            const required = (await this.prompt('Required? (y/n): ')).toLowerCase() === 'y';
            const description = await this.prompt('Description: ');

            metadata.variables.push({
                name: varName,
                type: varType as any,
                required,
                description
            });
        }

        return metadata;
    }

    private async prompt(question: string): Promise<string> {
        // In a real implementation, this would use a proper CLI prompt library
        process.stdout.write(question);
        return new Promise(resolve => {
            process.stdin.once('data', data => {
                resolve(data.toString().trim());
            });
        });
    }

    async generateTemplateFile(metadata: TemplateMetadata, outputPath: string): Promise<void> {
        const content = this.generateTemplateContent(metadata);
        await fs.writeFile(outputPath, content, 'utf-8');
        console.log(`✅ Template created: ${outputPath}`);
    }

    private generateTemplateContent(metadata: TemplateMetadata): string {
        const variables = metadata.variables.map(v =>
            `{{${v.name}${v.required ? '' : '?'}}}`
        ).join('\n');

        const frontmatter = [
            '---',
            `name: ${metadata.name}`,
            `version: ${metadata.version}`,
            `description: ${metadata.description}`,
            metadata.author ? `author: ${metadata.author}` : '',
            metadata.tags.length > 0 ? `tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]` : '',
            '---'
        ].filter(Boolean).join('\n');

        return [
            frontmatter,
            '',
            `# ${metadata.name}`,
            '',
            metadata.description,
            '',
            '## Usage',
            '',
            variables || 'No variables defined.',
            '',
            '## Examples',
            '',
            '```markdown',
            `<!-- Example usage of ${metadata.name} -->`,
            '```'
        ].filter(Boolean).join('\n');
    }

    // ============================================================================
    // REPORTING
    // ============================================================================

    getAnalytics(): TemplateAnalytics {
        return { ...this.analytics };
    }

    generateValidationReport(result: ValidationResult): string {
        return [
            '# 📋 Template Validation Report',
            '',
            `Generated: ${new Date().toISOString()}`,
            '',
            '## 📊 Summary',
            `- Files Checked: ${result.summary.filesChecked}`,
            `- Errors Found: ${result.summary.errorsFound}`,
            `- Warnings Found: ${result.summary.warningsFound}`,
            `- Overall Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`,
            '',
            '## ❌ Errors',
            ...result.errors.map(error => `- ${error}`),
            '',
            '## ⚠️ Warnings',
            ...result.warnings.map(warning => `- ${warning}`),
            '',
            '## 📈 Analytics',
            `- Total Templates: ${this.analytics.performanceMetrics.totalTemplates}`,
            `- Valid Templates: ${this.analytics.performanceMetrics.validTemplates}`,
            `- Invalid Templates: ${this.analytics.performanceMetrics.invalidTemplates}`,
            `- Validation Time: ${this.analytics.performanceMetrics.validationTime}ms`,
            `- Average Complexity: ${this.analytics.performanceMetrics.averageComplexity.toFixed(2)}`
        ].filter(Boolean).join('\n');
    }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

export async function main() {
    const validator = new TemplateValidator();

    const command = process.argv[2];

    try {
        switch (command) {
            case 'validate':
                const result = await validator.validateAll();
                console.log(validator.generateValidationReport(result));
                break;

            case 'wizard':
                const metadata = await validator.createTemplateWizard();
                const outputPath = process.argv[3] || `${metadata.name}.md`;
                await validator.generateTemplateFile(metadata, outputPath);
                break;

            case 'analytics':
                const analytics = validator.getAnalytics();
                console.log('📊 Template Analytics:');
                console.log(JSON.stringify(analytics, null, 2));
                break;

            default:
                console.log(`
📋 Template Validator CLI

Usage: bun template-validator.ts <command>

Commands:
  validate   Validate all templates
  wizard     Create new template wizard
  analytics  Show template analytics

Examples:
  bun template-validator.ts validate
  bun template-validator.ts wizard my-template.md
  bun template-validator.ts analytics
                `);
        }
    } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
    }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
    main();
}
