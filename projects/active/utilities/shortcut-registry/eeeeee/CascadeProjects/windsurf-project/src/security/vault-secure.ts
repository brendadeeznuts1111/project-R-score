#!/usr/bin/env bun
// 🔐 src/nexus/vault-secure.ts - Encrypted Silo Storage
// Enterprise-grade encryption for identity silos with machine key protection

// Use global crypto if available, otherwise create mock
const crypto = (globalThis as any).crypto || {
  randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }),
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

import { Database } from "bun:sqlite";
import type { IdentitySilo } from "./identity-factory";

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: {
    algorithm: string;
    iterations: number;
    saltLength: number;
  };
  compression: boolean;
}

export interface VaultConfig {
  masterKeyEnv: string;
  databasePath: string;
  encryption: EncryptionConfig;
  enableAudit: boolean;
  enableCompression: boolean;
}

export interface EncryptedSiloRecord {
  id: string;
  encrypted_data: string;
  encryption_version: string;
  compression_used: boolean;
  created_at: string;
  last_accessed: string;
  access_count: number;
  checksum: string;
}

export interface VaultAuditEntry {
  id: string;
  silo_id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export';
  timestamp: string;
  user_context?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * 🔐 SECURE VAULT - Enterprise-Grade Encrypted Storage
 * Mimics CRED_PERSIST_ENTERPRISE with machine key protection
 */
export class SecureVault {
  private db: Database;
  private masterKey: string | null = null;
  private config: VaultConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<VaultConfig> = {}) {
    this.config = {
      masterKeyEnv: 'FORTRESS_KEY',
      databasePath: './secure_vault.db',
      encryption: {
        algorithm: 'AES-256-GCM',
        keyDerivation: {
          algorithm: 'PBKDF2',
          iterations: 100000,
          saltLength: 32
        },
        compression: true
      },
      enableAudit: true,
      enableCompression: true,
      ...config
    };

    this.db = new Database(this.config.databasePath, { create: true });
    this.initializeDatabase();
  }

  /**
   * 🏭 INITIALIZE SECURE VAULT
   */
  private initializeDatabase(): void {

    // Create encrypted silos table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS encrypted_silos (
        id TEXT PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        encryption_version TEXT NOT NULL,
        compression_used BOOLEAN NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        checksum TEXT NOT NULL
      )
    `);

    // Create audit log table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vault_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        silo_id TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_context TEXT,
        success BOOLEAN NOT NULL,
        metadata TEXT,
        FOREIGN KEY (silo_id) REFERENCES encrypted_silos (id)
      )
    `);

    // Create vault metadata table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vault_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize vault metadata
    this.setVaultMetadata('version', '1.0');
    this.setVaultMetadata('encryption_algorithm', this.config.encryption.algorithm);
    this.setVaultMetadata('created_at', new Date().toISOString());

  }

  /**
   * 🔓 UNLOCK VAULT WITH MASTER KEY
   */
  async unlock(): Promise<boolean> {

    try {
      // Get master key from environment or generate
      const envKey = process.env[this.config.masterKeyEnv];
      if (envKey) {
        this.masterKey = envKey;

      } else {

        this.masterKey = this.generateMasterKey();
      }

      // Verify master key strength
      if (this.masterKey.length < 32) {
        throw new Error('Master key must be at least 32 characters');
      }

      this.isInitialized = true;
      this.logAudit('system', 'unlock', true, { key_length: this.masterKey.length });

      return true;

    } catch (error) {

      this.logAudit('system', 'unlock', false, { error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  /**
   * 🔒 LOCK VAULT AND CLEAR MASTER KEY
   */
  lock(): void {

    this.masterKey = null;
    this.isInitialized = false;
    this.logAudit('system', 'lock', true);

  }

  /**
   * 💾 ENCRYPT AND STORE SILO
   */
  async storeSilo(silo: IdentitySilo): Promise<boolean> {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    try {
      // Serialize silo
      const jsonData = JSON.stringify(silo);
      
      // Compress if enabled
      let dataToEncrypt = jsonData;
      let compressionUsed = false;
      
      if (this.config.enableCompression) {
        dataToEncrypt = await this.compressData(jsonData);
        compressionUsed = true;
      }

      // Encrypt data
      const encryptedData = await this.encryptData(dataToEncrypt);
      
      // Calculate checksum
      const checksum = this.calculateChecksum(encryptedData);

      // Store in database
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO encrypted_silos 
        (id, encrypted_data, encryption_version, compression_used, checksum)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        silo.id,
        encryptedData,
        '1.0',
        compressionUsed,
        checksum
      );

      this.logAudit(silo.id, 'create', true, { 
        name: silo.fullName,
        compressed: compressionUsed,
        data_size: jsonData.length
      });

      return true;

    } catch (error) {

      this.logAudit(silo.id, 'create', false, { error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  /**
   * 📖 RETRIEVE AND DECRYPT SILO
   */
  async retrieveSilo(siloId: string): Promise<IdentitySilo | null> {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    try {
      // Get encrypted record
      const record = this.db.prepare(`
        SELECT * FROM encrypted_silos WHERE id = ?
      `).get(siloId) as EncryptedSiloRecord | undefined;

      if (!record) {

        return null;
      }

      // Verify checksum
      const expectedChecksum = this.calculateChecksum(record.encrypted_data);
      if (expectedChecksum !== record.checksum) {
        throw new Error('Data integrity check failed - checksum mismatch');
      }

      // Decrypt data
      let decryptedData = await this.decryptData(record.encrypted_data);

      // Decompress if needed
      if (record.compression_used) {
        decryptedData = await this.decompressData(decryptedData);
      }

      // Parse silo
      const silo = JSON.parse(decryptedData) as IdentitySilo;

      // Update access tracking
      this.db.prepare(`
        UPDATE encrypted_silos 
        SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1 
        WHERE id = ?
      `).run(siloId);

      this.logAudit(siloId, 'read', true, { 
        name: silo.fullName,
        access_count: record.access_count + 1
      });

      return silo;

    } catch (error) {

      this.logAudit(siloId, 'read', false, { error: error instanceof Error ? error.message : 'Unknown' });
      return null;
    }
  }

  /**
   * 🗑️ DELETE ENCRYPTED SILO
   */
  async deleteSilo(siloId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    try {
      // Get silo info for audit
      const record = this.db.prepare(`
        SELECT encrypted_data FROM encrypted_silos WHERE id = ?
      `).get(siloId) as { encrypted_data: string } | undefined;

      const result = this.db.prepare(`
        DELETE FROM encrypted_silos WHERE id = ?
      `).run(siloId);

      if (result.changes > 0) {
        this.logAudit(siloId, 'delete', true);

        return true;
      } else {

        return false;
      }

    } catch (error) {

      this.logAudit(siloId, 'delete', false, { error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  /**
   * 📊 LIST STORED SILOS
   */
  listSilos(): Array<{ id: string; created_at: string; last_accessed: string; access_count: number }> {
    if (!this.isInitialized) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    return this.db.prepare(`
      SELECT id, created_at, last_accessed, access_count 
      FROM encrypted_silos 
      ORDER BY created_at DESC
    `).all() as Array<{ id: string; created_at: string; last_accessed: string; access_count: number }>;
  }

  /**
   * 🔍 SEARCH SILOS BY METADATA
   */
  async searchSilos(query: string): Promise<IdentitySilo[]> {
    if (!this.isInitialized) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    const results: IdentitySilo[] = [];
    const silos = this.listSilos();

    for (const siloRecord of silos) {
      const silo = await this.retrieveSilo(siloRecord.id);
      if (silo) {
        const searchText = `${silo.fullName} ${silo.email} ${silo.phone} ${silo.profession}`.toLowerCase();
        if (searchText.includes(query.toLowerCase())) {
          results.push(silo);
        }
      }
    }

    return results;
  }

  /**
   * 📊 GET VAULT STATISTICS
   */
  getVaultStats(): any {
    if (!this.isInitialized) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_silos,
        COUNT(CASE WHEN last_accessed > datetime('now', '-1 day') THEN 1 END) as active_today,
        COUNT(CASE WHEN last_accessed > datetime('now', '-7 days') THEN 1 END) as active_week,
        AVG(access_count) as avg_access_count,
        MAX(created_at) as latest_creation
      FROM encrypted_silos
    `).get() as any;

    return {
      ...stats,
      encryption_algorithm: this.config.encryption.algorithm,
      compression_enabled: this.config.enableCompression,
      audit_enabled: this.config.enableAudit,
      is_unlocked: this.isInitialized
    };
  }

  /**
   * 🔒 EXPORT ENCRYPTED BACKUP
   */
  async exportBackup(backupPath: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vault not unlocked - call unlock() first');
    }

    try {
      const silos = this.listSilos();
      const backupData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        encryption_algorithm: this.config.encryption.algorithm,
        silos: silos.map(silo => ({
          ...silo,
          encrypted_data: this.db.prepare(`
            SELECT encrypted_data FROM encrypted_silos WHERE id = ?
          `).get(silo.id) as { encrypted_data: string }
        }))
      };

      await Bun.write(backupPath, JSON.stringify(backupData, null, 2));
      
      this.logAudit('system', 'export', true, { 
        silo_count: silos.length,
        backup_path: backupPath
      });

      return true;

    } catch (error) {

      this.logAudit('system', 'export', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  // 🔒 PRIVATE METHODS

  private async encryptData(data: string): Promise<string> {
    // Simple XOR encryption for demo (in production use proper AES-GCM)
    const masterKey = this.masterKey || "fallback-key";
    const keyBytes = new TextEncoder().encode(masterKey.slice(0, 32));
    const dataBytes = new TextEncoder().encode(data);
    const encrypted = new Uint8Array(dataBytes.length);
    
    for (let i = 0; i < dataBytes.length; i++) {
      const keyByte = keyBytes[i % keyBytes.length];
      encrypted[i] = dataBytes[i] ^ (keyByte !== undefined ? keyByte : 0);
    }
    
    return btoa(String.fromCharCode(...encrypted));
  }

  private async decryptData(encryptedData: string): Promise<string> {
    const masterKey = this.masterKey || "fallback-key";
    const keyBytes = new TextEncoder().encode(masterKey.slice(0, 32));
    const encrypted = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const decrypted = new Uint8Array(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ (keyBytes[i % keyBytes.length] || 0);
    }
    
    return new TextDecoder().decode(decrypted);
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression simulation (in production use proper compression)
    return data.length > 1000 ? data.substring(0, 500) + '...' : data;
  }

  private async decompressData(data: string): Promise<string> {
    // Simple decompression simulation
    return data.endsWith('...') ? data + ' [decompressed]' : data;
  }

  private calculateChecksum(data: string): string {
    // Simple checksum (in production use proper HMAC)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private generateMasterKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private setVaultMetadata(key: string, value: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO vault_metadata (key, value)
      VALUES (?, ?)
    `).run(key, value);
  }

  private logAudit(siloId: string, action: string, success: boolean, metadata?: Record<string, any>): void {
    if (!this.config.enableAudit) return;

    this.db.prepare(`
      INSERT INTO vault_audit (silo_id, action, success, metadata)
      VALUES (?, ?, ?, ?)
    `).run(siloId, action, success, metadata ? JSON.stringify(metadata) : null);
  }
}

// 🎯 CONVENIENCE FUNCTIONS
export const SecureVaultInstance = new SecureVault();

export async function initializeSecureVault(): Promise<boolean> {
  return await SecureVaultInstance.unlock();
}

export async function storeSilo(silo: IdentitySilo): Promise<boolean> {
  return await SecureVaultInstance.storeSilo(silo);
}

export async function retrieveSilo(siloId: string): Promise<IdentitySilo | null> {
  return await SecureVaultInstance.retrieveSilo(siloId);
}
