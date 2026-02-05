/**
 * @fileoverview Distributed ID Generator
 * @description Generates distributed IDs with timestamp, node ID, and sequence
 * @module utils/distributed-id
 * 
 * Generates UUID-like IDs that embed:
 * - Timestamp (48 bits / 6 bytes)
 * - Node ID (10 bits, 0-1023)
 * - Sequence (12 bits, 0-4095)
 * - Random data (remaining bytes)
 * 
 * Format: timestamp (48 bits) + node (10 bits) + sequence (12 bits) + random (remaining)
 */

export interface ParsedID {
	timestamp: number;
	nodeId: number;
	sequence: number;
	uuid: string;
}

/**
 * Distributed ID Generator
 * 
 * Generates distributed IDs that are time-ordered and include node/sequence information.
 * Useful for distributed systems where you need to track which node generated an ID.
 * 
 * @example
 * ```typescript
 * const generator = new DistributedID(42); // Node ID 42
 * 
 * const id1 = generator.next();
 * const id2 = generator.next();
 * 
 * console.log('Generated ID 1:', id1);
 * console.log('Generated ID 2:', id2);
 * 
 * const parsed = generator.parse(id1);
 * console.log('Parsed ID:', parsed);
 * // { timestamp: 1234567890123, nodeId: 42, sequence: 0, uuid: '...' }
 * ```
 */
export class DistributedID {
	private nodeId: number;
	private sequence = 0;
	private lastTimestamp = 0;

	/**
	 * Create a distributed ID generator
	 * 
	 * @param nodeId - Node identifier (0-1023). Must be unique per node.
	 */
	constructor(nodeId: number = 0) {
		if (nodeId < 0 || nodeId > 1023) {
			throw new Error('Node ID must be between 0 and 1023');
		}
		this.nodeId = nodeId;
	}

	/**
	 * Generate the next distributed ID
	 * 
	 * @returns UUID-formatted string with embedded timestamp, node ID, and sequence
	 */
	next(): string {
		let timestamp = Date.now();

		// Handle same millisecond - increment sequence
		if (timestamp === this.lastTimestamp) {
			this.sequence++;

			// Sequence overflow, wait for next millisecond
			if (this.sequence >= 4096) {
				while (timestamp === this.lastTimestamp) {
					timestamp = Date.now();
				}
				this.sequence = 0;
			}
		} else {
			this.sequence = 0;
		}

		this.lastTimestamp = timestamp;

		// Create 16-byte buffer
		const buffer = new Uint8Array(16);

		// Write timestamp (48 bits / 6 bytes) - big endian
		// We'll use the first 6 bytes for timestamp
		const timestampBytes = this.writeUInt48BE(timestamp);
		buffer.set(timestampBytes, 0);

		// Write node + sequence (22 bits total: 10 bits node + 12 bits sequence)
		// Pack into 3 bytes (24 bits, we'll use 22)
		const nodeAndSeq = (this.nodeId << 12) | this.sequence;
		const nodeSeqBytes = this.writeUInt24BE(nodeAndSeq);
		buffer.set(nodeSeqBytes, 6);

		// Fill remaining 7 bytes with random data
		crypto.getRandomValues(buffer.subarray(9));

		// Format as UUID v7-like format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
		return this.formatAsUUID(buffer);
	}

	/**
	 * Parse a distributed ID to extract components
	 * 
	 * @param id - UUID-formatted string
	 * @returns Parsed components (timestamp, nodeId, sequence, uuid)
	 * @throws Error if ID format is invalid
	 */
	parse(id: string): ParsedID {
		// Remove hyphens and convert to bytes
		const clean = id.replace(/-/g, '');
		if (clean.length !== 32) {
			throw new Error(`Invalid ID format: expected 32 hex characters, got ${clean.length}`);
		}

		// Convert hex string to bytes
		const buffer = new Uint8Array(16);
		for (let i = 0; i < 32; i += 2) {
			const byte = parseInt(clean.substring(i, i + 2), 16);
			if (isNaN(byte)) {
				throw new Error(`Invalid hex character in ID: ${clean.substring(i, i + 2)}`);
			}
			buffer[i / 2] = byte;
		}

		// Extract timestamp (first 6 bytes, big endian)
		const timestamp = this.readUInt48BE(buffer, 0);

		// Extract node and sequence (bytes 6-8, big endian)
		const nodeAndSeq = this.readUInt24BE(buffer, 6);
		const nodeId = (nodeAndSeq >> 12) & 0x3FF; // Upper 10 bits
		const sequence = nodeAndSeq & 0x0FFF; // Lower 12 bits

		return {
			timestamp,
			nodeId,
			sequence,
			uuid: id
		};
	}

	/**
	 * Write 48-bit unsigned integer as big-endian (6 bytes)
	 */
	private writeUInt48BE(value: number): Uint8Array {
		const bytes = new Uint8Array(6);
		// Write 6 bytes, big endian
		for (let i = 5; i >= 0; i--) {
			bytes[i] = value & 0xFF;
			value = Math.floor(value / 256);
		}
		return bytes;
	}

	/**
	 * Read 48-bit unsigned integer from big-endian (6 bytes)
	 */
	private readUInt48BE(buffer: Uint8Array, offset: number): number {
		let value = 0;
		for (let i = 0; i < 6; i++) {
			value = (value * 256) + buffer[offset + i];
		}
		return value;
	}

	/**
	 * Write 24-bit unsigned integer as big-endian (3 bytes)
	 */
	private writeUInt24BE(value: number): Uint8Array {
		const bytes = new Uint8Array(3);
		bytes[0] = (value >> 16) & 0xFF;
		bytes[1] = (value >> 8) & 0xFF;
		bytes[2] = value & 0xFF;
		return bytes;
	}

	/**
	 * Read 24-bit unsigned integer from big-endian (3 bytes)
	 */
	private readUInt24BE(buffer: Uint8Array, offset: number): number {
		return (buffer[offset] << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2];
	}

	/**
	 * Format bytes as UUID string
	 */
	private formatAsUUID(buffer: Uint8Array): string {
		const hex = Array.from(buffer)
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		// Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
		return [
			hex.substring(0, 8),
			hex.substring(8, 12),
			hex.substring(12, 16),
			hex.substring(16, 20),
			hex.substring(20, 32)
		].join('-');
	}

	/**
	 * Get current node ID
	 */
	getNodeId(): number {
		return this.nodeId;
	}

	/**
	 * Get current sequence number
	 */
	getSequence(): number {
		return this.sequence;
	}
}
