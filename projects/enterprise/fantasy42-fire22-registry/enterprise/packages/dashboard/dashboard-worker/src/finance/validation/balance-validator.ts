/**
 * Balance Validator Module
 * Handles balance validation rules, limits, and compliance checks
 */

import type {
  BalanceValidationRules,
  BalanceChangeEvent,
  RiskLevel,
  TransactionType,
} from '../../../core/types/finance';

export class BalanceValidator {
  private static readonly DEFAULT_RULES: BalanceValidationRules = {
    minBalance: -10000, // Allow negative balance up to $10K
    maxBalance: 1000000, // Max balance $1M
    warningThreshold: 1000, // Warning below $1K
    criticalThreshold: 100, // Critical below $100
    dailyChangeLimit: 50000, // Max daily change $50K
    weeklyChangeLimit: 200000, // Max weekly change $200K
    monthlyChangeLimit: 500000, // Max monthly change $500K
    maxNegativeBalance: -50000, // Absolute negative limit
    requireApprovalThreshold: 100000, // Require approval for large changes
  };

  private customRules: Map<string, BalanceValidationRules> = new Map();
  private dailyChanges: Map<string, { amount: number; date: string }> = new Map();
  private weeklyChanges: Map<string, { amount: number; week: string }> = new Map();

  /**
   * Validate a balance change
   */
  validateBalanceChange(
    customerId: string,
    currentBalance: number,
    changeAmount: number,
    changeType: TransactionType,
    rules?: Partial<BalanceValidationRules>
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    requiresApproval: boolean;
    riskLevel: RiskLevel;
  } {
    const appliedRules = { ...BalanceValidator.DEFAULT_RULES, ...rules };
    const newBalance = currentBalance + changeAmount;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic balance limits
    if (newBalance < appliedRules.minBalance) {
      errors.push(
        `Balance would exceed minimum limit: $${appliedRules.minBalance.toLocaleString()}`
      );
    }

    if (newBalance > appliedRules.maxBalance) {
      errors.push(
        `Balance would exceed maximum limit: $${appliedRules.maxBalance.toLocaleString()}`
      );
    }

    if (newBalance < appliedRules.maxNegativeBalance) {
      errors.push(
        `Balance would exceed absolute negative limit: $${appliedRules.maxNegativeBalance.toLocaleString()}`
      );
    }

    // Threshold warnings
    if (newBalance <= appliedRules.criticalThreshold && newBalance > appliedRules.minBalance) {
      warnings.push(
        `Critical balance threshold: $${appliedRules.criticalThreshold.toLocaleString()}`
      );
    }

    if (
      newBalance <= appliedRules.warningThreshold &&
      newBalance > appliedRules.criticalThreshold
    ) {
      warnings.push(
        `Warning balance threshold: $${appliedRules.warningThreshold.toLocaleString()}`
      );
    }

    // Daily change limit
    const dailyChange = this.getDailyChange(customerId) + Math.abs(changeAmount);
    if (dailyChange > appliedRules.dailyChangeLimit) {
      errors.push(
        `Daily change limit exceeded: $${appliedRules.dailyChangeLimit.toLocaleString()}`
      );
    }

    // Weekly change limit
    const weeklyChange = this.getWeeklyChange(customerId) + Math.abs(changeAmount);
    if (weeklyChange > appliedRules.weeklyChangeLimit) {
      errors.push(
        `Weekly change limit exceeded: $${appliedRules.weeklyChangeLimit.toLocaleString()}`
      );
    }

    // Large transaction approval
    const requiresApproval = Math.abs(changeAmount) >= appliedRules.requireApprovalThreshold;

    if (requiresApproval) {
      warnings.push(
        `Large transaction requires approval: $${appliedRules.requireApprovalThreshold.toLocaleString()}+`
      );
    }

    // Transaction-specific validations
    const transactionValidation = this.validateTransactionSpecific(
      customerId,
      changeAmount,
      changeType,
      newBalance
    );
    errors.push(...transactionValidation.errors);
    warnings.push(...transactionValidation.warnings);

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(
      errors.length,
      warnings.length,
      changeAmount,
      changeType
    );

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresApproval,
      riskLevel,
    };
  }

  /**
   * Set custom validation rules for a customer
   */
  setCustomRules(customerId: string, rules: Partial<BalanceValidationRules>): void {
    const currentRules = this.customRules.get(customerId) || BalanceValidator.DEFAULT_RULES;
    this.customRules.set(customerId, { ...currentRules, ...rules });
  }

  /**
   * Get validation rules for a customer
   */
  getValidationRules(customerId: string): BalanceValidationRules {
    return this.customRules.get(customerId) || BalanceValidator.DEFAULT_RULES;
  }

  /**
   * Reset custom rules for a customer
   */
  resetCustomRules(customerId: string): void {
    this.customRules.delete(customerId);
  }

  /**
   * Record balance change for limit tracking
   */
  recordBalanceChange(customerId: string, changeAmount: number): void {
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = this.getWeekKey(new Date());

    // Update daily change
    const dailyKey = `${customerId}_${today}`;
    const currentDaily = this.dailyChanges.get(dailyKey)?.amount || 0;
    this.dailyChanges.set(dailyKey, {
      amount: currentDaily + Math.abs(changeAmount),
      date: today,
    });

    // Update weekly change
    const weeklyKey = `${customerId}_${currentWeek}`;
    const currentWeekly = this.weeklyChanges.get(weeklyKey)?.amount || 0;
    this.weeklyChanges.set(weeklyKey, {
      amount: currentWeekly + Math.abs(changeAmount),
      week: currentWeek,
    });

    // Cleanup old entries
    this.cleanupOldEntries();
  }

  /**
   * Get current daily change for customer
   */
  getDailyChange(customerId: string): number {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${customerId}_${today}`;
    return this.dailyChanges.get(dailyKey)?.amount || 0;
  }

  /**
   * Get current weekly change for customer
   */
  getWeeklyChange(customerId: string): number {
    const currentWeek = this.getWeekKey(new Date());
    const weeklyKey = `${customerId}_${currentWeek}`;
    return this.weeklyChanges.get(weeklyKey)?.amount || 0;
  }

  /**
   * Validate bulk balance changes
   */
  validateBulkChanges(
    changes: Array<{ customerId: string; amount: number; type: TransactionType }>
  ): {
    valid: Array<{ customerId: string; amount: number; type: TransactionType }>;
    invalid: Array<{ customerId: string; amount: number; type: TransactionType; errors: string[] }>;
    summary: { totalValid: number; totalInvalid: number; totalAmount: number };
  } {
    const valid: typeof changes = [];
    const invalid: Array<{
      customerId: string;
      amount: number;
      type: TransactionType;
      errors: string[];
    }> = [];
    let totalAmount = 0;

    for (const change of changes) {
      // Note: In real implementation, you'd need current balance from database
      const mockCurrentBalance = 1000; // This would come from your balance service
      const validation = this.validateBalanceChange(
        change.customerId,
        mockCurrentBalance,
        change.amount,
        change.type
      );

      if (validation.isValid) {
        valid.push(change);
        totalAmount += change.amount;
      } else {
        invalid.push({
          ...change,
          errors: validation.errors,
        });
      }
    }

    return {
      valid,
      invalid,
      summary: {
        totalValid: valid.length,
        totalInvalid: invalid.length,
        totalAmount,
      },
    };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    totalErrors: number;
    totalWarnings: number;
    errorRate: number;
    warningRate: number;
    topErrors: Array<{ error: string; count: number }>;
  } {
    // This would track statistics in a real implementation
    return {
      totalValidations: 0,
      totalErrors: 0,
      totalWarnings: 0,
      errorRate: 0,
      warningRate: 0,
      topErrors: [],
    };
  }

  // Private methods

  private validateTransactionSpecific(
    customerId: string,
    amount: number,
    type: TransactionType,
    newBalance: number
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (type) {
      case 'withdrawal':
        if (amount > newBalance && newBalance >= 0) {
          errors.push('Insufficient funds for withdrawal');
        }
        break;

      case 'wager':
        if (amount > newBalance) {
          errors.push('Insufficient funds for wager');
        }
        if (amount <= 0) {
          errors.push('Wager amount must be positive');
        }
        break;

      case 'deposit':
        if (amount <= 0) {
          errors.push('Deposit amount must be positive');
        }
        break;

      case 'adjustment':
        if (Math.abs(amount) > 10000) {
          // $10K adjustment limit
          warnings.push('Large adjustment requires additional review');
        }
        break;
    }

    return { errors, warnings };
  }

  private calculateRiskLevel(
    errorCount: number,
    warningCount: number,
    amount: number,
    type: TransactionType
  ): RiskLevel {
    if (errorCount > 0) return 'extreme';
    if (warningCount > 2) return 'high';
    if (warningCount > 0 || Math.abs(amount) > 50000) return 'medium';
    if (type === 'adjustment' || type === 'system') return 'medium';
    return 'low';
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const weekNum = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  }

  private cleanupOldEntries(): void {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentWeek = this.getWeekKey(now);

    // Remove entries older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysKey = thirtyDaysAgo.toISOString().split('T')[0];

    for (const [key, value] of this.dailyChanges) {
      if (value.date < thirtyDaysKey) {
        this.dailyChanges.delete(key);
      }
    }

    for (const [key, value] of this.weeklyChanges) {
      if (value.week < currentWeek) {
        // Keep current week and last 4 weeks
        const weekNum = parseInt(value.week.split('-W')[1]);
        const currentWeekNum = parseInt(currentWeek.split('-W')[1]);
        if (currentWeekNum - weekNum > 4) {
          this.weeklyChanges.delete(key);
        }
      }
    }
  }
}
