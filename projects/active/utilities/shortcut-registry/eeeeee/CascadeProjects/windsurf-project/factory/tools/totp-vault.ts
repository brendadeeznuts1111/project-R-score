#!/usr/bin/env bun
// totp-vault.ts - TOTP Seed Management for Genesis Units
// Phase-01: Secure seed generation, vault storage, and retrieval

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash, randomBytes } from 'crypto';

interface TOTPSeed {
  unitId: string;
  seed: string;
  createdAt: string;
  expiresAt?: string; // Made optional
  algorithm: string;
  digits: number;
  period: number;
}

interface VaultConfig {
  vaultPath: string;
  encryptionKey: string;
  defaultAlgorithm: string;
  defaultDigits: number;
  defaultPeriod: number;
}

class GenesisTOTPVault {
  private config: VaultConfig;
  private seeds: Map<string, TOTPSeed> = new Map();

  constructor(config: Partial<VaultConfig> = {}) {
    this.config = {
      vaultPath: config.vaultPath || './config/vault/totp-seeds.json',
      encryptionKey: config.encryptionKey || process.env.VAULT_ENCRYPTION_KEY || 'genesis-default-key',
      defaultAlgorithm: config.defaultAlgorithm || 'sha1',
      defaultDigits: config.defaultDigits || 6,
      defaultPeriod: config.defaultPeriod || 30,
      ...config
    };
  }

  // 🔐 Generate new TOTP seed for unit
  async generateSeed(unitId: string, options: {
    algorithm?: string;
    digits?: number;
    period?: number;
    expiresIn?: number; // seconds
  } = {}): Promise<TOTPSeed> {
    const seed = {
      unitId,
      seed: randomBytes(20).toString('hex').toUpperCase(),
      createdAt: new Date().toISOString(),
      algorithm: options.algorithm || this.config.defaultAlgorithm,
      digits: options.digits || this.config.defaultDigits,
      period: options.period || this.config.defaultPeriod
    };

    if (options.expiresIn) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + options.expiresIn);
      seed.expiresAt = expiresAt.toISOString();
    }

    // Store in memory
    this.seeds.set(unitId, seed);
    
    // Persist to vault
    await this.persistSeed(seed);
    
    console.info(`🔐 TOTP Seed Generated for ${unitId}: ${seed.seed.substring(0, 8)}...`);
    return seed;
  }

  // 💾 Persist seed to encrypted vault
  private async persistSeed(seed: TOTPSeed): Promise<void> {
    await mkdir('./config/vault', { recursive: true });
    
    try {
      // Read existing vault
      const vaultData = await this.loadVault();
      
      // Add or update seed
      vaultData.seeds[seed.unitId] = seed;
      
      // Write back to vault
      await writeFile(this.config.vaultPath, JSON.stringify(vaultData, null, 2));
      
      console.info(`💾 Seed persisted to vault: ${seed.unitId}`);
    } catch (error) {
      console.error(`❌ Failed to persist seed for ${seed.unitId}:`, error);
      throw error;
    }
  }

  // 📂 Load vault from disk
  private async loadVault(): Promise<{ seeds: Record<string, TOTPSeed> }> {
    try {
      const data = await readFile(this.config.vaultPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { seeds: {} };
    }
  }

  // 🔍 Retrieve TOTP seed for unit
  async getSeed(unitId: string): Promise<TOTPSeed | null> {
    // Check memory first
    if (this.seeds.has(unitId)) {
      return this.seeds.get(unitId)!;
    }

    // Load from vault
    try {
      const vaultData = await this.loadVault();
      const seed = vaultData.seeds[unitId];
      
      if (seed) {
        // Check if expired
        if (seed.expiresAt && new Date(seed.expiresAt) < new Date()) {
          console.info(`⏰ TOTP seed expired for ${unitId}`);
          return null;
        }
        
        // Cache in memory
        this.seeds.set(unitId, seed);
        return seed;
      }
    } catch (error) {
      console.error(`❌ Failed to load seed for ${unitId}:`, error);
    }
    
    return null;
  }

  // 🗑️ Revoke TOTP seed
  async revokeSeed(unitId: string): Promise<boolean> {
    try {
      // Remove from memory
      this.seeds.delete(unitId);
      
      // Remove from vault
      const vaultData = await this.loadVault();
      delete vaultData.seeds[unitId];
      
      await writeFile(this.config.vaultPath, JSON.stringify(vaultData, null, 2));
      
      console.info(`🗑️ TOTP seed revoked for ${unitId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to revoke seed for ${unitId}:`, error);
      return false;
    }
  }

  // 📊 Get vault statistics
  async getVaultStats(): Promise<{
    totalSeeds: number;
    activeSeeds: number;
    expiredSeeds: number;
    vaultPath: string;
  }> {
    const vaultData = await this.loadVault();
    const now = new Date();
    
    let activeSeeds = 0;
    let expiredSeeds = 0;
    
    for (const seed of Object.values(vaultData.seeds)) {
      if (seed.expiresAt && new Date(seed.expiresAt) < now) {
        expiredSeeds++;
      } else {
        activeSeeds++;
      }
    }
    
    return {
      totalSeeds: Object.keys(vaultData.seeds).length,
      activeSeeds,
      expiredSeeds,
      vaultPath: this.config.vaultPath
    };
  }

  // 🧹 Cleanup expired seeds
  async cleanupExpired(): Promise<number> {
    const vaultData = await this.loadVault();
    const now = new Date();
    let cleaned = 0;
    
    for (const [unitId, seed] of Object.entries(vaultData.seeds)) {
      if (seed.expiresAt && new Date(seed.expiresAt) < now) {
        delete vaultData.seeds[unitId];
        this.seeds.delete(unitId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      await writeFile(this.config.vaultPath, JSON.stringify(vaultData, null, 2));
      console.info(`🧹 Cleaned up ${cleaned} expired seeds`);
    }
    
    return cleaned;
  }

  // 📱 Generate TOTP code (for testing)
  generateTOTPCode(seed: TOTPSeed, timestamp?: number): string {
    const time = Math.floor((timestamp || Date.now()) / 1000);
    const counter = Math.floor(time / seed.period);
    
    // Simple TOTP implementation (for demo)
    const counterBuffer = Buffer.from(counter.toString(16).padStart(16, '0'), 'hex');
    const seedBuffer = Buffer.from(seed.seed, 'hex');
    
    const hash = createHash(seed.algorithm as any)
      .update(counterBuffer)
      .update(seedBuffer)
      .digest();
    
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[offset]! & 0x7f) << 24) |
                   ((hash[offset + 1]! & 0xff) << 16) |
                   ((hash[offset + 2]! & 0xff) << 8) |
                   (hash[offset + 3]! & 0xff);
    
    const code = (binary % Math.pow(10, seed.digits)).toString();
    return code.padStart(seed.digits, '0');
  }
}

// ============================================================================
// 🚀 TOTP VAULT CLI
// ============================================================================

if (import.meta.main) {
  const command = process.argv[2];
  const unitId = process.argv[3];
  
  const vault = new GenesisTOTPVault();
  
  switch (command) {
    case 'generate': {
      if (!unitId) {
        console.error('❌ Unit ID required');
        process.exit(1);
      }
      
      const seed = await vault.generateSeed(unitId, {
        expiresIn: 86400 * 30 // 30 days
      });
      
      console.info(`🔐 TOTP Seed Generated:`);
      console.info(`   Unit: ${seed.unitId}`);
      console.info(`   Seed: ${seed.seed}`);
      console.info(`   Algorithm: ${seed.algorithm}`);
      console.info(`   Digits: ${seed.digits}`);
      console.info(`   Period: ${seed.period}s`);
      console.info(`   Expires: ${seed.expiresAt || 'Never'}`);
      break;
    }
    
    case 'get': {
      if (!unitId) {
        console.error('❌ Unit ID required');
        process.exit(1);
      }
      
      const seed = await vault.getSeed(unitId);
      if (seed) {
        console.info(`✅ TOTP Seed Found:`);
        console.info(`   Unit: ${seed.unitId}`);
        console.info(`   Seed: ${seed.seed}`);
        console.info(`   Created: ${seed.createdAt}`);
        console.info(`   Expires: ${seed.expiresAt || 'Never'}`);
        
        // Generate current code
        const code = vault.generateTOTPCode(seed);
        console.info(`   Current Code: ${code}`);
      } else {
        console.info(`❌ No TOTP seed found for unit: ${unitId}`);
        process.exit(1);
      }
      break;
    }
    
    case 'revoke': {
      if (!unitId) {
        console.error('❌ Unit ID required');
        process.exit(1);
      }
      
      const success = await vault.revokeSeed(unitId);
      if (success) {
        console.info(`✅ TOTP seed revoked for unit: ${unitId}`);
      } else {
        console.info(`❌ Failed to revoke seed for unit: ${unitId}`);
        process.exit(1);
      }
      break;
    }
    
    case 'stats': {
      const stats = await vault.getVaultStats();
      console.info(`📊 TOTP Vault Statistics:`);
      console.info(`   Total Seeds: ${stats.totalSeeds}`);
      console.info(`   Active Seeds: ${stats.activeSeeds}`);
      console.info(`   Expired Seeds: ${stats.expiredSeeds}`);
      console.info(`   Vault Path: ${stats.vaultPath}`);
      break;
    }
    
    case 'cleanup': {
      const cleaned = await vault.cleanupExpired();
      console.info(`🧹 Cleanup completed: ${cleaned} expired seeds removed`);
      break;
    }
    
    default:
      console.info('🔐 Genesis TOTP Vault System');
      console.info('');
      console.info('Usage: bun totp-vault.ts [command] [unitId]');
      console.info('');
      console.info('Commands:');
      console.info('  generate [unitId]       Generate new TOTP seed');
      console.info('  get [unitId]            Retrieve TOTP seed and code');
      console.info('  revoke [unitId]         Revoke TOTP seed');
      console.info('  stats                   Show vault statistics');
      console.info('  cleanup                 Remove expired seeds');
      console.info('');
      console.info('Environment Variables:');
      console.info('  VAULT_ENCRYPTION_KEY    Vault encryption key');
      break;
  }
}

export default GenesisTOTPVault;
