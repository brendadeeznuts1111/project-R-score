//! Enhanced Security Middleware with Rate Limiting & API Key Management
//! Integrates with 13-byte config for feature-based security controls

import { serve } from "bun";
import { getConfig, getFeatureFlags } from "../config/manager.js";

// Security metrics tracking
interface SecurityMetrics {
  requests: Map<string, number>;
  blockedRequests: number;
  rateLimitHits: number;
  authFailures: number;
  apiKeyUsage: Map<string, number>;
  lastReset: number;
}

// API Key structure
interface APIKey {
  id: string;
  key: string;
  hash: string;
  permissions: string[];
  rateLimit: number;
  created: number;
  expires?: number;
  lastUsed?: number;
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

class SecurityMiddleware {
  private metrics: SecurityMetrics;
  private apiKeys: Map<string, APIKey>;
  private rateLimitStore: Map<string, { count: number; resetTime: number }>;
  private blockedIPs: Set<string>;
  private config: any;

  constructor() {
    this.metrics = {
      requests: new Map(),
      blockedRequests: 0,
      rateLimitHits: 0,
      authFailures: 0,
      apiKeyUsage: new Map(),
      lastReset: Date.now()
    };
    this.apiKeys = new Map();
    this.rateLimitStore = new Map();
    this.blockedIPs = new Set();
    this.initializeAPIKeys();
  }

  // Initialize default API keys based on config
  private async initializeAPIKeys() {
    this.config = await getConfig();
    const features = getFeatureFlags(this.config.featureFlags);

    // Default API keys for different access levels
    const defaultKeys = [
      {
        id: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        rateLimit: features.PREMIUM_TYPES ? 10000 : 1000
      },
      {
        id: 'package-manager',
        permissions: ['read', 'write'],
        rateLimit: features.PREMIUM_TYPES ? 5000 : 500
      },
      {
        id: 'dashboard',
        permissions: ['read'],
        rateLimit: features.PREMIUM_TYPES ? 2000 : 200
      }
    ];

    for (const keyData of defaultKeys) {
      const { key, hash } = this.generateAPIKey(keyData.id);
      this.apiKeys.set(hash, {
        ...keyData,
        key,
        hash,
        created: Date.now()
      });
    }
  }

  // Generate cryptographically secure API key
  private generateAPIKey(id: string): { key: string; hash: string } {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const key = `br_${id}_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    const hashBuffer = Bun.CryptoHasher.hash('sha256', key);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { key, hash };
  }

  // Extract client IP from request
  private getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const real = req.headers.get('x-real-ip');
    const remote = req.headers.get('remote-addr');
    
    return forwarded?.split(',')[0]?.trim() || 
           real?.trim() || 
           remote?.trim() || 
           'unknown';
  }

  // Check rate limits
  private checkRateLimit(ip: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const key = ip;

    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return true;
    }

    const limit = this.rateLimitStore.get(key)!;
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + config.windowMs;
      return true;
    }

    if (limit.count >= config.maxRequests) {
      this.metrics.rateLimitHits++;
      return false;
    }

    limit.count++;
    return true;
  }

  // Validate API key
  private validateAPIKey(req: Request): APIKey | null {
    const authHeader = req.headers.get('authorization');
    const apiKey = req.headers.get('x-api-key');
    
    let key: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      key = authHeader.slice(7);
    } else if (apiKey) {
      key = apiKey;
    }

    if (!key) return null;

    const hashBuffer = Bun.CryptoHasher.hash('sha256', key);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const apiKeyData = this.apiKeys.get(hash);

    if (!apiKeyData) {
      this.metrics.authFailures++;
      return null;
    }

    // Check expiration
    if (apiKeyData.expires && Date.now() > apiKeyData.expires) {
      this.metrics.authFailures++;
      return null;
    }

    // Update last used
    apiKeyData.lastUsed = Date.now();
    this.metrics.apiKeyUsage.set(apiKeyData.id, (this.metrics.apiKeyUsage.get(apiKeyData.id) || 0) + 1);

    return apiKeyData;
  }

  // Check permissions
  private hasPermission(apiKey: APIKey, requiredPermission: string): boolean {
    return apiKey.permissions.includes(requiredPermission) || 
           apiKey.permissions.includes('admin');
  }

  // Security middleware function
  public middleware(options: {
    rateLimit?: Partial<RateLimitConfig>;
    requireAuth?: boolean;
    requiredPermission?: string;
    enableCORS?: boolean;
  } = {}) {
    const rateLimitConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options.rateLimit
    };

    return async (req: Request, server: any): Promise<Response | null> => {
      const ip = this.getClientIP(req);
      const path = new URL(req.url).pathname;

      // Track requests
      this.metrics.requests.set(path, (this.metrics.requests.get(path) || 0) + 1);

      // Check if IP is blocked
      if (this.blockedIPs.has(ip)) {
        this.metrics.blockedRequests++;
        return new Response('IP Blocked', { status: 403 });
      }

      // Rate limiting
      if (!this.checkRateLimit(ip, rateLimitConfig)) {
        this.metrics.rateLimitHits++;
        return new Response('Rate Limit Exceeded', { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + rateLimitConfig.windowMs).toISOString()
          }
        });
      }

      // CORS handling
      if (options.enableCORS) {
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
              'Access-Control-Max-Age': '86400'
            }
          });
        }
      }

      // Authentication
      if (options.requireAuth) {
        const apiKey = this.validateAPIKey(req);
        
        if (!apiKey) {
          this.metrics.authFailures++;
          return new Response('Unauthorized', { 
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="Registry API"',
              'X-Auth-Error': 'Invalid or missing API key'
            }
          });
        }

        // Permission check
        if (options.requiredPermission && !this.hasPermission(apiKey, options.requiredPermission)) {
          this.metrics.authFailures++;
          return new Response('Forbidden', { 
            status: 403,
            headers: { 'X-Auth-Error': 'Insufficient permissions' }
          });
        }

        // Add security headers
        const headers = new Headers();
        headers.set('X-API-Key-ID', apiKey.id);
        headers.set('X-RateLimit-Limit', apiKey.rateLimit.toString());
        
        // Check API key specific rate limit
        const apiKeyLimit = this.checkRateLimit(`api:${apiKey.id}`, {
          windowMs: rateLimitConfig.windowMs,
          maxRequests: apiKey.rateLimit,
          skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
          skipFailedRequests: rateLimitConfig.skipFailedRequests
        });

        if (!apiKeyLimit) {
          return new Response('API Key Rate Limit Exceeded', { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
              'X-RateLimit-Limit': apiKey.rateLimit.toString(),
              'X-RateLimit-Remaining': '0'
            }
          });
        }

        // Store API key in request context for downstream handlers
        (req as any).apiKey = apiKey;
        (req as any).securityHeaders = headers;
      }

      // Add security headers to all responses
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, rateLimitConfig.maxRequests - (this.rateLimitStore.get(ip)?.count || 0)).toString(),
        'X-RateLimit-Reset': new Date(this.rateLimitStore.get(ip)?.resetTime || Date.now() + rateLimitConfig.windowMs).toISOString()
      };

      if (options.enableCORS) {
        Object.assign(securityHeaders, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
        });
      }

      // Continue to next handler
      return null;
    };
  }

  // Get security metrics
  public getMetrics() {
    const now = Date.now();
    const uptime = now - this.metrics.lastReset;

    return {
      requests: Object.fromEntries(this.metrics.requests),
      blockedRequests: this.metrics.blockedRequests,
      rateLimitHits: this.metrics.rateLimitHits,
      authFailures: this.metrics.authFailures,
      apiKeyUsage: Object.fromEntries(this.metrics.apiKeyUsage),
      uptime,
      activeAPIKeys: this.apiKeys.size,
      blockedIPs: this.blockedIPs.size,
      rateLimitStoreSize: this.rateLimitStore.size
    };
  }

  // Generate new API key
  public generateKey(id: string, permissions: string[], rateLimit: number = 1000, expires?: number): string {
    const { key, hash } = this.generateAPIKey(id);
    const apiKey: APIKey = {
      id,
      key,
      hash,
      permissions,
      rateLimit,
      created: Date.now()
    };
    
    if (expires !== undefined) {
      apiKey.expires = expires;
    }
    
    this.apiKeys.set(hash, apiKey);
    return key;
  }

  // Revoke API key
  public revokeKey(keyHash: string): boolean {
    return this.apiKeys.delete(keyHash);
  }

  // Block IP address
  public blockIP(ip: string, duration: number = 3600000): void {
    this.blockedIPs.add(ip);
    setTimeout(() => this.blockedIPs.delete(ip), duration);
  }

  // Reset metrics
  public resetMetrics(): void {
    this.metrics.requests.clear();
    this.metrics.blockedRequests = 0;
    this.metrics.rateLimitHits = 0;
    this.metrics.authFailures = 0;
    this.metrics.apiKeyUsage.clear();
    this.metrics.lastReset = Date.now();
  }
}

// Export singleton instance
export const security = new SecurityMiddleware();
export type { SecurityMetrics, APIKey, RateLimitConfig };
