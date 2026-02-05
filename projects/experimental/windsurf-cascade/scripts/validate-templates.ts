#!/usr/bin/env bun
/**
 * Template System Validation Script
 * 
 * Validates all templates in the Odds-mono-map vault for compliance with
 * enhanced template standards, type safety, and structural requirements.
 * 
 * @author Odds Protocol Development Team
 * @version 2.0.0
 * @since 2025-11-18
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { execSync } from 'child_process';

// Types for template validation
interface TemplateValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: ValidationSuggestion[];
    metrics: TemplateMetrics;
}

interface ValidationError {
    id: string;
    message: string;
    field?: string;
    line?: number;
    severity: 'error' | 'warning' | 'info';
    rule: string;
}

interface ValidationWarning {
    id: string;
    message: string;
    field?: string;
    line?: number;
    rule: string;
}

interface ValidationSuggestion {
    id: string;
    message: string;
    action: string;
    field?: string;
    rule: string;
}

interface TemplateMetrics {
    totalTemplates: number;
    validTemplates: number;
    invalidTemplates: number;
    averageProcessingTime: number;
    mostUsedTemplate: string;
    lastValidation: Date;
    complianceScore: number;
    categoryDistribution: Record<string, number>;
    variableComplexity: number;
}

interface TemplateData {
    path: string;
    content: string;
    frontmatter: Record<string, any>;
    variables: string[];
    sections: string[];
    metadata: TemplateMetadata;
}

interface TemplateMetadata {
    size: number;
    lines: number;
    complexity: number;
    variableCount: number;
    sectionCount: number;
    hasFrontmatter: boolean;
    templateVersion?: string;
}

class TemplateSystemValidator {
    private vaultPath: string;
    private templatePath: string;
    private results: Map<string, TemplateValidationResult> = new Map();
    private rules: ValidationRule[] = [];

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.templatePath = join(vaultPath, '06 - Templates');
        this.initializeRules();
    }

    private initializeRules() {
        this.rules = [
            new FrontmatterValidationRule(),
            new VariableValidationRule(),
            new StructureValidationRule(),
            new MetadataValidationRule(),
            new ComplianceValidationRule(),
            new PerformanceValidationRule(),
            new TypeSafetyValidationRule(),
            new ContentValidationRule(),
            new NamingConventionRule(),
            new DocumentationRule(),
            new IntegrationRule()
        ];
    }

    async validateAllTemplates(): Promise<TemplateValidationResult> {
        console.log('🔍 Starting comprehensive template validation...');

        const startTime = Date.now();
        const templateFiles = this.findTemplateFiles();

        console.log(`📁 Found ${templateFiles.length} template files`);

        let totalValid = 0;
        let totalInvalid = 0;
        let totalProcessingTime = 0;
        const categoryDistribution: Record<string, number> = {};

        for (const filePath of templateFiles) {
            const result = await this.validateTemplate(filePath);
            this.results.set(filePath, result);

            if (result.valid) {
                totalValid++;
            } else {
                totalInvalid++;
            }

            totalProcessingTime += result.metrics.averageProcessingTime;

            // Track category distribution
            const category = this.extractCategory(filePath);
            categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
        }

        const overallMetrics: TemplateMetrics = {
            totalTemplates: templateFiles.length,
            validTemplates: totalValid,
            invalidTemplates: totalInvalid,
            averageProcessingTime: totalProcessingTime / templateFiles.length,
            mostUsedTemplate: this.findMostUsedTemplate(),
            lastValidation: new Date(),
            complianceScore: (totalValid / templateFiles.length) * 100,
            categoryDistribution,
            variableComplexity: this.calculateVariableComplexity()
        };

        const overallResult: TemplateValidationResult = {
            valid: totalInvalid === 0,
            errors: this.aggregateErrors(),
            warnings: this.aggregateWarnings(),
            suggestions: this.aggregateSuggestions(),
            metrics: overallMetrics
        };

        console.log(`✅ Validation completed in ${Date.now() - startTime}ms`);
        return overallResult;
    }

    private findTemplateFiles(): string[] {
        const templateFiles: string[] = [];

        if (!existsSync(this.templatePath)) {
            console.warn(`⚠️ Template directory not found: ${this.templatePath}`);
            return templateFiles;
        }

        const scanDirectory = (dir: string) => {
            const items = readdirSync(dir);

            for (const item of items) {
                const fullPath = join(dir, item);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (extname(item) === '.md') {
                    templateFiles.push(fullPath);
                }
            }
        };

        scanDirectory(this.templatePath);
        return templateFiles;
    }

    private async validateTemplate(filePath: string): Promise<TemplateValidationResult> {
        const startTime = Date.now();

        try {
            const content = readFileSync(filePath, 'utf-8');
            const templateData = this.parseTemplate(filePath, content);

            const result: TemplateValidationResult = {
                valid: true,
                errors: [],
                warnings: [],
                suggestions: [],
                metrics: {
                    totalTemplates: 1,
                    validTemplates: 0,
                    invalidTemplates: 0,
                    averageProcessingTime: 0,
                    mostUsedTemplate: '',
                    lastValidation: new Date(),
                    complianceScore: 0,
                    categoryDistribution: {},
                    variableComplexity: 0
                }
            };

            // Apply all validation rules
            for (const rule of this.rules) {
                const ruleResult = await rule.validate(templateData);

                result.errors.push(...ruleResult.errors);
                result.warnings.push(...ruleResult.warnings);
                result.suggestions.push(...ruleResult.suggestions);

                if (ruleResult.errors.length > 0) {
                    result.valid = false;
                }
            }

            // Calculate metrics
            result.metrics.averageProcessingTime = Date.now() - startTime;
            result.metrics.complianceScore = this.calculateComplianceScore(result);
            result.metrics.variableComplexity = templateData.metadata.complexity;

            if (result.valid) {
                result.metrics.validTemplates = 1;
            } else {
                result.metrics.invalidTemplates = 1;
            }

            return result;

        } catch (error) {
            return {
                valid: false,
                errors: [{
                    id: 'parse-error',
                    message: `Failed to parse template: ${error}`,
                    severity: 'error',
                    rule: 'parser'
                }],
                warnings: [],
                suggestions: [],
                metrics: {
                    totalTemplates: 1,
                    validTemplates: 0,
                    invalidTemplates: 1,
                    averageProcessingTime: Date.now() - startTime,
                    mostUsedTemplate: '',
                    lastValidation: new Date(),
                    complianceScore: 0,
                    categoryDistribution: {},
                    variableComplexity: 0
                }
            };
        }
    }

    private parseTemplate(filePath: string, content: string): TemplateData {
        const lines = content.split('\n');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        const templateData: TemplateData = {
            path: filePath,
            content: content,
            frontmatter: {},
            variables: [],
            sections: [],
            metadata: {
                size: content.length,
                lines: lines.length,
                complexity: 0,
                variableCount: 0,
                sectionCount: 0,
                hasFrontmatter: false
            }
        };

        if (frontmatterMatch) {
            templateData.metadata.hasFrontmatter = true;
            const frontmatter = frontmatterMatch[1];

            // Parse YAML frontmatter
            frontmatter.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                    templateData.frontmatter[key] = value;
                }
            });

            templateData.content = content.substring(frontmatterMatch[0].length).trim();
        }

        // Extract variables
        const variableMatches = content.match(/\{\{([^}]+)\}\}/g);
        if (variableMatches) {
            templateData.variables = [...new Set(variableMatches)];
            templateData.metadata.variableCount = templateData.variables.length;
        }

        // Extract sections
        const sectionMatches = content.match(/^#{1,6}\s+(.+)$/gm);
        if (sectionMatches) {
            templateData.sections = sectionMatches.map(match =>
                match.replace(/^#{1,6}\s+/, '')
            );
            templateData.metadata.sectionCount = templateData.sections.length;
        }

        // Calculate complexity
        templateData.metadata.complexity = this.calculateComplexity(templateData);

        return templateData;
    }

    private calculateComplexity(template: TemplateData): number {
        let complexity = 0;

        // Base complexity from variables
        complexity += template.metadata.variableCount * 2;

        // Complexity from sections
        complexity += template.metadata.sectionCount * 1.5;

        // Complexity from conditional logic
        const conditionals = template.content.match(/\{\{#.*?\}\}/g) || [];
        complexity += conditionals.length * 3;

        // Complexity from loops
        const loops = template.content.match(/\{\{>.*?\}\}/g) || [];
        complexity += loops.length * 2.5;

        // Complexity from frontmatter fields
        complexity += Object.keys(template.frontmatter).length * 0.5;

        return Math.round(complexity);
    }

    private calculateComplianceScore(result: TemplateValidationResult): number {
        const errorPenalty = result.errors.length * 10;
        const warningPenalty = result.warnings.length * 2;
        const suggestionBonus = Math.min(result.suggestions.length * 0.5, 10);

        return Math.max(0, Math.min(100, 100 - errorPenalty - warningPenalty + suggestionBonus));
    }

    private extractCategory(filePath: string): string {
        const parts = filePath.split('/');
        for (const part of parts) {
            if (part.includes('Templates')) {
                const categoryIndex = parts.indexOf(part) + 1;
                return parts[categoryIndex] || 'unknown';
            }
        }
        return 'unknown';
    }

    private findMostUsedTemplate(): string {
        // This would be based on actual usage data in a real implementation
        return 'Daily Note Template';
    }

    private calculateVariableComplexity(): number {
        let totalComplexity = 0;
        let templateCount = 0;

        for (const [, result] of this.results) {
            totalComplexity += result.metrics.variableComplexity;
            templateCount++;
        }

        return templateCount > 0 ? totalComplexity / templateCount : 0;
    }

    private aggregateErrors(): ValidationError[] {
        const errors: ValidationError[] = [];
        for (const [, result] of this.results) {
            errors.push(...result.errors);
        }
        return errors;
    }

    private aggregateWarnings(): ValidationWarning[] {
        const warnings: ValidationWarning[] = [];
        for (const [, result] of this.results) {
            warnings.push(...result.warnings);
        }
        return warnings;
    }

    private aggregateSuggestions(): ValidationSuggestion[] {
        const suggestions: ValidationSuggestion[] = [];
        for (const [, result] of this.results) {
            suggestions.push(...result.suggestions);
        }
        return suggestions;
    }

    generateReport(result: TemplateValidationResult): string {
        const report = `
# 📊 Template System Validation Report

## 📈 Executive Summary
- **Total Templates**: ${result.metrics.totalTemplates}
- **Valid Templates**: ${result.metrics.validTemplates} ✅
- **Invalid Templates**: ${result.metrics.invalidTemplates} ❌
- **Compliance Score**: ${result.metrics.complianceScore.toFixed(1)}%
- **Average Processing Time**: ${result.metrics.averageProcessingTime.toFixed(1)}ms
- **Validation Date**: ${result.metrics.lastValidation.toLocaleString()}

## 🎯 Compliance Status
${result.metrics.complianceScore >= 90 ? '🟢 Excellent' :
                result.metrics.complianceScore >= 75 ? '🟡 Good' :
                    result.metrics.complianceScore >= 60 ? '🟠 Fair' : '🔴 Poor'}

## 📋 Category Distribution
${Object.entries(result.metrics.categoryDistribution)
                .map(([category, count]) => `- **${category}**: ${count} templates`)
                .join('\n')}

## ❌ Errors (${result.errors.length})
${result.errors.slice(0, 10).map(error =>
                    `- **${error.rule}**: ${error.message} ${error.field ? `(${error.field})` : ''}`
                ).join('\n')}

${result.errors.length > 10 ? `... and ${result.errors.length - 10} more errors` : ''}

## ⚠️ Warnings (${result.warnings.length})
${result.warnings.slice(0, 10).map(warning =>
                    `- **${warning.rule}**: ${warning.message} ${warning.field ? `(${warning.field})` : ''}`
                ).join('\n')}

${result.warnings.length > 10 ? `... and ${result.warnings.length - 10} more warnings` : ''}

## 💡 Suggestions (${result.suggestions.length})
${result.suggestions.slice(0, 10).map(suggestion =>
                    `- **${suggestion.rule}**: ${suggestion.message}`
                ).join('\n')}

${result.suggestions.length > 10 ? `... and ${result.suggestions.length - 10} more suggestions` : ''}

## 🔧 Recommended Actions
1. Fix all critical errors before deploying templates
2. Review warnings for potential improvements
3. Implement suggestions to enhance template quality
4. Set up automated validation in CI/CD pipeline
5. Monitor template performance metrics

---
*Report generated by Template System Validator v2.0.0*
        `.trim();

        return report;
    }

    async fixTemplateIssues(autoFix: boolean = false): Promise<number> {
        let fixedCount = 0;

        for (const [filePath, result] of this.results) {
            if (!result.valid && autoFix) {
                const fixes = this.getAutoFixes(result);
                if (fixes.length > 0) {
                    await this.applyFixes(filePath, fixes);
                    fixedCount++;
                }
            }
        }

        return fixedCount;
    }

    private getAutoFixes(result: TemplateValidationResult): string[] {
        const fixes: string[] = [];

        for (const error of result.errors) {
            switch (error.rule) {
                case 'frontmatter':
                    if (error.field === 'type') {
                        fixes.push('add-type-field');
                    }
                    break;
                case 'structure':
                    if (error.field === 'sections') {
                        fixes.push('add-sections');
                    }
                    break;
            }
        }

        return fixes;
    }

    private async applyFixes(filePath: string, fixes: string[]): Promise<void> {
        let content = readFileSync(filePath, 'utf-8');

        for (const fix of fixes) {
            switch (fix) {
                case 'add-type-field':
                    if (!content.includes('type:')) {
                        content = content.replace('---\n', '---\ntype: template\n');
                    }
                    break;
                case 'add-sections':
                    if (!content.match(/^#{1,6}\s+/m)) {
                        content += '\n\n## Main Section\n\nAdd your content here.';
                    }
                    break;
            }
        }

        writeFileSync(filePath, content);
    }
}

// Validation Rule Base Class
abstract class ValidationRule {
    abstract name: string;
    abstract description: string;

    abstract validate(template: TemplateData): Promise<{
        errors: ValidationError[];
        warnings: ValidationWarning[];
        suggestions: ValidationSuggestion[];
    }>;
}

// Frontmatter Validation Rule
class FrontmatterValidationRule extends ValidationRule {
    name = 'frontmatter';
    description = 'Validates YAML frontmatter structure and required fields';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        if (!template.metadata.hasFrontmatter) {
            result.errors.push({
                id: 'missing-frontmatter',
                message: 'Template missing YAML frontmatter',
                severity: 'error',
                rule: this.name
            });
            return result;
        }

        // Check required fields
        const requiredFields = ['type', 'title', 'created', 'updated'];
        for (const field of requiredFields) {
            if (!template.frontmatter[field]) {
                result.errors.push({
                    id: `missing-${field}`,
                    message: `Missing required field: ${field}`,
                    field: `frontmatter.${field}`,
                    severity: 'error',
                    rule: this.name
                });
            }
        }

        // Check recommended fields
        const recommendedFields = ['tags', 'author', 'template_version'];
        for (const field of recommendedFields) {
            if (!template.frontmatter[field]) {
                result.warnings.push({
                    id: `missing-${field}`,
                    message: `Consider adding field: ${field}`,
                    field: `frontmatter.${field}`,
                    rule: this.name
                });
            }
        }

        return result;
    }
}

// Variable Validation Rule
class VariableValidationRule extends ValidationRule {
    name = 'variables';
    description = 'Validates template variables and their usage';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        for (const variable of template.variables) {
            // Check for undefined variables
            if (variable.includes('undefined')) {
                result.warnings.push({
                    id: 'undefined-variable',
                    message: `Variable contains undefined: ${variable}`,
                    field: 'variables',
                    rule: this.name
                });
            }

            // Check for malformed variables
            if (!variable.match(/^\{\{[^}]+\}\}$/)) {
                result.errors.push({
                    id: 'malformed-variable',
                    message: `Malformed variable syntax: ${variable}`,
                    field: 'variables',
                    severity: 'error',
                    rule: this.name
                });
            }
        }

        // Suggest variable documentation
        if (template.variables.length > 5 && !template.content.includes('## Variables')) {
            result.suggestions.push({
                id: 'document-variables',
                message: 'Consider adding a Variables section to document template variables',
                action: 'Add ## Variables section with variable descriptions',
                rule: this.name
            });
        }

        return result;
    }
}

// Structure Validation Rule
class StructureValidationRule extends ValidationRule {
    name = 'structure';
    description = 'Validates template structure and organization';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check for empty content
        if (!template.content || template.content.trim().length === 0) {
            result.errors.push({
                id: 'empty-content',
                message: 'Template has no content',
                severity: 'error',
                rule: this.name
            });
        }

        // Check for sections
        if (template.sections.length === 0) {
            result.suggestions.push({
                id: 'add-sections',
                message: 'Consider adding sections to improve template structure',
                action: 'Add markdown headers to organize content',
                rule: this.name
            });
        }

        // Check heading hierarchy
        const headings = template.content.match(/^#{1,6}\s+(.+)$/gm) || [];
        let lastLevel = 0;

        for (const heading of headings) {
            const level = heading.match(/^#+/)?.[0].length || 0;
            if (level > lastLevel + 1) {
                result.warnings.push({
                    id: 'heading-hierarchy',
                    message: `Heading level jump detected: from H${lastLevel} to H${level}`,
                    rule: this.name
                });
            }
            lastLevel = level;
        }

        return result;
    }
}

// Metadata Validation Rule
class MetadataValidationRule extends ValidationRule {
    name = 'metadata';
    description = 'Validates template metadata and compliance';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check template version
        if (!template.frontmatter.template_version) {
            result.warnings.push({
                id: 'missing-version',
                message: 'Template missing version information',
                field: 'frontmatter.template_version',
                rule: this.name
            });
        }

        // Check validation rules
        if (!template.frontmatter.validation_rules) {
            result.suggestions.push({
                id: 'add-validation-rules',
                message: 'Consider adding validation_rules to specify template requirements',
                action: 'Add validation_rules array to frontmatter',
                rule: this.name
            });
        }

        return result;
    }
}

// Compliance Validation Rule
class ComplianceValidationRule extends ValidationRule {
    name = 'compliance';
    description = 'Validates template compliance with Odds Protocol standards';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check for Odds Protocol compliance
        if (!template.content.includes('Odds Protocol')) {
            result.suggestions.push({
                id: 'odds-compliance',
                message: 'Consider adding Odds Protocol reference for compliance',
                action: 'Add Odds Protocol standards reference',
                rule: this.name
            });
        }

        // Check template metadata at end
        if (!template.content.includes('Template Metadata')) {
            result.suggestions.push({
                id: 'template-metadata',
                message: 'Consider adding Template Metadata section at the end',
                action: 'Add ## Template Metadata section',
                rule: this.name
            });
        }

        return result;
    }
}

// Performance Validation Rule
class PerformanceValidationRule extends ValidationRule {
    name = 'performance';
    description = 'Validates template performance and complexity';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check template size
        if (template.metadata.size > 50000) {
            result.warnings.push({
                id: 'large-template',
                message: 'Template is quite large, consider splitting into smaller templates',
                rule: this.name
            });
        }

        // Check complexity
        if (template.metadata.complexity > 100) {
            result.suggestions.push({
                id: 'high-complexity',
                message: 'Template has high complexity, consider simplifying',
                action: 'Reduce variables or simplify structure',
                rule: this.name
            });
        }

        return result;
    }
}

// Type Safety Validation Rule
class TypeSafetyValidationRule extends ValidationRule {
    name = 'type-safety';
    description = 'Validates type safety in template variables';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check for type annotations in comments
        if (template.variables.length > 0 && !template.content.includes('@type')) {
            result.suggestions.push({
                id: 'type-annotations',
                message: 'Consider adding type annotations for better type safety',
                action: 'Add @type comments for variables',
                rule: this.name
            });
        }

        return result;
    }
}

// Content Validation Rule
class ContentValidationRule extends ValidationRule {
    name = 'content';
    description = 'Validates template content quality';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check for placeholder content
        if (template.content.includes('Lorem ipsum')) {
            result.warnings.push({
                id: 'placeholder-content',
                message: 'Template contains placeholder content',
                rule: this.name
            });
        }

        // Check for examples
        if (!template.content.includes('Example') && template.variables.length > 3) {
            result.suggestions.push({
                id: 'add-examples',
                message: 'Consider adding usage examples for complex templates',
                action: 'Add Example section with sample usage',
                rule: this.name
            });
        }

        return result;
    }
}

// Naming Convention Rule
class NamingConventionRule extends ValidationRule {
    name = 'naming';
    description = 'Validates template naming conventions';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        const fileName = basename(template.path, '.md');

        // Check naming convention
        if (!fileName.match(/^\d{2} - /)) {
            result.warnings.push({
                id: 'naming-convention',
                message: 'Template should follow naming convention: "## - Template Name"',
                rule: this.name
            });
        }

        return result;
    }
}

// Documentation Rule
class DocumentationRule extends ValidationRule {
    name = 'documentation';
    description = 'Validates template documentation';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check for description
        if (!template.frontmatter.description) {
            result.suggestions.push({
                id: 'add-description',
                message: 'Consider adding description to frontmatter',
                action: 'Add description field to frontmatter',
                rule: this.name
            });
        }

        return result;
    }
}

// Integration Rule
class IntegrationRule extends ValidationRule {
    name = 'integration';
    description = 'Validates template integration capabilities';

    async validate(template: TemplateData): Promise<any> {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            suggestions: [] as ValidationSuggestion[]
        };

        // Check for Dataview integration
        if (template.content.includes('```dataview') ||
            (template.frontmatter.tags && template.frontmatter.tags.includes('dashboard'))) {
            if (!template.content.includes('```dataview')) {
                result.suggestions.push({
                    id: 'dataview-integration',
                    message: 'Dashboard templates should include Dataview queries',
                    action: 'Add Dataview query blocks',
                    rule: this.name
                });
            }
        }

        return result;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args[0] || process.cwd();
    const autoFix = args.includes('--fix');
    const reportPath = args.includes('--report') ? 'template-validation-report.md' : null;

    console.log('🚀 Template System Validator v2.0.0');
    console.log(`📁 Vault Path: ${vaultPath}`);
    console.log(`🔧 Auto Fix: ${autoFix ? 'Enabled' : 'Disabled'}`);

    const validator = new TemplateSystemValidator(vaultPath);
    const result = await validator.validateAllTemplates();

    // Display results
    console.log('\n📊 Validation Results:');
    console.log(`✅ Valid Templates: ${result.metrics.validTemplates}`);
    console.log(`❌ Invalid Templates: ${result.metrics.invalidTemplates}`);
    console.log(`📈 Compliance Score: ${result.metrics.complianceScore.toFixed(1)}%`);
    console.log(`⚡ Average Processing Time: ${result.metrics.averageProcessingTime.toFixed(1)}ms`);

    if (result.errors.length > 0) {
        console.log(`\n❌ Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(error => {
            console.log(`   • ${error.message}`);
        });
    }

    if (result.warnings.length > 0) {
        console.log(`\n⚠️ Warnings: ${result.warnings.length}`);
        result.warnings.slice(0, 5).forEach(warning => {
            console.log(`   • ${warning.message}`);
        });
    }

    // Auto fix if requested
    if (autoFix) {
        console.log('\n🔧 Applying auto fixes...');
        const fixedCount = await validator.fixTemplateIssues(true);
        console.log(`✅ Fixed ${fixedCount} templates`);
    }

    // Generate report if requested
    if (reportPath) {
        console.log(`\n📄 Generating report: ${reportPath}`);
        const report = validator.generateReport(result);
        writeFileSync(reportPath, report);
        console.log('✅ Report generated successfully');
    }

    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1);
}

// Run if executed directly
if (import.meta.main) {
    main().catch(console.error);
}

export { TemplateSystemValidator, TemplateValidationResult };
