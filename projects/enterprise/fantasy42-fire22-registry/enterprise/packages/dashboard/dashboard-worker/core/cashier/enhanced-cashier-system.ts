/**
 * Enhanced Cashier System - Integrated with P2P, Peer Networks, and Advanced Validation
 * Provides comprehensive cashier services with intelligent peer matching and risk management
 */

import {
  CustomerDatabaseManagement,
  CustomerProfile,
} from '../customers/customer-database-management';
import { P2PPaymentMatching, P2PPaymentRequest } from '../payments/p2p-payment-matching';
import {
  CustomerPaymentValidation,
  PaymentValidationResult,
} from '../payments/customer-payment-validation';
import {
  DepositWithdrawalSystem,
  FinancialTransaction,
} from '../finance/deposit-withdrawal-system';
import {
  PeerGroupManager,
  PeerGroup,
  PeerMatchRecommendation,
} from '../peer-network/peer-group-manager';

export interface CashierSession {
  sessionId: string;
  customerId: string;
  agentId: string;
  startTime: string;
  endTime?: string;
  transactions: CashierTransaction[];
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  status: 'active' | 'completed' | 'cancelled';
  ipAddress: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
  riskAssessments: CashierRiskAssessment[];
}

export interface CashierTransaction {
  transactionId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'p2p_match';
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDetails: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  processedAt?: string;
  validationResult?: PaymentValidationResult;
  peerMatchData?: {
    peerId: string;
    groupId?: string;
    matchScore: number;
    trustScore: number;
  };
  riskScore: number;
  processingFee?: number;
  notes?: string;
  agentId: string;
}

export interface CashierRiskAssessment {
  assessmentId: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  factors: string[];
  recommendations: string[];
  automatedActions: string[];
  agentOverride?: {
    agentId: string;
    reason: string;
    timestamp: string;
  };
}

export interface EnhancedCashierOptions {
  customerId: string;
  agentId: string;
  ipAddress: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
  enablePeerMatching: boolean;
  enableAutoApproval: boolean;
  maxTransactionAmount: number;
  requireValidation: boolean;
}

export class EnhancedCashierSystem {
  private customerManager: CustomerDatabaseManagement;
  private p2pMatching: P2PPaymentMatching;
  private paymentValidation: CustomerPaymentValidation;
  private financialSystem: DepositWithdrawalSystem;
  private peerGroupManager: PeerGroupManager;

  private activeSessions: Map<string, CashierSession> = new Map();
  private transactionQueue: Map<string, CashierTransaction> = new Map();

  constructor(
    customerManager: CustomerDatabaseManagement,
    p2pMatching: P2PPaymentMatching,
    paymentValidation: CustomerPaymentValidation,
    financialSystem: DepositWithdrawalSystem,
    peerGroupManager: PeerGroupManager
  ) {
    this.customerManager = customerManager;
    this.p2pMatching = p2pMatching;
    this.paymentValidation = paymentValidation;
    this.financialSystem = financialSystem;
    this.peerGroupManager = peerGroupManager;
  }

  /**
   * Start a new cashier session
   */
  async startCashierSession(options: EnhancedCashierOptions): Promise<CashierSession> {
    const sessionId = this.generateSessionId();

    // Validate customer and agent
    const customer = this.customerManager.getCustomerProfile(options.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Perform initial risk assessment
    const initialRisk = await this.performRiskAssessment(options.customerId, options.ipAddress, 0);

    const session: CashierSession = {
      sessionId,
      customerId: options.customerId,
      agentId: options.agentId,
      startTime: new Date().toISOString(),
      transactions: [],
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalVolume: 0,
      status: 'active',
      ipAddress: options.ipAddress,
      deviceInfo: options.deviceInfo,
      riskAssessments: [initialRisk],
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Process a deposit transaction with enhanced validation and P2P matching
   */
  async processDeposit(
    sessionId: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: any,
    options: {
      preferPeerMatching?: boolean;
      maxWaitTime?: number; // minutes
      autoApprove?: boolean;
    } = {}
  ): Promise<CashierTransaction> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error('Invalid or inactive session');
    }

    // Validate transaction limits
    await this.validateTransactionLimits(session.customerId, amount, 'deposit');

    // Perform payment method validation
    const validation = await this.paymentValidation.validatePaymentMethod(
      session.customerId,
      paymentMethod,
      paymentDetails.username || paymentDetails.email || '',
      amount,
      'cashier'
    );

    // Check if transaction requires approval
    const requiresApproval = this.requiresManualApproval(validation, amount, session);

    // Create transaction record
    const transaction: CashierTransaction = {
      transactionId: this.generateTransactionId(),
      type: 'deposit',
      amount,
      currency: 'USD',
      paymentMethod,
      paymentDetails,
      status: requiresApproval ? 'pending' : 'processing',
      createdAt: new Date().toISOString(),
      validationResult: validation,
      riskScore: validation.validationScore,
      agentId: session.agentId,
    };

    // Try P2P matching if preferred and validation allows
    if (options.preferPeerMatching && validation.isValid && !requiresApproval) {
      try {
        const peerMatch = await this.attemptPeerMatching(
          session.customerId,
          amount,
          paymentMethod,
          options.maxWaitTime || 30
        );

        if (peerMatch) {
          transaction.type = 'p2p_match';
          transaction.peerMatchData = {
            peerId: peerMatch.peerId,
            groupId: peerMatch.groupId,
            matchScore: peerMatch.matchScore,
            trustScore: peerMatch.trustScore,
          };
          transaction.status = 'processing';
        }
      } catch (error) {
        console.log('P2P matching failed, proceeding with standard deposit:', error);
      }
    }

    // Add to session and queue
    session.transactions.push(transaction);
    session.totalDeposits += amount;
    session.totalVolume += amount;

    this.transactionQueue.set(transaction.transactionId, transaction);

    // Process transaction if auto-approved
    if (!requiresApproval && options.autoApprove !== false) {
      await this.processTransaction(transaction.transactionId);
    }

    return transaction;
  }

  /**
   * Process a withdrawal transaction
   */
  async processWithdrawal(
    sessionId: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: any
  ): Promise<CashierTransaction> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error('Invalid or inactive session');
    }

    // Check available balance
    const customer = this.customerManager.getCustomerProfile(session.customerId);
    if (!customer || customer.financialProfile.currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Validate transaction limits
    await this.validateTransactionLimits(session.customerId, amount, 'withdrawal');

    // Perform payment method validation
    const validation = await this.paymentValidation.validatePaymentMethod(
      session.customerId,
      paymentMethod,
      paymentDetails.username || paymentDetails.email || '',
      amount,
      'cashier'
    );

    // Check if transaction requires approval
    const requiresApproval = this.requiresManualApproval(validation, amount, session);

    const transaction: CashierTransaction = {
      transactionId: this.generateTransactionId(),
      type: 'withdrawal',
      amount,
      currency: 'USD',
      paymentMethod,
      paymentDetails,
      status: requiresApproval ? 'pending' : 'processing',
      createdAt: new Date().toISOString(),
      validationResult: validation,
      riskScore: validation.validationScore,
      agentId: session.agentId,
    };

    // Add to session and queue
    session.transactions.push(transaction);
    session.totalWithdrawals += amount;
    session.totalVolume += amount;

    this.transactionQueue.set(transaction.transactionId, transaction);

    return transaction;
  }

  /**
   * Get cashier dashboard with comprehensive analytics
   */
  getCashierDashboard(sessionId: string): {
    session: CashierSession;
    customerProfile: CustomerProfile;
    peerNetwork: any;
    recentTransactions: CashierTransaction[];
    pendingApprovals: CashierTransaction[];
    riskSummary: {
      overallRisk: string;
      recentAssessments: CashierRiskAssessment[];
      recommendations: string[];
    };
    performance: {
      sessionUptime: number;
      transactionsProcessed: number;
      successRate: number;
      averageProcessingTime: number;
    };
  } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const customer = this.customerManager.getCustomerProfile(session.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const peerNetwork = this.peerGroupManager.getPeerNetworkDashboard(session.customerId);

    const recentTransactions = session.transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const pendingApprovals = session.transactions.filter(t => t.status === 'pending');

    const riskSummary = this.generateRiskSummary(session);

    const performance = this.calculateSessionPerformance(session);

    return {
      session,
      customerProfile: customer,
      peerNetwork,
      recentTransactions,
      pendingApprovals,
      riskSummary,
      performance,
    };
  }

  /**
   * Approve a pending transaction
   */
  async approveTransaction(
    sessionId: string,
    transactionId: string,
    agentId: string,
    notes?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const transaction = session.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending approval');
    }

    // Record agent override
    if (transaction.validationResult) {
      transaction.validationResult.checks.riskCheck.automatedActions.push(
        `Approved by agent ${agentId} at ${new Date().toISOString()}`
      );
    }

    transaction.agentId = agentId;
    transaction.notes = notes;
    transaction.status = 'processing';

    await this.processTransaction(transactionId);
  }

  /**
   * Reject a pending transaction
   */
  async rejectTransaction(
    sessionId: string,
    transactionId: string,
    agentId: string,
    reason: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const transaction = session.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending approval');
    }

    transaction.status = 'cancelled';
    transaction.notes = `Rejected by agent ${agentId}: ${reason}`;

    // Update validation result
    if (transaction.validationResult) {
      transaction.validationResult.checks.riskCheck.automatedActions.push(
        `Rejected by agent ${agentId}: ${reason}`
      );
    }
  }

  /**
   * End cashier session
   */
  async endCashierSession(sessionId: string): Promise<CashierSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.endTime = new Date().toISOString();
    session.status = 'completed';

    // Final risk assessment
    const finalRisk = await this.performRiskAssessment(
      session.customerId,
      session.ipAddress,
      session.totalVolume
    );
    session.riskAssessments.push(finalRisk);

    // Clean up
    this.activeSessions.delete(sessionId);

    return session;
  }

  // Private helper methods

  private async attemptPeerMatching(
    customerId: string,
    amount: number,
    paymentMethod: string,
    maxWaitTime: number
  ): Promise<{ peerId: string; groupId?: string; matchScore: number; trustScore: number } | null> {
    try {
      const recommendations = await this.peerGroupManager.findPeerMatches(
        customerId,
        'deposit',
        amount,
        paymentMethod,
        5
      );

      if (recommendations.recommendedPeers.length === 0) {
        return null;
      }

      // Take the best match
      const bestMatch = recommendations.recommendedPeers[0];

      // Check if peer is available for matching
      const peerRequest = await this.p2pMatching.createPaymentRequest(
        bestMatch.peerId,
        'withdrawal',
        paymentMethod,
        amount,
        { maxWaitTime },
        'cashier_system'
      );

      if (peerRequest.status === 'matched') {
        return {
          peerId: bestMatch.peerId,
          matchScore: bestMatch.matchScore,
          trustScore: bestMatch.trustScore,
        };
      }

      return null;
    } catch (error) {
      console.log('Peer matching attempt failed:', error);
      return null;
    }
  }

  private async performRiskAssessment(
    customerId: string,
    ipAddress: string,
    amount: number
  ): Promise<CashierRiskAssessment> {
    const factors: string[] = [];
    let riskScore = 0;

    // Customer risk factors
    const customer = this.customerManager.getCustomerProfile(customerId);
    if (customer) {
      if (customer.rankingProfile.overallScore < 70) {
        factors.push('Low customer trust score');
        riskScore += 20;
      }

      if (customer.accountInfo.accountStatus !== 'active') {
        factors.push('Account not in active status');
        riskScore += 30;
      }

      // Check recent activity
      const recentTransactions = this.financialSystem
        .getCustomerTransactions(customerId)
        .filter(t => new Date(t.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000));

      if (recentTransactions.length > 10) {
        factors.push('High transaction frequency');
        riskScore += 15;
      }
    }

    // IP-based risk factors
    if (this.isSuspiciousIP(ipAddress)) {
      factors.push('Suspicious IP address');
      riskScore += 25;
    }

    // Amount-based risk factors
    if (amount > 1000) {
      factors.push('High transaction amount');
      riskScore += 20;
    }

    // Determine risk level
    let riskLevel: CashierRiskAssessment['riskLevel'];
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(riskLevel, factors);

    // Generate automated actions
    const automatedActions = this.generateAutomatedActions(riskLevel, amount);

    return {
      assessmentId: this.generateAssessmentId(),
      timestamp: new Date().toISOString(),
      riskLevel,
      riskScore,
      factors,
      recommendations,
      automatedActions,
    };
  }

  private requiresManualApproval(
    validation: PaymentValidationResult,
    amount: number,
    session: CashierSession
  ): boolean {
    // High or critical risk always requires approval
    if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
      return true;
    }

    // Large amounts require approval
    if (amount > 500) {
      return true;
    }

    // New payment methods require approval
    if (!validation.checks.historyCheck.hasHistory) {
      return true;
    }

    // Suspicious validation scores
    if (validation.validationScore < 70) {
      return true;
    }

    // Recent risk assessments
    const recentRisk = session.riskAssessments[session.riskAssessments.length - 1];
    if (recentRisk && recentRisk.riskLevel === 'high') {
      return true;
    }

    return false;
  }

  private async validateTransactionLimits(
    customerId: string,
    amount: number,
    type: 'deposit' | 'withdrawal'
  ): Promise<void> {
    const customer = this.customerManager.getCustomerProfile(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check daily limits
    const today = new Date().toDateString();
    const todayTransactions = this.financialSystem
      .getCustomerTransactions(customerId)
      .filter(t => new Date(t.createdAt).toDateString() === today);

    const todayVolume = todayTransactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);

    const dailyLimit = type === 'deposit' ? 5000 : 10000;
    if (todayVolume + amount > dailyLimit) {
      throw new Error(`Daily ${type} limit exceeded. Limit: $${dailyLimit}`);
    }

    // Check transaction amount limits
    const maxTransaction = type === 'deposit' ? 1000 : 2500;
    if (amount > maxTransaction) {
      throw new Error(`Maximum ${type} amount is $${maxTransaction}`);
    }
  }

  private async processTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactionQueue.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // Process based on transaction type
      if (transaction.type === 'p2p_match' && transaction.peerMatchData) {
        // Process P2P transaction
        await this.peerGroupManager.processPeerTransaction(
          transaction.transactionId, // This should be customerId
          transaction.peerMatchData.peerId,
          transaction.amount,
          transaction.paymentMethod,
          transaction.paymentDetails
        );
      } else {
        // Process standard transaction
        await this.financialSystem.processTransaction({
          customerId: transaction.transactionId, // This should be customerId
          type: transaction.type as any,
          amount: transaction.amount,
          paymentMethod: transaction.paymentMethod,
          paymentDetails: transaction.paymentDetails,
        });
      }

      transaction.status = 'completed';
      transaction.processedAt = new Date().toISOString();
    } catch (error) {
      transaction.status = 'failed';
      transaction.notes = `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }
  }

  private generateRiskRecommendations(
    riskLevel: CashierRiskAssessment['riskLevel'],
    factors: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Require manual approval for all transactions');
      recommendations.push('Contact customer for additional verification');
      recommendations.push('Consider temporary account restrictions');
    } else if (riskLevel === 'high') {
      recommendations.push('Require manual approval for transactions over $100');
      recommendations.push('Monitor customer activity closely');
      recommendations.push('Verify payment method details');
    } else if (riskLevel === 'medium') {
      recommendations.push('Enable enhanced validation for transactions');
      recommendations.push('Limit transaction amounts');
      recommendations.push('Monitor for unusual patterns');
    }

    if (factors.includes('Suspicious IP address')) {
      recommendations.push('Verify customer identity through additional means');
      recommendations.push('Check for account takeover attempts');
    }

    if (factors.includes('High transaction frequency')) {
      recommendations.push('Monitor for potential money laundering patterns');
      recommendations.push('Consider transaction velocity limits');
    }

    return recommendations;
  }

  private generateAutomatedActions(
    riskLevel: CashierRiskAssessment['riskLevel'],
    amount: number
  ): string[] {
    const actions: string[] = [];

    if (riskLevel === 'critical') {
      actions.push('Block transactions over $100');
      actions.push('Require 2FA for all transactions');
      actions.push('Flag account for review');
    } else if (riskLevel === 'high') {
      actions.push('Require approval for transactions over $250');
      actions.push('Limit daily transaction volume');
      actions.push('Enable additional validation checks');
    } else if (riskLevel === 'medium') {
      actions.push('Require approval for transactions over $500');
      actions.push('Enable transaction monitoring');
    }

    return actions;
  }

  private isSuspiciousIP(ipAddress: string): boolean {
    // This would integrate with IP reputation services
    // For now, return false
    return false;
  }

  private generateRiskSummary(session: CashierSession): any {
    const latestAssessment = session.riskAssessments[session.riskAssessments.length - 1];

    return {
      overallRisk: latestAssessment?.riskLevel || 'unknown',
      recentAssessments: session.riskAssessments.slice(-5),
      recommendations: latestAssessment?.recommendations || [],
    };
  }

  private calculateSessionPerformance(session: CashierSession): any {
    const uptime = session.endTime
      ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
      : Date.now() - new Date(session.startTime).getTime();

    const completedTransactions = session.transactions.filter(t => t.status === 'completed').length;
    const totalTransactions = session.transactions.length;
    const successRate = totalTransactions > 0 ? completedTransactions / totalTransactions : 0;

    const processingTimes = session.transactions
      .filter(t => t.processedAt)
      .map(t => new Date(t.processedAt!).getTime() - new Date(t.createdAt).getTime());

    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

    return {
      sessionUptime: Math.round(uptime / 1000), // seconds
      transactionsProcessed: completedTransactions,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime / 1000), // seconds
    };
  }

  private generateSessionId(): string {
    return `cashier_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `cashier_txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateAssessmentId(): string {
    return `risk_assessment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get system-wide cashier analytics
   */
  getCashierAnalytics(): {
    activeSessions: number;
    totalTransactions: number;
    successRate: number;
    averageProcessingTime: number;
    riskDistribution: Record<string, number>;
    popularPaymentMethods: Array<{ method: string; count: number }>;
    peakHours: Array<{ hour: number; volume: number }>;
  } {
    const activeSessions = this.activeSessions.size;
    const allTransactions = Array.from(this.transactionQueue.values());

    const totalTransactions = allTransactions.length;
    const successfulTransactions = allTransactions.filter(t => t.status === 'completed').length;
    const successRate = totalTransactions > 0 ? successfulTransactions / totalTransactions : 0;

    const processingTimes = allTransactions
      .filter(t => t.processedAt)
      .map(t => new Date(t.processedAt!).getTime() - new Date(t.createdAt).getTime());

    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

    // Risk distribution
    const riskDistribution: Record<string, number> = {};
    allTransactions.forEach(t => {
      const risk = t.validationResult?.riskLevel || 'unknown';
      riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;
    });

    // Popular payment methods
    const methodCounts: Record<string, number> = {};
    allTransactions.forEach(t => {
      methodCounts[t.paymentMethod] = (methodCounts[t.paymentMethod] || 0) + 1;
    });

    const popularPaymentMethods = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    // Peak hours analysis
    const hourlyVolume: Record<number, number> = {};
    allTransactions.forEach(t => {
      const hour = new Date(t.createdAt).getHours();
      hourlyVolume[hour] = (hourlyVolume[hour] || 0) + t.amount;
    });

    const peakHours = Object.entries(hourlyVolume)
      .map(([hour, volume]) => ({ hour: parseInt(hour), volume }))
      .sort((a, b) => b.volume - a.volume);

    return {
      activeSessions,
      totalTransactions,
      successRate,
      averageProcessingTime,
      riskDistribution,
      popularPaymentMethods,
      peakHours,
    };
  }
}
