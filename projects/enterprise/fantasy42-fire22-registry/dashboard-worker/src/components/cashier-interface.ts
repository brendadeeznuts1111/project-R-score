/**
 * Fire22 Cashier Interface Component
 * Professional UI for deposit/withdrawal processing with form integration
 */

import { EventEmitter } from 'events';
import {
  CashierService,
  CashierTransaction,
  CashierSession,
  DepositRequest,
  WithdrawalRequest,
} from '../services/cashier-service';

export interface CashierInterfaceOptions {
  container: HTMLElement;
  cashierId: string;
  cashierName: string;
  enableSessionManagement?: boolean;
  enableApprovalWorkflow?: boolean;
  enableRealTimeUpdates?: boolean;
}

export class CashierInterface extends EventEmitter {
  private container: HTMLElement;
  private cashierService: CashierService;
  private options: CashierInterfaceOptions;
  private currentView: 'dashboard' | 'deposit' | 'withdrawal' | 'approvals' | 'history' =
    'dashboard';
  private isInitialized = false;

  constructor(options: CashierInterfaceOptions) {
    super();
    this.container = options.container;
    this.options = { enableRealTimeUpdates: true, ...options };
    this.cashierService = CashierService.getInstance();
  }

  /**
   * Initialize the cashier interface
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🏪 Initializing Cashier Interface...');

    // Initialize cashier service
    await this.cashierService.initialize();

    // Setup event listeners
    this.setupEventListeners();

    // Render initial interface
    this.render();

    this.isInitialized = true;
    console.log('✅ Cashier Interface initialized');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for cashier service events
    this.cashierService.on('transaction-created', (transaction: CashierTransaction) => {
      this.onTransactionCreated(transaction);
    });

    this.cashierService.on('transaction-updated', (transaction: CashierTransaction) => {
      this.onTransactionUpdated(transaction);
    });

    this.cashierService.on('session-started', (session: CashierSession) => {
      this.onSessionStarted(session);
    });

    this.cashierService.on('session-closed', (session: CashierSession) => {
      this.onSessionClosed(session);
    });

    // Listen for DOM events
    this.container.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const action =
        target.getAttribute('data-action') ||
        target.closest('[data-action]')?.getAttribute('data-action');

      if (action) {
        this.handleAction(action, target, event);
      }
    });

    // Listen for form submissions
    this.container.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      if (form.hasAttribute('data-cashier-form')) {
        event.preventDefault();
        this.handleFormSubmit(form);
      }
    });
  }

  /**
   * Render the cashier interface
   */
  private render(): void {
    const html = this.generateInterfaceHtml();
    this.container.innerHTML = html;

    // Initialize components after rendering
    this.initializeComponents();

    // Update display
    this.updateDisplay();
  }

  /**
   * Generate interface HTML
   */
  private generateInterfaceHtml(): string {
    return `
      <div class="cashier-interface">
        <!-- Header -->
        <div class="cashier-header">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="mb-0">💰 Cashier System</h2>
              <small class="text-muted">Transaction Processing & Cash Management</small>
            </div>
            <div class="cashier-status">
              ${this.getSessionStatusHtml()}
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="cashier-nav">
          <div class="nav nav-tabs" role="tablist">
            <button class="nav-link active" data-action="show-dashboard">
              <i class="fas fa-tachometer-alt"></i> Dashboard
            </button>
            <button class="nav-link" data-action="show-deposit">
              <i class="fas fa-plus-circle"></i> Deposit
            </button>
            <button class="nav-link" data-action="show-withdrawal">
              <i class="fas fa-minus-circle"></i> Withdrawal
            </button>
            <button class="nav-link" data-action="show-approvals">
              <i class="fas fa-check-circle"></i> Approvals
              ${this.getPendingCountBadge()}
            </button>
            <button class="nav-link" data-action="show-history">
              <i class="fas fa-history"></i> History
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="cashier-content">
          <div id="dashboard-view" class="content-view active">
            ${this.generateDashboardView()}
          </div>
          <div id="deposit-view" class="content-view">
            ${this.generateDepositForm()}
          </div>
          <div id="withdrawal-view" class="content-view">
            ${this.generateWithdrawalForm()}
          </div>
          <div id="approvals-view" class="content-view">
            ${this.generateApprovalsView()}
          </div>
          <div id="history-view" class="content-view">
            ${this.generateHistoryView()}
          </div>
        </div>

        <!-- Modals -->
        <div id="transaction-modal" class="modal fade" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Transaction Details</h5>
                <button type="button" class="close" data-dismiss="modal">
                  <span>&times;</span>
                </button>
              </div>
              <div class="modal-body" id="transaction-modal-content">
                <!-- Transaction details will be loaded here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get session status HTML
   */
  private getSessionStatusHtml(): string {
    const session = this.cashierService.getCurrentSession();

    if (!session) {
      return `
        <div class="session-status inactive">
          <i class="fas fa-circle text-danger"></i>
          <span>No Active Session</span>
          <button class="btn btn-sm btn-primary ml-2" data-action="start-session">
            Start Session
          </button>
        </div>
      `;
    }

    return `
      <div class="session-status active">
        <i class="fas fa-circle text-success"></i>
        <span>${session.cashierName}</span>
        <div class="ml-3">
          <small>Balance: <strong>$${session.currentBalance.toFixed(2)}</strong></small>
        </div>
        <button class="btn btn-sm btn-warning ml-2" data-action="close-session">
          Close Session
        </button>
      </div>
    `;
  }

  /**
   * Get pending approvals count badge
   */
  private getPendingCountBadge(): string {
    const pendingCount = this.cashierService.getPendingApprovals().length;
    if (pendingCount === 0) return '';

    return `<span class="badge badge-danger ml-1">${pendingCount}</span>`;
  }

  /**
   * Generate dashboard view
   */
  private generateDashboardView(): string {
    const stats = this.cashierService.getStats();
    const session = this.cashierService.getCurrentSession();

    return `
      <div class="dashboard-overview">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-dollar-sign text-success"></i>
            </div>
            <div class="stat-content">
              <h4>$${stats.todayDeposits.toFixed(2)}</h4>
              <p>Today's Deposits</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-minus text-danger"></i>
            </div>
            <div class="stat-content">
              <h4>$${stats.todayWithdrawals.toFixed(2)}</h4>
              <p>Today's Withdrawals</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-receipt text-info"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.todayTransactions}</h4>
              <p>Today's Transactions</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clock text-warning"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.pendingApprovals}</h4>
              <p>Pending Approvals</p>
            </div>
          </div>
        </div>

        <!-- Session Info -->
        ${
          session
            ? `
          <div class="session-info-card">
            <h5>Current Session</h5>
            <div class="row">
              <div class="col-md-3">
                <strong>Cashier:</strong> ${session.cashierName}
              </div>
              <div class="col-md-3">
                <strong>Started:</strong> ${new Date(session.startTime).toLocaleString()}
              </div>
              <div class="col-md-3">
                <strong>Opening Balance:</strong> $${session.openingBalance.toFixed(2)}
              </div>
              <div class="col-md-3">
                <strong>Current Balance:</strong> $${session.currentBalance.toFixed(2)}
              </div>
            </div>
            <div class="row mt-2">
              <div class="col-md-3">
                <strong>Total Deposits:</strong> $${session.totalDeposits.toFixed(2)}
              </div>
              <div class="col-md-3">
                <strong>Total Withdrawals:</strong> $${session.totalWithdrawals.toFixed(2)}
              </div>
              <div class="col-md-3">
                <strong>Fees Collected:</strong> $${session.totalFees.toFixed(2)}
              </div>
              <div class="col-md-3">
                <strong>Transaction Count:</strong> ${session.transactionCount}
              </div>
            </div>
          </div>
        `
            : `
          <div class="no-session-card">
            <div class="text-center py-4">
              <i class="fas fa-user-clock fa-3x text-muted mb-3"></i>
              <h5>No Active Session</h5>
              <p>Start a cashier session to begin processing transactions</p>
              <button class="btn btn-primary" data-action="start-session">
                Start New Session
              </button>
            </div>
          </div>
        `
        }

        <!-- Quick Actions -->
        <div class="quick-actions">
          <h5>Quick Actions</h5>
          <div class="action-buttons">
            <button class="btn btn-success btn-lg" data-action="quick-deposit">
              <i class="fas fa-plus"></i> Quick Deposit
            </button>
            <button class="btn btn-danger btn-lg" data-action="quick-withdrawal">
              <i class="fas fa-minus"></i> Quick Withdrawal
            </button>
            <button class="btn btn-info btn-lg" data-action="view-approvals">
              <i class="fas fa-check"></i> Review Approvals
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate deposit form
   */
  private generateDepositForm(): string {
    return `
      <div class="transaction-form">
        <h4>💰 Process Deposit</h4>
        <form id="deposit-form" data-cashier-form="deposit">
          <div class="form-row">
            <div class="col-md-6">
              <div class="form-group">
                <label for="deposit-customer-id">Customer ID *</label>
                <input type="text" class="form-control" id="deposit-customer-id"
                       name="customerId" required placeholder="Enter customer ID">
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label for="deposit-customer-name">Customer Name</label>
                <input type="text" class="form-control" id="deposit-customer-name"
                       name="customerName" placeholder="Customer name (optional)">
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="col-md-4">
              <div class="form-group">
                <label for="deposit-amount">Amount *</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text">$</span>
                  </div>
                  <input type="number" class="form-control" id="deposit-amount"
                         name="amount" required min="0.01" step="0.01" placeholder="0.00">
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label for="deposit-method">Payment Method *</label>
                <select class="form-control" id="deposit-method" name="paymentMethod" required>
                  <option value="">Select method</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="credit">Credit Card</option>
                  <option value="debit">Debit Card</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label for="deposit-fee">Fee (Optional)</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text">$</span>
                  </div>
                  <input type="number" class="form-control" id="deposit-fee"
                         name="fee" min="0" step="0.01" placeholder="Auto-calculated">
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="deposit-description">Description *</label>
            <input type="text" class="form-control" id="deposit-description"
                   name="description" required placeholder="Deposit description">
          </div>

          <div class="form-group">
            <label for="deposit-reference">Reference Number</label>
            <input type="text" class="form-control" id="deposit-reference"
                   name="reference" placeholder="Check number, transaction ID, etc.">
          </div>

          <div class="form-group">
            <label for="deposit-notes">Notes</label>
            <textarea class="form-control" id="deposit-notes" name="notes"
                      rows="3" placeholder="Additional notes..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-success btn-lg">
              <i class="fas fa-plus-circle"></i> Process Deposit
            </button>
            <button type="button" class="btn btn-secondary btn-lg ml-2" data-action="clear-form">
              <i class="fas fa-eraser"></i> Clear Form
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Generate withdrawal form
   */
  private generateWithdrawalForm(): string {
    return `
      <div class="transaction-form">
        <h4>💸 Process Withdrawal</h4>
        <form id="withdrawal-form" data-cashier-form="withdrawal">
          <div class="form-row">
            <div class="col-md-6">
              <div class="form-group">
                <label for="withdrawal-customer-id">Customer ID *</label>
                <input type="text" class="form-control" id="withdrawal-customer-id"
                       name="customerId" required placeholder="Enter customer ID">
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label for="withdrawal-customer-name">Customer Name</label>
                <input type="text" class="form-control" id="withdrawal-customer-name"
                       name="customerName" placeholder="Customer name (optional)">
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="col-md-4">
              <div class="form-group">
                <label for="withdrawal-amount">Amount *</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text">$</span>
                  </div>
                  <input type="number" class="form-control" id="withdrawal-amount"
                         name="amount" required min="0.01" step="0.01" placeholder="0.00">
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label for="withdrawal-method">Payment Method *</label>
                <select class="form-control" id="withdrawal-method" name="paymentMethod" required>
                  <option value="">Select method</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                </select>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label for="withdrawal-fee">Fee (Optional)</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text">$</span>
                  </div>
                  <input type="number" class="form-control" id="withdrawal-fee"
                         name="fee" min="0" step="0.01" placeholder="Auto-calculated">
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="withdrawal-description">Description *</label>
            <input type="text" class="form-control" id="withdrawal-description"
                   name="description" required placeholder="Withdrawal description">
          </div>

          <div class="form-group">
            <label for="withdrawal-reference">Reference Number</label>
            <input type="text" class="form-control" id="withdrawal-reference"
                   name="reference" placeholder="Check number, transaction ID, etc.">
          </div>

          <div class="form-group">
            <label for="withdrawal-notes">Notes</label>
            <textarea class="form-control" id="withdrawal-notes" name="notes"
                      rows="3" placeholder="Additional notes..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-danger btn-lg">
              <i class="fas fa-minus-circle"></i> Process Withdrawal
            </button>
            <button type="button" class="btn btn-secondary btn-lg ml-2" data-action="clear-form">
              <i class="fas fa-eraser"></i> Clear Form
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Generate approvals view
   */
  private generateApprovalsView(): string {
    const pendingTransactions = this.cashierService.getPendingApprovals();

    if (pendingTransactions.length === 0) {
      return `
        <div class="text-center py-5">
          <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
          <h4>No Pending Approvals</h4>
          <p>All transactions have been processed</p>
        </div>
      `;
    }

    const transactionsHtml = pendingTransactions
      .map(
        transaction => `
      <div class="approval-item" data-transaction-id="${transaction.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">${transaction.type.toUpperCase()}: $${transaction.amount.toFixed(2)}</h6>
            <p class="mb-1 text-muted">${transaction.description}</p>
            <small class="text-muted">
              Customer: ${transaction.customerId} |
              Method: ${transaction.paymentMethod} |
              Time: ${new Date(transaction.processedAt).toLocaleString()}
            </small>
          </div>
          <div class="approval-actions">
            <button class="btn btn-success btn-sm" data-action="approve-transaction" data-transaction-id="${transaction.id}">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-danger btn-sm ml-2" data-action="reject-transaction" data-transaction-id="${transaction.id}">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    return `
      <div class="approvals-list">
        <h4>⏳ Pending Approvals (${pendingTransactions.length})</h4>
        <div class="approvals-container">
          ${transactionsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Generate history view
   */
  private generateHistoryView(): string {
    const transactions = this.cashierService.getTransactions({ limit: 50 });

    if (transactions.length === 0) {
      return `
        <div class="text-center py-5">
          <i class="fas fa-history fa-3x text-muted mb-3"></i>
          <h4>No Transactions</h4>
          <p>Transaction history will appear here</p>
        </div>
      `;
    }

    const transactionsHtml = transactions
      .map(
        transaction => `
      <div class="transaction-item" data-transaction-id="${transaction.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div class="transaction-info">
            <div class="transaction-header">
              <span class="transaction-type ${transaction.type}">
                ${transaction.type.toUpperCase()}
              </span>
              <span class="transaction-amount ${transaction.type === 'deposit' ? 'text-success' : 'text-danger'}">
                ${transaction.type === 'deposit' ? '+' : '-'}$${transaction.amount.toFixed(2)}
              </span>
              <span class="badge badge-${this.getStatusBadgeClass(transaction.status)}">
                ${transaction.status}
              </span>
            </div>
            <div class="transaction-details">
              <span class="customer-id">${transaction.customerId}</span>
              <span class="payment-method">${transaction.paymentMethod}</span>
              <span class="processed-time">${new Date(transaction.processedAt).toLocaleString()}</span>
            </div>
            <div class="transaction-description">${transaction.description}</div>
          </div>
          <div class="transaction-actions">
            <button class="btn btn-sm btn-outline-primary" data-action="view-transaction" data-transaction-id="${transaction.id}">
              <i class="fas fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    return `
      <div class="transaction-history">
        <h4>📋 Transaction History</h4>
        <div class="transaction-filters mb-3">
          <div class="row">
            <div class="col-md-3">
              <select class="form-control" id="history-type-filter">
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
              </select>
            </div>
            <div class="col-md-3">
              <select class="form-control" id="history-status-filter">
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div class="col-md-3">
              <input type="date" class="form-control" id="history-date-from" placeholder="From date">
            </div>
            <div class="col-md-3">
              <input type="date" class="form-control" id="history-date-to" placeholder="To date">
            </div>
          </div>
        </div>
        <div class="transaction-list">
          ${transactionsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Initialize components after rendering
   */
  private initializeComponents(): void {
    // Initialize any additional components if needed
    console.log('🔧 Cashier interface components initialized');
  }

  /**
   * Update display
   */
  private updateDisplay(): void {
    // Update session status
    const sessionStatus = this.container.querySelector('.cashier-status');
    if (sessionStatus) {
      sessionStatus.innerHTML = this.getSessionStatusHtml();
    }

    // Update pending count badge
    const approvalsTab = this.container.querySelector('[data-action="show-approvals"]');
    if (approvalsTab) {
      const badge = approvalsTab.querySelector('.badge');
      if (badge) {
        badge.remove();
      }

      const pendingCount = this.cashierService.getPendingApprovals().length;
      if (pendingCount > 0) {
        approvalsTab.insertAdjacentHTML(
          'beforeend',
          `<span class="badge badge-danger ml-1">${pendingCount}</span>`
        );
      }
    }
  }

  /**
   * Handle navigation actions
   */
  private handleAction(action: string, target: HTMLElement, event?: Event): void {
    switch (action) {
      case 'show-dashboard':
        this.showView('dashboard');
        break;
      case 'show-deposit':
        this.showView('deposit');
        break;
      case 'show-withdrawal':
        this.showView('withdrawal');
        break;
      case 'show-approvals':
        this.showView('approvals');
        break;
      case 'show-history':
        this.showView('history');
        break;
      case 'start-session':
        this.startSession();
        break;
      case 'close-session':
        this.closeSession();
        break;
      case 'approve-transaction':
        const transactionId = target.getAttribute('data-transaction-id');
        if (transactionId) {
          this.approveTransaction(transactionId);
        }
        break;
      case 'reject-transaction':
        const rejectId = target.getAttribute('data-transaction-id');
        if (rejectId) {
          this.rejectTransaction(rejectId);
        }
        break;
      case 'view-transaction':
        const viewId = target.getAttribute('data-transaction-id');
        if (viewId) {
          this.viewTransaction(viewId);
        }
        break;
      case 'clear-form':
        this.clearCurrentForm();
        break;
      case 'quick-deposit':
        this.showView('deposit');
        break;
      case 'quick-withdrawal':
        this.showView('withdrawal');
        break;
      case 'view-approvals':
        this.showView('approvals');
        break;
    }
  }

  /**
   * Show specific view
   */
  private showView(view: typeof this.currentView): void {
    // Update navigation
    const navLinks = this.container.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeLink = this.container.querySelector(`[data-action="show-${view}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Update content views
    const views = this.container.querySelectorAll('.content-view');
    views.forEach(viewEl => viewEl.classList.remove('active'));

    const targetView = this.container.querySelector(`#${view}-view`);
    if (targetView) {
      targetView.classList.add('active');
    }

    this.currentView = view;

    // Refresh view if needed
    if (view === 'approvals') {
      this.refreshApprovalsView();
    } else if (view === 'history') {
      this.refreshHistoryView();
    } else if (view === 'dashboard') {
      this.refreshDashboardView();
    }
  }

  /**
   * Handle form submissions
   */
  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    const formType = form.getAttribute('data-cashier-form');

    try {
      if (formType === 'deposit') {
        await this.processDeposit(form);
      } else if (formType === 'withdrawal') {
        await this.processWithdrawal(form);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Process deposit form
   */
  private async processDeposit(form: HTMLFormElement): Promise<void> {
    const formData = new FormData(form);

    const request: DepositRequest = {
      customerId: formData.get('customerId') as string,
      amount: parseFloat(formData.get('amount') as string),
      paymentMethod: formData.get('paymentMethod') as
        | 'cash'
        | 'check'
        | 'wire'
        | 'credit'
        | 'debit'
        | 'crypto',
      description: formData.get('description') as string,
      reference: formData.get('reference') as string,
      notes: formData.get('notes') as string,
      fee: formData.get('fee') ? parseFloat(formData.get('fee') as string) : undefined,
    };

    const transaction = await this.cashierService.processDeposit(request, this.options.cashierId);

    this.showSuccess(`Deposit processed successfully: $${transaction.amount.toFixed(2)}`);
    this.clearCurrentForm();
    this.showView('dashboard');
  }

  /**
   * Process withdrawal form
   */
  private async processWithdrawal(form: HTMLFormElement): Promise<void> {
    const formData = new FormData(form);

    const request: WithdrawalRequest = {
      customerId: formData.get('customerId') as string,
      amount: parseFloat(formData.get('amount') as string),
      paymentMethod: formData.get('paymentMethod') as 'cash' | 'check' | 'wire',
      description: formData.get('description') as string,
      reference: formData.get('reference') as string,
      notes: formData.get('notes') as string,
      fee: formData.get('fee') ? parseFloat(formData.get('fee') as string) : undefined,
    };

    const transaction = await this.cashierService.processWithdrawal(
      request,
      this.options.cashierId
    );

    this.showSuccess(`Withdrawal processed successfully: $${transaction.amount.toFixed(2)}`);
    this.clearCurrentForm();
    this.showView('dashboard');
  }

  /**
   * Start cashier session
   */
  private async startSession(): Promise<void> {
    try {
      const openingBalance = parseFloat(prompt('Enter opening balance:', '0') || '0');
      await this.cashierService.startSession(
        this.options.cashierId,
        this.options.cashierName,
        openingBalance
      );
      this.showSuccess('Cashier session started successfully');
      this.updateDisplay();
    } catch (error) {
      this.showError(error.message);
    }
  }

  /**
   * Close cashier session
   */
  private async closeSession(): Promise<void> {
    if (confirm('Are you sure you want to close the current session?')) {
      try {
        await this.cashierService.closeSession();
        this.showSuccess('Cashier session closed successfully');
        this.updateDisplay();
        this.showView('dashboard');
      } catch (error) {
        this.showError(error.message);
      }
    }
  }

  /**
   * Approve transaction
   */
  private async approveTransaction(transactionId: string): Promise<void> {
    try {
      await this.cashierService.approveTransaction(transactionId, this.options.cashierName);
      this.showSuccess('Transaction approved successfully');
      this.refreshApprovalsView();
      this.updateDisplay();
    } catch (error) {
      this.showError(error.message);
    }
  }

  /**
   * Reject transaction
   */
  private async rejectTransaction(transactionId: string): Promise<void> {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      try {
        await this.cashierService.rejectTransaction(
          transactionId,
          this.options.cashierName,
          reason
        );
        this.showSuccess('Transaction rejected');
        this.refreshApprovalsView();
        this.updateDisplay();
      } catch (error) {
        this.showError(error.message);
      }
    }
  }

  /**
   * View transaction details
   */
  private viewTransaction(transactionId: string): void {
    const transaction = this.cashierService.getTransactions().find(t => t.id === transactionId);
    if (transaction) {
      this.showTransactionModal(transaction);
    }
  }

  /**
   * Show transaction modal
   */
  private showTransactionModal(transaction: CashierTransaction): void {
    const modal = this.container.querySelector('#transaction-modal') as HTMLElement;
    const content = modal.querySelector('#transaction-modal-content') as HTMLElement;

    content.innerHTML = `
      <div class="transaction-details">
        <div class="row">
          <div class="col-md-6">
            <h6>Transaction Information</h6>
            <table class="table table-sm">
              <tr><td><strong>ID:</strong></td><td>${transaction.id}</td></tr>
              <tr><td><strong>Type:</strong></td><td>${transaction.type}</td></tr>
              <tr><td><strong>Amount:</strong></td><td>$${transaction.amount.toFixed(2)}</td></tr>
              <tr><td><strong>Status:</strong></td><td><span class="badge badge-${this.getStatusBadgeClass(transaction.status)}">${transaction.status}</span></td></tr>
              <tr><td><strong>Payment Method:</strong></td><td>${transaction.paymentMethod}</td></tr>
              <tr><td><strong>Processed By:</strong></td><td>${transaction.processedBy}</td></tr>
              <tr><td><strong>Processed At:</strong></td><td>${new Date(transaction.processedAt).toLocaleString()}</td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <h6>Additional Details</h6>
            <table class="table table-sm">
              <tr><td><strong>Customer ID:</strong></td><td>${transaction.customerId}</td></tr>
              <tr><td><strong>Description:</strong></td><td>${transaction.description}</td></tr>
              ${transaction.reference ? `<tr><td><strong>Reference:</strong></td><td>${transaction.reference}</td></tr>` : ''}
              ${transaction.fee ? `<tr><td><strong>Fee:</strong></td><td>$${transaction.fee.toFixed(2)}</td></tr>` : ''}
              ${transaction.netAmount ? `<tr><td><strong>Net Amount:</strong></td><td>$${transaction.netAmount.toFixed(2)}</td></tr>` : ''}
              ${transaction.notes ? `<tr><td><strong>Notes:</strong></td><td>${transaction.notes}</td></tr>` : ''}
            </table>
          </div>
        </div>
      </div>
    `;

    // Show modal (assuming Bootstrap is available)
    if (typeof $ !== 'undefined' && $.fn.modal) {
      $(modal).modal('show');
    }
  }

  /**
   * Clear current form
   */
  private clearCurrentForm(): void {
    const activeForm = this.container.querySelector(`#${this.currentView}-form`) as HTMLFormElement;
    if (activeForm) {
      activeForm.reset();
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.showMessage(message, 'success');
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.showMessage(message, 'error');
  }

  /**
   * Show message
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alertHtml = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="close" data-dismiss="alert">
          <span>&times;</span>
        </button>
      </div>
    `;

    const container = this.container.querySelector('.cashier-content');
    if (container) {
      container.insertAdjacentHTML('afterbegin', alertHtml);
      setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
          alert.remove();
        }
      }, 5000);
    }
  }

  /**
   * Refresh dashboard view
   */
  private refreshDashboardView(): void {
    const dashboardView = this.container.querySelector('#dashboard-view');
    if (dashboardView) {
      dashboardView.innerHTML = this.generateDashboardView();
    }
  }

  /**
   * Refresh approvals view
   */
  private refreshApprovalsView(): void {
    const approvalsView = this.container.querySelector('#approvals-view');
    if (approvalsView) {
      approvalsView.innerHTML = this.generateApprovalsView();
    }
  }

  /**
   * Refresh history view
   */
  private refreshHistoryView(): void {
    const historyView = this.container.querySelector('#history-view');
    if (historyView) {
      historyView.innerHTML = this.generateHistoryView();
    }
  }

  /**
   * Get status badge class
   */
  private getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'danger';
      case 'processing':
        return 'info';
      default:
        return 'secondary';
    }
  }

  // Event handlers

  private onTransactionCreated(transaction: CashierTransaction): void {
    console.log(`📝 Transaction created: ${transaction.id}`);
    this.updateDisplay();

    if (this.options.enableRealTimeUpdates) {
      if (this.currentView === 'dashboard') {
        this.refreshDashboardView();
      } else if (this.currentView === 'history') {
        this.refreshHistoryView();
      }
    }
  }

  private onTransactionUpdated(transaction: CashierTransaction): void {
    console.log(`📝 Transaction updated: ${transaction.id} - ${transaction.status}`);
    this.updateDisplay();

    if (this.options.enableRealTimeUpdates) {
      if (this.currentView === 'approvals') {
        this.refreshApprovalsView();
      } else if (this.currentView === 'history') {
        this.refreshHistoryView();
      }
    }
  }

  private onSessionStarted(session: CashierSession): void {
    console.log(`💰 Session started: ${session.sessionId}`);
    this.updateDisplay();
    this.refreshDashboardView();
  }

  private onSessionClosed(session: CashierSession): void {
    console.log(`💰 Session closed: ${session.sessionId}`);
    this.updateDisplay();
    this.refreshDashboardView();
  }
}

// Global functions for easy access
export async function createCashierInterface(
  container: HTMLElement,
  cashierId: string,
  cashierName: string
): Promise<CashierInterface> {
  const options: CashierInterfaceOptions = {
    container,
    cashierId,
    cashierName,
    enableSessionManagement: true,
    enableApprovalWorkflow: true,
    enableRealTimeUpdates: true,
  };

  const cashierInterface = new CashierInterface(options);
  await cashierInterface.initialize();

  return cashierInterface;
}

export { CashierInterface };
