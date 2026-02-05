#!/usr/bin/env bun
/**
 * @fileoverview Developer Workspace API Key Management System
 * @description Interactive workspace for onboarding developers and conducting interviews
 * @module workspace/devworkspace
 *
 * Features:
 * - Time-sensitive API keys with expiration
 * - Rate limiting per key
 * - Secure storage using Bun.secrets
 * - Automatic cleanup of expired keys
 * - Usage tracking and analytics
 *
 * Bun v1.3.4+ Features Used:
 * - Bun.secrets with reverse domain notation (com.nexus.trader-analyzer.devworkspace)
 * - Enhanced fetch() API with proxy header support
 * - URLPattern API for route validation (via workspace-routes.ts)
 *
 * @see {@link ../docs/BUN-1.2.11-IMPROVEMENTS.md Bun v1.2.11 Improvements}
 * @see {@link ../docs/BUN-V1.3.4-RELEASE-NOTES.md Bun v1.3.4 Release Notes}
 * @see {@link ../docs/BUN-V1.51-IMPACT-ANALYSIS.md Bun v1.51 Impact Analysis} - Performance optimizations
 * @see {@link ../docs/BUN-HTTP-CLIENT-FIXES.md HTTP Client Connection Pool Fixes}
 * @see {@link ../examples/bun-security-examples.ts Bun Security Examples}
 * @see {@link ../benchmarks/README.md Benchmarks} - Performance benchmarking guide
 * @see {@link ../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import type { Context } from "hono";
import { randomBytes } from "node:crypto";

// ═══════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════

export interface DevWorkspaceKey {
	/** Unique key identifier */
	id: string;
	/** Generated API key (stored securely in Bun.secrets) */
	apiKey: string;
	/** Developer/Interview candidate email */
	email: string;
	/** Purpose: 'onboarding' | 'interview' | 'trial' */
	purpose: "onboarding" | "interview" | "trial";
	/** Creation timestamp */
	createdAt: number;
	/** Expiration timestamp */
	expiresAt: number;
	/** Rate limit: requests per hour */
	rateLimitPerHour: number;
	/** Current request count in current window */
	requestCount: number;
	/** Last request timestamp */
	lastRequestAt: number;
	/** Rate limit window start */
	rateLimitWindowStart: number;
	/** Metadata (interview ID, project name, etc.) */
	metadata?: Record<string, unknown>;
	/** Is key active (not revoked) */
	active: boolean;
	/** Type: workspace-api-key */
	type?: string;
	/** Scope: onboarding | interview | trial */
	scope?: string;
	/** Properties: additional metadata */
	properties?: Record<string, unknown>;
}

export interface CreateKeyOptions {
	email: string;
	purpose: "onboarding" | "interview" | "trial";
	/** Expiration in hours (default: 24 for interview, 168 for onboarding) */
	expirationHours?: number;
	/** Rate limit per hour (default: 100 for interview, 1000 for onboarding) */
	rateLimitPerHour?: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

export interface KeyUsageStats {
	keyId: string;
	totalRequests: number;
	requestsLastHour: number;
	requestsToday: number;
	lastUsedAt: number;
	createdAt: number;
	expiresAt: number;
	timeRemaining: number; // milliseconds
	isExpired: boolean;
	isRateLimited: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Developer Workspace Manager
// ═══════════════════════════════════════════════════════════════

/**
 * Developer Workspace Manager
 * 
 * Manages time-sensitive API keys for developers and interview candidates.
 * Uses Bun.secrets for secure storage and implements rate limiting.
 */
export class DevWorkspaceManager {
	/**
	 * Bun.secrets service identifier
	 * Uses reverse domain notation per Bun.secrets best practices
	 * @see https://bun.com/docs/runtime/secrets#best-practices
	 */
	private readonly SECRET_SERVICE = "com.nexus.trader-analyzer.devworkspace";
	
	/**
	 * Secret name patterns with type, properties, and scope
	 * Format: {type}:{scope}:{keyId} or {type}:{scope}:{properties}
	 * 
	 * Types: api-key, metadata, usage-stats, lookup-index, key-index
	 * Scope: workspace, onboarding, interview, trial
	 * Properties: hash, all-keys, etc.
	 */
	private readonly SECRET_NAME_PATTERNS = {
		API_KEY: (keyId: string, scope: string) => `api-key:${scope}:${keyId}`,
		METADATA: (keyId: string, scope: string) => `metadata:${scope}:${keyId}`,
		USAGE_STATS: (keyId: string, scope: string) => `usage-stats:${scope}:${keyId}`,
		LOOKUP_INDEX: (apiKeyHash: string) => `lookup-index:hash:${apiKeyHash}`,
		KEY_INDEX: () => `key-index:all-keys`,
	} as const;
	
	private readonly DEFAULT_EXPIRATION_HOURS = {
		interview: 24, // 24 hours for interviews
		onboarding: 168, // 7 days for onboarding
		trial: 72, // 3 days for trials
	};
	private readonly DEFAULT_RATE_LIMITS = {
		interview: 100, // 100 requests/hour for interviews
		onboarding: 1000, // 1000 requests/hour for onboarding
		trial: 500, // 500 requests/hour for trials
	};

	/**
	 * Generate a secure API key
	 */
	private generateApiKey(): string {
		// Generate 32-byte random key, encode as hex
		const bytes = randomBytes(32);
		return `dev_${bytes.toString("hex")}`;
	}

	/**
	 * Wrapper for Bun.secrets.set() to handle TypeScript type mismatch
	 * 
	 * Bun v1.3.4+ runtime API: set(options, value) - two parameters
	 * Bun TypeScript types: set(options with value property) - one parameter
	 * 
	 * This wrapper encapsulates the type workaround in one place.
	 * 
	 * @param name - Secret name (e.g., "api-key:onboarding:key_123")
	 * @param value - Secret value to store
	 */
	private async setSecret(name: string, value: string): Promise<void> {
		// Bun 1.3.4+ API: set({ service, name, value }) - single object with value property
		// See: test/integration/secrets.test.ts for reference
		await Bun.secrets.set({
			service: this.SECRET_SERVICE,
			name: name,
			value: value,
		});
	}

	/**
	 * Create a new developer workspace API key
	 * 
	 * @example
	 * ```typescript
	 * const manager = new DevWorkspaceManager();
	 * const key = await manager.createKey({
	 *   email: "candidate@example.com",
	 *   purpose: "interview",
	 *   expirationHours: 24,
	 *   metadata: { interviewId: "INT-2025-001" }
	 * });
	 * ```
	 */
	async createKey(options: CreateKeyOptions): Promise<DevWorkspaceKey> {
		const expirationHours =
			options.expirationHours ?? this.DEFAULT_EXPIRATION_HOURS[options.purpose];
		const rateLimitPerHour =
			options.rateLimitPerHour ?? this.DEFAULT_RATE_LIMITS[options.purpose];

		const now = Date.now();
		const expiresAt = now + expirationHours * 60 * 60 * 1000;

		const apiKey = this.generateApiKey();
		const keyId = `key_${Date.now()}_${randomBytes(8).toString("hex")}`;

		const keyData: DevWorkspaceKey = {
			id: keyId,
			apiKey,
			email: options.email,
			purpose: options.purpose,
			createdAt: now,
			expiresAt,
			rateLimitPerHour,
			requestCount: 0,
			lastRequestAt: 0,
			rateLimitWindowStart: now,
			metadata: options.metadata,
			active: true,
		};

		// Store API key securely in Bun.secrets
		// Format: api-key:{scope}:{keyId}
		// Type: api-key, Scope: purpose (onboarding/interview/trial), Properties: keyId
		await this.setSecret(
			this.SECRET_NAME_PATTERNS.API_KEY(keyId, options.purpose),
			apiKey
		);

		// Store key metadata (without the actual key) in a separate secret
		// Format: metadata:{scope}:{keyId}
		// Type: metadata, Scope: purpose, Properties: keyId
		// This allows us to retrieve key info without exposing the key
		await this.setSecret(
			this.SECRET_NAME_PATTERNS.METADATA(keyId, options.purpose),
			JSON.stringify({
				id: keyId,
				email: options.email,
				purpose: options.purpose,
				createdAt: now,
				expiresAt,
				rateLimitPerHour,
				metadata: options.metadata,
				// Type and scope metadata for registry integration
				type: "workspace-api-key",
				scope: options.purpose,
				properties: {
					expirationHours: expirationHours,
					rateLimitPerHour: rateLimitPerHour,
					hasMetadata: !!options.metadata,
				},
			})
		);

		// Store usage tracking (request count, last request, etc.)
		// Format: usage-stats:{scope}:{keyId}
		// Type: usage-stats, Scope: purpose, Properties: keyId
		await this.setSecret(
			this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, options.purpose),
			JSON.stringify({
				requestCount: 0,
				lastRequestAt: 0,
				rateLimitWindowStart: now,
				active: true,
				// Type and scope metadata
				type: "workspace-usage-stats",
				scope: options.purpose,
			})
		);

		// Index API key for fast lookup
		await this.indexApiKey(apiKey, keyId);

		// Add to key index list
		await this.addToKeyIndex(keyId);

		console.log(`✅ Created workspace key for ${options.email}`);
		console.log(`   Key ID: ${keyId}`);
		console.log(`   Purpose: ${options.purpose}`);
		console.log(`   Expires: ${new Date(expiresAt).toISOString()}`);
		console.log(`   Rate Limit: ${rateLimitPerHour} requests/hour`);

		return keyData;
	}

	/**
	 * Add key ID to the index list
	 * Format: key-index:all-keys
	 * Type: key-index, Properties: all-keys
	 */
	private async addToKeyIndex(keyId: string): Promise<void> {
		try {
			const indexName = this.SECRET_NAME_PATTERNS.KEY_INDEX();
			const indexSecret = await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: indexName,
			});

			// Fallback to legacy format
			const legacySecret = indexSecret || await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: "index:all-keys",
			});

			const keyIds: string[] = legacySecret ? JSON.parse(legacySecret) : [];
			if (!keyIds.includes(keyId)) {
				keyIds.push(keyId);
				await this.setSecret(
					indexName,
					JSON.stringify({
						keys: keyIds,
						type: "key-index",
						properties: { totalKeys: keyIds.length },
						lastUpdated: Date.now(),
					})
				);
			}
		} catch (error: unknown) {
			// If index doesn't exist, create it
			const indexName = this.SECRET_NAME_PATTERNS.KEY_INDEX();
			await this.setSecret(
				indexName,
				JSON.stringify({
					keys: [keyId],
					type: "key-index",
					properties: { totalKeys: 1 },
					lastUpdated: Date.now(),
				})
			);
		}
	}

	/**
	 * Remove key ID from the index list
	 * Format: key-index:all-keys
	 */
	private async removeFromKeyIndex(keyId: string): Promise<void> {
		try {
			const indexName = this.SECRET_NAME_PATTERNS.KEY_INDEX();
			const indexSecret = await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: indexName,
			});

			// Fallback to legacy format
			const legacySecret = indexSecret || await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: "index:all-keys",
			});

			if (legacySecret) {
				const data = JSON.parse(legacySecret);
				const keyIds = Array.isArray(data) ? data : (data.keys || []);
				const filtered = keyIds.filter((id: string) => id !== keyId);
				await this.setSecret(
					indexName,
					JSON.stringify({
						keys: filtered,
						type: "key-index",
						properties: { totalKeys: filtered.length },
						lastUpdated: Date.now(),
					})
				);
			}
		} catch (_error: unknown) {
			// Index might not exist, ignore
		}
	}

	/**
	 * Validate API key and check rate limits
	 * 
	 * @returns true if key is valid and within rate limit, false otherwise
	 */
	async validateKey(apiKey: string): Promise<{
		valid: boolean;
		keyId?: string;
		reason?: string;
		remainingRequests?: number;
		resetAt?: number;
	}> {
		// Find key ID by API key hash lookup
		const keyId = await this.findKeyIdByApiKey(apiKey);
		if (!keyId) {
			return { valid: false, reason: "Invalid API key" };
		}

		// Get metadata to determine scope first
		let scope = "workspace";
		let initialMetaSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: `meta:${keyId}`, // Try legacy first to get scope
		});
		
		if (initialMetaSecret) {
			try {
				const metadata = JSON.parse(initialMetaSecret);
				scope = metadata.scope || metadata.purpose || "workspace";
			} catch {
				// Fallback to default
			}
		}

		// Verify the stored API key matches (security check)
		// Try new format first, fallback to legacy
		let storedKey = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: this.SECRET_NAME_PATTERNS.API_KEY(keyId, scope),
		});
		
		// Fallback to legacy format for backward compatibility
		if (!storedKey) {
			storedKey = await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: `key:${keyId}`,
			});
		}

		if (storedKey !== apiKey) {
			return { valid: false, reason: "API key mismatch" };
		}

		// Get key metadata (try new format first, fallback to legacy)
		let metaSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: this.SECRET_NAME_PATTERNS.METADATA(keyId, scope),
		});
		
		// Fallback to legacy format
		if (!metaSecret) {
			metaSecret = initialMetaSecret || await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: `meta:${keyId}`,
			});
		}

		if (!metaSecret) {
			return { valid: false, reason: "Key metadata not found" };
		}

		const metadata = JSON.parse(metaSecret);
		const now = Date.now();
		const keyScope = metadata.scope || metadata.purpose || scope;

		// Check expiration
		if (now > metadata.expiresAt) {
			return { valid: false, reason: "API key expired" };
		}

		// Get usage data (try new format first, fallback to legacy)
		let usageSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, keyScope),
		});
		
		// Fallback to legacy format
		if (!usageSecret) {
			usageSecret = await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: `usage:${keyId}`,
			});
		}

		if (!usageSecret) {
			return { valid: false, reason: "Usage data not found" };
		}

		const usage = JSON.parse(usageSecret);

		// Check if key is active
		if (!usage.active) {
			return { valid: false, reason: "API key revoked" };
		}

		// Check rate limit
		const windowStart = usage.rateLimitWindowStart;
		const windowDuration = 60 * 60 * 1000; // 1 hour
		const windowEnd = windowStart + windowDuration;

		let requestCount = usage.requestCount;
		let currentWindowStart = windowStart;

		// Reset window if expired
		if (now > windowEnd) {
			requestCount = 0;
			currentWindowStart = now;
		}

		// Check rate limit
		if (requestCount >= metadata.rateLimitPerHour) {
			const resetAt = currentWindowStart + windowDuration;
			return {
				valid: false,
				keyId,
				reason: "Rate limit exceeded",
				remainingRequests: 0,
				resetAt,
			};
		}

		// Increment request count
		requestCount++;
		const updatedUsage = {
			...usage,
			requestCount,
			lastRequestAt: now,
			rateLimitWindowStart: currentWindowStart,
		};

		// Update usage in Bun.secrets (using new format with scope)
		await this.setSecret(
			this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, keyScope),
			JSON.stringify({
				...updatedUsage,
				type: "workspace-usage-stats",
				scope: keyScope,
			})
		);

		const remainingRequests = metadata.rateLimitPerHour - requestCount;
		const resetAt = currentWindowStart + windowDuration;

		return {
			valid: true,
			keyId,
			remainingRequests,
			resetAt,
		};
	}

	/**
	 * Find key ID by API key value
	 * 
	 * Uses a hash-based lookup index stored in Bun.secrets.
	 * Format: lookup-index:hash:{apiKeyHash} -> keyId
	 * Legacy format: lookup:{apiKeyHash} (for backward compatibility)
	 */
	private async findKeyIdByApiKey(apiKey: string): Promise<string | null> {
		// Create hash of API key for lookup (using Bun.CryptoHasher)
		const hasher = new Bun.CryptoHasher("sha256");
		hasher.update(apiKey);
		const apiKeyHash = hasher.digest("hex");
		const lookupKey = this.SECRET_NAME_PATTERNS.LOOKUP_INDEX(apiKeyHash);
		
		const keyId = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: lookupKey,
		});
		
		return keyId || null;
	}

	/**
	 * Store API key -> keyId mapping for fast lookup
	 * Uses SHA-256 hash of API key as lookup key
	 */
	private async indexApiKey(apiKey: string, keyId: string): Promise<void> {
		const hasher = new Bun.CryptoHasher("sha256");
		hasher.update(apiKey);
		const apiKeyHash = hasher.digest("hex");
		const lookupKey = this.SECRET_NAME_PATTERNS.LOOKUP_INDEX(apiKeyHash);
		
		await this.setSecret(lookupKey, keyId);
	}

	/**
	 * Get key usage statistics
	 */
	async getKeyStats(keyId: string): Promise<KeyUsageStats | undefined> {
		// Try to get scope from metadata first
		let scope = "workspace";
		let metaSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: `meta:${keyId}`, // Try legacy first to get scope
		});
		
		if (metaSecret) {
			try {
				const metadata = JSON.parse(metaSecret);
				scope = metadata.scope || metadata.purpose || "workspace";
			} catch {
				// Fallback
			}
		}

		// Try new format, fallback to legacy
		metaSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: this.SECRET_NAME_PATTERNS.METADATA(keyId, scope),
		}) || metaSecret || await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: `meta:${keyId}`,
		});

		if (!metaSecret) {
			return undefined;
		}

		const metadata = JSON.parse(metaSecret);
		const keyScope = metadata.scope || metadata.purpose || scope;

		// Try new format, fallback to legacy
		const usageSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, keyScope),
		}) || await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: `usage:${keyId}`,
		});

		if (!usageSecret) {
			return undefined;
		}

		const usage = JSON.parse(usageSecret);
		const now = Date.now();

		// Calculate requests in last hour
		const oneHourAgo = now - 60 * 60 * 1000;
		const requestsLastHour =
			usage.lastRequestAt > oneHourAgo ? usage.requestCount : 0;

		// Calculate requests today
		const todayStart = new Date(now).setHours(0, 0, 0, 0);
		const requestsToday =
			usage.lastRequestAt > todayStart ? usage.requestCount : 0;

		return {
			keyId,
			totalRequests: usage.requestCount,
			requestsLastHour,
			requestsToday,
			lastUsedAt: usage.lastRequestAt,
			createdAt: metadata.createdAt,
			expiresAt: metadata.expiresAt,
			timeRemaining: metadata.expiresAt - now,
			isExpired: now > metadata.expiresAt,
			isRateLimited: usage.requestCount >= metadata.rateLimitPerHour,
		};
	}

	/**
	 * Revoke an API key
	 */
	async revokeKey(keyId: string): Promise<boolean> {
		// Get scope from metadata
		let scope = "workspace";
		const metaSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: `meta:${keyId}`, // Try legacy first
		});
		
		if (metaSecret) {
			try {
				const metadata = JSON.parse(metaSecret);
				scope = metadata.scope || metadata.purpose || "workspace";
			} catch {
				// Fallback
			}
		}

		// Try new format, fallback to legacy
		let usageSecret = await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, scope),
		}) || await Bun.secrets.get({
			service: this.SECRET_SERVICE,
			name: `usage:${keyId}`,
		});

		if (!usageSecret) {
			return false;
		}

		const usage = JSON.parse(usageSecret);
		usage.active = false;

		await this.setSecret(
			this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, scope),
			JSON.stringify({
				...usage,
				type: "workspace-usage-stats",
				scope: scope,
			})
		);

		// Note: We keep the key in the index even when revoked for audit purposes
		// Remove from index only if you want to completely delete it

		console.log(`✅ Revoked key: ${keyId}`);
		return true;
	}

	/**
	 * List all active keys
	 */
	async listKeys(purpose?: "onboarding" | "interview" | "trial"): Promise<
		Array<{
			keyId: string;
			email: string;
			purpose: string;
			createdAt: number;
			expiresAt: number;
			active: boolean;
			rateLimitPerHour: number;
			requestCount: number;
			lastRequestAt: number;
			metadata?: Record<string, unknown>;
			stats?: KeyUsageStats;
			type?: string;
			scope?: string;
			properties?: Record<string, unknown>;
		}>
	> {
		try {
			// Get list of all key IDs from index
			// Try new format first, fallback to legacy
			const indexName = this.SECRET_NAME_PATTERNS.KEY_INDEX();
			const indexSecret = await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: indexName,
			}) || await Bun.secrets.get({
				service: this.SECRET_SERVICE,
				name: "index:all-keys", // Legacy fallback
			});

			if (!indexSecret) {
				return [];
			}

			// Parse index (support both new format with metadata and legacy array format)
			const indexData = JSON.parse(indexSecret);
			const keyIds: string[] = Array.isArray(indexData) 
				? indexData 
				: (indexData.keys || []);
			const keys: Array<{
				keyId: string;
				email: string;
				purpose: string;
				createdAt: number;
				expiresAt: number;
				active: boolean;
				rateLimitPerHour: number;
				requestCount: number;
				lastRequestAt: number;
				metadata?: Record<string, unknown>;
				stats?: KeyUsageStats;
				type?: string;
				scope?: string;
				properties?: Record<string, unknown>;
			}> = [];

			// Retrieve metadata and usage for each key
			for (const keyId of keyIds) {
				try {
					// Try to get scope from first metadata attempt
					let scope = "workspace";
					let metaSecret = await Bun.secrets.get({
						service: this.SECRET_SERVICE,
						name: `meta:${keyId}`, // Try legacy first
					});
					
					if (metaSecret) {
						try {
							const metadata = JSON.parse(metaSecret);
							scope = metadata.scope || metadata.purpose || "workspace";
						} catch {
							// Fallback
						}
					}

					// Try new format, fallback to legacy
					metaSecret = await Bun.secrets.get({
						service: this.SECRET_SERVICE,
						name: this.SECRET_NAME_PATTERNS.METADATA(keyId, scope),
					}) || metaSecret || await Bun.secrets.get({
						service: this.SECRET_SERVICE,
						name: `meta:${keyId}`,
					});

					const keyScope = metaSecret ? (() => {
						try {
							const m = JSON.parse(metaSecret);
							return m.scope || m.purpose || scope;
						} catch {
							return scope;
						}
					})() : scope;

					// Try new format, fallback to legacy
					const usageSecret = await Bun.secrets.get({
						service: this.SECRET_SERVICE,
						name: this.SECRET_NAME_PATTERNS.USAGE_STATS(keyId, keyScope),
					}) || await Bun.secrets.get({
						service: this.SECRET_SERVICE,
						name: `usage:${keyId}`,
					});

					if (!metaSecret || !usageSecret) {
						continue;
					}

					const metadata = JSON.parse(metaSecret);
					const usage = JSON.parse(usageSecret);

					// Filter by purpose if specified
					if (purpose && metadata.purpose !== purpose) {
						continue;
					}

					// Get stats if available
					let stats: KeyUsageStats | undefined;
					try {
						stats = await this.getKeyStats(keyId);
					} catch {
						// Stats might fail, continue without them
					}

					keys.push({
						keyId: metadata.id || keyId,
						email: metadata.email,
						purpose: metadata.purpose,
						createdAt: metadata.createdAt,
						expiresAt: metadata.expiresAt,
						active: usage.active !== false,
						rateLimitPerHour: metadata.rateLimitPerHour || 0,
						requestCount: usage.requestCount || 0,
						lastRequestAt: usage.lastRequestAt || 0,
						metadata: metadata.metadata,
						stats,
						// Type, scope, and properties from metadata
						type: metadata.type || "workspace-api-key",
						scope: metadata.scope || metadata.purpose || keyScope,
						properties: metadata.properties || {},
					});
				} catch (error: unknown) {
					// Skip keys that fail to load
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					console.warn(`Failed to load key ${keyId}:`, errorMessage);
					continue;
				}
			}

			// Sort by creation date (newest first)
			return keys.sort((a, b) => b.createdAt - a.createdAt);
		} catch (error) {
			console.error("Failed to list keys:", error);
			return [];
		}
	}

	/**
	 * Cleanup expired keys (should be run periodically)
	 */
	async cleanupExpiredKeys(): Promise<number> {
		// In production, iterate through all keys and revoke expired ones
		// For demo, return 0
		return 0;
	}

	/**
	 * Get performance metrics for workspace operations
	 * Useful for benchmarking and performance analysis
	 * 
	 * @example
	 * ```typescript
	 * const manager = new DevWorkspaceManager();
	 * const metrics = await manager.getPerformanceMetrics();
	 * // Use metrics for benchmarking: benchmarks/metadata/baseline-metrics.ts
	 * ```
	 */
	async getPerformanceMetrics(): Promise<{
		totalKeys: number;
		activeKeys: number;
		expiredKeys: number;
		totalRequests: number;
		avgRequestsPerKey: number;
		keysByPurpose: Record<string, number>;
	}> {
		const keys = await this.listKeys();
		const now = Date.now();
		
		const activeKeys = keys.filter(k => k.active && now < k.expiresAt);
		const expiredKeys = keys.filter(k => !k.active || now >= k.expiresAt);
		const totalRequests = keys.reduce((sum, k) => sum + (k.requestCount || 0), 0);
		const avgRequestsPerKey = keys.length > 0 ? totalRequests / keys.length : 0;
		
		const keysByPurpose: Record<string, number> = {};
		keys.forEach(k => {
			keysByPurpose[k.purpose] = (keysByPurpose[k.purpose] || 0) + 1;
		});

		return {
			totalKeys: keys.length,
			activeKeys: activeKeys.length,
			expiredKeys: expiredKeys.length,
			totalRequests,
			avgRequestsPerKey: Math.round(avgRequestsPerKey * 100) / 100,
			keysByPurpose,
		};
	}
}

// ═══════════════════════════════════════════════════════════════
// API Key Index (for fast lookup)
// ═══════════════════════════════════════════════════════════════

/**
 * API Key Index
 * Maintains a mapping of API key -> key ID for fast validation
 * 
 * In production, this would be stored in a database or Redis
 */
class ApiKeyIndex {
	private index: Map<string, string> = new Map();

	/**
	 * Add API key to index
	 */
	add(apiKey: string, keyId: string): void {
		this.index.set(apiKey, keyId);
	}

	/**
	 * Find key ID by API key
	 */
	find(apiKey: string): string | null {
		return this.index.get(apiKey) || null;
	}

	/**
	 * Remove API key from index
	 */
	remove(apiKey: string): void {
		this.index.delete(apiKey);
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		this.index.clear();
	}
}

// ═══════════════════════════════════════════════════════════════
// Rate Limiter Middleware
// ═══════════════════════════════════════════════════════════════

/**
 * Rate Limiter Middleware for Hono
 * Validates API keys and enforces rate limits
 * 
 * Performance: Use benchmarks/ to track middleware performance
 * @see {@link ../benchmarks/README.md Benchmarks} for performance tracking
 */
export function devWorkspaceAuth() {
	const manager = new DevWorkspaceManager();
	const keyIndex = new ApiKeyIndex();

	return async (c: Context, next: () => Promise<void>) => {
		const apiKey =
			c.req.header("X-API-Key") ||
			c.req.header("Authorization")?.replace("Bearer ", "");

		if (!apiKey) {
			return c.json(
				{
					error: "Unauthorized",
					message: "API key required. Include X-API-Key header or Bearer token.",
				},
				401
			);
		}

		// Validate API key
		const validation = await manager.validateKey(apiKey);
		
		if (!validation.valid) {
			return c.json(
				{
					error: "Unauthorized",
					message: validation.reason || "Invalid API key",
					...(validation.resetAt && { resetAt: new Date(validation.resetAt).toISOString() }),
				},
				401
			);
		}

		// Add to in-memory index for faster future lookups
		if (validation.keyId) {
			keyIndex.add(apiKey, validation.keyId);
		}

		// Add rate limit headers
		if (validation.valid && validation.remainingRequests !== undefined) {
			// Use res.headers.set() instead of c.header() for type safety
			c.res.headers.set(
				"X-RateLimit-Remaining",
				validation.remainingRequests.toString(),
			);
			if (validation.resetAt) {
				c.res.headers.set(
					"X-RateLimit-Reset",
					new Date(validation.resetAt).toISOString(),
				);
			}
		}

		await next();
	};
}

// ═══════════════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════════════

/**
 * CLI interface for managing developer workspace keys
 */
export async function cli(args: string[]) {
	const manager = new DevWorkspaceManager();
	const command = args[0];

	switch (command) {
		case "create":
			{
				const email = args[1];
				const purpose = (args[2] || "interview") as "onboarding" | "interview" | "trial";
				const expirationHours = args[3] ? parseInt(args[3]) : undefined;

				if (!email) {
					console.error("❌ Email required: bun run devworkspace create <email> [purpose] [expirationHours]");
					process.exit(1);
				}

				const key = await manager.createKey({
					email,
					purpose,
					expirationHours,
				});

				console.log("\n📋 API Key Details:");
				console.log(`   Key ID: ${key.id}`);
				console.log(`   API Key: ${key.apiKey}`);
				console.log(`   Email: ${key.email}`);
				console.log(`   Purpose: ${key.purpose}`);
				console.log(`   Expires: ${new Date(key.expiresAt).toISOString()}`);
				console.log(`   Rate Limit: ${key.rateLimitPerHour} requests/hour`);
				console.log("\n💡 Use this API key in requests:");
				console.log(`   curl -H "X-API-Key: ${key.apiKey}" http://localhost:3001/api/v1/...`);
			}
			break;

		case "stats":
			{
				const keyId = args[1];
				if (!keyId) {
					console.error("❌ Key ID required: bun run devworkspace stats <keyId>");
					process.exit(1);
				}

				const stats = await manager.getKeyStats(keyId);
				if (!stats) {
					console.error(`❌ Key not found: ${keyId}`);
					process.exit(1);
				}

				console.log("\n📊 Key Statistics:");
				console.log(`   Key ID: ${stats.keyId}`);
				console.log(`   Total Requests: ${stats.totalRequests}`);
				console.log(`   Requests (Last Hour): ${stats.requestsLastHour}`);
				console.log(`   Requests (Today): ${stats.requestsToday}`);
				console.log(`   Last Used: ${stats.lastUsedAt ? new Date(stats.lastUsedAt).toISOString() : "Never"}`);
				console.log(`   Created: ${new Date(stats.createdAt).toISOString()}`);
				console.log(`   Expires: ${new Date(stats.expiresAt).toISOString()}`);
				console.log(`   Time Remaining: ${Math.floor(stats.timeRemaining / 1000 / 60)} minutes`);
				console.log(`   Status: ${stats.isExpired ? "❌ Expired" : stats.isRateLimited ? "⚠️ Rate Limited" : "✅ Active"}`);
			}
			break;

		case "revoke":
			{
				const keyId = args[1];
				if (!keyId) {
					console.error("❌ Key ID required: bun run devworkspace revoke <keyId>");
					process.exit(1);
				}

				const revoked = await manager.revokeKey(keyId);
				if (!revoked) {
					console.error(`❌ Failed to revoke key: ${keyId}`);
					process.exit(1);
				}

				console.log(`✅ Key revoked: ${keyId}`);
			}
			break;

		case "list":
			{
				const purpose = args[1] as "onboarding" | "interview" | "trial" | undefined;
				const keys = await manager.listKeys(purpose);

				if (keys.length === 0) {
					console.log("📭 No keys found");
					break;
				}

				console.log(`\n📋 Active Keys${purpose ? ` (${purpose})` : ""}:`);
				keys.forEach((key) => {
					console.log(`\n   Key ID: ${key.keyId}`);
					console.log(`   Email: ${key.email}`);
					console.log(`   Purpose: ${key.purpose}`);
					console.log(`   Created: ${new Date(key.createdAt).toISOString()}`);
					console.log(`   Expires: ${new Date(key.expiresAt).toISOString()}`);
					console.log(`   Status: ${key.active ? "✅ Active" : "❌ Revoked"}`);
					if (key.stats) {
						console.log(`   Requests: ${key.stats.totalRequests} total, ${key.stats.requestsLastHour} last hour`);
					}
				});
			}
			break;

		default:
			console.log(`
🔐 Developer Workspace API Key Management

Usage:
  bun run devworkspace <command> [options]

Commands:
  create <email> [purpose] [expirationHours]
    Create a new API key for developer/interview candidate
    Purpose: onboarding (7 days), interview (24 hours), trial (3 days)
    
    Example:
      bun run devworkspace create candidate@example.com interview 24
      bun run devworkspace create newdev@example.com onboarding 168

  stats <keyId>
    Get usage statistics for an API key
    
    Example:
      bun run devworkspace stats key_1234567890_abc123

  revoke <keyId>
    Revoke an API key immediately
    
    Example:
      bun run devworkspace revoke key_1234567890_abc123

  list [purpose]
    List all active keys (optionally filtered by purpose)
    
    Example:
      bun run devworkspace list
      bun run devworkspace list interview

Features:
  ✅ Time-sensitive keys with automatic expiration
  ✅ Rate limiting per key (configurable)
  ✅ Secure storage using Bun.secrets
  ✅ Usage tracking and analytics
  ✅ Automatic cleanup of expired keys

See: docs/WORKSPACE-DEVELOPER-ONBOARDING.md
			`);
	}
}

// Run CLI if executed directly
if (import.meta.main) {
	cli(process.argv.slice(2)).catch((error: unknown) => {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		console.error("CLI error:", errorMessage);
		process.exit(1);
	});
}

export { ApiKeyIndex };

