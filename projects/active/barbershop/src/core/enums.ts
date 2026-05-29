/**
 * Enums for Enhanced Gateway & Lock Dashboard System
 * Provides type-safe constants for all system components
 */

/**
 * Lock priority levels for enhanced lock management
 */
export enum LockPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Alert types for the notification system
 */
export enum AlertType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * Lock action types for history tracking
 */
export enum LockAction {
  ACQUIRED = 'acquired',
  RELEASED = 'released',
  EXTENDED = 'extended',
  EXPIRED = 'expired'
}

/**
 * Deadlock resolution types
 */
export enum DeadlockResolution {
  AUTO_RESOLVED = 'auto_resolved',
  MANUAL_INTERVENTION = 'manual_intervention',
  TIMEOUT = 'timeout'
}

/**
 * Gateway status types
 */
export enum GatewayStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance'
}

/**
 * Profile binding status
 */
export enum ProfileBindingStatus {
  BOUND = 'bound',
  UNBOUND = 'unbound',
  PENDING = 'pending',
  ERROR = 'error'
}

/**
 * System health indicators
 */
export enum SystemHealth {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

/**
 * Chart types for data visualization
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  AREA = 'area'
}

/**
 * Refresh intervals for dashboard updates
 */
export enum RefreshInterval {
  ONE_SECOND = 1000,
  FIVE_SECONDS = 5000,
  TEN_SECONDS = 10000,
  THIRTY_SECONDS = 30000
}

/**
 * Batch operation types
 */
export enum BatchOperation {
  RELEASE_ALL = 'release-all',
  EXTEND_ALL = 'extend-all',
  CLEANUP_EXPIRED = 'cleanup-expired',
  EXPORT_DATA = 'export-data'
}

/**
 * Settings categories
 */
export enum SettingsCategory {
  DASHBOARD = 'dashboard',
  LOCKS = 'locks',
  ALERTS = 'alerts',
  APPEARANCE = 'appearance'
}

/**
 * Notification positions
 */
export enum NotificationPosition {
  TOP_RIGHT = 'top-right',
  TOP_LEFT = 'top-left',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_LEFT = 'bottom-left',
  TOP_CENTER = 'top-center',
  BOTTOM_CENTER = 'bottom-center'
}

/**
 * Data export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  PDF = 'pdf'
}

/**
 * Log levels for system logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Metric types for monitoring
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Connection states
 */
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Theme modes
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
  FACTORYWAGER = 'factorywager'
}

/**
 * Permission levels
 */
export enum PermissionLevel {
  READ_ONLY = 'read-only',
  OPERATOR = 'operator',
  ADMINISTRATOR = 'administrator',
  SUPER_ADMIN = 'super-admin'
}

/**
 * Resource types for categorization
 */
export enum ResourceType {
  LOCK = 'lock',
  GATEWAY = 'gateway',
  PROFILE = 'profile',
  METRIC = 'metric',
  ALERT = 'alert',
  SETTING = 'setting'
}

/**
 * Sort orders for data tables
 */
export enum SortOrder {
  ASCENDING = 'asc',
  DESCENDING = 'desc'
}

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_EQUAL = 'ge',
  LESS_EQUAL = 'le',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts-with',
  ENDS_WITH = 'ends-with'
}

/**
 * HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Validation rules
 */
export enum ValidationRule {
  REQUIRED = 'required',
  MIN_LENGTH = 'min-length',
  MAX_LENGTH = 'max-length',
  PATTERN = 'pattern',
  EMAIL = 'email',
  URL = 'url',
  NUMERIC = 'numeric',
  POSITIVE = 'positive'
}

/**
 * Time units for duration formatting
 */
export enum TimeUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  MINUTES = 'm',
  HOURS = 'h',
  DAYS = 'd'
}

/**
 * File types for uploads/exports
 */
export enum FileType {
  JSON = 'application/json',
  CSV = 'text/csv',
  XML = 'application/xml',
  PDF = 'application/pdf',
  TEXT = 'text/plain'
}

/**
 * Color schemes for UI elements
 */
export enum ColorScheme {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

/**
 * Animation types
 */
export enum AnimationType {
  FADE = 'fade',
  SLIDE = 'slide',
  BOUNCE = 'bounce',
  PULSE = 'pulse',
  SHAKE = 'shake'
}

/**
 * Device types for responsive design
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown'
}

/**
 * Browser types
 */
export enum BrowserType {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  EDGE = 'edge',
  OPERA = 'opera',
  UNKNOWN = 'unknown'
}
