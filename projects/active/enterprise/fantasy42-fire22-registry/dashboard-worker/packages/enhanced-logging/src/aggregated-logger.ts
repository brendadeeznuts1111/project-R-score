/**
 * Aggregated Logger - Combines all Fire22 logging capabilities
 */

import { Fire22Logger, LogLevel, LogContext } from './logger';
import { LKeyAuditLogger } from './l-key-audit-logger';
import { LoggerConfig, AuditReport } from './types';

export class AggregatedLogger {
  private baseLogger: Fire22Logger;
  private auditLogger: LKeyAuditLogger;
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableRemote: false,
      filePath: './logs/fire22-aggregated.log',
      bufferSize: 1000,
      flushInterval: 5000,
      enableMetrics: true,
      enableSecurity: true,
      enablePerformance: true,
      enableLKeyTracking: true,
      maxLogFileSize: 100 * 1024 * 1024,
      logRotation: true,
      retentionDays: 30,
      ...config,
    };

    this.baseLogger = new Fire22Logger(this.config);
    this.auditLogger = new LKeyAuditLogger({
      ...this.config,
      filePath: this.config.filePath?.replace('.log', '-audit.log'),
    });
  }

  // !==!==!==!==!==!==!==!===
  // STANDARD LOGGING METHODS
  // !==!==!==!==!==!==!==!===

  public debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.baseLogger.debug(message, context, metadata);
  }

  public info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.baseLogger.info(message, context, metadata);
  }

  public warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.baseLogger.warn(message, context, metadata);
  }

  public error(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.baseLogger.error(message, context, metadata);
  }

  public critical(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.baseLogger.critical(message, context, metadata);
  }

  // !==!==!==!==!==!==!==!===
  // L-KEY INTEGRATED LOGGING
  // !==!==!==!==!==!==!==!===

  /**
   * Log with L-Key context
   */
  public logWithLKey(
    level: LogLevel,
    message: string,
    lKey: string,
    entityId: string,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): void {
    this.baseLogger.logWithLKey(level, message, lKey, entityId, context, metadata);

    // Also log to audit trail
    this.auditLogger.logLKeyAction('LOG_WITH_LKEY', lKey, 'GENERAL', entityId, context, {
      ...metadata,
      logLevel: LogLevel[level],
    });
  }

  /**
   * Enhanced transaction logging with L-Key integration
   */
  public logTransaction(
    transactionId: string,
    transactionType: string,
    transactionLKey: string,
    action: string,
    details: {
      amount?: number;
      currency?: string;
      fromCustomerId?: string;
      toCustomerId?: string;
      paymentMethod?: string;
      paymentMethodLKey?: string;
      status?: string;
      statusLKey?: string;
      fees?: Record<string, number>;
      riskScore?: number;
      flowSequence?: string[];
    },
    context: LogContext = {}
  ): void {
    const enhancedContext = {
      ...context,
      lKey: transactionLKey,
      entityId: transactionId,
      component: 'transaction-processor',
    };

    const metadata = {
      transactionType,
      transactionLKey,
      action,
      ...details,
    };

    // Log to base logger
    this.baseLogger.logTransaction(transactionId, action, metadata, enhancedContext);

    // Log to L-Key audit logger
    this.auditLogger.logLKeyAction(
      action,
      transactionLKey,
      'TRANSACTION',
      transactionId,
      enhancedContext,
      metadata
    );

    // Log flow sequence if provided
    if (details.flowSequence) {
      this.auditLogger.logLKeyFlow(
        `${transactionType}_FLOW`,
        details.flowSequence,
        transactionId,
        enhancedContext,
        metadata
      );
    }
  }

  /**
   * Enhanced OTC order logging
   */
  public logOTCOrder(
    orderId: string,
    orderType: string,
    orderLKey: string,
    action: string,
    details: {
      customerId?: string;
      customerLKey?: string;
      side?: string;
      asset?: string;
      amount?: number;
      price?: number;
      status?: string;
      statusLKey?: string;
      priority?: number;
      serviceTier?: number;
      auditTrail?: string[];
    },
    context: LogContext = {}
  ): void {
    const enhancedContext = {
      ...context,
      lKey: orderLKey,
      entityId: orderId,
      component: 'otc-matching-engine',
    };

    const metadata = {
      orderType,
      orderLKey,
      action,
      ...details,
    };

    // Log to base logger
    this.info(`🏛️ OTC Order ${action}: ${orderId} (${orderType})`, enhancedContext, metadata);

    // Log to L-Key audit logger
    this.auditLogger.logLKeyAction(
      action,
      orderLKey,
      'OTC_ORDER',
      orderId,
      enhancedContext,
      metadata
    );

    // Log audit trail if provided
    if (details.auditTrail) {
      this.auditLogger.logLKeyFlow(
        `OTC_ORDER_${action}`,
        details.auditTrail,
        orderId,
        enhancedContext,
        metadata
      );
    }
  }

  /**
   * Enhanced customer logging
   */
  public logCustomer(
    customerId: string,
    customerType: string,
    customerLKey: string,
    action: string,
    details: {
      username?: string;
      telegramId?: string;
      serviceTier?: number;
      totalVolume?: number;
      riskScore?: number;
      kycLevel?: string;
      status?: string;
    },
    context: LogContext = {}
  ): void {
    const enhancedContext = {
      ...context,
      lKey: customerLKey,
      entityId: customerId,
      component: 'customer-manager',
    };

    const metadata = {
      customerType,
      customerLKey,
      action,
      ...details,
    };

    // Log to base logger
    this.info(`👤 Customer ${action}: ${customerId} (${customerType})`, enhancedContext, metadata);

    // Log to L-Key audit logger
    this.auditLogger.logLKeyAction(
      action,
      customerLKey,
      'CUSTOMER',
      customerId,
      enhancedContext,
      metadata
    );
  }

  /**
   * Enhanced security logging with L-Key context
   */
  public logSecurity(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    lKey: string,
    entityId: string,
    details: {
      sourceIP?: string;
      userAgent?: string;
      endpoint?: string;
      riskScore?: number;
      blocked?: boolean;
      reason?: string;
      mitigation?: string;
    },
    context: LogContext = {}
  ): void {
    const level =
      severity === 'CRITICAL'
        ? LogLevel.CRITICAL
        : severity === 'HIGH'
          ? LogLevel.ERROR
          : severity === 'MEDIUM'
            ? LogLevel.WARN
            : LogLevel.INFO;

    const enhancedContext = {
      ...context,
      lKey,
      entityId,
      component: 'security-monitor',
    };

    const metadata = {
      securityEvent: event,
      severity,
      lKey,
      ...details,
    };

    // Log to base logger
    this.baseLogger.logSecurity(event, severity, metadata, enhancedContext);

    // Log to L-Key audit logger
    this.auditLogger.logLKeyAction(
      `SECURITY_${event.toUpperCase()}`,
      lKey,
      'SECURITY_EVENT',
      entityId,
      enhancedContext,
      metadata
    );
  }

  /**
   * Performance logging with L-Key context
   */
  public logPerformance(
    operation: string,
    duration: number,
    lKey: string,
    entityId: string,
    details: {
      cpuUsage?: number;
      memoryUsage?: number;
      throughput?: number;
      latency?: number;
      errorRate?: number;
    },
    context: LogContext = {}
  ): void {
    const enhancedContext = {
      ...context,
      lKey,
      entityId,
      component: 'performance-monitor',
    };

    const metadata = {
      operation,
      duration,
      lKey,
      ...details,
    };

    // Log to base logger
    this.info(`⚡ Performance: ${operation} completed in ${duration}ms`, enhancedContext, metadata);

    // Log to L-Key audit logger if duration exceeds threshold
    if (duration > 1000) {
      // Log slow operations to audit
      this.auditLogger.logLKeyAction(
        'SLOW_OPERATION',
        lKey,
        'PERFORMANCE',
        entityId,
        enhancedContext,
        metadata
      );
    }
  }

  // !==!==!==!==!==!==!==!===
  // SPECIALIZED LOGGING METHODS
  // !==!==!==!==!==!==!==!===

  /**
   * Log entity mapping creation
   */
  public logEntityMapping(
    entityType: string,
    entityId: string,
    lKey: string,
    mappingDetails: Record<string, any>,
    context: LogContext = {}
  ): void {
    this.auditLogger.logEntityMapping(entityType, entityId, lKey, mappingDetails, context);
  }

  /**
   * Log L-Key validation
   */
  public logLKeyValidation(
    lKey: string,
    isValid: boolean,
    validationErrors?: string[],
    context: LogContext = {}
  ): void {
    this.auditLogger.logLKeyValidation(lKey, isValid, validationErrors, context);
  }

  /**
   * Log fee calculation
   */
  public logFeeCalculation(
    transactionId: string,
    feeDetails: {
      baseFee: number;
      tierDiscount: number;
      volumeDiscount: number;
      paymentSurcharge: number;
      totalFee: number;
      effectiveRate: number;
    },
    lKey: string,
    context: LogContext = {}
  ): void {
    this.info(
      `💰 Fee Calculation: ${transactionId}`,
      {
        ...context,
        lKey,
        entityId: transactionId,
        component: 'fee-calculator',
      },
      {
        feeCalculation: feeDetails,
        savings: feeDetails.baseFee - feeDetails.totalFee,
        savingsPercentage: (
          ((feeDetails.baseFee - feeDetails.totalFee) / feeDetails.baseFee) *
          100
        ).toFixed(2),
      }
    );

    this.auditLogger.logLKeyAction(
      'FEE_CALCULATED',
      lKey,
      'FEE_CALCULATION',
      transactionId,
      context,
      { feeDetails }
    );
  }

  /**
   * Performance timing helper
   */
  public time(label: string, lKey?: string, entityId?: string, context?: LogContext): () => void {
    const startTime = Bun.nanoseconds();

    return () => {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to milliseconds

      if (lKey && entityId) {
        this.logPerformance(label, duration, lKey, entityId, {}, context);
      } else {
        this.info(`⏱️ ${label}`, context, { duration, unit: 'ms' });
      }
    };
  }

  // !==!==!==!==!==!==!==!===
  // REPORTING AND ANALYTICS
  // !==!==!==!==!==!==!==!===

  /**
   * Generate comprehensive audit report
   */
  public generateAuditReport(startDate?: Date, endDate?: Date): AuditReport {
    return this.auditLogger.generateAuditReport(startDate, endDate);
  }

  /**
   * Get L-Key usage statistics
   */
  public getLKeyUsageStats(startDate?: Date, endDate?: Date) {
    return this.auditLogger.getLKeyUsageStats(startDate, endDate);
  }

  /**
   * Export audit data
   */
  public exportAuditEntries(
    startDate?: Date,
    endDate?: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    return this.auditLogger.exportAuditEntries(startDate, endDate, format);
  }

  /**
   * Get logger metrics
   */
  public getMetrics() {
    return this.baseLogger.getMetrics();
  }

  /**
   * Get audit entry count
   */
  public getAuditEntryCount(): number {
    return this.auditLogger.getAuditEntryCount();
  }

  // !==!==!==!==!==!==!==!===
  // LIFECYCLE MANAGEMENT
  // !==!==!==!==!==!==!==!===

  /**
   * Flush all loggers
   */
  public async flush(): Promise<void> {
    await Promise.all([this.baseLogger.flush(), this.auditLogger.flush()]);
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.baseLogger.resetMetrics();
  }

  /**
   * Clear audit entries
   */
  public clearAuditEntries(): void {
    this.auditLogger.clearAuditEntries();
  }

  /**
   * Destroy all loggers
   */
  public destroy(): void {
    this.baseLogger.destroy();
    this.auditLogger.destroy();
  }
}

export default AggregatedLogger;
