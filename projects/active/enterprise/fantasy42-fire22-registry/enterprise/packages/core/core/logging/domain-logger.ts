/**
 * Crystal Clear Architecture - Domain-Aware Logging System
 * Structured logging for Domain-Driven Design
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export enum LogCategory {
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  AUDIT = 'audit',
  SYSTEM = 'system',
}

export interface LogContext {
  domain?: string;
  entity?: string;
  entityId?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
  metrics?: Record<string, number | string>;
}

/**
 * Log Formatter - Standardizes log output format
 */
export class LogFormatter {
  static format(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(8);
    const category = entry.category.padEnd(15);
    const correlationId = entry.context.correlationId ? ` [${entry.context.correlationId}]` : '';

    let logLine = `${timestamp} ${level} ${category}${correlationId} ${entry.message}`;

    // Add context information
    if (Object.keys(entry.context).length > 0) {
      const contextStr = this.formatContext(entry.context);
      if (contextStr) {
        logLine += ` | ${contextStr}`;
      }
    }

    // Add error information
    if (entry.error) {
      logLine += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.code) {
        logLine += ` (${entry.error.code})`;
      }
    }

    // Add metrics
    if (entry.metrics && Object.keys(entry.metrics).length > 0) {
      logLine += `\n  Metrics: ${JSON.stringify(entry.metrics)}`;
    }

    return logLine;
  }

  private static formatContext(context: LogContext): string {
    const parts: string[] = [];

    if (context.domain) parts.push(`domain=${context.domain}`);
    if (context.entity) parts.push(`entity=${context.entity}`);
    if (context.entityId) parts.push(`entityId=${context.entityId}`);
    if (context.operation) parts.push(`operation=${context.operation}`);
    if (context.userId) parts.push(`userId=${context.userId}`);
    if (context.duration !== undefined) parts.push(`duration=${context.duration}ms`);
    if (context.ipAddress) parts.push(`ip=${context.ipAddress}`);

    return parts.join(' ');
  }

  static formatJSON(entry: LogEntry): string {
    return JSON.stringify(entry, null, 2);
  }
}

/**
 * Log Transport Interface - For different logging destinations
 */
export interface LogTransport {
  write(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Console Transport - Logs to console (development)
 */
export class ConsoleTransport implements LogTransport {
  async write(entry: LogEntry): Promise<void> {
    const formatted = LogFormatter.format(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formatted);
        break;
    }
  }
}

/**
 * File Transport - Logs to file (production)
 */
export class FileTransport implements LogTransport {
  private logFile: string;

  constructor(logFile: string = './logs/app.log') {
    this.logFile = logFile;
  }

  async write(entry: LogEntry): Promise<void> {
    const formatted = LogFormatter.format(entry) + '\n';

    try {
      await Bun.write(this.logFile, formatted, { createPath: true });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

/**
 * Buffer Transport - Batches logs for efficiency
 */
export class BufferTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private maxBufferSize: number;
  private flushInterval: number;
  private transport: LogTransport;

  constructor(transport: LogTransport, maxBufferSize: number = 100, flushInterval: number = 5000) {
    this.transport = transport;
    this.maxBufferSize = maxBufferSize;
    this.flushInterval = flushInterval;

    // Auto-flush on interval
    setInterval(() => this.flush(), flushInterval);
  }

  async write(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);

    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    // Write all entries to the underlying transport
    await Promise.all(entries.map(entry => this.transport.write(entry)));
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.transport.close) {
      await this.transport.close();
    }
  }
}

/**
 * Domain Logger - Context-aware logging for DDD
 */
export class DomainLogger {
  private static instance: DomainLogger;
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private defaultContext: Partial<LogContext> = {};

  static getInstance(): DomainLogger {
    if (!DomainLogger.instance) {
      DomainLogger.instance = new DomainLogger();
    }
    return DomainLogger.instance;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  setDefaultContext(context: Partial<LogContext>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  createDomainLogger(domain: string, entity?: string): DomainLogger {
    const childLogger = new DomainLogger();
    childLogger.transports = this.transports;
    childLogger.minLevel = this.minLevel;
    childLogger.defaultContext = {
      ...this.defaultContext,
      domain,
      entity,
    };
    return childLogger;
  }

  private async write(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context: LogContext = {},
    error?: Error,
    metrics?: Record<string, number | string>
  ): Promise<void> {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context: { ...this.defaultContext, ...context },
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
      ...(metrics && { metrics }),
    };

    await Promise.all(this.transports.map(transport => transport.write(entry)));
  }

  // Business Logic Logging
  async business(
    message: string,
    context: LogContext = {},
    metrics?: Record<string, number | string>
  ): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.BUSINESS, message, context, undefined, metrics);
  }

  async businessDebug(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.DEBUG, LogCategory.BUSINESS, message, context);
  }

  async businessWarn(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.WARN, LogCategory.BUSINESS, message, context);
  }

  // Infrastructure Logging
  async infrastructure(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.INFRASTRUCTURE, message, context);
  }

  async infrastructureError(
    message: string,
    error: Error,
    context: LogContext = {}
  ): Promise<void> {
    await this.write(LogLevel.ERROR, LogCategory.INFRASTRUCTURE, message, context, error);
  }

  // Security Logging
  async security(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.SECURITY, message, context);
  }

  async securityWarn(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.WARN, LogCategory.SECURITY, message, context);
  }

  async securityError(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.ERROR, LogCategory.SECURITY, message, context);
  }

  // Performance Logging
  async performance(
    message: string,
    context: LogContext = {},
    metrics: Record<string, number | string> = {}
  ): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.PERFORMANCE, message, context, undefined, metrics);
  }

  async performanceWarn(
    message: string,
    duration: number,
    context: LogContext = {}
  ): Promise<void> {
    await this.write(LogLevel.WARN, LogCategory.PERFORMANCE, message, context, undefined, {
      duration,
    });
  }

  // Audit Logging
  async audit(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.AUDIT, message, context);
  }

  // System Logging
  async system(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.SYSTEM, message, context);
  }

  async systemError(message: string, error: Error, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.ERROR, LogCategory.SYSTEM, message, context, error);
  }

  // Generic Logging Methods
  async debug(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.DEBUG, LogCategory.SYSTEM, message, context);
  }

  async info(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.INFO, LogCategory.SYSTEM, message, context);
  }

  async warn(message: string, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.WARN, LogCategory.SYSTEM, message, context);
  }

  async error(message: string, error?: Error, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.ERROR, LogCategory.SYSTEM, message, context, error);
  }

  async critical(message: string, error?: Error, context: LogContext = {}): Promise<void> {
    await this.write(LogLevel.CRITICAL, LogCategory.SYSTEM, message, context, error);
  }

  // Async operation logging
  async withTiming<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: LogContext = {}
  ): Promise<T> {
    const startTime = Date.now();

    try {
      await this.performance(`Starting ${operationName}`, context);
      const result = await operation();
      const duration = Date.now() - startTime;

      await this.performance(`Completed ${operationName}`, { ...context, duration }, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.performanceWarn(`Failed ${operationName}`, duration, {
        ...context,
        duration,
      });
      throw error;
    }
  }
}

/**
 * Logger Factory - Creates domain-specific loggers
 */
export class LoggerFactory {
  static create(domain: string, entity?: string): DomainLogger {
    return DomainLogger.getInstance().createDomainLogger(domain, entity);
  }

  static createBusinessLogger(domain: string): DomainLogger {
    return this.create(domain).createDomainLogger(domain, 'business');
  }

  static createInfrastructureLogger(domain: string): DomainLogger {
    return this.create(domain).createDomainLogger(domain, 'infrastructure');
  }

  static createSecurityLogger(domain: string): DomainLogger {
    return this.create(domain).createDomainLogger(domain, 'security');
  }
}

/**
 * Logger Configuration
 */
export class LoggerConfig {
  static setupDevelopment(): DomainLogger {
    const logger = DomainLogger.getInstance();
    logger.addTransport(new ConsoleTransport());
    logger.setMinLevel(LogLevel.DEBUG);
    logger.setDefaultContext({ environment: 'development' });
    return logger;
  }

  static setupProduction(logFile?: string): DomainLogger {
    const logger = DomainLogger.getInstance();
    logger.addTransport(new BufferTransport(new FileTransport(logFile)));
    logger.setMinLevel(LogLevel.INFO);
    logger.setDefaultContext({ environment: 'production' });
    return logger;
  }

  static setupTesting(): DomainLogger {
    const logger = DomainLogger.getInstance();
    // No transports for testing (logs go nowhere)
    logger.setMinLevel(LogLevel.DEBUG);
    logger.setDefaultContext({ environment: 'testing' });
    return logger;
  }
}
