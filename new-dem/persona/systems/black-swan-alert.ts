#!/usr/bin/env bun

// Black Swan Alert System - T3-Lattice Component #16 (Compile)
// Critical event detection and notification system

import { FD_THRESHOLDS, PERSONA_CONFIG } from '../persona-config.ts';

export interface BlackSwanAlert {
  alertId: string;
  marketId: string;
  fd: number;
  hurst: number;
  glyph: string;
  timestamp: number;
  requiresManualReview: boolean;
  notificationSent: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface BlackSwanThresholds {
  fdThreshold: number;
  timeWindow: number; // minutes
  consecutiveAlerts: number;
  marketImpact: number;
}

const DEFAULT_THRESHOLDS: BlackSwanThresholds = {
  fdThreshold: FD_THRESHOLDS.blackSwan,
  timeWindow: 30, // 30 minutes
  consecutiveAlerts: 3,
  marketImpact: 0.15 // 15% price movement
};

export class BlackSwanAlertSystem {
  private alerts: BlackSwanAlert[] = [];
  private alertHistory = new Map<string, BlackSwanAlert[]>();
  private thresholds: BlackSwanThresholds;

  constructor(thresholds: Partial<BlackSwanThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  async detectBlackSwan(
    marketId: string,
    fd: number,
    hurst: number,
    glyph: string,
    marketData?: {
      priceMovement?: number;
      volumeSpike?: number;
      timeToEvent?: number;
    }
  ): Promise<BlackSwanAlert | null> {
    // Check if FD exceeds black swan threshold
    if (fd < this.thresholds.fdThreshold) {
      return null;
    }

    // Check for market impact indicators
    const hasSignificantMovement = marketData?.priceMovement &&
      Math.abs(marketData.priceMovement) > this.thresholds.marketImpact;

    const hasVolumeSpike = marketData?.volumeSpike &&
      marketData.volumeSpike > 2.0; // 2x normal volume

    // Determine severity
    let severity: BlackSwanAlert['severity'] = 'LOW';
    if (fd > 3.0 || hasSignificantMovement) severity = 'HIGH';
    if (fd > 3.5 && hasVolumeSpike) severity = 'CRITICAL';

    // Check for consecutive alerts (pattern recognition)
    const recentAlerts = this.getRecentAlerts(marketId, this.thresholds.timeWindow);
    const consecutiveCount = recentAlerts.filter(a => a.fd > this.thresholds.fdThreshold).length;

    if (consecutiveCount >= this.thresholds.consecutiveAlerts) {
      severity = 'CRITICAL';
    }

    const alertId = `bsa_${Bun.randomUUIDv7().replace(/-/g, '').slice(0, 16)}`;

    const alert: BlackSwanAlert = {
      alertId,
      marketId,
      fd,
      hurst,
      glyph,
      timestamp: Date.now(),
      requiresManualReview: severity === 'CRITICAL' || fd > 3.0,
      notificationSent: false,
      severity
    };

    // Store alert
    this.alerts.push(alert);

    // Update market history
    const marketAlerts = this.alertHistory.get(marketId) || [];
    marketAlerts.push(alert);
    this.alertHistory.set(marketId, marketAlerts.slice(-100)); // Keep last 100

    // Trigger notifications
    await this.triggerNotifications(alert);

    // Create quantum audit entry
    await this.createAuditEntry(alert);

    return alert;
  }

  private async triggerNotifications(alert: BlackSwanAlert): Promise<void> {
    // PTY Terminal notification (Component #13)
    await this.sendPTYNotification(alert);

    // Email/SMS alerts for critical events
    if (alert.severity === 'CRITICAL') {
      await this.sendCriticalAlerts(alert);
    }

    alert.notificationSent = true;
  }

  private async sendPTYNotification(alert: BlackSwanAlert): Promise<void> {
    const ptyMessage = {
      type: "BLACK_SWAN_ALERT",
      alertId: alert.alertId,
      marketId: alert.marketId,
      severity: alert.severity,
      fd: alert.fd,
      glyph: alert.glyph,
      timestamp: alert.timestamp,
      requiresReview: alert.requiresManualReview,
      message: `Black Swan detected in ${alert.marketId} with FD ${alert.fd.toFixed(3)}`
    };

    // Integration with Component #13 (PTY Terminal)
    // In production, this would send to the PTY terminal system
    console.warn(`🚨 BLACK SWAN ALERT:`, JSON.stringify(ptyMessage, null, 2));
  }

  private async sendCriticalAlerts(alert: BlackSwanAlert): Promise<void> {
    const criticalMessage = {
      alertId: alert.alertId,
      market: alert.marketId,
      severity: 'CRITICAL',
      message: `URGENT: Black Swan detected with FD ${alert.fd.toFixed(3)}`,
      timestamp: new Date(alert.timestamp).toISOString(),
      requiresImmediateAction: true
    };

    // Integration with external alerting systems
    // Email, SMS, Slack, PagerDuty, etc.
    console.error(`🚨🚨 CRITICAL BLACK SWAN ALERT:`, JSON.stringify(criticalMessage, null, 2));
  }

  private async createAuditEntry(alert: BlackSwanAlert): Promise<void> {
    const auditEntry = {
      type: "BLACK_SWAN_ALERT",
      alertId: alert.alertId,
      marketId: alert.marketId,
      severity: alert.severity,
      fd: alert.fd,
      hurst: alert.hurst,
      glyph: alert.glyph,
      timestamp: alert.timestamp,
      persona: PERSONA_CONFIG.personaId,
      requiresReview: alert.requiresManualReview
    };

    // Integration with Component #24 (Versioning) for audit logging
    // In production, this would create a quantum audit entry
    console.log(`🔐 Quantum Audit: Black Swan Alert ${alert.alertId}`);
  }

  getRecentAlerts(marketId: string, timeWindowMinutes: number): BlackSwanAlert[] {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    const marketAlerts = this.alertHistory.get(marketId) || [];

    return marketAlerts.filter(alert => alert.timestamp > cutoffTime);
  }

  getAlertStatistics(timeWindowMinutes: number = 60): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    averageFD: number;
  } {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    const recentAlerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);

    const critical = recentAlerts.filter(a => a.severity === 'CRITICAL').length;
    const high = recentAlerts.filter(a => a.severity === 'HIGH').length;
    const medium = recentAlerts.filter(a => a.severity === 'MEDIUM').length;
    const low = recentAlerts.filter(a => a.severity === 'LOW').length;

    const averageFD = recentAlerts.length > 0
      ? recentAlerts.reduce((sum, a) => sum + a.fd, 0) / recentAlerts.length
      : 0;

    return {
      total: recentAlerts.length,
      critical,
      high,
      medium,
      low,
      averageFD
    };
  }

  getActiveMarkets(): string[] {
    const activeMarkets = new Set<string>();

    // Markets with alerts in the last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    for (const [marketId, alerts] of this.alertHistory.entries()) {
      const recentAlerts = alerts.filter(a => a.timestamp > oneDayAgo);
      if (recentAlerts.length > 0) {
        activeMarkets.add(marketId);
      }
    }

    return Array.from(activeMarkets);
  }

  clearOldAlerts(daysOld: number = 30): number {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Clear main alerts array
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);

    // Clear market history
    for (const [marketId, alerts] of this.alertHistory.entries()) {
      const recentAlerts = alerts.filter(alert => alert.timestamp > cutoffTime);
      if (recentAlerts.length === 0) {
        this.alertHistory.delete(marketId);
      } else {
        this.alertHistory.set(marketId, recentAlerts);
      }
    }

    return initialCount - this.alerts.length;
  }
}

// Global alert system instance
export const blackSwanAlertSystem = new BlackSwanAlertSystem();

// Export convenience functions
export async function triggerBlackSwanAlert(
  marketId: string,
  fd: number,
  hurst: number,
  glyph: string,
  marketData?: any
): Promise<BlackSwanAlert | null> {
  return blackSwanAlertSystem.detectBlackSwan(marketId, fd, hurst, glyph, marketData);
}

export function getBlackSwanStatistics(timeWindowMinutes: number = 60) {
  return blackSwanAlertSystem.getAlertStatistics(timeWindowMinutes);
}

export function getActiveBlackSwanMarkets() {
  return blackSwanAlertSystem.getActiveMarkets();
}