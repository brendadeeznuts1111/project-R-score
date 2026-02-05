/**
 * 🏈 Fire22 Customer Entity Class
 * Business logic for Fire22 customer operations
 */

import type {
  Fire22Customer,
  CustomerTier,
  CustomerStatus,
  KYCStatus,
} from '../../types/fire22/entities';
import { AuditableEntityClass } from '../base';
import { FIRE22_BUSINESS_RULES, FIRE22_CONSTRAINTS } from '../../types/fire22/entities';
import { BUSINESS } from '../../constants';

export class Fire22CustomerEntity extends AuditableEntityClass implements Fire22Customer {
  // Core identifiers
  public fire22_customer_id: string = '';
  public agent_id: string = '';
  public parent_agent?: string;
  public master_agent?: string;
  public login: string = '';

  // Customer classification
  public tier: CustomerTier = 'bronze';
  public status: CustomerStatus = 'active';
  public vip_status: boolean = false;

  // Financial information
  public balance: number = 0;
  public casino_balance: number = 0;
  public sports_balance: number = 0;
  public freeplay_balance: number = 0;
  public freeplay_pending_balance: number = 0;
  public freeplay_pending_count: number = 0;
  public credit_limit: number = 0;

  // Lifetime statistics
  public total_deposits: number = 0;
  public total_withdrawals: number = 0;
  public lifetime_volume: number = 0;
  public net_loss: number = 0;
  public total_bets_placed: number = 0;
  public total_bets_won: number = 0;

  // Activity tracking
  public last_activity: string = new Date().toISOString();
  public last_login: string = new Date().toISOString();
  public login_count: number = 0;
  public session_count: number = 0;

  // Risk and compliance
  public risk_score: number = 0;
  public risk_level: 'low' | 'medium' | 'high' | 'critical' = 'low';
  public kyc_status: KYCStatus = 'pending';
  public kyc_documents: string = '[]';
  public aml_status: 'clear' | 'flagged' | 'under_review' = 'clear';

  // Betting preferences and limits
  public betting_limits: string = '{}';
  public favorite_sports: string = '[]';
  public betting_patterns: string = '{}';

  // Personal information
  public first_name?: string;
  public last_name?: string;
  public email?: string;
  public phone?: string;
  public date_of_birth?: string;
  public country?: string;
  public state?: string;
  public city?: string;
  public postal_code?: string;

  // Preferences and settings
  public preferences: string = '{}';
  public notifications_enabled: boolean = true;
  public marketing_opt_in: boolean = false;
  public language_preference: string = 'en';
  public timezone: string = 'America/New_York';

  // System tracking
  public fire22_synced_at: string = new Date().toISOString();
  public sync_version: number = 1;
  public notes?: string;

  constructor(data?: Partial<Fire22Customer>) {
    super();
    if (data) {
      this.update(data);
    }
  }

  // !== FINANCIAL OPERATIONS !==

  /**
   * Get total available balance across all accounts
   */
  public getTotalBalance(): number {
    return this.balance + this.casino_balance + this.sports_balance + this.freeplay_balance;
  }

  /**
   * Get net position (deposits - withdrawals)
   */
  public getNetPosition(): number {
    return this.total_deposits - this.total_withdrawals;
  }

  /**
   * Calculate lifetime value
   */
  public getLifetimeValue(): number {
    return this.net_loss + this.lifetime_volume * 0.05; // 5% house edge assumption
  }

  /**
   * Update balance after transaction
   */
  public updateBalance(
    amount: number,
    balanceType: 'main' | 'casino' | 'sports' | 'freeplay' = 'main'
  ): this {
    switch (balanceType) {
      case 'casino':
        this.casino_balance = Math.max(0, this.casino_balance + amount);
        break;
      case 'sports':
        this.sports_balance = Math.max(0, this.sports_balance + amount);
        break;
      case 'freeplay':
        this.freeplay_balance = Math.max(0, this.freeplay_balance + amount);
        break;
      default:
        this.balance = Math.max(0, this.balance + amount);
    }

    this.updated_at = new Date().toISOString();
    return this;
  }

  /**
   * Process deposit
   */
  public processDeposit(amount: number): this {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    this.balance += amount;
    this.total_deposits += amount;
    this.updateTierBasedOnVolume();
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Process withdrawal
   */
  public processWithdrawal(amount: number): this {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    if (amount > this.getTotalBalance()) {
      throw new Error('Insufficient balance for withdrawal');
    }

    this.balance = Math.max(0, this.balance - amount);
    this.total_withdrawals += amount;
    this.updated_at = new Date().toISOString();

    return this;
  }

  // !== TIER MANAGEMENT !==

  /**
   * Update customer tier based on lifetime volume
   */
  public updateTierBasedOnVolume(): this {
    const volume = this.lifetime_volume;
    const thresholds = FIRE22_BUSINESS_RULES.VIP_TIER_THRESHOLD;

    let newTier: CustomerTier = 'bronze';

    if (volume >= thresholds.vip) newTier = 'vip';
    else if (volume >= thresholds.diamond) newTier = 'diamond';
    else if (volume >= thresholds.platinum) newTier = 'platinum';
    else if (volume >= thresholds.gold) newTier = 'gold';
    else if (volume >= thresholds.silver) newTier = 'silver';

    if (newTier !== this.tier) {
      this.tier = newTier;
      this.vip_status = newTier === 'vip' || newTier === 'diamond';
      this.updateBettingLimits();
    }

    return this;
  }

  /**
   * Update betting limits based on tier
   */
  public updateBettingLimits(): this {
    const limits = FIRE22_BUSINESS_RULES.DEFAULT_BETTING_LIMITS[this.tier];
    const bettingLimits = {
      min_bet: limits.min,
      max_bet: limits.max,
      daily_max: limits.max * 10,
      weekly_max: limits.max * 50,
    };

    this.betting_limits = JSON.stringify(bettingLimits);
    return this;
  }

  /**
   * Check if customer is VIP
   */
  public isVip(): boolean {
    return this.vip_status || this.tier === 'vip' || this.tier === 'diamond';
  }

  // !== BETTING OPERATIONS !==

  /**
   * Check if customer can place bet
   */
  public canPlaceBet(amount: number, betType: string = 'straight'): boolean {
    // Check if customer is active
    if (this.status !== 'active') {
      return false;
    }

    // Check sufficient balance
    if (amount > this.getTotalBalance()) {
      return false;
    }

    // Check betting limits
    const limits = this.getBettingLimits();
    if (amount < limits.min_bet || amount > limits.max_bet) {
      return false;
    }

    // Check daily limits
    // Note: This would need to be enhanced with daily betting history

    return true;
  }

  /**
   * Get betting limits
   */
  public getBettingLimits(): any {
    try {
      return JSON.parse(this.betting_limits);
    } catch {
      return FIRE22_BUSINESS_RULES.DEFAULT_BETTING_LIMITS[this.tier];
    }
  }

  /**
   * Record bet placed
   */
  public recordBetPlaced(amount: number, betType: string = 'straight'): this {
    this.total_bets_placed++;
    this.lifetime_volume += amount;
    this.updateTierBasedOnVolume();
    this.last_activity = new Date().toISOString();

    return this;
  }

  /**
   * Record bet won
   */
  public recordBetWon(wageredAmount: number, payoutAmount: number): this {
    this.total_bets_won++;
    this.balance += payoutAmount;
    this.last_activity = new Date().toISOString();

    return this;
  }

  /**
   * Record bet lost
   */
  public recordBetLost(wageredAmount: number): this {
    this.net_loss += wageredAmount;
    this.last_activity = new Date().toISOString();

    return this;
  }

  // !== RISK MANAGEMENT !==

  /**
   * Calculate risk score based on betting patterns
   */
  public calculateRiskScore(): number {
    let score = 0;

    // High-volume betting
    if (this.lifetime_volume > 100000) score += 20;

    // High frequency betting
    if (this.total_bets_placed > 1000) score += 15;

    // Large individual bets relative to balance
    const maxBetRatio = this.getBettingLimits().max_bet / this.getTotalBalance();
    if (maxBetRatio > 0.5) score += 25;

    // Recent high activity
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(this.last_activity).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastActivity < 1 && this.total_bets_placed > 50) score += 10;

    // KYC status
    if (this.kyc_status !== 'approved') score += 30;

    this.risk_score = Math.min(100, score);
    this.updateRiskLevel();

    return this.risk_score;
  }

  /**
   * Update risk level based on score
   */
  public updateRiskLevel(): this {
    const thresholds = FIRE22_BUSINESS_RULES.RISK_LEVEL_THRESHOLDS;

    if (this.risk_score >= thresholds.critical) {
      this.risk_level = 'critical';
    } else if (this.risk_score >= thresholds.high) {
      this.risk_level = 'high';
    } else if (this.risk_score >= thresholds.medium) {
      this.risk_level = 'medium';
    } else {
      this.risk_level = 'low';
    }

    return this;
  }

  /**
   * Check if customer requires manual review
   */
  public requiresManualReview(): boolean {
    return (
      this.risk_level === 'critical' ||
      this.aml_status === 'flagged' ||
      this.kyc_status === 'rejected' ||
      this.getTotalBalance() > 50000
    );
  }

  // !== ACTIVITY TRACKING !==

  /**
   * Record login
   */
  public recordLogin(): this {
    this.login_count++;
    this.last_login = new Date().toISOString();
    this.last_activity = new Date().toISOString();

    return this;
  }

  /**
   * Record session
   */
  public recordSession(): this {
    this.session_count++;
    this.last_activity = new Date().toISOString();

    return this;
  }

  /**
   * Get days since last activity
   */
  public getDaysSinceLastActivity(): number {
    return Math.floor(
      (Date.now() - new Date(this.last_activity).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Check if customer is dormant (no activity in 30+ days)
   */
  public isDormant(): boolean {
    return this.getDaysSinceLastActivity() > 30;
  }

  // !== KYC/AML OPERATIONS !==

  /**
   * Update KYC status
   */
  public updateKycStatus(status: KYCStatus, documents?: string[]): this {
    this.kyc_status = status;

    if (documents) {
      this.kyc_documents = JSON.stringify(documents);
    }

    // Recalculate risk score when KYC status changes
    this.calculateRiskScore();

    return this;
  }

  /**
   * Check if KYC is required
   */
  public requiresKyc(): boolean {
    return (
      this.kyc_status === 'pending' || this.kyc_status === 'expired' || this.total_deposits > 2000
    );
  }

  /**
   * Flag for AML review
   */
  public flagForAmlReview(reason: string): this {
    this.aml_status = 'flagged';
    this.notes = this.notes ? `${this.notes}\nAML Flag: ${reason}` : `AML Flag: ${reason}`;
    this.calculateRiskScore();

    return this;
  }

  // !== VALIDATION !==

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!this.fire22_customer_id) {
      errors.push('Fire22 customer ID is required');
    }

    if (!this.agent_id) {
      errors.push('Agent ID is required');
    }

    if (!this.login) {
      errors.push('Login is required');
    }

    // Field length validation
    const constraints = FIRE22_CONSTRAINTS;

    if (
      this.fire22_customer_id &&
      (this.fire22_customer_id.length < constraints.CUSTOMER_ID_LENGTH.min ||
        this.fire22_customer_id.length > constraints.CUSTOMER_ID_LENGTH.max)
    ) {
      errors.push(
        `Customer ID must be ${constraints.CUSTOMER_ID_LENGTH.min}-${constraints.CUSTOMER_ID_LENGTH.max} characters`
      );
    }

    if (
      this.login &&
      (this.login.length < constraints.LOGIN_LENGTH.min ||
        this.login.length > constraints.LOGIN_LENGTH.max)
    ) {
      errors.push(
        `Login must be ${constraints.LOGIN_LENGTH.min}-${constraints.LOGIN_LENGTH.max} characters`
      );
    }

    // Business rule validation
    if (this.balance < 0) {
      errors.push('Balance cannot be negative');
    }

    if (
      this.risk_score < constraints.RISK_SCORE.min ||
      this.risk_score > constraints.RISK_SCORE.max
    ) {
      errors.push(
        `Risk score must be between ${constraints.RISK_SCORE.min}-${constraints.RISK_SCORE.max}`
      );
    }

    // Email validation
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // !== SERIALIZATION !==

  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      // Include computed properties
      total_balance: this.getTotalBalance(),
      net_position: this.getNetPosition(),
      lifetime_value: this.getLifetimeValue(),
      betting_limits_parsed: this.getBettingLimits(),
      is_vip: this.isVip(),
      days_since_last_activity: this.getDaysSinceLastActivity(),
      is_dormant: this.isDormant(),
      requires_kyc: this.requiresKyc(),
      requires_manual_review: this.requiresManualReview(),
    };
  }

  // !== STATIC FACTORY METHODS !==

  /**
   * Create new customer with defaults
   */
  public static createNew(data: {
    fire22_customer_id: string;
    agent_id: string;
    login: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }): Fire22CustomerEntity {
    const customer = new Fire22CustomerEntity({
      ...data,
      tier: 'bronze',
      status: 'active',
      vip_status: false,
      balance: 0,
      risk_score: 0,
      risk_level: 'low',
      kyc_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Set initial betting limits
    customer.updateBettingLimits();

    return customer;
  }

  /**
   * Create from Fire22 API data
   */
  public static fromFire22Api(apiData: any): Fire22CustomerEntity {
    return new Fire22CustomerEntity({
      fire22_customer_id: apiData.customer_id,
      agent_id: apiData.agent_id,
      login: apiData.login,
      first_name: apiData.first_name,
      last_name: apiData.last_name,
      email: apiData.email,
      balance: parseFloat(apiData.balance) || 0,
      tier: apiData.tier || 'bronze',
      status: apiData.status || 'active',
      vip_status: Boolean(apiData.vip_status),
      total_deposits: parseFloat(apiData.total_deposits) || 0,
      total_withdrawals: parseFloat(apiData.total_withdrawals) || 0,
      lifetime_volume: parseFloat(apiData.lifetime_volume) || 0,
      last_activity: apiData.last_activity || new Date().toISOString(),
      fire22_synced_at: new Date().toISOString(),
    });
  }
}
