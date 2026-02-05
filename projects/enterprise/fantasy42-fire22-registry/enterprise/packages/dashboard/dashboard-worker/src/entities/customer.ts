/**
 * 👤 Fire22 Dashboard - Customer Entity Classes
 * Customer domain entity implementations with business logic
 */

import { AuditableEntityClass, ValidationRule, type ValidationResult } from './base';
import type { Customer, CustomerProfile } from '../types/database/entities';
import { BUSINESS, VALIDATION } from '../constants';

export class CustomerEntity extends AuditableEntityClass implements Customer {
  // Customer identification
  public customer_id: string;
  public username: string;
  public first_name: string;
  public last_name: string;
  public login: string;
  public email?: string;
  public phone?: string;
  public status: 'active' | 'inactive' | 'suspended';

  // Agent relationships
  public agent_id: string;
  public parent_agent?: string;
  public master_agent: string;

  // Financial information
  public balance: number;
  public casino_balance: number;
  public sports_balance: number;
  public freeplay_balance: number;
  public credit_limit: number;

  // Activity tracking
  public last_login?: string;
  public last_activity?: string;
  public total_deposits: number;
  public total_withdrawals: number;
  public lifetime_volume: number;

  // Business rules
  public tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip';
  public betting_limits: Record<string, number>;
  public risk_score: number;
  public vip_status: boolean;

  // Metadata
  public notes?: string;
  public preferences?: Record<string, any>;
  public kyc_status: 'pending' | 'approved' | 'rejected';
  public kyc_documents?: string[];

  constructor(data: Partial<Customer>) {
    super(data);

    // Initialize required fields
    this.customer_id = data.customer_id || `CUST_${Date.now()}`;
    this.username = data.username || '';
    this.first_name = data.first_name || '';
    this.last_name = data.last_name || '';
    this.login = data.login || data.username || '';
    this.email = data.email;
    this.phone = data.phone;
    this.status = data.status || 'active';

    // Agent relationships
    this.agent_id = data.agent_id || '';
    this.parent_agent = data.parent_agent;
    this.master_agent = data.master_agent || '';

    // Financial information
    this.balance = data.balance || 0;
    this.casino_balance = data.casino_balance || 0;
    this.sports_balance = data.sports_balance || 0;
    this.freeplay_balance = data.freeplay_balance || 0;
    this.credit_limit = data.credit_limit || 0;

    // Activity tracking
    this.last_login = data.last_login;
    this.last_activity = data.last_activity;
    this.total_deposits = data.total_deposits || 0;
    this.total_withdrawals = data.total_withdrawals || 0;
    this.lifetime_volume = data.lifetime_volume || 0;

    // Business rules
    this.tier = data.tier || 'bronze';
    this.betting_limits = data.betting_limits || BUSINESS.BETTING_LIMITS.DEFAULT;
    this.risk_score = data.risk_score || 0;
    this.vip_status = data.vip_status || false;

    // Metadata
    this.notes = data.notes;
    this.preferences = data.preferences || {};
    this.kyc_status = data.kyc_status || 'pending';
    this.kyc_documents = data.kyc_documents || [];
  }

  protected getEntityName(): string {
    return 'customer';
  }

  protected getValidationRules(): ValidationRule[] {
    return [
      {
        field: 'customer_id',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
      },
      {
        field: 'username',
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_-]+$/,
      },
      {
        field: 'first_name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'last_name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'login',
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 50,
      },
      {
        field: 'email',
        required: false,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      {
        field: 'balance',
        required: true,
        type: 'number',
        min: 0,
      },
      {
        field: 'risk_score',
        required: true,
        type: 'number',
        min: 0,
        max: 100,
      },
      {
        field: 'agent_id',
        required: true,
        type: 'string',
        minLength: 1,
      },
    ];
  }

  /**
   * Get the customer's full name
   */
  public getFullName(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  /**
   * Get total balance across all accounts
   */
  public getTotalBalance(): number {
    return this.balance + this.casino_balance + this.sports_balance + this.freeplay_balance;
  }

  /**
   * Check if customer is VIP
   */
  public isVip(): boolean {
    return this.vip_status || this.tier === 'vip';
  }

  /**
   * Check if customer is high risk
   */
  public isHighRisk(): boolean {
    return this.risk_score >= BUSINESS.RISK_THRESHOLDS.HIGH;
  }

  /**
   * Check if customer can place bet
   */
  public canPlaceBet(amount: number, betType: string): boolean {
    const limit = this.betting_limits[betType] || this.betting_limits.default || 0;
    return amount <= limit && this.status === 'active' && !this.isHighRisk();
  }

  /**
   * Update betting limit for specific bet type
   */
  public updateBettingLimit(betType: string, limit: number): this {
    this.betting_limits = { ...this.betting_limits, [betType]: limit };
    this.touch();
    return this;
  }

  /**
   * Add deposit amount
   */
  public addDeposit(amount: number): this {
    if (amount <= 0) throw new Error('Deposit amount must be positive');

    this.balance += amount;
    this.total_deposits += amount;
    this.last_activity = new Date().toISOString();
    this.touch();
    return this;
  }

  /**
   * Process withdrawal
   */
  public processWithdrawal(amount: number): this {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (amount > this.balance) throw new Error('Insufficient balance');

    this.balance -= amount;
    this.total_withdrawals += amount;
    this.last_activity = new Date().toISOString();
    this.touch();
    return this;
  }

  /**
   * Update tier based on lifetime volume
   */
  public updateTier(): this {
    const volume = this.lifetime_volume;

    if (volume >= BUSINESS.TIER_THRESHOLDS.VIP) {
      this.tier = 'vip';
      this.vip_status = true;
    } else if (volume >= BUSINESS.TIER_THRESHOLDS.PLATINUM) {
      this.tier = 'platinum';
    } else if (volume >= BUSINESS.TIER_THRESHOLDS.GOLD) {
      this.tier = 'gold';
    } else if (volume >= BUSINESS.TIER_THRESHOLDS.SILVER) {
      this.tier = 'silver';
    } else {
      this.tier = 'bronze';
    }

    this.touch();
    return this;
  }

  /**
   * Calculate profit/loss
   */
  public calculateProfitLoss(): number {
    return this.total_deposits - this.total_withdrawals;
  }

  /**
   * Check KYC status
   */
  public isKycCompleted(): boolean {
    return this.kyc_status === 'approved';
  }

  /**
   * Update last activity
   */
  public recordActivity(): this {
    this.last_activity = new Date().toISOString();
    this.touch();
    return this;
  }

  /**
   * Get customer display info
   */
  public getDisplayInfo(): {
    name: string;
    id: string;
    tier: string;
    balance: number;
    status: string;
  } {
    return {
      name: this.getFullName(),
      id: this.customer_id,
      tier: this.tier,
      balance: this.getTotalBalance(),
      status: this.status,
    };
  }
}

export class CustomerProfileService {
  /**
   * Build customer profile with statistics
   */
  static buildProfile(
    customer: CustomerEntity,
    additionalData?: {
      totalBets?: number;
      totalWins?: number;
      totalLosses?: number;
      recentActivity?: any[];
    }
  ): CustomerProfile {
    const stats = additionalData || {};

    return {
      customer,
      statistics: {
        total_bets: stats.totalBets || 0,
        total_wins: stats.totalWins || 0,
        total_losses: stats.totalLosses || 0,
        win_rate: stats.totalBets ? (stats.totalWins || 0) / stats.totalBets : 0,
        profit_loss: customer.calculateProfitLoss(),
        favorite_sports: [],
        betting_patterns: [],
      },
      recent_activity: stats.recentActivity || [],
    };
  }
}

export { CustomerEntity as Customer };
