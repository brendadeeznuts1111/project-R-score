/**
 * 🌟 Global Constants and Configuration
 * Centralized place for all shared constants, colors, and configuration values
 * Ensures consistency across the entire project
 */

// 🎨 Color Palette - Consistent across all UI components
export const COLORS = {
  // Primary Colors
  primary: {
    main: '#fdbb2d',
    light: '#fdd835',
    dark: '#f57f17',
    contrast: '#000000',
  },

  // Secondary Colors
  secondary: {
    main: '#b21f1f',
    light: '#d32f2f',
    dark: '#8e0000',
    contrast: '#ffffff',
  },

  // Accent Colors
  accent: {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  },

  // Background Colors
  background: {
    primary: '#1a2a6c',
    secondary: '#0f172a',
    tertiary: '#1e293b',
    surface: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.3)',
  },

  // Text Colors
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.9)',
    muted: 'rgba(255, 255, 255, 0.7)',
    inverse: '#000000',
  },

  // Border Colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: 'rgba(253, 187, 45, 0.3)',
    accent: 'rgba(178, 31, 31, 0.3)',
  },
} as const;

// 🔧 System Configuration Constants
export const SYSTEM_CONFIG = {
  // API Configuration
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    maxConcurrentRequests: 10,
  },

  // Cache Configuration
  cache: {
    defaultTTL: 300, // 5 minutes
    maxSize: 1000,
    cleanupInterval: 60000, // 1 minute
  },

  // Database Configuration
  database: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },

  // Security Configuration
  security: {
    jwtExpiry: '24h',
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
  },

  // UI Configuration
  ui: {
    animationDuration: 300,
    hoverDelay: 150,
    maxTableRows: 100,
    paginationSize: 20,
  },
} as const;

// 📱 Responsive Breakpoints
export const BREAKPOINTS = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// 🎯 Status Constants
export const STATUS = {
  // Build Status
  build: {
    pending: 'pending',
    running: 'running',
    completed: 'completed',
    failed: 'failed',
  },

  // Queue Status
  queue: {
    pending: 'pending',
    matched: 'matched',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
  },

  // Health Status
  health: {
    ok: 'OK',
    warning: 'WARNING',
    error: 'ERROR',
  },

  // Permission Status
  permission: {
    granted: 'granted',
    denied: 'denied',
    pending: 'pending',
  },
} as const;

// 🔐 Permission Constants
export const PERMISSIONS = {
  // Customer Permissions
  customer: {
    can_place_bets: 'can_place_bets',
    can_withdraw: 'can_withdraw',
    can_deposit: 'can_deposit',
    can_view_history: 'can_view_history',
  },

  // Agent Permissions
  agent: {
    can_manage_customers: 'can_manage_customers',
    can_set_rates: 'can_set_rates',
    can_view_reports: 'can_view_reports',
    can_process_transactions: 'can_process_transactions',
  },

  // Admin Permissions
  admin: {
    can_manage_agents: 'can_manage_agents',
    can_manage_system: 'can_manage_system',
    can_view_analytics: 'can_view_analytics',
    can_override_rules: 'can_override_rules',
  },
} as const;

// 📊 Validation Constants
export const VALIDATION = {
  // Limits
  limits: {
    minBet: 1,
    maxBet: 1000000,
    minWithdrawal: 10,
    maxWithdrawal: 100000,
    minDeposit: 5,
    maxDeposit: 50000,
  },

  // Thresholds
  thresholds: {
    highValueWager: 10000,
    vipThreshold: 50000,
    riskWarning: 0.8,
    criticalRisk: 0.95,
  },

  // Timeouts
  timeouts: {
    sessionExpiry: 3600000, // 1 hour
    tokenExpiry: 86400000, // 24 hours
    requestTimeout: 30000, // 30 seconds
  },
} as const;

// 🎮 Game Constants
export const GAMES = {
  // Sports Types
  sports: ['football', 'basketball', 'baseball', 'hockey', 'tennis', 'golf', 'soccer'],

  // Casino Games
  casino: ['blackjack', 'roulette', 'poker', 'slots', 'baccarat', 'craps'],

  // Bet Types
  betTypes: ['straight', 'parlay', 'teaser', 'futures', 'props', 'live'],
} as const;

// 📈 Commission Constants
export const COMMISSION = {
  // Default Rates
  default: {
    sports: 0.05,
    casino: 0.03,
    live: 0.04,
    inet: 0.06,
  },

  // Tiers
  tiers: {
    bronze: 0.02,
    silver: 0.03,
    gold: 0.04,
    platinum: 0.05,
  },

  // Bonuses
  bonuses: {
    performance: 0.01,
    volume: 0.005,
    loyalty: 0.002,
  },
} as const;

// 🚀 Feature Flags
export const FEATURES = {
  // Core Features
  core: {
    p2pQueue: true,
    liveCasino: true,
    sportsBetting: true,
    telegramBot: true,
  },

  // Advanced Features
  advanced: {
    aiMatching: false,
    predictiveAnalytics: false,
    realTimeNotifications: true,
    advancedReporting: true,
  },

  // Experimental Features
  experimental: {
    blockchainIntegration: false,
    machineLearning: false,
    voiceCommands: false,
  },
} as const;

// 📝 Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  auth: {
    invalidCredentials: 'Invalid username or password',
    tokenExpired: 'Authentication token has expired',
    insufficientPermissions: 'Insufficient permissions for this operation',
    accountLocked: 'Account has been temporarily locked',
  },

  // Validation
  validation: {
    requiredField: 'This field is required',
    invalidFormat: 'Invalid format',
    outOfRange: 'Value is out of acceptable range',
    duplicateEntry: 'This entry already exists',
  },

  // System
  system: {
    internalError: 'An internal error occurred',
    serviceUnavailable: 'Service is temporarily unavailable',
    timeout: 'Request timed out',
    networkError: 'Network connection error',
  },
} as const;

// 🎯 Success Messages
export const SUCCESS_MESSAGES = {
  // Operations
  operations: {
    created: 'Successfully created',
    updated: 'Successfully updated',
    deleted: 'Successfully deleted',
    processed: 'Successfully processed',
  },

  // Authentication
  auth: {
    loggedIn: 'Successfully logged in',
    loggedOut: 'Successfully logged out',
    passwordChanged: 'Password successfully changed',
  },
} as const;

// 🔄 HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  success: {
    ok: 200,
    created: 201,
    accepted: 202,
    noContent: 204,
  },

  // Client Errors
  clientError: {
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    unprocessableEntity: 422,
  },

  // Server Errors
  serverError: {
    internalServerError: 500,
    notImplemented: 501,
    badGateway: 502,
    serviceUnavailable: 503,
  },
} as const;

// 📊 Analytics Constants
export const ANALYTICS = {
  // Time Periods
  periods: {
    hourly: 'hourly',
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    yearly: 'yearly',
  },

  // Metrics
  metrics: {
    revenue: 'revenue',
    volume: 'volume',
    users: 'users',
    transactions: 'transactions',
    performance: 'performance',
  },

  // Aggregations
  aggregations: {
    sum: 'sum',
    average: 'average',
    count: 'count',
    min: 'min',
    max: 'max',
  },
} as const;

// 🎨 CSS Variables for consistent styling
export const CSS_VARIABLES = {
  // Colors
  '--color-primary': COLORS.primary.main,
  '--color-secondary': COLORS.secondary.main,
  '--color-success': COLORS.accent.success,
  '--color-warning': COLORS.accent.warning,
  '--color-error': COLORS.accent.error,
  '--color-info': COLORS.accent.info,

  // Backgrounds
  '--bg-primary': COLORS.background.primary,
  '--bg-secondary': COLORS.background.secondary,
  '--bg-surface': COLORS.background.surface,

  // Text
  '--text-primary': COLORS.text.primary,
  '--text-secondary': COLORS.text.secondary,
  '--text-muted': COLORS.text.muted,

  // Spacing
  '--spacing-xs': '0.25rem',
  '--spacing-sm': '0.5rem',
  '--spacing-md': '1rem',
  '--spacing-lg': '1.5rem',
  '--spacing-xl': '2rem',
  '--spacing-2xl': '3rem',

  // Border Radius
  '--radius-sm': '0.25rem',
  '--radius-md': '0.5rem',
  '--radius-lg': '1rem',
  '--radius-xl': '1.5rem',

  // Shadows
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',

  // Transitions
  '--transition-fast': '150ms ease-in-out',
  '--transition-normal': '300ms ease-in-out',
  '--transition-slow': '500ms ease-in-out',
} as const;

// 🔧 Utility Functions
export const UTILS = {
  // Color manipulation
  colors: {
    lighten: (color: string, amount: number) => color,
    darken: (color: string, amount: number) => color,
    alpha: (color: string, alpha: number) => color,
  },

  // Formatting
  format: {
    currency: (amount: number, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
    percentage: (value: number) => `${(value * 100).toFixed(2)}%`,
    date: (date: Date) => date.toLocaleDateString(),
    time: (date: Date) => date.toLocaleTimeString(),
  },

  // Validation
  validation: {
    isEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isPhone: (phone: string) => /^\+?[\d\s\-\(\)]+$/.test(phone),
    isStrongPassword: (password: string) => password.length >= 8,
  },
} as const;

// Export all constants
export default {
  COLORS,
  SYSTEM_CONFIG,
  BREAKPOINTS,
  STATUS,
  PERMISSIONS,
  VALIDATION,
  GAMES,
  COMMISSION,
  FEATURES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  ANALYTICS,
  CSS_VARIABLES,
  UTILS,
};
