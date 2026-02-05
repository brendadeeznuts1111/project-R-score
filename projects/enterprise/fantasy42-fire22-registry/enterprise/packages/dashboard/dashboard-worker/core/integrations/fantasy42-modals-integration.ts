/**
 * Fantasy42 Modals Integration
 * Comprehensive modal management and enhancement system
 * Targets all player management and betting configuration modals
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface ModalConfig {
  modalId: string;
  titleXPath?: string;
  bodyXPath?: string;
  footerXPath?: string;
  triggerXPath?: string;
  autoOpen?: boolean;
  autoClose?: boolean;
  validationRules?: Record<string, any>;
  enhancementFeatures?: string[];
}

export interface ModalEnhancement {
  modalId: string;
  features: {
    autoFill?: boolean;
    validation?: boolean;
    realTimeUpdates?: boolean;
    smartSuggestions?: boolean;
    exportData?: boolean;
    importData?: boolean;
    keyboardShortcuts?: boolean;
    darkMode?: boolean;
    accessibility?: boolean;
  };
  dataSources?: {
    players?: string;
    bets?: string;
    limits?: string;
    configurations?: string;
  };
  customActions?: Array<{
    name: string;
    action: string;
    icon?: string;
    condition?: string;
  }>;
}

export class Fantasy42ModalsIntegration {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private modalConfigs: Map<string, ModalConfig> = new Map();
  private modalEnhancements: Map<string, ModalEnhancement> = new Map();
  private activeModals: Map<string, HTMLElement> = new Map();
  private modalObservers: Map<string, MutationObserver> = new Map();

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.initializeModalConfigurations();
  }

  /**
   * Initialize modal configurations
   */
  private initializeModalConfigurations(): void {
    // Prop Builder Limit Modal
    this.modalConfigs.set('not-prop-limit-account', {
      modalId: 'not-prop-limit-account',
      titleXPath: '//div[@id="not-prop-limit-account"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="not-prop-limit-account"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="not-prop-limit-account"]//div[@class="modal-footer"]',
      autoClose: true,
      enhancementFeatures: ['autoGuidance', 'playerSearch', 'systemIntegration'],
    });

    // Live Casino Limits Modal
    this.modalConfigs.set('not-live-casino-limits', {
      modalId: 'not-live-casino-limits',
      titleXPath: '//div[@id="not-live-casino-limits"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="not-live-casino-limits"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="not-live-casino-limits"]//div[@class="modal-footer"]',
      autoClose: true,
      enhancementFeatures: ['casinoIntegration', 'playerGuidance'],
    });

    // Coming Soon Modal
    this.modalConfigs.set('coming-soon', {
      modalId: 'coming-soon',
      titleXPath: '//div[@id="coming-soon"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="coming-soon"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="coming-soon"]//div[@class="modal-footer"]',
      autoClose: true,
      enhancementFeatures: ['featurePreview', 'roadmap'],
    });

    // Teaser Configuration Modal
    this.modalConfigs.set('teaser-configuration-by-selections', {
      modalId: 'teaser-configuration-by-selections',
      titleXPath: '//div[@id="teaser-configuration-by-selections"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="teaser-configuration-by-selections"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="teaser-configuration-by-selections"]//div[@class="modal-footer"]',
      enhancementFeatures: [
        'tableEnhancement',
        'bulkOperations',
        'smartValidation',
        'exportImport',
      ],
    });

    // Teaser View Modal
    this.modalConfigs.set('teaser-view', {
      modalId: 'teaser-view',
      titleXPath: '//div[@id="teaser-view"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="teaser-view"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="teaser-view"]//div[@class="modal-footer"]',
      enhancementFeatures: ['dataVisualization', 'performanceMetrics', 'exportData'],
    });

    // Parlay View Modal
    this.modalConfigs.set('parlay-view', {
      modalId: 'parlay-view',
      titleXPath: '//div[@id="parlay-view"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="parlay-view"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="parlay-view"]//div[@class="modal-footer"]',
      enhancementFeatures: ['payoutCalculator', 'riskAssessment', 'exportData'],
    });

    // Parlay Configuration Modal
    this.modalConfigs.set('parlay-configuration-by-selections', {
      modalId: 'parlay-configuration-by-selections',
      titleXPath: '//div[@id="parlay-configuration-by-selections"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="parlay-configuration-by-selections"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="parlay-configuration-by-selections"]//div[@class="modal-footer"]',
      enhancementFeatures: [
        'advancedConfiguration',
        'bulkOperations',
        'smartValidation',
        'performancePreview',
      ],
    });

    // Point Buying Setup Modal
    this.modalConfigs.set('point-buying-setup', {
      modalId: 'point-buying-setup',
      titleXPath: '//div[@id="point-buying-setup"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="point-buying-setup"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="point-buying-setup"]//div[@class="modal-footer"]',
      enhancementFeatures: [
        'sportSpecificConfig',
        'costCalculator',
        'limitValidation',
        'bulkOperations',
      ],
    });

    // Info Message Modal
    this.modalConfigs.set('info-msg', {
      modalId: 'info-msg',
      titleXPath: '//div[@id="info-msg"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="info-msg"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="info-msg"]//div[@class="modal-footer"]',
      autoClose: true,
      enhancementFeatures: ['messageEnhancement', 'actionButtons', 'autoRedirect'],
    });

    // Agent Password Modal
    this.modalConfigs.set('agent-password', {
      modalId: 'agent-password',
      titleXPath: '//div[@id="agent-password"]//h4[@class="modal-title"]',
      bodyXPath: '//div[@id="agent-password"]//div[@class="modal-body"]',
      footerXPath: '//div[@id="agent-password"]//div[@class="modal-footer"]',
      enhancementFeatures: [
        'passwordStrength',
        'securityValidation',
        'autoFill',
        'passwordGenerator',
      ],
    });
  }

  /**
   * Initialize modal enhancements
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚪 Initializing Fantasy42 Modals Integration...');

      // Detect all modals
      const modalsDetected = await this.detectModals();
      if (!modalsDetected) {
        console.warn('⚠️ Some modals not detected');
      }

      // Setup modal observers
      await this.setupModalObservers();

      // Initialize enhancements for each modal
      await this.initializeModalEnhancements();

      // Setup global modal management
      await this.setupGlobalModalManagement();

      console.log('✅ Fantasy42 Modals Integration initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize modals integration:', error);
      return false;
    }
  }

  /**
   * Detect all modals
   */
  private async detectModals(): Promise<boolean> {
    let allDetected = true;

    for (const [modalId, config] of this.modalConfigs) {
      const modal = document.getElementById(modalId);
      if (modal) {
        this.activeModals.set(modalId, modal);
        console.log(`✅ Modal detected: ${modalId}`);
      } else {
        console.warn(`⚠️ Modal not found: ${modalId}`);
        allDetected = false;
      }
    }

    return allDetected;
  }

  /**
   * Setup modal observers
   */
  private async setupModalObservers(): Promise<void> {
    for (const [modalId, modal] of this.activeModals) {
      this.setupModalObserver(modalId, modal);
    }

    console.log('✅ Modal observers setup');
  }

  /**
   * Setup observer for individual modal
   */
  private setupModalObserver(modalId: string, modal: HTMLElement): void {
    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isOpen = modal.classList.contains('show') || modal.classList.contains('in');
          const wasOpen = this.isModalOpen(modalId);

          if (isOpen && !wasOpen) {
            await this.handleModalOpen(modalId, modal);
          } else if (!isOpen && wasOpen) {
            await this.handleModalClose(modalId, modal);
          }
        }
      }
    });

    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class'],
    });

    this.modalObservers.set(modalId, observer);
  }

  /**
   * Handle modal open event
   */
  private async handleModalOpen(modalId: string, modal: HTMLElement): Promise<void> {
    console.log(`📂 Modal opened: ${modalId}`);

    // Apply enhancements for this modal
    await this.applyModalEnhancements(modalId, modal);

    // Track modal state
    this.setModalOpen(modalId, true);

    // Execute modal-specific logic
    await this.executeModalOpenLogic(modalId, modal);
  }

  /**
   * Handle modal close event
   */
  private async handleModalClose(modalId: string, modal: HTMLElement): Promise<void> {
    console.log(`📂 Modal closed: ${modalId}`);

    // Cleanup enhancements
    await this.cleanupModalEnhancements(modalId, modal);

    // Track modal state
    this.setModalOpen(modalId, false);

    // Execute modal-specific close logic
    await this.executeModalCloseLogic(modalId, modal);
  }

  /**
   * Apply modal enhancements
   */
  private async applyModalEnhancements(modalId: string, modal: HTMLElement): Promise<void> {
    const config = this.modalConfigs.get(modalId);
    if (!config?.enhancementFeatures) return;

    for (const feature of config.enhancementFeatures) {
      await this.applyEnhancementFeature(modalId, modal, feature);
    }
  }

  /**
   * Apply specific enhancement feature
   */
  private async applyEnhancementFeature(
    modalId: string,
    modal: HTMLElement,
    feature: string
  ): Promise<void> {
    switch (feature) {
      case 'autoGuidance':
        await this.applyAutoGuidance(modalId, modal);
        break;
      case 'playerSearch':
        await this.applyPlayerSearch(modalId, modal);
        break;
      case 'tableEnhancement':
        await this.applyTableEnhancement(modalId, modal);
        break;
      case 'dataVisualization':
        await this.applyDataVisualization(modalId, modal);
        break;
      case 'payoutCalculator':
        await this.applyPayoutCalculator(modalId, modal);
        break;
      case 'sportSpecificConfig':
        await this.applySportSpecificConfig(modalId, modal);
        break;
      case 'passwordStrength':
        await this.applyPasswordStrength(modalId, modal);
        break;
      default:
        console.log(`Unknown enhancement feature: ${feature}`);
    }
  }

  /**
   * Apply auto guidance for prop builder modal
   */
  private async applyAutoGuidance(modalId: string, modal: HTMLElement): Promise<void> {
    if (modalId !== 'not-prop-limit-account') return;

    const body = modal.querySelector('.modal-body');
    if (!body) return;

    // Add guidance content
    const guidance = document.createElement('div');
    guidance.innerHTML = `
	  <div class="auto-guidance" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
	    <h5 style="margin-top: 0; color: #495057;">🔍 Quick Resolution Steps:</h5>
	    <ol style="margin-bottom: 0; padding-left: 20px;">
	      <li>Ask the player to login to the Prop Builder platform</li>
	      <li>Have them access any prop builder game</li>
	      <li>Return here and refresh the player data</li>
	      <li>Set their limits as needed</li>
	    </ol>
	    <button class="btn btn-primary btn-sm mt-3" id="check-player-status">
	      🔄 Check Player Status
	    </button>
	  </div>
	`;

    body.appendChild(guidance);

    // Add event listener for status check
    const checkBtn = guidance.querySelector('#check-player-status');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => this.checkPlayerPropStatus());
    }
  }

  /**
   * Apply player search functionality
   */
  private async applyPlayerSearch(modalId: string, modal: HTMLElement): Promise<void> {
    if (modalId !== 'not-prop-limit-account') return;

    const body = modal.querySelector('.modal-body');
    if (!body) return;

    // Add search functionality
    const search = document.createElement('div');
    search.innerHTML = `
	  <div class="player-search" style="margin-top: 15px;">
	    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Search Player:</label>
	    <input type="text" id="player-search-input" placeholder="Enter player ID or name"
	           style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
	    <div id="search-results" style="margin-top: 10px; max-height: 150px; overflow-y: auto;"></div>
	  </div>
	`;

    body.appendChild(search);

    // Add search functionality
    const searchInput = search.querySelector('#player-search-input') as HTMLInputElement;
    searchInput.addEventListener('input', e => this.handlePlayerSearch(e));
  }

  /**
   * Apply table enhancements
   */
  private async applyTableEnhancement(modalId: string, modal: HTMLElement): Promise<void> {
    const table = modal.querySelector('table');
    if (!table) return;

    // Add table controls
    const controls = document.createElement('div');
    controls.innerHTML = `
	  <div class="table-controls" style="margin-bottom: 15px; display: flex; gap: 10px;">
	    <button class="btn btn-sm btn-outline-primary" id="export-table">
	      📊 Export Data
	    </button>
	    <button class="btn btn-sm btn-outline-secondary" id="bulk-edit">
	      ✏️ Bulk Edit
	    </button>
	    <button class="btn btn-sm btn-outline-info" id="validate-limits">
	      ✅ Validate Limits
	    </button>
	  </div>
	`;

    const body = modal.querySelector('.modal-body');
    if (body) {
      body.insertBefore(controls, body.firstChild);
    }

    // Add event listeners
    const exportBtn = controls.querySelector('#export-table');
    const bulkEditBtn = controls.querySelector('#bulk-edit');
    const validateBtn = controls.querySelector('#validate-limits');

    if (exportBtn) exportBtn.addEventListener('click', () => this.exportTableData(table));
    if (bulkEditBtn) bulkEditBtn.addEventListener('click', () => this.enableBulkEdit(table));
    if (validateBtn) validateBtn.addEventListener('click', () => this.validateTableLimits(table));
  }

  /**
   * Apply data visualization
   */
  private async applyDataVisualization(modalId: string, modal: HTMLElement): Promise<void> {
    const body = modal.querySelector('.modal-body');
    if (!body) return;

    // Add visualization controls
    const viz = document.createElement('div');
    viz.innerHTML = `
	  <div class="data-visualization" style="margin-bottom: 15px;">
	    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
	      <button class="btn btn-sm btn-outline-primary active" id="view-table">📊 Table</button>
	      <button class="btn btn-sm btn-outline-primary" id="view-chart">📈 Chart</button>
	      <button class="btn btn-sm btn-outline-primary" id="view-stats">📈 Statistics</button>
	    </div>
	    <div id="visualization-container" style="height: 200px; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px;">
	      <!-- Visualization content will be loaded here -->
	    </div>
	  </div>
	`;

    body.insertBefore(viz, body.firstChild);

    // Add visualization controls
    const tableBtn = viz.querySelector('#view-table');
    const chartBtn = viz.querySelector('#view-chart');
    const statsBtn = viz.querySelector('#view-stats');

    if (tableBtn) tableBtn.addEventListener('click', () => this.showTableView());
    if (chartBtn) chartBtn.addEventListener('click', () => this.showChartView());
    if (statsBtn) statsBtn.addEventListener('click', () => this.showStatsView());
  }

  /**
   * Apply payout calculator
   */
  private async applyPayoutCalculator(modalId: string, modal: HTMLElement): Promise<void> {
    const body = modal.querySelector('.modal-body');
    if (!body) return;

    // Add calculator
    const calculator = document.createElement('div');
    calculator.innerHTML = `
	  <div class="payout-calculator" style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
	    <h6 style="margin-top: 0;">💰 Payout Calculator</h6>
	    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
	      <div>
	        <label style="display: block; font-size: 12px;">Bet Amount:</label>
	        <input type="number" id="calc-bet-amount" value="100" style="width: 100%; padding: 5px;">
	      </div>
	      <div>
	        <label style="display: block; font-size: 12px;">Calculated Payout:</label>
	        <input type="text" id="calc-payout" readonly style="width: 100%; padding: 5px; background: #e9ecef;">
	      </div>
	    </div>
	    <button class="btn btn-sm btn-primary mt-2" id="calculate-payout">Calculate</button>
	  </div>
	`;

    body.insertBefore(calculator, body.firstChild);

    // Add calculator functionality
    const calcBtn = calculator.querySelector('#calculate-payout');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => this.calculatePayout());
    }
  }

  /**
   * Apply sport-specific configuration
   */
  private async applySportSpecificConfig(modalId: string, modal: HTMLElement): Promise<void> {
    if (modalId !== 'point-buying-setup') return;

    // Add sport-specific enhancements
    const sportButtons = modal.querySelectorAll('.cl-button-in-gray');
    sportButtons.forEach(button => {
      button.addEventListener('click', e => this.handleSportChange(e));
    });

    // Add configuration presets
    this.addSportPresets(modal);
  }

  /**
   * Apply password strength validation
   */
  private async applyPasswordStrength(modalId: string, modal: HTMLElement): Promise<void> {
    if (modalId !== 'agent-password') return;

    const newPasswordField = modal.querySelector('input[data-field="pass-1"]') as HTMLInputElement;
    if (!newPasswordField) return;

    // Add password strength indicator
    const strengthIndicator = document.createElement('div');
    strengthIndicator.innerHTML = `
	  <div class="password-strength" style="margin-top: 5px;">
	    <div class="strength-meter" style="height: 4px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
	      <div class="strength-fill" style="height: 100%; width: 0%; transition: width 0.3s;"></div>
	    </div>
	    <small class="strength-text" style="display: block; margin-top: 2px;">Password strength</small>
	  </div>
	`;

    newPasswordField.parentElement?.appendChild(strengthIndicator);

    // Add password validation
    newPasswordField.addEventListener('input', e => this.validatePasswordStrength(e));
  }

  // Implementation methods for various features
  private async checkPlayerPropStatus(): Promise<void> {
    console.log('🔍 Checking player Prop Builder status...');
    // Implementation for checking player status
  }

  private async handlePlayerSearch(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const query = input.value;

    if (query.length < 3) return;

    console.log(`🔍 Searching for players: ${query}`);
    // Implementation for player search
  }

  private async exportTableData(table: HTMLTableElement): Promise<void> {
    console.log('📊 Exporting table data...');
    // Implementation for table data export
  }

  private async enableBulkEdit(table: HTMLTableElement): Promise<void> {
    console.log('✏️ Enabling bulk edit mode...');
    // Implementation for bulk edit functionality
  }

  private async validateTableLimits(table: HTMLTableElement): Promise<void> {
    console.log('✅ Validating table limits...');
    // Implementation for limit validation
  }

  private async showTableView(): Promise<void> {
    console.log('📊 Showing table view');
  }

  private async showChartView(): Promise<void> {
    console.log('📈 Showing chart view');
  }

  private async showStatsView(): Promise<void> {
    console.log('📈 Showing statistics view');
  }

  private async calculatePayout(): Promise<void> {
    console.log('💰 Calculating payout...');
    // Implementation for payout calculation
  }

  private async handleSportChange(event: Event): Promise<void> {
    const button = event.target as HTMLElement;
    const sport = button.getAttribute('data-section-in');

    console.log(`🏈 Switching to sport: ${sport}`);
    // Implementation for sport change handling
  }

  private addSportPresets(modal: HTMLElement): void {
    // Add preset configurations for each sport
    console.log('⚙️ Adding sport presets...');
  }

  private async validatePasswordStrength(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const password = input.value;

    // Calculate password strength
    const strength = this.calculatePasswordStrength(password);

    // Update strength indicator
    const strengthFill = input.parentElement?.querySelector('.strength-fill') as HTMLElement;
    const strengthText = input.parentElement?.querySelector('.strength-text') as HTMLElement;

    if (strengthFill && strengthText) {
      strengthFill.style.width = `${strength.score}%`;
      strengthFill.style.backgroundColor = strength.color;
      strengthText.textContent = strength.text;
    }
  }

  private calculatePasswordStrength(password: string): {
    score: number;
    color: string;
    text: string;
  } {
    let score = 0;

    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    let color = '#dc3545'; // red
    let text = 'Weak';

    if (score >= 75) {
      color = '#28a745'; // green
      text = 'Strong';
    } else if (score >= 50) {
      color = '#ffc107'; // yellow
      text = 'Medium';
    }

    return { score, color, text };
  }

  // Modal state management
  private isModalOpen(modalId: string): boolean {
    const modal = this.activeModals.get(modalId);
    return modal ? modal.classList.contains('show') || modal.classList.contains('in') : false;
  }

  private setModalOpen(modalId: string, isOpen: boolean): void {
    // Track modal state
    console.log(`📂 Modal ${modalId} ${isOpen ? 'opened' : 'closed'}`);
  }

  private async executeModalOpenLogic(modalId: string, modal: HTMLElement): Promise<void> {
    // Execute modal-specific open logic
    switch (modalId) {
      case 'teaser-configuration-by-selections':
        await this.loadTeaserConfiguration();
        break;
      case 'parlay-configuration-by-selections':
        await this.loadParlayConfiguration();
        break;
      case 'point-buying-setup':
        await this.loadPointBuyingConfiguration();
        break;
    }
  }

  private async executeModalCloseLogic(modalId: string, modal: HTMLElement): Promise<void> {
    // Execute modal-specific close logic
    console.log(`📂 Executing close logic for ${modalId}`);
  }

  private async cleanupModalEnhancements(modalId: string, modal: HTMLElement): Promise<void> {
    // Cleanup enhancements when modal closes
    console.log(`🧹 Cleaning up enhancements for ${modalId}`);
  }

  private async initializeModalEnhancements(): Promise<void> {
    // Initialize enhancements for all detected modals
    for (const [modalId, modal] of this.activeModals) {
      if (this.isModalOpen(modalId)) {
        await this.applyModalEnhancements(modalId, modal);
      }
    }
  }

  private async setupGlobalModalManagement(): Promise<void> {
    // Setup global modal management features
    console.log('🎛️ Global modal management setup');
  }

  // Data loading methods
  private async loadTeaserConfiguration(): Promise<void> {
    console.log('🎯 Loading teaser configuration...');
  }

  private async loadParlayConfiguration(): Promise<void> {
    console.log('🎲 Loading parlay configuration...');
  }

  private async loadPointBuyingConfiguration(): Promise<void> {
    console.log('🏈 Loading point buying configuration...');
  }

  /**
   * Get modal status
   */
  getModalStatus(): {
    totalModals: number;
    activeModals: number;
    enhancementsApplied: number;
    modalStates: Record<string, boolean>;
  } {
    const modalStates: Record<string, boolean> = {};

    for (const [modalId] of this.modalConfigs) {
      modalStates[modalId] = this.isModalOpen(modalId);
    }

    return {
      totalModals: this.modalConfigs.size,
      activeModals: this.activeModals.size,
      enhancementsApplied: this.modalEnhancements.size,
      modalStates,
    };
  }

  /**
   * Open specific modal
   */
  async openModal(modalId: string): Promise<void> {
    const modal = this.activeModals.get(modalId);
    if (modal) {
      // Trigger modal open
      modal.classList.add('show');
      await this.handleModalOpen(modalId, modal);
    }
  }

  /**
   * Close specific modal
   */
  async closeModal(modalId: string): Promise<void> {
    const modal = this.activeModals.get(modalId);
    if (modal) {
      // Trigger modal close
      modal.classList.remove('show');
      await this.handleModalClose(modalId, modal);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Disconnect all observers
    this.modalObservers.forEach((observer, modalId) => {
      observer.disconnect();
      console.log(`Observer disconnected for modal: ${modalId}`);
    });
    this.modalObservers.clear();

    // Clear active modals
    this.activeModals.clear();

    console.log('🧹 Fantasy42 Modals Integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42ModalsIntegration = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration
): Fantasy42ModalsIntegration => {
  return new Fantasy42ModalsIntegration(fantasyClient, unifiedIntegration);
};

export const initializeFantasy42Modals = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration
): Promise<boolean> => {
  const modalsIntegration = new Fantasy42ModalsIntegration(fantasyClient, unifiedIntegration);
  return await modalsIntegration.initialize();
};

// Export types
export type { ModalConfig, ModalEnhancement };
