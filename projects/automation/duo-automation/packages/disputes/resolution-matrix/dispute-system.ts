// src/disputes/dispute-system.ts
import { DeepLinkGenerator, Dispute, DisputeStatus } from '../deeplinks/deeplink-generator';

export interface DisputeMatrixRow {
  status: DisputeStatus;
  icon: string;
  color: string;
  customerActions: string[];
  merchantActions: string[];
  systemActions: string[];
  timeline: string;
  deepLink: string;
}

export interface QRDisputeRequest {
  transactionId: string;
  merchantUsername: string;
  amount: number;
  currency: string;
  location?: { lat: number; lng: number };
  reason: string;
  evidenceCount: number;
  signature: string;
}

export class DisputeSystem {
  private deepLinkGenerator = new DeepLinkGenerator();
  
  /**
   * Get the complete dispute resolution matrix
   */
  getDisputeMatrix(): DisputeMatrixRow[] {
    return [
      {
        status: 'DISPUTE_SUBMITTED',
        icon: '🔴',
        color: '#FF4444',
        customerActions: ['Upload evidence', 'Describe issue', 'Choose resolution'],
        merchantActions: ['Notified via email/app', '48h to respond'],
        systemActions: ['Verify eligibility', 'Freeze funds', 'Create chat channel'],
        timeline: '0-2 hours',
        deepLink: 'duoplus://dispute/DSP-12345/submitted'
      },
      {
        status: 'MERCHANT_REVIEW',
        icon: '🟡',
        color: '#FFAA44',
        customerActions: ['Add more evidence', 'Message merchant', 'Request escalation'],
        merchantActions: ['Accept/Deny fault', 'Upload counter-evidence', 'Propose solution'],
        systemActions: ['Moderate chat', 'Escalate if no response'],
        timeline: '2-48 hours',
        deepLink: 'duoplus://dispute/DSP-12345/merchant-review'
      },
      {
        status: 'UNDER_INVESTIGATION',
        icon: '🔵',
        color: '#4444FF',
        customerActions: ['Cooperate with requests', 'Respond to questions'],
        merchantActions: ['Provide transaction logs', 'Submit proof of delivery'],
        systemActions: ['AI evidence analysis', 'Manual review', 'Risk assessment'],
        timeline: '1-5 days',
        deepLink: 'duoplus://dispute/DSP-12345/investigation'
      },
      {
        status: 'VENMO_ESCALATION',
        icon: '🟣',
        color: '#AA44FF',
        customerActions: ['Wait for decision', 'Check Venmo case'],
        merchantActions: ['Cooperate with Venmo', 'Submit to Venmo portal'],
        systemActions: ['Forward all evidence', 'Monitor Venmo status', 'Sync resolutions'],
        timeline: '5-10 days',
        deepLink: 'duoplus://dispute/DSP-12345/venmo-case/V987654'
      },
      {
        status: 'RESOLVED_REFUND',
        icon: '✅',
        color: '#44FF44',
        customerActions: ['Receive funds', 'Rate resolution', 'Download receipt'],
        merchantActions: ['Accept decision', 'Pay refund fee', 'Update processes'],
        systemActions: ['Process refund', 'Update ledgers', 'Generate report'],
        timeline: 'Instant',
        deepLink: 'duoplus://dispute/DSP-12345/resolved/refund'
      },
      {
        status: 'RESOLVED_DENIED',
        icon: '❌',
        color: '#FF4444',
        customerActions: ['Accept decision', 'Appeal if eligible', 'Leave feedback'],
        merchantActions: ['Business as usual', 'No penalty'],
        systemActions: ['Close case', 'Release funds', 'Log for compliance'],
        timeline: 'Instant',
        deepLink: 'duoplus://dispute/DSP-12345/resolved/denied'
      },
      {
        status: 'SUSPENDED_FRAUD',
        icon: '⚠️',
        color: '#FF8844',
        customerActions: ['Verify identity', 'Submit documentation'],
        merchantActions: [],
        systemActions: ['Freeze all accounts', 'Law enforcement notify', 'Full investigation'],
        timeline: '14-30 days',
        deepLink: 'duoplus://dispute/DSP-12345/suspected-fraud'
      }
    ];
  }
  
  /**
   * Generate deep links for a specific dispute
   */
  generateDisputeDeepLinks(dispute: Dispute): Record<string, string> {
    const baseLink = this.deepLinkGenerator.generateDisputeDeepLink(dispute);
    const webFallback = this.deepLinkGenerator.generateWebFallbackLink(baseLink);
    const secureLink = this.deepLinkGenerator.generateSecureDisputeLink(dispute);
    const androidIntent = this.deepLinkGenerator.generateAndroidIntentURI(baseLink);
    
    return {
      primary: baseLink,
      web: webFallback,
      secure: secureLink.link,
      android: androidIntent,
      sms: this.generateSMSLink(dispute),
      email: this.generateEmailLink(dispute),
      whatsapp: this.generateWhatsAppLink(dispute)
    };
  }
  
  /**
   * Generate QR dispute deep link
   */
  generateQRDisputeLink(
    transaction: any,
    reason: string,
    evidenceCount: number = 0
  ): string {
    return this.deepLinkGenerator.generateQRDisputeDeepLink(transaction, reason, evidenceCount);
  }
  
  /**
   * Parse incoming deep link
   */
  parseDisputeDeepLink(deepLink: string) {
    return this.deepLinkGenerator.parseDeepLink(deepLink);
  }
  
  /**
   * Validate dispute deep link security
   */
  validateDisputeLink(deepLink: string): boolean {
    try {
      const parsed = this.parseDisputeDeepLink(deepLink);
      
      // Basic validation
      if (!parsed.type || parsed.type !== 'dispute') {
        return false;
      }
      
      // Check for required fields
      if (!parsed.disputeId && !parsed.data) {
        return false;
      }
      
      // Validate QR dispute data
      if (parsed.type === 'qr-dispute' && parsed.data) {
        return this.validateQRDisputeData(parsed.data);
      }
      
      return true;
    } catch (error) {
      console.error('Deep link validation failed:', error);
      return false;
    }
  }
  
  /**
   * Get status-specific actions and timeline
   */
  getStatusDetails(status: DisputeStatus): DisputeMatrixRow | undefined {
    return this.getDisputeMatrix().find(row => row.status === status);
  }
  
  /**
   * Generate shareable content for dispute
   */
  generateShareableContent(dispute: Dispute): Record<string, string> {
    const deepLinks = this.generateDisputeDeepLinks(dispute);
    const statusDetails = this.getStatusDetails(dispute.status);
    
    return {
      sms: this.generateSMSTemplate(dispute, deepLinks.primary),
      email: this.generateEmailTemplate(dispute, deepLinks.web),
      whatsapp: this.generateWhatsAppTemplate(dispute, deepLinks.primary),
      clipboard: deepLinks.primary,
      qr: deepLinks.primary
    };
  }
  
  // Private helper methods
  private validateQRDisputeData(data: any): boolean {
    const required = ['t', 'tx', 'mid', 'amt', 'cur', 'ts', 'sig'];
    
    // Check required fields
    for (const field of required) {
      if (!data[field]) {
        return false;
      }
    }
    
    // Verify transaction type
    if (data.t !== 'qr-dispute') {
      return false;
    }
    
    // Basic signature validation (would be more sophisticated in production)
    if (typeof data.sig !== 'string' || data.sig.length < 10) {
      return false;
    }
    
    return true;
  }
  
  private generateSMSLink(dispute: Dispute): string {
    const deepLink = this.deepLinkGenerator.generateDisputeDeepLink(dispute);
    const message = `DuoPlus Dispute ${dispute.id}: ${deepLink}`;
    return `sms:?body=${encodeURIComponent(message)}`;
  }
  
  private generateEmailLink(dispute: Dispute): string {
    const deepLink = this.deepLinkGenerator.generateWebFallbackLink(
      this.deepLinkGenerator.generateDisputeDeepLink(dispute)
    );
    const subject = `DuoPlus Dispute: ${dispute.id}`;
    const body = `View dispute details: ${deepLink}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  
  private generateWhatsAppLink(dispute: Dispute): string {
    const deepLink = this.deepLinkGenerator.generateDisputeDeepLink(dispute);
    const message = `DuoPlus Dispute ${dispute.id}: ${deepLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  
  private generateSMSTemplate(dispute: Dispute, deepLink: string): string {
    return `
DuoPlus Dispute Update: ${dispute.id}

Status: ${dispute.status.replace(/_/g, ' ')}
Merchant: ${dispute.merchantUsername}
Amount: $${dispute.amount}

View details: ${deepLink}

Need help? Reply HELP
    `.trim();
  }
  
  private generateEmailTemplate(dispute: Dispute, webLink: string): string {
    return `
<!DOCTYPE html>
<html>
<body>
  <h2>DuoPlus Dispute Update</h2>
  <p><strong>Dispute ID:</strong> ${dispute.id}</p>
  <p><strong>Status:</strong> ${dispute.status.replace(/_/g, ' ')}</p>
  <p><strong>Merchant:</strong> ${dispute.merchantUsername}</p>
  <p><strong>Amount:</strong> $${dispute.amount}</p>
  
  <p>
    <a href="${webLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
      View Dispute Details
    </a>
  </p>
  
  <hr>
  <p style="color: #666; font-size: 12px;">
    This is an automated message about your DuoPlus dispute.
    Need help? Contact support at support@duoplus.com
  </p>
</body>
</html>
    `.trim();
  }
  
  private generateWhatsAppTemplate(dispute: Dispute, deepLink: string): string {
    return `
DuoPlus Dispute ${dispute.id}

🔍 Status: ${dispute.status.replace(/_/g, ' ')}
🏪 Merchant: ${dispute.merchantUsername}
💰 Amount: $${dispute.amount}

View details: ${deepLink}
    `.trim();
  }
}

export const disputeSystem = new DisputeSystem();
