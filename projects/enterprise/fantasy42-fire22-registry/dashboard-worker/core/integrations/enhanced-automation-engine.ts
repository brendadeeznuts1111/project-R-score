/**
 * Enhanced Automation Engine
 * Intelligent automation system leveraging Fantasy42 integrations
 * Provides proactive monitoring, automated responses, and intelligent workflows
 */

import { UnifiedDashboardIntegration } from './unified-dashboard-integration';
import { Fantasy42AlertIntegration } from './fantasy42-alert-integration';
import { Fantasy42P2PAutomation } from './fantasy42-p2p-automation';
import { Fantasy42CustomerInfo } from './fantasy42-customer-info';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownMinutes: number;
  lastExecuted?: string;
}

export interface AutomationTrigger {
  type: 'schedule' | 'event' | 'threshold' | 'pattern';
  schedule?: {
    cron: string; // Cron expression
    timezone: string;
  };
  event?: {
    source: 'ip_tracker' | 'transaction_history' | 'collections' | 'sportsbook_lines' | 'analysis';
    eventType: string;
  };
  threshold?: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    duration: number; // minutes
  };
  pattern?: {
    patternType: 'anomaly' | 'trend' | 'correlation';
    parameters: Record<string, any>;
  };
}

export interface AutomationCondition {
  type: 'data_condition' | 'time_condition' | 'system_condition';
  dataCondition?: {
    source: string;
    field: string;
    operator: string;
    value: any;
  };
  timeCondition?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  };
  systemCondition?: {
    checkType: 'system_health' | 'integration_status' | 'performance';
    threshold: any;
  };
}

export interface AutomationAction {
  type:
    | 'alert'
    | 'block_ip'
    | 'settle_wager'
    | 'update_line'
    | 'send_notification'
    | 'webhook'
    | 'system_action';
  alert?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recipients?: string[];
  };
  blockIP?: {
    reason: string;
    duration: number; // minutes
  };
  settleWager?: {
    settlementType: 'win' | 'loss' | 'push' | 'void';
    notes: string;
  };
  updateLine?: {
    adjustmentType: 'odds' | 'limit' | 'status';
    value: any;
  };
  sendNotification?: {
    channels: string[];
    message: string;
    priority: string;
  };
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    payload?: any;
  };
  systemAction?: {
    actionType: 'restart_service' | 'clear_cache' | 'update_config' | 'scale_resources';
    parameters: Record<string, any>;
  };
}

export class EnhancedAutomationEngine {
  private unifiedIntegration: UnifiedDashboardIntegration;
  private alertIntegration: Fantasy42AlertIntegration;
  private p2pAutomation: Fantasy42P2PAutomation;
  private customerInfo: Fantasy42CustomerInfo;

  private rules: Map<string, AutomationRule> = new Map();
  private ruleExecutionHistory: Map<string, any[]> = new Map();
  private activeTriggers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    unifiedIntegration: UnifiedDashboardIntegration,
    alertIntegration: Fantasy42AlertIntegration,
    p2pAutomation: Fantasy42P2PAutomation,
    customerInfo: Fantasy42CustomerInfo
  ) {
    this.unifiedIntegration = unifiedIntegration;
    this.alertIntegration = alertIntegration;
    this.p2pAutomation = p2pAutomation;
    this.customerInfo = customerInfo;

    this.initializeDefaultRules();
    this.startAutomationEngine();
  }

  private initializeDefaultRules(): void {
    // High-risk IP detection rule
    this.addRule({
      id: 'high_risk_ip_detection',
      name: 'High-Risk IP Detection',
      description: 'Automatically detect and respond to high-risk IP addresses',
      trigger: {
        type: 'event',
        event: {
          source: 'ip_tracker',
          eventType: 'high_risk_detected',
        },
      },
      conditions: [
        {
          type: 'data_condition',
          dataCondition: {
            source: 'ip_tracker',
            field: 'riskScore',
            operator: '>=',
            value: 80,
          },
        },
      ],
      actions: [
        {
          type: 'alert',
          alert: {
            severity: 'high',
            message: 'High-risk IP detected: {{ip}} with risk score {{riskScore}}',
            recipients: ['security_team', 'management'],
          },
        },
        {
          type: 'block_ip',
          blockIP: {
            reason: 'Automated high-risk detection',
            duration: 1440, // 24 hours
          },
        },
      ],
      enabled: true,
      priority: 'high',
      cooldownMinutes: 60,
    });

    // Suspicious transaction pattern rule
    this.addRule({
      id: 'suspicious_transaction_pattern',
      name: 'Suspicious Transaction Pattern',
      description: 'Detect unusual transaction patterns requiring review',
      trigger: {
        type: 'event',
        event: {
          source: 'transaction_history',
          eventType: 'large_transaction',
        },
      },
      conditions: [
        {
          type: 'data_condition',
          dataCondition: {
            source: 'transaction_history',
            field: 'amount',
            operator: '>=',
            value: 5000,
          },
        },
      ],
      actions: [
        {
          type: 'alert',
          alert: {
            severity: 'medium',
            message: 'Large transaction detected: ${{amount}} by {{customerName}} ({{customerId}})',
            recipients: ['compliance_team', 'management'],
          },
        },
        {
          type: 'send_notification',
          sendNotification: {
            channels: ['telegram', 'email'],
            message: 'Large transaction requires review',
            priority: 'high',
          },
        },
      ],
      enabled: true,
      priority: 'medium',
      cooldownMinutes: 30,
    });

    // Pending settlement escalation rule
    this.addRule({
      id: 'pending_settlement_escalation',
      name: 'Pending Settlement Escalation',
      description: 'Escalate pending settlements that exceed time thresholds',
      trigger: {
        type: 'schedule',
        schedule: {
          cron: '0 */4 * * *', // Every 4 hours
          timezone: 'UTC',
        },
      },
      conditions: [
        {
          type: 'data_condition',
          dataCondition: {
            source: 'collections',
            field: 'pendingSettlements',
            operator: '>',
            value: 10,
          },
        },
      ],
      actions: [
        {
          type: 'alert',
          alert: {
            severity: 'medium',
            message: 'High number of pending settlements: {{pendingCount}} require attention',
            recipients: ['settlement_team', 'management'],
          },
        },
        {
          type: 'webhook',
          webhook: {
            url: 'https://api.pagerduty.com/incidents',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            payload: {
              incident: {
                type: 'incident',
                title: 'Pending Settlement Backlog',
                service: { id: 'settlement-service' },
                priority: { id: 'medium' },
              },
            },
          },
        },
      ],
      enabled: true,
      priority: 'medium',
      cooldownMinutes: 240, // 4 hours
    });

    // Line movement anomaly detection
    this.addRule({
      id: 'line_movement_anomaly',
      name: 'Line Movement Anomaly Detection',
      description: 'Detect unusual line movements that may indicate manipulation',
      trigger: {
        type: 'event',
        event: {
          source: 'sportsbook_lines',
          eventType: 'large_movement',
        },
      },
      conditions: [
        {
          type: 'data_condition',
          dataCondition: {
            source: 'sportsbook_lines',
            field: 'movement',
            operator: '>=',
            value: 0.15, // 15% movement
          },
        },
      ],
      actions: [
        {
          type: 'alert',
          alert: {
            severity: 'high',
            message: 'Unusual line movement detected: {{lineId}} moved {{movement}}%',
            recipients: ['trading_team', 'compliance_team'],
          },
        },
        {
          type: 'send_notification',
          sendNotification: {
            channels: ['telegram'],
            message: 'Line movement anomaly requires investigation',
            priority: 'urgent',
          },
        },
      ],
      enabled: true,
      priority: 'high',
      cooldownMinutes: 15,
    });

    // System performance degradation
    this.addRule({
      id: 'system_performance_degradation',
      name: 'System Performance Degradation',
      description: 'Monitor system performance and alert on degradation',
      trigger: {
        type: 'threshold',
        threshold: {
          metric: 'response_time',
          operator: '>',
          value: 2000, // 2 seconds
          duration: 5, // 5 minutes
        },
      },
      conditions: [
        {
          type: 'system_condition',
          systemCondition: {
            checkType: 'performance',
            threshold: { responseTime: 2000 },
          },
        },
      ],
      actions: [
        {
          type: 'alert',
          alert: {
            severity: 'critical',
            message: 'System performance degraded: Response time > 2s for 5+ minutes',
            recipients: ['devops_team', 'management'],
          },
        },
        {
          type: 'system_action',
          systemAction: {
            actionType: 'scale_resources',
            parameters: { service: 'dashboard-api', scaleFactor: 1.5 },
          },
        },
      ],
      enabled: true,
      priority: 'critical',
      cooldownMinutes: 30,
    });
  }

  // Rule Management
  addRule(rule: AutomationRule): void {
    this.rules.set(rule.id, rule);
    this.setupRuleTriggers(rule);
    console.log(`✅ Automation rule added: ${rule.name}`);
  }

  updateRule(ruleId: string, updates: Partial<AutomationRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.setupRuleTriggers(rule);
      console.log(`🔄 Automation rule updated: ${rule.name}`);
    }
  }

  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.cleanupRuleTriggers(rule);
      this.rules.delete(ruleId);
      console.log(`🗑️ Automation rule removed: ${rule.name}`);
    }
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.setupRuleTriggers(rule);
      console.log(`▶️ Automation rule enabled: ${rule.name}`);
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.cleanupRuleTriggers(rule);
      console.log(`⏸️ Automation rule disabled: ${rule.name}`);
    }
  }

  private setupRuleTriggers(rule: AutomationRule): void {
    if (!rule.enabled) return;

    this.cleanupRuleTriggers(rule);

    switch (rule.trigger.type) {
      case 'schedule':
        if (rule.trigger.schedule) {
          // Set up cron-based trigger
          this.setupScheduleTrigger(rule);
        }
        break;
      case 'event':
        // Event-based triggers are handled by the unified integration
        break;
      case 'threshold':
        if (rule.trigger.threshold) {
          this.setupThresholdTrigger(rule);
        }
        break;
      case 'pattern':
        if (rule.trigger.pattern) {
          this.setupPatternTrigger(rule);
        }
        break;
    }
  }

  private setupScheduleTrigger(rule: AutomationRule): void {
    // This would integrate with a cron scheduler
    // For now, we'll use setInterval for demonstration
    const interval = setInterval(() => {
      this.evaluateRule(rule);
    }, 60000); // Check every minute

    this.activeTriggers.set(`${rule.id}_schedule`, interval);
  }

  private setupThresholdTrigger(rule: AutomationRule): void {
    // Set up threshold monitoring
    const interval = setInterval(() => {
      this.checkThreshold(rule);
    }, 30000); // Check every 30 seconds

    this.activeTriggers.set(`${rule.id}_threshold`, interval);
  }

  private setupPatternTrigger(rule: AutomationRule): void {
    // Set up pattern detection
    const interval = setInterval(() => {
      this.detectPattern(rule);
    }, 60000); // Check every minute

    this.activeTriggers.set(`${rule.id}_pattern`, interval);
  }

  private cleanupRuleTriggers(rule: AutomationRule): void {
    const triggerKeys = [`${rule.id}_schedule`, `${rule.id}_threshold`, `${rule.id}_pattern`];

    triggerKeys.forEach(key => {
      const trigger = this.activeTriggers.get(key);
      if (trigger) {
        clearInterval(trigger);
        this.activeTriggers.delete(key);
      }
    });
  }

  // Rule Evaluation
  private async evaluateRule(rule: AutomationRule): Promise<void> {
    try {
      // Check cooldown
      if (rule.lastExecuted) {
        const lastExecution = new Date(rule.lastExecuted);
        const cooldownEnd = new Date(lastExecution.getTime() + rule.cooldownMinutes * 60000);
        if (new Date() < cooldownEnd) {
          return; // Still in cooldown
        }
      }

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions);

      if (conditionsMet) {
        // Execute actions
        await this.executeActions(rule.actions);

        // Update execution history
        rule.lastExecuted = new Date().toISOString();
        this.recordRuleExecution(rule.id, {
          timestamp: new Date().toISOString(),
          success: true,
          conditionsMet: true,
        });
      }
    } catch (error) {
      console.error(`Failed to evaluate rule ${rule.id}:`, error);
      this.recordRuleExecution(rule.id, {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
      });
    }
  }

  private async evaluateConditions(conditions: AutomationCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      let conditionMet = false;

      switch (condition.type) {
        case 'data_condition':
          if (condition.dataCondition) {
            conditionMet = await this.evaluateDataCondition(condition.dataCondition);
          }
          break;
        case 'time_condition':
          if (condition.timeCondition) {
            conditionMet = this.evaluateTimeCondition(condition.timeCondition);
          }
          break;
        case 'system_condition':
          if (condition.systemCondition) {
            conditionMet = await this.evaluateSystemCondition(condition.systemCondition);
          }
          break;
      }

      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  private async evaluateDataCondition(condition: any): Promise<boolean> {
    try {
      const data = await this.unifiedIntegration.getDashboardData(condition.source);
      // Simple field evaluation - in production, this would be more sophisticated
      const value = this.getNestedValue(data, condition.field);
      return this.compareValues(value, condition.operator, condition.value);
    } catch (error) {
      console.error('Data condition evaluation failed:', error);
      return false;
    }
  }

  private evaluateTimeCondition(condition: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    if (condition.startTime && condition.endTime) {
      const startHour = parseInt(condition.startTime.split(':')[0]);
      const endHour = parseInt(condition.endTime.split(':')[0]);

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    if (condition.daysOfWeek && !condition.daysOfWeek.includes(currentDay)) {
      return false;
    }

    return true;
  }

  private async evaluateSystemCondition(condition: any): Promise<boolean> {
    // Implement system condition evaluation
    // This would check system health, performance metrics, etc.
    return true; // Placeholder
  }

  private async executeActions(actions: AutomationAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  private async executeAction(action: AutomationAction): Promise<void> {
    switch (action.type) {
      case 'alert':
        if (action.alert) {
          await this.unifiedIntegration.sendAlert(
            'system',
            action.alert.message,
            action.alert.severity
          );
        }
        break;
      case 'block_ip':
        if (action.blockIP) {
          // This would need IP context from the triggering event
          console.log(`Would block IP for: ${action.blockIP.reason}`);
        }
        break;
      case 'settle_wager':
        if (action.settleWager) {
          // This would need wager context from the triggering event
          console.log(`Would settle wager as: ${action.settleWager.settlementType}`);
        }
        break;
      case 'send_notification':
        if (action.sendNotification) {
          await this.alertIntegration.sendNotification(
            action.sendNotification.channels,
            action.sendNotification.message,
            action.sendNotification.priority
          );
        }
        break;
      case 'webhook':
        if (action.webhook) {
          await this.sendWebhook(action.webhook);
        }
        break;
    }
  }

  private async checkThreshold(rule: AutomationRule): Promise<void> {
    // Implement threshold checking logic
    // This would monitor metrics over time and trigger when thresholds are breached
    await this.evaluateRule(rule);
  }

  private async detectPattern(rule: AutomationRule): Promise<void> {
    // Implement pattern detection logic
    // This would use statistical analysis to detect anomalies or trends
    await this.evaluateRule(rule);
  }

  // Utility methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private compareValues(value: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case '>':
        return value > compareValue;
      case '<':
        return value < compareValue;
      case '>=':
        return value >= compareValue;
      case '<=':
        return value <= compareValue;
      case '==':
        return value == compareValue;
      case '!=':
        return value != compareValue;
      default:
        return false;
    }
  }

  private async sendWebhook(webhook: any): Promise<void> {
    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers,
        },
        body: webhook.payload ? JSON.stringify(webhook.payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook execution failed:', error);
      throw error;
    }
  }

  private recordRuleExecution(ruleId: string, execution: any): void {
    if (!this.ruleExecutionHistory.has(ruleId)) {
      this.ruleExecutionHistory.set(ruleId, []);
    }

    const history = this.ruleExecutionHistory.get(ruleId)!;
    history.push(execution);

    // Keep only last 100 executions
    if (history.length > 100) {
      history.shift();
    }
  }

  // Public API methods
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  getRuleExecutionHistory(ruleId: string): any[] {
    return this.ruleExecutionHistory.get(ruleId) || [];
  }

  async triggerManualExecution(ruleId: string): Promise<boolean> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      return false;
    }

    await this.evaluateRule(rule);
    return true;
  }

  getSystemStatus(): {
    activeRules: number;
    totalExecutions: number;
    activeTriggers: number;
  } {
    return {
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalExecutions: Array.from(this.ruleExecutionHistory.values()).reduce(
        (sum, history) => sum + history.length,
        0
      ),
      activeTriggers: this.activeTriggers.size,
    };
  }

  private startAutomationEngine(): void {
    console.log('🤖 Enhanced Automation Engine started');

    // Set up event listeners for dashboard updates
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for dashboard events and evaluate relevant rules
    this.unifiedIntegration.subscribeToUpdates('ipTracker', async data => {
      await this.processEvent('ip_tracker', 'data_update', data);
    });

    this.unifiedIntegration.subscribeToUpdates('transactionHistory', async data => {
      await this.processEvent('transaction_history', 'data_update', data);
    });

    this.unifiedIntegration.subscribeToUpdates('collections', async data => {
      await this.processEvent('collections', 'data_update', data);
    });

    this.unifiedIntegration.subscribeToUpdates('sportsbookLines', async data => {
      await this.processEvent('sportsbook_lines', 'data_update', data);
    });

    this.unifiedIntegration.subscribeToUpdates('analysis', async data => {
      await this.processEvent('analysis', 'data_update', data);
    });
  }

  private async processEvent(source: string, eventType: string, data: any): Promise<void> {
    // Evaluate rules that match this event
    for (const rule of this.rules.values()) {
      if (
        rule.enabled &&
        rule.trigger.type === 'event' &&
        rule.trigger.event?.source === source &&
        rule.trigger.event?.eventType === eventType
      ) {
        await this.evaluateRule(rule);
      }
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    // Clear all active triggers
    for (const trigger of this.activeTriggers.values()) {
      clearInterval(trigger);
    }
    this.activeTriggers.clear();

    this.rules.clear();
    this.ruleExecutionHistory.clear();

    console.log('🧹 Enhanced Automation Engine cleaned up');
  }
}
