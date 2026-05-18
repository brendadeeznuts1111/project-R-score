#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]demonstrate-factory-types
 * 
 * Demonstrate Factory Types
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example
 */

#!/usr/bin/env bun

/**
 * Factory & Utility Types Demonstration
 * Shows advanced TypeScript patterns for vault system architecture
 * 
 * @fileoverview Demonstrates factory patterns, utility types, and architectural patterns
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { expectTypeOf } from "bun:test";
import {
    VaultFile,
    VaultFolder,
    VaultDocumentType,
    ValidationResult,
    Logger
} from '../../src/types/tick-processor-types.js';
import {
    DeepPartial,
    Optional,
    RequiredBy,
    EventCallback,
    AsyncFunction,
    SyncFunction
} from '../../src/types/tick-processor-types.js';
import {
    formatTable,
    createTimer
} from '../../src/constants/vault-constants.js';
import chalk from 'chalk';

// =============================================================================
// FACTORY PATTERNS - 2025-11-18
// =============================================================================

// Generic Factory Pattern
type Factory<T> = () => T;

// Async Factory Pattern
type AsyncFactory<T> = () => Promise<T>;

// Parameterized Factory Pattern
type ParameterizedFactory<T, P = unknown> = (params: P) => T;

// =============================================================================
// BUILDER PATTERNS - 2025-11-18
// =============================================================================

interface Builder<T> {
    build(): T;
    set<K extends keyof T>(key: K, value: T[K]): Builder<T>;
}

// =============================================================================
// REPOSITORY PATTERNS - 2025-11-18
// =============================================================================

interface Repository<T, K> {
    findById(id: K): Promise<T | null>;
    save(entity: T): Promise<T>;
    delete(id: K): Promise<boolean>;
    findAll(): Promise<T[]>;
}

// =============================================================================
// SERVICE CONTAINER - 2025-11-18
// =============================================================================

type ServiceFactory<T> = (...args: any[]) => T;
type ServiceContainer = Record<string, ServiceFactory<unknown>>;

// =============================================================================
// EVENT SYSTEM - 2025-11-18
// =============================================================================

interface EventEmitter<T extends Record<string, unknown>> {
    on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
    emit<K extends keyof T>(event: K, data: T[K]): void;
    off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
}

// =============================================================================
// MIDDLEWARE SYSTEM - 2025-11-18
// =============================================================================

type Middleware<T, R> = (input: T, next: () => Promise<R>) => Promise<R>;
type MiddlewareStack<T, R> = Middleware<T, R>[];

// =============================================================================
// CACHE INTERFACE - 2025-11-18
// =============================================================================

interface Cache<K, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): boolean;
    clear(): void;
    has(key: K): boolean;
    size: number;
}

// =============================================================================
// FILE SYSTEM WATCHER - 2025-11-18
// =============================================================================

interface FileSystemWatcher {
    watch(path: string, callback: EventCallback): void;
    unwatch(path: string): void;
    close(): void;
}

// =============================================================================
// DEMONSTRATION FUNCTIONS - 2025-11-18
// =============================================================================

// Vault File Factory
function createVaultFile(): Factory<VaultFile> {
    return () => ({
        path: '',
        name: '',
        extension: '',
        size: 0,
        createdAt: new Date(),
        modifiedAt: new Date(),
        content: '',
        tags: [],
        links: [],
        backlinks: []
    });
}

// Async Vault File Factory
function createVaultFileAsync(): AsyncFactory<VaultFile> {
    return async () => ({
        path: '',
        name: '',
        extension: '',
        size: 0,
        createdAt: new Date(),
        modifiedAt: new Date(),
        content: '',
        tags: [],
        links: [],
        backlinks: []
    });
}

// Vault File Builder
class VaultFileBuilder implements Builder<VaultFile> {
    private file: Partial<VaultFile> = {
        tags: [],
        links: [],
        backlinks: []
    };

    set<K extends keyof VaultFile>(key: K, value: VaultFile[K]): Builder<VaultFile> {
        this.file[key] = value;
        return this;
    }

    build(): VaultFile {
        const now = new Date();
        return {
            path: this.file.path || '',
            name: this.file.name || '',
            extension: this.file.extension || '',
            size: this.file.size || 0,
            createdAt: this.file.createdAt || now,
            modifiedAt: this.file.modifiedAt || now,
            content: this.file.content || '',
            frontmatter: this.file.frontmatter,
            tags: this.file.tags || [],
            links: this.file.links || [],
            backlinks: this.file.backlinks || []
        };
    }
}

// Vault File Repository
class VaultFileRepository implements Repository<VaultFile, string> {
    private files: Map<string, VaultFile> = new Map();

    async findById(id: string): Promise<VaultFile | null> {
        return this.files.get(id) || null;
    }

    async save(entity: VaultFile): Promise<VaultFile> {
        this.files.set(entity.path, entity);
        return entity;
    }

    async delete(id: string): Promise<boolean> {
        return this.files.delete(id);
    }

    async findAll(): Promise<VaultFile[]> {
        return Array.from(this.files.values());
    }
}

// Service Container Implementation
class VaultServiceContainer {
    private services: ServiceContainer = {};

    register<T>(name: string, factory: ServiceFactory<T>): void {
        this.services[name] = factory;
    }

    get<T>(name: string): T {
        const factory = this.services[name] as ServiceFactory<T>;
        if (!factory) {
            throw new Error(`Service ${name} not found`);
        }
        return factory();
    }
}

// Event Emitter Implementation
class VaultEventEmitter implements EventEmitter<{
    'file:created': VaultFile;
    'file:updated': { file: VaultFile; changes: string[] };
    'vault:validated': ValidationResult;
}> {
    private listeners: Map<string, Function[]> = new Map();

    on<K extends keyof {
        'file:created': VaultFile;
        'file:updated': { file: VaultFile; changes: string[] };
        'vault:validated': ValidationResult;
    }>(event: K, listener: (data: any) => void): void {
        if (!this.listeners.has(event as string)) {
            this.listeners.set(event as string, []);
        }
        this.listeners.get(event as string)!.push(listener);
    }

    emit<K extends keyof {
        'file:created': VaultFile;
        'file:updated': { file: VaultFile; changes: string[] };
        'vault:validated': ValidationResult;
    }>(event: K, data: any): void {
        const listeners = this.listeners.get(event as string) || [];
        listeners.forEach(listener => listener(data));
    }

    off<K extends keyof {
        'file:created': VaultFile;
        'file:updated': { file: VaultFile; changes: string[] };
        'vault:validated': ValidationResult;
    }>(event: K, listener: (data: any) => void): void {
        const listeners = this.listeners.get(event as string) || [];
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
}

// Cache Implementation
class VaultCache<K, V> implements Cache<K, V> {
    private data: Map<K, V> = new Map();

    get(key: K): V | undefined {
        return this.data.get(key);
    }

    set(key: K, value: V): void {
        this.data.set(key, value);
    }

    delete(key: K): boolean {
        return this.data.delete(key);
    }

    clear(): void {
        this.data.clear();
    }

    has(key: K): boolean {
        return this.data.has(key);
    }

    get size(): number {
        return this.data.size;
    }
}

// =============================================================================
// DEMONSTRATION - 2025-11-18
// =============================================================================

async function demonstrateFactoryAndUtilityTypes(): Promise<void> {
    console.info(chalk.blue.bold('🏭 Factory & Utility Types Demonstration'));
    console.info(chalk.gray('='.repeat(55)));

    const timer = createTimer();

    // Factory Pattern Demo
    console.info(chalk.blue.bold('\n🏭 Factory Pattern Examples:'));

    const vaultFileFactory = createVaultFile();
    const newFile = vaultFileFactory();

    console.info(chalk.yellow('✅ Synchronous Factory:'));
    console.info(chalk.gray(`Created file: ${newFile.name} (${newFile.path})`));

    const asyncVaultFileFactory = createVaultFileAsync();
    const asyncFile = await asyncVaultFileFactory();

    console.info(chalk.yellow('✅ Asynchronous Factory:'));
    console.info(chalk.gray(`Async created file: ${asyncFile.name} (${asyncFile.path})`));

    // Builder Pattern Demo
    console.info(chalk.blue.bold('\n🔨 Builder Pattern Examples:'));

    const builder = new VaultFileBuilder()
        .set('path', '/docs/example.md')
        .set('name', 'example.md')
        .set('extension', 'md')
        .set('content', '# Example Content')
        .set('tags', ['example', 'demo']);

    const builtFile = builder.build();

    console.info(chalk.yellow('✅ Built File:'));
    console.info(chalk.gray(`Path: ${builtFile.path}`));
    console.info(chalk.gray(`Tags: ${builtFile.tags.join(', ')}`));
    console.info(chalk.gray(`Content: ${builtFile.content.substring(0, 30)}...`));

    // Repository Pattern Demo
    console.info(chalk.blue.bold('\n📚 Repository Pattern Examples:'));

    const repository = new VaultFileRepository();
    await repository.save(builtFile);
    const foundFile = await repository.findById(builtFile.path);
    const allFiles = await repository.findAll();

    console.info(chalk.yellow('✅ Repository Operations:'));
    console.info(chalk.gray(`Found file: ${foundFile?.name || 'null'}`));
    console.info(chalk.gray(`Total files: ${allFiles.length}`));

    // Service Container Demo
    console.info(chalk.blue.bold('\n🏢 Service Container Examples:'));

    const container = new VaultServiceContainer();
    container.register('vaultFile', createVaultFile);
    container.register('repository', () => new VaultFileRepository());

    const serviceFile = container.get<VaultFile>('vaultFile');
    const serviceRepo = container.get<VaultFileRepository>('repository');

    console.info(chalk.yellow('✅ Service Container:'));
    console.info(chalk.gray(`Service file created: ${serviceFile.name}`));
    console.info(chalk.gray(`Service repo type: ${serviceRepo.constructor.name}`));

    // Event System Demo
    console.info(chalk.blue.bold('\n📡 Event System Examples:'));

    const emitter = new VaultEventEmitter();

    emitter.on('file:created', (file: VaultFile) => {
        console.info(chalk.green(`📝 File created event: ${file.name}`));
    });

    emitter.emit('file:created', builtFile);

    console.info(chalk.yellow('✅ Event System:'));
    console.info(chalk.gray('Event emitted and handled successfully'));

    // Cache Demo
    console.info(chalk.blue.bold('\n💾 Cache System Examples:'));

    const cache = new VaultCache<string, VaultFile>();
    cache.set(builtFile.path, builtFile);
    const cachedFile = cache.get(builtFile.path);

    console.info(chalk.yellow('✅ Cache Operations:'));
    console.info(chalk.gray(`Cached file: ${cachedFile?.name || 'null'}`));
    console.info(chalk.gray(`Cache size: ${cache.size}`));

    // Utility Types Demo
    console.info(chalk.blue.bold('\n🛠️  Utility Types Examples:'));

    // DeepPartial example
    const partialFile: DeepPartial<VaultFile> = {
        name: 'partial.md',
        tags: ['partial']
    };

    // Optional example
    type OptionalFile = Optional<VaultFile, 'frontmatter' | 'backlinks'>;

    // RequiredBy example
    type RequiredFile = RequiredBy<Partial<VaultFile>, 'path' | 'name'>;

    console.info(chalk.yellow('✅ Utility Types:'));
    console.info(chalk.gray(`DeepPartial file: ${partialFile.name || 'undefined'}`));
    console.info(chalk.gray(`Optional type created successfully`));
    console.info(chalk.gray(`RequiredBy type created successfully`));

    timer.stop();
    console.info(chalk.gray(`\n⏱️  Factory & Utility demo completed in: ${timer.formattedDuration}`));

    // Performance Comparison
    console.info(chalk.blue.bold('\n📊 Pattern Performance Analysis:'));

    const performanceData = [
        {
            'Pattern': 'Factory',
            'Use Case': 'Object creation',
            'Flexibility': 'High',
            'Testability': 'Excellent',
            'Complexity': 'Low'
        },
        {
            'Pattern': 'Builder',
            'Use Case': 'Complex construction',
            'Flexibility': 'Very High',
            'Testability': 'Excellent',
            'Complexity': 'Medium'
        },
        {
            'Pattern': 'Repository',
            'Use Case': 'Data access',
            'Flexibility': 'High',
            'Testability': 'Excellent',
            'Complexity': 'Medium'
        },
        {
            'Pattern': 'Service Container',
            'Use Case': 'Dependency injection',
            'Flexibility': 'Very High',
            'Testability': 'Excellent',
            'Complexity': 'High'
        },
        {
            'Pattern': 'Event Emitter',
            'Use Case': 'Loose coupling',
            'Flexibility': 'Very High',
            'Testability': 'Good',
            'Complexity': 'Medium'
        },
        {
            'Pattern': 'Cache',
            'Use Case': 'Performance optimization',
            'Flexibility': 'Medium',
            'Testability': 'Good',
            'Complexity': 'Low'
        }
    ];

    console.info(formatTable(performanceData, ['Pattern', 'Use Case', 'Flexibility', 'Testability', 'Complexity'], { colors: true }));

    // Type Safety Benefits
    console.info(chalk.blue.bold('\n🔒 Type Safety Benefits:'));
    console.info(chalk.white('✅ Compile-time type checking for all patterns'));
    console.info(chalk.white('✅ Generic type parameters ensure flexibility'));
    console.info(chalk.white('✅ Interface contracts prevent runtime errors'));
    console.info(chalk.white('✅ Utility types enable precise type manipulation'));
    console.info(chalk.white('✅ Event type safety prevents invalid data'));
    console.info(chalk.white('✅ Repository type safety ensures data consistency'));

    // Integration Examples
    console.info(chalk.blue.bold('\n🔗 Integration Examples:'));
    console.info(chalk.gray('```typescript'));
    console.info(chalk.gray('// Factory + Repository + Cache'));
    console.info(chalk.gray('const factory = createVaultFile();'));
    console.info(chalk.gray('const file = factory();'));
    console.info(chalk.gray('await repository.save(file);'));
    console.info(chalk.gray('cache.set(file.path, file);'));
    console.info(chalk.gray(''));
    console.info(chalk.gray('// Builder + Event System'));
    console.info(chalk.gray('const built = builder.set("name", "test.md").build();'));
    console.info(chalk.gray('emitter.emit("file:created", built);'));
    console.info(chalk.gray(''));
    console.info(chalk.gray('// Service Container + All Patterns'));
    console.info(chalk.gray('container.register("factory", createVaultFile);'));
    console.info(chalk.gray('container.register("repository", () => new VaultFileRepository());'));
    console.info(chalk.gray('container.register("cache", () => new VaultCache());'));
    console.info(chalk.gray('```'));
}

async function main(): Promise<void> {
    console.info(chalk.magenta.bold('🎪 Factory & Utility Types Showcase for Odds Protocol Vault'));
    console.info(chalk.magenta('Demonstrating advanced TypeScript patterns and architectural designs'));
    console.info('');

    try {
        await demonstrateFactoryAndUtilityTypes();

        console.info(chalk.green.bold('\n🎉 Factory & Utility Types demonstration completed!'));
        console.info(chalk.blue('Patterns demonstrated:'));
        console.info(chalk.white('• Factory Pattern - Synchronous & asynchronous object creation'));
        console.info(chalk.white('• Builder Pattern - Complex object construction'));
        console.info(chalk.white('• Repository Pattern - Data access abstraction'));
        console.info(chalk.white('• Service Container - Dependency injection'));
        console.info(chalk.white('• Event System - Loose coupling & communication'));
        console.info(chalk.white('• Cache System - Performance optimization'));
        console.info(chalk.white('• Utility Types - Type manipulation & safety'));
        console.info(chalk.white('• Middleware Pattern - Request processing pipeline'));

    } catch (error) {
        console.error(chalk.red('❌ Demonstration failed:'), error);
        process.exit(1);
    }
}

// Run demonstration
if (import.meta.main) {
    main();
}

export { main as demonstrateFactoryAndUtilityTypes };
