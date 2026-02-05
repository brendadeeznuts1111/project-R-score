/**
 * Enhanced QR Payment Server with Security & Rate Limiting
 * 
 * Addresses HIGH priority security issues: rate limiting, security headers,
 * proper domain configuration, and webhook signature validation.
 */

import { Elysia } from 'elysia';
import { createHmac, randomUUID } from 'crypto';
import { EnhancedQRPaymentSystem } from './enhanced-qr-payment-system.js';

interface ServerConfig {
  port: number;
  domain: string;
  environment: 'development' | 'staging' | 'production';
  webhookSecret: string;
  corsOrigins: string[];
  rateLimits: {
    windowMs: number;
    max: number;
  };
}

class EnhancedQRPaymentServer {
  private app: Elysia;
  private config: ServerConfig;
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 3000,
      // 🔴 FIXED: Replace placeholder domain with production domain
      domain: config.environment === 'production' ? 'factory-wager.ai' : 'localhost:3000',
      environment: 'development',
      webhookSecret: process.env.FACTORY_WAGER_WEBHOOK_SECRET || 'default-secret-change-in-production',
      corsOrigins: config.environment === 'production' 
        ? ['https://factory-wager.ai', 'https://app.factory-wager.ai']
        : ['http://localhost:3000', 'http://localhost:5173'],
      rateLimits: {
        windowMs: 60 * 1000, // 1 minute
        max: 100 // 100 requests per minute
      },
      ...config
    };

    this.app = new Elysia()
      .use(this.setupSecurity())
      .use(this.setupRateLimiting())
      .use(this.setupCORS())
      .use(this.setupRoutes())
      .use(this.setupWebhooks())
      .use(this.setupMonitoring())
      .use(this.setupErrorHandling());
  }

  /**
   * 🔒 Enhanced security middleware
   */
  private setupSecurity() {
    return new Elysia({ name: 'security' })
      .onRequest(({ request, set }) => {
        // 🔴 FIXED: Add comprehensive security headers
        set.headers = {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'same-origin'
        };

        // Add HSTS in production
        if (this.config.environment === 'production') {
          set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
        }

        // Add CSP header
        const cspDirectives = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ];

        set.headers['Content-Security-Policy'] = cspDirectives.join('; ');
      })
      
      .derive(({ set }) => ({
        /**
         * 🔒 Verify webhook signature
         */
        verifyWebhookSignature: (signature: string, payload: string): boolean => {
          return this.verifyWebhookSignature(signature, payload);
        },
        
        /**
         * 🚫 Block suspicious requests
         */
        blockSuspiciousRequest: (request: Request): boolean => {
          const userAgent = request.headers.get('user-agent') || '';
          const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /scanner/i,
            /sqlmap/i,
            /nmap/i
          ];
          
          return suspiciousPatterns.some(pattern => pattern.test(userAgent));
        }
      }));
  }

  /**
   * 🚦 Rate limiting middleware
   */
  private setupRateLimiting() {
    return new Elysia({ name: 'rateLimit' })
      .onRequest(({ request, set }) => {
        const clientId = this.getClientId(request);
        
        if (!this.checkRateLimit(clientId)) {
          set.status = 429;
          set.headers['Retry-After'] = Math.ceil(this.config.rateLimits.windowMs / 1000).toString();
          
          return {
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${Math.ceil(this.config.rateLimits.windowMs / 1000)} seconds.`,
            retryAfter: Math.ceil(this.config.rateLimits.windowMs / 1000)
          };
        }
      });
  }

  /**
   * 🌐 CORS configuration
   */
  private setupCORS() {
    return new Elysia({ name: 'cors' })
      .onRequest(({ set }) => {
        const origin = set.headers['origin'] as string;
        
        if (this.config.corsOrigins.includes('*') || this.config.corsOrigins.includes(origin)) {
          set.headers['Access-Control-Allow-Origin'] = origin || '*';
          set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-Webhook-Signature, X-Webhook-Timestamp';
          set.headers['Access-Control-Allow-Credentials'] = 'true';
          set.headers['Access-Control-Max-Age'] = '86400'; // 24 hours
        }
      });
  }

  /**
   * 🛣️ API routes
   */
  private setupRoutes() {
    return new Elysia({ name: 'routes' })
      .get('/', () => ({
        service: 'Enhanced QR Payment Server',
        version: '2.0.0',
        status: 'operational',
        domain: this.config.domain,
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      }))
      
      .get('/health', () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        rateLimits: {
          activeClients: this.rateLimitStore.size,
          maxRequests: this.config.rateLimits.max,
          windowMs: this.config.rateLimits.windowMs
        }
      }))
      
      .post('/qr/generate', async ({ body, set }) => {
        try {
          const { recipientId, amount, description, options } = body as any;
          
          if (!recipientId || !amount || !description) {
            set.status = 400;
            return { error: 'Missing required fields: recipientId, amount, description' };
          }
          
          if (amount <= 0) {
            set.status = 400;
            return { error: 'Amount must be greater than 0' };
          }
          
          const qr = await EnhancedQRPaymentSystem.generatePaymentQR(
            recipientId,
            amount,
            description,
            options
          );
          
          set.status = 200;
          return {
            success: true,
            qr,
            generatedAt: new Date().toISOString()
          };
        } catch (error) {
          set.status = 500;
          return { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
        }
      })
      
      .post('/qr/validate/:intentId', async ({ params, body, set }) => {
        try {
          const result = await EnhancedQRPaymentSystem.resolvePaymentIntent(params.intentId);
          
          set.status = 200;
          return {
            success: true,
            ...result,
            validatedAt: new Date().toISOString()
          };
        } catch (error) {
          set.status = 404;
          return { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
        }
      })
      
      .post('/payment/complete', async ({ body, set }) => {
        try {
          const { intentId, methodType, transactionId, idempotencyKey, metadata } = body as any;
          
          if (!intentId || !methodType || !transactionId) {
            set.status = 400;
            return { error: 'Missing required fields: intentId, methodType, transactionId' };
          }
          
          const result = await EnhancedQRPaymentSystem.completePaymentIntent(
            intentId,
            methodType,
            transactionId,
            idempotencyKey,
            metadata
          );
          
          set.status = 200;
          return {
            success: true,
            intent: result,
            completedAt: new Date().toISOString()
          };
        } catch (error) {
          set.status = 400;
          return { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
        }
      })
      
      .get('/payment/methods/:recipientId', async ({ params, set }) => {
        try {
          // This would get available payment methods for a recipient
          const methods = [
            {
              type: 'cashapp',
              identifier: '$factory-wagerfamily',
              displayName: 'Cash App',
              available: true,
              fees: 0,
              processingTime: 'instant'
            },
            {
              type: 'venmo',
              identifier: 'factory-wager-family',
              displayName: 'Venmo',
              available: true,
              fees: 0,
              processingTime: 'instant'
            },
            {
              type: 'crypto',
              identifier: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
              displayName: 'Bitcoin',
              available: true,
              fees: 'network',
              processingTime: '10-60 minutes'
            },
            {
              type: 'bitcoin_lightning',
              identifier: 'lightning',
              displayName: 'Bitcoin Lightning',
              available: process.env.LND_REST_URL ? true : false,
              fees: '< 1 sat',
              processingTime: 'instant'
            }
          ];
          
          set.status = 200;
          return {
            success: true,
            recipientId: params.recipientId,
            methods,
            retrievedAt: new Date().toISOString()
          };
        } catch (error) {
          set.status = 500;
          return { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
        }
      });
  }

  /**
   * 🪝 Enhanced webhook handlers
   */
  private setupWebhooks() {
    return new Elysia({ name: 'webhooks' })
      .post('/webhook/payment', async ({ body, headers, set }) => {
        try {
          const signature = headers['x-webhook-signature'] as string;
          const timestamp = headers['x-webhook-timestamp'] as string;
          const payload = JSON.stringify(body);
          
          // 🔒 FIXED: Verify webhook signature
          if (!this.verifyWebhookSignature(signature, payload)) {
            set.status = 401;
            return { 
              success: false, 
              error: 'Invalid webhook signature',
              timestamp: new Date().toISOString()
            };
          }
          
          // Check timestamp to prevent replay attacks (5 minute window)
          const webhookTime = parseInt(timestamp);
          const now = Math.floor(Date.now() / 1000);
          if (Math.abs(now - webhookTime) > 300) {
            set.status = 401;
            return { 
              success: false, 
              error: 'Webhook timestamp expired',
              timestamp: new Date().toISOString()
            };
          }
          
          const result = await EnhancedQRPaymentSystem.handleWebhook(signature, timestamp, payload);
          
          set.status = result.processed ? 200 : 400;
          return {
            ...result,
            processedAt: new Date().toISOString()
          };
        } catch (error) {
          set.status = 500;
          return { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
        }
      })
      
      .post('/webhook/cashapp', async ({ body, headers, set }) => {
        try {
          const signature = headers['x-cashapp-signature'] as string;
          const payload = JSON.stringify(body);
          
          // 🔒 FIXED: Verify Cash App webhook signature
          if (!this.verifyWebhookSignature(signature, payload)) {
            set.status = 401;
            return { success: false, error: 'Invalid Cash App signature' };
          }
          
          // Process Cash App specific webhook
          const result = await this.processCashAppWebhook(body);
          
          set.status = 200;
          return { 
            success: true, 
            processed: true,
            provider: 'cashapp',
            processedAt: new Date().toISOString()
          };
        } catch (error) {
          set.status = 500;
          return { 
            success: false, 
            error: (error as Error).message,
            provider: 'cashapp',
            timestamp: new Date().toISOString()
          };
        }
      });
  }

  /**
   * 📊 Monitoring and metrics
   */
  private setupMonitoring() {
    return new Elysia({ name: 'monitoring' })
      .get('/metrics', () => {
        const metrics = {
          server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version
          },
          rateLimits: {
            activeClients: this.rateLimitStore.size,
            maxRequests: this.config.rateLimits.max,
            windowMs: this.config.rateLimits.windowMs
          },
          endpoints: {
            qrGenerated: this.getMetric('qr_generated'),
            paymentsCompleted: this.getMetric('payments_completed'),
            webhooksProcessed: this.getMetric('webhooks_processed'),
            errors: this.getMetric('errors')
          },
          timestamp: new Date().toISOString()
        };
        
        return metrics;
      })
      
      .get('/status', () => ({
        status: 'operational',
        version: '2.0.0',
        environment: this.config.environment,
        domain: this.config.domain,
        features: {
          rateLimiting: true,
          webhooks: true,
          security: true,
          monitoring: true,
          lightningNetwork: !!process.env.LND_REST_URL
        },
        timestamp: new Date().toISOString()
      }));
  }

  /**
   * 🚨 Enhanced error handling
   */
  private setupErrorHandling() {
    return new Elysia({ name: 'errorHandling' })
      .onError(({ error, code, set }) => {
        console.error('Server error:', {
          error: error.message,
          stack: error.stack,
          code,
          timestamp: new Date().toISOString()
        });
        
        // Log error for monitoring
        this.incrementMetric('errors');
        
        // Return appropriate error response
        if (code === 'VALIDATION') {
          set.status = 400;
          return {
            error: 'Validation error',
            message: error.message,
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString()
          };
        }
        
        if (code === 'NOT_FOUND') {
          set.status = 404;
          return {
            error: 'Resource not found',
            message: error.message,
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          };
        }
        
        // Default error response
        set.status = 500;
        return {
          error: 'Internal server error',
          message: this.config.environment === 'production' 
            ? 'Something went wrong' 
            : error.message,
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        };
      });
  }

  /**
   * 🔒 Verify webhook signature
   */
  private verifyWebhookSignature(signature: string, payload: string): boolean {
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return this.constantTimeCompare(signature, expectedSignature);
  }

  /**
   * 🔒 Constant-time comparison
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * 🚦 Rate limiting implementation
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const key = clientId;
    
    let current = this.rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      // Reset or create new limit
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimits.windowMs
      });
      return true;
    }
    
    if (current.count >= this.config.rateLimits.max) {
      return false; // Rate limit exceeded
    }
    
    current.count++;
    return true;
  }

  /**
   * 🆔 Get client identifier for rate limiting
   */
  private getClientId(request: Request): string {
    // Try to get real IP, fallback to user agent
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const ip = forwarded?.split(',')[0] || realIp || '127.0.0.1';
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  /**
   * 📊 Simple metrics storage
   */
  private metrics = new Map<string, number>();

  private incrementMetric(name: string): void {
    this.metrics.set(name, (this.metrics.get(name) || 0) + 1);
  }

  private getMetric(name: string): number {
    return this.metrics.get(name) || 0;
  }

  /**
   * 💳 Process Cash App webhook
   */
  private async processCashAppWebhook(data: any): Promise<any> {
    this.incrementMetric('webhooks_processed');
    
    // Process Cash App specific events
    switch (data.type) {
      case 'payment.completed':
        this.incrementMetric('payments_completed');
        break;
      case 'payment.failed':
        console.error('Cash App payment failed:', data);
        break;
      default:
        console.log('Unknown Cash App webhook event:', data.type);
    }
    
    return { processed: true };
  }

  /**
   * 🚀 Start the enhanced server
   */
  async start(): Promise<void> {
    // Validate environment
    const validation = EnhancedQRPaymentSystem.validateEnvironment();
    if (!validation.valid) {
      console.error('❌ Environment validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    console.log(`🚀 Enhanced QR Payment Server starting...`);
    console.log(`📡 Domain: ${this.config.domain}`);
    console.log(`🌍 Environment: ${this.config.environment}`);
    console.log(`🔒 Security: Enabled`);
    console.log(`🚦 Rate Limiting: ${this.config.rateLimits.max} requests per ${this.config.rateLimits.windowMs / 1000}s`);
    console.log(`🪝 Webhooks: Enabled`);
    console.log(`📊 Monitoring: Enabled`);
    
    await this.app.listen(this.config.port);
    
    console.log(`✅ Server started successfully on port ${this.config.port}`);
    console.log(`🌐 Server URL: https://${this.config.domain}`);
  }
}

export default EnhancedQRPaymentServer;
export type { ServerConfig };
