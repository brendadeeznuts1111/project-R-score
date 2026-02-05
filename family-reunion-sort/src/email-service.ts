// Email service for dispute notifications

import { Dispute, Merchant, Customer } from "./types";

export interface EmailTemplate {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

export class EmailService {
  private smtpHost: string;
  private smtpPort: number;
  private smtpUser: string;
  private smtpPass: string;
  private fromEmail: string;

  constructor() {
    this.smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    this.smtpPort = parseInt(process.env.SMTP_PORT || '587');
    this.smtpUser = process.env.SMTP_USER || '';
    this.smtpPass = process.env.SMTP_PASS || '';
    this.fromEmail = process.env.FROM_EMAIL || 'disputes@duoplus.com';
  }

  // Send dispute confirmation to customer
  async sendDisputeConfirmation(dispute: Dispute, customer: Customer): Promise<void> {
    const template = this.generateDisputeConfirmationTemplate(dispute, customer);
    await this.sendEmail(template);
  }

  // Notify merchant about new dispute
  async sendMerchantDisputeNotification(dispute: Dispute, merchant: Merchant): Promise<void> {
    const template = this.generateMerchantNotificationTemplate(dispute, merchant);
    await this.sendEmail(template);
  }

  // Notify customer about merchant response
  async sendMerchantResponseNotification(dispute: Dispute, customer: Customer): Promise<void> {
    const template = this.generateMerchantResponseTemplate(dispute, customer);
    await this.sendEmail(template);
  }

  // Notify about dispute resolution
  async sendDisputeResolutionNotification(dispute: Dispute, recipient: Customer | Merchant): Promise<void> {
    const template = this.generateResolutionTemplate(dispute, recipient);
    await this.sendEmail(template);
  }

  // Send escalation notification
  async sendEscalationNotification(dispute: Dispute, recipient: Customer | Merchant): Promise<void> {
    const template = this.generateEscalationTemplate(dispute, recipient);
    await this.sendEmail(template);
  }

  // Generic email sending method
  private async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      // In a real implementation, you would use a service like SendGrid, AWS SES, or direct SMTP
      console.log(`Sending email to ${template.to}: ${template.subject}`);
      
      // Example using nodemailer (would need to be installed)
      // const transporter = nodemailer.createTransport({
      //   host: this.smtpHost,
      //   port: this.smtpPort,
      //   secure: false,
      //   auth: {
      //     user: this.smtpUser,
      //     pass: this.smtpPass
      //   }
      // });
      
      // await transporter.sendMail({
      //   from: this.fromEmail,
      //   to: template.to,
      //   subject: template.subject,
      //   html: template.htmlBody,
      //   text: template.textBody
      // });

      // For now, just log the email
      console.log('Email content:', template.htmlBody);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Email template generators
  private generateDisputeConfirmationTemplate(dispute: Dispute, customer: Customer): EmailTemplate {
    const subject = `Dispute Submitted: ${dispute.id}`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dispute Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #0084ff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .dispute-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .timeline { margin: 20px 0; }
          .timeline-item { margin: 10px 0; padding-left: 20px; border-left: 3px solid #0084ff; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #0084ff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dispute Confirmation</h1>
          <p>Your dispute has been successfully submitted</p>
        </div>
        
        <div class="content">
          <h2>Dispute Details</h2>
          <div class="dispute-info">
            <p><strong>Dispute ID:</strong> ${dispute.id}</p>
            <p><strong>Transaction ID:</strong> ${dispute.transactionId}</p>
            <p><strong>Reason:</strong> ${dispute.reason}</p>
            <p><strong>Status:</strong> ${dispute.status}</p>
            <p><strong>Submitted:</strong> ${dispute.createdAt.toLocaleString()}</p>
          </div>

          <h3>What Happens Next?</h3>
          <div class="timeline">
            <div class="timeline-item">
              <strong>Merchant Notification:</strong> The merchant will be notified within 5 minutes and has 48 hours to respond.
            </div>
            <div class="timeline-item">
              <strong>Review Period:</strong> Our team will review all evidence and communications.
            </div>
            <div class="timeline-item">
              <strong>Resolution:</strong> Most disputes are resolved within 5-10 business days.
            </div>
          </div>

          <h3>Track Your Dispute</h3>
          <p>You can track the status of your dispute in real-time through our app or by clicking the button below:</p>
          <a href="https://duoplus.com/disputes/${dispute.id}" class="button">Track Dispute Status</a>

          <h3>Need Help?</h3>
          <p>If you have any questions or need to add additional evidence, please contact our support team:</p>
          <p>
            📧 Email: support@duoplus.com<br>
            📞 Phone: 1-800-DUOPLUS<br>
            💬 Live Chat: Available 24/7 in our app
          </p>
        </div>

        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 DuoPlus. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Dispute Confirmation - ${dispute.id}
      
      Your dispute has been successfully submitted.
      
      Dispute Details:
      - ID: ${dispute.id}
      - Transaction ID: ${dispute.transactionId}
      - Reason: ${dispute.reason}
      - Status: ${dispute.status}
      - Submitted: ${dispute.createdAt.toLocaleString()}
      
      What happens next:
      1. Merchant will be notified and has 48 hours to respond
      2. Our team will review all evidence
      3. Resolution typically within 5-10 business days
      
      Track your dispute: https://duoplus.com/disputes/${dispute.id}
      
      Questions? Contact support@duoplus.com or call 1-800-DUOPLUS
    `;

    return {
      to: customer.email,
      subject,
      htmlBody,
      textBody
    };
  }

  private generateMerchantNotificationTemplate(dispute: Dispute, merchant: Merchant): EmailTemplate {
    const subject = `New Dispute Filed: ${dispute.id}`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Dispute Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #ff6b6b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .dispute-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .actions { margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
          .button.primary { background: #0084ff; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ New Dispute Filed</h1>
          <p>Action Required: Response needed within 48 hours</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>Important:</strong> A customer has filed a dispute against your business. Please review and respond within 48 hours to avoid automatic escalation.
          </div>

          <h2>Dispute Details</h2>
          <div class="dispute-info">
            <p><strong>Dispute ID:</strong> ${dispute.id}</p>
            <p><strong>Transaction ID:</strong> ${dispute.transactionId}</p>
            <p><strong>Customer Reason:</strong> ${dispute.reason}</p>
            <p><strong>Customer Description:</strong> ${dispute.description}</p>
            <p><strong>Requested Resolution:</strong> ${dispute.requestedResolution}</p>
            <p><strong>Filed:</strong> ${dispute.createdAt.toLocaleString()}</p>
          </div>

          <h3>Customer Evidence</h3>
          <p>The customer has provided ${dispute.evidenceUrls.length} piece(s) of evidence:</p>
          <ul>
            ${dispute.evidenceUrls.map(url => `<li><a href="${url}">View Evidence</a></li>`).join('')}
          </ul>

          <h3>Your Response Options</h3>
          <div class="actions">
            <a href="https://duoplus.com/merchant/disputes/${dispute.id}/respond" class="button primary">Respond to Dispute</a>
            <a href="https://duoplus.com/merchant/disputes/${dispute.id}/view" class="button">View Full Details</a>
          </div>

          <h3>Response Guidelines</h3>
          <ul>
            <li>Provide a clear explanation of what happened</li>
            <li>Upload any relevant evidence (receipts, photos, etc.)</li>
            <li>Consider offering a resolution if appropriate</li>
            <li>Be professional and courteous in your response</li>
          </ul>

          <p><strong>Deadline:</strong> You must respond by ${new Date(dispute.createdAt.getTime() + 48 * 60 * 60 * 1000).toLocaleString()}</p>
        </div>

        <div class="footer">
          <p>Questions? Contact merchant support: merchant-support@duoplus.com</p>
          <p>© 2024 DuoPlus. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      NEW DISPUTE FILEDED - ${dispute.id}
      
      A customer has filed a dispute against your business.
      
      Dispute Details:
      - ID: ${dispute.id}
      - Transaction ID: ${dispute.transactionId}
      - Reason: ${dispute.reason}
      - Description: ${dispute.description}
      - Requested Resolution: ${dispute.requestedResolution}
      - Filed: ${dispute.createdAt.toLocaleString()}
      
      Evidence provided: ${dispute.evidenceUrls.length} piece(s)
      
      ACTION REQUIRED: Respond within 48 hours
      Deadline: ${new Date(dispute.createdAt.getTime() + 48 * 60 * 60 * 1000).toLocaleString()}
      
      Respond now: https://duoplus.com/merchant/disputes/${dispute.id}/respond
      
      Merchant support: merchant-support@duoplus.com
    `;

    return {
      to: merchant.email,
      subject,
      htmlBody,
      textBody
    };
  }

  private generateMerchantResponseTemplate(dispute: Dispute, customer: Customer): EmailTemplate {
    const subject = `Update on Your Dispute ${dispute.id}`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dispute Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #0084ff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .update { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0084ff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dispute Update</h1>
          <p>The merchant has responded to your dispute</p>
        </div>
        
        <div class="content">
          <div class="update">
            <strong>Good news!</strong> The merchant has provided a response to your dispute ${dispute.id}.
          </div>

          <h2>Merchant Response</h2>
          <p><strong>Message:</strong> ${dispute.merchantResponse?.message || 'No message provided'}</p>
          
          ${dispute.merchantResponse?.acceptsFault ? 
            `<p><strong>Status:</strong> Merchant has accepted responsibility</p>` :
            `<p><strong>Status:</strong> Merchant is disputing the claim</p>`
          }

          <h3>Next Steps</h3>
          <ul>
            <li>Our team is reviewing the merchant's response</li>
            <li>We'll make a final decision within 3-5 business days</li>
            <li>You'll be notified of the resolution via email and app notification</li>
          </ul>

          <a href="https://duoplus.com/disputes/${dispute.id}" class="button">View Full Response</a>

          <h3>Communication Channel</h3>
          <p>You can communicate directly with the merchant through our secure dispute channel in the app.</p>
        </div>

        <div class="footer">
          <p>Questions? Contact support@duoplus.com or call 1-800-DUOPLUS</p>
          <p>© 2024 DuoPlus. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Dispute Update - ${dispute.id}
      
      The merchant has responded to your dispute.
      
      Merchant Response: ${dispute.merchantResponse?.message || 'No message provided'}
      Status: ${dispute.merchantResponse?.acceptsFault ? 'Merchant accepted responsibility' : 'Merchant is disputing the claim'}
      
      Next steps:
      - Our team is reviewing the response
      - Final decision within 3-5 business days
      - You'll be notified of the resolution
      
      View full response: https://duoplus.com/disputes/${dispute.id}
      
      Questions? Contact support@duoplus.com
    `;

    return {
      to: customer.email,
      subject,
      htmlBody,
      textBody
    };
  }

  private generateResolutionTemplate(dispute: Dispute, recipient: Customer | Merchant): EmailTemplate {
    const isCustomer = 'totalDisputes' in recipient;
    const subject = `Dispute Resolved: ${dispute.id}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dispute Resolution</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: ${dispute.resolution?.outcome.includes('CUSTOMER_WINS') ? '#28a745' : '#ffc107'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .resolution { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0084ff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dispute Resolved</h1>
          <p>Your dispute ${dispute.id} has been resolved</p>
        </div>
        
        <div class="content">
          <h2>Resolution Details</h2>
          <div class="resolution">
            <p><strong>Dispute ID:</strong> ${dispute.id}</p>
            <p><strong>Outcome:</strong> ${dispute.resolution?.outcome}</p>
            <p><strong>Reason:</strong> ${dispute.resolution?.reason}</p>
            ${dispute.resolution?.refundAmount ? `<p><strong>Refund Amount:</strong> $${dispute.refundAmount}</p>` : ''}
            <p><strong>Resolved:</strong> ${dispute.resolvedAt?.toLocaleString()}</p>
          </div>

          ${dispute.resolution?.refundAmount ? `
            <h3>Refund Information</h3>
            <p>A refund of $${dispute.resolution.refundAmount} has been processed to your original payment method.</p>
            <p>Please allow 3-5 business days for the refund to appear in your account.</p>
          ` : ''}

          <h3>Next Steps</h3>
          <ul>
            <li>The dispute case is now closed</li>
            <li>You can view the full resolution details in your account</li>
            <li>If you have questions about this resolution, please contact support</li>
          </ul>

          <a href="https://duoplus.com/disputes/${dispute.id}/resolution" class="button">View Resolution Details</a>
        </div>

        <div class="footer">
          <p>Questions? Contact support@duoplus.com or call 1-800-DUOPLUS</p>
          <p>© 2024 DuoPlus. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Dispute Resolved - ${dispute.id}
      
      Your dispute has been resolved.
      
      Resolution Details:
      - Outcome: ${dispute.resolution?.outcome}
      - Reason: ${dispute.resolution?.reason}
      ${dispute.resolution?.refundAmount ? `- Refund Amount: $${dispute.resolution.refundAmount}` : ''}
      - Resolved: ${dispute.resolvedAt?.toLocaleString()}
      
      ${dispute.resolution?.refundAmount ? 
        `A refund has been processed. Please allow 3-5 business days for it to appear in your account.` : ''
      }
      
      View full details: https://duoplus.com/disputes/${dispute.id}/resolution
      
      Questions? Contact support@duoplus.com
    `;

    return {
      to: recipient.email,
      subject,
      htmlBody,
      textBody
    };
  }

  private generateEscalationTemplate(dispute: Dispute, recipient: Customer | Merchant): EmailTemplate {
    const isCustomer = 'totalDisputes' in recipient;
    const subject = `Dispute Escalated: ${dispute.id}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dispute Escalation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #ff6b6b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0084ff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dispute Escalated</h1>
          <p>Your dispute has been escalated to Venmo</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>Important Update:</strong> Dispute ${dispute.id} has been escalated to Venmo's official dispute resolution team.
          </div>

          <h2>Escalation Details</h2>
          <p><strong>Dispute ID:</strong> ${dispute.id}</p>
          <p><strong>Venmo Case ID:</strong> ${dispute.venmoDisputeId || 'Pending'}</p>
          <p><strong>Escalated:</strong> ${new Date().toLocaleString()}</p>

          <h3>What This Means</h3>
          <ul>
            <li>Venmo's dispute resolution team will now review your case</li>
            <li>They may request additional information or evidence</li>
            <li>The resolution timeline may be extended (typically 10-14 business days)</li>
            <li>You'll communicate directly with Venmo's team</li>
          </ul>

          <h3>Next Steps</h3>
          <ul>
            <li>Monitor your email for communications from Venmo</li>
            <li>Respond promptly to any requests for information</li>
            <li>Continue to track status in our app</li>
          </ul>

          <a href="https://duoplus.com/disputes/${dispute.id}" class="button">Track Dispute Status</a>
        </div>

        <div class="footer">
          <p>Questions? Contact support@duoplus.com or call 1-800-DUOPLUS</p>
          <p>© 2024 DuoPlus. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Dispute Escalated - ${dispute.id}
      
      Your dispute has been escalated to Venmo's official dispute resolution team.
      
      Details:
      - Dispute ID: ${dispute.id}
      - Venmo Case ID: ${dispute.venmoDisputeId || 'Pending'}
      - Escalated: ${new Date().toLocaleString()}
      
      What this means:
      - Venmo's team will review your case
      - They may request additional information
      - Resolution typically within 10-14 business days
      - You'll communicate directly with Venmo's team
      
      Track status: https://duoplus.com/disputes/${dispute.id}
      
      Questions? Contact support@duoplus.com
    `;

    return {
      to: recipient.email,
      subject,
      htmlBody,
      textBody
    };
  }
}
