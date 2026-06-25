/**
 * Enhanced Fire22 Logger with L-Key Integration
 */

import { LogLevel, LogContext, LogEntry, LoggerConfig, LogBuffer, LogMetrics } from './types';

// Re-export types for convenience
export { LogLevel } from './types';

export class Fire22Logger {
  private config: LoggerConfig;
  private buffer: LogBuffer;
  private metrics: LogMetrics;
  private flushTimer?: Timer;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableRemote: false,
      filePath: './logs/fire22.log',
      bufferSize: 1000,
      flushInterval: 5000,
      enableMetrics: true,
      enableSecurity: true,
      enablePerformance: true,
      enableLKeyTracking: true,
      maxLogFileSize: 100 * 1024 * 1024, // 100MB
      logRotation: true,
      retentionDays: 30,
      ...config,
    };

    this.buffer = {
      entries: [],
      maxSize: this.config.bufferSize,
      currentSize: 0,
      lastFlush: new Date(),
    };

    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.CRITICAL]: 0,
      },
      logsByComponent: {},
      averageLogSize: 0,
      logsPerSecond: 0,
      errorRate: 0,
      lastReset: new Date(),
    };

    // Start auto-flush timer
    if (this.config.flushInterval > 0) {
      this.startAutoFlush();
    }

    // Setup graceful shutdown
    process.on('beforeExit', () => this.flush());
    process.on('SIGINT', () => this.flush());
    process.on('SIGTERM', () => this.flush());
  }

  /**
   * Log with specific level
   */
  public log(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: {
        component: 'fire22-logger',
        environment: process.env.NODE_ENV || 'development',
        ...context,
      },
      metadata,
    };

    // Add stack trace for errors
    if (level >= LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    this.addToBuffer(entry);
    this.updateMetrics(entry);

    // Immediate console output for critical errors
    if (level === LogLevel.CRITICAL || !this.config.bufferSize) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Convenience methods
   */
  public debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  public info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  public warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  public error(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  public critical(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, context, metadata);
  }

  /**
   * L-Key aware logging
   */
  public logWithLKey(
    level: LogLevel,
    message: string,
    lKey: string,
    entityId: string,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): void {
    const enhancedContext: LogContext = {
      ...context,
      lKey,
      entityId,
    };

    const enhancedMetadata = {
      ...metadata,
      lKeyCategory: this.getLKeyCategory(lKey),
      lKeyValue: this.getLKeyValue(lKey),
    };

    this.log(level, message, enhancedContext, enhancedMetadata);
  }

  /**
   * Performance logging with timing
   */
  public time(label: string, context?: LogContext): () => void {
    const startTime = Bun.nanoseconds();

    return () => {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to milliseconds
      this.info(`⏱️ ${label}`, context, { duration, unit: 'ms' });
    };
  }

  /**
   * Structured transaction logging
   */
  public logTransaction(
    transactionId: string,
    action: string,
    details: Record<string, any>,
    context?: LogContext
  ): void {
    this.info(
      `💳 Transaction ${action}: ${transactionId}`,
      {
        ...context,
        entityId: transactionId,
        component: 'transaction-processor',
      },
      {
        transactionId,
        action,
        ...details,
      }
    );
  }

  /**
   * Security event logging
   */
  public logSecurity(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>,
    context?: LogContext
  ): void {
    const level =
      severity === 'CRITICAL'
        ? LogLevel.CRITICAL
        : severity === 'HIGH'
          ? LogLevel.ERROR
          : severity === 'MEDIUM'
            ? LogLevel.WARN
            : LogLevel.INFO;

    this.log(
      level,
      `🛡️ Security Event: ${event}`,
      {
        ...context,
        component: 'security-monitor',
      },
      {
        securityEvent: event,
        severity,
        ...details,
      }
    );
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.entries.push(entry);
    this.buffer.currentSize++;

    // Auto-flush if buffer is full
    if (this.buffer.currentSize >= this.buffer.maxSize) {
      this.flush();
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(entry: LogEntry): void {
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[entry.level]++;

    if (entry.context.component) {
      this.metrics.logsByComponent[entry.context.component] =
        (this.metrics.logsByComponent[entry.context.component] || 0) + 1;
    }

    // Calculate logs per second
    const timeSinceReset = Date.now() - this.metrics.lastReset.getTime();
    this.metrics.logsPerSecond = this.metrics.totalLogs / (timeSinceReset / 1000);

    // Calculate error rate
    const errorLogs =
      this.metrics.logsByLevel[LogLevel.ERROR] + this.metrics.logsByLevel[LogLevel.CRITICAL];
    this.metrics.errorRate = errorLogs / this.metrics.totalLogs;
  }

  /**
   * Flush buffer to outputs
   */
  public async flush(): Promise<void> {
    if (this.buffer.entries.length === 0) return;

    const entries = [...this.buffer.entries];
    this.buffer.entries = [];
    this.buffer.currentSize = 0;
    this.buffer.lastFlush = new Date();

    const promises: Promise<void>[] = [];

    // Console output
    if (this.config.enableConsole) {
      promises.push(this.flushToConsole(entries));
    }

    // File output
    if (this.config.enableFile && this.config.filePath) {
      promises.push(this.flushToFile(entries));
    }

    // Remote output
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      promises.push(this.flushToRemote(entries));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Output single entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(8);
    const component = entry.context.component || 'unknown';
    const lKey = entry.context.lKey ? ` [${entry.context.lKey}]` : '';

    const message = `${timestamp} ${level} ${component}${lKey}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.metadata);
        if (entry.stack) console.error(entry.stack);
        break;
    }
  }

  /**
   * Flush entries to console
   */
  private async flushToConsole(entries: LogEntry[]): Promise<void> {
    for (const entry of entries) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Flush entries to file
   */
  private async flushToFile(entries: LogEntry[]): Promise<void> {
    if (!this.config.filePath) return;

    try {
      // Check file size and rotate if needed
      if (this.config.logRotation) {
        await this.rotateLogFile();
      }

      const lines =
        entries
          .map(entry =>
            JSON.stringify({
              ...entry,
              timestamp: entry.timestamp.toISOString(),
            })
          )
          .join('\n') + '\n';

      await Bun.write(this.config.filePath, lines, { createPath: true });
    } catch (error) {
      console.error('Failed to write logs to file:', error);
    }
  }

  /**
   * Flush entries to remote endpoint
   */
  private async flushToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Fire22-Logger/1.0.0',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'fire22-dashboard-worker',
          entries: entries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
    }
  }

  /**
   * Rotate log file if too large
   */
  private async rotateLogFile(): Promise<void> {
    if (!this.config.filePath) return;

    try {
      const file = Bun.file(this.config.filePath);
      const exists = await file.exists();

      if (!exists) return;

      const stats = await file.size;

      if (stats > this.config.maxLogFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.config.filePath}.${timestamp}`;

        // Move current log to rotated file
        await Bun.$`mv ${this.config.filePath} ${rotatedPath}`;

        // Compress rotated file
        await Bun.$`gzip ${rotatedPath}`;

        // Clean old log files
        await this.cleanOldLogs();
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Clean old log files
   */
  private async cleanOldLogs(): Promise<void> {
    if (!this.config.filePath) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const logDir = this.config.filePath.substring(0, this.config.filePath.lastIndexOf('/'));
      const logPrefix = this.config.filePath.substring(this.config.filePath.lastIndexOf('/') + 1);

      // Find old log files and delete them
      // This is a simplified implementation - you might want to use a more robust file listing approach
      await Bun.$`find ${logDir} -name "${logPrefix}.*" -type f -mtime +${this.config.retentionDays} -delete`;
    } catch (error) {
      console.error('Failed to clean old log files:', error);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  public stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get metrics
   */
  public getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.CRITICAL]: 0,
      },
      logsByComponent: {},
      averageLogSize: 0,
      logsPerSecond: 0,
      errorRate: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Get L-Key category
   */
  private getLKeyCategory(lKey: string): string {
    const prefix = lKey.substring(0, 2);
    const categoryMap: Record<string, string> = {
      L1: 'PARTY',
      L2: 'CUSTOMER',
      L3: 'TRANSACTION',
      L4: 'PAYMENT',
      L5: 'ORDER',
      L6: 'STATUS',
      L7: 'FEE',
      L8: 'RISK',
      L9: 'SERVICE',
    };
    return categoryMap[prefix] || 'UNKNOWN';
  }

  /**
   * Get L-Key value (would integrate with L-Key system)
   */
  private getLKeyValue(lKey: string): string {
    // This would integrate with the actual L-Key mapping system
    return lKey; // Placeholder
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopAutoFlush();
    this.flush();
  }
}

export default Fire22Logger;
