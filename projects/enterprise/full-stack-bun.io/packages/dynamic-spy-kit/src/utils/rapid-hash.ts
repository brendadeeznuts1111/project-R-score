/**
 * @dynamic-spy/kit v9.0 - Rapid Hash Utility
 * 
 * Bun.hash.rapidhash() - 2× faster than city/metro, 64-bit non-crypto hash
 * Perfect for hash maps, bloom filters, or checksums in hot loops
 */

import { hash } from "bun";

/**
 * Generate rapid hash for a key
 * Returns 64-bit BigInt (non-cryptographic, fast)
 */
export function rapidHash(key: string | number | bigint): bigint {
	return hash.rapidhash(String(key));
}

/**
 * Generate rapid hash as string (for use in Map keys, etc.)
 */
export function rapidHashString(key: string | number | bigint): string {
	return hash.rapidhash(String(key)).toString();
}

/**
 * Generate rapid hash as number (for array indices, etc.)
 * Note: May lose precision for very large hashes
 */
export function rapidHashNumber(key: string | number | bigint): number {
	return Number(hash.rapidhash(String(key)));
}

/**
 * Create a hash map using rapid hash
 */
export class RapidHashMap<V> {
	private map: Map<string, V> = new Map();

	set(key: string | number | bigint, value: V): void {
		this.map.set(rapidHashString(key), value);
	}

	get(key: string | number | bigint): V | undefined {
		return this.map.get(rapidHashString(key));
	}

	has(key: string | number | bigint): boolean {
		return this.map.has(rapidHashString(key));
	}

	delete(key: string | number | bigint): boolean {
		return this.map.delete(rapidHashString(key));
	}

	clear(): void {
		this.map.clear();
	}

	get size(): number {
		return this.map.size;
	}

	keys(): string[] {
		return Array.from(this.map.keys());
	}

	values(): V[] {
		return Array.from(this.map.values());
	}

	entries(): Array<[string, V]> {
		return Array.from(this.map.entries());
	}
}

/**
 * Simple bloom filter using rapid hash
 */
export class RapidBloomFilter {
	private bits: Set<bigint> = new Set();
	private hashCount: number;

	constructor(private capacity: number, hashCount: number = 3) {
		this.hashCount = hashCount;
	}

	add(item: string | number | bigint): void {
		const baseHash = rapidHash(item);
		for (let i = 0; i < this.hashCount; i++) {
			const hash = baseHash + BigInt(i);
			this.bits.add(hash % BigInt(this.capacity));
		}
	}

	mightContain(item: string | number | bigint): boolean {
		const baseHash = rapidHash(item);
		for (let i = 0; i < this.hashCount; i++) {
			const hash = baseHash + BigInt(i);
			if (!this.bits.has(hash % BigInt(this.capacity))) {
				return false;
			}
		}
		return true;
	}

	clear(): void {
		this.bits.clear();
	}

	get size(): number {
		return this.bits.size;
	}
}

/**
 * Generate checksum for data using rapid hash
 */
export function rapidChecksum(data: string | Uint8Array): bigint {
	if (typeof data === 'string') {
		return hash.rapidhash(data);
	}
	// For binary data, convert to string representation
	return hash.rapidhash(new TextDecoder().decode(data));
}

/**
 * Compare two checksums
 */
export function checksumEqual(a: bigint, b: bigint): boolean {
	return a === b;
}



