/**
 * Template System Types - Clean Consolidated Definitions
 * Resolves duplicate interface issues and provides unified template types
 * 
 * @fileoverview Unified template type definitions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// TEMPLATE CORE INTERFACES
// =============================================================================

export interface TemplateContext {
    file: {
        name: string;
        path: string;
        frontmatter?: Record<string, any>;
        content?: string;
    };
    vault: {
        name: string;
        path: string;
        config?: Record<string, any>;
    };
    user: {
        name: string;
        email?: string;
        role?: string;
    };
    date: {
        now: Date;
        today: string;
        tomorrow: string;
        yesterday: string;
    };
    metadata?: Record<string, any>;
}

export interface TemplateResult {
    content: string;
    metadata: Record<string, any>;
    success: boolean;
    errors: string[];
}

export interface BaseTemplate {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly author: string;
    readonly category: string;
    readonly tags: string[];

    render(context: TemplateContext): TemplateResult;
    validate(context: TemplateContext): boolean;
}

// =============================================================================
// PROJECT TEMPLATE TYPES
// =============================================================================

export interface ProjectTemplate extends BaseTemplate {
    readonly category: 'project';
    readonly projectType: 'software' | 'research' | 'documentation' | 'design';
    readonly phases: ProjectPhase[];
}

export interface ProjectPhase {
    name: string;
    description: string;
    status: 'planning' | 'in-progress' | 'completed' | 'blocked';
    tasks: ProjectTask[];
    dependencies: string[];
    estimatedHours: number;
    startDate?: Date;
    endDate?: Date;
}

export interface ProjectTask {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedHours: number;
    actualHours?: number;
    dependencies: string[];
    assignee?: string;
    tags?: string[];
}

// =============================================================================
// NOTE TEMPLATE TYPES
// =============================================================================

export interface NoteTemplate extends BaseTemplate {
    readonly category: 'note';
    readonly noteType: 'daily' | 'meeting' | 'research' | 'guide' | 'documentation';
    readonly sections: NoteSection[];
}

export interface NoteSection {
    id: string;
    name: string;
    order: number;
    required: boolean;
    template?: string;
    placeholder?: string;
    validation?: SectionValidation;
}

export interface SectionValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (content: string) => boolean;
}

// =============================================================================
// TASK TEMPLATE TYPES
// =============================================================================

export interface TaskTemplate extends BaseTemplate {
    readonly category: 'task';
    readonly taskType: 'bug' | 'feature' | 'improvement' | 'documentation' | 'research';
    readonly priority: 'low' | 'medium' | 'high' | 'critical';
    readonly assignee?: string;
    readonly dueDate?: Date;
    readonly tags: string[];
}

// =============================================================================
// TEMPLATE CONFIGURATION TYPES
// =============================================================================

export interface TemplateConfig {
    name: string;
    description: string;
    version: string;
    author: string;
    category: string;
    tags?: string[];
}

export interface ProjectTemplateConfig extends TemplateConfig {
    projectType: 'software' | 'research' | 'documentation' | 'design';
    phases?: ProjectPhase[];
}

export interface NoteTemplateConfig extends TemplateConfig {
    noteType: 'daily' | 'meeting' | 'research' | 'guide' | 'documentation';
    sections?: NoteSection[];
}

export interface TaskTemplateConfig extends TemplateConfig {
    taskType: 'bug' | 'feature' | 'improvement' | 'documentation' | 'research';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    dueDate?: Date;
    tags?: string[];
}

// =============================================================================
// TEMPLATE REGISTRY TYPES
// =============================================================================

export interface TemplateRegistry {
    register(template: BaseTemplate): void;
    get(name: string): BaseTemplate | undefined;
    getByCategory(category: string): BaseTemplate[];
    list(): string[];
    render(templateName: string, context: TemplateContext): TemplateResult;
}

export interface TemplateRegistryStats {
    totalTemplates: number;
    categories: Record<string, number>;
    lastUpdated: Date;
    mostUsed: string[];
}

// =============================================================================
// TEMPLATE VALIDATION TYPES
// =============================================================================

export interface TemplateValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

export interface TemplateValidationResult {
    isValid: boolean;
    errors: TemplateValidationError[];
    warnings: TemplateValidationError[];
    info: TemplateValidationError[];
}

// =============================================================================
// TEMPLATE RENDERING OPTIONS
// =============================================================================

export interface TemplateRenderOptions {
    includeMetadata?: boolean;
    formatOutput?: boolean;
    validateBeforeRender?: boolean;
    customVariables?: Record<string, any>;
    dryRun?: boolean;
}

// =============================================================================
// TEMPLATE USAGE ANALYTICS
// =============================================================================

export interface TemplateUsageMetrics {
    templateName: string;
    usageCount: number;
    lastUsed: Date;
    averageRenderTime: number;
    successRate: number;
    userRating?: number;
    feedback?: string[];
}

export interface TemplateAnalytics {
    totalRenders: number;
    averageRenderTime: number;
    successRate: number;
    mostUsedTemplates: TemplateUsageMetrics[];
    leastUsedTemplates: TemplateUsageMetrics[];
    errorRates: Record<string, number>;
}

// =============================================================================
// TEMPLATE FACTORY TYPES
// =============================================================================

export interface TemplateFactory<T extends BaseTemplate> {
    create(config: TemplateConfig): T;
    validate(template: T): boolean;
    register(template: T): void;
    optimize(template: T): T;
}

// =============================================================================
// TEMPLATE PROCESSING TYPES
// =============================================================================

export interface TemplateProcessor {
    preprocess(template: BaseTemplate, context: TemplateContext): TemplateContext;
    postprocess(result: TemplateResult, context: TemplateContext): TemplateResult;
    validate(template: BaseTemplate): TemplateValidationResult;
}

export interface TemplateData {
    variables: Record<string, any>;
    metadata: Record<string, any>;
    options: TemplateRenderOptions;
}

// =============================================================================
// TEMPLATE EVENTS
// =============================================================================

export interface TemplateEvent {
    type: 'render' | 'register' | 'unregister' | 'update' | 'validate' | 'error';
    templateName: string;
    timestamp: Date;
    data?: Record<string, any>;
}

export interface TemplateEventHandler {
    (event: TemplateEvent): void;
}

// =============================================================================
// TEMPLATE STORAGE TYPES
// =============================================================================

export interface TemplateStorage {
    save(template: BaseTemplate): Promise<void>;
    YAML.parse(name: string): Promise<BaseTemplate | null>;
    list(): Promise<string[]>;
    delete(name: string): Promise<void>;
    exists(name: string): Promise<boolean>;
}

// =============================================================================
// TEMPLATE EXPORTS
// =============================================================================

export * from './template-registry.js';
export * from './template-validator.js';
export * from './template-renderer.js';

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isProjectTemplate(template: BaseTemplate): template is ProjectTemplate {
    return template.category === 'project';
}

export function isNoteTemplate(template: BaseTemplate): template is NoteTemplate {
    return template.category === 'note';
}

export function isTaskTemplate(template: BaseTemplate): template is TaskTemplate {
    return template.category === 'task';
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type TemplateCategory = 'project' | 'note' | 'task' | 'documentation' | 'custom';
export type TemplateStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type TemplatePriority = 'low' | 'medium' | 'high' | 'critical';

export interface EnhancedTemplate extends BaseTemplate {
    status: TemplateStatus;
    priority: TemplatePriority;
    createdAt: Date;
    updatedAt: Date;
    usageMetrics: TemplateUsageMetrics;
    customData?: Record<string, any>;
}

// =============================================================================
// DEFAULT EXPORTS
// =============================================================================

export default {
    TemplateContext,
    TemplateResult,
    BaseTemplate,
    ProjectTemplate,
    NoteTemplate,
    TaskTemplate,
    TemplateRegistry,
    TemplateConfig
};
