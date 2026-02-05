/**
 * Bun-Native Advanced ID Generation Utilities
 * 
 * Ultra-fast ID generation using Bun.randomUUIDv7 (20x faster than crypto.randomUUID)
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface IDGenerationOptions {
  prefix?: string;
  suffix?: string;
  length?: number;
  uppercase?: boolean;
  timestamp?: boolean;
}

export interface TransactionID {
  id: string;
  agentId: string;
  timestamp: number;
  uuid: string;
}

export interface BulkIDResult {
  ids: string[];
  count: number;
  generationTime: number;
  duplicates: number;
}

export class BunIDGenerator {
  private static agentCounter = 0;
  private static transactionCounter = 0;

  /**
   * Generate monotonic UUIDv7 for database indexing (20x faster than crypto.randomUUID)
   */
  static generateAgentId(): string {
    return `AG${Bun.randomUUIDv7().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
  }

  /**
   * Generate sequential agent ID with counter
   */
  static generateSequentialAgentId(): string {
    const counter = (++this.agentCounter).toString().padStart(6, '0');
    const uuid = Bun.randomUUIDv7().replace(/-/g, '').substring(0, 6).toUpperCase();
    return `AG${counter}${uuid}`;
  }

  /**
   * Generate bulk IDs in parallel
   */
  static generateBulkIds(count: number, options: IDGenerationOptions = {}): string[] {
    const { prefix = 'AG', suffix = '', uppercase = true, length = 12 } = options;
    
    return Array.from({ length: count }, () => {
      let id = Bun.randomUUIDv7().replace(/-/g, '').substring(0, length);
      if (uppercase) id = id.toUpperCase();
      return `${prefix}${id}${suffix}`;
    });
  }

  /**
   * Generate bulk IDs with performance tracking
   */
  static generateBulkIdsTracked(count: number, options: IDGenerationOptions = {}): BulkIDResult {
    const startTime = Bun.nanoseconds();
    const ids = this.generateBulkIds(count, options);
    const endTime = Bun.nanoseconds();
    
    // Check for duplicates
    const uniqueIds = new Set(ids);
    const duplicates = ids.length - uniqueIds.size;
    
    return {
      ids,
      count,
      generationTime: (endTime - startTime) / 1_000_000, // Convert to ms
      duplicates
    };
  }

  /**
   * Generate transaction IDs with timestamp encoding
   */
  static generateTxId(agentId: string): TransactionID {
    const uuid = Bun.randomUUIDv7();
    const timestamp = Date.now();
    const timestamp36 = timestamp.toString(36);
    const transactionId = `TX-${agentId}-${timestamp36}-${uuid.substring(19)}`;
    
    return {
      id: transactionId,
      agentId,
      timestamp,
      uuid
    };
  }

  /**
   * Generate sequential transaction ID
   */
  static generateSequentialTxId(agentId: string): TransactionID {
    const counter = (++this.transactionCounter).toString().padStart(8, '0');
    const uuid = Bun.randomUUIDv7();
    const timestamp = Date.now();
    
    return {
      id: `TX-${agentId}-${counter}-${uuid.substring(19)}`,
      agentId,
      timestamp,
      uuid
    };
  }

  /**
   * Decode UUIDv7 to timestamp
   */
  static decodeUUIDv7(uuid: string): number {
    // UUIDv7 format: 48-bit timestamp (ms) + random
    const hex = uuid.replace(/-/g, '');
    const timestampHex = hex.substring(0, 12); // First 48 bits
    return Number(parseInt(timestampHex, 16));
  }

  /**
   * Extract timestamp from transaction ID
   */
  static extractTimestampFromTxId(txId: string): number | null {
    const match = txId.match(/TX-[^-]+-([A-Za-z0-9]+)-/);
    if (match) {
      try {
        return parseInt(match[1], 36);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Generate phone number ID
   */
  static generatePhoneId(phoneNumber: string): string {
    const normalized = phoneNumber.replace(/\D/g, '');
    const hash = Bun.hash(normalized);
    const uuid = Bun.randomUUIDv7().replace(/-/g, '').substring(0, 8);
    return `PH${hash.toString(16).toUpperCase().padStart(8, '0')}${uuid}`;
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    const uuid = Bun.randomUUIDv7().replace(/-/g, '').substring(0, 16);
    return `SS${uuid.toUpperCase()}`;
  }

  /**
   * Generate workflow ID
   */
  static generateWorkflowId(): string {
    const uuid = Bun.randomUUIDv7().replace(/-/g, '').substring(0, 10);
    return `WF${uuid.toUpperCase()}`;
  }

  /**
   * Generate batch ID
   */
  static generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const uuid = Bun.randomUUIDv7().replace(/-/g, '').substring(0, 6);
    return `BT${timestamp.toUpperCase()}${uuid.toUpperCase()}`;
  }

  /**
   * Generate custom ID with pattern
   */
  static generateCustomId(pattern: string, options: IDGenerationOptions = {}): string {
    const uuid = Bun.randomUUIDv7().replace(/-/g, '');
    const timestamp = Date.now().toString();
    const counter = (++this.transactionCounter).toString();
    
    return pattern
      .replace('{uuid}', uuid)
      .replace('{uuid8}', uuid.substring(0, 8))
      .replace('{uuid12}', uuid.substring(0, 12))
      .replace('{uuid16}', uuid.substring(0, 16))
      .replace('{timestamp}', timestamp)
      .replace('{timestamp36}', Date.now().toString(36))
      .replace('{counter}', counter)
      .replace('{counter6}', counter.padStart(6, '0'))
      .replace('{counter8}', counter.padStart(8, '0'));
  }

  /**
   * Validate ID format
   */
  static validateId(id: string, pattern: RegExp): boolean {
    return pattern.test(id);
  }

  /**
   * Validate agent ID
   */
  static validateAgentId(id: string): boolean {
    return /^AG[A-F0-9]{12}$/i.test(id);
  }

  /**
   * Validate transaction ID
   */
  static validateTransactionId(id: string): boolean {
    return /^TX-[A-F0-9]+-[A-Za-z0-9]+-[A-F0-9]+$/i.test(id);
  }

  /**
   * Extract agent ID from transaction ID
   */
  static extractAgentIdFromTxId(txId: string): string | null {
    const match = txId.match(/^TX-([A-F0-9]+)-/i);
    return match ? match[1] : null;
  }

  /**
   * Generate ID with checksum
   */
  static generateIdWithChecksum(prefix: string, length: number = 12): string {
    const base = Bun.randomUUIDv7().replace(/-/g, '').substring(0, length);
    const checksum = this.calculateChecksum(base);
    return `${prefix}${base}${checksum}`;
  }

  /**
   * Calculate simple checksum
   */
  private static calculateChecksum(data: string): string {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data.charCodeAt(i);
    }
    return (sum % 36).toString(36).toUpperCase();
  }

  /**
   * Verify checksum
   */
  static verifyChecksum(id: string, prefixLength: number = 2, checksumLength: number = 1): boolean {
    if (id.length < prefixLength + checksumLength) return false;
    
    const prefix = id.substring(0, prefixLength);
    const base = id.substring(prefixLength, id.length - checksumLength);
    const checksum = id.substring(id.length - checksumLength);
    
    const expectedChecksum = this.calculateChecksum(base);
    return checksum === expectedChecksum;
  }

  /**
   * Generate time-based ID
   */
  static generateTimeBasedId(prefix: string = 'ID'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generate hash-based ID
   */
  static generateHashId(data: string, prefix: string = 'HS'): string {
    const hash = Bun.hash(data);
    return `${prefix}${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  /**
   * Generate nanosecond-precision ID
   */
  static generateNanoId(): string {
    const nanos = Bun.nanoseconds();
    const uuid = Bun.randomUUIDv7().replace(/-/g, '').substring(0, 8);
    return `NS${nanos.toString(36).toUpperCase()}${uuid.toUpperCase()}`;
  }

  /**
   * Bulk generate with different types
   */
  static generateMixedBulk(count: number): {
    agents: string[];
    transactions: string[];
    sessions: string[];
    workflows: string[];
  } {
    return {
      agents: this.generateBulkIds(count, { prefix: 'AG' }),
      transactions: Array.from({ length: count }, (_, i) => 
        this.generateTxId(`AG${String(i).padStart(6, '0')}`).id
      ),
      sessions: Array.from({ length: count }, () => this.generateSessionId()),
      workflows: Array.from({ length: count }, () => this.generateWorkflowId())
    };
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'agent') {
    const count = parseInt(args[1]) || 1;
    const result = BunIDGenerator.generateBulkIdsTracked(count, { prefix: 'AG' });
    console.log(`Generated ${result.count} agent IDs in ${result.generationTime.toFixed(2)}ms`);
    console.log(`First: ${result.ids[0]}`);
    console.log(`Last: ${result.ids[result.ids.length - 1]}`);
    if (result.duplicates > 0) {
      console.warn(`⚠️  Found ${result.duplicates} duplicates`);
    }
  } else if (args[0] === 'transaction') {
    const agentId = args[1] || 'AG000001';
    const tx = BunIDGenerator.generateTxId(agentId);
    console.log(`Transaction ID: ${tx.id}`);
    console.log(`Agent ID: ${tx.agentId}`);
    console.log(`Timestamp: ${new Date(tx.timestamp).toISOString()}`);
    console.log(`UUID: ${tx.uuid}`);
  } else if (args[0] === 'mixed') {
    const count = parseInt(args[1]) || 10;
    const result = BunIDGenerator.generateMixedBulk(count);
    console.log('=== Mixed ID Generation ===');
    console.log(`Agents: ${result.agents.length}`);
    console.log(`Transactions: ${result.transactions.length}`);
    console.log(`Sessions: ${result.sessions.length}`);
    console.log(`Workflows: ${result.workflows.length}`);
    console.log('');
    console.log('Sample IDs:');
    console.log(`Agent: ${result.agents[0]}`);
    console.log(`Transaction: ${result.transactions[0]}`);
    console.log(`Session: ${result.sessions[0]}`);
    console.log(`Workflow: ${result.workflows[0]}`);
  } else if (args[0] === 'validate') {
    const id = args[1];
    if (!id) {
      console.log('Usage: bun id-generator.ts validate <id>');
      process.exit(1);
    }
    
    console.log(`Validating: ${id}`);
    console.log(`Agent ID: ${BunIDGenerator.validateAgentId(id) ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`Transaction ID: ${BunIDGenerator.validateTransactionId(id) ? '✅ Valid' : '❌ Invalid'}`);
    
    if (BunIDGenerator.validateTransactionId(id)) {
      const agentId = BunIDGenerator.extractAgentIdFromTxId(id);
      const timestamp = BunIDGenerator.extractTimestampFromTxId(id);
      console.log(`Extracted Agent ID: ${agentId}`);
      console.log(`Extracted Timestamp: ${timestamp ? new Date(timestamp).toISOString() : 'Invalid'}`);
    }
  } else {
    console.log('Usage:');
    console.log('  bun id-generator.ts agent [count]');
    console.log('  bun id-generator.ts transaction [agentId]');
    console.log('  bun id-generator.ts mixed [count]');
    console.log('  bun id-generator.ts validate <id>');
  }
}
