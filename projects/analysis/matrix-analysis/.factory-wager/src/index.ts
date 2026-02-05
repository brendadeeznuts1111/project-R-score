/**
 * FactoryWager Registry Worker
 * Handles registry API requests with R2 backend
 */

export interface Env {
  REGISTRY_BUCKET: R2Bucket;
  ARTIFACTS_BUCKET: R2Bucket;
  REGISTRY_KV: KVNamespace;
  REGISTRY_DB: D1Database;
  CLOUDFLARE_API_TOKEN?: string;
  REGISTRY_SECRET_KEY?: string;
  ENVIRONMENT: string;
  REGISTRY_VERSION: string;
  DOMAIN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Health check endpoint
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        version: env.REGISTRY_VERSION,
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Registry API endpoints
    if (path.startsWith('/api/registry/')) {
      return handleRegistryAPI(request, env, path);
    }
    
    // Static assets from R2
    if (path.startsWith('/assets/')) {
      const object = await env.ARTIFACTS_BUCKET.get(path.slice(8));
      if (object) {
        return new Response(object.body, {
          headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' }
        });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleRegistryAPI(request: Request, env: Env, path: string): Promise<Response> {
  // Implement registry API logic
  return new Response(JSON.stringify({
    message: 'Registry API',
    path,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
