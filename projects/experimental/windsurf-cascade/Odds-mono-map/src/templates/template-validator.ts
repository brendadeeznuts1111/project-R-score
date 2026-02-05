/**
 * Template System Validator
 * Validates template integrity and resolves common issues
 * 
 * @fileoverview Template validation and error resolution
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import {
    BaseTemplate,
    TemplateContext,
    TemplateResult,
    TemplateValidationResult,
    TemplateValidationError
} from './template-types.js';
import { logger } from '../core/error-handler.js';

// ============================================================================
// TEMPLATE VALIDATOR CLASS
// ============================================================================

export class TemplateValidator {
    private static instance: TemplateValidator;

    static getInstance(): TemplateValidator {
        if (!TemplateValidator.instance) {
            TemplateValidator.instance = new TemplateValidator();
        }
        return TemplateValidator.instance;
    }

    /**
     * Validate template structure and configuration
     */
    validateTemplate(template: BaseTemplate): TemplateValidationResult {
        const errors: TemplateValidationError[] = [];
        const warnings: TemplateValidationError[] = [];
        const info: TemplateValidationError[] = [];

        // Basic structure validation
        if (!template.name || template.name.trim() === '') {
            errors.push({
                field: 'name',
                message: 'Template name is required',
                severity: 'error'
            });
        }

        if (!template.description || template.description.trim() === '') {
            warnings.push({
                field: 'description',
                message: 'Template description is recommended',
                severity: 'warning'
            });
        }

        if (!template.version || !this.isValidVersion(template.version)) {
            errors.push({
                field: 'version',
                message: 'Template version must be in semantic version format (x.y.z)',
                severity: 'error'
            });
        }

        if (!template.author || template.author.trim() === '') {
            warnings.push({
                field: 'author',
                message: 'Template author is recommended',
                severity: 'warning'
            });
        }

        if (!template.category || template.category.trim() === '') {
            errors.push({
                field: 'category',
                message: 'Template category is required',
                severity: 'error'
            });
        }

        if (!Array.isArray(template.tags)) {
            warnings.push({
                field: 'tags',
                message: 'Template tags should be an array',
                severity: 'warning'
            });
        }

        // Method validation
        if (typeof template.render !== 'function') {
            errors.push({
                field: 'render',
                message: 'Template must implement render method',
                severity: 'error'
            });
        }

        if (typeof template.validate !== 'function') {
            errors.push({
                field: 'validate',
                message: 'Template must implement validate method',
                severity: 'error'
            });
        }

        // Test render with mock context
        try {
            const mockContext = this.createMockContext();
            const renderResult = template.render(mockContext);

            if (!renderResult || typeof renderResult !== 'object') {
                errors.push({
                    field: 'render',
                    message: 'Render method must return a TemplateResult object',
                    severity: 'error'
                });
            } else {
                if (typeof renderResult.content !== 'string') {
                    errors.push({
                        field: 'render.content',
                        message: 'Render result content must be a string',
                        severity: 'error'
                    });
                }

                if (typeof renderResult.success !== 'boolean') {
                    errors.push({
                        field: 'render.success',
                        message: 'Render result success must be a boolean',
                        severity: 'error'
                    });
                }

                if (!Array.isArray(renderResult.errors)) {
                    errors.push({
                        field: 'render.errors',
                        message: 'Render result errors must be an array',
                        severity: 'error'
                    });
                }
            }
        } catch (error) {
            errors.push({
                field: 'render',
                message: `Render method failed: ${(error as Error).message}`,
                severity: 'error'
            });
        }

        // Test validate with mock context
        try {
            const mockContext = this.createMockContext();
            const validationResult = template.validate(mockContext);

            if (typeof validationResult !== 'boolean') {
                errors.push({
                    field: 'validate',
                    message: 'Validate method must return a boolean',
                    severity: 'error'
                });
            }
        } catch (error) {
            errors.push({
                field: 'validate',
                message: `Validate method failed: ${(error as Error).message}`,
                severity: 'error'
            });
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            errors,
            warnings,
            info
        };
    }

    /**
     * Validate template context
     */
    validateContext(context: TemplateContext): TemplateValidationResult {
        const errors: TemplateValidationError[] = [];
        const warnings: TemplateValidationError[] = [];
        const info: TemplateValidationError[] = [];

        // File context validation
        if (!context.file) {
            errors.push({
                field: 'file',
                message: 'File context is required',
                severity: 'error'
            });
        } else {
            if (!context.file.name || context.file.name.trim() === '') {
                errors.push({
                    field: 'file.name',
                    message: 'File name is required',
                    severity: 'error'
                });
            }

            if (!context.file.path || context.file.path.trim() === '') {
                warnings.push({
                    field: 'file.path',
                    message: 'File path is recommended',
                    severity: 'warning'
                });
            }
        }

        // Vault context validation
        if (!context.vault) {
            errors.push({
                field: 'vault',
                message: 'Vault context is required',
                severity: 'error'
            });
        } else {
            if (!context.vault.name || context.vault.name.trim() === '') {
                errors.push({
                    field: 'vault.name',
                    message: 'Vault name is required',
                    severity: 'error'
                });
            }
        }

        // User context validation
        if (!context.user) {
            errors.push({
                field: 'user',
                message: 'User context is required',
                severity: 'error'
            });
        } else {
            if (!context.user.name || context.user.name.trim() === '') {
                warnings.push({
                    field: 'user.name',
                    message: 'User name is recommended',
                    severity: 'warning'
                });
            }
        }

        // Date context validation
        if (!context.date) {
            errors.push({
                field: 'date',
                message: 'Date context is required',
                severity: 'error'
            });
        } else {
            if (!(context.date.now instanceof Date)) {
                errors.push({
                    field: 'date.now',
                    message: 'Date.now must be a Date object',
                    severity: 'error'
                });
            }

            if (typeof context.date.today !== 'string') {
                errors.push({
                    field: 'date.today',
                    message: 'Date.today must be a string',
                    severity: 'error'
                });
            }
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            errors,
            warnings,
            info
        };
    }

    /**
     * Validate template result
     */
    validateResult(result: TemplateResult): TemplateValidationResult {
        const errors: TemplateValidationError[] = [];
        const warnings: TemplateValidationError[] = [];
        const info: TemplateValidationError[] = [];

        if (typeof result.content !== 'string') {
            errors.push({
                field: 'content',
                message: 'Result content must be a string',
                severity: 'error'
            });
        }

        if (typeof result.success !== 'boolean') {
            errors.push({
                field: 'success',
                message: 'Result success must be a boolean',
                severity: 'error'
            });
        }

        if (!Array.isArray(result.errors)) {
            errors.push({
                field: 'errors',
                message: 'Result errors must be an array',
                severity: 'error'
            });
        }

        if (!result.metadata || typeof result.metadata !== 'object') {
            warnings.push({
                field: 'metadata',
                message: 'Result metadata is recommended',
                severity: 'warning'
            });
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            errors,
            warnings,
            info
        };
    }

    /**
     * Auto-fix common template issues
     */
    autoFixTemplate(template: BaseTemplate): BaseTemplate {
        // This would return a fixed version of the template
        // For now, we'll just log the issues that need fixing
        const validation = this.validateTemplate(template);

        if (!validation.isValid) {
            logger.logWarning(`Template ${template.name} has issues that need fixing:`, {
                errors: validation.errors,
                warnings: validation.warnings
            });
        }

        return template;
    }

    /**
     * Create mock context for testing
     */
    private createMockContext(): TemplateContext {
        return {
            file: {
                name: 'test-file.md',
                path: '/test/test-file.md',
                frontmatter: {},
                content: 'Test content'
            },
            vault: {
                name: 'Test Vault',
                path: '/test',
                config: {}
            },
            user: {
                name: 'Test User',
                email: 'test@example.com',
                role: 'developer'
            },
            date: {
                now: new Date(),
                today: new Date().toISOString().split('T')[0],
                tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            metadata: {}
        };
    }

    /**
     * Validate semantic version format
     */
    private isValidVersion(version: string): boolean {
        const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9\-\.]+)?(\+[a-zA-Z0-9\-\.]+)?$/;
        return semverRegex.test(version);
    }

    /**
     * Get validation summary
     */
    getValidationSummary(results: TemplateValidationResult[]): string {
        const totalTemplates = results.length;
        const validTemplates = results.filter(r => r.isValid).length;
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

        return `Template Validation Summary:
- Total Templates: ${totalTemplates}
- Valid Templates: ${validTemplates} (${Math.round(validTemplates / totalTemplates * 100)}%)
- Total Errors: ${totalErrors}
- Total Warnings: ${totalWarnings}`;
    }
}

// ============================================================================
// TEMPLATE VALIDATION UTILITIES
// ============================================================================

export class TemplateValidationUtils {
    /**
     * Validate all templates in a registry
     */
    static async validateRegistry(templates: BaseTemplate[]): Promise<TemplateValidationResult[]> {
        const validator = TemplateValidator.getInstance();
        const results: TemplateValidationResult[] = [];

        for (const template of templates) {
            const result = validator.validateTemplate(template);
            results.push(result);
        }

        return results;
    }

    /**
     * Find templates with critical errors
     */
    static findCriticalErrors(results: TemplateValidationResult[]): TemplateValidationResult[] {
        return results.filter(result => !result.isValid && result.errors.length > 0);
    }

    /**
     * Generate validation report
     */
    static generateReport(results: TemplateValidationResult[]): string {
        const validator = TemplateValidator.getInstance();
        const summary = validator.getValidationSummary(results);
        const criticalErrors = this.findCriticalErrors(results);

        let report = `${summary}\n\n`;

        if (criticalErrors.length > 0) {
            report += 'Critical Errors:\n';
            criticalErrors.forEach((result, index) => {
                report += `${index + 1}. Template has ${result.errors.length} errors:\n`;
                result.errors.forEach(error => {
                    report += `   - ${error.field}: ${error.message}\n`;
                });
            });
        }

        return report;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const templateValidator = TemplateValidator.getInstance();

export default TemplateValidator;
