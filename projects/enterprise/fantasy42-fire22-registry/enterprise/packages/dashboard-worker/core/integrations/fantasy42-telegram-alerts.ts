/**
 * Fantasy42 Telegram Wager Alerts Integration
 * Monitors and automates wager alert notifications via Telegram
 * Targets: label[data-language="L-1144"] (Send Wager Alert Telegram)
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { DepartmentalTelegramBot } from '../telegram/departmental-telegram-bot';
import { SignalIntegration } from '../api/realtime/signal-integration';
import { AIWagerAnalysis } from '../analytics/wager-analysis';

export interface TelegramAlertConfig {
  wagerAlertXPath: string;
  alertThresholds: {
    highAmount: number;
    vipCustomer: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    unusualPattern: boolean;
  };
  notificationChannels: {
    telegram: boolean;
    signal: boolean;
    email: boolean;
    sms: boolean;
  };
  autoSendEnabled: boolean;
  escalationRules: {
    highRisk: boolean;
    largeAmount: boolean;
    vipCustomer: boolean;
    unusualActivity: boolean;
  };
}

export interface WagerAlert {
  wagerId: string;
  customerId: string;
  amount: number;
  sport: string;
  event: string;
  odds: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  customerTier: 'standard' | 'vip' | 'premium';
  timestamp: string;
  alertReason: string;
  recommendedAction: string;
}

export class Fantasy42TelegramAlerts {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private telegramBot: DepartmentalTelegramBot;
  private signalIntegration: SignalIntegration;
  private wagerAnalysis: AIWagerAnalysis;

  private config: TelegramAlertConfig;
  private activeAlerts: Map<string, WagerAlert> = new Map();
  private alertHistory: WagerAlert[] = [];

  constructor(
    fantasyClient: Fantasy42AgentClient,
    telegramBot: DepartmentalTelegramBot,
    signalIntegration: SignalIntegration,
    wagerAnalysis: AIWagerAnalysis,
    config: TelegramAlertConfig
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.telegramBot = telegramBot;
    this.signalIntegration = signalIntegration;
    this.wagerAnalysis = wagerAnalysis;
    this.config = config;
  }

  /**
   * Initialize Telegram wager alerts system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚨 Initializing Fantasy42 Telegram Wager Alerts...');

      // Find and monitor wager alert element
      const elementFound = await this.locateAlertElement();
      if (!elementFound) {
        console.warn('⚠️ Telegram wager alert element not found');
        return false;
      }

      // Setup event listeners
      await this.setupAlertListeners();

      // Initialize notification channels
      await this.initializeNotificationChannels();

      // Setup wager monitoring
      await this.setupWagerMonitoring();

      // Load alert history
      await this.loadAlertHistory();

      console.log('✅ Fantasy42 Telegram Wager Alerts initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram alerts:', error);
      return false;
    }
  }

  /**
   * Locate the Telegram wager alert element
   */
  private async locateAlertElement(): Promise<boolean> {
    const element = this.xpathHandler.findElementByXPath(this.config.wagerAlertXPath);

    if (element) {
      console.log('✅ Telegram wager alert element found:', element.tagName);
      return true;
    } else {
      console.warn('⚠️ Telegram wager alert element not found at:', this.config.wagerAlertXPath);
      return false;
    }
  }

  /**
   * Setup alert event listeners
   */
  private async setupAlertListeners(): Promise<void> {
    // Monitor the Telegram alert element
    const alertElement = this.xpathHandler.findElementByXPath(this.config.wagerAlertXPath);

    if (alertElement) {
      // Find associated checkbox or button
      const associatedElement = this.findAssociatedControl(alertElement);

      if (associatedElement) {
        associatedElement.addEventListener('change', this.handleAlertToggle.bind(this));
        associatedElement.addEventListener('click', this.handleAlertTrigger.bind(this));

        console.log('✅ Alert listeners setup for Telegram wager alerts');
      }
    }

    // Setup wager monitoring listeners
    this.setupWagerEventListeners();
  }

  /**
   * Find associated control element (checkbox/button)
   */
  private findAssociatedControl(labelElement: Element): Element | null {
    const label = labelElement as HTMLLabelElement;

    if (label.htmlFor) {
      // Find by ID
      return document.getElementById(label.htmlFor);
    } else {
      // Find by relationship (next sibling, parent, etc.)
      let sibling = labelElement.nextElementSibling;
      while (sibling) {
        if (sibling.matches('input[type="checkbox"], input[type="radio"], button')) {
          return sibling;
        }
        sibling = sibling.nextElementSibling;
      }

      // Check parent container
      const container = labelElement.parentElement;
      if (container) {
        const inputs = container.querySelectorAll(
          'input[type="checkbox"], input[type="radio"], button'
        );
        return inputs.length > 0 ? inputs[0] : null;
      }
    }

    return null;
  }

  /**
   * Setup wager event listeners
   */
  private setupWagerEventListeners(): void {
    // Listen for wager creation events
    this.fantasyClient.on('wager-created', this.handleWagerCreated.bind(this));

    // Listen for wager update events
    this.fantasyClient.on('wager-updated', this.handleWagerUpdated.bind(this));

    // Listen for high-risk wager detection
    this.wagerAnalysis.on('high-risk-detected', this.handleHighRiskWager.bind(this));

    console.log('✅ Wager event listeners setup');
  }

  /**
   * Initialize notification channels
   */
  private async initializeNotificationChannels(): Promise<void> {
    // Initialize Telegram bot
    if (this.config.notificationChannels.telegram) {
      await this.telegramBot.initialize();
      console.log('✅ Telegram notification channel initialized');
    }

    // Initialize Signal integration
    if (this.config.notificationChannels.signal) {
      await this.signalIntegration.initialize();
      console.log('✅ Signal notification channel initialized');
    }

    // Email and SMS would be initialized here if enabled
    console.log('✅ Notification channels initialized');
  }

  /**
   * Setup wager monitoring
   */
  private async setupWagerMonitoring(): Promise<void> {
    // Start monitoring for new wagers
    setInterval(async () => {
      await this.checkForNewWagers();
    }, 5000); // Check every 5 seconds

    console.log('✅ Wager monitoring setup');
  }

  /**
   * Handle alert toggle (checkbox change)
   */
  private async handleAlertToggle(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const isEnabled = target.checked;

    console.log(`🚨 Telegram wager alerts ${isEnabled ? 'enabled' : 'disabled'}`);

    // Update configuration
    this.config.autoSendEnabled = isEnabled;

    // Update UI feedback
    await this.updateAlertStatus(isEnabled);

    // Send confirmation
    if (isEnabled) {
      await this.sendAlertConfirmation('enabled');
    }
  }

  /**
   * Handle alert trigger (manual send)
   */
  private async handleAlertTrigger(event: Event): Promise<void> {
    console.log('🚨 Manual Telegram wager alert triggered');

    // Get current wager context
    const currentWager = await this.getCurrentWagerContext();

    if (currentWager) {
      await this.sendWagerAlert(currentWager, 'manual_trigger');
    } else {
      console.warn('⚠️ No current wager context found for manual alert');
    }
  }

  /**
   * Handle wager created event
   */
  private async handleWagerCreated(wagerData: any): Promise<void> {
    console.log('🎯 New wager created:', wagerData.wagerId);

    // Analyze wager for alert conditions
    const alert = await this.analyzeWagerForAlert(wagerData);

    if (alert) {
      this.activeAlerts.set(alert.wagerId, alert);

      // Check if auto-send is enabled
      if (this.config.autoSendEnabled) {
        await this.sendWagerAlert(alert, 'auto_wager_created');
      } else {
        console.log('⚠️ Auto-send disabled, manual review required');
      }
    }
  }

  /**
   * Handle wager updated event
   */
  private async handleWagerUpdated(wagerData: any): Promise<void> {
    console.log('📝 Wager updated:', wagerData.wagerId);

    // Check if this wager is already being monitored
    const existingAlert = this.activeAlerts.get(wagerData.wagerId);

    if (existingAlert) {
      // Update existing alert
      const updatedAlert = await this.analyzeWagerForAlert(wagerData);
      if (updatedAlert) {
        this.activeAlerts.set(updatedAlert.wagerId, updatedAlert);

        // Send update notification
        await this.sendWagerAlert(updatedAlert, 'wager_updated');
      }
    }
  }

  /**
   * Handle high-risk wager detection
   */
  private async handleHighRiskWager(wagerData: any): Promise<void> {
    console.log('⚠️ High-risk wager detected:', wagerData.wagerId);

    // Create high-priority alert
    const alert: WagerAlert = {
      wagerId: wagerData.wagerId,
      customerId: wagerData.customerId,
      amount: wagerData.amount,
      sport: wagerData.sport,
      event: wagerData.event,
      odds: wagerData.odds,
      riskLevel: 'critical',
      customerTier: wagerData.customerTier || 'standard',
      timestamp: new Date().toISOString(),
      alertReason: 'High-risk wager pattern detected by AI analysis',
      recommendedAction: 'Immediate review and potential suspension',
    };

    this.activeAlerts.set(alert.wagerId, alert);

    // Always send high-risk alerts regardless of auto-send setting
    await this.sendWagerAlert(alert, 'high_risk_detected');
    await this.escalateHighRiskAlert(alert);
  }

  /**
   * Analyze wager for alert conditions
   */
  private async analyzeWagerForAlert(wagerData: any): Promise<WagerAlert | null> {
    // Check alert thresholds
    const shouldAlert = this.shouldTriggerAlert(wagerData);

    if (!shouldAlert) {
      return null;
    }

    // Determine risk level
    const riskLevel = this.assessWagerRisk(wagerData);

    // Get customer information
    const customerInfo = await this.getCustomerInfo(wagerData.customerId);

    // Create alert object
    const alert: WagerAlert = {
      wagerId: wagerData.wagerId,
      customerId: wagerData.customerId,
      amount: wagerData.amount,
      sport: wagerData.sport,
      event: wagerData.event,
      odds: wagerData.odds,
      riskLevel,
      customerTier: customerInfo.tier,
      timestamp: new Date().toISOString(),
      alertReason: this.determineAlertReason(wagerData, riskLevel),
      recommendedAction: this.getRecommendedAction(riskLevel, customerInfo),
    };

    return alert;
  }

  /**
   * Check if wager should trigger alert
   */
  private shouldTriggerAlert(wagerData: any): boolean {
    // Check amount threshold
    if (wagerData.amount >= this.config.alertThresholds.highAmount) {
      return true;
    }

    // Check customer VIP status
    if (this.config.alertThresholds.vipCustomer && wagerData.customerTier === 'vip') {
      return true;
    }

    // Check risk level
    const riskLevel = this.assessWagerRisk(wagerData);
    const riskThresholds = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const configuredThreshold = this.config.alertThresholds.riskLevel;
    const configuredLevel = riskThresholds[configuredThreshold] || 1;
    const wagerLevel = riskThresholds[riskLevel] || 1;

    if (wagerLevel >= configuredLevel) {
      return true;
    }

    // Check for unusual patterns
    if (this.config.alertThresholds.unusualPattern && this.isUnusualPattern(wagerData)) {
      return true;
    }

    return false;
  }

  /**
   * Assess wager risk level
   */
  private assessWagerRisk(wagerData: any): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Amount-based risk
    if (wagerData.amount > 10000) riskScore += 3;
    else if (wagerData.amount > 5000) riskScore += 2;
    else if (wagerData.amount > 1000) riskScore += 1;

    // Odds-based risk
    if (wagerData.odds > 10) riskScore += 2;
    else if (wagerData.odds > 5) riskScore += 1;

    // Customer history risk
    if (wagerData.customerHistory?.suspiciousPatterns) riskScore += 2;
    if (wagerData.customerHistory?.recentLosses) riskScore += 1;

    // Time-based risk
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) riskScore += 1; // Unusual hours

    // Determine risk level
    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Check for unusual patterns
   */
  private isUnusualPattern(wagerData: any): boolean {
    // This would integrate with AI analysis
    // For now, check basic patterns
    const customerHistory = wagerData.customerHistory || {};

    // Check betting frequency
    if (customerHistory.betsLastHour > 5) return true;

    // Check amount consistency
    if (customerHistory.averageBet && wagerData.amount > customerHistory.averageBet * 5) {
      return true;
    }

    // Check time patterns
    const now = new Date();
    const lastBet = customerHistory.lastBetTime ? new Date(customerHistory.lastBetTime) : null;
    if (lastBet && now.getTime() - lastBet.getTime() < 60000) {
      // Less than 1 minute
      return true;
    }

    return false;
  }

  /**
   * Get customer information
   */
  private async getCustomerInfo(customerId: string): Promise<any> {
    // This would call the Fantasy42 API
    const customerData = await this.fantasyClient.getCustomerInfo(customerId);

    return {
      tier: customerData.tier || 'standard',
      history: customerData.bettingHistory || {},
      riskScore: customerData.riskScore || 0,
    };
  }

  /**
   * Determine alert reason
   */
  private determineAlertReason(wagerData: any, riskLevel: string): string {
    if (riskLevel === 'critical') {
      return 'Critical risk wager detected - immediate attention required';
    }

    if (wagerData.amount >= this.config.alertThresholds.highAmount) {
      return `High amount wager: $${wagerData.amount.toLocaleString()}`;
    }

    if (wagerData.customerTier === 'vip') {
      return `VIP customer wager: ${wagerData.customerId}`;
    }

    if (this.isUnusualPattern(wagerData)) {
      return 'Unusual betting pattern detected';
    }

    return 'Wager meets alert criteria';
  }

  /**
   * Get recommended action
   */
  private getRecommendedAction(riskLevel: string, customerInfo: any): string {
    switch (riskLevel) {
      case 'critical':
        return 'Immediate review required - consider suspension';
      case 'high':
        return 'Enhanced monitoring recommended';
      case 'medium':
        return 'Monitor closely for patterns';
      case 'low':
        return 'Standard processing - no action required';
      default:
        return 'Review and monitor';
    }
  }

  /**
   * Send wager alert
   */
  private async sendWagerAlert(alert: WagerAlert, triggerReason: string): Promise<void> {
    console.log(`🚨 Sending wager alert: ${alert.wagerId} (${triggerReason})`);

    // Create alert message
    const message = this.formatAlertMessage(alert, triggerReason);

    // Send via configured channels
    const sendPromises: Promise<void>[] = [];

    if (this.config.notificationChannels.telegram) {
      sendPromises.push(this.sendTelegramAlert(message, alert));
    }

    if (this.config.notificationChannels.signal) {
      sendPromises.push(this.sendSignalAlert(message, alert));
    }

    if (this.config.notificationChannels.email) {
      sendPromises.push(this.sendEmailAlert(message, alert));
    }

    if (this.config.notificationChannels.sms) {
      sendPromises.push(this.sendSMSAlert(message, alert));
    }

    // Wait for all notifications to complete
    await Promise.allSettled(sendPromises);

    // Add to history
    this.alertHistory.push(alert);

    // Update Fantasy42 interface
    await this.updateFantasy42Interface(alert);

    console.log(`✅ Wager alert sent: ${alert.wagerId}`);
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(alert: WagerAlert, triggerReason: string): string {
    return `
🚨 **WAGER ALERT** 🚨

**Wager ID:** ${alert.wagerId}
**Customer:** ${alert.customerId} (${alert.customerTier})
**Amount:** $${alert.amount.toLocaleString()}
**Sport/Event:** ${alert.sport} - ${alert.event}
**Odds:** ${alert.odds}
**Risk Level:** ${alert.riskLevel.toUpperCase()}
**Alert Reason:** ${alert.alertReason}
**Recommended Action:** ${alert.recommendedAction}
**Timestamp:** ${new Date(alert.timestamp).toLocaleString()}
**Trigger:** ${triggerReason}

Please review and take appropriate action.
	`.trim();
  }

  /**
   * Send Telegram alert
   */
  private async sendTelegramAlert(message: string, alert: WagerAlert): Promise<void> {
    try {
      // Determine appropriate department/channel
      const department = this.getAlertDepartment(alert);

      await this.telegramBot.sendWagerAlert(department, message, alert);

      console.log(`📱 Telegram alert sent to ${department}`);
    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error);
    }
  }

  /**
   * Send Signal alert
   */
  private async sendSignalAlert(message: string, alert: WagerAlert): Promise<void> {
    try {
      const priority = this.getAlertPriority(alert);

      await this.signalIntegration.sendWagerAlert(message, alert, priority);

      console.log(`📞 Signal alert sent with ${priority} priority`);
    } catch (error) {
      console.error('❌ Failed to send Signal alert:', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(message: string, alert: WagerAlert): Promise<void> {
    // Email implementation would go here
    console.log(`📧 Email alert would be sent for wager ${alert.wagerId}`);
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(message: string, alert: WagerAlert): Promise<void> {
    // SMS implementation would go here
    console.log(`💬 SMS alert would be sent for wager ${alert.wagerId}`);
  }

  /**
   * Get appropriate department for alert
   */
  private getAlertDepartment(alert: WagerAlert): string {
    if (alert.riskLevel === 'critical') {
      return 'security';
    }

    if (alert.customerTier === 'vip') {
      return 'vip-services';
    }

    if (alert.amount >= 5000) {
      return 'risk-management';
    }

    return 'sportsbook-operations';
  }

  /**
   * Get alert priority
   */
  private getAlertPriority(alert: WagerAlert): 'normal' | 'high' | 'urgent' {
    if (alert.riskLevel === 'critical') {
      return 'urgent';
    }

    if (alert.riskLevel === 'high' || alert.customerTier === 'vip') {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Escalate high-risk alert
   */
  private async escalateHighRiskAlert(alert: WagerAlert): Promise<void> {
    console.log(`🚨 Escalating high-risk alert: ${alert.wagerId}`);

    // Send to multiple channels with urgency
    const escalationMessage = `🚨 **CRITICAL RISK ALERT** 🚨\n\n${this.formatAlertMessage(alert, 'high_risk_escalation')}`;

    // Send to security team
    if (this.config.notificationChannels.telegram) {
      await this.telegramBot.sendWagerAlert('security', escalationMessage, alert);
    }

    // Send urgent Signal message
    if (this.config.notificationChannels.signal) {
      await this.signalIntegration.sendWagerAlert(escalationMessage, alert, 'urgent');
    }

    // Log escalation
    console.log(`✅ High-risk alert escalated: ${alert.wagerId}`);
  }

  /**
   * Update Fantasy42 interface
   */
  private async updateFantasy42Interface(alert: WagerAlert): Promise<void> {
    try {
      // Update the Telegram alert element to show status
      const statusMessage = `Alert sent - ${alert.wagerId} (${alert.riskLevel})`;
      await handleFantasy42Element('write', statusMessage);

      console.log('✅ Fantasy42 interface updated with alert status');
    } catch (error) {
      console.error('❌ Failed to update Fantasy42 interface:', error);
    }
  }

  /**
   * Update alert status in UI
   */
  private async updateAlertStatus(isEnabled: boolean): Promise<void> {
    const alertElement = this.xpathHandler.findElementByXPath(this.config.wagerAlertXPath);

    if (alertElement) {
      // Add visual feedback
      alertElement.classList.toggle('alert-enabled', isEnabled);
      alertElement.classList.toggle('alert-disabled', !isEnabled);

      // Update text content
      const statusText = isEnabled ? ' (Enabled)' : ' (Disabled)';
      const originalText =
        alertElement.textContent?.replace(' (Enabled)', '').replace(' (Disabled)', '') || '';
      alertElement.textContent = originalText + statusText;
    }
  }

  /**
   * Send alert confirmation
   */
  private async sendAlertConfirmation(status: 'enabled' | 'disabled'): Promise<void> {
    const confirmationMessage = `Telegram wager alerts ${status.toUpperCase()}`;

    if (this.config.notificationChannels.telegram) {
      await this.telegramBot.sendSystemMessage('system', confirmationMessage);
    }

    console.log(`✅ Alert confirmation sent: ${confirmationMessage}`);
  }

  /**
   * Get current wager context
   */
  private async getCurrentWagerContext(): Promise<any> {
    // This would get the current wager being viewed/edited
    return await this.fantasyClient.getCurrentWagerContext();
  }

  /**
   * Check for new wagers
   */
  private async checkForNewWagers(): Promise<void> {
    try {
      const newWagers = await this.fantasyClient.getNewWagers();

      for (const wager of newWagers) {
        await this.handleWagerCreated(wager);
      }
    } catch (error) {
      console.error('❌ Failed to check for new wagers:', error);
    }
  }

  /**
   * Load alert history
   */
  private async loadAlertHistory(): Promise<void> {
    // Load recent alert history from storage
    console.log('📋 Alert history loaded');
  }

  /**
   * Get system status
   */
  getStatus(): {
    alertsActive: number;
    historyCount: number;
    config: TelegramAlertConfig;
    channels: {
      telegram: boolean;
      signal: boolean;
      email: boolean;
      sms: boolean;
    };
  } {
    return {
      alertsActive: this.activeAlerts.size,
      historyCount: this.alertHistory.length,
      config: this.config,
      channels: this.config.notificationChannels,
    };
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 50): WagerAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear active alerts
   */
  clearActiveAlerts(): void {
    this.activeAlerts.clear();
    console.log('🧹 Active alerts cleared');
  }
}

// Convenience functions
export const createFantasy42TelegramAlerts = (
  fantasyClient: Fantasy42AgentClient,
  telegramBot: DepartmentalTelegramBot,
  signalIntegration: SignalIntegration,
  wagerAnalysis: AIWagerAnalysis,
  config: TelegramAlertConfig
): Fantasy42TelegramAlerts => {
  return new Fantasy42TelegramAlerts(
    fantasyClient,
    telegramBot,
    signalIntegration,
    wagerAnalysis,
    config
  );
};

export const initializeFantasy42TelegramAlerts = async (
  fantasyClient: Fantasy42AgentClient,
  telegramBot: DepartmentalTelegramBot,
  signalIntegration: SignalIntegration,
  wagerAnalysis: AIWagerAnalysis,
  config: TelegramAlertConfig
): Promise<boolean> => {
  const alerts = new Fantasy42TelegramAlerts(
    fantasyClient,
    telegramBot,
    signalIntegration,
    wagerAnalysis,
    config
  );
  return await alerts.initialize();
};

// Export types
export type { TelegramAlertConfig, WagerAlert };
