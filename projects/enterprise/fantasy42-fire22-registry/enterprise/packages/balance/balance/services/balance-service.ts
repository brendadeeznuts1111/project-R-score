/**
 * Balance Service
 * Domain-Driven Design Implementation
 */

import { Balance, BalanceChange } from '../entities/balance';
import { BalanceRepository } from '../repositories/balance-repository';
import { BalanceLimits } from '../value-objects/balance-limits';
import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';

export class BalanceService {
  constructor(
    private repository: BalanceRepository,
    private eventPublisher: DomainEvents
  ) {}

  /**
   * Create a new balance for a customer
   */
  async createBalance(params: {
    customerId: string;
    agentId: string;
    initialBalance?: number;
    limits?: BalanceLimits;
  }): Promise<Balance> {
    // Check if balance already exists
    const existing = await this.repository.findByCustomerId(params.customerId);
    if (existing) {
      throw new DomainError('Balance already exists for customer', 'BALANCE_EXISTS');
    }

    const balance = Balance.create(params);
    await this.repository.save(balance);

    await this.eventPublisher.publish('balance.created', {
      balanceId: balance.getId(),
      customerId: params.customerId,
      agentId: params.agentId,
      initialBalance: params.initialBalance || 0,
    });

    return balance;
  }

  /**
   * Process a balance change (credit or debit)
   */
  async processBalanceChange(params: {
    customerId: string;
    amount: number;
    changeType: 'credit' | 'debit';
    reason: string;
    performedBy: string;
    metadata?: Record<string, any>;
  }): Promise<{ balance: Balance; change: BalanceChange }> {
    const balance = await this.repository.findByCustomerId(params.customerId);
    if (!balance) {
      throw new DomainError('Balance not found', 'BALANCE_NOT_FOUND');
    }

    let change: BalanceChange;

    if (params.changeType === 'debit') {
      change = balance.debit(params.amount, params.reason, params.performedBy);
    } else {
      change = balance.credit(params.amount, params.reason, params.performedBy);
    }

    // Save both balance and change
    await this.repository.save(balance);
    await this.repository.saveChange(change);

    // Publish domain event
    await this.eventPublisher.publish('balance.changed', {
      balanceId: balance.getId(),
      customerId: params.customerId,
      changeType: params.changeType,
      amount: params.amount,
      newBalance: balance.getCurrentBalance(),
      reason: params.reason,
      performedBy: params.performedBy,
      thresholdStatus: balance.getThresholdStatus(),
    });

    return { balance, change };
  }

  /**
   * Get balance with threshold status
   */
  async getBalanceWithStatus(customerId: string): Promise<{
    balance: Balance;
    status: 'normal' | 'warning' | 'critical';
    requiresAttention: boolean;
  }> {
    const balance = await this.repository.findByCustomerId(customerId);
    if (!balance) {
      throw new DomainError('Balance not found', 'BALANCE_NOT_FOUND');
    }

    return {
      balance,
      status: balance.getThresholdStatus(),
      requiresAttention: balance.requiresAttention(),
    };
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(
    customerId: string,
    limit = 50
  ): Promise<{
    balance: Balance;
    changes: BalanceChange[];
  }> {
    const balance = await this.repository.findByCustomerId(customerId);
    if (!balance) {
      throw new DomainError('Balance not found', 'BALANCE_NOT_FOUND');
    }

    const changes = await this.repository.getBalanceHistory(balance.getId(), limit);

    return { balance, changes };
  }

  /**
   * Get low balance alerts
   */
  async getLowBalanceAlerts(): Promise<Balance[]> {
    return await this.repository.getLowBalanceAlerts();
  }

  /**
   * Freeze balance
   */
  async freezeBalance(customerId: string, reason: string, performedBy: string): Promise<Balance> {
    const balance = await this.repository.findByCustomerId(customerId);
    if (!balance) {
      throw new DomainError('Balance not found', 'BALANCE_NOT_FOUND');
    }

    balance.freeze();
    await this.repository.save(balance);

    await this.eventPublisher.publish('balance.frozen', {
      balanceId: balance.getId(),
      customerId,
      reason,
      performedBy,
    });

    return balance;
  }

  /**
   * Unfreeze balance
   */
  async unfreezeBalance(customerId: string, performedBy: string): Promise<Balance> {
    const balance = await this.repository.findByCustomerId(customerId);
    if (!balance) {
      throw new DomainError('Balance not found', 'BALANCE_NOT_FOUND');
    }

    balance.unfreeze();
    await this.repository.save(balance);

    await this.eventPublisher.publish('balance.unfrozen', {
      balanceId: balance.getId(),
      customerId,
      performedBy,
    });

    return balance;
  }

  /**
   * Get agent balance summary
   */
  async getAgentBalanceSummary(agentId: string): Promise<{
    totalBalance: number;
    activeBalances: number;
    lowBalanceCount: number;
    frozenBalances: number;
  }> {
    const balances = await this.repository.findByQuery({ agentId });
    const lowBalances = await this.repository.getLowBalanceAlerts();

    const agentLowBalances = lowBalances.filter(b => b.getAgentId() === agentId);

    return {
      totalBalance: await this.repository.getTotalBalanceByAgent(agentId),
      activeBalances: balances.filter(b => b.getIsActive()).length,
      lowBalanceCount: agentLowBalances.length,
      frozenBalances: balances.filter(b => !b.getIsActive()).length,
    };
  }
}
