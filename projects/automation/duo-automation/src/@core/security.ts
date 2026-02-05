import { createHash } from 'crypto';

export class SecurityManager {
  private secret: string;

  constructor(secret?: string) {
    const providedSecret = secret || process.env.SECURITY_SECRET;
    
    if (!providedSecret) {
      throw new Error('Security secret is required. Set SECURITY_SECRET environment variable or provide secret parameter.');
    }
    
    if (providedSecret.length < 32) {
      throw new Error('Security secret must be at least 32 characters long for adequate security.');
    }
    
    this.secret = providedSecret;
  }

  generateSignature(payload: Record<string, any>): string {
    const sorted = Object.keys(payload)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join('&');
    
    return this.hash(`${sorted}${this.secret}`);
  }

  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateAPIKey(prefix: string = 'emp'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/[<>"'&]/g, '') // Remove HTML entities
      .replace(/javascript:/gi, '') // Remove JavaScript protocol
      .replace(/data:/gi, '') // Remove data protocol
      .replace(/vbscript:/gi, '') // Remove VBScript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 1000);
  }

  validatePhone(phone: string): boolean {
    const regex = /^\+\d{1,15}$/;
    if (!regex.test(phone)) return false;
    
    const digits = phone.substring(1);
    if (digits.length < 4 || digits.length > 15) return false;
    if (/^0+$/.test(digits)) return false;
    if (/^1234567890$/.test(digits)) return false;
    
    return true;
  }

  rateLimitCheck(key: string, limit: number, windowMs: number): boolean {
    // Simplified rate limiting - in production use Redis
    return true;
  }

  verifySignature(payload: Record<string, any>, signature: string): boolean {
    const expected = this.generateSignature(payload);
    return this.constantTimeCompare(expected, signature);
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

export class TokenManager {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'default-jwt-secret';
  }

  generateToken(payload: Record<string, any>, expiresIn: string = '24h'): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const expires = this.parseExpires(expiresIn);
    
    const claims = {
      ...payload,
      iat: now,
      exp: now + expires
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = this.sign(`${encodedHeader}.${encodedClaims}`);

    return `${encodedHeader}.${encodedClaims}.${signature}`;
  }

  verifyToken(token: string): Record<string, any> | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedClaims, signature] = parts;
    
    // Verify signature
    const expectedSignature = this.sign(`${encodedHeader}.${encodedClaims}`);
    if (!signature || !this.constantTimeCompare(signature, expectedSignature)) {
      return null;
    }

    // Parse claims
    if (!encodedClaims) return null;
    const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString());
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < now) {
      return null;
    }

    return claims;
  }

  private sign(data: string): string {
    const hmac = createHash('sha256');
    hmac.update(data + this.secret);
    return hmac.digest('base64url');
  }

  private parseExpires(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 86400; // 24 hours default
    }
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}
