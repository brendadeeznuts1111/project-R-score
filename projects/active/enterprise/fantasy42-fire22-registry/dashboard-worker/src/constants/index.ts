/**
 * 🔧 Fire22 Dashboard - Unified Constants
 * Single source of truth for all system constants
 */

// === DATABASE CONSTANTS ===
export const DATABASE = {
  // Connection settings
  CONNECTION: {
    DEFAULT_PATH: './dashboard.db',
    BACKUP_PATH: './backups/',
    CONNECTION_TIMEOUT: 5000,
    QUERY_TIMEOUT: 30000,
    MAX_CONNECTIONS: 10,
    SCHEMA_VERSION: '1.0.0',
  },

  // Required tables
  REQUIRED_TABLES: ['customers', 'transactions', 'bets', 'agents', 'wagers'],

  // Entity status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
  },

  // Transaction types
  TRANSACTION_TYPES: {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    WAGER: 'wager',
    WIN: 'win',
    LOSS: 'loss',
    BONUS: 'bonus',
    ADJUSTMENT: 'adjustment',
    PAYOUT: 'payout',
    REFUND: 'refund',
  },

  // Wager statuses
  WAGER_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    WON: 'won',
    LOST: 'lost',
    CANCELLED: 'cancelled',
    VOIDED: 'voided',
    SETTLED: 'settled',
    PUSHED: 'pushed',
  },

  // Bet types
  BET_TYPES: {
    MONEYLINE: 'moneyline',
    SPREAD: 'spread',
    TOTAL: 'total',
    PROP: 'prop',
    PARLAY: 'parlay',
    TEASER: 'teaser',
    FUTURE: 'future',
    LIVE: 'live',
  },
} as const;

// === SPORTS CONSTANTS ===
export const SPORTS = {
  TYPES: {
    FOOTBALL: 'football',
    BASKETBALL: 'basketball',
    BASEBALL: 'baseball',
    SOCCER: 'soccer',
    TENNIS: 'tennis',
    GOLF: 'golf',
    RACING: 'racing',
    ESPORTS: 'esports',
  },

  LEAGUES: {
    NFL: 'NFL',
    NBA: 'NBA',
    MLB: 'MLB',
    NHL: 'NHL',
    NCAA_FB: 'NCAAFB',
    NCAA_BB: 'NCAABB',
    EPL: 'EPL',
    ATP: 'ATP',
    PGA: 'PGA',
  },

  EVENT_STATUS: {
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    POSTPONED: 'postponed',
  },

  MARKET_STATUS: {
    OPEN: 'open',
    CLOSED: 'closed',
    SUSPENDED: 'suspended',
  },
} as const;

// === BUSINESS CONSTANTS ===
export const BUSINESS = {
  // Agent hierarchy levels
  AGENT_LEVELS: {
    SUPER_AGENT: 1,
    MASTER_AGENT: 2,
    AGENT: 3,
    SUB_AGENT: 4,
    PLAYER: 5,
  },

  // Customer tiers
  CUSTOMER_TIERS: {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
    VIP: 'vip',
  },

  // Risk levels
  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  // Commission calculation
  COMMISSION: {
    DEFAULT_RATE: 0.05,
    MIN_RATE: 0.01,
    MAX_RATE: 0.2,
    PAYOUT_SCHEDULE: {
      WEEKLY: 'weekly',
      BIWEEKLY: 'biweekly',
      MONTHLY: 'monthly',
    },
  },
} as const;

// === API CONSTANTS ===
export const API = {
  VERSION: 'v1',
  BASE_PATH: '/api',

  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',

    // Core entities
    AGENTS: '/agents',
    CUSTOMERS: '/customers',
    WAGERS: '/wagers',
    TRANSACTIONS: '/transactions',
    REPORTS: '/reports',

    // System
    HEALTH: '/health',
    STATUS: '/system/status',
    DIAGNOSTICS: '/docs/diagnostics',
  },

  // HTTP status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
  },

  // Default values
  DEFAULTS: {
    AGENT_ID: 'BLAKEPPH',
    MASTER_AGENT: 'BLAKEPPH',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    MAX_CONCURRENT: 10,
  },
} as const;

// === SERVER CONSTANTS ===
export const SERVER = {
  DEFAULT_PORT: 4000,
  FALLBACK_PORTS: [4001, 4002, 4003],
  MAX_REQUEST_SIZE: '1mb',

  RATE_LIMIT: {
    WINDOW_MS: 60000,
    MAX_REQUESTS: 100,
  },

  CORS: {
    ORIGIN:
      process.env.NODE_ENV === 'production'
        ? ['https://fire22.com', 'https://dashboard.fire22.com']
        : ['http://localhost:3000', 'http://localhost:4000', 'http://127.0.0.1:4000'],
  },
} as const;

// === SECURITY CONSTANTS ===
export const SECURITY = {
  JWT: {
    EXPIRY: '24h',
    REFRESH_EXPIRY: '7d',
    ALGORITHM: 'HS256',
  },

  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false,
  },

  SESSION: {
    TIMEOUT: 3600000, // 1 hour
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 900000, // 15 minutes
  },

  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
  },
} as const;

// === VALIDATION CONSTANTS ===
export const VALIDATION = {
  CUSTOMER_ID: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z0-9]+$/,
  },

  AMOUNT: {
    MIN: 0.01,
    MAX: 100000,
    DECIMAL_PLACES: 2,
  },

  ODDS: {
    MIN: 1.01,
    MAX: 999.99,
    DECIMAL_PLACES: 2,
  },

  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },

  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const;

// === FIRE22 BRAND CONSTANTS ===
export const FIRE22 = {
  BRAND_NAME: 'Fire22',
  COMPANY_NAME: 'Fire22 Sportsbook',
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_TIMEZONE: 'America/New_York',

  LANGUAGES: {
    SUPPORTED: ['en', 'es', 'fr', 'pt'],
    DEFAULT: 'en',
  },

  COLORS: {
    PRIMARY: '#fdbb2d',
    PRIMARY_LIGHT: '#fdd835',
    PRIMARY_DARK: '#f57f17',
    SECONDARY: '#b21f1f',
    SECONDARY_LIGHT: '#d32f2f',
    SECONDARY_DARK: '#8e0000',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3',
  },
} as const;

// === WORKSPACE CONSTANTS ===
export const WORKSPACES = {
  CORE_DASHBOARD: '@fire22-core-dashboard',
  SPORTS_BETTING: '@fire22-sports-betting',
  TELEGRAM_INTEGRATION: '@fire22-telegram-integration',
  API_CONSOLIDATED: '@fire22-api-consolidated',
  SECURITY_REGISTRY: '@fire22-security-registry',
  PATTERN_SYSTEM: '@fire22-pattern-system',
  BUILD_SYSTEM: '@fire22-build-system',
} as const;

// === ERROR MESSAGES WITH CODES ===
export const ERROR_MESSAGES = {
  DATABASE: {
    CONNECTION_FAILED: {
      code: 'E2001',
      message: 'Database connection failed',
      docs: '/docs/database/setup',
    },
    QUERY_TIMEOUT: {
      code: 'E2002',
      message: 'Database query timeout',
      docs: '/docs/database/optimization',
    },
    INVALID_SCHEMA: {
      code: 'E2003',
      message: 'Invalid database schema',
      docs: '/docs/database/schema',
    },
    DUPLICATE_ENTRY: {
      code: 'E2004',
      message: 'Duplicate entry found',
      docs: '/docs/database/constraints',
    },
    FOREIGN_KEY_CONSTRAINT: {
      code: 'E2005',
      message: 'Foreign key constraint violation',
      docs: '/docs/database/relationships',
    },
  },

  API: {
    INVALID_REQUEST: {
      code: 'E3003',
      message: 'Invalid request format',
      docs: '/crystal-clear-architecture/docs/api/validation',
    },
    UNAUTHORIZED: {
      code: 'E3001',
      message: 'Unauthorized access',
      docs: '/crystal-clear-architecture/docs/api/authentication',
    },
    FORBIDDEN: {
      code: 'E3004',
      message: 'Access forbidden',
      docs: '/crystal-clear-architecture/docs/api/authorization',
    },
    RATE_LIMITED: {
      code: 'E3002',
      message: 'Rate limit exceeded',
      docs: '/crystal-clear-architecture/docs/api/rate-limits',
    },
    NOT_FOUND: {
      code: 'E3005',
      message: 'Resource not found',
      docs: '/crystal-clear-architecture/docs/api/resources',
    },
    VALIDATION_FAILED: {
      code: 'E3006',
      message: 'Request validation failed',
      docs: '/crystal-clear-architecture/docs/api/validation',
    },
  },

  BUSINESS: {
    INSUFFICIENT_BALANCE: {
      code: 'E5001',
      message: 'Insufficient account balance',
      docs: '/docs/business/balance-management',
    },
    BETTING_LIMIT_EXCEEDED: {
      code: 'E5002',
      message: 'Betting limit exceeded',
      docs: '/docs/business/betting-limits',
    },
    INVALID_ODDS: {
      code: 'E5003',
      message: 'Invalid odds value',
      docs: '/docs/business/odds-validation',
    },
    EVENT_NOT_AVAILABLE: {
      code: 'E5004',
      message: 'Event not available for betting',
      docs: '/docs/business/event-management',
    },
    CUSTOMER_SUSPENDED: {
      code: 'E5005',
      message: 'Customer account suspended',
      docs: '/docs/business/account-management',
    },
  },

  SYSTEM: {
    INIT_FAILED: {
      code: 'E1001',
      message: 'System initialization failed',
      docs: '/docs/system/troubleshooting',
    },
    MEMORY_EXCEEDED: {
      code: 'E1002',
      message: 'Memory limit exceeded',
      docs: '/docs/system/memory',
    },
    CONFIG_INVALID: {
      code: 'E1003',
      message: 'Invalid configuration',
      docs: '/docs/system/config',
    },
  },

  NETWORK: {
    TIMEOUT: {
      code: 'E4001',
      message: 'Network request timeout',
      docs: '/docs/network/configuration',
    },
    DNS_FAILED: { code: 'E4002', message: 'DNS resolution failed', docs: '/docs/network/dns' },
    SSL_ERROR: { code: 'E4003', message: 'SSL certificate error', docs: '/docs/network/ssl' },
  },

  SECURITY: {
    MULTIPLE_LOGIN_FAILURES: {
      code: 'E6001',
      message: 'Multiple failed login attempts detected',
      docs: '/docs/security/policies',
    },
    SUSPICIOUS_CONNECTION: {
      code: 'E6002',
      message: 'Suspicious connection detected',
      docs: '/docs/security/connection-monitoring',
    },
    UNAUTHORIZED_ACCESS: {
      code: 'E6003',
      message: 'Unauthorized access attempt',
      docs: '/docs/security/access-control',
    },
  },

  FIRE22: {
    API_CONNECTION_FAILED: {
      code: 'E7001',
      message: 'Fire22 API connection failed',
      docs: '/docs/integrations/fire22',
    },
    AUTH_FAILED: {
      code: 'E7002',
      message: 'Fire22 authentication failed',
      docs: '/docs/integrations/fire22-auth',
    },
    DATA_SYNC_FAILED: {
      code: 'E7003',
      message: 'Fire22 data sync failed',
      docs: '/docs/integrations/fire22-sync',
    },
  },

  TELEGRAM: {
    BOT_AUTH_FAILED: {
      code: 'E8001',
      message: 'Telegram bot authentication failed',
      docs: '/docs/integrations/telegram',
    },
    MESSAGE_SEND_FAILED: {
      code: 'E8002',
      message: 'Telegram message send failed',
      docs: '/docs/integrations/telegram-setup',
    },
    WEBHOOK_FAILED: {
      code: 'E8003',
      message: 'Telegram webhook failed',
      docs: '/docs/integrations/telegram-webhooks',
    },
  },
} as const;

// === SUCCESS MESSAGES ===
export const SUCCESS_MESSAGES = {
  DATABASE: {
    CONNECTED: 'Database connected successfully',
    QUERY_SUCCESS: 'Query executed successfully',
    BACKUP_CREATED: 'Database backup created successfully',
  },

  API: {
    REQUEST_SUCCESS: 'Request processed successfully',
    DATA_UPDATED: 'Data updated successfully',
    LOGIN_SUCCESS: 'Login successful',
  },

  BUSINESS: {
    BET_PLACED: 'Bet placed successfully',
    TRANSACTION_COMPLETE: 'Transaction completed successfully',
    PAYOUT_PROCESSED: 'Payout processed successfully',
  },
} as const;

// === ENVIRONMENT CONFIGURATION ===
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  const configs = {
    development: {
      DEBUG: true,
      LOG_LEVEL: 'debug',
      CACHE_TTL: 60,
      BASE_URL: `http://localhost:${SERVER.DEFAULT_PORT}`,
      DATABASE_PATH: './dev-dashboard.db',
    },
    production: {
      DEBUG: false,
      LOG_LEVEL: 'error',
      CACHE_TTL: 3600,
      BASE_URL: process.env.PRODUCTION_URL || 'https://dashboard.fire22.com',
      DATABASE_PATH: process.env.DATABASE_PATH || './dashboard.db',
    },
    test: {
      DEBUG: false,
      LOG_LEVEL: 'silent',
      CACHE_TTL: 0,
      BASE_URL: 'http://localhost:4000',
      DATABASE_PATH: ':memory:',
    },
  };

  return configs[env] || configs.development;
};

// Export all constants as default
export default {
  DATABASE,
  SPORTS,
  BUSINESS,
  API,
  SERVER,
  SECURITY,
  VALIDATION,
  FIRE22,
  WORKSPACES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  getEnvironmentConfig,
};

// Type exports for type safety
export type DatabaseStatus = (typeof DATABASE.STATUS)[keyof typeof DATABASE.STATUS];
export type TransactionType =
  (typeof DATABASE.TRANSACTION_TYPES)[keyof typeof DATABASE.TRANSACTION_TYPES];
export type WagerStatus = (typeof DATABASE.WAGER_STATUS)[keyof typeof DATABASE.WAGER_STATUS];
export type BetType = (typeof DATABASE.BET_TYPES)[keyof typeof DATABASE.BET_TYPES];
export type SportType = (typeof SPORTS.TYPES)[keyof typeof SPORTS.TYPES];
export type EventStatus = (typeof SPORTS.EVENT_STATUS)[keyof typeof SPORTS.EVENT_STATUS];
export type CustomerTier = (typeof BUSINESS.CUSTOMER_TIERS)[keyof typeof BUSINESS.CUSTOMER_TIERS];
export type RiskLevel = (typeof BUSINESS.RISK_LEVELS)[keyof typeof BUSINESS.RISK_LEVELS];
export type AgentLevel = (typeof BUSINESS.AGENT_LEVELS)[keyof typeof BUSINESS.AGENT_LEVELS];
