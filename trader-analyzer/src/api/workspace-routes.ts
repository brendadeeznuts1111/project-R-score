#!/usr/bin/env bun
/**
 * @fileoverview Developer Workspace API Routes
 * @description REST API endpoints for managing developer workspace API keys
 * @module api/workspace-routes
 *
 * @see {@link ../workspace/devworkspace.ts DevWorkspaceManager}
 * @see {@link ../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import { Hono } from "hono";
import { devWorkspaceAuth, DevWorkspaceManager } from "../workspace/devworkspace";
import {
	getLatestBunVersion,
	getCurrentBunVersion,
} from "../utils/rss-parser.js";
import {
	RSS_FEED_URLS,
	RSS_BUN_VERSION_PATHS,
	BUN_DOCS_URLS,
} from "../utils/rss-constants.js";

const workspaceApi = new Hono();
const manager = new DevWorkspaceManager();

// ═══════════════════════════════════════════════════════════════
// Admin Routes (require admin authentication)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new developer workspace API key
 * @route POST /api/workspace/keys
 */
workspaceApi.post("/keys", async (c) => {
	try {
		const body = await c.req.json();
		const { email, purpose, expirationHours, rateLimitPerHour, metadata } = body;

		if (!email || !purpose) {
			return c.json(
				{
					error: "Invalid request",
					message: "Email and purpose are required",
				},
				400
			);
		}

		if (!["onboarding", "interview", "trial"].includes(purpose)) {
			return c.json(
				{
					error: "Invalid purpose",
					message: "Purpose must be: onboarding, interview, or trial",
				},
				400
			);
		}

		const key = await manager.createKey({
			email,
			purpose,
			expirationHours,
			rateLimitPerHour,
			metadata,
		});

		return c.json({
			success: true,
			key: {
				id: key.id,
				apiKey: key.apiKey, // Only returned on creation
				email: key.email,
				purpose: key.purpose,
				createdAt: new Date(key.createdAt).toISOString(),
				expiresAt: new Date(key.expiresAt).toISOString(),
				rateLimitPerHour: key.rateLimitPerHour,
				metadata: key.metadata,
			},
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to create key",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * Get key statistics
 * @route GET /api/workspace/keys/:keyId/stats
 */
workspaceApi.get("/keys/:keyId/stats", async (c) => {
	try {
		const keyId = c.req.param("keyId");
		const stats = await manager.getKeyStats(keyId);

		if (!stats) {
			return c.json(
				{
					error: "Not found",
					message: "Key not found",
				},
				404
			);
		}

		return c.json({
			success: true,
			stats: {
				keyId: stats.keyId,
				totalRequests: stats.totalRequests,
				requestsLastHour: stats.requestsLastHour,
				requestsToday: stats.requestsToday,
				lastUsedAt: stats.lastUsedAt
					? new Date(stats.lastUsedAt).toISOString()
					: null,
				createdAt: new Date(stats.createdAt).toISOString(),
				expiresAt: new Date(stats.expiresAt).toISOString(),
				timeRemaining: Math.floor(stats.timeRemaining / 1000 / 60), // minutes
				isExpired: stats.isExpired,
				isRateLimited: stats.isRateLimited,
			},
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get stats",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * Revoke an API key
 * @route DELETE /api/workspace/keys/:keyId
 */
workspaceApi.delete("/keys/:keyId", async (c) => {
	try {
		const keyId = c.req.param("keyId");
		const revoked = await manager.revokeKey(keyId);

		if (!revoked) {
			return c.json(
				{
					error: "Not found",
					message: "Key not found",
				},
				404
			);
		}

		return c.json({
			success: true,
			message: `Key ${keyId} revoked successfully`,
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to revoke key",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * List all keys
 * @route GET /api/workspace/keys
 */
workspaceApi.get("/keys", async (c) => {
	try {
		const purpose = c.req.query("purpose") as
			| "onboarding"
			| "interview"
			| "trial"
			| undefined;

		const keys = await manager.listKeys(purpose);

		return c.json(
			keys.map((key) => ({
				id: key.keyId,
				email: key.email,
				purpose: key.purpose,
				createdAt: key.createdAt,
				expiresAt: key.expiresAt,
				active: key.active,
				rateLimitPerHour: key.rateLimitPerHour,
				requestCount: key.requestCount,
				lastRequestAt: key.lastRequestAt,
				metadata: key.metadata,
			}))
		);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to list keys",
				message: errorMessage,
			},
			500
		);
	}
});

// ═══════════════════════════════════════════════════════════════
// Protected Routes (require valid API key)
// ═══════════════════════════════════════════════════════════════

/**
 * Get current key information (for the authenticated key)
 * @route GET /api/workspace/me
 */
workspaceApi.get("/me", devWorkspaceAuth(), async (c) => {
	try {
		const apiKey =
			c.req.header("X-API-Key") ||
			c.req.header("Authorization")?.replace("Bearer ", "");

		if (!apiKey) {
			return c.json({ error: "API key not found" }, 401);
		}

		// Validate key and get keyId (using public validateKey method)
		const validation = await manager.validateKey(apiKey);
		if (!validation) {
			return c.json({ error: "Invalid API key" }, 401);
		}
		const keyId = validation.keyId;
		if (!keyId) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		// Get key stats
		const stats = await manager.getKeyStats(keyId);
		if (!stats) {
			return c.json({ error: "Key not found" }, 404);
		}

		return c.json({
			success: true,
			keyId: stats.keyId,
			message: "Authenticated with developer workspace key",
			stats: {
				totalRequests: stats.totalRequests,
				requestsLastHour: stats.requestsLastHour,
				requestsToday: stats.requestsToday,
				isExpired: stats.isExpired,
				isRateLimited: stats.isRateLimited,
				timeRemaining: Math.floor(stats.timeRemaining / 1000 / 60), // minutes
			},
			headers: {
				"X-RateLimit-Remaining": c.res.headers.get("X-RateLimit-Remaining"),
				"X-RateLimit-Reset": c.res.headers.get("X-RateLimit-Reset"),
			},
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get key info",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * Get workspace configuration (API base URL, etc.)
 * @route GET /api/workspace/config
 */
workspaceApi.get("/config", async (c) => {
	try {
		// Get API base URL from environment or request headers
		const protocol = c.req.header("X-Forwarded-Proto") || "http";
		const host = c.req.header("Host") || c.req.header("X-Forwarded-Host") || "localhost:3001";
		const apiBaseUrl = `${protocol}://${host}`;

		// Read bunfig.toml to get linker configuration
		// Check both root bunfig.toml and config/bunfig.toml (priority: root > config)
		// Uses RSS_BUN_VERSION_PATHS constants for file paths
		let linker = "isolated";
		let configVersion = 1;
		let bunfigPath = "";
		try {
			// Try root bunfig.toml first (highest priority)
			const rootBunfig = Bun.file(RSS_BUN_VERSION_PATHS.BUNFIG_TOML);
			if (await rootBunfig.exists()) {
				const bunfigContent = await rootBunfig.text();
				const bunfig = Bun.TOML.parse(bunfigContent) as any;
				if (bunfig.install?.linker) {
					linker = bunfig.install.linker;
				}
				bunfigPath = RSS_BUN_VERSION_PATHS.BUNFIG_TOML;
			} else {
				// Fallback to config/bunfig.toml (RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG)
				const configBunfig = Bun.file(RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG);
				if (await configBunfig.exists()) {
					const bunfigContent = await configBunfig.text();
					const bunfig = Bun.TOML.parse(bunfigContent) as any;
					if (bunfig.install?.linker) {
						linker = bunfig.install.linker;
					}
					bunfigPath = RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG;
				}
			}
		} catch (error) {
			// Fallback to default if bunfig.toml can't be read
		}

		// Check if workspaces are configured
		let hasWorkspaces = false;
		let trustedDependencies: string[] = [];
		let overrides: Record<string, string> = {};
		let resolutions: Record<string, string> = {};
		let scopedRegistries: Record<string, unknown> = {};
		let catalog: Record<string, string> = {};
		let catalogs: Record<string, Record<string, string>> = {};
		let workspacePackages: string[] = [];
		let workspaceProtocolUsage: Record<string, string[]> = {};
		let linkedPackages: string[] = [];
		
		try {
			const packageJsonPath = Bun.file("package.json");
			if (await packageJsonPath.exists()) {
				const packageJson = await packageJsonPath.json();
				hasWorkspaces = !!(packageJson.workspaces && Array.isArray(packageJson.workspaces) && packageJson.workspaces.length > 0);
				trustedDependencies = Array.isArray(packageJson.trustedDependencies) ? packageJson.trustedDependencies : [];
				overrides = packageJson.overrides || {};
				resolutions = packageJson.resolutions || {};
				
				// Read catalog/catalogs
				if (packageJson.catalog) {
					catalog = packageJson.catalog;
				}
				if (packageJson.catalogs) {
					catalogs = packageJson.catalogs;
				}
				if (packageJson.workspaces && typeof packageJson.workspaces === 'object' && packageJson.workspaces.packages) {
					workspacePackages = packageJson.workspaces.packages || [];
				} else if (Array.isArray(packageJson.workspaces)) {
					workspacePackages = packageJson.workspaces;
				}
				
				// Check for workspace: and link: protocol usage in dependencies
				const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
				for (const [pkg, version] of Object.entries(deps)) {
					if (typeof version === 'string') {
						if (version.startsWith('workspace:')) {
							if (!workspaceProtocolUsage[version]) {
								workspaceProtocolUsage[version] = [];
							}
							workspaceProtocolUsage[version].push(pkg);
						} else if (version.startsWith('link:')) {
							linkedPackages.push(pkg);
						}
					}
				}
			}
		} catch (_error: unknown) {
			// Fallback if package.json can't be read
		}

		// Read scoped registries from bunfig.toml
		// Check both root bunfig.toml and config/bunfig.toml (priority: root > config)
		// Uses RSS_BUN_VERSION_PATHS constants for file paths
		try {
			let bunfigFile: File | null = null;
			
			// Try root bunfig.toml first
			const rootBunfig = Bun.file(RSS_BUN_VERSION_PATHS.BUNFIG_TOML);
			if (await rootBunfig.exists()) {
				bunfigFile = rootBunfig;
			} else {
				// Fallback to config/bunfig.toml (RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG)
				const configBunfig = Bun.file(RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG);
				if (await configBunfig.exists()) {
					bunfigFile = configBunfig;
				}
			}
			
			if (bunfigFile) {
				const bunfigContent = await bunfigFile.text();
				const bunfig = Bun.TOML.parse(bunfigContent) as Record<
					string,
					unknown
				>;
				if (
					bunfig.install &&
					typeof bunfig.install === "object" &&
					"scopes" in bunfig.install &&
					bunfig.install.scopes &&
					typeof bunfig.install.scopes === "object"
				) {
					scopedRegistries = bunfig.install.scopes as Record<
						string,
						unknown
					>;
				}
			}
		} catch (_error: unknown) {
			// Fallback if bunfig.toml can't be read
		}

		// Check lockfile status
		let lockfileExists = false;
		let lockfileFormat = "text";
		try {
			const lockfilePath = Bun.file("bun.lock");
			if (await lockfilePath.exists()) {
				lockfileExists = true;
				lockfileFormat = "text";
			} else {
				const lockfileBinaryPath = Bun.file("bun.lockb");
				if (await lockfileBinaryPath.exists()) {
					lockfileExists = true;
					lockfileFormat = "binary";
				}
			}
		} catch (_error: unknown) {
			// Fallback if lockfile check fails
		}

		// Get Bun version information
		const currentBunVersion = getCurrentBunVersion();
		let latestBunVersion: string | null = null;
		try {
			latestBunVersion = await getLatestBunVersion();
		} catch (_error: unknown) {
			// Silently fail if RSS feed is unavailable
		}

		return c.json({
			success: true,
			config: {
				apiBaseUrl,
				secretService: "com.nexus.trader-analyzer.devworkspace",
				storageBackend: "Bun.secrets",
				version: "1.0.0",
				runtime: {
					bun: {
						current: currentBunVersion,
						latest: latestBunVersion,
						isUpToDate: latestBunVersion
							? currentBunVersion === latestBunVersion
							: null,
						rssFeed: RSS_FEED_URLS.BUN,
					},
				},
				bunfig: {
					path: bunfigPath || null,
					location: bunfigPath ? (bunfigPath === RSS_BUN_VERSION_PATHS.BUNFIG_TOML ? "root" : "config") : null,
					lookupOrder: [
						`${RSS_BUN_VERSION_PATHS.BUNFIG_TOML} (root)`,
						RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG,
						"$XDG_CONFIG_HOME/.bunfig.toml",
						"$HOME/.bunfig.toml"
					],
				},
				packageManager: {
					linker,
					hasWorkspaces,
					configVersion,
					isIsolated: linker === "isolated",
					recommended: hasWorkspaces ? "isolated" : "hoisted",
					lockfile: {
						exists: lockfileExists,
						format: lockfileFormat,
						path: lockfileFormat === "text" ? "bun.lock" : "bun.lockb",
					},
					lifecycleScripts: {
						trustedDependencies,
						trustedCount: trustedDependencies.length,
						defaultTrusted: 500, // Top 500 npm packages
					},
					overrides: {
						enabled: Object.keys(overrides).length > 0,
						count: Object.keys(overrides).length,
						packages: Object.keys(overrides),
					},
					resolutions: {
						enabled: Object.keys(resolutions).length > 0,
						count: Object.keys(resolutions).length,
						packages: Object.keys(resolutions),
					},
					scopedRegistries: {
						enabled: Object.keys(scopedRegistries).length > 0,
						count: Object.keys(scopedRegistries).length,
						scopes: Object.keys(scopedRegistries),
					},
					catalog: {
						enabled: Object.keys(catalog).length > 0,
						count: Object.keys(catalog).length,
						packages: Object.keys(catalog),
						versions: catalog,
					},
					catalogs: {
						enabled: Object.keys(catalogs).length > 0,
						count: Object.keys(catalogs).length,
						names: Object.keys(catalogs),
						details: catalogs,
					},
					workspaceProtocol: {
						enabled: Object.keys(workspaceProtocolUsage).length > 0,
						count: Object.keys(workspaceProtocolUsage).length,
						usage: workspaceProtocolUsage,
						packages: workspacePackages,
					},
					linkedPackages: {
						enabled: linkedPackages.length > 0,
						count: linkedPackages.length,
						packages: linkedPackages,
					},
				},
			},
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get config",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * Get Bun runtime version information
 * @route GET /api/workspace/bun
 */
workspaceApi.get("/bun", async (c) => {
	try {
		const currentBunVersion = getCurrentBunVersion();
		const latestBunVersion = await getLatestBunVersion();
		
		return c.json({
			success: true,
			bun: {
				current: currentBunVersion,
				latest: latestBunVersion,
				isUpToDate: latestBunVersion
					? currentBunVersion === latestBunVersion
					: null,
				rssFeed: RSS_FEED_URLS.BUN,
				features: {
					secrets: "Bun.secrets (v1.3+)",
					csrf: "Bun.CSRF (v1.3+)",
					securityScanner: "Bun.Security.Scanner (v1.3+)",
					urlPattern: "URLPattern API (v1.3.4+)",
					fakeTimers: "Fake Timers for bun:test (v1.3.4+)",
				},
				documentation: {
					releases: RSS_FEED_URLS.BUN,
					docs: "BUN_DOCS_URLS.DOCS",
					changelog: "BUN_DOCS_URLS.BLOG",
				},
			},
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get Bun info",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * Get benchmark information and links
 * @route GET /api/workspace/benchmarks
 */
workspaceApi.get("/benchmarks", async (c) => {
	try {
		return c.json({
			success: true,
			benchmarks: {
				directory: "benchmarks/",
				readme: "benchmarks/README.md",
				tools: {
					create: "scripts/benchmarks/create-benchmark.ts",
					compare: "scripts/benchmarks/compare.ts",
				},
				documentation: {
					guide: "docs/BUN-V1.51-IMPACT-ANALYSIS.md",
					cpuProfiling: "docs/BUN-CPU-PROFILING.md",
				},
				endpoints: {
					create: "POST /api/workspace/benchmarks/create",
					list: "GET /api/workspace/benchmarks",
					compare: "POST /api/workspace/benchmarks/compare",
				},
			},
			message: "Use scripts/benchmarks/create-benchmark.ts to create benchmarks",
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get benchmark info",
				message: errorMessage,
			},
			500
		);
	}
});

export { workspaceApi };
