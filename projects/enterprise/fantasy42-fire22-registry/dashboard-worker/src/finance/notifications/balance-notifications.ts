/**
 * Balance Notifications Module
 * Handles balance threshold alerts, notifications, and escalation management
 */

import type {
  BalanceThresholdAlert,
  BalanceChangeEvent,
  RiskLevel,
} from '../../../core/types/finance';

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'dashboard';
  enabled: boolean;
  config: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'warning' | 'critical' | 'limit_exceeded' | 'approval_required' | 'escalation';
  subject: string;
  body: string;
  variables: string[];
  channels: NotificationChannel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  cooldownMinutes: number;
}

export class BalanceNotificationService {
  private alerts: Map<string, BalanceThresholdAlert> = new Map();
  private customerAlerts: Map<string, string[]> = new Map();
  private agentAlerts: Map<string, string[]> = new Map();
  private notificationHistory: Map<string, Date[]> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Create a balance threshold alert
   */
  createAlert(
    customerId: string,
    agentId: string,
    alertType: 'warning' | 'critical' | 'limit_exceeded',
    threshold: number,
    currentBalance: number,
    message: string
  ): BalanceThresholdAlert {
    const alert: BalanceThresholdAlert = {
      id: this.generateAlertId(),
      customerId,
      agentId,
      alertType,
      threshold,
      currentBalance,
      previousBalance: currentBalance, // Will be updated with actual previous balance
      triggerAmount: Math.abs(threshold - currentBalance),
      message,
      severity: this.calculateSeverity(alertType, threshold, currentBalance),
      acknowledged: false,
      escalationLevel: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.alerts.set(alert.id, alert);
    this.addToCustomerIndex(customerId, alert.id);
    this.addToAgentIndex(agentId, alert.id);

    console.log(`🚨 Balance alert created: ${customerId} | ${alertType} | $${currentBalance}`);

    // Send notification
    this.sendNotification(alert);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    notes?: string
  ): BalanceThresholdAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      console.warn(`⚠️ Alert not found: ${alertId}`);
      return null;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    alert.resolutionNotes = notes;
    alert.updatedAt = new Date();

    console.log(`✅ Alert acknowledged: ${alertId} by ${acknowledgedBy}`);

    // Send resolution notification
    this.sendResolutionNotification(alert);

    return alert;
  }

  /**
   * Escalate an alert
   */
  escalateAlert(alertId: string, newLevel: number, reason: string): BalanceThresholdAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      console.warn(`⚠️ Alert not found: ${alertId}`);
      return null;
    }

    alert.escalationLevel = newLevel;
    alert.severity = this.escalateSeverity(alert.severity);
    alert.updatedAt = new Date();
    alert.metadata = {
      ...alert.metadata,
      escalationReason: reason,
      escalatedAt: new Date(),
      previousLevel: alert.escalationLevel,
    };

    console.log(`🚨 Alert escalated: ${alertId} to level ${newLevel}`);

    // Send escalation notification
    this.sendEscalationNotification(alert);

    return alert;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): BalanceThresholdAlert | null {
    return this.alerts.get(alertId) || null;
  }

  /**
   * Get alerts for a customer
   */
  getCustomerAlerts(
    customerId: string,
    options?: {
      acknowledged?: boolean;
      severity?: string;
      limit?: number;
    }
  ): BalanceThresholdAlert[] {
    const alertIds = this.customerAlerts.get(customerId) || [];
    let alerts = alertIds
      .map(id => this.alerts.get(id))
      .filter((alert): alert is BalanceThresholdAlert => alert !== undefined);

    // Apply filters
    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    // Sort by creation date (newest first)
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Get alerts for an agent
   */
  getAgentAlerts(
    agentId: string,
    options?: {
      acknowledged?: boolean;
      severity?: string;
      limit?: number;
    }
  ): BalanceThresholdAlert[] {
    const alertIds = this.agentAlerts.get(agentId) || [];
    let alerts = alertIds
      .map(id => this.alerts.get(id))
      .filter((alert): alert is BalanceThresholdAlert => alert !== undefined);

    // Apply filters
    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    // Sort by creation date (newest first)
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(options?: { limit?: number }): BalanceThresholdAlert[] {
    const allAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      return allAlerts.slice(0, options.limit);
    }

    return allAlerts;
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): BalanceThresholdAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged && alert.severity === 'critical')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Send notification for an alert
   */
  private async sendNotification(alert: BalanceThresholdAlert): Promise<void> {
    const template = this.getTemplateForAlert(alert);
    if (!template) {
      console.warn(`⚠️ No template found for alert type: ${alert.alertType}`);
      return;
    }

    // Check cooldown
    if (this.isOnCooldown(alert.customerId, template.id, template.cooldownMinutes)) {
      console.log(`⏰ Notification on cooldown: ${alert.customerId} - ${template.id}`);
      return;
    }

    // Send to all enabled channels
    for (const channel of template.channels) {
      if (channel.enabled) {
        await this.sendToChannel(alert, template, channel);
      }
    }

    // Record notification
    this.recordNotification(alert.customerId, template.id);
  }

  /**
   * Send resolution notification
   */
  private async sendResolutionNotification(alert: BalanceThresholdAlert): Promise<void> {
    const template = this.templates.get('alert_resolved');
    if (!template) return;

    // Send resolution notification to relevant channels
    for (const channel of template.channels) {
      if (channel.enabled) {
        await this.sendToChannel(alert, template, channel);
      }
    }
  }

  /**
   * Send escalation notification
   */
  private async sendEscalationNotification(alert: BalanceThresholdAlert): Promise<void> {
    const template = this.templates.get('alert_escalated');
    if (!template) return;

    // Send escalation notification with higher priority
    for (const channel of template.channels) {
      if (channel.enabled) {
        await this.sendToChannel(alert, template, channel);
      }
    }
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    totalAlerts: number;
    unacknowledgedAlerts: number;
    criticalAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    averageResolutionTime: number;
    escalationRate: number;
  } {
    const allAlerts = Array.from(this.alerts.values());
    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let escalatedCount = 0;

    allAlerts.forEach(alert => {
      // Count by type
      alertsByType[alert.alertType] = (alertsByType[alert.alertType] || 0) + 1;

      // Count by severity
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;

      // Calculate resolution time
      if (alert.acknowledged && alert.acknowledgedAt) {
        totalResolutionTime += alert.acknowledgedAt.getTime() - alert.createdAt.getTime();
        resolvedCount++;
      }

      // Count escalations
      if (alert.escalationLevel > 0) {
        escalatedCount++;
      }
    });

    return {
      totalAlerts: allAlerts.length,
      unacknowledgedAlerts: allAlerts.filter(a => !a.acknowledged).length,
      criticalAlerts: allAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      alertsByType,
      alertsBySeverity,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      escalationRate: allAlerts.length > 0 ? (escalatedCount / allAlerts.length) * 100 : 0,
    };
  }

  // Private methods

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSeverity(
    alertType: 'warning' | 'critical' | 'limit_exceeded',
    threshold: number,
    currentBalance: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const deviation = Math.abs(threshold - currentBalance);

    switch (alertType) {
      case 'critical':
        return 'critical';
      case 'limit_exceeded':
        return deviation > 10000 ? 'critical' : 'high';
      case 'warning':
        return deviation > 1000 ? 'high' : deviation > 100 ? 'medium' : 'low';
      default:
        return 'medium';
    }
  }

  private escalateSeverity(currentSeverity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (currentSeverity) {
      case 'low':
        return 'medium';
      case 'medium':
        return 'high';
      case 'high':
        return 'critical';
      case 'critical':
        return 'critical';
      default:
        return 'high';
    }
  }

  private addToCustomerIndex(customerId: string, alertId: string): void {
    if (!this.customerAlerts.has(customerId)) {
      this.customerAlerts.set(customerId, []);
    }
    this.customerAlerts.get(customerId)!.push(alertId);
  }

  private addToAgentIndex(agentId: string, alertId: string): void {
    if (!this.agentAlerts.has(agentId)) {
      this.agentAlerts.set(agentId, []);
    }
    this.agentAlerts.get(agentId)!.push(alertId);
  }

  private getTemplateForAlert(alert: BalanceThresholdAlert): NotificationTemplate | null {
    const templateId = `alert_${alert.alertType}`;
    return this.templates.get(templateId) || null;
  }

  private async sendToChannel(
    alert: BalanceThresholdAlert,
    template: NotificationTemplate,
    channel: NotificationChannel
  ): Promise<void> {
    const message = this.renderTemplate(template, alert);

    switch (channel.type) {
      case 'email':
        await this.sendEmail(alert, message, channel.config);
        break;
      case 'sms':
        await this.sendSMS(alert, message, channel.config);
        break;
      case 'push':
        await this.sendPush(alert, message, channel.config);
        break;
      case 'webhook':
        await this.sendWebhook(alert, message, channel.config);
        break;
      case 'dashboard':
        await this.sendToDashboard(alert, message, channel.config);
        break;
    }
  }

  private renderTemplate(template: NotificationTemplate, alert: BalanceThresholdAlert): string {
    let message = template.body;

    // Replace variables
    const variables = {
      customerId: alert.customerId,
      threshold: alert.threshold.toLocaleString(),
      currentBalance: alert.currentBalance.toLocaleString(),
      triggerAmount: alert.triggerAmount.toLocaleString(),
      alertType: alert.alertType,
      severity: alert.severity,
      timestamp: alert.createdAt.toISOString(),
    };

    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }

    return message;
  }

  private isOnCooldown(customerId: string, templateId: string, cooldownMinutes: number): boolean {
    const key = `${customerId}_${templateId}`;
    const history = this.notificationHistory.get(key);

    if (!history || history.length === 0) {
      return false;
    }

    const lastNotification = Math.max(...history.map(d => d.getTime()));
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const now = Date.now();

    return now - lastNotification < cooldownMs;
  }

  private recordNotification(customerId: string, templateId: string): void {
    const key = `${customerId}_${templateId}`;
    if (!this.notificationHistory.has(key)) {
      this.notificationHistory.set(key, []);
    }
    this.notificationHistory.get(key)!.push(new Date());
  }

  private initializeDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'alert_warning',
        name: 'Balance Warning Alert',
        type: 'warning',
        subject: 'Balance Warning Alert',
        body: 'Warning: Customer ${customerId} balance is approaching threshold of $${threshold}. Current balance: $${currentBalance}',
        variables: ['customerId', 'threshold', 'currentBalance'],
        channels: [
          { type: 'dashboard', enabled: true, config: {} },
          { type: 'email', enabled: true, config: { priority: 'normal' } },
        ],
        priority: 'medium',
        cooldownMinutes: 60,
      },
      {
        id: 'alert_critical',
        name: 'Critical Balance Alert',
        type: 'critical',
        subject: 'CRITICAL: Balance Alert',
        body: 'CRITICAL: Customer ${customerId} has exceeded critical threshold of $${threshold}. Current balance: $${currentBalance}. Immediate action required.',
        variables: ['customerId', 'threshold', 'currentBalance'],
        channels: [
          { type: 'dashboard', enabled: true, config: {} },
          { type: 'email', enabled: true, config: { priority: 'high' } },
          { type: 'sms', enabled: true, config: {} },
        ],
        priority: 'urgent',
        cooldownMinutes: 15,
      },
      {
        id: 'alert_limit_exceeded',
        name: 'Limit Exceeded Alert',
        type: 'limit_exceeded',
        subject: 'ALERT: Balance Limit Exceeded',
        body: 'ALERT: Customer ${customerId} has exceeded balance limit of $${threshold}. Current balance: $${currentBalance}. Deviation: $${triggerAmount}',
        variables: ['customerId', 'threshold', 'currentBalance', 'triggerAmount'],
        channels: [
          { type: 'dashboard', enabled: true, config: {} },
          { type: 'email', enabled: true, config: { priority: 'urgent' } },
          { type: 'sms', enabled: true, config: {} },
        ],
        priority: 'urgent',
        cooldownMinutes: 5,
      },
      {
        id: 'alert_resolved',
        name: 'Alert Resolution Notification',
        type: 'warning',
        subject: 'Balance Alert Resolved',
        body: 'Balance alert for customer ${customerId} has been resolved and acknowledged.',
        variables: ['customerId'],
        channels: [{ type: 'dashboard', enabled: true, config: {} }],
        priority: 'low',
        cooldownMinutes: 0,
      },
      {
        id: 'alert_escalated',
        name: 'Alert Escalation Notification',
        type: 'escalation',
        subject: 'ALERT ESCALATION: Balance Issue',
        body: 'Balance alert for customer ${customerId} has been escalated to level ${escalationLevel}. Immediate attention required.',
        variables: ['customerId', 'escalationLevel'],
        channels: [
          { type: 'dashboard', enabled: true, config: {} },
          { type: 'email', enabled: true, config: { priority: 'urgent' } },
          { type: 'sms', enabled: true, config: {} },
        ],
        priority: 'urgent',
        cooldownMinutes: 0,
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Mock notification methods (would integrate with actual services)
  private async sendEmail(
    alert: BalanceThresholdAlert,
    message: string,
    config: any
  ): Promise<void> {
    console.log(`📧 Sending email notification: ${alert.customerId}`);
    // Integration with email service would go here
  }

  private async sendSMS(alert: BalanceThresholdAlert, message: string, config: any): Promise<void> {
    console.log(`📱 Sending SMS notification: ${alert.customerId}`);
    // Integration with SMS service would go here
  }

  private async sendPush(
    alert: BalanceThresholdAlert,
    message: string,
    config: any
  ): Promise<void> {
    console.log(`🔔 Sending push notification: ${alert.customerId}`);
    // Integration with push notification service would go here
  }

  private async sendWebhook(
    alert: BalanceThresholdAlert,
    message: string,
    config: any
  ): Promise<void> {
    console.log(`🔗 Sending webhook notification: ${alert.customerId}`);
    // Integration with webhook service would go here
  }

  private async sendToDashboard(
    alert: BalanceThresholdAlert,
    message: string,
    config: any
  ): Promise<void> {
    console.log(`📊 Sending dashboard notification: ${alert.customerId}`);
    // Dashboard notification logic would go here
  }
}
