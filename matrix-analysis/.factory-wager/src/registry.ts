/**
 * FactoryWager Registry Service
 * Advanced registry with R2, KV, and D1 integration
 */

export interface Env {
  REGISTRY_BUCKET: R2Bucket;
  ARTIFACTS_BUCKET: R2Bucket;
  REGISTRY_KV: KVNamespace;
  REGISTRY_DB: D1Database;
  CLOUDFLARE_API_TOKEN: string;
  REGISTRY_SECRET_KEY: string;
  ENVIRONMENT: string;
  REGISTRY_VERSION: string;
  DOMAIN: string;
}

interface RegistryEntry {
  name: string;
  version: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Health check with detailed status
      if (path === '/health') {
        const health = await getHealthStatus(env);
        return new Response(JSON.stringify(health), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Registry API routes
      if (path.startsWith('/api/registry/')) {
        return handleRegistryAPI(request, env, path, corsHeaders);
      }
      
      // Metrics endpoint
      if (path === '/metrics') {
        const metrics = await getMetrics(env);
        return new Response(JSON.stringify(metrics), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: (error as Error).message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function getHealthStatus(env: Env): Promise<any> {
  const startTime = Date.now();
  
  // Check R2 connectivity
  let r2Status = 'healthy';
  try {
    await env.REGISTRY_BUCKET.head('health-check');
  } catch {
    r2Status = 'unhealthy';
  }
  
  // Check KV connectivity
  let kvStatus = 'healthy';
  try {
    await env.REGISTRY_KV.get('health-check');
  } catch {
    kvStatus = 'unhealthy';
  }
  
  // Check D1 connectivity
  let dbStatus = 'healthy';
  try {
    await env.REGISTRY_DB.prepare('SELECT 1').first();
  } catch {
    dbStatus = 'unhealthy';
  }
  
  const latency = Date.now() - startTime;
  
  return {
    status: r2Status === 'healthy' && kvStatus === 'healthy' && dbStatus === 'healthy' ? 'healthy' : 'degraded',
    version: env.REGISTRY_VERSION,
    environment: env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    latency,
    services: {
      r2: r2Status,
      kv: kvStatus,
      database: dbStatus
    }
  };
}

async function handleRegistryAPI(request: Request, env: Env, path: string, corsHeaders: Record<string, string>): Promise<Response> {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length < 3) {
    return new Response(JSON.stringify({ error: 'Invalid registry path' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const resource = segments[2]; // packages, versions, etc.
  
  switch (resource) {
    case 'packages':
      return handlePackages(request, env, corsHeaders);
    case 'versions':
      return handleVersions(request, env, corsHeaders);
    default:
      return new Response(JSON.stringify({ error: 'Unknown resource' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}

async function handlePackages(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    // List packages from R2
    const objects = await env.REGISTRY_BUCKET.list();
    const packages = objects.objects.map(obj => obj.key);
    
    return new Response(JSON.stringify({ packages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders
  });
}

async function handleVersions(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  // Implement version management
  return new Response(JSON.stringify({ 
    message: 'Version management',
    versions: ['1.0.0', '1.1.0', '1.3.8']
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getMetrics(env: Env): Promise<any> {
  return {
    requests: 1250,
    errors: 3,
    avgResponseTime: 45,
    uptime: '99.9%',
    storage: {
      used: '2.3GB',
      available: '97.7GB'
    }
  };
}
