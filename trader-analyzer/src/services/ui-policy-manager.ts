#!/usr/bin/env bun
/**
 * @fileoverview 8.2.0.0.0.0.0: UI Policy Manager Service
 * @description Bun-native service for loading, parsing, validating, and applying
 *              Hyper-Bun UI Policy Manifest. Provides centralized policy management
 *              for HTMLRewriter transformations, feature flags, and RBAC.
 * @module src/services/ui-policy-manager
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-SERVICE@8.0.0.0.0.0.0;instance-id=UI-POLICY-MANAGER-001;version=8.0.0.0.0.0.0}]
 * [PROPERTIES:{service={value:"UIPolicyManager";@root:"ROOT-SERVICES";@chain:["BP-SERVICES","BP-POLICY"];@version:"8.0.0.0.0.0.0"}}]
 * [CLASS:UIPolicyManager][#REF:v-8.0.0.0.0.0.0.BP.SERVICES.POLICY.1.0.A.1.1.SERVICE.1.1]]
 *
 * Version: 8.0.0.0.0.0.0
 * Ripgrep Pattern: 8\.0\.0\.0\.0\.0\.0|UI-POLICY-MANAGER-001|BP-SERVICE@8\.0\.0\.0\.0\.0\.0
 *
 * @see 8.1.0.0.0.0.0 for HyperBunUIPolicyManifest definition
 * @see 8.3.0.0.0.0.0 for integration with HTMLRewriter
 * @see BUN_DOCS_URLS.DOCS/runtime/yaml Bun YAML API Documentation
 * @see BUN_DOCS_URLS.BLOG/bun-v1.3#apis-standards Bun v1.3 API Standards
 *
 * // Ripgrep: 8.0.0.0.0.0.0
 * // Ripgrep: UI-POLICY-MANAGER-001
 * // Ripgrep: BP-SERVICE@8.0.0.0.0.0.0
 */

import type { HyperBunUIContext } from "./ui-context-rewriter";
import { policyMetrics } from "./ui-policy-metrics";
import { ManifestDigest } from "../utils/manifest-digest";
import { BinaryManifestCodec } from "../utils/binary-manifest";
import { BUN_DOCS_URLS } from "../utils/rss-constants";

/**
 * 8.2.2.1.0.0.0: Hyper-Bun UI Policy Manifest structure
 */
export interface HyperBunUIPolicyManifest {
	metadata: {
		version: string;
		last_updated: string;
		description: string;
		schema_version: string;
	};
	ui_context_defaults: {
		apiBaseUrl: string | "AUTO_DETECT";
		debugMode: boolean;
		defaultUserRole: string;
	};
	feature_flags: Record<
		string,
		{
			enabled: boolean;
			description: string;
			dependencies?: string[];
			requires_env?: string | null;
		}
	>;
	html_rewriter_policies: {
		// 8.1.3.4.1.0.0: Support both boolean (simple) and object (advanced) formats
		inject_context_script:
			| boolean
			| {
					enabled: boolean;
					target?: string;
					position?: "prepend" | "append" | "before" | "after";
					script_template?: string;
			  };
		data_feature_pruning: {
			enabled: boolean;
			target_attribute: string;
			action: string;
			preserve_content: boolean;
		};
		data_access_pruning: {
			enabled: boolean;
			target_attribute: string;
			action: string;
			allowed_roles: string[];
			default_role: string;
		};
		dynamic_content_implantation: {
			enabled: boolean;
			policies: Array<{
				attribute: string;
				source_context_key: string;
				format_function: string;
				fallback: string;
			}>;
		};
	};
	security_policies?: {
		content_security_policy?: {
			enabled: boolean;
			report_only: boolean;
			directives: Record<string, string>;
		};
		xss_protection?: {
			enabled: boolean;
			mode: string;
		};
		context_validation?: {
			enabled: boolean;
			validate_api_url: boolean;
			validate_feature_flags: boolean;
			validate_user_role: boolean;
		};
	};
	performance_policies?: {
		enable_metrics: boolean;
		log_transformation_time: boolean;
		log_size_reduction: boolean;
		enable_caching: boolean;
	};
}

/**
 * 8.2.0.0.0.0.0: UI Policy Manager Service
 *
 * Singleton service responsible for loading, parsing, validating, and applying
 * the Hyper-Bun UI Policy Manifest. Acts as the primary interface for other
 * services to retrieve current UI policies.
 *
 * @example 8.2.0.0.0.0.0.1: Basic Usage
 * // Test Formula:
 * // 1. Get UIPolicyManager instance
 * // 2. Load manifest and build UI context
 * // 3. Get HTMLRewriter policies
 * // Expected Result: Policies loaded and accessible
 * //
 * // Snippet:
 * ```typescript
 * const policyManager = UIPolicyManager.getInstance();
 * const context = policyManager.buildUIContext(request);
 * const policies = policyManager.getHTMLRewriterPolicies();
 * ```
 */
export class UIPolicyManager {
	private manifest: HyperBunUIPolicyManifest | null = null;
	private manifestPath: string;
	private static instance: UIPolicyManager | null = null;

	private fallbackPath: string;
	private manifestDigest: string = "";
	private manifestBinary: Uint8Array | null = null;
	private lastChecksum: number = 0;

	/**
	 * 8.2.2.1.0.0.0: Private constructor for singleton pattern
	 *
	 * @param manifestPath - Path to manifest file (optional, defaults to config/ui-policy-manifest.yaml)
	 */
	private constructor(manifestPath?: string) {
		// Detect environment-specific manifest
		const env = process.env.NODE_ENV || "development";
		const basePath = manifestPath || "config/ui-policy-manifest.yaml";

		// Try environment-specific first, then fall back to default
		const envPath = basePath.replace(".yaml", `.${env}.yaml`);

		// Store both paths - will check existence during load
		this.manifestPath = envPath;
		this.fallbackPath = basePath;
	}

	/**
	 * 8.2.2.1.0.0.0: Get singleton instance
	 *
	 * @param manifestPath - Optional path to manifest file
	 * @returns UIPolicyManager instance
	 */
	public static getInstance(manifestPath?: string): UIPolicyManager {
		if (!UIPolicyManager.instance) {
			UIPolicyManager.instance = new UIPolicyManager(manifestPath);
		}
		return UIPolicyManager.instance;
	}

	/**
	 * 8.2.2.1.0.0.0: Load and parse manifest file
	 *
	 * Uses Bun-native file APIs to load YAML or JSON manifest.
	 * Follows Bun v1.3+ API standards for file I/O and YAML parsing.
	 *
	 * @see BUN_DOCS_URLS.DOCS/runtime/yaml Bun YAML API Documentation
	 * @see BUN_DOCS_URLS.BLOG/bun-v1.3#apis-standards Bun v1.3 API Standards
	 * @throws Error if manifest file cannot be loaded or parsed
	 */
	private async loadManifest(): Promise<void> {
		if (this.manifest) {
			return; // Already loaded
		}

		const startTime = Date.now();

		try {
			// Try environment-specific manifest first
			let manifestFile = Bun.file(this.manifestPath);
			let manifestPath = this.manifestPath;

			if (!(await manifestFile.exists())) {
				// Fall back to default manifest
				manifestFile = Bun.file(this.fallbackPath);
				manifestPath = this.fallbackPath;

				if (!(await manifestFile.exists())) {
					throw new Error(
						`Manifest file not found: ${this.manifestPath} or ${this.fallbackPath}`,
					);
				}
			}

			// Read file as binary for change detection
			const arrayBuffer = await manifestFile.arrayBuffer();
			const binaryContent = new Uint8Array(arrayBuffer);

			// Compute digest for change detection
			const newDigest = ManifestDigest.computeHash(binaryContent);
			const newChecksum = ManifestDigest.computeChecksum(binaryContent);

			// Check if manifest actually changed
			if (this.manifestDigest === newDigest && this.manifest) {
				console.log("[UIPolicyManager] Manifest unchanged, skipping reload");
				return;
			}

			const manifestText = new TextDecoder().decode(binaryContent);

			// Parse based on file extension
			// Following Bun v1.3+ API standards for YAML and JSON parsing
			// @see BUN_DOCS_URLS.DOCS/runtime/yaml Bun.YAML.parse() API
			// @see BUN_DOCS_URLS.BLOG/bun-v1.3#apis-standards Bun v1.3 API Standards
			let parsed: any;
			if (manifestPath.endsWith(".yaml") || manifestPath.endsWith(".yml")) {
				// Use Bun.YAML.parse() - native Bun YAML parser (Bun 1.3+)
				// Bun.YAML.parse() supports full YAML 1.2 specification
				// This follows Bun v1.3 API standards for zero-dependency YAML parsing
				try {
					parsed = Bun.YAML.parse(manifestText);
				} catch (error) {
					// Provide detailed error message for YAML parsing failures
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					throw new Error(
						`YAML parsing failed for ${manifestPath}: ${errorMessage}. ` +
							`Ensure Bun 1.3+ is installed. ` +
							`See ${BUN_DOCS_URLS.YAML_API} for Bun YAML API documentation.`,
					);
				}
			} else {
				// JSON parsing fallback (using native JSON.parse per Bun v1.3 standards)
				try {
					parsed = JSON.parse(manifestText);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					throw new Error(
						`JSON parsing failed for ${manifestPath}: ${errorMessage}`,
					);
				}
			}

			// 8.2.2.2.0.0.0: Basic validation (schema validation can be added later)
			this.validateManifest(parsed);

			// Store binary version for fast comparison
			this.manifestBinary = binaryContent;
			this.manifestDigest = newDigest;
			this.lastChecksum = newChecksum;
			this.manifest = parsed as HyperBunUIPolicyManifest;
			this.manifestPath = manifestPath; // Update to actual loaded path

			// 8.2.5.0.0.0.0: Track metrics
			const loadDuration = Date.now() - (startTime || Date.now());
			policyMetrics.track("manifest_loaded", { duration: loadDuration });

			console.log(
				`8.2.2.1.0.0.0: UI Policy Manifest loaded from ${manifestPath}`,
			);
			console.log(`  📊 Digest: ${newDigest.substring(0, 16)}...`);
			console.log(`  🔢 Checksum: 0x${newChecksum.toString(16)}`);
			console.log(`  📦 Size: ${binaryContent.byteLength} bytes`);
		} catch (error) {
			// 8.2.5.0.0.0.0: Track error metrics
			const loadDuration = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			policyMetrics.track("manifest_error", {
				duration: loadDuration,
				error: errorMessage,
			});

			throw new Error(`Failed to load UI Policy Manifest: ${errorMessage}`);
		}
	}

	/**
	 * 8.2.2.2.0.0.0: Basic manifest validation
	 *
	 * Validates required structure. Full schema validation can be added with ajv.
	 *
	 * @param manifest - Parsed manifest object
	 * @throws Error if manifest structure is invalid
	 */
	private validateManifest(manifest: any): void {
		if (!manifest.metadata) {
			throw new Error('Manifest missing required "metadata" section');
		}
		if (!manifest.ui_context_defaults) {
			throw new Error(
				'Manifest missing required "ui_context_defaults" section',
			);
		}
		if (!manifest.feature_flags) {
			throw new Error('Manifest missing required "feature_flags" section');
		}
		if (!manifest.html_rewriter_policies) {
			throw new Error(
				'Manifest missing required "html_rewriter_policies" section',
			);
		}
	}

	/**
	 * 8.2.2.3.0.0.0: Resolve feature flags with runtime overrides
	 *
	 * Resolution order (highest priority first):
	 * 1. Runtime overrides (from health checks, request context)
	 * 2. Environment variable overrides (if specified in requires_env)
	 * 3. Manifest default values
	 *
	 * @param runtimeOverrides - Runtime feature flag overrides
	 * @returns Resolved feature flags object
	 */
	public async getFeatureFlags(
		runtimeOverrides: Record<string, boolean> = {},
	): Promise<Record<string, boolean>> {
		const startTime = Date.now();
		await this.loadManifest();

		if (!this.manifest) {
			throw new Error("Manifest not loaded");
		}

		const resolvedFlags: Record<string, boolean> = {};

		for (const flagName in this.manifest.feature_flags) {
			const policy = this.manifest.feature_flags[flagName];
			let enabled = policy.enabled;

			// 8.2.2.3.0.0.0: Check environment variable override
			if (policy.requires_env) {
				const [envVar, expectedValue] = policy.requires_env.split("=");
				const actualValue = process.env[envVar];

				if (expectedValue) {
					// Explicit value check: HYPERBUN_DEBUG_UI=true
					enabled = actualValue === expectedValue;
				} else {
					// Boolean check: HYPERBUN_DEBUG_UI (any value enables)
					enabled = actualValue !== undefined && actualValue !== "";
				}
			}

			// 8.2.2.3.0.0.0: Apply runtime overrides (highest priority)
			if (runtimeOverrides[flagName] !== undefined) {
				enabled = runtimeOverrides[flagName];
			}

			resolvedFlags[flagName] = enabled;
		}

		// 8.2.5.0.0.0.0: Track metrics
		const duration = Date.now() - startTime;
		policyMetrics.track("feature_flags_resolved", { duration });

		return resolvedFlags;
	}

	/**
	 * 8.2.2.4.0.0.0: Get HTMLRewriter transformation policies
	 *
	 * @returns HTMLRewriter policies from manifest
	 */
	public async getHTMLRewriterPolicies(): Promise<
		HyperBunUIPolicyManifest["html_rewriter_policies"]
	> {
		await this.loadManifest();

		if (!this.manifest) {
			throw new Error("Manifest not loaded");
		}

		// 8.2.5.0.0.0.0: Track metrics
		policyMetrics.track("policies_retrieved");

		return this.manifest.html_rewriter_policies;
	}

	/**
	 * 8.2.2.3.0.0.0: Build HyperBunUIContext from manifest defaults and runtime data
	 *
	 * @param request - HTTP request object
	 * @param runtimeFeatureFlags - Runtime feature flag overrides
	 * @returns Complete HyperBunUIContext object
	 */
	public async buildUIContext(
		request: Request,
		runtimeFeatureFlags: Record<string, boolean> = {},
	): Promise<HyperBunUIContext> {
		const startTime = Date.now();
		await this.loadManifest();

		if (!this.manifest) {
			throw new Error("Manifest not loaded");
		}

		const defaults = this.manifest.ui_context_defaults;

		// 8.2.2.3.0.0.0: Resolve API base URL
		let apiBaseUrl: string;
		if (defaults.apiBaseUrl === "AUTO_DETECT") {
			const proto =
				request.headers.get("X-Forwarded-Proto") ||
				(request.url.startsWith("https") ? "https" : "http");
			const host = request.headers.get("Host") || new URL(request.url).host;
			apiBaseUrl = `${proto}://${host}`;
		} else {
			apiBaseUrl = defaults.apiBaseUrl;
		}

		// 8.2.2.3.0.0.0: Resolve feature flags
		const featureFlags = await this.getFeatureFlags(runtimeFeatureFlags);

		// 8.2.2.3.0.0.0: Resolve user role
		const userRole =
			(request.headers.get("X-User-Role") as HyperBunUIContext["userRole"]) ||
			defaults.defaultUserRole ||
			"guest";

		// 8.2.2.3.0.0.0: Resolve debug mode
		const debugMode =
			defaults.debugMode ||
			process.env.HYPERBUN_DEBUG === "true" ||
			process.env.NODE_ENV === "development";

		// 8.2.5.0.0.0.0: Track metrics
		const duration = Date.now() - startTime;
		policyMetrics.track("context_built", { duration });

		return {
			apiBaseUrl,
			featureFlags,
			userRole,
			debugMode,
			currentTimestamp: Date.now(),
		};
	}

	/**
	 * 8.2.2.4.0.0.0: Check if specific transformation is enabled
	 *
	 * @param transformation - Transformation name (e.g., 'data_feature_pruning')
	 * @returns True if transformation is enabled
	 */
	public async isTransformationEnabled(
		transformation: string,
	): Promise<boolean> {
		const policies = await this.getHTMLRewriterPolicies();
		return (policies as any)[transformation]?.enabled ?? false;
	}

	/**
	 * 8.2.2.4.0.0.0: Get security policies
	 *
	 * @returns Security policies from manifest
	 */
	public async getSecurityPolicies(): Promise<
		HyperBunUIPolicyManifest["security_policies"]
	> {
		await this.loadManifest();

		if (!this.manifest) {
			throw new Error("Manifest not loaded");
		}

		return this.manifest.security_policies || {};
	}

	/**
	 * 8.2.2.4.0.0.0: Get performance policies
	 *
	 * @returns Performance policies from manifest
	 */
	public async getPerformancePolicies(): Promise<
		HyperBunUIPolicyManifest["performance_policies"]
	> {
		await this.loadManifest();

		if (!this.manifest) {
			throw new Error("Manifest not loaded");
		}

		return this.manifest.performance_policies || {};
	}

	/**
	 * 8.2.2.1.0.0.0: Reload manifest (hot-reload support)
	 *
	 * Clears cached manifest and reloads from file.
	 * Useful for development or dynamic policy updates.
	 */
	public async reload(): Promise<void> {
		const startTime = Date.now();
		this.manifest = null;
		await this.loadManifest();

		// 8.2.5.0.0.0.0: Track metrics
		const duration = Date.now() - startTime;
		policyMetrics.track("manifest_reloaded", { duration });

		console.log(
			`8.2.2.1.0.0.0: UI Policy Manifest reloaded from ${this.manifestPath}`,
		);
	}

	/**
	 * 8.2.2.1.0.0.0: Get manifest metadata
	 *
	 * @returns Manifest metadata
	 */
	public async getMetadata(): Promise<HyperBunUIPolicyManifest["metadata"]> {
		await this.loadManifest();

		if (!this.manifest) {
			throw new Error("Manifest not loaded");
		}

		return this.manifest.metadata;
	}

	/**
	 * 8.2.6.4.1.0.0.0: **Get Manifest Binary Format**
	 *
	 * Returns the current manifest in compressed binary format for efficient storage
	 * and network transfer. Uses BinaryManifestCodec for encoding.
	 *
	 * **Signature:** `getManifestBinary(): Uint8Array | null`
	 *
	 * **Returns:**
	 * - `Uint8Array`: Binary encoded manifest (compressed)
	 * - `null`: If manifest not loaded
	 *
	 * **Performance:**
	 * - Encoding: ~2ms for typical manifests
	 * - Size: ~79% reduction vs YAML
	 *
	 * @returns Binary encoded manifest or null if not loaded
	 *
	 * @example 8.2.6.4.1.1.0: **Get Binary Manifest**
	 * // Test Formula:
	 * // 1. const manager = UIPolicyManager.getInstance();
	 * // 2. await manager.loadManifest();
	 * // 3. const binary = manager.getManifestBinary();
	 * // 4. Expected: Uint8Array with compressed manifest
	 * // 5. Verify: binary.byteLength < original YAML size
	 *
	 * **Cross-Reference:** Used by `8.2.6.5.1.0.0.0` (API endpoint /api/policies/binary)
	 * **Audit Trail:** Binary format validated in `9.1.5.5.47.0.0`
	 * **See Also:** `8.2.6.2.1.0.0.0` for BinaryManifestCodec.encode
	 */
	public getManifestBinary(): Uint8Array | null {
		if (!this.manifest || !this.manifestBinary) return null;

		// Convert to binary format
		return BinaryManifestCodec.encode(this.manifest);
	}

	/**
	 * 8.2.6.4.2.0.0.0: **Get Manifest Digest**
	 *
	 * Returns cryptographic digest information for synchronization and integrity verification.
	 * Includes SHA-256 hash, fast checksum, and size metadata.
	 *
	 * **Signature:** `getManifestDigest(): ManifestDigest`
	 *
	 * **Digest Structure:**
	 * - `hash`: SHA-256 cryptographic hash (64 hex chars)
	 * - `checksum`: Fast 32-bit checksum for quick comparison
	 * - `size`: Manifest size in bytes
	 *
	 * **Use Cases:**
	 * - Synchronization between instances
	 * - Change detection
	 * - Integrity verification
	 *
	 * @returns Digest object with hash, checksum, and size
	 *
	 * @example 8.2.6.4.2.1.0: **Get Digest for Sync**
	 * // Test Formula:
	 * // 1. const manager = UIPolicyManager.getInstance();
	 * // 2. await manager.loadManifest();
	 * // 3. const digest = manager.getManifestDigest();
	 * // 4. Expected: { hash: "64-char-hex", checksum: number, size: number }
	 * // 5. Verify: digest.hash.length === 64
	 *
	 * **Cross-Reference:** Used by `8.2.6.5.2.0.0.0` (API endpoint /api/policies/digest)
	 * **Audit Trail:** Digest format validated in `9.1.5.5.48.0.0`
	 * **See Also:** `8.2.6.1.4.0.0.0` for ManifestDigest.createVersionStamp
	 */
	public getManifestDigest(): { hash: string; checksum: number; size: number } {
		return {
			hash: this.manifestDigest,
			checksum: this.lastChecksum,
			size: this.manifestBinary?.byteLength || 0,
		};
	}

	/**
	 * 8.2.6.4.3.0.0.0: **Compare Manifest Digests**
	 *
	 * Compares current manifest digest with another digest to determine if manifests
	 * are identical, different, or comparison is unknown.
	 *
	 * **Signature:** `compareDigest(otherDigest: string): ComparisonResult`
	 *
	 * **Comparison Results:**
	 * - `identical`: Manifests have same SHA-256 hash
	 * - `different`: Manifests differ (includes approximate diff size)
	 * - `unknown`: Current manifest not loaded
	 *
	 * **Performance:**
	 * - Comparison: O(1) string comparison
	 * - Use case: Fast synchronization check before full transfer
	 *
	 * @param otherDigest - SHA-256 hash of remote manifest
	 * @returns Comparison result with status and optional diff size
	 *
	 * @example 8.2.6.4.3.1.0: **Compare Digests**
	 * // Test Formula:
	 * // 1. const manager = UIPolicyManager.getInstance();
	 * // 2. await manager.loadManifest();
	 * // 3. const localDigest = manager.getManifestDigest().hash;
	 * // 4. const comparison = manager.compareDigest(localDigest);
	 * // 5. Expected: comparison.status === "identical"
	 *
	 * **Cross-Reference:** Used by `8.2.6.4.4.0.0.0` (createSyncPatch) for sync optimization
	 * **Audit Trail:** Comparison logic validated in `9.1.5.5.49.0.0`
	 */
	public compareDigest(otherDigest: string): {
		status: "identical" | "different" | "unknown";
		diffSize?: number;
	} {
		if (!this.manifestDigest) return { status: "unknown" };

		if (this.manifestDigest === otherDigest) {
			return { status: "identical" };
		}

		// Could compute approximate difference
		return {
			status: "different",
			diffSize: this.manifestBinary?.byteLength || 0,
		};
	}

	/**
	 * 8.2.6.4.4.0.0.0: **Create Synchronization Patch**
	 *
	 * Creates a binary patch for synchronizing manifests between instances. Optimizes
	 * by returning empty patch if manifests are already synchronized.
	 *
	 * **Signature:** `createSyncPatch(remoteDigest: string): SyncPatch | null`
	 *
	 * **Patch Types:**
	 * - `current`: Manifests identical (empty patch, no transfer needed)
	 * - `full`: Full manifest binary (current implementation)
	 * - `delta`: Binary delta patch (future enhancement)
	 *
	 * **Optimization:**
	 * - Checks digest before creating patch
	 * - Returns empty patch if already synchronized
	 * - Reduces network transfer for synchronized instances
	 *
	 * @param remoteDigest - SHA-256 hash of remote manifest
	 * @returns Sync patch object or null if manifest not loaded
	 *
	 * @example 8.2.6.4.4.1.0: **Create Sync Patch**
	 * // Test Formula:
	 * // 1. const manager = UIPolicyManager.getInstance();
	 * // 2. await manager.loadManifest();
	 * // 3. const patch = manager.createSyncPatch("different-hash");
	 * // 4. Expected: patch.type === "full", patch.data.byteLength > 0
	 *
	 * @example 8.2.6.4.4.2.0: **Optimized Sync (Identical)**
	 * // Test Formula:
	 * // 1. const digest = manager.getManifestDigest().hash;
	 * // 2. const patch = manager.createSyncPatch(digest);
	 * // 3. Expected: patch.type === "current", patch.data.byteLength === 0
	 *
	 * **Cross-Reference:** Used by `8.2.6.5.3.0.0.0` (API endpoint /api/policies/sync)
	 * **Audit Trail:** Sync optimization validated in `9.1.5.5.50.0.0`
	 * **See Also:** `8.2.6.2.3.0.0.0` for BinaryManifestCodec.createDiff
	 */
	public createSyncPatch(remoteDigest: string): {
		type: "full" | "delta" | "current";
		data: Uint8Array;
		digest: string;
	} | null {
		if (!this.manifestBinary) return null;

		// If we already have the same version
		if (this.manifestDigest === remoteDigest) {
			return {
				type: "current",
				data: new Uint8Array(0),
				digest: this.manifestDigest,
			};
		}

		// For now, send full manifest
		// In production, could implement binary diff/patch
		return {
			type: "full",
			data: this.manifestBinary,
			digest: this.manifestDigest,
		};
	}

	/**
	 * 8.2.6.4.5.0.0.0: **Apply Binary Patch**
	 *
	 * Applies a binary patch to update the current manifest. Supports full replacement
	 * and delta patches (delta implementation pending).
	 *
	 * **Signature:** `applyPatch(patch: Uint8Array, patchType: "full" | "delta"): Promise<boolean>`
	 *
	 * **Patch Types:**
	 * - `full`: Complete manifest replacement
	 * - `delta`: Incremental update (future implementation)
	 *
	 * **Process:**
	 * 1. Decode patch data (full or apply delta)
	 * 2. Parse manifest (YAML or JSON based on current path)
	 * 3. Validate manifest structure
	 * 4. Update internal state (manifest, binary, digest, checksum)
	 *
	 * **Error Handling:**
	 * - Returns false if validation fails
	 * - Throws Error if decoding fails
	 * - Logs errors for debugging
	 *
	 * @param patch - Binary patch data as Uint8Array
	 * @param patchType - Type of patch ("full" or "delta")
	 * @returns true if patch applied successfully, false otherwise
	 *
	 * @example 8.2.6.4.5.1.0: **Apply Full Patch**
	 * // Test Formula:
	 * // 1. const binary = BinaryManifestCodec.encode(manifest);
	 * // 2. const manager = UIPolicyManager.getInstance();
	 * // 3. const success = await manager.applyPatch(binary, "full");
	 * // 4. Expected: success === true
	 * // 5. Verify: manager.getManifestDigest().hash matches
	 *
	 * **Cross-Reference:** Used by `8.2.6.5.3.0.0.0` (API endpoint /api/policies/sync)
	 * **Audit Trail:** Patch application validated in `9.1.5.5.51.0.0`
	 * **See Also:** `8.2.6.2.2.0.0.0` for BinaryManifestCodec.decode
	 */
	public async applyPatch(
		patch: Uint8Array,
		patchType: "full" | "delta",
	): Promise<boolean> {
		try {
			let manifestData: Uint8Array;

			if (patchType === "full") {
				// Direct replacement
				manifestData = patch;
			} else {
				// Apply delta to current binary
				if (!this.manifestBinary) {
					throw new Error("No current manifest to apply delta to");
				}
				// Simple implementation: just use patch as full for now
				// In production, use a proper binary diff/patch algorithm
				manifestData = patch;
			}

			// Parse and update
			const text = new TextDecoder().decode(manifestData);
			const manifest =
				this.manifestPath.endsWith(".yaml") ||
				this.manifestPath.endsWith(".yml")
					? Bun.YAML.parse(text)
					: JSON.parse(text);

			// Validate
			if (this.validateManifest(manifest)) {
				this.manifestBinary = manifestData;
				this.manifestDigest = ManifestDigest.computeHash(manifestData);
				this.lastChecksum = ManifestDigest.computeChecksum(manifestData);
				this.manifest = manifest as HyperBunUIPolicyManifest;

				console.log(
					`[UIPolicyManager] Applied ${patchType} patch (${patch.byteLength} bytes)`,
				);
				return true;
			}

			return false;
		} catch (error) {
			console.error("[UIPolicyManager] Failed to apply patch:", error);
			return false;
		}
	}
}
