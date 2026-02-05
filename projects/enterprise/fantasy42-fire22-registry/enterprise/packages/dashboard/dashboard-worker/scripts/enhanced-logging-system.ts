#!/usr/bin/env bun
/**
 * Enhanced Logging System with Bun.color, Error Tracking & Timezone Management
 * Uses native Bun features for optimal performance
 */

import { color } from 'bun' with { type: 'macro' };

// !==!==!===== ENHANCED ANSI COLOR SUPPORT !==!==!=====
export class ANSIColorManager {
  // Extended color palette with Bun v1.01.04-alpha support
  static readonly COLORS = {
    // Basic colors
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    // Foreground colors
    fg: {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
    },

    // Background colors
    bg: {
      black: '\x1b[40m',
      red: '\x1b[41m',
      green: '\x1b[42m',
      yellow: '\x1b[43m',
      blue: '\x1b[44m',
      magenta: '\x1b[45m',
      cyan: '\x1b[46m',
      white: '\x1b[47m',
      gray: '\x1b[100m',
    },

    // 256-color support
    rgb256: (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`,
    bgRgb256: (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`,

    // Bun-specific gradient colors
    bunOrange: '\x1b[38;2;251;113;133m',
    bunPink: '\x1b[38;2;249;115;22m',
    bunYellow: '\x1b[38;2;245;158;11m',

    // Fire22 brand colors
    fire22Red: '\x1b[38;2;178;31;31m',
    fire22Gold: '\x1b[38;2;253;187;45m',
    fire22Blue: '\x1b[38;2;26;42;108m',

    // Water Dashboard theme
    waterBlue: '\x1b[38;2;0;123;148m',
    waterLight: '\x1b[38;2;179;229;252m',
    waterDark: '\x1b[38;2;15;23;42m',
  };

  /**
   * Apply color with automatic fallback
   */
  static colorize(text: string, colorCode: string, fallback?: string): string {
    // Check if colors are supported
    if (process.env.NO_COLOR || process.env.NODE_ENV === 'test') {
      return fallback || text;
    }

    return `${colorCode}${text}${ANSIColorManager.COLORS.reset}`;
  }

  /**
   * Create gradient text (Bun theme)
   */
  static bunGradient(text: string): string {
    const chars = text.split('');
    const colors = [
      ANSIColorManager.COLORS.bunOrange,
      ANSIColorManager.COLORS.bunPink,
      ANSIColorManager.COLORS.bunYellow,
    ];

    return chars
      .map((char, i) => {
        const colorIndex = i % colors.length;
        return ANSIColorManager.colorize(char, colors[colorIndex]);
      })
      .join('');
  }

  /**
   * Create Fire22 themed text
   */
  static fire22Theme(text: string): string {
    return ANSIColorManager.colorize(text, ANSIColorManager.COLORS.fire22Gold);
  }

  /**
   * Create water dashboard themed text
   */
  static waterTheme(text: string): string {
    return ANSIColorManager.colorize(text, ANSIColorManager.COLORS.waterBlue);
  }

  /**
   * Clean ANSI codes using Bun.stripANSI
   */
  static stripANSI(text: string): string {
    if (typeof Bun !== 'undefined' && Bun.stripANSI) {
      return Bun.stripANSI(text);
    }
    // Fallback regex if Bun.stripANSI is not available
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Format log level with appropriate colors
   */
  static formatLogLevel(level: string): string {
    const levelColors = {
      debug: ANSIColorManager.COLORS.fg.gray,
      info: ANSIColorManager.COLORS.fg.cyan,
      success: ANSIColorManager.COLORS.fg.green,
      warning: ANSIColorManager.COLORS.fg.yellow,
      error: ANSIColorManager.COLORS.fg.red,
      critical: ANSIColorManager.COLORS.bg.red + ANSIColorManager.COLORS.fg.white,
    };

    const color = levelColors[level.toLowerCase()] || ANSIColorManager.COLORS.fg.white;
    return ANSIColorManager.colorize(`[${level.toUpperCase()}]`, color);
  }

  /**
   * Format module name with water theme
   */
  static formatModule(module: string): string {
    return ANSIColorManager.colorize(`[${module}]`, ANSIColorManager.COLORS.waterBlue);
  }

  /**
   * Format version with Bun theme
   */
  static formatVersion(version: string): string {
    return ANSIColorManager.colorize(`[v${version}]`, ANSIColorManager.COLORS.bunOrange);
  }

  /**
   * Format error code with Fire22 theme
   */
  static formatErrorCode(errorCode?: string): string {
    if (!errorCode) return '';
    return ANSIColorManager.colorize(`[${errorCode}]`, ANSIColorManager.COLORS.fire22Red);
  }

  /**
   * Create progress bar
   */
  static progressBar(percentage: number, width = 20): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;

    const filledBar = ANSIColorManager.colorize(
      '█'.repeat(filled),
      ANSIColorManager.COLORS.fg.green
    );
    const emptyBar = ANSIColorManager.colorize('░'.repeat(empty), ANSIColorManager.COLORS.fg.gray);

    return `[${filledBar}${emptyBar}] ${percentage.toFixed(1)}%`;
  }
}

// !==!==!===== TIMEZONE MANAGEMENT !==!==!=====
export class TimezoneManager {
  private static instance: TimezoneManager;

  // **TIMEZONE CONSTANTS**
  static readonly TIMEZONES = {
    UTC: 'UTC',
    NEW_YORK: 'America/New_York',
    LOS_ANGELES: 'America/Los_Angeles',
    LONDON: 'Europe/London',
    TOKYO: 'Asia/Tokyo',
    SYDNEY: 'Australia/Sydney',
  } as const;

  private currentTimezone: string;

  constructor() {
    // Default to system timezone
    this.currentTimezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  static getInstance(): TimezoneManager {
    if (!TimezoneManager.instance) {
      TimezoneManager.instance = new TimezoneManager();
    }
    return TimezoneManager.instance;
  }

  /**
   * Set timezone for the process lifetime
   */
  setTimezone(timezone: string): void {
    process.env.TZ = timezone;
    this.currentTimezone = timezone;
  }

  /**
   * Get current timezone
   */
  getCurrentTimezone(): string {
    return this.currentTimezone;
  }

  /**
   * Get formatted timestamp with current timezone
   */
  getFormattedTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').split('.')[0];
  }

  /**
   * Get timezone-aware timestamp
   */
  getTimestampWithTimezone(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: this.currentTimezone,
      hour12: false,
    });

    return formatter.format(now).replace(/(\d+)\/(\d+)\/(\d+),\s*(\d+:\d+:\d+)/, '$3-$1-$2 $4');
  }
}

// !==!==!===== ERROR CODE SYSTEM !==!==!=====
export class ErrorCodeManager {
  private static instance: ErrorCodeManager;
  private errorCounts: Map<string, number> = new Map();

  // **ERROR CODE DEFINITIONS**
  static readonly ERROR_CODES = {
    // System Errors (1000-1999)
    SYSTEM_INIT_FAILED: {
      code: 'E1001',
      message: 'System initialization failed',
      severity: 'CRITICAL',
    },
    MEMORY_LIMIT_EXCEEDED: { code: 'E1002', message: 'Memory limit exceeded', severity: 'ERROR' },
    CONFIG_INVALID: { code: 'E1003', message: 'Invalid configuration', severity: 'ERROR' },

    // Database Errors (2000-2999)
    DB_CONNECTION_FAILED: {
      code: 'E2001',
      message: 'Database connection failed',
      severity: 'CRITICAL',
    },
    DB_QUERY_TIMEOUT: { code: 'E2002', message: 'Database query timeout', severity: 'ERROR' },
    DB_CONSTRAINT_VIOLATION: {
      code: 'E2003',
      message: 'Database constraint violation',
      severity: 'ERROR',
    },

    // API Errors (3000-3999)
    API_UNAUTHORIZED: { code: 'E3001', message: 'Unauthorized API request', severity: 'WARNING' },
    API_RATE_LIMIT: { code: 'E3002', message: 'API rate limit exceeded', severity: 'WARNING' },
    API_VALIDATION_FAILED: { code: 'E3003', message: 'API validation failed', severity: 'ERROR' },

    // Network Errors (4000-4999)
    NETWORK_TIMEOUT: { code: 'E4001', message: 'Network request timeout', severity: 'ERROR' },
    DNS_RESOLUTION_FAILED: { code: 'E4002', message: 'DNS resolution failed', severity: 'ERROR' },
    SSL_CERTIFICATE_INVALID: {
      code: 'E4003',
      message: 'Invalid SSL certificate',
      severity: 'ERROR',
    },

    // Application Errors (5000-5999)
    VALIDATION_ERROR: { code: 'E5001', message: 'Data validation error', severity: 'WARNING' },
    RESOURCE_NOT_FOUND: { code: 'E5002', message: 'Resource not found', severity: 'INFO' },
    PERMISSION_DENIED: { code: 'E5003', message: 'Permission denied', severity: 'WARNING' },
  } as const;

  static getInstance(): ErrorCodeManager {
    if (!ErrorCodeManager.instance) {
      ErrorCodeManager.instance = new ErrorCodeManager();
    }
    return ErrorCodeManager.instance;
  }

  /**
   * Track error occurrence
   */
  trackError(errorCode: string): void {
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);
  }

  /**
   * Get error count for specific code
   */
  getErrorCount(errorCode: string): number {
    return this.errorCounts.get(errorCode) || 0;
  }

  /**
   * Get all error counts
   */
  getAllErrorCounts(): Map<string, number> {
    return new Map(this.errorCounts);
  }

  /**
   * Get total error count
   */
  getTotalErrorCount(): number {
    return Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Reset error counts
   */
  resetCounts(): void {
    this.errorCounts.clear();
  }

  /**
   * Get error info by code
   */
  getErrorInfo(errorCode: string): any {
    return (
      Object.values(ErrorCodeManager.ERROR_CODES).find(error => error.code === errorCode) || null
    );
  }
}

// !==!==!===== COLOR CONSTANTS !==!==!=====
export const LOG_COLORS = {
  // **BRIGHT COLORS** using Bun.color macros
  TIMESTAMP: color('#64748b', 'css'), // Slate gray
  INFO: color('#3b82f6', 'css'), // Bright blue
  SUCCESS: color('#10b981', 'css'), // Bright green
  WARNING: color('#f59e0b', 'css'), // Bright amber
  ERROR: color('#ef4444', 'css'), // Bright red
  CRITICAL: color('#dc2626', 'css'), // Dark red
  DEBUG: color('#8b5cf6', 'css'), // Bright purple
  TRACE: color('#06b6d4', 'css'), // Bright cyan

  // **MODULE COLORS**
  MODULE_DASHBOARD: color('#ff8e53', 'css'), // Orange
  MODULE_DATABASE: color('#40e0d0', 'css'), // Turquoise
  MODULE_API: color('#1e90ff', 'css'), // Deep sky blue
  MODULE_WEBSOCKET: color('#4ade80', 'css'), // Bright green
  MODULE_AUTH: color('#f97316', 'css'), // Orange
  MODULE_SECURITY: color('#dc2626', 'css'), // Red

  // **VERSION COLORS**
  VERSION: color('#4ade80', 'css'), // Bright green
  PACKAGE: color('#40e0d0', 'css'), // Turquoise
  ERROR_CODE: color('#fbbf24', 'css'), // Bright yellow

  // **SPECIAL ELEMENTS**
  BRACKETS: color('#64748b', 'css'), // Gray
  HIGHLIGHT: color('#fbbf24', 'css'), // Yellow highlight
  LINK: color('#06b6d4', 'css'), // Cyan links
} as const;

// !==!==!===== ENHANCED LOGGER CLASS !==!==!=====
export class EnhancedLogger {
  private timezoneManager: TimezoneManager;
  private errorManager: ErrorCodeManager;
  private logCounts: Map<string, number> = new Map();

  constructor() {
    this.timezoneManager = TimezoneManager.getInstance();
    this.errorManager = ErrorCodeManager.getInstance();
  }

  /**
   * Format log entry with enhanced ANSI colors and tracking
   */
  private formatLogEntry(
    level: string,
    module: string,
    version: string,
    message: string,
    errorCode?: string
  ): string {
    // Track log count
    const currentCount = this.logCounts.get(level) || 0;
    this.logCounts.set(level, currentCount + 1);

    // Track error if provided
    if (errorCode) {
      this.errorManager.trackError(errorCode);
    }

    const timestamp = this.timezoneManager.getTimestampWithTimezone();

    // Build enhanced colored log entry using ANSIColorManager
    const parts = [
      ANSIColorManager.colorize(`[${timestamp}]`, ANSIColorManager.COLORS.fg.gray),
      ANSIColorManager.formatLogLevel(level),
      ANSIColorManager.formatModule(module),
      ANSIColorManager.formatVersion(version),
    ];

    if (errorCode) {
      const errorInfo = this.errorManager.getErrorInfo(errorCode);
      parts.push(ANSIColorManager.formatErrorCode(errorCode));
      if (errorInfo) {
        parts.push(
          ANSIColorManager.colorize(
            `[${errorInfo.severity}]`,
            ANSIColorManager.COLORS.bg.red + ANSIColorManager.COLORS.fg.white
          )
        );
      }
    }

    // Add the actual message
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Format log entry for production (clean, no colors)
   */
  private formatLogEntryClean(
    level: string,
    module: string,
    version: string,
    message: string,
    errorCode?: string
  ): string {
    const formatted = this.formatLogEntry(level, module, version, message, errorCode);
    return ANSIColorManager.stripANSI(formatted);
  }

  /**
   * Get the appropriate log formatter based on environment
   */
  private getFormatter(): (
    level: string,
    module: string,
    version: string,
    message: string,
    errorCode?: string
  ) => string {
    const isProduction = process.env.NODE_ENV === 'production';
    const isStandalone = process.argv[0].includes('water-dashboard');
    const noColor = process.env.NO_COLOR;

    if (isProduction || isStandalone || noColor) {
      return this.formatLogEntryClean.bind(this);
    }

    return this.formatLogEntry.bind(this);
  }

  /**
   * Get appropriate color for module
   */
  private getModuleColor(module: string): string {
    const moduleKey = `MODULE_${module}` as keyof typeof LOG_COLORS;
    return LOG_COLORS[moduleKey] || LOG_COLORS.INFO;
  }

  /**
   * Log info message
   */
  info(module: string, version: string, message: string): void {
    const formatter = this.getFormatter();
    const formatted = formatter('info', module, version, message);
    console.log(formatted);
  }

  /**
   * Log success message
   */
  success(module: string, version: string, message: string): void {
    const formatter = this.getFormatter();
    const formatted = formatter('success', module, version, message);
    console.log(formatted);
  }

  /**
   * Log warning message
   */
  warning(module: string, version: string, message: string, errorCode?: string): void {
    const formatter = this.getFormatter();
    const formatted = formatter('warning', module, version, message, errorCode);
    console.warn(formatted);
  }

  /**
   * Log error message
   */
  error(module: string, version: string, message: string, errorCode?: string): void {
    const formatter = this.getFormatter();
    const formatted = formatter('error', module, version, message, errorCode);
    console.error(formatted);
  }

  /**
   * Log critical message
   */
  critical(module: string, version: string, message: string, errorCode?: string): void {
    const formatter = this.getFormatter();
    const formatted = formatter('critical', module, version, message, errorCode);
    console.error(formatted);
  }

  /**
   * Log debug message
   */
  debug(module: string, version: string, message: string): void {
    const formatted = this.formatLogEntry('DEBUG', module, version, message);
    console.log(formatted);
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    logCounts: Map<string, number>;
    errorCounts: Map<string, number>;
    totalLogs: number;
    totalErrors: number;
    timezone: string;
  } {
    return {
      logCounts: new Map(this.logCounts),
      errorCounts: this.errorManager.getAllErrorCounts(),
      totalLogs: Array.from(this.logCounts.values()).reduce((sum, count) => sum + count, 0),
      totalErrors: this.errorManager.getTotalErrorCount(),
      timezone: this.timezoneManager.getCurrentTimezone(),
    };
  }

  /**
   * Change timezone
   */
  setTimezone(timezone: string): void {
    this.timezoneManager.setTimezone(timezone);
    this.info('LOGGER', '2.0.0', `Timezone changed to ${timezone}`);
  }

  /**
   * Reset all counts
   */
  resetCounts(): void {
    this.logCounts.clear();
    this.errorManager.resetCounts();
  }
}

// !==!==!===== CLIENT-SIDE COLOR BUILD !==!==!=====
export function buildClientSideColors(): Record<string, string> {
  return {
    timestamp: color('#64748b', 'css'),
    info: color('#3b82f6', 'css'),
    success: color('#10b981', 'css'),
    warning: color('#f59e0b', 'css'),
    error: color('#ef4444', 'css'),
    critical: color('#dc2626', 'css'),
    debug: color('#8b5cf6', 'css'),
    trace: color('#06b6d4', 'css'),
    module: color('#ff8e53', 'css'),
    version: color('#4ade80', 'css'),
    package: color('#40e0d0', 'css'),
    errorCode: color('#fbbf24', 'css'),
    brackets: color('#64748b', 'css'),
    highlight: color('#fbbf24', 'css'),
  };
}

// !==!==!===== EXPORTS !==!==!=====
export const logger = new EnhancedLogger();
export const timezoneManager = TimezoneManager.getInstance();
export const errorManager = ErrorCodeManager.getInstance();

// !==!==!===== CLI DEMO !==!==!=====
if (import.meta.main) {
  console.log('\n🌈 ENHANCED LOGGING SYSTEM DEMO 🌈\n');
  console.log('='.repeat(60));

  // Set timezone for demo
  logger.setTimezone('America/New_York');

  // Demo different log levels
  logger.info(
    'DASHBOARD',
    '2.0.0',
    `System initialized with ${color('#40e0d0', 'css')}[pk:bun@1.2.21]${color('#ffffff', 'css')}`
  );
  logger.success(
    'DATABASE',
    '1.0.0',
    `Connected to D1 ${color('#40e0d0', 'css')}[pk:@cloudflare/d1@^1.0.0]${color('#ffffff', 'css')}`
  );
  logger.warning('API', '2.0.0', 'Rate limit approaching', 'E3002');
  logger.error('WEBSOCKET', '2.0.0', 'Connection failed', 'E4001');
  logger.critical('SECURITY', '1.3.2', 'Unauthorized access attempt', 'E3001');
  logger.debug(
    'PATTERN_MATCH',
    '2.1.0',
    `Pattern matched: ${color('#fbbf24', 'css')}/\\[pk:([^@]+)@([^\\]]+)\\]/g${color('#ffffff', 'css')}`
  );

  // Show statistics
  console.log('\n📊 **LOG STATISTICS**');
  console.log('-'.repeat(60));
  const stats = logger.getLogStats();

  console.log(
    `Current Timezone: ${color('#4ade80', 'css')}${stats.timezone}${color('#ffffff', 'css')}`
  );
  console.log(`Total Logs: ${color('#3b82f6', 'css')}${stats.totalLogs}${color('#ffffff', 'css')}`);
  console.log(
    `Total Errors: ${color('#ef4444', 'css')}${stats.totalErrors}${color('#ffffff', 'css')}`
  );

  console.log('\n🏷️ **LOG COUNTS BY TYPE**');
  console.log('-'.repeat(60));
  stats.logCounts.forEach((count, level) => {
    console.log(
      `${level.padEnd(10)}: ${color('#40e0d0', 'css')}${count}${color('#ffffff', 'css')}`
    );
  });

  console.log('\n❌ **ERROR COUNTS BY CODE**');
  console.log('-'.repeat(60));
  stats.errorCounts.forEach((count, code) => {
    const errorInfo = errorManager.getErrorInfo(code);
    console.log(
      `${code.padEnd(6)}: ${color('#ef4444', 'css')}${count}${color('#ffffff', 'css')} - ${errorInfo?.message || 'Unknown error'}`
    );
  });

  console.log('\n🌍 **TIMEZONE CHANGE DEMO**');
  console.log('-'.repeat(60));
  const timezones = ['UTC', 'Europe/London', 'Asia/Tokyo', 'America/Los_Angeles'];

  timezones.forEach(tz => {
    logger.setTimezone(tz);
    logger.info('TIMEZONE', '2.0.0', `Current time in ${tz}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('Enhanced logging system demo complete!');
}
