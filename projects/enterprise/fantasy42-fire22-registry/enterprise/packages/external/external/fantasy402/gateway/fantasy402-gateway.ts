/**
 * Fantasy402 Gateway - Anti-Corruption Layer
 * Domain-Driven Design Implementation
 *
 * This gateway provides a clean interface for internal domains to interact with
 * the external Fantasy402 system without exposing external complexity.
 */

import { Fantasy402Adapter } from '../adapters/fantasy402-adapter';
import { FantasySportEvent } from '../entities/fantasy-sport-event';
import { FantasyAgent } from '../entities/fantasy-agent';
import { FantasyBet } from '../entities/fantasy-bet';
import { FantasyAccount } from '../entities/fantasy-account';
import { DomainEvents } from '/Users/nolarose/ff/src/domains/shared/events/domain-events';

export interface FantasyGatewayConfig {
  baseUrl: string;
  apiUrl: string;
  username: string;
  password: string;
  requestTimeout: number;
  retryAttempts: number;
  healthCheckLatencyThreshold: number; // For configurable health check threshold
  enableEventVersioning: boolean; // For event versioning
}

export interface SportEventQuery {
  sport?: string;
  league?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface AgentQuery {
  agentId?: string;
  masterAgentId?: string;
  office?: string;
  active?: boolean;
}

export interface BetQuery {
  betId?: string;
  agentId?: string;
  customerId?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'won' | 'lost' | 'cancelled';
  dateFrom?: Date;
  dateTo?: Date;
}

export class Fantasy402Gateway {
  private adapter: Fantasy402Adapter;
  private eventPublisher: DomainEvents;
  private config: FantasyGatewayConfig;

  constructor(
    config: FantasyGatewayConfig,
    eventPublisher?: DomainEvents,
    adapter?: Fantasy402Adapter
  ) {
    this.adapter = adapter || new Fantasy402Adapter(config);
    this.eventPublisher = eventPublisher || DomainEvents.getInstance();
    this.config = config;
  }

  /**
   * Get versioned event name
   */
  private getVersionedEventName(eventName: string): string {
    return this.config.enableEventVersioning ? `v1.${eventName}` : eventName;
  }

  /**
   * Serialize dates for adapter compatibility
   */
  private serializeQueryDates<T extends { dateFrom?: Date; dateTo?: Date }>(
    query: T
  ): T & {
    dateFrom?: string;
    dateTo?: string;
  } {
    return {
      ...query,
      dateFrom: query.dateFrom?.toISOString(),
      dateTo: query.dateTo?.toISOString(),
    };
  }

  /**
   * Initialize the gateway connection
   */
  async initialize(): Promise<void> {
    try {
      await this.adapter.authenticate();
      console.log('🎯 Fantasy402 Gateway: Successfully initialized');
    } catch (error) {
      console.error('❌ Fantasy402 Gateway: Failed to initialize:', error);
      throw new Error(
        `Fantasy402 Gateway initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get live sports events
   */
  async getLiveSportEvents(query: SportEventQuery = {}): Promise<FantasySportEvent[]> {
    try {
      const serializedQuery = this.serializeQueryDates(query);
      const rawEvents = await this.adapter.getSportEvents(serializedQuery);

      const events = rawEvents.map(event => FantasySportEvent.fromExternalData(event));

      // Publish domain events for new events
      for (const event of events) {
        await this.eventPublisher.publish(
          this.getVersionedEventName('fantasy.sport_event.discovered'),
          {
            eventId: `event-${event.getId()}`,
            eventType: 'fantasy.sport_event.discovered',
            aggregateId: event.getId(),
            aggregateType: 'FantasySportEvent',
            timestamp: new Date(),
            version: 1,
            payload: {
              sport: event.getSport(),
              league: event.getLeague(),
              homeTeam: event.getHomeTeam(),
              awayTeam: event.getAwayTeam(),
              startTime: event.getStartTime(),
              status: event.getStatus(),
            },
          }
        );
      }

      return events;
    } catch (error) {
      console.error('❌ Fantasy402 Gateway: Failed to get live events:', error);
      throw new Error(
        `Failed to retrieve live sport events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get agent information
   */
  async getAgent(agentId: string): Promise<FantasyAgent | null> {
    try {
      const rawAgent = await this.adapter.getAgentInfo(agentId);
      return rawAgent ? FantasyAgent.fromExternalData(rawAgent) : null;
    } catch (error) {
      console.error(`❌ Fantasy402 Gateway: Failed to get agent ${agentId}:`, error);
      throw new Error(
        `Failed to retrieve agent information: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get agents by query
   */
  async getAgents(
    query: AgentQuery & { limit?: number; offset?: number } = {}
  ): Promise<FantasyAgent[]> {
    try {
      const rawAgents = await this.adapter.getAgents(query);
      return rawAgents.map(agent => FantasyAgent.fromExternalData(agent));
    } catch (error) {
      console.error('❌ Fantasy402 Gateway: Failed to get agents:', error);
      throw new Error(
        `Failed to retrieve agents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get agent account information
   */
  async getAgentAccount(agentId: string): Promise<FantasyAccount | null> {
    try {
      const rawAccount = await this.adapter.getAgentAccount(agentId);
      return rawAccount ? FantasyAccount.fromExternalData(rawAccount) : null;
    } catch (error) {
      console.error(`❌ Fantasy402 Gateway: Failed to get agent account ${agentId}:`, error);
      throw new Error(
        `Failed to retrieve agent account: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get bets by query
   */
  async getBets(query: BetQuery & { limit?: number; offset?: number } = {}): Promise<FantasyBet[]> {
    try {
      const serializedQuery = this.serializeQueryDates(query);
      const rawBets = await this.adapter.getBets(serializedQuery);
      return rawBets.map(bet => FantasyBet.fromExternalData(bet));
    } catch (error) {
      console.error('❌ Fantasy402 Gateway: Failed to get bets:', error);
      throw new Error(
        `Failed to retrieve bets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get specific bet
   */
  async getBet(betId: string): Promise<FantasyBet | null> {
    try {
      const rawBet = await this.adapter.getBet(betId);
      return rawBet ? FantasyBet.fromExternalData(rawBet) : null;
    } catch (error) {
      // Handle 404/not found cases gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('404') || errorMessage?.includes('not found')) {
        console.log(`ℹ️ Fantasy402 Gateway: Bet ${betId} not found`);
        return null;
      }
      console.error(`❌ Fantasy402 Gateway: Failed to get bet ${betId}:`, error);
      throw new Error(`Failed to retrieve bet: ${errorMessage}`);
    }
  }

  /**
   * Place a bet on behalf of an agent
   */
  async placeBet(params: {
    agentId: string;
    eventId: string;
    betType: string;
    amount: number;
    odds: number;
    selection: string;
  }): Promise<FantasyBet> {
    try {
      const rawBet = await this.adapter.placeBet(params);
      const bet = FantasyBet.fromExternalData(rawBet);

      // Publish domain event
      await this.eventPublisher.publish(this.getVersionedEventName('fantasy.bet.placed'), {
        eventId: `bet-${bet.getId()}`,
        eventType: 'fantasy.bet.placed',
        aggregateId: bet.getId(),
        aggregateType: 'FantasyBet',
        timestamp: new Date(),
        version: 1,
        payload: {
          agentId: params.agentId,
          eventId: params.eventId,
          amount: params.amount,
          odds: params.odds,
          status: bet.getStatus(),
        },
      });

      return bet;
    } catch (error) {
      console.error('❌ Fantasy402 Gateway: Failed to place bet:', error);
      throw new Error(
        `Failed to place bet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancel a bet
   */
  async cancelBet(betId: string, reason: string): Promise<void> {
    try {
      await this.adapter.cancelBet(betId, reason);

      // Publish domain event
      await this.eventPublisher.publish(this.getVersionedEventName('fantasy.bet.cancelled'), {
        eventId: `bet-cancelled-${betId}`,
        eventType: 'fantasy.bet.cancelled',
        aggregateId: betId,
        aggregateType: 'FantasyBet',
        timestamp: new Date(),
        version: 1,
        payload: {
          betId,
          reason,
          cancelledAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`❌ Fantasy402 Gateway: Failed to cancel bet ${betId}:`, error);
      throw new Error(
        `Failed to cancel bet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update agent balance
   */
  async updateAgentBalance(
    agentId: string,
    amount: number,
    reason: string
  ): Promise<FantasyAccount> {
    try {
      const rawAccount = await this.adapter.updateBalance(agentId, amount, reason);
      const account = FantasyAccount.fromExternalData(rawAccount);

      // Publish domain event
      await this.eventPublisher.publish(
        this.getVersionedEventName('fantasy.account.balance_updated'),
        {
          eventId: `balance-${agentId}-${Date.now()}`,
          eventType: 'fantasy.account.balance_updated',
          aggregateId: agentId,
          aggregateType: 'FantasyAccount',
          timestamp: new Date(),
          version: 1,
          payload: {
            agentId,
            previousBalance: account.getCurrentBalance().getAmount() - amount,
            newBalance: account.getCurrentBalance().getAmount(),
            changeAmount: amount,
            reason,
          },
        }
      );

      return account;
    } catch (error) {
      console.error(`❌ Fantasy402 Gateway: Failed to update balance for ${agentId}:`, error);
      throw new Error(
        `Failed to update agent balance: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get sports odds for an event
   */
  async getEventOdds(eventId: string): Promise<{
    eventId: string;
    homeOdds: number;
    awayOdds: number;
    drawOdds?: number;
    lastUpdated: Date;
  }> {
    try {
      const odds = await this.adapter.getEventOdds(eventId);
      return {
        eventId,
        homeOdds: odds.home,
        awayOdds: odds.away,
        drawOdds: odds.draw,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`❌ Fantasy402 Gateway: Failed to get odds for event ${eventId}:`, error);
      throw new Error(
        `Failed to retrieve event odds: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check gateway health
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    lastChecked: Date;
  }> {
    const startTime = Date.now();

    try {
      await this.adapter.healthCheck();
      const latency = Date.now() - startTime;

      return {
        status: latency < this.config.healthCheckLatencyThreshold ? 'healthy' : 'degraded',
        latency,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Clean up resources
   */
  async disconnect(): Promise<boolean> {
    try {
      await this.adapter.disconnect();
      console.log('🎯 Fantasy402 Gateway: Successfully disconnected');
      return true;
    } catch (error) {
      console.error('❌ Fantasy402 Gateway: Error during disconnect:', error);
      return false;
    }
  }
}
