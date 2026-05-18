// src/notifications/dispute-notifications.ts
import { DeepLinkGenerator } from '../deeplinks/deeplink-generator';
import { Dispute, DisputeStatus } from '../deeplinks/deeplink-generator';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  deviceToken?: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
}

export interface PushNotification {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationTemplate {
  subject: string;
  sms: string;
  email: string;
  push: PushNotification;
}

export class DisputeNotificationService {
  private readonly deeplinkGenerator: DeepLinkGenerator;
  private readonly smsService: SMSService;
  private readonly emailService: EmailService;
  private readonly pushService: PushService;
  private readonly urlShortener: URLShortener;
  private readonly db: DatabaseService;
  
  constructor(
    deeplinkGenerator: DeepLinkGenerator,
    smsService: SMSService,
    emailService: EmailService,
    pushService: PushService,
    urlShortener: URLShortener,
    db: DatabaseService
  ) {
    this.deeplinkGenerator = deeplinkGenerator;
    this.smsService = smsService;
    this.emailService = emailService;
    this.pushService = pushService;
    this.urlShortener = urlShortener;
    this.db = db;
  }
  
  async sendDisputeUpdate(dispute: Dispute, updateType: string): Promise<void> {
    const customer = await this.db.getCustomer(dispute.customerId);
    const merchant = await this.db.getMerchant(dispute.merchantId);
    
    // Generate encoded deep links
    const deepLink = this.deeplinkGenerator.generateDisputeDeepLink(dispute);
    const webLink = this.deeplinkGenerator.generateWebFallbackLink(deepLink);
    
    // Customer notification
    await this.sendCustomerNotification(customer, dispute, deepLink, webLink, updateType);
    
    // Merchant notification (if applicable)
    if (this.shouldNotifyMerchant(updateType)) {
      await this.sendMerchantNotification(merchant, dispute, deepLink, webLink, updateType);
    }
    
    // Support team notification
    await this.sendSupportNotification(dispute, updateType);
  }
  
  private async sendCustomerNotification(
    customer: Customer,
    dispute: Dispute,
    deepLink: string,
    webLink: string,
    updateType: string
  ): Promise<void> {
    const templates = {
      DISPUTE_SUBMITTED: {
        subject: `✅ Dispute Submitted: ${dispute.id}`,
        sms: this.generateSMS('customer', 'submitted', dispute, deepLink),
        email: this.generateEmail('customer', 'submitted', dispute, deepLink, webLink),
        push: {
          title: 'Dispute Submitted',
          body: `We've received your dispute against ${dispute.merchantUsername}`,
          data: { deepLink }
        }
      },
      MERCHANT_RESPONDED: {
        subject: `💬 ${dispute.merchantUsername} responded to your dispute`,
        sms: this.generateSMS('customer', 'merchant_responded', dispute, deepLink),
        email: this.generateEmail('customer', 'merchant_responded', dispute, deepLink, webLink),
        push: {
          title: 'Merchant Responded',
          body: `${dispute.merchantUsername} sent a message about your dispute`,
          data: { deepLink }
        }
      },
      UNDER_INVESTIGATION: {
        subject: `🔍 Your dispute is under investigation: ${dispute.id}`,
        sms: this.generateSMS('customer', 'investigation', dispute, deepLink),
        email: this.generateEmail('customer', 'investigation', dispute, deepLink, webLink),
        push: {
          title: 'Under Investigation',
          body: `Your dispute is now being reviewed by our team`,
          data: { deepLink }
        }
      },
      VENMO_ESCALATED: {
        subject: `⚖️ Dispute escalated to Venmo: ${dispute.id}`,
        sms: this.generateSMS('customer', 'venmo_escalated', dispute, deepLink),
        email: this.generateEmail('customer', 'venmo_escalated', dispute, deepLink, webLink),
        push: {
          title: 'Escalated to Venmo',
          body: `Your dispute has been escalated to Venmo for review`,
          data: { deepLink }
        }
      },
      DECISION_MADE: {
        subject: `⚖️ Decision on your dispute: ${dispute.id}`,
        sms: this.generateSMS('customer', 'decision', dispute, deepLink),
        email: this.generateEmail('customer', 'decision', dispute, deepLink, webLink),
        push: {
          title: 'Dispute Decision',
          body: `A decision has been made on your dispute`,
          data: { deepLink }
        }
      },
      REFUND_ISSUED: {
        subject: `💰 Refund issued for dispute: ${dispute.id}`,
        sms: this.generateSMS('customer', 'refund', dispute, deepLink),
        email: this.generateEmail('customer', 'refund', dispute, deepLink, webLink),
        push: {
          title: 'Refund Issued',
          body: `$${dispute.amount} has been refunded to your account`,
          data: { deepLink }
        }
      },
      DISPUTE_DENIED: {
        subject: `❌ Dispute denied: ${dispute.id}`,
        sms: this.generateSMS('customer', 'denied', dispute, deepLink),
        email: this.generateEmail('customer', 'denied', dispute, deepLink, webLink),
        push: {
          title: 'Dispute Denied',
          body: `Your dispute has been reviewed and denied`,
          data: { deepLink }
        }
      }
    };
    
    const template = templates[updateType];
    if (!template) return;
    
    // Send via all channels
    await this.smsService.send(customer.phone, template.sms);
    await this.emailService.send(customer.email, template.subject, template.email);
    
    if (customer.deviceToken) {
      await this.pushService.send(customer.deviceToken, template.push);
    }
  }
  
  private async sendMerchantNotification(
    merchant: Merchant,
    dispute: Dispute,
    deepLink: string,
    webLink: string,
    updateType: string
  ): Promise<void> {
    const templates = {
      DISPUTE_SUBMITTED: {
        subject: `🚨 New dispute filed: ${dispute.id}`,
        sms: this.generateSMS('merchant', 'new_dispute', dispute, deepLink),
        email: this.generateEmail('merchant', 'new_dispute', dispute, deepLink, webLink),
        push: {
          title: 'New Dispute Filed',
          body: `A customer has filed a dispute for $${dispute.amount}`,
          data: { deepLink }
        }
      },
      EVIDENCE_UPLOADED: {
        subject: `📎 New evidence uploaded: ${dispute.id}`,
        sms: this.generateSMS('merchant', 'evidence', dispute, deepLink),
        email: this.generateEmail('merchant', 'evidence', dispute, deepLink, webLink),
        push: {
          title: 'New Evidence',
          body: `Customer uploaded evidence for their dispute`,
          data: { deepLink }
        }
      },
      CUSTOMER_MESSAGE: {
        subject: `💬 Customer message: ${dispute.id}`,
        sms: this.generateSMS('merchant', 'customer_message', dispute, deepLink),
        email: this.generateEmail('merchant', 'customer_message', dispute, deepLink, webLink),
        push: {
          title: 'Customer Message',
          body: `Customer sent a message about their dispute`,
          data: { deepLink }
        }
      }
    };
    
    const template = templates[updateType];
    if (!template) return;
    
    await this.smsService.send(merchant.phone, template.sms);
    await this.emailService.send(merchant.email, template.subject, template.email);
  }
  
  private async sendSupportNotification(dispute: Dispute, updateType: string): Promise<void> {
    // Internal support team notification
    const supportEmail = 'support@factory-wager.com';
    const subject = `Support Alert: ${updateType} for dispute ${dispute.id}`;
    
    const email = `
      <h2>Dispute Support Alert</h2>
      <p><strong>Dispute ID:</strong> ${dispute.id}</p>
      <p><strong>Update Type:</strong> ${updateType}</p>
      <p><strong>Customer:</strong> ${dispute.customerId}</p>
      <p><strong>Merchant:</strong> ${dispute.merchantUsername}</p>
      <p><strong>Amount:</strong> $${dispute.amount}</p>
      <p><strong>Status:</strong> ${dispute.status}</p>
      <p><strong>Updated:</strong> ${new Date(dispute.updatedAt).toLocaleString()}</p>
      
      <p><a href="https://factory-wager.com/admin/disputes/${dispute.id}">View in Admin Dashboard</a></p>
    `;
    
    await this.emailService.send(supportEmail, subject, email);
  }
  
  private generateSMS(
    recipient: 'customer' | 'merchant',
    type: string,
    dispute: Dispute,
    deepLink: string
  ): string {
    const decodedLink = decodeURIComponent(deepLink);
    const shortLink = this.urlShortener.shorten(decodedLink);
    
    const messages = {
      customer_submitted: `
        FactoryWager: Dispute ${dispute.id} submitted ✅
        
        Against: ${dispute.merchantUsername}
        Amount: $${dispute.amount}
        Status: Under review
        
        Track: ${shortLink}
        
        Reply HELP for support.
      `,
      customer_merchant_responded: `
        FactoryWager: ${dispute.merchantUsername} replied to your dispute.
        
        "${dispute.lastMessage?.substring(0, 50)}..."
        
        Respond: ${shortLink}
        
        Need help? Reply SUPPORT.
      `,
      customer_investigation: `
        FactoryWager: Your dispute is under investigation 🔍
        
        ID: ${dispute.id}
        Status: Review in progress
        
        Updates: ${shortLink}
        
        Questions? Reply HELP.
      `,
      customer_venmo_escalated: `
        FactoryWager: Dispute escalated to Venmo ⚖️
        
        Case: ${dispute.venmoDisputeId || 'Pending'}
        ID: ${dispute.id}
        
        Track: ${shortLink}
        
        We'll handle the rest.
      `,
      customer_decision: `
        FactoryWager: Decision made on dispute ${dispute.id}
        
        Status: ${dispute.status}
        Amount: $${dispute.amount}
        
        View: ${shortLink}
        
        Next steps in app.
      `,
      customer_refund: `
        FactoryWager: Refund issued! 💰
        
        Amount: $${dispute.amount}
        To: Original payment method
        Dispute: ${dispute.id}
        
        Details: ${shortLink}
        
        Transaction complete.
      `,
      customer_denied: `
        FactoryWager: Dispute reviewed and denied ❌
        
        ID: ${dispute.id}
        Amount: $${dispute.amount}
        
        Appeal: ${shortLink}
        
        Questions? Reply HELP.
      `,
      merchant_new_dispute: `
        FactoryWager: New dispute filed 🚨
        
        ID: ${dispute.id}
        Amount: $${dispute.amount}
        Customer: ${dispute.customerId}
        
        Respond: ${shortLink}
        
        Reply within 48 hours.
      `,
      merchant_evidence: `
        FactoryWager: New evidence uploaded 📎
        
        Dispute: ${dispute.id}
        Customer added evidence
        
        Review: ${shortLink}
        
        Respond as needed.
      `,
      merchant_customer_message: `
        FactoryWager: Customer message 💬
        
        Dispute: ${dispute.id}
        "${dispute.lastMessage?.substring(0, 50)}..."
        
        Reply: ${shortLink}
        
        Stay professional.
      `
    };
    
    const key = `${recipient}_${type}`;
    return messages[key]?.trim() || `FactoryWager dispute update: ${shortLink}`;
  }
  
  private generateEmail(
    recipient: 'customer' | 'merchant',
    type: string,
    dispute: Dispute,
    deepLink: string,
    webLink: string
  ): string {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>FactoryWager Dispute Update</title>
          <style>
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
              }
              .header { 
                  background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
                  color: white; 
                  padding: 30px 20px; 
                  text-align: center; 
                  border-radius: 10px 10px 0 0;
              }
              .dispute-card { 
                  border: 1px solid #ddd; 
                  padding: 20px; 
                  margin: 20px 0; 
                  border-radius: 10px;
                  background: #3b82f6;
              }
              .button { 
                  display: inline-block; 
                  padding: 12px 24px; 
                  background: #3b82f6; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px;
                  font-weight: bold;
                  margin: 10px 5px;
              }
              .button:hover { 
                  background: #3b82f6;
              }
              .timeline { 
                  margin: 20px 0; 
              }
              .timeline-step { 
                  display: flex; 
                  align-items: center; 
                  margin: 10px 0;
                  padding: 10px;
                  border-radius: 5px;
              }
              .timeline-step.active {
                  background: #3b82f6;
                  border-left: 4px solid #3b82f6;
              }
              .timeline-step.completed {
                  background: #3b82f6;
                  border-left: 4px solid #3b82f6;
              }
              .step-icon { 
                  margin-right: 10px; 
                  font-size: 20px; 
              }
              .status-badge {
                  display: inline-block;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: bold;
                  text-transform: uppercase;
              }
              .status-submitted { background: #3b82f6; color: white; }
              .status-review { background: #3b82f6; color: white; }
              .status-investigation { background: #3b82f6; color: white; }
              .status-escalated { background: #3b82f6; color: white; }
              .status-resolved { background: #3b82f6; color: white; }
              .status-denied { background: #3b82f6; color: white; }
              .footer {
                  text-align: center;
                  padding: 20px;
                  color: #666;
                  font-size: 12px;
                  border-top: 1px solid #eee;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <h1>🔍 FactoryWager Dispute Update</h1>
                  <p>Keeping you informed every step of the way</p>
              </div>
              
              <div class="dispute-card">
                  <h3>Dispute Details</h3>
                  <p><strong>ID:</strong> ${dispute.id}</p>
                  <p><strong>Merchant:</strong> ${dispute.merchantUsername}</p>
                  <p><strong>Amount:</strong> $${dispute.amount}</p>
                  <p><strong>Status:</strong> <span class="status-badge status-${dispute.status.toLowerCase().replace('_', '-')}">${dispute.status.replace('_', ' ')}</span></p>
                  <p><strong>Last Updated:</strong> ${new Date(dispute.updatedAt).toLocaleDateString()}</p>
              </div>
              
              <div class="timeline">
                  ${this.generateTimelineHTML(dispute)}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                  <a href="${decodeURIComponent(deepLink)}" class="button">
                      📱 Open in FactoryWager App
                  </a>
                  <a href="${webLink}" class="button" style="background: #3b82f6;">
                      🌐 View in Browser
                  </a>
              </div>
              
              ${this.generateActionButtons(recipient, type, dispute, deepLink)}
              
              <div class="footer">
                  <p>This is an automated message about your FactoryWager dispute.</p>
                  <p>Need help? Contact support at <a href="mailto:support@factory-wager.com">support@factory-wager.com</a></p>
                  <p>&copy; 2024 FactoryWager. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
    
    return html;
  }
  
  private generateTimelineHTML(dispute: Dispute): string {
    const timeline = [
      { icon: '📝', title: 'Dispute Submitted', description: 'Reviewing your claim', active: true },
      { icon: '🏪', title: 'Merchant Notified', description: 'Waiting for response', active: dispute.status !== DisputeStatus.SUBMITTED },
      { icon: '🔍', title: 'Under Investigation', description: 'Reviewing evidence', active: dispute.status === DisputeStatus.UNDER_INVESTIGATION || dispute.status === DisputeStatus.VENMO_ESCALATION },
      { icon: '⚖️', title: 'Decision Made', description: 'Resolution in progress', active: dispute.status === DisputeStatus.RESOLVED_REFUND || dispute.status === DisputeStatus.RESOLVED_DENIED },
      { icon: '✅', title: 'Resolved', description: 'Case closed', active: false }
    ];
    
    // Determine current step
    const statusOrder = [
      DisputeStatus.SUBMITTED,
      DisputeStatus.MERCHANT_REVIEW,
      DisputeStatus.UNDER_INVESTIGATION,
      DisputeStatus.VENMO_ESCALATION,
      DisputeStatus.RESOLVED_REFUND,
      DisputeStatus.RESOLVED_DENIED
    ];
    
    const currentIndex = statusOrder.indexOf(dispute.status);
    
    return timeline.map((step, index) => {
      let stepClass = 'timeline-step';
      if (index < currentIndex) {
        stepClass += ' completed';
      } else if (index === currentIndex) {
        stepClass += ' active';
      }
      
      return `
        <div class="${stepClass}">
          <span class="step-icon">${step.icon}</span>
          <div>
            <strong>${step.title}</strong>
            <div>${step.description}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  private generateActionButtons(
    recipient: 'customer' | 'merchant',
    type: string,
    dispute: Dispute,
    deepLink: string
  ): string {
    if (recipient !== 'customer') return '';
    
    const actions = {
      submitted: `
        <div style="text-align: center; margin: 20px 0;">
          <h4>Next Steps:</h4>
          <a href="${decodeURIComponent(deepLink)}&action=upload-evidence" class="button" style="background: #3b82f6;">
            📎 Upload Evidence
          </a>
          <a href="${decodeURIComponent(deepLink)}&action=message" class="button" style="background: #3b82f6;">
            💬 Message Merchant
          </a>
        </div>
      `,
      merchant_responded: `
        <div style="text-align: center; margin: 20px 0;">
          <h4>Respond to Merchant:</h4>
          <a href="${decodeURIComponent(deepLink)}&action=message" class="button" style="background: #3b82f6;">
            💬 Send Message
          </a>
          <a href="${decodeURIComponent(deepLink)}&action=escalate" class="button" style="background: #3b82f6;">
            ⚠️ Escalate
          </a>
        </div>
      `,
      decision: `
        <div style="text-align: center; margin: 20px 0;">
          <h4>Review Decision:</h4>
          <a href="${decodeURIComponent(deepLink)}&action=view-details" class="button" style="background: #3b82f6;">
            📋 View Full Details
          </a>
          ${dispute.status === DisputeStatus.RESOLVED_DENIED ? 
            `<a href="${decodeURIComponent(deepLink)}&action=appeal" class="button" style="background: #3b82f6;">
              📤 Appeal Decision
            </a>` : ''
          }
        </div>
      `
    };
    
    return actions[type] || '';
  }
  
  private shouldNotifyMerchant(updateType: string): boolean {
    const merchantNotifiableTypes = [
      'DISPUTE_SUBMITTED',
      'EVIDENCE_UPLOADED',
      'CUSTOMER_MESSAGE'
    ];
    
    return merchantNotifiableTypes.includes(updateType);
  }
}

// Mock service interfaces (would be implemented separately)
export interface SMSService {
  send(phone: string, message: string): Promise<void>;
}

export interface EmailService {
  send(email: string, subject: string, html: string): Promise<void>;
}

export interface PushService {
  send(deviceToken: string, notification: PushNotification): Promise<void>;
}

export interface URLShortener {
  shorten(url: string): string;
}

export interface DatabaseService {
  getCustomer(id: string): Promise<Customer>;
  getMerchant(id: string): Promise<Merchant>;
}

export default DisputeNotificationService;
