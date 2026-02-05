/**
 * Quantum Audit Trail System
 * Immutable logging with chain verification
 */

export interface QuantumAuditEntry {
  entryId: string;
  timestamp: number;
  type: string;
  persona: string;
  data: Record<string, unknown>;
  signature: string;
  chainId: string;
  prevHash: string;
}

// Audit log storage
const auditLog: QuantumAuditEntry[] = [];
let currentChainId: string | null = null;

/**
 * Initialize or get chain ID
 */
function getChainId(): string {
  if (!currentChainId) {
    currentChainId = `chain_${crypto.randomUUID().slice(0, 8)}`;
  }
  return currentChainId;
}

/**
 * Get previous entry hash for chain integrity
 */
function getPrevHash(): string {
  if (auditLog.length === 0) {
    return '0'.repeat(64); // Genesis block
  }
  const lastEntry = auditLog[auditLog.length - 1];
  return lastEntry.signature;
}

/**
 * Sign entry for integrity verification
 */
async function signEntry(entryId: string, data: Record<string, unknown>, prevHash: string): Promise<string> {
  const payload = `${entryId}:${JSON.stringify(data)}:${prevHash}:${Date.now()}`;
  const hash = Bun.hash(payload);
  return hash.toString(16).padStart(16, '0');
}

/**
 * Create quantum audit log entry
 */
export async function createQuantumAuditLog(data: Record<string, unknown>): Promise<string> {
  const entryId = `qle_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const prevHash = getPrevHash();
  const signature = await signEntry(entryId, data, prevHash);

  const entry: QuantumAuditEntry = {
    entryId,
    timestamp: Date.now(),
    type: (data.type as string) || 'GENERIC',
    persona: 't3-lattice-finder-v1.2.1',
    data,
    signature,
    chainId: getChainId(),
    prevHash,
  };

  auditLog.push(entry);

  return entryId;
}

/**
 * Verify chain integrity
 */
export function verifyChainIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 1; i < auditLog.length; i++) {
    const current = auditLog[i];
    const previous = auditLog[i - 1];

    if (current.prevHash !== previous.signature) {
      errors.push(`Chain break at entry ${i}: prevHash mismatch`);
    }

    if (current.chainId !== previous.chainId) {
      errors.push(`Chain break at entry ${i}: chainId mismatch`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get audit log entries
 */
export function getAuditLog(options?: {
  type?: string;
  limit?: number;
  since?: number;
}): QuantumAuditEntry[] {
  let entries = [...auditLog];

  if (options?.type) {
    entries = entries.filter(e => e.type === options.type);
  }

  if (options?.since) {
    entries = entries.filter(e => e.timestamp >= options.since);
  }

  if (options?.limit) {
    entries = entries.slice(-options.limit);
  }

  return entries;
}

/**
 * Get audit log statistics
 */
export function getAuditStats(): {
  totalEntries: number;
  chainId: string;
  chainIntegrity: boolean;
  entriesByType: Record<string, number>;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  const entriesByType: Record<string, number> = {};

  for (const entry of auditLog) {
    entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
  }

  return {
    totalEntries: auditLog.length,
    chainId: getChainId(),
    chainIntegrity: verifyChainIntegrity().valid,
    entriesByType,
    oldestEntry: auditLog[0]?.timestamp || null,
    newestEntry: auditLog[auditLog.length - 1]?.timestamp || null,
  };
}

/**
 * Export audit log as JSON
 */
export function exportAuditLog(): string {
  return JSON.stringify({
    chainId: getChainId(),
    entries: auditLog,
    integrity: verifyChainIntegrity(),
    exportedAt: Date.now(),
  }, null, 2);
}

/**
 * Clear audit log (for testing only)
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
  currentChainId = null;
}
