/**
 * 🏢 Fire22 Dashboard - Agent Entity Classes
 * Agent domain entity implementations with business logic
 */

import { AuditableEntityClass, ValidationRule } from './base';
import type { Agent, AgentHierarchy } from '../types/database/entities';
import { BUSINESS } from '../constants';

export class AgentEntity extends AuditableEntityClass implements Agent {
  // Agent identification
  public agent_id: string;
  public agent_login: string;
  public agent_name: string;
  public agent_type: 'master' | 'agent' | 'player' | 'admin';
  public parent_agent?: string;
  public master_agent: string;
  public level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  // Business information
  public commission_rate: number;
  public status: 'active' | 'inactive' | 'suspended';
  public territory?: string;
  public specializations: string[];

  // Performance tracking
  public total_customers: number;
  public active_customers: number;
  public total_volume: number;
  public total_commission: number;
  public performance_score: number;

  // Access and permissions
  public permissions: string[];
  public access_level: number;
  public allowed_sports: string[];
  public max_bet_limit: number;

  // Activity
  public last_login?: string;
  public login_count: number;

  // Metadata
  public contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
  };

  constructor(data: Partial<Agent>) {
    super(data);

    // Agent identification
    this.agent_id = data.agent_id || `AGENT_${Date.now()}`;
    this.agent_login = data.agent_login || '';
    this.agent_name = data.agent_name || '';
    this.agent_type = data.agent_type || 'agent';
    this.parent_agent = data.parent_agent;
    this.master_agent = data.master_agent || '';
    this.level = data.level || 1;

    // Business information
    this.commission_rate = data.commission_rate || 0;
    this.status = data.status || 'active';
    this.territory = data.territory;
    this.specializations = data.specializations || [];

    // Performance tracking
    this.total_customers = data.total_customers || 0;
    this.active_customers = data.active_customers || 0;
    this.total_volume = data.total_volume || 0;
    this.total_commission = data.total_commission || 0;
    this.performance_score = data.performance_score || 0;

    // Access and permissions
    this.permissions = data.permissions || [];
    this.access_level = data.access_level || 1;
    this.allowed_sports = data.allowed_sports || [];
    this.max_bet_limit = data.max_bet_limit || 0;

    // Activity
    this.last_login = data.last_login;
    this.login_count = data.login_count || 0;

    // Metadata
    this.contact_info = data.contact_info || {};
  }

  protected getEntityName(): string {
    return 'agent';
  }

  protected getValidationRules(): ValidationRule[] {
    return [
      {
        field: 'agent_id',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
      },
      {
        field: 'agent_login',
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_-]+$/,
      },
      {
        field: 'agent_name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'commission_rate',
        required: true,
        type: 'number',
        min: 0,
        max: 100,
      },
      {
        field: 'level',
        required: true,
        type: 'number',
        min: 1,
        max: 8,
      },
      {
        field: 'access_level',
        required: true,
        type: 'number',
        min: 1,
        max: 10,
      },
    ];
  }

  /**
   * Check if agent is master agent
   */
  public isMaster(): boolean {
    return this.agent_type === 'master' || this.level === 8;
  }

  /**
   * Check if agent is admin
   */
  public isAdmin(): boolean {
    return this.agent_type === 'admin';
  }

  /**
   * Check if agent has permission
   */
  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) || this.permissions.includes('*');
  }

  /**
   * Check if agent can manage sport
   */
  public canManageSport(sport: string): boolean {
    return this.allowed_sports.includes(sport) || this.allowed_sports.includes('*');
  }

  /**
   * Get agent hierarchy level name
   */
  public getLevelName(): string {
    const levelNames: Record<number, string> = {
      1: 'Player',
      2: 'Sub-Agent',
      3: 'Agent',
      4: 'Senior Agent',
      5: 'Super Agent',
      6: 'Master Agent',
      7: 'Super Master',
      8: 'Master',
    };

    return levelNames[this.level] || 'Unknown';
  }

  /**
   * Calculate commission for amount
   */
  public calculateCommission(amount: number): number {
    return amount * (this.commission_rate / 100);
  }

  /**
   * Update performance score
   */
  public updatePerformanceScore(): this {
    // Simple performance calculation based on customer activity and volume
    let score = 0;

    // Customer base (30%)
    if (this.total_customers > 0) {
      const activeRatio = this.active_customers / this.total_customers;
      score += activeRatio * 30;
    }

    // Volume performance (40%)
    if (this.total_volume > 0) {
      const volumeScore = Math.min(this.total_volume / BUSINESS.AGENT_TARGETS.VOLUME, 1) * 40;
      score += volumeScore;
    }

    // Commission earning (30%)
    if (this.total_commission > 0) {
      const commissionScore =
        Math.min(this.total_commission / BUSINESS.AGENT_TARGETS.COMMISSION, 1) * 30;
      score += commissionScore;
    }

    this.performance_score = Math.round(score);
    this.touch();
    return this;
  }

  /**
   * Add customer to agent
   */
  public addCustomer(): this {
    this.total_customers += 1;
    this.active_customers += 1;
    this.updatePerformanceScore();
    return this;
  }

  /**
   * Remove customer from agent
   */
  public removeCustomer(wasActive: boolean = true): this {
    if (this.total_customers > 0) {
      this.total_customers -= 1;
    }

    if (wasActive && this.active_customers > 0) {
      this.active_customers -= 1;
    }

    this.updatePerformanceScore();
    return this;
  }

  /**
   * Record login
   */
  public recordLogin(): this {
    this.last_login = new Date().toISOString();
    this.login_count += 1;
    this.touch();
    return this;
  }

  /**
   * Add volume and commission
   */
  public addVolume(amount: number): this {
    this.total_volume += amount;
    this.total_commission += this.calculateCommission(amount);
    this.updatePerformanceScore();
    return this;
  }

  /**
   * Grant permission
   */
  public grantPermission(permission: string): this {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
      this.touch();
    }
    return this;
  }

  /**
   * Revoke permission
   */
  public revokePermission(permission: string): this {
    this.permissions = this.permissions.filter(p => p !== permission);
    this.touch();
    return this;
  }

  /**
   * Add sport access
   */
  public addSportAccess(sport: string): this {
    if (!this.allowed_sports.includes(sport)) {
      this.allowed_sports.push(sport);
      this.touch();
    }
    return this;
  }

  /**
   * Remove sport access
   */
  public removeSportAccess(sport: string): this {
    this.allowed_sports = this.allowed_sports.filter(s => s !== sport);
    this.touch();
    return this;
  }

  /**
   * Get agent summary
   */
  public getSummary(): {
    id: string;
    name: string;
    type: string;
    level: string;
    customers: number;
    volume: number;
    commission: number;
    performance: number;
  } {
    return {
      id: this.agent_id,
      name: this.agent_name,
      type: this.agent_type,
      level: this.getLevelName(),
      customers: this.total_customers,
      volume: this.total_volume,
      commission: this.total_commission,
      performance: this.performance_score,
    };
  }

  /**
   * Check if can approve bet
   */
  public canApproveBet(amount: number): boolean {
    return (
      this.status === 'active' && amount <= this.max_bet_limit && this.hasPermission('approve_bets')
    );
  }

  /**
   * Check if is subordinate of another agent
   */
  public isSubordinateOf(agentId: string): boolean {
    return this.parent_agent === agentId || this.master_agent === agentId;
  }
}

export class AgentHierarchyService {
  /**
   * Build agent hierarchy structure
   */
  static buildHierarchy(
    agent: AgentEntity,
    parent?: AgentEntity,
    children: AgentEntity[] = [],
    customers: any[] = []
  ): AgentHierarchy {
    // Calculate depth from level
    const depth = agent.level;

    // Build path from root to current agent
    const path: string[] = [];
    if (parent) {
      path.push(parent.agent_id);
    }
    path.push(agent.agent_id);

    return {
      agent,
      parent,
      children,
      customers,
      depth,
      path,
    };
  }

  /**
   * Check if agent A can manage agent B
   */
  static canManage(managerAgent: AgentEntity, targetAgent: AgentEntity): boolean {
    // Higher level agents can manage lower level agents
    return (
      managerAgent.level > targetAgent.level ||
      managerAgent.agent_id === targetAgent.master_agent ||
      managerAgent.agent_id === targetAgent.parent_agent ||
      managerAgent.isAdmin()
    );
  }

  /**
   * Get all agents in hierarchy path
   */
  static getHierarchyPath(agent: AgentEntity, allAgents: AgentEntity[]): AgentEntity[] {
    const path: AgentEntity[] = [agent];
    let currentAgent = agent;

    while (currentAgent.parent_agent) {
      const parentAgent = allAgents.find(a => a.agent_id === currentAgent.parent_agent);
      if (parentAgent) {
        path.unshift(parentAgent);
        currentAgent = parentAgent;
      } else {
        break;
      }
    }

    return path;
  }
}

export { AgentEntity as Agent };
