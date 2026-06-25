// src/deeplinks/deeplink-generator.ts
import { createHash, randomBytes } from 'crypto';
import { Buffer } from 'buffer';

export interface Dispute {
  id: string;
  status: DisputeStatus;
  createdAt: Date;
  customerId: string;
  merchantId: string;
  merchantUsername: string;
  amount: number;
  transactionId?: string;
  venmoDisputeId?: string;
  updatedAt: Date;
  lastMessage?: string;
}

export interface QRTransaction {
  id: string;
  merchantUsername: string;
  amount: number;
  currency: string;
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface QRDisputeRequest {
  transactionId: string;
  merchantUsername: string;
  amount: number;
  currency: string;
  location?: {
    lat: number;
    lng: number;
  };
  reason: string;
  evidenceCount: number;
  signature: string;
}

export interface ParsedDeepLink {
  type: string;
  action?: string;
  disputeId?: string;
  data?: any;
  source?: string;
  venmoCaseId?: string;
  transactionId?: string;
  customerHash?: string;
  timestamp?: number;
}

export interface DisputeDeepLink extends ParsedDeepLink {
  type: 'dispute';
  disputeId: string;
  status?: string;
  action: string;
  venmoCaseId?: string;
  transactionId?: string;
  customerHash?: string;
  timestamp: number;
}

export interface SecureDeepLink {
  link: string;
  expiresAt: Date;
  token: string;
  oneTimeUse: boolean;
  webFallback: string;
}

export interface SignedDeepLink {
  url: string;
  encodedUrl: string;
  signature: string;
  expiresAt?: Date;
  webFallback: string;
}

export interface ValidationResult {
  valid: boolean;
  decodedUrl?: string;
  payload?: any;
  metadata?: {
    host: string;
    path: string;
    queryParams: Record<string, string>;
    timestamp: string;
  };
  error?: string;
}

export enum DisputeStatus {
  SUBMITTED = 'SUBMITTED',
  MERCHANT_REVIEW = 'MERCHANT_REVIEW',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  VENMO_ESCALATION = 'VENMO_ESCALATION',
  RESOLVED_REFUND = 'RESOLVED_REFUND',
  RESOLVED_DENIED = 'RESOLVED_DENIED',
  SUSPENDED_FRAUD = 'SUSPENDED_FRAUD'
}

const ALLOWED_HOSTS = ['dispute', 'payment', 'family'];

export class DeepLinkGenerator {
  private readonly secretKey: string;
  
  constructor(secretKey: string = process.env.DEEPLINK_SECRET || 'default-secret') {
    this.secretKey = secretKey;
  }
  
  // Generate dispute deep links with proper encoding
  generateDisputeDeepLink(dispute: Dispute, action?: string): string {
    const base = `duoplus://dispute`;
    
    // URI-encoded parameters
    const params = new URLSearchParams({
      id: dispute.id,
      status: dispute.status.toLowerCase().replace(/_/g, '-'),
      timestamp: dispute.createdAt.getTime().toString(),
      v: '2.0' // Version
    });
    
    if (action) params.append('action', action);
    if (dispute.venmoDisputeId) params.append('venmo', dispute.venmoDisputeId);
    if (dispute.transactionId) params.append('tx', dispute.transactionId);
    
    // Add customer context (encrypted for privacy)
    if (dispute.customerId) {
      const customerHash = this.hashCustomerId(dispute.customerId);
      params.append('cust', customerHash);
    }
    
    // Create the full URL with encoded parameters
    const fullUrl = `${base}/${dispute.id}?${params.toString()}`;
    
    // URI encode the entire thing for SMS/email
    return encodeURIComponent(fullUrl);
  }
  
  // Generate QR-specific dispute links
  generateQRDisputeDeepLink(
    transaction: QRTransaction,
    reason: string,
    evidenceCount: number
  ): string {
    const disputeData = {
      t: 'qr-dispute',
      tx: transaction.id,
      mid: transaction.merchantUsername.replace('@', ''), // Remove @ symbol
      amt: transaction.amount,
      cur: transaction.currency,
      ts: transaction.timestamp,
      loc: transaction.location ? 
           `${transaction.location.lat},${transaction.location.lng}` : '',
      r: this.abbreviateReason(reason),
      e: evidenceCount,
      sig: this.generateTransactionSignature(transaction)
    };
    
    // Convert to base64 for compact representation
    const dataString = JSON.stringify(disputeData);
    const encodedData = Buffer.from(dataString).toString('base64url'); // URL-safe base64
    
    return `duoplus://dispute/qr/${encodedData}`;
  }
  
  // Parse incoming deep links
  parseDeepLink(deepLink: string): ParsedDeepLink {
    const decoded = decodeURIComponent(deepLink);
    
    // Handle duoplus:// URLs by adding a dummy host for URL parsing
    let urlToParse = decoded;
    if (decoded.startsWith('duoplus://')) {
      urlToParse = decoded.replace('duoplus://', 'http://duoplus/');
    }
    
    const url = new URL(urlToParse);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    switch (pathParts[0]) {
      case 'dispute':
        return this.parseDisputeDeepLink(pathParts, url.searchParams);
      case 'payment':
        return this.parsePaymentDeepLink(pathParts, url.searchParams);
      case 'family':
        return this.parseFamilyDeepLink(pathParts, url.searchParams);
      default:
        throw new Error('Unknown deep link type');
    }
  }
  
  private parseDisputeDeepLink(pathParts: string[], params: URLSearchParams): DisputeDeepLink {
    const type = pathParts[1];
    
    if (type === 'qr') {
      // Decode base64url data
      const encodedData = pathParts[2];
      const decodedData = Buffer.from(encodedData, 'base64url').toString('utf8');
      const data = JSON.parse(decodedData);
      
      return {
        type: 'qr-dispute',
        data,
        action: params.get('action') || 'view',
        source: 'qr-code'
      } as DisputeDeepLink;
    } else {
      // Regular dispute link
      const disputeId = pathParts[1];
      
      return {
        type: 'dispute',
        disputeId,
        status: params.get('status'),
        action: params.get('action') || 'view',
        venmoCaseId: params.get('venmo'),
        transactionId: params.get('tx'),
        customerHash: params.get('cust'),
        timestamp: parseInt(params.get('timestamp') || '0')
      } as DisputeDeepLink;
    }
  }
  
  private parsePaymentDeepLink(pathParts: string[], params: URLSearchParams): ParsedDeepLink {
    return {
      type: 'payment',
      action: pathParts[1] || 'view',
      data: Object.fromEntries(params)
    };
  }
  
  private parseFamilyDeepLink(pathParts: string[], params: URLSearchParams): ParsedDeepLink {
    return {
      type: 'family',
      action: pathParts[1] || 'view',
      data: Object.fromEntries(params)
    };
  }
  
  // Generate web fallback links (for email/SMS)
  generateWebFallbackLink(deepLink: string): string {
    const encodedDeepLink = encodeURIComponent(deepLink);
    return `https://duoplus.com/deeplink/redirect?target=${encodedDeepLink}&platform=web`;
  }
  
  // Generate one-time use links with expiration
  generateSecureDisputeLink(dispute: Dispute, expiresInHours: number = 24): SecureDeepLink {
    const token = this.generateSecureToken(dispute.id, expiresInHours);
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
    
    const link = `duoplus://dispute/secure/${dispute.id}?token=${token}&expires=${expiresAt}`;
    const encodedLink = encodeURIComponent(link);
    
    return {
      link: encodedLink,
      expiresAt: new Date(expiresAt),
      token,
      oneTimeUse: true,
      webFallback: `https://duoplus.com/disputes/secure/${dispute.id}?token=${token}` 
    };
  }
  
  // Android deep link handler
  generateAndroidIntentURI(deepLink: string): string {
    const encoded = encodeURIComponent(deepLink);
    const fallbackUrl = encodeURIComponent('https://duoplus.com/fallback');
    return `intent://duoplus/launch#Intent;scheme=duoplus;package=com.duoplus.app;S.browser_fallback_url=${fallbackUrl};end`;
  }
  
  // Helper methods
  private hashCustomerId(customerId: string): string {
    return createHash('sha256').update(customerId + this.secretKey).digest('hex').substring(0, 16);
  }
  
  private abbreviateReason(reason: string): string {
    const reasonMap: Record<string, string> = {
      'wrong-item': 'wi',
      'damaged-item': 'di',
      'not-delivered': 'nd',
      'overcharged': 'oc',
      'duplicate-charge': 'dc',
      'fraudulent': 'fr',
      'other': 'ot'
    };
    return reasonMap[reason.toLowerCase()] || 'ot';
  }
  
  private generateTransactionSignature(transaction: QRTransaction): string {
    const data = `${transaction.id}:${transaction.amount}:${transaction.timestamp}:${this.secretKey}`;
    return createHash('sha256').update(data).digest('hex');
  }
  
  private generateSecureToken(disputeId: string, expiresInHours: number): string {
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
    const data = `${disputeId}:${expiresAt}:${randomBytes(16).toString('hex')}`;
    return createHash('sha256').update(data + this.secretKey).digest('hex');
  }
  
  expandReasonCode(code: string): string {
    const reasonMap: Record<string, string> = {
      'wi': 'wrong-item',
      'di': 'damaged-item',
      'nd': 'not-delivered',
      'oc': 'overcharged',
      'dc': 'duplicate-charge',
      'fr': 'fraudulent',
      'ot': 'other'
    };
    return reasonMap[code.toLowerCase()] || 'other';
  }
}

// Example encoded deep links
export const examples = {
  // Simple dispute view
  simple: 'duoplus%3A%2F%2Fdispute%2FDSP-12345',
  
  // Dispute with action
  withAction: 'duoplus%3A%2F%2Fdispute%2FDSP-12345%2Fadd-evidence%3Faction%3Dupload',
  
  // QR dispute with encoded data
  qrDispute: 'duoplus%3A%2F%2Fdispute%2Fqr%2FewogICJ0IjogInFyLWRpc3B1dGUiLAogICJ0eCI6ICJUVi03ODkwMTIiLAogICJtaWQiOiAiY29mZmVlLXNob3AiLAogICJhbXQiOiAxMi41MCwKICAiY3VyIjogIlVTRCIsCiAgInRzIjogMTY5MDAwMDAwMDAwMCwKICAibG9jIjogIjM3Ljc3NDksLTEyMi40MTk0IiwKICAiciI6ICJ3cm9uZy1pdGVtIiwKICAiZSI6IDIsCiAgInNpZyI6ICJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejEyMzQ1Njc4OTAiCn0%3D',
  
  // Secure one-time link
  secure: 'duoplus%3A%2F%2Fdispute%2Fsecure%2FDSP-12345%3Ftoken%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9%26expires%3D1690560000000'
};

export default DeepLinkGenerator;
