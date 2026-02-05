/**
 * Constants for NBA Swarm system
 * 
 * Centralized constants for maintainability and consistency
 */

/**
 * SharpVector dimension count
 */
export const SHARP_VECTOR_DIMENSIONS = 14;

/**
 * Default similarity thresholds
 */
export const DEFAULT_MIN_SIMILARITY = 0.3;
export const DEFAULT_HIGH_SIMILARITY = 0.7;
export const DEFAULT_MIN_WEIGHT = 0.8;

/**
 * Precision constants
 */
export const FLOAT64_EPSILON = Number.EPSILON;
export const DRIFT_TOLERANCE = 1e-5;

/**
 * Performance targets
 */
export const TARGET_LATENCY_MS = 1.0;
export const TARGET_LATENCY_MICROSECONDS = 300;
export const TARGET_PAIR_PROCESSING_NS = 200; // 0.2µs = 200ns

/**
 * Graph size limits
 */
export const MAX_GRAPH_SIZE = 10000;
export const MAX_EDGES_PER_NODE = 100;
export const DENSE_GRAPH_THRESHOLD = 500;

/**
 * Ledger constants
 */
export const LEDGER_EDGE_SIZE = 8; // bytes: u16 + u16 + f32
export const LEDGER_TIMESTAMP_SIZE = 4; // bytes: u32
export const LEDGER_TOTAL_EDGE_SIZE = 12; // 8 + 4 for timestamp

/**
 * Statistical constants
 */
export const DEFAULT_SIGNIFICANCE_LEVEL = 0.05;
export const MIN_SAMPLE_SIZE = 3;

/**
 * Validation constants
 */
export const MAX_VECTOR_VALUE = 1e6;
export const MIN_VECTOR_VALUE = -1e6;
export const MIN_VOLUME = 0;

/**
 * Time constants (in milliseconds)
 */
export const ONE_HOUR_MS = 3600000;
export const ONE_DAY_MS = 86400000;
export const TWENTY_FOUR_HOURS_MS = ONE_DAY_MS;

/**
 * WebSocket constants
 */
export const DEFAULT_HEARTBEAT_INTERVAL = 30000;
export const DEFAULT_RECONNECT_DELAY = 1000;
export const MAX_CONNECTIONS = 1000;

/**
 * Compression constants
 */
export const MAX_COMPRESSION_LEVEL = 9;
export const EXPECTED_COMPRESSION_RATIO = 0.057; // 120MB / 2.1GB ≈ 0.057

/**
 * Circuit breaker constants
 */
export const CIRCUIT_BREAKER_AUTO_CLOSE_MS = 60000; // 60 seconds

/**
 * Ledger pruning constants
 */
export const LEDGER_PRUNE_THRESHOLD = 1000; // Prune when edge count exceeds this

/**
 * Edge processing time window (milliseconds)
 */
export const EDGE_TIME_WINDOW_MS = 60000; // Last minute

