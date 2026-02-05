// =============================================================================
// TYPE TESTS - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-18T15:59:00Z
// DESCRIPTION: Comprehensive type tests using Bun's built-in test utilities
// =============================================================================

import { expectTypeOf, test, describe } from "bun:test";

// =============================================================================
// IMPORTS - 2025-11-18
// =============================================================================

import {
    VaultFile,
    VaultFolder,
    VaultNode,
    VaultDocumentType,
    typeHeadingMap,
    VaultConfig,
    ValidationResult,
    DailyReport,
    Logger,
    AsyncFunction,
    SyncFunction,
    EventCallback
} from '../../src/types/tick-processor-types.js';

import {
    headingTemplates,
    getHeadingTemplate,
    formatHeadingTemplate,
    hasHeadingTemplate,
    getTemplateComplexity
} from '../../src/config/heading-templates.js';

// =============================================================================
// CORE VAULT TYPES TESTS - 2025-11-18
// =============================================================================

describe("Core Vault Types", () => {
    test("VaultFile type structure", () => {
        expectTypeOf<VaultFile>().toBeObject();
        expectTypeOf<VaultFile>().toEqualTypeOf<{
            path: string;
            name: string;
            extension: string;
            size: number;
            createdAt: Date;
            modifiedAt: Date;
            content: string;
            frontmatter?: Record<string, unknown>;
            tags: string[];
            links: string[];
            backlinks: string[];
        }>();
    });

    test("VaultFolder type structure", () => {
        expectTypeOf<VaultFolder>().toBeObject();
        expectTypeOf<VaultFolder>().toEqualTypeOf<{
            path: string;
            name: string;
            files: VaultFile[];
            subfolders: VaultFolder[];
            fileCount: number;
            totalSize: number;
        }>();
    });

    test("VaultNode type structure", () => {
        expectTypeOf<VaultNode>().toBeObject();
        expectTypeOf<VaultNode>().toEqualTypeOf<{
            id: string;
            path: string;
            type: 'file' | 'folder';
            metadata: Record<string, unknown>;
            relationships: unknown[];
            healthScore: number;
            lastValidated: Date;
        }>();
    });
});

// =============================================================================
// DOCUMENT TYPES TESTS - 2025-11-18
// =============================================================================

describe("Document Types", () => {
    test("VaultDocumentType enum values", () => {
        expectTypeOf<VaultDocumentType>().toEqualTypeOf<"note" | "api-doc" | "project-plan" | "meeting-notes" | "research-notes" | "documentation" | "specification" | "tutorial" | "template" | "daily-note" | "weekly-review" | "project-status">();
    });

    test("typeHeadingMap structure", () => {
        expectTypeOf<typeof typeHeadingMap>().toBeObject();
        expectTypeOf<typeof typeHeadingMap>().toEqualTypeOf<Record<VaultDocumentType, string>>();
    });
});

// =============================================================================
// HEADING TEMPLATES TESTS - 2025-11-18
// =============================================================================

describe("Heading Templates", () => {
    test("headingTemplates type structure", () => {
        expectTypeOf<typeof headingTemplates>().toBeObject();
        expectTypeOf<typeof headingTemplates>().toEqualTypeOf<Record<VaultDocumentType, string[]>>();
        expectTypeOf<typeof headingTemplates>().toEqualTypeOf<{
            'note': string[];
            'api-doc': string[];
            'project-plan': string[];
            'meeting-notes': string[];
            'research-notes': string[];
            'documentation': string[];
            'specification': string[];
            'tutorial': string[];
            'template': string[];
            'daily-note': string[];
            'weekly-review': string[];
            'project-status': string[];
        }>();
    });

    test("getHeadingTemplate function types", () => {
        expectTypeOf(getHeadingTemplate).toBeFunction();
        expectTypeOf(getHeadingTemplate).toEqualTypeOf<(type: VaultDocumentType) => string[]>();
        expectTypeOf(getHeadingTemplate).returns.toEqualTypeOf<string[]>();
    });

    test("formatHeadingTemplate function types", () => {
        expectTypeOf(formatHeadingTemplate).toBeFunction();
        expectTypeOf(formatHeadingTemplate).toEqualTypeOf<(type: VaultDocumentType, variables?: Record<string, string>) => string[]>();
        expectTypeOf(formatHeadingTemplate).returns.toEqualTypeOf<string[]>();
    });

    test("hasHeadingTemplate function types", () => {
        expectTypeOf(hasHeadingTemplate).toBeFunction();
        expectTypeOf(hasHeadingTemplate).toEqualTypeOf<(type: VaultDocumentType) => boolean>();
        expectTypeOf(hasHeadingTemplate).returns.toBeBoolean();
    });

    test("getTemplateComplexity function types", () => {
        expectTypeOf(getTemplateComplexity).toBeFunction();
        expectTypeOf(getTemplateComplexity).toEqualTypeOf<(type: VaultDocumentType) => number>();
        expectTypeOf(getTemplateComplexity).returns.toBeNumber();
    });
});

// =============================================================================
// CONFIGURATION TYPES TESTS - 2025-11-18
// =============================================================================

describe("Configuration Types", () => {
    test("VaultConfig type structure", () => {
        expectTypeOf<VaultConfig>().toBeObject();
        expectTypeOf<VaultConfig>().toEqualTypeOf<{
            name: string;
            version: string;
            paths: unknown;
            plugins: unknown;
            standards: unknown;
            automation: unknown;
        }>();
    });

    test("ValidationResult type structure", () => {
        expectTypeOf<ValidationResult>().toBeObject();
        expectTypeOf<ValidationResult>().toEqualTypeOf<{
            passed: boolean;
            errors: number;
            warnings: number;
            issues: unknown[];
            timestamp: Date;
            duration: number;
        }>();
    });

    test("DailyReport type structure", () => {
        expectTypeOf<DailyReport>().toBeObject();
        expectTypeOf<DailyReport>().toEqualTypeOf<{
            validation: ValidationResult;
            organization: unknown;
            cleanup: unknown;
            timestamp: Date;
            duration: number;
        }>();
    });
});

// =============================================================================
// UTILITY TYPES TESTS - 2025-11-18
// =============================================================================

describe("Utility Types", () => {
    test("Logger interface type", () => {
        expectTypeOf<Logger>().toBeObject();
        expectTypeOf<Logger>().toEqualTypeOf<{
            debug: (message: string, data?: Record<string, unknown>) => void;
            info: (message: string, data?: Record<string, unknown>) => void;
            warn: (message: string, data?: Record<string, unknown>) => void;
            error: (message: string, error?: Error) => void;
        }>();
    });

    test("AsyncFunction type", () => {
        expectTypeOf<AsyncFunction>().toBeFunction();
        expectTypeOf<AsyncFunction>().returns.toEqualTypeOf<Promise<unknown>>();
        expectTypeOf<AsyncFunction<string>>().returns.toEqualTypeOf<Promise<string>>();
        expectTypeOf<AsyncFunction<number>>().returns.toEqualTypeOf<Promise<number>>();
    });

    test("SyncFunction type", () => {
        expectTypeOf<SyncFunction>().toBeFunction();
        expectTypeOf<SyncFunction>().returns.toEqualTypeOf<unknown>();
        expectTypeOf<SyncFunction<string>>().returns.toEqualTypeOf<string>();
        expectTypeOf<SyncFunction<number>>().returns.toEqualTypeOf<number>();
    });

    test("EventCallback type", () => {
        expectTypeOf<EventCallback>().toBeFunction();
        expectTypeOf<EventCallback<string>>().toEqualTypeOf<(data: string) => void | Promise<void>>();
        expectTypeOf<EventCallback<number>>().toEqualTypeOf<(data: number) => void | Promise<void>>();
        expectTypeOf<EventCallback>().returns.toEqualTypeOf<void | Promise<void>>();
    });
});

// =============================================================================
// TYPE SAFETY TESTS - 2025-11-18
// =============================================================================

describe("Type Safety Validation", () => {
    test("no 'any' types in critical interfaces", () => {
        // These should all fail if 'any' types are present
        expectTypeOf<VaultFile>().not.toEqualTypeOf<any>();
        expectTypeOf<VaultConfig>().not.toEqualTypeOf<any>();
        expectTypeOf<ValidationResult>().not.toEqualTypeOf<any>();
        expectTypeOf<DailyReport>().not.toEqualTypeOf<any>();
    });

    test("proper unknown usage instead of any", () => {
        // frontmatter should be Record<string, unknown> | undefined
        expectTypeOf<VaultFile>().toEqualTypeOf<{
            path: string;
            name: string;
            extension: string;
            size: number;
            createdAt: Date;
            modifiedAt: Date;
            content: string;
            frontmatter?: Record<string, unknown>;
            tags: string[];
            links: string[];
            backlinks: string[];
        }>();

        // Logger data parameter should be Record<string, unknown> | undefined
        expectTypeOf<Logger>().toEqualTypeOf<{
            debug: (message: string, data?: Record<string, unknown>) => void;
            info: (message: string, data?: Record<string, unknown>) => void;
            warn: (message: string, data?: Record<string, unknown>) => void;
            error: (message: string, error?: Error) => void;
        }>();
    });

    test("enum exhaustiveness", () => {
        // Ensure all document types have corresponding templates
        expectTypeOf<typeof headingTemplates>().toEqualTypeOf<Record<VaultDocumentType, string[]>>();
        expectTypeOf<keyof typeof headingTemplates>().toEqualTypeOf<VaultDocumentType>();
    });
});

// =============================================================================
// FACTORY & UTILITY TYPE TESTS - 2025-11-18
// =============================================================================

describe("Factory & Utility Types", () => {
    test("DeepPartial utility type", () => {
        interface TestInterface {
            level1: {
                level2: {
                    value: string;
                    count: number;
                };
                items: string[];
            };
            name: string;
            age: number;
        }

        expectTypeOf<DeepPartial<TestInterface>>().toEqualTypeOf<{
            level1?: {
                level2?: {
                    value?: string;
                    count?: number;
                };
                items?: string[];
            };
            name?: string;
            age?: number;
        }>();
    });

    test("Optional utility type", () => {
        interface TestInterface {
            required: string;
            optional: number;
            another: boolean;
        }

        expectTypeOf<Optional<TestInterface, 'optional'>>().toEqualTypeOf<{
            required: string;
            optional?: number;
            another: boolean;
        }>();

        expectTypeOf<Optional<TestInterface, 'optional' | 'another'>>().toEqualTypeOf<{
            required: string;
            optional?: number;
            another?: boolean;
        }>();
    });

    test("RequiredBy utility type", () => {
        interface TestInterface {
            required: string;
            optional?: number;
            another?: boolean;
        }

        expectTypeOf<RequiredBy<TestInterface, 'optional'>>().toEqualTypeOf<{
            required: string;
            optional: number;
            another?: boolean;
        }>();

        expectTypeOf<RequiredBy<TestInterface, 'optional' | 'another'>>().toEqualTypeOf<{
            required: string;
            optional: number;
            another: boolean;
        }>();
    });

    test("Cache interface type", () => {
        expectTypeOf<Cache<string, number>>().toBeObject();
        expectTypeOf<Cache<string, number>>().toEqualTypeOf<{
            get: (key: string) => number | undefined;
            set: (key: string, value: number) => void;
            delete: (key: string) => boolean;
            clear: () => void;
            has: (key: string) => boolean;
            size: number;
        }>();
    });

    test("FileSystemWatcher interface type", () => {
        const mockCallback: EventCallback<string> = (data: string) => {
            console.log('File changed:', data);
        };

        expectTypeOf<FileSystemWatcher>().toBeObject();
        expectTypeOf<FileSystemWatcher>().toEqualTypeOf<{
            watch: (path: string, callback: EventCallback) => void;
            unwatch: (path: string) => void;
            close: () => void;
        }>();

        expectTypeOf(mockCallback).toEqualTypeOf<EventCallback<string>>();
    });

    test("Factory function types", () => {
        // Test generic factory function
        type Factory<T> = () => T;

        expectTypeOf<Factory<string>>().toBeFunction();
        expectTypeOf<Factory<string>>().returns.toBeString();
        expectTypeOf<Factory<number>>().returns.toBeNumber();
        expectTypeOf<Factory<VaultFile>>().returns.toEqualTypeOf<VaultFile>();

        // Test async factory function
        type AsyncFactory<T> = () => Promise<T>;

        expectTypeOf<AsyncFactory<string>>().toBeFunction();
        expectTypeOf<AsyncFactory<string>>().returns.toEqualTypeOf<Promise<string>>();
        expectTypeOf<AsyncFactory<VaultConfig>>().returns.toEqualTypeOf<Promise<VaultConfig>>();
    });

    test("Builder pattern types", () => {
        interface Builder<T> {
            build: () => T;
            set: (key: keyof T, value: T[keyof T]) => Builder<T>;
        }

        expectTypeOf<Builder<VaultFile>>().toBeObject();
        expectTypeOf<Builder<VaultFile>>().toEqualTypeOf<{
            build: () => VaultFile;
            set: (key: keyof VaultFile, value: VaultFile[keyof VaultFile]) => Builder<VaultFile>;
        }>();
    });

    test("Repository pattern types", () => {
        interface Repository<T, K> {
            findById: (id: K) => Promise<T | null>;
            save: (entity: T) => Promise<T>;
            delete: (id: K) => Promise<boolean>;
            findAll: () => Promise<T[]>;
        }

        expectTypeOf<Repository<VaultFile, string>>().toBeObject();
        expectTypeOf<Repository<VaultFile, string>>().toEqualTypeOf<{
            findById: (id: string) => Promise<VaultFile | null>;
            save: (entity: VaultFile) => Promise<VaultFile>;
            delete: (id: string) => Promise<boolean>;
            findAll: () => Promise<VaultFile[]>;
        }>();
    });

    test("Service container types", () => {
        type ServiceFactory<T> = (...args: any[]) => T;
        type ServiceContainer = Record<string, ServiceFactory<unknown>>;

        expectTypeOf<ServiceFactory<VaultFile>>().toBeFunction();
        expectTypeOf<ServiceFactory<VaultFile>>().returns.toEqualTypeOf<VaultFile>();

        expectTypeOf<ServiceContainer>().toBeObject();
        expectTypeOf<ServiceContainer>().toEqualTypeOf<Record<string, ServiceFactory<unknown>>>();
    });

    test("Event emitter types", () => {
        interface EventEmitter<T extends Record<string, unknown>> {
            on: <K extends keyof T>(event: K, listener: (data: T[K]) => void) => void;
            emit: <K extends keyof T>(event: K, data: T[K]) => void;
            off: <K extends keyof T>(event: K, listener: (data: T[K]) => void) => void;
        }

        type VaultEvents = {
            'file:created': VaultFile;
            'file:updated': { file: VaultFile; changes: string[] };
            'vault:validated': ValidationResult;
        };

        expectTypeOf<EventEmitter<VaultEvents>>().toBeObject();
        expectTypeOf<EventEmitter<VaultEvents>>().toEqualTypeOf<{
            on: <K extends keyof VaultEvents>(event: K, listener: (data: VaultEvents[K]) => void) => void;
            emit: <K extends keyof VaultEvents>(event: K, data: VaultEvents[K]) => void;
            off: <K extends keyof VaultEvents>(event: K, listener: (data: VaultEvents[K]) => void) => void;
        }>();
    });

    test("Middleware types", () => {
        type Middleware<T, R> = (input: T, next: () => Promise<R>) => Promise<R>;
        type MiddlewareStack<T, R> = Middleware<T, R>[];

        expectTypeOf<Middleware<string, number>>().toBeFunction();
        expectTypeOf<Middleware<string, number>>().toEqualTypeOf<(input: string, next: () => Promise<number>) => Promise<number>>();
        expectTypeOf<MiddlewareStack<VaultFile, ValidationResult>>().toBeArray();
        expectTypeOf<MiddlewareStack<VaultFile, ValidationResult>>().toEqualTypeOf<Middleware<VaultFile, ValidationResult>[]>();
    });
});

// =============================================================================
// TEMPLATE SYSTEM TYPE TESTS - 2025-11-18
// =============================================================================

describe("Template System Types", () => {
    test("TemplateContext interface type", () => {
        expectTypeOf<TemplateContext>().toBeObject();
        expectTypeOf<TemplateContext>().toEqualTypeOf<{
            file: VaultFile;
            vault: VaultConfig;
            user: { name: string; email: string; role: string };
            date: { now: Date; today: string; tomorrow: string; yesterday: string };
            metadata: Record<string, unknown>;
        }>();
    });

    test("TemplateResult interface type", () => {
        expectTypeOf<TemplateResult>().toBeObject();
        expectTypeOf<TemplateResult>().toEqualTypeOf<{
            content: string;
            metadata: Record<string, unknown>;
            success: boolean;
            errors: string[];
        }>();
    });

    test("BaseTemplate interface type", () => {
        expectTypeOf<BaseTemplate>().toBeObject();
        expectTypeOf<BaseTemplate>().toEqualTypeOf<{
            name: string;
            description: string;
            version: string;
            author: string;
            category: string;
            tags: string[];
            render: (context: TemplateContext) => TemplateResult;
            validate: (context: TemplateContext) => boolean;
        }>();
    });

    test("ProjectTemplate interface type", () => {
        expectTypeOf<ProjectTemplate>().toBeObject();
        expectTypeOf<ProjectTemplate>().toEqualTypeOf<{
            name: string;
            description: string;
            version: string;
            author: string;
            category: 'project';
            tags: string[];
            projectType: 'software' | 'research' | 'documentation' | 'design';
            phases: ProjectPhase[];
            render: (context: TemplateContext) => TemplateResult;
            validate: (context: TemplateContext) => boolean;
        }>();
    });

    test("NoteTemplate interface type", () => {
        expectTypeOf<NoteTemplate>().toBeObject();
        expectTypeOf<NoteTemplate>().toEqualTypeOf<{
            name: string;
            description: string;
            version: string;
            author: string;
            category: 'note';
            tags: string[];
            noteType: 'daily' | 'meeting' | 'research' | 'guide' | 'documentation';
            sections: NoteSection[];
            render: (context: TemplateContext) => TemplateResult;
            validate: (context: TemplateContext) => boolean;
        }>();
    });

    test("TaskTemplate interface type", () => {
        expectTypeOf<TaskTemplate>().toBeObject();
        expectTypeOf<TaskTemplate>().toEqualTypeOf<{
            name: string;
            description: string;
            version: string;
            author: string;
            category: 'task';
            tags: string[];
            taskType: 'feature' | 'bug' | 'enhancement' | 'documentation';
            priority: 'low' | 'medium' | 'high' | 'critical';
            assignee?: string;
            render: (context: TemplateContext) => TemplateResult;
            validate: (context: TemplateContext) => boolean;
        }>();
    });

    test("ProjectPhase interface type", () => {
        expectTypeOf<ProjectPhase>().toBeObject();
        expectTypeOf<ProjectPhase>().toEqualTypeOf<{
            name: string;
            description: string;
            status: 'planning' | 'in-progress' | 'completed' | 'blocked';
            tasks: ProjectTask[];
            dependencies: string[];
            estimatedHours: number;
            startDate?: Date;
            endDate?: Date;
        }>();
    });

    test("ProjectTask interface type", () => {
        expectTypeOf<ProjectTask>().toBeObject();
        expectTypeOf<ProjectTask>().toEqualTypeOf<{
            title: string;
            description: string;
            estimatedHours: number;
            dependencies: string[];
            assignee?: string;
            status: 'todo' | 'in-progress' | 'completed' | 'blocked';
            priority: 'low' | 'medium' | 'high' | 'critical';
        }>();
    });

    test("NoteSection interface type", () => {
        expectTypeOf<NoteSection>().toBeObject();
        expectTypeOf<NoteSection>().toEqualTypeOf<{
            name: string;
            required: boolean;
            order: number;
            template?: string;
            validation?: SectionValidation;
        }>();
    });

    test("SectionValidation interface type", () => {
        expectTypeOf<SectionValidation>().toBeObject();
        expectTypeOf<SectionValidation>().toEqualTypeOf<{
            minLength?: number;
            maxLength?: number;
            requiredFields?: string[];
            pattern?: RegExp;
        }>();
    });

    test("Template configuration types", () => {
        expectTypeOf<TemplateConfig>().toBeObject();
        expectTypeOf<ProjectTemplateConfig>().toEqualTypeOf<TemplateConfig & {
            projectType: 'software' | 'research' | 'documentation' | 'design';
            phases?: ProjectPhase[];
        }>();
        expectTypeOf<NoteTemplateConfig>().toEqualTypeOf<TemplateConfig & {
            noteType: 'daily' | 'meeting' | 'research' | 'guide' | 'documentation';
            sections?: NoteSection[];
        }>();
        expectTypeOf<TaskTemplateConfig>().toEqualTypeOf<TemplateConfig & {
            taskType: 'feature' | 'bug' | 'enhancement' | 'documentation';
            priority: 'low' | 'medium' | 'high' | 'critical';
            assignee?: string;
        }>();
    });

    test("Template factory types", () => {
        expectTypeOf<TemplateFactory<BaseTemplate>>().toBeObject();
        expectTypeOf<TemplateFactory<BaseTemplate>>().toEqualTypeOf<{
            create: (config: TemplateConfig) => BaseTemplate;
            validate: (template: BaseTemplate) => boolean;
            register: (template: BaseTemplate) => void;
        }>();

        expectTypeOf<TemplateRegistry>().toBeObject();
        expectTypeOf<TemplateRegistry>().toEqualTypeOf<{
            register: (template: BaseTemplate) => void;
            get: (name: string) => BaseTemplate | undefined;
            getByCategory: (category: string) => BaseTemplate[];
            list: () => string[];
            render: (templateName: string, context: TemplateContext) => TemplateResult;
        }>();
    });

    test("Template validation types", () => {
        expectTypeOf<TemplateValidationError>().toBeObject();
        expectTypeOf<TemplateValidationError>().toEqualTypeOf<{
            field: string;
            message: string;
            severity: 'error' | 'warning' | 'info';
        }>();

        expectTypeOf<TemplateValidationResult>().toBeObject();
        expectTypeOf<TemplateValidationResult>().toEqualTypeOf<{
            isValid: boolean;
            errors: TemplateValidationError[];
            warnings: TemplateValidationError[];
        }>();
    });

    test("Template rendering options", () => {
        expectTypeOf<TemplateRenderOptions>().toBeObject();
        expectTypeOf<TemplateRenderOptions>().toEqualTypeOf<{
            includeMetadata?: boolean;
            formatOutput?: boolean;
            validateBeforeRender?: boolean;
            onError?: 'throw' | 'return' | 'log';
        }>();
    });

    test("Template analytics types", () => {
        expectTypeOf<TemplateUsageMetrics>().toBeObject();
        expectTypeOf<TemplateUsageMetrics>().toEqualTypeOf<{
            templateName: string;
            usageCount: number;
            lastUsed: Date;
            averageRenderTime: number;
            errorRate: number;
        }>();
    });

    test("Template type exhaustiveness", () => {
        // Ensure all template categories are properly typed
        expectTypeOf<ProjectTemplate['category']>().toEqualTypeOf<'project'>();
        expectTypeOf<NoteTemplate['category']>().toEqualTypeOf<'note'>();
        expectTypeOf<TaskTemplate['category']>().toEqualTypeOf<'task'>();

        // Ensure all project types are covered
        expectTypeOf<ProjectTemplate['projectType']>().toEqualTypeOf<'software' | 'research' | 'documentation' | 'design'>();

        // Ensure all note types are covered
        expectTypeOf<NoteTemplate['noteType']>().toEqualTypeOf<'daily' | 'meeting' | 'research' | 'guide' | 'documentation'>();

        // Ensure all task types are covered
        expectTypeOf<TaskTemplate['taskType']>().toEqualTypeOf<'feature' | 'bug' | 'enhancement' | 'documentation'>();
    });
});

// =============================================================================
// INTEGRATION TYPE TESTS - 2025-11-18
// =============================================================================

describe("Integration Type Tests", () => {
    test("template function integration", () => {
        // Test that functions work together with proper types
        const docType: VaultDocumentType = VaultDocumentType.NOTE;
        const variables: Record<string, string> = { title: "Test Note" };

        expectTypeOf(docType).toEqualTypeOf<VaultDocumentType>();
        expectTypeOf(variables).toEqualTypeOf<Record<string, string>>();

        // Function calls should type-check
        const template = getHeadingTemplate(docType);
        expectTypeOf(template).toEqualTypeOf<string[]>();

        const formatted = formatHeadingTemplate(docType, variables);
        expectTypeOf(formatted).toEqualTypeOf<string[]>();

        const hasTemplate = hasHeadingTemplate(docType);
        expectTypeOf(hasTemplate).toEqualTypeOf<boolean>();

        const complexity = getTemplateComplexity(docType);
        expectTypeOf(complexity).toEqualTypeOf<number>();
    });

    test("vault system type compatibility", () => {
        // Test that different parts of the system work together
        expectTypeOf<VaultFile>().toEqualTypeOf<{
            path: string;
            name: string;
            extension: string;
            size: number;
            createdAt: Date;
            modifiedAt: Date;
            content: string;
            frontmatter?: Record<string, unknown>;
            tags: string[];
            links: string[];
            backlinks: string[];
        }>();

        expectTypeOf<VaultFolder>().toEqualTypeOf<{
            path: string;
            name: string;
            files: VaultFile[];
            subfolders: VaultFolder[];
            fileCount: number;
            totalSize: number;
        }>();

        // Test that configuration types are compatible
        expectTypeOf<VaultConfig>().toEqualTypeOf<{
            name: string;
            version: string;
            paths: unknown;
            plugins: unknown;
            standards: unknown;
            automation: unknown;
        }>();
    });
});
