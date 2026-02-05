/**
 * Fantasy42 Interface Integration
 * Integrates with specific Fantasy42 HTML elements for automated P2P transfers
 * Targets password field, agent selector, and 3rd party ID field
 */

import { Fantasy42P2PAutomation, P2PAutomationConfig } from './fantasy42-p2p-automation';
import { P2PPaymentMatching } from '../payments/p2p-payment-matching';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { EnhancedCashierSystem } from '../cashier/enhanced-cashier-system';

export class Fantasy42InterfaceIntegration {
  private automation: Fantasy42P2PAutomation | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize Fantasy42 interface integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎯 Initializing Fantasy42 Interface Integration...');

      // Create automation configuration
      const config: P2PAutomationConfig = {
        passwordFieldXPath: '//span[@data-language="L-214"]/following::input[@type="password"][1]',
        agentSelectXPath: '//select[@data-field="agent-parent"][@data-column="agent"]',
        thirdPartyIdXPath: '//span[@data-language="L-1145"]/following::input[1]',
        autoTransferEnabled: true,
        minTransferAmount: 10,
        maxTransferAmount: 5000,
        supportedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'],
        riskThreshold: 0.7,
      };

      // Initialize required systems
      const p2pMatching = new P2PPaymentMatching();
      const fantasyClient = new Fantasy42AgentClient('username', 'password');
      const cashierSystem = new EnhancedCashierSystem();

      // Initialize Fantasy42 client
      await fantasyClient.initialize();

      // Create and initialize automation
      this.automation = new Fantasy42P2PAutomation(
        p2pMatching,
        fantasyClient,
        cashierSystem,
        config
      );

      const automationReady = await this.automation.initialize();

      if (automationReady) {
        this.isInitialized = true;
        console.log('✅ Fantasy42 Interface Integration complete');

        // Setup additional interface enhancements
        await this.setupInterfaceEnhancements();

        return true;
      } else {
        console.warn('⚠️ Fantasy42 automation not ready, but interface integration initialized');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Fantasy42 Interface Integration:', error);
      return false;
    }
  }

  /**
   * Setup additional interface enhancements
   */
  private async setupInterfaceEnhancements(): Promise<void> {
    // Add visual indicators for automation status
    await this.addAutomationStatusIndicator();

    // Setup keyboard shortcuts
    await this.setupKeyboardShortcuts();

    // Add quick action buttons
    await this.addQuickActionButtons();

    console.log('✅ Interface enhancements setup');
  }

  /**
   * Add automation status indicator
   */
  private async addAutomationStatusIndicator(): Promise<void> {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'fantasy42-automation-status';
    statusIndicator.innerHTML = `
	  <div class="automation-status-indicator">
	    <span class="status-icon">🤖</span>
	    <span class="status-text">P2P Automation Active</span>
	    <span class="status-dot active"></span>
	  </div>
	`;

    statusIndicator.style.cssText = `
	  position: fixed;
	  top: 10px;
	  right: 10px;
	  background: rgba(40, 167, 69, 0.9);
	  color: white;
	  padding: 8px 12px;
	  border-radius: 20px;
	  font-size: 12px;
	  z-index: 9999;
	  display: flex;
	  align-items: center;
	  gap: 5px;
	`;

    document.body.appendChild(statusIndicator);

    // Add click handler to show automation status
    statusIndicator.addEventListener('click', () => {
      this.showAutomationStatusModal();
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  private async setupKeyboardShortcuts(): Promise<void> {
    document.addEventListener('keydown', event => {
      // Ctrl+Shift+P to process P2P transfer
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        this.processP2PTransferShortcut();
      }

      // Ctrl+Shift+A to toggle automation
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        this.toggleAutomationShortcut();
      }

      // Ctrl+Shift+S to show automation status
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.showAutomationStatusModal();
      }
    });

    console.log(
      '✅ Keyboard shortcuts setup: Ctrl+Shift+P (Process), Ctrl+Shift+A (Toggle), Ctrl+Shift+S (Status)'
    );
  }

  /**
   * Add quick action buttons
   */
  private async addQuickActionButtons(): Promise<void> {
    // Find the agent selection area
    const agentSelect = document.querySelector('select[data-field="agent-parent"]');
    if (!agentSelect) return;

    const quickActionsContainer = document.createElement('div');
    quickActionsContainer.id = 'fantasy42-quick-actions';
    quickActionsContainer.innerHTML = `
	  <div class="quick-actions">
	    <button class="btn-quick-action" id="btn-find-matches" title="Find P2P Matches">
	      🔍 Find Matches
	    </button>
	    <button class="btn-quick-action" id="btn-process-transfer" title="Process Transfer">
	      💸 Process Transfer
	    </button>
	    <button class="btn-quick-action" id="btn-view-status" title="View Automation Status">
	      📊 View Status
	    </button>
	  </div>
	`;

    quickActionsContainer.style.cssText = `
	  display: flex;
	  gap: 5px;
	  margin-top: 5px;
	`;

    const quickActionStyle = document.createElement('style');
    quickActionStyle.textContent = `
	  .btn-quick-action {
	    padding: 4px 8px;
	    font-size: 11px;
	    border: 1px solid #ced4da;
	    background: #f8f9fa;
	    color: #495057;
	    border-radius: 4px;
	    cursor: pointer;
	    transition: all 0.2s;
	  }
	  .btn-quick-action:hover {
	    background: #e9ecef;
	    border-color: #adb5bd;
	  }
	  .btn-quick-action:active {
	    background: #dee2e6;
	  }
	`;

    document.head.appendChild(quickActionStyle);

    // Insert after agent select
    agentSelect.parentElement?.appendChild(quickActionsContainer);

    // Add event listeners
    document.getElementById('btn-find-matches')?.addEventListener('click', () => {
      this.findMatchesAction();
    });

    document.getElementById('btn-process-transfer')?.addEventListener('click', () => {
      this.processTransferAction();
    });

    document.getElementById('btn-view-status')?.addEventListener('click', () => {
      this.showAutomationStatusModal();
    });

    console.log('✅ Quick action buttons added');
  }

  /**
   * Process P2P transfer shortcut
   */
  private async processP2PTransferShortcut(): Promise<void> {
    console.log('⌨️ P2P Transfer shortcut activated');

    if (!this.automation) {
      console.warn('⚠️ Automation not initialized');
      return;
    }

    // Get current values from form
    const thirdPartyId = await this.getThirdPartyIdValue();
    const agentId = await this.getAgentIdValue();

    if (thirdPartyId) {
      console.log('🔄 Processing P2P transfer for:', thirdPartyId);

      // Find matches for this address
      const matches = await this.automation.findImmediateMatches(thirdPartyId);

      if (matches.length > 0) {
        console.log(`🎯 Found ${matches.length} matches, processing...`);
        await this.automation.processImmediateMatches(matches, thirdPartyId);
      } else {
        console.log('❌ No matches found for current address');
      }
    } else {
      console.warn('⚠️ No 3rd party ID found');
    }
  }

  /**
   * Toggle automation shortcut
   */
  private toggleAutomationShortcut(): Promise<void> {
    console.log('⌨️ Toggle automation shortcut activated');

    if (this.automation) {
      const status = this.automation.getStatus();
      if (status.automationActive) {
        this.automation.stop();
        this.updateStatusIndicator('inactive');
        console.log('🛑 Automation stopped');
      } else {
        // Restart automation
        this.automation.initialize();
        this.updateStatusIndicator('active');
        console.log('🚀 Automation restarted');
      }
    }
  }

  /**
   * Show automation status modal
   */
  private showAutomationStatusModal(): void {
    if (!this.automation) return;

    const status = this.automation.getStatus();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'automation-status-modal';
    modal.innerHTML = `
	  <div class="automation-modal-overlay">
	    <div class="automation-modal">
	      <div class="modal-header">
	        <h5>P2P Automation Status</h5>
	        <button class="modal-close">&times;</button>
	      </div>
	      <div class="modal-body">
	        <div class="status-item">
	          <span class="status-label">Automation Active:</span>
	          <span class="status-value ${status.automationActive ? 'active' : 'inactive'}">
	            ${status.automationActive ? '✅ Active' : '❌ Inactive'}
	          </span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Active Transfers:</span>
	          <span class="status-value">${status.activeTransfers}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Auto Transfer:</span>
	          <span class="status-value">${status.config.autoTransferEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Transfer Range:</span>
	          <span class="status-value">$${status.config.minTransferAmount} - $${status.config.maxTransferAmount}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Supported Methods:</span>
	          <span class="status-value">${status.config.supportedPaymentMethods.join(', ')}</span>
	        </div>
	        <div class="status-item">
	          <span class="status-label">Last Activity:</span>
	          <span class="status-value">${new Date(status.lastActivity).toLocaleString()}</span>
	        </div>
	      </div>
	      <div class="modal-footer">
	        <button class="btn-secondary" id="btn-refresh-status">Refresh</button>
	        <button class="btn-primary" id="btn-close-modal">Close</button>
	      </div>
	    </div>
	  </div>
	`;

    // Add modal styles
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
	  .automation-modal-overlay {
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
	  .automation-modal {
	    background: white;
	    border-radius: 8px;
	    width: 90%;
	    max-width: 500px;
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
    modal.querySelector('#btn-close-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-refresh-status')?.addEventListener('click', () => {
      this.showAutomationStatusModal(); // Refresh by reopening
    });

    // Close on overlay click
    modal.querySelector('.automation-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    });

    console.log('📊 Automation status modal displayed');
  }

  /**
   * Find matches action
   */
  private async findMatchesAction(): Promise<void> {
    console.log('🔍 Find matches action triggered');

    const thirdPartyId = await this.getThirdPartyIdValue();
    if (!thirdPartyId) {
      alert('Please enter a 3rd Party ID (payment address) first');
      return;
    }

    if (this.automation) {
      const matches = await this.automation.findImmediateMatches(thirdPartyId);

      if (matches.length > 0) {
        alert(`Found ${matches.length} P2P matches for ${thirdPartyId}! Processing...`);
        await this.automation.processImmediateMatches(matches, thirdPartyId);
      } else {
        alert(
          `No P2P matches found for ${thirdPartyId}. The system will continue monitoring for new matches.`
        );
      }
    }
  }

  /**
   * Process transfer action
   */
  private async processTransferAction(): Promise<void> {
    console.log('💸 Process transfer action triggered');

    const thirdPartyId = await this.getThirdPartyIdValue();
    const agentId = await this.getAgentIdValue();

    if (!thirdPartyId) {
      alert('Please enter a 3rd Party ID (payment address) first');
      return;
    }

    if (!agentId) {
      alert('Please select an agent first');
      return;
    }

    // Show processing modal
    this.showProcessingModal();

    try {
      if (this.automation) {
        const matches = await this.automation.findImmediateMatches(thirdPartyId);

        if (matches.length > 0) {
          await this.automation.processImmediateMatches(matches, thirdPartyId);
          alert('P2P transfer processed successfully!');
        } else {
          alert('No immediate matches found. Transfer request has been queued for processing.');
        }
      }
    } catch (error) {
      console.error('Transfer processing failed:', error);
      alert('Transfer processing failed. Please try again.');
    }

    // Hide processing modal
    this.hideProcessingModal();
  }

  /**
   * Show processing modal
   */
  private showProcessingModal(): void {
    const modal = document.createElement('div');
    modal.id = 'processing-modal';
    modal.innerHTML = `
	  <div class="processing-modal-overlay">
	    <div class="processing-modal">
	      <div class="spinner-border text-primary" role="status">
	        <span class="sr-only">Processing...</span>
	      </div>
	      <h5 class="mt-3">Processing P2P Transfer</h5>
	      <p class="text-muted">Please wait while we process your transfer...</p>
	    </div>
	  </div>
	`;

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
	  .processing-modal-overlay {
	    position: fixed;
	    top: 0;
	    left: 0;
	    width: 100%;
	    height: 100%;
	    background: rgba(0, 0, 0, 0.5);
	    display: flex;
	    justify-content: center;
	    align-items: center;
	    z-index: 10001;
	  }
	  .processing-modal {
	    background: white;
	    padding: 30px;
	    border-radius: 8px;
	    text-align: center;
	    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	  }
	`;

    document.head.appendChild(modalStyle);
    document.body.appendChild(modal);
  }

  /**
   * Hide processing modal
   */
  private hideProcessingModal(): void {
    const modal = document.getElementById('processing-modal');
    if (modal) {
      modal.remove();
    }

    // Remove associated styles
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent?.includes('processing-modal')) {
        style.remove();
      }
    });
  }

  /**
   * Get third party ID value
   */
  private async getThirdPartyIdValue(): Promise<string | null> {
    try {
      const result = await handleFantasy42Element('read');
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Failed to get 3rd party ID:', error);
      return null;
    }
  }

  /**
   * Get agent ID value
   */
  private async getAgentIdValue(): Promise<string | null> {
    const agentSelect = document.querySelector(
      'select[data-field="agent-parent"]'
    ) as HTMLSelectElement;
    return agentSelect?.value || null;
  }

  /**
   * Update status indicator
   */
  private updateStatusIndicator(status: 'active' | 'inactive'): void {
    const indicator = document.getElementById('fantasy42-automation-status');
    if (indicator) {
      const statusDot = indicator.querySelector('.status-dot');
      const statusText = indicator.querySelector('.status-text');

      if (statusDot) {
        statusDot.className = `status-dot ${status}`;
      }

      if (statusText) {
        statusText.textContent =
          status === 'active' ? 'P2P Automation Active' : 'P2P Automation Inactive';
      }

      // Update background color
      indicator.style.background =
        status === 'active' ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)';
    }
  }

  /**
   * Get integration status
   */
  getStatus(): {
    isInitialized: boolean;
    automationStatus: any;
    lastActivity: string;
  } {
    return {
      isInitialized: this.isInitialized,
      automationStatus: this.automation?.getStatus(),
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Cleanup integration
   */
  cleanup(): void {
    if (this.automation) {
      this.automation.stop();
    }

    // Remove added elements
    const statusIndicator = document.getElementById('fantasy42-automation-status');
    if (statusIndicator) {
      statusIndicator.remove();
    }

    const quickActions = document.getElementById('fantasy42-quick-actions');
    if (quickActions) {
      quickActions.remove();
    }

    console.log('🧹 Fantasy42 Interface Integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42InterfaceIntegration = (): Fantasy42InterfaceIntegration => {
  return new Fantasy42InterfaceIntegration();
};

export const initializeFantasy42Interface = async (): Promise<boolean> => {
  const integration = new Fantasy42InterfaceIntegration();
  return await integration.initialize();
};

// Auto-initialize if running in Fantasy42 environment
if (typeof window !== 'undefined' && window.location.hostname.includes('fantasy42')) {
  console.log('🎯 Fantasy42 environment detected, auto-initializing integration...');
  initializeFantasy42Interface().then(success => {
    if (success) {
      console.log('✅ Fantasy42 Interface Integration auto-initialized');
    } else {
      console.log('⚠️ Fantasy42 Interface Integration failed to auto-initialize');
    }
  });
}
