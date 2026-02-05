/**
 * Enhanced Logging System with ANSI Stripping
 *
 * This module provides enhanced logging capabilities that integrate with
 * Bun's new features, including ANSI stripping for clean output and
 * build-time configuration integration.
 *
 * Features:
 * - ANSI color support for console output
 * - Clean text output for log files and monitoring
 * - Build-time configuration integration
 * - Performance-optimized logging
 * - Cross-platform compatibility
 */

import { getEffectiveConfig, BuildTimeConfig } from '../config/build-time-config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  environment: string;
  version: string;
}

export interface LoggerOptions {
  includeTimestamp?: boolean;
  includeContext?: boolean;
  includeEnvironment?: boolean;
  includeVersion?: boolean;
  colorize?: boolean;
  stripANSI?: boolean;
}

export class EnhancedLogger {
  private config: BuildTimeConfig;
  private options: LoggerOptions;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 1000;

  constructor(options: LoggerOptions = {}) {
    this.config = getEffectiveConfig();
    this.options = {
      includeTimestamp: true,
      includeContext: true,
      includeEnvironment: true,
      includeVersion: true,
      colorize: true,
      stripANSI: true,
      ...options,
    };
  }

  /**
   * Log a message with the specified level
   */
  log(message: string, level: LogLevel = 'info', context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      environment: this.config.environment,
      version: this.config.version,
    };

    // Add to buffer
    this.addToBuffer(entry);

    // Console output (with colors if enabled)
    if (this.options.colorize) {
      const coloredMessage = this.colorize(message, level);
      console.log(this.formatConsoleOutput(entry, coloredMessage));
    } else {
      console.log(this.formatConsoleOutput(entry, message));
    }

    // Write to log file (without colors)
    if (this.options.stripANSI) {
      const cleanMessage = Bun.stripANSI(message);
      const cleanEntry = { ...entry, message: cleanMessage };
      this.writeToLogFile(cleanEntry);
    } else {
      this.writeToLogFile(entry);
    }

    // Send to monitoring systems (clean text)
    if (this.config.runtime.monitor) {
      const cleanMessage = this.options.stripANSI ? Bun.stripANSI(message) : message;
      this.sendToMonitoring({ ...entry, message: cleanMessage });
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.config.debugMode) {
      this.log(message, 'debug', context);
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(message, 'info', context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(message, 'warn', context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>): void {
    this.log(message, 'error', context);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context?: Record<string, any>): void {
    this.log(message, 'fatal', context);
  }

  /**
   * Colorize message based on log level
   */
  private colorize(message: string, level: LogLevel): string {
    const colors = {
      debug: '\u001b[36m', // Cyan
      info: '\u001b[32m', // Green
      warn: '\u001b[33m', // Yellow
      error: '\u001b[31m', // Red
      fatal: '\u001b[35m', // Magenta
    };

    const reset = '\u001b[0m';
    return `${colors[level]}${message}${reset}`;
  }

  /**
   * Format console output
   */
  private formatConsoleOutput(entry: LogEntry, message: string): string {
    let output = '';

    if (this.options.includeTimestamp) {
      output += `[${entry.timestamp}] `;
    }

    output += `[${entry.level.toUpperCase()}] `;

    if (this.options.includeEnvironment) {
      output += `[${entry.environment}] `;
    }

    if (this.options.includeVersion) {
      output += `[v${entry.version}] `;
    }

    output += message;

    if (this.options.includeContext && entry.context) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    return output;
  }

  /**
   * Add entry to log buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Write to log file
   */
  private writeToLogFile(entry: LogEntry): void {
    try {
      const logDir = './logs';
      const logFile = `${logDir}/${entry.environment}-${new Date().toISOString().split('T')[0]}.log`;

      // Ensure log directory exists
      Bun.mkdir(logDir, { recursive: true });

      const logLine = JSON.stringify(entry) + '\n';
      Bun.write(logFile, logLine, { append: true });
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Send to monitoring systems
   */
  private sendToMonitoring(entry: LogEntry): void {
    try {
      // This would integrate with your existing monitoring system
      // For now, we'll just log that we're sending to monitoring
      if (this.config.debugMode) {
        console.log(`📊 Sending to monitoring: ${entry.level} - ${entry.message}`);
      }
    } catch (error) {
      console.error('Failed to send to monitoring:', error);
    }
  }

  /**
   * Get log buffer
   */
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Get log statistics
   */
  getLogStats(): Record<LogLevel, number> {
    const stats: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    for (const entry of this.logBuffer) {
      stats[entry.level]++;
    }

    return stats;
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Performance test for ANSI stripping
   */
  static async testANSIStrippingPerformance(): Promise<{
    bunStripANSI: number;
    manualStrip: number;
    improvement: number;
  }> {
    const longColoredText = '\u001b[31m'.repeat(1000) + 'Hello World' + '\u001b[0m'.repeat(1000);

    // Test Bun.stripANSI
    const bunStart = performance.now();
    const bunResult = Bun.stripANSI(longColoredText);
    const bunEnd = performance.now();
    const bunTime = bunEnd - bunStart;

    // Test manual stripping (simple regex)
    const manualStart = performance.now();
    const manualResult = longColoredText.replace(/\u001b\[[0-9;]*m/g, '');
    const manualEnd = performance.now();
    const manualTime = manualEnd - manualStart;

    const improvement = manualTime / bunTime;

    return {
      bunStripANSI: bunTime,
      manualStrip: manualTime,
      improvement,
    };
  }
}

// Create default logger instance
export const logger = new EnhancedLogger();

// Export convenience functions
export const log = (message: string, level: LogLevel = 'info', context?: Record<string, any>) =>
  logger.log(message, level, context);

export const debug = (message: string, context?: Record<string, any>) =>
  logger.debug(message, context);

export const info = (message: string, context?: Record<string, any>) =>
  logger.info(message, context);

export const warn = (message: string, context?: Record<string, any>) =>
  logger.warn(message, context);

export const error = (message: string, context?: Record<string, any>) =>
  logger.error(message, context);

export const fatal = (message: string, context?: Record<string, any>) =>
  logger.fatal(message, context);

export default logger;
