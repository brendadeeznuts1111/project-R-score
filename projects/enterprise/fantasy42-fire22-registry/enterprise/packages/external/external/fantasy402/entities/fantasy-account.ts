/**
 * Fantasy Account Entity
 * Domain-Driven Design Implementation
 *
 * Represents an agent account from the external Fantasy402 system
 * in our internal domain format.
 */

import { DomainEntity, DomainError } from '/Users/nolarose/ff/src/domains/shared/domain-entity';
import type { ExternalAccount } from '../adapters/fantasy402-adapter';
import { Money } from '/Users/nolarose/ff/src/domains/collections/entities/payment';
import { v5 as uuidv5 } from 'uuid';

export class FantasyAccount extends DomainEntity {
  private constructor(
    id: string,
    private readonly agentId: string,
    private currentBalance: Money,
    private availableBalance: Money,
    private pendingWagerBalance: Money,
    private readonly creditLimit: Money,
    private isActive: boolean,
    private lastActivity: Date,
    private metadata: Record<string, any> = {},
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  static fromExternalData(data: ExternalAccount): FantasyAccount {
    const now = new Date();
    const currency = 'USD'; // Assuming USD as default, could be made configurable

    return new FantasyAccount(
      uuidv5(data.customerID, uuidv5.URL),
      data.customerID,
      Money.create(data.currentBalance, currency),
      Money.create(data.availableBalance, currency),
      Money.create(data.pendingWagerBalance, currency),
      Money.create(data.creditLimit, currency),
      data.active,
      new Date(data.lastActivity),
      data.metadata || {},
      now,
      now
    );
  }

  // Business methods
  updateBalances(
    currentBalance: number,
    availableBalance: number,
    pendingWagerBalance: number
  ): void {
    const currency = this.currentBalance.getCurrency();

    this.currentBalance = Money.create(currentBalance, currency);
    this.availableBalance = Money.create(availableBalance, currency);
    this.pendingWagerBalance = Money.create(pendingWagerBalance, currency);
    this.lastActivity = new Date();
    this.markAsModified();
  }

  credit(amount: number, reason: string): void {
    if (!this.isActive) {
      throw new DomainError('Cannot credit inactive account', 'ACCOUNT_INACTIVE');
    }

    const currency = this.currentBalance.getCurrency();
    const creditAmount = Money.create(amount, currency);

    this.currentBalance = this.currentBalance.add(creditAmount);
    this.availableBalance = this.availableBalance.add(creditAmount);
    this.lastActivity = new Date();

    this.addMetadata('last_credit', {
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });

    this.markAsModified();
  }

  debit(amount: number, reason: string): void {
    if (!this.isActive) {
      throw new DomainError('Cannot debit inactive account', 'ACCOUNT_INACTIVE');
    }

    const currency = this.currentBalance.getCurrency();
    const debitAmount = Money.create(amount, currency);

    if (this.availableBalance.getAmount() < amount) {
      throw new DomainError('Insufficient available balance', 'INSUFFICIENT_FUNDS');
    }

    this.currentBalance = Money.create(this.currentBalance.getAmount() - amount, currency);
    this.availableBalance = Money.create(this.availableBalance.getAmount() - amount, currency);
    this.lastActivity = new Date();

    this.addMetadata('last_debit', {
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });

    this.markAsModified();
  }

  freeze(): void {
    this.isActive = false;
    this.markAsModified();
  }

  unfreeze(): void {
    this.isActive = true;
    this.markAsModified();
  }

  addPendingWager(amount: number): void {
    if (!this.isActive) {
      throw new DomainError('Cannot add pending wager to inactive account', 'ACCOUNT_INACTIVE');
    }

    const currency = this.currentBalance.getCurrency();
    const wagerAmount = Money.create(amount, currency);

    if (this.availableBalance.getAmount() < amount) {
      throw new DomainError('Insufficient available balance for wager', 'INSUFFICIENT_FUNDS');
    }

    this.pendingWagerBalance = this.pendingWagerBalance.add(wagerAmount);
    this.availableBalance = Money.create(this.availableBalance.getAmount() - amount, currency);

    this.markAsModified();
  }

  settlePendingWager(amount: number, isWin: boolean): void {
    const currency = this.currentBalance.getCurrency();
    const settleAmount = Money.create(amount, currency);

    if (this.pendingWagerBalance.getAmount() < amount) {
      throw new DomainError(
        'Pending wager amount exceeds available pending balance',
        'INVALID_SETTLEMENT'
      );
    }

    // Remove from pending
    this.pendingWagerBalance = Money.create(
      this.pendingWagerBalance.getAmount() - amount,
      currency
    );

    if (isWin) {
      // Add winnings to current and available balance
      this.currentBalance = this.currentBalance.add(settleAmount);
      this.availableBalance = this.availableBalance.add(settleAmount);
    } else {
      // Loss - amount already deducted from available balance when wager was placed
    }

    this.markAsModified();
  }

  addMetadata(key: string, value: any): void {
    this.metadata[key] = value;
    this.markAsModified();
  }

  // Getters
  getAgentId(): string {
    return this.agentId;
  }
  getCurrentBalance(): Money {
    return this.currentBalance;
  }
  getAvailableBalance(): Money {
    return this.availableBalance;
  }
  getPendingWagerBalance(): Money {
    return this.pendingWagerBalance;
  }
  getCreditLimit(): Money {
    return this.creditLimit;
  }
  getIsActive(): boolean {
    return this.isActive;
  }
  getLastActivity(): Date {
    return this.lastActivity;
  }
  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  // Business rules
  hasSufficientFunds(amount: number): boolean {
    return this.availableBalance.getAmount() >= amount && this.isActive;
  }

  getUtilizationPercentage(): number {
    const creditLimit = this.creditLimit.getAmount();
    if (creditLimit === 0) return 0;

    return ((creditLimit - this.availableBalance.getAmount()) / creditLimit) * 100;
  }

  isNearCreditLimit(thresholdPercent: number = 90): boolean {
    return this.getUtilizationPercentage() >= thresholdPercent;
  }

  getEquity(): number {
    return this.currentBalance.getAmount();
  }

  canWager(amount: number): boolean {
    return this.hasSufficientFunds(amount) && this.isActive;
  }

  getAccountSummary(): {
    agentId: string;
    currentBalance: number;
    availableBalance: number;
    pendingWagerBalance: number;
    creditLimit: number;
    utilizationPercent: number;
    isActive: boolean;
    lastActivity: Date;
  } {
    return {
      agentId: this.agentId,
      currentBalance: this.currentBalance.getAmount(),
      availableBalance: this.availableBalance.getAmount(),
      pendingWagerBalance: this.pendingWagerBalance.getAmount(),
      creditLimit: this.creditLimit.getAmount(),
      utilizationPercent: this.getUtilizationPercentage(),
      isActive: this.isActive,
      lastActivity: this.lastActivity,
    };
  }

  toJSON(): any {
    return {
      id: this.getId(),
      agentId: this.agentId,
      currentBalance: {
        amount: this.currentBalance.getAmount(),
        currency: this.currentBalance.getCurrency(),
      },
      availableBalance: {
        amount: this.availableBalance.getAmount(),
        currency: this.availableBalance.getCurrency(),
      },
      pendingWagerBalance: {
        amount: this.pendingWagerBalance.getAmount(),
        currency: this.pendingWagerBalance.getCurrency(),
      },
      creditLimit: {
        amount: this.creditLimit.getAmount(),
        currency: this.creditLimit.getCurrency(),
      },
      isActive: this.isActive,
      lastActivity: this.lastActivity.toISOString(),
      metadata: this.metadata,
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}
