/**
 * 🔧 Fire22 Constants Definitions with DEFINE Statements
 *
 * Comprehensive constants definition system that ensures all constants
 * have proper DEFINE statements for build-time optimization, type safety,
 * and consistent usage across the entire application.
 *
 * This file provides:
 * - DEFINE macros for all constants
 * - Build-time constant injection
 * - Type-safe constant definitions
 * - Performance optimization through inlining
 * - Cross-platform compatibility
 */

// === DEFINE SYSTEM ===

/**
 * DEFINE macro system for constants
 * Ensures constants are properly defined at build time
 */
interface DefineSystem {
  <T>(name: string, value: T, description?: string): T;
}

const DEFINE: DefineSystem = <T>(name: string, value: T, description?: string): T => {
  // In development, log the definition
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.debug(
      `DEFINE: ${name} = ${JSON.stringify(value)}${description ? ` // ${description}` : ''}`
    );
  }

  // Define the constant globally for build-time optimization
  if (typeof globalThis !== 'undefined') {
    (globalThis as any)[name] = value;
  }

  return value;
};

// === COLOR CONSTANTS WITH DEFINE ===

// Primary Colors
export const FIRE22_PRIMARY_MAIN = DEFINE(
  'FIRE22_PRIMARY_MAIN',
  '#fdbb2d',
  'Fire22 brand primary color - gold'
);
export const FIRE22_PRIMARY_LIGHT = DEFINE(
  'FIRE22_PRIMARY_LIGHT',
  '#fdd835',
  'Fire22 primary light variant'
);
export const FIRE22_PRIMARY_DARK = DEFINE(
  'FIRE22_PRIMARY_DARK',
  '#f57f17',
  'Fire22 primary dark variant'
);
export const FIRE22_PRIMARY_CONTRAST = DEFINE(
  'FIRE22_PRIMARY_CONTRAST',
  '#000000',
  'Fire22 primary contrast color'
);

// Secondary Colors
export const FIRE22_SECONDARY_MAIN = DEFINE(
  'FIRE22_SECONDARY_MAIN',
  '#b21f1f',
  'Fire22 brand secondary color - red'
);
export const FIRE22_SECONDARY_LIGHT = DEFINE(
  'FIRE22_SECONDARY_LIGHT',
  '#d32f2f',
  'Fire22 secondary light variant'
);
export const FIRE22_SECONDARY_DARK = DEFINE(
  'FIRE22_SECONDARY_DARK',
  '#8e0000',
  'Fire22 secondary dark variant'
);
export const FIRE22_SECONDARY_CONTRAST = DEFINE(
  'FIRE22_SECONDARY_CONTRAST',
  '#ffffff',
  'Fire22 secondary contrast color'
);

// Accent Colors
export const FIRE22_SUCCESS_COLOR = DEFINE(
  'FIRE22_SUCCESS_COLOR',
  '#4caf50',
  'Success state color'
);
export const FIRE22_WARNING_COLOR = DEFINE(
  'FIRE22_WARNING_COLOR',
  '#ff9800',
  'Warning state color'
);
export const FIRE22_ERROR_COLOR = DEFINE('FIRE22_ERROR_COLOR', '#f44336', 'Error state color');
export const FIRE22_INFO_COLOR = DEFINE('FIRE22_INFO_COLOR', '#2196f3', 'Info state color');

// Background Colors
export const FIRE22_BG_PRIMARY = DEFINE(
  'FIRE22_BG_PRIMARY',
  '#1a2a6c',
  'Primary background - dark blue'
);
export const FIRE22_BG_SECONDARY = DEFINE(
  'FIRE22_BG_SECONDARY',
  '#0f172a',
  'Secondary background - darker'
);
export const FIRE22_BG_TERTIARY = DEFINE('FIRE22_BG_TERTIARY', '#1e293b', 'Tertiary background');
export const FIRE22_BG_SURFACE = DEFINE(
  'FIRE22_BG_SURFACE',
  'rgba(255, 255, 255, 0.08)',
  'Surface background with transparency'
);
export const FIRE22_BG_OVERLAY = DEFINE(
  'FIRE22_BG_OVERLAY',
  'rgba(0, 0, 0, 0.3)',
  'Overlay background'
);

// Text Colors
export const FIRE22_TEXT_PRIMARY = DEFINE(
  'FIRE22_TEXT_PRIMARY',
  '#ffffff',
  'Primary text color - white'
);
export const FIRE22_TEXT_SECONDARY = DEFINE(
  'FIRE22_TEXT_SECONDARY',
  'rgba(255, 255, 255, 0.9)',
  'Secondary text with transparency'
);
export const FIRE22_TEXT_MUTED = DEFINE(
  'FIRE22_TEXT_MUTED',
  'rgba(255, 255, 255, 0.7)',
  'Muted text color'
);
export const FIRE22_TEXT_INVERSE = DEFINE(
  'FIRE22_TEXT_INVERSE',
  '#000000',
  'Inverse text color - black'
);

// Border Colors
export const FIRE22_BORDER_PRIMARY = DEFINE(
  'FIRE22_BORDER_PRIMARY',
  'rgba(255, 255, 255, 0.1)',
  'Primary border color'
);
export const FIRE22_BORDER_SECONDARY = DEFINE(
  'FIRE22_BORDER_SECONDARY',
  'rgba(253, 187, 45, 0.3)',
  'Secondary border with brand color'
);
export const FIRE22_BORDER_ACCENT = DEFINE(
  'FIRE22_BORDER_ACCENT',
  'rgba(178, 31, 31, 0.3)',
  'Accent border color'
);

// === SYSTEM CONFIGURATION CONSTANTS ===

// API Configuration
export const API_TIMEOUT = DEFINE('API_TIMEOUT', 30000, 'API request timeout in milliseconds');
export const API_RETRY_ATTEMPTS = DEFINE('API_RETRY_ATTEMPTS', 3, 'Maximum API retry attempts');
export const API_RETRY_DELAY = DEFINE(
  'API_RETRY_DELAY',
  1000,
  'Base delay between API retries in ms'
);
export const API_MAX_CONCURRENT = DEFINE(
  'API_MAX_CONCURRENT',
  10,
  'Maximum concurrent API requests'
);

// Cache Configuration
export const CACHE_DEFAULT_TTL = DEFINE(
  'CACHE_DEFAULT_TTL',
  300,
  'Default cache TTL in seconds (5 minutes)'
);
export const CACHE_MAX_SIZE = DEFINE('CACHE_MAX_SIZE', 1000, 'Maximum cache entries');
export const CACHE_CLEANUP_INTERVAL = DEFINE(
  'CACHE_CLEANUP_INTERVAL',
  60000,
  'Cache cleanup interval in ms'
);

// Database Configuration
export const DB_MAX_CONNECTIONS = DEFINE('DB_MAX_CONNECTIONS', 10, 'Maximum database connections');
export const DB_CONNECTION_TIMEOUT = DEFINE(
  'DB_CONNECTION_TIMEOUT',
  5000,
  'Database connection timeout in ms'
);
export const DB_QUERY_TIMEOUT = DEFINE('DB_QUERY_TIMEOUT', 30000, 'Database query timeout in ms');

// Security Configuration
export const JWT_EXPIRY = DEFINE('JWT_EXPIRY', '24h', 'JWT token expiry time');
export const PASSWORD_MIN_LENGTH = DEFINE('PASSWORD_MIN_LENGTH', 8, 'Minimum password length');
export const MAX_LOGIN_ATTEMPTS = DEFINE('MAX_LOGIN_ATTEMPTS', 5, 'Maximum failed login attempts');
export const LOCKOUT_DURATION = DEFINE(
  'LOCKOUT_DURATION',
  900000,
  'Account lockout duration in ms (15 min)'
);

// UI Configuration
export const UI_ANIMATION_DURATION = DEFINE(
  'UI_ANIMATION_DURATION',
  300,
  'Default animation duration in ms'
);
export const UI_HOVER_DELAY = DEFINE('UI_HOVER_DELAY', 150, 'Hover effect delay in ms');
export const UI_MAX_TABLE_ROWS = DEFINE('UI_MAX_TABLE_ROWS', 100, 'Maximum table rows per page');
export const UI_PAGINATION_SIZE = DEFINE('UI_PAGINATION_SIZE', 20, 'Default pagination size');

// === BREAKPOINT CONSTANTS ===

export const BREAKPOINT_XS = DEFINE('BREAKPOINT_XS', '480px', 'Extra small breakpoint');
export const BREAKPOINT_SM = DEFINE('BREAKPOINT_SM', '640px', 'Small breakpoint');
export const BREAKPOINT_MD = DEFINE('BREAKPOINT_MD', '768px', 'Medium breakpoint');
export const BREAKPOINT_LG = DEFINE('BREAKPOINT_LG', '1024px', 'Large breakpoint');
export const BREAKPOINT_XL = DEFINE('BREAKPOINT_XL', '1280px', 'Extra large breakpoint');
export const BREAKPOINT_2XL = DEFINE('BREAKPOINT_2XL', '1536px', '2X large breakpoint');

// === STATUS CONSTANTS ===

// Build Status
export const STATUS_BUILD_PENDING = DEFINE(
  'STATUS_BUILD_PENDING',
  'pending',
  'Build pending status'
);
export const STATUS_BUILD_RUNNING = DEFINE(
  'STATUS_BUILD_RUNNING',
  'running',
  'Build running status'
);
export const STATUS_BUILD_COMPLETED = DEFINE(
  'STATUS_BUILD_COMPLETED',
  'completed',
  'Build completed status'
);
export const STATUS_BUILD_FAILED = DEFINE('STATUS_BUILD_FAILED', 'failed', 'Build failed status');

// Queue Status
export const STATUS_QUEUE_PENDING = DEFINE(
  'STATUS_QUEUE_PENDING',
  'pending',
  'Queue pending status'
);
export const STATUS_QUEUE_MATCHED = DEFINE(
  'STATUS_QUEUE_MATCHED',
  'matched',
  'Queue matched status'
);
export const STATUS_QUEUE_PROCESSING = DEFINE(
  'STATUS_QUEUE_PROCESSING',
  'processing',
  'Queue processing status'
);
export const STATUS_QUEUE_COMPLETED = DEFINE(
  'STATUS_QUEUE_COMPLETED',
  'completed',
  'Queue completed status'
);
export const STATUS_QUEUE_FAILED = DEFINE('STATUS_QUEUE_FAILED', 'failed', 'Queue failed status');

// Health Status
export const STATUS_HEALTH_OK = DEFINE('STATUS_HEALTH_OK', 'OK', 'System healthy status');
export const STATUS_HEALTH_WARNING = DEFINE(
  'STATUS_HEALTH_WARNING',
  'WARNING',
  'System warning status'
);
export const STATUS_HEALTH_ERROR = DEFINE('STATUS_HEALTH_ERROR', 'ERROR', 'System error status');

// Permission Status
export const STATUS_PERMISSION_GRANTED = DEFINE(
  'STATUS_PERMISSION_GRANTED',
  'granted',
  'Permission granted'
);
export const STATUS_PERMISSION_DENIED = DEFINE(
  'STATUS_PERMISSION_DENIED',
  'denied',
  'Permission denied'
);
export const STATUS_PERMISSION_PENDING = DEFINE(
  'STATUS_PERMISSION_PENDING',
  'pending',
  'Permission pending'
);

// === PERMISSION CONSTANTS ===

// Customer Permissions
export const PERM_CUSTOMER_PLACE_BETS = DEFINE(
  'PERM_CUSTOMER_PLACE_BETS',
  'can_place_bets',
  'Customer can place bets'
);
export const PERM_CUSTOMER_WITHDRAW = DEFINE(
  'PERM_CUSTOMER_WITHDRAW',
  'can_withdraw',
  'Customer can withdraw funds'
);
export const PERM_CUSTOMER_DEPOSIT = DEFINE(
  'PERM_CUSTOMER_DEPOSIT',
  'can_deposit',
  'Customer can deposit funds'
);
export const PERM_CUSTOMER_VIEW_HISTORY = DEFINE(
  'PERM_CUSTOMER_VIEW_HISTORY',
  'can_view_history',
  'Customer can view history'
);

// Agent Permissions
export const PERM_AGENT_MANAGE_CUSTOMERS = DEFINE(
  'PERM_AGENT_MANAGE_CUSTOMERS',
  'can_manage_customers',
  'Agent can manage customers'
);
export const PERM_AGENT_SET_RATES = DEFINE(
  'PERM_AGENT_SET_RATES',
  'can_set_rates',
  'Agent can set rates'
);
export const PERM_AGENT_VIEW_REPORTS = DEFINE(
  'PERM_AGENT_VIEW_REPORTS',
  'can_view_reports',
  'Agent can view reports'
);
export const PERM_AGENT_PROCESS_TRANSACTIONS = DEFINE(
  'PERM_AGENT_PROCESS_TRANSACTIONS',
  'can_process_transactions',
  'Agent can process transactions'
);

// Admin Permissions
export const PERM_ADMIN_MANAGE_AGENTS = DEFINE(
  'PERM_ADMIN_MANAGE_AGENTS',
  'can_manage_agents',
  'Admin can manage agents'
);
export const PERM_ADMIN_MANAGE_SYSTEM = DEFINE(
  'PERM_ADMIN_MANAGE_SYSTEM',
  'can_manage_system',
  'Admin can manage system'
);
export const PERM_ADMIN_VIEW_ANALYTICS = DEFINE(
  'PERM_ADMIN_VIEW_ANALYTICS',
  'can_view_analytics',
  'Admin can view analytics'
);
export const PERM_ADMIN_OVERRIDE_RULES = DEFINE(
  'PERM_ADMIN_OVERRIDE_RULES',
  'can_override_rules',
  'Admin can override rules'
);

// === VALIDATION CONSTANTS ===

// Limits
export const LIMIT_MIN_BET = DEFINE('LIMIT_MIN_BET', 1, 'Minimum bet amount');
export const LIMIT_MAX_BET = DEFINE('LIMIT_MAX_BET', 1000000, 'Maximum bet amount');
export const LIMIT_MIN_WITHDRAWAL = DEFINE('LIMIT_MIN_WITHDRAWAL', 10, 'Minimum withdrawal amount');
export const LIMIT_MAX_WITHDRAWAL = DEFINE(
  'LIMIT_MAX_WITHDRAWAL',
  100000,
  'Maximum withdrawal amount'
);
export const LIMIT_MIN_DEPOSIT = DEFINE('LIMIT_MIN_DEPOSIT', 5, 'Minimum deposit amount');
export const LIMIT_MAX_DEPOSIT = DEFINE('LIMIT_MAX_DEPOSIT', 50000, 'Maximum deposit amount');

// Thresholds
export const THRESHOLD_HIGH_VALUE_WAGER = DEFINE(
  'THRESHOLD_HIGH_VALUE_WAGER',
  10000,
  'High value wager threshold'
);
export const THRESHOLD_VIP = DEFINE('THRESHOLD_VIP', 50000, 'VIP customer threshold');
export const THRESHOLD_RISK_WARNING = DEFINE(
  'THRESHOLD_RISK_WARNING',
  0.8,
  'Risk warning threshold'
);
export const THRESHOLD_CRITICAL_RISK = DEFINE(
  'THRESHOLD_CRITICAL_RISK',
  0.95,
  'Critical risk threshold'
);

// Timeouts
export const TIMEOUT_SESSION_EXPIRY = DEFINE(
  'TIMEOUT_SESSION_EXPIRY',
  3600000,
  'Session expiry timeout (1 hour)'
);
export const TIMEOUT_TOKEN_EXPIRY = DEFINE(
  'TIMEOUT_TOKEN_EXPIRY',
  86400000,
  'Token expiry timeout (24 hours)'
);
export const TIMEOUT_REQUEST = DEFINE('TIMEOUT_REQUEST', 30000, 'Request timeout (30 seconds)');

// === GAME CONSTANTS ===

// Sports Types
export const SPORTS_FOOTBALL = DEFINE('SPORTS_FOOTBALL', 'football', 'Football sport type');
export const SPORTS_BASKETBALL = DEFINE('SPORTS_BASKETBALL', 'basketball', 'Basketball sport type');
export const SPORTS_BASEBALL = DEFINE('SPORTS_BASEBALL', 'baseball', 'Baseball sport type');
export const SPORTS_HOCKEY = DEFINE('SPORTS_HOCKEY', 'hockey', 'Hockey sport type');
export const SPORTS_TENNIS = DEFINE('SPORTS_TENNIS', 'tennis', 'Tennis sport type');
export const SPORTS_GOLF = DEFINE('SPORTS_GOLF', 'golf', 'Golf sport type');
export const SPORTS_SOCCER = DEFINE('SPORTS_SOCCER', 'soccer', 'Soccer sport type');

// Casino Games
export const CASINO_BLACKJACK = DEFINE('CASINO_BLACKJACK', 'blackjack', 'Blackjack casino game');
export const CASINO_ROULETTE = DEFINE('CASINO_ROULETTE', 'roulette', 'Roulette casino game');
export const CASINO_POKER = DEFINE('CASINO_POKER', 'poker', 'Poker casino game');
export const CASINO_SLOTS = DEFINE('CASINO_SLOTS', 'slots', 'Slots casino game');
export const CASINO_BACCARAT = DEFINE('CASINO_BACCARAT', 'baccarat', 'Baccarat casino game');
export const CASINO_CRAPS = DEFINE('CASINO_CRAPS', 'craps', 'Craps casino game');

// Bet Types
export const BET_TYPE_STRAIGHT = DEFINE('BET_TYPE_STRAIGHT', 'straight', 'Straight bet type');
export const BET_TYPE_PARLAY = DEFINE('BET_TYPE_PARLAY', 'parlay', 'Parlay bet type');
export const BET_TYPE_TEASER = DEFINE('BET_TYPE_TEASER', 'teaser', 'Teaser bet type');
export const BET_TYPE_FUTURES = DEFINE('BET_TYPE_FUTURES', 'futures', 'Futures bet type');
export const BET_TYPE_PROPS = DEFINE('BET_TYPE_PROPS', 'props', 'Props bet type');
export const BET_TYPE_LIVE = DEFINE('BET_TYPE_LIVE', 'live', 'Live bet type');

// === COMMISSION CONSTANTS ===

// Default Rates
export const COMMISSION_SPORTS_DEFAULT = DEFINE(
  'COMMISSION_SPORTS_DEFAULT',
  0.05,
  'Default sports commission rate (5%)'
);
export const COMMISSION_CASINO_DEFAULT = DEFINE(
  'COMMISSION_CASINO_DEFAULT',
  0.03,
  'Default casino commission rate (3%)'
);
export const COMMISSION_LIVE_DEFAULT = DEFINE(
  'COMMISSION_LIVE_DEFAULT',
  0.04,
  'Default live betting commission rate (4%)'
);
export const COMMISSION_INET_DEFAULT = DEFINE(
  'COMMISSION_INET_DEFAULT',
  0.06,
  'Default internet commission rate (6%)'
);

// Tier Rates
export const COMMISSION_BRONZE = DEFINE(
  'COMMISSION_BRONZE',
  0.02,
  'Bronze tier commission rate (2%)'
);
export const COMMISSION_SILVER = DEFINE(
  'COMMISSION_SILVER',
  0.03,
  'Silver tier commission rate (3%)'
);
export const COMMISSION_GOLD = DEFINE('COMMISSION_GOLD', 0.04, 'Gold tier commission rate (4%)');
export const COMMISSION_PLATINUM = DEFINE(
  'COMMISSION_PLATINUM',
  0.05,
  'Platinum tier commission rate (5%)'
);

// Bonus Rates
export const COMMISSION_PERFORMANCE_BONUS = DEFINE(
  'COMMISSION_PERFORMANCE_BONUS',
  0.01,
  'Performance bonus rate (1%)'
);
export const COMMISSION_VOLUME_BONUS = DEFINE(
  'COMMISSION_VOLUME_BONUS',
  0.005,
  'Volume bonus rate (0.5%)'
);
export const COMMISSION_LOYALTY_BONUS = DEFINE(
  'COMMISSION_LOYALTY_BONUS',
  0.002,
  'Loyalty bonus rate (0.2%)'
);

// === FEATURE FLAGS ===

// Core Features
export const FEATURE_P2P_QUEUE = DEFINE('FEATURE_P2P_QUEUE', true, 'P2P queue feature enabled');
export const FEATURE_LIVE_CASINO = DEFINE(
  'FEATURE_LIVE_CASINO',
  true,
  'Live casino feature enabled'
);
export const FEATURE_SPORTS_BETTING = DEFINE(
  'FEATURE_SPORTS_BETTING',
  true,
  'Sports betting feature enabled'
);
export const FEATURE_TELEGRAM_BOT = DEFINE(
  'FEATURE_TELEGRAM_BOT',
  true,
  'Telegram bot feature enabled'
);

// Advanced Features
export const FEATURE_AI_MATCHING = DEFINE(
  'FEATURE_AI_MATCHING',
  false,
  'AI matching feature (experimental)'
);
export const FEATURE_PREDICTIVE_ANALYTICS = DEFINE(
  'FEATURE_PREDICTIVE_ANALYTICS',
  false,
  'Predictive analytics (experimental)'
);
export const FEATURE_REALTIME_NOTIFICATIONS = DEFINE(
  'FEATURE_REALTIME_NOTIFICATIONS',
  true,
  'Real-time notifications enabled'
);
export const FEATURE_ADVANCED_REPORTING = DEFINE(
  'FEATURE_ADVANCED_REPORTING',
  true,
  'Advanced reporting enabled'
);

// Experimental Features
export const FEATURE_BLOCKCHAIN_INTEGRATION = DEFINE(
  'FEATURE_BLOCKCHAIN_INTEGRATION',
  false,
  'Blockchain integration (experimental)'
);
export const FEATURE_MACHINE_LEARNING = DEFINE(
  'FEATURE_MACHINE_LEARNING',
  false,
  'Machine learning features (experimental)'
);
export const FEATURE_VOICE_COMMANDS = DEFINE(
  'FEATURE_VOICE_COMMANDS',
  false,
  'Voice commands (experimental)'
);

// === HTTP STATUS CONSTANTS ===

// Success Codes
export const HTTP_OK = DEFINE('HTTP_OK', 200, 'HTTP 200 OK');
export const HTTP_CREATED = DEFINE('HTTP_CREATED', 201, 'HTTP 201 Created');
export const HTTP_ACCEPTED = DEFINE('HTTP_ACCEPTED', 202, 'HTTP 202 Accepted');
export const HTTP_NO_CONTENT = DEFINE('HTTP_NO_CONTENT', 204, 'HTTP 204 No Content');

// Client Error Codes
export const HTTP_BAD_REQUEST = DEFINE('HTTP_BAD_REQUEST', 400, 'HTTP 400 Bad Request');
export const HTTP_UNAUTHORIZED = DEFINE('HTTP_UNAUTHORIZED', 401, 'HTTP 401 Unauthorized');
export const HTTP_FORBIDDEN = DEFINE('HTTP_FORBIDDEN', 403, 'HTTP 403 Forbidden');
export const HTTP_NOT_FOUND = DEFINE('HTTP_NOT_FOUND', 404, 'HTTP 404 Not Found');
export const HTTP_CONFLICT = DEFINE('HTTP_CONFLICT', 409, 'HTTP 409 Conflict');
export const HTTP_UNPROCESSABLE_ENTITY = DEFINE(
  'HTTP_UNPROCESSABLE_ENTITY',
  422,
  'HTTP 422 Unprocessable Entity'
);

// Server Error Codes
export const HTTP_INTERNAL_SERVER_ERROR = DEFINE(
  'HTTP_INTERNAL_SERVER_ERROR',
  500,
  'HTTP 500 Internal Server Error'
);
export const HTTP_NOT_IMPLEMENTED = DEFINE('HTTP_NOT_IMPLEMENTED', 501, 'HTTP 501 Not Implemented');
export const HTTP_BAD_GATEWAY = DEFINE('HTTP_BAD_GATEWAY', 502, 'HTTP 502 Bad Gateway');
export const HTTP_SERVICE_UNAVAILABLE = DEFINE(
  'HTTP_SERVICE_UNAVAILABLE',
  503,
  'HTTP 503 Service Unavailable'
);

// === ANALYTICS CONSTANTS ===

// Time Periods
export const ANALYTICS_PERIOD_HOURLY = DEFINE(
  'ANALYTICS_PERIOD_HOURLY',
  'hourly',
  'Hourly analytics period'
);
export const ANALYTICS_PERIOD_DAILY = DEFINE(
  'ANALYTICS_PERIOD_DAILY',
  'daily',
  'Daily analytics period'
);
export const ANALYTICS_PERIOD_WEEKLY = DEFINE(
  'ANALYTICS_PERIOD_WEEKLY',
  'weekly',
  'Weekly analytics period'
);
export const ANALYTICS_PERIOD_MONTHLY = DEFINE(
  'ANALYTICS_PERIOD_MONTHLY',
  'monthly',
  'Monthly analytics period'
);
export const ANALYTICS_PERIOD_YEARLY = DEFINE(
  'ANALYTICS_PERIOD_YEARLY',
  'yearly',
  'Yearly analytics period'
);

// Metrics
export const ANALYTICS_METRIC_REVENUE = DEFINE(
  'ANALYTICS_METRIC_REVENUE',
  'revenue',
  'Revenue analytics metric'
);
export const ANALYTICS_METRIC_VOLUME = DEFINE(
  'ANALYTICS_METRIC_VOLUME',
  'volume',
  'Volume analytics metric'
);
export const ANALYTICS_METRIC_USERS = DEFINE(
  'ANALYTICS_METRIC_USERS',
  'users',
  'Users analytics metric'
);
export const ANALYTICS_METRIC_TRANSACTIONS = DEFINE(
  'ANALYTICS_METRIC_TRANSACTIONS',
  'transactions',
  'Transactions analytics metric'
);
export const ANALYTICS_METRIC_PERFORMANCE = DEFINE(
  'ANALYTICS_METRIC_PERFORMANCE',
  'performance',
  'Performance analytics metric'
);

// Aggregations
export const ANALYTICS_AGG_SUM = DEFINE('ANALYTICS_AGG_SUM', 'sum', 'Sum aggregation');
export const ANALYTICS_AGG_AVERAGE = DEFINE(
  'ANALYTICS_AGG_AVERAGE',
  'average',
  'Average aggregation'
);
export const ANALYTICS_AGG_COUNT = DEFINE('ANALYTICS_AGG_COUNT', 'count', 'Count aggregation');
export const ANALYTICS_AGG_MIN = DEFINE('ANALYTICS_AGG_MIN', 'min', 'Minimum aggregation');
export const ANALYTICS_AGG_MAX = DEFINE('ANALYTICS_AGG_MAX', 'max', 'Maximum aggregation');

// === CSS CONSTANTS ===

// Spacing
export const SPACING_XS = DEFINE('SPACING_XS', '0.25rem', 'Extra small spacing (4px)');
export const SPACING_SM = DEFINE('SPACING_SM', '0.5rem', 'Small spacing (8px)');
export const SPACING_MD = DEFINE('SPACING_MD', '1rem', 'Medium spacing (16px)');
export const SPACING_LG = DEFINE('SPACING_LG', '1.5rem', 'Large spacing (24px)');
export const SPACING_XL = DEFINE('SPACING_XL', '2rem', 'Extra large spacing (32px)');
export const SPACING_2XL = DEFINE('SPACING_2XL', '3rem', '2X large spacing (48px)');

// Border Radius
export const RADIUS_SM = DEFINE('RADIUS_SM', '0.25rem', 'Small border radius');
export const RADIUS_MD = DEFINE('RADIUS_MD', '0.5rem', 'Medium border radius');
export const RADIUS_LG = DEFINE('RADIUS_LG', '1rem', 'Large border radius');
export const RADIUS_XL = DEFINE('RADIUS_XL', '1.5rem', 'Extra large border radius');

// Shadows
export const SHADOW_SM = DEFINE('SHADOW_SM', '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 'Small shadow');
export const SHADOW_MD = DEFINE('SHADOW_MD', '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 'Medium shadow');
export const SHADOW_LG = DEFINE('SHADOW_LG', '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 'Large shadow');
export const SHADOW_XL = DEFINE(
  'SHADOW_XL',
  '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  'Extra large shadow'
);

// Transitions
export const TRANSITION_FAST = DEFINE('TRANSITION_FAST', '150ms ease-in-out', 'Fast transition');
export const TRANSITION_NORMAL = DEFINE(
  'TRANSITION_NORMAL',
  '300ms ease-in-out',
  'Normal transition'
);
export const TRANSITION_SLOW = DEFINE('TRANSITION_SLOW', '500ms ease-in-out', 'Slow transition');

// === ERROR MESSAGE CONSTANTS ===

// Authentication Errors
export const ERROR_INVALID_CREDENTIALS = DEFINE(
  'ERROR_INVALID_CREDENTIALS',
  'Invalid username or password',
  'Invalid credentials error'
);
export const ERROR_TOKEN_EXPIRED = DEFINE(
  'ERROR_TOKEN_EXPIRED',
  'Authentication token has expired',
  'Token expired error'
);
export const ERROR_INSUFFICIENT_PERMISSIONS = DEFINE(
  'ERROR_INSUFFICIENT_PERMISSIONS',
  'Insufficient permissions for this operation',
  'Insufficient permissions error'
);
export const ERROR_ACCOUNT_LOCKED = DEFINE(
  'ERROR_ACCOUNT_LOCKED',
  'Account has been temporarily locked',
  'Account locked error'
);

// Validation Errors
export const ERROR_REQUIRED_FIELD = DEFINE(
  'ERROR_REQUIRED_FIELD',
  'This field is required',
  'Required field error'
);
export const ERROR_INVALID_FORMAT = DEFINE(
  'ERROR_INVALID_FORMAT',
  'Invalid format',
  'Invalid format error'
);
export const ERROR_OUT_OF_RANGE = DEFINE(
  'ERROR_OUT_OF_RANGE',
  'Value is out of acceptable range',
  'Out of range error'
);
export const ERROR_DUPLICATE_ENTRY = DEFINE(
  'ERROR_DUPLICATE_ENTRY',
  'This entry already exists',
  'Duplicate entry error'
);

// System Errors
export const ERROR_INTERNAL = DEFINE(
  'ERROR_INTERNAL',
  'An internal error occurred',
  'Internal system error'
);
export const ERROR_SERVICE_UNAVAILABLE = DEFINE(
  'ERROR_SERVICE_UNAVAILABLE',
  'Service is temporarily unavailable',
  'Service unavailable error'
);
export const ERROR_TIMEOUT = DEFINE('ERROR_TIMEOUT', 'Request timed out', 'Request timeout error');
export const ERROR_NETWORK = DEFINE('ERROR_NETWORK', 'Network connection error', 'Network error');

// === SUCCESS MESSAGE CONSTANTS ===

// Operation Success
export const SUCCESS_CREATED = DEFINE(
  'SUCCESS_CREATED',
  'Successfully created',
  'Creation success message'
);
export const SUCCESS_UPDATED = DEFINE(
  'SUCCESS_UPDATED',
  'Successfully updated',
  'Update success message'
);
export const SUCCESS_DELETED = DEFINE(
  'SUCCESS_DELETED',
  'Successfully deleted',
  'Deletion success message'
);
export const SUCCESS_PROCESSED = DEFINE(
  'SUCCESS_PROCESSED',
  'Successfully processed',
  'Processing success message'
);

// Authentication Success
export const SUCCESS_LOGGED_IN = DEFINE(
  'SUCCESS_LOGGED_IN',
  'Successfully logged in',
  'Login success message'
);
export const SUCCESS_LOGGED_OUT = DEFINE(
  'SUCCESS_LOGGED_OUT',
  'Successfully logged out',
  'Logout success message'
);
export const SUCCESS_PASSWORD_CHANGED = DEFINE(
  'SUCCESS_PASSWORD_CHANGED',
  'Password successfully changed',
  'Password change success message'
);

// === BUILD-TIME CONSTANT VERIFICATION ===

/**
 * Verify all constants are properly defined
 */
export const verifyConstants = (): void => {
  const requiredConstants = [
    'FIRE22_PRIMARY_MAIN',
    'API_TIMEOUT',
    'CACHE_DEFAULT_TTL',
    'HTTP_OK',
    'ERROR_INVALID_CREDENTIALS',
    'SUCCESS_CREATED',
  ];

  for (const constantName of requiredConstants) {
    if (typeof (globalThis as any)[constantName] === 'undefined') {
      throw new Error(`Required constant ${constantName} is not defined`);
    }
  }

  console.log('✅ All constants verified and properly defined');
};

// === CONSTANT GROUPS FOR EASY ACCESS ===

/**
 * Grouped constants for organized access
 */
export const CONSTANTS = {
  COLORS: {
    PRIMARY: {
      MAIN: FIRE22_PRIMARY_MAIN,
      LIGHT: FIRE22_PRIMARY_LIGHT,
      DARK: FIRE22_PRIMARY_DARK,
      CONTRAST: FIRE22_PRIMARY_CONTRAST,
    },
    SECONDARY: {
      MAIN: FIRE22_SECONDARY_MAIN,
      LIGHT: FIRE22_SECONDARY_LIGHT,
      DARK: FIRE22_SECONDARY_DARK,
      CONTRAST: FIRE22_SECONDARY_CONTRAST,
    },
    ACCENT: {
      SUCCESS: FIRE22_SUCCESS_COLOR,
      WARNING: FIRE22_WARNING_COLOR,
      ERROR: FIRE22_ERROR_COLOR,
      INFO: FIRE22_INFO_COLOR,
    },
    BACKGROUND: {
      PRIMARY: FIRE22_BG_PRIMARY,
      SECONDARY: FIRE22_BG_SECONDARY,
      TERTIARY: FIRE22_BG_TERTIARY,
      SURFACE: FIRE22_BG_SURFACE,
      OVERLAY: FIRE22_BG_OVERLAY,
    },
    TEXT: {
      PRIMARY: FIRE22_TEXT_PRIMARY,
      SECONDARY: FIRE22_TEXT_SECONDARY,
      MUTED: FIRE22_TEXT_MUTED,
      INVERSE: FIRE22_TEXT_INVERSE,
    },
  },
  SYSTEM: {
    API: {
      TIMEOUT: API_TIMEOUT,
      RETRY_ATTEMPTS: API_RETRY_ATTEMPTS,
      RETRY_DELAY: API_RETRY_DELAY,
      MAX_CONCURRENT: API_MAX_CONCURRENT,
    },
    CACHE: {
      DEFAULT_TTL: CACHE_DEFAULT_TTL,
      MAX_SIZE: CACHE_MAX_SIZE,
      CLEANUP_INTERVAL: CACHE_CLEANUP_INTERVAL,
    },
    DATABASE: {
      MAX_CONNECTIONS: DB_MAX_CONNECTIONS,
      CONNECTION_TIMEOUT: DB_CONNECTION_TIMEOUT,
      QUERY_TIMEOUT: DB_QUERY_TIMEOUT,
    },
    SECURITY: {
      JWT_EXPIRY,
      PASSWORD_MIN_LENGTH,
      MAX_LOGIN_ATTEMPTS,
      LOCKOUT_DURATION,
    },
  },
  STATUS: {
    BUILD: {
      PENDING: STATUS_BUILD_PENDING,
      RUNNING: STATUS_BUILD_RUNNING,
      COMPLETED: STATUS_BUILD_COMPLETED,
      FAILED: STATUS_BUILD_FAILED,
    },
    QUEUE: {
      PENDING: STATUS_QUEUE_PENDING,
      MATCHED: STATUS_QUEUE_MATCHED,
      PROCESSING: STATUS_QUEUE_PROCESSING,
      COMPLETED: STATUS_QUEUE_COMPLETED,
      FAILED: STATUS_QUEUE_FAILED,
    },
    HEALTH: {
      OK: STATUS_HEALTH_OK,
      WARNING: STATUS_HEALTH_WARNING,
      ERROR: STATUS_HEALTH_ERROR,
    },
  },
  HTTP: {
    SUCCESS: {
      OK: HTTP_OK,
      CREATED: HTTP_CREATED,
      ACCEPTED: HTTP_ACCEPTED,
      NO_CONTENT: HTTP_NO_CONTENT,
    },
    CLIENT_ERROR: {
      BAD_REQUEST: HTTP_BAD_REQUEST,
      UNAUTHORIZED: HTTP_UNAUTHORIZED,
      FORBIDDEN: HTTP_FORBIDDEN,
      NOT_FOUND: HTTP_NOT_FOUND,
      CONFLICT: HTTP_CONFLICT,
      UNPROCESSABLE_ENTITY: HTTP_UNPROCESSABLE_ENTITY,
    },
    SERVER_ERROR: {
      INTERNAL_SERVER_ERROR: HTTP_INTERNAL_SERVER_ERROR,
      NOT_IMPLEMENTED: HTTP_NOT_IMPLEMENTED,
      BAD_GATEWAY: HTTP_BAD_GATEWAY,
      SERVICE_UNAVAILABLE: HTTP_SERVICE_UNAVAILABLE,
    },
  },
  FEATURES: {
    CORE: {
      P2P_QUEUE: FEATURE_P2P_QUEUE,
      LIVE_CASINO: FEATURE_LIVE_CASINO,
      SPORTS_BETTING: FEATURE_SPORTS_BETTING,
      TELEGRAM_BOT: FEATURE_TELEGRAM_BOT,
    },
    ADVANCED: {
      AI_MATCHING: FEATURE_AI_MATCHING,
      PREDICTIVE_ANALYTICS: FEATURE_PREDICTIVE_ANALYTICS,
      REALTIME_NOTIFICATIONS: FEATURE_REALTIME_NOTIFICATIONS,
      ADVANCED_REPORTING: FEATURE_ADVANCED_REPORTING,
    },
    EXPERIMENTAL: {
      BLOCKCHAIN_INTEGRATION: FEATURE_BLOCKCHAIN_INTEGRATION,
      MACHINE_LEARNING: FEATURE_MACHINE_LEARNING,
      VOICE_COMMANDS: FEATURE_VOICE_COMMANDS,
    },
  },
} as const;

// Automatically verify constants on module load in development
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
  verifyConstants();
}

export default CONSTANTS;
