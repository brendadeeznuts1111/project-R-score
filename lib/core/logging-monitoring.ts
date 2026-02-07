// lib/core/logging-monitoring.ts — Logging and monitoring system

// ============================================================================
// LOGGING INTERFACES
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
  service?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  version?: string;
  environment?: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableMetrics: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  metricsEndpoint?: string;
  structuredFormat: boolean;
}

export interface Metrics {
  requests: {
    total: number;
    success: number;
    error: number;
    avgResponseTime: number;
  };
  connections: {
    active: number;
    total: number;
    errors: number;
  };
  cache: {
    hits: number;
    misses: number;
    size: number;
    evictions: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
}

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

export class Logger {
  private config: LoggerConfig;
  private metrics: Metrics;
  private startTime: number;
  private logBuffer: LogEntry[] = [];
  private metricsInterval?: ReturnType<typeof setInterval>;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      service: 'bun-service',
      version: '1.0.0',
      environment: Bun.env.NODE_ENV || 'development',
      enableConsole: true,
      enableFile: false,
      enableMetrics: true,
      structuredFormat: true,
      ...config,
    };

    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  // ============================================================================
  // LOGGING METHODS
  // ============================================================================

  debug(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, context, requestId);
  }

  info(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.INFO, message, context, requestId);
  }

  warn(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.WARN, message, context, requestId);
  }

  error(message: string, error?: Error, context?: Record<string, any>, requestId?: string): void {
    const logContext = { ...context };

    if (error) {
      logContext.error = {
        name: error.name,
        message: error.message,
        stack: this.config.environment === 'development' ? error.stack : undefined,
      };
    }

    this.log(LogLevel.ERROR, message, logContext, requestId);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.FATAL, message, { ...context, error: error?.message }, requestId);
  }

  // ============================================================================
  // PERFORMANCE LOGGING
  // ============================================================================

  /**
   * Log request with duration
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId?: string,
    userId?: string
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${url} ${statusCode} - ${duration}ms`;

    this.log(
      level,
      message,
      {
        method,
        url,
        statusCode,
        duration,
        userId,
        type: 'request',
      },
      requestId
    );

    // Update metrics
    this.metrics.requests.total++;
    if (statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }
    this.metrics.requests.avgResponseTime = (this.metrics.requests.avgResponseTime + duration) / 2;
  }

  /**
   * Log database operation
   */
  logDatabase(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    requestId?: string
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = `DB ${operation} on ${table} - ${duration}ms`;

    this.log(
      level,
      message,
      {
        operation,
        table,
        duration,
        success,
        type: 'database',
      },
      requestId
    );
  }

  /**
   * Log cache operation
   */
  logCache(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, requestId?: string): void {
    const message = `Cache ${operation}: ${key}`;

    this.log(
      LogLevel.DEBUG,
      message,
      {
        operation,
        key,
        type: 'cache',
      },
      requestId
    );

    // Update metrics
    if (operation === 'hit') {
      this.metrics.cache.hits++;
    } else if (operation === 'miss') {
      this.metrics.cache.misses++;
    } else if (operation === 'delete') {
      this.metrics.cache.evictions++;
    }
  }

  /**
   * Log security event
   */
  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    requestId?: string,
    userId?: string
  ): void {
    const level =
      severity === 'critical'
        ? LogLevel.FATAL
        : severity === 'high'
          ? LogLevel.ERROR
          : severity === 'medium'
            ? LogLevel.WARN
            : LogLevel.INFO;

    this.log(
      level,
      `SECURITY: ${event}`,
      {
        event,
        severity,
        details,
        userId,
        type: 'security',
      },
      requestId
    );
  }

  // ============================================================================
  // CORE LOGGING
  // ============================================================================

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId,
      service: this.config.service,
      metadata: {
        version: this.config.version,
        environment: this.config.environment,
        pid: process.pid,
      },
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500); // Keep last 500 entries
    }

    // Output to console
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Output to file
    if (this.config.enableFile && this.config.filePath) {
      this.outputToFile(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;

    if (this.config.structuredFormat) {
      console.log(
        JSON.stringify({
          timestamp,
          level: levelName,
          service: entry.service,
          message: entry.message,
          requestId: entry.requestId,
          ...entry.context,
        })
      );
    } else {
      const prefix = `[${timestamp}] ${levelName} ${entry.service}`;
      const suffix = entry.requestId ? ` [${entry.requestId}]` : '';
      console.log(`${prefix}${suffix}: ${entry.message}`);

      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log('  Context:', entry.context);
      }
    }
  }

  private async outputToFile(entry: LogEntry): Promise<void> {
    // File logging implementation would go here
    // For now, just log that we would write to file
    if (this.config.level <= LogLevel.DEBUG) {
      console.debug(`Would write to file ${this.config.filePath}:`, entry);
    }
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  private initializeMetrics(): Metrics {
    return {
      requests: { total: 0, success: 0, error: 0, avgResponseTime: 0 },
      connections: { active: 0, total: 0, errors: 0 },
      cache: { hits: 0, misses: 0, size: 0, evictions: 0 },
      system: {
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: 0,
        uptime: 0,
      },
    };
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = memUsage.heapUsed;
    this.metrics.system.uptime = Date.now() - this.startTime;
    // CPU usage would require additional monitoring
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logBuffer.filter(entry => entry.level === level);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Update cache size metric
   */
  updateCacheSize(size: number): void {
    this.metrics.cache.size = size;
  }

  /**
   * Update connection metrics
   */
  updateConnections(active: number, total: number): void {
    this.metrics.connections.active = active;
    this.metrics.connections.total = total;
  }

  /**
   * Increment connection errors
   */
  incrementConnectionErrors(): void {
    this.metrics.connections.errors++;
  }

  /**
   * Destroy logger and cleanup resources
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    this.logBuffer = [];
    console.log('🗑️ Logger destroyed and resources cleaned up');
  }
}

// ============================================================================
// LOGGER FACTORY
// ============================================================================

export class LoggerFactory {
  private static loggers = new Map<string, Logger>();

  /**
   * Get or create logger for service
   */
  static getLogger(service: string, config?: Partial<LoggerConfig>): Logger {
    if (!this.loggers.has(service)) {
      const loggerConfig = { ...config, service };
      this.loggers.set(service, new Logger(loggerConfig));
    }
    return this.loggers.get(service)!;
  }

  /**
   * Get all loggers
   */
  static getAllLoggers(): Map<string, Logger> {
    return new Map(this.loggers);
  }

  /**
   * Destroy all loggers
   */
  static destroyAll(): void {
    for (const logger of this.loggers.values()) {
      logger.destroy();
    }
    this.loggers.clear();
  }
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

export class LoggingMiddleware {
  /**
   * Create request logging middleware
   */
  static createRequestLogger(logger: Logger) {
    return (request: Request, response: Response, requestId?: string, userId?: string) => {
      const start = Date.now();
      const url = new URL(request.url);

      // Log request start
      logger.info(
        `${request.method} ${url.pathname} started`,
        {
          method: request.method,
          path: url.pathname,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
        requestId
      );

      // Log response when it finishes
      setTimeout(() => {
        const duration = Date.now() - start;
        logger.logRequest(
          request.method,
          url.pathname,
          response.status,
          duration,
          requestId,
          userId
        );
      }, 0);
    };
  }

  /**
   * Create error logging middleware
   */
  static createErrorLogger(logger: Logger) {
    return (error: Error, request: Request, requestId?: string) => {
      const url = new URL(request.url);
      logger.error(
        `Request failed: ${request.method} ${url.pathname}`,
        error,
        {
          method: request.method,
          path: url.pathname,
          userAgent: request.headers.get('user-agent'),
        },
        requestId
      );
    };
  }
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export const defaultLogger = new Logger({
  service: 'bun-platform',
  level: Bun.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableMetrics: true,
});
