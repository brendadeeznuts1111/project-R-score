/**
 * External Event Mapper
 * Domain-Driven Design Implementation
 *
 * Maps external system events to internal domain events
 */

import { DomainEvents } from '../../shared/index';

export interface ExternalEvent {
  eventType: string;
  eventId: string;
  source: string;
  timestamp: Date;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export enum AggregateType {
  SportEvent = 'SportEvent',
  Bet = 'Bet',
  AgentAccount = 'AgentAccount',
  Message = 'Message',
  Customer = 'Customer',
  Agent = 'Agent',
}

export interface InternalEvent {
  eventId?: string; // NEW: Deterministic event ID for idempotency
  eventType: string;
  aggregateId: string;
  aggregateType: AggregateType; // CHANGED: Use enum instead of string
  payload: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    causationId?: string;
    externalEventId?: string;
    externalSource?: string;
    externalTimestamp?: string;
    eventId?: string; // NEW: Deterministic event ID
  };
}

export class ExternalEventMapper {
  private eventMappings: Map<string, (externalEvent: ExternalEvent) => InternalEvent[]> = new Map();
  private eventPublisher: DomainEvents;
  private publishedEvents: InternalEvent[] = []; // NEW: For testing support

  constructor(eventPublisher: DomainEvents, skipDefaults = false) {
    this.eventPublisher = eventPublisher;
    if (!skipDefaults) {
      this.setupDefaultMappings();
    }
  }

  /**
   * Generate deterministic event ID for idempotency
   */
  private generateEventId(
    externalEvent: ExternalEvent,
    internalEventType: string,
    sequence = 0
  ): string {
    const hash = btoa(`${externalEvent.eventId}:${internalEventType}:${sequence}`).replace(
      /[^a-zA-Z0-9]/g,
      ''
    );
    return `evt_${hash.substring(0, 16)}`;
  }

  /**
   * Safely access payload properties with defaults
   */
  private safeGet<T>(payload: any, path: string, defaultValue: T): T {
    try {
      const keys = path.split('.');
      let value = payload;

      for (const key of keys) {
        if (value == null || typeof value !== 'object') {
          return defaultValue;
        }
        value = value[key];
      }

      return value !== undefined ? value : defaultValue;
    } catch (error) {
      console.warn(`Failed to access payload path: ${path}`, error);
      return defaultValue;
    }
  }

  /**
   * Create safe mapper wrapper with error handling
   */
  private createSafeMapper(
    originalMapper: (externalEvent: ExternalEvent) => InternalEvent[]
  ): (externalEvent: ExternalEvent) => InternalEvent[] {
    return (externalEvent: ExternalEvent): InternalEvent[] => {
      try {
        return originalMapper(externalEvent);
      } catch (error) {
        console.error(`Mapper error for ${externalEvent.eventType}:`, error);
        console.error('External event payload:', externalEvent.payload);

        // Return empty array or throw based on configuration
        // For now, we'll throw to prevent silent failures
        throw new Error(
          `Event mapping failed for ${externalEvent.eventType}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
  }

  /**
   * Register a mapping from external event type to internal events
   */
  registerMapping(
    externalEventType: string,
    mapper: (externalEvent: ExternalEvent) => InternalEvent[]
  ): void {
    // Automatically wrap mapper with error handling
    const safeMapper = this.createSafeMapper(mapper);
    this.eventMappings.set(externalEventType, safeMapper);
  }

  /**
   * Process an external event and publish corresponding internal events
   *
   * @param externalEvent The external event to process
   * @param preserveOrder Whether to preserve event ordering (default: true for reliability)
   */
  async processExternalEvent(externalEvent: ExternalEvent, preserveOrder = true): Promise<void> {
    try {
      const mapper = this.eventMappings.get(externalEvent.eventType);

      if (!mapper) {
        console.warn(`No mapping found for external event type: ${externalEvent.eventType}`);
        return;
      }

      let internalEvents: InternalEvent[];

      // Guard against malformed payloads with error handling
      try {
        internalEvents = mapper(externalEvent);
      } catch (mapperError) {
        console.error(`❌ Mapper failed for ${externalEvent.eventType}:`, mapperError);
        console.error('Payload:', externalEvent.payload);
        throw new Error(
          `Event mapping failed: ${mapperError instanceof Error ? mapperError.message : String(mapperError)}`
        );
      }

      // Validate that we got an array of events
      if (!Array.isArray(internalEvents)) {
        throw new Error(
          `Mapper for ${externalEvent.eventType} must return an array of InternalEvent[]`
        );
      }

      // Add deterministic event IDs and enrich metadata for idempotency
      const enrichedEvents = internalEvents.map((internalEvent, index) => {
        const eventId = this.generateEventId(externalEvent, internalEvent.eventType, index);
        return {
          ...internalEvent,
          eventId, // Add deterministic ID
          metadata: {
            ...internalEvent.metadata,
            eventId, // Duplicate for easy access
            externalEventId: externalEvent.eventId,
            externalSource: externalEvent.source,
            externalTimestamp: externalEvent.timestamp.toISOString(),
          },
        };
      });

      // Store published events for testing (only in non-production)
      if (process.env.NODE_ENV !== 'production') {
        this.publishedEvents.push(...enrichedEvents);
      }

      // Publish events with ordering consideration
      if (preserveOrder) {
        // Sequential publishing (preserves order, slower)
        for (const enrichedEvent of enrichedEvents) {
          await this.eventPublisher.publish(enrichedEvent.eventType, enrichedEvent);
        }
      } else {
        // Parallel publishing (faster, no ordering guarantee)
        await Promise.all(
          enrichedEvents.map(enrichedEvent =>
            this.eventPublisher.publish(enrichedEvent.eventType, enrichedEvent)
          )
        );
      }

      console.log(
        `✅ Processed external event: ${externalEvent.eventType} -> ${internalEvents.length} internal events`
      );
    } catch (error) {
      console.error(`❌ Failed to process external event ${externalEvent.eventType}:`, error);
      console.error('External event:', {
        eventId: externalEvent.eventId,
        eventType: externalEvent.eventType,
        source: externalEvent.source,
        timestamp: externalEvent.timestamp,
      });
      throw error;
    }
  }

  /**
   * Set up default event mappings for common external events
   */
  private setupDefaultMappings(): void {
    // Fantasy402 Event Mappings
    this.registerMapping('fantasy402.sport_event.started', external => [
      {
        eventType: 'external.sport_event.live',
        aggregateId: this.safeGet(external.payload, 'eventId', external.eventId),
        aggregateType: AggregateType.SportEvent,
        payload: {
          externalId: this.safeGet(external.payload, 'eventId', external.eventId),
          sport: this.safeGet(external.payload, 'sport', 'unknown'),
          league: this.safeGet(external.payload, 'league', 'unknown'),
          homeTeam: this.safeGet(external.payload, 'home_team', 'TBD'),
          awayTeam: this.safeGet(external.payload, 'away_team', 'TBD'),
          startTime: this.safeGet(external.payload, 'start_time', new Date().toISOString()),
        },
        metadata: {
          correlationId: external.eventId,
          externalSource: 'fantasy402',
        },
      },
    ]);

    this.registerMapping('fantasy402.sport_event.completed', external => [
      {
        eventType: 'external.sport_event.completed',
        aggregateId: this.safeGet(external.payload, 'eventId', external.eventId),
        aggregateType: AggregateType.SportEvent,
        payload: {
          externalId: this.safeGet(external.payload, 'eventId', external.eventId),
          finalScore: this.safeGet(external.payload, 'final_score', null),
          winner: this.safeGet(external.payload, 'winner', null),
        },
        metadata: {
          correlationId: external.eventId,
          externalSource: 'fantasy402',
        },
      },
    ]);

    this.registerMapping('fantasy402.bet.placed', external => [
      {
        eventType: 'external.bet.received',
        aggregateId: this.safeGet(external.payload, 'betId', external.eventId),
        aggregateType: AggregateType.Bet,
        payload: {
          externalId: this.safeGet(external.payload, 'betId', external.eventId),
          agentId: this.safeGet(external.payload, 'agentId', null),
          eventId: this.safeGet(external.payload, 'eventId', null),
          amount: this.safeGet(external.payload, 'amount', 0),
          odds: this.safeGet(external.payload, 'odds', 0),
          betType: this.safeGet(external.payload, 'betType', 'unknown'),
        },
        metadata: {
          correlationId: external.eventId,
          externalSource: 'fantasy402',
        },
      },
    ]);

    this.registerMapping('fantasy402.bet.settled', external => [
      {
        eventType: 'external.bet.settled',
        aggregateId: this.safeGet(external.payload, 'betId', external.eventId),
        aggregateType: AggregateType.Bet,
        payload: {
          externalId: this.safeGet(external.payload, 'betId', external.eventId),
          result: this.safeGet(external.payload, 'result', null),
          payout: this.safeGet(external.payload, 'payout', 0),
          settledAt: this.safeGet(external.payload, 'settled_at', new Date().toISOString()),
        },
        metadata: {
          correlationId: external.eventId,
          externalSource: 'fantasy402',
        },
      },
    ]);

    this.registerMapping('fantasy402.agent.balance_changed', external => [
      {
        eventType: 'external.agent.balance_updated',
        aggregateId: this.safeGet(external.payload, 'agentId', external.eventId),
        aggregateType: AggregateType.AgentAccount,
        payload: {
          agentId: this.safeGet(external.payload, 'agentId', external.eventId),
          previousBalance: this.safeGet(external.payload, 'previous_balance', 0),
          newBalance: this.safeGet(external.payload, 'new_balance', 0),
          changeAmount: this.safeGet(external.payload, 'change_amount', 0),
          reason: this.safeGet(external.payload, 'reason', 'unknown'),
        },
        metadata: {
          correlationId: external.eventId,
          externalSource: 'fantasy402',
        },
      },
    ]);

    // Telegram Event Mappings (updated to match actual webhook payload structure)
    this.registerMapping('telegram.webhook.message', external => [
      {
        eventType: 'external.message.received',
        aggregateId: this.safeGet(external.payload, 'update_id', external.eventId).toString(),
        aggregateType: AggregateType.Message,
        payload: {
          senderId: this.safeGet(external.payload, 'message.from.id', null),
          chatId: this.safeGet(external.payload, 'message.chat.id', null),
          text: this.safeGet(external.payload, 'message.text', ''),
          messageType: this.safeGet(external.payload, 'message.message_type', 'text'),
          timestamp: this.safeGet(external.payload, 'message.date', Date.now()),
        },
        metadata: {
          correlationId: external.eventId,
          externalSource: 'telegram',
          telegramUpdateId: this.safeGet(external.payload, 'update_id', null),
        },
      },
    ]);
  }

  /**
   * Get all registered external event types
   */
  getRegisteredExternalEventTypes(): string[] {
    return Array.from(this.eventMappings.keys());
  }

  /**
   * Get mapping for a specific external event type
   */
  getMapping(
    externalEventType: string
  ): ((externalEvent: ExternalEvent) => InternalEvent[]) | undefined {
    return this.eventMappings.get(externalEventType);
  }

  /**
   * Remove a mapping
   */
  removeMapping(externalEventType: string): boolean {
    return this.eventMappings.delete(externalEventType);
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.eventMappings.clear();
  }

  /**
   * Get published events for testing (only available in non-production)
   */
  getPublishedEvents(): InternalEvent[] {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Published events are only available in non-production environments');
    }
    return [...this.publishedEvents];
  }

  /**
   * Clear published events for testing
   */
  clearPublishedEvents(): void {
    this.publishedEvents = [];
  }

  /**
   * Get last published event
   */
  getLastPublishedEvent(): InternalEvent | undefined {
    return this.publishedEvents[this.publishedEvents.length - 1];
  }

  /**
   * Find published events by type
   */
  getPublishedEventsByType(eventType: string): InternalEvent[] {
    return this.publishedEvents.filter(event => event.eventType === eventType);
  }

  /**
   * Find published events by aggregate ID
   */
  getPublishedEventsByAggregate(aggregateId: string): InternalEvent[] {
    return this.publishedEvents.filter(event => event.aggregateId === aggregateId);
  }

  /**
   * Batch process multiple external events
   */
  async processExternalEventsBatch(
    externalEvents: ExternalEvent[],
    preserveOrder = true
  ): Promise<{
    processed: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    const errors: Array<{ eventId: string; error: string }> = [];
    let processed = 0;

    if (preserveOrder) {
      // Process sequentially to maintain order
      for (const externalEvent of externalEvents) {
        try {
          await this.processExternalEvent(externalEvent, true);
          processed++;
        } catch (error) {
          errors.push({
            eventId: externalEvent.eventId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      // Process in parallel for speed
      const promises = externalEvents.map(async externalEvent => {
        try {
          await this.processExternalEvent(externalEvent, false);
          return { success: true, eventId: externalEvent.eventId };
        } catch (error) {
          return {
            success: false,
            eventId: externalEvent.eventId,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const results = await Promise.all(promises);
      processed = results.filter(r => r.success).length;
      errors.push(
        ...results
          .filter(r => !r.success)
          .map(r => ({
            eventId: r.eventId,
            error: r.error!,
          }))
      );
    }

    return { processed, errors };
  }

  /**
   * Validate external event structure
   */
  validateExternalEvent(externalEvent: ExternalEvent): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!externalEvent.eventType || typeof externalEvent.eventType !== 'string') {
      errors.push('eventType is required and must be a string');
    }

    if (!externalEvent.eventId || typeof externalEvent.eventId !== 'string') {
      errors.push('eventId is required and must be a string');
    }

    if (!externalEvent.source || typeof externalEvent.source !== 'string') {
      errors.push('source is required and must be a string');
    }

    if (!(externalEvent.timestamp instanceof Date)) {
      errors.push('timestamp must be a Date object');
    }

    if (!externalEvent.payload || typeof externalEvent.payload !== 'object') {
      errors.push('payload is required and must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get mapping statistics
   */
  getMappingStatistics(): {
    totalMappings: number;
    registeredEventTypes: string[];
    publishedEventCount: number;
    publishedEventTypes: string[];
  } {
    const publishedEventTypes = [...new Set(this.publishedEvents.map(e => e.eventType))];

    return {
      totalMappings: this.eventMappings.size,
      registeredEventTypes: Array.from(this.eventMappings.keys()),
      publishedEventCount: this.publishedEvents.length,
      publishedEventTypes,
    };
  }
}
