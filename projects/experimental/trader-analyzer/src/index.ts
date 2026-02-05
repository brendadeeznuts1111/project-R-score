/**
 * @fileoverview Trader Analyzer API Server
 * @description Multi-source trading analytics platform with Bun HMR support
 * @version 1.0.0
 *
 * @example
 * // Start the server with HMR
 * bun --hot run src/index.ts
 *
 * @example
 * // Access the API
 * curl http://localhost:3000/api/health
 *
 * @example
 * // View API documentation
 * open http://localhost:3000/docs
 */

import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { join } from "path";
import docs from "./api/docs";
import api from "./api/routes";
import { NexusError, wrapError } from "./errors";
import { csrf } from "./middleware/csrf";
import { migrateCredentials } from "./secrets/migrate";
import {
    UIContextRewriter
} from "./services/ui-context-rewriter";
import { UIPolicyManager } from "./services/ui-policy-manager";
import {
    box,
    colors,
    runtime,
    timing
} from "./utils";
import { getMemoryStats } from "./utils/bun";
import { initializeUrlAnomalyDatabase } from "./utils/database-initialization";
import { logger } from "./utils/logger";

// ============ WebSocket Data Types ============
/**
 * Unified WebSocket data type for Bun.serve() generic parameter
 * Combines data from different WebSocket endpoints (Telegram, UI Policy Metrics, Sportsbooks)
 *
 * @see {@link https://bun.sh/docs/api/http-server|Bun.serve() TypeScript Types}
 * @see {@link https://bun.com/docs/runtime/http/websockets#contextual-data|Bun WebSocket Contextual Data}
 * @see {@link ../utils/rss-constants.ts BUN_DOCS_URLS} - Use BUN_DOCS_URLS.WEBSOCKET_CONTEXTUAL_DATA constant
 * @see {@link ./docs/BUN-LATEST-BREAKING-CHANGES.md|Bun Latest Breaking Changes}
 */
interface UnifiedWebSocketData {
	/** WebSocket path for routing */
	path?: string;
	/** Client ID (unique identifier) */
	clientId?: string;
	/** User ID (Telegram WebSocket, Sportsbook WebSocket) */
	userId?: number | string;
	/** Username (Telegram WebSocket, Sportsbook WebSocket) */
	username?: string;
	/** Authentication token (Sportsbook WebSocket) */
	token?: string;
	/** Connection timestamp */
	connectedAt: number;
	/** Last activity timestamp (Sportsbook WebSocket) */
	lastActivity?: number;
	/** Last ping timestamp (Telegram WebSocket, Sportsbook WebSocket) */
	lastPing?: number;
	/** Unsubscribe function (UI Policy Metrics WebSocket) */
	unsubscribe?: () => void;
	/** Subscribed event types (UI Policy Metrics WebSocket) */
	subscribedTypes?: string[];
	/** Filters (Research Tension Feed WebSocket) */
	filters?: any;
	/** Subscribed sportsbooks (Sportsbook WebSocket) */
	subscribedSportsbooks?: Set<string>;
	/** Subscribed markets (Sportsbook WebSocket) */
	subscribedMarkets?: Set<string>;
	/** Subscribed to arbitrage (Sportsbook WebSocket) */
	subscribedArbitrage?: boolean;
	/** Market type filters (Sportsbook WebSocket) */
	marketTypeFilters?: Set<string>;
	/** Sport filters (Sportsbook WebSocket) */
	sportFilters?: Set<string>;
}

/**
 * Parse cookies from Cookie header string
 * @see {@link https://bun.com/docs/runtime/http/websockets#contextual-data|Bun WebSocket Contextual Data}
 * @see {@link ../utils/rss-constants.ts BUN_DOCS_URLS} - Use BUN_DOCS_URLS.WEBSOCKET_CONTEXTUAL_DATA constant
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
	if (!cookieHeader) return {};
	const cookies: Record<string, string> = {};
	cookieHeader.split(";").forEach((cookie) => {
		const [name, value] = cookie.trim().split("=");
		if (name && value) {
			cookies[name] = decodeURIComponent(value);
		}
	});
	return cookies;
}

// ============ HMR State Persistence ============
// Preserve state across hot reloads using import.meta.hot.data
interface HMRData {
	server?: Bun.Server<UnifiedWebSocketData>;
	reloadCount: number;
	startedAt: number;
}

// Initialize or restore HMR data
const hmrData: HMRData = import.meta.hot?.data ?? {
	reloadCount: 0,
	startedAt: Date.now(),
};

// Increment reload count on HMR
if (import.meta.hot) {
	hmrData.reloadCount++;
	import.meta.hot.data = hmrData;
}

const app = new Hono();

/**
 * Global Error Handler for Hono Application
 *
 * @description Handles errors that occur within Hono route handlers.
 * Errors at the Bun.serve() level are handled by the `error` callback in Bun.serve().
 *
 * @implementation
 * 1. Wraps all errors in NexusError for consistent error format
 * 2. Logs error with context (code, status, message, ref)
 * 3. Tracks error in database for monitoring and analysis
 * 4. Returns JSON error response with error registry metadata
 *
 * @see {@link https://hono.dev/api/hono#onerror|Hono onError Documentation}
 * @see {@link src/errors/index.ts|NEXUS Error Registry}
 *
 * @param {Error} err - The error that occurred
 * @param {Context} c - Hono context object
 * @returns {Promise<Response>} JSON error response
 */
app.onError(async (err, c) => {
	// Wrap error in NexusError for consistent handling
	const nexusErr = err instanceof NexusError ? err : wrapError(err);

	// Defensive error logging: Use Bun-style pattern for additional safety
	// (wrapError already handles most cases, but this adds extra defensive layer)
	const { logError } = await import("./utils/error-wrapper");
	logError(logger, `[${nexusErr.code}] ${c.req.method} ${c.req.path}`, err, {
		status: nexusErr.status,
		code: nexusErr.code,
		ref: nexusErr.ref,
		category: nexusErr.category,
	});

	// Track error in database
	try {
		const { getErrorTracker } = await import("./api/error-tracking");
		const tracker = getErrorTracker();
		tracker.logError({
			code: nexusErr.code,
			status: nexusErr.status,
			category: nexusErr.category,
			message: nexusErr.message,
			path: c.req.path,
			method: c.req.method,
			recoverable: nexusErr.recoverable,
			details: nexusErr.details,
			userAgent: c.req.header("user-agent"),
			ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
		});
	} catch (trackError) {
		// Don't fail request if tracking fails
		logger.error("Failed to track error", trackError);
	}

	return c.json(
		{
			error: true,
			code: nexusErr.code,
			status: nexusErr.status,
			message: nexusErr.message,
			category: nexusErr.category,
			ref: nexusErr.ref,
			recoverable: nexusErr.recoverable,
			path: c.req.path,
			method: c.req.method,
			timestamp: nexusErr.timestamp,
			...(nexusErr.details && { details: nexusErr.details }),
			...(process.env.NODE_ENV !== "production" &&
				err instanceof Error && {
					stack: err.stack?.split("\n").slice(0, 5),
				}),
		},
		nexusErr.status as any,
	);
});

// ============ 404 Handler ============
app.notFound((c) => {
	const err = new NexusError("NX-001", { path: c.req.path });
	logger.warn(`[${err.code}] ${c.req.method} ${c.req.path}`, err);
	return c.json(
		{
			error: true,
			code: err.code,
			status: err.status,
			message: err.message,
			category: err.category,
			ref: err.ref,
			recoverable: err.recoverable,
			path: c.req.path,
			method: c.req.method,
			timestamp: err.timestamp,
			hint: "Check /api for available endpoints or /docs for API documentation",
		},
		404,
	);
});

// Middleware
app.use("*", honoLogger());
app.use("*", prettyJSON());

// Git info headers middleware - adds X-Git-Commit and X-Git-Branch to all responses
let cachedGitInfo: { commit: string; branch: string } | null = null;
app.use("*", async (c, next) => {
	await next();

	// Get or cache git info
	if (!cachedGitInfo) {
		try {
			const { $ } = await import("bun");
			const commitResult = await $`git rev-parse --short HEAD`.text();
			const branchResult = await $`git rev-parse --abbrev-ref HEAD`.text();
			cachedGitInfo = {
				commit: commitResult.trim(),
				branch: branchResult.trim(),
			};
		} catch {
			cachedGitInfo = { commit: "unknown", branch: "unknown" };
		}
	}

	// Add git headers to response
	c.header("X-Git-Commit", cachedGitInfo.commit);
	c.header("X-Git-Branch", cachedGitInfo.branch);
});

// CSRF protection for API mutations (Bun 1.3)
app.use("/api/*", csrf);

// Redirect /api/ to /api (handle trailing slash)
app.get("/api/", (c) => {
	return c.redirect("/api", 301);
});

// Mount API routes
app.route("/api", api);

// Serve markdown documentation files BEFORE mounting docs router
// This allows /docs/*.md to be served as static files
app.get("/docs/:filename", async (c, next) => {
	const filename = c.req.param("filename");

	// Only handle .md files, let other requests pass through to docs router
	if (!filename || !filename.endsWith(".md")) {
		return next();
	}

	try {
		// Security: prevent directory traversal
		const safePath = filename.replace(/\.\./g, "").replace(/\//g, "");
		const docFile = Bun.file(join(import.meta.dir, "..", "docs", safePath));

		if (await docFile.exists()) {
			const content = await docFile.text();
			return c.text(content, 200, {
				"Content-Type": "text/markdown; charset=utf-8",
			});
		}

		return c.json({ error: `Documentation file not found: ${safePath}` }, 404);
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to serve documentation",
			},
			500,
		);
	}
});

// Mount documentation (after markdown handler)
app.route("/docs", docs);

// Serve markdown documentation files (fallback if dashboard server not running)
// This route must come BEFORE the /docs route mount to catch markdown files
app.get("/docs/:filename", async (c, next) => {
	const filename = c.req.param("filename");

	// Only handle .md files, let other requests pass through to docs router
	if (!filename || !filename.endsWith(".md")) {
		return next();
	}

	try {
		// Security: prevent directory traversal
		const safePath = filename.replace(/\.\./g, "").replace(/\//g, "");
		const docFile = Bun.file(join(import.meta.dir, "..", "docs", safePath));

		if (await docFile.exists()) {
			const content = await docFile.text();
			return c.text(content, 200, {
				"Content-Type": "text/markdown; charset=utf-8",
			});
		}

		return c.json({ error: `Documentation file not found: ${safePath}` }, 404);
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to serve documentation",
			},
			500,
		);
	}
});

// Serve dashboard/index.html (fallback if dashboard server not running)
// 8.3.2.0.0.0.0: Route handler orchestration with UIPolicyManager
app.get("/dashboard", async (c) => {
	try {
		const dashboardFile = Bun.file(
			join(import.meta.dir, "..", "dashboard", "index.html"),
		);

		if (await dashboardFile.exists()) {
			// 8.3.2.0.0.0.0: Use UIPolicyManager to build context and get policies
			const uiPolicyManager = UIPolicyManager.getInstance();

			// 8.2.2.3.0.0.0: Runtime feature flag overrides (e.g., from health checks)
			const runtimeFeatureFlags: Record<string, boolean> = {
				// Example: shadowGraph: performanceMonitor.isFeatureHealthy('shadowGraphViz')
				// For now, use defaults from manifest
			};

			// 8.2.2.3.0.0.0: Build UI context from manifest defaults and runtime data
			const uiContext = await uiPolicyManager.buildUIContext(
				c.req.raw,
				runtimeFeatureFlags,
			);

			// 8.2.2.4.0.0.0: Get HTMLRewriter policies
			const htmlRewriterPolicies =
				await uiPolicyManager.getHTMLRewriterPolicies();

			// 8.3.1.0.0.0.0: Create UIContextRewriter with policies
			const rewriter = new UIContextRewriter(
				uiContext,
				{},
				htmlRewriterPolicies,
			);

			if (rewriter.isAvailable()) {
				// Use HTMLRewriter for streaming transformation
				const htmlContent = await dashboardFile.text();

				// HTMLRewriter will inject HYPERBUN_UI_CONTEXT, so we don't need to clean anything
				// The HTML file already handles uiContext properly: const API_BASE = uiContext.apiBaseUrl;
				const transformed = rewriter.transform(htmlContent);
				const finalContent =
					transformed instanceof Response
						? await transformed.text()
						: typeof transformed === "string"
							? transformed
							: String(transformed);

				return c.html(finalContent);
			} else {
				// Fallback: use rewriter's built-in fallback transformation
				const htmlContent = await dashboardFile.text();
				const transformed = rewriter.transform(htmlContent);
				const finalContent =
					typeof transformed === "string"
						? transformed
						: transformed instanceof Response
							? await transformed.text()
							: String(transformed);

				return c.html(finalContent);
			}
		}
		return c.json({ error: "dashboard/index.html not found" }, 404);
	} catch (error) {
		logger.error(
			`[dashboard] Failed to serve: ${error instanceof Error ? error.message : String(error)}`,
		);
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to serve dashboard",
			},
			500,
		);
	}
});

// Serve registry.html (fallback if dashboard server not running)
// 8.3.2.0.0.0.0: Route handler orchestration with UIPolicyManager
app.get("/registry.html", async (c) => {
	try {
		const registryFile = Bun.file(
			join(import.meta.dir, "..", "public", "registry.html"),
		);
		// Fallback to dashboard/registry.html if public/registry.html doesn't exist
		const fileToUse = (await registryFile.exists())
			? registryFile
			: Bun.file(join(import.meta.dir, "..", "dashboard", "registry.html"));

		if (await fileToUse.exists()) {
			// 8.3.2.0.0.0.0: Use UIPolicyManager to build context and get policies
			const uiPolicyManager = UIPolicyManager.getInstance();

			// 8.2.2.3.0.0.0: Runtime feature flag overrides (e.g., from health checks)
			const runtimeFeatureFlags: Record<string, boolean> = {
				// Example: shadowGraph: performanceMonitor.isFeatureHealthy('shadowGraphViz')
				// For now, use defaults from manifest
			};

			// 8.2.2.3.0.0.0: Build UI context from manifest defaults and runtime data
			const uiContext = await uiPolicyManager.buildUIContext(
				c.req.raw,
				runtimeFeatureFlags,
			);

			// 8.2.2.4.0.0.0: Get HTMLRewriter policies
			const htmlRewriterPolicies =
				await uiPolicyManager.getHTMLRewriterPolicies();

			// 8.3.1.0.0.0.0: Create UIContextRewriter with policies
			const rewriter = new UIContextRewriter(
				uiContext,
				{},
				htmlRewriterPolicies,
			);

			if (rewriter.isAvailable()) {
				// Use HTMLRewriter for streaming transformation
				const htmlContent = await fileToUse.text();

				// HTMLRewriter will inject HYPERBUN_UI_CONTEXT, so we don't need to clean anything
				// The HTML file already handles uiContext properly: const API_BASE = uiContext.apiBaseUrl;
				const transformed = rewriter.transform(htmlContent);
				const finalContent =
					transformed instanceof Response
						? await transformed.text()
						: typeof transformed === "string"
							? transformed
							: String(transformed);

				return c.html(finalContent);
			} else {
				// Fallback: use rewriter's built-in fallback transformation
				const htmlContent = await fileToUse.text();
				const transformed = rewriter.transform(htmlContent);
				const finalContent =
					typeof transformed === "string"
						? transformed
						: transformed instanceof Response
							? await transformed.text()
							: String(transformed);

				return c.html(finalContent);
			}
		}
		return c.json({ error: "registry.html not found" }, 404);
	} catch (error) {
		logger.error(
			`[registry.html] Failed to serve: ${error instanceof Error ? error.message : String(error)}`,
		);
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to serve registry.html",
			},
			500,
		);
	}
});

// Serve registry manifest.json (17.0.2.0.0.0.0)
app.get("/public/manifest.json", async (c) => {
	try {
		const manifestFile = Bun.file(
			join(import.meta.dir, "..", "public", "manifest.json"),
		);
		if (await manifestFile.exists()) {
			return c.json(await manifestFile.json());
		}
		return c.json({ error: "manifest.json not found" }, 404);
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to serve manifest.json",
			},
			500,
		);
	}
});

// Root route
app.get("/", (c) => {
	return c.json({
		name: "Trader Analyzer API",
		version: "1.0.0",
		runtime: "Bun",
		documentation: "/docs",
		openapi: "/docs/openapi.json",
		endpoints: {
			// Data Import
			streams: "GET /api/streams",
			importFile: "POST /api/streams/file",
			importApi: "POST /api/streams/api",
			sync: "POST /api/sync",
			// Analytics
			trades: "GET /api/trades",
			stats: "GET /api/stats",
			profile: "GET /api/profile",
			sessions: "GET /api/sessions",
			// Prediction Markets
			polymarketMarkets: "GET /api/polymarket/markets",
			polymarketFetch: "POST /api/polymarket/fetch",
			kalshiMarkets: "GET /api/kalshi/markets",
			kalshiFetch: "POST /api/kalshi/fetch",
			predictionStats: "GET /api/prediction/stats",
			// Market Making
			mmStats: "GET /api/mm/stats",
			mmSessions: "GET /api/mm/sessions",
			// ORCA - Sports Betting Normalization
			orcaNormalize: "POST /api/orca/normalize",
			orcaBatch: "POST /api/orca/normalize/batch",
			orcaLookupTeam: "GET /api/orca/lookup/team",
			orcaBookmakers: "GET /api/orca/bookmakers",
			orcaSports: "GET /api/orca/sports",
			orcaMarkets: "GET /api/orca/markets",
			orcaStats: "GET /api/orca/stats",
			// ORCA Streaming
			orcaStreamStart: "POST /api/orca/stream/start",
			orcaStreamStop: "POST /api/orca/stream/stop",
			orcaStreamStatus: "GET /api/orca/stream/status",
			// ORCA Storage
			orcaStorageStats: "GET /api/orca/storage/stats",
			orcaOddsHistory: "GET /api/orca/storage/odds/:marketId",
			// Debug (Bun 1.3.2)
			debugMemory: "GET /api/debug/memory",
			debugRuntime: "GET /api/debug/runtime",
			debugHeapSnapshot: "POST /api/debug/heap-snapshot",
			debugCpuProfile: "POST /api/debug/cpu-profile",
			debugWsSubscriptions: "GET /api/debug/ws-subscriptions",
			// Constants & Configuration
			constants: "GET /api/constants",
			// Registry System
			registry: "GET /api/registry",
			registryById: "GET /api/registry/:registryId",
			registryByCategory: "GET /api/registry/category/:category",
			registrySearch: "GET /api/registry/search",
			mcpTools: "GET /api/registry/mcp-tools",
			// API Discovery
			discovery: "GET /discovery",
			// RSS Feed
			rss: "GET /api/rss.xml",
			rssAlt: "GET /api/rss",
			// Error Logs
			errorLogs: "GET /api/logs/errors",
			// Changelog & Release Notes
			changelog: "See CHANGELOG.md",
			releaseNotes: "See RELEASE.md",
		},
		links: {
			changelog: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/CHANGELOG.md",
			releaseNotes: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/RELEASE.md",
			rss: "http://localhost:3000/api/rss.xml",
			registry: "http://localhost:3000/api/registry",
			docs: "http://localhost:3000/docs",
		},
	});
});

// ============ Telegram WebSocket Server ============
import {
    handleTelegramWebSocket,
    handleTelegramWebSocketClose,
    handleTelegramWebSocketMessage,
    handleTelegramWebSocketOpen,
} from "./api/telegram-ws";

// ============ Server Configuration ============
// Ports are hardcoded in constants - see: src/constants/index.ts API_CONSTANTS.PORT
import { API_CONSTANTS } from "./constants";
const port = API_CONSTANTS.PORT; // Hardcoded: 3000 (override via PORT env var)
const startTime = timing.now();

/**
 * Development mode flag for Bun.serve()
 * @constant {boolean}
 *
 * @description
 * Determines if Bun should enable development features:
 * - Built-in error page in browser
 * - Enhanced error messages
 * - Development-specific optimizations
 *
 * Set to `true` when NODE_ENV is not "production".
 * Can be overridden via BUN_DEVELOPMENT environment variable.
 *
 * @see {@link https://bun.sh/docs/api/http-server#error-handling|Bun Development Mode}
 */
const isDevelopment =
	process.env.BUN_DEVELOPMENT !== undefined
		? process.env.BUN_DEVELOPMENT === "true"
		: process.env.NODE_ENV !== "production";

// Migrate plaintext credentials to Bun.secrets on first run
migrateCredentials()
	.then(({ migrated, message }) => {
		if (migrated) logger.info(`[security] ${message}`);
	})
	.catch(() => {});

// Validate and auto-initialize URL anomaly detection database on startup
async function validateUrlAnomalyDatabase(): Promise<void> {
	try {
		const { Database } = await import("bun:sqlite");
		const dbPath = "./data/research.db";
		const db = new Database(dbPath, { create: true });

		// Check if tables exist
		const tables = db
			.query<{ name: string }, []>(
				`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('url_anomaly_audit', 'line_movement_audit_v2')`,
			)
			.all();

		const tableNames = new Set(tables.map((t) => t.name));
		const hasUrlAnomalyTable = tableNames.has("url_anomaly_audit");
		const hasLineMovementTable = tableNames.has("line_movement_audit_v2");

		db.close();

		if (!hasUrlAnomalyTable || !hasLineMovementTable) {
			logger.warn(
				`[url-anomaly] ⚠️ Database tables missing: url_anomaly_audit=${hasUrlAnomalyTable}, line_movement_audit_v2=${hasLineMovementTable}`,
			);
			logger.info(`[url-anomaly] 🔧 Auto-initializing database tables...`);

			// Auto-initialize missing tables
			const initResult = await initializeUrlAnomalyDatabase();
			if (initResult.success) {
				if (initResult.tablesCreated.length > 0) {
					logger.info(
						`[url-anomaly] ✅ Database tables created: ${initResult.tablesCreated.join(", ")}`,
					);
				} else {
					logger.info(`[url-anomaly] ✅ Database tables already exist`);
				}
			} else {
				logger.error(
					`[url-anomaly] 🚨 CRITICAL: Failed to initialize database: ${initResult.error}`,
				);
			}
		} else {
			logger.info(`[url-anomaly] ✅ Database tables validated: ${dbPath}`);
		}
	} catch (error) {
		logger.error(
			`[url-anomaly] 🚨 CRITICAL: Failed to validate database: ${error instanceof Error ? error.message : String(error)}`,
		);
		// Attempt initialization even if validation fails
		logger.info(`[url-anomaly] 🔧 Attempting database initialization...`);
		const initResult = await initializeUrlAnomalyDatabase();
		if (initResult.success) {
			logger.info(`[url-anomaly] ✅ Database initialization completed`);
		} else {
			logger.error(
				`[url-anomaly] 🚨 CRITICAL: Database initialization failed: ${initResult.error}`,
			);
		}
	}
}

// Run validation and auto-initialization on startup
validateUrlAnomalyDatabase().catch((error) => {
	logger.error(
		`[url-anomaly] 🚨 Startup validation failed: ${error instanceof Error ? error.message : String(error)}`,
	);
});

// ============ HMR-Aware Server Startup ============
// Reuse existing server on hot reload to preserve connections
let server: ReturnType<typeof Bun.serve>;

/**
 * Get the Bun server instance for accessing built-in metrics
 * @see {@link https://bun.sh/docs/api/http-server#metrics|Bun Server Metrics}
 *
 * @description
 * Exports the server instance so routes can access Bun's built-in metrics:
 * - `server.pendingRequests` - Active HTTP requests
 * - `server.pendingWebSockets` - Active WebSocket connections
 * - `server.subscriberCount(topic)` - WebSocket subscribers per topic
 *
 * @returns {ReturnType<typeof Bun.serve>} The Bun server instance
 *
 * @example
 * ```typescript
 * import { getServer } from "./index";
 * const server = getServer();
 * const activeRequests = server.pendingRequests;
 * const activeWebSockets = server.pendingWebSockets;
 * const chatUsers = server.subscriberCount("chat");
 * ```
 */
export function getServer(): ReturnType<typeof Bun.serve> {
	return server;
}

if (import.meta.hot?.data.server) {
	// Reuse existing server from previous HMR cycle
	server = import.meta.hot.data.server;
	// Update the fetch handler to use new app routes
	server.reload({ fetch: app.fetch });
} else {
	// First load - create new server
	/**
	 * Bun.serve() configuration with TypeScript generic type parameter
	 * Uses XState-style pattern for WebSocket data typing
	 *
	 * @see {@link https://bun.sh/docs/api/http-server|Bun.serve() Documentation}
	 * @see {@link ./docs/BUN-LATEST-BREAKING-CHANGES.md|Bun Latest Breaking Changes}
	 *
	 * @example
	 * ```typescript
	 * Bun.serve<WebSocketData>({
	 *   development: true,
	 *   fetch(req, server) {
	 *     // server is typed as Bun.Server<WebSocketData>
	 *   },
	 *   websocket: {
	 *     open(ws) {
	 *       // ws.data is typed as WebSocketData
	 *     }
	 *   }
	 * });
	 * ```
	 */
	server = Bun.serve<UnifiedWebSocketData>({
		port,
		/**
		 * Fetch handler for HTTP requests
		 * @see {@link https://bun.sh/docs/api/http-server|Bun.serve() fetch handler}
		 */
		fetch: async (req, server) => {
			const url = new URL(req.url);

			// Handle WebSocket upgrade for Sportsbook & Betting Markets
			if (
				url.pathname === "/ws/sportsbooks" ||
				url.pathname === "/ws/betting"
			) {
				const { sportsbookWsServer } = await import("./api/sportsbook-ws");
				// Parse cookies/headers for authentication
				const cookies = parseCookies(req.headers.get("Cookie") || "");
				const token = cookies["X-Token"] || url.searchParams.get("token");
				const userId = url.searchParams.get("user_id");
				const username = url.searchParams.get("username");

				// Get user from token if provided
				let user: { id: string; username: string } | null = null;
				if (token) {
					// In production, validate token properly
					user = { id: `user_${token.slice(0, 8)}`, username: "user" };
				}

				// Upgrade to WebSocket with contextual data
				const success = server.upgrade(req, {
					data: {
						clientId: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						userId: user?.id || userId || undefined,
						username: user?.username || username || undefined,
						token: token || undefined,
						connectedAt: Date.now(),
						lastActivity: Date.now(),
						subscribedSportsbooks: new Set(),
						subscribedMarkets: new Set(),
						subscribedArbitrage: false,
						marketTypeFilters: new Set(),
						sportFilters: new Set(),
						lastPing: Date.now(),
						path: url.pathname, // Store path for routing
					},
				});

				if (success) return undefined;
				return new Response("WebSocket upgrade failed", { status: 400 });
			}

			// Handle WebSocket upgrade for Telegram Mini App
			if (url.pathname === "/ws" || url.pathname === "/telegram/ws") {
				const wsHandler = handleTelegramWebSocket(req, server);
				if (wsHandler) return wsHandler;
			}

			// Handle WebSocket upgrade for UI Policy Metrics (8.2.5.6.0.0.0)
			if (url.pathname === "/ws/ui-policy-metrics") {
				const { handleUIPolicyMetricsWebSocket } = await import(
					"./api/ui-policy-ws"
				);
				const wsHandler = handleUIPolicyMetricsWebSocket(req, server);
				if (wsHandler !== null) return wsHandler;
			}

			// Handle regular HTTP requests through Hono app
			// Hono's app.onError handler will catch errors
			return app.fetch(req, server);
		},
		/**
		 * WebSocket configuration
		 * @see {@link https://bun.sh/docs/api/websockets|Bun WebSocket API}
		 */
		websocket: {
			// TypeScript: specify the type of ws.data
			data: {} as UnifiedWebSocketData,

			message: async (ws, message) => {
				// Route to appropriate handler based on path stored in ws.data
				const path = ws.data?.path;

				if (path === "/ws/ui-policy-metrics") {
					// Lazy import to avoid circular dependencies
					import("./api/ui-policy-ws")
						.then(({ handleUIPolicyMetricsWebSocketMessage }) => {
							handleUIPolicyMetricsWebSocketMessage(ws as any, message);
						})
						.catch((err) =>
							console.error("[WS] UI Policy Metrics handler error:", err),
						);
				} else if (
					path === "/ws/sportsbooks" ||
					path === "/ws/betting"
				) {
					// Handle Sportsbook WebSocket messages
					import("./api/sportsbook-ws")
						.then(({ sportsbookWsServer }) => {
							sportsbookWsServer.handleMessage(ws as any, message);
						})
						.catch((err) =>
							console.error("[WS] Sportsbook handler error:", err),
						);
				} else {
					handleTelegramWebSocketMessage(ws as any, message);
				}
			},
			open: (ws) => {
				// Route to appropriate handler based on path stored in ws.data
				const path = ws.data?.path;

				if (path === "/ws/ui-policy-metrics") {
					// Lazy import to avoid circular dependencies
					import("./api/ui-policy-ws")
						.then(({ handleUIPolicyMetricsWebSocketOpen }) => {
							handleUIPolicyMetricsWebSocketOpen(ws as any);
						})
						.catch((err) =>
							console.error("[WS] UI Policy Metrics handler error:", err),
						);
				} else if (
					path === "/ws/sportsbooks" ||
					path === "/ws/betting"
				) {
					// Handle Sportsbook WebSocket open
					import("./api/sportsbook-ws")
						.then(({ sportsbookWsServer }) => {
							sportsbookWsServer.handleOpen(ws as any);
						})
						.catch((err) =>
							console.error("[WS] Sportsbook handler error:", err),
						);
				} else {
					handleTelegramWebSocketOpen(ws as any);
				}
			},
			close: (ws, code, message) => {
				// Route to appropriate handler based on path stored in ws.data
				const path = ws.data?.path;

				if (path === "/ws/ui-policy-metrics") {
					// Lazy import to avoid circular dependencies
					import("./api/ui-policy-ws")
						.then(({ handleUIPolicyMetricsWebSocketClose }) => {
							handleUIPolicyMetricsWebSocketClose(ws as any);
						})
						.catch((err) =>
							console.error("[WS] UI Policy Metrics handler error:", err),
						);
				} else if (
					path === "/ws/sportsbooks" ||
					path === "/ws/betting"
				) {
					// Handle Sportsbook WebSocket close
					import("./api/sportsbook-ws")
						.then(({ sportsbookWsServer }) => {
							sportsbookWsServer.handleClose(ws as any, code, message);
						})
						.catch((err) =>
							console.error("[WS] Sportsbook handler error:", err),
						);
				} else {
					handleTelegramWebSocketClose(ws as any);
				}
			},
			error: (ws, error) => {
				// Route to appropriate handler based on path stored in ws.data
				const path = ws.data?.path;

				if (
					path === "/ws/sportsbooks" ||
					path === "/ws/betting"
				) {
					// Handle Sportsbook WebSocket error
					import("./api/sportsbook-ws")
						.then(({ sportsbookWsServer }) => {
							sportsbookWsServer.handleError(ws as any, error);
						})
						.catch((err) =>
							console.error("[WS] Sportsbook handler error:", err),
						);
				}
			},
		},
		/**
		 * Development mode enables Bun's built-in error page
		 * @see {@link https://bun.sh/docs/api/http-server#error-handling|Bun Error Handling}
		 *
		 * When `development: true`, Bun surfaces errors in-browser with a built-in error page.
		 * The `error` callback below will supersede Bun's default error page.
		 *
		 * @implementation
		 * Automatically set based on environment:
		 * - `true` when NODE_ENV !== "production" (default)
		 * - Can be overridden via BUN_DEVELOPMENT environment variable
		 * - In production, set to `false` to disable Bun's error page
		 *
		 * @example
		 * ```bash
		 * # Development (default)
		 * bun run src/index.ts
		 *
		 * # Production
		 * NODE_ENV=production bun run src/index.ts
		 *
		 * # Override explicitly
		 * BUN_DEVELOPMENT=false bun run src/index.ts
		 * ```
		 */
		development: isDevelopment,
		/**
		 * Error handler for Bun.serve() - supersedes Bun's default error page in development mode
		 * @see {@link https://bun.sh/docs/api/http-server#error-handling|Bun Error Handling Documentation}
		 *
		 * @description
		 * In development mode, Bun surfaces errors in-browser with a built-in error page.
		 * This error callback supersedes Bun's default error page.
		 *
		 * @implementation
		 * This handler catches errors that occur at the Bun.serve() level (before Hono routing).
		 * Errors within Hono routes are handled by app.onError() above.
		 *
		 * Returns a Response that will be served to the client when an error occurs.
		 * This response supersedes Bun's default error page in development mode.
		 *
		 * We return JSON responses (instead of HTML) for API consistency, matching Hono's error format.
		 *
		 * @param {Error} error - The error that occurred
		 * @returns {Response} Error response with error details
		 *
		 * @example
		 * ```typescript
		 * // Bun documentation example (HTML response):
		 * Bun.serve({
		 *   fetch(req) {
		 *     throw new Error("woops!");
		 *   },
		 *   error(error) {
		 *     return new Response(`<pre>${error}\n${error.stack}</pre>`, {
		 *       headers: { "Content-Type": "text/html" },
		 *     });
		 *   },
		 * });
		 *
		 * // Our implementation (JSON response for API consistency):
		 * error(error) {
		 *   return new Response(JSON.stringify({ error: true, ... }), {
		 *     headers: { "Content-Type": "application/json" },
		 *   });
		 * }
		 * ```
		 */
		error(error) {
			// Log error for debugging
			logger.error("[Bun.serve] Server error", error);

			// Wrap in NexusError for consistent error format
			const nexusErr = error instanceof NexusError ? error : wrapError(error);

			// Return JSON error response (matches Hono error format)
			return new Response(
				JSON.stringify({
					error: true,
					code: nexusErr.code,
					status: nexusErr.status,
					message: nexusErr.message,
					category: nexusErr.category,
					ref: nexusErr.ref,
					recoverable: nexusErr.recoverable,
					timestamp: nexusErr.timestamp,
					...(process.env.NODE_ENV !== "production" &&
						error instanceof Error && {
							stack: error.stack?.split("\n").slice(0, 10),
						}),
				}),
				{
					status: nexusErr.status,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		},
	});
	// Store server in HMR data for next reload
	if (import.meta.hot) {
		import.meta.hot.data.server = server;
	}

	// ============ 17.14.0.0.0.0.0 — NEXUS Registry System Radiance Integration ============
	// Start registry monitoring after server is initialized
	try {
		const { startRegistryMonitoring } = await import(
			"./17.14.0.0.0.0.0-nexus/registry-monitor"
		);
		startRegistryMonitoring(server);
		console.log("[17.14.0] ✅ NEXUS Registry System Radiance Integration active");
		console.log("[17.14.0] 📡 All registries now emit radiance events");
	} catch (error) {
		console.error("[17.14.0] Failed to start registry monitoring:", error);
	}
}

// Update fetch handler on HMR without restarting server
if (import.meta.hot) {
	// Cleanup before module replacement
	import.meta.hot.dispose(() => {
		logger.info("[HMR] Disposing module...");
	});

	// Accept updates - this marks the module as hot-replaceable
	import.meta.hot.accept();

	// Listen for HMR events
	import.meta.hot.on("bun:beforeUpdate", () => {
		logger.info("[HMR] Update detected, reloading...");
	});

	import.meta.hot.on("bun:afterUpdate", () => {
		logger.info("[HMR] Update complete!");
	});

	import.meta.hot.on("bun:error", () => {
		logger.error("[HMR] Error occurred during hot reload");
	});
}

// ============ Startup Banner ============
const mem = runtime.memoryFormatted();
const isHMR = hmrData.reloadCount > 1;
const uptime = Math.floor((Date.now() - hmrData.startedAt) / 1000);

const banner = isHMR
	? `
${colors.cyan("NEXUS")} ${colors.gray("Hot Reload")} ${colors.magenta(`#${hmrData.reloadCount}`)}

${colors.green("Server")}     http://localhost:${port}
${colors.green("Memory")}     ${mem.heapUsed} / ${mem.heapTotal}
${colors.green("Uptime")}     ${uptime}s (preserved across ${hmrData.reloadCount} reloads)

${colors.gray(`HMR completed in ${((timing.now() - startTime) / 1_000_000).toFixed(2)}ms`)}
`
	: `
${colors.cyan("NEXUS")} ${colors.gray("Unified Trading Intelligence")}

${colors.green("Runtime")}    Bun ${runtime.version}
${colors.green("Server")}     http://localhost:${port}
${colors.green("Docs")}       http://localhost:${port}/docs
${colors.green("Memory")}     ${mem.heapUsed} / ${mem.heapTotal}

${colors.yellow("Data Sources:")}
  ${colors.gray("•")} Crypto      BitMEX, Binance, Bybit, OKX, Deribit
  ${colors.gray("•")} Prediction  Polymarket, Kalshi
  ${colors.gray("•")} Sports      13+ Bookmakers via ORCA
  ${colors.gray("•")} Files       CSV, JSON

${colors.magenta("HMR")}        Enabled (use bun --hot)

${colors.gray(`Startup: ${((timing.now() - startTime) / 1_000_000).toFixed(2)}ms`)}
`;

console.log(
	box(
		banner.trim(),
		isHMR ? `NEXUS HMR #${hmrData.reloadCount}` : "NEXUS v1.0.0",
	),
);

// Memory monitoring and cleanup
const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MEMORY_WARNING_THRESHOLD = 1024 * 1024 * 1024; // 1GB
const MEMORY_CRITICAL_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB

function logMemoryUsage() {
	const mem = getMemoryStats();
	const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
	const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(2);
	const rssMB = (mem.rss / 1024 / 1024).toFixed(2);

	logger.info("Memory usage", {
		heapUsed: `${heapUsedMB} MB`,
		heapTotal: `${heapTotalMB} MB`,
		rss: `${rssMB} MB`,
		uptime: `${(process.uptime() / 3600).toFixed(2)} hours`,
	});

	// Warning if heap usage is high
	if (mem.heapUsed > MEMORY_WARNING_THRESHOLD) {
		logger.warn("High memory usage detected", {
			heapUsed: `${heapUsedMB} MB`,
			threshold: `${(MEMORY_WARNING_THRESHOLD / 1024 / 1024).toFixed(0)} MB`,
		});
	}

	// Critical: force garbage collection if available
	if (mem.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
		logger.error("Critical memory usage - triggering cleanup", {
			heapUsed: `${heapUsedMB} MB`,
			threshold: `${(MEMORY_CRITICAL_THRESHOLD / 1024 / 1024).toFixed(0)} MB`,
		});

		// Force garbage collection if available (only in debug builds)
		if (global.gc) {
			global.gc();
			logger.info("Garbage collection completed");
		}
	}
}

// Start memory monitoring
setInterval(logMemoryUsage, MEMORY_CHECK_INTERVAL);

// Log initial memory usage
logMemoryUsage();

// ============ 17.14.0.0.0.0.0 — NEXUS Registry System Radiance Integration ============
// Start registry monitoring after server is initialized
if (server) {
	try {
		const { startRegistryMonitoring } = await import(
			"./17.14.0.0.0.0.0-nexus/registry-monitor"
		);
		startRegistryMonitoring(server);
		console.log("[17.14.0] ✅ NEXUS Registry System Radiance Integration active");
	} catch (error) {
		console.error("[17.14.0] Failed to start registry monitoring:", error);
	}
}

// Export for Bun.serve compatibility
export default {
  port,
  fetch: app.fetch,
};
