/**
 * Common type definitions to replace 'any' types
 * Provides type safety for common patterns throughout the application
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
    data: T;
    success: boolean;
    message?: string;
    errors?: string[];
    timestamp: string;
}

// WebSocket message structure
export interface WebSocketMessage<T = unknown> {
    type: string;
    data: T;
    timestamp: number;
    sequence?: number;
    id?: string;
}

// Market data types
export interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    timestamp: number;
    exchange: string;
    bid?: number;
    ask?: number;
}

// Odds data types
export interface OddsData {
    symbol: string;
    american: number;
    decimal: number;
    implied: number;
    timestamp: number;
    bookmaker: string;
}

// Arbitrage opportunity types
export interface ArbitrageOpportunity {
    id: string;
    symbol: string;
    exchange1: string;
    exchange2: string;
    price1: number;
    price2: number;
    profit: number;
    confidence: number;
    timestamp: number;
    edge: number;
    kellyFraction?: number;
}

// Validation result types
export interface ValidationResult<T = unknown> {
    isValid: boolean;
    data?: T;
    errors?: string[];
    warnings?: string[];
}

// Error types
export interface AppError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    stack?: string;
}

// Configuration types
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
}

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
}

export interface ServerConfig {
    port: number;
    host?: string;
    cors?: {
        origin: string[];
        credentials: boolean;
    };
    rateLimit?: {
        windowMs: number;
        max: number;
    };
}

// Event types
export interface DomainEvent<T = unknown> {
    type: string;
    data: T;
    timestamp: number;
    aggregateId?: string;
    version?: number;
}

// Pagination types
export interface PaginationParams {
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

// Cache types
export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    key: string;
}

// Performance monitoring types
export interface PerformanceMetrics {
    operation: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

// Health check types
export interface HealthCheck {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    checks: Record<string, {
        status: 'pass' | 'fail' | 'warn';
        message?: string;
        duration?: number;
    }>;
}

// Type guards
export function isWebSocketMessage(obj: unknown): obj is WebSocketMessage {
    return typeof obj === 'object' &&
        obj !== null &&
        'type' in obj &&
        'data' in obj &&
        'timestamp' in obj;
}

export function isMarketData(obj: unknown): obj is MarketData {
    return typeof obj === 'object' &&
        obj !== null &&
        'symbol' in obj &&
        'price' in obj &&
        'volume' in obj &&
        'timestamp' in obj &&
        'exchange' in obj;
}

export function isOddsData(obj: unknown): obj is OddsData {
    return typeof obj === 'object' &&
        obj !== null &&
        'symbol' in obj &&
        'american' in obj &&
        'decimal' in obj &&
        'implied' in obj &&
        'timestamp' in obj &&
        'bookmaker' in obj;
}

// Utility types for better type safety
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
