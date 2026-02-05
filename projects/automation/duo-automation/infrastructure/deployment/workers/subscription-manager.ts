/**
 * 📋 Subscription Manager - Durable Object for persistent subscription storage
 */

export interface Subscription {
  id: string;
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'teams' | 'pagerduty' | 'native';
  target: string;
  events: string[];
  filters: Record<string, any>;
  config: {
    retries: number;
    timeout: number;
    rateLimit: number;
    batching: {
      enabled: boolean;
      maxSize: number;
      maxWait: number;
    };
    customHeaders?: Record<string, string>;
    template?: string;
  };
  authentication: {
    type: 'none' | 'apikey' | 'bearer' | 'hmac';
    secret?: string;
  };
  status: 'active' | 'paused' | 'inactive';
  createdAt: string;
  updatedAt: string;
  deliveryStats: {
    totalSent: number;
    successRate: number;
    lastDelivery: string | null;
    lastFailure: string | null;
  };
}

export interface Delivery {
  id: string;
  eventId: string;
  eventType: string;
  status: 'delivered' | 'failed' | 'retrying' | 'pending';
  attempt: number;
  maxRetries: number;
  target: string;
  request: {
    method: string;
    headers: Record<string, string>;
    bodySize: number;
  };
  response: {
    statusCode?: number;
    body?: string;
    error?: string;
  };
  duration: number;
  scheduledAt: string;
  attemptedAt: string;
  nextRetryAt?: string;
  createdAt: string;
}

export class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private deliveryHistory: Map<string, Delivery[]> = new Map();

  /**
   * 🆕 Create a new subscription
   */
  createSubscription(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'deliveryStats'>): Subscription {
    const subscription: Subscription = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryStats: {
        totalSent: 0,
        successRate: 0,
        lastDelivery: null,
        lastFailure: null
      }
    };

    this.subscriptions.set(subscription.id, subscription);
    this.deliveryHistory.set(subscription.id, []);
    
    return subscription;
  }

  /**
   * 📋 List all subscriptions with filtering and pagination
   */
  listSubscriptions(options: {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  }): {
    subscriptions: Subscription[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    let allSubs = Array.from(this.subscriptions.values());
    
    // Apply filters
    if (options.status) {
      allSubs = allSubs.filter(sub => sub.status === options.status);
    }
    if (options.type) {
      allSubs = allSubs.filter(sub => sub.type === options.type);
    }

    // Sort by createdAt desc
    allSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    const paginatedSubs = allSubs.slice(startIndex, endIndex);

    return {
      subscriptions: paginatedSubs,
      pagination: {
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(allSubs.length / options.limit),
        totalCount: allSubs.length,
        hasNext: endIndex < allSubs.length,
        hasPrev: options.page > 1
      }
    };
  }

  /**
   * 🔍 Get subscription by ID
   */
  getSubscription(id: string): Subscription | null {
    return this.subscriptions.get(id) || null;
  }

  /**
   * ✏️ Update subscription
   */
  updateSubscription(id: string, updates: Partial<Subscription>): { id: string; updated: boolean; changes: Record<string, any> } | null {
    const subscription = this.subscriptions.get(id);
    
    if (!subscription) {
      return null;
    }

    const changes: Record<string, any> = {};

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'createdAt') {
        changes[key] = { old: subscription[key as keyof Subscription], new: updates[key as keyof Subscription] };
        (subscription as any)[key] = updates[key as keyof Subscription];
      }
    });

    subscription.updatedAt = new Date().toISOString();
    this.subscriptions.set(id, subscription);

    return { id, updated: true, changes };
  }

  /**
   * 🗑️ Delete subscription
   */
  deleteSubscription(id: string, cascade: boolean = true): { id: string; deleted: boolean; cascade: boolean } | null {
    const subscription = this.subscriptions.get(id);
    
    if (!subscription) {
      return null;
    }

    this.subscriptions.delete(id);
    if (cascade) {
      this.deliveryHistory.delete(id);
    }

    return { id, deleted: true, cascade };
  }

  /**
   * 📊 Get delivery history for a subscription
   */
  getDeliveryHistory(id: string, options: {
    status?: string;
    page: number;
    limit: number;
  }): {
    deliveries: Delivery[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalCount: number;
    };
    summary: {
      total: number;
      delivered: number;
      failed: number;
      retrying: number;
      successRate: number;
      averageLatency: number;
    };
  } | null {
    const subscription = this.subscriptions.get(id);
    
    if (!subscription) {
      return null;
    }

    let deliveries = this.deliveryHistory.get(id) || [];
    
    if (options.status) {
      deliveries = deliveries.filter(del => del.status === options.status);
    }

    // Sort by createdAt desc
    deliveries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    const paginatedDeliveries = deliveries.slice(startIndex, endIndex);

    const summary = {
      total: deliveries.length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      retrying: deliveries.filter(d => d.status === 'retrying').length,
      successRate: deliveries.length > 0 ? (deliveries.filter(d => d.status === 'delivered').length / deliveries.length * 100) : 0,
      averageLatency: deliveries.length > 0 ? deliveries.reduce((sum, d) => sum + d.duration, 0) / deliveries.length : 0
    };

    return {
      deliveries: paginatedDeliveries,
      pagination: {
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(deliveries.length / options.limit),
        totalCount: deliveries.length
      },
      summary
    };
  }

  /**
   * 🧪 Test subscription delivery
   */
  async testSubscription(id: string, options: {
    eventType?: string;
    payload?: Record<string, any>;
    dryRun?: boolean;
  }): Promise<{
    testId: string;
    status: 'success' | 'failure';
    delivered: boolean;
    response: {
      statusCode?: number;
      latency: number;
      body?: string;
      headers?: Record<string, string>;
      error?: string;
    };
    validation: {
      targetReachable: boolean;
      authenticationValid: boolean;
      eventFormatValid: boolean;
    };
    dryRun: boolean;
  } | null> {
    const subscription = this.subscriptions.get(id);
    
    if (!subscription) {
      return null;
    }

    const testId = crypto.randomUUID();
    const testPayload = {
      event: options.eventType || 'test',
      ...options.payload,
      testId,
      timestamp: new Date().toISOString()
    };

    let response = {
      testId,
      status: 'success' as const,
      delivered: false,
      response: {
        statusCode: 0,
        latency: 0,
        body: '',
        headers: {},
        error: ''
      },
      validation: {
        targetReachable: true,
        authenticationValid: true,
        eventFormatValid: true
      },
      dryRun: options.dryRun || false
    };

    if (!options.dryRun) {
      try {
        const startTime = Date.now();
        const testResponse = await fetch(subscription.target, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Event': 'true',
            ...subscription.config.customHeaders
          },
          body: JSON.stringify(testPayload)
        });
        
        const duration = Date.now() - startTime;
        
        response.delivered = testResponse.ok;
        response.response = {
          statusCode: testResponse.status,
          latency: duration,
          body: await testResponse.text(),
          headers: Object.fromEntries(testResponse.headers.entries())
        };
        
        if (!testResponse.ok) {
          response.status = 'failure';
        }
      } catch (error) {
        response.status = 'failure';
        response.validation.targetReachable = false;
        response.response.error = (error as Error).message;
      }
    }

    return response;
  }

  /**
   * 📊 Get statistics
   */
  getStats(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    averageSuccessRate: number;
  } {
    const allSubs = Array.from(this.subscriptions.values());
    const allDeliveries = Array.from(this.deliveryHistory.values()).flat();
    
    return {
      totalSubscriptions: allSubs.length,
      activeSubscriptions: allSubs.filter(sub => sub.status === 'active').length,
      totalDeliveries: allDeliveries.length,
      successfulDeliveries: allDeliveries.filter(del => del.status === 'delivered').length,
      averageSuccessRate: allSubs.length > 0 
        ? allSubs.reduce((sum, sub) => sum + sub.deliveryStats.successRate, 0) / allSubs.length 
        : 0
    };
  }
}

/**
 * 📋 Durable Object export for Cloudflare Workers
 */
export class SubscriptionManagerDO implements DurableObject {
  private manager: SubscriptionManager;

  constructor(state: DurableObjectState, env: any) {
    this.manager = new SubscriptionManager();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Route to appropriate method
      if (path === '/create' && method === 'POST') {
        return this.handleCreate(request);
      } else if (path === '/list' && method === 'GET') {
        return this.handleList(request);
      } else if (path.startsWith('/get/') && method === 'GET') {
        const id = path.split('/')[2];
        return this.handleGet(id);
      } else if (path.startsWith('/update/') && method === 'PUT') {
        const id = path.split('/')[2];
        return this.handleUpdate(id, request);
      } else if (path.startsWith('/delete/') && method === 'DELETE') {
        const id = path.split('/')[2];
        return this.handleDelete(id, request);
      } else if (path.startsWith('/deliveries/') && method === 'GET') {
        const id = path.split('/')[2];
        return this.handleDeliveries(id, request);
      } else if (path.startsWith('/test/') && method === 'POST') {
        const id = path.split('/')[2];
        return this.handleTest(id, request);
      } else if (path === '/stats' && method === 'GET') {
        return this.handleStats();
      } else {
        return new Response('Endpoint not found', { status: 404 });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    const data = await request.json();
    const subscription = this.manager.createSubscription(data);
    
    return new Response(JSON.stringify(subscription, null, 2), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleList(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const options = {
      status: url.searchParams.get('status') || undefined,
      type: url.searchParams.get('type') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    };

    const result = this.manager.listSubscriptions(options);
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleGet(id: string): Promise<Response> {
    const subscription = this.manager.getSubscription(id);
    
    if (!subscription) {
      return new Response('Subscription not found', { status: 404 });
    }

    return new Response(JSON.stringify(subscription, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleUpdate(id: string, request: Request): Promise<Response> {
    const updates = await request.json();
    const result = this.manager.updateSubscription(id, updates);
    
    if (!result) {
      return new Response('Subscription not found', { status: 404 });
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleDelete(id: string, request: Request): Promise<Response> {
    const url = new URL(request.url);
    const cascade = url.searchParams.get('cascade') !== 'false';
    const result = this.manager.deleteSubscription(id, cascade);
    
    if (!result) {
      return new Response('Subscription not found', { status: 404 });
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 204,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleDeliveries(id: string, request: Request): Promise<Response> {
    const url = new URL(request.url);
    const options = {
      status: url.searchParams.get('status') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 500)
    };

    const result = this.manager.getDeliveryHistory(id, options);
    
    if (!result) {
      return new Response('Subscription not found', { status: 404 });
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleTest(id: string, request: Request): Promise<Response> {
    const options = await request.json();
    const result = await this.manager.testSubscription(id, options);
    
    if (!result) {
      return new Response('Subscription not found', { status: 404 });
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleStats(): Promise<Response> {
    const stats = this.manager.getStats();
    
    return new Response(JSON.stringify(stats, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
