// lib/security/secret-audit-logger.ts — Audit logging for secret operations

import { AtomicFileOperations } from '../core/atomic-file-operations';

interface AuditEvent {
  timestamp: string;
  operation: 'read' | 'write' | 'delete' | 'rotate' | 'access_attempt';
  secretName: string;
  service: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorCode?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SecretAuditLogger {
  private static instance: SecretAuditLogger;
  private logFile: string;
  private bufferSize: number = 100;
  private buffer: AuditEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer?: ReturnType<typeof setInterval>;

  private constructor(logFile: string = './logs/secret-audit.log') {
    this.logFile = logFile;
    this.startFlushTimer();
  }

  static getInstance(logFile?: string): SecretAuditLogger {
    if (!SecretAuditLogger.instance) {
      SecretAuditLogger.instance = new SecretAuditLogger(logFile);
    }
    return SecretAuditLogger.instance;
  }

  /**
   * Log a secret access event
   */
  async logSecretAccess(
    operation: AuditEvent['operation'],
    secretName: string,
    service: string,
    success: boolean,
    context: SecurityContext = {},
    duration?: number,
    errorCode?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      operation,
      secretName,
      service,
      success,
      duration,
      errorCode,
      metadata,
      ...context,
    };

    this.buffer.push(event);

    // Immediate flush for security-sensitive operations
    if (operation === 'delete' || operation === 'rotate' || !success) {
      await this.flush();
    }

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Log successful secret read
   */
  async logSecretRead(
    secretName: string,
    service: string,
    context: SecurityContext = {},
    duration?: number
  ): Promise<void> {
    await this.logSecretAccess('read', secretName, service, true, context, duration);
  }

  /**
   * Log failed secret access
   */
  async logSecretAccessFailure(
    operation: AuditEvent['operation'],
    secretName: string,
    service: string,
    errorCode: string,
    context: SecurityContext = {},
    duration?: number
  ): Promise<void> {
    await this.logSecretAccess(operation, secretName, service, false, context, duration, errorCode);
  }

  /**
   * Flush buffered events to disk
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      const logContent = eventsToFlush.map(event => JSON.stringify(event)).join('\n') + '\n';

      await AtomicFileOperations.appendAtomic(this.logFile, logContent);
    } catch (error) {
      // Re-add events to buffer if flush fails
      this.buffer.unshift(...eventsToFlush);
      console.error('Failed to flush audit log:', error);
    }
  }

  /**
   * Query audit logs
   */
  async queryLogs(
    filters: {
      secretName?: string;
      service?: string;
      operation?: AuditEvent['operation'];
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    } = {}
  ): Promise<AuditEvent[]> {
    try {
      const content = await AtomicFileOperations.readSafe(this.logFile);
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.length > 0);

      let events: AuditEvent[] = lines
        .map(line => {
          try {
            return JSON.parse(line) as AuditEvent;
          } catch {
            return null;
          }
        })
        .filter(event => event !== null) as AuditEvent[];

      // Apply filters
      if (filters.secretName) {
        events = events.filter(e => e.secretName === filters.secretName);
      }
      if (filters.service) {
        events = events.filter(e => e.service === filters.service);
      }
      if (filters.operation) {
        events = events.filter(e => e.operation === filters.operation);
      }
      if (filters.success !== undefined) {
        events = events.filter(e => e.success === filters.success);
      }
      if (filters.startDate) {
        events = events.filter(e => new Date(e.timestamp) >= filters.startDate!);
      }
      if (filters.endDate) {
        events = events.filter(e => new Date(e.timestamp) <= filters.endDate!);
      }

      return events.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalAccess: number;
    successfulAccess: number;
    failedAccess: number;
    uniqueSecrets: number;
    uniqueServices: number;
    topSecrets: Array<{ secretName: string; count: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
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

    const events = await this.queryLogs({ startDate: startTime, endDate: now });

    const totalAccess = events.length;
    const successfulAccess = events.filter(e => e.success).length;
    const failedAccess = totalAccess - successfulAccess;

    const uniqueSecrets = new Set(events.map(e => e.secretName)).size;
    const uniqueServices = new Set(events.map(e => e.service)).size;

    const secretCounts = events.reduce(
      (acc, event) => {
        acc[event.secretName] = (acc[event.secretName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topSecrets = Object.entries(secretCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([secretName, count]) => ({ secretName, count }));

    const failureReasons = events
      .filter(e => !e.success && e.errorCode)
      .reduce(
        (acc, event) => {
          const reason = event.errorCode!;
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const topFailureReasons = Object.entries(failureReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    return {
      totalAccess,
      successfulAccess,
      failedAccess,
      uniqueSecrets,
      uniqueServices,
      topSecrets,
      failureReasons: topFailureReasons,
    };
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushInterval);
  }

  /**
   * Stop automatic flush timer
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * Rotate audit log (keep last N days)
   */
  async rotateLog(daysToKeep: number = 30): Promise<void> {
    await this.flush();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const events = await this.queryLogs({ startDate: new Date(0), endDate: cutoffDate });

      if (events.length > 0) {
        // Create backup of old events
        const backupFile = `${this.logFile}.${new Date().toISOString().split('T')[0]}`;
        const backupContent = events.map(event => JSON.stringify(event)).join('\n') + '\n';

        await AtomicFileOperations.writeSafe(backupFile, backupContent);

        // Rewrite current log with only recent events
        const recentEvents = await this.queryLogs({ startDate: cutoffDate });
        const recentContent = recentEvents.map(event => JSON.stringify(event)).join('\n') + '\n';

        await AtomicFileOperations.writeSafe(this.logFile, recentContent);
      }
    } catch (error) {
      console.error('Failed to rotate audit log:', error);
    }
  }
}

// Export singleton instance
export const auditLogger = SecretAuditLogger.getInstance();
