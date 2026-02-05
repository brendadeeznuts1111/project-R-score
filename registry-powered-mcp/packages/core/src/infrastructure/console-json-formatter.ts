/**
 * Component #51: Console JSON Formatter
 * Logic Tier: Level 2 (Debug)
 * Resource Tax: CPU <0.1%
 * Parity Lock: 5f6g...7h8i
 * Protocol: Console Web API
 *
 * Provides %j specifier for structured JSON logging.
 * Integrates with Component #11 (Atomic-Integrity-Log) for audit trails.
 *
 * @module infrastructure/console-json-formatter
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Log level for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'audit';

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  context?: {
    component?: number;
    requestId?: string;
    userId?: string;
  };
}

/**
 * Format specifiers supported
 */
type FormatSpecifier = 's' | 'd' | 'i' | 'f' | 'j' | 'o' | 'c' | '%';

/**
 * Console JSON Formatter
 * Extends console with %j specifier for structured JSON output
 */
export class ConsoleJSONFormatter {
  private static originalLog: typeof console.log | null = null;
  private static originalInfo: typeof console.info | null = null;
  private static originalWarn: typeof console.warn | null = null;
  private static originalError: typeof console.error | null = null;
  private static isEnabled = false;

  /**
   * Format string with specifiers
   */
  static formatLog(format: string, ...args: unknown[]): string {
    if (typeof format !== 'string') {
      return String(format);
    }

    let argIndex = 0;
    const formatted = format.replace(
      /%([sdifjo%c])/g,
      (match, specifier: FormatSpecifier) => {
        if (specifier === '%') {
          return '%';
        }

        if (argIndex >= args.length) {
          return match;
        }

        const arg = args[argIndex++];

        switch (specifier) {
          case 's':
            return String(arg);

          case 'd':
          case 'i':
            return String(parseInt(String(arg), 10));

          case 'f':
            return String(parseFloat(String(arg)));

          case 'j':
            try {
              return JSON.stringify(arg);
            } catch {
              return '[Circular]';
            }

          case 'o':
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return '[Circular]';
            }

          case 'c':
            // CSS specifier - ignored in terminal
            return '';

          default:
            return match;
        }
      }
    );

    // Append remaining arguments
    const remaining = args.slice(argIndex);
    if (remaining.length > 0) {
      return (
        formatted +
        ' ' +
        remaining.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
      );
    }

    return formatted;
  }

  /**
   * Create structured log entry
   */
  static createLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    context?: LogEntry['context']
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context,
    };
  }

  /**
   * Log audit event (integrates with Component #11)
   */
  static logAudit(
    event: string,
    data: Record<string, unknown>,
    context?: LogEntry['context']
  ): void {
    const entry = this.createLogEntry('audit', event, data, context);

    if (this.originalLog) {
      this.originalLog('[AUDIT]', JSON.stringify(entry));
    } else {
      console.log('[AUDIT]', JSON.stringify(entry));
    }
  }

  /**
   * Log endpoint access for MCP monitoring
   */
  static logEndpointAccess(
    method: string,
    url: string,
    statusCode: number,
    durationMs?: number
  ): void {
    this.logAudit('endpoint_access', {
      method,
      url,
      statusCode,
      durationMs,
    });
  }

  /**
   * Log component health check
   */
  static logComponentHealth(
    componentId: number,
    status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED',
    latencyMs?: number
  ): void {
    this.logAudit(
      'component_health',
      {
        status,
        latencyMs,
      },
      { component: componentId }
    );
  }

  /**
   * Enable console formatting with %j specifier
   */
  static enableFormatting(): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;

    // Store originals
    this.originalLog = console.log;
    this.originalInfo = console.info;
    this.originalWarn = console.warn;
    this.originalError = console.error;

    // Override console methods
    console.log = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('%')) {
        this.originalLog!(this.formatLog(args[0], ...args.slice(1)));
      } else {
        this.originalLog!(...args);
      }
    };

    console.info = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('%')) {
        this.originalInfo!(this.formatLog(args[0], ...args.slice(1)));
      } else {
        this.originalInfo!(...args);
      }
    };

    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('%')) {
        this.originalWarn!(this.formatLog(args[0], ...args.slice(1)));
      } else {
        this.originalWarn!(...args);
      }
    };

    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('%')) {
        this.originalError!(this.formatLog(args[0], ...args.slice(1)));
      } else {
        this.originalError!(...args);
      }
    };
  }

  /**
   * Disable console formatting
   */
  static disableFormatting(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;

    // Restore originals
    if (this.originalLog) console.log = this.originalLog;
    if (this.originalInfo) console.info = this.originalInfo;
    if (this.originalWarn) console.warn = this.originalWarn;
    if (this.originalError) console.error = this.originalError;
  }

  /**
   * Check if formatting is enabled
   */
  static isFormattingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Format object for pretty printing
   */
  static prettyPrint(obj: unknown, indent = 2): string {
    try {
      return JSON.stringify(obj, null, indent);
    } catch {
      return '[Circular]';
    }
  }

  /**
   * Create NDJSON log stream formatter
   */
  static createNDJSONFormatter(): (entry: LogEntry) => string {
    return (entry: LogEntry) => JSON.stringify(entry);
  }
}

/**
 * Convenience exports
 */
export const formatLog = ConsoleJSONFormatter.formatLog.bind(ConsoleJSONFormatter);
export const logAudit = ConsoleJSONFormatter.logAudit.bind(ConsoleJSONFormatter);
export const logEndpointAccess = ConsoleJSONFormatter.logEndpointAccess.bind(ConsoleJSONFormatter);
export const logComponentHealth = ConsoleJSONFormatter.logComponentHealth.bind(ConsoleJSONFormatter);
export const enableFormatting = ConsoleJSONFormatter.enableFormatting.bind(ConsoleJSONFormatter);
export const disableFormatting = ConsoleJSONFormatter.disableFormatting.bind(ConsoleJSONFormatter);
export const prettyPrint = ConsoleJSONFormatter.prettyPrint.bind(ConsoleJSONFormatter);

/**
 * Auto-enable if feature flag is set
 */
if (isFeatureEnabled('DEBUG')) {
  ConsoleJSONFormatter.enableFormatting();
}
