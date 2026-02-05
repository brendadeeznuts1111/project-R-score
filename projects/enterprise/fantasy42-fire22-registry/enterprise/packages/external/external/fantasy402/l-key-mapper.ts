/**
 * 🔥 Fantasy42 L-Key Mapping Integration
 * Domain-Driven Design Implementation
 *
 * Specialized L-Key mapping system for Fantasy42 external domain
 * Integrates with the core L-Key mapping system for Fantasy42 entities
 */

import {
  LKeyMapper,
  EntityMapper,
  TransactionFlowMapper,
  AuditTrailMapper,
  type MappedEntity,
  lKeyMapper,
  entityMapper,
  transactionFlowMapper,
  auditTrailMapper,
} from '../../shared/l-key-mapper';
import { L_KEY_MAPPING } from '../../../types/fire22-otc-constants';

import { FantasyAccount } from './entities/fantasy-account';
import { FantasyAgent } from './entities/fantasy-agent';
import type { AgentType, AgentStatus } from './entities/fantasy-agent';
import { FantasyBet } from './entities/fantasy-bet';
import type { BetStatus, BetType } from './entities/fantasy-bet';
import { FantasySportEvent } from './entities/fantasy-sport-event';

// !==!==!==!==!==!==!==!===
// FANTASY42 ENTITY TYPES
// !==!==!==!==!==!==!==!===

export interface Fantasy42AccountEntity {
  id: string;
  agentId: string;
  currentBalance: number;
  availableBalance: number;
  pendingWagerBalance: number;
  creditLimit: number;
  isActive: boolean;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface Fantasy42AgentEntity {
  id: string;
  externalId: string;
  customerId: string;
  masterAgentId?: string;
  office: string;
  store: string;
  agentType: AgentType;
  status: AgentStatus;
  permissions: {
    canManageLines: boolean;
    canAddAccounts: boolean;
    canDeleteBets: boolean;
    canViewReports: boolean;
    canAccessBilling: boolean;
  };
  metadata?: Record<string, any>;
}

export interface Fantasy42BetEntity {
  id: string;
  externalId: string;
  agentId: string;
  customerId?: string;
  eventId: string;
  betType: BetType;
  amount: number;
  odds: number;
  selection: string;
  status: BetStatus;
  result?: string;
  payout?: number;
  settledAt?: Date;
  metadata?: Record<string, any>;
}

export interface Fantasy42EventEntity {
  id: string;
  externalId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  eventDate: Date;
  status: string;
  odds?: Record<string, any>;
  metadata?: Record<string, any>;
}

// !==!==!==!==!==!==!==!===
// FANTASY42 L-KEY MAPPER
// !==!==!==!==!==!==!==!===

export class Fantasy42LKeyMapper {
  private static instance: Fantasy42LKeyMapper;
  private lKeyMapper: LKeyMapper;

  private constructor() {
    this.lKeyMapper = LKeyMapper.getInstance();
  }

  static getInstance(): Fantasy42LKeyMapper {
    if (!Fantasy42LKeyMapper.instance) {
      Fantasy42LKeyMapper.instance = new Fantasy42LKeyMapper();
    }
    return Fantasy42LKeyMapper.instance;
  }

  /**
   * Generate Fantasy42-specific L-Key categories
   */
  private generateFantasy42LKey(category: string, number: number): string {
    const prefixMap: Record<string, string> = {
      FANTASY_ACCOUNTS: 'L1',
      FANTASY_AGENTS: 'L2',
      FANTASY_BETS: 'L3',
      FANTASY_EVENTS: 'L4',
      FANTASY_TRANSACTIONS: 'L5',
      FANTASY_REPORTS: 'L6',
    };

    const prefix = prefixMap[category] || 'L0';
    return `${prefix}${String(number).padStart(3, '0')}`;
  }

  private generateNextLKey(category: keyof typeof L_KEY_MAPPING): string {
    return this.lKeyMapper.generateNextLKey(category);
  }

  private getLKey(value: string): string | undefined {
    return this.lKeyMapper.getLKey(value);
  }

  /**
   * Get L-Key for Fantasy42 account
   */
  getAccountLKey(account: Fantasy42AccountEntity): string {
    // Use agent ID as primary identifier for account L-Key
    const agentLKey = this.getAgentLKey({ externalId: account.agentId } as any);
    return agentLKey ? `${agentLKey}_ACC` : this.generateNextLKey('FANTASY_ACCOUNTS');
  }

  /**
   * Get L-Key for Fantasy42 agent
   */
  getAgentLKey(agent: Fantasy42AgentEntity): string {
    // Use external ID as primary identifier
    return (
      this.lKeyMapper.getLKey(agent.externalId) ||
      this.lKeyMapper.getLKey(`AGENT_${agent.externalId}`) ||
      this.generateNextLKey('FANTASY_AGENTS')
    );
  }

  /**
   * Get L-Key for Fantasy42 bet
   */
  getBetLKey(bet: Fantasy42BetEntity): string {
    // Use external bet ID as primary identifier
    return (
      this.lKeyMapper.getLKey(bet.externalId) ||
      this.lKeyMapper.getLKey(`BET_${bet.externalId}`) ||
      this.generateNextLKey('FANTASY_BETS')
    );
  }

  /**
   * Get L-Key for Fantasy42 event
   */
  getEventLKey(event: Fantasy42EventEntity): string {
    // Use external event ID as primary identifier
    return (
      this.lKeyMapper.getLKey(event.externalId) ||
      this.lKeyMapper.getLKey(`EVENT_${event.externalId}`) ||
      this.generateNextLKey('FANTASY_EVENTS')
    );
  }
}

// !==!==!==!==!==!==!==!===
// FANTASY42 ENTITY MAPPER
// !==!==!==!==!==!==!==!===

export class Fantasy42EntityMapper extends EntityMapper {
  private fantasyLKeyMapper: Fantasy42LKeyMapper;

  constructor() {
    super();
    this.fantasyLKeyMapper = Fantasy42LKeyMapper.getInstance();
  }

  /**
   * Map Fantasy42 account to L-Key entity
   */
  mapFantasyAccount(account: FantasyAccount): MappedEntity {
    const lKey = this.fantasyLKeyMapper.getAccountLKey({
      id: account.getId(),
      agentId: account.getAgentId(),
      currentBalance: account.getCurrentBalance().getAmount(),
      availableBalance: account.getAvailableBalance().getAmount(),
      pendingWagerBalance: account.getPendingWagerBalance().getAmount(),
      creditLimit: account.getCreditLimit().getAmount(),
      isActive: account.getIsActive(),
      lastActivity: account.getLastActivity(),
      metadata: account.getMetadata(),
    });

    const entity: MappedEntity = {
      id: account.getId(),
      lKey,
      type: 'FANTASY_ACCOUNT',
      category: 'EXTERNAL',
      metadata: {
        agentId: account.getAgentId(),
        currentBalance: account.getCurrentBalance().getAmount(),
        availableBalance: account.getAvailableBalance().getAmount(),
        pendingWagerBalance: account.getPendingWagerBalance().getAmount(),
        creditLimit: account.getCreditLimit().getAmount(),
        isActive: account.getIsActive(),
        lastActivity: account.getLastActivity(),
        utilizationPercent: account.getUtilizationPercentage(),
        ...account.getMetadata(),
      },
    };

    this.entities.set(account.getId(), entity);
    return entity;
  }

  /**
   * Map Fantasy42 agent to L-Key entity
   */
  mapFantasyAgent(agent: FantasyAgent): MappedEntity {
    const lKey = this.fantasyLKeyMapper.getAgentLKey({
      id: agent.getId(),
      externalId: agent.getExternalId(),
      customerId: agent.getCustomerId(),
      masterAgentId: agent.getMasterAgentId(),
      office: agent.getOffice(),
      store: agent.getStore(),
      agentType: agent.getAgentType(),
      status: agent.getStatus(),
      permissions: agent.getPermissions(),
      metadata: agent.getMetadata(),
    });

    const entity: MappedEntity = {
      id: agent.getId(),
      lKey,
      type: agent.getAgentType().toUpperCase(),
      category: 'AGENT',
      metadata: {
        externalId: agent.getExternalId(),
        customerId: agent.getCustomerId(),
        masterAgentId: agent.getMasterAgentId(),
        office: agent.getOffice(),
        store: agent.getStore(),
        status: agent.getStatus(),
        permissions: agent.getPermissions(),
        hierarchyLevel: agent.getHierarchyLevel(),
        fullName: agent.getFullName(),
        ...agent.getMetadata(),
      },
    };

    this.entities.set(agent.getId(), entity);
    return entity;
  }

  /**
   * Map Fantasy42 bet to L-Key entity
   */
  mapFantasyBet(bet: FantasyBet): MappedEntity {
    const lKey = this.fantasyLKeyMapper.getBetLKey({
      id: bet.getId(),
      externalId: bet.getExternalId(),
      agentId: bet.getAgentId(),
      customerId: bet.getCustomerId(),
      eventId: bet.getEventId(),
      betType: bet.getBetType(),
      amount: bet.getAmount().getAmount(),
      odds: bet.getOdds(),
      selection: bet.getSelection(),
      status: bet.getStatus(),
      result: bet.getResult(),
      payout: bet.getPayout()?.getAmount(),
      settledAt: bet.getSettledAt(),
      metadata: bet.getMetadata(),
    });

    const entity: MappedEntity = {
      id: bet.getId(),
      lKey,
      type: bet.getBetType().toUpperCase(),
      category: 'BET',
      metadata: {
        externalId: bet.getExternalId(),
        agentId: bet.getAgentId(),
        customerId: bet.getCustomerId(),
        eventId: bet.getEventId(),
        amount: bet.getAmount().getAmount(),
        odds: bet.getOdds(),
        selection: bet.getSelection(),
        status: bet.getStatus(),
        result: bet.getResult(),
        potentialPayout: bet.getPotentialPayout().getAmount(),
        actualPayout: bet.getPayout()?.getAmount(),
        profit: bet.getProfit(),
        settledAt: bet.getSettledAt(),
        ...bet.getMetadata(),
      },
    };

    this.entities.set(bet.getId(), entity);
    return entity;
  }

  /**
   * Map Fantasy42 event to L-Key entity
   */
  mapFantasyEvent(event: FantasySportEvent): MappedEntity {
    const lKey = this.fantasyLKeyMapper.getEventLKey({
      id: event.getId(),
      externalId: event.getExternalId(),
      sport: event.getSport(),
      league: event.getLeague(),
      homeTeam: event.getHomeTeam(),
      awayTeam: event.getAwayTeam(),
      eventDate: event.getEventDate(),
      status: event.getStatus(),
      odds: event.getOdds(),
      metadata: event.getMetadata(),
    });

    const entity: MappedEntity = {
      id: event.getId(),
      lKey,
      type: 'SPORT_EVENT',
      category: 'EVENT',
      metadata: {
        externalId: event.getExternalId(),
        sport: event.getSport(),
        league: event.getLeague(),
        homeTeam: event.getHomeTeam(),
        awayTeam: event.getAwayTeam(),
        eventDate: event.getEventDate(),
        status: event.getStatus(),
        odds: event.getOdds(),
        isLive: event.isLive(),
        isCompleted: event.isCompleted(),
        ...event.getMetadata(),
      },
    };

    this.entities.set(event.getId(), entity);
    return entity;
  }

  /**
   * Map Fantasy42 transaction flow
   */
  mapFantasyBettingFlow(params: {
    bet: FantasyBet;
    account: FantasyAccount;
    agent: FantasyAgent;
    event?: FantasySportEvent;
  }): {
    bet: MappedEntity;
    account: MappedEntity;
    agent: MappedEntity;
    event?: MappedEntity;
    flow: string[];
  } {
    const bet = this.mapFantasyBet(params.bet);
    const account = this.mapFantasyAccount(params.account);
    const agent = this.mapFantasyAgent(params.agent);
    const event = params.event ? this.mapFantasyEvent(params.event) : undefined;

    // Generate Fantasy42 betting flow L-Keys
    const flow = [
      agent.lKey, // Agent initiates
      'L3001', // Bet placement
      bet.lKey, // Bet created
      account.lKey, // Account debited
      event?.lKey || 'L4001', // Event reference
      'L6002', // Status: ACCEPTED
      'L6004', // Status: SETTLED
    ];

    return { bet, account, agent, event, flow };
  }
}

// !==!==!==!==!==!==!==!===
// FANTASY42 AUDIT TRAIL INTEGRATION
// !==!==!==!==!==!==!==!===

export class Fantasy42AuditTrailMapper extends AuditTrailMapper {
  constructor() {
    super();
  }

  /**
   * Log Fantasy42 account activity
   */
  logAccountActivity(params: {
    accountId: string;
    action: 'CREDIT' | 'DEBIT' | 'WAGER' | 'SETTLE';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    agentId: string;
    metadata?: Record<string, any>;
  }): void {
    this.logEntry({
      action: `ACCOUNT_${params.action}`,
      entityId: params.accountId,
      entityType: 'FANTASY_ACCOUNT',
      userId: params.agentId,
      metadata: {
        amount: params.amount,
        balanceBefore: params.balanceBefore,
        balanceAfter: params.balanceAfter,
        ...params.metadata,
      },
    });
  }

  /**
   * Log Fantasy42 bet activity
   */
  logBetActivity(params: {
    betId: string;
    action: 'PLACED' | 'ACCEPTED' | 'REJECTED' | 'SETTLED' | 'CANCELLED';
    agentId: string;
    amount?: number;
    odds?: number;
    result?: string;
    metadata?: Record<string, any>;
  }): void {
    this.logEntry({
      action: `BET_${params.action}`,
      entityId: params.betId,
      entityType: 'FANTASY_BET',
      userId: params.agentId,
      metadata: {
        amount: params.amount,
        odds: params.odds,
        result: params.result,
        ...params.metadata,
      },
    });
  }

  /**
   * Log Fantasy42 agent activity
   */
  logAgentActivity(params: {
    agentId: string;
    action: 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE' | 'STATUS_CHANGE';
    performedBy: string;
    metadata?: Record<string, any>;
  }): void {
    this.logEntry({
      action: `AGENT_${params.action}`,
      entityId: params.agentId,
      entityType: 'FANTASY_AGENT',
      userId: params.performedBy,
      metadata: params.metadata,
    });
  }
}

// !==!==!==!==!==!==!==!===
// FANTASY42 INTEGRATION SERVICE
// !==!==!==!==!==!==!==!===

export class Fantasy42LKeyIntegrationService {
  private entityMapper: Fantasy42EntityMapper;
  private auditMapper: Fantasy42AuditTrailMapper;
  private lKeyMapper: Fantasy42LKeyMapper;

  constructor() {
    this.entityMapper = new Fantasy42EntityMapper();
    this.auditMapper = new Fantasy42AuditTrailMapper();
    this.lKeyMapper = Fantasy42LKeyMapper.getInstance();
  }

  /**
   * Process Fantasy42 account for L-Key mapping
   */
  processAccount(account: FantasyAccount): MappedEntity {
    const mappedEntity = this.entityMapper.mapFantasyAccount(account);

    // Log account mapping
    this.auditMapper.logAccountActivity({
      accountId: account.getId(),
      action: 'CREDIT', // Default action for mapping
      amount: account.getCurrentBalance().getAmount(),
      balanceBefore: 0,
      balanceAfter: account.getCurrentBalance().getAmount(),
      agentId: account.getAgentId(),
      metadata: { action: 'INITIAL_MAPPING' },
    });

    return mappedEntity;
  }

  /**
   * Process Fantasy42 agent for L-Key mapping
   */
  processAgent(agent: FantasyAgent): MappedEntity {
    const mappedEntity = this.entityMapper.mapFantasyAgent(agent);

    // Log agent mapping
    this.auditMapper.logAgentActivity({
      agentId: agent.getId(),
      action: 'LOGIN', // Default action for mapping
      performedBy: 'SYSTEM',
      metadata: { action: 'INITIAL_MAPPING', agentType: agent.getAgentType() },
    });

    return mappedEntity;
  }

  /**
   * Process Fantasy42 bet for L-Key mapping
   */
  processBet(bet: FantasyBet): MappedEntity {
    const mappedEntity = this.entityMapper.mapFantasyBet(bet);

    // Log bet mapping
    this.auditMapper.logBetActivity({
      betId: bet.getId(),
      action: 'PLACED',
      agentId: bet.getAgentId(),
      amount: bet.getAmount().getAmount(),
      odds: bet.getOdds(),
      metadata: { action: 'INITIAL_MAPPING', betType: bet.getBetType() },
    });

    return mappedEntity;
  }

  /**
   * Process Fantasy42 event for L-Key mapping
   */
  processEvent(event: FantasySportEvent): MappedEntity {
    const mappedEntity = this.entityMapper.mapFantasyEvent(event);
    return mappedEntity;
  }

  /**
   * Process complete betting flow
   */
  processBettingFlow(params: {
    bet: FantasyBet;
    account: FantasyAccount;
    agent: FantasyAgent;
    event?: FantasySportEvent;
  }): {
    entities: MappedEntity[];
    flow: string[];
    auditTrail: any[];
  } {
    const { bet, account, agent, event, flow } = this.entityMapper.mapFantasyBettingFlow(params);

    const entities = [bet, account, agent];
    if (event) entities.push(event);

    // Create audit trail for the flow
    const auditTrail = [
      this.auditMapper.logBetActivity({
        betId: bet.id,
        action: 'PLACED',
        agentId: agent.id,
        amount: params.bet.getAmount().getAmount(),
        odds: params.bet.getOdds(),
      }),
      this.auditMapper.logAccountActivity({
        accountId: account.id,
        action: 'DEBIT',
        amount: params.bet.getAmount().getAmount(),
        balanceBefore: params.account.getCurrentBalance().getAmount(),
        balanceAfter: params.account.getAvailableBalance().getAmount(),
        agentId: agent.id,
      }),
    ];

    return { entities, flow, auditTrail };
  }

  /**
   * Get L-Key statistics for Fantasy42 domain
   */
  getLKeyStatistics(): {
    totalEntities: number;
    entitiesByCategory: Record<string, number>;
    lKeysByCategory: Record<string, string[]>;
    recentMappings: MappedEntity[];
  } {
    const entities = Array.from(this.entityMapper.getEntitiesByCategory('EXTERNAL'))
      .concat(Array.from(this.entityMapper.getEntitiesByCategory('AGENT')))
      .concat(Array.from(this.entityMapper.getEntitiesByCategory('BET')))
      .concat(Array.from(this.entityMapper.getEntitiesByCategory('EVENT')));

    const entitiesByCategory: Record<string, number> = {};
    const lKeysByCategory: Record<string, string[]> = {};

    for (const entity of entities) {
      entitiesByCategory[entity.category] = (entitiesByCategory[entity.category] || 0) + 1;

      if (!lKeysByCategory[entity.category]) {
        lKeysByCategory[entity.category] = [];
      }
      lKeysByCategory[entity.category].push(entity.lKey);
    }

    // Get recent mappings (last 10)
    const recentMappings = entities
      .sort(
        (a, b) =>
          (b.metadata.lastActivity || new Date(0)).getTime() -
          (a.metadata.lastActivity || new Date(0)).getTime()
      )
      .slice(0, 10);

    return {
      totalEntities: entities.length,
      entitiesByCategory,
      lKeysByCategory,
      recentMappings,
    };
  }

  /**
   * Export Fantasy42 L-Key mappings
   */
  exportMappings(): {
    entities: MappedEntity[];
    auditTrail: any[];
    statistics: any;
  } {
    const mappings = this.entityMapper.exportMappings();

    return {
      entities: mappings.entities.filter(e =>
        ['EXTERNAL', 'AGENT', 'BET', 'EVENT'].includes(e.category)
      ),
      auditTrail: this.auditMapper['entries'], // Access private property for export
      statistics: this.getLKeyStatistics(),
    };
  }
}

// !==!==!==!==!==!==!==!===
// EXPORT SINGLETON INSTANCES
// !==!==!==!==!==!==!==!===

export const fantasy42LKeyMapper = Fantasy42LKeyMapper.getInstance();
export const fantasy42EntityMapper = new Fantasy42EntityMapper();
export const fantasy42AuditMapper = new Fantasy42AuditTrailMapper();
export const fantasy42Integration = new Fantasy42LKeyIntegrationService();

export default {
  Fantasy42LKeyMapper,
  Fantasy42EntityMapper,
  Fantasy42AuditTrailMapper,
  Fantasy42LKeyIntegrationService,
  fantasy42LKeyMapper,
  fantasy42EntityMapper,
  fantasy42AuditMapper,
  fantasy42Integration,
};
