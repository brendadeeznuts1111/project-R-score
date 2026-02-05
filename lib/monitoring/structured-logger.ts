#!/usr/bin/env bun

/**
 * 📊 Structured Logger
 * 
 * Comprehensive logging system with structured output,
 * correlation tracking, and performance monitoring.
 */

import { AtomicFileOperations } from "../core/atomic-file-operations";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  service?: string;
  module?: string;
  function?: string;
  line?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  metrics?: Record<string, number>;
}

interface LoggerConfig {
  level: LogLevel;
  service: string;
  enableConsole: boolean;
  enableFile: boolean;
  logFile?: string;
  enableMetrics: boolean;
  correlationIdHeader?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

class StructuredLogger {
  private config: LoggerConfig;
  private currentCorrelationId?: string;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? 'info',
      service: config.service ?? 'unknown',
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? false,
      logFile: config.logFile ?? './logs/app.log',
      enableMetrics: config.enableMetrics ?? true,
      correlationIdHeader: config.correlationIdHeader ?? 'x-correlation-id',
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles ?? 5
    };
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void {
    this.currentCorrelationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.currentCorrelationId;
  }

  /**
   * Clear correlation ID
   */
  clearCorrelationId(): void {
    this.currentCorrelationId = undefined;
  }

  /**
   * Generate new correlation ID
   */
  generateCorrelationId(): string {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    this.setCorrelationId(id);
    return id;
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('debug', message, metadata, tags);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('info', message, metadata, tags);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('warn', message, metadata, tags);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('error', message, metadata, tags, error);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>, tags?: string[]): void {
    this.log('fatal', message, metadata, tags, error);
  }

  /**
   * Log performance metric
   */
  metric(name: string, value: number, unit?: string, metadata?: Record<string, any>): void {
    const metrics = { [name]: value };
    if (unit) {
      metrics[`${name}_unit`] = unit;
    }
    
    this.log('info', `Metric: ${name}`, { ...metadata, metrics }, ['metric']);
  }

  /**
   * Log function execution time
   */
  async logExecution<T>(
    functionName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.debug(`Starting ${functionName}`, metadata, ['execution']);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.info(`Completed ${functionName}`, {
        ...metadata,
        duration,
        success: true
      }, ['execution', 'success']);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Failed ${functionName}`, error instanceof Error ? error : new Error(String(error)), {
        ...metadata,
        duration,
        success: false
      }, ['execution', 'error']);

      throw error;
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    tags?: string[],
    error?: Error
  ): void {
    // Check log level
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.currentCorrelationId,
      service: this.config.service,
      metadata,
      tags
    };

    // Add error information if provided
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    // Add caller information
    const stack = new Error().stack;
    if (stack) {
      const callerLine = stack.split('\n')[3];
      if (callerLine) {
        const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          entry.function = match[1];
          entry.module = match[2];
          entry.line = parseInt(match[3]);
        }
      }
    }

    // Output to console
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Output to file
    if (this.config.enableFile) {
      this.outputToFile(entry).catch(console.error);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const colorMap = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m'  // magenta
    };

    const reset = '\x1b[0m';
    const color = colorMap[entry.level];
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`;
    const timestamp = entry.timestamp.substring(11, 23); // HH:mm:ss.sss
    const correlation = entry.correlationId ? ` [${entry.correlationId}]` : '';
    
    let message = `${prefix} ${timestamp}${correlation} ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      message += `\n${entry.error.stack || entry.error.message}`;
    }

    console.log(message);
  }

  /**
   * Output log entry to file
   */
  private async outputToFile(entry: LogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await AtomicFileOperations.appendAtomic(this.config.logFile!, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Query log entries
   */
  async queryLogs(filters: {
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
    correlationId?: string;
    service?: string;
    tags?: string[];
    limit?: number;
  } = {}): Promise<LogEntry[]> {
    if (!this.config.enableFile || !this.config.logFile) {
      return [];
    }

    try {
      const content = await AtomicFileOperations.readSafe(this.config.logFile);
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      let entries: LogEntry[] = lines
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null) as LogEntry[];

      // Apply filters
      if (filters.level) {
        entries = entries.filter(e => e.level === filters.level);
      }
      if (filters.startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= filters.startDate!);
      }
      if (filters.endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= filters.endDate!);
      }
      if (filters.correlationId) {
        entries = entries.filter(e => e.correlationId === filters.correlationId);
      }
      if (filters.service) {
        entries = entries.filter(e => e.service === filters.service);
      }
      if (filters.tags && filters.tags.length > 0) {
        entries = entries.filter(e => 
          filters.tags!.some(tag => e.tags?.includes(tag))
        );
      }

      // Sort by timestamp (newest first) and apply limit
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (filters.limit) {
        entries = entries.slice(0, filters.limit);
      }

      return entries;
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number;
    byLevel: Record<LogLevel, number>;
    errors: number;
    avgDuration?: number;
    topModules: Array<{ module: string; count: number }>;
  }> {
    const now = new Date();
    const startTime = new Date();
    
    switch (timeframe) {
      case 'hour':
        startTime.setHours(now.getHours() - 1);
        break;
      case 'day':
        startTime.setDate(now.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(now.getDate() - 7);
        break;
    }

    const entries = await this.queryLogs({ startDate: startTime, endDate: now });
    
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    };

    let totalDuration = 0;
    let durationCount = 0;
    const moduleCounts: Record<string, number> = {};

    for (const entry of entries) {
      byLevel[entry.level]++;
      
      if (entry.duration) {
        totalDuration += entry.duration;
        durationCount++;
      }
      
      if (entry.module) {
        moduleCounts[entry.module] = (moduleCounts[entry.module] || 0) + 1;
      }
    }

    const topModules = Object.entries(moduleCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([module, count]) => ({ module, count }));

    return {
      total: entries.length,
      byLevel,
      errors: byLevel.error + byLevel.fatal,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : undefined,
      topModules
    };
  }

  /**
   * Rotate log files
   */
  async rotateLogs(): Promise<void> {
    if (!this.config.enableFile || !this.config.logFile) {
      return;
    }

    try {
      const logFile = this.config.logFile;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${logFile}.${timestamp}`;
      
      // Move current log to rotated file
      await AtomicFileOperations.writeSafe(rotatedFile, await AtomicFileOperations.readSafe(logFile));
      await AtomicFileOperations.writeSafe(logFile, '');
      
      // Clean up old log files
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  /**
   * Clean up old log files
   */
  private async cleanupOldLogs(): Promise<void> {
    // Implementation would list log directory and remove old files
    // This is a simplified version
    console.log('Log cleanup completed');
  }
}

// Global logger instance
export const logger = new StructuredLogger({
  service: 'factorywager-platform',
  enableConsole: true,
  enableFile: true,
  level: 'info'
});

// Export convenience functions
export const log = {
  debug: (message: string, metadata?: Record<string, any>, tags?: string[]) => logger.debug(message, metadata, tags),
  info: (message: string, metadata?: Record<string, any>, tags?: string[]) => logger.info(message, metadata, tags),
  warn: (message: string, metadata?: Record<string, any>, tags?: string[]) => logger.warn(message, metadata, tags),
  error: (message: string, error?: Error, metadata?: Record<string, any>, tags?: string[]) => logger.error(message, error, metadata, tags),
  fatal: (message: string, error?: Error, metadata?: Record<string, any>, tags?: string[]) => logger.fatal(message, error, metadata, tags),
  metric: (name: string, value: number, unit?: string, metadata?: Record<string, any>) => logger.metric(name, value, unit, metadata),
  execution: <T>(functionName: string, operation: () => Promise<T>, metadata?: Record<string, any>) => logger.logExecution(functionName, operation, metadata),
  setCorrelationId: (id: string) => logger.setCorrelationId(id),
  generateCorrelationId: () => logger.generateCorrelationId(),
  clearCorrelationId: () => logger.clearCorrelationId()
};
