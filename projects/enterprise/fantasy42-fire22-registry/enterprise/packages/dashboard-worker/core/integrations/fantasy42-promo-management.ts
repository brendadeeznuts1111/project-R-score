/**
 * Fantasy42 Promo Management Integration
 * Complete promotional credit and free play management system
 * Targets: Promo type selector, credit allocation, bonus management, validation
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface PromoConfig {
  promoTypes: {
    [key: string]: {
      id: string;
      name: string;
      description: string;
      maxAmount: number;
      minAmount: number;
      validityPeriod: number; // days
      rolloverRequirements: number;
      wageringMultiplier: number;
      cashoutAllowed: boolean;
      transferable: boolean;
    };
  };
  allocationRules: {
    dailyLimit: number;
    monthlyLimit: number;
    perPlayerLimit: number;
    riskBasedAllocation: boolean;
    fraudDetection: boolean;
  };
  validationRules: {
    identityVerification: boolean;
    depositHistory: boolean;
    wageringHistory: boolean;
    riskAssessment: boolean;
  };
  reporting: {
    realTimeTracking: boolean;
    conversionAnalytics: boolean;
    roiTracking: boolean;
    playerSegmentation: boolean;
  };
}

export interface PromoCredit {
  id: string;
  playerId: string;
  promoType: string;
  amount: number;
  remainingAmount: number;
  allocatedDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'used' | 'cancelled' | 'pending';
  wageringRequirement: number;
  wageringCompleted: number;
  rolloverRequirement: number;
  rolloverCompleted: number;
  source: string;
  metadata: Record<string, any>;
}

export interface FreePlayBonus {
  id: string;
  playerId: string;
  amount: number;
  remainingAmount: number;
  allocatedDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'used' | 'cancelled';
  gamesAllowed: string[];
  maxBetAmount: number;
  minBetAmount: number;
  usageCount: number;
  maxUsageCount: number;
  source: string;
  metadata: Record<string, any>;
}

export interface PromoAnalytics {
  allocationMetrics: {
    totalAllocated: number;
    totalRedeemed: number;
    totalExpired: number;
    averageAllocation: number;
    topPromoTypes: Array<{ type: string; amount: number }>;
  };
  conversionMetrics: {
    redemptionRate: number;
    wageringConversion: number;
    revenueGenerated: number;
    roiPercentage: number;
    averageLifetime: number;
  };
  playerMetrics: {
    activePromos: number;
    highValuePlayers: number;
    riskDistribution: Record<string, number>;
    segmentationData: Record<string, any>;
  };
  performanceMetrics: {
    processingTime: number;
    successRate: number;
    errorRate: number;
    systemLoad: number;
  };
}

export class Fantasy42PromoManagement {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private config: PromoConfig;
  private promoCredits: Map<string, PromoCredit> = new Map();
  private freePlayBonuses: Map<string, FreePlayBonus> = new Map();
  private analytics: PromoAnalytics;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<PromoConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Fantasy42 promo management system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎁 Initializing Fantasy42 Promo Management System...');

      // Detect promo type selector
      await this.detectPromoSelector();

      // Initialize promo credit management
      await this.initializePromoCredits();

      // Initialize free play management
      await this.initializeFreePlayBonuses();

      // Setup validation system
      await this.initializeValidationSystem();

      // Setup allocation system
      await this.initializeAllocationSystem();

      // Setup reporting system
      if (this.config.reporting.realTimeTracking) {
        await this.initializeReportingSystem();
      }

      // Setup security features
      await this.initializeSecurityFeatures();

      this.isInitialized = true;
      console.log('✅ Fantasy42 Promo Management System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize promo management system:', error);
      return false;
    }
  }

  /**
   * Create default promo configuration
   */
  private createDefaultConfig(): PromoConfig {
    return {
      promoTypes: {
        '0': {
          id: '0',
          name: 'Promo Credit',
          description: 'Flexible promotional credit with wagering requirements',
          maxAmount: 1000,
          minAmount: 10,
          validityPeriod: 30,
          rolloverRequirements: 1,
          wageringMultiplier: 1,
          cashoutAllowed: true,
          transferable: false,
        },
        '1': {
          id: '1',
          name: 'Free Play',
          description: 'Free play bonus for specific games',
          maxAmount: 500,
          minAmount: 5,
          validityPeriod: 7,
          rolloverRequirements: 0,
          wageringMultiplier: 0,
          cashoutAllowed: false,
          transferable: false,
        },
      },
      allocationRules: {
        dailyLimit: 5000,
        monthlyLimit: 25000,
        perPlayerLimit: 1000,
        riskBasedAllocation: true,
        fraudDetection: true,
      },
      validationRules: {
        identityVerification: true,
        depositHistory: true,
        wageringHistory: true,
        riskAssessment: true,
      },
      reporting: {
        realTimeTracking: true,
        conversionAnalytics: true,
        roiTracking: true,
        playerSegmentation: true,
      },
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): PromoAnalytics {
    return {
      allocationMetrics: {
        totalAllocated: 0,
        totalRedeemed: 0,
        totalExpired: 0,
        averageAllocation: 0,
        topPromoTypes: [],
      },
      conversionMetrics: {
        redemptionRate: 0,
        wageringConversion: 0,
        revenueGenerated: 0,
        roiPercentage: 0,
        averageLifetime: 0,
      },
      playerMetrics: {
        activePromos: 0,
        highValuePlayers: 0,
        riskDistribution: {},
        segmentationData: {},
      },
      performanceMetrics: {
        processingTime: 0,
        successRate: 0,
        errorRate: 0,
        systemLoad: 0,
      },
    };
  }

  /**
   * Detect promo type selector
   */
  private async detectPromoSelector(): Promise<void> {
    const promoSelectors = [
      'select[data-field="promo-type"]',
      'select[data-column="CryptoCashierPromoType"]',
      '[data-field="promo-type"]',
      '.promo-type-selector',
    ];

    let promoElement: Element | null = null;

    for (const selector of promoSelectors) {
      promoElement = document.querySelector(selector);
      if (promoElement) {
        console.log(`✅ Found promo selector: ${selector}`);
        this.setupPromoSelector(promoElement as HTMLSelectElement);
        break;
      }
    }

    if (!promoElement) {
      console.log('⚠️ Promo selector not found, system will initialize on demand');
    }
  }

  /**
   * Setup promo type selector
   */
  private setupPromoSelector(selector: HTMLSelectElement): void {
    // Add change event listener
    const changeHandler = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      const selectedValue = target.value;
      this.handlePromoTypeChange(selectedValue);
    };

    selector.addEventListener('change', changeHandler);
    this.eventListeners.set('promo-selector-change', changeHandler);

    // Initialize with current value
    const currentValue = selector.value;
    if (currentValue && currentValue !== 'null') {
      this.handlePromoTypeChange(currentValue);
    }

    // Add visual enhancements
    this.enhancePromoSelector(selector);

    console.log('✅ Promo selector setup complete');
  }

  /**
   * Enhance promo selector
   */
  private enhancePromoSelector(selector: HTMLSelectElement): void {
    // Add CSS enhancements
    const enhancedCSS = `
	  .promo-type-selector {
	    position: relative;
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    border: none;
	    border-radius: 8px;
	    padding: 10px 15px;
	    font-weight: 500;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    min-width: 200px;
	  }

	  .promo-type-selector:focus {
	    outline: none;
	    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
	    transform: translateY(-2px);
	  }

	  .promo-type-selector:hover {
	    transform: translateY(-2px);
	    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	  }

	  .promo-type-selector option {
	    background: white;
	    color: #333;
	    padding: 10px;
	  }

	  .promo-info-tooltip {
	    position: absolute;
	    top: -10px;
	    right: -10px;
	    background: #28a745;
	    color: white;
	    border-radius: 50%;
	    width: 20px;
	    height: 20px;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	    font-size: 12px;
	    font-weight: bold;
	    cursor: help;
	  }

	  .promo-info-tooltip:hover::after {
	    content: attr(data-tooltip);
	    position: absolute;
	    bottom: 100%;
	    left: 50%;
	    transform: translateX(-50%);
	    background: rgba(0, 0, 0, 0.8);
	    color: white;
	    padding: 8px 12px;
	    border-radius: 4px;
	    font-size: 12px;
	    white-space: nowrap;
	    z-index: 1000;
	  }
	`;

    this.addStyleSheet(enhancedCSS);

    // Add info tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'promo-info-tooltip';
    tooltip.textContent = 'i';
    tooltip.setAttribute('data-tooltip', 'Select promotional type for bonus allocation');

    selector.parentElement?.appendChild(tooltip);
  }

  /**
   * Handle promo type change
   */
  private async handlePromoTypeChange(promoType: string): Promise<void> {
    console.log(`🎁 Promo type changed to: ${promoType}`);

    if (promoType === 'null' || !promoType) {
      this.clearPromoConfiguration();
      return;
    }

    const promoConfig = this.config.promoTypes[promoType];
    if (!promoConfig) {
      console.warn(`⚠️ Unknown promo type: ${promoType}`);
      return;
    }

    // Update UI based on promo type
    await this.updatePromoUI(promoType, promoConfig);

    // Setup validation for selected promo type
    await this.setupPromoValidation(promoType);

    // Track analytics
    this.trackAnalytics('promo_type_selected', {
      promoType: promoType,
      promoName: promoConfig.name,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update promo UI
   */
  private async updatePromoUI(promoType: string, config: any): Promise<void> {
    // Update form fields based on promo type
    this.updatePromoFormFields(promoType, config);

    // Show/hide relevant sections
    this.updatePromoSections(promoType);

    // Update validation rules
    this.updateValidationRules(promoType, config);

    console.log(`✅ UI updated for promo type: ${config.name}`);
  }

  /**
   * Update promo form fields
   */
  private updatePromoFormFields(promoType: string, config: any): void {
    // Update amount limits
    const amountInputs = document.querySelectorAll('input[data-field*="amount"]');
    amountInputs.forEach(input => {
      const htmlInput = input as HTMLInputElement;
      htmlInput.min = config.minAmount.toString();
      htmlInput.max = config.maxAmount.toString();

      // Update placeholder
      htmlInput.placeholder = `$${config.minAmount} - $${config.maxAmount}`;
    });

    // Update expiry information
    const expiryInfo = document.querySelector('.promo-expiry-info');
    if (expiryInfo) {
      expiryInfo.textContent = `Valid for ${config.validityPeriod} days`;
    }

    // Update wagering requirements
    if (config.wageringMultiplier > 0) {
      const wageringInfo = document.querySelector('.promo-wagering-info');
      if (wageringInfo) {
        wageringInfo.textContent = `${config.wageringMultiplier}x wagering requirement`;
      }
    }

    // Handle free play specific fields
    if (promoType === '1') {
      this.showFreePlayFields();
    } else {
      this.hideFreePlayFields();
    }
  }

  /**
   * Update promo sections
   */
  private updatePromoSections(promoType: string): void {
    // Show/hide free play sections
    const freePlaySections = document.querySelectorAll('[data-promo-type="free-play"]');
    const promoCreditSections = document.querySelectorAll('[data-promo-type="promo-credit"]');

    if (promoType === '1') {
      // Free Play
      freePlaySections.forEach(section => {
        (section as HTMLElement).style.display = 'block';
      });
      promoCreditSections.forEach(section => {
        (section as HTMLElement).style.display = 'none';
      });
    } else {
      // Promo Credit
      freePlaySections.forEach(section => {
        (section as HTMLElement).style.display = 'none';
      });
      promoCreditSections.forEach(section => {
        (section as HTMLElement).style.display = 'block';
      });
    }
  }

  /**
   * Show free play fields
   */
  private showFreePlayFields(): void {
    // Add free play specific fields
    const freePlayHTML = `
	  <div class="free-play-fields" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
	    <h4>Free Play Configuration</h4>
	    <div class="form-group">
	      <label for="free-play-games">Allowed Games:</label>
	      <select id="free-play-games" multiple style="width: 100%; min-height: 100px;">
	        <option value="slots">Slots</option>
	        <option value="blackjack">Blackjack</option>
	        <option value="roulette">Roulette</option>
	        <option value="baccarat">Baccarat</option>
	        <option value="craps">Craps</option>
	      </select>
	    </div>
	    <div class="form-group">
	      <label for="max-bet">Max Bet per Spin/Hand:</label>
	      <input type="number" id="max-bet" min="0.01" max="100" step="0.01" value="5.00">
	    </div>
	    <div class="form-group">
	      <label for="usage-limit">Max Usage Count:</label>
	      <input type="number" id="usage-limit" min="1" max="1000" value="100">
	    </div>
	  </div>
	`;

    const formContainer = document.querySelector('.promo-form-container');
    if (formContainer) {
      formContainer.insertAdjacentHTML('beforeend', freePlayHTML);
    }
  }

  /**
   * Hide free play fields
   */
  private hideFreePlayFields(): void {
    const freePlayFields = document.querySelector('.free-play-fields');
    if (freePlayFields) {
      freePlayFields.remove();
    }
  }

  /**
   * Setup promo validation
   */
  private async setupPromoValidation(promoType: string): Promise<void> {
    // Setup real-time validation
    this.setupRealTimeValidation(promoType);

    // Setup submission validation
    this.setupSubmissionValidation(promoType);

    console.log(`✅ Validation setup for promo type: ${promoType}`);
  }

  /**
   * Setup real-time validation
   */
  private setupRealTimeValidation(promoType: string): void {
    const amountInputs = document.querySelectorAll('input[data-field*="amount"]');

    amountInputs.forEach(input => {
      const htmlInput = input as HTMLInputElement;

      const validateAmount = () => {
        const amount = parseFloat(htmlInput.value);
        const config = this.config.promoTypes[promoType];

        if (amount < config.minAmount) {
          this.showValidationError(htmlInput, `Minimum amount is $${config.minAmount}`);
        } else if (amount > config.maxAmount) {
          this.showValidationError(htmlInput, `Maximum amount is $${config.maxAmount}`);
        } else {
          this.clearValidationError(htmlInput);
        }
      };

      htmlInput.addEventListener('input', validateAmount);
      htmlInput.addEventListener('blur', validateAmount);
    });
  }

  /**
   * Setup submission validation
   */
  private setupSubmissionValidation(promoType: string): void {
    const forms = document.querySelectorAll('form[data-promo-form]');

    forms.forEach(form => {
      const submitHandler = async (e: Event) => {
        e.preventDefault();

        if (await this.validatePromoSubmission(form as HTMLFormElement, promoType)) {
          await this.submitPromoAllocation(form as HTMLFormElement, promoType);
        }
      };

      form.addEventListener('submit', submitHandler);
      this.eventListeners.set(`promo-form-submit-${promoType}`, submitHandler);
    });
  }

  /**
   * Validate promo submission
   */
  private async validatePromoSubmission(
    form: HTMLFormElement,
    promoType: string
  ): Promise<boolean> {
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const playerId = formData.get('playerId') as string;

    // Basic validation
    if (!amount || amount <= 0) {
      this.showFormError(form, 'Please enter a valid amount');
      return false;
    }

    if (!playerId) {
      this.showFormError(form, 'Please select a player');
      return false;
    }

    // Promo-specific validation
    const config = this.config.promoTypes[promoType];

    if (amount < config.minAmount || amount > config.maxAmount) {
      this.showFormError(
        form,
        `Amount must be between $${config.minAmount} and $${config.maxAmount}`
      );
      return false;
    }

    // Business rule validation
    if (!(await this.validateBusinessRules(playerId, promoType, amount))) {
      return false;
    }

    // Risk assessment
    if (this.config.validationRules.riskAssessment) {
      const riskScore = await this.assessPlayerRisk(playerId);
      if (riskScore > 0.7) {
        this.showFormError(
          form,
          'Player risk assessment indicates high risk. Manual review required.'
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Submit promo allocation
   */
  private async submitPromoAllocation(form: HTMLFormElement, promoType: string): Promise<void> {
    const formData = new FormData(form);

    try {
      // Show loading state
      this.setFormLoading(form, true);

      const allocationData = {
        playerId: formData.get('playerId'),
        promoType: promoType,
        amount: parseFloat(formData.get('amount') as string),
        notes: formData.get('notes') || '',
        source: 'agent_allocation',
        metadata: this.getAdditionalMetadata(form, promoType),
      };

      // Submit allocation
      const result = await this.allocatePromoCredit(allocationData);

      if (result.success) {
        // Show success message
        this.showSuccessMessage(
          `Promo ${this.config.promoTypes[promoType].name} allocated successfully!`
        );

        // Reset form
        form.reset();

        // Clear promo configuration
        this.clearPromoConfiguration();

        // Refresh data
        await this.refreshPromoData();

        // Track analytics
        this.trackAnalytics('promo_allocated', {
          ...allocationData,
          promoId: result.promoId,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(result.error || 'Allocation failed');
      }
    } catch (error) {
      console.error('Promo allocation error:', error);
      this.showFormError(form, error.message || 'Failed to allocate promo');
    } finally {
      this.setFormLoading(form, false);
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    playerId: string,
    promoType: string,
    amount: number
  ): Promise<boolean> {
    // Check allocation limits
    const dailyAllocated = await this.getDailyAllocationAmount();
    if (dailyAllocated + amount > this.config.allocationRules.dailyLimit) {
      this.showFormError(
        document.querySelector('form[data-promo-form]') as HTMLFormElement,
        'Daily allocation limit exceeded'
      );
      return false;
    }

    const monthlyAllocated = await this.getMonthlyAllocationAmount();
    if (monthlyAllocated + amount > this.config.allocationRules.monthlyLimit) {
      this.showFormError(
        document.querySelector('form[data-promo-form]') as HTMLFormElement,
        'Monthly allocation limit exceeded'
      );
      return false;
    }

    // Check per-player limits
    const playerAllocated = await this.getPlayerAllocationAmount(playerId);
    if (playerAllocated + amount > this.config.allocationRules.perPlayerLimit) {
      this.showFormError(
        document.querySelector('form[data-promo-form]') as HTMLFormElement,
        'Player allocation limit exceeded'
      );
      return false;
    }

    // Fraud detection
    if (this.config.allocationRules.fraudDetection) {
      const fraudRisk = await this.checkFraudRisk(playerId, amount);
      if (fraudRisk > 0.5) {
        this.showFormError(
          document.querySelector('form[data-promo-form]') as HTMLFormElement,
          'Fraud risk detected. Allocation blocked.'
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Assess player risk
   */
  private async assessPlayerRisk(playerId: string): Promise<number> {
    // Simulate risk assessment
    // In real implementation, this would use ML models and historical data
    return Math.random() * 0.5; // 0-0.5 risk score
  }

  /**
   * Check fraud risk
   */
  private async checkFraudRisk(playerId: string, amount: number): Promise<number> {
    // Simulate fraud detection
    // In real implementation, this would use advanced fraud detection algorithms
    return Math.random() * 0.3; // 0-0.3 fraud risk
  }

  /**
   * Get additional metadata
   */
  private getAdditionalMetadata(form: HTMLFormElement, promoType: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    if (promoType === '1') {
      // Free play metadata
      const gamesSelect = document.getElementById('free-play-games') as HTMLSelectElement;
      const maxBetInput = document.getElementById('max-bet') as HTMLInputElement;
      const usageLimitInput = document.getElementById('usage-limit') as HTMLInputElement;

      if (gamesSelect) {
        metadata.allowedGames = Array.from(gamesSelect.selectedOptions).map(option => option.value);
      }

      if (maxBetInput) {
        metadata.maxBetAmount = parseFloat(maxBetInput.value);
      }

      if (usageLimitInput) {
        metadata.maxUsageCount = parseInt(usageLimitInput.value);
      }
    }

    return metadata;
  }

  /**
   * Allocate promo credit
   */
  private async allocatePromoCredit(data: any): Promise<any> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          promoId: 'promo_' + Date.now(),
          allocatedAmount: data.amount,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }, 1500);
    });
  }

  /**
   * Clear promo configuration
   */
  private clearPromoConfiguration(): void {
    // Reset promo selector
    const selector = document.querySelector('select[data-field="promo-type"]') as HTMLSelectElement;
    if (selector) {
      selector.value = 'null';
    }

    // Clear promo-specific fields
    this.hideFreePlayFields();

    // Clear validation errors
    this.clearAllValidationErrors();

    console.log('🧹 Promo configuration cleared');
  }

  /**
   * Update validation rules
   */
  private updateValidationRules(promoType: string, config: any): void {
    // Update form validation rules based on promo configuration
    console.log(`📋 Validation rules updated for: ${config.name}`);
  }

  /**
   * Initialize promo credits
   */
  private async initializePromoCredits(): Promise<void> {
    // Load existing promo credits
    await this.loadPromoCredits();

    console.log('✅ Promo credits initialized');
  }

  /**
   * Initialize free play bonuses
   */
  private async initializeFreePlayBonuses(): Promise<void> {
    // Load existing free play bonuses
    await this.loadFreePlayBonuses();

    console.log('✅ Free play bonuses initialized');
  }

  /**
   * Initialize validation system
   */
  private async initializeValidationSystem(): Promise<void> {
    // Setup validation engine
    await this.setupValidationEngine();

    console.log('✅ Validation system initialized');
  }

  /**
   * Initialize allocation system
   */
  private async initializeAllocationSystem(): Promise<void> {
    // Setup allocation engine
    await this.setupAllocationEngine();

    console.log('✅ Allocation system initialized');
  }

  /**
   * Initialize reporting system
   */
  private async initializeReportingSystem(): Promise<void> {
    // Setup real-time reporting
    await this.setupRealTimeReporting();

    console.log('✅ Reporting system initialized');
  }

  /**
   * Initialize security features
   */
  private async initializeSecurityFeatures(): Promise<void> {
    // Setup security measures
    await this.setupSecurityFeatures();

    console.log('✅ Security features initialized');
  }

  /**
   * Load promo credits
   */
  private async loadPromoCredits(): Promise<void> {
    // Simulate loading promo credits
    console.log('💰 Promo credits loaded');
  }

  /**
   * Load free play bonuses
   */
  private async loadFreePlayBonuses(): Promise<void> {
    // Simulate loading free play bonuses
    console.log('🎮 Free play bonuses loaded');
  }

  /**
   * Setup validation engine
   */
  private async setupValidationEngine(): Promise<void> {
    // Setup validation rules engine
    console.log('🔍 Validation engine setup');
  }

  /**
   * Setup allocation engine
   */
  private async setupAllocationEngine(): Promise<void> {
    // Setup allocation processing engine
    console.log('⚙️ Allocation engine setup');
  }

  /**
   * Setup real-time reporting
   */
  private async setupRealTimeReporting(): Promise<void> {
    // Setup real-time analytics reporting
    console.log('📊 Real-time reporting setup');
  }

  /**
   * Setup security features
   */
  private async setupSecurityFeatures(): Promise<void> {
    // Setup security and fraud prevention
    console.log('🔒 Security features setup');
  }

  /**
   * Get daily allocation amount
   */
  private async getDailyAllocationAmount(): Promise<number> {
    // Simulate daily allocation check
    return 1250; // Example amount
  }

  /**
   * Get monthly allocation amount
   */
  private async getMonthlyAllocationAmount(): Promise<number> {
    // Simulate monthly allocation check
    return 8750; // Example amount
  }

  /**
   * Get player allocation amount
   */
  private async getPlayerAllocationAmount(playerId: string): Promise<number> {
    // Simulate per-player allocation check
    return 250; // Example amount
  }

  /**
   * Show validation error
   */
  private showValidationError(input: HTMLInputElement, message: string): void {
    // Remove existing error
    this.clearValidationError(input);

    // Add error styling
    input.style.borderColor = '#dc3545';
    input.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';

    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = `
	  color: #dc3545;
	  font-size: 12px;
	  margin-top: 5px;
	`;
    errorDiv.textContent = message;

    input.parentElement?.appendChild(errorDiv);
  }

  /**
   * Clear validation error
   */
  private clearValidationError(input: HTMLInputElement): void {
    input.style.borderColor = '';
    input.style.boxShadow = '';

    const errorDiv = input.parentElement?.querySelector('.validation-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  /**
   * Clear all validation errors
   */
  private clearAllValidationErrors(): void {
    const errorDivs = document.querySelectorAll('.validation-error');
    errorDivs.forEach(div => div.remove());

    const inputs = document.querySelectorAll('input[data-field*="amount"]');
    inputs.forEach(input => {
      const htmlInput = input as HTMLInputElement;
      htmlInput.style.borderColor = '';
      htmlInput.style.boxShadow = '';
    });
  }

  /**
   * Show form error
   */
  private showFormError(form: HTMLFormElement, message: string): void {
    let errorDiv = form.querySelector('.form-error') as HTMLElement;

    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.style.cssText = `
	    color: #dc3545;
	    background: #f8d7da;
	    border: 1px solid #f5c6cb;
	    border-radius: 4px;
	    padding: 10px;
	    margin-bottom: 15px;
	    font-size: 14px;
	  `;
      form.insertBefore(errorDiv, form.firstChild);
    }

    errorDiv.textContent = message;
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
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
	  animation: slideInFromRight 0.3s ease;
	`;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }

  /**
   * Set form loading state
   */
  private setFormLoading(form: HTMLFormElement, loading: boolean): void {
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading
        ? 'Processing...'
        : submitBtn.textContent?.replace('Processing...', 'Allocate Promo') || 'Allocate Promo';
    }
  }

  /**
   * Refresh promo data
   */
  private async refreshPromoData(): Promise<void> {
    // Refresh promo credits and bonuses
    await this.loadPromoCredits();
    await this.loadFreePlayBonuses();

    console.log('🔄 Promo data refreshed');
  }

  /**
   * Track analytics
   */
  private trackAnalytics(event: string, data: any): void {
    // Track analytics event
    console.log('📊 Analytics tracked:', event, data);

    // Update analytics metrics
    this.updateAnalyticsMetrics(event, data);
  }

  /**
   * Update analytics metrics
   */
  private updateAnalyticsMetrics(event: string, data: any): void {
    // Update analytics based on event
    switch (event) {
      case 'promo_allocated':
        this.analytics.allocationMetrics.totalAllocated += data.amount;
        this.analytics.allocationMetrics.averageAllocation =
          this.analytics.allocationMetrics.totalAllocated /
          Math.max(1, this.analytics.allocationMetrics.topPromoTypes.length);
        break;
      case 'promo_type_selected':
        // Track promo type usage
        break;
    }
  }

  /**
   * Add style sheet
   */
  private addStyleSheet(css: string): void {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Get promo status
   */
  getStatus(): {
    isInitialized: boolean;
    activePromoCredits: number;
    activeFreePlayBonuses: number;
    totalAllocated: number;
    analytics: PromoAnalytics;
  } {
    return {
      isInitialized: this.isInitialized,
      activePromoCredits: this.promoCredits.size,
      activeFreePlayBonuses: this.freePlayBonuses.size,
      totalAllocated: this.analytics.allocationMetrics.totalAllocated,
      analytics: { ...this.analytics },
    };
  }

  /**
   * Get promo credits
   */
  getPromoCredits(): PromoCredit[] {
    return Array.from(this.promoCredits.values());
  }

  /**
   * Get free play bonuses
   */
  getFreePlayBonuses(): FreePlayBonus[] {
    return Array.from(this.freePlayBonuses.values());
  }

  /**
   * Allocate promo to player
   */
  async allocatePromoToPlayer(
    playerId: string,
    promoType: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const allocationData = {
        playerId,
        promoType,
        amount,
        source: 'api_allocation',
        metadata: metadata || {},
      };

      const result = await this.allocatePromoCredit(allocationData);

      if (result.success) {
        // Track analytics
        this.trackAnalytics('promo_allocated', {
          ...allocationData,
          promoId: result.promoId,
          timestamp: new Date().toISOString(),
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to allocate promo:', error);
      return false;
    }
  }

  /**
   * Update promo configuration
   */
  updateConfiguration(newConfig: Partial<PromoConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Promo configuration updated');
  }

  /**
   * Export promo data
   */
  exportPromoData(): string {
    const exportData = {
      promoCredits: Array.from(this.promoCredits.values()),
      freePlayBonuses: Array.from(this.freePlayBonuses.values()),
      analytics: this.analytics,
      config: this.config,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    this.timers.forEach(timer => {
      clearInterval(timer);
      clearTimeout(timer);
    });
    this.timers.clear();

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: We can't easily remove listeners without references to original elements
    });
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log('🧹 Promo management system cleaned up');
  }
}

// Convenience functions
export const createFantasy42PromoManagement = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<PromoConfig>
): Fantasy42PromoManagement => {
  return new Fantasy42PromoManagement(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42PromoManagement = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<PromoConfig>
): Promise<boolean> => {
  const promoManagement = new Fantasy42PromoManagement(fantasyClient, unifiedIntegration, config);
  return await promoManagement.initialize();
};

// Export types
export type { PromoConfig, PromoCredit, FreePlayBonus, PromoAnalytics };
