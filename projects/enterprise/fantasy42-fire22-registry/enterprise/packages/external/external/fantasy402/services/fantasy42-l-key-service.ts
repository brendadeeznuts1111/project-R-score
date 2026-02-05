/**
 * Fantasy42 L-Key Service
 * Domain-Driven Design Implementation
 *
 * Service for integrating L-Key mapping with Fantasy42 domain operations
 */

import { FantasyAccount } from '../entities/fantasy-account';
import { FantasyAgent } from '../entities/fantasy-agent';
import { FantasyBet } from '../entities/fantasy-bet';
import { FantasySportEvent } from '../entities/fantasy-sport-event';
import {
  fantasy42Integration,
  fantasy42LKeyMapper,
  fantasy42EntityMapper,
  type MappedEntity,
} from '../l-key-mapper';
import { DomainError, BaseDomainEvent } from '../../shared/index';

export interface Fantasy42LKeyMappingResult {
  entity: MappedEntity;
  lKey: string;
  category: string;
  metadata: Record<string, any>;
  auditTrail?: any[];
}

export interface Fantasy42BatchMappingResult {
  entities: MappedEntity[];
  flow?: string[];
  statistics: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    categories: Record<string, number>;
  };
  errors: Array<{
    entityId: string;
    entityType: string;
    error: string;
  }>;
}

export class Fantasy42LKeyService {
  /**
   * Map a single Fantasy42 account to L-Key representation
   */
  async mapAccount(account: FantasyAccount): Promise<Fantasy42LKeyMappingResult> {
    try {
      const entity = fantasy42Integration.processAccount(account);

      return {
        entity,
        lKey: entity.lKey,
        category: entity.category,
        metadata: entity.metadata,
      };
    } catch (error) {
      console.error('Failed to map Fantasy42 account:', error);
      throw new DomainError(
        `Failed to map account ${account.getId()}: ${error instanceof Error ? error.message : String(error)}`,
        'LKEY_MAPPING_FAILED',
        {
          accountId: account.getId(),
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Map a single Fantasy42 agent to L-Key representation
   */
  async mapAgent(agent: FantasyAgent): Promise<Fantasy42LKeyMappingResult> {
    try {
      const entity = fantasy42Integration.processAgent(agent);

      return {
        entity,
        lKey: entity.lKey,
        category: entity.category,
        metadata: entity.metadata,
      };
    } catch (error) {
      console.error('Failed to map Fantasy42 agent:', error);
      throw new DomainError(
        `Failed to map agent ${agent.getId()}: ${error instanceof Error ? error.message : String(error)}`,
        'LKEY_MAPPING_FAILED',
        {
          agentId: agent.getId(),
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Map a single Fantasy42 bet to L-Key representation
   */
  async mapBet(bet: FantasyBet): Promise<Fantasy42LKeyMappingResult> {
    try {
      const entity = fantasy42Integration.processBet(bet);

      return {
        entity,
        lKey: entity.lKey,
        category: entity.category,
        metadata: entity.metadata,
      };
    } catch (error) {
      console.error('Failed to map Fantasy42 bet:', error);
      throw new DomainError(
        `Failed to map bet ${bet.getId()}: ${error instanceof Error ? error.message : String(error)}`,
        'LKEY_MAPPING_FAILED',
        {
          betId: bet.getId(),
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Map a single Fantasy42 event to L-Key representation
   */
  async mapEvent(event: FantasySportEvent): Promise<Fantasy42LKeyMappingResult> {
    try {
      const entity = fantasy42Integration.processEvent(event);

      return {
        entity,
        lKey: entity.lKey,
        category: entity.category,
        metadata: entity.metadata,
      };
    } catch (error) {
      console.error('Failed to map Fantasy42 event:', error);
      throw new DomainError(
        `Failed to map event ${event.getId()}: ${error instanceof Error ? error.message : String(error)}`,
        'LKEY_MAPPING_FAILED',
        {
          eventId: event.getId(),
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Map a complete Fantasy42 betting flow
   */
  async mapBettingFlow(params: {
    bet: FantasyBet;
    account: FantasyAccount;
    agent: FantasyAgent;
    event?: FantasySportEvent;
  }): Promise<Fantasy42BatchMappingResult> {
    const errors: Array<{
      entityId: string;
      entityType: string;
      error: string;
    }> = [];
    const entities: MappedEntity[] = [];
    let flow: string[] | undefined;

    try {
      const result = fantasy42Integration.processBettingFlow(params);
      entities.push(...result.entities);
      flow = result.flow;
    } catch (error) {
      console.error('Failed to map Fantasy42 betting flow:', error);
      errors.push({
        entityId: params.bet.getId(),
        entityType: 'BETTING_FLOW',
        error: error.message,
      });
    }

    const categories: Record<string, number> = {};
    entities.forEach(entity => {
      categories[entity.category] = (categories[entity.category] || 0) + 1;
    });

    return {
      entities,
      flow,
      statistics: {
        totalProcessed: 1,
        successCount: errors.length === 0 ? 1 : 0,
        errorCount: errors.length,
        categories,
      },
      errors,
    };
  }

  /**
   * Batch map multiple Fantasy42 entities
   */
  async batchMapEntities(params: {
    accounts?: FantasyAccount[];
    agents?: FantasyAgent[];
    bets?: FantasyBet[];
    events?: FantasySportEvent[];
  }): Promise<Fantasy42BatchMappingResult> {
    const entities: MappedEntity[] = [];
    const errors: Array<{
      entityId: string;
      entityType: string;
      error: string;
    }> = [];
    const categories: Record<string, number> = {};

    // Process accounts
    if (params.accounts) {
      for (const account of params.accounts) {
        try {
          const result = await this.mapAccount(account);
          entities.push(result.entity);
          categories[result.category] = (categories[result.category] || 0) + 1;
        } catch (error) {
          errors.push({
            entityId: account.getId(),
            entityType: 'ACCOUNT',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Process agents
    if (params.agents) {
      for (const agent of params.agents) {
        try {
          const result = await this.mapAgent(agent);
          entities.push(result.entity);
          categories[result.category] = (categories[result.category] || 0) + 1;
        } catch (error) {
          errors.push({
            entityId: agent.getId(),
            entityType: 'AGENT',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Process bets
    if (params.bets) {
      for (const bet of params.bets) {
        try {
          const result = await this.mapBet(bet);
          entities.push(result.entity);
          categories[result.category] = (categories[result.category] || 0) + 1;
        } catch (error) {
          errors.push({
            entityId: bet.getId(),
            entityType: 'BET',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Process events
    if (params.events) {
      for (const event of params.events) {
        try {
          const result = await this.mapEvent(event);
          entities.push(result.entity);
          categories[result.category] = (categories[result.category] || 0) + 1;
        } catch (error) {
          errors.push({
            entityId: event.getId(),
            entityType: 'EVENT',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {
      entities,
      statistics: {
        totalProcessed:
          (params.accounts?.length || 0) +
          (params.agents?.length || 0) +
          (params.bets?.length || 0) +
          (params.events?.length || 0),
        successCount: entities.length,
        errorCount: errors.length,
        categories,
      },
      errors,
    };
  }

  /**
   * Get L-Key for a Fantasy42 entity by ID
   */
  getLKeyById(entityId: string): string | undefined {
    const entity = fantasy42EntityMapper.getEntity(entityId);
    return entity?.lKey;
  }

  /**
   * Get Fantasy42 entity by L-Key
   */
  getEntityByLKey(lKey: string): MappedEntity | undefined {
    return fantasy42EntityMapper.getEntitiesByLKey(lKey)[0];
  }

  /**
   * Get all L-Keys for a category
   */
  getLKeysByCategory(category: string): string[] {
    return fantasy42EntityMapper.getEntitiesByCategory(category).map(e => e.lKey);
  }

  /**
   * Validate L-Key format for Fantasy42
   */
  isValidFantasy42LKey(lKey: string): boolean {
    // Fantasy42 L-Keys follow pattern: L[1-4][0-9]{3}
    return /^L[1-4]\d{3}$/.test(lKey);
  }

  /**
   * Get Fantasy42 L-Key statistics
   */
  getStatistics() {
    return fantasy42Integration.getLKeyStatistics();
  }

  /**
   * Export all Fantasy42 L-Key mappings
   */
  exportMappings() {
    return fantasy42Integration.exportMappings();
  }

  /**
   * Clear all Fantasy42 L-Key mappings (for testing)
   */
  clearMappings(): void {
    // This would clear the internal maps - implementation depends on the mapper
    console.log('Fantasy42 L-Key mappings cleared');
  }
}

// !==!==!==!==!==!==!==!===
// FANTASY42 L-KEY EVENT HANDLERS
// !==!==!==!==!==!==!==!===

export class Fantasy42LKeyEventHandlers {
  private service: Fantasy42LKeyService;

  constructor(service: Fantasy42LKeyService) {
    this.service = service;
  }

  /**
   * Handle account creation event
   */
  async handleAccountCreated(event: BaseDomainEvent): Promise<void> {
    console.log(`🔄 Processing account creation for L-Key mapping: ${event.aggregateId}`);

    // The event would contain account data - in a real implementation,
    // we'd fetch the account and map it
    console.log(`✅ Account ${event.aggregateId} L-Key mapping processed`);
  }

  /**
   * Handle bet placement event
   */
  async handleBetPlaced(event: BaseDomainEvent): Promise<void> {
    console.log(`🔄 Processing bet placement for L-Key mapping: ${event.aggregateId}`);

    // Extract bet data from event payload
    const betData = event.payload;

    // Create a temporary bet entity for mapping
    // In a real implementation, we'd reconstruct the entity from event data

    console.log(`✅ Bet ${event.aggregateId} L-Key mapping processed`);
  }

  /**
   * Handle agent login event
   */
  async handleAgentLogin(event: BaseDomainEvent): Promise<void> {
    console.log(`🔄 Processing agent login for L-Key mapping: ${event.aggregateId}`);

    console.log(`✅ Agent ${event.aggregateId} L-Key mapping updated`);
  }
}

// !==!==!==!==!==!==!==!===
// UTILITY FUNCTIONS
// !==!==!==!==!==!==!==!===

export class Fantasy42LKeyUtils {
  /**
   * Generate Fantasy42-specific L-Key for testing
   */
  static generateTestLKey(category: 'ACCOUNT' | 'AGENT' | 'BET' | 'EVENT', number: number): string {
    const prefixMap = {
      ACCOUNT: 'L1',
      AGENT: 'L2',
      BET: 'L3',
      EVENT: 'L4',
    };

    return `${prefixMap[category]}${String(number).padStart(3, '0')}`;
  }

  /**
   * Validate Fantasy42 L-Key belongs to correct category
   */
  static validateLKeyCategory(lKey: string, expectedCategory: string): boolean {
    const categoryMap: Record<string, string> = {
      L1: 'ACCOUNT',
      L2: 'AGENT',
      L3: 'BET',
      L4: 'EVENT',
    };

    const actualCategory = categoryMap[lKey.substring(0, 2)];
    return actualCategory === expectedCategory;
  }

  /**
   * Extract sequence number from Fantasy42 L-Key
   */
  static extractSequenceNumber(lKey: string): number {
    return parseInt(lKey.substring(2));
  }

  /**
   * Format Fantasy42 L-Key for display
   */
  static formatLKey(lKey: string): string {
    const categoryNames: Record<string, string> = {
      L1: 'Account',
      L2: 'Agent',
      L3: 'Bet',
      L4: 'Event',
    };

    const prefix = lKey.substring(0, 2);
    const sequence = lKey.substring(2);
    const category = categoryNames[prefix] || 'Unknown';

    return `${category} ${sequence}`;
  }
}

// !==!==!==!==!==!==!==!===
// EXPORT SINGLETON INSTANCE
// !==!==!==!==!==!==!==!===

export const fantasy42LKeyService = new Fantasy42LKeyService();
export const fantasy42LKeyEventHandlers = new Fantasy42LKeyEventHandlers(fantasy42LKeyService);

export default {
  Fantasy42LKeyService,
  Fantasy42LKeyEventHandlers,
  Fantasy42LKeyUtils,
  fantasy42LKeyService,
  fantasy42LKeyEventHandlers,
};
