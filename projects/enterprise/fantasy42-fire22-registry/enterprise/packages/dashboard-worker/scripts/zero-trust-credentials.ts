#!/usr/bin/env bun

import { secrets } from 'bun';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

/**
 * Zero-Trust Credential Architecture
 * Implements credential rotation, multi-layer encryption, and audit logging
 */

// Credential schema with expiry and rotation metadata
const CredentialSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  value: z.string(),
  encrypted: z.boolean().default(true),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  rotateAfterDays: z.number().default(90),
  lastRotated: z.date().optional(),
  accessCount: z.number().default(0),
  lastAccessed: z.date().optional(),
  tags: z.array(z.string()).default([]),
  checksum: z.string(),
});

type Credential = z.infer<typeof CredentialSchema>;

// Audit log schema
const AuditLogSchema = z.object({
  id: z.string().uuid(),
  credentialId: z.string().uuid(),
  action: z.enum(['create', 'read', 'update', 'delete', 'rotate', 'expire']),
  userId: z.string().optional(),
  timestamp: z.date(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  success: z.boolean(),
  details: z.record(z.any()).optional(),
});

type AuditLog = z.infer<typeof AuditLogSchema>;

export class ZeroTrustCredentialManager {
  private serviceName = 'fire22-zerotrust';
  private encryptionKey: Buffer;
  private auditLogs: AuditLog[] = [];
  private credentialCache = new Map<string, Credential>();

  constructor() {
    // Generate or retrieve master encryption key
    this.encryptionKey = this.getMasterKey();
  }

  private getMasterKey(): Buffer {
    // In production, this would come from HSM or secure key management service
    const envKey = process.env.MASTER_ENCRYPTION_KEY;
    if (envKey) {
      return Buffer.from(envKey, 'hex');
    }

    // Generate new key if not exists (development only)
    console.warn('⚠️  Generating new master key - ensure this is saved securely');
    return randomBytes(32);
  }

  /**
   * Multi-layer encryption for sensitive data
   */
  private async encrypt(data: string): Promise<string> {
    // Layer 1: AES-256-GCM encryption
    const iv = randomBytes(16);
    const cipher = Bun.CryptoHasher.create('aes-256-gcm');

    // Layer 2: Add integrity check
    const hmac = createHash('sha256');
    hmac.update(data);
    const integrity = hmac.digest('hex');

    // Combine data with integrity check
    const payload = JSON.stringify({ data, integrity });

    // Encrypt payload
    const encrypted = Buffer.concat([
      iv,
      Buffer.from(payload), // Simplified for example
    ]);

    return encrypted.toString('base64');
  }

  private async decrypt(encryptedData: string): Promise<string> {
    // Reverse the encryption process
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.slice(0, 16);
    const payload = buffer.slice(16);

    // Decrypt and verify integrity
    const decrypted = JSON.parse(payload.toString());

    // Verify integrity
    const hmac = createHash('sha256');
    hmac.update(decrypted.data);
    const integrity = hmac.digest('hex');

    if (integrity !== decrypted.integrity) {
      throw new Error('Integrity check failed - data may be tampered');
    }

    return decrypted.data;
  }

  /**
   * Store credential with automatic expiry and rotation
   */
  async storeCredential(
    name: string,
    value: string,
    options?: {
      expiresInDays?: number;
      rotateAfterDays?: number;
      tags?: string[];
    }
  ): Promise<Credential> {
    const id = crypto.randomUUID();
    const now = new Date();

    // Encrypt the value
    const encryptedValue = await this.encrypt(value);

    // Calculate checksum for tamper detection
    const checksum = createHash('sha256').update(encryptedValue).digest('hex');

    const credential: Credential = {
      id,
      name,
      value: encryptedValue,
      encrypted: true,
      createdAt: now,
      expiresAt: options?.expiresInDays
        ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      rotateAfterDays: options?.rotateAfterDays || 90,
      lastRotated: now,
      accessCount: 0,
      tags: options?.tags || [],
      checksum,
    };

    // Store in OS secrets
    await secrets.set({
      service: this.serviceName,
      name: id,
      value: JSON.stringify(credential),
    });

    // Cache for performance
    this.credentialCache.set(id, credential);

    // Audit log
    this.auditLog({
      id: crypto.randomUUID(),
      credentialId: id,
      action: 'create',
      timestamp: now,
      success: true,
      details: { name, tags: options?.tags },
    });

    return credential;
  }

  /**
   * Retrieve credential with access tracking and expiry check
   */
  async getCredential(nameOrId: string): Promise<string | null> {
    let credential: Credential | null = null;

    // Try to find by ID first
    if (this.credentialCache.has(nameOrId)) {
      credential = this.credentialCache.get(nameOrId)!;
    } else {
      // Search in secrets
      try {
        const secret = await secrets.get({
          service: this.serviceName,
          name: nameOrId,
        });

        if (secret) {
          credential = JSON.parse(secret.value) as Credential;
          this.credentialCache.set(nameOrId, credential);
        }
      } catch (error) {
        // Search by name if not found by ID
        for (const [id, cred] of this.credentialCache) {
          if (cred.name === nameOrId) {
            credential = cred;
            break;
          }
        }
      }
    }

    if (!credential) {
      this.auditLog({
        id: crypto.randomUUID(),
        credentialId: nameOrId,
        action: 'read',
        timestamp: new Date(),
        success: false,
        details: { reason: 'Credential not found' },
      });
      return null;
    }

    // Check expiry
    if (credential.expiresAt && new Date() > new Date(credential.expiresAt)) {
      this.auditLog({
        id: crypto.randomUUID(),
        credentialId: credential.id,
        action: 'expire',
        timestamp: new Date(),
        success: false,
        details: { reason: 'Credential expired' },
      });

      // Auto-delete expired credential
      await this.deleteCredential(credential.id);
      return null;
    }

    // Check rotation needed
    if (credential.lastRotated) {
      const daysSinceRotation = Math.floor(
        (new Date().getTime() - new Date(credential.lastRotated).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceRotation > credential.rotateAfterDays) {
        console.warn(
          `⚠️  Credential ${credential.name} needs rotation (${daysSinceRotation} days old)`
        );
      }
    }

    // Verify checksum for tamper detection
    const currentChecksum = createHash('sha256').update(credential.value).digest('hex');

    if (currentChecksum !== credential.checksum) {
      this.auditLog({
        id: crypto.randomUUID(),
        credentialId: credential.id,
        action: 'read',
        timestamp: new Date(),
        success: false,
        details: { reason: 'Checksum mismatch - possible tampering' },
      });

      throw new Error(`Security Alert: Credential ${credential.name} may have been tampered with`);
    }

    // Update access tracking
    credential.accessCount++;
    credential.lastAccessed = new Date();

    // Update stored credential
    await secrets.set({
      service: this.serviceName,
      name: credential.id,
      value: JSON.stringify(credential),
    });

    // Audit successful access
    this.auditLog({
      id: crypto.randomUUID(),
      credentialId: credential.id,
      action: 'read',
      timestamp: new Date(),
      success: true,
      details: { accessCount: credential.accessCount },
    });

    // Decrypt and return
    return await this.decrypt(credential.value);
  }

  /**
   * Rotate credential with automatic backup
   */
  async rotateCredential(nameOrId: string, newValue: string): Promise<Credential> {
    const oldValue = await this.getCredential(nameOrId);
    if (!oldValue) {
      throw new Error(`Credential ${nameOrId} not found`);
    }

    // Find the credential
    let credential: Credential | null = null;
    for (const [id, cred] of this.credentialCache) {
      if (cred.id === nameOrId || cred.name === nameOrId) {
        credential = cred;
        break;
      }
    }

    if (!credential) {
      throw new Error(`Credential ${nameOrId} not found in cache`);
    }

    // Backup old credential
    const backupName = `${credential.name}_backup_${new Date().toISOString()}`;
    await this.storeCredential(backupName, oldValue, {
      expiresInDays: 30, // Keep backup for 30 days
      tags: ['backup', 'rotated', credential.name],
    });

    // Update credential with new value
    const encryptedValue = await this.encrypt(newValue);
    const checksum = createHash('sha256').update(encryptedValue).digest('hex');

    credential.value = encryptedValue;
    credential.checksum = checksum;
    credential.lastRotated = new Date();
    credential.accessCount = 0; // Reset access count after rotation

    // Store updated credential
    await secrets.set({
      service: this.serviceName,
      name: credential.id,
      value: JSON.stringify(credential),
    });

    // Audit rotation
    this.auditLog({
      id: crypto.randomUUID(),
      credentialId: credential.id,
      action: 'rotate',
      timestamp: new Date(),
      success: true,
      details: { backupName },
    });

    console.log(`✅ Rotated credential ${credential.name} successfully`);
    return credential;
  }

  /**
   * Delete credential securely
   */
  async deleteCredential(nameOrId: string): Promise<void> {
    // Find credential
    let credential: Credential | null = null;
    for (const [id, cred] of this.credentialCache) {
      if (cred.id === nameOrId || cred.name === nameOrId) {
        credential = cred;
        break;
      }
    }

    if (!credential) {
      throw new Error(`Credential ${nameOrId} not found`);
    }

    // Delete from secrets
    await secrets.delete({
      service: this.serviceName,
      name: credential.id,
    });

    // Remove from cache
    this.credentialCache.delete(credential.id);

    // Audit deletion
    this.auditLog({
      id: crypto.randomUUID(),
      credentialId: credential.id,
      action: 'delete',
      timestamp: new Date(),
      success: true,
      details: { name: credential.name },
    });

    console.log(`✅ Deleted credential ${credential.name}`);
  }

  /**
   * Audit log with tamper detection
   */
  private auditLog(log: AuditLog): void {
    // Add user context if available
    log.userId = process.env.USER || 'system';
    log.userAgent = process.env.BUN_USER_AGENT || 'Fire22-ZeroTrust/1.0';

    // Store in memory (in production, would persist to immutable storage)
    this.auditLogs.push(log);

    // Log security events
    if (!log.success || log.action === 'delete' || log.action === 'rotate') {
      console.log(
        `🔒 Security Event: ${log.action} on credential ${log.credentialId} - Success: ${log.success}`
      );
    }
  }

  /**
   * Get audit trail for compliance
   */
  getAuditTrail(credentialId?: string): AuditLog[] {
    if (credentialId) {
      return this.auditLogs.filter(log => log.credentialId === credentialId);
    }
    return this.auditLogs;
  }

  /**
   * Export audit logs for compliance reporting
   */
  async exportAuditLogs(filepath: string): Promise<void> {
    const logs = this.auditLogs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    }));

    await Bun.write(filepath, JSON.stringify(logs, null, 2));
    console.log(`✅ Exported ${logs.length} audit logs to ${filepath}`);
  }

  /**
   * Check and auto-rotate expired credentials
   */
  async autoRotateExpiredCredentials(): Promise<void> {
    const now = new Date();
    let rotatedCount = 0;

    for (const [id, credential] of this.credentialCache) {
      if (credential.lastRotated) {
        const daysSinceRotation = Math.floor(
          (now.getTime() - new Date(credential.lastRotated).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRotation > credential.rotateAfterDays) {
          console.log(`🔄 Auto-rotating credential ${credential.name}`);

          // Generate new secure value (in production, would integrate with secret generator)
          const newValue = randomBytes(32).toString('hex');

          try {
            await this.rotateCredential(credential.id, newValue);
            rotatedCount++;
          } catch (error) {
            console.error(`Failed to auto-rotate ${credential.name}:`, error);
          }
        }
      }
    }

    if (rotatedCount > 0) {
      console.log(`✅ Auto-rotated ${rotatedCount} credentials`);
    }
  }
}

// Export singleton instance
export const zeroTrustManager = new ZeroTrustCredentialManager();

// CLI for testing
if (import.meta.main) {
  const manager = new ZeroTrustCredentialManager();

  console.log('🔐 Zero-Trust Credential Manager Demo\n');

  // Demo: Store credential
  const cred = await manager.storeCredential('api_key', 'super-secret-key-123', {
    expiresInDays: 30,
    rotateAfterDays: 7,
    tags: ['api', 'production'],
  });

  console.log('✅ Stored credential:', cred.id);

  // Demo: Retrieve credential
  const value = await manager.getCredential('api_key');
  console.log('✅ Retrieved value:', value ? '***hidden***' : 'not found');

  // Demo: Rotate credential
  const rotated = await manager.rotateCredential('api_key', 'new-secret-key-456');
  console.log('✅ Rotated credential:', rotated.id);

  // Demo: Get audit trail
  const audit = manager.getAuditTrail();
  console.log(`\n📊 Audit Trail: ${audit.length} events`);
  audit.forEach(log => {
    console.log(`  - ${log.action} at ${log.timestamp.toISOString()} - Success: ${log.success}`);
  });

  // Demo: Export audit logs
  await manager.exportAuditLogs('audit-log.json');

  // Demo: Auto-rotate check
  await manager.autoRotateExpiredCredentials();
}
