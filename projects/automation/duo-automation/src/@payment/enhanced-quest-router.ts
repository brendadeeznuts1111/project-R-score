/**
 * Enhanced Quest Router with Security & Cash App Premium Features
 * 
 * Addresses MEDIUM priority issues: webhook signature verification,
 * Cash App savings routing, and Lightning Network support.
 */

import { createHmac, randomUUID } from 'crypto';
import { Elysia } from 'elysia';

interface QuestRequest {
  questId: string;
  familyId: string;
  amount: number;
  description: string;
  paymentMethod: 'cashapp' | 'venmo' | 'crypto' | 'bitcoin_lightning';
  recipientId: string;
  metadata?: Record<string, any>;
}

interface QuestResponse {
  success: boolean;
  questId?: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
  savingsInfo?: {
    enabled: boolean;
    routingPercentage: number;
    estimatedSavings: number;
  };
}

interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  signature: string;
}

class EnhancedQuestRouter {
  private static readonly WEBHOOK_SECRET = process.env.FACTORY_WAGER_WEBHOOK_SECRET || 'default-secret-change-in-production';
  private static readonly CASHAPP_API_KEY = process.env.CASHAPP_API_KEY;
  private static readonly SAVINGS_ROUTING_PERCENTAGE = 0.1; // 10% to savings by default
  
  private app: Elysia;

  constructor() {
    this.app = new Elysia()
      .use(this.setupSecurity())
      .use(this.setupRoutes())
      .use(this.setupWebhooks())
      .use(this.setupCashAppFeatures())
      .use(this.setupLightningSupport());
  }

  /**
   * 🔒 Enhanced security middleware
   */
  private setupSecurity() {
    return new Elysia({ name: 'security' })
      .derive(({ request, set }) => {
        // Add security headers
        set.headers = {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        };

        return {
          verifySignature: (signature: string, payload: string) => {
            return this.verifyWebhookSignature(signature, payload);
          }
        };
      });
  }

  /**
   * 🛣️ Setup quest routes
   */
  private setupRoutes() {
    return new Elysia({ name: 'routes' })
      .post('/quest/create', async ({ body, set }) => {
        try {
          const quest = body as QuestRequest;
          const response = await this.createQuest(quest);
          
          set.status = 200;
          return response;
        } catch (error) {
          set.status = 400;
          return { success: false, error: (error as Error).message };
        }
      })
      
      .get('/quest/:questId/status', async ({ params, set }) => {
        try {
          const status = await this.getQuestStatus(params.questId);
          set.status = 200;
          return status;
        } catch (error) {
          set.status = 404;
          return { success: false, error: 'Quest not found' };
        }
      })
      
      .post('/quest/:questId/complete', async ({ params, body, set }) => {
        try {
          const result = await this.completeQuest(params.questId, body);
          set.status = 200;
          return result;
        } catch (error) {
          set.status = 400;
          return { success: false, error: (error as Error).message };
        }
      });
  }

  /**
   * 🪝 Enhanced webhook handling with signature verification
   */
  private setupWebhooks() {
    return new Elysia({ name: 'webhooks' })
      .post('/webhook/cashapp', async ({ body, headers, set }) => {
        try {
          const signature = headers['x-cashapp-signature'] as string;
          const timestamp = headers['x-cashapp-timestamp'] as string;
          const payload = JSON.stringify(body);
          
          // 🔒 FIXED: Verify webhook signature
          if (!this.verifyWebhookSignature(signature, payload)) {
            set.status = 401;
            return { success: false, error: 'Invalid signature' };
          }
          
          const event = body as WebhookEvent;
          const result = await this.handleCashAppWebhook(event);
          
          set.status = 200;
          return result;
        } catch (error) {
          set.status = 500;
          return { success: false, error: (error as Error).message };
        }
      })
      
      .post('/webhook/venmo', async ({ body, headers, set }) => {
        try {
          const signature = headers['x-venmo-signature'] as string;
          const payload = JSON.stringify(body);
          
          // 🔒 FIXED: Verify webhook signature
          if (!this.verifyWebhookSignature(signature, payload)) {
            set.status = 401;
            return { success: false, error: 'Invalid signature' };
          }
          
          const event = body as WebhookEvent;
          const result = await this.handleVenmoWebhook(event);
          
          set.status = 200;
          return result;
        } catch (error) {
          set.status = 500;
          return { success: false, error: (error as Error).message };
        }
      });
  }

  /**
   * 💰 Cash App premium features integration
   */
  private setupCashAppFeatures() {
    return new Elysia({ name: 'cashapp' })
      .derive(() => ({
        /**
         * 💳 Check Cash App Green eligibility and savings routing
         */
        checkCashAppSavings: async (familyId: string) => {
          const family = await this.getFamilyInfo(familyId);
          
          if (!family.cashAppGreenEnabled) {
            return {
              enabled: false,
              routingPercentage: 0,
              estimatedSavings: 0
            };
          }
          
          const estimatedSavings = family.estimatedMonthlySpend * this.SAVINGS_ROUTING_PERCENTAGE;
          
          return {
            enabled: true,
            routingPercentage: this.SAVINGS_ROUTING_PERCENTAGE,
            estimatedSavings
          };
        },
        
        /**
         * 🏦 Configure automatic savings routing
         */
        configureSavingsRouting: async (familyId: string, percentage: number) => {
          if (percentage < 0 || percentage > 1) {
            throw new Error('Savings percentage must be between 0 and 1');
          }
          
          await this.updateFamilySavingsConfig(familyId, percentage);
          return { success: true, routingPercentage: percentage };
        },
        
        /**
         * 🛡️ Check overdraft protection eligibility
         */
        checkOverdraftProtection: async (familyId: string) => {
          const family = await this.getFamilyInfo(familyId);
          
          return {
            enabled: family.cashAppGreenEnabled && family.creditScore >= 650,
            maxOverdraftAmount: family.maxOverdraftAmount || 0,
            currentBalance: family.cashAppBalance || 0
          };
        }
      }));
  }

  /**
   * ⚡ Lightning Network support
   */
  private setupLightningSupport() {
    return new Elysia({ name: 'lightning' })
      .derive(() => ({
        /**
         * ⚡ Create Lightning invoice
         */
        createLightningInvoice: async (amount: number, description: string) => {
          if (!process.env.LND_REST_URL || !process.env.LND_MACAROON) {
            throw new Error('Lightning Network not configured');
          }
          
          const invoice = await this.callLNDCreateInvoice(amount, description);
          return {
            paymentRequest: invoice.payment_request,
            rHash: invoice.r_hash,
            addIndex: invoice.add_index
          };
        },
        
        /**
         * ⚡ Check Lightning invoice status
         */
        checkLightningInvoice: async (rHash: string) => {
          const invoice = await this.callLNDLookupInvoice(rHash);
          return {
            settled: invoice.settled,
            amount: invoice.amt_paid_sat,
            settleDate: invoice.settle_date
          };
        },
        
        /**
         * ⚡ Get Lightning node balance
         */
        getLightningBalance: async () => {
          const balance = await this.callLNDBalance();
          return {
            confirmed: balance.confirmed_balance,
            unconfirmed: balance.unconfirmed_balance,
            total: balance.total_balance
          };
        }
      }));
  }

  /**
   * 🔒 FIXED: Verify webhook signature using HMAC-SHA256
   */
  private verifyWebhookSignature(signature: string, payload: string): boolean {
    const expectedSignature = createHmac('sha256', this.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    return this.constantTimeCompare(signature, expectedSignature);
  }

  /**
   * 🔒 Constant-time comparison for signature verification
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
   * 🎯 Create new quest with enhanced features
   */
  private async createQuest(quest: QuestRequest): Promise<QuestResponse> {
    const questId = randomUUID();
    
    // Check Cash App savings routing
    const savingsInfo = await this.checkCashAppSavings(quest.familyId);
    
    // Create payment intent based on method
    let paymentUrl: string;
    let qrCode: string;
    
    switch (quest.paymentMethod) {
      case 'cashapp':
        const cashappResult = await this.createCashAppPayment(quest, savingsInfo);
        paymentUrl = cashappResult.paymentUrl;
        qrCode = cashappResult.qrCode;
        break;
        
      case 'bitcoin_lightning':
        const lightningResult = await this.createLightningPayment(quest);
        paymentUrl = `lightning:${lightningResult.paymentRequest}`;
        qrCode = await this.generateLightningQR(lightningResult.paymentRequest);
        break;
        
      default:
        throw new Error(`Unsupported payment method: ${quest.paymentMethod}`);
    }
    
    // Save quest to database
    await this.saveQuest({
      id: questId,
      ...quest,
      status: 'pending',
      createdAt: new Date(),
      savingsInfo
    });
    
    return {
      success: true,
      questId,
      paymentUrl,
      qrCode,
      savingsInfo
    };
  }

  /**
   * 💳 Create Cash App payment with savings routing
   */
  private async createCashAppPayment(quest: QuestRequest, savingsInfo: any) {
    const cashtag = '$factory-wagerfamily';
    const amount = quest.amount;
    
    // Calculate savings routing
    const savingsAmount = savingsInfo.enabled ? Math.floor(amount * savingsInfo.routingPercentage) : 0;
    const paymentAmount = amount - savingsAmount;
    
    const paymentUrl = `https://cash.app/${cashtag}/${paymentAmount}`;
    const qrCode = await this.generateQRCode(paymentUrl);
    
    return {
      paymentUrl,
      qrCode,
      savingsAmount,
      paymentAmount
    };
  }

  /**
   * ⚡ Create Lightning Network payment
   */
  private async createLightningPayment(quest: QuestRequest) {
    const lightning = this.setupLightningSupport().derive as any;
    const invoice = await lightning.createLightningInvoice(quest.amount, quest.description);
    
    return {
      paymentRequest: invoice.paymentRequest,
      rHash: invoice.rHash
    };
  }

  /**
   * 🪝 Handle Cash App webhook events
   */
  private async handleCashAppWebhook(event: WebhookEvent) {
    switch (event.type) {
      case 'payment.completed':
        await this.processCashAppPayment(event.data);
        break;
      case 'payment.failed':
        await this.handleCashAppPaymentFailure(event.data);
        break;
      case 'savings.deposited':
        await this.processSavingsDeposit(event.data);
        break;
      default:
        console.warn(`Unknown Cash App webhook event: ${event.type}`);
    }
    
    return { success: true, processed: true };
  }

  /**
   * 🪝 Handle Venmo webhook events
   */
  private async handleVenmoWebhook(event: WebhookEvent) {
    switch (event.type) {
      case 'payment.completed':
        await this.processVenmoPayment(event.data);
        break;
      case 'payment.failed':
        await this.handleVenmoPaymentFailure(event.data);
        break;
      default:
        console.warn(`Unknown Venmo webhook event: ${event.type}`);
    }
    
    return { success: true, processed: true };
  }

  /**
   * 💰 Process savings deposit
   */
  private async processSavingsDeposit(data: any) {
    const { familyId, amount, depositDate } = data;
    
    // Update family savings balance
    await this.updateFamilySavings(familyId, amount);
    
    // Send notification
    await this.sendSavingsNotification(familyId, amount, depositDate);
    
    console.log(`Savings deposit processed: $${amount} for family ${familyId}`);
  }

  /**
   * ⚡ LND API integration
   */
  private async callLNDCreateInvoice(amount: number, description: string) {
    const response = await fetch(`${process.env.LND_REST_URL}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Grpc-Metadata-macaroon': process.env.LND_MACAROON!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: amount * 1000, // Convert to satoshis
        memo: description,
        expiry: 3600 // 1 hour expiry
      })
    });
    
    if (!response.ok) {
      throw new Error(`LND API error: ${response.statusText}`);
    }
    
    return response.json();
  }

  private async callLNDLookupInvoice(rHash: string) {
    const response = await fetch(`${process.env.LND_REST_URL}/v1/invoice/${rHash}`, {
      headers: {
        'Grpc-Metadata-macaroon': process.env.LND_MACAROON!
      }
    });
    
    if (!response.ok) {
      throw new Error(`LND API error: ${response.statusText}`);
    }
    
    return response.json();
  }

  private async callLNDBalance() {
    const response = await fetch(`${process.env.LND_REST_URL}/v1/balance/blockchain`, {
      headers: {
        'Grpc-Metadata-macaroon': process.env.LND_MACAROON!
      }
    });
    
    if (!response.ok) {
      throw new Error(`LND API error: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Placeholder methods for database operations
   */
  private async saveQuest(quest: any): Promise<void> {
    console.log(`Saving quest: ${quest.id}`);
  }

  private async getQuestStatus(questId: string): Promise<any> {
    return { questId, status: 'pending' };
  }

  private async completeQuest(questId: string, data: any): Promise<any> {
    return { questId, status: 'completed', data };
  }

  private async getFamilyInfo(familyId: string): Promise<any> {
    return {
      cashAppGreenEnabled: true,
      estimatedMonthlySpend: 1000,
      creditScore: 700,
      maxOverdraftAmount: 500,
      cashAppBalance: 250
    };
  }

  private async updateFamilySavingsConfig(familyId: string, percentage: number): Promise<void> {
    console.log(`Updated savings config for family ${familyId}: ${percentage * 100}%`);
  }

  private async updateFamilySavings(familyId: string, amount: number): Promise<void> {
    console.log(`Updated savings for family ${familyId}: +$${amount}`);
  }

  private async sendSavingsNotification(familyId: string, amount: number, date: string): Promise<void> {
    console.log(`Sent savings notification to family ${familyId}: $${amount} on ${date}`);
  }

  private async processCashAppPayment(data: any): Promise<void> {
    console.log(`Processed Cash App payment:`, data);
  }

  private async handleCashAppPaymentFailure(data: any): Promise<void> {
    console.log(`Cash App payment failed:`, data);
  }

  private async processVenmoPayment(data: any): Promise<void> {
    console.log(`Processed Venmo payment:`, data);
  }

  private async handleVenmoPaymentFailure(data: any): Promise<void> {
    console.log(`Venmo payment failed:`, data);
  }

  private async generateQRCode(data: string): Promise<string> {
    return `<svg>QR Code for: ${data}</svg>`;
  }

  private async generateLightningQR(paymentRequest: string): Promise<string> {
    return `<svg>Lightning QR: ${paymentRequest.substring(0, 20)}...</svg>`;
  }

  /**
   * Start the enhanced quest router
   */
  async start(port: number = 3000) {
    console.log(`🚀 Enhanced Quest Router starting on port ${port}`);
    console.log(`🔒 Security features enabled`);
    console.log(`💰 Cash App premium features enabled`);
    console.log(`⚡ Lightning Network support enabled`);
    
    await this.app.listen(port);
  }
}

export default EnhancedQuestRouter;
export type { QuestRequest, QuestResponse, WebhookEvent };
