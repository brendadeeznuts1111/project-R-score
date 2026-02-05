// src/security/deeplink-validator.ts
import { createHash, createHmac } from 'crypto';
import { ParsedDeepLink, ValidationResult } from '../deeplinks/deeplink-generator';

const ALLOWED_HOSTS = ['dispute', 'payment', 'family'];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class DeepLinkValidator {
  private readonly secretKey: string;
  private readonly rateLimitMap: Map<string, RateLimitEntry> = new Map();
  
  constructor(secretKey: string = process.env.DEEPLINK_SECRET || 'default-secret') {
    this.secretKey = secretKey;
  }
  
  validateDeepLink(deepLink: string): ValidationResult {
    try {
      const decoded = decodeURIComponent(deepLink);
      const url = new URL(decoded);
      
      // Validate scheme and host
      if (url.protocol !== 'factory-wager:') {
        return { valid: false, error: 'Invalid scheme' };
      }
      
      if (!ALLOWED_HOSTS.includes(url.host)) {
        return { valid: false, error: 'Invalid host' };
      }
      
      // Validate signature if present
      const signature = url.searchParams.get('sig');
      if (signature && !this.validateSignature(url, signature)) {
        return { valid: false, error: 'Invalid signature' };
      }
      
      // Check expiration
      const expires = url.searchParams.get('expires');
      if (expires && parseInt(expires) < Date.now()) {
        return { valid: false, error: 'Link expired' };
      }
      
      // Check rate limiting
      if (!this.checkRateLimit(url)) {
        return { valid: false, error: 'Rate limit exceeded' };
      }
      
      // Validate payload structure
      const payload = this.extractPayload(url);
      if (!this.validatePayload(payload)) {
        return { valid: false, error: 'Invalid payload' };
      }
      
      return {
        valid: true,
        decodedUrl: decoded,
        payload,
        metadata: {
          host: url.host,
          path: url.pathname,
          queryParams: Object.fromEntries(url.searchParams),
          timestamp: url.searchParams.get('ts') || Date.now().toString()
        }
      };
      
    } catch (error) {
      return { valid: false, error: 'Malformed URL' };
    }
  }
  
  // Generate signed deep links
  generateSignedDeepLink(payload: any, expiresIn?: number): SignedDeepLink {
    const baseUrl = `factory-wager://${payload.type}/${payload.id}`;
    const params = new URLSearchParams();
    
    // Add payload data
    Object.entries(payload.data || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    // Add metadata
    params.append('ts', Date.now().toString());
    params.append('v', '2.0');
    
    if (expiresIn) {
      const expires = Date.now() + expiresIn;
      params.append('expires', expires.toString());
    }
    
    // Generate signature
    const stringToSign = `${baseUrl}?${params.toString()}`;
    const signature = this.generateSignature(stringToSign);
    params.append('sig', signature);
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    const encodedUrl = encodeURIComponent(fullUrl);
    
    return {
      url: fullUrl,
      encodedUrl,
      signature,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
      webFallback: `https://factory-wager.com/verify?link=${encodedUrl}` 
    };
  }
  
  // Android intent validation
  validateAndroidIntent(intentUri: string): boolean {
    // Parse intent URI
    const intentPattern = /^intent:\/\/(.*?)#Intent;(.*?);end$/;
    const match = intentUri.match(intentPattern);
    
    if (!match) return false;
    
    const params = match[2].split(';').reduce((acc, param) => {
      const [key, value] = param.split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    // Verify package
    if (params.package !== 'com.factory-wager.app') {
      return false;
    }
    
    // Verify scheme
    if (params.scheme !== 'factory-wager') {
      return false;
    }
    
    // Verify signature if present
    if (params.signature) {
      return this.verifyAndroidSignature(params);
    }
    
    return true;
  }
  
  // Verify QR dispute data signature
  verifyQRDisputeSignature(data: any): boolean {
    if (!data.sig) return false;
    
    const expectedSignature = this.generateTransactionSignature(data);
    return data.sig === expectedSignature;
  }
  
  private validateSignature(url: URL, signature: string): boolean {
    const stringToSign = `${url.pathname}?${url.searchParams.toString().replace(/&sig=[^&]*/, '')}`;
    const expectedSignature = this.generateSignature(stringToSign);
    return signature === expectedSignature;
  }
  
  private generateSignature(data: string): string {
    return createHmac('sha256', this.secretKey).update(data).digest('hex');
  }
  
  private generateTransactionSignature(data: any): string {
    const signatureData = `${data.tx}:${data.amt}:${data.ts}:${this.secretKey}`;
    return createHash('sha256').update(signatureData).digest('hex');
  }
  
  private checkRateLimit(url: URL): boolean {
    const key = `${url.host}:${url.pathname}`;
    const now = Date.now();
    
    const entry = this.rateLimitMap.get(key);
    
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
      // Reset or create new entry
      this.rateLimitMap.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    
    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  private extractPayload(url: URL): any {
    const pathParts = url.pathname.split('/').filter(p => p);
    const params = Object.fromEntries(url.searchParams);
    
    return {
      type: pathParts[0],
      id: pathParts[1],
      action: pathParts[2],
      params
    };
  }
  
  private validatePayload(payload: any): boolean {
    // Basic structure validation
    if (!payload.type || !payload.id) {
      return false;
    }
    
    // Type-specific validation
    switch (payload.type) {
      case 'dispute':
        return this.validateDisputePayload(payload);
      case 'payment':
        return this.validatePaymentPayload(payload);
      case 'family':
        return this.validateFamilyPayload(payload);
      default:
        return false;
    }
  }
  
  private validateDisputePayload(payload: any): boolean {
    // Dispute ID should start with DSP-
    if (!payload.id.startsWith('DSP-')) {
      return false;
    }
    
    // Action should be valid
    const validActions = ['view', 'add-evidence', 'message', 'escalate', 'resolve'];
    if (payload.action && !validActions.includes(payload.action)) {
      return false;
    }
    
    return true;
  }
  
  private validatePaymentPayload(payload: any): boolean {
    // Payment ID should be valid
    if (!payload.id || payload.id.length < 5) {
      return false;
    }
    
    return true;
  }
  
  private validateFamilyPayload(payload: any): boolean {
    // Family ID should be valid
    if (!payload.id || payload.id.length < 3) {
      return false;
    }
    
    return true;
  }
  
  private verifyAndroidSignature(params: Record<string, string>): boolean {
    // Android signature verification logic
    const signature = params.signature;
    const data = params.package + params.scheme + params.S?.browser_fallback_url;
    
    const expectedSignature = this.generateSignature(data);
    return signature === expectedSignature;
  }
}

export interface SignedDeepLink {
  url: string;
  encodedUrl: string;
  signature: string;
  expiresAt?: Date;
  webFallback: string;
}

export default DeepLinkValidator;
