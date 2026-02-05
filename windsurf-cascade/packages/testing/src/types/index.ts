// Testing Type Definitions
// Common types used across the testing infrastructure

// Re-export core types from odds-core for convenience
export type {
    OddsTick,
    ArbitrageOpportunity,
    WebSocketMessage,
    MarketData
} from '@odds-core/types';

// ===== TESTING INFRASTRUCTURE TYPES =====

/**
 * Performance measurement metrics
 */
export interface PerformanceMetrics {
    /** Duration in milliseconds */
    duration: number;
    /** Number of operations performed */
    operations?: number;
    /** Memory usage in bytes */
    memory?: number;
    /** Operations per second */
    throughput?: number;
    /** Timestamp when measurement was taken */
    timestamp: number;
}

/**
 * Test result information
 */
export interface TestResult {
    /** Test name */
    name: string;
    /** Whether test passed */
    passed: boolean;
    /** Test duration in milliseconds */
    duration: number;
    /** Error message if failed */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Contract test validation result
 */
export interface ContractValidationResult {
    /** Whether validation passed */
    valid: boolean;
    /** List of validation errors */
    errors: string[];
    /** Warnings (non-critical issues) */
    warnings: string[];
    /** Validation timestamp */
    timestamp: string;
}

/**
 * Test scenario configuration
 */
export interface TestScenarioConfig {
    /** Number of test items to generate */
    itemCount: number;
    /** Time interval between items (ms) */
    interval?: number;
    /** Number of concurrent users/clients */
    concurrency?: number;
    /** Test duration in milliseconds */
    duration?: number;
    /** Custom data generators */
    dataGenerators?: Record<string, Function>;
}

/**
 * Mock server configuration
 */
export interface MockServerConfig {
    /** Server port */
    port: number;
    /** Host address */
    host?: string;
    /** Maximum number of connections */
    maxConnections?: number;
    /** Enable latency simulation */
    simulateLatency?: boolean;
    /** Latency range in milliseconds */
    latencyRange?: [number, number];
    /** Enable error simulation */
    simulateErrors?: boolean;
    /** Error rate (0-1) */
    errorRate?: number;
}

/**
 * WebSocket test client configuration
 */
export interface WebSocketTestClientConfig {
    /** Server URL */
    url: string;
    /** Auto-connect on creation */
    autoConnect?: boolean;
    /** Connection timeout in milliseconds */
    timeout?: number;
    /** Reconnect automatically */
    autoReconnect?: boolean;
    /** Maximum reconnection attempts */
    maxReconnectAttempts?: number;
}

/**
 * API test client configuration
 */
export interface APITestClientConfig {
    /** Base URL */
    baseUrl: string;
    /** Default timeout in milliseconds */
    timeout?: number;
    /** Default headers */
    headers?: Record<string, string>;
    /** Enable request/response logging */
    logging?: boolean;
    /** Retry configuration */
    retry?: {
        maxAttempts: number;
        delay: number;
        backoff: 'linear' | 'exponential';
    };
}

// ===== DATA GENERATION TYPES =====

/**
 * Factory options for data generation
 */
export interface FactoryOptions {
    /** Fixed seed for reproducible data */
    seed?: number;
    /** Locale for localized data */
    locale?: string;
    /** Custom field overrides */
    overrides?: Record<string, any>;
}

/**
 * Batch generation configuration
 */
export interface BatchGenerationConfig {
    /** Number of items to generate */
    count: number;
    /** Whether to make items unique */
    unique?: boolean;
    /** Field to ensure uniqueness on */
    uniqueField?: string;
    /** Custom validation function */
    validator?: (item: any) => boolean;
}

// ===== PERFORMANCE TESTING TYPES =====

/**
 * Performance benchmark configuration
 */
export interface BenchmarkConfig {
    /** Number of iterations */
    iterations: number;
    /** Warmup iterations */
    warmup: number;
    /** Minimum acceptable operations per second */
    minOpsPerSec?: number;
    /** Maximum acceptable duration in milliseconds */
    maxDuration?: number;
    /** Memory threshold in bytes */
    memoryThreshold?: number;
}

/**
 * Load testing configuration
 */
export interface LoadTestConfig {
    /** Number of concurrent users */
    concurrentUsers: number;
    /** Test duration */
    duration: string; // e.g., "30s", "5m"
    /** Ramp up period */
    rampUp: string;
    /** Target requests per second */
    targetRPS?: number;
    /** Step configuration for gradual load increase */
    step?: {
        users: number;
        duration: string;
        interval: string;
    };
}

// ===== CONTRACT TESTING TYPES =====

/**
 * Schema definition for contract testing
 */
export interface SchemaDefinition {
    /** Schema type */
    type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    /** Required fields */
    required?: string[];
    /** Property definitions */
    properties?: Record<string, SchemaDefinition>;
    /** Array item schema */
    items?: SchemaDefinition;
    /** Enum values */
    enum?: any[];
    /** Format string (for validation) */
    format?: string;
    /** Minimum value (for numbers) */
    minimum?: number;
    /** Maximum value (for numbers) */
    maximum?: number;
    /** Minimum length (for strings/arrays) */
    minLength?: number;
    /** Maximum length (for strings/arrays) */
    maxLength?: number;
}

/**
 * Contract test case definition
 */
export interface ContractTestCase {
    /** Test case name */
    name: string;
    /** Test description */
    description: string;
    /** Input data */
    input: any;
    /** Expected output */
    expected: any;
    /** Schema to validate against */
    schema?: SchemaDefinition;
    /** Custom validation function */
    validator?: (result: any) => ContractValidationResult;
}

/**
 * Contract test suite configuration
 */
export interface ContractTestSuite {
    /** Suite name */
    name: string;
    /** Test description */
    description: string;
    /** Test cases */
    testCases: ContractTestCase[];
    /** Setup function */
    setup?: () => Promise<void> | void;
    /** Teardown function */
    teardown?: () => Promise<void> | void;
    /** Suite timeout in milliseconds */
    timeout?: number;
}

// ===== ASSERTION TYPES =====

/**
 * Custom assertion function type
 */
export type AssertionFunction = (actual: any, expected: any, message?: string) => void;

/**
 * Assertion result
 */
export interface AssertionResult {
    /** Whether assertion passed */
    passed: boolean;
    /** Error message if failed */
    message?: string;
    /** Expected value */
    expected?: any;
    /** Actual value */
    actual?: any;
}

/**
 * Domain-specific assertion configuration
 */
export interface DomainAssertionConfig {
    /** Assertion name */
    name: string;
    /** Assertion function */
    assert: AssertionFunction;
    /** Default error message */
    message?: string;
    /** Whether to include values in error message */
    includeValues?: boolean;
}

// ===== MOCK TYPES =====

/**
 * Mock response configuration
 */
export interface MockResponseConfig {
    /** HTTP status code */
    status: number;
    /** Response body */
    body: any;
    /** Response headers */
    headers?: Record<string, string>;
    /** Response delay in milliseconds */
    delay?: number;
    /** Whether to fail randomly */
    randomFailure?: boolean;
    /** Failure rate (0-1) */
    failureRate?: number;
}

/**
 * Mock endpoint configuration
 */
export interface MockEndpointConfig {
    /** Endpoint path */
    path: string;
    /** HTTP method */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /** Response configuration */
    response: MockResponseConfig | ((request: any) => MockResponseConfig);
    /** Request validator */
    validator?: (request: any) => boolean;
}

// ===== UTILITY TYPES =====

/**
 * Deep partial type (useful for test data overrides)
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Test environment configuration
 */
export interface TestEnvironmentConfig {
    /** Environment name */
    name: string;
    /** Environment variables */
    env?: Record<string, string>;
    /** Database configuration */
    database?: {
        url: string;
        migrations?: string[];
        seeds?: string[];
    };
    /** External service mocks */
    services?: Record<string, MockEndpointConfig[]>;
    /** Feature flags */
    features?: Record<string, boolean>;
}

/**
 * Test execution context
 */
export interface TestContext {
    /** Test name */
    testName: string;
    /** Test file path */
    testFile: string;
    /** Current test environment */
    environment: TestEnvironmentConfig;
    /** Test start timestamp */
    startTime: number;
    /** Test metadata */
    metadata: Record<string, any>;
}

// Export all types for external use
export type {
    PerformanceMetrics,
    TestResult,
    ContractValidationResult,
    TestScenarioConfig,
    MockServerConfig,
    WebSocketTestClientConfig,
    APITestClientConfig,
    FactoryOptions,
    BatchGenerationConfig,
    BenchmarkConfig,
    LoadTestConfig,
    SchemaDefinition,
    ContractTestCase,
    ContractTestSuite,
    AssertionFunction,
    AssertionResult,
    DomainAssertionConfig,
    MockResponseConfig,
    MockEndpointConfig,
    DeepPartial,
    TestEnvironmentConfig,
    TestContext
};
