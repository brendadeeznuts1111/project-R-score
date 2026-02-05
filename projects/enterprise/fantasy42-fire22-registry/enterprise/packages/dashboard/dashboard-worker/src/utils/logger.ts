// Simple logger implementation without external dependencies
import { MonitoringConfig } from '../types/enhanced-types';

/**
 * Enhanced logger with structured logging capabilities
 */
export class EnhancedLogger {
  private logger: any;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.logger = this.createLogger();
  }

  /**
   * Creates a simple logger instance
   */
  private createLogger() {
    // Simple logger implementation
    return {
      info: (message: string, meta?: any) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
      },
      debug: (message: string, meta?: any) => {
        if (this.config.logLevel === 'debug') {
          console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
        }
      },
      verbose: (message: string, meta?: any) => {
        if (this.config.logLevel === 'debug' || this.config.logLevel === 'verbose') {
          console.log(`[VERBOSE] ${new Date().toISOString()} - ${message}`, meta || '');
        }
      },
      child: (context: Record<string, any>) => {
        const childLogger = Object.create(this);
        childLogger.logger = this.logger;
        childLogger.config = { ...this.config };
        return childLogger;
      },
      log: (level: string, message: string, meta?: any) => {
        switch (level) {
          case 'error':
            this.logger.error(message, meta);
            break;
          case 'warn':
            this.logger.warn(message, meta);
            break;
          case 'info':
            this.logger.info(message, meta);
            break;
          case 'debug':
            this.logger.debug(message, meta);
            break;
          default:
            this.logger.info(message, meta);
        }
      },
    };
  }

  /**
   * Logs an informational message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...meta,
      });
    } else {
      this.logger.error(message, { error, ...meta });
    }
  }

  /**
   * Logs a debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Logs a verbose message
   */
  verbose(message: string, meta?: any): void {
    if (this.config.logLevel === 'debug' || this.config.logLevel === 'verbose') {
      this.logger.verbose(message, meta);
    }
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: Record<string, any>): EnhancedLogger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Logs an API request
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    meta?: any
  ): void {
    const level = statusCode >= 400 ? 'error' : 'info';

    this.logger.log(level, 'API Request', {
      method,
      url,
      statusCode,
      responseTime,
      userId,
      ...meta,
    });
  }

  /**
   * Logs a security event
   */
  logSecurityEvent(
    type: 'authentication' | 'authorization' | 'validation' | 'suspicious',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details?: Record<string, any>,
    userId?: string
  ): void {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';

    this.logger.log(level, `Security Event: ${type}`, {
      type,
      severity,
      message,
      details,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a performance metric
   */
  logPerformanceMetric(
    metric: string,
    value: number,
    unit?: string,
    meta?: Record<string, any>
  ): void {
    this.logger.info('Performance Metric', {
      metric,
      value,
      unit,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a health check result
   */
  logHealthCheck(
    component: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    message?: string,
    metrics?: any
  ): void {
    const level = status === 'unhealthy' ? 'error' : status === 'degraded' ? 'warn' : 'info';

    this.logger.log(level, `Health Check: ${component}`, {
      component,
      status,
      message,
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a database operation
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    duration?: number,
    error?: any,
    meta?: any
  ): void {
    const level = success ? 'info' : 'error';

    this.logger.log(level, `Database Operation: ${operation}`, {
      operation,
      table,
      success,
      duration,
      error: error instanceof Error ? error.message : error,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs an external API call
   */
  logExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    success: boolean,
    error?: any,
    meta?: any
  ): void {
    const level = success ? 'info' : 'error';

    this.logger.log(level, `External API Call: ${service}`, {
      service,
      endpoint,
      method,
      statusCode,
      responseTime,
      success,
      error: error instanceof Error ? error.message : error,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a user action
   */
  logUserAction(
    action: string,
    userId: string,
    resource?: string,
    success: boolean = true,
    details?: Record<string, any>
  ): void {
    const level = success ? 'info' : 'warn';

    this.logger.log(level, `User Action: ${action}`, {
      action,
      userId,
      resource,
      success,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a system event
   */
  logSystemEvent(
    event: string,
    level: 'info' | 'warn' | 'error' = 'info',
    details?: Record<string, any>
  ): void {
    this.logger.log(level, `System Event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a configuration change
   */
  logConfigurationChange(key: string, oldValue: any, newValue: any, changedBy?: string): void {
    this.logger.info('Configuration Change', {
      key,
      oldValue,
      newValue,
      changedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a deployment event
   */
  logDeploymentEvent(
    action: 'deploy' | 'rollback' | 'restart',
    version: string,
    environment: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    const level = success ? 'info' : 'error';

    this.logger.log(level, `Deployment Event: ${action}`, {
      action,
      version,
      environment,
      success,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a rate limit event
   */
  logRateLimitEvent(
    endpoint: string,
    ip: string,
    userId?: string,
    limit?: number,
    remaining?: number
  ): void {
    this.logger.warn('Rate Limit Exceeded', {
      endpoint,
      ip,
      userId,
      limit,
      remaining,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a cache operation
   */
  logCacheOperation(
    operation: 'get' | 'set' | 'delete' | 'clear' | 'hit' | 'miss',
    key: string,
    success: boolean = true,
    ttl?: number,
    size?: number
  ): void {
    this.logger.info('Cache Operation', {
      operation,
      key,
      success,
      ttl,
      size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a validation error
   */
  logValidationError(
    field: string,
    value: any,
    rule: string,
    message: string,
    userId?: string
  ): void {
    this.logger.warn('Validation Error', {
      field,
      value,
      rule,
      message,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a job execution
   */
  logJobExecution(
    jobName: string,
    success: boolean,
    duration?: number,
    result?: any,
    error?: any
  ): void {
    const level = success ? 'info' : 'error';

    this.logger.log(level, `Job Execution: ${jobName}`, {
      jobName,
      success,
      duration,
      result,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs a webhook event
   */
  logWebhookEvent(
    event: string,
    source: string,
    success: boolean,
    deliveryId?: string,
    error?: any,
    payload?: any
  ): void {
    const level = success ? 'info' : 'error';

    this.logger.log(level, `Webhook Event: ${event}`, {
      event,
      source,
      success,
      deliveryId,
      error: error instanceof Error ? error.message : error,
      payload: payload ? '[REDACTED]' : undefined, // Don't log full payload in production
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Updates logger configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.level = this.config.logLevel;
  }

  /**
   * Gets logger configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Creates a request-specific logger
   */
  forRequest(requestId: string, method: string, url: string): EnhancedLogger {
    return this.child({
      requestId,
      method,
      url,
    });
  }

  /**
   * Creates a user-specific logger
   */
  forUser(userId: string): EnhancedLogger {
    return this.child({
      userId,
    });
  }

  /**
   * Creates a component-specific logger
   */
  forComponent(component: string): EnhancedLogger {
    return this.child({
      component,
    });
  }
}

/**
 * Creates a logger instance with default configuration
 */
export function createLogger(config: MonitoringConfig): EnhancedLogger {
  return new EnhancedLogger(config);
}

/**
 * Global logger instance
 */
let globalLogger: EnhancedLogger | null = null;

/**
 * Gets or creates the global logger instance
 */
export function getGlobalLogger(config?: MonitoringConfig): EnhancedLogger {
  if (!globalLogger && config) {
    globalLogger = createLogger(config);
  }
  return globalLogger!;
}

/**
 * Sets the global logger instance
 */
export function setGlobalLogger(logger: EnhancedLogger): void {
  globalLogger = logger;
}
