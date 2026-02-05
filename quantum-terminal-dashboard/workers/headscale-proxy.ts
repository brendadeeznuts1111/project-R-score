// workers/headscale-proxy.ts
// Cloudflare Worker - Headscale + Tailscale Proxy with Rate Limiting

import { DurableObject } from 'cloudflare:workers';

// Headscale API routes
const HEADSCALE_ROUTES = {
  api: '/api/v1/*',
  derp: '/derp',
  register: '/register',
  metrics: '/metrics',
  debug: '/debug/*',
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60000,
  burst: 20,
};

export class HeadscaleProxy extends DurableObject {
  private headscaleUrl: string;
  private apiKey?: string;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.headscaleUrl = env.HEADSCALE_URL || 'http://100.64.0.10:8080';
    this.apiKey = env.HEADSCALE_API_KEY;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Security headers (Tailscale-aware)
    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Tailscale-Source': clientIP,
    };

    // Rate limiting (per IP)
    const rateLimitKey = `rate:${clientIP}`;
    const limit = await this.checkRateLimit(rateLimitKey);

    if (!limit.allowed) {
      return new Response('Rate Limited', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(limit.reset / 1000)),
          ...securityHeaders,
        },
      });
    }

    // WebSocket upgrade (Tailscale requirement)
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request, securityHeaders);
    }

    // API authentication
    if (url.pathname.startsWith('/api')) {
      const auth = request.headers.get('Authorization');
      if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== this.apiKey) {
        return new Response('Unauthorized', {
          status: 401,
          headers: securityHeaders,
        });
      }
    }

    // Proxy to Headscale
    return this.proxyRequest(request, securityHeaders);
  }

  async handleWebSocket(
    request: Request,
    headers: Record<string, string>
  ): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');

    if (!upgradeHeader) {
      return new Response('Expected WebSocket', { status: 400, headers });
    }

    // Connect to Headscale DERP server
    const headscaleWsUrl = this.headscaleUrl.replace('http', 'ws') + '/derp';

    try {
      const client = new WebSocket(headscaleWsUrl, {
        headers: {
          Origin: new URL(request.url).origin,
        },
      });

      const server = new WebSocket(request.url, {
        headers: request.headers,
      });

      // Bi-directional proxy
      client.addEventListener('message', (event) => server.send(event.data));
      server.addEventListener('message', (event) => client.send(event.data));

      client.addEventListener('close', () => server.close());
      server.addEventListener('close', () => client.close());

      return new Response(null, {
        status: 101,
        webSocket: server,
        headers,
      });
    } catch (error) {
      return new Response(`WebSocket error: ${error}`, {
        status: 500,
        headers,
      });
    }
  }

  async proxyRequest(
    request: Request,
    headers: Record<string, string>
  ): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = this.headscaleUrl + url.pathname + url.search;

    // Add Tailscale metadata
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    proxyHeaders.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.body,
        redirect: 'follow',
      });

      // Add security headers to response
      const responseHeaders = new Headers(response.headers);
      Object.entries(headers).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(`Proxy error: ${error}`, {
        status: 502,
        headers,
      });
    }
  }

  async checkRateLimit(key: string): Promise<{ allowed: boolean; reset: number }> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_CONFIG.windowMs;

    // Use Durable Object storage
    const requests = await this.ctx.storage.list<number>({ start: windowStart });
    const requestCount = requests.size;

    if (requestCount >= RATE_LIMIT_CONFIG.maxRequests) {
      const oldest = Math.min(...Array.from(requests.keys()).map(Number));
      return { allowed: false, reset: oldest + RATE_LIMIT_CONFIG.windowMs - now };
    }

    // Record this request
    await this.ctx.storage.put(now.toString(), now);

    return { allowed: true, reset: 0 };
  }
}

// Cloudflare Worker entry point
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Durable Object binding
    const id = env.HEADSCALE_PROXY.idFromName('main');
    const stub = env.HEADSCALE_PROXY.get(id);

    return stub.fetch(req);
  },
};

export interface Env {
  HEADSCALE_PROXY: DurableObjectNamespace;
  HEADSCALE_URL: string;
  HEADSCALE_API_KEY: string;
  RATE_LIMIT_BURST?: string;
}

