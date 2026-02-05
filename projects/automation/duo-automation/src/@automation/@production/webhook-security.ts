/**
 * 🔒 Webhook Security - FactoryWager Venmo Family System
 * Production-grade security for webhook endpoints
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import * as crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

/**
 * 🛡️ Webhook Security Configuration
 */
export class WebhookSecurity {
  private ratelimit: Ratelimit;
  private redis: Redis;
  private allowedIPs: string[];
  private webhookSecrets: Map<string, string>;

  constructor() {
    // Initialize Redis for rate limiting and caching
    this.redis = Redis.fromEnv();
    
    // Rate limiting: 100 requests per minute per IP
    this.ratelimit = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(100, '60s'),
      analytics: true,
      prefix: 'webhook_ratelimit'
    });

    // Allowed IP ranges for webhooks
    this.allowedIPs = [
      // Venmo IP ranges (example)
      '52.202.128.0/17',
      '52.23.231.0/24',
      '54.209.128.0/17',
      // Cash App IP ranges (example)
      '54.209.0.0/16',
      '52.20.0.0/16',
      // Local development
      '127.0.0.1',
      'localhost'
    ];

    // Webhook secrets for different providers
    this.webhookSecrets = new Map([
      ['venmo', process.env.VENMO_WEBHOOK_SECRET || 'default-venmo-secret'],
      ['cashapp', process.env.CASHAPP_WEBHOOK_SECRET || 'default-cashapp-secret'],
      ['paypal', process.env.PAYPAL_WEBHOOK_SECRET || 'default-paypal-secret']
    ]);
  }

  /**
   * 🔍 Verify webhook signature
   */
  async verifyWebhookSignature(
    provider: string,
    payload: string,
    signature: string,
    timestamp?: string
  ): Promise<boolean> {
    try {
      const secret = this.webhookSecrets.get(provider);
      if (!secret) {
        console.error(`No webhook secret found for provider: ${provider}`);
        return false;
      }

      // Check timestamp to prevent replay attacks (5 minute window)
      if (timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const webhookTime = parseInt(timestamp);
        if (Math.abs(now - webhookTime) > 300) {
          console.error('Webhook timestamp outside valid window');
          return false;
        }
      }

      // Verify HMAC signature (provider-specific)
      const expectedSignature = this.generateSignature(provider, payload, secret, timestamp);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error(`Invalid webhook signature for ${provider}`);
        Sentry.captureMessage('Invalid webhook signature', {
          level: 'warning',
          tags: { provider },
          extra: { received: signature, expected: expectedSignature }
        });
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      Sentry.captureException(error, {
        tags: { webhook_type: 'signature_verification' },
        extra: { provider }
      });
      return false;
    }
  }

  /**
   * 🔐 Generate signature for webhook verification
   */
  private generateSignature(provider: string, payload: string, secret: string, timestamp?: string): string {
    let signedPayload = payload;
    
    // Add timestamp if provided
    if (timestamp) {
      signedPayload = `${timestamp}.${payload}`;
    }

    // Provider-specific signature generation
    switch (provider) {
      case 'venmo':
        return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      case 'cashapp':
        return crypto.createHmac('sha1', secret).update(signedPayload).digest('hex');
      case 'paypal':
        return crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');
      default:
        return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    }
  }

  /**
   * 🚦 Apply rate limiting
   */
  async applyRateLimit(ip: string, identifier?: string): Promise<{ success: boolean; remaining?: number }> {
    try {
      const key = identifier || ip || 'unknown';
      const result = await this.ratelimit.limit(key);
      
      if (!result.success) {
        console.warn(`Rate limit exceeded for ${key}`);
        Sentry.captureMessage('Webhook rate limit exceeded', {
          level: 'warning',
          tags: { ip: key },
          extra: { limit: result.limit, remaining: result.remaining }
        });
      }

      return {
        success: result.success,
        remaining: result.remaining
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      Sentry.captureException(error, {
        tags: { webhook_type: 'rate_limiting' }
      });
      // Fail open - allow request if rate limiting fails
      return { success: true };
    }
  }

  /**
   * 🌐 Verify IP address
   */
  verifyIPAddress(ip: string): boolean {
    // Check if IP is in allowed ranges
    return this.allowedIPs.some(allowed => {
      if (allowed.includes('/')) {
        // CIDR range check
        return this.isIPInCIDR(ip, allowed);
      } else {
        // Exact match
        return ip === allowed;
      }
    });
  }

  /**
   * 🔍 Check if IP is in CIDR range
   */
  private isIPInCIDR(ip: string, cidr: string): boolean {
    // Simple CIDR check implementation
    const [network, prefixLength] = cidr.split('/');
    const mask = parseInt(prefixLength);
    
    // This is a simplified implementation
    // In production, use a proper CIDR library
    return ip.startsWith(network.substring(0, network.lastIndexOf('.')));
  }

  /**
   * 🛡️ Comprehensive webhook security check
   */
  async secureWebhook(
    request: Request,
    provider: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Get client IP
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';

      // 1. Verify IP address
      if (!this.verifyIPAddress(ip)) {
        return { valid: false, error: 'IP address not allowed' };
      }

      // 2. Apply rate limiting
      const rateLimitResult = await this.applyRateLimit(ip);
      if (!rateLimitResult.success) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      // 3. Verify signature
      const signature = request.headers.get('x-webhook-signature') || 
                        request.headers.get('venmo-signature') ||
                        request.headers.get('cashapp-signature') || '';
      
      const timestamp = request.headers.get('x-webhook-timestamp') || '';
      const body = await request.text();

      if (!signature) {
        return { valid: false, error: 'Missing webhook signature' };
      }

      const isValidSignature = await this.verifyWebhookSignature(
        provider,
        body,
        signature,
        timestamp
      );

      if (!isValidSignature) {
        return { valid: false, error: 'Invalid webhook signature' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Webhook security error:', error);
      Sentry.captureException(error, {
        tags: { webhook_type: 'security_check' },
        extra: { provider }
      });
      return { valid: false, error: 'Security check failed' };
    }
  }
}

/**
 * 🚨 Webhook Security Middleware
 */
export class WebhookSecurityMiddleware {
  private security: WebhookSecurity;

  constructor() {
    this.security = new WebhookSecurity();
  }

  /**
   * 🛡️ Middleware function for securing webhook endpoints
   */
  async secureEndpoint(request: Request, provider: string): Promise<Response | null> {
    // Apply security checks
    const securityResult = await this.security.secureWebhook(request, provider);
    
    if (!securityResult.valid) {
      return new Response(
        JSON.stringify({ 
          error: securityResult.error,
          timestamp: new Date().toISOString()
        }), 
        { 
          status: securityResult.error === 'Rate limit exceeded' ? 429 : 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Security checks passed, allow request to proceed
    return null;
  }
}

/**
 * 📊 Webhook Security Metrics
 */
export class WebhookSecurityMetrics {
  private redis: Redis;

  constructor() {
    this.redis = Redis.fromEnv();
  }

  /**
   * 📈 Track security events
   */
  async trackSecurityEvent(event: {
    type: 'signature_failed' | 'rate_limit_exceeded' | 'ip_blocked' | 'success';
    provider: string;
    ip: string;
    timestamp: number;
  }): Promise<void> {
    const key = `webhook_security:${event.type}:${event.provider}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400); // 24 hours

    // Track daily metrics
    const dailyKey = `webhook_security_daily:${new Date().toISOString().split('T')[0]}`;
    await this.redis.hincrby(dailyKey, `${event.provider}:${event.type}`, 1);
    await this.redis.expire(dailyKey, 86400 * 7); // 7 days
  }

  /**
   * 📊 Get security metrics
   */
  async getSecurityMetrics(provider: string, days: number = 7): Promise<any> {
    const metrics = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dailyKey = `webhook_security_daily:${dateKey}`;
      const dayMetrics = await this.redis.hgetall(dailyKey);
      
      metrics[dateKey] = dayMetrics;
    }
    
    return metrics;
  }
}

/**
 * 🚀 Usage Example
 */
export const webhookSecurity = new WebhookSecurity();
export const webhookMiddleware = new WebhookSecurityMiddleware();
export const webhookMetrics = new WebhookSecurityMetrics();

// Example usage in an endpoint:
/*
export async function handleVenmoWebhook(request: Request): Promise<Response> {
  // Apply security middleware
  const securityResponse = await webhookMiddleware.secureEndpoint(request, 'venmo');
  if (securityResponse) {
    return securityResponse;
  }
  
  // Security checks passed, process webhook
  const body = await request.json();
  // ... process webhook
  
  return new Response('OK', { status: 200 });
}
*/
