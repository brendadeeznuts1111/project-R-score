// 🧬 SOVEREIGN IDENTITY BLUEPRINT - IDENTITY FACTORY
// Cryptographic Persona Engine for Centralized Secret Silo
// Generated: January 22, 2026 | Nebula-Flow™ v3.5.0

import { crypto, hash } from "bun";
import personaConfig from "./persona.toml" with { type: "toml" };

/**
 * Identity Silo Interface
 * Complete human profile with cryptographic credentials
 */
export interface IdentitySilo {
  id: string;           // app_hash_id (deterministic)
  fullName: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  address: string;
  city: string;
  state: string;
  recoveryEmail: string;
  totpSecret: string;   // 2FA Secret (TOTP)
  passkeyId: string;    // Virtual Passkey ID
  passkeySeed: string;  // Passkey-ready seed
  recoveryHint: string; // Security question
  metadata: {
    generated: string;
    version: string;
    bunVersion: string;
    nebulaVersion: string;
  };
}

/**
 * Identity Factory
 * Deterministic identity generation from app hash
 */
export class IdentityFactory {
  private config: typeof personaConfig;

  constructor() {
    this.config = personaConfig;
  }

  /**
   * Generate Identity Silo
   * Creates a complete "Sarah" profile with full paper trail
   */
  generateSilo(appHash: string): IdentitySilo {
    // Deterministic name generation based on hash
    const nameIndex = this.hashToIndex(appHash, this.config.bio.name_pool.length);
    const firstName = this.config.bio.name_pool[nameIndex];
    const lastName = `V${appHash.slice(0, 4).toUpperCase()}`;
    
    // Age generation (22-45)
    const age = this.hashToRange(appHash, this.config.bio.age_range[0], this.config.bio.age_range[1]);
    
    // Gender selection (deterministic)
    const genderIndex = this.hashToIndex(appHash, this.config.bio.genders.length);
    const gender = this.config.bio.genders[genderIndex];
    
    // Location generation
    const cityIndex = this.hashToIndex(appHash, this.config.locales.cities.length);
    const city = this.config.locales.cities[cityIndex];
    const state = this.config.locales.states[cityIndex];
    const streetSuffix = this.config.locales.street_suffixes[
      this.hashToIndex(appHash + "suffix", this.config.locales.street_suffixes.length)
    ];
    const address = `123 ${lastName} ${streetSuffix}, ${city}, ${state}`;
    
    // Recovery email (protonmail, tuta, etc.)
    const emailDomainIndex = this.hashToIndex(appHash + "domain", this.config.recovery.email_domains.length);
    const emailPrefixIndex = this.hashToIndex(appHash + "prefix", this.config.recovery.email_prefixes.length);
    const recoveryEmail = `${this.config.recovery.email_prefixes[emailPrefixIndex]}.${appHash.slice(0, 4)}@${this.config.recovery.email_domains[emailDomainIndex]}`;
    
    // 🔐 SECURITY GENERATION
    // TOTP Secret (2FA) - 8 chars, uppercase
    const totpSecret = crypto.randomUUID().split('-')[0].toUpperCase();
    
    // Passkey ID - CRC32 hash of passkey seed
    const passkeySeed = `passkey-${appHash}-${firstName}-${lastName}`;
    const passkeyId = hash.crc32(passkeySeed).toString(16).padStart(8, '0');
    
    // Recovery hint (security question)
    const hintIndex = this.hashToIndex(appHash + "hint", this.config.security.recovery_hint_pool.length);
    const recoveryHint = this.config.security.recovery_hint_pool[hintIndex];
    
    return {
      id: appHash,
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      age,
      gender,
      address,
      city,
      state,
      recoveryEmail,
      totpSecret,
      passkeyId,
      passkeySeed,
      recoveryHint,
      metadata: {
        generated: new Date().toISOString(),
        version: this.config.metadata.version,
        bunVersion: this.config.metadata["bun-version"],
        nebulaVersion: this.config.metadata["nebula-flow-version"],
      },
    };
  }

  /**
   * Generate Multiple Identities
   * For batch silo creation
   */
  generateBatch(count: number, baseSeed: string): IdentitySilo[] {
    const silos: IdentitySilo[] = [];
    for (let i = 0; i < count; i++) {
      const seed = `${baseSeed}-${i}`;
      const appHash = hash.crc32(seed).toString(16);
      silos.push(this.generateSilo(appHash));
    }
    return silos;
  }

  /**
   * Hash to Index
   * Deterministic index from hash
   */
  private hashToIndex(hash: string, max: number): number {
    const numeric = parseInt(hash.slice(0, 8), 16);
    return numeric % max;
  }

  /**
   * Hash to Range
   * Deterministic value within range
   */
  private hashToRange(hash: string, min: number, max: number): number {
    const numeric = parseInt(hash.slice(8, 16), 16);
    const range = max - min + 1;
    return (numeric % range) + min;
  }

  /**
   * Validate Identity Silo
   * Check if silo meets security requirements
   */
  validateSilo(silo: IdentitySilo): boolean {
    return (
      silo.id.length >= 8 &&
      silo.totpSecret.length >= 8 &&
      silo.passkeyId.length >= 8 &&
      silo.recoveryEmail.includes('@') &&
      silo.age >= this.config.bio.age_range[0] &&
      silo.age <= this.config.bio.age_range[1]
    );
  }

  /**
   * Export for 2FA System
   * Format compatible with TOTP libraries
   */
  exportFor2FA(silo: IdentitySilo): {
    secret: string;
    issuer: string;
    label: string;
  } {
    return {
      secret: silo.totpSecret,
      issuer: "Nebula-Flow-Silo",
      label: `${silo.fullName} (${silo.id})`,
    };
  }

  /**
   * Export for Passkey Injection
   * Format for Android 13 passkey injection
   */
  exportForPasskey(silo: IdentitySilo): {
    passkeyId: string;
    seed: string;
    rpId: string;
    userId: string;
  } {
    return {
      passkeyId: silo.passkeyId,
      seed: silo.passkeySeed,
      rpId: "nebula-flow.local",
      userId: silo.id,
    };
  }
}

// Default export
export const identityFactory = new IdentityFactory();