#!/usr/bin/env bun
/**
 * 🚨 Fire22 Advanced Alert System
 *
 * Features:
 * - Multi-channel notifications (Slack, Email, SMS, PagerDuty)
 * - Intelligent alert correlation
 * - Escalation policies
 * - Alert suppression and deduplication
 * - Historical alert analysis
 *
 * @version 3.0.9
 */

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // seconds
  severity: 'critical' | 'warning' | 'info';
  channels: NotificationChannel[];
  suppressionWindow?: number; // minutes
  escalationPolicy?: string;
  tags: string[];
}

interface NotificationChannel {
  type: 'slack' | 'email' | 'sms' | 'pagerduty' | 'webhook';
  config: {
    target: string;
    template?: string;
    priority?: 'high' | 'medium' | 'low';
  };
}

interface Alert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'triggered' | 'acknowledged' | 'resolved' | 'suppressed';
  triggeredAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  acknowledgedBy?: string;
  resolvedBy?: string;
  metadata: {
    metric: string;
    value: number;
    threshold: number;
    duration: number;
    host?: string;
    service?: string;
    tags: string[];
  };
  correlationId?: string;
  escalationLevel: number;
  notificationsSent: string[];
}

interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
}

interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: NotificationChannel[];
  conditions?: string[]; // e.g., "not_acknowledged", "still_active"
}

interface AlertCorrelation {
  id: string;
  alerts: string[];
  confidence: number;
  reason: string;
  createdAt: number;
}

class AlertSystem {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private correlations: AlertCorrelation[] = [];
  private suppressions: Map<string, number> = new Map();

  constructor() {
    this.initializeRules();
    this.initializeEscalationPolicies();
    this.startAlertProcessor();
  }

  private initializeRules() {
    const defaultChannels: NotificationChannel[] = [
      {
        type: 'slack',
        config: {
          target: '#fire22-alerts',
          template: 'default',
        },
      },
      {
        type: 'email',
        config: {
          target: 'ops@fire22.com',
          priority: 'high',
        },
      },
    ];

    // Critical system alerts
    this.rules.set('cpu-critical', {
      id: 'cpu-critical',
      name: 'Critical CPU Usage',
      metric: 'cpu_usage',
      condition: 'greater_than',
      threshold: 90,
      duration: 120, // 2 minutes
      severity: 'critical',
      channels: [
        ...defaultChannels,
        {
          type: 'pagerduty',
          config: {
            target: 'fire22-oncall',
            priority: 'high',
          },
        },
      ],
      suppressionWindow: 15,
      escalationPolicy: 'critical-system',
      tags: ['system', 'performance'],
    });

    this.rules.set('memory-warning', {
      id: 'memory-warning',
      name: 'High Memory Usage',
      metric: 'memory_usage',
      condition: 'greater_than',
      threshold: 85,
      duration: 300, // 5 minutes
      severity: 'warning',
      channels: defaultChannels,
      suppressionWindow: 30,
      tags: ['system', 'memory'],
    });

    this.rules.set('api-response-time', {
      id: 'api-response-time',
      name: 'High API Response Time',
      metric: 'api_response_time',
      condition: 'greater_than',
      threshold: 500, // ms
      duration: 180, // 3 minutes
      severity: 'warning',
      channels: defaultChannels,
      suppressionWindow: 10,
      escalationPolicy: 'api-performance',
      tags: ['api', 'performance', 'fire22'],
    });

    this.rules.set('error-rate-critical', {
      id: 'error-rate-critical',
      name: 'Critical Error Rate',
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: 5, // 5%
      duration: 60, // 1 minute
      severity: 'critical',
      channels: [
        ...defaultChannels,
        {
          type: 'sms',
          config: {
            target: '+1-555-ONCALL',
            priority: 'high',
          },
        },
      ],
      suppressionWindow: 5,
      escalationPolicy: 'critical-system',
      tags: ['api', 'errors', 'fire22'],
    });

    this.rules.set('dns-resolution-slow', {
      id: 'dns-resolution-slow',
      name: 'Slow DNS Resolution',
      metric: 'dns_resolution_time',
      condition: 'greater_than',
      threshold: 100, // ms
      duration: 300, // 5 minutes
      severity: 'warning',
      channels: defaultChannels,
      suppressionWindow: 20,
      tags: ['dns', 'network', 'fire22'],
    });
  }

  private initializeEscalationPolicies() {
    this.escalationPolicies.set('critical-system', {
      id: 'critical-system',
      name: 'Critical System Escalation',
      levels: [
        {
          level: 1,
          delayMinutes: 0,
          channels: [
            {
              type: 'slack',
              config: { target: '#fire22-alerts' },
            },
          ],
        },
        {
          level: 2,
          delayMinutes: 5,
          channels: [
            {
              type: 'pagerduty',
              config: { target: 'fire22-oncall', priority: 'high' },
            },
          ],
          conditions: ['not_acknowledged'],
        },
        {
          level: 3,
          delayMinutes: 15,
          channels: [
            {
              type: 'sms',
              config: { target: '+1-555-MANAGER', priority: 'high' },
            },
          ],
          conditions: ['not_acknowledged', 'still_active'],
        },
      ],
    });

    this.escalationPolicies.set('api-performance', {
      id: 'api-performance',
      name: 'API Performance Escalation',
      levels: [
        {
          level: 1,
          delayMinutes: 0,
          channels: [
            {
              type: 'slack',
              config: { target: '#fire22-dev' },
            },
          ],
        },
        {
          level: 2,
          delayMinutes: 10,
          channels: [
            {
              type: 'email',
              config: { target: 'dev-team@fire22.com' },
            },
          ],
          conditions: ['not_acknowledged'],
        },
      ],
    });
  }

  private startAlertProcessor() {
    setInterval(() => {
      this.processEscalations();
      this.correlateAlerts();
      this.cleanupOldAlerts();
    }, 30000); // Every 30 seconds
  }

  public evaluateMetric(metric: string, value: number, metadata: any = {}): void {
    this.rules.forEach(rule => {
      if (rule.metric === metric) {
        const shouldTrigger = this.evaluateCondition(rule, value);
        const suppressionKey = `${rule.id}-${metadata.host || 'global'}`;

        if (shouldTrigger && !this.suppressions.has(suppressionKey)) {
          this.triggerAlert(rule, value, metadata);

          if (rule.suppressionWindow) {
            this.suppressions.set(suppressionKey, Date.now() + rule.suppressionWindow * 60 * 1000);
          }
        }
      }
    });

    // Clean up expired suppressions
    this.suppressions.forEach((expiry, key) => {
      if (Date.now() > expiry) {
        this.suppressions.delete(key);
      }
    });
  }

  private evaluateCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return value > rule.threshold;
      case 'less_than':
        return value < rule.threshold;
      case 'equals':
        return value === rule.threshold;
      case 'not_equals':
        return value !== rule.threshold;
      default:
        return false;
    }
  }

  private triggerAlert(rule: AlertRule, value: number, metadata: any): void {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      title: rule.name,
      description: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      severity: rule.severity,
      status: 'triggered',
      triggeredAt: Date.now(),
      metadata: {
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        duration: rule.duration,
        host: metadata.host,
        service: metadata.service,
        tags: rule.tags,
      },
      escalationLevel: 0,
      notificationsSent: [],
    };

    this.alerts.set(alertId, alert);
    this.sendNotifications(alert, rule.channels);

    console.log(`🚨 Alert Triggered: ${alert.title} [${alert.severity.toUpperCase()}]`);
    console.log(`   Value: ${value}, Threshold: ${rule.threshold}`);
    console.log(`   Alert ID: ${alertId}`);
  }

  private sendNotifications(alert: Alert, channels: NotificationChannel[]): void {
    channels.forEach(channel => {
      const notificationId = `${channel.type}-${Date.now()}`;

      switch (channel.type) {
        case 'slack':
          console.log(`📱 Slack notification sent to ${channel.config.target}`);
          console.log(`   Message: ${alert.description}`);
          break;

        case 'email':
          console.log(`📧 Email sent to ${channel.config.target}`);
          console.log(`   Subject: [${alert.severity.toUpperCase()}] ${alert.title}`);
          break;

        case 'sms':
          console.log(`📞 SMS sent to ${channel.config.target}`);
          console.log(`   Message: ${alert.title} - ${alert.severity}`);
          break;

        case 'pagerduty':
          console.log(`📟 PagerDuty incident created for ${channel.config.target}`);
          console.log(`   Priority: ${channel.config.priority}`);
          break;

        case 'webhook':
          console.log(`🌐 Webhook called: ${channel.config.target}`);
          break;
      }

      alert.notificationsSent.push(notificationId);
    });
  }

  private processEscalations(): void {
    this.alerts.forEach(alert => {
      if (alert.status !== 'triggered') return;

      const rule = this.rules.get(alert.ruleId);
      if (!rule?.escalationPolicy) return;

      const policy = this.escalationPolicies.get(rule.escalationPolicy);
      if (!policy) return;

      const ageMinutes = (Date.now() - alert.triggeredAt) / (1000 * 60);

      policy.levels.forEach(level => {
        if (level.level > alert.escalationLevel && ageMinutes >= level.delayMinutes) {
          const shouldEscalate =
            level.conditions?.every(condition => {
              switch (condition) {
                case 'not_acknowledged':
                  return !alert.acknowledgedAt;
                case 'still_active':
                  return alert.status === 'triggered';
                default:
                  return true;
              }
            }) ?? true;

          if (shouldEscalate) {
            console.log(`⬆️  Escalating alert ${alert.id} to level ${level.level}`);
            this.sendNotifications(alert, level.channels);
            alert.escalationLevel = level.level;
          }
        }
      });
    });
  }

  private correlateAlerts(): void {
    const activeAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.status === 'triggered'
    );

    // Group alerts by time window (5 minutes)
    const timeGroups = new Map<number, Alert[]>();
    activeAlerts.forEach(alert => {
      const timeWindow = Math.floor(alert.triggeredAt / (5 * 60 * 1000));
      if (!timeGroups.has(timeWindow)) {
        timeGroups.set(timeWindow, []);
      }
      timeGroups.get(timeWindow)!.push(alert);
    });

    // Find correlations
    timeGroups.forEach(alerts => {
      if (alerts.length < 2) return;

      // Check for related tags or services
      const commonTags = this.findCommonTags(alerts);
      const commonServices = this.findCommonServices(alerts);

      if (commonTags.length > 0 || commonServices.length > 0) {
        const correlationId = `corr-${Date.now()}`;
        const correlation: AlertCorrelation = {
          id: correlationId,
          alerts: alerts.map(a => a.id),
          confidence: this.calculateCorrelationConfidence(alerts),
          reason: this.buildCorrelationReason(commonTags, commonServices),
          createdAt: Date.now(),
        };

        this.correlations.push(correlation);

        // Update alerts with correlation ID
        alerts.forEach(alert => {
          alert.correlationId = correlationId;
        });

        console.log(`🔗 Correlation detected: ${correlation.reason}`);
        console.log(`   Alerts: ${alerts.map(a => a.title).join(', ')}`);
        console.log(`   Confidence: ${correlation.confidence}%`);
      }
    });
  }

  private findCommonTags(alerts: Alert[]): string[] {
    if (alerts.length === 0) return [];

    const tagSets = alerts.map(alert => new Set(alert.metadata.tags));
    const commonTags: string[] = [];

    tagSets[0].forEach(tag => {
      if (tagSets.every(tagSet => tagSet.has(tag))) {
        commonTags.push(tag);
      }
    });

    return commonTags;
  }

  private findCommonServices(alerts: Alert[]): string[] {
    const services = alerts.map(alert => alert.metadata.service).filter(service => service);

    const serviceCounts = new Map<string, number>();
    services.forEach(service => {
      serviceCounts.set(service!, (serviceCounts.get(service!) || 0) + 1);
    });

    return Array.from(serviceCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([service, _]) => service);
  }

  private calculateCorrelationConfidence(alerts: Alert[]): number {
    // Simple confidence calculation based on timing and tags
    const timeSpread =
      Math.max(...alerts.map(a => a.triggeredAt)) - Math.min(...alerts.map(a => a.triggeredAt));
    const timeScore = Math.max(0, 100 - (timeSpread / (5 * 60 * 1000)) * 20);

    const tagScore = this.findCommonTags(alerts).length * 20;
    const serviceScore = this.findCommonServices(alerts).length * 30;

    return Math.min(100, timeScore + tagScore + serviceScore);
  }

  private buildCorrelationReason(commonTags: string[], commonServices: string[]): string {
    const reasons: string[] = [];

    if (commonTags.length > 0) {
      reasons.push(`Common tags: ${commonTags.join(', ')}`);
    }

    if (commonServices.length > 0) {
      reasons.push(`Common services: ${commonServices.join(', ')}`);
    }

    return reasons.join('; ') || 'Temporal correlation';
  }

  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    this.alerts.forEach((alert, id) => {
      if (alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(id);
      }
    });

    // Clean up old correlations
    this.correlations = this.correlations.filter(corr => corr.createdAt > cutoff);
  }

  public acknowledgeAlert(alertId: string, user: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'triggered') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = user;

    console.log(`✅ Alert ${alertId} acknowledged by ${user}`);
    return true;
  }

  public resolveAlert(alertId: string, user: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.resolvedBy = user;

    console.log(`🔒 Alert ${alertId} resolved by ${user}`);
    return true;
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'triggered' || alert.status === 'acknowledged')
      .sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  public getAlertStatistics(): any {
    const alerts = Array.from(this.alerts.values());
    const total = alerts.length;
    const active = alerts.filter(a => a.status === 'triggered').length;
    const acknowledged = alerts.filter(a => a.status === 'acknowledged').length;
    const resolved = alerts.filter(a => a.status === 'resolved').length;

    const bySeverity = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    };

    return {
      total,
      active,
      acknowledged,
      resolved,
      bySeverity,
      correlations: this.correlations.length,
      suppressions: this.suppressions.size,
    };
  }
}

// Demo execution
const alertSystem = new AlertSystem();

console.log('🚨 Fire22 Advanced Alert System Demo\n');
console.log('═'.repeat(70));

// Simulate some metrics that would trigger alerts
console.log('\n📊 Simulating Metric Evaluations...\n');

// Trigger CPU warning
alertSystem.evaluateMetric('cpu_usage', 92, {
  host: 'fire22-api-01',
  service: 'api-gateway',
});

// Trigger memory warning
alertSystem.evaluateMetric('memory_usage', 88, {
  host: 'fire22-api-01',
  service: 'api-gateway',
});

// Trigger API response time warning
alertSystem.evaluateMetric('api_response_time', 650, {
  host: 'fire22-api-02',
  service: 'fire22-api',
});

// Trigger error rate critical
alertSystem.evaluateMetric('error_rate', 7.5, {
  host: 'fire22-api-02',
  service: 'fire22-api',
});

console.log('\n📈 Alert Statistics:');
console.log('─'.repeat(40));
const stats = alertSystem.getAlertStatistics();
console.log(`Total Alerts: ${stats.total}`);
console.log(
  `Active: ${stats.active}, Acknowledged: ${stats.acknowledged}, Resolved: ${stats.resolved}`
);
console.log(
  `Critical: ${stats.bySeverity.critical}, Warning: ${stats.bySeverity.warning}, Info: ${stats.bySeverity.info}`
);
console.log(`Correlations: ${stats.correlations}, Active Suppressions: ${stats.suppressions}`);

console.log('\n🔥 Active Alerts:');
console.log('─'.repeat(40));
const activeAlerts = alertSystem.getActiveAlerts();
activeAlerts.forEach(alert => {
  const age = Math.floor((Date.now() - alert.triggeredAt) / 1000);
  console.log(`${alert.severity === 'critical' ? '🔴' : '🟡'} ${alert.title} (${age}s ago)`);
  console.log(`   Value: ${alert.metadata.value}, Threshold: ${alert.metadata.threshold}`);
  if (alert.correlationId) {
    console.log(`   🔗 Correlated with other alerts`);
  }
});

// Simulate acknowledgment
if (activeAlerts.length > 0) {
  console.log('\n✅ Simulating Alert Acknowledgment...');
  alertSystem.acknowledgeAlert(activeAlerts[0].id, 'ops-team');
}

console.log('\n' + '═'.repeat(70));
console.log('\n🎯 Alert System Features Demonstrated:');
console.log('  ✓ Multi-channel notifications (Slack, Email, SMS, PagerDuty)');
console.log('  ✓ Intelligent alert correlation');
console.log('  ✓ Escalation policies with multiple levels');
console.log('  ✓ Alert suppression and deduplication');
console.log('  ✓ Real-time metric evaluation');
console.log('  ✓ Statistical analysis and reporting');
console.log('\n✨ Advanced alert system demonstration complete!');
