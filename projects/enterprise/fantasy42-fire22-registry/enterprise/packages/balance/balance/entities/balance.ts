/**
 * Balance Entity
 * Domain-Driven Design Implementation
 */

import { DomainEntity } from '../../shared/domain-entity';
import { BalanceLimits } from '../value-objects/balance-limits';
import { DomainError } from '../../shared/domain-entity';

export class Balance extends DomainEntity {
  private constructor(
    id: string,
    private readonly customerId: string,
    private readonly agentId: string,
    private currentBalance: number,
    private readonly limits: BalanceLimits,
    private isActive: boolean,
    private lastActivity: Date,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(params: {
    id: string;
    customerId: string;
    agentId: string;
    initialBalance?: number;
    limits?: BalanceLimits;
  }): Balance {
    const now = new Date();
    const limits = params.limits || BalanceLimits.default();
    const initialBalance = params.initialBalance || 0;

    if (!limits.isWithinLimits(initialBalance)) {
      throw new DomainError('Initial balance violates limits', 'INVALID_INITIAL_BALANCE');
    }

    return new Balance(
      params.id,
      params.customerId,
      params.agentId,
      initialBalance,
      limits,
      true,
      now,
      now,
      now
    );
  }

  static fromPersistence(data: any): Balance {
    return new Balance(
      data.id,
      data.customerId,
      data.agentId,
      data.currentBalance,
      BalanceLimits.create(data.limits),
      data.isActive,
      new Date(data.lastActivity),
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  // Business methods
  canDebit(amount: number): boolean {
    if (!this.isActive) {
      throw new DomainError('Cannot debit inactive balance', 'BALANCE_INACTIVE');
    }

    const newBalance = this.currentBalance - amount;
    return this.limits.isWithinLimits(newBalance);
  }

  canCredit(amount: number): boolean {
    if (!this.isActive) {
      throw new DomainError('Cannot credit inactive balance', 'BALANCE_INACTIVE');
    }

    const newBalance = this.currentBalance + amount;
    return this.limits.isWithinLimits(newBalance);
  }

  debit(amount: number, reason: string, performedBy: string): BalanceChange {
    if (!this.canDebit(amount)) {
      throw new DomainError('Debit would violate balance limits', 'INSUFFICIENT_FUNDS');
    }

    const previousBalance = this.currentBalance;
    this.currentBalance -= amount;
    this.lastActivity = new Date();
    this.markAsModified();

    return BalanceChange.create({
      balanceId: this.getId(),
      changeType: 'debit',
      amount: -amount,
      previousBalance,
      newBalance: this.currentBalance,
      reason,
      performedBy,
    });
  }

  credit(amount: number, reason: string, performedBy: string): BalanceChange {
    if (!this.canCredit(amount)) {
      throw new DomainError('Credit would violate balance limits', 'EXCEEDS_MAX_BALANCE');
    }

    const previousBalance = this.currentBalance;
    this.currentBalance += amount;
    this.lastActivity = new Date();
    this.markAsModified();

    return BalanceChange.create({
      balanceId: this.getId(),
      changeType: 'credit',
      amount,
      previousBalance,
      newBalance: this.currentBalance,
      reason,
      performedBy,
    });
  }

  freeze(): void {
    this.isActive = false;
    this.markAsModified();
  }

  unfreeze(): void {
    this.isActive = true;
    this.markAsModified();
  }

  // Getters
  getCustomerId(): string {
    return this.customerId;
  }
  getAgentId(): string {
    return this.agentId;
  }
  getCurrentBalance(): number {
    return this.currentBalance;
  }
  getLimits(): BalanceLimits {
    return this.limits;
  }
  getIsActive(): boolean {
    return this.isActive;
  }
  getLastActivity(): Date {
    return this.lastActivity;
  }

  // Business rules
  getThresholdStatus(): 'normal' | 'warning' | 'critical' {
    return this.limits.getThresholdStatus(this.currentBalance);
  }

  requiresAttention(): boolean {
    return this.getThresholdStatus() !== 'normal';
  }

  toJSON(): any {
    return {
      id: this.getId(),
      customerId: this.customerId,
      agentId: this.agentId,
      currentBalance: this.currentBalance,
      limits: {
        minBalance: this.limits.getMinBalance(),
        maxBalance: this.limits.getMaxBalance(),
        warningThreshold: this.limits.getWarningThreshold(),
        criticalThreshold: this.limits.getCriticalThreshold(),
        dailyChangeLimit: this.limits.getDailyChangeLimit(),
        weeklyChangeLimit: this.limits.getWeeklyChangeLimit(),
      },
      isActive: this.isActive,
      lastActivity: this.lastActivity.toISOString(),
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}

// Balance Change Entity
export class BalanceChange extends DomainEntity {
  private constructor(
    id: string,
    private readonly balanceId: string,
    private readonly changeType: 'credit' | 'debit',
    private readonly amount: number,
    private readonly previousBalance: number,
    private readonly newBalance: number,
    private readonly reason: string,
    private readonly performedBy: string,
    private readonly metadata?: Record<string, any>,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(params: {
    balanceId: string;
    changeType: 'credit' | 'debit';
    amount: number;
    previousBalance: number;
    newBalance: number;
    reason: string;
    performedBy: string;
    metadata?: Record<string, any>;
  }): BalanceChange {
    const now = new Date();
    return new BalanceChange(
      crypto.randomUUID(),
      params.balanceId,
      params.changeType,
      params.amount,
      params.previousBalance,
      params.newBalance,
      params.reason,
      params.performedBy,
      params.metadata,
      now,
      now
    );
  }

  // Getters
  getBalanceId(): string {
    return this.balanceId;
  }
  getChangeType(): string {
    return this.changeType;
  }
  getAmount(): number {
    return this.amount;
  }
  getPreviousBalance(): number {
    return this.previousBalance;
  }
  getNewBalance(): number {
    return this.newBalance;
  }
  getReason(): string {
    return this.reason;
  }
  getPerformedBy(): string {
    return this.performedBy;
  }
  getMetadata(): Record<string, any> | undefined {
    return this.metadata;
  }

  toJSON(): any {
    return {
      id: this.getId(),
      balanceId: this.balanceId,
      changeType: this.changeType,
      amount: this.amount,
      previousBalance: this.previousBalance,
      newBalance: this.newBalance,
      reason: this.reason,
      performedBy: this.performedBy,
      metadata: this.metadata,
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}
