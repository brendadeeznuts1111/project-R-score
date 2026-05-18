/**
 * Deposit and Withdrawal Management System
 * Comprehensive financial transaction processing with multi-currency support
 */

export interface DepositRequest {
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'crypto' | 'paypal' | 'cash';
  paymentDetails: {
    cardNumber?: string;
    bankAccount?: string;
    cryptoAddress?: string;
    paypalEmail?: string;
    reference?: string;
  };
  metadata?: Record<string, any>;
  requestedBy: string;
}

export interface WithdrawalRequest {
  customerId: string;
  amount: number;
  currency: string;
  withdrawalMethod: 'bank_transfer' | 'crypto' | 'paypal' | 'check' | 'cash';
  withdrawalDetails: {
    bankAccount?: string;
    cryptoAddress?: string;
    paypalEmail?: string;
    mailingAddress?: string;
  };
  priority: 'standard' | 'express' | 'instant';
  metadata?: Record<string, any>;
  requestedBy: string;
}

export interface FinancialTransaction {
  transactionId: string;
  customerId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'bonus' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  referenceNumber: string;
  externalTransactionId?: string;
  processingFee: number;
  netAmount: number;
  exchangeRate?: number;
  convertedAmount?: number;
  convertedCurrency?: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  approvedBy?: string;
  processedBy?: string;
  riskScore: number;
  complianceCheck: {
    kycVerified: boolean;
    amlCheck: boolean;
    sanctionsCheck: boolean;
    riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  };
  auditTrail: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    details: string;
    changes?: Record<string, any>;
  }>;
}

export interface CustomerBalance {
  customerId: string;
  availableBalance: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  lockedAmount: number;
  bonusBalance: number;
  currency: string;
  lastUpdated: string;
  balanceHistory: Array<{
    timestamp: string;
    previousBalance: number;
    newBalance: number;
    transactionId: string;
    changeReason: string;
  }>;
}

export interface PaymentLimits {
  customerId: string;
  dailyDepositLimit: number;
  weeklyDepositLimit: number;
  monthlyDepositLimit: number;
  dailyWithdrawalLimit: number;
  weeklyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  maxTransactionAmount: number;
  minTransactionAmount: number;
  currency: string;
  vipLevel?: string;
  customLimits?: Record<string, number>;
  lastUpdated: string;
}

export class DepositWithdrawalSystem {
  private transactions: Map<string, FinancialTransaction> = new Map();
  private customerBalances: Map<string, CustomerBalance> = new Map();
  private paymentLimits: Map<string, PaymentLimits> = new Map();
  private transactionCounter = 1000000;

  /**
   * Process deposit request
   */
  async processDeposit(request: DepositRequest): Promise<FinancialTransaction> {
    // Validate deposit request
    await this.validateDepositRequest(request);

    // Check limits
    await this.checkDepositLimits(request);

    // Risk assessment
    const riskScore = await this.assessDepositRisk(request);

    // Create transaction
    const transaction: FinancialTransaction = {
      transactionId: this.generateTransactionId(),
      customerId: request.customerId,
      type: 'deposit',
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      paymentMethod: request.paymentMethod,
      referenceNumber: this.generateReferenceNumber(),
      processingFee: this.calculateProcessingFee(request),
      netAmount: request.amount - this.calculateProcessingFee(request),
      description: `Deposit via ${request.paymentMethod}`,
      metadata: {
        ...request.metadata,
        paymentDetails: this.sanitizePaymentDetails(request.paymentDetails),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskScore,
      complianceCheck: await this.performComplianceCheck(request.customerId),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'deposit_created',
          performedBy: request.requestedBy,
          details: 'Deposit request created',
          changes: { status: 'pending' },
        },
      ],
    };

    // Store transaction
    this.transactions.set(transaction.transactionId, transaction);

    // Update customer balance (pending)
    await this.updateCustomerBalance(
      request.customerId,
      'pending_deposit',
      request.amount,
      request.currency,
      transaction.transactionId
    );

    // Process payment (simulate async processing)
    setTimeout(() => {
      this.processPaymentAsync(transaction.transactionId);
    }, 1000);

    return transaction;
  }

  /**
   * Process withdrawal request
   */
  async processWithdrawal(request: WithdrawalRequest): Promise<FinancialTransaction> {
    // Validate withdrawal request
    await this.validateWithdrawalRequest(request);

    // Check limits
    await this.checkWithdrawalLimits(request);

    // Check available balance
    const balance = await this.getCustomerBalance(request.customerId);
    if (balance.availableBalance < request.amount) {
      throw new Error('Insufficient funds');
    }

    // Risk assessment
    const riskScore = await this.assessWithdrawalRisk(request);

    // Create transaction
    const transaction: FinancialTransaction = {
      transactionId: this.generateTransactionId(),
      customerId: request.customerId,
      type: 'withdrawal',
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      paymentMethod: request.withdrawalMethod,
      referenceNumber: this.generateReferenceNumber(),
      processingFee: this.calculateWithdrawalFee(request),
      netAmount: request.amount - this.calculateWithdrawalFee(request),
      description: `Withdrawal via ${request.withdrawalMethod}`,
      metadata: {
        ...request.metadata,
        withdrawalDetails: this.sanitizeWithdrawalDetails(request.withdrawalDetails),
        priority: request.priority,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskScore,
      complianceCheck: await this.performComplianceCheck(request.customerId),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'withdrawal_created',
          performedBy: request.requestedBy,
          details: 'Withdrawal request created',
          changes: { status: 'pending' },
        },
      ],
    };

    // Store transaction
    this.transactions.set(transaction.transactionId, transaction);

    // Update customer balance (pending withdrawal)
    await this.updateCustomerBalance(
      request.customerId,
      'pending_withdrawal',
      -request.amount,
      request.currency,
      transaction.transactionId
    );

    // Process withdrawal (simulate async processing)
    setTimeout(() => {
      this.processWithdrawalAsync(transaction.transactionId);
    }, 2000);

    return transaction;
  }

  /**
   * Get customer balance
   */
  async getCustomerBalance(customerId: string): Promise<CustomerBalance> {
    if (!this.customerBalances.has(customerId)) {
      // Initialize new customer balance
      const balance: CustomerBalance = {
        customerId,
        availableBalance: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        lockedAmount: 0,
        bonusBalance: 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        balanceHistory: [],
      };
      this.customerBalances.set(customerId, balance);
    }

    return this.customerBalances.get(customerId)!;
  }

  /**
   * Update customer balance
   */
  private async updateCustomerBalance(
    customerId: string,
    changeType:
      | 'deposit'
      | 'withdrawal'
      | 'pending_deposit'
      | 'pending_withdrawal'
      | 'bonus'
      | 'fee',
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<void> {
    const balance = await this.getCustomerBalance(customerId);
    const previousBalance = balance.availableBalance;

    switch (changeType) {
      case 'deposit':
        balance.availableBalance += amount;
        balance.pendingDeposits = Math.max(0, balance.pendingDeposits - amount);
        break;
      case 'pending_deposit':
        balance.pendingDeposits += amount;
        break;
      case 'withdrawal':
        balance.availableBalance -= amount;
        balance.pendingWithdrawals = Math.max(0, balance.pendingWithdrawals - amount);
        break;
      case 'pending_withdrawal':
        balance.pendingWithdrawals += Math.abs(amount);
        break;
      case 'bonus':
        balance.bonusBalance += amount;
        break;
      case 'fee':
        balance.availableBalance -= Math.abs(amount);
        break;
    }

    balance.lastUpdated = new Date().toISOString();
    balance.balanceHistory.push({
      timestamp: new Date().toISOString(),
      previousBalance,
      newBalance: balance.availableBalance,
      transactionId,
      changeReason: changeType,
    });

    // Keep only last 100 history entries
    if (balance.balanceHistory.length > 100) {
      balance.balanceHistory = balance.balanceHistory.slice(-100);
    }
  }

  /**
   * Get customer payment limits
   */
  async getPaymentLimits(customerId: string): Promise<PaymentLimits> {
    if (!this.paymentLimits.has(customerId)) {
      // Initialize default limits
      const limits: PaymentLimits = {
        customerId,
        dailyDepositLimit: 10000,
        weeklyDepositLimit: 50000,
        monthlyDepositLimit: 100000,
        dailyWithdrawalLimit: 5000,
        weeklyWithdrawalLimit: 25000,
        monthlyWithdrawalLimit: 50000,
        maxTransactionAmount: 10000,
        minTransactionAmount: 10,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      };
      this.paymentLimits.set(customerId, limits);
    }

    return this.paymentLimits.get(customerId)!;
  }

  /**
   * Update payment limits
   */
  async updatePaymentLimits(customerId: string, updates: Partial<PaymentLimits>): Promise<void> {
    const limits = await this.getPaymentLimits(customerId);
    Object.assign(limits, updates, { lastUpdated: new Date().toISOString() });
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): FinancialTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get customer transactions
   */
  getCustomerTransactions(
    customerId: string,
    options: {
      type?: FinancialTransaction['type'];
      status?: FinancialTransaction['status'];
      limit?: number;
      offset?: number;
    } = {}
  ): FinancialTransaction[] {
    let transactions = Array.from(this.transactions.values()).filter(
      t => t.customerId === customerId
    );

    if (options.type) {
      transactions = transactions.filter(t => t.type === options.type);
    }

    if (options.status) {
      transactions = transactions.filter(t => t.status === options.status);
    }

    // Sort by creation date (newest first)
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = options.offset || 0;
    const limit = options.limit || transactions.length;

    return transactions.slice(offset, offset + limit);
  }

  /**
   * Process payment asynchronously (simulate payment processor)
   */
  private async processPaymentAsync(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    try {
      // Simulate payment processing
      transaction.status = 'processing';
      transaction.updatedAt = new Date().toISOString();

      // Simulate processing delay
      await this.delay(3000);

      // Simulate success/failure (90% success rate)
      const success = Math.random() > 0.1;

      if (success) {
        transaction.status = 'completed';
        transaction.processedAt = new Date().toISOString();
        transaction.completedAt = new Date().toISOString();

        // Update customer balance
        await this.updateCustomerBalance(
          transaction.customerId,
          'deposit',
          transaction.netAmount,
          transaction.currency,
          transaction.transactionId
        );
      } else {
        transaction.status = 'failed';
        transaction.failedAt = new Date().toISOString();
        transaction.failureReason = 'Payment processor declined transaction';

        // Revert pending balance
        await this.updateCustomerBalance(
          transaction.customerId,
          'pending_deposit',
          -transaction.amount,
          transaction.currency,
          transaction.transactionId
        );
      }

      transaction.updatedAt = new Date().toISOString();
      transaction.auditTrail.push({
        timestamp: new Date().toISOString(),
        action: transaction.status === 'completed' ? 'payment_completed' : 'payment_failed',
        performedBy: 'system',
        details:
          transaction.status === 'completed'
            ? 'Payment processed successfully'
            : 'Payment processing failed',
        changes: { status: transaction.status },
      });
    } catch (error) {
      console.error(`Payment processing failed for ${transactionId}:`, error);
      transaction.status = 'failed';
      transaction.failedAt = new Date().toISOString();
      transaction.failureReason = 'Internal processing error';
      transaction.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Process withdrawal asynchronously
   */
  private async processWithdrawalAsync(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    try {
      transaction.status = 'processing';
      transaction.updatedAt = new Date().toISOString();

      // Simulate processing delay (longer for withdrawals)
      await this.delay(5000);

      // Simulate success/failure (85% success rate for withdrawals)
      const success = Math.random() > 0.15;

      if (success) {
        transaction.status = 'completed';
        transaction.processedAt = new Date().toISOString();
        transaction.completedAt = new Date().toISOString();

        // Balance already updated when withdrawal was created
      } else {
        transaction.status = 'failed';
        transaction.failedAt = new Date().toISOString();
        transaction.failureReason = 'Withdrawal processor declined transaction';

        // Revert pending balance
        await this.updateCustomerBalance(
          transaction.customerId,
          'pending_withdrawal',
          transaction.amount,
          transaction.currency,
          transaction.transactionId
        );
      }

      transaction.updatedAt = new Date().toISOString();
      transaction.auditTrail.push({
        timestamp: new Date().toISOString(),
        action: transaction.status === 'completed' ? 'withdrawal_completed' : 'withdrawal_failed',
        performedBy: 'system',
        details:
          transaction.status === 'completed'
            ? 'Withdrawal processed successfully'
            : 'Withdrawal processing failed',
        changes: { status: transaction.status },
      });
    } catch (error) {
      console.error(`Withdrawal processing failed for ${transactionId}:`, error);
      transaction.status = 'failed';
      transaction.failedAt = new Date().toISOString();
      transaction.failureReason = 'Internal processing error';
      transaction.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Validate deposit request
   */
  private async validateDepositRequest(request: DepositRequest): Promise<void> {
    if (request.amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    const limits = await this.getPaymentLimits(request.customerId);
    if (request.amount < limits.minTransactionAmount) {
      throw new Error(`Minimum deposit amount is ${limits.minTransactionAmount}`);
    }

    if (request.amount > limits.maxTransactionAmount) {
      throw new Error(`Maximum deposit amount is ${limits.maxTransactionAmount}`);
    }

    // Validate payment method specific requirements
    switch (request.paymentMethod) {
      case 'credit_card':
      case 'debit_card':
        if (!request.paymentDetails.cardNumber) {
          throw new Error('Card number is required for card payments');
        }
        break;
      case 'bank_transfer':
        if (!request.paymentDetails.bankAccount) {
          throw new Error('Bank account is required for bank transfers');
        }
        break;
      case 'crypto':
        if (!request.paymentDetails.cryptoAddress) {
          throw new Error('Crypto address is required for crypto payments');
        }
        break;
    }
  }

  /**
   * Validate withdrawal request
   */
  private async validateWithdrawalRequest(request: WithdrawalRequest): Promise<void> {
    if (request.amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    const limits = await this.getPaymentLimits(request.customerId);
    if (request.amount < limits.minTransactionAmount) {
      throw new Error(`Minimum withdrawal amount is ${limits.minTransactionAmount}`);
    }

    if (request.amount > limits.maxTransactionAmount) {
      throw new Error(`Maximum withdrawal amount is ${limits.maxTransactionAmount}`);
    }

    // Validate withdrawal method specific requirements
    switch (request.withdrawalMethod) {
      case 'bank_transfer':
        if (!request.withdrawalDetails.bankAccount) {
          throw new Error('Bank account is required for bank transfers');
        }
        break;
      case 'crypto':
        if (!request.withdrawalDetails.cryptoAddress) {
          throw new Error('Crypto address is required for crypto withdrawals');
        }
        break;
      case 'check':
        if (!request.withdrawalDetails.mailingAddress) {
          throw new Error('Mailing address is required for check payments');
        }
        break;
    }
  }

  /**
   * Check deposit limits
   */
  private async checkDepositLimits(request: DepositRequest): Promise<void> {
    const limits = await this.getPaymentLimits(request.customerId);

    // Get today's transactions
    const today = new Date().toDateString();
    const todayDeposits = this.getCustomerTransactions(request.customerId, { type: 'deposit' })
      .filter(t => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayDeposits + request.amount > limits.dailyDepositLimit) {
      throw new Error(`Daily deposit limit of ${limits.dailyDepositLimit} would be exceeded`);
    }

    // Similar checks for weekly and monthly limits
    // Implementation would be similar to daily check
  }

  /**
   * Check withdrawal limits
   */
  private async checkWithdrawalLimits(request: WithdrawalRequest): Promise<void> {
    const limits = await this.getPaymentLimits(request.customerId);

    // Get today's transactions
    const today = new Date().toDateString();
    const todayWithdrawals = this.getCustomerTransactions(request.customerId, {
      type: 'withdrawal',
    })
      .filter(t => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayWithdrawals + request.amount > limits.dailyWithdrawalLimit) {
      throw new Error(`Daily withdrawal limit of ${limits.dailyWithdrawalLimit} would be exceeded`);
    }
  }

  /**
   * Assess deposit risk
   */
  private async assessDepositRisk(request: DepositRequest): Promise<number> {
    let risk = 0;

    // Amount-based risk
    if (request.amount > 5000) risk += 20;
    if (request.amount > 25000) risk += 30;

    // Payment method risk
    if (request.paymentMethod === 'crypto') risk += 15;

    // New customer risk
    // This would check customer history

    return Math.min(risk, 100);
  }

  /**
   * Assess withdrawal risk
   */
  private async assessWithdrawalRisk(request: WithdrawalRequest): Promise<number> {
    let risk = 0;

    // Amount-based risk
    if (request.amount > 5000) risk += 25;
    if (request.amount > 25000) risk += 35;

    // Priority risk
    if (request.priority === 'instant') risk += 20;

    // Withdrawal method risk
    if (request.withdrawalMethod === 'crypto') risk += 15;

    return Math.min(risk, 100);
  }

  /**
   * Perform compliance check
   */
  private async performComplianceCheck(
    customerId: string
  ): Promise<FinancialTransaction['complianceCheck']> {
    // In a real implementation, this would integrate with compliance systems
    return {
      kycVerified: true, // Mock
      amlCheck: true, // Mock
      sanctionsCheck: true, // Mock
      riskAssessment: 'low', // Mock
    };
  }

  /**
   * Calculate processing fee
   */
  private calculateProcessingFee(request: DepositRequest): number {
    const feeRates = {
      credit_card: 0.029, // 2.9%
      debit_card: 0.019, // 1.9%
      bank_transfer: 0.005, // 0.5%
      crypto: 0.01, // 1.0%
      paypal: 0.024, // 2.4%
      cash: 0, // 0%
    };

    return request.amount * (feeRates[request.paymentMethod] || 0.02);
  }

  /**
   * Calculate withdrawal fee
   */
  private calculateWithdrawalFee(request: WithdrawalRequest): number {
    const baseFees = {
      bank_transfer: 25,
      crypto: 10,
      paypal: 15,
      check: 5,
      cash: 0,
    };

    const priorityMultipliers = {
      standard: 1.0,
      express: 1.5,
      instant: 2.0,
    };

    const baseFee = baseFees[request.withdrawalMethod] || 10;
    const priorityFee = baseFee * priorityMultipliers[request.priority];

    return Math.min(priorityFee, request.amount * 0.05); // Max 5% of amount
  }

  /**
   * Sanitize payment details for storage
   */
  private sanitizePaymentDetails(details: DepositRequest['paymentDetails']): any {
    const sanitized = { ...details };

    // Mask sensitive information
    if (sanitized.cardNumber) {
      sanitized.cardNumber = `****-****-****-${sanitized.cardNumber.slice(-4)}`;
    }

    return sanitized;
  }

  /**
   * Sanitize withdrawal details
   */
  private sanitizeWithdrawalDetails(details: WithdrawalRequest['withdrawalDetails']): any {
    const sanitized = { ...details };

    // Mask sensitive information
    if (sanitized.bankAccount) {
      sanitized.bankAccount = `****${sanitized.bankAccount.slice(-4)}`;
    }

    return sanitized;
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate reference number
   */
  private generateReferenceNumber(): string {
    return `REF${this.transactionCounter++}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalTransactions: number;
    pendingTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    averageTransactionSize: number;
  } {
    const transactions = Array.from(this.transactions.values());
    const totalTransactions = transactions.length;
    const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
    const completedTransactions = transactions.filter(t => t.status === 'completed').length;
    const failedTransactions = transactions.filter(t => t.status === 'failed').length;
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    return {
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      totalVolume,
      averageTransactionSize,
    };
  }
}
