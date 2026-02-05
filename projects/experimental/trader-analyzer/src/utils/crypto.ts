/**
 * @fileoverview Bun-Native Crypto Utilities
 * @description Reusable crypto utilities using Web Crypto API (zero-dependency)
 * @module utils/crypto
 * 
 * Replaces Node.js crypto and Buffer with Bun-native Web Crypto API:
 * - crypto.createHmac() → crypto.subtle (Web Crypto API)
 * - Buffer.from() → Uint8Array + manual hex conversion
 * - Zero dependencies, works in all Bun environments
 */

/**
 * Convert Uint8Array to hexadecimal string (Bun-native, no Buffer)
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Reusable crypto utilities using Web Crypto API
 * All methods are Bun-native and zero-dependency
 */
export class CryptoUtils {
	/**
	 * Generate HMAC-SHA256 signature
	 * Uses Web Crypto API (crypto.subtle) - zero dependency
	 * 
	 * @param key - Secret key for HMAC
	 * @param data - Data to sign
	 * @returns Hexadecimal signature string
	 * 
	 * @example
	 * ```typescript
	 * const sig = await CryptoUtils.hmacSha256(secret, payload);
	 * ```
	 */
	static async hmacSha256(key: string, data: string): Promise<string> {
		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(key),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);

		const signature = await crypto.subtle.sign(
			"HMAC",
			cryptoKey,
			new TextEncoder().encode(data),
		);

		// Convert to hex string (Bun-native, no Buffer)
		return uint8ArrayToHex(new Uint8Array(signature));
	}

	/**
	 * Generate SHA-256 hash
	 * Uses Web Crypto API (crypto.subtle) - zero dependency
	 * 
	 * @param data - Data to hash
	 * @returns Hexadecimal hash string
	 * 
	 * @example
	 * ```typescript
	 * const hash = await CryptoUtils.sha256("hello world");
	 * ```
	 */
	static async sha256(data: string): Promise<string> {
		const hash = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(data),
		);

		// Convert to hex string (Bun-native, no Buffer)
		return uint8ArrayToHex(new Uint8Array(hash));
	}

	/**
	 * Generate HMAC signature with custom algorithm
	 * Uses Web Crypto API (crypto.subtle) - zero dependency
	 * 
	 * @param key - Secret key for HMAC
	 * @param data - Data to sign
	 * @param algorithm - Hash algorithm (default: "SHA-256")
	 * @returns Hexadecimal signature string
	 * 
	 * @example
	 * ```typescript
	 * const sig256 = await CryptoUtils.hmac(key, data, "SHA-256");
	 * const sig512 = await CryptoUtils.hmac(key, data, "SHA-512");
	 * ```
	 */
	static async hmac(
		key: string,
		data: string,
		algorithm: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
	): Promise<string> {
		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(key),
			{ name: "HMAC", hash: algorithm },
			false,
			["sign"],
		);

		const signature = await crypto.subtle.sign(
			"HMAC",
			cryptoKey,
			new TextEncoder().encode(data),
		);

		return uint8ArrayToHex(new Uint8Array(signature));
	}

	/**
	 * Generate hash with custom algorithm
	 * Uses Web Crypto API (crypto.subtle) - zero dependency
	 * 
	 * @param data - Data to hash
	 * @param algorithm - Hash algorithm (default: "SHA-256")
	 * @returns Hexadecimal hash string
	 * 
	 * @example
	 * ```typescript
	 * const hash256 = await CryptoUtils.hash(data, "SHA-256");
	 * const hash512 = await CryptoUtils.hash(data, "SHA-512");
	 * ```
	 */
	static async hash(
		data: string,
		algorithm: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
	): Promise<string> {
		const hash = await crypto.subtle.digest(
			algorithm,
			new TextEncoder().encode(data),
		);

		return uint8ArrayToHex(new Uint8Array(hash));
	}

	/**
	 * Generate random bytes as hexadecimal string
	 * Uses Web Crypto API (crypto.getRandomValues) - zero dependency
	 * 
	 * @param bytes - Number of bytes to generate (default: 32)
	 * @returns Hexadecimal string
	 * 
	 * @example
	 * ```typescript
	 * const random = CryptoUtils.randomHex(32); // 64 hex characters
	 * ```
	 */
	static randomHex(bytes: number = 32): string {
		const buffer = new Uint8Array(bytes);
		crypto.getRandomValues(buffer);
		return uint8ArrayToHex(buffer);
	}

	/**
	 * Generate random bytes as Uint8Array
	 * Uses Web Crypto API (crypto.getRandomValues) - zero dependency
	 * 
	 * @param bytes - Number of bytes to generate (default: 32)
	 * @returns Uint8Array of random bytes
	 * 
	 * @example
	 * ```typescript
	 * const randomBytes = CryptoUtils.randomBytes(32);
	 * ```
	 */
	static randomBytes(bytes: number = 32): Uint8Array {
		const buffer = new Uint8Array(bytes);
		crypto.getRandomValues(buffer);
		return buffer;
	}
}
