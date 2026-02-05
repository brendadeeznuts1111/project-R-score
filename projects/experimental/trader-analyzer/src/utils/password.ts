#!/usr/bin/env bun
/**
 * @fileoverview Password Utilities - Bun-native password hashing and verification
 * @description Password hashing using Bun.password API (Bun 1.3+)
 * @module utils/password
 *
 * Bun 1.3 Features Used:
 * - Bun.password.hash() - Argon2id password hashing
 * - Bun.password.verify() - Password verification
 */

/**
 * Password hashing algorithms supported by Bun.password
 */
export type PasswordAlgorithm = "argon2id" | "bcrypt" | "scrypt";

/**
 * Password hashing options
 */
export interface PasswordHashOptions {
	/**
	 * Hashing algorithm to use
	 * @default "argon2id"
	 */
	algorithm?: PasswordAlgorithm;
	/**
	 * Cost parameter (algorithm-specific)
	 * - argon2id: memory cost (default: 65536)
	 * - bcrypt: rounds (default: 10)
	 * - scrypt: N parameter (default: 16384)
	 */
	cost?: number;
}

/**
 * Hash a password using Bun.password API
 *
 * @param password - Plain text password to hash
 * @param options - Hashing options
 * @returns Hashed password string
 *
 * @example
 * ```typescript
 * const hash = await hashPassword("myPassword123");
 * // Returns: "$argon2id$v=19$m=65536,t=2,p=1$..."
 * ```
 */
export async function hashPassword(
	password: string,
	options: PasswordHashOptions = {},
): Promise<string> {
	const { algorithm = "argon2id", cost } = options;

	const hashOptions: Parameters<typeof Bun.password.hash>[1] = {
		algorithm,
	};

	// Add cost parameter if specified
	if (cost !== undefined) {
		if (algorithm === "argon2id") {
			hashOptions.memoryCost = cost;
		} else if (algorithm === "bcrypt") {
			hashOptions.cost = cost;
		} else if (algorithm === "scrypt") {
			hashOptions.N = cost;
		}
	}

	return Bun.password.hash(password, hashOptions);
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await verifyPassword("myPassword123", hash);
 * if (isValid) {
 *   console.log("Password is correct!");
 * }
 * ```
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return Bun.password.verify(password, hash);
}

/**
 * Check if a string is a valid password hash
 *
 * @param hash - String to check
 * @returns True if string appears to be a password hash
 */
export function isPasswordHash(hash: string): boolean {
	// Check for common hash prefixes
	return (
		hash.startsWith("$argon2id$") ||
		hash.startsWith("$argon2i$") ||
		hash.startsWith("$argon2$") ||
		hash.startsWith("$2a$") ||
		hash.startsWith("$2b$") ||
		hash.startsWith("$2y$") ||
		hash.startsWith("$scrypt$")
	);
}

/**
 * Get algorithm from hash string
 *
 * @param hash - Password hash string
 * @returns Algorithm name or null if unknown
 */
export function getHashAlgorithm(hash: string): PasswordAlgorithm | null {
	if (
		hash.startsWith("$argon2id$") ||
		hash.startsWith("$argon2i$") ||
		hash.startsWith("$argon2$")
	) {
		return "argon2id";
	}
	if (
		hash.startsWith("$2a$") ||
		hash.startsWith("$2b$") ||
		hash.startsWith("$2y$")
	) {
		return "bcrypt";
	}
	if (hash.startsWith("$scrypt$")) {
		return "scrypt";
	}
	return null;
}
