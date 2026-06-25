#!/usr/bin/env bun

/**
 * 🔥📱 Fire22 Telegram Bot Constants & Configuration
 *
 * Centralized constants, environment variables, and configuration
 * for the complete Fire22 Telegram integration system
 */

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🌐 LANGUAGE SYSTEM CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const SUPPORTED_LANGUAGES = ['en', 'es', 'pt', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
} as const;

export const LANGUAGE_FLAGS = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇵🇹',
  fr: '🇫🇷',
} as const;

export const LANGUAGE_CODES = {
  // Welcome & Authentication
  WELCOME: 'L-1500',
  ACCOUNT_LINKED: 'L-1501',
  LANGUAGE_CHANGED: 'L-1520',

  // Notifications
  TRANSACTION_ALERT: 'L-1502',
  SYSTEM_ALERT: 'L-1503',

  // Interactive Buttons
  VIEW_DASHBOARD: 'L-1504',
  DISMISS: 'L-1505',

  // Deposit Operations
  NEW_DEPOSIT: 'L-1506',
  APPROVE: 'L-1507',
  REJECT: 'L-1508',
  DETAILS: 'L-1509',

  // P2P Queue Operations
  P2P_MATCH_FOUND: 'L-1510',
  PROCESS_BEST_MATCH: 'L-1511',
  VIEW_ALL: 'L-1512',
  WAIT_FOR_BETTER: 'L-1513',

  // Support System
  SUPPORT_TICKET_CREATED: 'L-1514',
  TICKET_ESCALATED: 'L-1515',
  ACKNOWLEDGE: 'L-1516',
  ESCALATE: 'L-1517',

  // Error Messages
  REGISTRATION_FAILED: 'L-1518',
  LINKING_FAILED: 'L-1519',
  ERROR: 'L-1407',
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🤖 BOT COMMAND CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const BOT_COMMANDS = {
  // Basic Commands
  START: '/start',
  HELP: '/help',
  LANGUAGE: '/language',
  DASHBOARD: '/dashboard',
  STATS: '/stats',

  // Account Management
  REGISTER: '/register',
  LINK: '/link',
  PROFILE: '/profile',
  SETTINGS: '/settings',

  // Financial Operations
  BALANCE: '/balance',
  WAGERS: '/wagers',
  DEPOSIT: '/deposit',
  WITHDRAW: '/withdraw',

  // Business Management
  VIP: '/vip',
  GROUPS: '/groups',
  AFFILIATE: '/affiliate',
  COMMISSION: '/commission',

  // Casino Operations
  CASINO: '/casino',
  CASINO_GAMES: '/casino-games',
  CASINO_RATES: '/casino-rates',
  CASINO_SESSIONS: '/casino-sessions',
  CASINO_REVENUE: '/casino-revenue',

  // Sports Betting
  SPORTS: '/sports',
  SPORTS_EVENTS: '/sports-events',
  SPORTS_BETS: '/sports-bets',
  SPORTS_RATES: '/sports-rates',
  RISK_ASSESSMENT: '/risk-assessment',
  VIP_PROFILE: '/vip-profile',

  // Support & Admin
  SUPPORT: '/support',
  ADMIN: '/admin',
  BROADCAST: '/broadcast',
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🎯 P2P QUEUE CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const QUEUE_CONFIG = {
  MAX_RETRIES: 3,
  MATCH_TIMEOUT: 300000, // 5 minutes
  CLEANUP_INTERVAL: 3600000, // 1 hour
  MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days

  PRIORITY_LEVELS: {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    URGENT: 4,
    CRITICAL: 5,
  } as const,

  PAYMENT_TYPES: {
    BANK_TRANSFER: 'bank_transfer',
    CREDIT_CARD: 'credit_card',
    CRYPTO: 'cryptocurrency',
    PAYPAL: 'paypal',
    SKRILL: 'skrill',
    NETELLER: 'neteller',
  } as const,

  MATCH_SCORING: {
    BASE_SCORE: 100,
    AMOUNT_WEIGHT: 40,
    PAYMENT_TYPE_BONUS: 20,
    WAIT_TIME_BONUS: 20,
    MAX_WAIT_BONUS: 20,
  } as const,
} as const;

export const QUEUE_STATUSES = {
  PENDING: 'pending',
  MATCHED: 'matched',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🏢 DEPARTMENT ACCESS LEVELS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const ACCESS_LEVELS = {
  // Customer Service
  CS_AGENT: 'cs_agent',
  CS_SENIOR: 'cs_senior',
  CS_MANAGER: 'cs_manager',

  // Finance
  CASHIER: 'cashier',
  SENIOR_CASHIER: 'senior_cashier',
  CASHIER_MANAGER: 'cashier_manager',
  FINANCE_DIRECTOR: 'finance_director',

  // Operations
  OPS_ANALYST: 'ops_analyst',
  OPS_SPECIALIST: 'ops_specialist',
  QUEUE_MANAGER: 'queue_manager',
  OPS_DIRECTOR: 'ops_director',

  // Compliance
  KYC_SPECIALIST: 'kyc_specialist',
  COMPLIANCE_ANALYST: 'compliance_analyst',
  SENIOR_COMPLIANCE: 'senior_compliance',
  CCO: 'cco',

  // Management
  MANAGER: 'manager',
  DIRECTOR: 'director',
  VP: 'vp',
  C_SUITE: 'c_suite',

  // Technical
  DEVELOPER: 'developer',
  DEVOPS_ENGINEER: 'devops_engineer',
  SENIOR_DEVOPS: 'senior_devops',
  CTO: 'cto',
} as const;

export const DEPARTMENT_PERMISSIONS = {
  [ACCESS_LEVELS.CS_AGENT]: {
    commands: [BOT_COMMANDS.SUPPORT, BOT_COMMANDS.HELP],
    canEscalate: false,
    canClose: false,
    transactionLimit: 0,
  },
  [ACCESS_LEVELS.CASHIER]: {
    commands: [BOT_COMMANDS.BALANCE, BOT_COMMANDS.DEPOSIT, BOT_COMMANDS.WITHDRAW],
    canEscalate: true,
    canClose: false,
    transactionLimit: 5000,
  },
  [ACCESS_LEVELS.QUEUE_MANAGER]: {
    commands: [BOT_COMMANDS.STATS, '/queue_status', '/rebalance_queue'],
    canEscalate: true,
    canClose: true,
    transactionLimit: 100000,
  },
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// ⚡ PERFORMANCE CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const PERFORMANCE_CONFIG = {
  TRANSLATION_CACHE_SIZE: 1000,
  TRANSLATION_CACHE_TTL: 3600000, // 1 hour
  USER_SESSION_TIMEOUT: 1800000, // 30 minutes

  RATE_LIMITING: {
    COMMANDS_PER_MINUTE: 20,
    MESSAGES_PER_MINUTE: 10,
    ADMIN_COMMANDS_PER_MINUTE: 50,
  },

  QUEUE_PROCESSING: {
    BATCH_SIZE: 100,
    PROCESSING_INTERVAL: 5000, // 5 seconds
    MAX_CONCURRENT: 10,
  },

  NOTIFICATION_LIMITS: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    BATCH_SIZE: 50,
  },
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🎨 UI CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const UI_ELEMENTS = {
  EMOJIS: {
    FIRE: '🔥',
    BOT: '🤖',
    MONEY: '💰',
    CHART: '📊',
    WARNING: '⚠️',
    SUCCESS: '✅',
    ERROR: '❌',
    LOADING: '⏳',
    CLOCK: '⏰',
    TARGET: '🎯',
    ROCKET: '🚀',
    SHIELD: '🛡️',
    CROWN: '👑',
    DIAMOND: '💎',
    TROPHY: '🏆',
  },

  STATUS_ICONS: {
    ONLINE: '🟢',
    OFFLINE: '🔴',
    PENDING: '🟡',
    PROCESSING: '🔵',
    COMPLETED: '✅',
    FAILED: '❌',
  },

  DEPARTMENT_ICONS: {
    CUSTOMER_SERVICE: '🎧',
    FINANCE: '💰',
    OPERATIONS: '⚙️',
    COMPLIANCE: '🛡️',
    MANAGEMENT: '📈',
    TECHNICAL: '🔧',
  },
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🔔 NOTIFICATION TYPES
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const NOTIFICATION_TYPES = {
  TRANSACTION: 'transaction',
  P2P_MATCH: 'p2p_match',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  SUPPORT_TICKET: 'support_ticket',
  ESCALATION: 'escalation',
  SYSTEM_ALERT: 'system_alert',
  BALANCE_CHANGE: 'balance_change',
  KYC_UPDATE: 'kyc_update',
  COMPLIANCE_ALERT: 'compliance_alert',
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5,
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🌐 API ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const API_ENDPOINTS = {
  // User Management
  USER_BALANCE: '/api/user/balance',
  USER_PROFILE: '/api/user/profile',
  USER_WAGERS: '/api/user/wagers',

  // P2P Queue
  QUEUE_STATUS: '/api/queue/status',
  QUEUE_ADD: '/api/queue/add',
  QUEUE_MATCH: '/api/queue/match',
  QUEUE_COMPLETE: '/api/queue/complete',

  // Notifications
  SEND_NOTIFICATION: '/api/notifications/send',
  GET_NOTIFICATIONS: '/api/notifications/list',

  // Admin
  SYSTEM_STATS: '/api/admin/stats',
  USER_LIST: '/api/admin/users',
  BROADCAST: '/api/admin/broadcast',

  // Fire22 Integration
  FIRE22_CUSTOMERS: '/api/customers',
  FIRE22_SYNC: '/api/fire22/sync-customers',
  FIRE22_AUTH_STATUS: '/api/fire22/auth-status',
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🔐 SECURITY CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const SECURITY_CONFIG = {
  // Session Management
  SESSION_TIMEOUT: 3600000, // 1 hour
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900000, // 15 minutes

  // Input Validation
  MAX_MESSAGE_LENGTH: 4096,
  MAX_USERNAME_LENGTH: 32,
  MAX_AMOUNT: 1000000,
  MIN_AMOUNT: 1,

  // Command Restrictions
  ADMIN_COMMANDS: [BOT_COMMANDS.ADMIN, BOT_COMMANDS.BROADCAST, BOT_COMMANDS.STATS],

  RATE_LIMITS: {
    GENERAL: 60, // requests per minute
    ADMIN: 120,
    FINANCIAL: 30,
  },
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 📊 METRICS & MONITORING
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const METRICS_CONFIG = {
  // Collection Intervals
  STATS_UPDATE_INTERVAL: 60000, // 1 minute
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  PERFORMANCE_SAMPLE_RATE: 0.1, // 10%

  // Retention Periods
  METRICS_RETENTION: 30 * 24 * 60 * 60 * 1000, // 30 days
  LOGS_RETENTION: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Alert Thresholds
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  RESPONSE_TIME_THRESHOLD: 5000, // 5 seconds
  QUEUE_WAIT_THRESHOLD: 300000, // 5 minutes

  // KPIs
  TARGET_RESPONSE_TIME: 1000, // 1 second
  TARGET_UPTIME: 0.999, // 99.9%
  TARGET_MATCH_RATE: 0.85, // 85%
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🔄 WORKFLOW STATES
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const WORKFLOW_STATES = {
  // User Onboarding
  REGISTRATION: {
    STARTED: 'registration_started',
    EMAIL_PENDING: 'email_pending',
    PHONE_PENDING: 'phone_pending',
    KYC_PENDING: 'kyc_pending',
    COMPLETED: 'registration_completed',
    FAILED: 'registration_failed',
  },

  // Transaction Processing
  TRANSACTION: {
    INITIATED: 'transaction_initiated',
    PENDING: 'transaction_pending',
    PROCESSING: 'transaction_processing',
    COMPLETED: 'transaction_completed',
    FAILED: 'transaction_failed',
    CANCELLED: 'transaction_cancelled',
  },

  // Support Tickets
  SUPPORT: {
    CREATED: 'support_created',
    ASSIGNED: 'support_assigned',
    IN_PROGRESS: 'support_in_progress',
    ESCALATED: 'support_escalated',
    RESOLVED: 'support_resolved',
    CLOSED: 'support_closed',
  },
} as const;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🎯 SUCCESS METRICS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const SUCCESS_METRICS = {
  RESPONSE_TIMES: {
    EXCELLENT: 500, // < 500ms
    GOOD: 1000, // < 1s
    ACCEPTABLE: 3000, // < 3s
    POOR: 5000, // < 5s
  },

  MATCH_RATES: {
    EXCELLENT: 0.95, // > 95%
    GOOD: 0.85, // > 85%
    ACCEPTABLE: 0.7, // > 70%
    POOR: 0.5, // > 50%
  },

  USER_SATISFACTION: {
    EXCELLENT: 4.5, // > 4.5/5
    GOOD: 4.0, // > 4.0/5
    ACCEPTABLE: 3.5, // > 3.5/5
    POOR: 3.0, // > 3.0/5
  },
} as const;

export default {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  LANGUAGE_CODES,
  BOT_COMMANDS,
  QUEUE_CONFIG,
  QUEUE_STATUSES,
  ACCESS_LEVELS,
  DEPARTMENT_PERMISSIONS,
  PERFORMANCE_CONFIG,
  UI_ELEMENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  API_ENDPOINTS,
  SECURITY_CONFIG,
  METRICS_CONFIG,
  WORKFLOW_STATES,
  SUCCESS_METRICS,
};
