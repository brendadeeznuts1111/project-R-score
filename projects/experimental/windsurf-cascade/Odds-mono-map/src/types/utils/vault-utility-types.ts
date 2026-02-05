// =============================================================================
// VAULT UTILITY TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Utility type definitions extracted from monolithic file
// =============================================================================

import { VaultEvent } from '../monitoring/vault-monitoring-types';
import { ValidationError } from '../validation/vault-validation-types';

// =============================================================================
// [UTILITY_TYPES] - 2025-11-19
// =============================================================================

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = {
    [P in K]-?: T[P];
} & {
    [P in Exclude<keyof T, K>]?: T[P];
};

export type OptionalFields<T, K extends keyof T> = {
    [P in K]+?: T[P];
} & {
    [P in Exclude<keyof T, K>]?: T[P];
};

export type ReadOnly<T> = {
    readonly [P in keyof T]: T[P];
};

export type WriteOnly<T> = {
    -readonly [P in keyof T]: T[P];
};

// =============================================================================
// [COLLECTION_TYPES] - 2025-11-19
// =============================================================================

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface SortedResult<T> {
    items: T[];
    sortBy: keyof T;
    direction: 'asc' | 'desc';
}

export interface FilteredResult<T> {
    items: T[];
    filters: FilterCriteria[];
    totalBeforeFilter: number;
}

export interface FilterCriteria {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
    value: unknown;
}

// =============================================================================
// [ASYNC_TYPES] - 2025-11-19
// =============================================================================

export interface AsyncResult<T, E = Error> {
    data?: T;
    error?: E;
    loading: boolean;
    completed: boolean;
}

export interface PromiseWithStatus<T> extends Promise<T> {
    status: 'pending' | 'fulfilled' | 'rejected';
    value?: T;
    reason?: unknown;
}

export interface AsyncIterator<T> {
    next(): Promise<IteratorResult<T>>;
    return?(value?: any): Promise<IteratorResult<T>>;
    throw?(e?: any): Promise<IteratorResult<T>>;
}

// =============================================================================
// [EVENT_TYPES] - 2025-11-19
// =============================================================================

export interface EventEmitter<T = Record<string, unknown>> {
    on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
    off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
    emit<K extends keyof T>(event: K, data: T[K]): void;
    once<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
}

export interface EventSubscription {
    id: string;
    event: string;
    handler: Function;
    active: boolean;
    createdAt: Date;
}

export interface EventHistory {
    events: VaultEvent[];
    filters: EventFilter[];
    maxSize: number;
}

export interface EventFilter {
    type: string;
    source?: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
    metadata?: Record<string, unknown>;
}

// =============================================================================
// [CACHE_TYPES] - 2025-11-19
// =============================================================================

export interface Cache<K, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): boolean;
    clear(): void;
    has(key: K): boolean;
    size(): number;
}

export interface LRUCache<K, V> extends Cache<K, V> {
    maxSize: number;
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export interface CacheEntry<V> {
    value: V;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    ttl?: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    hitRate: number;
    size: number;
}

// =============================================================================
// [SERIALIZATION_TYPES] - 2025-11-19
// =============================================================================

export interface Serializable {
    serialize(): string;
    deserialize(data: string): void;
}

export interface JsonSerializer<T> {
    serialize(object: T): string;
    deserialize(json: string): T;
}

export interface SerializationOptions {
    format: 'json' | 'yaml' | 'toml' | 'custom';
    pretty: boolean;
    indent: number;
    sortKeys: boolean;
}

// =============================================================================
// [COMPARISON_TYPES] - 2025-11-19
// =============================================================================

export interface Comparable<T> {
    compare(other: T): number;
    equals(other: T): boolean;
}

export interface Sortable<T> {
    sortBy: keyof T;
    direction: 'asc' | 'desc';
    comparator?: (a: T, b: T) => number;
}

export interface DiffResult<T> {
    added: T[];
    removed: T[];
    modified: ModifiedItem<T>[];
    unchanged: T[];
}

export interface ModifiedItem<T> {
    item: T;
    changes: ChangeRecord[];
}

export interface ChangeRecord {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    changeType: 'add' | 'remove' | 'modify';
}

// =============================================================================
// [FUNCTION_TYPES] - 2025-11-19
// =============================================================================

export interface DebouncedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): ReturnType<T> | undefined;
    pending(): boolean;
}

export interface ThrottledFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
}

export interface MemoizedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    clear(): void;
    delete(...args: Parameters<T>): boolean;
    has(...args: Parameters<T>): boolean;
}

// =============================================================================
// [VALIDATION_UTIL_TYPES] - 2025-11-19
// =============================================================================

export interface Validator<T> {
    validate(value: unknown): ValidationResult<T>;
}

export interface ValidationResult<T> {
    valid: boolean;
    value?: T;
    errors: ValidationError[];
}

export interface Schema<T> {
    parse(value: unknown): T;
    safeParse(value: unknown): ValidationResult<T>;
}

export interface TypeGuard<T> {
    (value: unknown): value is T;
}

// =============================================================================
// [PERFORMANCE_TYPES] - 2025-11-19
// =============================================================================

export interface PerformanceTimer {
    start(): void;
    stop(): number;
    elapsed(): number;
    reset(): void;
}

export interface PerformanceMetrics {
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
    operationsPerSecond: number;
}

export interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    standardDeviation: number;
}
