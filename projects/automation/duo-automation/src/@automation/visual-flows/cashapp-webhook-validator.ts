/**
 * 💚 Cash App Webhook Validator - FactoryWager Visual Payment Flows
 * Production-ready webhook validation for Cash App payments
 */

import * as crypto from 'crypto';
import { createHmac } from 'crypto';

/**
 * 💚 Cash App Webhook Configuration
 */
export interface CashAppWebhookConfig {
  webhookSecret: string;
  allowedIPs: string[];
  signatureHeader: string;
  timestampHeader: string;
}

/**
 * 💚 Cash App Webhook Payload
 */
export interface CashAppWebhookPayload {
  type: string;
  created_at: string;
  data: {
    object: {
      id: string;
      amount: number; // Amount in cents
      currency: string;
      cashtag: string;
      sender_cashtag: string;
      note: string;
      status: string;
      recipient_id: string;
    };
  };
}

/**
 * 💚 Cash App Webhook Validator
 */
export class CashAppWebhookValidator {
  private config: CashAppWebhookConfig;

  constructor(config: CashAppWebhookConfig) {
    this.config = {
      webhookSecret: config.webhookSecret,
      allowedIPs: [
        '54.209.0.0/16', // Cash App IP range
        '52.20.0.0/16',  // Cash App IP range
        '127.0.0.1',      // Local development
        ...config.allowedIPs
      ],
      signatureHeader: config.signatureHeader || 'x-cash-app-signature',
      timestampHeader: config.timestampHeader || 'x-cash-app-timestamp'
    };
  }

  /**
   * 🔍 Validate Cash App webhook
   */
  async validateWebhook(
    payload: string,
    signature: string,
    timestamp?: string,
    clientIP?: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // 1. Check IP whitelist
      if (clientIP && !this.isIPAllowed(clientIP)) {
        return { valid: false, error: 'IP address not allowed' };
      }

      // 2. Check timestamp (prevent replay attacks)
      if (timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const webhookTime = parseInt(timestamp);
        if (Math.abs(now - webhookTime) > 300) { // 5 minute window
          return { valid: false, error: 'Timestamp outside valid window' };
        }
      }

      // 3. Verify signature
      const expectedSignature = this.generateSignature(payload, timestamp);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Cash App webhook validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * 🔐 Generate signature for validation
   */
  private generateSignature(payload: string, timestamp?: string): string {
    let signedPayload = payload;
    
    // Add timestamp if provided
    if (timestamp) {
      signedPayload = `${timestamp}.${payload}`;
    }

    // Cash App uses HMAC-SHA256
    return createHmac('sha256', this.config.webhookSecret)
      .update(signedPayload)
      .digest('hex');
  }

  /**
   * 🌐 Check if IP is allowed
   */
  private isIPAllowed(ip: string): boolean {
    return this.config.allowedIPs.some(allowed => {
      if (allowed.includes('/')) {
        return this.isIPInCIDR(ip, allowed);
      }
      return ip === allowed;
    });
  }

  /**
   * 🔍 Check if IP is in CIDR range
   */
  private isIPInCIDR(ip: string, cidr: string): boolean {
    // Simplified CIDR check - in production use ip-cidr library
    const [network] = cidr.split('/');
    return ip.startsWith(network.substring(0, network.lastIndexOf('.')));
  }

  /**
   * 📊 Parse Cash App webhook payload
   */
  parseWebhookPayload(payload: CashAppWebhookPayload): {
    transactionId: string;
    amount: number;
    currency: string;
    sender: string;
    recipient: string;
    note: string;
    status: string;
  } {
    const { data } = payload;
    
    return {
      transactionId: data.object.id,
      amount: data.object.amount / 100, // Convert from cents to dollars
      currency: data.object.currency,
      sender: data.object.sender_cashtag,
      recipient: data.object.cashtag,
      note: data.object.note,
      status: data.object.status
    };
  }

  /**
   * 👥 Extract participants from note
   */
  extractParticipants(note: string): string[] {
    const participants: string[] = [];
    
    // Look for participant mentions in the note
    const mentions = note.match(/@(\w+)/g);
    if (mentions) {
      participants.push(...mentions.map(mention => mention.substring(1)));
    }
    
    // Look for family member names
    const familyMembers = ['mom', 'dad', 'son', 'daughter', 'kid', 'kids'];
    const lowerNote = note.toLowerCase();
    
    familyMembers.forEach(member => {
      if (lowerNote.includes(member)) {
        participants.push(member);
      }
    });
    
    // Remove duplicates and return
    return [...new Set(participants)];
  }

  /**
   * 💰 Convert Cash App amount to display format
   */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}

/**
 * 💚 Cash App Webhook Handler
 */
export class CashAppWebhookHandler {
  private validator: CashAppWebhookValidator;

  constructor(config: CashAppWebhookConfig) {
    this.validator = new CashAppWebhookValidator(config);
  }

  /**
   * 🔄 Handle Cash App webhook
   */
  async handleWebhook(request: Request): Promise<Response> {
    try {
      // Get headers
      const signature = request.headers.get('x-cash-app-signature') || '';
      const timestamp = request.headers.get('x-cash-app-timestamp') || '';
      const clientIP = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';

      // Get payload
      const payload = await request.text();
      
      // Validate webhook
      const validation = await this.validator.validateWebhook(
        payload,
        signature,
        timestamp,
        clientIP
      );

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Parse payload
      const webhookData: CashAppWebhookPayload = JSON.parse(payload);
      const paymentData = this.validator.parseWebhookPayload(webhookData);
      const participants = this.validator.extractParticipants(paymentData.note);

      // Process payment (this would integrate with your payment system)
      const processedPayment = await this.processPayment({
        ...paymentData,
        participants,
        provider: 'cashapp',
        webhookId: webhookData.id,
        receivedAt: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          payment: processedPayment,
          message: 'Cash App payment processed successfully'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Cash App webhook error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : String(error)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * 💳 Process payment (integrate with your system)
   */
  private async processPayment(paymentData: any): Promise<any> {
    // This would integrate with your existing payment processing system
    console.log('Processing Cash App payment:', paymentData);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `cashapp_${paymentData.transactionId}`,
      status: 'completed',
      processedAt: new Date().toISOString(),
      amount: this.validator.formatAmount(paymentData.amount, paymentData.currency),
      participants: paymentData.participants,
      familyId: this.extractFamilyId(paymentData.participants)
    };
  }

  /**
   * 👨‍👩‍👧‍👦 Extract family ID from participants
   */
  private extractFamilyId(participants: string[]): string {
    // This would integrate with your family management system
    // For now, return a default family ID
    return 'family_default';
  }
}

/**
 * 🚀 Usage Example
 */

// Initialize the validator
/*
const cashappConfig: CashAppWebhookConfig = {
  webhookSecret: process.env.CASHAPP_WEBHOOK_SECRET || 'your-secret',
  allowedIPs: ['54.209.0.0/16', '52.20.0.0/16'],
  signatureHeader: 'x-cash-app-signature',
  timestampHeader: 'x-cash-app-timestamp'
};

const cashappHandler = new CashAppWebhookHandler(cashappConfig);

// Handle webhook in your server
export async function handleCashAppWebhook(request: Request) {
  return await cashappHandler.handleWebhook(request);
}
*/

// Example webhook payload:
/*
{
  "type": "payment.created",
  "created_at": "2024-01-15T14:30:00Z",
  "data": {
    "object": {
      "id": "PMT_1234567890",
      "amount": 2500,
      "currency": "USD",
      "cashtag": "$DadFamily",
      "sender_cashtag": "$MomMoney",
      "note": "Dinner +kids",
      "status": "completed",
      "recipient_id": "DAD_USER_ID"
    }
  }
}
*/
