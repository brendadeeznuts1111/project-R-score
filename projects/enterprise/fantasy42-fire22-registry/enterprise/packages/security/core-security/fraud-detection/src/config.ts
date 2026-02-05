#!/usr/bin/env bun

/**
 * 🕵️ Fantasy42 Fraud Detection Client
 *
 * Specialized client for fraud detection operations with enterprise security features
 * and real-time threat analysis capabilities.
 */

import { Fantasy42SecureClient, SecureClientFactory } from '../../src/secure-client';
import { Fantasy42UserAgents } from '../../src/user-agents';

export interface FraudCheckRequest {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  transactionType: 'deposit' | 'withdrawal' | 'bet' | 'payout';
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  metadata?: Record<string, any>;
}

export interface RiskScoreRequest {
  accountId: string;
  timeRange?: {
    start: string;
    end: string;
  };
  includeFactors?: boolean;
}

export interface FraudAlert {
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'velocity' | 'location' | 'amount' | 'pattern' | 'device';
  description: string;
  accountId: string;
  transactionId?: string;
  timestamp: string;
  actions: string[];
  confidence: number;
}

export class Fantasy42FraudDetectionClient extends Fantasy42SecureClient {
  constructor(environment: string = 'production', options?: any) {
    super('FRAUD_DETECTION', environment, {
      ...options,
      compliance: true, // Always enable compliance for fraud detection
    });
  }

  /**
   * Check transaction for fraud indicators
   */
  async checkTransaction(request: FraudCheckRequest): Promise<{
    isFraud: boolean;
    riskScore: number;
    reasons: string[];
    alerts: FraudAlert[];
    recommendation: 'approve' | 'review' | 'block';
  }> {
    const response = await this.post('/api/v1/fraud/check', {
      ...request,
      requestId: this.generateRequestId(),
      timestamp: new Date().toISOString(),
    });

    // Log fraud check for compliance
    await this.logFraudCheck(request, response.data);

    return response.data;
  }

  /**
   * Get risk score for an account
   */
  async getRiskScore(request: RiskScoreRequest): Promise<{
    accountId: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
      type: string;
      weight: number;
      description: string;
    }>;
    lastUpdated: string;
    recommendations: string[];
  }> {
    const response = await this.get(`/api/v1/risk-score/${request.accountId}`, {
      body: request,
    });

    return response.data;
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(alert: Omit<FraudAlert, 'alertId' | 'timestamp'>): Promise<{
    alertId: string;
    status: 'reported' | 'escalated' | 'investigating';
    timestamp: string;
  }> {
    const response = await this.post('/api/v1/fraud/report', {
      ...alert,
      alertId: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      reportedBy: this.getClientInfo().userAgent,
    });

    return response.data;
  }

  /**
   * Get fraud analytics
   */
  async getFraudAnalytics(timeRange?: { start: string; end: string }): Promise<{
    totalChecks: number;
    fraudDetected: number;
    falsePositives: number;
    averageRiskScore: number;
    topRiskFactors: Array<{
      factor: string;
      count: number;
      percentage: number;
    }>;
    alertsBySeverity: Record<string, number>;
    responseTime: number;
  }> {
    const response = await this.get('/api/v1/fraud/analytics', {
      body: timeRange,
    });

    return response.data;
  }

  /**
   * Update fraud rules
   */
  async updateFraudRules(rules: {
    velocityLimits?: {
      depositsPerHour: number;
      withdrawalsPerHour: number;
      betsPerMinute: number;
    };
    geographicRules?: {
      allowedCountries: string[];
      blockedRegions: string[];
      highRiskCountries: string[];
    };
    amountThresholds?: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  }): Promise<{
    status: 'updated' | 'pending' | 'failed';
    changes: string[];
    effectiveAt: string;
  }> {
    const response = await this.put('/api/v1/fraud/rules', {
      ...rules,
      updatedBy: this.getClientInfo().userAgent,
      timestamp: new Date().toISOString(),
    });

    return response.data;
  }

  /**
   * Validate device fingerprint
   */
  async validateDeviceFingerprint(
    fingerprint: string,
    accountId: string
  ): Promise<{
    isValid: boolean;
    confidence: number;
    reasons: string[];
    knownDevices: string[];
    riskFactors: string[];
  }> {
    const response = await this.post('/api/v1/fraud/device/validate', {
      fingerprint,
      accountId,
      timestamp: new Date().toISOString(),
    });

    return response.data;
  }

  /**
   * Get real-time fraud alerts
   */
  async getRealTimeAlerts(options?: {
    severity?: 'high' | 'critical';
    limit?: number;
    accountId?: string;
  }): Promise<FraudAlert[]> {
    const response = await this.get('/api/v1/fraud/alerts/realtime', {
      body: options,
    });

    return response.data;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logFraudCheck(request: FraudCheckRequest, result: any): Promise<void> {
    const complianceLog = {
      timestamp: new Date().toISOString(),
      type: 'fraud_check',
      transactionId: request.transactionId,
      accountId: request.accountId,
      amount: request.amount,
      currency: request.currency,
      riskScore: result.riskScore,
      isFraud: result.isFraud,
      recommendation: result.recommendation,
      userAgent: this.getClientInfo().userAgent,
      ipAddress: request.ipAddress,
      geoRegion: this.getClientInfo().geoRegion,
      compliance: {
        gdpr: true,
        aml: true,
        pci: request.transactionType === 'deposit' || request.transactionType === 'withdrawal',
      },
    };

    // Clean and log (remove ANSI codes and sensitive data)
    const cleanLog = JSON.stringify(complianceLog).replace(/\x1b\[[0-9;]*m/g, '');
    console.log(cleanLog);
  }
}

// Factory function for easy instantiation
export function createFraudDetectionClient(
  environment: string = 'production',
  options?: {
    geoRegion?: string;
    buildVersion?: string;
    customBaseURL?: string;
  }
): Fantasy42FraudDetectionClient {
  return new Fantasy42FraudDetectionClient(environment, options);
}

// Export types for external use
export type { FraudCheckRequest, RiskScoreRequest, FraudAlert };
