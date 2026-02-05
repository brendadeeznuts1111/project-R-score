/**
 * 🔐 Crypto Utilities - FactoryWager Venmo Family System
 * Encryption and decryption utilities for sensitive data
 */

import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * 🔐 Encryption/Decryption Functions
 */
export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * 🔐 Encrypt data using AES-256-GCM
   */
  static async encrypt(data: string, key: string): Promise<string> {
    try {
      // Derive a proper key from the provided key
      const derivedKey = createHash('sha256').update(key).digest();
      
      // Generate random IV
      const iv = randomBytes(this.IV_LENGTH);
      
      // Create cipher
      const cipher = createCipheriv(this.ALGORITHM, derivedKey, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
      
      return combined;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 🔓 Decrypt data using AES-256-GCM
   */
  static async decrypt(encryptedData: string, key: string): Promise<string> {
    try {
      // Derive the same key
      const derivedKey = createHash('sha256').update(key).digest();
      
      // Extract IV, tag, and encrypted data
      const iv = Buffer.from(encryptedData.substring(0, this.IV_LENGTH * 2), 'hex');
      const tag = Buffer.from(encryptedData.substring(this.IV_LENGTH * 2, (this.IV_LENGTH + this.TAG_LENGTH) * 2), 'hex');
      const encrypted = encryptedData.substring((this.IV_LENGTH + this.TAG_LENGTH) * 2);
      
      // Create decipher
      const decipher = createDecipheriv(this.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 🔑 Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * 🔍 Create hash of data
   */
  static hash(data: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  /**
   * 🏷️ Create HMAC signature
   */
  static sign(data: string, key: string, algorithm: string = 'sha256'): string {
    return createHmac(algorithm, key).update(data).digest('hex');
  }

  /**
   * ✅ Verify HMAC signature
   */
  static verify(data: string, signature: string, key: string, algorithm: string = 'sha256'): boolean {
    const expectedSignature = this.sign(data, key, algorithm);
    return this.timingSafeEqual(signature, expectedSignature);
  }

  /**
   * ⏱️ Timing-safe string comparison
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * 🔐 Generate key pair for asymmetric encryption
   */
  static generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    // This would use node:crypto's generateKeyPairSync in a real implementation
    // For demo purposes, return mock keys
    return {
      publicKey: this.generateToken(64),
      privateKey: this.generateToken(64)
    };
  }

  /**
   * 🧾 Generate secure session ID
   */
  static generateSessionId(): string {
    const timestamp = Date.now().toString();
    const random = this.generateToken(16);
    return this.hash(timestamp + random);
  }

  /**
   * 🔍 Hash password securely
   */
  static async hashPassword(password: string, salt?: string): Promise<{
    hash: string;
    salt: string;
  }> {
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(password + actualSalt)
      .digest('hex');
    
    return { hash, salt: actualSalt };
  }

  /**
   * ✅ Verify password against hash
   */
  static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const { hash: computedHash } = await this.hashPassword(password, salt);
    return this.timingSafeEqual(hash, computedHash);
  }

  /**
   * 🔐 Encrypt JSON object
   */
  static async encryptJSON(obj: any, key: string): Promise<string> {
    const jsonString = JSON.stringify(obj);
    return await this.encrypt(jsonString, key);
  }

  /**
   * 🔓 Decrypt JSON object
   */
  static async decryptJSON<T = any>(encryptedData: string, key: string): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, key);
    return JSON.parse(jsonString);
  }

  /**
   * 🏷️ Create secure checksum for file integrity
   */
  static createFileChecksum(data: Buffer | string): string {
    const hash = createHash('sha256');
    if (Buffer.isBuffer(data)) {
      hash.update(data);
    } else {
      hash.update(data);
    }
    return hash.digest('hex');
  }

  /**
   * 🔐 Derive key from password using PBKDF2
   */
  static deriveKey(password: string, salt: string, iterations: number = 100000): Buffer {
    const { pbkdf2Sync } = require('crypto');
    return pbkdf2Sync(password, salt, iterations, this.KEY_LENGTH, 'sha256');
  }

  /**
   * 🎯 Generate deterministic ID from data
   */
  static generateDeterministicId(data: string): string {
    return createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }
}

/**
 * 🔐 Convenience exports
 */
export const encrypt = CryptoUtils.encrypt.bind(CryptoUtils);
export const decrypt = CryptoUtils.decrypt.bind(CryptoUtils);
export const generateToken = CryptoUtils.generateToken.bind(CryptoUtils);
export const hash = CryptoUtils.hash.bind(CryptoUtils);
export const sign = CryptoUtils.sign.bind(CryptoUtils);
export const verify = CryptoUtils.verify.bind(CryptoUtils);

/**
 * 🔐 Security Utilities
 */
export class SecurityUtils {
  /**
   * 🛡️ Sanitize input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * 📧 Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 📱 Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * 💰 Validate amount format
   */
  static isValidAmount(amount: string | number): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num > 0 && num <= 999999.99;
  }

  /**
   * 🏷️ Validate transaction ID format
   */
  static isValidTransactionId(id: string): boolean {
    const idRegex = /^[A-Z0-9]{8,}$/;
    return idRegex.test(id);
  }

  /**
   * 🔍 Check for potential SQL injection
   */
  static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/|;|'|")/,
      /\bOR\b.*\b=\b.*\bOR\b/i,
      /\bAND\b.*\b=\b.*\bAND\b/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 🛡️ Rate limiting helper
   */
  static createRateLimiter(maxRequests: number, windowMs: number): {
    isAllowed: (identifier: string) => boolean;
    reset: (identifier: string) => void;
  } {
    const requests = new Map<string, { count: number; resetTime: number }>();
    
    return {
      isAllowed: (identifier: string) => {
        const now = Date.now();
        const userRequests = requests.get(identifier);
        
        if (!userRequests || now > userRequests.resetTime) {
          requests.set(identifier, {
            count: 1,
            resetTime: now + windowMs
          });
          return true;
        }
        
        if (userRequests.count >= maxRequests) {
          return false;
        }
        
        userRequests.count++;
        return true;
      },
      
      reset: (identifier: string) => {
        requests.delete(identifier);
      }
    };
  }

  /**
   * 🔐 Generate API key
   */
  static generateAPIKey(): string {
    const prefix = 'dp_'; // FactoryWager prefix
    const key = CryptoUtils.generateToken(32);
    return prefix + key;
  }

  /**
   * 🎯 Extract domain from email
   */
  static extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : '';
  }

  /**
   * 📊 Generate fingerprint for browser/device
   */
  static generateFingerprint(userAgent: string, ip: string): string {
    return CryptoUtils.hash(userAgent + ip + Date.now());
  }
}

/**
 * 🔐 Example Usage
 */

// Example encryption/decryption:
/*
const sensitiveData = "user-token-123";
const encryptionKey = "my-secret-key";

// Encrypt
const encrypted = await encrypt(sensitiveData, encryptionKey);
console.log('Encrypted:', encrypted);

// Decrypt
const decrypted = await decrypt(encrypted, encryptionKey);
console.log('Decrypted:', decrypted);

// Hash password
const { hash: passwordHash, salt } = await CryptoUtils.hashPassword("my-password");
console.log('Password hash:', passwordHash);

// Verify password
const isValid = await CryptoUtils.verifyPassword("my-password", passwordHash, salt);
console.log('Password valid:', isValid);
*/
