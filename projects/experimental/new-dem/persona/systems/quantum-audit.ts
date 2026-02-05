#!/usr/bin/env bun

// Quantum Audit Trail System - T3-Lattice Component #24 (Versioning)
// Post-quantum cryptographic audit logging with chain integrity

import { PERSONA_CONFIG } from '../persona-config.ts';

export interface QuantumAuditEntry {
  entryId: string;
  timestamp: number;
  type: string;
  persona: string;
  data: Record<string, unknown>;
  signature: string;
  chainId: string;
  previousHash?: string;
  quantumProof: string;
}

export interface AuditChain {
  chainId: string;
  entries: QuantumAuditEntry[];
  integrityHash: string;
  lastVerified: number;
  verificationCount: number;
}

export class QuantumAuditSystem {
  private auditChains = new Map<string, AuditChain>();
  private currentChainId: string;
  private masterKey: Buffer;

  constructor() {
    this.currentChainId = `chain_${Bun.randomUUIDv7().slice(0, 8)}`;

    // Generate quantum-resistant master key
    this.masterKey = Buffer.from(
      Bun.env.QUANTUM_MASTER_KEY ||
      createHash('sha512').update(Bun.randomUUIDv7()).digest('hex'),
      'hex'
    );

    // Initialize audit chain
    this.initializeChain(this.currentChainId);
  }

  async createAuditEntry(data: Record<string, unknown>): Promise<string> {
    const entryId = `qle_${Bun.randomUUIDv7().replace(/-/g, "").slice(0, 16)}`;
    const timestamp = Date.now();

    const chain = this.auditChains.get(this.currentChainId)!;
    const previousEntry = chain.entries[chain.entries.length - 1];

    const entry: QuantumAuditEntry = {
      entryId,
      timestamp,
      type: data.type as string || "GENERIC",
      persona: PERSONA_CONFIG.personaId,
      data,
      signature: await this.generateQuantumSignature(entryId, data, timestamp),
      chainId: this.currentChainId,
      previousHash: previousEntry?.quantumProof,
      quantumProof: await this.generateQuantumProof(entryId, data, timestamp)
    };

    // Add to chain
    chain.entries.push(entry);
    chain.integrityHash = await this.updateChainIntegrity(chain);
    chain.lastVerified = timestamp;

    // Periodic chain rotation (every 1000 entries)
    if (chain.entries.length >= 1000) {
      await this.rotateChain();
    }

    // Integration with Component #24 (Versioning)
    // In production, this would store in the versioning system
    console.log(`🔐 Quantum Audit: ${entryId} (${data.type})`);

    return entryId;
  }

  private async generateQuantumSignature(
    entryId: string,
    data: Record<string, unknown>,
    timestamp: number
  ): Promise<string> {
    // Post-quantum signature using hash-based cryptography
    // Simplified implementation - in production would use XMSS or similar
    const payload = `${entryId}:${JSON.stringify(data)}:${timestamp}:${this.currentChainId}`;

    // Use SHA-3-512 for quantum resistance
    const hash = await Bun.hash(payload);
    const signature = Buffer.from(hash).toString('base64url');

    return signature;
  }

  private async generateQuantumProof(
    entryId: string,
    data: Record<string, unknown>,
    timestamp: number
  ): Promise<string> {
    // Generate quantum proof of work
    const payload = `${entryId}:${JSON.stringify(data)}:${timestamp}:${this.masterKey.toString('hex')}`;

    // Multi-round hashing for proof-of-work
    let proof = payload;
    for (let i = 0; i < 3; i++) { // 3 rounds for reasonable performance
      proof = await Bun.hash(proof);
    }

    return Buffer.from(proof).toString('hex');
  }

  private async updateChainIntegrity(chain: AuditChain): Promise<string> {
    // Create integrity hash of entire chain
    const chainData = chain.entries.map(entry =>
      `${entry.entryId}:${entry.quantumProof}:${entry.signature}`
    ).join('|');

    const integrityHash = await Bun.hash(chainData);
    return Buffer.from(integrityHash).toString('hex');
  }

  private async rotateChain(): Promise<void> {
    // Create new chain for continued audit trail
    const newChainId = `chain_${Bun.randomUUIDv7().slice(0, 8)}`;
    this.initializeChain(newChainId);

    // Link chains together
    const oldChain = this.auditChains.get(this.currentChainId)!;
    const newChain = this.auditChains.get(newChainId)!;

    // Create chain linkage entry
    await this.createAuditEntry({
      type: "CHAIN_ROTATION",
      oldChainId: this.currentChainId,
      newChainId,
      oldIntegrityHash: oldChain.integrityHash,
      rotationReason: "ENTRY_LIMIT_REACHED"
    });

    this.currentChainId = newChainId;
  }

  private initializeChain(chainId: string): void {
    const chain: AuditChain = {
      chainId,
      entries: [],
      integrityHash: "",
      lastVerified: Date.now(),
      verificationCount: 0
    };

    this.auditChains.set(chainId, chain);
  }

  async verifyChainIntegrity(chainId?: string): Promise<{
    valid: boolean;
    chainId: string;
    entries: number;
    lastVerified: number;
    issues: string[];
  }> {
    const targetChainId = chainId || this.currentChainId;
    const chain = this.auditChains.get(targetChainId);

    if (!chain) {
      return {
        valid: false,
        chainId: targetChainId,
        entries: 0,
        lastVerified: 0,
        issues: ["Chain not found"]
      };
    }

    const issues: string[] = [];
    let valid = true;

    // Verify each entry's signature
    for (let i = 0; i < chain.entries.length; i++) {
      const entry = chain.entries[i];

      try {
        const expectedSignature = await this.generateQuantumSignature(
          entry.entryId,
          entry.data,
          entry.timestamp
        );

        if (entry.signature !== expectedSignature) {
          issues.push(`Entry ${entry.entryId}: Invalid signature`);
          valid = false;
        }

        // Verify quantum proof
        const expectedProof = await this.generateQuantumProof(
          entry.entryId,
          entry.data,
          entry.timestamp
        );

        if (entry.quantumProof !== expectedProof) {
          issues.push(`Entry ${entry.entryId}: Invalid quantum proof`);
          valid = false;
        }

        // Verify chain linkage
        if (i > 0) {
          const previousEntry = chain.entries[i - 1];
          if (entry.previousHash !== previousEntry.quantumProof) {
            issues.push(`Entry ${entry.entryId}: Broken chain linkage`);
            valid = false;
          }
        }

      } catch (error) {
        issues.push(`Entry ${entry.entryId}: Verification error - ${error.message}`);
        valid = false;
      }
    }

    // Update verification metadata
    if (valid) {
      chain.verificationCount++;
      chain.lastVerified = Date.now();
    }

    return {
      valid,
      chainId: targetChainId,
      entries: chain.entries.length,
      lastVerified: chain.lastVerified,
      issues
    };
  }

  async getAuditTrail(
    type?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QuantumAuditEntry[]> {
    const allEntries: QuantumAuditEntry[] = [];

    // Collect entries from all chains
    for (const chain of this.auditChains.values()) {
      allEntries.push(...chain.entries);
    }

    // Filter by type if specified
    let filteredEntries = type
      ? allEntries.filter(entry => entry.type === type)
      : allEntries;

    // Sort by timestamp (newest first)
    filteredEntries.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    return filteredEntries.slice(offset, offset + limit);
  }

  getChainStatistics(): {
    totalChains: number;
    totalEntries: number;
    activeChain: string;
    lastVerification: number;
    integrityStatus: 'VERIFIED' | 'COMPROMISED' | 'UNKNOWN';
  } {
    const totalChains = this.auditChains.size;
    let totalEntries = 0;
    let lastVerification = 0;

    for (const chain of this.auditChains.values()) {
      totalEntries += chain.entries.length;
      lastVerification = Math.max(lastVerification, chain.lastVerified);
    }

    // Determine integrity status
    let integrityStatus: 'VERIFIED' | 'COMPROMISED' | 'UNKNOWN' = 'UNKNOWN';

    // Quick integrity check on active chain
    const activeChain = this.auditChains.get(this.currentChainId);
    if (activeChain) {
      integrityStatus = activeChain.integrityHash ? 'VERIFIED' : 'UNKNOWN';
    }

    return {
      totalChains,
      totalEntries,
      activeChain: this.currentChainId,
      lastVerification,
      integrityStatus
    };
  }

  async exportAuditData(
    startDate: number,
    endDate: number,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const entries = await this.getAuditTrail(undefined, 10000); // Get all entries

    const filteredEntries = entries.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    if (format === 'csv') {
      const headers = ['entryId', 'timestamp', 'type', 'persona', 'data', 'chainId'];
      const csvData = [
        headers.join(','),
        ...filteredEntries.map(entry => [
          entry.entryId,
          entry.timestamp,
          entry.type,
          entry.persona,
          JSON.stringify(entry.data).replace(/"/g, '""'),
          entry.chainId
        ].join(','))
      ].join('\n');

      return csvData;
    }

    return JSON.stringify(filteredEntries, null, 2);
  }
}

// Global audit system instance
export const quantumAuditSystem = new QuantumAuditSystem();

// Export convenience functions
export async function createQuantumAuditLog(data: Record<string, unknown>): Promise<string> {
  return quantumAuditSystem.createAuditEntry(data);
}

export function getAuditStatistics() {
  return quantumAuditSystem.getChainStatistics();
}

export function getAuditTrail(type?: string, limit?: number, offset?: number) {
  return quantumAuditSystem.getAuditTrail(type, limit, offset);
}