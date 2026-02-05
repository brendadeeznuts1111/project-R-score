/**
 * Domain Events System
 * Event-driven communication between domains
 */

// DomainEvent interface is defined below in this file

type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;
type EventHandlerMap = Map<string, EventHandler<any>[]>;

export class DomainEvents {
  private static instance: DomainEvents;
  private handlers: EventHandlerMap = new Map();
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = new EventBus();
  }

  static getInstance(): DomainEvents {
    if (!DomainEvents.instance) {
      DomainEvents.instance = new DomainEvents();
    }
    return DomainEvents.instance;
  }

  /**
   * Register event handler for specific event type
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Publish domain event to all registered handlers
   */
  async publish<T extends DomainEvent>(eventType: string, event: T): Promise<void> {
    // Log event
    console.log(`📢 Domain Event: ${eventType}`, {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      timestamp: event.timestamp,
      version: event.version,
    });

    // Publish to event bus
    await this.eventBus.publish(eventType, event);

    // Execute local handlers
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      await Promise.all(
        handlers.map(handler => {
          try {
            return handler(event);
          } catch (error) {
            console.error(`Error in event handler for ${eventType}:`, error);
            return Promise.resolve(); // Don't let one handler break others
          }
        })
      );
    }
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all event handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Event Bus for cross-domain communication
 */
class EventBus {
  private subscribers: Map<string, EventHandler<any>[]> = new Map();

  async publish<T extends DomainEvent>(eventType: string, event: T): Promise<void> {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      await Promise.all(
        handlers.map(handler => {
          try {
            return handler(event);
          } catch (error) {
            console.error(`Event bus error for ${eventType}:`, error);
            return Promise.resolve();
          }
        })
      );
    }
  }

  subscribe(eventType: string, handler: EventHandler<any>): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler<any>): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

/**
 * Base Domain Event Interface
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  version: number;
  payload: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    causationId?: string;
    timezone?: string;
    timezoneContext?: string;
  };
}

/**
 * Domain Event Base Class
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly timestamp: Date;
  public readonly version: number;
  public readonly payload: Record<string, any>;
  public readonly metadata?: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    causationId?: string;
  };

  constructor(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    payload: Record<string, any>,
    metadata?: {
      userId?: string;
      sessionId?: string;
      correlationId?: string;
      causationId?: string;
      timezone?: string;
      timezoneContext?: string;
    }
  ) {
    // Fallback for environments without crypto.randomUUID
    this.eventId =
      typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID
        ? globalThis.crypto.randomUUID()
        : `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.timestamp = new Date();
    this.version = 1;
    this.payload = payload;
    this.metadata = metadata;
  }
}
