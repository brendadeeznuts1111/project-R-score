/**
 * Cookie Manager with Bun-Native APIs
 * 
 * Features:
 * - Bun.cookieMap() for efficient cookie handling
 * - Cookie compression for large payloads
 * - Telemetry cookie management
 * - CSRF protection integration
 */

import { compressData, decompressData } from './bun-enhanced';

export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}

export interface CompressedCookie {
  data: string;
  compressed: boolean;
  algorithm: 'zstd' | 'gzip' | 'none';
  originalSize: number;
  compressedSize: number;
}

export interface TelemetryData {
  sessionId: string;
  timestamp: number;
  events: TelemetryEvent[];
  metrics: Record<string, number>;
}

export interface TelemetryEvent {
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * Cookie Manager class using Bun's native APIs
 */
export class CookieManager {
  private cookieMap: Map<string, string>;
  private compressionThreshold: number;

  constructor(compressionThreshold = 4096) {
    // @ts-ignore - Bun.cookieMap is available in Bun runtime
    this.cookieMap = new Bun.CookieMap();
    this.compressionThreshold = compressionThreshold;
  }

  /**
   * Set a cookie with optional compression
   */
  set(name: string, value: string, options: CookieOptions = {}): void {
    // Check if value needs compression
    if (value.length > this.compressionThreshold) {
      const compressed = this.compressCookie(value);
      this.cookieMap.set(name, JSON.stringify(compressed), options);
    } else {
      this.cookieMap.set(name, value, options);
    }
  }

  /**
   * Get a cookie with automatic decompression
   */
  get(name: string): string | null {
    const value = this.cookieMap.get(name);
    if (!value) return null;

    // Check if it's a compressed cookie
    try {
      const parsed = JSON.parse(value);
      if (parsed.compressed) {
        return this.decompressCookie(parsed);
      }
    } catch {
      // Not JSON, return as-is
    }

    return value;
  }

  /**
   * Compress cookie data
   */
  private compressCookie(data: string): CompressedCookie {
    const originalSize = data.length;
    
    // Try zstd first (best compression/speed ratio)
    try {
      const compressed = compressData(data, 'zstd');
      const base64 = Buffer.from(compressed).toString('base64');
      
      return {
        data: base64,
        compressed: true,
        algorithm: 'zstd',
        originalSize,
        compressedSize: base64.length,
      };
    } catch {
      // Fallback to gzip
      const compressed = compressData(data, 'gzip');
      const base64 = Buffer.from(compressed).toString('base64');
      
      return {
        data: base64,
        compressed: true,
        algorithm: 'gzip',
        originalSize,
        compressedSize: base64.length,
      };
    }
  }

  /**
   * Decompress cookie data
   */
  private decompressCookie(cookie: CompressedCookie): string {
    const buffer = Buffer.from(cookie.data, 'base64');
    const decompressed = decompressData(buffer, cookie.algorithm);
    return new TextDecoder().decode(decompressed);
  }

  /**
   * Set telemetry data cookie
   */
  setTelemetry(data: TelemetryData, options: CookieOptions = {}): void {
    const serialized = JSON.stringify(data);
    
    // Always compress telemetry (can be large)
    const compressed = this.compressCookie(serialized);
    
    this.cookieMap.set('fw_telemetry', JSON.stringify(compressed), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      ...options,
    });
  }

  /**
   * Get telemetry data
   */
  getTelemetry(): TelemetryData | null {
    const value = this.cookieMap.get('fw_telemetry');
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      const decompressed = this.decompressCookie(parsed);
      return JSON.parse(decompressed);
    } catch {
      return null;
    }
  }

  /**
   * Append telemetry event
   */
  appendTelemetryEvent(event: TelemetryEvent): void {
    const existing = this.getTelemetry();
    
    const telemetry: TelemetryData = existing || {
      sessionId: crypto.randomUUID(),
      timestamp: Date.now(),
      events: [],
      metrics: {},
    };

    telemetry.events.push(event);
    
    // Keep only last 100 events
    if (telemetry.events.length > 100) {
      telemetry.events = telemetry.events.slice(-100);
    }

    this.setTelemetry(telemetry);
  }

  /**
   * Set CSRF token
   */
  setCsrfToken(token: string, options: CookieOptions = {}): void {
    this.cookieMap.set('csrf_token', token, {
      httpOnly: false, // Must be accessible by JS
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 86400, // 24 hours
      ...options,
    });
  }

  /**
   * Get CSRF token
   */
  getCsrfToken(): string | null {
    return this.cookieMap.get('csrf_token') || null;
  }

  /**
   * Validate CSRF token
   */
  validateCsrfToken(token: string): boolean {
    const stored = this.getCsrfToken();
    if (!stored) return false;
    
    // Use timing-safe comparison
    // @ts-ignore - Bun.CryptoHasher available in Bun
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(stored);
    const storedHash = hasher.digest('hex');
    
    hasher.reset();
    hasher.update(token);
    const tokenHash = hasher.digest('hex');
    
    return storedHash === tokenHash;
  }

  /**
   * Delete a cookie
   */
  delete(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
    this.cookieMap.delete(name, options);
  }

  /**
   * Get all cookies
   */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.cookieMap.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Clear all cookies
   */
  clear(): void {
    this.cookieMap.clear();
  }

  /**
   * Get cookie size stats
   */
  getStats(): { totalCookies: number; totalSize: number; compressedCookies: number } {
    let totalSize = 0;
    let compressedCount = 0;

    for (const [key, value] of this.cookieMap.entries()) {
      totalSize += key.length + value.length;
      
      try {
        const parsed = JSON.parse(value);
        if (parsed.compressed) {
          compressedCount++;
        }
      } catch {
        // Not compressed
      }
    }

    return {
      totalCookies: this.cookieMap.size,
      totalSize,
      compressedCookies: compressedCount,
    };
  }
}

/**
 * Create a secure session cookie
 */
export function createSessionCookie(
  sessionId: string,
  options: CookieOptions = {}
): { name: string; value: string; options: CookieOptions } {
  return {
    name: 'fw_session',
    value: sessionId,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 86400 * 7, // 7 days
      ...options,
    },
  };
}

/**
 * Create a telemetry cookie
 */
export function createTelemetryCookie(
  data: TelemetryData
): { name: string; value: string; options: CookieOptions } {
  const serialized = JSON.stringify(data);
  const compressed = compressData(serialized, 'zstd');
  const base64 = Buffer.from(compressed).toString('base64');

  return {
    name: 'fw_telemetry',
    value: base64,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    },
  };
}

/**
 * Parse telemetry cookie
 */
export function parseTelemetryCookie(cookieValue: string): TelemetryData | null {
  try {
    const buffer = Buffer.from(cookieValue, 'base64');
    const decompressed = decompressData(buffer, 'zstd');
    return JSON.parse(new TextDecoder().decode(decompressed));
  } catch {
    return null;
  }
}

// Export singleton instance
export const cookieManager = new CookieManager();
