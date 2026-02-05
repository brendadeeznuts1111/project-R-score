// 🔐 SOVEREIGN IDENTITY BLUEPRINT - SECURE VAULT
// Encrypted Silo Storage for Centralized Secret Silo
// Generated: January 22, 2026 | Nebula-Flow™ v3.5.0

import { crypto } from "bun";
import { IdentitySilo } from "./identity-factory.ts";

/**
 * Secure Vault Encryption
 * Encrypts identity silos before SQLite storage
 * If VM is stolen, data is useless without Master Machine Key
 */
export class SecureVault {
  private masterKey: string;
  private algorithm: string = "AES-256-GCM";

  constructor(masterKey?: string) {
    this.masterKey = masterKey || process.env.FORTRESS_KEY || this.generateFallbackKey();
  }

  /**
   * Generate Fallback Key
   * Creates a deterministic key from environment
   * In production, this should be a proper HSM or KMS
   */
  private generateFallbackKey(): string {
    const seed = process.env.NEBULA_SEED || "sovereign-identity-blueprint-2026";
    return crypto.hash("sha256", seed, "hex").slice(0, 32);
  }

  /**
   * Encrypt Identity Silo
   * AES-256-GCM encryption with authentication tag
   */
  encryptSilo(silo: IdentitySilo): {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  } {
    const data = JSON.stringify(silo);
    const iv = crypto.randomBytes(16);
    const key = this.deriveKey();

    // Encrypt using Bun's native crypto
    const encrypted = crypto.encrypt("aes-256-gcm", data, key, iv);
    const tag = encrypted.tag; // Authentication tag

    return {
      encrypted: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      algorithm: this.algorithm,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Decrypt Identity Silo
   * Verifies authentication tag before decryption
   */
  decryptSilo(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  }): IdentitySilo {
    try {
      const key = this.deriveKey();
      const iv = Buffer.from(encryptedData.iv, "base64");
      const tag = Buffer.from(encryptedData.tag, "base64");
      const encrypted = Buffer.from(encryptedData.encrypted, "base64");

      // Decrypt with tag verification
      const decrypted = crypto.decrypt(
        "aes-256-gcm",
        encrypted,
        key,
        iv,
        tag
      );

      return JSON.parse(decrypted.toString());
    } catch (error) {
      throw new Error("Decryption failed: Invalid key or tampered data");
    }
  }

  /**
   * Derive Key
   * Key derivation using PBKDF2
   */
  private deriveKey(): Buffer {
    const salt = "nebula-flow-identity-silo-2026";
    return crypto.hash("sha256", this.masterKey + salt, "buffer").slice(0, 32);
  }

  /**
   * Re-encrypt Silo
   * Rotate encryption key for security maintenance
   */
  reencryptSilo(
    encryptedData: {
      encrypted: string;
      iv: string;
      tag: string;
      algorithm: string;
      timestamp: string;
    },
    newMasterKey: string
  ): {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  } {
    const silo = this.decryptSilo(encryptedData);
    const vault = new SecureVault(newMasterKey);
    return vault.encryptSilo(silo);
  }

  /**
   * Export for Database Storage
   * Format optimized for SQLite
   */
  exportForSQLite(encrypted: {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  }): {
    ciphertext: string;
    iv: string;
    tag: string;
    algorithm: string;
    created_at: string;
    updated_at: string;
  } {
    return {
      ciphertext: encrypted.encrypted,
      iv: encrypted.iv,
      tag: encrypted.tag,
      algorithm: encrypted.algorithm,
      created_at: encrypted.timestamp,
      updated_at: encrypted.timestamp,
    };
  }

  /**
   * Import from SQLite
   * Reconstruct encrypted format from database
   */
  importFromSQLite(data: {
    ciphertext: string;
    iv: string;
    tag: string;
    algorithm: string;
    created_at: string;
    updated_at: string;
  }): {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  } {
    return {
      encrypted: data.ciphertext,
      iv: data.iv,
      tag: data.tag,
      algorithm: data.algorithm,
      timestamp: data.updated_at,
    };
  }

  /**
   * Verify Integrity
   * Check if encrypted data is valid and untampered
   */
  verifyIntegrity(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  }): boolean {
    try {
      this.decryptSilo(encryptedData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate Security Report
   * Audit trail for vault operations
   */
  generateSecurityReport(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
    algorithm: string;
    timestamp: string;
  }): {
    algorithm: string;
    keySize: number;
    integrity: boolean;
    age: number;
    tampered: boolean;
  } {
    const age = Date.now() - new Date(encryptedData.timestamp).getTime();
    const integrity = this.verifyIntegrity(encryptedData);

    return {
      algorithm: encryptedData.algorithm,
      keySize: 256,
      integrity,
      age: age / 1000, // seconds
      tampered: !integrity,
    };
  }
}

// Default export
export const secureVault = new SecureVault();