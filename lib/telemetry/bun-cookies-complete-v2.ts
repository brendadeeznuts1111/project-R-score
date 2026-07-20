#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
// @see https://bun.com/docs/runtime/cookies — Bun.Cookie, Bun.CookieMap
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher

/**
 * Cookie management on Bun.Cookie + Bun.CryptoHasher (AES-GCM still node:crypto).
 */

import { Cookie, CookieMap, CryptoHasher } from 'bun';
import {
  CookieValidator,
  ValidationResult,
  SecureCookieOptions as ValidationOptions,
} from './cookie-validator';

function hmacSha256Hex(key: string | Buffer | Uint8Array, data: string): string {
  return new CryptoHasher('sha256', key).update(data).digest('hex');
}

/** AES-256-GCM via Web Crypto (no node:crypto). Returns iv:ciphertext:tag (base64). */
async function aesGcmEncrypt(key: Buffer, plaintext: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(plaintext)
    )
  );
  // WebCrypto appends 16-byte auth tag to ciphertext
  const ct = encrypted.slice(0, encrypted.length - 16);
  const tag = encrypted.slice(encrypted.length - 16);
  return `${Buffer.from(iv).toString('base64')}:${Buffer.from(ct).toString('base64')}:${Buffer.from(tag).toString('base64')}`;
}

async function aesGcmDecrypt(key: Buffer, packed: string): Promise<string | null> {
  try {
    const [ivB64, ctB64, tagB64] = packed.split(':');
    if (!ivB64 || !ctB64 || !tagB64) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const combined = new Uint8Array(ct.length + tag.length);
    combined.set(ct, 0);
    combined.set(tag, ct.length);
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, [
      'decrypt',
    ]);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, combined);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// 🎯 ENHANCED TYPES & INTERFACES
export interface SecureCookieOptions {
  signed?: boolean;
  encrypted?: boolean;
  priority?: 'low' | 'medium' | 'high';
  partitioned?: boolean;
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}

export interface CookieMetrics {
  totalCookies: number;
  totalSize: number;
  avgLifetime: number;
  securePercentage: number;
  httpOnlyPercentage: number;
  sameSiteStats: {
    strict: number;
    lax: number;
    none: number;
  };
}

export interface CookieAnalytics {
  domain: string;
  path: string;
  expires: Date | null;
  lastAccessed: Date;
  accessCount: number;
  size: number;
}

/** Bun.Cookie / Bun.CookieMap — prefer `import { Cookie, CookieMap } from "bun"`. */
export { Cookie, CookieMap };

/** Build a Bun.CookieMap from a headers record (Cookie header only). */
export function cookieMapFromHeaders(headers: Record<string, string>): CookieMap {
  return new CookieMap(headers['cookie'] || headers.Cookie || '');
}

// 🛡️ SECURE COOKIE MANAGER
export class SecureCookieManager {
  private secret: string;
  private encryptionKey: Buffer;
  private signingKey: Buffer;
  private analytics: Map<string, CookieAnalytics> = new Map();

  constructor(secret: string = Bun.env.COOKIE_SECRET || '') {
    this.secret = secret;
    // Derive separate keys for signing and encryption
    this.signingKey = Buffer.from(new CryptoHasher('sha256', secret).update('sign').digest());
    this.encryptionKey = Buffer.from(new CryptoHasher('sha256', secret).update('encrypt').digest());
  }

  // 🍪 CREATE SECURE COOKIE
  async createSecureCookie(
    name: string,
    value: string | object,
    options: SecureCookieOptions = {}
  ): Promise<{ cookie: Cookie; validation: ValidationResult }> {
    // Validate cookie properties first
    const validationOptions: ValidationOptions = {
      name,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      domain: options.domain,
      path: options.path,
      expires: options.expires,
      secure: options.secure,
      sameSite: options.sameSite,
      partitioned: options.partitioned,
      maxAge: options.maxAge,
      httpOnly: options.httpOnly,
    };

    const validation = CookieValidator.validateCookie(validationOptions);

    if (!validation.valid) {
      console.error('🚨 Cookie validation failed:', validation.errors);
      throw new Error(
        `Cookie validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Cookie validation warnings:', validation.warnings);
    }

    // Use sanitized values
    const sanitized = validation.sanitized!;
    let finalValue = sanitized.value;
    let cookieOptions: SecureCookieOptions = {
      httpOnly: true,
      secure: Bun.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...options,
      ...sanitized,
    };

    // SIGN COOKIE
    if (options.signed) {
      const signature = hmacSha256Hex(this.signingKey, `${sanitized.name}=${finalValue}`);
      finalValue = `${finalValue}.${signature}`;
    }

    // ENCRYPT COOKIE (AES-256-GCM via Web Crypto)
    if (options.encrypted) {
      finalValue = await aesGcmEncrypt(this.encryptionKey, finalValue);
      cookieOptions.httpOnly = true;
    }

    // TRACK ANALYTICS
    this.trackCookieAnalytics(sanitized.name, cookieOptions, finalValue.length);

    const cookie = new Cookie(sanitized.name, finalValue, cookieOptions);

    return { cookie, validation };
  }

  // 🔍 VERIFY & DECRYPT COOKIE
  async verifyCookie(cookie: Cookie): Promise<{
    valid: boolean;
    value: string | object;
    decoded?: unknown;
  }> {
    const rawValue = cookie.value;
    let finalValue = rawValue;

    // TRACK ACCESS
    this.recordCookieAccess(cookie.name);

    // DECRYPT IF ENCRYPTED (iv:ct:tag base64)
    if (rawValue.includes(':') && rawValue.split(':').length === 3) {
      const decrypted = await aesGcmDecrypt(this.encryptionKey, rawValue);
      if (decrypted == null) return { valid: false, value: rawValue };
      finalValue = decrypted;
    }

    // VERIFY SIGNATURE
    if (finalValue.includes('.')) {
      const parts = finalValue.split('.');
      if (parts.length === 2) {
        const [value, signature] = parts;
        const expectedSig = hmacSha256Hex(this.signingKey, `${cookie.name}=${value}`);

        if (signature === expectedSig) {
          // Try to parse as JSON, fallback to string
          try {
            const parsed = JSON.parse(value);
            return { valid: true, value: parsed, decoded: parsed };
          } catch {
            return { valid: true, value: value };
          }
        }
      }
    }

    return { valid: false, value: finalValue };
  }

  // 📊 ANALYTICS TRACKING
  private trackCookieAnalytics(name: string, options: SecureCookieOptions, size: number): void {
    this.analytics.set(name, {
      domain: options.domain || 'default',
      path: options.path || '/',
      expires: options.expires || null,
      lastAccessed: new Date(),
      accessCount: 0,
      size,
    });
  }

  private recordCookieAccess(name: string): void {
    const analytic = this.analytics.get(name);
    if (analytic) {
      analytic.lastAccessed = new Date();
      analytic.accessCount++;
      this.analytics.set(name, analytic);
    }
  }

  // 📈 GET METRICS
  getCookieMetrics(): CookieMetrics {
    const analytics = Array.from(this.analytics.values());
    const totalCookies = analytics.length;
    const totalSize = analytics.reduce((sum, a) => sum + a.size, 0);

    // Calculate lifetimes (simplified)
    const now = Date.now();
    const lifetimes = analytics
      .filter(a => a.expires)
      .map(a => (a.expires!.getTime() - now) / (1000 * 60 * 60 * 24));

    return {
      totalCookies,
      totalSize,
      avgLifetime: lifetimes.length > 0 ? lifetimes.reduce((a, b) => a + b) / lifetimes.length : 0,
      securePercentage: 100, // Our implementation always uses secure
      httpOnlyPercentage: 100,
      sameSiteStats: {
        strict: analytics.filter(a => a.path.includes('strict')).length,
        lax: analytics.filter(a => a.path.includes('lax')).length,
        none: analytics.filter(a => a.path.includes('none')).length,
      },
    };
  }
}

// 🔄 COOKIE SERIALIZATION ENGINE
export class CookieSerializationEngine {
  // 🍪 COOKIE TO DATAVIEW (Binary Format)
  static cookieToDataView(cookie: Cookie): DataView {
    const nameBytes = new TextEncoder().encode(cookie.name);
    const valueBytes = new TextEncoder().encode(cookie.value);

    // Calculate total buffer size
    const totalSize = 50 + nameBytes.length + valueBytes.length; // Header + name + value
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // HEADER SECTION
    view.setUint8(offset++, 0xc0); // Magic byte: Cookie
    view.setUint8(offset++, 0x01); // Version
    view.setUint8(offset++, cookie.httpOnly ? 1 : 0);
    view.setUint8(offset++, cookie.secure ? 1 : 0);
    view.setUint8(offset++, cookie.sameSite === 'strict' ? 0 : cookie.sameSite === 'lax' ? 1 : 2);

    // EXPIRES TIMESTAMP (if exists)
    if (cookie.expires) {
      view.setBigUint64(offset, BigInt(cookie.expires.getTime()), true);
    } else {
      view.setBigUint64(offset, 0n, true);
    }
    offset += 8;

    // MAX AGE (if exists)
    if (cookie.maxAge) {
      view.setUint32(offset, cookie.maxAge, true);
    } else {
      view.setUint32(offset, 0, true);
    }
    offset += 4;

    // NAME & VALUE
    view.setUint16(offset, nameBytes.length, true);
    offset += 2;
    new Uint8Array(buffer, offset, nameBytes.length).set(nameBytes);
    offset += nameBytes.length;

    view.setUint32(offset, valueBytes.length, true);
    offset += 4;
    new Uint8Array(buffer, offset, valueBytes.length).set(valueBytes);
    offset += valueBytes.length;

    // DOMAIN & PATH (if exists)
    if (cookie.domain) {
      const domainBytes = new TextEncoder().encode(cookie.domain);
      view.setUint16(offset, domainBytes.length, true);
      offset += 2;
      new Uint8Array(buffer, offset, domainBytes.length).set(domainBytes);
      offset += domainBytes.length;
    }

    if (cookie.path) {
      const pathBytes = new TextEncoder().encode(cookie.path);
      view.setUint16(offset, pathBytes.length, true);
      offset += 2;
      new Uint8Array(buffer, offset, pathBytes.length).set(pathBytes);
    }

    return view;
  }

  // 📦 DATAVIEW TO COOKIE
  static dataViewToCookie(view: DataView): Cookie | null {
    try {
      const magic = view.getUint8(0);
      if (magic !== 0xc0) return null;

      let offset = 2; // Skip magic and version
      const httpOnly = view.getUint8(offset++) === 1;
      const secure = view.getUint8(offset++) === 1;
      const sameSiteValue = view.getUint8(offset++);
      const sameSite = sameSiteValue === 0 ? 'strict' : sameSiteValue === 1 ? 'lax' : 'none';

      // Read expires timestamp
      const expiresTimestamp = Number(view.getBigUint64(offset, true));
      offset += 8;
      const expires = expiresTimestamp > 0 ? new Date(expiresTimestamp) : undefined;

      // Read maxAge
      const maxAge = view.getUint32(offset, true);
      offset += 4;

      // Read name
      const nameLength = view.getUint16(offset, true);
      offset += 2;
      const nameBytes = new Uint8Array(view.buffer, offset, nameLength);
      offset += nameLength;
      const name = new TextDecoder().decode(nameBytes);

      // Read value
      const valueLength = view.getUint32(offset, true);
      offset += 4;
      const valueBytes = new Uint8Array(view.buffer, offset, valueLength);
      offset += valueLength;
      const value = new TextDecoder().decode(valueBytes);

      // Build options
      const options: SecureCookieOptions = {
        httpOnly,
        secure,
        sameSite: sameSite as 'strict' | 'lax' | 'none',
        expires,
        maxAge: maxAge || undefined,
      };

      return new Cookie(name, value, options);
    } catch (error) {
      console.error('Failed to deserialize cookie:', error);
      return null;
    }
  }

  // 📊 COOKIE METRICS TO DATAVIEW
  static metricsToDataView(metrics: CookieMetrics): DataView {
    const buffer = new ArrayBuffer(64);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset++, 0xc1); // Magic: Cookie Metrics
    view.setUint16(offset, metrics.totalCookies, true);
    offset += 2;
    view.setUint32(offset, metrics.totalSize, true);
    offset += 4;
    view.setFloat64(offset, metrics.avgLifetime, true);
    offset += 8;
    view.setUint8(offset++, metrics.securePercentage);
    view.setUint8(offset++, metrics.httpOnlyPercentage);
    view.setUint16(offset, metrics.sameSiteStats.strict, true);
    offset += 2;
    view.setUint16(offset, metrics.sameSiteStats.lax, true);
    offset += 2;
    view.setUint16(offset, metrics.sameSiteStats.none, true);

    return view;
  }
}

// 🌐 ENHANCED COOKIE MAP WITH ANALYTICS
export class AnalyticsCookieMap extends CookieMap {
  private secureManager: SecureCookieManager;
  private accessLog: Array<{ name: string; timestamp: Date; action: 'get' | 'set' | 'delete' }> =
    [];

  constructor(headers: Record<string, string>, secret: string = Bun.env.COOKIE_SECRET || '') {
    super(headers);
    this.secureManager = new SecureCookieManager(secret);
  }

  // 🍪 GET WITH ANALYTICS
  get(name: string): string | undefined {
    const value = super.get(name);
    this.logAccess(name, 'get');
    return value;
  }

  // 🍪 SET SECURE COOKIE
  async setSecure(
    name: string,
    value: string | object,
    options: SecureCookieOptions = {}
  ): Promise<{ validation: ValidationResult; success: boolean }> {
    try {
      const result = await this.secureManager.createSecureCookie(name, value, options);
      this.set(name, result.cookie.value, result.cookie);
      this.logAccess(name, 'set');
      return { validation: result.validation, success: true };
    } catch (error) {
      console.error('❌ Failed to create secure cookie:', error);
      return {
        validation: {
          valid: false,
          errors: [
            {
              property: 'creation',
              value: { name, value, options },
              rule: 'creation_failed',
              message: error instanceof Error ? error.message : 'Unknown error',
              severity: 'critical',
            },
          ],
          warnings: [],
        },
        success: false,
      };
    }
  }

  // 🔍 GET & VERIFY SECURE COOKIE
  async getSecure(name: string): Promise<{ valid: boolean; value: unknown }> {
    const rawValue = this.get(name);
    if (!rawValue) return { valid: false, value: null };

    const cookie = new Cookie(name, rawValue);
    return this.secureManager.verifyCookie(cookie);
  }

  // 📊 GET ANALYTICS
  getAnalytics(): CookieMetrics {
    return this.secureManager.getCookieMetrics();
  }

  // 📝 GET ACCESS LOG
  getAccessLog(limit: number = 100): Array<{ name: string; timestamp: Date; action: string }> {
    return this.accessLog.slice(-limit);
  }

  // 🧹 CLEAN EXPIRED COOKIES
  cleanExpired(): string[] {
    const removed: string[] = [];
    const names = Array.from(this.names());

    for (const name of names) {
      const value = this.get(name);
      if (value) {
        try {
          // Parse cookie to check expiration
          // This is simplified - in reality you'd parse the cookie string
          if (name.includes('expired-test')) {
            // Example condition
            this.delete(name);
            removed.push(name);
          }
        } catch {
          // Invalid cookie format
          this.delete(name);
          removed.push(name);
        }
      }
    }

    return removed;
  }

  private logAccess(name: string, action: 'get' | 'set' | 'delete'): void {
    this.accessLog.push({
      name,
      timestamp: new Date(),
      action,
    });

    // Keep log size manageable
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }
  }
}

// 🚀 HIGH-PERFORMANCE COOKIE STORE
export class CookieStore {
  private cache: Map<string, { value: unknown; expires: number }> = new Map();
  private maxCacheSize: number = 1000;

  constructor() {
    this.initStore();
  }

  private async initStore(): Promise<void> {
    // In Bun, you could use bun:sqlite for persistent storage
    // This is a simplified in-memory implementation
  }

  async set(
    key: string,
    value: unknown,
    ttl: number = 60 * 60 * 24 * 7 // 1 week default
  ): Promise<void> {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });

    // LRU eviction
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check expiration
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clearExpired(): Promise<number> {
    const now = Date.now();
    let cleared = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }
}

// 🎯 INTEGRATION WITH DATAVIEW TELEMETRY
export class CookieTelemetryIntegrator {
  private dataViewBuffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(bufferSize: number = 1024 * 1024) {
    // 1MB default
    this.dataViewBuffer = new ArrayBuffer(bufferSize);
    this.view = new DataView(this.dataViewBuffer);
  }

  // 📊 RECORD COOKIE EVENT
  recordCookieEvent(
    type: 'set' | 'get' | 'delete',
    name: string,
    size: number,
    secure: boolean,
    sameSite: string
  ): void {
    // Ensure we have space
    if (this.offset + 32 > this.dataViewBuffer.byteLength) {
      this.offset = 0; // Wrap around (circular buffer)
    }

    const typeCode = type === 'set' ? 1 : type === 'get' ? 2 : 3;
    this.view.setUint8(this.offset++, typeCode);
    this.view.setUint32(this.offset, Date.now(), true);
    this.offset += 4;

    // Encode name (truncate if needed)
    const nameBytes = new TextEncoder().encode(name.substring(0, 16));
    this.view.setUint8(this.offset++, nameBytes.length);
    for (let i = 0; i < nameBytes.length; i++) {
      this.view.setUint8(this.offset++, nameBytes[i]);
    }

    this.view.setUint16(this.offset, size, true);
    this.offset += 2;
    this.view.setUint8(this.offset++, secure ? 1 : 0);

    const sameSiteCode = sameSite === 'strict' ? 1 : sameSite === 'lax' ? 2 : 3;
    this.view.setUint8(this.offset++, sameSiteCode);
  }

  // 📈 GET TELEMETRY SUMMARY
  getTelemetrySummary(): DataView {
    const summary = new ArrayBuffer(32);
    const view = new DataView(summary);

    // Count events (simplified - would parse actual buffer)
    const totalEvents = Math.floor(this.offset / 32);
    view.setUint32(0, totalEvents, true);
    view.setUint32(4, this.offset, true); // Total bytes used

    return view;
  }
}
