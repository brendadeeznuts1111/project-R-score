/**
 * Template Registry Implementation
 * Clean implementation with proper type safety and error handling
 * 
 * @fileoverview Template registration and management system
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import {
    BaseTemplate,
    TemplateContext,
    TemplateResult,
    TemplateRegistry as ITemplateRegistry,
    TemplateRegistryStats,
    TemplateUsageMetrics,
    TemplateEvent,
    TemplateEventHandler
} from './template-types.js';
import { templateValidator } from './template-validator.js';
import { logger } from '../core/error-handler.js';

// ============================================================================
// TEMPLATE REGISTRY IMPLEMENTATION
// ============================================================================

export class TemplateRegistry implements ITemplateRegistry {
    private static instance: TemplateRegistry;
    private templates: Map<string, BaseTemplate> = new Map();
    private usageMetrics: Map<string, TemplateUsageMetrics> = new Map();
    private eventHandlers: Map<string, TemplateEventHandler[]> = new Map();
    private stats: TemplateRegistryStats;

    private constructor() {
        this.stats = {
            totalTemplates: 0,
            categories: {},
            lastUpdated: new Date(),
            mostUsed: []
        };
    }

    static getInstance(): TemplateRegistry {
        if (!TemplateRegistry.instance) {
            TemplateRegistry.instance = new TemplateRegistry();
        }
        return TemplateRegistry.instance;
    }

    /**
     * Register a new template
     */
    register(template: BaseTemplate): void {
        try {
            // Validate template before registration
            const validation = templateValidator.validateTemplate(template);
            if (!validation.isValid) {
                const errorMessage = `Template validation failed for ${template.name}: ${validation.errors.map(e => e.message).join(', ')}`;
                logger.logError(errorMessage, { template: template.name, errors: validation.errors });
                throw new Error(errorMessage);
            }

            // Check for duplicate registration
            if (this.templates.has(template.name)) {
                logger.logWarning(`Template ${template.name} is already registered. Overwriting...`);
            }

            // Register the template
            this.templates.set(template.name, template);

            // Initialize usage metrics
            this.usageMetrics.set(template.name, {
                templateName: template.name,
                usageCount: 0,
                lastUsed: new Date(),
                averageRenderTime: 0,
                successRate: 100
            });

            // Update stats
            this.updateStats();

            // Log successful registration
            logger.logInfo(`Template registered: ${template.name}`, {
                category: template.category,
                version: template.version,
                author: template.author
            });

            // Emit registration event
            this.emitEvent({
                type: 'register',
                templateName: template.name,
                timestamp: new Date(),
                data: {
                    category: template.category,
                    version: template.version
                }
            });

        } catch (error) {
            logger.logError(`Failed to register template ${template.name}`, { error });
            throw error;
        }
    }

    /**
     * Get a template by name
     */
    get(name: string): BaseTemplate | undefined {
        const template = this.templates.get(name);

        if (template) {
            logger.logDebug(`Template retrieved: ${name}`);
        } else {
            logger.logWarning(`Template not found: ${name}`);
        }

        return template;
    }

    /**
     * Get all templates in a category
     */
    getByCategory(category: string): BaseTemplate[] {
        const categoryTemplates = Array.from(this.templates.values())
            .filter(template => template.category === category);

        logger.logDebug(`Found ${categoryTemplates.length} templates in category: ${category}`);

        return categoryTemplates;
    }

    /**
     * List all registered template names
     */
    list(): string[] {
        const templateNames = Array.from(this.templates.keys());
        logger.logDebug(`Listing ${templateNames.length} registered templates`);

        return templateNames;
    }

    /**
     * Render a template with the given context
     */
    render(templateName: string, context: TemplateContext): TemplateResult {
        const startTime = Date.now();

        try {
            // Get template
            const template = this.get(templateName);
            if (!template) {
                const error = `Template not found: ${templateName}`;
                logger.logError(error);

                this.emitEvent({
                    type: 'error',
                    templateName,
                    timestamp: new Date(),
                    data: { error }
                });

                return {
                    content: '',
                    metadata: {},
                    success: false,
                    errors: [error]
                };
            }

            // Validate context
            const contextValidation = templateValidator.validateContext(context);
            if (!contextValidation.isValid) {
                const error = `Template context validation failed: ${contextValidation.errors.map(e => e.message).join(', ')}`;
                logger.logError(error, { templateName, contextErrors: contextValidation.errors });

                this.emitEvent({
                    type: 'error',
                    templateName,
                    timestamp: new Date(),
                    data: { error, contextErrors: contextValidation.errors }
                });

                return {
                    content: '',
                    metadata: {},
                    success: false,
                    errors: [error]
                };
            }

            // Validate template
            if (!template.validate(context)) {
                const error = `Template validation failed: ${templateName}`;
                logger.logError(error);

                this.emitEvent({
                    type: 'error',
                    templateName,
                    timestamp: new Date(),
                    data: { error }
                });

                return {
                    content: '',
                    metadata: {},
                    success: false,
                    errors: [error]
                };
            }

            // Render template
            const result = template.render(context);
            const renderTime = Date.now() - startTime;

            // Validate result
            const resultValidation = templateValidator.validateResult(result);
            if (!resultValidation.isValid) {
                const error = `Template result validation failed: ${resultValidation.errors.map(e => e.message).join(', ')}`;
                logger.logError(error, { templateName, resultErrors: resultValidation.errors });

                return {
                    content: result.content,
                    metadata: result.metadata,
                    success: false,
                    errors: [error, ...result.errors]
                };
            }

            // Update usage metrics
            this.updateUsageMetrics(templateName, renderTime, result.success);

            // Emit render event
            this.emitEvent({
                type: 'render',
                templateName,
                timestamp: new Date(),
                data: {
                    renderTime,
                    success: result.success,
                    contentLength: result.content.length
                }
            });

            logger.logInfo(`Template rendered successfully: ${templateName}`, {
                renderTime,
                contentLength: result.content.length
            });

            return result;

        } catch (error) {
            const renderTime = Date.now() - startTime;
            const errorMessage = `Template render failed: ${templateName} - ${(error as Error).message}`;

            logger.logError(errorMessage, { error, templateName });

            // Update usage metrics with failure
            this.updateUsageMetrics(templateName, renderTime, false);

            // Emit error event
            this.emitEvent({
                type: 'error',
                templateName,
                timestamp: new Date(),
                data: { error: errorMessage, renderTime }
            });

            return {
                content: '',
                metadata: {},
                success: false,
                errors: [errorMessage]
            };
        }
    }

    /**
     * Unregister a template
     */
    unregister(templateName: string): boolean {
        try {
            const template = this.templates.get(templateName);
            if (!template) {
                logger.logWarning(`Cannot unregister template ${templateName}: not found`);
                return false;
            }

            this.templates.delete(templateName);
            this.usageMetrics.delete(templateName);
            this.updateStats();

            logger.logInfo(`Template unregistered: ${templateName}`);

            this.emitEvent({
                type: 'unregister',
                templateName,
                timestamp: new Date(),
                data: {
                    category: template.category,
                    version: template.version
                }
            });

            return true;

        } catch (error) {
            logger.logError(`Failed to unregister template ${templateName}`, { error });
            return false;
        }
    }

    /**
     * Get usage statistics
     */
    getUsageStats(): TemplateRegistryStats {
        return { ...this.stats };
    }

    /**
     * Get usage metrics for a specific template
     */
    getTemplateMetrics(templateName: string): TemplateUsageMetrics | undefined {
        return this.usageMetrics.get(templateName);
    }

    /**
     * Get most used templates
     */
    getMostUsedTemplates(limit: number = 10): TemplateUsageMetrics[] {
        return Array.from(this.usageMetrics.values())
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }

    /**
     * Search templates by name or tags
     */
    search(query: string): BaseTemplate[] {
        const lowerQuery = query.toLowerCase();

        return Array.from(this.templates.values()).filter(template =>
            template.name.toLowerCase().includes(lowerQuery) ||
            template.description.toLowerCase().includes(lowerQuery) ||
            template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Register event handler
     */
    on(eventType: string, handler: TemplateEventHandler): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)!.push(handler);
    }

    /**
     * Remove event handler
     */
    off(eventType: string, handler: TemplateEventHandler): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Clear all templates
     */
    clear(): void {
        const templateCount = this.templates.size;

        this.templates.clear();
        this.usageMetrics.clear();
        this.eventHandlers.clear();
        this.updateStats();

        logger.logInfo(`Cleared ${templateCount} templates from registry`);
    }

    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================

    /**
     * Update registry statistics
     */
    private updateStats(): void {
        this.stats.totalTemplates = this.templates.size;
        this.stats.categories = {};
        this.stats.lastUpdated = new Date();

        // Count templates by category
        for (const template of this.templates.values()) {
            this.stats.categories[template.category] = (this.stats.categories[template.category] || 0) + 1;
        }

        // Update most used templates
        this.stats.mostUsed = this.getMostUsedTemplates(5).map(m => m.templateName);
    }

    /**
     * Update usage metrics for a template
     */
    private updateUsageMetrics(templateName: string, renderTime: number, success: boolean): void {
        const metrics = this.usageMetrics.get(templateName);
        if (!metrics) return;

        metrics.usageCount++;
        metrics.lastUsed = new Date();

        // Update average render time
        const totalTime = metrics.averageRenderTime * (metrics.usageCount - 1) + renderTime;
        metrics.averageRenderTime = totalTime / metrics.usageCount;

        // Update success rate
        const successfulRenders = Math.round((metrics.successRate / 100) * (metrics.usageCount - 1)) + (success ? 1 : 0);
        metrics.successRate = (successfulRenders / metrics.usageCount) * 100;

        this.usageMetrics.set(templateName, metrics);
        this.updateStats();
    }

    /**
     * Emit event to registered handlers
     */
    private emitEvent(event: TemplateEvent): void {
        const handlers = this.eventHandlers.get(event.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    logger.logError(`Event handler failed for ${event.type}`, { error, event });
                }
            });
        }
    }
}

// ============================================================================
// EXPORTS
// =============================================================================

export const templateRegistry = TemplateRegistry.getInstance();

export default TemplateRegistry;
