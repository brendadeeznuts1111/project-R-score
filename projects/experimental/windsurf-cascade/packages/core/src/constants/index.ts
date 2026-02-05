/**
 * Centralized constants for the Odds Protocol project
 * Eliminates magic numbers and provides configuration management
 */

// Network and Server Configuration
export const NETWORK_CONFIG = {
    DEFAULT_PORTS: {
        DASHBOARD: 3000,
        API_GATEWAY: 8080,
        STREAM_PROCESSOR: 8080,
        WEBSOCKET: 8080,
    },
    TIMEOUTS: {
        DEFAULT_REQUEST: 5000,
        WEBSOCKET_CONNECTION: 10000,
        API_RESPONSE: 30000,
        HEALTH_CHECK: 2000,
    },
} as const;

// Time and Duration Constants
export const TIME_CONSTANTS = {
    MILLISECONDS_PER_SECOND: 1000,
    SECONDS_PER_MINUTE: 60,
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,
    DAYS_PER_WEEK: 7,
    DAYS_PER_MONTH: 30,
    DAYS_PER_YEAR: 365,

    // Common time intervals in milliseconds
    INTERVALS: {
        ONE_SECOND: 1 * 1000,
        FIVE_SECONDS: 5 * 1000,
        TEN_SECONDS: 10 * 1000,
        THIRTY_SECONDS: 30 * 1000,
        ONE_MINUTE: 1 * 60 * 1000,
        FIVE_MINUTES: 5 * 60 * 1000,
        FIFTEEN_MINUTES: 15 * 60 * 1000,
        ONE_HOUR: 1 * 60 * 60 * 1000,
        ONE_DAY: 1 * 24 * 60 * 60 * 1000,
        ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
        TWO_WEEKS: 14 * 24 * 60 * 60 * 1000,
        THREE_WEEKS: 21 * 24 * 60 * 60 * 1000,
        ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
    },
} as const;

// Testing Configuration
export const TESTING_CONFIG = {
    TIMEOUTS: {
        UNIT_TEST: 5000,
        INTEGRATION_TEST: 10000,
        PROPERTY_TEST: 60000,
        CONCURRENT_TEST: 120000,
        PERFORMANCE_TEST: 300000,
    },
    RUNS: {
        PROPERTY_TEST_DEFAULT: 1000,
        PROPERTY_TEST_EDGE_CASES: 500,
        PROPERTY_TEST_VALIDATION: 300,
    },
} as const;

// Business Logic Constants
export const BUSINESS_CONFIG = {
    ODDS: {
        MINIMUM_ODDS: 1.01,
        MAXIMUM_ODDS: 1000,
        VALIDATION_RANGE: { min: 1.1, max: 10 },
        EDGE_CASE_RANGE: { min: 1.01, max: 100 },
    },
    STAKE: {
        MINIMUM_STAKE: 1,
        MAXIMUM_STAKE: 100000,
        DEFAULT_STAKE_RANGE: { min: 10, max: 10000 },
        VALIDATION_STAKE_RANGE: { min: 100, max: 10000 },
    },
    ARBITRAGE: {
        MINIMUM_PROFIT_MARGIN: 0.01,
        DEFAULT_UPDATE_INTERVAL: 5000, // 5 seconds
    },
} as const;

// Performance and Resource Management
export const PERFORMANCE_CONFIG = {
    CACHE: {
        DEFAULT_MAX_SIZE: 100,
        DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    },
    MEMORY: {
        WARNING_THRESHOLD_MB: 100,
        CRITICAL_THRESHOLD_MB: 500,
        MONITORING_INTERVAL: 30000, // 30 seconds
    },
    CONCURRENT: {
        DEFAULT_WORKERS: 4,
        MAX_CONCURRENT_OPERATIONS: 10,
        BATCH_SIZE: 100,
    },
} as const;

// Validation Rules
export const VALIDATION_CONFIG = {
    TIMESTAMP: {
        ISO_FORMAT_REGEX: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
        FUTURE_TOLERANCE_MS: 60000, // 1 minute
        PAST_TOLERANCE_MS: 24 * 60 * 60 * 1000, // 24 hours
    },
    MARKET_DATA: {
        MAX_PRICE_DECIMALS: 2,
        MAX_VOLUME_DECIMALS: 8,
        MIN_UPDATE_FREQUENCY_MS: 1000,
    },
} as const;

// Error Codes
export const ERROR_CODES = {
    NETWORK: {
        CONNECTION_FAILED: 'NET_001',
        TIMEOUT: 'NET_002',
        UNAUTHORIZED: 'NET_003',
    },
    VALIDATION: {
        INVALID_ODDS: 'VAL_001',
        INVALID_STAKE: 'VAL_002',
        INVALID_TIMESTAMP: 'VAL_003',
        INVALID_MARKET_DATA: 'VAL_004',
    },
    BUSINESS_LOGIC: {
        NO_ARBITRAGE: 'BIZ_001',
        INSUFFICIENT_LIQUIDITY: 'BIZ_002',
        MARKET_CLOSED: 'BIZ_003',
    },
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
    ENABLE_CONCURRENT_TESTING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ADVANCED_VALIDATION: true,
    ENABLE_WEBSOCKET_V13: true,
    ENABLE_PROPERTY_BASED_TESTING: true,
} as const;

// Environment-specific configurations
export const ENVIRONMENT_CONFIG = {
    development: {
        LOG_LEVEL: 'debug',
        ENABLE_MOCK_APIS: true,
        CACHE_TTL: 60000, // 1 minute
    },
    production: {
        LOG_LEVEL: 'error',
        ENABLE_MOCK_APIS: false,
        CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    },
    test: {
        LOG_LEVEL: 'silent',
        ENABLE_MOCK_APIS: true,
        CACHE_TTL: 1000, // 1 second
    },
} as const;

// Helper functions for common calculations
export const TimeHelpers = {
    minutesToMs: (minutes: number): number => minutes * TIME_CONSTANTS.MILLISECONDS_PER_SECOND * TIME_CONSTANTS.SECONDS_PER_MINUTE,
    hoursToMs: (hours: number): number => hours * TimeHelpers.minutesToMs(TIME_CONSTANTS.MINUTES_PER_HOUR),
    daysToMs: (days: number): number => days * TimeHelpers.hoursToMs(TIME_CONSTANTS.HOURS_PER_DAY),
    weeksToMs: (weeks: number): number => weeks * TimeHelpers.daysToMs(TIME_CONSTANTS.DAYS_PER_WEEK),

    addMinutes: (timestamp: number, minutes: number): number => timestamp + TimeHelpers.minutesToMs(minutes),
    addHours: (timestamp: number, hours: number): number => timestamp + TimeHelpers.hoursToMs(hours),
    addDays: (timestamp: number, days: number): number => timestamp + TimeHelpers.daysToMs(days),
} as const;

// Default configurations that can be overridden
export const DEFAULT_CONFIG = {
    ...NETWORK_CONFIG,
    ...TIME_CONSTANTS,
    ...TESTING_CONFIG,
    ...BUSINESS_CONFIG,
    ...PERFORMANCE_CONFIG,
    ...VALIDATION_CONFIG,
} as const;
