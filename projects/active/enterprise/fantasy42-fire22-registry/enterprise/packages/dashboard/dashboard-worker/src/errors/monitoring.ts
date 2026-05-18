/**
 * Fire22 Error Monitoring and Alerting
 *
 * Comprehensive error monitoring, alerting, and observability
 */

import { ErrorHandler } from './ErrorHandler';
import { RetryUtils } from './RetryUtils';
import { Fire22Error, ErrorSeverity } from './types';

export interface MonitoringConfig {
  alertingEnabled: boolean;
  alertThresholds: {
    errorRate: number; // errors per minute
    criticalErrors: number; // critical errors per hour
    circuitBreakerOpenings: number; // circuit breaker openings per hour
  };
  webhookUrl?: string;
  slackWebhook?: string;
  emailRecipients?: string[];
}

export interface AlertPayload {
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  service: string;
  timestamp: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export class FireEventMonitoring {
  private static instance: FireEventMonitoring;
  private config: MonitoringConfig;
  private alertBuffer: AlertPayload[] = [];
  private maxBufferSize = 100;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  static getInstance(config?: MonitoringConfig): FireEventMonitoring {
    if (!FireEventMonitoring.instance && config) {
      FireEventMonitoring.instance = new FireEventMonitoring(config);
    }
    return FireEventMonitoring.instance;
  }

  /**
   * Process error for monitoring and alerting
   */
  async processError(error: Fire22Error): Promise<void> {
    try {
      // Check if alert should be triggered
      if (this.shouldAlert(error)) {
        await this.sendAlert({
          severity: this.mapSeverityToAlert(error.severity),
          title: `Fire22 ${error.severity.toUpperCase()} Error`,
          message: error.message,
          service: 'fire22-dashboard',
          timestamp: error.context.timestamp,
          correlationId: error.context.correlationId,
          metadata: {
            code: error.code,
            category: error.category,
            endpoint: error.context.endpoint,
            userId: error.context.userId,
            retryable: error.retryable,
          },
        });
      }

      // Store in buffer for trend analysis
      this.storeAlert({
        severity: this.mapSeverityToAlert(error.severity),
        title: error.code,
        message: error.message,
        service: 'fire22-dashboard',
        timestamp: error.context.timestamp,
        correlationId: error.context.correlationId,
        metadata: {
          category: error.category,
          endpoint: error.context.endpoint,
        },
      });
    } catch (monitoringError) {
      console.error('Failed to process error for monitoring:', monitoringError);
    }
  }

  /**
   * Check if alert should be sent based on severity and thresholds
   */
  private shouldAlert(error: Fire22Error): boolean {
    if (!this.config.alertingEnabled) return false;

    // Always alert on critical errors
    if (error.severity === 'critical') return true;

    // Check error rate threshold
    const recentErrors = this.alertBuffer.filter(
      alert => Date.now() - new Date(alert.timestamp).getTime() < 60000 // 1 minute
    );

    if (recentErrors.length >= this.config.alertThresholds.errorRate) {
      return true;
    }

    return false;
  }

  /**
   * Send alert to configured channels
   */
  private async sendAlert(alert: AlertPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to webhook
    if (this.config.webhookUrl) {
      promises.push(this.sendWebhook(this.config.webhookUrl, alert));
    }

    // Send to Slack
    if (this.config.slackWebhook) {
      promises.push(this.sendSlackAlert(this.config.slackWebhook, alert));
    }

    // Log alert
    this.logAlert(alert);

    await Promise.allSettled(promises);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(webhookUrl: string, alert: AlertPayload): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(slackWebhook: string, alert: AlertPayload): Promise<void> {
    try {
      const slackMessage = {
        text: `🚨 ${alert.title}`,
        attachments: [
          {
            color: this.getSlackColor(alert.severity),
            fields: [
              {
                title: 'Service',
                value: alert.service,
                short: true,
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Message',
                value: alert.message,
                short: false,
              },
              {
                title: 'Correlation ID',
                value: alert.correlationId || 'N/A',
                short: true,
              },
              {
                title: 'Timestamp',
                value: alert.timestamp,
                short: true,
              },
            ],
          },
        ],
      };

      await fetch(slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Log alert to console with proper formatting
   */
  private logAlert(alert: AlertPayload): void {
    const icon = this.getAlertIcon(alert.severity);
    const logData = {
      ...alert,
      metadata: alert.metadata,
    };

    switch (alert.severity) {
      case 'critical':
        console.error(`${icon} CRITICAL ALERT:`, logData);
        break;
      case 'error':
        console.error(`${icon} ERROR ALERT:`, logData);
        break;
      case 'warning':
        console.warn(`${icon} WARNING ALERT:`, logData);
        break;
      default:
        console.info(`${icon} INFO ALERT:`, logData);
    }
  }

  /**
   * Store alert in buffer
   */
  private storeAlert(alert: AlertPayload): void {
    this.alertBuffer.unshift(alert);
    if (this.alertBuffer.length > this.maxBufferSize) {
      this.alertBuffer = this.alertBuffer.slice(0, this.maxBufferSize);
    }
  }

  /**
   * Map Fire22 error severity to alert severity
   */
  private mapSeverityToAlert(severity: ErrorSeverity): AlertPayload['severity'] {
    const mapping: Record<ErrorSeverity, AlertPayload['severity']> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'critical',
    };
    return mapping[severity];
  }

  /**
   * Get Slack color for severity
   */
  private getSlackColor(severity: AlertPayload['severity']): string {
    const colors = {
      info: '#36a64f',
      warning: '#ff9500',
      error: '#ff4757',
      critical: '#ff0000',
    };
    return colors[severity];
  }

  /**
   * Get alert icon for console logging
   */
  private getAlertIcon(severity: AlertPayload['severity']): string {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return icons[severity];
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData() {
    const errorHandler = ErrorHandler.getInstance();
    const errorStats = errorHandler.getErrorStats();
    const circuitBreakerStats = RetryUtils.getCircuitBreakerStats();

    // Recent alerts by severity
    const recentAlerts = this.alertBuffer.slice(0, 20);
    const alertsByseverity = recentAlerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Error trends (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentErrors = recentAlerts.filter(
      alert => new Date(alert.timestamp).getTime() > oneHourAgo
    );

    return {
      overview: {
        totalErrors: errorStats.totalErrors,
        totalAlerts: this.alertBuffer.length,
        activeCircuitBreakers: Object.values(circuitBreakerStats).filter(
          (stats: any) => stats.state === 'OPEN'
        ).length,
      },
      errors: errorStats,
      circuitBreakers: circuitBreakerStats,
      alerts: {
        recent: recentAlerts,
        bySeverity: alertsBySeverity,
        lastHour: recentErrors.length,
      },
      health: {
        alertingEnabled: this.config.alertingEnabled,
        thresholds: this.config.alertThresholds,
        lastAlert: recentAlerts[0]?.timestamp,
      },
    };
  }

  /**
   * Create monitoring endpoint response
   */
  createMonitoringResponse(): Response {
    const dashboardData = this.getDashboardData();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Fire22 Error Monitoring Dashboard',
        data: dashboardData,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }

  /**
   * Clear monitoring data (for testing)
   */
  clearData(): void {
    this.alertBuffer = [];
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorHistory();
  }
}
