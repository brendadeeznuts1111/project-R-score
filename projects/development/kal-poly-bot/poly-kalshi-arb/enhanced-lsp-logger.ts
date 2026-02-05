#!/usr/bin/env bun
/**
 * Enhanced LSP Logger with structured JSON logging using %j formatting
 * Demonstrates Bun's new console.log %j feature for structured logging
 */

import * as os from 'os';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  logLevel?: LogLevel;
  enableStructuredLogging?: boolean;
  component?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  pid: number;
  hostname: string;
  requestId?: string;
  duration?: number;
}

export interface PerformanceMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeRequests: number;
  cpuUsage: NodeJS.CpuUsage;
  timestamp?: number;
}

/**
 * Enhanced LSP Logger with structured JSON logging
 */
export class EnhancedLSPLogger {
  private logLevel: LogLevel;
  private component: string;
  private enableStructuredLogging: boolean;

  constructor(component: string, options: LoggerOptions = {}) {
    this.component = component;
    this.logLevel = options.logLevel || 'info';
    this.enableStructuredLogging = options.enableStructuredLogging !== false;
  }

  /**
   * Core logging method with structured JSON support
   */
  log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      component: this.component,
      message,
      data,
      pid: process.pid,
      hostname: os.hostname()
    };

    if (this.enableStructuredLogging) {
      // Use %j for structured JSON logging - Bun's new feature
      console.log('[%s] %s: %s - %j', timestamp, level.toUpperCase(), this.component, logEntry);
    } else {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${this.component} - ${message}`);
    }
  }

  /**
   * Convenience logging methods
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error ? { ...error } : error;

    this.log('error', message, errorData);
  }

  /**
   * LSP-specific logging methods
   */
  logLSPRequest(method: string, params: any, sessionId?: string): string {
    const requestId = this.generateRequestId();
    this.info('LSP Request', {
      type: 'request',
      method,
      params,
      sessionId,
      requestId
    });
    return requestId;
  }

  logLSPResponse(method: string, result: any, duration: number, sessionId?: string, requestId?: string): void {
    this.info('LSP Response', {
      type: 'response',
      method,
      result,
      duration,
      sessionId,
      requestId: requestId || this.generateRequestId()
    });
  }

  logLSPError(method: string, error: any, sessionId?: string, requestId?: string): void {
    this.error('LSP Error', {
      type: 'error',
      method,
      error,
      sessionId,
      requestId: requestId || this.generateRequestId()
    });
  }

  logDiagnostics(fileUri: string, diagnostics: any[], sessionId?: string): void {
    this.info('LSP Diagnostics', {
      type: 'diagnostics',
      fileUri,
      diagnosticCount: diagnostics.length,
      diagnostics: diagnostics.slice(0, 5), // Log first 5 diagnostics
      sessionId
    });
  }

  logCompletion(fileUri: string, position: any, items: any[], duration: number, sessionId?: string): void {
    this.info('LSP Completion', {
      type: 'completion',
      fileUri,
      position,
      itemCount: items.length,
      duration,
      sessionId
    });
  }

  logPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.info('Performance Metrics', {
      type: 'performance',
      ...metrics,
      timestamp: Date.now()
    });
  }

  /**
   * Batch logging for performance
   */
  logBatch(entries: LogEntry[]): void {
    if (!this.shouldLog('info')) return;

    const timestamp = new Date().toISOString();
    const batchEntry = {
      timestamp,
      level: 'info',
      component: this.component,
      type: 'batch',
      entries,
      count: entries.length
    };

    console.log('[%s] %s: %s - Batch Log - %j', timestamp, 'INFO', this.component, batchEntry);
  }

  /**
   * Security event logging
   */
  logSecurityEvent(event: string, details: any): void {
    this.warn('Security Event', {
      type: 'security',
      event,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Session management logging
   */
  logSessionEvent(event: string, sessionId: string, details?: any): void {
    this.info('Session Event', {
      type: 'session',
      event,
      sessionId,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Proxy request logging
   */
  logProxyRequest(method: string, url: string, headers: Record<string, string>, sessionId?: string): void {
    this.info('Proxy Request', {
      type: 'proxy_request',
      method,
      url,
      headers,
      sessionId,
      timestamp: Date.now()
    });
  }

  logProxyResponse(method: string, status: number, duration: number, sessionId?: string): void {
    this.info('Proxy Response', {
      type: 'proxy_response',
      method,
      status,
      duration,
      sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Helper methods
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('Log level changed', { newLevel: level });
  }

  /**
   * Create child logger with same configuration
   */
  child(componentSuffix: string): EnhancedLSPLogger {
    return new EnhancedLSPLogger(`${this.component}.${componentSuffix}`, {
      logLevel: this.logLevel,
      enableStructuredLogging: this.enableStructuredLogging
    });
  }
}

/**
 * Global logger instance for the LSP system
 */
export const globalLSPLogger = new EnhancedLSPLogger('LSP-System', {
  logLevel: 'info',
  enableStructuredLogging: true
});

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private logger: EnhancedLSPLogger;
  private metrics: Map<string, number[]> = new Map();

  constructor(logger: EnhancedLSPLogger) {
    this.logger = logger.child('Performance');
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift();
    }
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [metric, values] of this.metrics.entries()) {
      if (values.length === 0) continue;
      
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      stats[metric] = { avg, min, max, count: values.length };
    }
    
    return stats;
  }

  logMetrics(): void {
    const metrics = this.getMetrics();
    this.logger.logPerformanceMetrics({
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeRequests: 0,
      cpuUsage: process.cpuUsage(),
      ...metrics
    });
  }

  reset(): void {
    this.metrics.clear();
    this.logger.info('Performance metrics reset');
  }
}

// Usage example
if (import.meta.main) {
  const logger = new EnhancedLSPLogger('Test-Logger');
  
  logger.info('Enhanced LSP Logger initialized');
  logger.debug('Debug message', { foo: 'bar' });
  logger.warn('Warning message', { warning: 'test' });
  logger.error('Error message', new Error('Test error'));
  
  // Test structured logging with %j
  logger.info('Structured log entry', {
    timestamp: Date.now(),
    data: { nested: { value: 123 } },
    array: [1, 2, 3]
  });
  
  // Test LSP-specific logging
  const requestId = logger.logLSPRequest('textDocument/completion', {
    file: 'test.ts',
    position: { line: 10, character: 5 }
  });
  
  logger.logLSPResponse('textDocument/completion', {
    items: [{ label: 'test' }]
  }, 150, 'session-123', requestId);
  
  console.log('✅ Enhanced LSP Logger test completed');
}
