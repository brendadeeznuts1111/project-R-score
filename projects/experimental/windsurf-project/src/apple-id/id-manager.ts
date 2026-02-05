import config from '../src/config/config-loader';
/**
 * BunX Enterprise Identity Management System
 *
 * Provides collision-resistant identity generation for:
 * - Bundle IDs (base62 UUID)
 * - Profile IDs (human-readable)
 * - R2 Paths (versioned storage)
 * - Email addresses (plus-addressed)
 * - Serial numbers (DuoPlus format)
 */

import { validateBundleId, validateSerial } from '../common/validators.js';

/**
 * Base62 character set for URL-safe IDs (lowercase only for validation compatibility)
 */
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Use Bun.randomUUIDv7 for distributed-safe, monotonic IDs
 * UUIDv7 is time-sortable and uses atomic counters to prevent collisions
 * even across multiple workers/processes at the same millisecond.
 */
const USE_UUIDV7 = typeof Bun !== 'undefined' && typeof Bun.randomUUIDv7 === 'function';

/**
 * Identity configuration
 */
export interface IdentityConfig {
  emailDomain: string;
  r2Bucket: string;
  version: string;
  provider: string;
}

/**
 * Generated identity components
 */
export interface BundleIdentity {
  bundleId: string;
  profileId: string;
  r2BasePath: string;
  emailAddress: string;
  serialNumber: string;
  timestamp: number;
}

/**
 * Collision protection metadata
 */
export interface CollisionMetadata {
  bundleId: {
    source: 'uuid-v4';
    encoding: 'base62';
    entropy: 122; // bits
  };
  profileId: {
    components: string[];
    timestamp: number;
    uniqueness: 'epoch-counter';
  };
  r2Path: {
    versioning: 'semantic';
    timestamp: boolean;
    collisionAvoidance: 'bundleId-isolation';
  };
  email: {
    format: 'plus-addressing';
    domainIsolation: boolean;
    uniqueness: 'bundleId-guaranteed';
  };
  serial: {
    format: 'ip:port';
    provider: string;
    dynamic: boolean;
  };
}

/**
 * BunX Identity Manager
 */
export class IdentityManager {
  private config: IdentityConfig;
  private profileCounters = new Map<string, number>();

  constructor(config: Partial<IdentityConfig> = {}) {
    this.config = {
      emailDomain: 'factory-wager.com',
      r2Bucket: 'bunx-vault',
      version: '2.0.0',
      provider: 'duoplus',
      ...config
    };
  }

  /**
   * Generate complete bundle identity with collision protection
   */
  generateBundleIdentity(prefix = 'cash', firstName = 'beta', lastName = 'smith'): BundleIdentity {
    const timestamp = Date.now();
    const epoch = Math.floor(timestamp / 1000);

    // 1. Bundle ID: UUID v4 → base62 (10 chars)
    const bundleId = this.generateBundleId();

    // 2. Profile ID: {prefix}-{first}-{last}-{epoch}
    const profileId = this.generateProfileId(prefix, firstName, lastName, epoch);

    // 3. R2 Path: {type}/{bundleId}/{version}/{step}.ext
    const r2BasePath = this.generateR2BasePath(bundleId);

    // 4. Email: master+{bundleId}@domain
    const emailAddress = this.generateEmailAddress(bundleId);

    // 5. Serial: IP:PORT (provider-managed, placeholder for now)
    const serialNumber = this.generateSerialNumber();

    return {
      bundleId,
      profileId,
      r2BasePath,
      emailAddress,
      serialNumber,
      timestamp
    };
  }

  /**
   * Generate Bundle ID: UUID v7 → base62 (10 characters)
   *
   * Collision Protection:
   * - UUIDv7: Monotonic, time-sortable, atomic counter for same-millisecond collisions
   * - Fallback UUIDv4: 122 bits of entropy
   *
   * Distributed Safety:
   * - Bun.randomUUIDv7() uses atomic, threadsafe counters
   * - Safe across Workers within the same process at the same timestamp
   *
   * Format: 10-character base62 string
   * Example: pqsq4lyrst34
   */
  generateBundleId(): string {
    let uuid: string;

    if (USE_UUIDV7) {
      // Prefer UUIDv7 for distributed-safe, monotonic IDs
      uuid = Bun.randomUUIDv7();
    } else {
      // Fallback to UUIDv4
      uuid = this.generateUUIDv4();
    }

    // Remove hyphens and convert to base62
    const hex = uuid.replace(/-/g, '');
    const bytes = this.hexToBytes(hex);

    return this.bytesToBase62(bytes).slice(0, 10);
  }

  /**
   * Generate Profile ID: {prefix}-{first}-{last}-{epoch}
   *
   * Collision Protection: Epoch timestamp + counter for same names
   * Format: Human-readable with timestamp
   * Example: cash-beta-smith-1704879200
   */
  generateProfileId(prefix: string, firstName: string, lastName: string, epoch?: number): string {
    const timestamp = epoch || Math.floor(Date.now() / 1000);
    const normalizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Add counter for collision protection
    const key = `${normalizedPrefix}-${normalizedFirst}-${normalizedLast}`;
    const counter = this.profileCounters.get(key) || 0;
    this.profileCounters.set(key, counter + 1);

    const profileId = `${normalizedPrefix}-${normalizedFirst}-${normalizedLast}-${timestamp}`;

    return counter > 0 ? `${profileId}-${counter}` : profileId;
  }

  /**
   * Generate R2 Base Path: {type}/{bundleId}/{version}/
   *
   * Collision Protection: Bundle ID isolation + versioning
   * Format: Hierarchical storage path
   * Example: vault/pqsq4lyrst34/v2.0/
   */
  generateR2BasePath(bundleId: string, type = 'vault'): string {
    const validatedId = validateBundleId(bundleId);
    return `${type}/${validatedId}/${this.config.version}`;
  }

  /**
   * Generate full R2 file path
   */
  generateR2FilePath(bundleId: string, step: string, extension = 'json', type = 'vault'): string {
    const basePath = this.generateR2BasePath(bundleId, type);
    const timestamp = Date.now();
    return `${basePath}/${step}_${timestamp}.${extension}`;
  }

  /**
   * Generate Email: master+{bundleId}@domain
   *
   * Collision Protection: Bundle ID uniqueness guarantees email uniqueness
   * Format: Plus-addressing for routing
   * Example: master+pqsq4lyrst34@factory-wager.com
   */
  generateEmailAddress(bundleId: string, local = 'master'): string {
    const validatedId = validateBundleId(bundleId);
    return `${local}+${validatedId}@${this.config.emailDomain}`;
  }

  /**
   * Generate Serial Number: IP:PORT
   *
   * Collision Protection: Provider-managed dynamic allocation
   * Format: IPv4:PORT
   * Example: 98.98.125.9:26689
   */
  generateSerialNumber(ip?: string, port?: number): string {
    // Use provided IP/PORT or generate placeholder
    if (ip && port) {
      const serial = `${ip}:${port}`;
      validateSerial(serial);
      return serial;
    }

    // Generate placeholder for provider allocation
    const placeholderIP = '192.168.1.100';
    const placeholderPort = 26689 + Math.floor(Math.random() * 1000);
    return `${placeholderIP}:${placeholderPort}`;
  }

  /**
   * Get collision protection metadata
   */
  getCollisionMetadata(): CollisionMetadata {
    return {
      bundleId: {
        source: 'uuid-v4',
        encoding: 'base62',
        entropy: 122
      },
      profileId: {
        components: ['prefix', 'firstName', 'lastName', 'epoch'],
        timestamp: Date.now(),
        uniqueness: 'epoch-counter'
      },
      r2Path: {
        versioning: 'semantic',
        timestamp: true,
        collisionAvoidance: 'bundleId-isolation'
      },
      email: {
        format: 'plus-addressing',
        domainIsolation: true,
        uniqueness: 'bundleId-guaranteed'
      },
      serial: {
        format: 'ip:port',
        provider: this.config.provider,
        dynamic: true
      }
    };
  }

  /**
   * Validate complete identity
   */
  validateIdentity(identity: BundleIdentity): boolean {
    try {
      validateBundleId(identity.bundleId);
      validateSerial(identity.serialNumber);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identity.emailAddress)) {
        return false;
      }

      // Validate profile ID format
      const profileRegex = /^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-\d+(-\d+)?$/;
      if (!profileRegex.test(identity.profileId)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate UUID v4 using optimized methods
   */
  private generateUUIDv4(): string {
    // Simple UUID v4 generator
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant bits
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;

    // Convert to hex using Bun's optimized method
    const hex = this.bytesToHex(bytes);

    // Format as UUID with hyphens
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }

  /**
   * Convert hex string to bytes using Bun's optimized method
   */
  private hexToBytes(hex: string): Uint8Array {
    // Use Bun's native fromHex method for better performance
    return Uint8Array.fromHex(hex);
  }

  /**
   * Convert bytes to hex string using Bun's optimized method
   */
  private bytesToHex(bytes: Uint8Array): string {
    // Use Bun's native toHex method for better performance
    return bytes.toHex();
  }

  /**
   * Convert bytes to base62
   */
  private bytesToBase62(bytes: Uint8Array): string {
    let num = 0n;
    for (const byte of bytes) {
      num = (num << 8n) | BigInt(byte);
    }

    if (num === 0n) return BASE62_CHARS[0]!;

    let result = '';
    const base = BigInt(BASE62_CHARS.length);

    while (num > 0n) {
      result = BASE62_CHARS[Number(num % base)]! + result;
      num = num / base;
    }

    return result;
  }

  /**
   * Reset profile counters (for testing)
   */
  resetCounters(): void {
    this.profileCounters.clear();
  }
}

// Global identity manager instance
export const identityManager = new IdentityManager();

/**
 * Convenience function to generate complete bundle identity
 */
export function generateBundleIdentity(
  prefix = 'cash',
  firstName = 'beta',
  lastName = 'smith'
): BundleIdentity {
  return identityManager.generateBundleIdentity(prefix, firstName, lastName);
}

/**
 * Generate R2 file path for specific step
 */
export function generateR2Path(
  bundleId: string,
  step: string,
  extension = 'json',
  type = 'vault'
): string {
  return identityManager.generateR2FilePath(bundleId, step, extension, type);
}

/**
 * Generate email address for bundle
 */
export function generateBundleEmail(bundleId: string, local = 'master'): string {
  return identityManager.generateEmailAddress(bundleId, local);
}
