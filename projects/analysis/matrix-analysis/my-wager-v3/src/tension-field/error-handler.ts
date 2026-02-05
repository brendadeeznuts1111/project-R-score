#!/usr/bin/env bun
// Enhanced Error Handler with Bun Native Features
// [TENSION-ERROR-001] [TENSION-RECOVERY-002] [TENSION-LOGGING-003]
// [TENSION-VOLUME-001] [TENSION-LINK-002] [TENSION-PROFILE-003]
// [GOV-SECURITY-001] [GOV-COMPLIANCE-002]

import { Database } from 'bun:sqlite';

export enum TensionErrorCode {
  // Core errors
  PROPAGATION_FAILED = 'TENSION_001',
  NODE_NOT_FOUND = 'TENSION_002',
  INVALID_CONFIGURATION = 'TENSION_003',

  // Network errors
  WEBSOCKET_CONNECTION_FAILED = 'TENSION_101',
  API_TIMEOUT = 'TENSION_102',
  RATE_LIMIT_EXCEEDED = 'TENSION_103',

  // Data errors
  CORRUPTED_DATA = 'TENSION_201',
  MISSING_REQUIRED_FIELD = 'TENSION_202',
  DATA_VALIDATION_FAILED = 'TENSION_203',

  // Security errors
  UNAUTHORIZED_ACCESS = 'TENSION_301',
  INVALID_TOKEN = 'TENSION_302',
  SECURITY_VIOLATION = 'TENSION_303',

  // Performance errors
  MEMORY_LIMIT_EXCEEDED = 'TENSION_401',
  CPU_THRESHOLD_EXCEEDED = 'TENSION_402',
  TIMEOUT_EXCEEDED = 'TENSION_403',

  // External service errors
  DATABASE_CONNECTION_FAILED = 'TENSION_501',
  REDIS_CONNECTION_FAILED = 'TENSION_502',
  EXTERNAL_API_ERROR = 'TENSION_503'
}

export interface TensionError extends Error {
  code: TensionErrorCode;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  timestamp: number;
  stack?: string;
  recoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export class TensionErrorHandler {
  private db: Database;
  private errorLogPath: string;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(dbPath: string = './tension-errors.db', logPath: string = './tension-errors.log') {
    this.db = new Database(dbPath);
    this.errorLogPath = logPath;
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        code TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        stack_trace TEXT,
        recoverable BOOLEAN,
        retry_count INTEGER DEFAULT 0,
        resolved BOOLEAN DEFAULT FALSE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS circuit_breakers (
        service TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        failure_count INTEGER DEFAULT 0,
        last_failure_time INTEGER,
        recovery_timeout INTEGER DEFAULT 60000
      )
    `);
  }

  // Create a structured error with Bun-native enhancements
  createError(
    code: TensionErrorCode,
    message: string,
    severity: TensionError['severity'] = 'medium',
    context?: Record<string, any>,
    recoverable: boolean = true,
    maxRetries: number = 3
  ): TensionError {
    const error = new Error(message) as TensionError;
    error.code = code;
    error.severity = severity;
    error.context = context;
    error.timestamp = Date.now();
    error.stack = new Error().stack;
    error.recoverable = recoverable;
    error.retryCount = 0;
    error.maxRetries = maxRetries;

    return error;
  }

  // Handle error with Bun-native async logging
  async handleError(error: TensionError | Error, context?: Record<string, any>): Promise<void> {
    const tensionError = this.ensureTensionError(error, context);

    // Log to database asynchronously
    this.logToDatabase(tensionError);

    // Log to file using Bun's high-performance write
    this.logToFile(tensionError);

    // Check if we need to trigger circuit breaker
    if (tensionError.context?.service) {
      this.updateCircuitBreaker(tensionError.context.service, false);
    }

    // Attempt recovery if possible
    if (tensionError.recoverable && (tensionError.retryCount || 0) < (tensionError.maxRetries || 3)) {
      await this.attemptRecovery(tensionError);
    }

    // Critical errors get immediate notification
    if (tensionError.severity === 'critical') {
      await this.notifyCriticalError(tensionError);
    }
  }

  private ensureTensionError(error: Error | TensionError, context?: Record<string, any>): TensionError {
    if ('code' in error) {
      return error as TensionError;
    }

    return this.createError(
      TensionErrorCode.PROPAGATION_FAILED,
      error.message,
      'medium',
      context
    );
  }

  private async logToDatabase(error: TensionError): Promise<void> {
    try {
      this.db.run(`
        INSERT INTO error_logs
        (timestamp, code, severity, message, context, stack_trace, recoverable, retry_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        error.timestamp,
        error.code,
        error.severity,
        error.message,
        JSON.stringify(error.context || {}),
        error.stack || '',
        error.recoverable,
        error.retryCount || 0
      ]);
    } catch (dbError) {
      // Fallback to file logging if DB fails
      console.error('Failed to log to database:', dbError);
    }
  }

  private async logToFile(error: TensionError): Promise<void> {
    const logEntry = {
      timestamp: new Date(error.timestamp).toISOString(),
      level: error.severity.toUpperCase(),
      code: error.code,
      message: error.message,
      context: error.context,
      recoverable: error.recoverable,
      retryCount: error.retryCount
    };

    // Use Bun's high-performance write
    await Bun.write(Bun.file(this.errorLogPath), JSON.stringify(logEntry) + '\n');
  }

  // Circuit breaker pattern for external services
  private updateCircuitBreaker(service: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(service) || new CircuitBreaker(service);

    if (success) {
      breaker.recordSuccess();
    } else {
      breaker.recordFailure();
    }

    this.circuitBreakers.set(service, breaker);

    // Persist state
    this.db.run(`
      INSERT OR REPLACE INTO circuit_breakers (service, state, failure_count, last_failure_time)
      VALUES (?, ?, ?, ?)
    `, [service, breaker.state, breaker.failureCount, breaker.lastFailureTime]);
  }

  // Check if service is available
  isServiceAvailable(service: string): boolean {
    const breaker = this.circuitBreakers.get(service);
    return !breaker || breaker.state === 'closed';
  }

  // Attempt recovery with exponential backoff
  private async attemptRecovery(error: TensionError): Promise<void> {
    const delay = Math.pow(2, error.retryCount || 0) * 1000; // Exponential backoff
    error.retryCount = (error.retryCount || 0) + 1;

    console.log(`Attempting recovery for ${error.code} (attempt ${error.retryCount}/${error.maxRetries})`);

    await Bun.sleep(delay);

    // Retry logic would be implemented by the specific service
    // This is a placeholder for the recovery mechanism
    console.log(`Recovery attempt ${error.retryCount} completed`);
  }

  // Critical error notification system
  private async notifyCriticalError(error: TensionError): Promise<void> {
    // Could integrate with Slack, email, PagerDuty, etc.
    console.error('🚨 CRITICAL ERROR:', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    });

    // Store critical errors for immediate attention
    await Bun.write(Bun.file('./critical-errors.json'), JSON.stringify({
      timestamp: Date.now(),
      error: {
        code: error.code,
        message: error.message,
        context: error.context,
        stack: error.stack
      }
    }, null, 2) + '\n');
  }

  // Get error statistics
  getErrorStats(timeRange?: { start: number; end: number }) {
    let query = 'SELECT code, severity, COUNT(*) as count FROM error_logs';
    const params: any[] = [];

    if (timeRange) {
      query += ' WHERE timestamp BETWEEN ? AND ?';
      params.push(timeRange.start, timeRange.end);
    }

    query += ' GROUP BY code, severity ORDER BY count DESC';

    return this.db.prepare(query).all(...params);
  }

  // Clean old error logs
  async cleanupOldLogs(olderThanDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    this.db.run('DELETE FROM error_logs WHERE timestamp < ?', [cutoffTime]);

    // Also clean old log files
    try {
      const logFile = Bun.file(this.errorLogPath);
      if (await logFile.exists()) {
        const content = await logFile.text();
        const lines = content.split('\n');
        const recentLines = lines.filter(line => {
          if (!line) return false;
          const log = JSON.parse(line);
          return log.timestamp > new Date(cutoffTime).toISOString();
        });

        await Bun.write(this.errorLogPath, recentLines.join('\n'));
      }
    } catch (e) {
      console.error('Failed to cleanup log file:', e);
    }
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  state: 'closed' | 'open' | 'half-open' = 'closed';
  failureCount: number = 0;
  lastFailureTime: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly recoveryTimeout: number = 60000; // 1 minute

  constructor(private service: string) {}

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  canAttempt(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    return true; // half-open state
  }
}

// Global error handler instance
export const errorHandler = new TensionErrorHandler();

// Bun-specific error handling utilities
export const BunErrorUtils = {
  // Create error with Bun's performance timing
  createTimedError<T>(
    code: TensionErrorCode,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();

    return operation().catch(error => {
      const duration = performance.now() - startTime;

      return errorHandler.handleError(errorHandler.createError(
        code,
        `Operation failed after ${duration.toFixed(2)}ms: ${error.message}`,
        'medium',
        { ...context, duration, operation: operation.name }
      )).then(() => {
        throw error;
      });
    });
  },

  // Wrap async functions with automatic error handling
  withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorCode: TensionErrorCode = TensionErrorCode.PROPAGATION_FAILED
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        await errorHandler.handleError(error as Error, { function: fn.name, args });
        throw error;
      }
    };
  },

  // Batch error processing with Bun's concurrent processing
  async processErrors(errors: TensionError[]): Promise<void> {
    await Promise.all(
      errors.map(error => errorHandler.handleError(error))
    );
  }
};

// Export for use in other modules
export default errorHandler;
