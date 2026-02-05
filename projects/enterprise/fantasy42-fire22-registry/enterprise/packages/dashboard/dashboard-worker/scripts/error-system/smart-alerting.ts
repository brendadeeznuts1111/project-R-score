#!/usr/bin/env bun
/**
 * 🚨 Smart Alerting System for Fire22 Error Management
 * Intelligent threshold-based monitoring with contextual alerts
 * Automated escalation and notification routing
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { color } from 'bun' with { type: 'macro' };

interface ErrorOccurrence {
  errorCode: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  category: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    userId?: string;
    requestId?: string;
  };
}

interface AlertRule {
  id: string;
  name: string;
  errorCode: string;
  category?: string;
  severity?: string;
  threshold: number;
  timeWindow: string; // e.g., "5m", "1h", "24h"
  enabled: boolean;
  actions: AlertAction[];
  conditions?: AlertCondition[];
  escalation?: EscalationRule[];
  cooldown?: string; // Minimum time between alerts
  lastTriggered?: Date;
}

interface AlertAction {
  type: 'slack' | 'email' | 'webhook' | 'page' | 'ticket' | 'sms';
  target: string;
  template?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

interface AlertCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: string | number;
}

interface EscalationRule {
  afterMinutes: number;
  actions: AlertAction[];
}

interface AlertEvent {
  id: string;
  ruleId: string;
  errorCode: string;
  triggeredAt: Date;
  occurrenceCount: number;
  timeWindow: string;
  severity: string;
  category: string;
  actions: AlertAction[];
  escalated: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  context: {
    recentOccurrences: ErrorOccurrence[];
    errorDetails: any;
    documentationLinks: string[];
    suggestedSolutions: string[];
  };
}

class SmartAlertingSystem {
  private occurrences: Map<string, ErrorOccurrence[]> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private errorRegistry: any;
  private configPath: string;
  private dataPath: string;

  constructor() {
    this.configPath = join(process.cwd(), 'config', 'alert-rules.json');
    this.dataPath = join(process.cwd(), 'data', 'error-occurrences.json');
    this.loadErrorRegistry();
    this.loadAlertRules();
    this.loadOccurrenceData();
  }

  /**
   * Load error registry for context
   */
  private loadErrorRegistry(): void {
    const registryPath = join(process.cwd(), 'docs', 'error-codes.json');

    if (existsSync(registryPath)) {
      const content = readFileSync(registryPath, 'utf-8');
      this.errorRegistry = JSON.parse(content);
    }
  }

  /**
   * Load alert rules configuration
   */
  private loadAlertRules(): void {
    if (existsSync(this.configPath)) {
      try {
        const content = readFileSync(this.configPath, 'utf-8');
        const rules = JSON.parse(content) as AlertRule[];

        rules.forEach(rule => {
          this.alertRules.set(rule.id, rule);
        });

        console.log(`✅ Loaded ${rules.length} alert rules`);
      } catch (error) {
        console.warn(`⚠️ Failed to load alert rules: ${error.message}`);
        this.createDefaultAlertRules();
      }
    } else {
      this.createDefaultAlertRules();
    }
  }

  /**
   * Load historical occurrence data
   */
  private loadOccurrenceData(): void {
    if (existsSync(this.dataPath)) {
      try {
        const content = readFileSync(this.dataPath, 'utf-8');
        const data = JSON.parse(content);

        for (const [errorCode, occurrences] of Object.entries(data)) {
          this.occurrences.set(
            errorCode,
            (occurrences as any[]).map(o => ({
              ...o,
              timestamp: new Date(o.timestamp),
              resolvedAt: o.resolvedAt ? new Date(o.resolvedAt) : undefined,
            }))
          );
        }

        console.log(
          `✅ Loaded historical occurrence data for ${this.occurrences.size} error codes`
        );
      } catch (error) {
        console.warn(`⚠️ Failed to load occurrence data: ${error.message}`);
      }
    }
  }

  /**
   * Create default alert rules
   */
  private createDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'critical-database-errors',
        name: 'Critical Database Connection Failures',
        errorCode: 'E2001',
        category: 'DATABASE',
        severity: 'CRITICAL',
        threshold: 3,
        timeWindow: '5m',
        enabled: true,
        actions: [
          {
            type: 'page',
            target: 'oncall-database',
            priority: 'critical',
          },
          {
            type: 'slack',
            target: '#alerts-critical',
            priority: 'critical',
            template: 'database-critical',
          },
        ],
        escalation: [
          {
            afterMinutes: 10,
            actions: [
              {
                type: 'page',
                target: 'engineering-manager',
                priority: 'critical',
              },
            ],
          },
        ],
        cooldown: '10m',
      },
      {
        id: 'system-initialization-failures',
        name: 'System Initialization Failures',
        errorCode: 'E1001',
        category: 'SYSTEM',
        severity: 'CRITICAL',
        threshold: 1,
        timeWindow: '1m',
        enabled: true,
        actions: [
          {
            type: 'page',
            target: 'oncall-platform',
            priority: 'critical',
          },
          {
            type: 'ticket',
            target: 'platform-team',
            priority: 'critical',
            template: 'system-failure',
          },
        ],
        cooldown: '5m',
      },
      {
        id: 'api-rate-limit-surge',
        name: 'API Rate Limit Surge Detection',
        errorCode: 'E3002',
        category: 'API',
        threshold: 50,
        timeWindow: '1m',
        enabled: true,
        actions: [
          {
            type: 'slack',
            target: '#alerts-api',
            priority: 'medium',
          },
          {
            type: 'webhook',
            target: 'https://fire22.com/api/webhooks/rate-limit-alert',
            priority: 'medium',
          },
        ],
        cooldown: '15m',
      },
      {
        id: 'fire22-integration-failures',
        name: 'Fire22 Integration Failures',
        errorCode: 'E7001',
        category: 'FIRE22',
        severity: 'CRITICAL',
        threshold: 5,
        timeWindow: '10m',
        enabled: true,
        actions: [
          {
            type: 'slack',
            target: '#fire22-integration',
            priority: 'high',
          },
          {
            type: 'email',
            target: 'fire22-team@company.com',
            priority: 'high',
            template: 'fire22-integration-failure',
          },
        ],
        escalation: [
          {
            afterMinutes: 30,
            actions: [
              {
                type: 'page',
                target: 'fire22-oncall',
                priority: 'critical',
              },
            ],
          },
        ],
      },
      {
        id: 'security-multiple-failed-logins',
        name: 'Security: Multiple Failed Login Attempts',
        errorCode: 'E6001',
        category: 'SECURITY',
        threshold: 10,
        timeWindow: '5m',
        enabled: true,
        actions: [
          {
            type: 'slack',
            target: '#security-alerts',
            priority: 'high',
          },
          {
            type: 'email',
            target: 'security-team@company.com',
            priority: 'high',
            template: 'security-breach-alert',
          },
        ],
        conditions: [
          {
            field: 'metadata.ipAddress',
            operator: 'regex',
            value: '^(?!10\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.|192\\.168\\.)',
          },
        ],
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    this.saveAlertRules();
    console.log(`✅ Created ${defaultRules.length} default alert rules`);
  }

  /**
   * Save alert rules to file
   */
  private saveAlertRules(): void {
    try {
      const rules = Array.from(this.alertRules.values());
      writeFileSync(this.configPath, JSON.stringify(rules, null, 2), 'utf-8');
    } catch (error) {
      console.error(`❌ Failed to save alert rules: ${error.message}`);
    }
  }

  /**
   * Save occurrence data
   */
  private saveOccurrenceData(): void {
    try {
      const data: Record<string, ErrorOccurrence[]> = {};
      this.occurrences.forEach((occurrences, errorCode) => {
        data[errorCode] = occurrences;
      });

      writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`❌ Failed to save occurrence data: ${error.message}`);
    }
  }

  /**
   * Record an error occurrence
   */
  recordError(
    errorCode: string,
    context?: Record<string, unknown>,
    metadata?: ErrorOccurrence['metadata']
  ): void {
    const errorDetails = this.errorRegistry?.errorCodes?.[errorCode];

    const occurrence: ErrorOccurrence = {
      errorCode,
      timestamp: new Date(),
      context,
      severity: errorDetails?.severity || 'ERROR',
      category: errorDetails?.category || 'UNKNOWN',
      resolved: false,
      metadata,
    };

    if (!this.occurrences.has(errorCode)) {
      this.occurrences.set(errorCode, []);
    }

    this.occurrences.get(errorCode)!.push(occurrence);

    // Keep only recent occurrences (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOccurrences = this.occurrences
      .get(errorCode)!
      .filter(o => o.timestamp > twentyFourHoursAgo);
    this.occurrences.set(errorCode, recentOccurrences);

    // Check alert rules
    this.checkAlertRules(errorCode, occurrence);

    // Periodically save data (in production, use a more sophisticated approach)
    if (Math.random() < 0.1) {
      // 10% chance to save
      this.saveOccurrenceData();
    }
  }

  /**
   * Check if any alert rules are triggered
   */
  private checkAlertRules(errorCode: string, occurrence: ErrorOccurrence): void {
    const applicableRules = Array.from(this.alertRules.values()).filter(rule => {
      if (!rule.enabled) return false;
      if (rule.errorCode !== errorCode && rule.errorCode !== '*') return false;
      if (rule.category && rule.category !== occurrence.category) return false;
      if (rule.severity && rule.severity !== occurrence.severity) return false;

      // Check conditions
      if (rule.conditions) {
        return rule.conditions.every(condition => this.evaluateCondition(condition, occurrence));
      }

      return true;
    });

    for (const rule of applicableRules) {
      this.evaluateRule(rule, occurrence);
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: AlertCondition, occurrence: ErrorOccurrence): boolean {
    const getValue = (field: string): any => {
      const parts = field.split('.');
      let value: any = occurrence;

      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) break;
      }

      return value;
    };

    const fieldValue = getValue(condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        return new RegExp(String(condition.value)).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Evaluate an alert rule
   */
  private evaluateRule(rule: AlertRule, occurrence: ErrorOccurrence): void {
    const timeWindowMs = this.parseTimeWindow(rule.timeWindow);
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    const recentOccurrences = this.occurrences
      .get(occurrence.errorCode)!
      .filter(o => o.timestamp > cutoffTime && !o.resolved);

    if (recentOccurrences.length >= rule.threshold) {
      // Check cooldown
      if (rule.lastTriggered && rule.cooldown) {
        const cooldownMs = this.parseTimeWindow(rule.cooldown);
        const cooldownEnds = new Date(rule.lastTriggered.getTime() + cooldownMs);

        if (new Date() < cooldownEnds) {
          return; // Still in cooldown
        }
      }

      this.triggerAlert(rule, occurrence, recentOccurrences);
    }
  }

  /**
   * Parse time window string to milliseconds
   */
  private parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([smhd])$/);
    if (!match) return 300000; // Default 5 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };

    return value * multipliers[unit];
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    rule: AlertRule,
    occurrence: ErrorOccurrence,
    recentOccurrences: ErrorOccurrence[]
  ): void {
    const alertId = `${rule.id}-${Date.now()}`;
    const errorDetails = this.errorRegistry?.errorCodes?.[occurrence.errorCode];

    const alert: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      errorCode: occurrence.errorCode,
      triggeredAt: new Date(),
      occurrenceCount: recentOccurrences.length,
      timeWindow: rule.timeWindow,
      severity: occurrence.severity,
      category: occurrence.category,
      actions: rule.actions,
      escalated: false,
      resolved: false,
      context: {
        recentOccurrences: recentOccurrences.slice(-10), // Last 10 occurrences
        errorDetails,
        documentationLinks: errorDetails?.documentation?.map(d => d.url) || [],
        suggestedSolutions: errorDetails?.solutions || [],
      },
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    console.log(color('#ef4444', 'css') + `🚨 ALERT TRIGGERED: ${rule.name}`);
    console.log(`   Error Code: ${occurrence.errorCode}`);
    console.log(`   Occurrences: ${recentOccurrences.length} in ${rule.timeWindow}`);
    console.log(`   Severity: ${occurrence.severity}`);

    // Execute alert actions
    this.executeAlertActions(alert, rule.actions);

    // Schedule escalation if configured
    if (rule.escalation) {
      this.scheduleEscalation(alert, rule.escalation);
    }
  }

  /**
   * Execute alert actions
   */
  private executeAlertActions(alert: AlertEvent, actions: AlertAction[]): void {
    actions.forEach(action => {
      try {
        this.executeAction(alert, action);
      } catch (error) {
        console.error(`❌ Failed to execute action ${action.type}:`, error.message);
      }
    });
  }

  /**
   * Execute a single action
   */
  private executeAction(alert: AlertEvent, action: AlertAction): void {
    const message = this.buildAlertMessage(alert, action.template);

    switch (action.type) {
      case 'slack':
        this.sendSlackAlert(action.target, message, action.priority);
        break;
      case 'email':
        this.sendEmailAlert(action.target, message, action.priority);
        break;
      case 'webhook':
        this.sendWebhookAlert(action.target, alert, action.priority);
        break;
      case 'page':
        this.sendPageAlert(action.target, message, action.priority);
        break;
      case 'ticket':
        this.createTicket(action.target, alert, action.priority);
        break;
      case 'sms':
        this.sendSmsAlert(action.target, message, action.priority);
        break;
      default:
        console.warn(`⚠️ Unknown action type: ${action.type}`);
    }
  }

  /**
   * Build alert message
   */
  private buildAlertMessage(alert: AlertEvent, template?: string): string {
    const errorDetails = alert.context.errorDetails;

    return `🚨 FIRE22 ALERT: ${alert.errorCode}
    
**Error**: ${errorDetails?.name || alert.errorCode}
**Message**: ${errorDetails?.message || 'Unknown error'}
**Severity**: ${alert.severity}
**Category**: ${alert.category}
**Occurrences**: ${alert.occurrenceCount} in ${alert.timeWindow}
**Triggered**: ${alert.triggeredAt.toLocaleString()}

**Solutions**:
${alert.context.suggestedSolutions.map(s => `• ${s}`).join('\n')}

**Documentation**: ${alert.context.documentationLinks[0] || 'N/A'}

**Recent Context**:
${alert.context.recentOccurrences
  .slice(-3)
  .map(o => `• ${o.timestamp.toLocaleTimeString()} - ${JSON.stringify(o.context || {})}`)
  .join('\n')}
`;
  }

  /**
   * Send Slack alert (mock implementation)
   */
  private sendSlackAlert(channel: string, message: string, priority: string): void {
    console.log(color('#0088cc', 'css') + `📱 SLACK ALERT to ${channel} (${priority}):`);
    console.log('   ' + message.split('\n')[0]);

    // In production: integrate with Slack API
    // await fetch('https://hooks.slack.com/...', {
    //   method: 'POST',
    //   body: JSON.stringify({ text: message })
    // });
  }

  /**
   * Send email alert (mock implementation)
   */
  private sendEmailAlert(recipient: string, message: string, priority: string): void {
    console.log(color('#f59e0b', 'css') + `📧 EMAIL ALERT to ${recipient} (${priority}):`);
    console.log('   ' + message.split('\n')[0]);

    // In production: integrate with email service
  }

  /**
   * Send webhook alert (mock implementation)
   */
  private sendWebhookAlert(url: string, alert: AlertEvent, priority: string): void {
    console.log(color('#8b5cf6', 'css') + `🔗 WEBHOOK ALERT to ${url} (${priority})`);

    // In production: send HTTP POST to webhook
    // await fetch(url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(alert)
    // });
  }

  /**
   * Send page alert (mock implementation)
   */
  private sendPageAlert(target: string, message: string, priority: string): void {
    console.log(color('#ef4444', 'css') + `📟 PAGE ALERT to ${target} (${priority}):`);
    console.log('   ' + message.split('\n')[0]);

    // In production: integrate with PagerDuty, etc.
  }

  /**
   * Create ticket (mock implementation)
   */
  private createTicket(team: string, alert: AlertEvent, priority: string): void {
    console.log(color('#10b981', 'css') + `🎫 TICKET CREATED for ${team} (${priority})`);
    console.log(`   Title: ${alert.errorCode} - ${alert.context.errorDetails?.name}`);

    // In production: integrate with Jira, GitHub Issues, etc.
  }

  /**
   * Send SMS alert (mock implementation)
   */
  private sendSmsAlert(phoneNumber: string, message: string, priority: string): void {
    console.log(color('#06b6d4', 'css') + `📱 SMS ALERT to ${phoneNumber} (${priority})`);
    console.log('   ' + message.split('\n')[0].substring(0, 160));

    // In production: integrate with Twilio, etc.
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(alert: AlertEvent, escalationRules: EscalationRule[]): void {
    escalationRules.forEach(rule => {
      setTimeout(
        () => {
          if (!alert.resolved) {
            console.log(
              color('#dc2626', 'css') +
                `🔥 ESCALATING ALERT: ${alert.id} after ${rule.afterMinutes} minutes`
            );
            alert.escalated = true;
            this.executeAlertActions(alert, rule.actions);
          }
        },
        rule.afterMinutes * 60 * 1000
      );
    });
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      console.log(color('#10b981', 'css') + `✅ ALERT RESOLVED: ${alertId}`);

      // Mark related occurrences as resolved
      const occurrences = this.occurrences.get(alert.errorCode) || [];
      occurrences.forEach(o => {
        if (!o.resolved && o.timestamp >= alert.triggeredAt) {
          o.resolved = true;
          o.resolvedAt = new Date();
          o.resolvedBy = resolvedBy;
        }
      });
    }
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    totalOccurrences: number;
    activeAlerts: number;
    alertsByCategory: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    topErrorCodes: Array<{ code: string; count: number }>;
  } {
    const totalOccurrences = Array.from(this.occurrences.values()).reduce(
      (sum, occurrences) => sum + occurrences.length,
      0
    );

    const activeAlerts = Array.from(this.activeAlerts.values()).filter(a => !a.resolved).length;

    const alertsByCategory: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    Array.from(this.activeAlerts.values()).forEach(alert => {
      alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    const errorCodeCounts = new Map<string, number>();
    this.occurrences.forEach((occurrences, errorCode) => {
      errorCodeCounts.set(errorCode, occurrences.length);
    });

    const topErrorCodes = Array.from(errorCodeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return {
      totalOccurrences,
      activeAlerts,
      alertsByCategory,
      alertsBySeverity,
      topErrorCodes,
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard(): void {
    const stats = this.getStatistics();

    console.log('\n🚨 SMART ALERTING DASHBOARD');
    console.log('='.repeat(80));

    console.log('\n📊 Overview:');
    console.log(`   Total Error Occurrences: ${stats.totalOccurrences}`);
    console.log(`   Active Alerts: ${stats.activeAlerts}`);
    console.log(`   Alert Rules: ${this.alertRules.size}`);

    if (Object.keys(stats.alertsByCategory).length > 0) {
      console.log('\n🏷️ Active Alerts by Category:');
      Object.entries(stats.alertsByCategory).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });
    }

    if (Object.keys(stats.alertsBySeverity).length > 0) {
      console.log('\n⚠️ Active Alerts by Severity:');
      Object.entries(stats.alertsBySeverity).forEach(([severity, count]) => {
        const severityColor =
          severity === 'CRITICAL'
            ? color('#ef4444', 'css')
            : severity === 'ERROR'
              ? color('#f97316', 'css')
              : severity === 'WARNING'
                ? color('#f59e0b', 'css')
                : color('#10b981', 'css');
        console.log(`   ${severityColor}${severity}${color('#ffffff', 'css')}: ${count}`);
      });
    }

    if (stats.topErrorCodes.length > 0) {
      console.log('\n🔥 Top Error Codes:');
      stats.topErrorCodes.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.code}: ${error.count} occurrences`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }
}

// CLI execution and demo
if (import.meta.main) {
  const alerting = new SmartAlertingSystem();

  // Demo error occurrences
  console.log('🔥 DEMO: Simulating error occurrences...\n');

  // Simulate database failures (should trigger alert)
  for (let i = 0; i < 4; i++) {
    alerting.recordError(
      'E2001',
      {
        query: 'SELECT * FROM customers',
        duration: 30000 + i * 1000,
      },
      {
        ipAddress: '192.168.1.100',
        userId: 'user123',
      }
    );
  }

  // Simulate API rate limiting (should trigger alert)
  for (let i = 0; i < 60; i++) {
    alerting.recordError('E3002', {
      endpoint: '/api/customers',
      rateLimitRemaining: 0,
    });
  }

  // Simulate security issues (should trigger alert)
  for (let i = 0; i < 12; i++) {
    alerting.recordError(
      'E6001',
      {
        loginAttempt: `user${i}@test.com`,
        ipAddress: `203.0.113.${i + 1}`,
      },
      {
        ipAddress: `203.0.113.${i + 1}`,
        userAgent: 'Mozilla/5.0 (suspicious)',
      }
    );
  }

  // Display dashboard
  setTimeout(() => {
    alerting.displayDashboard();
  }, 1000);
}
