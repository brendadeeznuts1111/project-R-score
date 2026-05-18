/**
 * Domain Event Bus - Cloudflare Durable Object
 * Crystal Clear Architecture Integration
 *
 * Manages inter-domain communication through events using Cloudflare Durable Objects
 * Provides reliable, ordered event delivery between domain workers
 */

interface Env {
  DOMAIN_EVENT_BUS: DurableObjectNamespace;
  MONITORING_ENDPOINT?: string;
}

interface DomainEvent {
  id: string;
  type: string;
  domain: string;
  data: any;
  timestamp: string;
  correlationId: string;
  sequenceNumber?: number;
  retryCount?: number;
  maxRetries?: number;
}

interface EventSubscription {
  id: string;
  domain: string;
  eventTypes: string[];
  webhookUrl?: string;
  durableObject?: boolean;
  lastSequenceNumber: number;
  createdAt: string;
}

interface EventDeliveryAttempt {
  eventId: string;
  subscriptionId: string;
  attemptNumber: number;
  timestamp: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

export class DomainEventBus implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: DomainEvent[] = [];
  private deliveryAttempts: Map<string, EventDeliveryAttempt[]> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Restore state from storage
    this.state.blockConcurrencyWhile(async () => {
      await this.restoreState();
    });
  }

  async handleSession(session: WebSocket): Promise<void> {
    // Handle WebSocket connections for real-time event streaming
    session.accept();

    session.addEventListener('message', async event => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === 'SUBSCRIBE') {
          await this.handleSubscription(session, message);
        } else if (message.type === 'UNSUBSCRIBE') {
          await this.handleUnsubscription(session, message);
        } else if (message.type === 'ACK_EVENT') {
          await this.handleEventAcknowledgment(message);
        }
      } catch (error) {
        session.send(
          JSON.stringify({
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      }
    });

    // Send initial state
    session.send(
      JSON.stringify({
        type: 'CONNECTED',
        message: 'Domain Event Bus connected',
        timestamp: new Date().toISOString(),
      })
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      switch (method) {
        case 'POST':
          if (url.pathname === '/events') {
            return await this.publishEvent(request);
          } else if (url.pathname === '/subscriptions') {
            return await this.createSubscription(request);
          }
          break;

        case 'GET':
          if (url.pathname === '/events') {
            return await this.getEvents(request);
          } else if (url.pathname === '/subscriptions') {
            return await this.getSubscriptions(request);
          } else if (url.pathname === '/health') {
            return await this.getHealth();
          }
          break;

        case 'DELETE':
          if (url.pathname.startsWith('/subscriptions/')) {
            return await this.deleteSubscription(request, url.pathname.split('/')[2]);
          }
          break;
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('[DOMAIN_EVENT_BUS] Error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  private async publishEvent(request: Request): Promise<Response> {
    const event: DomainEvent = await request.json();

    // Validate event
    if (!event.id || !event.type || !event.domain) {
      return new Response(
        JSON.stringify({
          error: 'Invalid event',
          message: 'Event must have id, type, and domain',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add sequence number and metadata
    event.sequenceNumber = await this.getNextSequenceNumber();
    event.timestamp = new Date().toISOString();
    event.correlationId = event.correlationId || crypto.randomUUID();

    // Store event
    await this.storeEvent(event);

    // Process event delivery
    await this.processEventDelivery(event);

    return new Response(
      JSON.stringify({
        success: true,
        eventId: event.id,
        sequenceNumber: event.sequenceNumber,
        timestamp: event.timestamp,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async createSubscription(request: Request): Promise<Response> {
    const subscription: Omit<EventSubscription, 'id' | 'createdAt' | 'lastSequenceNumber'> =
      await request.json();

    if (!subscription.domain || !subscription.eventTypes || subscription.eventTypes.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid subscription',
          message: 'Subscription must have domain and eventTypes',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const sub: EventSubscription = {
      ...subscription,
      id: crypto.randomUUID(),
      lastSequenceNumber: 0,
      createdAt: new Date().toISOString(),
    };

    // Store subscription
    await this.storeSubscription(sub);

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: sub.id,
        domain: sub.domain,
        eventTypes: sub.eventTypes,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async getEvents(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    const eventType = url.searchParams.get('type');
    const since = url.searchParams.get('since');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let events = [...this.eventQueue];

    // Apply filters
    if (domain) {
      events = events.filter(e => e.domain === domain);
    }

    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }

    if (since) {
      const sinceTime = new Date(since).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
    }

    // Apply limit and sort by sequence number
    events = events.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)).slice(-limit);

    return new Response(
      JSON.stringify({
        events,
        count: events.length,
        total: this.eventQueue.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async getSubscriptions(request: Request): Promise<Response> {
    const subscriptions = Array.from(this.subscriptions.values());

    return new Response(
      JSON.stringify({
        subscriptions,
        count: subscriptions.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async deleteSubscription(request: Request, subscriptionId: string): Promise<Response> {
    if (!this.subscriptions.has(subscriptionId)) {
      return new Response(
        JSON.stringify({
          error: 'Subscription not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    this.subscriptions.delete(subscriptionId);
    await this.persistSubscriptions();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription deleted',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async getHealth(): Promise<Response> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      subscriptions: this.subscriptions.size,
      queuedEvents: this.eventQueue.length,
      storage: await this.getStorageInfo(),
    };

    return new Response(JSON.stringify(health), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async processEventDelivery(event: DomainEvent): Promise<void> {
    const relevantSubscriptions = Array.from(this.subscriptions.values()).filter(
      sub => sub.eventTypes.includes(event.type) || sub.eventTypes.includes('*')
    );

    for (const subscription of relevantSubscriptions) {
      await this.deliverEventToSubscription(event, subscription);
    }
  }

  private async deliverEventToSubscription(
    event: DomainEvent,
    subscription: EventSubscription
  ): Promise<void> {
    const attemptId = `${event.id}_${subscription.id}`;
    const attempts = this.deliveryAttempts.get(attemptId) || [];
    const attemptNumber = attempts.length + 1;

    try {
      const startTime = Date.now();

      if (subscription.webhookUrl) {
        // Deliver via HTTP webhook
        const response = await fetch(subscription.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event,
            subscriptionId: subscription.id,
            sequenceNumber: event.sequenceNumber,
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status}`);
        }
      } else if (subscription.durableObject) {
        // Deliver to another Durable Object
        const id = this.env.DOMAIN_EVENT_BUS.idFromName(subscription.domain);
        const stub = this.env.DOMAIN_EVENT_BUS.get(id);

        await stub.fetch(
          new Request('https://internal/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          })
        );
      }

      // Record successful delivery
      const attempt: EventDeliveryAttempt = {
        eventId: event.id,
        subscriptionId: subscription.id,
        attemptNumber,
        timestamp: new Date().toISOString(),
        success: true,
        responseTime: Date.now() - startTime,
      };

      attempts.push(attempt);
      this.deliveryAttempts.set(attemptId, attempts);

      // Update subscription sequence number
      subscription.lastSequenceNumber = event.sequenceNumber || 0;
      await this.persistSubscriptions();
    } catch (error) {
      console.error(
        `[EVENT_DELIVERY] Failed to deliver event ${event.id} to ${subscription.domain}:`,
        error
      );

      // Record failed delivery attempt
      const attempt: EventDeliveryAttempt = {
        eventId: event.id,
        subscriptionId: subscription.id,
        attemptNumber,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      attempts.push(attempt);
      this.deliveryAttempts.set(attemptId, attempts);

      // Check if we should retry
      const maxRetries = event.maxRetries || 3;
      if (attemptNumber < maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
        setTimeout(() => {
          this.deliverEventToSubscription(event, subscription);
        }, retryDelay);
      } else {
        console.error(
          `[EVENT_DELIVERY] Max retries exceeded for event ${event.id} to ${subscription.domain}`
        );
      }
    }
  }

  private async handleSubscription(session: WebSocket, message: any): Promise<void> {
    const { domain, eventTypes } = message;

    const subscription: EventSubscription = {
      id: crypto.randomUUID(),
      domain,
      eventTypes: eventTypes || ['*'],
      lastSequenceNumber: 0,
      createdAt: new Date().toISOString(),
    };

    await this.storeSubscription(subscription);

    session.send(
      JSON.stringify({
        type: 'SUBSCRIBED',
        subscriptionId: subscription.id,
        eventTypes: subscription.eventTypes,
      })
    );

    // Send recent events to catch up
    const recentEvents = this.eventQueue.slice(-10);
    for (const event of recentEvents) {
      session.send(
        JSON.stringify({
          type: 'EVENT',
          event,
        })
      );
    }
  }

  private async handleUnsubscription(session: WebSocket, message: any): Promise<void> {
    const { subscriptionId } = message;

    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      await this.persistSubscriptions();

      session.send(
        JSON.stringify({
          type: 'UNSUBSCRIBED',
          subscriptionId,
        })
      );
    } else {
      session.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Subscription not found',
        })
      );
    }
  }

  private async handleEventAcknowledgment(message: any): Promise<void> {
    const { eventId, subscriptionId } = message;

    // Mark event as acknowledged for this subscription
    const attemptId = `${eventId}_${subscriptionId}`;
    const attempts = this.deliveryAttempts.get(attemptId);

    if (attempts) {
      // Update the latest attempt as acknowledged
      const latestAttempt = attempts[attempts.length - 1];
      if (latestAttempt) {
        latestAttempt.success = true;
        this.deliveryAttempts.set(attemptId, attempts);
      }
    }
  }

  // Storage operations
  private async storeEvent(event: DomainEvent): Promise<void> {
    this.eventQueue.push(event);

    // Keep only recent events in memory (last 1000)
    if (this.eventQueue.length > 1000) {
      this.eventQueue = this.eventQueue.slice(-1000);
    }

    // Persist to storage
    await this.state.storage.put(`event:${event.id}`, event);
    await this.state.storage.put('events:queue', this.eventQueue);
  }

  private async storeSubscription(subscription: EventSubscription): Promise<void> {
    this.subscriptions.set(subscription.id, subscription);
    await this.persistSubscriptions();
  }

  private async persistSubscriptions(): Promise<void> {
    const subscriptionsObj = Object.fromEntries(this.subscriptions);
    await this.state.storage.put('subscriptions', subscriptionsObj);
  }

  private async restoreState(): Promise<void> {
    // Restore subscriptions
    const subscriptionsObj = (await this.state.storage.get('subscriptions')) as any;
    if (subscriptionsObj) {
      this.subscriptions = new Map(Object.entries(subscriptionsObj));
    }

    // Restore event queue
    const queue = (await this.state.storage.get('events:queue')) as DomainEvent[];
    if (queue) {
      this.eventQueue = queue;
    }

    // Restore delivery attempts
    const attemptsObj = (await this.state.storage.get('delivery:attempts')) as any;
    if (attemptsObj) {
      this.deliveryAttempts = new Map(Object.entries(attemptsObj));
    }
  }

  private async getNextSequenceNumber(): Promise<number> {
    const current = ((await this.state.storage.get('sequence:number')) as number) || 0;
    const next = current + 1;
    await this.state.storage.put('sequence:number', next);
    return next;
  }

  private async getStorageInfo(): Promise<any> {
    try {
      const keys = await this.state.storage.list();
      return {
        keysCount: keys.size,
        estimatedSize: 'unknown', // Cloudflare doesn't provide size info
      };
    } catch (error) {
      return {
        error: 'Failed to get storage info',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export for use in wrangler.toml
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.DOMAIN_EVENT_BUS.idFromName('global-event-bus');
    const durableObject = env.DOMAIN_EVENT_BUS.get(id);
    return durableObject.fetch(request);
  },

  async handleWebSocket(session: WebSocket, env: Env): Promise<void> {
    const id = env.DOMAIN_EVENT_BUS.idFromName('global-event-bus');
    const durableObject = env.DOMAIN_EVENT_BUS.get(id);
    return (durableObject as any).handleSession(session);
  },
};
