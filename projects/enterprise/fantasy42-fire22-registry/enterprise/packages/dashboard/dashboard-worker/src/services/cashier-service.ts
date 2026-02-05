/**
 * Fire22 Cashier Service
 * Comprehensive transaction processing system for deposits, withdrawals, and cash management
 */

import { EventEmitter } from 'events';
import {
  TransactionItemSchema,
  TransactionTypeSchema,
  TransactionStatusSchema,
} from '../api/schemas';

export interface CashierTransaction {
  id: string;
  customerId: string;
  customerName?: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'check' | 'wire' | 'credit' | 'debit' | 'crypto';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  description: string;
  reference?: string;
  processedBy: string;
  processedAt: string;
  notes?: string;
  fee?: number;
  netAmount?: number;
  approvalRequired?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  metadata?: Record<string, any>;
}

export interface CashierSession {
  sessionId: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'closed' | 'suspended';
  openingBalance: number;
  currentBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  transactionCount: number;
}

export interface CashierConfig {
  requireApprovalForLargeTransactions: boolean;
  largeTransactionThreshold: number;
  dailyWithdrawalLimit: number;
  requireCustomerVerification: boolean;
  allowPartialPayments: boolean;
  autoCalculateFees: boolean;
  feeStructure: {
    cashDeposit: number;
    cashWithdrawal: number;
    wireTransfer: number;
    checkDeposit: number;
  };
}

export interface DepositRequest {
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'wire' | 'credit' | 'debit' | 'crypto';
  description: string;
  reference?: string;
  notes?: string;
  fee?: number;
}

export interface WithdrawalRequest {
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'wire';
  description: string;
  reference?: string;
  notes?: string;
  fee?: number;
}

export interface CashierStats {
  todayDeposits: number;
  todayWithdrawals: number;
  todayFees: number;
  todayTransactions: number;
  pendingApprovals: number;
  activeSessions: number;
  totalCashOnHand: number;
  totalChecks: number;
}

export class CashierService extends EventEmitter {
  private static instance: CashierService;
  private transactions: Map<string, CashierTransaction> = new Map();
  private sessions: Map<string, CashierSession> = new Map();
  private currentSession: CashierSession | null = null;
  private config: CashierConfig;
  private isInitialized = false;

  constructor() {
    super();
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): CashierService {
    if (!CashierService.instance) {
      CashierService.instance = new CashierService();
    }
    return CashierService.instance;
  }

  /**
   * Initialize the cashier service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load existing transactions and sessions
    await this.loadExistingData();

    // Setup event listeners
    this.setupEventListeners();

    this.isInitialized = true;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): CashierConfig {
    return {
      requireApprovalForLargeTransactions: true,
      largeTransactionThreshold: 10000,
      dailyWithdrawalLimit: 50000,
      requireCustomerVerification: true,
      allowPartialPayments: false,
      autoCalculateFees: true,
      feeStructure: {
        cashDeposit: 0,
        cashWithdrawal: 0,
        wireTransfer: 25,
        checkDeposit: 0,
      },
    };
  }

  /**
   * Load existing data
   */
  private async loadExistingData(): Promise<void> {
    try {
      // Load transactions from storage/API
      const response = await fetch('/api/transactions/cashier');
      if (response.ok) {
        const data = await response.json();
        data.transactions.forEach((transaction: CashierTransaction) => {
          this.transactions.set(transaction.id, transaction);
        });
      }
    } catch (error) {
      console.warn('Failed to load existing cashier data:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.on('transaction-created', this.onTransactionCreated.bind(this));
    this.on('transaction-updated', this.onTransactionUpdated.bind(this));
    this.on('session-started', this.onSessionStarted.bind(this));
    this.on('session-closed', this.onSessionClosed.bind(this));
  }

  /**
   * Start a new cashier session
   */
  async startSession(
    cashierId: string,
    cashierName: string,
    openingBalance: number = 0
  ): Promise<CashierSession> {
    if (this.currentSession) {
      throw new Error('A cashier session is already active');
    }

    const session: CashierSession = {
      sessionId: this.generateId(),
      cashierId,
      cashierName,
      startTime: new Date().toISOString(),
      status: 'active',
      openingBalance,
      currentBalance: openingBalance,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalFees: 0,
      transactionCount: 0,
    };

    this.currentSession = session;
    this.sessions.set(session.sessionId, session);

    this.emit('session-started', session);

    return session;
  }

  /**
   * Close current cashier session
   */
  async closeSession(): Promise<CashierSession | null> {
    if (!this.currentSession) {
      throw new Error('No active cashier session');
    }

    const session = { ...this.currentSession };
    session.endTime = new Date().toISOString();
    session.status = 'closed';

    this.sessions.set(session.sessionId, session);
    this.currentSession = null;

    this.emit('session-closed', session);

    return session;
  }

  /**
   * Process a deposit transaction
   */
  async processDeposit(request: DepositRequest, cashierId: string): Promise<CashierTransaction> {
    if (!this.currentSession) {
      throw new Error('No active cashier session');
    }

    // Validate request
    this.validateDepositRequest(request);

    // Calculate fees
    const fee = this.config.autoCalculateFees
      ? this.calculateFee(request.paymentMethod, 'deposit')
      : request.fee || 0;
    const netAmount = request.amount - fee;

    // Create transaction
    const transaction: CashierTransaction = {
      id: this.generateId(),
      customerId: request.customerId,
      type: 'deposit',
      amount: request.amount,
      currency: 'USD',
      paymentMethod: request.paymentMethod,
      status: this.requiresApproval(request.amount) ? 'pending' : 'completed',
      description: request.description,
      reference: request.reference,
      processedBy: cashierId,
      processedAt: new Date().toISOString(),
      notes: request.notes,
      fee,
      netAmount,
      approvalRequired: this.requiresApproval(request.amount),
    };

    // Save transaction
    this.transactions.set(transaction.id, transaction);

    // Update session
    if (this.currentSession) {
      this.currentSession.totalDeposits += netAmount;
      this.currentSession.totalFees += fee;
      this.currentSession.transactionCount++;
      this.updateSessionBalance();
    }

    this.emit('transaction-created', transaction);

    return transaction;
  }

  /**
   * Process a withdrawal transaction
   */
  async processWithdrawal(
    request: WithdrawalRequest,
    cashierId: string
  ): Promise<CashierTransaction> {
    if (!this.currentSession) {
      throw new Error('No active cashier session');
    }

    // Validate request
    this.validateWithdrawalRequest(request);

    // Calculate fees
    const fee = this.config.autoCalculateFees
      ? this.calculateFee(request.paymentMethod, 'withdrawal')
      : request.fee || 0;
    const totalAmount = request.amount + fee;

    // Check if sufficient funds
    if (this.currentSession.currentBalance < totalAmount) {
      throw new Error('Insufficient funds in cashier drawer');
    }

    // Create transaction
    const transaction: CashierTransaction = {
      id: this.generateId(),
      customerId: request.customerId,
      type: 'withdrawal',
      amount: request.amount,
      currency: 'USD',
      paymentMethod: request.paymentMethod,
      status: this.requiresApproval(request.amount) ? 'pending' : 'completed',
      description: request.description,
      reference: request.reference,
      processedBy: cashierId,
      processedAt: new Date().toISOString(),
      notes: request.notes,
      fee,
      netAmount: request.amount,
      approvalRequired: this.requiresApproval(request.amount),
    };

    // Save transaction
    this.transactions.set(transaction.id, transaction);

    // Update session
    if (this.currentSession) {
      this.currentSession.totalWithdrawals += request.amount;
      this.currentSession.totalFees += fee;
      this.currentSession.transactionCount++;
      this.updateSessionBalance();
    }

    this.emit('transaction-created', transaction);

    return transaction;
  }

  /**
   * Approve a pending transaction
   */
  async approveTransaction(transactionId: string, approvedBy: string): Promise<CashierTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending approval');
    }

    transaction.status = 'completed';
    transaction.approvedBy = approvedBy;
    transaction.approvedAt = new Date().toISOString();

    this.transactions.set(transactionId, transaction);

    // Update session balance if withdrawal
    if (transaction.type === 'withdrawal' && this.currentSession) {
      this.updateSessionBalance();
    }

    this.emit('transaction-updated', transaction);

    return transaction;
  }

  /**
   * Reject a pending transaction
   */
  async rejectTransaction(
    transactionId: string,
    rejectedBy: string,
    reason?: string
  ): Promise<CashierTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending approval');
    }

    transaction.status = 'failed';
    transaction.notes = reason || 'Transaction rejected';
    transaction.approvedBy = rejectedBy;
    transaction.approvedAt = new Date().toISOString();

    this.transactions.set(transactionId, transaction);

    this.emit('transaction-updated', transaction);

    return transaction;
  }

  /**
   * Get cashier statistics
   */
  getStats(): CashierStats {
    const today = new Date().toDateString();
    let todayDeposits = 0;
    let todayWithdrawals = 0;
    let todayFees = 0;
    let todayTransactions = 0;
    let pendingApprovals = 0;

    for (const transaction of this.transactions.values()) {
      const transactionDate = new Date(transaction.processedAt).toDateString();

      if (transactionDate === today) {
        todayTransactions++;

        if (transaction.type === 'deposit') {
          todayDeposits += transaction.netAmount || transaction.amount;
        } else if (transaction.type === 'withdrawal') {
          todayWithdrawals += transaction.amount;
        }

        todayFees += transaction.fee || 0;
      }

      if (transaction.status === 'pending') {
        pendingApprovals++;
      }
    }

    return {
      todayDeposits,
      todayWithdrawals,
      todayFees,
      todayTransactions,
      pendingApprovals,
      activeSessions: this.currentSession ? 1 : 0,
      totalCashOnHand: this.currentSession?.currentBalance || 0,
      totalChecks: this.calculateCheckTotal(),
    };
  }

  /**
   * Get transactions with filtering
   */
  getTransactions(filters?: {
    customerId?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): CashierTransaction[] {
    let transactions = Array.from(this.transactions.values());

    if (filters) {
      if (filters.customerId) {
        transactions = transactions.filter(t => t.customerId === filters.customerId);
      }

      if (filters.type && filters.type !== 'all') {
        transactions = transactions.filter(t => t.type === filters.type);
      }

      if (filters.status && filters.status !== 'all') {
        transactions = transactions.filter(t => t.status === filters.status);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        transactions = transactions.filter(t => new Date(t.processedAt) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        transactions = transactions.filter(t => new Date(t.processedAt) <= toDate);
      }

      if (filters.limit) {
        transactions = transactions.slice(0, filters.limit);
      }
    }

    // Sort by processed date (newest first)
    return transactions.sort(
      (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );
  }

  /**
   * Get current session
   */
  getCurrentSession(): CashierSession | null {
    return this.currentSession;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): CashierTransaction[] {
    return Array.from(this.transactions.values()).filter(t => t.status === 'pending');
  }

  // Private helper methods

  private generateId(): string {
    return `cashier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateDepositRequest(request: DepositRequest): void {
    if (!request.customerId) {
      throw new Error('Customer ID is required');
    }

    if (request.amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    if (request.amount > 100000) {
      throw new Error('Deposit amount exceeds maximum limit');
    }
  }

  private validateWithdrawalRequest(request: WithdrawalRequest): void {
    if (!request.customerId) {
      throw new Error('Customer ID is required');
    }

    if (request.amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    if (request.amount > this.config.dailyWithdrawalLimit) {
      throw new Error(
        `Withdrawal amount exceeds daily limit of $${this.config.dailyWithdrawalLimit}`
      );
    }

    if (!this.currentSession || this.currentSession.currentBalance < request.amount) {
      throw new Error('Insufficient funds in cashier drawer');
    }
  }

  private calculateFee(paymentMethod: string, type: 'deposit' | 'withdrawal'): number {
    const feeStructure = this.config.feeStructure;

    switch (paymentMethod) {
      case 'cash':
        return type === 'deposit' ? feeStructure.cashDeposit : feeStructure.cashWithdrawal;
      case 'wire':
        return feeStructure.wireTransfer;
      case 'check':
        return feeStructure.checkDeposit;
      default:
        return 0;
    }
  }

  private requiresApproval(amount: number): boolean {
    return (
      this.config.requireApprovalForLargeTransactions &&
      amount >= this.config.largeTransactionThreshold
    );
  }

  private updateSessionBalance(): void {
    if (!this.currentSession) return;

    let balance = this.currentSession.openingBalance;
    balance += this.currentSession.totalDeposits;
    balance -= this.currentSession.totalWithdrawals;
    balance -= this.currentSession.totalFees;

    this.currentSession.currentBalance = balance;
  }

  private calculateCheckTotal(): number {
    let total = 0;
    for (const transaction of this.transactions.values()) {
      if (transaction.paymentMethod === 'check' && transaction.status === 'completed') {
        if (transaction.type === 'deposit') {
          total += transaction.netAmount || transaction.amount;
        } else if (transaction.type === 'withdrawal') {
          total -= transaction.amount;
        }
      }
    }
    return total;
  }

  // Event handlers

  private onTransactionCreated(transaction: CashierTransaction): void {}

  private onTransactionUpdated(transaction: CashierTransaction): void {}

  private onSessionStarted(session: CashierSession): void {}

  private onSessionClosed(session: CashierSession): void {}
}

// Global functions for easy access
export async function initializeCashierService(): Promise<CashierService> {
  const service = CashierService.getInstance();
  await service.initialize();
  return service;
}

export function getCurrentCashierSession(): CashierSession | null {
  const service = CashierService.getInstance();
  return service.getCurrentSession();
}

export function getCashierStats(): CashierStats {
  const service = CashierService.getInstance();
  return service.getStats();
}

export { CashierService };
