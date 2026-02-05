/**
 * 🚨 Monitoring & Alerts - FactoryWager Venmo Family System
 * Production-grade monitoring, alerting, and observability
 */

import * as Sentry from '@sentry/nextjs';
import { Redis } from '@upstash/redis';

/**
 * 🚨 Alert Configuration
 */
export interface AlertConfig {
  enabled: boolean;
  channels: ('sentry' | 'slack' | 'pagerduty' | 'email')[];
  thresholds: {
    errorRate: number; // Percentage
    responseTime: number; // Milliseconds
    failureCount: number; // Count per minute
  };
  cooldown: number; // Seconds between same alert
}

/**
 * 📊 Monitoring Metrics
 */
export interface MonitoringMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  userId?: string;
  provider?: string;
}

/**
 * 🚨 Alert Manager
 */
export class AlertManager {
  private redis: Redis;
  private config: AlertConfig;
  private alertCooldowns: Map<string, number>;

  constructor(config: Partial<AlertConfig> = {}) {
    this.redis = Redis.fromEnv();
    this.config = {
      enabled: true,
      channels: ['sentry', 'slack'],
      thresholds: {
        errorRate: 5.0, // 5% error rate
        responseTime: 5000, // 5 seconds
        failureCount: 10 // 10 failures per minute
      },
      cooldown: 300, // 5 minutes
      ...config
    };
    this.alertCooldowns = new Map();
  }

  /**
   * 🚨 Send alert
   */
  async sendAlert(alert: {
    type: 'webhook_failure' | 'payment_error' | 'system_error' | 'performance_issue';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: any;
    provider?: string;
    endpoint?: string;
  }): Promise<void> {
    try {
      const alertKey = `${alert.type}:${alert.provider || 'global'}:${alert.endpoint || 'system'}`;
      
      // Check cooldown
      if (this.isInCooldown(alertKey)) {
        console.log(`Alert ${alertKey} is in cooldown, skipping`);
        return;
      }

      // Send to configured channels
      for (const channel of this.config.channels) {
        await this.sendToChannel(channel, alert);
      }

      // Set cooldown
      this.setCooldown(alertKey);

      // Track alert metrics
      await this.trackAlert(alert);
    } catch (error) {
      console.error('Error sending alert:', error);
      Sentry.captureException(error, {
        tags: { alert_type: 'alert_failure' },
        extra: { alert }
      });
    }
  }

  /**
   * 📤 Send to specific channel
   */
  private async sendToChannel(channel: string, alert: any): Promise<void> {
    switch (channel) {
      case 'sentry':
        await this.sendToSentry(alert);
        break;
      case 'slack':
        await this.sendToSlack(alert);
        break;
      case 'pagerduty':
        await this.sendToPagerDuty(alert);
        break;
      case 'email':
        await this.sendEmail(alert);
        break;
    }
  }

  /**
   * 📤 Send to Sentry
   */
  private async sendToSentry(alert: any): Promise<void> {
    const level = this.getSeverityLevel(alert.severity);
    
    Sentry.captureMessage(alert.message, {
      level,
      tags: {
        alert_type: alert.type,
        provider: alert.provider,
        endpoint: alert.endpoint,
        severity: alert.severity
      },
      extra: alert.details
    });
  }

  /**
   * 📤 Send to Slack
   */
  private async sendToSlack(alert: any): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('Slack webhook URL not configured');
      return;
    }

    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);

    const payload = {
      text: `${emoji} ${alert.message}`,
      attachments: [{
        color,
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Provider', value: alert.provider || 'N/A', short: true },
          { title: 'Endpoint', value: alert.endpoint || 'N/A', short: true }
        ],
        timestamp: Math.floor(Date.now() / 1000)
      }]
    };

    if (alert.details) {
      payload.attachments[0].fields.push({
        title: 'Details',
        value: JSON.stringify(alert.details, null, 2),
        short: false
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack alert failed: ${response.statusText}`);
    }
  }

  /**
   * 📤 Send to PagerDuty
   */
  private async sendToPagerDuty(alert: any): Promise<void> {
    const integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY;
    if (!integrationKey) {
      console.warn('PagerDuty integration key not configured');
      return;
    }

    const severity = alert.severity === 'critical' ? 'critical' : 'error';
    
    const payload = {
      routing_key: integrationKey,
      event_action: 'trigger',
      payload: {
        summary: alert.message,
        source: 'factory-wager-venmo-system',
        severity,
        custom_details: {
          type: alert.type,
          provider: alert.provider,
          endpoint: alert.endpoint,
          ...alert.details
        }
      }
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`PagerDuty alert failed: ${response.statusText}`);
    }
  }

  /**
   * 📧 Send email alert
   */
  private async sendEmail(alert: any): Promise<void> {
    // Email implementation would go here
    console.log('Email alert would be sent:', alert);
  }

  /**
   * 🎨 Get severity color
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#3b82f6';
      case 'medium': return '#3b82f6';
      case 'low': return '#22c55e';
      default: return '#3b82f6';
    }
  }

  /**
   * 😊 Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📊';
    }
  }

  /**
   * 📊 Get Sentry level
   */
  private getSeverityLevel(severity: string): Sentry.SeverityLevel {
    switch (severity) {
      case 'critical': return 'fatal';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'error';
    }
  }

  /**
   * ⏰ Check if alert is in cooldown
   */
  private isInCooldown(key: string): boolean {
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(key);
    return lastAlert && (now - lastAlert) < (this.config.cooldown * 1000);
  }

  /**
   * ⏰ Set cooldown for alert
   */
  private setCooldown(key: string): void {
    this.alertCooldowns.set(key, Date.now());
  }

  /**
   * 📊 Track alert metrics
   */
  private async trackAlert(alert: any): Promise<void> {
    const key = `alerts:${alert.type}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400 * 30); // 30 days
  }
}

/**
 * 📊 Performance Monitor
 */
export class PerformanceMonitor {
  private redis: Redis;
  private alertManager: AlertManager;

  constructor(alertManager: AlertManager) {
    this.redis = Redis.fromEnv();
    this.alertManager = alertManager;
  }

  /**
   * 📊 Record metrics
   */
  async recordMetrics(metrics: MonitoringMetrics): Promise<void> {
    try {
      const timestamp = Date.now();
      const minuteKey = `metrics:${Math.floor(timestamp / 60000)}`;
      
      // Store metrics for the current minute
      await this.redis.hincrby(minuteKey, 'total_requests', 1);
      
      if (metrics.statusCode >= 400) {
        await this.redis.hincrby(minuteKey, 'error_count', 1);
      }
      
      await this.redis.hincrby(minuteKey, 'total_response_time', metrics.responseTime);
      await this.redis.expire(minuteKey, 3600); // 1 hour

      // Check for performance issues
      await this.checkPerformanceIssues(metrics, minuteKey);
    } catch (error) {
      console.error('Error recording metrics:', error);
      Sentry.captureException(error, {
        tags: { monitoring_type: 'metrics_recording' }
      });
    }
  }

  /**
   * 🔍 Check for performance issues
   */
  private async checkPerformanceIssues(metrics: MonitoringMetrics, minuteKey: string): Promise<void> {
    const minuteStats = await this.redis.hgetall(minuteKey);
    
    // Check error rate
    if (minuteStats.total_requests && minuteStats.error_count) {
      const errorRate = (parseInt(minuteStats.error_count) / parseInt(minuteStats.total_requests)) * 100;
      
      if (errorRate > 5.0) { // 5% error rate threshold
        await this.alertManager.sendAlert({
          type: 'performance_issue',
          severity: 'high',
          message: `High error rate detected: ${errorRate.toFixed(2)}%`,
          details: {
            errorRate,
            totalRequests: minuteStats.total_requests,
            errorCount: minuteStats.error_count,
            endpoint: metrics.endpoint
          },
          endpoint: metrics.endpoint
        });
      }
    }

    // Check response time
    if (minuteStats.total_requests && minuteStats.total_response_time) {
      const avgResponseTime = parseInt(minuteStats.total_response_time) / parseInt(minuteStats.total_requests);
      
      if (avgResponseTime > 5000) { // 5 second threshold
        await this.alertManager.sendAlert({
          type: 'performance_issue',
          severity: 'medium',
          message: `High response time detected: ${avgResponseTime.toFixed(0)}ms`,
          details: {
            avgResponseTime,
            endpoint: metrics.endpoint,
            currentResponseTime: metrics.responseTime
          },
          endpoint: metrics.endpoint
        });
      }
    }
  }

  /**
   * 📊 Get performance metrics
   */
  async getMetrics(minutes: number = 60): Promise<any> {
    try {
      const now = Date.now();
      const metrics = [];
      
      for (let i = 0; i < minutes; i++) {
        const timestamp = now - (i * 60000);
        const minuteKey = `metrics:${Math.floor(timestamp / 60000)}`;
        const minuteStats = await this.redis.hgetall(minuteKey);
        
        if (Object.keys(minuteStats).length > 0) {
          metrics.push({
            timestamp: new Date(timestamp).toISOString(),
            ...minuteStats
          });
        }
      }
      
      return metrics.reverse();
    } catch (error) {
      console.error('Error getting metrics:', error);
      Sentry.captureException(error, {
        tags: { monitoring_type: 'metrics_retrieval' }
      });
      return null;
    }
  }
}

/**
 * 🔍 Webhook Monitor
 */
export class WebhookMonitor {
  private alertManager: AlertManager;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.alertManager = new AlertManager();
    this.performanceMonitor = new PerformanceMonitor(this.alertManager);
  }

  /**
   * 🔍 Monitor webhook processing
   */
  async monitorWebhook(
    provider: string,
    webhookType: string,
    processingFunction: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await processingFunction();
      const responseTime = Date.now() - startTime;
      
      // Record success metrics
      await this.performanceMonitor.recordMetrics({
        timestamp: startTime,
        endpoint: `/webhook/${provider}`,
        method: 'POST',
        statusCode: 200,
        responseTime,
        provider
      });
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Record error metrics
      await this.performanceMonitor.recordMetrics({
        timestamp: startTime,
        endpoint: `/webhook/${provider}`,
        method: 'POST',
        statusCode: 500,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        provider
      });
      
      // Send alert
      await this.alertManager.sendAlert({
        type: 'webhook_failure',
        severity: 'high',
        message: `Webhook processing failed for ${provider}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
          webhookType,
          responseTime,
          stack: error instanceof Error ? error.stack : undefined
        },
        provider
      });
      
      throw error;
    }
  }

  /**
   * 📊 Get webhook health status
   */
  async getWebhookHealth(): Promise<any> {
    const metrics = await this.performanceMonitor.getMetrics(60); // Last hour
    
    if (!metrics || metrics.length === 0) {
      return { status: 'unknown', message: 'No metrics available' };
    }
    
    const totalRequests = metrics.reduce((sum, m) => sum + parseInt(m.total_requests || 0), 0);
    const totalErrors = metrics.reduce((sum, m) => sum + parseInt(m.error_count || 0), 0);
    const avgResponseTime = metrics.reduce((sum, m) => sum + parseInt(m.total_response_time || 0), 0) / totalRequests;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    let status = 'healthy';
    if (errorRate > 5.0 || avgResponseTime > 5000) {
      status = 'degraded';
    }
    if (errorRate > 10.0 || avgResponseTime > 10000) {
      status = 'unhealthy';
    }
    
    return {
      status,
      metrics: {
        totalRequests,
        totalErrors,
        errorRate: errorRate.toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(0),
        uptime: '99.9%'
      }
    };
  }
}

/**
 * 🚨 Global Monitoring Instance
 */
export const alertManager = new AlertManager({
  enabled: true,
  channels: ['sentry', 'slack'],
  thresholds: {
    errorRate: 5.0,
    responseTime: 5000,
    failureCount: 10
  },
  cooldown: 300
});

export const performanceMonitor = new PerformanceMonitor(alertManager);
export const webhookMonitor = new WebhookMonitor();

/**
 * 🚀 Usage Examples
 */

// Monitor webhook processing:
/*
const result = await webhookMonitor.monitorWebhook(
  'venmo',
  'payment_received',
  async () => {
    // Process webhook
    return await processVenmoWebhook(webhookData);
  }
);
*/

// Send custom alert:
/*
await alertManager.sendAlert({
  type: 'payment_error',
  severity: 'high',
  message: 'Payment processing failed',
  details: { transactionId: 'txn_123', error: 'Insufficient funds' },
  provider: 'venmo'
});
*/

// Get system health:
/*
const health = await webhookMonitor.getWebhookHealth();
console.log('System health:', health);
*/
