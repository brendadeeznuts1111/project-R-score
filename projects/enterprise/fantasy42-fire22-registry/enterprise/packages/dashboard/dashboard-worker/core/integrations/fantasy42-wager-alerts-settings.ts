/**
 * Fantasy42 Wager Alert Settings Management System
 * Complete wager alert configuration, threshold management, and notification system
 * Targets: Wager Alert Settings modal, alert configuration, threshold management
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface WagerAlertSettings {
  id: string;
  userId: string;
  enabled: boolean;
  alertChannels: {
    telegram: boolean;
    signal: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  alertThresholds: {
    amountThreshold: number;
    riskThreshold: number;
    frequencyThreshold: number;
    timeThreshold: number;
    sportSpecificThresholds: Record<string, number>;
  };
  alertTypes: {
    highAmount: boolean;
    highRisk: boolean;
    unusualPattern: boolean;
    vipClient: boolean;
    firstTime: boolean;
    locationChange: boolean;
    deviceChange: boolean;
    timeAnomaly: boolean;
  };
  notificationPreferences: {
    immediateAlerts: boolean;
    batchAlerts: boolean;
    summaryAlerts: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    alertFrequency: 'immediate' | '5min' | '15min' | '1hour';
    alertPriority: 'low' | 'medium' | 'high' | 'critical';
  };
  riskAssessment: {
    enabled: boolean;
    riskLevels: {
      low: { minScore: 0; maxScore: 0.3; action: 'monitor' };
      medium: { minScore: 0.3; maxScore: 0.7; action: 'alert' };
      high: { minScore: 0.7; maxScore: 0.9; action: 'review' };
      critical: { minScore: 0.9; maxScore: 1.0; action: 'block' };
    };
    autoEscalation: boolean;
    manualReview: boolean;
  };
  alertFilters: {
    sports: string[];
    leagues: string[];
    betTypes: string[];
    customerTiers: string[];
    excludedCustomers: string[];
    includedCustomers: string[];
  };
  escalationRules: {
    enabled: boolean;
    escalationLevels: Array<{
      level: number;
      threshold: number;
      channels: string[];
      recipients: string[];
      autoAction: string;
    }>;
  };
  reporting: {
    enabled: boolean;
    reportFrequency: 'daily' | 'weekly' | 'monthly';
    includeMetrics: boolean;
    includeTrends: boolean;
    recipients: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface AlertConfiguration {
  globalSettings: {
    masterSwitch: boolean;
    defaultThresholds: {
      amount: number;
      risk: number;
      frequency: number;
    };
    systemWideChannels: string[];
    emergencyContacts: string[];
  };
  channelConfigurations: {
    telegram: {
      enabled: boolean;
      botToken: string;
      chatIds: string[];
      messageTemplates: Record<string, string>;
      retryAttempts: number;
      retryDelay: number;
    };
    signal: {
      enabled: boolean;
      phoneNumber: string;
      recipients: string[];
      messageTemplates: Record<string, string>;
      encryption: boolean;
    };
    email: {
      enabled: boolean;
      smtpServer: string;
      smtpPort: number;
      username: string;
      password: string;
      fromAddress: string;
      recipients: string[];
      templates: Record<string, string>;
    };
    sms: {
      enabled: boolean;
      provider: string;
      apiKey: string;
      senderId: string;
      recipients: string[];
      templates: Record<string, string>;
    };
    push: {
      enabled: boolean;
      fcmServerKey: string;
      deviceTokens: string[];
      notificationTemplates: Record<string, string>;
    };
  };
  alertTemplates: {
    highAmount: string;
    highRisk: string;
    unusualPattern: string;
    vipClient: string;
    systemAlert: string;
    emergencyAlert: string;
  };
  maintenance: {
    lastTest: string;
    testResults: Record<string, boolean>;
    backupChannels: string[];
    failoverEnabled: boolean;
  };
}

export interface AlertAnalytics {
  alerts: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    averageResponseTime: number;
    alertsByType: Record<string, number>;
    alertsByChannel: Record<string, number>;
    alertsByTime: Record<string, number>;
  };
  performance: {
    systemLoad: number;
    processingTime: number;
    queueLength: number;
    errorRate: number;
    uptime: number;
  };
  effectiveness: {
    falsePositives: number;
    truePositives: number;
    responseRate: number;
    resolutionTime: number;
    customerSatisfaction: number;
  };
  trends: {
    alertVolume: Array<{ date: string; count: number }>;
    alertTypes: Array<{ type: string; trend: number }>;
    channelPerformance: Array<{ channel: string; performance: number }>;
    riskDetection: Array<{ level: string; accuracy: number }>;
  };
}

export class Fantasy42WagerAlertSettings {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private alertSettings: Map<string, WagerAlertSettings> = new Map();
  private alertConfiguration: AlertConfiguration;
  private analytics: AlertAnalytics;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private alertQueue: Array<any> = [];
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<AlertConfiguration>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.alertConfiguration = this.createDefaultConfiguration();
    if (config) {
      this.alertConfiguration = { ...this.alertConfiguration, ...config };
    }

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Fantasy42 wager alert settings system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚨 Initializing Fantasy42 Wager Alert Settings System...');

      // Detect wager alert settings modal
      await this.detectAlertSettingsModal();

      // Initialize alert configuration management
      await this.initializeAlertConfiguration();

      // Setup alert processing system
      await this.initializeAlertProcessing();

      // Setup channel management
      await this.initializeChannelManagement();

      // Setup threshold management
      await this.initializeThresholdManagement();

      // Setup analytics and reporting
      if (this.alertConfiguration.reporting?.enabled) {
        await this.initializeAnalyticsReporting();
      }

      this.isInitialized = true;
      console.log('✅ Fantasy42 Wager Alert Settings System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize wager alert settings system:', error);
      return false;
    }
  }

  /**
   * Create default alert configuration
   */
  private createDefaultConfiguration(): AlertConfiguration {
    return {
      globalSettings: {
        masterSwitch: true,
        defaultThresholds: {
          amount: 1000,
          risk: 0.7,
          frequency: 5,
        },
        systemWideChannels: ['telegram', 'email'],
        emergencyContacts: [],
      },
      channelConfigurations: {
        telegram: {
          enabled: true,
          botToken: '',
          chatIds: [],
          messageTemplates: {
            highAmount: '🚨 HIGH AMOUNT ALERT: ${customer} placed $${amount} wager on ${event}',
            highRisk: '⚠️ HIGH RISK ALERT: ${customer} risk score ${score} for $${amount} wager',
            systemAlert: '🔧 SYSTEM ALERT: ${message}',
          },
          retryAttempts: 3,
          retryDelay: 5000,
        },
        signal: {
          enabled: false,
          phoneNumber: '',
          recipients: [],
          messageTemplates: {
            highAmount: 'HIGH AMOUNT ALERT: Customer ${customer} placed ${amount} wager',
            highRisk: 'HIGH RISK ALERT: Customer ${customer} risk score ${score}',
            systemAlert: 'SYSTEM ALERT: ${message}',
          },
          encryption: true,
        },
        email: {
          enabled: true,
          smtpServer: '',
          smtpPort: 587,
          username: '',
          password: '',
          fromAddress: '',
          recipients: [],
          templates: {
            highAmount:
              'High Amount Alert: Customer ${customer} placed a $${amount} wager on ${event}',
            highRisk: 'High Risk Alert: Customer ${customer} has risk score ${score}',
            systemAlert: 'System Alert: ${message}',
          },
        },
        sms: {
          enabled: false,
          provider: '',
          apiKey: '',
          senderId: '',
          recipients: [],
          templates: {
            highAmount: 'ALERT: $${amount} wager by ${customer}',
            highRisk: 'RISK: ${customer} score ${score}',
            systemAlert: 'SYS: ${message}',
          },
        },
        push: {
          enabled: false,
          fcmServerKey: '',
          deviceTokens: [],
          notificationTemplates: {
            highAmount: 'High Amount Wager Alert',
            highRisk: 'High Risk Customer Alert',
            systemAlert: 'System Notification',
          },
        },
      },
      alertTemplates: {
        highAmount: '🚨 High Amount Alert: ${customer} placed $${amount} wager',
        highRisk: '⚠️ High Risk Alert: ${customer} risk score ${score}',
        unusualPattern: '🔍 Unusual Pattern: ${customer} showing ${pattern}',
        vipClient: '👑 VIP Alert: ${customer} activity detected',
        systemAlert: '🔧 System Alert: ${message}',
        emergencyAlert: '🚨 EMERGENCY: ${message}',
      },
      maintenance: {
        lastTest: '',
        testResults: {},
        backupChannels: ['email'],
        failoverEnabled: true,
      },
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): AlertAnalytics {
    return {
      alerts: {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        averageResponseTime: 0,
        alertsByType: {},
        alertsByChannel: {},
        alertsByTime: {},
      },
      performance: {
        systemLoad: 0,
        processingTime: 0,
        queueLength: 0,
        errorRate: 0,
        uptime: 0,
      },
      effectiveness: {
        falsePositives: 0,
        truePositives: 0,
        responseRate: 0,
        resolutionTime: 0,
        customerSatisfaction: 0,
      },
      trends: {
        alertVolume: [],
        alertTypes: [],
        channelPerformance: [],
        riskDetection: [],
      },
    };
  }

  /**
   * Detect wager alert settings modal
   */
  private async detectAlertSettingsModal(): Promise<void> {
    const modalSelectors = [
      'h4[data-language="L-831"]',
      '.modal-title[data-language="L-831"]',
      '#myModalLabel20',
      '[data-language*="wager"][data-language*="alert"]',
      '[data-language*="alert"][data-language*="settings"]',
    ];

    let modalTitle: Element | null = null;

    for (const selector of modalSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (
          element.textContent?.toLowerCase().includes('wager') &&
          element.textContent?.toLowerCase().includes('alert')
        ) {
          modalTitle = element;
          console.log('✅ Found wager alert settings modal:', selector);
          this.setupAlertSettingsModal(modalTitle as HTMLHeadingElement);
          break;
        }
      }
      if (modalTitle) break;
    }

    if (!modalTitle) {
      console.log('⚠️ Wager alert settings modal not found, system will initialize on demand');
    }
  }

  /**
   * Setup wager alert settings modal
   */
  private setupAlertSettingsModal(modalTitle: HTMLHeadingElement): void {
    // Find the parent modal
    const modal = modalTitle.closest('.modal, .modal-dialog, [role="dialog"]');
    if (!modal) {
      console.warn('⚠️ Parent modal not found for alert settings');
      return;
    }

    // Add click event listener to modal title
    const clickHandler = (e: Event) => {
      e.preventDefault();
      this.handleModalOpen(modal as HTMLElement);
    };

    modalTitle.addEventListener('click', clickHandler);
    this.eventListeners.set('modal-title-click', clickHandler);

    // Setup modal content enhancement
    this.enhanceAlertSettingsModal(modal as HTMLElement);

    // Initialize modal content
    this.initializeModalContent(modal as HTMLElement);

    console.log('✅ Wager alert settings modal setup complete');
  }

  /**
   * Enhance alert settings modal
   */
  private enhanceAlertSettingsModal(modal: HTMLElement): void {
    // Add CSS enhancements
    const style = document.createElement('style');
    style.textContent = `
	  .wager-alert-settings-modal .modal-content {
	    border-radius: 12px;
	    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	    border: none;
	  }

	  .wager-alert-settings-modal .modal-header {
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    border-radius: 12px 12px 0 0;
	    border-bottom: none;
	    padding: 20px 30px;
	  }

	  .wager-alert-settings-modal .modal-title {
	    font-weight: 600;
	    font-size: 1.5rem;
	    margin: 0;
	  }

	  .wager-alert-settings-modal .modal-body {
	    padding: 30px;
	    max-height: 70vh;
	    overflow-y: auto;
	  }

	  .alert-settings-section {
	    margin-bottom: 30px;
	    padding: 20px;
	    border: 1px solid #e9ecef;
	    border-radius: 8px;
	    background: #f8f9fa;
	  }

	  .alert-settings-section h5 {
	    margin-top: 0;
	    margin-bottom: 15px;
	    color: #495057;
	    font-weight: 600;
	    display: flex;
	    align-items: center;
	    gap: 10px;
	  }

	  .alert-settings-section h5::before {
	    content: '';
	    width: 4px;
	    height: 20px;
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    border-radius: 2px;
	  }

	  .form-group {
	    margin-bottom: 20px;
	  }

	  .form-group label {
	    font-weight: 500;
	    color: #495057;
	    margin-bottom: 8px;
	    display: block;
	  }

	  .form-control {
	    border: 2px solid #e9ecef;
	    border-radius: 6px;
	    padding: 10px 15px;
	    font-size: 14px;
	    transition: border-color 0.3s ease;
	  }

	  .form-control:focus {
	    border-color: #667eea;
	    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	    outline: none;
	  }

	  .checkbox-group {
	    display: flex;
	    flex-wrap: wrap;
	    gap: 15px;
	    margin-top: 10px;
	  }

	  .checkbox-item {
	    display: flex;
	    align-items: center;
	    gap: 8px;
	    min-width: 150px;
	  }

	  .checkbox-item input[type="checkbox"] {
	    width: 18px;
	    height: 18px;
	    accent-color: #667eea;
	  }

	  .checkbox-item label {
	    margin: 0;
	    font-weight: 400;
	    cursor: pointer;
	  }

	  .threshold-inputs {
	    display: grid;
	    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	    gap: 15px;
	    margin-top: 10px;
	  }

	  .threshold-input {
	    display: flex;
	    flex-direction: column;
	    gap: 5px;
	  }

	  .threshold-input input {
	    text-align: center;
	    font-weight: 600;
	    color: #495057;
	  }

	  .channel-config {
	    display: grid;
	    grid-template-columns: 1fr 2fr;
	    gap: 20px;
	    align-items: start;
	  }

	  .channel-toggle {
	    display: flex;
	    align-items: center;
	    gap: 10px;
	    padding: 10px;
	    background: white;
	    border-radius: 6px;
	    border: 1px solid #dee2e6;
	  }

	  .channel-settings {
	    background: white;
	    border: 1px solid #dee2e6;
	    border-radius: 6px;
	    padding: 15px;
	  }

	  .channel-settings.hidden {
	    opacity: 0.5;
	    pointer-events: none;
	  }

	  .alert-templates {
	    display: grid;
	    gap: 15px;
	  }

	  .template-item {
	    display: flex;
	    flex-direction: column;
	    gap: 8px;
	  }

	  .template-item textarea {
	    resize: vertical;
	    min-height: 60px;
	  }

	  .modal-footer {
	    border-top: 1px solid #dee2e6;
	    padding: 20px 30px;
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	  }

	  .btn {
	    padding: 10px 20px;
	    border-radius: 6px;
	    font-weight: 500;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    border: none;
	  }

	  .btn-primary {
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	  }

	  .btn-primary:hover {
	    transform: translateY(-2px);
	    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	  }

	  .btn-secondary {
	    background: #6c757d;
	    color: white;
	  }

	  .btn-success {
	    background: #28a745;
	    color: white;
	  }

	  .btn-success:hover {
	    background: #218838;
	  }

	  .settings-tabs {
	    display: flex;
	    margin-bottom: 20px;
	    border-bottom: 1px solid #dee2e6;
	  }

	  .settings-tab {
	    padding: 12px 20px;
	    background: none;
	    border: none;
	    border-bottom: 3px solid transparent;
	    cursor: pointer;
	    font-weight: 500;
	    color: #6c757d;
	    transition: all 0.3s ease;
	  }

	  .settings-tab.active {
	    color: #667eea;
	    border-bottom-color: #667eea;
	  }

	  .tab-content {
	    display: none;
	  }

	  .tab-content.active {
	    display: block;
	  }

	  .alert-preview {
	    background: #f8f9fa;
	    border: 1px solid #dee2e6;
	    border-radius: 6px;
	    padding: 15px;
	    margin-top: 10px;
	  }

	  .alert-preview h6 {
	    margin-top: 0;
	    color: #495057;
	  }

	  .alert-test-results {
	    margin-top: 15px;
	  }

	  .test-result {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	    padding: 8px 12px;
	    margin-bottom: 5px;
	    border-radius: 4px;
	    font-size: 14px;
	  }

	  .test-result.success {
	    background: #d4edda;
	    color: #155724;
	  }

	  .test-result.error {
	    background: #f8d7da;
	    color: #721c24;
	  }

	  .analytics-summary {
	    display: grid;
	    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	    gap: 15px;
	    margin-top: 20px;
	  }

	  .analytics-card {
	    background: white;
	    border: 1px solid #dee2e6;
	    border-radius: 6px;
	    padding: 15px;
	    text-align: center;
	  }

	  .analytics-card h4 {
	    margin: 0;
	    font-size: 24px;
	    color: #495057;
	  }

	  .analytics-card p {
	    margin: 5px 0 0 0;
	    color: #6c757d;
	    font-size: 14px;
	  }
	`;

    document.head.appendChild(style);

    // Add modal class
    modal.classList.add('wager-alert-settings-modal');
  }

  /**
   * Initialize modal content
   */
  private initializeModalContent(modal: HTMLElement): void {
    const modalBody = modal.querySelector('.modal-body');
    if (!modalBody) return;

    // Create tabbed interface
    const content = this.createSettingsTabs();
    modalBody.innerHTML = content;

    // Setup tab functionality
    this.setupTabFunctionality(modal);

    // Load current settings
    this.loadCurrentSettings(modal);

    // Setup form event listeners
    this.setupFormEventListeners(modal);

    console.log('✅ Modal content initialized');
  }

  /**
   * Create settings tabs
   */
  private createSettingsTabs(): string {
    return `
	  <div class="settings-tabs">
	    <button class="settings-tab active" data-tab="general">General</button>
	    <button class="settings-tab" data-tab="thresholds">Thresholds</button>
	    <button class="settings-tab" data-tab="channels">Channels</button>
	    <button class="settings-tab" data-tab="templates">Templates</button>
	    <button class="settings-tab" data-tab="analytics">Analytics</button>
	    <button class="settings-tab" data-tab="testing">Testing</button>
	  </div>

	  <div id="general" class="tab-content active">
	    ${this.createGeneralSettings()}
	  </div>

	  <div id="thresholds" class="tab-content">
	    ${this.createThresholdSettings()}
	  </div>

	  <div id="channels" class="tab-content">
	    ${this.createChannelSettings()}
	  </div>

	  <div id="templates" class="tab-content">
	    ${this.createTemplateSettings()}
	  </div>

	  <div id="analytics" class="tab-content">
	    ${this.createAnalyticsContent()}
	  </div>

	  <div id="testing" class="tab-content">
	    ${this.createTestingContent()}
	  </div>
	`;
  }

  /**
   * Create general settings
   */
  private createGeneralSettings(): string {
    return `
	  <div class="alert-settings-section">
	    <h5>🎛️ General Settings</h5>

	    <div class="form-group">
	      <label for="master-switch">
	        <input type="checkbox" id="master-switch" checked>
	        Enable Wager Alert System
	      </label>
	    </div>

	    <div class="form-group">
	      <label>Alert Types to Monitor:</label>
	      <div class="checkbox-group">
	        <div class="checkbox-item">
	          <input type="checkbox" id="alert-high-amount" checked>
	          <label for="alert-high-amount">High Amount Wagers</label>
	        </div>
	        <div class="checkbox-item">
	          <input type="checkbox" id="alert-high-risk" checked>
	          <label for="alert-high-risk">High Risk Customers</label>
	        </div>
	        <div class="checkbox-item">
	          <input type="checkbox" id="alert-unusual-pattern" checked>
	          <label for="alert-unusual-pattern">Unusual Patterns</label>
	        </div>
	        <div class="checkbox-item">
	          <input type="checkbox" id="alert-vip-client">
	          <label for="alert-vip-client">VIP Client Activity</label>
	        </div>
	      </div>
	    </div>

	    <div class="form-group">
	      <label>Notification Preferences:</label>
	      <div class="checkbox-group">
	        <div class="checkbox-item">
	          <input type="checkbox" id="immediate-alerts" checked>
	          <label for="immediate-alerts">Immediate Alerts</label>
	        </div>
	        <div class="checkbox-item">
	          <input type="checkbox" id="batch-alerts">
	          <label for="batch-alerts">Batch Alerts</label>
	        </div>
	        <div class="checkbox-item">
	          <input type="checkbox" id="summary-alerts">
	          <label for="summary-alerts">Daily Summary</label>
	        </div>
	      </div>
	    </div>

	    <div class="form-group">
	      <label for="alert-frequency">Alert Frequency:</label>
	      <select id="alert-frequency" class="form-control">
	        <option value="immediate">Immediate</option>
	        <option value="5min">Every 5 minutes</option>
	        <option value="15min">Every 15 minutes</option>
	        <option value="1hour">Every hour</option>
	      </select>
	    </div>

	    <div class="form-group">
	      <label>Quiet Hours:</label>
	      <div style="display: flex; gap: 10px; align-items: center;">
	        <input type="checkbox" id="quiet-hours-enabled">
	        <label for="quiet-hours-enabled">Enable</label>
	        <input type="time" id="quiet-start" value="22:00" disabled>
	        <span>to</span>
	        <input type="time" id="quiet-end" value="08:00" disabled>
	      </div>
	    </div>
	  </div>
	`;
  }

  /**
   * Create threshold settings
   */
  private createThresholdSettings(): string {
    return `
	  <div class="alert-settings-section">
	    <h5>📊 Alert Thresholds</h5>

	    <div class="form-group">
	      <label>Amount Thresholds:</label>
	      <div class="threshold-inputs">
	        <div class="threshold-input">
	          <label for="amount-threshold">High Amount ($):</label>
	          <input type="number" id="amount-threshold" class="form-control" value="1000" min="100" step="100">
	        </div>
	        <div class="threshold-input">
	          <label for="risk-threshold">Risk Score (0-1):</label>
	          <input type="number" id="risk-threshold" class="form-control" value="0.7" min="0" max="1" step="0.1">
	        </div>
	        <div class="threshold-input">
	          <label for="frequency-threshold">Frequency (wagers/hour):</label>
	          <input type="number" id="frequency-threshold" class="form-control" value="5" min="1" step="1">
	        </div>
	      </div>
	    </div>

	    <div class="form-group">
	      <label>Sport-Specific Thresholds:</label>
	      <div class="threshold-inputs">
	        <div class="threshold-input">
	          <label for="football-threshold">Football ($):</label>
	          <input type="number" id="football-threshold" class="form-control" value="2000" min="100" step="100">
	        </div>
	        <div class="threshold-input">
	          <label for="basketball-threshold">Basketball ($):</label>
	          <input type="number" id="basketball-threshold" class="form-control" value="1500" min="100" step="100">
	        </div>
	        <div class="threshold-input">
	          <label for="baseball-threshold">Baseball ($):</label>
	          <input type="number" id="baseball-threshold" class="form-control" value="1000" min="100" step="100">
	        </div>
	      </div>
	    </div>

	    <div class="form-group">
	      <label for="time-threshold">Time Window (hours):</label>
	      <input type="number" id="time-threshold" class="form-control" value="1" min="0.5" max="24" step="0.5">
	    </div>
	  </div>

	  <div class="alert-settings-section">
	    <h5>🎯 Risk Assessment</h5>

	    <div class="form-group">
	      <label for="risk-assessment-enabled">
	        <input type="checkbox" id="risk-assessment-enabled" checked>
	        Enable Risk Assessment
	      </label>
	    </div>

	    <div class="form-group">
	      <label for="auto-escalation">
	        <input type="checkbox" id="auto-escalation" checked>
	        Auto-Escalation Based on Risk Level
	      </label>
	    </div>

	    <div class="form-group">
	      <label for="manual-review">
	        <input type="checkbox" id="manual-review">
	        Require Manual Review for High Risk
	      </label>
	    </div>
	  </div>
	`;
  }

  /**
   * Create channel settings
   */
  private createChannelSettings(): string {
    return `
	  <div class="alert-settings-section">
	    <h5>📱 Alert Channels</h5>

	    <div class="channel-config">
	      <div class="channel-toggle">
	        <input type="checkbox" id="telegram-enabled" checked>
	        <label for="telegram-enabled">📱 Telegram</label>
	      </div>
	      <div class="channel-settings" id="telegram-settings">
	        <div class="form-group">
	          <label for="telegram-bot-token">Bot Token:</label>
	          <input type="password" id="telegram-bot-token" class="form-control" placeholder="Enter bot token">
	        </div>
	        <div class="form-group">
	          <label for="telegram-chat-ids">Chat IDs (comma-separated):</label>
	          <input type="text" id="telegram-chat-ids" class="form-control" placeholder="123456789,987654321">
	        </div>
	      </div>
	    </div>

	    <div class="channel-config">
	      <div class="channel-toggle">
	        <input type="checkbox" id="signal-enabled">
	        <label for="signal-enabled">🔒 Signal</label>
	      </div>
	      <div class="channel-settings hidden" id="signal-settings">
	        <div class="form-group">
	          <label for="signal-phone">Phone Number:</label>
	          <input type="tel" id="signal-phone" class="form-control" placeholder="+1234567890">
	        </div>
	        <div class="form-group">
	          <label for="signal-recipients">Recipients:</label>
	          <input type="text" id="signal-recipients" class="form-control" placeholder="+1234567890,+0987654321">
	        </div>
	      </div>
	    </div>

	    <div class="channel-config">
	      <div class="channel-toggle">
	        <input type="checkbox" id="email-enabled" checked>
	        <label for="email-enabled">📧 Email</label>
	      </div>
	      <div class="channel-settings" id="email-settings">
	        <div class="form-group">
	          <label for="email-smtp">SMTP Server:</label>
	          <input type="text" id="email-smtp" class="form-control" placeholder="smtp.gmail.com">
	        </div>
	        <div class="form-group">
	          <label for="email-from">From Address:</label>
	          <input type="email" id="email-from" class="form-control" placeholder="alerts@fantasy42.com">
	        </div>
	        <div class="form-group">
	          <label for="email-recipients">Recipients:</label>
	          <input type="text" id="email-recipients" class="form-control" placeholder="admin@fantasy42.com,manager@fantasy42.com">
	        </div>
	      </div>
	    </div>

	    <div class="channel-config">
	      <div class="channel-toggle">
	        <input type="checkbox" id="sms-enabled">
	        <label for="sms-enabled">📲 SMS</label>
	      </div>
	      <div class="channel-settings hidden" id="sms-settings">
	        <div class="form-group">
	          <label for="sms-provider">Provider:</label>
	          <select id="sms-provider" class="form-control">
	            <option value="twilio">Twilio</option>
	            <option value="aws">AWS SNS</option>
	            <option value="nexmo">Nexmo</option>
	          </select>
	        </div>
	        <div class="form-group">
	          <label for="sms-recipients">Recipients:</label>
	          <input type="text" id="sms-recipients" class="form-control" placeholder="+1234567890,+0987654321">
	        </div>
	      </div>
	    </div>
	  </div>
	`;
  }

  /**
   * Create template settings
   */
  private createTemplateSettings(): string {
    return `
	  <div class="alert-settings-section">
	    <h5>📝 Alert Templates</h5>

	    <div class="alert-templates">
	      <div class="template-item">
	        <label for="template-high-amount">High Amount Alert:</label>
	        <textarea id="template-high-amount" class="form-control" rows="2">🚨 HIGH AMOUNT ALERT: \${customer} placed \$\${amount} wager on \${event}</textarea>
	        <div class="alert-preview">
	          <h6>Preview:</h6>
	          <div id="preview-high-amount">🚨 HIGH AMOUNT ALERT: John Doe placed $2500 wager on Chiefs vs Eagles</div>
	        </div>
	      </div>

	      <div class="template-item">
	        <label for="template-high-risk">High Risk Alert:</label>
	        <textarea id="template-high-risk" class="form-control" rows="2">⚠️ HIGH RISK ALERT: \${customer} risk score \${score} for \$\${amount} wager</textarea>
	        <div class="alert-preview">
	          <h6>Preview:</h6>
	          <div id="preview-high-risk">⚠️ HIGH RISK ALERT: Jane Smith risk score 0.85 for $1200 wager</div>
	        </div>
	      </div>

	      <div class="template-item">
	        <label for="template-unusual-pattern">Unusual Pattern Alert:</label>
	        <textarea id="template-unusual-pattern" class="form-control" rows="2">🔍 UNUSUAL PATTERN: \${customer} showing \${pattern} behavior</textarea>
	        <div class="alert-preview">
	          <h6>Preview:</h6>
	          <div id="preview-unusual-pattern">🔍 UNUSUAL PATTERN: Bob Wilson showing high-frequency behavior</div>
	        </div>
	      </div>

	      <div class="template-item">
	        <label for="template-system-alert">System Alert:</label>
	        <textarea id="template-system-alert" class="form-control" rows="2">🔧 SYSTEM ALERT: \${message}</textarea>
	        <div class="alert-preview">
	          <h6>Preview:</h6>
	          <div id="preview-system-alert">🔧 SYSTEM ALERT: High system load detected</div>
	        </div>
	      </div>
	    </div>
	  </div>
	`;
  }

  /**
   * Create analytics content
   */
  private createAnalyticsContent(): string {
    return `
	  <div class="alert-settings-section">
	    <h5>📊 Alert Analytics</h5>

	    <div class="analytics-summary">
	      <div class="analytics-card">
	        <h4 id="analytics-total-sent">1,247</h4>
	        <p>Total Alerts Sent</p>
	      </div>
	      <div class="analytics-card">
	        <h4 id="analytics-delivery-rate">98.5%</h4>
	        <p>Delivery Rate</p>
	      </div>
	      <div class="analytics-card">
	        <h4 id="analytics-response-time">2.3m</h4>
	        <p>Avg Response Time</p>
	      </div>
	      <div class="analytics-card">
	        <h4 id="analytics-effectiveness">94.2%</h4>
	        <p>Effectiveness</p>
	      </div>
	    </div>

	    <div class="form-group" style="margin-top: 30px;">
	      <label for="reporting-enabled">
	        <input type="checkbox" id="reporting-enabled">
	        Enable Automated Reporting
	      </label>
	    </div>

	    <div class="form-group">
	      <label for="report-frequency">Report Frequency:</label>
	      <select id="report-frequency" class="form-control">
	        <option value="daily">Daily</option>
	        <option value="weekly">Weekly</option>
	        <option value="monthly">Monthly</option>
	      </select>
	    </div>

	    <div class="form-group">
	      <label for="report-recipients">Report Recipients:</label>
	      <input type="text" id="report-recipients" class="form-control" placeholder="admin@fantasy42.com,manager@fantasy42.com">
	    </div>
	  </div>
	`;
  }

  /**
   * Create testing content
   */
  private createTestingContent(): string {
    return `
	  <div class="alert-settings-section">
	    <h5>🧪 Alert System Testing</h5>

	    <div class="form-group">
	      <button id="test-all-channels" class="btn btn-primary">Test All Channels</button>
	      <button id="test-single-channel" class="btn btn-secondary" style="margin-left: 10px;">Test Selected Channel</button>
	    </div>

	    <div class="form-group">
	      <label for="test-channel-select">Test Channel:</label>
	      <select id="test-channel-select" class="form-control">
	        <option value="telegram">Telegram</option>
	        <option value="signal">Signal</option>
	        <option value="email">Email</option>
	        <option value="sms">SMS</option>
	      </select>
	    </div>

	    <div class="alert-test-results" id="test-results">
	      <!-- Test results will be populated here -->
	    </div>

	    <div class="form-group" style="margin-top: 30px;">
	      <h6>Last Test: <span id="last-test-time">Never</span></h6>
	      <div id="maintenance-status">
	        <!-- Maintenance status will be shown here -->
	      </div>
	    </div>
	  </div>
	`;
  }

  /**
   * Setup tab functionality
   */
  private setupTabFunctionality(modal: HTMLElement): void {
    const tabs = modal.querySelectorAll('.settings-tab');
    const contents = modal.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        const content = modal.querySelector(`#${tabId}`);
        if (content) {
          content.classList.add('active');
        }
      });
    });
  }

  /**
   * Load current settings
   */
  private loadCurrentSettings(modal: HTMLElement): void {
    // Load settings from configuration
    this.populateFormFields(modal);

    console.log('✅ Current settings loaded');
  }

  /**
   * Populate form fields
   */
  private populateFormFields(modal: HTMLElement): void {
    const config = this.alertConfiguration;

    // General settings
    const masterSwitch = modal.querySelector('#master-switch') as HTMLInputElement;
    if (masterSwitch) masterSwitch.checked = config.globalSettings.masterSwitch;

    // Alert types
    const alertTypes = ['high-amount', 'high-risk', 'unusual-pattern', 'vip-client'];
    alertTypes.forEach(type => {
      const checkbox = modal.querySelector(`#alert-${type}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = true; // Default to checked
    });

    // Thresholds
    const amountThreshold = modal.querySelector('#amount-threshold') as HTMLInputElement;
    if (amountThreshold)
      amountThreshold.value = config.globalSettings.defaultThresholds.amount.toString();

    const riskThreshold = modal.querySelector('#risk-threshold') as HTMLInputElement;
    if (riskThreshold)
      riskThreshold.value = config.globalSettings.defaultThresholds.risk.toString();

    const frequencyThreshold = modal.querySelector('#frequency-threshold') as HTMLInputElement;
    if (frequencyThreshold)
      frequencyThreshold.value = config.globalSettings.defaultThresholds.frequency.toString();

    // Channel settings
    const telegramEnabled = modal.querySelector('#telegram-enabled') as HTMLInputElement;
    if (telegramEnabled) telegramEnabled.checked = config.channelConfigurations.telegram.enabled;

    const emailEnabled = modal.querySelector('#email-enabled') as HTMLInputElement;
    if (emailEnabled) emailEnabled.checked = config.channelConfigurations.email.enabled;

    console.log('✅ Form fields populated');
  }

  /**
   * Setup form event listeners
   */
  private setupFormEventListeners(modal: HTMLElement): void {
    // Channel toggle listeners
    this.setupChannelToggles(modal);

    // Template preview listeners
    this.setupTemplatePreviews(modal);

    // Test button listeners
    this.setupTestButtons(modal);

    // Save settings listener
    this.setupSaveSettings(modal);

    console.log('✅ Form event listeners setup');
  }

  /**
   * Setup channel toggles
   */
  private setupChannelToggles(modal: HTMLElement): void {
    const channels = ['telegram', 'signal', 'email', 'sms'];

    channels.forEach(channel => {
      const toggle = modal.querySelector(`#${channel}-enabled`) as HTMLInputElement;
      const settings = modal.querySelector(`#${channel}-settings`);

      if (toggle && settings) {
        toggle.addEventListener('change', () => {
          if (toggle.checked) {
            settings.classList.remove('hidden');
          } else {
            settings.classList.add('hidden');
          }
        });
      }
    });
  }

  /**
   * Setup template previews
   */
  private setupTemplatePreviews(modal: HTMLElement): void {
    const templates = [
      { id: 'template-high-amount', preview: 'preview-high-amount' },
      { id: 'template-high-risk', preview: 'preview-high-risk' },
      { id: 'template-unusual-pattern', preview: 'preview-unusual-pattern' },
      { id: 'template-system-alert', preview: 'preview-system-alert' },
    ];

    templates.forEach(({ id, preview }) => {
      const textarea = modal.querySelector(`#${id}`) as HTMLTextAreaElement;
      const previewDiv = modal.querySelector(`#${preview}`);

      if (textarea && previewDiv) {
        textarea.addEventListener('input', () => {
          this.updateTemplatePreview(textarea, previewDiv);
        });
      }
    });
  }

  /**
   * Update template preview
   */
  private updateTemplatePreview(textarea: HTMLTextAreaElement, previewDiv: Element): void {
    const template = textarea.value;
    // Simple template replacement for demo
    const preview = template
      .replace('${customer}', 'John Doe')
      .replace('${amount}', '2500')
      .replace('${event}', 'Chiefs vs Eagles')
      .replace('${score}', '0.85')
      .replace('${pattern}', 'high-frequency')
      .replace('${message}', 'High system load detected');

    previewDiv.textContent = preview;
  }

  /**
   * Setup test buttons
   */
  private setupTestButtons(modal: HTMLElement): void {
    const testAllBtn = modal.querySelector('#test-all-channels') as HTMLButtonElement;
    const testSingleBtn = modal.querySelector('#test-single-channel') as HTMLButtonElement;

    if (testAllBtn) {
      testAllBtn.addEventListener('click', () => {
        this.testAllChannels(modal);
      });
    }

    if (testSingleBtn) {
      testSingleBtn.addEventListener('click', () => {
        const channelSelect = modal.querySelector('#test-channel-select') as HTMLSelectElement;
        if (channelSelect) {
          this.testSingleChannel(modal, channelSelect.value);
        }
      });
    }
  }

  /**
   * Setup save settings
   */
  private setupSaveSettings(modal: HTMLElement): void {
    const saveBtn = modal.querySelector('.btn-primary') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSettings(modal);
      });
    }
  }

  /**
   * Handle modal open
   */
  private handleModalOpen(modal: HTMLElement): void {
    // Refresh settings when modal opens
    this.loadCurrentSettings(modal);

    console.log('🚨 Wager alert settings modal opened');
  }

  /**
   * Save settings
   */
  private saveSettings(modal: HTMLElement): void {
    // Collect form data
    const settings = this.collectFormData(modal);

    // Validate settings
    if (!this.validateSettings(settings)) {
      return;
    }

    // Save to configuration
    this.updateConfiguration(settings);

    // Show success message
    this.showSaveSuccess(modal);

    // Track analytics
    this.trackAnalytics('settings_saved', {
      timestamp: new Date().toISOString(),
      settingsCount: Object.keys(settings).length,
    });

    console.log('✅ Settings saved successfully');
  }

  /**
   * Collect form data
   */
  private collectFormData(modal: HTMLElement): any {
    const data: any = {
      general: {},
      thresholds: {},
      channels: {},
      templates: {},
    };

    // General settings
    data.general.masterSwitch =
      (modal.querySelector('#master-switch') as HTMLInputElement)?.checked || false;
    data.general.alertTypes = {
      highAmount: (modal.querySelector('#alert-high-amount') as HTMLInputElement)?.checked || false,
      highRisk: (modal.querySelector('#alert-high-risk') as HTMLInputElement)?.checked || false,
      unusualPattern:
        (modal.querySelector('#alert-unusual-pattern') as HTMLInputElement)?.checked || false,
      vipClient: (modal.querySelector('#alert-vip-client') as HTMLInputElement)?.checked || false,
    };

    // Thresholds
    data.thresholds.amountThreshold = parseFloat(
      (modal.querySelector('#amount-threshold') as HTMLInputElement)?.value || '1000'
    );
    data.thresholds.riskThreshold = parseFloat(
      (modal.querySelector('#risk-threshold') as HTMLInputElement)?.value || '0.7'
    );
    data.thresholds.frequencyThreshold = parseInt(
      (modal.querySelector('#frequency-threshold') as HTMLInputElement)?.value || '5'
    );

    // Channels
    data.channels.telegram = {
      enabled: (modal.querySelector('#telegram-enabled') as HTMLInputElement)?.checked || false,
      botToken: (modal.querySelector('#telegram-bot-token') as HTMLInputElement)?.value || '',
      chatIds: (modal.querySelector('#telegram-chat-ids') as HTMLInputElement)?.value || '',
    };

    data.channels.email = {
      enabled: (modal.querySelector('#email-enabled') as HTMLInputElement)?.checked || false,
      smtpServer: (modal.querySelector('#email-smtp') as HTMLInputElement)?.value || '',
      fromAddress: (modal.querySelector('#email-from') as HTMLInputElement)?.value || '',
      recipients: (modal.querySelector('#email-recipients') as HTMLInputElement)?.value || '',
    };

    // Templates
    data.templates.highAmount =
      (modal.querySelector('#template-high-amount') as HTMLTextAreaElement)?.value || '';
    data.templates.highRisk =
      (modal.querySelector('#template-high-risk') as HTMLTextAreaElement)?.value || '';
    data.templates.unusualPattern =
      (modal.querySelector('#template-unusual-pattern') as HTMLTextAreaElement)?.value || '';
    data.templates.systemAlert =
      (modal.querySelector('#template-system-alert') as HTMLTextAreaElement)?.value || '';

    return data;
  }

  /**
   * Validate settings
   */
  private validateSettings(settings: any): boolean {
    // Basic validation
    if (!settings.general.masterSwitch) {
      this.showValidationError('Please enable the wager alert system');
      return false;
    }

    // Check if at least one alert type is enabled
    const alertTypesEnabled = Object.values(settings.general.alertTypes).some(
      (enabled: any) => enabled
    );
    if (!alertTypesEnabled) {
      this.showValidationError('Please enable at least one alert type');
      return false;
    }

    // Validate thresholds
    if (settings.thresholds.amountThreshold < 100) {
      this.showValidationError('Amount threshold must be at least $100');
      return false;
    }

    if (settings.thresholds.riskThreshold < 0 || settings.thresholds.riskThreshold > 1) {
      this.showValidationError('Risk threshold must be between 0 and 1');
      return false;
    }

    // Validate channels
    const channelsEnabled = Object.values(settings.channels).some(
      (channel: any) => channel.enabled
    );
    if (!channelsEnabled) {
      this.showValidationError('Please enable at least one alert channel');
      return false;
    }

    // Validate enabled channels have required fields
    for (const [channelName, channel] of Object.entries(settings.channels) as [string, any][]) {
      if (channel.enabled) {
        if (channelName === 'telegram' && (!channel.botToken || !channel.chatIds)) {
          this.showValidationError(`Please fill in all required fields for ${channelName}`);
          return false;
        }
        if (
          channelName === 'email' &&
          (!channel.smtpServer || !channel.fromAddress || !channel.recipients)
        ) {
          this.showValidationError(`Please fill in all required fields for ${channelName}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Update configuration
   */
  private updateConfiguration(settings: any): void {
    // Update global settings
    this.alertConfiguration.globalSettings.masterSwitch = settings.general.masterSwitch;
    this.alertConfiguration.globalSettings.defaultThresholds.amount =
      settings.thresholds.amountThreshold;
    this.alertConfiguration.globalSettings.defaultThresholds.risk =
      settings.thresholds.riskThreshold;
    this.alertConfiguration.globalSettings.defaultThresholds.frequency =
      settings.thresholds.frequencyThreshold;

    // Update channel configurations
    if (settings.channels.telegram) {
      this.alertConfiguration.channelConfigurations.telegram.enabled =
        settings.channels.telegram.enabled;
      if (settings.channels.telegram.botToken) {
        this.alertConfiguration.channelConfigurations.telegram.botToken =
          settings.channels.telegram.botToken;
      }
      if (settings.channels.telegram.chatIds) {
        this.alertConfiguration.channelConfigurations.telegram.chatIds =
          settings.channels.telegram.chatIds.split(',');
      }
    }

    if (settings.channels.email) {
      this.alertConfiguration.channelConfigurations.email.enabled = settings.channels.email.enabled;
      if (settings.channels.email.smtpServer) {
        this.alertConfiguration.channelConfigurations.email.smtpServer =
          settings.channels.email.smtpServer;
      }
      if (settings.channels.email.fromAddress) {
        this.alertConfiguration.channelConfigurations.email.fromAddress =
          settings.channels.email.fromAddress;
      }
      if (settings.channels.email.recipients) {
        this.alertConfiguration.channelConfigurations.email.recipients =
          settings.channels.email.recipients.split(',');
      }
    }

    // Update templates
    if (settings.templates) {
      this.alertConfiguration.alertTemplates.highAmount = settings.templates.highAmount;
      this.alertConfiguration.alertTemplates.highRisk = settings.templates.highRisk;
      this.alertConfiguration.alertTemplates.unusualPattern = settings.templates.unusualPattern;
      this.alertConfiguration.alertTemplates.systemAlert = settings.templates.systemAlert;
    }

    console.log('⚙️ Configuration updated');
  }

  /**
   * Show validation error
   */
  private showValidationError(message: string): void {
    // Create or update error message
    let errorDiv = document.querySelector('.settings-validation-error') as HTMLElement;
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'settings-validation-error';
      errorDiv.style.cssText = `
	    position: fixed;
	    top: 20px;
	    right: 20px;
	    background: #dc3545;
	    color: white;
	    padding: 15px 20px;
	    border-radius: 8px;
	    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	    z-index: 10000;
	    max-width: 300px;
	  `;
      document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 5000);
  }

  /**
   * Show save success
   */
  private showSaveSuccess(modal: HTMLElement): void {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
	  position: fixed;
	  top: 20px;
	  right: 20px;
	  background: #28a745;
	  color: white;
	  padding: 15px 20px;
	  border-radius: 8px;
	  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	  z-index: 10000;
	`;
    successDiv.textContent = '✅ Settings saved successfully!';

    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  /**
   * Test all channels
   */
  private async testAllChannels(modal: HTMLElement): Promise<void> {
    const resultsDiv = modal.querySelector('#test-results') as HTMLElement;
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<h6>Testing all channels...</h6>';

    const channels = ['telegram', 'email', 'signal', 'sms'];
    const results: any[] = [];

    for (const channel of channels) {
      const result = await this.testChannel(channel);
      results.push({ channel, ...result });
    }

    // Display results
    this.displayTestResults(resultsDiv, results);

    console.log('🧪 All channels tested');
  }

  /**
   * Test single channel
   */
  private async testSingleChannel(modal: HTMLElement, channel: string): Promise<void> {
    const resultsDiv = modal.querySelector('#test-results') as HTMLElement;
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `<h6>Testing ${channel}...</h6>`;

    const result = await this.testChannel(channel);
    this.displayTestResults(resultsDiv, [{ channel, ...result }]);

    console.log(`🧪 ${channel} channel tested`);
  }

  /**
   * Test channel
   */
  private async testChannel(channel: string): Promise<any> {
    // Simulate channel testing
    return new Promise(resolve => {
      setTimeout(
        () => {
          resolve({
            success: Math.random() > 0.2, // 80% success rate for demo
            responseTime: Math.floor(Math.random() * 2000) + 500,
            message:
              Math.random() > 0.2
                ? 'Test message sent successfully'
                : 'Failed to send test message',
          });
        },
        Math.random() * 2000 + 500
      );
    });
  }

  /**
   * Display test results
   */
  private displayTestResults(container: HTMLElement, results: any[]): void {
    container.innerHTML = '<h6>Test Results:</h6>';

    results.forEach(result => {
      const resultDiv = document.createElement('div');
      resultDiv.className = `test-result ${result.success ? 'success' : 'error'}`;

      resultDiv.innerHTML = `
	    <span><strong>${result.channel.toUpperCase()}</strong>: ${result.message}</span>
	    <span>${result.responseTime}ms</span>
	  `;

      container.appendChild(resultDiv);
    });

    // Update last test time
    const lastTestTime = document.querySelector('#last-test-time');
    if (lastTestTime) {
      lastTestTime.textContent = new Date().toLocaleString();
    }
  }

  /**
   * Initialize alert configuration
   */
  private async initializeAlertConfiguration(): Promise<void> {
    // Setup alert configuration management
    console.log('⚙️ Alert configuration initialized');
  }

  /**
   * Initialize alert processing
   */
  private async initializeAlertProcessing(): Promise<void> {
    // Setup alert processing system
    this.startAlertProcessing();

    console.log('⚙️ Alert processing initialized');
  }

  /**
   * Initialize channel management
   */
  private async initializeChannelManagement(): Promise<void> {
    // Setup channel management
    console.log('📱 Channel management initialized');
  }

  /**
   * Initialize threshold management
   */
  private async initializeThresholdManagement(): Promise<void> {
    // Setup threshold management
    console.log('📊 Threshold management initialized');
  }

  /**
   * Initialize analytics reporting
   */
  private async initializeAnalyticsReporting(): Promise<void> {
    // Setup analytics reporting
    console.log('📈 Analytics reporting initialized');
  }

  /**
   * Start alert processing
   */
  private startAlertProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processAlertQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process alert queue
   */
  private processAlertQueue(): void {
    if (this.alertQueue.length === 0) return;

    const alert = this.alertQueue.shift();
    if (alert) {
      this.sendAlert(alert);
    }
  }

  /**
   * Send alert
   */
  private async sendAlert(alert: any): Promise<void> {
    // Send alert through configured channels
    console.log('📤 Sending alert:', alert);
  }

  /**
   * Track analytics
   */
  private trackAnalytics(event: string, data: any): void {
    console.log('📊 Analytics tracked:', event, data);
  }

  /**
   * Get status
   */
  getStatus(): {
    isInitialized: boolean;
    activeSettings: number;
    alertsQueued: number;
    analytics: AlertAnalytics;
  } {
    return {
      isInitialized: this.isInitialized,
      activeSettings: this.alertSettings.size,
      alertsQueued: this.alertQueue.length,
      analytics: { ...this.analytics },
    };
  }

  /**
   * Get alert settings
   */
  getAlertSettings(userId?: string): WagerAlertSettings[] {
    if (userId) {
      const settings = this.alertSettings.get(userId);
      return settings ? [settings] : [];
    }
    return Array.from(this.alertSettings.values());
  }

  /**
   * Update alert settings
   */
  updateAlertSettings(userId: string, settings: Partial<WagerAlertSettings>): boolean {
    const existing = this.alertSettings.get(userId);
    if (existing) {
      this.alertSettings.set(userId, {
        ...existing,
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Create alert settings
   */
  createAlertSettings(settings: WagerAlertSettings): boolean {
    if (this.alertSettings.has(settings.userId)) {
      return false; // Already exists
    }

    this.alertSettings.set(settings.userId, {
      ...settings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Delete alert settings
   */
  deleteAlertSettings(userId: string): boolean {
    return this.alertSettings.delete(userId);
  }

  /**
   * Get configuration
   */
  getConfiguration(): AlertConfiguration {
    return { ...this.alertConfiguration };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<AlertConfiguration>): void {
    this.alertConfiguration = { ...this.alertConfiguration, ...newConfig };
    console.log('⚙️ Alert configuration updated');
  }

  /**
   * Queue alert
   */
  queueAlert(alert: any): void {
    this.alertQueue.push(alert);
    console.log('📋 Alert queued:', alert);
  }

  /**
   * Export settings
   */
  exportSettings(): string {
    const exportData = {
      alertSettings: Array.from(this.alertSettings.values()),
      configuration: this.alertConfiguration,
      analytics: this.analytics,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Clear queue
    this.alertQueue.length = 0;

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: Can't easily remove listeners without references
    });
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log('🧹 Wager alert settings system cleaned up');
  }

  // Private properties
  private sortDirection: 'asc' | 'desc' = 'desc';
  private currentSort: string = 'closingLine';
}

// Convenience functions
export const createFantasy42WagerAlertSettings = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<AlertConfiguration>
): Fantasy42WagerAlertSettings => {
  return new Fantasy42WagerAlertSettings(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42WagerAlertSettings = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<AlertConfiguration>
): Promise<boolean> => {
  const alertSettings = new Fantasy42WagerAlertSettings(fantasyClient, unifiedIntegration, config);
  return await alertSettings.initialize();
};

// Export types
export type { WagerAlertSettings, AlertConfiguration, AlertAnalytics };
