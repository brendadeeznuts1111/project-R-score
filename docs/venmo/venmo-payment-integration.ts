/**
 * Venmo Payment Gateway Integration
 * Comprehensive payment processing with private transactions, split payments, and QR codes
 */

export interface VenmoConfig {
  accessToken: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  webhookSecret?: string;
  apiVersion: string;
}

export interface VenmoPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  merchantNote?: string;
  privateTransaction?: boolean; // Disable social feed
  splitPayment?: {
    enabled: boolean;
    participants: Array<{
      userId: string;
      amount: number;
      note?: string;
    }>;
  };
  metadata?: Record<string, any>;
}

export interface VenmoPaymentResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  transactionId: string;
  privateTransaction: boolean;
  description?: string; // Optional description from the original request
  splitDetails?: {
    totalParticipants: number;
    completedPayments: number;
    remainingAmount: number;
  };
  qrCode?: {
    data: string;
    expiresAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VenmoUser {
  userId: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  isVerified: boolean;
  accountType: 'personal' | 'business';
}

export class VenmoPaymentGateway {
  private config: VenmoConfig;
  private baseUrl: string;

  constructor(config: VenmoConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.venmo.com/v1' 
      : 'https://api.sandbox.venmo.com/v1';
  }

  /**
   * Create a new Venmo payment
   */
  async createPayment(request: VenmoPaymentRequest): Promise<VenmoPaymentResponse> {
    const payload: any = {
      amount: this.formatAmount(request.amount),
      currency: request.currency,
      note: request.description,
      merchant_note: request.merchantNote,
      privacy: request.privateTransaction ? 'private' : 'public',
      audience: request.privateTransaction ? 'private' : 'public',
      metadata: {
        ...request.metadata,
        merchant_id: this.config.merchantId,
        integration_version: this.config.apiVersion
      },
      split: undefined // Will be set below if needed
    };

    // Add split payment details if enabled
    if (request.splitPayment?.enabled) {
      payload.split = {
        enabled: true,
        participants: request.splitPayment.participants.map(p => ({
          user_id: p.userId,
          amount: this.formatAmount(p.amount),
          note: p.note
        }))
      };
    }

    try {
      const response = await this.makeRequest('/payments', 'POST', payload);
      return this.transformPaymentResponse(response);
    } catch (error) {
      throw new VenmoError(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Generate QR code for payment
   */
  async generateQRCode(paymentId: string): Promise<{ data: string; expiresAt: string }> {
    try {
      const response = await this.makeRequest(`/payments/${paymentId}/qrcode`, 'POST', {
        merchant_id: this.config.merchantId,
        expires_in: 3600 // 1 hour
      });

      return {
        data: response.qr_code_data,
        expiresAt: response.expires_at
      };
    } catch (error) {
      throw new VenmoError(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<VenmoPaymentResponse> {
    try {
      const response = await this.makeRequest(`/payments/${paymentId}`, 'GET');
      return this.transformPaymentResponse(response);
    } catch (error) {
      throw new VenmoError(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      await this.makeRequest(`/payments/${paymentId}/cancel`, 'POST');
    } catch (error) {
      throw new VenmoError(`Failed to cancel payment: ${error.message}`);
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(userId: string): Promise<VenmoUser> {
    try {
      const response = await this.makeRequest(`/users/${userId}`, 'GET');
      return {
        userId: response.id,
        username: response.username,
        displayName: response.display_name,
        profilePicture: response.profile_picture_url,
        isVerified: response.is_verified,
        accountType: response.account_type
      };
    } catch (error) {
      throw new VenmoError(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Process webhook events
   */
  async processWebhook(payload: string, signature: string): Promise<any> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new VenmoError('Invalid webhook signature');
    }

    const event = JSON.parse(payload);
    
    switch (event.type) {
      case 'payment.completed':
        return this.handlePaymentCompleted(event.data);
      case 'payment.failed':
        return this.handlePaymentFailed(event.data);
      case 'payment.cancelled':
        return this.handlePaymentCancelled(event.data);
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        return { status: 'ignored' };
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<any> {
    try {
      const payload: any = {
        payment_id: paymentId
      };

      if (amount) {
        payload.amount = this.formatAmount(amount);
      }

      if (reason) {
        payload.reason = reason;
      }

      const response = await this.makeRequest(`/payments/${paymentId}/refund`, 'POST', payload);
      return response;
    } catch (error) {
      throw new VenmoError(`Failed to refund payment: ${error.message}`);
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  } = {}): Promise<{ payments: VenmoPaymentResponse[]; total: number }> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    if (options.status) params.append('status', options.status);

    try {
      const response = await this.makeRequest(`/payments/history?${params}`, 'GET');
      return {
        payments: response.data.map(this.transformPaymentResponse),
        total: response.total
      };
    } catch (error) {
      throw new VenmoError(`Failed to get payment history: ${error.message}`);
    }
  }

  /**
   * Make HTTP request to Venmo API
   */
  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
      'Venmo-Version': this.config.apiVersion
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Transform API response to our format
   */
  private transformPaymentResponse(response: any): VenmoPaymentResponse {
    return {
      paymentId: response.id,
      status: response.status,
      amount: parseFloat(response.amount),
      currency: response.currency,
      transactionId: response.transaction_id,
      privateTransaction: response.privacy === 'private',
      description: response.note || response.description, // Include description from API response
      splitDetails: response.split ? {
        totalParticipants: response.split.total_participants,
        completedPayments: response.split.completed_payments,
        remainingAmount: parseFloat(response.split.remaining_amount)
      } : undefined,
      qrCode: response.qr_code ? {
        data: response.qr_code.data,
        expiresAt: response.qr_code.expires_at
      } : undefined,
      createdAt: response.created_at,
      updatedAt: response.updated_at
    };
  }

  /**
   * Format amount for Venmo API
   */
  private formatAmount(amount: number): string {
    return (amount / 100).toFixed(2); // Convert cents to dollars
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Handle payment completed webhook
   */
  private async handlePaymentCompleted(data: any): Promise<any> {
    // Update your database, send notifications, etc.
    console.log(`Payment completed: ${data.payment_id}`);
    
    // Example: Update order status
    // await updateOrderStatus(data.payment_id, 'paid');
    
    // Example: Send confirmation email
    // await sendPaymentConfirmation(data.user_id, data.amount);
    
    return { status: 'processed', paymentId: data.payment_id };
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(data: any): Promise<any> {
    console.log(`Payment failed: ${data.payment_id}, reason: ${data.failure_reason}`);
    
    // Example: Update order status
    // await updateOrderStatus(data.payment_id, 'payment_failed');
    
    // Example: Send failure notification
    // await sendPaymentFailureNotification(data.user_id, data.failure_reason);
    
    return { status: 'processed', paymentId: data.payment_id };
  }

  /**
   * Handle payment cancelled webhook
   */
  private async handlePaymentCancelled(data: any): Promise<any> {
    console.log(`Payment cancelled: ${data.payment_id}`);
    
    // Example: Update order status
    // await updateOrderStatus(data.payment_id, 'cancelled');
    
    return { status: 'processed', paymentId: data.payment_id };
  }
}

/**
 * Custom error class for Venmo operations
 */
export class VenmoError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'VenmoError';
  }
}

/**
 * Factory function to create Venmo gateway instance
 */
export function createVenmoGateway(config: VenmoConfig): VenmoPaymentGateway {
  if (!config.accessToken || !config.merchantId) {
    throw new VenmoError('Missing required Venmo configuration: accessToken and merchantId');
  }

  return new VenmoPaymentGateway(config);
}

/**
 * Example usage and integration patterns
 */

// Configuration from environment variables
export function getVenmoConfig(): VenmoConfig {
  return {
    accessToken: process.env.VENMO_ACCESS_TOKEN || '',
    merchantId: process.env.VENMO_MERCHANT_ID || '',
    environment: (process.env.VENMO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    webhookSecret: process.env.VENMO_WEBHOOK_SECRET,
    apiVersion: '2.0'
  };
}

// Example: Create a simple payment
export async function createSimplePayment(amount: number, description: string): Promise<VenmoPaymentResponse> {
  const gateway = createVenmoGateway(getVenmoConfig());
  
  const request: VenmoPaymentRequest = {
    amount: amount * 100, // Convert to cents
    currency: 'USD',
    description,
    privateTransaction: true, // Disable social feed
    merchantNote: 'Payment for services'
  };

  return await gateway.createPayment(request);
}

// Example: Create a split payment
export async function createSplitPayment(
  totalAmount: number, 
  participants: Array<{ userId: string; amount: number }>,
  description: string
): Promise<VenmoPaymentResponse> {
  const gateway = createVenmoGateway(getVenmoConfig());
  
  const request: VenmoPaymentRequest = {
    amount: totalAmount * 100,
    currency: 'USD',
    description,
    privateTransaction: true,
    splitPayment: {
      enabled: true,
      participants: participants.map(p => ({
        userId: p.userId,
        amount: p.amount * 100,
        note: 'Split payment'
      }))
    }
  };

  return await gateway.createPayment(request);
}

// Example: Generate QR code for in-person payment
export async function generatePaymentQR(paymentId: string): Promise<string> {
  const gateway = createVenmoGateway(getVenmoConfig());
  const qrCode = await gateway.generateQRCode(paymentId);
  
  // You can use this QR code data to display a QR code image
  // qrCode.data contains the QR code content
  // qrCode.expiresAt contains when it expires
  
  return qrCode.data;
}
