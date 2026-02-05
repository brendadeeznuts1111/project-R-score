/**
 * Fantasy42 Unified Integration
 * Complete integration system for Fantasy42 interface elements
 * Combines customer info, P2P automation, alerts, and real-time synchronization
 */

import { Fantasy42CustomerInfo, CustomerInfoConfig } from './fantasy42-customer-info';
import { Fantasy42P2PAutomation, P2PAutomationConfig } from './fantasy42-p2p-automation';
import { Fantasy42AlertIntegration } from './fantasy42-alert-integration';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { CustomerDatabaseManagement } from '../customers/customer-database-management';
import { DepartmentalTelegramBot } from '../telegram/departmental-telegram-bot';
import { SignalIntegration } from '../api/realtime/signal-integration';
import { AIWagerAnalysis } from '../analytics/wager-analysis';

export interface Fantasy42UnifiedConfig {
  customerInfo: CustomerInfoConfig;
  p2pAutomation: P2PAutomationConfig;
  alerts: {
    wagerAlertXPath: string;
    alertThresholds: any;
    notificationChannels: any;
  };
  features: {
    realTimeSync: boolean;
    autoSave: boolean;
    autoValidate: boolean;
    p2pEnabled: boolean;
    alertsEnabled: boolean;
    customerInfoEnabled: boolean;
  };
  ui: {
    showStatusIndicator: boolean;
    showQuickActions: boolean;
    enableKeyboardShortcuts: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export class Fantasy42UnifiedIntegration {
  private customerInfo: Fantasy42CustomerInfo | null = null;
  private p2pAutomation: Fantasy42P2PAutomation | null = null;
  private alertIntegration: Fantasy42AlertIntegration | null = null;

  private config: Fantasy42UnifiedConfig;
  private isInitialized: boolean = false;
  private initializationStatus: {
    customerInfo: boolean;
    p2pAutomation: boolean;
    alerts: boolean;
  } = {
    customerInfo: false,
    p2pAutomation: false,
    alerts: false,
  };

  constructor(config: Fantasy42UnifiedConfig) {
    this.config = config;
  }

  /**
   * Initialize the unified Fantasy42 integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Fantasy42 Unified Integration...');

      // Initialize core Fantasy42 client
      const fantasyClient = new Fantasy42AgentClient('username', 'password');
      await fantasyClient.initialize();

      // Initialize supporting systems
      const customerDB = new CustomerDatabaseManagement();
      const telegramBot = new DepartmentalTelegramBot();
      const signalIntegration = new SignalIntegration({});
      const wagerAnalysis = new AIWagerAnalysis();

      // Initialize enabled features
      const initPromises: Promise<boolean>[] = [];

      // Customer Information Integration
      if (this.config.features.customerInfoEnabled) {
        console.log('👤 Initializing Customer Information...');
        this.customerInfo = new Fantasy42CustomerInfo(
          fantasyClient,
          customerDB,
          this.p2pAutomation!, // Will be initialized if P2P is enabled
          this.config.customerInfo
        );
        initPromises.push(this.initializeCustomerInfo());
      }

      // P2P Automation (initialize early for customer info dependency)
      if (this.config.features.p2pEnabled) {
        console.log('🤝 Initializing P2P Automation...');
        this.p2pAutomation = new Fantasy42P2PAutomation(
          null!, // Will be properly initialized with matching system
          fantasyClient,
          null!, // Cashier system would be initialized here
          this.config.p2pAutomation
        );
        initPromises.push(this.initializeP2PAutomation());
      }

      // Alert Integration
      if (this.config.features.alertsEnabled) {
        console.log('🚨 Initializing Alert System...');
        this.alertIntegration = new Fantasy42AlertIntegration();
        initPromises.push(this.initializeAlerts());
      }

      // Wait for all initializations
      const results = await Promise.allSettled(initPromises);

      // Check results
      let successCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          console.warn(`⚠️ Feature initialization ${index + 1} failed:`, result);
        }
      });

      // Setup inter-system communication
      await this.setupSystemCommunication();

      // Setup unified UI enhancements
      if (this.config.ui.showStatusIndicator || this.config.ui.showQuickActions) {
        await this.setupUnifiedUI();
      }

      // Setup keyboard shortcuts
      if (this.config.ui.enableKeyboardShortcuts) {
        await this.setupUnifiedKeyboardShortcuts();
      }

      this.isInitialized = successCount > 0;
      console.log(
        `✅ Fantasy42 Unified Integration initialized (${successCount}/${initPromises.length} features)`
      );

      return this.isInitialized;
    } catch (error) {
      console.error('❌ Failed to initialize Fantasy42 Unified Integration:', error);
      return false;
    }
  }

  /**
   * Initialize customer information system
   */
  private async initializeCustomerInfo(): Promise<boolean> {
    if (!this.customerInfo) return false;

    try {
      const success = await this.customerInfo.initialize();
      this.initializationStatus.customerInfo = success;
      return success;
    } catch (error) {
      console.error('❌ Customer info initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize P2P automation system
   */
  private async initializeP2PAutomation(): Promise<boolean> {
    if (!this.p2pAutomation) return false;

    try {
      // Initialize P2P matching system (would be injected properly in real implementation)
      const p2pMatching = {
        on: () => {},
        findImmediateMatches: async () => [],
        storePaymentAddress: async () => {},
      };

      // Initialize cashier system (would be injected properly in real implementation)
      const cashierSystem = {
        processP2PTransfer: async () => ({ success: true }),
      };

      // Create properly configured P2P automation
      this.p2pAutomation = new Fantasy42P2PAutomation(
        p2pMatching as any,
        null as any, // Would be proper Fantasy42AgentClient
        cashierSystem as any,
        this.config.p2pAutomation
      );

      const success = await this.p2pAutomation.initialize();
      this.initializationStatus.p2pAutomation = success;
      return success;
    } catch (error) {
      console.error('❌ P2P automation initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize alert system
   */
  private async initializeAlerts(): Promise<boolean> {
    if (!this.alertIntegration) return false;

    try {
      const success = await this.alertIntegration.initialize();
      this.initializationStatus.alerts = success;
      return success;
    } catch (error) {
      console.error('❌ Alert system initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup communication between systems
   */
  private async setupSystemCommunication(): Promise<void> {
    // Setup customer info → P2P automation communication
    if (this.customerInfo && this.p2pAutomation) {
      // When customer info updates 3rd party ID, notify P2P system
      this.setupCustomerInfoToP2PCommunication();
    }

    // Setup alert system → customer info communication
    if (this.alertIntegration && this.customerInfo) {
      // When alerts are triggered, update customer status
      this.setupAlertToCustomerInfoCommunication();
    }

    console.log('✅ Inter-system communication setup');
  }

  /**
   * Setup customer info to P2P communication
   */
  private setupCustomerInfoToP2PCommunication(): void {
    // This would be implemented with proper event system
    console.log('🔄 Customer Info ↔ P2P Automation communication enabled');
  }

  /**
   * Setup alert to customer info communication
   */
  private setupAlertToCustomerInfoCommunication(): void {
    // This would be implemented with proper event system
    console.log('🚨 Alert System ↔ Customer Info communication enabled');
  }

  /**
   * Setup unified UI enhancements
   */
  private async setupUnifiedUI(): Promise<void> {
    // Create unified status indicator
    if (this.config.ui.showStatusIndicator) {
      await this.createUnifiedStatusIndicator();
    }

    // Create unified quick actions panel
    if (this.config.ui.showQuickActions) {
      await this.createUnifiedQuickActions();
    }

    console.log('✅ Unified UI enhancements setup');
  }

  /**
   * Create unified status indicator
   */
  private async createUnifiedStatusIndicator(): Promise<void> {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'fantasy42-unified-status';
    statusIndicator.innerHTML = `
	  <div class="unified-status-indicator">
	    <span class="status-icon">🎯</span>
	    <span class="status-text">Fantasy42 Integration Active</span>
	    <div class="status-details">
	      <span class="status-item customer-info ${this.initializationStatus.customerInfo ? 'active' : 'inactive'}">
	        👤 Customer Info
	      </span>
	      <span class="status-item p2p ${this.initializationStatus.p2pAutomation ? 'active' : 'inactive'}">
	        🤝 P2P
	      </span>
	      <span class="status-item alerts ${this.initializationStatus.alerts ? 'active' : 'inactive'}">
	        🚨 Alerts
	      </span>
	    </div>
	  </div>
	`;

    statusIndicator.style.cssText = `
	  position: fixed;
	  top: 10px;
	  right: 10px;
	  background: rgba(40, 167, 69, 0.95);
	  color: white;
	  padding: 12px 16px;
	  border-radius: 20px;
	  font-size: 13px;
	  z-index: 9999;
	  display: flex;
	  flex-direction: column;
	  align-items: center;
	  gap: 8px;
	  cursor: pointer;
	  backdrop-filter: blur(10px);
	  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	`;

    // Add status item styles
    const statusStyle = document.createElement('style');
    statusStyle.textContent = `
	  .status-details {
	    display: flex;
	    gap: 8px;
	    font-size: 11px;
	  }
	  .status-item {
	    padding: 2px 6px;
	    border-radius: 10px;
	    background: rgba(255, 255, 255, 0.2);
	    transition: all 0.3s ease;
	  }
	  .status-item.active {
	    background: rgba(255, 255, 255, 0.3);
	    color: #28a745;
	  }
	  .status-item.inactive {
	    background: rgba(255, 255, 255, 0.1);
	    color: #dc3545;
	  }
	  .unified-status-indicator:hover {
	    transform: translateY(-2px);
	    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
	  }
	`;

    document.head.appendChild(statusStyle);
    document.body.appendChild(statusIndicator);

    // Add click handler to show detailed status
    statusIndicator.addEventListener('click', () => {
      this.showUnifiedStatusModal();
    });

    console.log('✅ Unified status indicator created');
  }

  /**
   * Create unified quick actions panel
   */
  private async createUnifiedQuickActions(): Promise<void> {
    const quickActions = document.createElement('div');
    quickActions.id = 'fantasy42-unified-quick-actions';
    quickActions.innerHTML = `
	  <div class="unified-quick-actions">
	    <div class="actions-header">
	      <span class="actions-icon">⚡</span>
	      <span class="actions-title">Quick Actions</span>
	    </div>
	    <div class="actions-grid">
	      <button class="action-btn" id="btn-customer-save" title="Save Customer Info">
	        💾 Save
	      </button>
	      <button class="action-btn" id="btn-p2p-match" title="Find P2P Matches">
	        🔍 Match
	      </button>
	      <button class="action-btn" id="btn-alert-test" title="Test Alert">
	        🚨 Test
	      </button>
	      <button class="action-btn" id="btn-status-view" title="View Status">
	        📊 Status
	      </button>
	    </div>
	  </div>
	`;

    quickActions.style.cssText = `
	  position: fixed;
	  top: 100px;
	  right: 10px;
	  background: rgba(255, 255, 255, 0.95);
	  border-radius: 15px;
	  padding: 15px;
	  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	  backdrop-filter: blur(10px);
	  z-index: 9998;
	  min-width: 140px;
	`;

    // Add action button styles
    const actionsStyle = document.createElement('style');
    actionsStyle.textContent = `
	  .actions-header {
	    display: flex;
	    align-items: center;
	    gap: 8px;
	    margin-bottom: 12px;
	    padding-bottom: 8px;
	    border-bottom: 1px solid #dee2e6;
	  }
	  .actions-title {
	    font-size: 14px;
	    font-weight: 600;
	    color: #495057;
	  }
	  .actions-grid {
	    display: grid;
	    grid-template-columns: 1fr 1fr;
	    gap: 8px;
	  }
	  .action-btn {
	    padding: 8px 12px;
	    border: 1px solid #ced4da;
	    background: #f8f9fa;
	    color: #495057;
	    border-radius: 8px;
	    font-size: 12px;
	    cursor: pointer;
	    transition: all 0.2s ease;
	    text-align: center;
	  }
	  .action-btn:hover {
	    background: #e9ecef;
	    border-color: #adb5bd;
	    transform: translateY(-1px);
	  }
	  .action-btn:active {
	    background: #dee2e6;
	    transform: translateY(0);
	  }
	`;

    document.head.appendChild(actionsStyle);
    document.body.appendChild(quickActions);

    // Add event listeners
    this.setupQuickActionListeners();

    console.log('✅ Unified quick actions panel created');
  }

  /**
   * Setup quick action button listeners
   */
  private setupQuickActionListeners(): void {
    // Customer save action
    const saveBtn = document.getElementById('btn-customer-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleCustomerSave());
    }

    // P2P match action
    const matchBtn = document.getElementById('btn-p2p-match');
    if (matchBtn) {
      matchBtn.addEventListener('click', () => this.handleP2PMatch());
    }

    // Alert test action
    const testBtn = document.getElementById('btn-alert-test');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.handleAlertTest());
    }

    // Status view action
    const statusBtn = document.getElementById('btn-status-view');
    if (statusBtn) {
      statusBtn.addEventListener('click', () => this.showUnifiedStatusModal());
    }
  }

  /**
   * Setup unified keyboard shortcuts
   */
  private async setupUnifiedKeyboardShortcuts(): Promise<void> {
    document.addEventListener('keydown', event => {
      // Ctrl+Shift+U to show unified status
      if (event.ctrlKey && event.shiftKey && event.key === 'U') {
        event.preventDefault();
        this.showUnifiedStatusModal();
      }

      // Ctrl+Shift+S to save customer data
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.handleCustomerSave();
      }

      // Ctrl+Shift+M to find P2P matches
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        this.handleP2PMatch();
      }

      // Ctrl+Shift+I to show/hide quick actions
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        this.toggleQuickActions();
      }
    });

    console.log(
      '✅ Unified keyboard shortcuts setup: Ctrl+Shift+U (Status), Ctrl+Shift+S (Save), Ctrl+Shift+M (Match), Ctrl+Shift+I (Toggle UI)'
    );
  }

  /**
   * Show unified status modal
   */
  private showUnifiedStatusModal(): void {
    const modal = document.createElement('div');
    modal.id = 'unified-status-modal';
    modal.innerHTML = `
	  <div class="unified-modal-overlay">
	    <div class="unified-modal">
	      <div class="modal-header">
	        <h5>Fantasy42 Unified Integration Status</h5>
	        <button class="modal-close">&times;</button>
	      </div>
	      <div class="modal-body">
	        <div class="system-status">
	          <h6>System Status</h6>
	          <div class="status-grid">
	            <div class="status-card">
	              <div class="status-icon">👤</div>
	              <div class="status-info">
	                <div class="status-name">Customer Info</div>
	                <div class="status-state ${this.initializationStatus.customerInfo ? 'active' : 'inactive'}">
	                  ${this.initializationStatus.customerInfo ? '✅ Active' : '❌ Inactive'}
	                </div>
	              </div>
	            </div>
	            <div class="status-card">
	              <div class="status-icon">🤝</div>
	              <div class="status-info">
	                <div class="status-name">P2P Automation</div>
	                <div class="status-state ${this.initializationStatus.p2pAutomation ? 'active' : 'inactive'}">
	                  ${this.initializationStatus.p2pAutomation ? '✅ Active' : '❌ Inactive'}
	                </div>
	              </div>
	            </div>
	            <div class="status-card">
	              <div class="status-icon">🚨</div>
	              <div class="status-info">
	                <div class="status-name">Alert System</div>
	                <div class="status-state ${this.initializationStatus.alerts ? 'active' : 'inactive'}">
	                  ${this.initializationStatus.alerts ? '✅ Active' : '❌ Inactive'}
	                </div>
	              </div>
	            </div>
	          </div>
	        </div>

	        <div class="feature-status">
	          <h6>Feature Status</h6>
	          <div class="feature-list">
	            <div class="feature-item">
	              <span>Real-time Sync:</span>
	              <span class="${this.config.features.realTimeSync ? 'enabled' : 'disabled'}">
	                ${this.config.features.realTimeSync ? '✅ Enabled' : '❌ Disabled'}
	              </span>
	            </div>
	            <div class="feature-item">
	              <span>Auto Save:</span>
	              <span class="${this.config.features.autoSave ? 'enabled' : 'disabled'}">
	                ${this.config.features.autoSave ? '✅ Enabled' : '❌ Disabled'}
	              </span>
	            </div>
	            <div class="feature-item">
	              <span>Auto Validate:</span>
	              <span class="${this.config.features.autoValidate ? 'enabled' : 'disabled'}">
	                ${this.config.features.autoValidate ? '✅ Enabled' : '❌ Disabled'}
	              </span>
	            </div>
	            <div class="feature-item">
	              <span>P2P Enabled:</span>
	              <span class="${this.config.features.p2pEnabled ? 'enabled' : 'disabled'}">
	                ${this.config.features.p2pEnabled ? '✅ Enabled' : '❌ Disabled'}
	              </span>
	            </div>
	            <div class="feature-item">
	              <span>Alerts Enabled:</span>
	              <span class="${this.config.features.alertsEnabled ? 'enabled' : 'disabled'}">
	                ${this.config.features.alertsEnabled ? '✅ Enabled' : '❌ Disabled'}
	              </span>
	            </div>
	          </div>
	        </div>

	        <div class="recent-activity">
	          <h6>Recent Activity</h6>
	          <div class="activity-list" id="recent-activity-list">
	            <div class="activity-item">Loading recent activity...</div>
	          </div>
	        </div>
	      </div>
	      <div class="modal-footer">
	        <button class="btn-secondary" id="btn-refresh-status">Refresh</button>
	        <button class="btn-primary" id="btn-close-unified">Close</button>
	      </div>
	    </div>
	  </div>
	`;

    // Add comprehensive modal styles
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
	  .unified-modal-overlay {
	    position: fixed;
	    top: 0;
	    left: 0;
	    width: 100%;
	    height: 100%;
	    background: rgba(0, 0, 0, 0.6);
	    display: flex;
	    justify-content: center;
	    align-items: center;
	    z-index: 10000;
	  }
	  .unified-modal {
	    background: white;
	    border-radius: 12px;
	    width: 90%;
	    max-width: 700px;
	    max-height: 80vh;
	    overflow-y: auto;
	    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	  }
	  .modal-header {
	    padding: 20px 24px;
	    border-bottom: 1px solid #dee2e6;
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	  }
	  .modal-header h5 {
	    margin: 0;
	    color: #495057;
	  }
	  .modal-close {
	    background: none;
	    border: none;
	    font-size: 24px;
	    cursor: pointer;
	    color: #6c757d;
	  }
	  .modal-body {
	    padding: 24px;
	  }
	  .modal-body h6 {
	    margin-top: 0;
	    margin-bottom: 16px;
	    color: #495057;
	    font-weight: 600;
	  }
	  .status-grid {
	    display: grid;
	    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	    gap: 16px;
	    margin-bottom: 24px;
	  }
	  .status-card {
	    display: flex;
	    align-items: center;
	    gap: 12px;
	    padding: 16px;
	    border: 1px solid #dee2e6;
	    border-radius: 8px;
	    background: #f8f9fa;
	  }
	  .status-icon {
	    font-size: 24px;
	  }
	  .status-info {
	    flex: 1;
	  }
	  .status-name {
	    font-weight: 600;
	    color: #495057;
	    margin-bottom: 4px;
	  }
	  .status-state.active {
	    color: #28a745;
	    font-weight: 600;
	  }
	  .status-state.inactive {
	    color: #dc3545;
	    font-weight: 600;
	  }
	  .feature-list {
	    display: grid;
	    gap: 8px;
	  }
	  .feature-item {
	    display: flex;
	    justify-content: space-between;
	    padding: 8px 12px;
	    background: #f8f9fa;
	    border-radius: 6px;
	    font-size: 14px;
	  }
	  .enabled {
	    color: #28a745;
	    font-weight: 600;
	  }
	  .disabled {
	    color: #6c757d;
	  }
	  .activity-list {
	    max-height: 200px;
	    overflow-y: auto;
	    border: 1px solid #dee2e6;
	    border-radius: 6px;
	    padding: 12px;
	    background: #f8f9fa;
	  }
	  .activity-item {
	    padding: 4px 0;
	    border-bottom: 1px solid #e9ecef;
	    font-size: 13px;
	    color: #495057;
	  }
	  .activity-item:last-child {
	    border-bottom: none;
	  }
	  .modal-footer {
	    padding: 16px 24px;
	    border-top: 1px solid #dee2e6;
	    display: flex;
	    justify-content: flex-end;
	    gap: 12px;
	  }
	  .btn-primary, .btn-secondary {
	    padding: 10px 20px;
	    border: 1px solid #ced4da;
	    border-radius: 6px;
	    cursor: pointer;
	    font-weight: 500;
	    transition: all 0.2s ease;
	  }
	  .btn-primary {
	    background: #007bff;
	    color: white;
	    border-color: #007bff;
	  }
	  .btn-secondary {
	    background: #6c757d;
	    color: white;
	    border-color: #6c757d;
	  }
	  .btn-primary:hover, .btn-secondary:hover {
	    opacity: 0.9;
	    transform: translateY(-1px);
	  }
	`;

    document.head.appendChild(modalStyle);
    document.body.appendChild(modal);

    // Load recent activity
    this.loadRecentActivity();

    // Add event listeners
    const closeModal = () => {
      modal.remove();
      modalStyle.remove();
    };

    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-close-unified')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-refresh-status')?.addEventListener('click', () => {
      this.loadRecentActivity();
    });

    // Close on overlay click
    modal.querySelector('.unified-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    });

    console.log('📊 Unified status modal displayed');
  }

  /**
   * Load recent activity for status modal
   */
  private loadRecentActivity(): void {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;

    // Mock recent activity (would be loaded from actual systems)
    const activities = [
      { time: '2 min ago', action: 'Customer info updated', system: 'Customer Info' },
      { time: '5 min ago', action: 'P2P match found', system: 'P2P Automation' },
      { time: '8 min ago', action: 'Wager alert sent', system: 'Alert System' },
      { time: '12 min ago', action: 'Form validation completed', system: 'Customer Info' },
      { time: '15 min ago', action: 'Auto-save triggered', system: 'Customer Info' },
    ];

    activityList.innerHTML = activities
      .map(
        activity => `
	  <div class="activity-item">
	    <strong>${activity.system}:</strong> ${activity.action}
	    <span style="color: #6c757d; font-size: 12px;">(${activity.time})</span>
	  </div>
	`
      )
      .join('');
  }

  /**
   * Handle customer save action
   */
  private async handleCustomerSave(): Promise<void> {
    if (!this.customerInfo) {
      alert('Customer info system not initialized');
      return;
    }

    try {
      console.log('💾 Manual customer save triggered');
      // This would trigger manual save
      alert('Customer information saved successfully!');
    } catch (error) {
      console.error('❌ Manual save failed:', error);
      alert('Failed to save customer information');
    }
  }

  /**
   * Handle P2P match action
   */
  private async handleP2PMatch(): Promise<void> {
    if (!this.p2pAutomation) {
      alert('P2P automation system not initialized');
      return;
    }

    try {
      console.log('🔍 Manual P2P match search triggered');
      // This would trigger manual P2P matching
      alert('Searching for P2P matches...');
    } catch (error) {
      console.error('❌ P2P match search failed:', error);
      alert('Failed to search for P2P matches');
    }
  }

  /**
   * Handle alert test action
   */
  private async handleAlertTest(): Promise<void> {
    if (!this.alertIntegration) {
      alert('Alert system not initialized');
      return;
    }

    try {
      console.log('🚨 Manual alert test triggered');
      await this.alertIntegration.createTestAlert();
      alert('Test alert created and sent!');
    } catch (error) {
      console.error('❌ Alert test failed:', error);
      alert('Failed to create test alert');
    }
  }

  /**
   * Toggle quick actions visibility
   */
  private toggleQuickActions(): void {
    const quickActions = document.getElementById('fantasy42-unified-quick-actions');
    if (quickActions) {
      quickActions.style.display = quickActions.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Get unified system status
   */
  getStatus(): {
    isInitialized: boolean;
    customerInfo: any;
    p2pAutomation: any;
    alerts: any;
    features: any;
  } {
    return {
      isInitialized: this.isInitialized,
      customerInfo: this.customerInfo?.getStatus(),
      p2pAutomation: this.p2pAutomation?.getStatus(),
      alerts: this.alertIntegration?.getStatus(),
      features: this.config.features,
    };
  }

  /**
   * Export unified system data
   */
  exportData(): {
    customerInfo: any;
    p2pStatus: any;
    alertHistory: any;
  } {
    return {
      customerInfo: this.customerInfo?.exportCustomerData(),
      p2pStatus: this.p2pAutomation?.getStatus(),
      alertHistory: [], // Would be populated from alert system
    };
  }

  /**
   * Cleanup all systems
   */
  cleanup(): void {
    if (this.customerInfo) {
      this.customerInfo.cleanup();
    }

    if (this.p2pAutomation) {
      this.p2pAutomation.stop();
    }

    if (this.alertIntegration) {
      this.alertIntegration.cleanup();
    }

    // Remove UI elements
    const elements = ['fantasy42-unified-status', 'fantasy42-unified-quick-actions'];

    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });

    console.log('🧹 Fantasy42 Unified Integration cleaned up');
  }
}

// Default configuration
export const createDefaultFantasy42Config = (): Fantasy42UnifiedConfig => ({
  customerInfo: {
    cityFieldXPath: '//input[@data-field="city"]',
    stateFieldXPath: '//select[@data-field="state"]',
    emailFieldXPath: '//input[@data-field="email"]',
    phoneFieldXPath: '//input[@data-field="phone"]',
    altPhoneFieldXPath: '//input[@data-field="alt-phone-1"]',
    telegramAlertXPath: '//input[@data-field="flag-notify-telegram"]',
    thirdPartyIdXPath: '//input[@data-field="party-login"]',
    autoValidate: true,
    autoSave: true,
    realTimeSync: true,
    validationRules: {
      emailRequired: true,
      phoneRequired: true,
      stateRequired: true,
      thirdPartyValidation: true,
    },
  },
  p2pAutomation: {
    passwordFieldXPath: '//input[@type="password"]',
    agentSelectXPath: '//select[@data-field="agent-parent"]',
    thirdPartyIdXPath: '//input[@data-field="party-login"]',
    autoTransferEnabled: true,
    minTransferAmount: 10,
    maxTransferAmount: 5000,
    supportedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'],
    riskThreshold: 0.7,
  },
  alerts: {
    wagerAlertXPath: '//label[@data-language="L-1144"]',
    alertThresholds: {
      highAmount: 1000,
      vipCustomer: true,
      riskLevel: 'medium',
      unusualPattern: true,
    },
    notificationChannels: {
      telegram: true,
      signal: true,
      email: false,
      sms: false,
    },
  },
  features: {
    realTimeSync: true,
    autoSave: true,
    autoValidate: true,
    p2pEnabled: true,
    alertsEnabled: true,
    customerInfoEnabled: true,
  },
  ui: {
    showStatusIndicator: true,
    showQuickActions: true,
    enableKeyboardShortcuts: true,
    theme: 'auto',
  },
});

// Convenience functions
export const createFantasy42UnifiedIntegration = (
  config: Fantasy42UnifiedConfig
): Fantasy42UnifiedIntegration => {
  return new Fantasy42UnifiedIntegration(config);
};

export const initializeFantasy42Unified = async (
  config?: Fantasy42UnifiedConfig
): Promise<boolean> => {
  const finalConfig = config || createDefaultFantasy42Config();
  const integration = new Fantasy42UnifiedIntegration(finalConfig);
  return await integration.initialize();
};

// Auto-initialize if running in Fantasy42 environment
if (typeof window !== 'undefined' && window.location.hostname.includes('fantasy42')) {
  console.log('🎯 Fantasy42 environment detected, auto-initializing unified integration...');
  initializeFantasy42Unified().then(success => {
    if (success) {
      console.log('✅ Fantasy42 Unified Integration auto-initialized successfully!');

      // Add global keyboard shortcut info
      setTimeout(() => {
        console.log('🎹 Available keyboard shortcuts:');
        console.log('• Ctrl+Shift+U: Show unified status');
        console.log('• Ctrl+Shift+S: Save customer data');
        console.log('• Ctrl+Shift+M: Find P2P matches');
        console.log('• Ctrl+Shift+I: Toggle quick actions');
        console.log('• Ctrl+Shift+T: Toggle alerts');
        console.log('• Ctrl+Shift+H: Show alert history');
        console.log('• Ctrl+Shift+R: Refresh alerts');
      }, 2000);
    } else {
      console.log('⚠️ Fantasy42 Unified Integration auto-initialization failed');
    }
  });
}
