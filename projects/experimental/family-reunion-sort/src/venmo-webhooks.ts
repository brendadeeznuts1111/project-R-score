// Venmo webhook handlers for dispute integration

import { DisputeDatabase } from "./database";
import { VenmoService } from "./venmo-service";
import { EmailService } from "./email-service";
import { 
  VenmoWebhookPayload,
  VenmoDisputeCreatedPayload,
  VenmoDisputeResolvedPayload,
  Dispute
} from "./types";

export class VenmoWebhookHandler {
  private db: DisputeDatabase;
  private venmo: VenmoService;
  private emailService: EmailService;

  constructor() {
    this.db = new DisputeDatabase();
    this.venmo = new VenmoService();
    this.emailService = new EmailService();
  }

  // Main webhook handler - routes to specific handlers based on payload type
  async handleWebhook(payload: VenmoWebhookPayload, signature: string): Promise<void> {
    // Validate webhook signature
    if (!this.venmo.validateWebhookSignature(JSON.stringify(payload), signature)) {
      throw new Error('Invalid webhook signature');
    }

    console.log(`Processing Venmo webhook: ${payload.type}`);

    switch (payload.type) {
      case 'dispute.created':
        await this.handleDisputeCreated(payload.data as VenmoDisputeCreatedPayload);
        break;
      case 'dispute.updated':
        await this.handleDisputeUpdated(payload.data);
        break;
      case 'dispute.resolved':
        await this.handleDisputeResolved(payload.data as VenmoDisputeResolvedPayload);
        break;
      case 'refund.processed':
        await this.handleRefundProcessed(payload.data);
        break;
      case 'evidence.requested':
        await this.handleEvidenceRequested(payload.data);
        break;
      case 'message.received':
        await this.handleMessageReceived(payload.data);
        break;
      default:
        console.warn(`Unknown webhook type: ${payload.type}`);
    }
  }

  // Handle when Venmo creates a dispute case
  private async handleDisputeCreated(payload: VenmoDisputeCreatedPayload): Promise<void> {
    try {
      console.log(`Venmo dispute created: ${payload.dispute_id} for payment: ${payload.payment_id}`);

      // Find our internal dispute by Venmo payment ID
      const dispute = await this.db.findDisputeByVenmoPaymentId(payload.payment_id);
      
      if (dispute) {
        // Update with Venmo's dispute ID
        dispute.venmoDisputeId = payload.dispute_id;
        dispute.venmoStatus = payload.status;
        dispute.timeline.push({
          event: 'Venmo dispute case opened',
          timestamp: new Date(payload.created_at),
          actor: 'VENMO',
          details: `Case ID: ${payload.dispute_id}, Amount: $${payload.amount}`
        });

        await this.db.updateDispute(dispute);

        // Get customer and merchant for notifications
        const customer = await this.db.getCustomer(dispute.customerId);
        const merchant = await this.db.getMerchant(dispute.merchantId);

        // Notify both parties about escalation
        if (customer) {
          await this.emailService.sendEscalationNotification(dispute, customer);
        }
        if (merchant) {
          await this.emailService.sendEscalationNotification(dispute, merchant);
        }

        console.log(`Successfully processed Venmo dispute creation for dispute ${dispute.id}`);
      } else {
        console.warn(`No internal dispute found for Venmo payment ${payload.payment_id}`);
      }
    } catch (error) {
      console.error('Error handling dispute created webhook:', error);
      throw error;
    }
  }

  // Handle dispute status updates from Venmo
  private async handleDisputeUpdated(payload: any): Promise<void> {
    try {
      console.log(`Venmo dispute updated: ${payload.dispute_id}, status: ${payload.status}`);

      const dispute = await this.db.findDisputeByVenmoId(payload.dispute_id);
      
      if (dispute) {
        const oldStatus = dispute.venmoStatus;
        dispute.venmoStatus = payload.status;

        // Add timeline event
        dispute.timeline.push({
          event: `Venmo dispute status updated: ${payload.status}`,
          timestamp: new Date(payload.updated_at),
          actor: 'VENMO',
          details: `Status changed from ${oldStatus} to ${payload.status}`
        });

        await this.db.updateDispute(dispute);

        // Update internal status based on Venmo status
        await this.syncInternalStatus(dispute, payload.status);

        console.log(`Successfully processed Venmo dispute update for dispute ${dispute.id}`);
      } else {
        console.warn(`No internal dispute found for Venmo dispute ${payload.dispute_id}`);
      }
    } catch (error) {
      console.error('Error handling dispute updated webhook:', error);
      throw error;
    }
  }

  // Handle when Venmo resolves a dispute
  private async handleDisputeResolved(payload: VenmoDisputeResolvedPayload): Promise<void> {
    try {
      console.log(`Venmo dispute resolved: ${payload.dispute_id}, resolution: ${payload.resolution}`);

      const dispute = await this.db.findDisputeByVenmoId(payload.dispute_id);
      
      if (dispute) {
        dispute.venmoStatus = payload.status;
        dispute.venmoResolution = payload.resolution;
        dispute.status = 'RESOLVED';
        dispute.resolvedAt = new Date(payload.resolved_at);

        // Set resolution based on Venmo's decision
        if (payload.resolution === 'won') {
          dispute.resolution = {
            outcome: 'CUSTOMER_WINS_FULL_REFUND',
            reason: 'Venmo ruled in customer\'s favor',
            refundAmount: payload.refund_amount
          };
        } else if (payload.resolution === 'partial') {
          dispute.resolution = {
            outcome: 'CUSTOMER_WINS_PARTIAL_REFUND',
            reason: 'Venmo ruled for partial refund',
            refundAmount: payload.refund_amount
          };
        } else {
          dispute.resolution = {
            outcome: 'MERCHANT_WINS',
            reason: 'Venmo ruled in merchant\'s favor'
          };
        }

        // Add timeline event
        dispute.timeline.push({
          event: `Venmo dispute resolved: ${payload.resolution}`,
          timestamp: new Date(payload.resolved_at),
          actor: 'VENMO',
          details: `Refund: $${payload.refund_amount || 0}`
        });

        await this.db.updateDispute(dispute);

        // Notify both parties of resolution
        await this.notifyPartiesOfVenmoResolution(dispute);

        console.log(`Successfully processed Venmo dispute resolution for dispute ${dispute.id}`);
      } else {
        console.warn(`No internal dispute found for Venmo dispute ${payload.dispute_id}`);
      }
    } catch (error) {
      console.error('Error handling dispute resolved webhook:', error);
      throw error;
    }
  }

  // Handle when Venmo processes a refund
  private async handleRefundProcessed(payload: any): Promise<void> {
    try {
      console.log(`Venmo refund processed: ${payload.refund_id}, amount: $${payload.amount}`);

      // Find dispute by refund ID or original payment ID
      let dispute = await this.db.findDisputeByVenmoId(payload.dispute_id);
      
      if (!dispute) {
        // Try to find by refund ID in our database
        // This would require adding a method to search by refund ID
        console.warn(`Could not find dispute for refund ${payload.refund_id}`);
        return;
      }

      dispute.refundId = payload.refund_id;

      // Add timeline event
      dispute.timeline.push({
        event: `Venmo refund processed: $${payload.amount}`,
        timestamp: new Date(payload.processed_at),
        actor: 'VENMO',
        details: `Refund ID: ${payload.refund_id}, Status: ${payload.status}`
      });

      await this.db.updateDispute(dispute);

      // Notify customer about refund
      const customer = await this.db.getCustomer(dispute.customerId);
      if (customer) {
        await this.emailService.sendRefundNotification(dispute, customer, payload.amount);
      }

      console.log(`Successfully processed Venmo refund for dispute ${dispute.id}`);
    } catch (error) {
      console.error('Error handling refund processed webhook:', error);
      throw error;
    }
  }

  // Handle when Venmo requests additional evidence
  private async handleEvidenceRequested(payload: any): Promise<void> {
    try {
      console.log(`Venmo evidence requested: ${payload.dispute_id}`);

      const dispute = await this.db.findDisputeByVenmoId(payload.dispute_id);
      
      if (dispute) {
        // Add timeline event
        dispute.timeline.push({
          event: 'Venmo requested additional evidence',
          timestamp: new Date(payload.requested_at),
          actor: 'VENMO',
          details: `Evidence needed: ${payload.evidence_types.join(', ')}`
        });

        await this.db.updateDispute(dispute);

        // Notify customer to provide evidence
        const customer = await this.db.getCustomer(dispute.customerId);
        if (customer) {
          await this.emailService.sendEvidenceRequestNotification(dispute, customer, payload.evidence_types);
        }

        console.log(`Successfully processed evidence request for dispute ${dispute.id}`);
      } else {
        console.warn(`No internal dispute found for Venmo dispute ${payload.dispute_id}`);
      }
    } catch (error) {
      console.error('Error handling evidence requested webhook:', error);
      throw error;
    }
  }

  // Handle messages received through Venmo's dispute system
  private async handleMessageReceived(payload: any): Promise<void> {
    try {
      console.log(`Venmo message received: ${payload.dispute_id} from ${payload.sender_type}`);

      const dispute = await this.db.findDisputeByVenmoId(payload.dispute_id);
      
      if (dispute) {
        // Add message to internal chat if it exists
        const chat = await this.db.getDisputeChat(dispute.id);
        if (chat) {
          chat.messages.push({
            senderId: payload.sender_id,
            senderName: payload.sender_name || payload.sender_type,
            content: payload.message,
            timestamp: new Date(payload.sent_at),
            isSystem: payload.sender_type === 'VENMO'
          });

          await this.db.createDisputeChat(chat);
        }

        // Add timeline event
        dispute.timeline.push({
          event: `Message received from ${payload.sender_type}`,
          timestamp: new Date(payload.sent_at),
          actor: 'VENMO',
          details: payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : '')
        });

        await this.db.updateDispute(dispute);

        console.log(`Successfully processed Venmo message for dispute ${dispute.id}`);
      } else {
        console.warn(`No internal dispute found for Venmo dispute ${payload.dispute_id}`);
      }
    } catch (error) {
      console.error('Error handling message received webhook:', error);
      throw error;
    }
  }

  // Helper methods
  private async syncInternalStatus(dispute: Dispute, venmoStatus: string): Promise<void> {
    // Map Venmo statuses to internal statuses
    const statusMap: { [key: string]: string } = {
      'SUBMITTED': 'ESCALATED_TO_VENMO',
      'UNDER_REVIEW': 'ESCALATED_TO_VENMO',
      'MERCHANT_RESPONDED': 'ESCALATED_TO_VENMO',
      'EVIDENCE_REQUIRED': 'ESCALATED_TO_VENMO',
      'RESOLVED': 'RESOLVED',
      'CLOSED': 'CLOSED'
    };

    const internalStatus = statusMap[venmoStatus];
    if (internalStatus && internalStatus !== dispute.status) {
      dispute.status = internalStatus as any;
      await this.db.updateDispute(dispute);
    }
  }

  private async notifyPartiesOfVenmoResolution(dispute: Dispute): Promise<void> {
    const customer = await this.db.getCustomer(dispute.customerId);
    const merchant = await this.db.getMerchant(dispute.merchantId);

    if (customer) {
      await this.emailService.sendDisputeResolutionNotification(dispute, customer);
    }

    if (merchant) {
      await this.emailService.sendDisputeResolutionNotification(dispute, merchant);
    }
  }
}

// Extend EmailService to handle additional notification types
declare module './email-service' {
  interface EmailService {
    sendRefundNotification(dispute: Dispute, customer: any, amount: number): Promise<void>;
    sendEvidenceRequestNotification(dispute: Dispute, customer: any, evidenceTypes: string[]): Promise<void>;
  }
}

// Add the missing methods to EmailService
EmailService.prototype.sendRefundNotification = async function(dispute: Dispute, customer: any, amount: number): Promise<void> {
  const subject = `Refund Processed: ${dispute.id}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Refund Processed</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .refund-info { background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Refund Processed</h1>
        <p>Your refund has been processed</p>
      </div>
      
      <div class="content">
        <div class="refund-info">
          <p><strong>Dispute ID:</strong> ${dispute.id}</p>
          <p><strong>Refund Amount:</strong> $${amount}</p>
          <p><strong>Processed:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p>Your refund of $${amount} has been processed to your original payment method.</p>
        <p>Please allow 3-5 business days for the refund to appear in your account.</p>
      </div>

      <div class="footer">
        <p>Questions? Contact support@duoplus.com</p>
        <p>© 2024 DuoPlus. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Refund Processed - ${dispute.id}
    
    Your refund has been processed.
    
    Amount: $${amount}
    Dispute ID: ${dispute.id}
    Processed: ${new Date().toLocaleString()}
    
    Please allow 3-5 business days for the refund to appear in your account.
    
    Questions? Contact support@duoplus.com
  `;

  // This would send the actual email
  console.log(`Refund notification sent to ${customer.email}: $${amount}`);
};

EmailService.prototype.sendEvidenceRequestNotification = async function(dispute: Dispute, customer: any, evidenceTypes: string[]): Promise<void> {
  const subject = `Evidence Requested: ${dispute.id}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Evidence Requested</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #ffc107; color: black; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .evidence-list { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Evidence Requested</h1>
        <p>Venmo has requested additional evidence</p>
      </div>
      
      <div class="content">
        <p>Venmo's dispute team has reviewed your case ${dispute.id} and requires additional evidence.</p>
        
        <div class="evidence-list">
          <h3>Evidence Needed:</h3>
          <ul>
            ${evidenceTypes.map(type => `<li>${type}</li>`).join('')}
          </ul>
        </div>

        <p>Please upload the requested evidence as soon as possible to avoid delays in resolving your dispute.</p>
      </div>

      <div class="footer">
        <p>Questions? Contact support@duoplus.com</p>
        <p>© 2024 DuoPlus. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Evidence Requested - ${dispute.id}
    
    Venmo has requested additional evidence for your dispute.
    
    Evidence needed:
    ${evidenceTypes.map(type => `- ${type}`).join('\n')}
    
    Please upload the requested evidence as soon as possible.
    
    Questions? Contact support@duoplus.com
  `;

  // This would send the actual email
  console.log(`Evidence request sent to ${customer.email} for dispute ${dispute.id}`);
};
