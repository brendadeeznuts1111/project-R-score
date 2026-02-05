// Core constants for Odds Protocol

/**
 * Default configuration values
 */
export const DEFAULTS = {
  // WebSocket server
  WS_PORT: 3000,
  WS_MAX_PAYLOAD: 2 * 1024 * 1024, // 2MB
  WS_IDLE_TIMEOUT: 30, // seconds
  WS_BACKPRESSURE_LIMIT: 512 * 1024, // 512KB
  
  // Arbitrage detection
  ARB_EDGE_THRESHOLD: 0.02, // 2% minimum edge
  ARB_KELLY_FRACTION: 0.25, // Maximum bankroll allocation
  ARB_EXPIRY_MS: 30000, // 30 seconds
  
  // Sharp detection
  SHARP_CONFIDENCE_THRESHOLD: 0.8,
  SHARP_VOLUME_IMBALANCE_THRESHOLD: 2.0, // 2x normal volume
  SHARP_ANOMALY_THRESHOLD: 0.7,
  
  // Processing
  BATCH_SIZE: 100,
  PROCESSING_TIMEOUT: 5000, // 5 seconds
  MAX_RETRIES: 3,
} as const;

/**
 * Sports-specific configurations
 */
export const SPORTS_CONFIG = {
  nba: {
    marketHours: {
      open: '12:00', // 12 PM EST
      close: '01:00', // 1 AM EST next day
      timezone: 'America/New_York'
    },
    typicalTotals: { min: 180, max: 250 },
    typicalJuice: { min: -130, max: 110 }
  },
  nfl: {
    marketHours: {
      open: '13:00', // 1 PM EST
      close: '23:00', // 11 PM EST
      timezone: 'America/New_York'
    },
    typicalTotals: { min: 30, max: 60 },
    typicalJuice: { min: -120, max: 100 }
  },
  'premier-league': {
    marketHours: {
      open: '07:00', // 7 AM EST
      close: '17:00', // 5 PM EST  
      timezone: 'Europe/London'
    },
    typicalTotals: { min: 1.5, max: 4.5 },
    typicalJuice: { min: -125, max: 105 }
  }
} as const;

/**
 * Exchange-specific identifiers and limits
 */
export const EXCHANGE_CONFIG = {
  draftkings: {
    rateLimit: 100, // requests per second
    maxConnections: 10,
    supportedSports: ['nba', 'nfl', 'mlb', 'nhl'] as const
  },
  fanduel: {
    rateLimit: 90,
    maxConnections: 8,
    supportedSports: ['nba', 'nfl', 'mlb', 'nhl'] as const
  },
  mgm: {
    rateLimit: 80,
    maxConnections: 6,
    supportedSports: ['nba', 'nfl', 'mlb'] as const
  },
  pointsbet: {
    rateLimit: 70,
    maxConnections: 5,
    supportedSports: ['nba', 'nfl'] as const
  },
  caesars: {
    rateLimit: 60,
    maxConnections: 4,
    supportedSports: ['nba', 'nfl'] as const
  }
} as const;

/**
 * Error codes and messages
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_ODDS_FORMAT: 'INVALID_ODDS_FORMAT',
  OUTDATED_TICK: 'OUTDATED_TICK',
  
  // WebSocket errors
  WS_BACKPRESSURE: 'WS_BACKPRESSURE',
  WS_INVALID_MESSAGE: 'WS_INVALID_MESSAGE',
  WS_RATE_LIMITED: 'WS_RATE_LIMITED',
  
  // Processing errors
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  ARBITRAGE_EXPIRED: 'ARBITRAGE_EXPIRED',
  SHARP_DETECTION_FAILED: 'SHARP_DETECTION_FAILED',
  
  // System errors
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // WebSocket performance
  MAX_LATENCY_MS: 50,
  MIN_THROUGHPUT_MPS: 100000, // 100k msg/sec
  MAX_MEMORY_MB: 512,
  
  // Processing performance
  ARB_DETECTION_MS: 10,
  SHARP_DETECTION_MS: 25,
  VALIDATION_MS: 1,
  
  // System performance
  CPU_THRESHOLD: 0.8, // 80% max CPU
  MEMORY_THRESHOLD: 0.9, // 90% max memory
} as const;
