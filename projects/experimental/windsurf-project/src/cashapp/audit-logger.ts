/**
 * CashApp Audit Logger - Compliance & Analytics
 * Enterprise-Grade Logging with Supabase Integration
 */

import { createClient } from "@supabase/supabase-js";
import type { AuditLog, AuditQuery } from './types.js';

/**
 * Audit logger for CashApp integration
 * Handles persistent logging for compliance (AML, KYC, GDPR)
 */
export class CashAppAuditLogger {
  private supabase: any;
  private readonly serviceName = 'cashapp-integration-v2';
  private readonly version = '2.0';

  constructor(options: {
    supabaseUrl?: string;
    supabaseKey?: string;
  } = {}) {
    const url = options.supabaseUrl || process.env.SUPABASE_URL;
    const key = options.supabaseKey || process.env.SUPABASE_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    } else {
      console.warn('[CashAppAuditLogger] Supabase credentials missing. Logging to console only.');
    }
  }

  /**
   * Log an audit event
   */
  async log(log: Omit<AuditLog, 'service' | 'version'>): Promise<void> {
    const fullLog: AuditLog = {
      ...log,
      service: this.serviceName,
      version: this.version
    };

    // 1. Console logging (Development)
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date(fullLog.timestamp).toISOString();
      console.log(`[AUDIT] [${timestamp}] ${fullLog.action} - Phone: ${fullLog.phone} - Risk: ${fullLog.riskScore || 'N/A'}`);
    }

    // 2. Supabase logging (Persistence)
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('audit_logs')
          .insert({
            phone: fullLog.phone,
            action: fullLog.action,
            risk_score: fullLog.riskScore,
            timestamp: new Date(fullLog.timestamp).toISOString(),
            service: fullLog.service,
            version: fullLog.version,
            metadata: fullLog // Store everything else in metadata column
          });

        if (error) throw error;
      } catch (error) {
        console.error('[CashAppAuditLogger] Failed to log to Supabase:', error);
      }
    }
  }

  /**
   * Specifically log a profile resolution
   */
  async logResolve(phone: string, riskScore: number, metadata: any = {}): Promise<void> {
    await this.log({
      action: 'resolve',
      phone,
      riskScore,
      timestamp: Date.now(),
      ...metadata
    });
  }

  /**
   * Specifically log a batch operation
   */
  async logBatchResolve(phoneCount: number, stats: any): Promise<void> {
    await this.log({
      action: 'batch_resolve',
      phone: 'BATCH',
      timestamp: Date.now(),
      phoneCount,
      ...stats
    });
  }

  /**
   * Specifically log a risk assessment
   */
  async logRiskAssessment(phone: string, riskScore: number, recommendation: string): Promise<void> {
    await this.log({
      action: 'risk_assessment',
      phone,
      riskScore,
      timestamp: Date.now(),
      recommendation
    });
  }

  /**
   * Specifically log a block action
   */
  async logBlock(phone: string, reason: string): Promise<void> {
    await this.log({
      action: 'block',
      phone,
      timestamp: Date.now(),
      reason
    });
  }

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<AuditLog[]> {
    if (!this.supabase) {
      console.warn('[CashAppAuditLogger] Cannot query logs: Supabase not configured.');
      return [];
    }

    try {
      let q = this.supabase
        .from('audit_logs')
        .select('*');

      if (query.phone) q = q.eq('phone', query.phone);
      if (query.action) q = q.eq('action', query.action);
      if (query.startTime) q = q.gte('timestamp', new Date(query.startTime).toISOString());
      if (query.endTime) q = q.lte('timestamp', new Date(query.endTime).toISOString());
      if (query.riskScoreMin) q = q.gte('risk_score', query.riskScoreMin);
      if (query.riskScoreMax) q = q.lte('risk_score', query.riskScoreMax);
      
      q = q.order('timestamp', { ascending: false });
      
      if (query.limit) q = q.limit(query.limit);
      if (query.offset) q = q.range(query.offset, query.offset + (query.limit || 10) - 1);

      const { data, error } = await q;

      if (error) throw error;

      return data.map((item: any) => ({
        ...item.metadata,
        timestamp: new Date(item.timestamp).getTime(),
        riskScore: item.risk_score
      }));
    } catch (error) {
      console.error('[CashAppAuditLogger] Query failed:', error);
      return [];
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(periodDays: number = 30): Promise<{
    totalLookups: number;
    highRiskDetected: number;
    profilesBlocked: number;
    averageRiskScore: number;
  }> {
    const startTime = Date.now() - (periodDays * 24 * 60 * 60 * 1000);
    const logs = await this.query({ startTime });

    const resolveLogs = logs.filter(l => l.action === 'resolve');
    const blockLogs = logs.filter(l => l.action === 'block');
    const highRiskLogs = resolveLogs.filter(l => (l.riskScore || 0) >= 80);

    const totalRisk = resolveLogs.reduce((sum, l) => sum + (l.riskScore || 0), 0);

    return {
      totalLookups: resolveLogs.length,
      highRiskDetected: highRiskLogs.length,
      profilesBlocked: blockLogs.length,
      averageRiskScore: resolveLogs.length > 0 ? totalRisk / resolveLogs.length : 0
    };
  }
}

/**
 * Create a global audit logger instance
 */
export const auditLogger = new CashAppAuditLogger();
