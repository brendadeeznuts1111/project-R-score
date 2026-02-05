/**
 * Customer Payment Validation & History System
 * Validates payment methods against customer history and flags anomalies
 */

import {
  CustomerDatabaseManagement,
  CustomerProfile,
} from '../customers/customer-database-management';
import {
  DepositWithdrawalSystem,
  FinancialTransaction,
} from '../finance/deposit-withdrawal-system';
import { P2PPaymentMatching, P2PPaymentRequest } from './p2p-payment-matching';

export interface PaymentMethodHistory {
  customerId: string;
  paymentMethod: string;
  firstUsed: string;
  lastUsed: string;
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  averageAmount: number;
  frequencyScore: number; // How often they use this method
  reliabilityScore: number; // Success rate and issue history
  lastAmount?: number;
  preferredUsername?: string;
  verifiedAccounts: Array<{
    username: string;
    verifiedAt: string;
    verificationMethod: 'transaction' | 'manual' | 'api';
    isActive: boolean;
  }>;
  issues: Array<{
    issueType: 'chargeback' | 'failed_transaction' | 'suspicious_activity' | 'account_issue';
    date: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
    resolutionDate?: string;
  }>;
}

export interface PaymentValidationResult {
  customerId: string;
  paymentMethod: string;
  username: string;
  isValid: boolean;
  validationScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  checks: {
    historyCheck: {
      passed: boolean;
      hasHistory: boolean;
      firstUsed?: string;
      totalTransactions: number;
      issues: number;
    };
    consistencyCheck: {
      passed: boolean;
      isConsistent: boolean;
      usualAmount?: number;
      amountDeviation: number;
    };
    frequencyCheck: {
      passed: boolean;
      isNormalFrequency: boolean;
      usualFrequency: number;
      currentFrequency: number;
    };
    riskCheck: {
      passed: boolean;
      riskFactors: string[];
      riskScore: number;
    };
  };
  recommendations: string[];
  warnings: string[];
  requiresApproval: boolean;
  suggestedLimits?: {
    maxAmount: number;
    maxDaily: number;
    maxMonthly: number;
  };
}

export interface PaymentMethodAlert {
  id: string;
  customerId: string;
  alertType:
    | 'new_payment_method'
    | 'unusual_amount'
    | 'high_frequency'
    | 'suspicious_pattern'
    | 'account_issue';
  paymentMethod: string;
  username?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  actions: string[];
}

export class CustomerPaymentValidation {
  private customerManager: CustomerDatabaseManagement;
  private financialSystem: DepositWithdrawalSystem;
  private p2pMatching: P2PPaymentMatching;
  private paymentHistory: Map<string, PaymentMethodHistory> = new Map();
  private alerts: Map<string, PaymentMethodAlert> = new Map();

  constructor(
    customerManager: CustomerDatabaseManagement,
    financialSystem: DepositWithdrawalSystem,
    p2pMatching: P2PPaymentMatching
  ) {
    this.customerManager = customerManager;
    this.financialSystem = financialSystem;
    this.p2pMatching = p2pMatching;
  }

  /**
   * Validate payment method for customer
   */
  async validatePaymentMethod(
    customerId: string,
    paymentMethod: string,
    username: string,
    amount: number,
    context: 'deposit' | 'withdrawal' | 'p2p' = 'p2p'
  ): Promise<PaymentValidationResult> {
    // Get customer profile
    const customer = this.customerManager.getCustomerProfile(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get payment method history
    const history = await this.getPaymentMethodHistory(customerId, paymentMethod);

    // Perform validation checks
    const historyCheck = this.performHistoryCheck(history, username);
    const consistencyCheck = this.performConsistencyCheck(history, amount);
    const frequencyCheck = this.performFrequencyCheck(history, customerId);
    const riskCheck = this.performRiskCheck(customer, history, amount, context);

    // Calculate overall validation score
    const validationScore = this.calculateValidationScore(
      historyCheck,
      consistencyCheck,
      frequencyCheck,
      riskCheck
    );

    const riskLevel = this.determineRiskLevel(validationScore);

    // Generate recommendations and warnings
    const recommendations = this.generateRecommendations(
      historyCheck,
      consistencyCheck,
      frequencyCheck,
      riskCheck,
      riskLevel
    );

    const warnings = this.generateWarnings(
      historyCheck,
      consistencyCheck,
      frequencyCheck,
      riskCheck
    );

    // Determine if approval is required
    const requiresApproval = this.requiresApproval(riskLevel, validationScore);

    // Generate suggested limits
    const suggestedLimits = this.generateSuggestedLimits(history, riskLevel);

    const result: PaymentValidationResult = {
      customerId,
      paymentMethod,
      username,
      isValid: validationScore >= 60,
      validationScore,
      riskLevel,
      checks: {
        historyCheck,
        consistencyCheck,
        frequencyCheck,
        riskCheck,
      },
      recommendations,
      warnings,
      requiresApproval,
      suggestedLimits,
    };

    // Create alerts for concerning patterns
    await this.createAlertsIfNeeded(result, customer);

    // Update payment method history
    await this.updatePaymentMethodHistory(customerId, paymentMethod, username, result);

    return result;
  }

  /**
   * Get payment method history for customer
   */
  private async getPaymentMethodHistory(
    customerId: string,
    paymentMethod: string
  ): Promise<PaymentMethodHistory> {
    const key = `${customerId}_${paymentMethod}`;
    let history = this.paymentHistory.get(key);

    if (!history) {
      // Build history from existing transactions
      history = await this.buildPaymentMethodHistory(customerId, paymentMethod);
      this.paymentHistory.set(key, history);
    }

    return history;
  }

  /**
   * Build payment method history from transaction data
   */
  private async buildPaymentMethodHistory(
    customerId: string,
    paymentMethod: string
  ): Promise<PaymentMethodHistory> {
    // Get all customer transactions
    const transactions = this.financialSystem.getCustomerTransactions(customerId);

    // Filter transactions by payment method
    const methodTransactions = transactions.filter(
      t =>
        t.paymentMethod === paymentMethod ||
        (paymentMethod === 'venmo' && t.metadata?.paymentDetails?.username?.startsWith('@')) ||
        (paymentMethod === 'cashapp' && t.metadata?.paymentDetails?.username?.startsWith('$'))
    );

    const successfulTransactions = methodTransactions.filter(t => t.status === 'completed');
    const failedTransactions = methodTransactions.filter(t => t.status === 'failed');

    // Extract usernames and issues
    const verifiedAccounts: PaymentMethodHistory['verifiedAccounts'] = [];
    const issues: PaymentMethodHistory['issues'] = [];

    methodTransactions.forEach(transaction => {
      const paymentDetails = transaction.metadata?.paymentDetails;
      if (paymentDetails?.username) {
        const existingAccount = verifiedAccounts.find(
          acc => acc.username === paymentDetails.username
        );
        if (!existingAccount) {
          verifiedAccounts.push({
            username: paymentDetails.username,
            verifiedAt: transaction.createdAt,
            verificationMethod: 'transaction',
            isActive: true,
          });
        }
      }

      if (transaction.status === 'failed' && transaction.failureReason) {
        issues.push({
          issueType: 'failed_transaction',
          date: transaction.createdAt,
          description: transaction.failureReason,
          severity: 'medium',
          resolved: false,
        });
      }
    });

    // Calculate metrics
    const totalTransactions = methodTransactions.length;
    const totalVolume = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const successRate =
      totalTransactions > 0 ? successfulTransactions.length / totalTransactions : 0;
    const averageAmount =
      successfulTransactions.length > 0 ? totalVolume / successfulTransactions.length : 0;

    // Calculate frequency score (transactions per month)
    const customer = this.customerManager.getCustomerProfile(customerId);
    const accountAgeMonths = customer
      ? this.calculateAccountAgeMonths(customer.accountInfo.registrationDate)
      : 1;
    const frequencyScore = totalTransactions / Math.max(accountAgeMonths, 1);

    // Calculate reliability score
    const reliabilityScore = Math.min(successRate * 100 - issues.length * 10, 100);

    return {
      customerId,
      paymentMethod,
      firstUsed:
        methodTransactions.length > 0 ? methodTransactions[0].createdAt : new Date().toISOString(),
      lastUsed:
        methodTransactions.length > 0
          ? methodTransactions[methodTransactions.length - 1].createdAt
          : new Date().toISOString(),
      totalTransactions,
      totalVolume,
      successRate,
      averageAmount,
      frequencyScore,
      reliabilityScore,
      verifiedAccounts,
      issues,
    };
  }

  /**
   * Perform history check
   */
  private performHistoryCheck(
    history: PaymentMethodHistory,
    username: string
  ): PaymentValidationResult['checks']['historyCheck'] {
    const hasHistory = history.totalTransactions > 0;
    const hasUsedUsername = history.verifiedAccounts.some(acc => acc.username === username);
    const issues = history.issues.filter(issue => !issue.resolved).length;

    let passed = true;
    if (!hasHistory) {
      passed = false; // New payment method
    }
    if (!hasUsedUsername && hasHistory) {
      passed = false; // New username for established method
    }
    if (issues > 2) {
      passed = false; // Too many issues
    }

    return {
      passed,
      hasHistory,
      firstUsed: hasHistory ? history.firstUsed : undefined,
      totalTransactions: history.totalTransactions,
      issues,
    };
  }

  /**
   * Perform consistency check
   */
  private performConsistencyCheck(
    history: PaymentMethodHistory,
    amount: number
  ): PaymentValidationResult['checks']['consistencyCheck'] {
    if (history.totalTransactions === 0) {
      return {
        passed: true, // No history to check against
        isConsistent: true,
        amountDeviation: 0,
      };
    }

    const usualAmount = history.averageAmount;
    const deviation = Math.abs(amount - usualAmount) / usualAmount;
    const isConsistent = deviation <= 2.0; // Allow up to 200% deviation

    return {
      passed: isConsistent,
      isConsistent,
      usualAmount,
      amountDeviation: deviation,
    };
  }

  /**
   * Perform frequency check
   */
  private performFrequencyCheck(
    history: PaymentMethodHistory,
    customerId: string
  ): PaymentValidationResult['checks']['frequencyCheck'] {
    // Check recent transactions (last 24 hours)
    const recentTransactions = this.financialSystem
      .getCustomerTransactions(customerId)
      .filter(t => {
        const transactionTime = new Date(t.createdAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return transactionTime > oneDayAgo;
      });

    const usualFrequency = history.frequencyScore;
    const currentFrequency = recentTransactions.length;

    // Allow up to 3x usual frequency
    const isNormalFrequency = currentFrequency <= usualFrequency * 3;

    return {
      passed: isNormalFrequency,
      isNormalFrequency,
      usualFrequency,
      currentFrequency,
    };
  }

  /**
   * Perform risk check
   */
  private performRiskCheck(
    customer: CustomerProfile,
    history: PaymentMethodHistory,
    amount: number,
    context: string
  ): PaymentValidationResult['checks']['riskCheck'] {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Customer risk factors
    if (customer.financialProfile.riskScore > 50) {
      riskFactors.push('High customer risk score');
      riskScore += 20;
    }

    // Payment method risk
    if (history.totalTransactions === 0) {
      riskFactors.push('New payment method');
      riskScore += 30;
    }

    // Amount risk
    if (amount > history.averageAmount * 3 && history.totalTransactions > 0) {
      riskFactors.push('Unusual amount for payment method');
      riskScore += 15;
    }

    // Issue history risk
    if (history.issues.length > 0) {
      riskFactors.push('Payment method has issue history');
      riskScore += history.issues.length * 5;
    }

    // Context risk
    if (context === 'p2p') {
      riskScore += 10; // P2P transactions have higher risk
    }

    const passed = riskScore < 50;

    return {
      passed,
      riskFactors,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(
    historyCheck: any,
    consistencyCheck: any,
    frequencyCheck: any,
    riskCheck: any
  ): number {
    let score = 100;

    // Deduct points for failed checks
    if (!historyCheck.passed) score -= 25;
    if (!consistencyCheck.passed) score -= 15;
    if (!frequencyCheck.passed) score -= 10;
    if (!riskCheck.passed) score -= riskCheck.riskScore;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(score: number): PaymentValidationResult['riskLevel'] {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    historyCheck: any,
    consistencyCheck: any,
    frequencyCheck: any,
    riskCheck: any,
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];

    if (!historyCheck.passed) {
      if (!historyCheck.hasHistory) {
        recommendations.push(
          'This is a new payment method. Consider starting with smaller amounts.'
        );
        recommendations.push('Verify the payment method details before proceeding.');
      } else {
        recommendations.push("This username hasn't been used before. Verify it's correct.");
      }
    }

    if (!consistencyCheck.passed) {
      recommendations.push(
        `Amount is ${Math.round(consistencyCheck.amountDeviation * 100)}% different from usual. Consider the reason for this change.`
      );
    }

    if (!frequencyCheck.passed) {
      recommendations.push(
        'Higher than usual transaction frequency detected. Monitor for potential issues.'
      );
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Transaction requires additional verification due to risk factors.');
      recommendations.push('Consider using an established payment method instead.');
    }

    if (riskCheck.riskFactors.length > 0) {
      recommendations.push('Address identified risk factors before proceeding.');
    }

    return recommendations;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    historyCheck: any,
    consistencyCheck: any,
    frequencyCheck: any,
    riskCheck: any
  ): string[] {
    const warnings: string[] = [];

    if (historyCheck.issues > 0) {
      warnings.push(`Payment method has ${historyCheck.issues} unresolved issue(s).`);
    }

    if (riskCheck.riskFactors.includes('New payment method')) {
      warnings.push('New payment method detected - additional verification recommended.');
    }

    if (riskCheck.riskFactors.includes('Unusual amount for payment method')) {
      warnings.push('Transaction amount is unusual for this payment method.');
    }

    return warnings;
  }

  /**
   * Check if approval is required
   */
  private requiresApproval(riskLevel: string, validationScore: number): boolean {
    return (
      riskLevel === 'critical' ||
      (riskLevel === 'high' && validationScore < 50) ||
      validationScore < 30
    );
  }

  /**
   * Generate suggested limits
   */
  private generateSuggestedLimits(
    history: PaymentMethodHistory,
    riskLevel: string
  ): PaymentValidationResult['suggestedLimits'] {
    const baseLimit = history.averageAmount || 100;

    let multiplier = 1;
    switch (riskLevel) {
      case 'low':
        multiplier = 3;
        break;
      case 'medium':
        multiplier = 2;
        break;
      case 'high':
        multiplier = 1.5;
        break;
      case 'critical':
        multiplier = 1;
        break;
    }

    const maxAmount = Math.min(baseLimit * multiplier, 10000);
    const maxDaily = maxAmount * 3;
    const maxMonthly = maxAmount * 10;

    return {
      maxAmount,
      maxDaily,
      maxMonthly,
    };
  }

  /**
   * Create alerts for concerning patterns
   */
  private async createAlertsIfNeeded(
    result: PaymentValidationResult,
    customer: CustomerProfile
  ): Promise<void> {
    const alerts: Partial<PaymentMethodAlert>[] = [];

    // New payment method alert
    if (!result.checks.historyCheck.hasHistory) {
      alerts.push({
        alertType: 'new_payment_method',
        severity: 'medium',
        description: `Customer ${customer.personalInfo.firstName} ${customer.personalInfo.lastName} is using a new payment method: ${result.paymentMethod}`,
        details: {
          customerId: result.customerId,
          paymentMethod: result.paymentMethod,
          username: result.username,
          validationScore: result.validationScore,
        },
        actions: [
          'Verify customer identity',
          'Monitor first transaction',
          'Set appropriate limits',
        ],
      });
    }

    // Unusual amount alert
    if (
      !result.checks.consistencyCheck.passed &&
      result.checks.consistencyCheck.amountDeviation > 1.5
    ) {
      alerts.push({
        alertType: 'unusual_amount',
        severity: 'low',
        description: `Unusual amount detected for ${result.paymentMethod}`,
        details: {
          customerId: result.customerId,
          paymentMethod: result.paymentMethod,
          usualAmount: result.checks.consistencyCheck.usualAmount,
          actualAmount: result.checks.consistencyCheck.amountDeviation,
        },
        actions: ['Verify transaction legitimacy', 'Contact customer if needed'],
      });
    }

    // High frequency alert
    if (!result.checks.frequencyCheck.passed) {
      alerts.push({
        alertType: 'high_frequency',
        severity: 'medium',
        description: `High transaction frequency detected`,
        details: {
          customerId: result.customerId,
          paymentMethod: result.paymentMethod,
          usualFrequency: result.checks.frequencyCheck.usualFrequency,
          currentFrequency: result.checks.frequencyCheck.currentFrequency,
        },
        actions: ['Monitor for suspicious activity', 'Consider temporary limits'],
      });
    }

    // Create alerts
    for (const alertData of alerts) {
      const alert: PaymentMethodAlert = {
        id: this.generateAlertId(),
        customerId: result.customerId,
        alertType: alertData.alertType as PaymentMethodAlert['alertType'],
        paymentMethod: result.paymentMethod,
        username: result.username,
        severity: alertData.severity as PaymentMethodAlert['severity'],
        description: alertData.description!,
        details: alertData.details!,
        status: 'active',
        createdAt: new Date().toISOString(),
        actions: alertData.actions!,
      };

      this.alerts.set(alert.id, alert);
    }
  }

  /**
   * Update payment method history
   */
  private async updatePaymentMethodHistory(
    customerId: string,
    paymentMethod: string,
    username: string,
    result: PaymentValidationResult
  ): Promise<void> {
    const key = `${customerId}_${paymentMethod}`;
    const history = this.paymentHistory.get(key);

    if (history) {
      history.lastUsed = new Date().toISOString();

      // Update verified accounts
      const existingAccount = history.verifiedAccounts.find(acc => acc.username === username);
      if (!existingAccount) {
        history.verifiedAccounts.push({
          username,
          verifiedAt: new Date().toISOString(),
          verificationMethod: 'transaction',
          isActive: true,
        });
      }

      // Update reliability score based on validation result
      if (result.isValid) {
        history.reliabilityScore = Math.min(history.reliabilityScore + 1, 100);
      } else {
        history.reliabilityScore = Math.max(history.reliabilityScore - 5, 0);
      }
    }
  }

  /**
   * Get customer payment method alerts
   */
  getCustomerAlerts(customerId: string): PaymentMethodAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get payment method statistics
   */
  getPaymentMethodStats(customerId: string): Record<string, PaymentMethodHistory> {
    const stats: Record<string, PaymentMethodHistory> = {};

    for (const [key, history] of this.paymentHistory) {
      if (history.customerId === customerId) {
        const method = history.paymentMethod;
        stats[method] = history;
      }
    }

    return stats;
  }

  /**
   * Calculate account age in months
   */
  private calculateAccountAgeMonths(registrationDate: string): number {
    const now = new Date();
    const regDate = new Date(registrationDate);
    return (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `pm_alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    totalValidations: number;
    averageScore: number;
    alertsCreated: number;
    highRiskValidations: number;
    newPaymentMethodDetections: number;
  } {
    const validations = Array.from(this.paymentHistory.values());
    const alerts = Array.from(this.alerts.values());

    const totalValidations = validations.length;
    const averageScore =
      validations.length > 0
        ? validations.reduce((sum, h) => sum + h.reliabilityScore, 0) / validations.length
        : 0;

    const highRiskValidations = validations.filter(h => h.reliabilityScore < 60).length;
    const newPaymentMethodDetections = alerts.filter(
      a => a.alertType === 'new_payment_method'
    ).length;

    return {
      totalValidations,
      averageScore,
      alertsCreated: alerts.length,
      highRiskValidations,
      newPaymentMethodDetections,
    };
  }
}
