// =============================================================================
// VAULT TEMPLATE TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Template type definitions extracted from monolithic file
// =============================================================================

import { VaultFile } from '../vault/core-vault-types';
import { VaultConfig } from '../config/vault-config-types';

// =============================================================================
// [TEMPLATE_TYPES] - 2025-11-19
// =============================================================================

export interface TemplateContext {
    file: VaultFile;
    vault: VaultConfig;
    user: {
        name: string;
        email: string;
        role: string;
        preferences: Record<string, unknown>;
    };
    date: {
        now: Date;
        today: string;
        tomorrow: string;
        yesterday: string;
    };
    metadata: Record<string, unknown>;
}

export interface TemplateResult {
    content: string;
    metadata: Record<string, unknown>;
    success: boolean;
    errors: string[];
}

export interface BaseTemplate {
    name: string;
    description: string;
    version: string;
    author: string;
    category: string;
    tags: string[];
    render(context: TemplateContext): TemplateResult;
    validate(context: TemplateContext): boolean;
}

export interface ProjectTemplate extends BaseTemplate {
    category: 'project';
    projectType: 'software' | 'research' | 'documentation' | 'design';
    phases: ProjectPhase[];
}

export interface ProjectPhase {
    name: string;
    description: string;
    status: 'planned' | 'active' | 'completed' | 'cancelled';
    duration: number; // days
    dependencies: string[];
    deliverables: string[];
}

export interface DocumentTemplate extends BaseTemplate {
    category: 'document';
    documentType: 'note' | 'meeting' | 'research' | 'specification' | 'tutorial';
    sections: DocumentSection[];
}

export interface DocumentSection {
    name: string;
    required: boolean;
    template?: string;
    order: number;
}

export interface DailyTemplate extends BaseTemplate {
    category: 'daily';
    sections: DailySection[];
    dateFormat: string;
    includeTasks: boolean;
    includeNotes: boolean;
}

export interface DailySection {
    name: string;
    prompt?: string;
    required: boolean;
    order: number;
}

// =============================================================================
// [TEMPLATE_REGISTRY_TYPES] - 2025-11-19
// =============================================================================

export interface TemplateRegistry {
    templates: Map<string, BaseTemplate>;
    categories: Map<string, string[]>;
    metadata: RegistryMetadata;
}

export interface RegistryMetadata {
    totalTemplates: number;
    lastUpdated: Date;
    version: string;
    categories: string[];
}

export interface TemplateSearchOptions {
    query?: string;
    category?: string;
    tags?: string[];
    author?: string;
    limit?: number;
}

export interface TemplateSearchResult {
    template: BaseTemplate;
    score: number;
    matches: {
        name: boolean;
        description: boolean;
        tags: boolean;
        category: boolean;
    };
}

// =============================================================================
// [TEMPLATE_PROCESSING_TYPES] - 2025-11-19
// =============================================================================

export interface TemplateProcessor {
    registry: TemplateRegistry;
    context: TemplateContext;
    options: ProcessorOptions;
}

export interface ProcessorOptions {
    validateInputs: boolean;
    strictMode: boolean;
    allowUndefinedVariables: boolean;
    customFunctions: Record<string, Function>;
}

export interface TemplateVariable {
    name: string;
    value: unknown;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    required: boolean;
    description?: string;
}

export interface TemplateFunction {
    name: string;
    parameters: TemplateVariable[];
    returnType: string;
    implementation: string;
    description?: string;
}

// =============================================================================
// [TEMPLATE_VALIDATION_TYPES] - 2025-11-19
// =============================================================================

export interface TemplateValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    score: number; // 0-100
}

export interface ValidationError {
    type: 'syntax' | 'semantic' | 'reference';
    message: string;
    line?: number;
    column?: number;
    severity: 'error';
}

export interface ValidationWarning {
    type: 'style' | 'performance' | 'accessibility';
    message: string;
    line?: number;
    column?: number;
    severity: 'warning';
}

export interface TemplateValidator {
    validate(template: BaseTemplate): TemplateValidationResult;
    validateContext(context: TemplateContext): boolean;
    validateResult(result: TemplateResult): boolean;
}

// =============================================================================
// [ENHANCED_TEMPLATE_TYPES] - 2025-11-19
// =============================================================================

export interface EnhancedTemplate extends BaseTemplate {
    dependencies: string[];
    conflicts: string[];
    requirements: TemplateRequirement[];
    compatibility: TemplateCompatibility;
}

export interface TemplateRequirement {
    type: 'plugin' | 'setting' | 'file' | 'folder';
    name: string;
    version?: string;
    optional: boolean;
}

export interface TemplateCompatibility {
    obsidianVersion: string;
    pluginVersions: Record<string, string>;
    testedVersions: string[];
}

export interface TemplateBundle {
    name: string;
    description: string;
    version: string;
    templates: string[];
    dependencies: string[];
    installScript?: string;
    uninstallScript?: string;
}
