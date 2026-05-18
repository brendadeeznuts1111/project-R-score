/**
 * Balance Limits Value Object
 * Domain-Driven Design Implementation
 */

import { ValueObject } from '../../shared/value-object';

export class BalanceLimits extends ValueObject {
  private constructor(
    private readonly minBalance: number,
    private readonly maxBalance: number,
    private readonly warningThreshold: number,
    private readonly criticalThreshold: number,
    private readonly dailyChangeLimit: number,
    private readonly weeklyChangeLimit: number
  ) {
    super();
    this.validateLimits();
  }

  static create(limits: {
    minBalance: number;
    maxBalance: number;
    warningThreshold: number;
    criticalThreshold: number;
    dailyChangeLimit: number;
    weeklyChangeLimit: number;
  }): BalanceLimits {
    return new BalanceLimits(
      limits.minBalance,
      limits.maxBalance,
      limits.warningThreshold,
      limits.criticalThreshold,
      limits.dailyChangeLimit,
      limits.weeklyChangeLimit
    );
  }

  static default(): BalanceLimits {
    return new BalanceLimits(
      -10000, // Allow negative balance up to $10K
      1000000, // Max balance $1M
      1000, // Warning below $1K
      100, // Critical below $100
      50000, // Max daily change $50K
      200000 // Max weekly change $200K
    );
  }

  private validateLimits(): void {
    if (this.minBalance >= this.maxBalance) {
      throw new Error('Minimum balance must be less than maximum balance');
    }
    if (this.warningThreshold <= this.criticalThreshold) {
      throw new Error('Warning threshold must be greater than critical threshold');
    }
  }

  // Getters
  getMinBalance(): number {
    return this.minBalance;
  }
  getMaxBalance(): number {
    return this.maxBalance;
  }
  getWarningThreshold(): number {
    return this.warningThreshold;
  }
  getCriticalThreshold(): number {
    return this.criticalThreshold;
  }
  getDailyChangeLimit(): number {
    return this.dailyChangeLimit;
  }
  getWeeklyChangeLimit(): number {
    return this.weeklyChangeLimit;
  }

  // Business logic
  isWithinLimits(balance: number): boolean {
    return balance >= this.minBalance && balance <= this.maxBalance;
  }

  getThresholdStatus(balance: number): 'normal' | 'warning' | 'critical' {
    if (balance <= this.criticalThreshold) return 'critical';
    if (balance <= this.warningThreshold) return 'warning';
    return 'normal';
  }

  canChangeBy(amount: number, period: 'daily' | 'weekly'): boolean {
    const limit = period === 'daily' ? this.dailyChangeLimit : this.weeklyChangeLimit;
    return Math.abs(amount) <= limit;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof BalanceLimits)) return false;
    return (
      this.minBalance === other.minBalance &&
      this.maxBalance === other.maxBalance &&
      this.warningThreshold === other.warningThreshold &&
      this.criticalThreshold === other.criticalThreshold &&
      this.dailyChangeLimit === other.dailyChangeLimit &&
      this.weeklyChangeLimit === other.weeklyChangeLimit
    );
  }
}
