// =============================================================================
// VAULT VALIDATION TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Validation type definitions extracted from monolithic file
// =============================================================================

import { VaultFile, VaultFolder } from '../vault/core-vault-types';
import { VaultConfig } from '../config/vault-config-types';

// =============================================================================
// [VALIDATION_TYPES] - 2025-11-19
// =============================================================================

export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    category: ValidationCategory;
    severity: 'error' | 'warning' | 'info';
    enabled: boolean;
    config: ValidationConfig;
}

export enum ValidationCategory {
    STRUCTURE = 'structure',
    CONTENT = 'content',
    METADATA = 'metadata',
    LINKS = 'links',
    NAMING = 'naming',
    PERFORMANCE = 'performance'
}

export interface ValidationConfig {
    options: Record<string, unknown>;
    exceptions: string[];
    customRules: CustomValidationRule[];
}

export interface CustomValidationRule {
    name: string;
    pattern: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
    score: number; // 0-100
    duration: number; // milliseconds
}

export interface ValidationError {
    id: string;
    rule: string;
    message: string;
    filePath: string;
    lineNumber?: number;
    columnNumber?: number;
    severity: 'error';
    suggestion?: string;
    autoFixable: boolean;
}

export interface ValidationWarning {
    id: string;
    rule: string;
    message: string;
    filePath: string;
    lineNumber?: number;
    columnNumber?: number;
    severity: 'warning';
    suggestion?: string;
    autoFixable: boolean;
}

export interface ValidationInfo {
    id: string;
    rule: string;
    message: string;
    filePath: string;
    lineNumber?: number;
    columnNumber?: number;
    severity: 'info';
    suggestion?: string;
}

// =============================================================================
// [VALIDATION_ENGINE_TYPES] - 2025-11-19
// =============================================================================

export interface ValidationEngine {
    rules: Map<string, ValidationRule>;
    results: Map<string, ValidationResult>;
    config: ValidationEngineConfig;
}

export interface ValidationEngineConfig {
    parallelProcessing: boolean;
    maxConcurrency: number;
    timeout: number; // milliseconds
    cacheEnabled: boolean;
    cacheSize: number;
}

export interface ValidationContext {
    vault: VaultConfig;
    files: VaultFile[];
    metadata: Record<string, unknown>;
    options: ValidationOptions;
}

export interface ValidationOptions {
    categories: ValidationCategory[];
    severity: ('error' | 'warning' | 'info')[];
    filePaths?: string[];
    includeContent: boolean;
    followLinks: boolean;
}

// =============================================================================
// [STANDARDS_VALIDATION_TYPES] - 2025-11-19
// =============================================================================

export interface StandardsValidator {
    namingValidator: NamingValidator;
    structureValidator: StructureValidator;
    contentValidator: ContentValidator;
    metadataValidator: MetadataValidator;
}

export interface NamingValidator {
    validateFileName(fileName: string): ValidationResult;
    validateFolderName(folderName: string): ValidationResult;
    validatePath(path: string): ValidationResult;
}

export interface StructureValidator {
    validateFolderStructure(folder: VaultFolder): ValidationResult;
    validateDepth(folder: VaultFolder, maxDepth: number): ValidationResult;
    validateRequiredFolders(folders: VaultFolder[], required: string[]): ValidationResult;
}

export interface ContentValidator {
    validateHeadings(content: string): ValidationResult;
    validateLineLength(content: string, maxLength: number): ValidationResult;
    validateListStyle(content: string, style: string): ValidationResult;
}

export interface MetadataValidator {
    validateFrontmatter(frontmatter: Record<string, unknown>): ValidationResult;
    validateRequiredFields(frontmatter: Record<string, unknown>, required: string[]): ValidationResult;
    validateDateFormats(frontmatter: Record<string, unknown>): ValidationResult;
}

// =============================================================================
// [LINK_VALIDATION_TYPES] - 2025-11-19
// =============================================================================

export interface LinkValidator {
    validateInternalLinks(file: VaultFile, vault: VaultFolder[]): ValidationResult;
    validateExternalLinks(file: VaultFile): ValidationResult;
    validateWikiLinks(content: string): ValidationResult;
}

export interface LinkValidationResult {
    totalLinks: number;
    validLinks: number;
    brokenLinks: number[];
    orphanedLinks: string[];
    circularReferences: string[];
}

export interface LinkIssue {
    type: 'broken' | 'orphaned' | 'circular' | 'malformed';
    link: string;
    source: string;
    target?: string;
    message: string;
    autoFixable: boolean;
}

// =============================================================================
// [PERFORMANCE_VALIDATION_TYPES] - 2025-11-19
// =============================================================================

export interface PerformanceValidator {
    validateFileSize(file: VaultFile, maxSize: number): ValidationResult;
    validateImageSize(file: VaultFile, maxSize: number): ValidationResult;
    validateLoadTime(file: VaultFile, maxTime: number): ValidationResult;
}

export interface PerformanceMetrics {
    fileSize: number;
    imageCount: number;
    loadTime: number;
    memoryUsage: number;
    complexity: number;
}

export interface PerformanceThreshold {
    maxFileSize: number;
    maxImageSize: number;
    maxLoadTime: number;
    maxMemoryUsage: number;
    maxComplexity: number;
}
