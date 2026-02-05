// Venmo service integration for dispute handling

export interface VenmoDisputeRequest {
  transactionId: string;
  reason: string;
  description: string;
  amount: number;
  evidence: string[];
  customerInfo: string;
  merchantInfo: string;
}

export interface VenmoRefundRequest {
  originalPaymentId: string;
  amount: number;
  reason: string;
}

export class VenmoService {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.baseUrl = process.env.VENMO_API_URL || 'https://api.venmo.com/v1';
    this.apiKey = process.env.VENMO_API_KEY || '';
    this.apiSecret = process.env.VENMO_API_SECRET || '';
  }

  // Create a dispute in Venmo's system
  async createDispute(disputeRequest: VenmoDisputeRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/disputes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Venmo-API-Key': this.apiKey
        },
        body: JSON.stringify({
          payment_id: disputeRequest.transactionId,
          dispute_type: this.mapDisputeReason(disputeRequest.reason),
          description: disputeRequest.description,
          amount: disputeRequest.amount,
          evidence_attachments: disputeRequest.evidence,
          customer_id: disputeRequest.customerInfo,
          merchant_id: disputeRequest.merchantInfo
        })
      });

      if (!response.ok) {
        throw new Error(`Venmo API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.dispute_id;
    } catch (error) {
      console.error('Failed to create Venmo dispute:', error);
      throw error;
    }
  }

  // Create a refund through Venmo
  async createRefund(refundRequest: VenmoRefundRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${refundRequest.originalPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Venmo-API-Key': this.apiKey
        },
        body: JSON.stringify({
          amount: refundRequest.amount,
          note: refundRequest.reason,
          refund_type: 'DISPUTE_RESOLUTION'
        })
      });

      if (!response.ok) {
        throw new Error(`Venmo refund error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.refund_id;
    } catch (error) {
      console.error('Failed to create Venmo refund:', error);
      throw error;
    }
  }

  // Get dispute status from Venmo
  async getDisputeStatus(venmoDisputeId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/disputes/${venmoDisputeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Venmo-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get dispute status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Venmo dispute status:', error);
      throw error;
    }
  }

  // Get transaction details from Venmo
  async getTransactionDetails(venmoPaymentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${venmoPaymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Venmo-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Venmo transaction details:', error);
      throw error;
    }
  }

  // Verify merchant is a legitimate Venmo Business account
  async verifyMerchant(venmoUsername: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${venmoUsername}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Venmo-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        return false;
      }

      const userData = await response.json();
      return userData.is_business_account && userData.is_verified;
    } catch (error) {
      console.error('Failed to verify merchant:', error);
      return false;
    }
  }

  // Get merchant profile information
  async getMerchantProfile(venmoUsername: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${venmoUsername}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Venmo-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get merchant profile: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get merchant profile:', error);
      throw error;
    }
  }

  // Submit evidence for an existing dispute
  async submitEvidence(venmoDisputeId: string, evidenceUrls: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/disputes/${venmoDisputeId}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Venmo-API-Key': this.apiKey
        },
        body: JSON.stringify({
          evidence_files: evidenceUrls
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit evidence: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to submit evidence to Venmo:', error);
      throw error;
    }
  }

  // Add a message to Venmo dispute communication
  async addDisputeMessage(venmoDisputeId: string, message: string, senderId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/disputes/${venmoDisputeId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Venmo-API-Key': this.apiKey
        },
        body: JSON.stringify({
          message: message,
          sender_id: senderId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add dispute message: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to add message to Venmo dispute:', error);
      throw error;
    }
  }

  // Get dispute communication history
  async getDisputeMessages(venmoDisputeId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/disputes/${venmoDisputeId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Venmo-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get dispute messages: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to get dispute messages:', error);
      throw error;
    }
  }

  // Helper methods
  private getAccessToken(): string {
    // In a real implementation, this would handle OAuth token refresh
    return process.env.VENMO_ACCESS_TOKEN || '';
  }

  private mapDisputeReason(reason: string): string {
    const reasonMap: { [key: string]: string } = {
      'Item not received': 'ITEM_NOT_RECEIVED',
      'Item damaged/defective': 'ITEM_DAMAGED',
      'Wrong item received': 'WRONG_ITEM',
      'Unauthorized transaction': 'UNAUTHORIZED',
      'Merchant overcharged': 'OVERCHARGED',
      'Other issue': 'OTHER'
    };

    return reasonMap[reason] || 'OTHER';
  }

  // Webhook validation
  validateWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  // Get merchant dispute statistics
  async getMerchantDisputeStats(venmoMerchantId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/merchants/${venmoMerchantId}/dispute-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Venmo-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get merchant dispute stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get merchant dispute stats:', error);
      throw error;
    }
  }

  // Check if a payment is eligible for dispute
  async checkDisputeEligibility(venmoPaymentId: string): Promise<boolean> {
    try {
      const transaction = await this.getTransactionDetails(venmoPaymentId);
      
      // Check if payment is old enough (typically 24 hours)
      const paymentDate = new Date(transaction.created_at);
      const now = new Date();
      const hoursSincePayment = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSincePayment < 24) {
        return false;
      }

      // Check if payment is within dispute window (typically 180 days)
      const daysSincePayment = hoursSincePayment / 24;
      if (daysSincePayment > 180) {
        return false;
      }

      // Check if payment is already disputed
      if (transaction.dispute_id) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check dispute eligibility:', error);
      return false;
    }
  }
}
