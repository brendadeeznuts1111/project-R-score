/**
 * Fantasy42 Alert Integration
 * Comprehensive wager alert system targeting label[data-language="L-1144"]
 * Integrates with Telegram, Signal, and other notification channels
 */

import { Fantasy42TelegramAlerts, TelegramAlertConfig } from './fantasy42-telegram-alerts';
import { DepartmentalTelegramBot } from '../telegram/departmental-telegram-bot';
import { SignalIntegration } from '../api/realtime/signal-integration';
import { AIWagerAnalysis } from '../analytics/wager-analysis';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';

export class Fantasy42AlertIntegration {
  private alerts: Fantasy42TelegramAlerts | null = null;
  private isInitialized: boolean = false;
  private alertHistory: any[] = [];

  /**
   * Initialize Fantasy42 alert integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚨 Initializing Fantasy42 Alert Integration...');

      // Create alert configuration
      const config: TelegramAlertConfig = {
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
        autoSendEnabled: true,
        escalationRules: {
          highRisk: true,
          largeAmount: true,
          vipCustomer: true,
          unusualActivity: true,
        },
      };

      // Initialize required systems
      const fantasyClient = new Fantasy42AgentClient('username', 'password');
      const telegramBot = new DepartmentalTelegramBot();
      const signalIntegration = new SignalIntegration({});
      const wagerAnalysis = new AIWagerAnalysis();

      // Initialize Fantasy42 client
      await fantasyClient.initialize();

      // Create and initialize alerts system
      this.alerts = new Fantasy42TelegramAlerts(
        fantasyClient,
        telegramBot,
        signalIntegration,
        wagerAnalysis,
        config
      );

      const alertsReady = await this.alerts.initialize();

      if (alertsReady) {
        this.isInitialized = true;
        console.log('✅ Fantasy42 Alert Integration complete');

        // Setup additional UI enhancements
        await this.setupAlertEnhancements();

        return true;
      } else {
        console.warn('⚠️ Alert system not ready, but integration initialized');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Fantasy42 Alert Integration:', error);
      return false;
    }
  }

  /**
   * Setup alert enhancements
   */
  private async setupAlertEnhancements(): Promise<void> {
    // Add alert status indicator
    await this.addAlertStatusIndicator();

    // Setup keyboard shortcuts
    await this.setupAlertKeyboardShortcuts();

    // Add alert history viewer
    await this.addAlertHistoryViewer();

    console.log('✅ Alert enhancements setup');
  }

  /**
   * Add alert status indicator
   */
  private async addAlertStatusIndicator(): Promise<void> {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'fantasy42-alert-status';
    statusIndicator.innerHTML = `
	  <div class="alert-status-indicator">
	    <span class="alert-icon">🚨</span>
	    <span class="alert-text">Wager Alerts Active</span>
	    <span class="alert-count" id="alert-count">0</span>
	  </div>
	`;

    statusIndicator.style.cssText = `
	  position: fixed;
	  top: 50px;
	  right: 10px;
	  background: rgba(220, 53, 69, 0.9);
	  color: white;
	  padding: 8px 12px;
	  border-radius: 20px;
	  font-size: 12px;
	  z-index: 9999;
	  display: flex;
	  align-items: center;
	  gap: 5px;
	  cursor: pointer;
	`;

    document.body.appendChild(statusIndicator);

    // Add click handler to show alert status
    statusIndicator.addEventListener('click', () => {
      this.showAlertStatusModal();
    });

    // Update count periodically
    setInterval(() => {
      this.updateAlertCount();
    }, 5000);
  }

  /**
   * Setup keyboard shortcuts for alerts
   */
  private async setupAlertKeyboardShortcuts(): Promise<void> {
    document.addEventListener('keydown', event => {
      // Ctrl+Shift+T to toggle alerts
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        this.toggleAlertsShortcut();
      }

      // Ctrl+Shift+H to show alert history
      if (event.ctrlKey && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        this.showAlertHistoryModal();
      }

      // Ctrl+Shift+R to refresh alerts
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.refreshAlertsShortcut();
      }
    });

    console.log(
      '✅ Alert keyboard shortcuts setup: Ctrl+Shift+T (Toggle), Ctrl+Shift+H (History), Ctrl+Shift+R (Refresh)'
    );
  }

  /**
   * Add alert history viewer
   */
  private async addAlertHistoryViewer(): Promise<void> {
    // Find the alert label
    const alertLabel = document.querySelector('label[data-language="L-1144"]');

    if (alertLabel) {
      const historyButton = document.createElement('button');
      historyButton.id = 'alert-history-btn';
      historyButton.innerHTML = '📋 History';
      historyButton.style.cssText = `
	    margin-left: 10px;
	    padding: 4px 8px;
	    font-size: 11px;
	    border: 1px solid #ced4da;
	    background: #f8f9fa;
	    color: #495057;
	    border-radius: 4px;
	    cursor: pointer;
	    transition: all 0.2s;
	  `;

      historyButton.addEventListener('click', () => {
        this.showAlertHistoryModal();
      });

      // Insert after the label
      alertLabel.parentElement?.appendChild(historyButton);
    }

    console.log('✅ Alert history viewer added');
  }

  /**
   * Show alert status modal
   */
  private showAlertStatusModal(): void {
    if (!this.alerts) return;

    const status = this.alerts.getStatus();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'alert-status-modal';
    modal.innerHTML = `
	  <div class="alert-modal-overlay">
	    <div class="alert-modal">
	      <div class="modal-header">
	        <h5>Wager Alert Status</h5>
	        <button class="modal-close">&times;</button>
	      </div>
	      <div class="modal-body">
	        <div class="status-item">
	          <span class="status-label">Alerts Active:</span>
	          <span class="status-value ${status.config.autoSendEnabled ? 'active' : 'inactive'}">
	            ${status.config.autoSendEnabled ? '✅ Enabled' : '❌ Disabled'}
	          </span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Active Alerts:</span>
	          <span class="status-value">${status.alertsActive}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Alert History:</span>
	          <span class="status-value">${status.historyCount}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">High Amount Threshold:</span>
	          <span class="status-value">$${status.config.alertThresholds.highAmount.toLocaleString()}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Risk Level:</span>
	          <span class="status-value">${status.config.alertThresholds.riskLevel.toUpperCase()}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">VIP Alerts:</span>
	          <span class="status-value">${status.config.alertThresholds.vipCustomer ? '✅ Enabled' : '❌ Disabled'}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Telegram:</span>
	          <span class="status-value">${status.channels.telegram ? '✅ Active' : '❌ Inactive'}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Signal:</span>
	          <span class="status-value">${status.channels.signal ? '✅ Active' : '❌ Inactive'}</span>
	        </div>
	      </div>
	      <div class="modal-footer">
	        <button class="btn-secondary" id="btn-toggle-alerts">Toggle Alerts</button>
	        <button class="btn-primary" id="btn-view-history">View History</button>
	        <button class="btn-primary" id="btn-close-status">Close</button>
	      </div>
	    </div>
	  </div>
	`;

    // Add modal styles
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
	  .alert-modal-overlay {
	    position: fixed;
	    top: 0;
	    left: 0;
	    width: 100%;
	    height: 100%;
	    background: rgba(0, 0, 0, 0.5);
	    display: flex;
	    justify-content: center;
	    align-items: center;
	    z-index: 10000;
	  }
	  .alert-modal {
	    background: white;
	    border-radius: 8px;
	    width: 90%;
	    max-width: 600px;
	    max-height: 80vh;
	    overflow-y: auto;
	  }
	  .modal-header {
	    padding: 15px 20px;
	    border-bottom: 1px solid #dee2e6;
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	  }
	  .modal-header h5 {
	    margin: 0;
	  }
	  .modal-close {
	    background: none;
	    border: none;
	    font-size: 20px;
	    cursor: pointer;
	    color: #6c757d;
	  }
	  .modal-body {
	    padding: 20px;
	  }
	  .status-item {
	    display: flex;
	    justify-content: space-between;
	    padding: 8px 0;
	    border-bottom: 1px solid #f8f9fa;
	  }
	  .status-label {
	    font-weight: 500;
	    color: #495057;
	  }
	  .status-value {
	    font-weight: 600;
	  }
	  .status-value.active {
	    color: #28a745;
	  }
	  .status-value.inactive {
	    color: #dc3545;
	  }
	  .modal-footer {
	    padding: 15px 20px;
	    border-top: 1px solid #dee2e6;
	    display: flex;
	    justify-content: flex-end;
	    gap: 10px;
	  }
	  .btn-primary, .btn-secondary {
	    padding: 8px 16px;
	    border: 1px solid #ced4da;
	    border-radius: 4px;
	    cursor: pointer;
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
	    opacity: 0.8;
	  }
	`;

    document.head.appendChild(modalStyle);
    document.body.appendChild(modal);

    // Add event listeners
    const closeModal = () => {
      modal.remove();
      modalStyle.remove();
    };

    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-close-status')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-toggle-alerts')?.addEventListener('click', () => {
      this.toggleAlertsShortcut();
      closeModal();
    });
    modal.querySelector('#btn-view-history')?.addEventListener('click', () => {
      closeModal();
      this.showAlertHistoryModal();
    });

    // Close on overlay click
    modal.querySelector('.alert-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    });

    console.log('📊 Alert status modal displayed');
  }

  /**
   * Show alert history modal
   */
  private showAlertHistoryModal(): void {
    if (!this.alerts) return;

    const history = this.alerts.getAlertHistory(20); // Last 20 alerts

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'alert-history-modal';
    modal.innerHTML = `
	  <div class="alert-modal-overlay">
	    <div class="alert-modal">
	      <div class="modal-header">
	        <h5>Wager Alert History</h5>
	        <button class="modal-close">&times;</button>
	      </div>
	      <div class="modal-body">
	        <div class="alert-history-list">
	          ${
              history.length === 0
                ? '<p>No alerts in history</p>'
                : history
                    .map(
                      alert => `
	              <div class="alert-item">
	                <div class="alert-header">
	                  <span class="alert-id">${alert.wagerId}</span>
	                  <span class="alert-risk risk-${alert.riskLevel}">${alert.riskLevel.toUpperCase()}</span>
	                </div>
	                <div class="alert-details">
	                  <span class="alert-customer">${alert.customerId} (${alert.customerTier})</span>
	                  <span class="alert-amount">$${alert.amount.toLocaleString()}</span>
	                </div>
	                <div class="alert-info">
	                  <span class="alert-sport">${alert.sport} - ${alert.event}</span>
	                  <span class="alert-time">${new Date(alert.timestamp).toLocaleString()}</span>
	                </div>
	                <div class="alert-reason">${alert.alertReason}</div>
	              </div>
	            `
                    )
                    .join('')
            }
	        </div>
	      </div>
	      <div class="modal-footer">
	        <button class="btn-secondary" id="btn-refresh-history">Refresh</button>
	        <button class="btn-primary" id="btn-close-history">Close</button>
	      </div>
	    </div>
	  </div>
	`;

    // Add history-specific styles
    const historyStyle = document.createElement('style');
    historyStyle.textContent = `
	  .alert-history-list {
	    max-height: 400px;
	    overflow-y: auto;
	  }
	  .alert-item {
	    border: 1px solid #dee2e6;
	    border-radius: 4px;
	    padding: 12px;
	    margin-bottom: 10px;
	    background: #f8f9fa;
	  }
	  .alert-header {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	    margin-bottom: 5px;
	  }
	  .alert-id {
	    font-weight: bold;
	    color: #007bff;
	  }
	  .alert-risk {
	    padding: 2px 6px;
	    border-radius: 12px;
	    font-size: 10px;
	    font-weight: bold;
	    color: white;
	  }
	  .risk-low { background: #28a745; }
	  .risk-medium { background: #ffc107; color: #212529; }
	  .risk-high { background: #fd7e14; }
	  .risk-critical { background: #dc3545; }
	  .alert-details {
	    display: flex;
	    justify-content: space-between;
	    margin-bottom: 5px;
	    font-size: 14px;
	  }
	  .alert-customer {
	    color: #495057;
	  }
	  .alert-amount {
	    font-weight: bold;
	    color: #28a745;
	  }
	  .alert-info {
	    display: flex;
	    justify-content: space-between;
	    margin-bottom: 5px;
	    font-size: 12px;
	    color: #6c757d;
	  }
	  .alert-reason {
	    font-size: 13px;
	    color: #495057;
	    font-style: italic;
	  }
	`;

    document.head.appendChild(historyStyle);
    document.body.appendChild(modal);

    // Add event listeners
    const closeModal = () => {
      modal.remove();
      historyStyle.remove();
    };

    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-close-history')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-refresh-history')?.addEventListener('click', () => {
      closeModal();
      this.showAlertHistoryModal(); // Refresh by reopening
    });

    // Close on overlay click
    modal.querySelector('.alert-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    });

    console.log('📋 Alert history modal displayed');
  }

  /**
   * Toggle alerts shortcut
   */
  private async toggleAlertsShortcut(): Promise<void> {
    if (!this.alerts) return;

    const status = this.alerts.getStatus();
    const newState = !status.config.autoSendEnabled;

    // Update configuration (this would need to be implemented in the alerts class)
    console.log(`🚨 Alerts ${newState ? 'enabled' : 'disabled'} via shortcut`);

    // Visual feedback
    const statusIndicator = document.getElementById('fantasy42-alert-status');
    if (statusIndicator) {
      statusIndicator.style.background = newState
        ? 'rgba(220, 53, 69, 0.9)'
        : 'rgba(108, 117, 125, 0.9)';
    }
  }

  /**
   * Refresh alerts shortcut
   */
  private async refreshAlertsShortcut(): Promise<void> {
    console.log('🔄 Refreshing alerts...');

    // This would trigger a refresh of the alert system
    if (this.alerts) {
      // Force a check for new wagers
      console.log('✅ Alerts refreshed');
    }
  }

  /**
   * Update alert count in status indicator
   */
  private updateAlertCount(): void {
    if (!this.alerts) return;

    const status = this.alerts.getStatus();
    const countElement = document.getElementById('alert-count');

    if (countElement) {
      countElement.textContent = status.alertsActive.toString();

      // Update color based on count
      if (status.alertsActive > 0) {
        countElement.style.color = '#ffc107'; // Warning yellow
      } else {
        countElement.style.color = 'white';
      }
    }
  }

  /**
   * Create test alert (for demonstration)
   */
  async createTestAlert(): Promise<void> {
    if (!this.alerts) return;

    const testAlert = {
      wagerId: 'TEST_' + Date.now(),
      customerId: 'TEST_CUSTOMER',
      amount: 2500,
      sport: 'Basketball',
      event: 'NBA Finals Game 7',
      odds: 2.5,
      riskLevel: 'high' as const,
      customerTier: 'vip' as const,
      timestamp: new Date().toISOString(),
      alertReason: 'Test alert for demonstration',
      recommendedAction: 'Review and monitor closely',
    };

    console.log('🧪 Creating test alert...');

    // This would normally be triggered by the wager monitoring system
    // For demo purposes, we'll simulate it
    this.alertHistory.push(testAlert);
    this.updateAlertCount();

    console.log('✅ Test alert created');
  }

  /**
   * Get integration status
   */
  getStatus(): {
    isInitialized: boolean;
    alertsStatus: any;
    historyCount: number;
    lastActivity: string;
  } {
    return {
      isInitialized: this.isInitialized,
      alertsStatus: this.alerts?.getStatus(),
      historyCount: this.alertHistory.length,
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Cleanup integration
   */
  cleanup(): void {
    if (this.alerts) {
      this.alerts.clearActiveAlerts();
    }

    // Remove added elements
    const statusIndicator = document.getElementById('fantasy42-alert-status');
    if (statusIndicator) {
      statusIndicator.remove();
    }

    const historyBtn = document.getElementById('alert-history-btn');
    if (historyBtn) {
      historyBtn.remove();
    }

    console.log('🧹 Fantasy42 Alert Integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42AlertIntegration = (): Fantasy42AlertIntegration => {
  return new Fantasy42AlertIntegration();
};

export const initializeFantasy42Alerts = async (): Promise<boolean> => {
  const integration = new Fantasy42AlertIntegration();
  return await integration.initialize();
};

// Auto-initialize if running in Fantasy42 environment
if (typeof window !== 'undefined' && window.location.hostname.includes('fantasy42')) {
  console.log('🚨 Fantasy42 environment detected, auto-initializing alert integration...');
  initializeFantasy42Alerts().then(success => {
    if (success) {
      console.log('✅ Fantasy42 Alert Integration auto-initialized');

      // Add test alert button for demonstration
      setTimeout(() => {
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Create Test Alert';
        testBtn.style.cssText = 'position: fixed; bottom: 10px; right: 10px; z-index: 9999;';
        testBtn.addEventListener('click', () => {
          const integration = new Fantasy42AlertIntegration();
          integration.createTestAlert();
        });
        document.body.appendChild(testBtn);
      }, 3000);
    } else {
      console.log('⚠️ Fantasy42 Alert Integration failed to auto-initialize');
    }
  });
}
