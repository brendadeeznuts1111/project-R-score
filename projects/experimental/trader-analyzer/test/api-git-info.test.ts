#!/usr/bin/env bun

/**
 * @fileoverview API Git Info Endpoint Test Suite
 * @description Comprehensive test coverage for the `/api/git-info` endpoint, validating
 * response structure, data accuracy, format compliance, error handling, and performance.
 * 
 * @module test/api-git-info
 * @author NEXUS Trading Platform
 * @since 2025-12-06
 * 
 * @example
 * ```bash
 * # Run all tests
 * bun test test/api-git-info.test.ts
 * 
 * # Run with custom API URL
 * API_URL=http://localhost:3000 bun test test/api-git-info.test.ts
 * 
 * # Run specific test
 * bun test test/api-git-info.test.ts -t "should return accurate commit hash"
 * ```
 * 
 * @see {@link https://github.com/brendadeeznuts1111/trader-analyzer-bun.git|Repository}
 * @see {@link src/api/routes.ts|API Implementation}
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { GIT_INFO_CONSTANTS } from "../src/api/git-info-constants";

// ═══════════════════════════════════════════════════════════════
// Configuration & Constants
// ═══════════════════════════════════════════════════════════════

/**
 * Base URL for the API server
 * @constant {string}
 * @default "http://localhost:3000"
 */
const API_BASE = process.env.API_URL || "http://localhost:3000";

/**
 * Full endpoint URL for git-info
 * @constant {string}
 */
const GIT_INFO_ENDPOINT = `${API_BASE}/api/git-info`;

/**
 * Maximum acceptable response time in milliseconds
 * @constant {number}
 * @see {@link GIT_INFO_CONSTANTS.PERFORMANCE.MAX_RESPONSE_TIME_MS}
 */
const MAX_RESPONSE_TIME_MS = GIT_INFO_CONSTANTS.PERFORMANCE.MAX_RESPONSE_TIME_MS;

/**
 * Expected length of full SHA-1 commit hash
 * @constant {number}
 * @see {@link GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL}
 */
const FULL_HASH_LENGTH = GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL;

/**
 * Expected length of short commit hash
 * @constant {number}
 * @see {@link GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT}
 */
const SHORT_HASH_LENGTH = GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT;

/**
 * ISO 8601 timestamp regex pattern
 * @constant {RegExp}
 * @see {@link GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.ISO_TIMESTAMP}
 */
const ISO_TIMESTAMP_REGEX = GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.ISO_TIMESTAMP;

/**
 * Hex hash validation regex (case-insensitive)
 * @constant {RegExp}
 * @see {@link GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.HEX_HASH}
 */
const HEX_HASH_REGEX = GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.HEX_HASH;

/**
 * Short hash validation regex (case-insensitive)
 * @constant {RegExp}
 * @see {@link GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.SHORT_HASH}
 */
const SHORT_HASH_REGEX = GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.SHORT_HASH;

// ═══════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════

/**
 * Git commit information structure
 * @interface CommitInfo
 */
interface CommitInfo {
	/** Full 40-character SHA-1 commit hash */
	full: string | null;
	/** Short 7-character commit hash (first 7 chars of full hash) */
	short: string | null;
	/** Byte-reversed commit hash (40 characters) */
	reverse: string | null;
}

/**
 * Complete git info response structure from API
 * @interface GitInfoResponse
 * @property {CommitInfo} commit - Commit hash information
 * @property {string | null} branch - Current git branch name
 * @property {string | null} repository - Repository name (currently always null)
 * @property {string | null} remoteUrl - Git remote origin URL
 * @property {string} timestamp - ISO 8601 timestamp of when info was retrieved
 */
interface GitInfoResponse {
	commit: CommitInfo;
	branch: string | null;
	repository: string | null;
	remoteUrl: string | null;
	timestamp: string;
}

/**
 * Error response structure when git is unavailable
 * @interface ErrorResponse
 */
interface ErrorResponse {
	/** Error flag (boolean or string) */
	error: boolean | string;
	/** Human-readable error message */
	message?: string;
}

// ═══════════════════════════════════════════════════════════════
// Helper Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Git environment detection and validation utilities
 * @namespace GitUtils
 */
namespace GitUtils {
	/**
	 * Checks if git command is available in the system PATH
	 * @returns {Promise<boolean>} True if git is installed and accessible
	 * @example
	 * ```typescript
	 * if (await GitUtils.isAvailable()) {
	 *   console.log("Git is available");
	 * }
	 * ```
	 */
	export async function isAvailable(): Promise<boolean> {
		try {
			const { exitCode } = Bun.spawnSync(["git", "--version"], {
				stdout: "pipe",
				stderr: "pipe",
			});
			return exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Checks if current directory is a git repository
	 * @returns {Promise<boolean>} True if `.git` directory exists and is valid
	 * @example
	 * ```typescript
	 * if (await GitUtils.isRepository()) {
	 *   console.log("In a git repository");
	 * }
	 * ```
	 */
	export async function isRepository(): Promise<boolean> {
		try {
			const { exitCode } = Bun.spawnSync(["git", "rev-parse", "--git-dir"], {
				stdout: "pipe",
				stderr: "pipe",
			});
			return exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Retrieves the current HEAD commit hash using git CLI
	 * @returns {Promise<string | null>} Full 40-character commit hash or null if unavailable
	 * @throws {Error} If git command fails unexpectedly
	 * @example
	 * ```typescript
	 * const hash = await GitUtils.getCommitHash();
	 * if (hash) {
	 *   console.log(`Current commit: ${hash}`);
	 * }
	 * ```
	 */
	export async function getCommitHash(): Promise<string | null> {
		try {
			const { stdout, exitCode } = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
				stdout: "pipe",
			});
			if (exitCode === 0) {
				return stdout.toString().trim();
			}
			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Retrieves the current branch name using git CLI
	 * @returns {Promise<string | null>} Branch name or null if unavailable
	 * @example
	 * ```typescript
	 * const branch = await GitUtils.getBranch();
	 * if (branch) {
	 *   console.log(`Current branch: ${branch}`);
	 * }
	 * ```
	 */
	export async function getBranch(): Promise<string | null> {
		try {
			const { stdout, exitCode } = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
				stdout: "pipe",
			});
			if (exitCode === 0) {
				return stdout.toString().trim();
			}
			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Calculates byte-reversed hash (for reverse hash validation)
	 * @param {string} hash - Full 40-character hex hash
	 * @returns {string | null} Byte-reversed hash or null if input is invalid
	 * @description Converts hex string to bytes, reverses byte order, converts back to hex.
	 * This matches the API implementation for reverse hash calculation.
	 * @example
	 * ```typescript
	 * const reversed = GitUtils.calculateReverseHash("abc123...");
	 * ```
	 */
	export function calculateReverseHash(hash: string): string | null {
		if (!hash || hash.length !== FULL_HASH_LENGTH) {
			return null;
		}
		try {
			const bytes = Buffer.from(hash, "hex");
			const reversed = Buffer.from(bytes.reverse());
			return reversed.toString("hex");
		} catch {
			return null;
		}
	}
}

/**
 * API response validation utilities
 * @namespace ResponseValidator
 */
namespace ResponseValidator {
	/**
	 * Validates commit hash format (full, short, reverse)
	 * @param {CommitInfo} commit - Commit info object to validate
	 * @returns {Array<string>} Array of validation error messages (empty if valid)
	 */
	export function validateCommitFormats(commit: CommitInfo): string[] {
		const errors: string[] = [];

		if (commit.full) {
			if (commit.full.length !== FULL_HASH_LENGTH) {
				errors.push(`Full hash length mismatch: expected ${FULL_HASH_LENGTH}, got ${commit.full.length}`);
			}
			if (!HEX_HASH_REGEX.test(commit.full)) {
				errors.push(`Full hash contains invalid characters: ${commit.full}`);
			}
		}

		if (commit.short) {
			if (commit.short.length !== SHORT_HASH_LENGTH) {
				errors.push(`Short hash length mismatch: expected ${SHORT_HASH_LENGTH}, got ${commit.short.length}`);
			}
			if (!SHORT_HASH_REGEX.test(commit.short)) {
				errors.push(`Short hash contains invalid characters: ${commit.short}`);
			}
			if (commit.full && !commit.full.startsWith(commit.short)) {
				errors.push(`Short hash does not match prefix of full hash: ${commit.short} vs ${commit.full.substring(0, 7)}`);
			}
		}

		if (commit.reverse) {
			if (commit.reverse.length !== FULL_HASH_LENGTH) {
				errors.push(`Reverse hash length mismatch: expected ${FULL_HASH_LENGTH}, got ${commit.reverse.length}`);
			}
			if (!HEX_HASH_REGEX.test(commit.reverse)) {
				errors.push(`Reverse hash contains invalid characters: ${commit.reverse}`);
			}
		}

		return errors;
	}

	/**
	 * Validates ISO 8601 timestamp format
	 * @param {string} timestamp - Timestamp string to validate
	 * @returns {boolean} True if timestamp is valid ISO 8601 format
	 */
	export function isValidISOTimestamp(timestamp: string): boolean {
		if (!ISO_TIMESTAMP_REGEX.test(timestamp)) {
			return false;
		}
		try {
			const date = new Date(timestamp);
			return date.toISOString() === timestamp;
		} catch {
			return false;
		}
	}

	/**
	 * Validates URL format or null
	 * @param {string | null} url - URL string to validate
	 * @returns {boolean} True if url is null or a valid URL
	 */
	export function isValidUrlOrNull(url: string | null): boolean {
		if (url === null) {
			return true;
		}
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe("API Git Info Endpoint", () => {
	describe("Basic Connectivity", () => {
		it("should respond with valid HTTP status code", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			// Acceptable status codes: 200 (success) or 404 (git unavailable)
			expect([200, 404]).toContain(response.status);
		});

		it("should return valid JSON content type", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.ok) {
				const contentType = response.headers.get("content-type");
				expect(contentType).toContain("application/json");
			}
		});

		it("should parse response as valid JSON", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.ok) {
				const data = await response.json();
				expect(data).toBeTruthy();
				expect(typeof data).toBe("object");
				expect(Array.isArray(data)).toBe(false);
			}
		});
	});

	describe("Response Structure", () => {
		it("should return correct top-level structure", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status === 404) {
				// Validate error response structure
				const data = await response.json() as ErrorResponse;
				expect(data).toHaveProperty("error");
				expect(data).toHaveProperty("message");
				expect(typeof data.message).toBe("string");
				return;
			}

			expect(response.status).toBe(200);
			const data = await response.json() as GitInfoResponse;

			// Validate all required top-level properties exist
			expect(data).toHaveProperty("commit");
			expect(data).toHaveProperty("branch");
			expect(data).toHaveProperty("repository");
			expect(data).toHaveProperty("remoteUrl");
			expect(data).toHaveProperty("timestamp");
		});

		it("should return correct commit object structure", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;

			expect(data.commit).toBeDefined();
			expect(typeof data.commit).toBe("object");
			expect(data.commit).toHaveProperty("full");
			expect(data.commit).toHaveProperty("short");
			expect(data.commit).toHaveProperty("reverse");
		});
	});

	describe("Commit Hash Validation", () => {
		it("should return valid commit hash formats", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			const errors = ResponseValidator.validateCommitFormats(data.commit);

			if (errors.length > 0) {
				throw new Error(`Commit format validation failed:\n${errors.join("\n")}`);
			}
		});

		it("should return accurate commit hash matching git CLI", async () => {
			if (!(await GitUtils.isAvailable()) || !(await GitUtils.isRepository())) {
				return;
			}

			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			const actualHash = await GitUtils.getCommitHash();

			if (actualHash && data.commit.full) {
				expect(data.commit.full).toBe(actualHash);
				expect(data.commit.short).toBe(actualHash.substring(0, SHORT_HASH_LENGTH));
			}
		});

		it("should return short hash as prefix of full hash", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;

			if (data.commit.full && data.commit.short) {
				expect(data.commit.full.startsWith(data.commit.short)).toBe(true);
			}
		});
	});

	describe("Branch Information", () => {
		it("should return accurate branch name matching git CLI", async () => {
			if (!(await GitUtils.isAvailable()) || !(await GitUtils.isRepository())) {
				return;
			}

			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			const actualBranch = await GitUtils.getBranch();

			if (actualBranch && data.branch) {
				expect(data.branch).toBe(actualBranch);
			}
		});

		it("should return branch as string or null", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			expect(data.branch === null || typeof data.branch === "string").toBe(true);
		});
	});

	describe("Metadata Validation", () => {
		it("should return valid ISO 8601 timestamp", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			
			expect(data.timestamp).toBeDefined();
			expect(typeof data.timestamp).toBe("string");
			expect(ResponseValidator.isValidISOTimestamp(data.timestamp)).toBe(true);
		});

		it("should return valid remote URL or null", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			
			expect(ResponseValidator.isValidUrlOrNull(data.remoteUrl)).toBe(true);
		});

		it("should return null for repository field", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status !== 200) {
				return;
			}

			const data = await response.json() as GitInfoResponse;
			expect(data.repository).toBeNull();
		});
	});

	describe("HTTP Headers", () => {
		it("should include CORS headers", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			const corsHeader = response.headers.get("Access-Control-Allow-Origin");
			expect(corsHeader).toBeTruthy();
		});

		it("should include Content-Type header", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			const contentType = response.headers.get("Content-Type");
			expect(contentType).toBeTruthy();
			
			if (response.ok) {
				expect(contentType).toContain("application/json");
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle non-git environments gracefully", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			// Should return either 200 (git available) or 404 (git unavailable)
			expect([200, 404]).toContain(response.status);
			
			if (response.status === 404) {
				const data = await response.json() as ErrorResponse;
				expect(data).toHaveProperty("error");
				expect(data).toHaveProperty("message");
				expect(typeof data.message).toBe("string");
				expect(data.message?.length).toBeGreaterThan(0);
			}
		});

		it("should return descriptive error message when git unavailable", async () => {
			const response = await fetch(GIT_INFO_ENDPOINT);
			
			if (response.status === 404) {
				const data = await response.json() as ErrorResponse;
				expect(data.message).toContain("Git information not available");
			}
		});
	});

	describe("Performance", () => {
		it("should respond within acceptable time limit", async () => {
			const startTime = Date.now();
			const response = await fetch(GIT_INFO_ENDPOINT);
			const responseTime = Date.now() - startTime;
			
			expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
		});

		it("should respond quickly for cached git info", async () => {
			// First request (may be slower)
			await fetch(GIT_INFO_ENDPOINT);
			
			// Second request (should be faster if cached)
			const startTime = Date.now();
			await fetch(GIT_INFO_ENDPOINT);
			const responseTime = Date.now() - startTime;
			
			// Should be reasonably fast (under cached threshold)
			expect(responseTime).toBeLessThan(GIT_INFO_CONSTANTS.PERFORMANCE.MAX_CACHED_RESPONSE_TIME_MS);
		});
	});
});
