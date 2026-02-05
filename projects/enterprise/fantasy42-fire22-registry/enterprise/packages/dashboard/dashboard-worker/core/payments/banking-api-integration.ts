/**
 * Banking API Integration
 * Comprehensive banking operations including ACH, wire transfers, and account management
 */

export interface BankingConfig {
  plaid: {
    enabled: boolean;
    clientId: string;
    secretKey: string;
    environment: 'sandbox' | 'development' | 'production';
    products: string[];
    countryCodes: string[];
  };
  stripeTreasury: {
    enabled: boolean;
    apiKey: string;
    accountId?: string;
    features: {
      inboundTransfers: boolean;
      outboundTransfers: boolean;
      financialAccounts: boolean;
      receivedCredits: boolean;
      receivedDebits: boolean;
    };
  };
  dwolla: {
    enabled: boolean;
    key: string;
    secret: string;
    environment: 'sandbox' | 'production';
    masterAccountId?: string;
  };
  finicity: {
    enabled: boolean;
    partnerId: string;
    partnerSecret: string;
    appKey: string;
    environment: 'sandbox' | 'production';
  };
  treasuryPrime: {
    enabled: boolean;
    apiKey: string;
    accountId: string;
    environment: 'sandbox' | 'production';
  };
}

export interface BankAccount {
  id: string;
  customerId: string;
  accountId: string; // Bank's account ID
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  accountName: string;
  bankName: string;
  bankAddress?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed' | 'expired';
  verificationMethod: 'plaid' | 'micro_deposits' | 'manual' | 'instant';
  verificationAttempts: number;
  lastVerifiedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface BankingTransaction {
  id: string;
  customerId: string;
  bankAccountId: string;
  type:
    | 'ach_debit'
    | 'ach_credit'
    | 'wire_inbound'
    | 'wire_outbound'
    | 'check_deposit'
    | 'check_payment';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'returned';
  description: string;
  referenceNumber: string;
  externalTransactionId?: string;
  counterpartyAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountName: string;
    bankName: string;
  };
  fees: {
    processingFee: number;
    wireFee: number;
    totalFees: number;
  };
  processingTime?: string; // ACH processing time
  settlementDate?: string;
  returnCode?: string;
  returnReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  metadata: Record<string, any>;
}

export interface ACHTransfer {
  id: string;
  customerId: string;
  bankAccountId: string;
  direction: 'debit' | 'credit';
  amount: number;
  currency: string;
  description: string;
  effectiveDate: string;
  status: 'pending' | 'submitted' | 'processed' | 'returned' | 'failed';
  traceNumber?: string;
  companyEntryDescription?: string;
  originatingDFI?: string;
  batchId?: string;
  returnCode?: string;
  returnReason?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface WireTransfer {
  id: string;
  customerId: string;
  bankAccountId: string;
  direction: 'inbound' | 'outbound';
  amount: number;
  currency: string;
  beneficiary: {
    name: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    bankName: string;
    bankAddress: string;
  };
  originator?: {
    name: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    bankName: string;
    bankAddress: string;
  };
  purpose: string;
  status: 'pending' | 'submitted' | 'completed' | 'failed' | 'cancelled';
  referenceNumber: string;
  externalReference?: string;
  fees: {
    wireFee: number;
    intermediaryFees: number;
    totalFees: number;
  };
  estimatedSettlementTime: string;
  actualSettlementTime?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BankingLimits {
  customerId: string;
  ach: {
    dailyDebitLimit: number;
    dailyCreditLimit: number;
    monthlyDebitLimit: number;
    monthlyCreditLimit: number;
  };
  wire: {
    dailyOutboundLimit: number;
    monthlyOutboundLimit: number;
    maxTransactionAmount: number;
  };
  verification: {
    maxVerificationAttempts: number;
    verificationExpiryDays: number;
  };
  createdAt: string;
  updatedAt: string;
}

export class BankingAPIIntegration {
  private config: BankingConfig;
  private bankAccounts: Map<string, BankAccount[]> = new Map();
  private bankingTransactions: Map<string, BankingTransaction> = new Map();
  private achTransfers: Map<string, ACHTransfer> = new Map();
  private wireTransfers: Map<string, WireTransfer> = new Map();
  private bankingLimits: Map<string, BankingLimits> = new Map();

  constructor(config: BankingConfig) {
    this.config = config;
  }

  /**
   * Link bank account using Plaid
   */
  async linkBankAccount(
    customerId: string,
    publicToken: string,
    accountId: string,
    metadata?: Record<string, any>
  ): Promise<BankAccount> {
    if (!this.config.plaid.enabled) {
      throw new Error('Plaid integration not enabled');
    }

    try {
      // Exchange public token for access token
      const accessToken = await this.exchangePlaidToken(publicToken);

      // Get account details
      const accountDetails = await this.getPlaidAccountDetails(accessToken, accountId);

      // Create bank account record
      const bankAccount: BankAccount = {
        id: this.generateAccountId(),
        customerId,
        accountId,
        accountNumber: accountDetails.accountNumber,
        routingNumber: accountDetails.routingNumber,
        accountType: accountDetails.accountType,
        accountName: accountDetails.accountName,
        bankName: accountDetails.bankName,
        currency: accountDetails.currency || 'USD',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'plaid',
        verificationAttempts: 1,
        lastVerifiedAt: new Date().toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: metadata || {},
      };

      // Store bank account
      if (!this.bankAccounts.has(customerId)) {
        this.bankAccounts.set(customerId, []);
      }
      this.bankAccounts.get(customerId)!.push(bankAccount);

      return bankAccount;
    } catch (error) {
      console.error('Error linking bank account:', error);
      throw new Error('Failed to link bank account');
    }
  }

  /**
   * Create ACH transfer
   */
  async createACHTransfer(
    customerId: string,
    bankAccountId: string,
    direction: 'debit' | 'credit',
    amount: number,
    description: string,
    effectiveDate?: string
  ): Promise<ACHTransfer> {
    // Validate bank account
    const bankAccount = await this.getBankAccount(customerId, bankAccountId);
    if (!bankAccount || !bankAccount.isVerified) {
      throw new Error('Invalid or unverified bank account');
    }

    // Check limits
    await this.checkACHLimits(customerId, direction, amount);

    const transfer: ACHTransfer = {
      id: this.generateTransferId(),
      customerId,
      bankAccountId,
      direction,
      amount,
      currency: bankAccount.currency,
      description,
      effectiveDate: effectiveDate || this.getNextBusinessDay(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.achTransfers.set(transfer.id, transfer);

    // Submit ACH transfer
    await this.submitACHTransfer(transfer);

    return transfer;
  }

  /**
   * Create wire transfer
   */
  async createWireTransfer(
    customerId: string,
    bankAccountId: string,
    direction: 'inbound' | 'outbound',
    amount: number,
    beneficiary: WireTransfer['beneficiary'],
    purpose: string
  ): Promise<WireTransfer> {
    // Validate bank account
    const bankAccount = await this.getBankAccount(customerId, bankAccountId);
    if (!bankAccount || !bankAccount.isVerified) {
      throw new Error('Invalid or unverified bank account');
    }

    // Check limits
    await this.checkWireLimits(customerId, amount);

    const transfer: WireTransfer = {
      id: this.generateTransferId(),
      customerId,
      bankAccountId,
      direction,
      amount,
      currency: bankAccount.currency,
      beneficiary,
      purpose,
      status: 'pending',
      referenceNumber: this.generateReferenceNumber(),
      fees: {
        wireFee: this.calculateWireFee(amount),
        intermediaryFees: 0,
        totalFees: this.calculateWireFee(amount),
      },
      estimatedSettlementTime: direction === 'outbound' ? '1-2 business days' : 'instant',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.wireTransfers.set(transfer.id, transfer);

    // Submit wire transfer
    await this.submitWireTransfer(transfer);

    return transfer;
  }

  /**
   * Verify bank account using micro-deposits
   */
  async verifyBankAccount(
    customerId: string,
    bankAccountId: string,
    amounts: [number, number]
  ): Promise<boolean> {
    const bankAccount = await this.getBankAccount(customerId, bankAccountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Send micro-deposits
    await this.sendMicroDeposits(bankAccount, amounts);

    // Mark as pending verification
    bankAccount.verificationStatus = 'pending';
    bankAccount.verificationAttempts++;
    bankAccount.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Confirm micro-deposit verification
   */
  async confirmMicroDepositVerification(
    customerId: string,
    bankAccountId: string,
    amounts: [number, number]
  ): Promise<boolean> {
    const bankAccount = await this.getBankAccount(customerId, bankAccountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Verify amounts match
    const isVerified = await this.verifyMicroDepositAmounts(bankAccount, amounts);

    if (isVerified) {
      bankAccount.isVerified = true;
      bankAccount.verificationStatus = 'verified';
      bankAccount.lastVerifiedAt = new Date().toISOString();
    } else {
      bankAccount.verificationStatus = 'failed';
      bankAccount.verificationAttempts++;
    }

    bankAccount.updatedAt = new Date().toISOString();
    return isVerified;
  }

  /**
   * Get customer bank accounts
   */
  getCustomerBankAccounts(customerId: string): BankAccount[] {
    return this.bankAccounts.get(customerId) || [];
  }

  /**
   * Get banking transactions
   */
  getCustomerBankingTransactions(customerId: string): BankingTransaction[] {
    return Array.from(this.bankingTransactions.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get ACH transfers
   */
  getCustomerACHTransfers(customerId: string): ACHTransfer[] {
    return Array.from(this.achTransfers.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get wire transfers
   */
  getCustomerWireTransfers(customerId: string): WireTransfer[] {
    return Array.from(this.wireTransfers.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update banking limits
   */
  async updateBankingLimits(
    customerId: string,
    limits: Partial<BankingLimits['ach'] & BankingLimits['wire'] & BankingLimits['verification']>
  ): Promise<void> {
    if (!this.bankingLimits.has(customerId)) {
      this.bankingLimits.set(customerId, {
        customerId,
        ach: {
          dailyDebitLimit: 5000,
          dailyCreditLimit: 10000,
          monthlyDebitLimit: 25000,
          monthlyCreditLimit: 50000,
        },
        wire: {
          dailyOutboundLimit: 50000,
          monthlyOutboundLimit: 250000,
          maxTransactionAmount: 100000,
        },
        verification: {
          maxVerificationAttempts: 3,
          verificationExpiryDays: 7,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const existingLimits = this.bankingLimits.get(customerId)!;
    Object.assign(existingLimits, limits);
    existingLimits.updatedAt = new Date().toISOString();
  }

  /**
   * Get banking limits
   */
  getBankingLimits(customerId: string): BankingLimits | undefined {
    return this.bankingLimits.get(customerId);
  }

  // Private helper methods
  private async exchangePlaidToken(publicToken: string): Promise<string> {
    // In real implementation, would call Plaid API
    console.log('Exchanging Plaid public token');
    return `access_${Date.now()}`;
  }

  private async getPlaidAccountDetails(accessToken: string, accountId: string): Promise<any> {
    // In real implementation, would call Plaid API
    console.log(`Getting Plaid account details for ${accountId}`);
    return {
      accountNumber: '****1234',
      routingNumber: '123456789',
      accountType: 'checking',
      accountName: 'Checking Account',
      bankName: 'Test Bank',
      currency: 'USD',
    };
  }

  private async getBankAccount(
    customerId: string,
    bankAccountId: string
  ): Promise<BankAccount | undefined> {
    const accounts = this.bankAccounts.get(customerId);
    return accounts?.find(acc => acc.id === bankAccountId);
  }

  private async checkACHLimits(
    customerId: string,
    direction: 'debit' | 'credit',
    amount: number
  ): Promise<void> {
    const limits = this.getBankingLimits(customerId);
    if (!limits) return; // Use default limits

    const today = new Date().toDateString();
    const todayTransfers = Array.from(this.achTransfers.values()).filter(
      t =>
        t.customerId === customerId &&
        t.direction === direction &&
        new Date(t.createdAt).toDateString() === today
    );

    const todayTotal = todayTransfers.reduce((sum, t) => sum + t.amount, 0);

    if (direction === 'debit') {
      if (todayTotal + amount > limits.ach.dailyDebitLimit) {
        throw new Error('ACH daily debit limit exceeded');
      }
    } else {
      if (todayTotal + amount > limits.ach.dailyCreditLimit) {
        throw new Error('ACH daily credit limit exceeded');
      }
    }
  }

  private async checkWireLimits(customerId: string, amount: number): Promise<void> {
    const limits = this.getBankingLimits(customerId);
    if (!limits) return;

    if (amount > limits.wire.maxTransactionAmount) {
      throw new Error('Wire transfer amount exceeds limit');
    }

    const today = new Date().toDateString();
    const todayTransfers = Array.from(this.wireTransfers.values()).filter(
      t =>
        t.customerId === customerId &&
        t.direction === 'outbound' &&
        new Date(t.createdAt).toDateString() === today
    );

    const todayTotal = todayTransfers.reduce((sum, t) => sum + t.amount, 0);

    if (todayTotal + amount > limits.wire.dailyOutboundLimit) {
      throw new Error('Wire daily outbound limit exceeded');
    }
  }

  private async submitACHTransfer(transfer: ACHTransfer): Promise<void> {
    // In real implementation, would submit to ACH processor
    console.log(`Submitting ACH transfer ${transfer.id}`);

    // Simulate processing
    setTimeout(() => {
      transfer.status = Math.random() > 0.05 ? 'processed' : 'failed';
      transfer.processedAt = new Date().toISOString();
      transfer.updatedAt = new Date().toISOString();
    }, 2000);
  }

  private async submitWireTransfer(transfer: WireTransfer): Promise<void> {
    // In real implementation, would submit to wire processor
    console.log(`Submitting wire transfer ${transfer.id}`);

    // Simulate processing
    setTimeout(() => {
      transfer.status = Math.random() > 0.03 ? 'completed' : 'failed';
      transfer.completedAt = new Date().toISOString();
      transfer.actualSettlementTime = transfer.estimatedSettlementTime;
      transfer.updatedAt = new Date().toISOString();
    }, 3000);
  }

  private async sendMicroDeposits(
    bankAccount: BankAccount,
    amounts: [number, number]
  ): Promise<void> {
    // In real implementation, would send micro-deposits via ACH
    console.log(`Sending micro-deposits to ${bankAccount.accountNumber}: ${amounts.join(', ')}`);
  }

  private async verifyMicroDepositAmounts(
    bankAccount: BankAccount,
    amounts: [number, number]
  ): Promise<boolean> {
    // In real implementation, would verify against actual deposits
    console.log(`Verifying micro-deposit amounts for ${bankAccount.accountNumber}`);
    return Math.random() > 0.1; // 90% success rate
  }

  private getNextBusinessDay(): string {
    const date = new Date();
    const day = date.getDay();

    // If it's Friday or later, add days to get to Monday
    if (day === 5)
      date.setDate(date.getDate() + 3); // Friday -> Monday
    else if (day === 6)
      date.setDate(date.getDate() + 2); // Saturday -> Monday
    else if (day === 0)
      date.setDate(date.getDate() + 1); // Sunday -> Monday
    else date.setDate(date.getDate() + 1); // Next business day

    return date.toISOString().split('T')[0];
  }

  private calculateWireFee(amount: number): number {
    // Domestic wire fee
    if (amount <= 5000) return 25;
    if (amount <= 25000) return 35;
    return 45;
  }

  private generateAccountId(): string {
    return `ba_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateTransferId(): string {
    return `bt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateReferenceNumber(): string {
    return `REF${Date.now().toString().slice(-8)}`;
  }

  /**
   * Get banking statistics
   */
  getStats(): {
    totalBankAccounts: number;
    totalACHTransfers: number;
    totalWireTransfers: number;
    pendingTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
  } {
    const totalBankAccounts = Array.from(this.bankAccounts.values()).reduce(
      (sum, accounts) => sum + accounts.length,
      0
    );
    const totalACHTransfers = this.achTransfers.size;
    const totalWireTransfers = this.wireTransfers.size;

    const allTransactions = [
      ...Array.from(this.achTransfers.values()),
      ...Array.from(this.wireTransfers.values()),
    ];

    const pendingTransactions = allTransactions.filter(t => t.status === 'pending').length;
    const completedTransactions = allTransactions.filter(
      t => t.status === 'completed' || t.status === 'processed'
    ).length;
    const failedTransactions = allTransactions.filter(
      t => t.status === 'failed' || t.status === 'returned'
    ).length;

    return {
      totalBankAccounts,
      totalACHTransfers,
      totalWireTransfers,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
    };
  }
}
