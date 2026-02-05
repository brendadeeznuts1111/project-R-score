/**
 * Configuration types for NBA Swarm system
 */

/**
 * Edge builder configuration
 */
export interface EdgeConfig {
  /** Minimum cosine similarity threshold for edge creation */
  minSimilarityThreshold: number;
  /** High similarity threshold for special handling (e.g., green-flash) */
  highSimilarityThreshold: number;
  /** Minimum weight threshold for edge inclusion */
  minWeightThreshold: number;
  /** Enable adaptive threshold adjustment */
  adaptiveThresholds: boolean;
  /** Statistical significance threshold (p-value) */
  significanceThreshold: number;
  /** Enable graph pruning for dense graphs */
  enablePruning: boolean;
  /** Maximum edges per node (for pruning) */
  maxEdgesPerNode?: number;
  /** Batch size for processing large graphs */
  batchSize?: number;
}

/**
 * Radar configuration
 */
export interface RadarConfig {
  /** WebSocket server port */
  port: number;
  /** League filter (NBA, MLB, NFL, etc.) */
  league?: string;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
  /** Maximum concurrent connections */
  maxConnections: number;
  /** Enable auto-reconnection */
  autoReconnect: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay: number;
  /** Enable health check endpoint */
  enableHealthCheck: boolean;
  /** Broadcast queue size */
  broadcastQueueSize: number;
}

/**
 * Ledger configuration
 */
export interface LedgerConfig {
  /** Compression level (0-9) */
  compressionLevel: number;
  /** Retention period in hours */
  retentionHours: number;
  /** Binary format version */
  formatVersion: number;
  /** Enable integrity checksums */
  enableChecksums: boolean;
  /** Chunk size for batch writes */
  chunkSize: number;
}

/**
 * Hedger configuration
 */
export interface HedgerConfig {
  /** Minimum edge similarity for quotes */
  minSimilarityForQuote: number;
  /** Minimum edge weight for quotes */
  minWeightForQuote: number;
  /** Quote calculation method (middle, average, etc.) */
  quoteMethod: "middle" | "average" | "weighted";
  /** Maximum quote size */
  maxQuoteSize: number;
  /** Circuit breaker threshold */
  circuitBreakerThreshold: number;
  /** Rate limit per second */
  rateLimit: number;
  /** Enable latency monitoring */
  enableLatencyMonitoring: boolean;
  /** Target latency in microseconds */
  targetLatencyMicroseconds: number;
}

/**
 * System configuration
 */
export interface SystemConfig {
  edge: EdgeConfig;
  radar: RadarConfig;
  ledger: LedgerConfig;
  hedger: HedgerConfig;
  /** Feature flags */
  features: {
    /** Enable VR export */
    vrExport: boolean;
    /** Enable auto-hedging */
    autoHedging: boolean;
    /** Enable performance monitoring */
    performanceMonitoring: boolean;
    /** Enable multi-sport support */
    multiSport: boolean;
  };
  /** Logging configuration */
  logging: {
    level: "debug" | "info" | "warn" | "error";
    enableFileOutput: boolean;
    filePath?: string;
  };
}

/**
 * Load configuration from file or use defaults
 */
export function loadConfig(overrides?: Partial<SystemConfig>): SystemConfig {
  const defaultConfig: SystemConfig = {
    edge: {
      minSimilarityThreshold: 0.3,
      highSimilarityThreshold: 0.7,
      minWeightThreshold: 0.8,
      adaptiveThresholds: false,
      significanceThreshold: 0.05,
      enablePruning: true,
      maxEdgesPerNode: 100,
      batchSize: 50,
    },
    radar: {
      port: 3333,
      heartbeatInterval: 30000,
      maxConnections: 1000,
      autoReconnect: true,
      reconnectDelay: 1000,
      enableHealthCheck: true,
      broadcastQueueSize: 10000,
    },
    ledger: {
      compressionLevel: 9,
      retentionHours: 24,
      formatVersion: 1,
      enableChecksums: true,
      chunkSize: 1000,
    },
    hedger: {
      minSimilarityForQuote: 0.7,
      minWeightForQuote: 0.8,
      quoteMethod: "middle",
      maxQuoteSize: 1000000,
      circuitBreakerThreshold: 100,
      rateLimit: 1000,
      enableLatencyMonitoring: true,
      targetLatencyMicroseconds: 300,
    },
    features: {
      vrExport: false,
      autoHedging: true,
      performanceMonitoring: true,
      multiSport: false,
    },
    logging: {
      level: "info",
      enableFileOutput: false,
    },
  };

  return deepMerge(defaultConfig, overrides || {});
}

/**
 * Deep merge utility for configuration
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (source[key] !== undefined) {
      result[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return result;
}

