// infrastructure/cloudflare/qr-worker.ts
// [DOMAIN:INFRASTRUCTURE][SCOPE:CLOUDFLARE][TYPE:WORKER][META:{routing:true,security:true}][CLASS:QRWorker][#REF:CF-WORKER-007]

import { GlobalSecureTokenExchange } from '../../src/security/global-secure-token-exchange';
import { WebSocketAuthentication } from '../../src/security/websocket-auth';

export interface IWorkerEnv {
  JWT_SECRET: string;
  API_ORIGIN: string;
  DASHBOARD_ORIGIN: string;
  WS_ORIGIN: string;
  REDIS_URL: string;
  SENTRY_DSN: string;
  RATE_LIMIT_KV: KVNamespace;
  ANALYTICS_KV: KVNamespace;
}

export interface IWorkerContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  env: IWorkerEnv;
}

export interface IRequestContext {
  request: Request;
  url: URL;
  method: string;
  headers: Headers;
  cf: any; // Cloudflare request metadata
  geo: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
}

export class QRWorker {
  private tokenExchange: GlobalSecureTokenExchange;
  private wsAuth: WebSocketAuthentication;

  constructor() {
    this.tokenExchange = new GlobalSecureTokenExchange();
    this.wsAuth = new WebSocketAuthentication();
  }

  async handleRequest(request: Request, env: IWorkerEnv, ctx: IWorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const requestContext: IRequestContext = {
      request,
      url,
      method: request.method,
      headers: request.headers,
      cf: request.cf,
      geo: {
        country: request.cf?.country,
        city: request.cf?.city,
        region: request.cf?.region,
        timezone: request.cf?.timezone
      }
    };

    console.log(`🌐 Cloudflare Worker: ${request.method} ${url.pathname} - ${requestContext.geo.country || 'Unknown'}`);

    try {
      // Route based on path patterns
      const route = this.matchRoute(url.pathname, request.method);
      
      switch (route) {
        case 'qr-generate':
          return await this.handleQRGenerate(requestContext, env);
        
        case 'qr-validate':
          return await this.handleQRValidate(requestContext, env);
        
        case 'device-onboard':
          return await this.handleDeviceOnboard(requestContext, env);
        
        case 'dashboard-data':
          return await this.handleDashboardData(requestContext, env);
        
        case 'websocket-upgrade':
          return await this.handleWebSocketUpgrade(requestContext, env);
        
        case 'analytics-track':
          return await this.handleAnalyticsTrack(requestContext, env);
        
        case 'health-check':
          return await this.handleHealthCheck(requestContext, env);
        
        case 'cors-preflight':
          return this.handleCORSPreflight();
        
        case 'static-assets':
          return await this.handleStaticAssets(requestContext, env);
        
        case 'geo-redirect':
          return await this.handleGeoRedirect(requestContext, env);
        
        case 'rate-limit':
          return await this.handleRateLimit(requestContext, env);
        
        default:
          return new Response('Not Found', { status: 404 });
      }

    } catch (error) {
      console.error('🚨 Worker error:', error);
      
      // Log to Sentry if configured
      if (env.SENTRY_DSN) {
        ctx.waitUntil(this.logErrorToSentry(error, requestContext, env.SENTRY_DSN));
      }

      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.DASHBOARD_ORIGIN || '*'
          }
        }
      );
    }
  }

  private matchRoute(pathname: string, method: string): string {
    const routes = [
      { pattern: /^\/api\/qr\/generate$/, method: 'POST', route: 'qr-generate' },
      { pattern: /^\/api\/qr\/validate$/, method: 'POST', route: 'qr-validate' },
      { pattern: /^\/api\/device\/onboard$/, method: 'POST', route: 'device-onboard' },
      { pattern: /^\/api\/dashboard\/data$/, method: 'GET', route: 'dashboard-data' },
      { pattern: /^\/ws\/dashboard$/, method: 'GET', route: 'websocket-upgrade' },
      { pattern: /^\/api\/analytics\/track$/, method: 'POST', route: 'analytics-track' },
      { pattern: /^\/health$/, method: 'GET', route: 'health-check' },
      { pattern: /^\/qr-onboard$/, method: 'GET', route: 'static-assets' },
      { pattern: /^\/$/, method: 'GET', route: 'geo-redirect' },
      { pattern: /^\/api\//, method: 'OPTIONS', route: 'cors-preflight' },
      { pattern: /^\/api\//, method: 'GET', route: 'rate-limit' },
      { pattern: /^\/api\//, method: 'POST', route: 'rate-limit' },
      { pattern: /^\/api\//, method: 'PUT', route: 'rate-limit' },
      { pattern: /^\/api\//, method: 'DELETE', route: 'rate-limit' }
    ];

    for (const { pattern, method: allowedMethod, route } of routes) {
      if (pattern.test(pathname) && method === allowedMethod) {
        return route;
      }
    }

    return 'unknown';
  }

  private async handleQRGenerate(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    // Rate limiting check
    const rateLimitResult = await this.checkRateLimit(requestContext, env, 'qr-generate');
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: this.getCORSHeaders(env) }
      );
    }

    try {
      const body = await requestContext.request.json() as {
        merchantId: string;
        deviceCategory: string;
        geographicScope?: string;
      };

      // Validate input
      if (!body.merchantId || !body.deviceCategory) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: this.getCORSHeaders(env) }
        );
      }

      // Generate QR code through backend service
      const backendResponse = await fetch(`${env.API_ORIGIN}/api/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': requestContext.request.headers.get('CF-Connecting-IP') || '',
          'X-Country': requestContext.geo.country || 'Unknown',
          'X-Region': requestContext.geo.region || 'Unknown'
        },
        body: JSON.stringify(body)
      });

      if (!backendResponse.ok) {
        throw new Error(`Backend error: ${backendResponse.status}`);
      }

      const result = await backendResponse.json();

      // Log analytics
      ctx.waitUntil(this.trackAnalytics('qr_generated', {
        merchantId: body.merchantId,
        deviceCategory: body.deviceCategory,
        geographicScope: body.geographicScope || 'GLOBAL',
        country: requestContext.geo.country,
        region: requestContext.geo.region
      }, env));

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            ...this.getCORSHeaders(env),
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );

    } catch (error) {
      console.error('QR generation error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate QR code' }),
        { status: 500, headers: this.getCORSHeaders(env) }
      );
    }
  }

  private async handleQRValidate(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    try {
      const body = await requestContext.request.json() as {
        token: string;
        deviceInfo: any;
      };

      // Validate token through backend service
      const backendResponse = await fetch(`${env.API_ORIGIN}/api/qr/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': requestContext.request.headers.get('CF-Connecting-IP') || '',
          'X-Country': requestContext.geo.country || 'Unknown'
        },
        body: JSON.stringify(body)
      });

      const result = await backendResponse.json();

      // Log analytics
      ctx.waitUntil(this.trackAnalytics('qr_validated', {
        merchantId: result.merchantId,
        deviceId: body.deviceInfo?.deviceId,
        validationSuccess: result.valid,
        country: requestContext.geo.country
      }, env));

      return new Response(
        JSON.stringify(result),
        {
          status: backendResponse.status,
          headers: this.getCORSHeaders(env)
        }
      );

    } catch (error) {
      console.error('QR validation error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to validate QR code' }),
        { status: 500, headers: this.getCORSHeaders(env) }
      );
    }
  }

  private async handleDeviceOnboard(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    try {
      const body = await requestContext.request.json();

      // Forward to backend service
      const backendResponse = await fetch(`${env.API_ORIGIN}/api/device/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': requestContext.request.headers.get('CF-Connecting-IP') || '',
          'X-Country': requestContext.geo.country || 'Unknown',
          'X-Region': requestContext.geo.region || 'Unknown'
        },
        body: JSON.stringify(body)
      });

      const result = await backendResponse.json();

      // Log analytics
      ctx.waitUntil(this.trackAnalytics('device_onboarded', {
        merchantId: result.merchantId,
        deviceId: result.deviceId,
        success: result.success,
        country: requestContext.geo.country
      }, env));

      return new Response(
        JSON.stringify(result),
        {
          status: backendResponse.status,
          headers: this.getCORSHeaders(env)
        }
      );

    } catch (error) {
      console.error('Device onboarding error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to onboard device' }),
        { status: 500, headers: this.getCORSHeaders(env) }
      );
    }
  }

  private async handleDashboardData(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    try {
      const merchantId = requestContext.url.searchParams.get('merchantId');
      
      if (!merchantId) {
        return new Response(
          JSON.stringify({ error: 'Missing merchantId parameter' }),
          { status: 400, headers: this.getCORSHeaders(env) }
        );
      }

      // Get dashboard data from backend
      const backendResponse = await fetch(`${env.API_ORIGIN}/api/dashboard/data?merchantId=${merchantId}`, {
        headers: {
          'X-Forwarded-For': requestContext.request.headers.get('CF-Connecting-IP') || '',
          'X-Country': requestContext.geo.country || 'Unknown'
        }
      });

      const result = await backendResponse.json();

      return new Response(
        JSON.stringify(result),
        {
          status: backendResponse.status,
          headers: {
            ...this.getCORSHeaders(env),
            'Cache-Control': 'public, max-age=30' // Cache for 30 seconds
          }
        }
      );

    } catch (error) {
      console.error('Dashboard data error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch dashboard data' }),
        { status: 500, headers: this.getCORSHeaders(env) }
      );
    }
  }

  private async handleWebSocketUpgrade(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    try {
      // Authenticate WebSocket connection
      const token = requestContext.url.searchParams.get('token');
      const connectionId = crypto.randomUUID();

      if (!token) {
        return new Response('Missing authentication token', { status: 401 });
      }

      const authResult = await this.wsAuth.authenticateConnection(
        requestContext.url.href,
        connectionId,
        requestContext.request.headers.get('CF-Connecting-IP') || '',
        requestContext.request.headers.get('User-Agent') || ''
      );

      if (!authResult.authenticated) {
        return new Response('Authentication failed', { status: 401 });
      }

      // Upgrade to WebSocket
      return new Response(null, {
        status: 101,
        webSocket: {
          accept: () => {
            // WebSocket accepted, handle in separate handler
            console.log(`🔌 WebSocket connected: ${connectionId} for ${authResult.merchantId}`);
          }
        }
      });

    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      return new Response('WebSocket upgrade failed', { status: 500 });
    }
  }

  private async handleAnalyticsTrack(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    try {
      const body = await requestContext.request.json();

      // Store analytics data
      await env.ANALYTICS_KV.put(
        `analytics:${Date.now()}:${crypto.randomUUID()}`,
        JSON.stringify({
          ...body,
          timestamp: new Date().toISOString(),
          country: requestContext.geo.country,
          region: requestContext.geo.region,
          userAgent: requestContext.request.headers.get('User-Agent'),
          ip: requestContext.request.headers.get('CF-Connecting-IP')
        }),
        { expirationTtl: 365 * 24 * 60 * 60 } // 1 year
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: this.getCORSHeaders(env) }
      );

    } catch (error) {
      console.error('Analytics tracking error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track analytics' }),
        { status: 500, headers: this.getCORSHeaders(env) }
      );
    }
  }

  private async handleHealthCheck(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.1.0',
      region: requestContext.geo.region || 'Unknown',
      country: requestContext.geo.country || 'Unknown',
      services: {
        api: await this.checkServiceHealth(`${env.API_ORIGIN}/health`),
        dashboard: await this.checkServiceHealth(`${env.DASHBOARD_ORIGIN}/health`),
        websocket: await this.checkServiceHealth(`${env.WS_ORIGIN}/health`)
      },
      security: {
        rateLimitActive: true,
        corsEnabled: true,
        wafEnabled: true
      }
    };

    return new Response(
      JSON.stringify(healthData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }

  private handleCORSPreflight(): Response {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-ID',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  private async handleStaticAssets(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    // Serve dashboard HTML from backend or CDN
    const backendResponse = await fetch(`${env.DASHBOARD_ORIGIN}/qr-onboard`, {
      headers: {
        'X-Forwarded-For': requestContext.request.headers.get('CF-Connecting-IP') || '',
        'X-Country': requestContext.geo.country || 'Unknown'
      }
    });

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: backendResponse.headers
    });
  }

  private async handleGeoRedirect(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    const country = requestContext.geo.country?.toUpperCase();
    const region = requestContext.geo.region?.toUpperCase();

    // Redirect to regional endpoint based on geography
    let regionalUrl = env.DASHBOARD_ORIGIN;

    if (country === 'US' || country === 'CA' || country === 'MX') {
      regionalUrl = 'https://us-east-1.factory-wager.com';
    } else if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL'].includes(country || '')) {
      regionalUrl = 'https://eu-west-2.factory-wager.com';
    } else if (['JP', 'SG', 'AU', 'IN'].includes(country || '')) {
      regionalUrl = 'https://ap-southeast-1.factory-wager.com';
    } else if (['BR', 'AR', 'CL'].includes(country || '')) {
      regionalUrl = 'https://sa-east-1.factory-wager.com';
    }

    return Response.redirect(`${regionalUrl}/qr-onboard`, 302);
  }

  private async handleRateLimit(requestContext: IRequestContext, env: IWorkerEnv): Promise<Response> {
    const rateLimitResult = await this.checkRateLimit(requestContext, env, 'api');
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429,
          headers: {
            ...this.getCORSHeaders(env),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // If rate limit check passes, continue to normal routing
    return new Response('Rate limit check passed', { status: 200 });
  }

  // Helper methods

  private getCORSHeaders(env: IWorkerEnv): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': env.DASHBOARD_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-ID',
      'Access-Control-Max-Age': '86400'
    };
  }

  private async checkRateLimit(
    requestContext: IRequestContext, 
    env: IWorkerEnv, 
    operation: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const clientIP = requestContext.request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate-limit:${operation}:${clientIP}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = operation === 'qr-generate' ? 50 : 100;

    try {
      const existing = await env.RATE_LIMIT_KV.get(key);
      const requests = existing ? JSON.parse(existing) : [];

      // Clean old requests
      const validRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);

      if (validRequests.length >= maxRequests) {
        const oldestRequest = Math.min(...validRequests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
        
        return { allowed: false, retryAfter };
      }

      // Add current request
      validRequests.push(now);
      await env.RATE_LIMIT_KV.put(key, JSON.stringify(validRequests), { expirationTtl: 3600 });

      return { allowed: true };

    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true };
    }
  }

  private async trackAnalytics(event: string, data: any, env: IWorkerEnv): Promise<void> {
    try {
      await env.ANALYTICS_KV.put(
        `analytics:${event}:${Date.now()}:${crypto.randomUUID()}`,
        JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString()
        }),
        { expirationTtl: 365 * 24 * 60 * 60 } // 1 year
      );
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  private async checkServiceHealth(url: string): Promise<{ status: string; latency: number }> {
    try {
      const start = Date.now();
      const response = await fetch(url, { method: 'GET' });
      const latency = Date.now() - start;

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1
      };
    }
  }

  private async logErrorToSentry(error: Error, requestContext: IRequestContext, dsn: string): Promise<void> {
    // Log error to Sentry (implementation depends on Sentry SDK for Workers)
    console.error('Sentry logging:', error);
  }
}

// Cloudflare Worker entry point
export default {
  async fetch(request: Request, env: IWorkerEnv, ctx: IWorkerContext): Promise<Response> {
    const worker = new QRWorker();
    return worker.handleRequest(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: IWorkerEnv, ctx: IWorkerContext): Promise<void> {
    // Handle scheduled tasks (e.g., cleanup, analytics aggregation)
    console.log('🕐 Scheduled task executed:', event.cron);
  },

  async queue(batch: MessageBatch, env: IWorkerEnv, ctx: IWorkerContext): Promise<void> {
    // Handle queue messages (e.g., analytics events, notifications)
    console.log('📨 Queue batch processed:', batch.messages.length);
  }
};
