/**
 * 🏈 Fire22 Agent Entity Class
 * Business logic for Fire22 agent operations
 */

import type { Fire22Agent, AgentType, AgentStatus } from '../../types/fire22/entities';
import { AuditableEntityClass } from '../base';
import { FIRE22_CONSTRAINTS } from '../../types/fire22/entities';

export class Fire22AgentEntity extends AuditableEntityClass implements Fire22Agent {
  // Core identifiers
  public agent_id: string = '';
  public agent_login: string = '';
  public agent_name: string = '';
  public agent_type: AgentType = 'agent';

  // Hierarchy
  public parent_agent?: string;
  public master_agent?: string;
  public level: number = 1;
  public territory?: string;

  // Performance metrics
  public commission_rate: number = 0;
  public total_customers: number = 0;
  public active_customers: number = 0;
  public total_volume: number = 0;
  public total_commission: number = 0;
  public performance_score: number = 0;

  // Permissions and access
  public permissions: string = '{}';
  public access_level: number = 1;
  public allowed_sports: string = '[]';
  public max_bet_limit: number = 0;
  public max_payout_limit: number = 0;

  // Contact information
  public contact_email?: string;
  public contact_phone?: string;
  public contact_address?: string;
  public emergency_contact?: string;

  // Specializations
  public specializations: string = '[]';
  public languages_spoken: string = '["en"]';

  // Activity tracking
  public last_login?: string;
  public login_count: number = 0;
  public session_count: number = 0;

  // Financial
  public commission_balance: number = 0;
  public pending_commission: number = 0;
  public total_paid_commission: number = 0;

  // Status
  public status: AgentStatus = 'active';
  public termination_reason?: string;
  public termination_date?: string;

  constructor(data?: Partial<Fire22Agent>) {
    super();
    if (data) {
      this.update(data);
    }
  }

  // !== HIERARCHY MANAGEMENT !==

  /**
   * Check if agent is a master agent
   */
  public isMaster(): boolean {
    return this.agent_type === 'master_agent' || this.agent_type === 'super_agent';
  }

  /**
   * Check if agent is sub-agent of another
   */
  public isSubAgentOf(agentId: string): boolean {
    return this.parent_agent === agentId || this.master_agent === agentId;
  }

  /**
   * Get agent hierarchy level
   */
  public getHierarchyLevel(): number {
    return this.level;
  }

  /**
   * Update hierarchy information
   */
  public updateHierarchy(parentAgent?: string, masterAgent?: string, level: number = 1): this {
    this.parent_agent = parentAgent;
    this.master_agent = masterAgent;
    this.level = level;
    this.updated_at = new Date().toISOString();

    return this;
  }

  // !== COMMISSION CALCULATIONS !==

  /**
   * Calculate commission based on customer activity
   */
  public calculateCommission(customerVolume: number, customRate?: number): number {
    const rate = customRate || this.commission_rate;
    return customerVolume * rate;
  }

  /**
   * Add commission to pending balance
   */
  public addPendingCommission(amount: number): this {
    if (amount <= 0) {
      throw new Error('Commission amount must be positive');
    }

    this.pending_commission += amount;
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Process commission payment
   */
  public processCommissionPayment(amount?: number): this {
    const paymentAmount = amount || this.pending_commission;

    if (paymentAmount > this.pending_commission) {
      throw new Error('Payment amount exceeds pending commission');
    }

    this.pending_commission -= paymentAmount;
    this.commission_balance += paymentAmount;
    this.total_paid_commission += paymentAmount;
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Get total commission earned (paid + pending)
   */
  public getTotalCommissionEarned(): number {
    return this.total_paid_commission + this.pending_commission;
  }

  // !== CUSTOMER MANAGEMENT !==

  /**
   * Add customer to agent
   */
  public addCustomer(): this {
    this.total_customers++;
    this.active_customers++;
    this.updatePerformanceScore();
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Remove customer from agent
   */
  public removeCustomer(isActive: boolean = true): this {
    if (this.total_customers > 0) {
      this.total_customers--;
    }

    if (isActive && this.active_customers > 0) {
      this.active_customers--;
    }

    this.updatePerformanceScore();
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Update customer activity stats
   */
  public updateCustomerStats(totalCustomers: number, activeCustomers: number): this {
    this.total_customers = totalCustomers;
    this.active_customers = activeCustomers;
    this.updatePerformanceScore();
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Get customer retention rate
   */
  public getCustomerRetentionRate(): number {
    if (this.total_customers === 0) return 0;
    return (this.active_customers / this.total_customers) * 100;
  }

  // !== PERFORMANCE MANAGEMENT !==

  /**
   * Update performance score based on various metrics
   */
  public updatePerformanceScore(): this {
    let score = 0;

    // Customer metrics (40% weight)
    const retentionRate = this.getCustomerRetentionRate();
    score += (retentionRate / 100) * 40;

    // Volume metrics (30% weight)
    if (this.total_volume > 100000) score += 30;
    else if (this.total_volume > 50000) score += 25;
    else if (this.total_volume > 10000) score += 20;
    else if (this.total_volume > 1000) score += 10;

    // Activity metrics (20% weight)
    const daysSinceLastLogin = this.getDaysSinceLastLogin();
    if (daysSinceLastLogin <= 1) score += 20;
    else if (daysSinceLastLogin <= 7) score += 15;
    else if (daysSinceLastLogin <= 30) score += 10;

    // Commission performance (10% weight)
    if (this.total_commission > 10000) score += 10;
    else if (this.total_commission > 5000) score += 8;
    else if (this.total_commission > 1000) score += 5;

    this.performance_score = Math.min(100, Math.max(0, score));
    return this;
  }

  /**
   * Get performance rating
   */
  public getPerformanceRating(): 'excellent' | 'good' | 'average' | 'poor' {
    if (this.performance_score >= 80) return 'excellent';
    if (this.performance_score >= 60) return 'good';
    if (this.performance_score >= 40) return 'average';
    return 'poor';
  }

  /**
   * Record betting volume for performance tracking
   */
  public recordBettingVolume(volume: number): this {
    this.total_volume += volume;
    this.updatePerformanceScore();
    this.updated_at = new Date().toISOString();

    return this;
  }

  // !== PERMISSIONS AND ACCESS !==

  /**
   * Get permissions object
   */
  public getPermissions(): any {
    try {
      return JSON.parse(this.permissions);
    } catch {
      return {};
    }
  }

  /**
   * Update permissions
   */
  public updatePermissions(newPermissions: Record<string, any>): this {
    const currentPermissions = this.getPermissions();
    const updatedPermissions = { ...currentPermissions, ...newPermissions };
    this.permissions = JSON.stringify(updatedPermissions);
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Check if agent has specific permission
   */
  public hasPermission(permission: string): boolean {
    const perms = this.getPermissions();
    return Boolean(perms[permission]);
  }

  /**
   * Get allowed sports list
   */
  public getAllowedSports(): string[] {
    try {
      return JSON.parse(this.allowed_sports);
    } catch {
      return [];
    }
  }

  /**
   * Add allowed sport
   */
  public addAllowedSport(sport: string): this {
    const sports = this.getAllowedSports();
    if (!sports.includes(sport)) {
      sports.push(sport);
      this.allowed_sports = JSON.stringify(sports);
      this.updated_at = new Date().toISOString();
    }

    return this;
  }

  /**
   * Remove allowed sport
   */
  public removeAllowedSport(sport: string): this {
    const sports = this.getAllowedSports();
    const filteredSports = sports.filter(s => s !== sport);
    this.allowed_sports = JSON.stringify(filteredSports);
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Check if agent can handle sport
   */
  public canHandleSport(sport: string): boolean {
    const allowedSports = this.getAllowedSports();
    return allowedSports.length === 0 || allowedSports.includes(sport);
  }

  // !== SPECIALIZATIONS !==

  /**
   * Get specializations list
   */
  public getSpecializations(): string[] {
    try {
      return JSON.parse(this.specializations);
    } catch {
      return [];
    }
  }

  /**
   * Add specialization
   */
  public addSpecialization(specialization: string): this {
    const specs = this.getSpecializations();
    if (!specs.includes(specialization)) {
      specs.push(specialization);
      this.specializations = JSON.stringify(specs);
      this.updated_at = new Date().toISOString();
    }

    return this;
  }

  /**
   * Get languages spoken
   */
  public getLanguagesSpoken(): string[] {
    try {
      return JSON.parse(this.languages_spoken);
    } catch {
      return ['en'];
    }
  }

  /**
   * Check if agent speaks language
   */
  public speaksLanguage(language: string): boolean {
    return this.getLanguagesSpoken().includes(language);
  }

  // !== ACTIVITY TRACKING !==

  /**
   * Record login
   */
  public recordLogin(): this {
    this.login_count++;
    this.last_login = new Date().toISOString();
    this.updatePerformanceScore();

    return this;
  }

  /**
   * Record session
   */
  public recordSession(): this {
    this.session_count++;
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Get days since last login
   */
  public getDaysSinceLastLogin(): number {
    if (!this.last_login) return Infinity;

    return Math.floor((Date.now() - new Date(this.last_login).getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if agent is active (logged in within 7 days)
   */
  public isActiveAgent(): boolean {
    return this.status === 'active' && this.getDaysSinceLastLogin() <= 7;
  }

  // !== BETTING LIMITS !==

  /**
   * Check if bet amount is within agent's limits
   */
  public canApproveBet(betAmount: number): boolean {
    return betAmount <= this.max_bet_limit;
  }

  /**
   * Check if payout is within agent's limits
   */
  public canApprovePayout(payoutAmount: number): boolean {
    return payoutAmount <= this.max_payout_limit;
  }

  /**
   * Update betting limits
   */
  public updateBettingLimits(maxBet: number, maxPayout: number): this {
    if (maxBet < 0 || maxPayout < 0) {
      throw new Error('Betting limits must be non-negative');
    }

    this.max_bet_limit = maxBet;
    this.max_payout_limit = maxPayout;
    this.updated_at = new Date().toISOString();

    return this;
  }

  // !== STATUS MANAGEMENT !==

  /**
   * Activate agent
   */
  public activate(): this {
    this.status = 'active';
    this.termination_reason = undefined;
    this.termination_date = undefined;
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Suspend agent
   */
  public suspend(reason?: string): this {
    this.status = 'suspended';
    if (reason) {
      this.termination_reason = reason;
    }
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Terminate agent
   */
  public terminate(reason: string): this {
    this.status = 'terminated';
    this.termination_reason = reason;
    this.termination_date = new Date().toISOString();
    this.updated_at = new Date().toISOString();

    return this;
  }

  /**
   * Check if agent is operational
   */
  public isOperational(): boolean {
    return this.status === 'active' && this.isActiveAgent();
  }

  // !== VALIDATION !==

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!this.agent_id) {
      errors.push('Agent ID is required');
    }

    if (!this.agent_login) {
      errors.push('Agent login is required');
    }

    if (!this.agent_name) {
      errors.push('Agent name is required');
    }

    // Field length validation
    const constraints = FIRE22_CONSTRAINTS;

    if (
      this.agent_id &&
      (this.agent_id.length < constraints.AGENT_ID_LENGTH.min ||
        this.agent_id.length > constraints.AGENT_ID_LENGTH.max)
    ) {
      errors.push(
        `Agent ID must be ${constraints.AGENT_ID_LENGTH.min}-${constraints.AGENT_ID_LENGTH.max} characters`
      );
    }

    // Business rule validation
    if (
      this.commission_rate < constraints.COMMISSION_RATE.min ||
      this.commission_rate > constraints.COMMISSION_RATE.max
    ) {
      errors.push(
        `Commission rate must be between ${constraints.COMMISSION_RATE.min}-${constraints.COMMISSION_RATE.max}`
      );
    }

    if (
      this.performance_score < constraints.PERFORMANCE_SCORE.min ||
      this.performance_score > constraints.PERFORMANCE_SCORE.max
    ) {
      errors.push(
        `Performance score must be between ${constraints.PERFORMANCE_SCORE.min}-${constraints.PERFORMANCE_SCORE.max}`
      );
    }

    if (this.level < 1 || this.level > 8) {
      errors.push('Agent level must be between 1-8');
    }

    // Email validation
    if (this.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contact_email)) {
      errors.push('Invalid contact email format');
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
      is_master: this.isMaster(),
      hierarchy_level: this.getHierarchyLevel(),
      total_commission_earned: this.getTotalCommissionEarned(),
      customer_retention_rate: this.getCustomerRetentionRate(),
      performance_rating: this.getPerformanceRating(),
      days_since_last_login: this.getDaysSinceLastLogin(),
      is_active_agent: this.isActiveAgent(),
      is_operational: this.isOperational(),
      permissions_parsed: this.getPermissions(),
      allowed_sports_parsed: this.getAllowedSports(),
      specializations_parsed: this.getSpecializations(),
      languages_spoken_parsed: this.getLanguagesSpoken(),
    };
  }

  // !== STATIC FACTORY METHODS !==

  /**
   * Create new agent with defaults
   */
  public static createNew(data: {
    agent_id: string;
    agent_login: string;
    agent_name: string;
    agent_type?: AgentType;
    commission_rate?: number;
  }): Fire22AgentEntity {
    return new Fire22AgentEntity({
      ...data,
      agent_type: data.agent_type || 'agent',
      commission_rate: data.commission_rate || 0.05,
      status: 'active',
      level: 1,
      access_level: 1,
      max_bet_limit: 1000,
      max_payout_limit: 10000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Create from Fire22 API data
   */
  public static fromFire22Api(apiData: any): Fire22AgentEntity {
    return new Fire22AgentEntity({
      agent_id: apiData.agent_id,
      agent_login: apiData.agent_login,
      agent_name: apiData.agent_name,
      agent_type: apiData.agent_type || 'agent',
      parent_agent: apiData.parent_agent,
      master_agent: apiData.master_agent,
      level: parseInt(apiData.level) || 1,
      commission_rate: parseFloat(apiData.commission_rate) || 0.05,
      total_customers: parseInt(apiData.total_customers) || 0,
      active_customers: parseInt(apiData.active_customers) || 0,
      total_volume: parseFloat(apiData.total_volume) || 0,
      total_commission: parseFloat(apiData.total_commission) || 0,
      status: apiData.status || 'active',
      contact_email: apiData.contact_email,
      contact_phone: apiData.contact_phone,
      last_login: apiData.last_login,
    });
  }
}
