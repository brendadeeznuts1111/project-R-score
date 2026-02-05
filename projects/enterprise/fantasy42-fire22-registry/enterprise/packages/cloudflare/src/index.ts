/**
 * Fantasy42-Fire22 Registry Cloudflare Worker
 * Enterprise-grade package registry with Cloudflare infrastructure
 * Built without external dependencies for maximum compatibility
 */

interface Bindings {
  REGISTRY_DB: D1Database;
  CACHE: KVNamespace;
  PACKAGES: R2Bucket;
  REGISTRY_QUEUE: Queue;
}

// Simple routing without Hono
const routes: { [key: string]: (request: Request, env: Bindings) => Promise<Response> } = {};

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':
      'https://apexodds.com,https://docs.apexodds.com,https://registry.apexodds.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Health check endpoint
routes['/health'] = async (request: Request, env: Bindings) => {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbHealth = await env.REGISTRY_DB.prepare(
      'SELECT COUNT(*) as count FROM customers'
    ).first();

    // Check KV connectivity
    await env.CACHE.put('health-check', 'ok', { expirationTtl: 60 });
    const kvTest = await env.CACHE.get('health-check');

    // Check R2 connectivity
    const packages = await env.PACKAGES.list();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: {
          status: dbHealth ? 'healthy' : 'unhealthy',
          customerCount: dbHealth?.count || 0,
          responseTime: Date.now() - startTime,
        },
        cache: {
          status: kvTest === 'ok' ? 'healthy' : 'unhealthy',
        },
        storage: {
          status: packages ? 'healthy' : 'unhealthy',
          objects: packages.objects?.length || 0,
        },
        queue: {
          status: 'healthy',
          type: 'Cloudflare Queue',
        },
      },
      performance: {
        responseTime: Date.now() - startTime,
      },
      connectivity: {
        cloudflare: true,
        region: request.cf?.colo || 'unknown',
        country: request.cf?.country || 'unknown',
      },
      uptime: 0,
    };

    return new Response(JSON.stringify(healthData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
          uptime: 0,
        },
        null,
        2
      ),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  }
};

// Heartbeat endpoint
routes['/heartbeat'] = async (request: Request, env: Bindings) => {
  const heartbeat = {
    service: 'fantasy42-fire22-registry',
    timestamp: new Date().toISOString(),
    status: 'alive',
    uptime: 0,
    version: '1.0.0',
    environment: request.cf?.colo || 'unknown',
    memory: 'N/A',
    requestCount: 0,
  };

  return new Response(JSON.stringify(heartbeat, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
};

// Hub registration endpoint
routes['/register-hub'] = async (request: Request, env: Bindings) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  try {
    const registration = await request.json();

    const serviceInfo = {
      id: 'fantasy42-fire22-registry',
      name: 'Fantasy42-Fire22 Registry API',
      version: '1.0.0',
      environment: request.cf?.colo || 'production',
      endpoints: ['/health', '/heartbeat', '/packages', '/analytics', '/search'],
      capabilities: ['package-registry', 'analytics', 'health-monitoring', 'cache', 'storage'],
      registered: new Date().toISOString(),
      status: 'active',
    };

    return new Response(
      JSON.stringify(
        {
          success: true,
          message: 'Service registered with hub',
          service: serviceInfo,
        },
        null,
        2
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          success: false,
          error: 'Registration failed',
          details: error.message,
        },
        null,
        2
      ),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  }
};

// Package registry endpoints
routes['/packages'] = async (request: Request, env: Bindings) => {
  try {
    const packages = await env.REGISTRY_DB.prepare(
      `
        SELECT name, description, author, downloads, created_at
        FROM packages
        ORDER BY downloads DESC
        LIMIT 50
      `
    ).all();

    return new Response(
      JSON.stringify(
        {
          packages: packages.results,
          total: packages.results?.length || 0,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch packages' }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  }
};

// Analytics endpoint
routes['/analytics'] = async (request: Request, env: Bindings) => {
  try {
    // Mock analytics data since Analytics Engine may not be available
    const analytics = {
      totalPackages: 0,
      totalDownloads: 0,
      activeUsers: 0,
      period: '30 days',
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(
        {
          analytics,
          period: '30 days',
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  }
};

// Search endpoint
routes['/search'] = async (request: Request, env: Bindings) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const packages = await env.REGISTRY_DB.prepare(
      `
        SELECT name, description, author, downloads
        FROM packages
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY downloads DESC
        LIMIT ?
      `
    )
      .bind(`%${query}%`, `%${query}%`, limit)
      .all();

    return new Response(
      JSON.stringify(
        {
          query,
          packages: packages.results,
          total: packages.results?.length || 0,
        },
        null,
        2
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Search failed' }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  }
};

// Main request handler
export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Route to appropriate handler
    const handler = routes[path];
    if (handler) {
      return await handler(request, env);
    }

    // 404 handler
    return new Response(
      JSON.stringify(
        {
          error: 'Not found',
          message: 'The requested resource was not found',
          available_endpoints: [
            'GET /health',
            'GET /heartbeat',
            'POST /register-hub',
            'GET /packages',
            'GET /analytics',
            'GET /search?q=query',
          ],
        },
        null,
        2
      ),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  },
};
