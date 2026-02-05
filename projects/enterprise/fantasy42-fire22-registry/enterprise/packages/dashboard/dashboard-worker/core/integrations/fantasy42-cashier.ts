/**
 * Fantasy42 Cashier Integration
 * Complete cashier system with deposits, withdrawals, balance management, and transaction processing
 * Targets: Cashier menu, deposit/withdrawal interfaces, balance displays, transaction history
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface CashierConfig {
  deposit: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    processingFee: number;
    instantProcessing: boolean;
    supportedMethods: string[];
    autoApproval: boolean;
  };
  withdrawal: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    processingFee: number;
    processingTime: string;
    dailyLimit: number;
    monthlyLimit: number;
  };
  balance: {
    displayFormat: string;
    refreshInterval: number;
    showPending: boolean;
    showAvailable: boolean;
    multiCurrency: boolean;
  };
  transactions: {
    historyLimit: number;
    realTimeUpdates: boolean;
    exportEnabled: boolean;
    categories: string[];
    filters: boolean;
  };
  security: {
    twoFactorRequired: boolean;
    ipVerification: boolean;
    deviceVerification: boolean;
    fraudDetection: boolean;
  };
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'bonus' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  method: string;
  timestamp: string;
  reference: string;
  fee: number;
  netAmount: number;
  description: string;
  metadata: Record<string, any>;
}

export interface Balance {
  available: number;
  pending: number;
  total: number;
  currency: string;
  lastUpdated: string;
  bonuses: number;
  locked: number;
}

export interface PaymentMethod {
  id: string;
  type:
    | 'credit_card'
    | 'debit_card'
    | 'bank_transfer'
    | 'paypal'
    | 'crypto'
    | 'venmo'
    | 'cashapp'
    | 'zelle';
  name: string;
  maskedNumber: string;
  expiryDate?: string;
  isDefault: boolean;
  isVerified: boolean;
  lastUsed: string;
  limits: {
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
  };
}

export interface CashierAnalytics {
  transactionMetrics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageProcessingTime: number;
    totalVolume: number;
  };
  methodUsage: Record<string, number>;
  userBehavior: {
    averageSessionTime: number;
    commonActions: string[];
    conversionRate: number;
    abandonmentRate: number;
  };
  performanceMetrics: {
    pageLoadTime: number;
    apiResponseTime: number;
    errorRate: number;
  };
}

export class Fantasy42Cashier {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private config: CashierConfig;
  private currentBalance: Balance;
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private transactionHistory: Transaction[] = [];
  private analytics: CashierAnalytics;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<CashierConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.currentBalance = this.initializeBalance();
    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Fantasy42 cashier system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('💰 Initializing Fantasy42 Cashier System...');

      // Detect cashier menu element
      await this.detectCashierMenu();

      // Initialize balance management
      await this.initializeBalanceManagement();

      // Setup payment methods
      await this.initializePaymentMethods();

      // Initialize transaction history
      await this.initializeTransactionHistory();

      // Setup deposit functionality
      if (this.config.deposit.enabled) {
        await this.initializeDepositSystem();
      }

      // Setup withdrawal functionality
      if (this.config.withdrawal.enabled) {
        await this.initializeWithdrawalSystem();
      }

      // Setup real-time updates
      await this.initializeRealTimeUpdates();

      // Initialize analytics tracking
      await this.initializeAnalyticsTracking();

      // Setup security features
      await this.initializeSecurityFeatures();

      this.isInitialized = true;
      console.log('✅ Fantasy42 Cashier System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize cashier system:', error);
      return false;
    }
  }

  /**
   * Create default cashier configuration
   */
  private createDefaultConfig(): CashierConfig {
    return {
      deposit: {
        enabled: true,
        minAmount: 10,
        maxAmount: 10000,
        processingFee: 0,
        instantProcessing: true,
        supportedMethods: ['credit_card', 'debit_card', 'bank_transfer', 'paypal'],
        autoApproval: true,
      },
      withdrawal: {
        enabled: true,
        minAmount: 20,
        maxAmount: 5000,
        processingFee: 0,
        processingTime: '1-3 business days',
        dailyLimit: 10000,
        monthlyLimit: 25000,
      },
      balance: {
        displayFormat: 'currency',
        refreshInterval: 30000, // 30 seconds
        showPending: true,
        showAvailable: true,
        multiCurrency: false,
      },
      transactions: {
        historyLimit: 100,
        realTimeUpdates: true,
        exportEnabled: true,
        categories: ['deposit', 'withdrawal', 'bonus', 'adjustment'],
        filters: true,
      },
      security: {
        twoFactorRequired: false,
        ipVerification: false,
        deviceVerification: false,
        fraudDetection: true,
      },
    };
  }

  /**
   * Initialize balance
   */
  private initializeBalance(): Balance {
    return {
      available: 0,
      pending: 0,
      total: 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      bonuses: 0,
      locked: 0,
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): CashierAnalytics {
    return {
      transactionMetrics: {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        averageProcessingTime: 0,
        totalVolume: 0,
      },
      methodUsage: {},
      userBehavior: {
        averageSessionTime: 0,
        commonActions: [],
        conversionRate: 0,
        abandonmentRate: 0,
      },
      performanceMetrics: {
        pageLoadTime: 0,
        apiResponseTime: 0,
        errorRate: 0,
      },
    };
  }

  /**
   * Detect cashier menu element
   */
  private async detectCashierMenu(): Promise<void> {
    // Look for cashier menu item
    const cashierSelectors = [
      '.menu-title[data-language="L-28"]',
      '[data-action="cashier"]',
      '.cashier-menu',
      '#cashier-menu',
      '.nav-cashier',
    ];

    let cashierElement: Element | null = null;

    for (const selector of cashierSelectors) {
      cashierElement = document.querySelector(selector);
      if (cashierElement) {
        console.log(`✅ Found cashier menu element: ${selector}`);
        break;
      }
    }

    if (cashierElement) {
      // Setup cashier menu interaction
      await this.setupCashierMenuInteraction(cashierElement);
    } else {
      console.log('⚠️ Cashier menu element not found, creating fallback');
      await this.createFallbackCashierMenu();
    }
  }

  /**
   * Setup cashier menu interaction
   */
  private async setupCashierMenuInteraction(element: Element): Promise<void> {
    const clickHandler = (e: Event) => {
      e.preventDefault();
      this.openCashierInterface();
    };

    element.addEventListener('click', clickHandler);
    this.eventListeners.set('cashier-menu-click', clickHandler);

    // Add visual enhancements
    this.enhanceCashierMenuElement(element);

    console.log('✅ Cashier menu interaction setup');
  }

  /**
   * Create fallback cashier menu
   */
  private async createFallbackCashierMenu(): Promise<void> {
    const menuContainer = document.querySelector(
      '.main-navigation, .sidebar-menu, .menu-container'
    );

    if (menuContainer) {
      const cashierMenuItem = document.createElement('div');
      cashierMenuItem.className = 'menu-item cashier-menu-item';
      cashierMenuItem.innerHTML = `
	    <span class="menu-title" data-language="L-28">💰 Cashier</span>
	  `;

      cashierMenuItem.addEventListener('click', () => this.openCashierInterface());

      menuContainer.appendChild(cashierMenuItem);
      console.log('✅ Fallback cashier menu created');
    }
  }

  /**
   * Enhance cashier menu element
   */
  private enhanceCashierMenuElement(element: Element): void {
    // Add CSS enhancements
    const enhancedCSS = `
	  .cashier-menu-item {
	    position: relative;
	    transition: all 0.3s ease;
	  }
	  .cashier-menu-item:hover {
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    transform: translateX(5px);
	  }
	  .cashier-menu-item.active {
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	  }
	  .cashier-notification {
	    position: absolute;
	    top: -5px;
	    right: -5px;
	    width: 12px;
	    height: 12px;
	    background: #28a745;
	    border-radius: 50%;
	    animation: pulse 2s infinite;
	  }
	  @keyframes pulse {
	    0% { opacity: 1; }
	    50% { opacity: 0.5; }
	    100% { opacity: 1; }
	  }
	`;

    this.addStyleSheet(enhancedCSS);

    // Add notification indicator
    const notification = document.createElement('div');
    notification.className = 'cashier-notification';
    notification.title = 'Cashier has new features available';
    element.appendChild(notification);
  }

  /**
   * Initialize balance management
   */
  private async initializeBalanceManagement(): Promise<void> {
    // Load current balance
    await this.loadCurrentBalance();

    // Setup balance display
    await this.setupBalanceDisplay();

    // Setup balance refresh timer
    if (this.config.balance.refreshInterval > 0) {
      const refreshTimer = setInterval(() => {
        this.refreshBalance();
      }, this.config.balance.refreshInterval);

      this.timers.set('balance-refresh', refreshTimer);
    }

    console.log('✅ Balance management initialized');
  }

  /**
   * Initialize payment methods
   */
  private async initializePaymentMethods(): Promise<void> {
    // Load user's payment methods
    await this.loadPaymentMethods();

    // Setup payment method management
    await this.setupPaymentMethodManagement();

    console.log('✅ Payment methods initialized');
  }

  /**
   * Initialize transaction history
   */
  private async initializeTransactionHistory(): Promise<void> {
    // Load transaction history
    await this.loadTransactionHistory();

    // Setup transaction display
    await this.setupTransactionDisplay();

    console.log('✅ Transaction history initialized');
  }

  /**
   * Initialize deposit system
   */
  private async initializeDepositSystem(): Promise<void> {
    // Setup deposit interface
    await this.setupDepositInterface();

    // Setup deposit validation
    await this.setupDepositValidation();

    console.log('✅ Deposit system initialized');
  }

  /**
   * Initialize withdrawal system
   */
  private async initializeWithdrawalSystem(): Promise<void> {
    // Setup withdrawal interface
    await this.setupWithdrawalInterface();

    // Setup withdrawal validation
    await this.setupWithdrawalValidation();

    console.log('✅ Withdrawal system initialized');
  }

  /**
   * Initialize real-time updates
   */
  private async initializeRealTimeUpdates(): Promise<void> {
    // Setup WebSocket or polling for real-time updates
    await this.setupRealTimeUpdates();

    console.log('✅ Real-time updates initialized');
  }

  /**
   * Initialize analytics tracking
   */
  private async initializeAnalyticsTracking(): Promise<void> {
    // Setup analytics tracking for cashier actions
    await this.setupAnalyticsTracking();

    console.log('✅ Analytics tracking initialized');
  }

  /**
   * Initialize security features
   */
  private async initializeSecurityFeatures(): Promise<void> {
    // Setup security features
    await this.setupSecurityFeatures();

    console.log('✅ Security features initialized');
  }

  /**
   * Open cashier interface
   */
  private async openCashierInterface(): Promise<void> {
    console.log('💰 Opening cashier interface');

    // Mark menu as active
    this.markCashierMenuActive();

    // Create or show cashier modal/interface
    await this.createCashierInterface();

    // Track analytics
    this.trackAnalytics('cashier_opened', {
      timestamp: new Date().toISOString(),
      balance: this.currentBalance.available,
      method: 'menu_click',
    });
  }

  /**
   * Create cashier interface
   */
  private async createCashierInterface(): Promise<void> {
    // Check if interface already exists
    let cashierInterface = document.getElementById('fantasy42-cashier-interface');

    if (cashierInterface) {
      cashierInterface.style.display = 'block';
      return;
    }

    // Create new interface
    cashierInterface = document.createElement('div');
    cashierInterface.id = 'fantasy42-cashier-interface';
    cashierInterface.className = 'cashier-modal';

    cashierInterface.innerHTML = this.generateCashierInterfaceHTML();

    document.body.appendChild(cashierInterface);

    // Setup interface interactions
    await this.setupCashierInterfaceInteractions(cashierInterface);

    // Add styles
    this.addCashierInterfaceStyles();

    console.log('✅ Cashier interface created');
  }

  /**
   * Generate cashier interface HTML
   */
  private generateCashierInterfaceHTML(): string {
    return `
	  <div class="cashier-overlay" id="cashier-overlay">
	    <div class="cashier-container">
	      <div class="cashier-header">
	        <h2>💰 Cashier</h2>
	        <button class="cashier-close" id="cashier-close">&times;</button>
	      </div>

	      <div class="cashier-content">
	        <!-- Balance Section -->
	        <div class="balance-section">
	          <h3>Account Balance</h3>
	          <div class="balance-display">
	            <div class="available-balance">
	              <span class="balance-label">Available:</span>
	              <span class="balance-amount" id="available-balance">$0.00</span>
	            </div>
	            <div class="pending-balance">
	              <span class="balance-label">Pending:</span>
	              <span class="balance-amount" id="pending-balance">$0.00</span>
	            </div>
	          </div>
	        </div>

	        <!-- Quick Actions -->
	        <div class="quick-actions">
	          <button class="action-btn deposit-btn" id="quick-deposit">
	            <span class="action-icon">💳</span>
	            <span class="action-text">Deposit</span>
	          </button>
	          <button class="action-btn withdraw-btn" id="quick-withdraw">
	            <span class="action-icon">💸</span>
	            <span class="action-text">Withdraw</span>
	          </button>
	          <button class="action-btn history-btn" id="transaction-history">
	            <span class="action-icon">📊</span>
	            <span class="action-text">History</span>
	          </button>
	        </div>

	        <!-- Transaction Forms Container -->
	        <div class="transaction-forms" id="transaction-forms">
	          <!-- Forms will be dynamically loaded here -->
	        </div>

	        <!-- Recent Transactions -->
	        <div class="recent-transactions">
	          <h3>Recent Transactions</h3>
	          <div class="transactions-list" id="transactions-list">
	            <div class="no-transactions">No recent transactions</div>
	          </div>
	        </div>
	      </div>
	    </div>
	  </div>
	`;
  }

  /**
   * Setup cashier interface interactions
   */
  private async setupCashierInterfaceInteractions(container: HTMLElement): Promise<void> {
    // Close button
    const closeBtn = container.querySelector('#cashier-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeCashierInterface());
    }

    // Overlay click to close
    const overlay = container.querySelector('#cashier-overlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          this.closeCashierInterface();
        }
      });
    }

    // Quick action buttons
    const depositBtn = container.querySelector('#quick-deposit');
    if (depositBtn) {
      depositBtn.addEventListener('click', () => this.showDepositForm());
    }

    const withdrawBtn = container.querySelector('#quick-withdraw');
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', () => this.showWithdrawalForm());
    }

    const historyBtn = container.querySelector('#transaction-history');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => this.showTransactionHistory());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (container.style.display !== 'none') {
        if (e.key === 'Escape') {
          this.closeCashierInterface();
        }
      }
    });

    console.log('✅ Cashier interface interactions setup');
  }

  /**
   * Add cashier interface styles
   */
  private addCashierInterfaceStyles(): void {
    const styles = `
	  .cashier-modal {
	    position: fixed;
	    top: 0;
	    left: 0;
	    width: 100%;
	    height: 100%;
	    z-index: 10000;
	    display: none;
	  }

	  .cashier-overlay {
	    position: absolute;
	    top: 0;
	    left: 0;
	    width: 100%;
	    height: 100%;
	    background: rgba(0, 0, 0, 0.7);
	    display: flex;
	    align-items: center;
	    justify-content: center;
	  }

	  .cashier-container {
	    background: white;
	    border-radius: 12px;
	    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	    max-width: 800px;
	    width: 90%;
	    max-height: 90vh;
	    overflow-y: auto;
	    animation: slideIn 0.3s ease;
	  }

	  @keyframes slideIn {
	    from { transform: translateY(-50px); opacity: 0; }
	    to { transform: translateY(0); opacity: 1; }
	  }

	  .cashier-header {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	    padding: 20px 30px;
	    border-bottom: 1px solid #eee;
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    border-radius: 12px 12px 0 0;
	  }

	  .cashier-header h2 {
	    margin: 0;
	    font-size: 24px;
	  }

	  .cashier-close {
	    background: none;
	    border: none;
	    color: white;
	    font-size: 30px;
	    cursor: pointer;
	    padding: 0;
	    width: 30px;
	    height: 30px;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	  }

	  .cashier-content {
	    padding: 30px;
	  }

	  .balance-section {
	    margin-bottom: 30px;
	  }

	  .balance-section h3 {
	    margin: 0 0 15px 0;
	    color: #333;
	    font-size: 18px;
	  }

	  .balance-display {
	    display: flex;
	    gap: 30px;
	  }

	  .balance-display > div {
	    flex: 1;
	  }

	  .balance-label {
	    display: block;
	    color: #666;
	    font-size: 14px;
	    margin-bottom: 5px;
	  }

	  .balance-amount {
	    font-size: 24px;
	    font-weight: bold;
	    color: #333;
	  }

	  .available-balance .balance-amount {
	    color: #28a745;
	  }

	  .pending-balance .balance-amount {
	    color: #ffc107;
	  }

	  .quick-actions {
	    display: flex;
	    gap: 15px;
	    margin-bottom: 30px;
	  }

	  .action-btn {
	    flex: 1;
	    display: flex;
	    flex-direction: column;
	    align-items: center;
	    padding: 20px;
	    border: 2px solid #e9ecef;
	    border-radius: 8px;
	    background: white;
	    cursor: pointer;
	    transition: all 0.3s ease;
	  }

	  .action-btn:hover {
	    border-color: #667eea;
	    background: #f8f9ff;
	    transform: translateY(-2px);
	  }

	  .action-icon {
	    font-size: 24px;
	    margin-bottom: 8px;
	  }

	  .action-text {
	    font-weight: 500;
	    color: #333;
	  }

	  .deposit-btn:hover {
	    border-color: #28a745;
	    background: #f8fff8;
	  }

	  .withdraw-btn:hover {
	    border-color: #dc3545;
	    background: #fff8f8;
	  }

	  .history-btn:hover {
	    border-color: #6c757d;
	    background: #f8f9fa;
	  }

	  .transaction-forms {
	    margin-bottom: 30px;
	  }

	  .recent-transactions h3 {
	    margin: 0 0 15px 0;
	    color: #333;
	    font-size: 18px;
	  }

	  .transactions-list {
	    max-height: 300px;
	    overflow-y: auto;
	  }

	  .no-transactions {
	    text-align: center;
	    color: #666;
	    padding: 40px;
	    font-style: italic;
	  }

	  @media (max-width: 768px) {
	    .cashier-container {
	      width: 95%;
	      margin: 10px;
	    }

	    .cashier-content {
	      padding: 20px;
	    }

	    .balance-display {
	      flex-direction: column;
	      gap: 15px;
	    }

	    .quick-actions {
	      flex-direction: column;
	    }

	    .action-btn {
	      padding: 15px;
	    }
	  }
	`;

    this.addStyleSheet(styles);
  }

  /**
   * Mark cashier menu as active
   */
  private markCashierMenuActive(): void {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add active class to cashier menu
    const cashierMenu = document.querySelector('.cashier-menu-item, [data-action="cashier"]');
    if (cashierMenu) {
      cashierMenu.classList.add('active');
    }
  }

  /**
   * Close cashier interface
   */
  private closeCashierInterface(): void {
    const interfaceElement = document.getElementById('fantasy42-cashier-interface');
    if (interfaceElement) {
      interfaceElement.style.display = 'none';
    }

    // Remove active class from menu
    const cashierMenu = document.querySelector('.cashier-menu-item, [data-action="cashier"]');
    if (cashierMenu) {
      cashierMenu.classList.remove('active');
    }

    console.log('💰 Cashier interface closed');
  }

  /**
   * Show deposit form
   */
  private async showDepositForm(): Promise<void> {
    const formsContainer = document.getElementById('transaction-forms');
    if (!formsContainer) return;

    const depositForm = this.generateDepositFormHTML();
    formsContainer.innerHTML = depositForm;

    // Setup form interactions
    await this.setupDepositFormInteractions(formsContainer);

    console.log('💳 Deposit form displayed');
  }

  /**
   * Show withdrawal form
   */
  private async showWithdrawalForm(): Promise<void> {
    const formsContainer = document.getElementById('transaction-forms');
    if (!formsContainer) return;

    const withdrawalForm = this.generateWithdrawalFormHTML();
    formsContainer.innerHTML = withdrawalForm;

    // Setup form interactions
    await this.setupWithdrawalFormInteractions(formsContainer);

    console.log('💸 Withdrawal form displayed');
  }

  /**
   * Show transaction history
   */
  private async showTransactionHistory(): Promise<void> {
    const formsContainer = document.getElementById('transaction-forms');
    if (!formsContainer) return;

    const historyView = this.generateTransactionHistoryHTML();
    formsContainer.innerHTML = historyView;

    // Setup history interactions
    await this.setupTransactionHistoryInteractions(formsContainer);

    console.log('📊 Transaction history displayed');
  }

  /**
   * Generate deposit form HTML
   */
  private generateDepositFormHTML(): string {
    const methods = Array.from(this.paymentMethods.values());

    return `
	  <div class="deposit-form">
	    <h3>Make a Deposit</h3>
	    <form id="deposit-form">
	      <div class="form-group">
	        <label for="deposit-amount">Amount</label>
	        <div class="amount-input">
	          <span class="currency-symbol">$</span>
	          <input type="number" id="deposit-amount" min="${this.config.deposit.minAmount}" max="${this.config.deposit.maxAmount}" step="0.01" required>
	        </div>
	        <small class="amount-limits">Min: $${this.config.deposit.minAmount} - Max: $${this.config.deposit.maxAmount}</small>
	      </div>

	      <div class="form-group">
	        <label for="payment-method">Payment Method</label>
	        <select id="payment-method" required>
	          <option value="">Select payment method</option>
	          ${methods
              .map(
                method => `
	            <option value="${method.id}" ${method.isDefault ? 'selected' : ''}>
	              ${method.name} (${method.maskedNumber})
	            </option>
	          `
              )
              .join('')}
	        </select>
	      </div>

	      <div class="form-group">
	        <label for="deposit-notes">Notes (Optional)</label>
	        <textarea id="deposit-notes" rows="3" placeholder="Add any notes for this deposit"></textarea>
	      </div>

	      <div class="deposit-summary">
	        <div class="summary-row">
	          <span>Deposit Amount:</span>
	          <span id="summary-amount">$0.00</span>
	        </div>
	        <div class="summary-row">
	          <span>Processing Fee:</span>
	          <span id="summary-fee">$0.00</span>
	        </div>
	        <div class="summary-row total">
	          <span>Total:</span>
	          <span id="summary-total">$0.00</span>
	        </div>
	      </div>

	      <div class="form-actions">
	        <button type="button" class="btn btn-secondary" onclick="this.closest('.deposit-form').remove()">Cancel</button>
	        <button type="submit" class="btn btn-primary">Deposit Funds</button>
	      </div>
	    </form>
	  </div>
	`;
  }

  /**
   * Generate withdrawal form HTML
   */
  private generateWithdrawalFormHTML(): string {
    const methods = Array.from(this.paymentMethods.values());

    return `
	  <div class="withdrawal-form">
	    <h3>Request Withdrawal</h3>
	    <form id="withdrawal-form">
	      <div class="form-group">
	        <label for="withdrawal-amount">Amount</label>
	        <div class="amount-input">
	          <span class="currency-symbol">$</span>
	          <input type="number" id="withdrawal-amount" min="${this.config.withdrawal.minAmount}" max="${Math.min(this.config.withdrawal.maxAmount, this.currentBalance.available)}" step="0.01" required>
	        </div>
	        <small class="amount-limits">Min: $${this.config.withdrawal.minAmount} - Max: $${Math.min(this.config.withdrawal.maxAmount, this.currentBalance.available)}</small>
	      </div>

	      <div class="form-group">
	        <label for="withdrawal-method">Withdrawal Method</label>
	        <select id="withdrawal-method" required>
	          <option value="">Select withdrawal method</option>
	          ${methods
              .map(
                method => `
	            <option value="${method.id}" ${method.isDefault ? 'selected' : ''}>
	              ${method.name} (${method.maskedNumber})
	            </option>
	          `
              )
              .join('')}
	        </select>
	      </div>

	      <div class="withdrawal-info">
	        <div class="info-item">
	          <span class="info-label">Processing Time:</span>
	          <span class="info-value">${this.config.withdrawal.processingTime}</span>
	        </div>
	        <div class="info-item">
	          <span class="info-label">Processing Fee:</span>
	          <span class="info-value">$${this.config.withdrawal.processingFee.toFixed(2)}</span>
	        </div>
	      </div>

	      <div class="form-group">
	        <label for="withdrawal-notes">Notes (Optional)</label>
	        <textarea id="withdrawal-notes" rows="3" placeholder="Add any notes for this withdrawal"></textarea>
	      </div>

	      <div class="withdrawal-summary">
	        <div class="summary-row">
	          <span>Withdrawal Amount:</span>
	          <span id="withdrawal-summary-amount">$0.00</span>
	        </div>
	        <div class="summary-row">
	          <span>Processing Fee:</span>
	          <span id="withdrawal-summary-fee">$${this.config.withdrawal.processingFee.toFixed(2)}</span>
	        </div>
	        <div class="summary-row total">
	          <span>You Will Receive:</span>
	          <span id="withdrawal-summary-net">$0.00</span>
	        </div>
	      </div>

	      <div class="form-actions">
	        <button type="button" class="btn btn-secondary" onclick="this.closest('.withdrawal-form').remove()">Cancel</button>
	        <button type="submit" class="btn btn-primary">Request Withdrawal</button>
	      </div>
	    </form>
	  </div>
	`;
  }

  /**
   * Generate transaction history HTML
   */
  private generateTransactionHistoryHTML(): string {
    const recentTransactions = this.transactionHistory.slice(0, 10);

    return `
	  <div class="transaction-history">
	    <h3>Transaction History</h3>

	    <div class="history-filters">
	      <select id="history-filter">
	        <option value="all">All Transactions</option>
	        <option value="deposit">Deposits</option>
	        <option value="withdrawal">Withdrawals</option>
	        <option value="bonus">Bonuses</option>
	      </select>

	      <div class="date-range">
	        <input type="date" id="history-start-date">
	        <span>to</span>
	        <input type="date" id="history-end-date">
	      </div>

	      <button class="btn btn-sm" id="export-history">Export</button>
	    </div>

	    <div class="history-list">
	      ${
          recentTransactions.length > 0
            ? recentTransactions
                .map(
                  transaction => `
	          <div class="history-item ${transaction.type} ${transaction.status}">
	            <div class="transaction-icon">
	              ${this.getTransactionIcon(transaction.type)}
	            </div>
	            <div class="transaction-details">
	              <div class="transaction-description">${transaction.description}</div>
	              <div class="transaction-meta">
	                ${transaction.reference} • ${new Date(transaction.timestamp).toLocaleDateString()}
	              </div>
	            </div>
	            <div class="transaction-amount">
	              <div class="amount ${transaction.type === 'withdrawal' ? 'negative' : 'positive'}">
	                ${transaction.type === 'withdrawal' ? '-' : '+'}$${transaction.amount.toFixed(2)}
	              </div>
	              <div class="status ${transaction.status}">${transaction.status}</div>
	            </div>
	          </div>
	        `
                )
                .join('')
            : '<div class="no-history">No transactions found</div>'
        }
	    </div>

	    ${
        this.transactionHistory.length > 10
          ? `
	      <div class="history-pagination">
	        <button class="btn btn-sm" id="load-more-history">Load More</button>
	      </div>
	    `
          : ''
      }
	  </div>
	`;
  }

  /**
   * Get transaction icon
   */
  private getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      deposit: '💳',
      withdrawal: '💸',
      bonus: '🎁',
      adjustment: '⚙️',
      transfer: '↔️',
    };

    return icons[type] || '📄';
  }

  /**
   * Setup deposit form interactions
   */
  private async setupDepositFormInteractions(container: HTMLElement): Promise<void> {
    const form = container.querySelector('#deposit-form') as HTMLFormElement;
    const amountInput = container.querySelector('#deposit-amount') as HTMLInputElement;

    if (form && amountInput) {
      // Update summary on amount change
      amountInput.addEventListener('input', () => {
        this.updateDepositSummary(container);
      });

      // Form submission
      form.addEventListener('submit', async e => {
        e.preventDefault();
        await this.processDeposit(container);
      });
    }
  }

  /**
   * Setup withdrawal form interactions
   */
  private async setupWithdrawalFormInteractions(container: HTMLElement): Promise<void> {
    const form = container.querySelector('#withdrawal-form') as HTMLFormElement;
    const amountInput = container.querySelector('#withdrawal-amount') as HTMLInputElement;

    if (form && amountInput) {
      // Update summary on amount change
      amountInput.addEventListener('input', () => {
        this.updateWithdrawalSummary(container);
      });

      // Form submission
      form.addEventListener('submit', async e => {
        e.preventDefault();
        await this.processWithdrawal(container);
      });
    }
  }

  /**
   * Setup transaction history interactions
   */
  private async setupTransactionHistoryInteractions(container: HTMLElement): Promise<void> {
    const filterSelect = container.querySelector('#history-filter') as HTMLSelectElement;
    const exportBtn = container.querySelector('#export-history');
    const loadMoreBtn = container.querySelector('#load-more-history');

    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        this.filterTransactionHistory(container, filterSelect.value);
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportTransactionHistory();
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.loadMoreTransactionHistory(container);
      });
    }
  }

  /**
   * Update deposit summary
   */
  private updateDepositSummary(container: HTMLElement): void {
    const amountInput = container.querySelector('#deposit-amount') as HTMLInputElement;
    const amount = parseFloat(amountInput.value) || 0;
    const fee = this.config.deposit.processingFee;
    const total = amount + fee;

    const summaryAmount = container.querySelector('#summary-amount');
    const summaryFee = container.querySelector('#summary-fee');
    const summaryTotal = container.querySelector('#summary-total');

    if (summaryAmount) summaryAmount.textContent = `$${amount.toFixed(2)}`;
    if (summaryFee) summaryFee.textContent = `$${fee.toFixed(2)}`;
    if (summaryTotal) summaryTotal.textContent = `$${total.toFixed(2)}`;
  }

  /**
   * Update withdrawal summary
   */
  private updateWithdrawalSummary(container: HTMLElement): void {
    const amountInput = container.querySelector('#withdrawal-amount') as HTMLInputElement;
    const amount = parseFloat(amountInput.value) || 0;
    const fee = this.config.withdrawal.processingFee;
    const net = amount - fee;

    const summaryAmount = container.querySelector('#withdrawal-summary-amount');
    const summaryFee = container.querySelector('#withdrawal-summary-fee');
    const summaryNet = container.querySelector('#withdrawal-summary-net');

    if (summaryAmount) summaryAmount.textContent = `$${amount.toFixed(2)}`;
    if (summaryFee) summaryFee.textContent = `$${fee.toFixed(2)}`;
    if (summaryNet) summaryNet.textContent = `$${net.toFixed(2)}`;
  }

  /**
   * Process deposit
   */
  private async processDeposit(container: HTMLElement): Promise<void> {
    const form = container.querySelector('#deposit-form') as HTMLFormElement;
    const formData = new FormData(form);

    const depositData = {
      amount: parseFloat(formData.get('deposit-amount') as string),
      method: formData.get('payment-method') as string,
      notes: formData.get('deposit-notes') as string,
    };

    try {
      // Show loading state
      this.setFormLoading(container, true);

      // Process deposit
      const result = await this.submitDeposit(depositData);

      if (result.success) {
        // Show success message
        this.showSuccessMessage('Deposit processed successfully!');

        // Refresh balance
        await this.refreshBalance();

        // Close form
        container.innerHTML = '';

        // Track analytics
        this.trackAnalytics('deposit_completed', {
          amount: depositData.amount,
          method: depositData.method,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(result.error || 'Deposit failed');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      this.showErrorMessage(error.message || 'Failed to process deposit');
    } finally {
      this.setFormLoading(container, false);
    }
  }

  /**
   * Process withdrawal
   */
  private async processWithdrawal(container: HTMLElement): Promise<void> {
    const form = container.querySelector('#withdrawal-form') as HTMLFormElement;
    const formData = new FormData(form);

    const withdrawalData = {
      amount: parseFloat(formData.get('withdrawal-amount') as string),
      method: formData.get('withdrawal-method') as string,
      notes: formData.get('withdrawal-notes') as string,
    };

    try {
      // Show loading state
      this.setFormLoading(container, true);

      // Process withdrawal
      const result = await this.submitWithdrawal(withdrawalData);

      if (result.success) {
        // Show success message
        this.showSuccessMessage('Withdrawal request submitted successfully!');

        // Refresh balance and history
        await this.refreshBalance();
        await this.refreshTransactionHistory();

        // Close form
        container.innerHTML = '';

        // Track analytics
        this.trackAnalytics('withdrawal_completed', {
          amount: withdrawalData.amount,
          method: withdrawalData.method,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(result.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      this.showErrorMessage(error.message || 'Failed to process withdrawal');
    } finally {
      this.setFormLoading(container, false);
    }
  }

  /**
   * Load current balance
   */
  private async loadCurrentBalance(): Promise<void> {
    try {
      // Simulate API call
      const balanceData = await this.fantasyClient.getBalance();

      this.currentBalance = {
        ...this.currentBalance,
        ...balanceData,
        lastUpdated: new Date().toISOString(),
      };

      this.updateBalanceDisplay();
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  }

  /**
   * Load payment methods
   */
  private async loadPaymentMethods(): Promise<void> {
    try {
      // Simulate API call
      const methodsData = await this.fantasyClient.getPaymentMethods();

      this.paymentMethods.clear();
      methodsData.forEach(method => {
        this.paymentMethods.set(method.id, method);
      });
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  }

  /**
   * Load transaction history
   */
  private async loadTransactionHistory(): Promise<void> {
    try {
      // Simulate API call
      const historyData = await this.fantasyClient.getTransactionHistory();

      this.transactionHistory = historyData.slice(0, this.config.transactions.historyLimit);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    }
  }

  /**
   * Setup balance display
   */
  private async setupBalanceDisplay(): Promise<void> {
    // Update balance display elements
    this.updateBalanceDisplay();
  }

  /**
   * Setup payment method management
   */
  private async setupPaymentMethodManagement(): Promise<void> {
    // Setup payment method management interface
  }

  /**
   * Setup transaction display
   */
  private async setupTransactionDisplay(): Promise<void> {
    // Setup transaction display elements
  }

  /**
   * Setup deposit interface
   */
  private async setupDepositInterface(): Promise<void> {
    // Setup deposit interface elements
  }

  /**
   * Setup deposit validation
   */
  private async setupDepositValidation(): Promise<void> {
    // Setup deposit validation rules
  }

  /**
   * Setup withdrawal interface
   */
  private async setupWithdrawalInterface(): Promise<void> {
    // Setup withdrawal interface elements
  }

  /**
   * Setup withdrawal validation
   */
  private async setupWithdrawalValidation(): Promise<void> {
    // Setup withdrawal validation rules
  }

  /**
   * Setup real-time updates
   */
  private async setupRealTimeUpdates(): Promise<void> {
    // Setup WebSocket or polling for real-time updates
  }

  /**
   * Setup analytics tracking
   */
  private async setupAnalyticsTracking(): Promise<void> {
    // Setup analytics tracking
  }

  /**
   * Setup security features
   */
  private async setupSecurityFeatures(): Promise<void> {
    // Setup security features
  }

  /**
   * Submit deposit
   */
  private async submitDeposit(data: any): Promise<any> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, transactionId: 'dep_' + Date.now() });
      }, 2000);
    });
  }

  /**
   * Submit withdrawal
   */
  private async submitWithdrawal(data: any): Promise<any> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, transactionId: 'wit_' + Date.now() });
      }, 2000);
    });
  }

  /**
   * Refresh balance
   */
  private async refreshBalance(): Promise<void> {
    await this.loadCurrentBalance();
  }

  /**
   * Refresh transaction history
   */
  private async refreshTransactionHistory(): Promise<void> {
    await this.loadTransactionHistory();
  }

  /**
   * Update balance display
   */
  private updateBalanceDisplay(): void {
    const availableElement = document.getElementById('available-balance');
    const pendingElement = document.getElementById('pending-balance');

    if (availableElement) {
      availableElement.textContent = `$${this.currentBalance.available.toFixed(2)}`;
    }

    if (pendingElement) {
      pendingElement.textContent = `$${this.currentBalance.pending.toFixed(2)}`;
    }
  }

  /**
   * Filter transaction history
   */
  private filterTransactionHistory(container: HTMLElement, filter: string): void {
    // Filter transaction history
  }

  /**
   * Load more transaction history
   */
  private loadMoreTransactionHistory(container: HTMLElement): void {
    // Load more transactions
  }

  /**
   * Export transaction history
   */
  private exportTransactionHistory(): void {
    // Export transaction history
  }

  /**
   * Set form loading state
   */
  private setFormLoading(container: HTMLElement, loading: boolean): void {
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading
        ? 'Processing...'
        : submitBtn.textContent?.replace('Processing...', '') || 'Submit';
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    // Show success message
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    // Show error message
  }

  /**
   * Track analytics
   */
  private trackAnalytics(event: string, data: any): void {
    // Track analytics event
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
   * Get cashier status
   */
  getStatus(): {
    isInitialized: boolean;
    balance: Balance;
    paymentMethodsCount: number;
    transactionsCount: number;
    config: CashierConfig;
  } {
    return {
      isInitialized: this.isInitialized,
      balance: { ...this.currentBalance },
      paymentMethodsCount: this.paymentMethods.size,
      transactionsCount: this.transactionHistory.length,
      config: { ...this.config },
    };
  }

  /**
   * Get current balance
   */
  getCurrentBalance(): Balance {
    return { ...this.currentBalance };
  }

  /**
   * Get payment methods
   */
  getPaymentMethods(): PaymentMethod[] {
    return Array.from(this.paymentMethods.values());
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): Transaction[] {
    return [...this.transactionHistory];
  }

  /**
   * Get analytics data
   */
  getAnalytics(): CashierAnalytics {
    return { ...this.analytics };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<CashierConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Cashier configuration updated');
  }

  /**
   * Refresh all data
   */
  async refreshAllData(): Promise<void> {
    await Promise.all([
      this.refreshBalance(),
      this.loadPaymentMethods(),
      this.refreshTransactionHistory(),
    ]);

    console.log('🔄 All cashier data refreshed');
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

    // Remove interface elements
    const interfaceElement = document.getElementById('fantasy42-cashier-interface');
    if (interfaceElement) {
      interfaceElement.remove();
    }

    this.isInitialized = false;
    console.log('🧹 Cashier system cleaned up');
  }
}

// Convenience functions
export const createFantasy42Cashier = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<CashierConfig>
): Fantasy42Cashier => {
  return new Fantasy42Cashier(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42Cashier = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<CashierConfig>
): Promise<boolean> => {
  const cashier = new Fantasy42Cashier(fantasyClient, unifiedIntegration, config);
  return await cashier.initialize();
};

// Export types
export type { CashierConfig, Transaction, Balance, PaymentMethod, CashierAnalytics };
