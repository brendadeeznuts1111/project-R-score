/**
 * Lightning Network API Server
 * 
 * RESTful API server for Lightning Network payments with
 * real-time status updates and savings optimization.
 */

import { Elysia } from 'elysia';
import { LightningNetworkIntegration, PaymentMethod } from './lightning-network-integration.js';
import { LightningNetworkRouter } from './lightning-network-router.js';
import { createHmac, randomUUID } from 'crypto';

interface LightningPaymentRequest {
  amount: number;
  currency: string;
  memo?: string;
  metadata?: {
    questId?: string;
    userId?: string;
    familyId?: string;
    savingsOptIn?: boolean;
  };
}

interface LightningPaymentResponse {
  success: boolean;
  paymentId: string;
  invoice: {
    paymentRequest: string;
    qrCode: string;
    deepLink: string;
    expiryTime: string;
  };
  routing: {
    strategy: string;
    destination: string;
    estimatedYield: number;
    fees: number;
  };
  optimization?: {
    enabled: boolean;
    projectedYield: number;
    rebalanceSchedule: string;
  };
}

interface LightningStatusResponse {
  nodeConnected: boolean;
  balance: {
    confirmed: number;
    unconfirmed: number;
    total: number;
    channels: {
      local: number;
      remote: number;
      pending: number;
    };
  };
  metrics: {
    totalVolume: number;
    totalFees: number;
    averagePaymentSize: number;
    successRate: number;
    channelUtilization: number;
    savingsYield: number;
  };
}

class LightningNetworkAPIServer {
  private app: Elysia;
  private lightning: LightningNetworkIntegration;
  private router: LightningNetworkRouter;
  private payments = new Map<string, any>();

  constructor() {
    // Initialize Lightning Network integration
    const nodeConfig = {
      url: process.env.LND_REST_URL || 'https://localhost:8080',
      macaroon: process.env.LND_MACAROON || '',
      maxChannelBalance: 100000000, // 1 BTC
      minChannelBalance: 1000000, // 0.01 BTC
      autoRebalance: true
    };

    const savingsConfig = {
      enabled: process.env.SAVINGS_ENABLED === 'true',
      provider: (process.env.SAVINGS_PROVIDER as any) || 'cashapp_green',
      apy: parseFloat(process.env.SAVINGS_APY || '0.0325'), // 3.25% APY
      minConsolidationAmount: parseFloat(process.env.SAVINGS_MIN_CONSOLIDATION || '500000'),
      autoConvertToFiat: process.env.SAVINGS_AUTO_CONVERT === 'true',
      targetCurrency: (process.env.SAVINGS_TARGET_CURRENCY as any) || 'USD'
    };

    this.lightning = new LightningNetworkIntegration(nodeConfig, savingsConfig);
    this.router = new LightningNetworkRouter(this.lightning, savingsConfig);
    
    this.setupServer();
  }

  /**
   * 🚀 Setup Elysia server with routes
   */
  private setupServer(): void {
    this.app = new Elysia()
      .use(this.setupSecurity())
      .use(this.setupRoutes())
      .use(this.setupWebhooks())
      .use(this.setupMonitoring())
      .use(this.setupErrorHandling());
  }

  /**
   * 🔒 Security middleware
   */
  private setupSecurity() {
    return new Elysia({ name: 'security' })
      .onRequest(({ request, set }) => {
        // Add security headers
        set.headers = {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        };

        // Verify API key for protected routes
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey || apiKey !== process.env.LIGHTNING_API_KEY) {
          set.status = 401;
          return { error: 'Invalid API key' };
        }
      });
  }

  /**
   * 🛣️ API routes
   */
  private setupRoutes() {
    return new Elysia({ name: 'routes' })
      .get('/', () => ({
        service: 'Lightning Network API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString()
      }))
      
      .get('/health', async () => {
        const isConnected = this.lightning.isNodeConnected();
        const balance = isConnected ? await this.lightning.getNodeBalance() : null;
        
        return {
          status: isConnected ? 'healthy' : 'unhealthy',
          nodeConnected: isConnected,
          balance,
          timestamp: new Date().toISOString()
        };
      })
      
      .post('/payment/create', async ({ body, set }) => {
        try {
          const request = body as LightningPaymentRequest;
          
          // Validate request
          if (!request.amount || request.amount <= 0) {
            set.status = 400;
            return { success: false, error: 'Invalid amount' };
          }

          if (!request.currency) {
            set.status = 400;
            return { success: false, error: 'Currency is required' };
          }

          // Route payment with optimization
          const result = await this.router.routePayment(request.amount, request.metadata);
          
          // Store payment for tracking
          const paymentId = randomUUID();
          this.payments.set(paymentId, {
            ...result,
            status: 'pending',
            createdAt: new Date().toISOString()
          });

          const response: LightningPaymentResponse = {
            success: true,
            paymentId,
            invoice: {
              paymentRequest: result.lightningPayment.invoice.paymentRequest,
              qrCode: result.lightningPayment.qrCode,
              deepLink: result.lightningPayment.deepLink,
              expiryTime: result.lightningPayment.expiryTime.toISOString()
            },
            routing: {
              strategy: result.routing.strategy,
              destination: result.routing.destination,
              estimatedYield: result.routing.estimatedYield,
              fees: result.routing.fees
            },
            optimization: result.optimization
          };

          set.status = 200;
          return response;
        } catch (error) {
          set.status = 500;
          return { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
        }
      })
      
      .get('/payment/:paymentId/status', async ({ params, set }) => {
        try {
          const payment = this.payments.get(params.paymentId);
          
          if (!payment) {
            set.status = 404;
            return { success: false, error: 'Payment not found' };
          }

          // Check Lightning invoice status
          const invoiceStatus = await this.lightning.checkInvoiceStatus(
            payment.lightningPayment.invoice.rHash
          );

          // Update payment status
          if (invoiceStatus.settled && payment.status === 'pending') {
            payment.status = 'completed';
            payment.completedAt = new Date().toISOString();
            
            // Trigger auto-consolidation if enabled
            if (payment.optimization?.enabled) {
              await this.lightning.autoConsolidateToSavings();
            }
          }

          return {
            success: true,
            paymentId: params.paymentId,
            status: payment.status,
            invoice: {
              settled: invoiceStatus.settled,
              amount: invoiceStatus.amount,
              settleDate: invoiceStatus.settleDate
            },
            routing: payment.routing,
            optimization: payment.optimization,
            createdAt: payment.createdAt,
            completedAt: payment.completedAt
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
      
      .get('/status', async () => {
        try {
          const isConnected = this.lightning.isNodeConnected();
          const balance = isConnected ? await this.lightning.getNodeBalance() : null;
          const metrics = isConnected ? await this.router.getMetrics() : null;

          const response: LightningStatusResponse = {
            nodeConnected: isConnected,
            balance: balance || {
              confirmed: 0,
              unconfirmed: 0,
              total: 0,
              channels: { local: 0, remote: 0, pending: 0 }
            },
            metrics: metrics || {
              totalVolume: 0,
              totalFees: 0,
              averagePaymentSize: 0,
              successRate: 0,
              channelUtilization: 0,
              savingsYield: 0
            }
          };

          return response;
        } catch (error) {
          return {
            nodeConnected: false,
            balance: { confirmed: 0, unconfirmed: 0, total: 0, channels: { local: 0, remote: 0, pending: 0 } },
            metrics: { totalVolume: 0, totalFees: 0, averagePaymentSize: 0, successRate: 0, channelUtilization: 0, savingsYield: 0 },
            error: (error as Error).message
          };
        }
      })
      
      .post('/rebalance', async ({ set }) => {
        try {
          const result = await this.router.autoRebalance();
          
          set.status = 200;
          return {
            success: true,
            ...result,
            timestamp: new Date().toISOString()
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
      
      .get('/routing/recommendations/:amount', async ({ params, set }) => {
        try {
          const amount = parseFloat(params.amount);
          
          if (isNaN(amount) || amount <= 0) {
            set.status = 400;
            return { success: false, error: 'Invalid amount' };
          }

          const recommendations = await this.router.getRoutingRecommendations(amount);
          
          set.status = 200;
          return {
            success: true,
            amount,
            recommendations,
            timestamp: new Date().toISOString()
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
      
      .get('/savings/projection/:amount', async ({ params, set }) => {
        try {
          const amount = parseFloat(params.amount);
          
          if (isNaN(amount) || amount <= 0) {
            set.status = 400;
            return { success: false, error: 'Invalid amount' };
          }

          // Calculate projections for different savings options
          const cashAppProjection = this.lightning.calculateSavingsProjection(amount); // 3.25% APY
          const compoundProjection = this.lightning.calculateSavingsProjection(amount * 1.78); // 5.8% APY
          const yieldMaximizerProjection = this.lightning.calculateSavingsProjection(amount * 2.21); // 7.2% APY

          set.status = 200;
          return {
            success: true,
            amount,
            projections: {
              cashAppGreen: {
                apy: 0.0325,
                ...cashAppProjection,
                provider: 'Cash App Green',
                risk: 'low'
              },
              compoundFinance: {
                apy: 0.058,
                ...compoundProjection,
                provider: 'Compound Finance',
                risk: 'medium'
              },
              yieldMaximizer: {
                apy: 0.072,
                ...yieldMaximizerProjection,
                provider: 'Yearn Finance',
                risk: 'high'
              }
            },
            timestamp: new Date().toISOString()
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
   * 🪝 Webhook handlers
   */
  private setupWebhooks() {
    return new Elysia({ name: 'webhooks' })
      .post('/webhook/payment', async ({ body, headers, set }) => {
        try {
          const signature = headers['x-lightning-signature'] as string;
          const payload = JSON.stringify(body);
          
          // Verify webhook signature
          if (!this.verifyWebhookSignature(signature, payload)) {
            set.status = 401;
            return { success: false, error: 'Invalid signature' };
          }
          
          const event = body as any;
          await this.handlePaymentWebhook(event);
          
          set.status = 200;
          return { success: true, processed: true };
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
   * 📊 Monitoring endpoints
   */
  private setupMonitoring() {
    return new Elysia({ name: 'monitoring' })
      .get('/metrics', async () => {
        const metrics = await this.router.getMetrics();
        const networkStats = await this.lightning.getNetworkStats();
        
        return {
          ...metrics,
          network: networkStats,
          payments: {
            total: this.payments.size,
            pending: Array.from(this.payments.values()).filter(p => p.status === 'pending').length,
            completed: Array.from(this.payments.values()).filter(p => p.status === 'completed').length
          },
          timestamp: new Date().toISOString()
        };
      })
      
      .get('/metrics/prometheus', async () => {
        const metrics = await this.router.getMetrics();
        
        // Convert to Prometheus format
        const prometheusMetrics = [
          `# HELP lightning_total_volume Total Lightning volume in satoshis`,
          `# TYPE lightning_total_volume counter`,
          `lightning_total_volume ${metrics.totalVolume}`,
          '',
          `# HELP lightning_total_fees Total Lightning fees in satoshis`,
          `# TYPE lightning_total_fees counter`,
          `lightning_total_fees ${metrics.totalFees}`,
          '',
          `# HELP lightning_success_rate Lightning payment success rate percentage`,
          `# TYPE lightning_success_rate gauge`,
          `lightning_success_rate ${metrics.successRate}`,
          '',
          `# HELP lightning_channel_utilization Lightning channel utilization percentage`,
          `# TYPE lightning_channel_utilization gauge`,
          `lightning_channel_utilization ${metrics.channelUtilization}`,
          '',
          `# HELP lightning_savings_yield Total savings yield in satoshis`,
          `# TYPE lightning_savings_yield counter`,
          `lightning_savings_yield ${metrics.savingsYield}`
        ].join('\n');
        
        return prometheusMetrics;
      });
  }

  /**
   * 🚨 Error handling
   */
  private setupErrorHandling() {
    return new Elysia({ name: 'errorHandling' })
      .onError(({ error, code, set }) => {
        console.error('Lightning API error:', {
          error: error.message,
          stack: error.stack,
          code,
          timestamp: new Date().toISOString()
        });
        
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
        
        set.status = 500;
        return {
          error: 'Internal server error',
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        };
      });
  }

  /**
   * 🔐 Verify webhook signature
   */
  private verifyWebhookSignature(signature: string, payload: string): boolean {
    const expectedSignature = createHmac('sha256', process.env.LIGHTNING_WEBHOOK_SECRET || 'default')
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * 💳 Handle payment webhook
   */
  private async handlePaymentWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'payment.settled':
        await this.handlePaymentSettled(event.data);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(event.data);
        break;
      case 'invoice.expired':
        await this.handleInvoiceExpired(event.data);
        break;
      default:
        console.log(`Unknown webhook event: ${event.type}`);
    }
  }

  /**
   * ✅ Handle payment settled
   */
  private async handlePaymentSettled(data: any): Promise<void> {
    console.log(`💰 Payment settled: ${data.paymentRequest}`);
    
    // Find and update payment
    for (const [paymentId, payment] of this.payments.entries()) {
      if (payment.lightningPayment.invoice.paymentRequest === data.paymentRequest) {
        payment.status = 'completed';
        payment.completedAt = new Date().toISOString();
        
        // Trigger auto-consolidation if enabled
        if (payment.optimization?.enabled) {
          await this.lightning.autoConsolidateToSavings();
        }
        
        break;
      }
    }
  }

  /**
   * ❌ Handle payment failed
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    console.error(`❌ Payment failed: ${data.paymentRequest}`);
    
    // Find and update payment
    for (const [paymentId, payment] of this.payments.entries()) {
      if (payment.lightningPayment.invoice.paymentRequest === data.paymentRequest) {
        payment.status = 'failed';
        payment.failedAt = new Date().toISOString();
        payment.error = data.error;
        break;
      }
    }
  }

  /**
   * ⏰ Handle invoice expired
   */
  private async handleInvoiceExpired(data: any): Promise<void> {
    console.log(`⏰ Invoice expired: ${data.paymentRequest}`);
    
    // Find and update payment
    for (const [paymentId, payment] of this.payments.entries()) {
      if (payment.lightningPayment.invoice.paymentRequest === data.paymentRequest) {
        payment.status = 'expired';
        payment.expiredAt = new Date().toISOString();
        break;
      }
    }
  }

  /**
   * 🚀 Start the Lightning Network API server
   */
  async start(port: number = 3001): Promise<void> {
    console.log(`⚡ Lightning Network API Server starting...`);
    console.log(`🔌 Node URL: ${process.env.LND_REST_URL}`);
    console.log(`💰 Savings Enabled: ${process.env.SAVINGS_ENABLED === 'true'}`);
    console.log(`📊 Monitoring: Enabled`);
    
    await this.app.listen(port);
    
    console.log(`✅ Lightning Network API Server started on port ${port}`);
    console.log(`🌐 API URL: http://localhost:${port}`);
    console.log(`📊 Metrics: http://localhost:${port}/metrics`);
    console.log(`📈 Prometheus: http://localhost:${port}/metrics/prometheus`);
  }
}

export default LightningNetworkAPIServer;
export type { 
  LightningPaymentRequest, 
  LightningPaymentResponse, 
  LightningStatusResponse 
};
