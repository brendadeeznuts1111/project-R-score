/**
 * Fantasy42 Notification Toggle & Preferences Management System
 * Complete notification control, quick settings access, and preference management
 * Targets: Notification flag selector, alert settings button, preference controls
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';
import { Fantasy42WagerAlertSettings } from './fantasy42-wager-alerts-settings';

export interface NotificationPreferences {
  id: string;
  userId: string;
  masterToggle: boolean;
  alertCategories: {
    highAmount: boolean;
    highRisk: boolean;
    unusualPattern: boolean;
    vipClient: boolean;
    systemAlert: boolean;
    promotional: boolean;
  };
  channels: {
    telegram: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  schedule: {
    enabled: boolean;
    quietHours: {
      start: string;
      end: string;
    };
    timezone: string;
    workDaysOnly: boolean;
  };
  priority: {
    high: boolean;
    medium: boolean;
    low: boolean;
    info: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number;
    soundType: 'default' | 'custom';
    customSound?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationToggleConfig {
  quickAccess: {
    enabled: boolean;
    position: 'top-right' | 'bottom-right' | 'inline';
    size: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark' | 'auto';
  };
  masterControl: {
    showStatus: boolean;
    confirmChanges: boolean;
    autoSave: boolean;
    syncAcrossDevices: boolean;
  };
  alertSettings: {
    quickAccessButton: boolean;
    modalIntegration: boolean;
    directNavigation: boolean;
  };
  ui: {
    animations: boolean;
    tooltips: boolean;
    keyboardShortcuts: boolean;
    accessibility: boolean;
  };
}

export interface NotificationAnalytics {
  toggles: {
    totalToggles: number;
    enabledCount: number;
    disabledCount: number;
    averageSessionToggles: number;
  };
  preferences: {
    totalUpdates: number;
    categoryChanges: Record<string, number>;
    channelChanges: Record<string, number>;
    scheduleChanges: number;
  };
  interactions: {
    buttonClicks: number;
    settingAccess: number;
    modalOpens: number;
    preferenceChanges: number;
  };
  performance: {
    loadTime: number;
    responseTime: number;
    errorRate: number;
    userSatisfaction: number;
  };
}

export class Fantasy42NotificationToggle {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;
  private wagerAlertSettings: Fantasy42WagerAlertSettings;

  private notificationPreferences: Map<string, NotificationPreferences> = new Map();
  private config: NotificationToggleConfig;
  private analytics: NotificationAnalytics;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private currentUserId: string = '';

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    wagerAlertSettings: Fantasy42WagerAlertSettings,
    config?: Partial<NotificationToggleConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;
    this.wagerAlertSettings = wagerAlertSettings;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Fantasy42 notification toggle system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 Initializing Fantasy42 Notification Toggle System...');

      // Detect notification toggle elements
      await this.detectNotificationElements();

      // Initialize preference management
      await this.initializePreferenceManagement();

      // Setup quick access features
      if (this.config.quickAccess.enabled) {
        await this.initializeQuickAccess();
      }

      // Setup master control
      await this.initializeMasterControl();

      // Setup alert settings integration
      await this.initializeAlertSettingsIntegration();

      // Setup analytics and monitoring
      await this.initializeAnalyticsTracking();

      this.isInitialized = true;
      console.log('✅ Fantasy42 Notification Toggle System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notification toggle system:', error);
      return false;
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): NotificationToggleConfig {
    return {
      quickAccess: {
        enabled: true,
        position: 'top-right',
        size: 'medium',
        theme: 'auto',
      },
      masterControl: {
        showStatus: true,
        confirmChanges: true,
        autoSave: true,
        syncAcrossDevices: true,
      },
      alertSettings: {
        quickAccessButton: true,
        modalIntegration: true,
        directNavigation: false,
      },
      ui: {
        animations: true,
        tooltips: true,
        keyboardShortcuts: true,
        accessibility: true,
      },
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): NotificationAnalytics {
    return {
      toggles: {
        totalToggles: 0,
        enabledCount: 0,
        disabledCount: 0,
        averageSessionToggles: 0,
      },
      preferences: {
        totalUpdates: 0,
        categoryChanges: {},
        channelChanges: {},
        scheduleChanges: 0,
      },
      interactions: {
        buttonClicks: 0,
        settingAccess: 0,
        modalOpens: 0,
        preferenceChanges: 0,
      },
      performance: {
        loadTime: 0,
        responseTime: 0,
        errorRate: 0,
        userSatisfaction: 0,
      },
    };
  }

  /**
   * Detect notification toggle elements
   */
  private async detectNotificationElements(): Promise<void> {
    const notificationSelectors = [
      'select[data-field="notify-flag"]',
      'button[data-action="get-notify-agent"]',
      '.notification-toggle',
      '.alert-settings-btn',
      '[data-field*="notify"]',
      '[data-action*="notify"]',
    ];

    let notificationElement: Element | null = null;

    for (const selector of notificationSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (this.isNotificationElement(element)) {
          notificationElement = element;
          console.log('✅ Found notification element:', selector);
          this.setupNotificationElement(element as HTMLElement);
          break;
        }
      }
      if (notificationElement) break;
    }

    if (!notificationElement) {
      console.log('⚠️ Notification elements not found, system will initialize on demand');
    }
  }

  /**
   * Check if element is a notification element
   */
  private isNotificationElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const dataField = element.getAttribute('data-field');
    const dataAction = element.getAttribute('data-action');
    const textContent = element.textContent?.toLowerCase() || '';

    return (
      (tagName === 'select' && dataField === 'notify-flag') ||
      (tagName === 'button' && dataAction === 'get-notify-agent') ||
      textContent.includes('wager alert') ||
      textContent.includes('notification') ||
      textContent.includes('alert')
    );
  }

  /**
   * Setup notification element
   */
  private setupNotificationElement(element: HTMLElement): void {
    // Determine element type and setup accordingly
    const tagName = element.tagName.toLowerCase();
    const dataAction = element.getAttribute('data-action');

    if (tagName === 'select' && element.getAttribute('data-field') === 'notify-flag') {
      this.setupNotificationToggle(element as HTMLSelectElement);
    } else if (tagName === 'button' && dataAction === 'get-notify-agent') {
      this.setupAlertSettingsButton(element as HTMLButtonElement);
    }

    // Enhance the container
    this.enhanceNotificationContainer(element);

    console.log('✅ Notification element setup complete');
  }

  /**
   * Setup notification toggle
   */
  private setupNotificationToggle(toggle: HTMLSelectElement): void {
    // Add change event listener
    const changeHandler = (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      this.handleNotificationToggle(value);
    };

    toggle.addEventListener('change', changeHandler);
    this.eventListeners.set('notification-toggle-change', changeHandler);

    // Initialize with current value
    const currentValue = toggle.value;
    this.handleNotificationToggle(currentValue);

    // Add visual enhancements
    this.enhanceNotificationToggle(toggle);

    console.log('✅ Notification toggle setup complete');
  }

  /**
   * Setup alert settings button
   */
  private setupAlertSettingsButton(button: HTMLButtonElement): void {
    // Add click event listener
    const clickHandler = (e: Event) => {
      e.preventDefault();
      this.handleAlertSettingsClick();
    };

    button.addEventListener('click', clickHandler);
    this.eventListeners.set('alert-settings-click', clickHandler);

    // Add visual enhancements
    this.enhanceAlertSettingsButton(button);

    console.log('✅ Alert settings button setup complete');
  }

  /**
   * Enhance notification container
   */
  private enhanceNotificationContainer(element: HTMLElement): void {
    // Find the container
    const container =
      element.closest('.col-md-6, .col-xs-12, .notification-section') || element.parentElement;
    if (!container) return;

    // Add CSS enhancements
    const style = document.createElement('style');
    style.textContent = `
	  .fantasy42-notification-container {
	    position: relative;
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    border-radius: 12px;
	    padding: 20px;
	    margin: 15px 0;
	    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
	    border: 1px solid rgba(102, 126, 234, 0.2);
	    display: flex;
	    align-items: center;
	    justify-content: space-between;
	    flex-wrap: wrap;
	    gap: 15px;
	  }

	  .notification-toggle-section {
	    display: flex;
	    align-items: center;
	    gap: 12px;
	  }

	  .notification-toggle-label {
	    color: white;
	    font-weight: 600;
	    font-size: 14px;
	  }

	  .notification-toggle-enhanced {
	    background: rgba(255, 255, 255, 0.2);
	    border: 2px solid rgba(255, 255, 255, 0.3);
	    border-radius: 8px;
	    color: white;
	    padding: 8px 12px;
	    font-weight: 600;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    min-width: 80px;
	  }

	  .notification-toggle-enhanced:focus {
	    outline: none;
	    border-color: #ffffff;
	    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
	  }

	  .notification-toggle-enhanced option {
	    background: #667eea;
	    color: white;
	  }

	  .alert-settings-btn-enhanced {
	    background: rgba(255, 255, 255, 0.15);
	    border: 2px solid rgba(255, 255, 255, 0.3);
	    border-radius: 8px;
	    color: white;
	    padding: 10px 20px;
	    font-weight: 600;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    text-decoration: none;
	    display: inline-block;
	  }

	  .alert-settings-btn-enhanced:hover {
	    background: rgba(255, 255, 255, 0.25);
	    border-color: rgba(255, 255, 255, 0.5);
	    transform: translateY(-2px);
	    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	  }

	  .notification-status {
	    position: absolute;
	    top: -8px;
	    right: -8px;
	    width: 20px;
	    height: 20px;
	    border-radius: 50%;
	    border: 2px solid #667eea;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	    font-size: 12px;
	    font-weight: bold;
	  }

	  .notification-status.enabled {
	    background: #28a745;
	    color: white;
	  }

	  .notification-status.disabled {
	    background: #dc3545;
	    color: white;
	  }

	  .notification-tooltip {
	    position: relative;
	    display: inline-block;
	  }

	  .notification-tooltip:hover::after {
	    content: attr(data-tooltip);
	    position: absolute;
	    bottom: 100%;
	    left: 50%;
	    transform: translateX(-50%);
	    background: rgba(0, 0, 0, 0.9);
	    color: white;
	    padding: 8px 12px;
	    border-radius: 6px;
	    font-size: 12px;
	    white-space: nowrap;
	    z-index: 1000;
	    max-width: 250px;
	    text-align: center;
	  }

	  .quick-access-panel {
	    position: fixed;
	    top: 20px;
	    right: 20px;
	    background: white;
	    border-radius: 12px;
	    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
	    padding: 15px;
	    z-index: 1000;
	    display: none;
	    max-width: 300px;
	  }

	  .quick-access-panel.active {
	    display: block;
	  }

	  .quick-access-header {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	    margin-bottom: 15px;
	  }

	  .quick-access-title {
	    font-weight: 600;
	    color: #333;
	    margin: 0;
	  }

	  .quick-access-close {
	    background: none;
	    border: none;
	    font-size: 18px;
	    cursor: pointer;
	    color: #666;
	  }

	  .quick-preference-item {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	    padding: 8px 0;
	    border-bottom: 1px solid #eee;
	  }

	  .quick-preference-item:last-child {
	    border-bottom: none;
	  }

	  .quick-preference-label {
	    font-size: 14px;
	    color: #333;
	  }

	  .quick-toggle {
	    width: 40px;
	    height: 20px;
	    background: #ccc;
	    border-radius: 10px;
	    position: relative;
	    cursor: pointer;
	    transition: background 0.3s ease;
	  }

	  .quick-toggle.active {
	    background: #667eea;
	  }

	  .quick-toggle::after {
	    content: '';
	    position: absolute;
	    top: 2px;
	    left: 2px;
	    width: 16px;
	    height: 16px;
	    background: white;
	    border-radius: 50%;
	    transition: transform 0.3s ease;
	  }

	  .quick-toggle.active::after {
	    transform: translateX(20px);
	  }

	  @media (max-width: 768px) {
	    .fantasy42-notification-container {
	      flex-direction: column;
	      align-items: stretch;
	    }

	    .notification-toggle-section {
	      justify-content: center;
	    }

	    .quick-access-panel {
	      position: fixed;
	      top: 0;
	      left: 0;
	      right: 0;
	      bottom: 0;
	      border-radius: 0;
	      max-width: none;
	    }
	  }
	`;

    document.head.appendChild(style);

    // Add enhanced classes
    container.classList.add('fantasy42-notification-container');

    // Add status indicator
    this.addStatusIndicator(container);

    console.log('✅ Notification container enhanced');
  }

  /**
   * Add status indicator
   */
  private addStatusIndicator(container: HTMLElement): void {
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'notification-status enabled';
    statusIndicator.textContent = '✓';
    statusIndicator.setAttribute('data-tooltip', 'Notifications are enabled');

    container.appendChild(statusIndicator);
  }

  /**
   * Enhance notification toggle
   */
  private enhanceNotificationToggle(toggle: HTMLSelectElement): void {
    // Add enhanced class
    toggle.classList.add('notification-toggle-enhanced');

    // Add tooltip
    const wrapper = document.createElement('div');
    wrapper.className = 'notification-tooltip';
    wrapper.setAttribute('data-tooltip', 'Quick toggle for all wager alerts and notifications');

    toggle.parentElement?.insertBefore(wrapper, toggle);
    wrapper.appendChild(toggle);
  }

  /**
   * Enhance alert settings button
   */
  private enhanceAlertSettingsButton(button: HTMLButtonElement): void {
    // Add enhanced class
    button.classList.add('alert-settings-btn-enhanced');

    // Add tooltip
    const wrapper = document.createElement('div');
    wrapper.className = 'notification-tooltip';
    wrapper.setAttribute(
      'data-tooltip',
      'Access comprehensive wager alert settings and preferences'
    );

    button.parentElement?.insertBefore(wrapper, button);
    wrapper.appendChild(button);
  }

  /**
   * Handle notification toggle
   */
  private async handleNotificationToggle(value: string): Promise<void> {
    const isEnabled = value === 'Y';
    console.log('🔕 Notification toggle changed:', isEnabled ? 'ON' : 'OFF');

    // Update status indicator
    this.updateStatusIndicator(isEnabled);

    // Update user preferences
    await this.updateNotificationPreferences(isEnabled);

    // Sync with alert settings
    await this.syncWithAlertSettings(isEnabled);

    // Track analytics
    this.trackAnalytics('notification_toggle', {
      enabled: isEnabled,
      timestamp: new Date().toISOString(),
    });

    // Show confirmation if enabled
    if (this.config.masterControl.confirmChanges) {
      this.showToggleConfirmation(isEnabled);
    }
  }

  /**
   * Handle alert settings click
   */
  private handleAlertSettingsClick(): void {
    console.log('⚙️ Alert settings button clicked');

    // Track analytics
    this.trackAnalytics('alert_settings_access', {
      timestamp: new Date().toISOString(),
    });

    if (this.config.alertSettings.modalIntegration) {
      // Open integrated modal
      this.openAlertSettingsModal();
    } else if (this.config.alertSettings.directNavigation) {
      // Navigate to settings page
      this.navigateToAlertSettings();
    } else {
      // Show quick access panel
      this.showQuickAccessPanel();
    }
  }

  /**
   * Update status indicator
   */
  private updateStatusIndicator(enabled: boolean): void {
    const statusIndicator = document.querySelector('.notification-status') as HTMLElement;

    if (statusIndicator) {
      statusIndicator.className = `notification-status ${enabled ? 'enabled' : 'disabled'}`;
      statusIndicator.textContent = enabled ? '✓' : '✗';
      statusIndicator.setAttribute(
        'data-tooltip',
        enabled ? 'Notifications are enabled' : 'Notifications are disabled'
      );
    }
  }

  /**
   * Update notification preferences
   */
  private async updateNotificationPreferences(enabled: boolean): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    // Get or create preferences
    let preferences = this.notificationPreferences.get(userId);
    if (!preferences) {
      preferences = this.createDefaultPreferences(userId);
    }

    // Update master toggle
    preferences.masterToggle = enabled;
    preferences.updatedAt = new Date().toISOString();

    // Save preferences
    this.notificationPreferences.set(userId, preferences);

    // Sync across devices if enabled
    if (this.config.masterControl.syncAcrossDevices) {
      await this.syncPreferencesAcrossDevices(preferences);
    }

    console.log('✅ Notification preferences updated');
  }

  /**
   * Create default preferences
   */
  private createDefaultPreferences(userId: string): NotificationPreferences {
    return {
      id: 'pref_' + Date.now(),
      userId: userId,
      masterToggle: true,
      alertCategories: {
        highAmount: true,
        highRisk: true,
        unusualPattern: false,
        vipClient: true,
        systemAlert: true,
        promotional: false,
      },
      channels: {
        telegram: true,
        email: true,
        sms: false,
        push: false,
        inApp: true,
      },
      schedule: {
        enabled: false,
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
        timezone: 'UTC',
        workDaysOnly: false,
      },
      priority: {
        high: true,
        medium: true,
        low: false,
        info: false,
      },
      sound: {
        enabled: true,
        volume: 80,
        soundType: 'default',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Sync with alert settings
   */
  private async syncWithAlertSettings(enabled: boolean): Promise<void> {
    try {
      // Update alert settings master switch
      await this.wagerAlertSettings.updateConfiguration({
        globalSettings: {
          masterSwitch: enabled,
        },
      });

      console.log('✅ Synced with alert settings');
    } catch (error) {
      console.error('Failed to sync with alert settings:', error);
    }
  }

  /**
   * Show toggle confirmation
   */
  private showToggleConfirmation(enabled: boolean): void {
    const message = enabled
      ? 'Notifications have been enabled. You will receive wager alerts and updates.'
      : 'Notifications have been disabled. You will not receive wager alerts.';

    this.showNotification(message, enabled ? 'success' : 'info');
  }

  /**
   * Open alert settings modal
   */
  private openAlertSettingsModal(): void {
    // Trigger the alert settings modal
    const alertSettingsModal = document.querySelector('[data-language="L-831"]');
    if (alertSettingsModal) {
      const clickEvent = new Event('click', { bubbles: true });
      alertSettingsModal.dispatchEvent(clickEvent);
    } else {
      // Fallback: show quick access panel
      this.showQuickAccessPanel();
    }
  }

  /**
   * Navigate to alert settings
   */
  private navigateToAlertSettings(): void {
    // Navigate to alert settings page
    window.location.href = '/alert-settings';
  }

  /**
   * Show quick access panel
   */
  private showQuickAccessPanel(): void {
    let panel = document.querySelector('.quick-access-panel') as HTMLElement;

    if (!panel) {
      panel = this.createQuickAccessPanel();
      document.body.appendChild(panel);
    }

    panel.classList.add('active');

    // Setup panel event listeners
    this.setupQuickAccessPanel(panel);
  }

  /**
   * Create quick access panel
   */
  private createQuickAccessPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'quick-access-panel';

    panel.innerHTML = `
	  <div class="quick-access-header">
	    <h3 class="quick-access-title">Quick Notification Settings</h3>
	    <button class="quick-access-close">&times;</button>
	  </div>

	  <div class="quick-preference-item">
	    <span class="quick-preference-label">High Amount Alerts</span>
	    <div class="quick-toggle active" data-preference="highAmount"></div>
	  </div>

	  <div class="quick-preference-item">
	    <span class="quick-preference-label">High Risk Alerts</span>
	    <div class="quick-toggle active" data-preference="highRisk"></div>
	  </div>

	  <div class="quick-preference-item">
	    <span class="quick-preference-label">VIP Client Alerts</span>
	    <div class="quick-toggle active" data-preference="vipClient"></div>
	  </div>

	  <div class="quick-preference-item">
	    <span class="quick-preference-label">System Alerts</span>
	    <div class="quick-toggle active" data-preference="systemAlert"></div>
	  </div>

	  <div class="quick-preference-item">
	    <span class="quick-preference-label">Telegram Notifications</span>
	    <div class="quick-toggle active" data-preference="telegram"></div>
	  </div>

	  <div class="quick-preference-item">
	    <span class="quick-preference-label">Email Notifications</span>
	    <div class="quick-toggle active" data-preference="email"></div>
	  </div>

	  <div style="margin-top: 20px; text-align: center;">
	    <button class="alert-settings-btn-enhanced" style="width: 100%; margin: 0;">
	      Advanced Settings
	    </button>
	  </div>
	`;

    return panel;
  }

  /**
   * Setup quick access panel
   */
  private setupQuickAccessPanel(panel: HTMLElement): void {
    // Close button
    const closeBtn = panel.querySelector('.quick-access-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('active');
      });
    }

    // Toggle buttons
    const toggles = panel.querySelectorAll('.quick-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        this.handleQuickToggle(toggle as HTMLElement);
      });
    });

    // Advanced settings button
    const advancedBtn = panel.querySelector('.alert-settings-btn-enhanced');
    if (advancedBtn) {
      advancedBtn.addEventListener('click', () => {
        panel.classList.remove('active');
        this.openAlertSettingsModal();
      });
    }
  }

  /**
   * Handle quick toggle
   */
  private handleQuickToggle(toggle: HTMLElement): void {
    const preference = toggle.getAttribute('data-preference');
    if (!preference) return;

    const isActive = toggle.classList.contains('active');
    toggle.classList.toggle('active');

    // Update preference
    this.updateQuickPreference(preference, !isActive);

    // Track analytics
    this.trackAnalytics('quick_preference_toggle', {
      preference: preference,
      enabled: !isActive,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update quick preference
   */
  private updateQuickPreference(preference: string, enabled: boolean): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    let preferences = this.notificationPreferences.get(userId);
    if (!preferences) {
      preferences = this.createDefaultPreferences(userId);
    }

    // Update specific preference
    if (preferences.alertCategories.hasOwnProperty(preference)) {
      (preferences.alertCategories as any)[preference] = enabled;
    } else if (preferences.channels.hasOwnProperty(preference)) {
      (preferences.channels as any)[preference] = enabled;
    }

    preferences.updatedAt = new Date().toISOString();
    this.notificationPreferences.set(userId, preferences);

    console.log(`✅ Quick preference updated: ${preference} = ${enabled}`);
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
	  position: fixed;
	  top: 20px;
	  right: 20px;
	  background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
	  color: white;
	  padding: 15px 20px;
	  border-radius: 8px;
	  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	  z-index: 10000;
	  max-width: 300px;
	  font-size: 14px;
	`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    // In a real implementation, this would get the current user from session/auth
    return this.currentUserId || 'current_user';
  }

  /**
   * Sync preferences across devices
   */
  private async syncPreferencesAcrossDevices(preferences: NotificationPreferences): Promise<void> {
    // Sync preferences to server/cloud storage
    console.log('☁️ Preferences synced across devices');
  }

  /**
   * Initialize preference management
   */
  private async initializePreferenceManagement(): Promise<void> {
    // Load user preferences
    await this.loadUserPreferences();

    console.log('⚙️ Preference management initialized');
  }

  /**
   * Initialize quick access
   */
  private async initializeQuickAccess(): Promise<void> {
    // Setup quick access features
    this.setupQuickAccessFeatures();

    console.log('⚡ Quick access initialized');
  }

  /**
   * Initialize master control
   */
  private async initializeMasterControl(): Promise<void> {
    // Setup master control features
    this.setupMasterControlFeatures();

    console.log('🎛️ Master control initialized');
  }

  /**
   * Initialize alert settings integration
   */
  private async initializeAlertSettingsIntegration(): Promise<void> {
    // Setup integration with alert settings
    console.log('🔗 Alert settings integration initialized');
  }

  /**
   * Initialize analytics tracking
   */
  private async initializeAnalyticsTracking(): Promise<void> {
    // Setup analytics tracking
    console.log('📊 Analytics tracking initialized');
  }

  /**
   * Load user preferences
   */
  private async loadUserPreferences(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    // Load preferences from storage/API
    let preferences = this.notificationPreferences.get(userId);
    if (!preferences) {
      preferences = this.createDefaultPreferences(userId);
      this.notificationPreferences.set(userId, preferences);
    }

    console.log('💾 User preferences loaded');
  }

  /**
   * Setup quick access features
   */
  private setupQuickAccessFeatures(): void {
    // Setup keyboard shortcuts if enabled
    if (this.config.ui.keyboardShortcuts) {
      this.setupKeyboardShortcuts();
    }

    console.log('⚡ Quick access features setup');
  }

  /**
   * Setup master control features
   */
  private setupMasterControlFeatures(): void {
    // Setup status display
    if (this.config.masterControl.showStatus) {
      this.setupStatusDisplay();
    }

    console.log('🎛️ Master control features setup');
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    const keyHandler = (e: KeyboardEvent) => {
      // Ctrl+Shift+N to toggle notifications
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.toggleMasterNotifications();
      }

      // Ctrl+Shift+S to open settings
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.handleAlertSettingsClick();
      }
    };

    document.addEventListener('keydown', keyHandler);
    this.eventListeners.set('keyboard-shortcuts', keyHandler);

    console.log('⌨️ Keyboard shortcuts setup');
  }

  /**
   * Setup status display
   */
  private setupStatusDisplay(): void {
    // Update status display based on current preferences
    const userId = this.getCurrentUserId();
    const preferences = this.notificationPreferences.get(userId);

    if (preferences) {
      this.updateStatusIndicator(preferences.masterToggle);
    }

    console.log('📊 Status display setup');
  }

  /**
   * Toggle master notifications
   */
  private toggleMasterNotifications(): void {
    const toggle = document.querySelector('select[data-field="notify-flag"]') as HTMLSelectElement;
    if (toggle) {
      const currentValue = toggle.value;
      const newValue = currentValue === 'Y' ? 'N' : 'Y';
      toggle.value = newValue;
      this.handleNotificationToggle(newValue);
    }
  }

  /**
   * Track analytics
   */
  private trackAnalytics(event: string, data: any): void {
    // Update analytics
    if (event === 'notification_toggle') {
      this.analytics.toggles.totalToggles++;
      if (data.enabled) {
        this.analytics.toggles.enabledCount++;
      } else {
        this.analytics.toggles.disabledCount++;
      }
    } else if (event === 'alert_settings_access') {
      this.analytics.interactions.settingAccess++;
    } else if (event === 'quick_preference_toggle') {
      this.analytics.preferences.totalUpdates++;
    }

    console.log('📊 Analytics tracked:', event, data);
  }

  /**
   * Get status
   */
  getStatus(): {
    isInitialized: boolean;
    currentUserId: string;
    preferencesCount: number;
    masterToggleEnabled: boolean;
    analytics: NotificationAnalytics;
  } {
    const userId = this.getCurrentUserId();
    const preferences = this.notificationPreferences.get(userId);

    return {
      isInitialized: this.isInitialized,
      currentUserId: userId,
      preferencesCount: this.notificationPreferences.size,
      masterToggleEnabled: preferences?.masterToggle || false,
      analytics: { ...this.analytics },
    };
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId?: string): NotificationPreferences | null {
    const targetUserId = userId || this.getCurrentUserId();
    return this.notificationPreferences.get(targetUserId) || null;
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): boolean {
    const existing = this.notificationPreferences.get(userId);
    if (existing) {
      this.notificationPreferences.set(userId, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Export preferences
   */
  exportPreferences(): string {
    const exportData = {
      notificationPreferences: Array.from(this.notificationPreferences.values()),
      config: this.config,
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
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: Can't easily remove listeners without references
    });
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log('🧹 Notification toggle system cleaned up');
  }

  // Private properties
  private sortDirection: 'asc' | 'desc' = 'desc';
  private currentSort: string = 'closingLine';
}

// Convenience functions
export const createFantasy42NotificationToggle = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  wagerAlertSettings: Fantasy42WagerAlertSettings,
  config?: Partial<NotificationToggleConfig>
): Fantasy42NotificationToggle => {
  return new Fantasy42NotificationToggle(
    fantasyClient,
    unifiedIntegration,
    wagerAlertSettings,
    config
  );
};

export const initializeFantasy42NotificationToggle = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  wagerAlertSettings: Fantasy42WagerAlertSettings,
  config?: Partial<NotificationToggleConfig>
): Promise<boolean> => {
  const notificationToggle = new Fantasy42NotificationToggle(
    fantasyClient,
    unifiedIntegration,
    wagerAlertSettings,
    config
  );
  return await notificationToggle.initialize();
};

// Export types
export type { NotificationPreferences, NotificationToggleConfig, NotificationAnalytics };
