/**
 * Fire22 Enterprise Web Log Manager
 * Handles comprehensive web activity tracking with D1/PostgreSQL and R2 storage
 */

import {
  WebLogBase,
  LogType,
  LogStatus,
  AnyWebLog,
  LogQueryFilter,
  LogQueryResult,
  StorageConfig,
  LogAnalytics,
  TransactionLog,
  WagerLog,
  AuthenticationLog,
  CasinoBetLog,
  SecurityLog,
  CreateLogRequest,
  FIRE22_LOG_LANGUAGE_KEYS,
} from '../types/web-logs.types';

export class WebLogManager {
  private env: any;
  private config: StorageConfig;

  constructor(env: any) {
    this.env = env;
    this.config = {
      database: {
        binding: 'DB', // fire22-dashboard D1 database
        retentionDays: 90, // Configurable retention policy
        batchSize: 1000,
      },
      r2Storage: {
        binding: 'REGISTRY_STORAGE', // fire22-packages R2 bucket
        archivePath: 'logs/archived',
        compressionEnabled: true,
      },
      kvCache: {
        binding: 'FIRE22_DATA_CACHE',
        ttlSeconds: 3600, // 1 hour cache for analytics
      },
    };
  }

  // !==!== Core Logging Methods !==!==

  /**
   * Create a new web log entry with automatic classification and risk assessment
   */
  async createLog<T extends LogType>(logData: CreateLogRequest<T>): Promise<string> {
    const logId = this.generateLogId();
    const timestamp = new Date();

    // Enhance log with metadata
    const enhancedLog: WebLogBase = {
      ...(logData as any),
      id: logId,
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: logData.status || LogStatus.PROCESSED,
      riskScore: await this.calculateRiskScore(logData),
      isSuspicious: await this.detectSuspiciousActivity(logData),
      fire22LanguageKeys: this.getRelevantLanguageKeys(logData.logType),
      retentionExpiresAt: new Date(
        Date.now() + this.config.database.retentionDays * 24 * 60 * 60 * 1000
      ),
    };

    // Store in D1 database
    await this.storeInDatabase(enhancedLog);

    // Store detailed sub-logs based on type
    await this.storeDetailedLog(enhancedLog);

    // Update analytics in background
    this.updateAnalytics(enhancedLog).catch(err => console.error('Analytics update failed:', err));

    // Cache recent logs for performance
    await this.updateCacheLog(enhancedLog);

    return logId;
  }

  /**
   * Transaction-specific logging with Fire22 compliance
   */
  async logTransaction(
    data: Omit<CreateLogRequest<LogType.TRANSACTION>, 'logType'>
  ): Promise<string> {
    const transactionData: CreateLogRequest<LogType.TRANSACTION> = {
      ...data,
      logType: LogType.TRANSACTION,
      fire22LanguageKeys: ['L-842', 'L-846'], // Transaction History, Account Balance
    };

    return this.createLog(transactionData);
  }

  /**
   * Wager logging with risk management integration
   */
  async logWager(data: Omit<CreateLogRequest<LogType.WAGER>, 'logType'>): Promise<string> {
    const wagerData: CreateLogRequest<LogType.WAGER> = {
      ...data,
      logType: LogType.WAGER,
      fire22LanguageKeys: ['L-1385', 'L-1389'], // 3rd Party Limits, Risk Management
    };

    return this.createLog(wagerData);
  }

  /**
   * Authentication logging with security analysis
   */
  async logAuthentication(
    data: Omit<CreateLogRequest<LogType.AUTHENTICATION>, 'logType'>
  ): Promise<string> {
    const authData: CreateLogRequest<LogType.AUTHENTICATION> = {
      ...data,
      logType: LogType.AUTHENTICATION,
      fire22LanguageKeys: ['L-1387', 'L-1388'], // Security Settings, Account Verification
    };

    return this.createLog(authData);
  }

  /**
   * Casino bet logging with fraud detection
   */
  async logCasinoBet(data: Omit<CreateLogRequest<LogType.CASINO_BET>, 'logType'>): Promise<string> {
    const casinoData: CreateLogRequest<LogType.CASINO_BET> = {
      ...data,
      logType: LogType.CASINO_BET,
      fire22LanguageKeys: ['L-848', 'L-1390'], // Fraud Detection, Compliance Check
    };

    return this.createLog(casinoData);
  }

  /**
   * Security incident logging
   */
  async logSecurityIncident(
    data: Omit<CreateLogRequest<LogType.SECURITY>, 'logType'>
  ): Promise<string> {
    const securityData: CreateLogRequest<LogType.SECURITY> = {
      ...data,
      logType: LogType.SECURITY,
      fire22LanguageKeys: ['L-1389', 'L-1391'], // Risk Management, Audit Trail
      isSuspicious: true, // Security logs are inherently suspicious
      riskScore: Math.max(data.riskScore || 0, 50), // Minimum 50 risk score for security incidents
    };

    return this.createLog(securityData);
  }

  // !==!== Query and Retrieval Methods !==!==

  /**
   * Query web logs with advanced filtering
   */
  async queryLogs(filter: LogQueryFilter): Promise<LogQueryResult> {
    const cacheKey = `logs:query:${JSON.stringify(filter)}`;

    // Try cache first for performance
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const db = this.env[this.config.database.binding];
    let query = `
      SELECT w.*, 
             COUNT(*) OVER() as total_count
      FROM web_logs w
      WHERE 1=1
    `;
    const params: any[] = [];

    // Build dynamic WHERE clause
    if (filter.logTypes?.length) {
      query += ` AND w.log_type IN (${filter.logTypes.map(() => '?').join(',')})`;
      params.push(...filter.logTypes);
    }

    if (filter.customerId) {
      query += ` AND w.customer_id = ?`;
      params.push(filter.customerId);
    }

    if (filter.dateFrom) {
      query += ` AND w.timestamp >= ?`;
      params.push(filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query += ` AND w.timestamp <= ?`;
      params.push(filter.dateTo.toISOString());
    }

    if (filter.isSuspicious !== undefined) {
      query += ` AND w.is_suspicious = ?`;
      params.push(filter.isSuspicious);
    }

    if (filter.riskScoreMin !== undefined) {
      query += ` AND w.risk_score >= ?`;
      params.push(filter.riskScoreMin);
    }

    if (filter.riskScoreMax !== undefined) {
      query += ` AND w.risk_score <= ?`;
      params.push(filter.riskScoreMax);
    }

    // Ordering
    const orderBy = filter.orderBy || 'timestamp';
    const orderDirection = filter.orderDirection || 'DESC';
    query += ` ORDER BY w.${orderBy} ${orderDirection}`;

    // Pagination
    const limit = Math.min(filter.limit || 50, 1000); // Max 1000 for safety
    const offset = filter.offset || 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db
      .prepare(query)
      .bind(...params)
      .all();

    const logs = result.results.map(row => this.parseLogRow(row));
    const total = result.results[0]?.total_count || 0;

    const queryResult: LogQueryResult = {
      logs,
      total,
      hasMore: offset + logs.length < total,
      nextOffset: offset + logs.length < total ? offset + logs.length : undefined,
    };

    // Cache result for 5 minutes
    await this.setCache(cacheKey, queryResult, 300);

    return queryResult;
  }

  /**
   * Get logs for Water Dashboard display with Fire22 language support
   */
  async getLogsForDashboard(logType: LogType, limit: number = 10): Promise<WebLogBase[]> {
    const filter: LogQueryFilter = {
      logTypes: [logType],
      limit,
      orderBy: 'timestamp',
      orderDirection: 'DESC',
    };

    const result = await this.queryLogs(filter);
    return result.logs;
  }

  /**
   * Get analytics summary for dashboard KPIs
   */
  async getLogAnalyticsSummary(hoursBack: number = 24): Promise<Record<LogType, LogAnalytics>> {
    const cacheKey = `analytics:summary:${hoursBack}h`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const db = this.env[this.config.database.binding];
    const dateThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const query = `
      SELECT 
        log_type,
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as success_events,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_events,
        COUNT(CASE WHEN is_suspicious = 1 THEN 1 END) as suspicious_events,
        AVG(risk_score) as avg_risk_score,
        MAX(risk_score) as max_risk_score,
        AVG(processing_time_ms) as avg_processing_time,
        MAX(processing_time_ms) as max_processing_time
      FROM web_logs 
      WHERE timestamp >= ? 
      GROUP BY log_type
    `;

    const result = await db.prepare(query).bind(dateThreshold.toISOString()).all();

    const analytics: Record<LogType, LogAnalytics> = {} as any;

    for (const row of result.results) {
      analytics[row.log_type as LogType] = {
        id: this.generateLogId(),
        dateHour: new Date(),
        logType: row.log_type as LogType,
        totalEvents: row.total_events,
        successEvents: row.success_events,
        failedEvents: row.failed_events,
        suspiciousEvents: row.suspicious_events,
        totalAmount: 0,
        avgAmount: 0,
        maxAmount: 0,
        avgProcessingTimeMs: row.avg_processing_time || 0,
        maxProcessingTimeMs: row.max_processing_time || 0,
        avgRiskScore: Math.round(row.avg_risk_score || 0),
        maxRiskScore: row.max_risk_score || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    await this.setCache(cacheKey, analytics, 300); // 5 minute cache
    return analytics;
  }

  // !==!== Storage Management !==!==

  /**
   * Archive old logs to R2 storage for long-term retention
   */
  async archiveOldLogs(daysOld: number = 30): Promise<number> {
    const db = this.env[this.config.database.binding];
    const r2 = this.env[this.config.r2Storage.binding];

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    // Get logs to archive
    const logsToArchive = await db
      .prepare(
        `
      SELECT * FROM web_logs 
      WHERE timestamp < ? AND status != 'archived'
      LIMIT ?
    `
      )
      .bind(cutoffDate.toISOString(), this.config.database.batchSize)
      .all();

    if (logsToArchive.results.length === 0) return 0;

    // Create archive file
    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveKey = `${this.config.r2Storage.archivePath}/${archiveDate}/logs-${Date.now()}.json`;

    const archiveData = {
      metadata: {
        archiveDate: new Date().toISOString(),
        cutoffDate: cutoffDate.toISOString(),
        totalLogs: logsToArchive.results.length,
        fire22Version: '3.0.9',
      },
      logs: logsToArchive.results,
    };

    // Store in R2
    await r2.put(archiveKey, JSON.stringify(archiveData), {
      customMetadata: {
        'fire22-log-archive': 'true',
        'archive-date': archiveDate,
        'log-count': logsToArchive.results.length.toString(),
      },
    });

    // Update database records as archived
    const logIds = logsToArchive.results.map(log => log.id);
    await db
      .prepare(
        `
      UPDATE web_logs 
      SET status = 'archived', archived_at = ? 
      WHERE id IN (${logIds.map(() => '?').join(',')})
    `
      )
      .bind(new Date().toISOString(), ...logIds)
      .run();

    return logsToArchive.results.length;
  }

  /**
   * Clean up expired logs based on retention policy
   */
  async cleanupExpiredLogs(): Promise<number> {
    const db = this.env[this.config.database.binding];

    const result = await db
      .prepare(
        `
      DELETE FROM web_logs 
      WHERE retention_expires_at < ?
    `
      )
      .bind(new Date().toISOString())
      .run();

    return result.meta?.changes || 0;
  }

  // !==!== Private Helper Methods !==!==

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async calculateRiskScore(logData: any): Promise<number> {
    let riskScore = 0;

    // Base risk assessment
    if (logData.logType === LogType.SECURITY) riskScore += 50;
    if (logData.logType === LogType.TRANSACTION && logData.actionData?.amount > 10000)
      riskScore += 20;
    if (logData.logType === LogType.WAGER && logData.actionData?.stakeAmount > 5000)
      riskScore += 15;

    // IP-based risk (simplified)
    if (logData.ipAddress && !this.isKnownSafeIP(logData.ipAddress)) riskScore += 10;

    // Geo-based risk
    if (logData.geoLocation?.country !== 'BR') riskScore += 25;

    // Time-based patterns (rapid activity)
    const recentActivity = await this.getRecentActivityCount(logData.customerId, 300); // 5 minutes
    if (recentActivity > 10) riskScore += 20;

    return Math.min(riskScore, 100); // Cap at 100
  }

  private async detectSuspiciousActivity(logData: any): Promise<boolean> {
    const riskScore = await this.calculateRiskScore(logData);
    return riskScore >= 70; // Threshold for suspicious activity
  }

  private getRelevantLanguageKeys(logType: LogType): string[] {
    const baseKey = FIRE22_LOG_LANGUAGE_KEYS[logType];
    return baseKey ? [baseKey, 'L-1391'] : ['L-1391']; // Always include Audit Trail
  }

  private async storeInDatabase(log: WebLogBase): Promise<void> {
    const db = this.env[this.config.database.binding];

    await db
      .prepare(
        `
      INSERT INTO web_logs (
        id, timestamp, log_type, action_type, customer_id, session_id,
        ip_address, user_agent, geo_location, device_info, action_data,
        risk_score, is_suspicious, compliance_flags, status, processing_time_ms,
        language_code, fire22_language_keys, created_at, updated_at, retention_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .bind(
        log.id,
        log.timestamp.toISOString(),
        log.logType,
        log.actionType,
        log.customerId || null,
        log.sessionId || null,
        log.ipAddress,
        log.userAgent || null,
        JSON.stringify(log.geoLocation || null),
        JSON.stringify(log.deviceInfo || null),
        JSON.stringify(log.actionData),
        log.riskScore,
        log.isSuspicious ? 1 : 0,
        JSON.stringify(log.complianceFlags || []),
        log.status,
        log.processingTimeMs || null,
        log.languageCode,
        JSON.stringify(log.fire22LanguageKeys || []),
        log.createdAt.toISOString(),
        log.updatedAt.toISOString(),
        log.retentionExpiresAt?.toISOString() || null
      )
      .run();
  }

  private async storeDetailedLog(log: WebLogBase): Promise<void> {
    // Store type-specific detailed logs in respective tables
    // This is where transaction_logs, wager_logs, etc. would be populated
    // Implementation depends on specific log type
  }

  private async updateAnalytics(log: WebLogBase): Promise<void> {
    // Update hourly analytics aggregates
    // This would be implemented as a background process
  }

  private async updateCacheLog(log: WebLogBase): Promise<void> {
    const kv = this.env[this.config.kvCache.binding];
    const key = `recent_logs:${log.logType}`;

    // Keep last 50 logs of each type in cache
    let recentLogs = [];
    try {
      const cached = await kv.get(key, 'json');
      recentLogs = cached || [];
    } catch (e) {
      // Ignore cache errors
    }

    recentLogs.unshift(log);
    recentLogs = recentLogs.slice(0, 50); // Keep only 50 most recent

    await kv.put(key, JSON.stringify(recentLogs), {
      expirationTtl: this.config.kvCache.ttlSeconds,
    });
  }

  private async getFromCache(key: string): Promise<any> {
    try {
      const kv = this.env[this.config.kvCache.binding];
      return await kv.get(key, 'json');
    } catch (e) {
      return null;
    }
  }

  private async setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const kv = this.env[this.config.kvCache.binding];
      await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
    } catch (e) {
      // Ignore cache errors
    }
  }

  private parseLogRow(row: any): WebLogBase {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      logType: row.log_type as LogType,
      actionType: row.action_type,
      customerId: row.customer_id,
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      geoLocation: row.geo_location ? JSON.parse(row.geo_location) : undefined,
      deviceInfo: row.device_info ? JSON.parse(row.device_info) : undefined,
      actionData: JSON.parse(row.action_data || '{}'),
      riskScore: row.risk_score,
      isSuspicious: !!row.is_suspicious,
      complianceFlags: JSON.parse(row.compliance_flags || '[]'),
      status: row.status as LogStatus,
      processingTimeMs: row.processing_time_ms,
      languageCode: row.language_code,
      fire22LanguageKeys: JSON.parse(row.fire22_language_keys || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
      retentionExpiresAt: row.retention_expires_at ? new Date(row.retention_expires_at) : undefined,
    };
  }

  private isKnownSafeIP(ip: string): boolean {
    // Implement IP reputation checking
    // For now, just check if it's a Brazilian IP range (simplified)
    return ip.startsWith('186.') || ip.startsWith('187.') || ip.startsWith('189.');
  }

  private async getRecentActivityCount(
    customerId?: string,
    seconds: number = 300
  ): Promise<number> {
    if (!customerId) return 0;

    const db = this.env[this.config.database.binding];
    const threshold = new Date(Date.now() - seconds * 1000);

    const result = await db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM web_logs 
      WHERE customer_id = ? AND timestamp >= ?
    `
      )
      .bind(customerId, threshold.toISOString())
      .first();

    return result?.count || 0;
  }
}
