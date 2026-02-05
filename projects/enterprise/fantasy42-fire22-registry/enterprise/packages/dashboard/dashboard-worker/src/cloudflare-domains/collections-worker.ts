/**
 * Collections Domain Cloudflare Worker
 * Crystal Clear Architecture Integration
 *
 * Handles collection processing, settlement management, and payment operations
 * using Cloudflare Workers with domain-driven design principles
 */

interface Env {
  COLLECTIONS_DB: D1Database;
  CACHE: KVNamespace;
  MONITORING_ENDPOINT?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  PAYPAL_CLIENT_ID?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface CollectionData {
  id?: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  description?: string;
  referenceNumber?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  processedAt?: string;
}

interface DomainEvent {
  id: string;
  type: string;
  domain: string;
  data: any;
  timestamp: string;
  correlationId: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname.replace('/api/domains/collections', '');

    // Extract domain from path
    const domain = 'collections';

    try {
      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return await this.handleHealthCheck(env);
      }

      // Metrics endpoint
      if (path === '/metrics' && method === 'GET') {
        return await this.handleMetrics(env);
      }

      // Collection operations
      switch (method) {
        case 'GET':
          return await this.handleGetCollections(request, env, path);
        case 'POST':
          return await this.handleCreateCollection(request, env, path);
        case 'PUT':
          return await this.handleUpdateCollection(request, env, path);
        default:
          return new Response('Method not allowed', { status: 405 });
      }
    } catch (error) {
      console.error(`[${domain.toUpperCase()}] Error:`, error);

      // Emit error event
      await this.emitDomainEvent(env, {
        id: crypto.randomUUID(),
        type: 'COLLECTION_ERROR',
        domain,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          path,
          method,
        },
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
      });

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          domain,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

  async handleHealthCheck(env: Env): Promise<Response> {
    const health = {
      domain: 'collections',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: await this.checkDatabaseHealth(env),
      cache: await this.checkCacheHealth(env),
      version: '1.0.0',
    };

    return new Response(JSON.stringify(health), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async handleMetrics(env: Env): Promise<Response> {
    try {
      // Get collection metrics from database
      const metrics = await this.getCollectionMetrics(env);

      return new Response(
        JSON.stringify({
          domain: 'collections',
          metrics,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch metrics',
          domain: 'collections',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

  async handleGetCollections(request: Request, env: Env, path: string): Promise<Response> {
    const url = new URL(request.url);
    const collectionId = path.split('/')[1];

    if (collectionId) {
      // Get single collection
      const collection = await this.getCollectionById(env, collectionId);
      if (!collection) {
        return new Response(
          JSON.stringify({
            error: 'Collection not found',
            domain: 'collections',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: collection,
          domain: 'collections',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get collections list with filters
    const merchantId = url.searchParams.get('merchantId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const collections = await this.getCollections(env, { merchantId, status, limit });

    return new Response(
      JSON.stringify({
        success: true,
        data: collections,
        domain: 'collections',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },

  async handleCreateCollection(request: Request, env: Env, path: string): Promise<Response> {
    const body: CollectionData = await request.json();

    // Validate required fields
    if (!body.merchantId || !body.amount || !body.currency || !body.paymentMethod) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['merchantId', 'amount', 'currency', 'paymentMethod'],
          domain: 'collections',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create collection
    const collection = await this.createCollection(env, body);

    // Emit domain event
    await this.emitDomainEvent(env, {
      id: crypto.randomUUID(),
      type: 'COLLECTION_CREATED',
      domain: 'collections',
      data: { collectionId: collection.id, merchantId: body.merchantId, amount: body.amount },
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: collection,
        domain: 'collections',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },

  async handleUpdateCollection(request: Request, env: Env, path: string): Promise<Response> {
    const collectionId = path.split('/')[1];
    if (!collectionId) {
      return new Response(
        JSON.stringify({
          error: 'Collection ID required',
          domain: 'collections',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await request.json();
    const collection = await this.updateCollection(env, collectionId, body);

    if (!collection) {
      return new Response(
        JSON.stringify({
          error: 'Collection not found',
          domain: 'collections',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Emit domain event
    await this.emitDomainEvent(env, {
      id: crypto.randomUUID(),
      type: 'COLLECTION_UPDATED',
      domain: 'collections',
      data: { collectionId, status: collection.status },
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: collection,
        domain: 'collections',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },

  // Database operations
  async getCollectionById(env: Env, collectionId: string): Promise<CollectionData | null> {
    const result = await env.COLLECTIONS_DB.prepare('SELECT * FROM collections WHERE id = ?')
      .bind(collectionId)
      .first();

    return result as CollectionData | null;
  },

  async getCollections(
    env: Env,
    filters: {
      merchantId?: string;
      status?: string;
      limit: number;
    }
  ): Promise<CollectionData[]> {
    let query = 'SELECT * FROM collections WHERE 1=1';
    const params: any[] = [];

    if (filters.merchantId) {
      query += ' AND merchantId = ?';
      params.push(filters.merchantId);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(filters.limit);

    const result = await env.COLLECTIONS_DB.prepare(query)
      .bind(...params)
      .all();
    return result.results as CollectionData[];
  },

  async createCollection(env: Env, data: CollectionData): Promise<CollectionData> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const collection: CollectionData = {
      id,
      ...data,
      status: 'pending',
      createdAt: now,
    };

    await env.COLLECTIONS_DB.prepare(
      `
      INSERT INTO collections (id, merchantId, amount, currency, status, paymentMethod, description, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        collection.id,
        collection.merchantId,
        collection.amount,
        collection.currency,
        collection.status,
        collection.paymentMethod,
        collection.description || null,
        JSON.stringify(collection.metadata) || null,
        collection.createdAt
      )
      .run();

    return collection;
  },

  async updateCollection(
    env: Env,
    collectionId: string,
    updates: Partial<CollectionData>
  ): Promise<CollectionData | null> {
    const updateFields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'metadata') {
          updateFields.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return this.getCollectionById(env, collectionId);
    }

    params.push(collectionId);

    await env.COLLECTIONS_DB.prepare(
      `
      UPDATE collections
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `
    )
      .bind(...params)
      .run();

    return this.getCollectionById(env, collectionId);
  },

  async getCollectionMetrics(env: Env): Promise<any> {
    const metrics = await env.COLLECTIONS_DB.prepare(
      `
      SELECT
        COUNT(*) as totalCollections,
        SUM(amount) as totalAmount,
        AVG(amount) as averageAmount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedCollections,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCollections,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedCollections
      FROM collections
      WHERE createdAt >= datetime('now', '-30 days')
    `
    ).first();

    return {
      totalCollections: metrics?.totalCollections || 0,
      totalAmount: metrics?.totalAmount || 0,
      averageAmount: metrics?.averageAmount || 0,
      successRate: metrics?.totalCollections
        ? ((metrics.completedCollections || 0) / metrics.totalCollections) * 100
        : 0,
      pendingCollections: metrics?.pendingCollections || 0,
      failedCollections: metrics?.failedCollections || 0,
    };
  },

  // Health check utilities
  async checkDatabaseHealth(env: Env): Promise<{ status: string; message: string }> {
    try {
      await env.COLLECTIONS_DB.prepare('SELECT 1').first();
      return { status: 'ok', message: 'Database connection healthy' };
    } catch (error) {
      return { status: 'error', message: 'Database connection failed' };
    }
  },

  async checkCacheHealth(env: Env): Promise<{ status: string; message: string }> {
    try {
      await env.CACHE.put('health-check', 'ok', { expirationTtl: 60 });
      const value = await env.CACHE.get('health-check');
      return value === 'ok'
        ? { status: 'ok', message: 'Cache connection healthy' }
        : { status: 'error', message: 'Cache read/write failed' };
    } catch (error) {
      return { status: 'error', message: 'Cache connection failed' };
    }
  },

  // Domain event emission
  async emitDomainEvent(env: Env, event: DomainEvent): Promise<void> {
    try {
      // Store event in database for audit trail
      await env.COLLECTIONS_DB.prepare(
        `
        INSERT INTO domain_events (id, type, domain, data, timestamp, correlationId)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          event.id,
          event.type,
          event.domain,
          JSON.stringify(event.data),
          event.timestamp,
          event.correlationId
        )
        .run();

      // Send to monitoring system if configured
      if (env.MONITORING_ENDPOINT) {
        await fetch(env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'domain_event',
            event,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to emit domain event:', error);
    }
  },
};
