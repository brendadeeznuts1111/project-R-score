import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { DoDMultiLayerCorrelationGraph } from "../analytics/correlation-engine";
import { getAuthenticatedUser, optionalAuth, requireAdmin, requireAuth } from "../auth/middleware";
import {
    DeribitProvider
} from "../providers/deribit";
import { logger } from "../utils/logger";
import {
    ROUTING_REGISTRY_NAMES,
    RSS_API_PATHS,
    RSS_CATEGORIES,
    RSS_ENV,
    RSS_GITHUB_LINKS,
    RSS_INTERNAL,
    TELEGRAM_MINIAPP_URLS,
} from "../utils/rss-constants";
import { getTimezoneConfigForHeaders } from "../utils/time-format";
import { getApiDiscovery } from "./discovery";
import { featuresApi } from "./features";
import { initializePipeline } from "./pipeline";
import { usersApi } from "./users";

/**
 * @fileoverview Main API Routes
 * @description Core API endpoints for the trader analyzer application
 * @module api/routes
 *
 * @see {@link ../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

const api = new Hono();

// Initialize pipeline on startup
initializePipeline().catch((error: unknown) => {
	const errorMessage =
		error instanceof Error ? error.message : String(error);
	logger.error("Failed to initialize pipeline", error);
	console.error("Pipeline initialization error:", errorMessage);
});

// Initialize pipeline integration service
import("../pipeline/integration")
	.then(({ initializePipelineIntegration }) => {
		initializePipelineIntegration().catch((error: unknown) => {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Failed to initialize pipeline integration", error);
			console.error("Pipeline integration error:", errorMessage);
		});
	})
	.catch((error: unknown) => {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		logger.error("Failed to import pipeline integration", error);
		console.error("Pipeline integration import error:", errorMessage);
	});

// Health check functions
async function checkDatabaseHealth(): Promise<boolean> {
	try {
		// Try to access a database table
		const { Database } = await import("bun:sqlite");
		const db = new Database("markets.db");
		const result = db.query("SELECT 1 as health_check").get();
		db.close();
		return result !== null;
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		logger.error("Database health check failed", error);
		console.error("Database health check failed:", errorMessage);
		return false;
	}
}

async function checkPipelineHealth(): Promise<boolean> {
	try {
		const { getPipelineIntegrationService } = await import("../pipeline/integration");
		const service = getPipelineIntegrationService();
		// Check if service has registered providers
		return service.getRegisteredProviders().length > 0;
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		logger.error("Pipeline health check failed", error);
		console.error("Pipeline health check failed:", errorMessage);
		return false;
	}
}

// Global Deribit provider instance (public API, no auth needed)
let deribitProvider: DeribitProvider | null = null;

function getDeribit(): DeribitProvider {
	if (!deribitProvider) {
		deribitProvider = new DeribitProvider({ testnet: false });
	}
	return deribitProvider;
}

// Enable CORS with exposed headers for dashboard access
api.use(
	"/*",
	cors({
		origin: "*",
		credentials: true, // Allow cookies in CORS
		exposeHeaders: [
			"ETag",
			"X-Git-Commit",
			"X-Git-Branch",
			"Set-Cookie",
			"X-CSRF-Token",
			"X-Timezone",
			"X-Timezone-Offset",
			"X-Timezone-Env-Var",
			"X-Timezone-Default",
		],
	}),
);

// Session storage (in-memory for now, can be moved to Redis/DB)
const sessions = new Map<
	string,
	{ userId: string; createdAt: number; expiresAt: number }
>();

// Session validation middleware
const requireSession = async (
	c: { cookie: (name: string) => string | undefined; json: (body: unknown, status?: number) => Response },
	next: () => Promise<void>,
) => {
	const sessionId = c.cookie("sessionId");

	if (!sessionId) {
		return c.json({ error: "Unauthorized: No session" }, 401);
	}

	const session = sessions.get(sessionId);
	if (!session || session.expiresAt < Date.now()) {
		sessions.delete(sessionId);
		return c.json({ error: "Unauthorized: Invalid or expired session" }, 401);
	}

	c.set("session", session);
	await next();
};

// Add timezone headers to all responses
api.use("*", async (c, next) => {
	await next();

	// Add timezone headers to all responses
	try {
		const tzConfig = getTimezoneConfigForHeaders();
		c.header("X-Timezone", tzConfig.timezone);
		c.header("X-Timezone-Offset", tzConfig.offsetString);
		c.header("X-Timezone-Env-Var", tzConfig.envVar);
		c.header("X-Timezone-Default", tzConfig.defaultTimezone);
	} catch {
		// Ignore errors if timezone config fails
	}
});

// ============ Metrics & Observability Endpoints ============

/**
 * Prometheus metrics endpoint
 * @route GET /api/metrics
 * @description Returns Prometheus-formatted metrics including secret access metrics
 */
api.get("/metrics", async (c) => {
	try {
		const { getMetrics } = await import("../observability/metrics");
		const { getServer } = await import("../index");
		const server = getServer();
		const metrics = await getMetrics(server);
		return new Response(metrics, {
			headers: { "Content-Type": "text/plain; version=0.0.4" },
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get metrics", error);
		return c.json({ error: "Failed to get metrics" }, 500);
	}
});

// ============ Session Management Endpoints ============

/**
 * Sign in - Create session with cookie
 * @route POST /api/users/sign-in
 * @description Create a new session and set sessionId cookie
 */
api.post("/users/sign-in", async (c) => {
	try {
		const body = await c.req.json().catch(() => ({}));
		const userId = body.userId || "anonymous";

		// Generate session ID using Bun.randomUUIDv7()
		const sessionId = Bun.randomUUIDv7();
		const now = Date.now();
		const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

		// Store session
		sessions.set(sessionId, {
			userId,
			createdAt: now,
			expiresAt,
		});

		// Set cookie with security options
		c.cookie("sessionId", sessionId, {
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
			maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
			path: "/",
		});

		return c.json({
			message: "Signed in",
			sessionId,
			userId,
			expiresAt: new Date(expiresAt).toISOString(),
		});
	} catch (error) {
		return c.json({ error: "Sign-in failed" }, 500);
	}
});

/**
 * Sign out - Delete session cookie
 * @route POST /api/users/sign-out
 * @description Delete session and clear sessionId cookie
 */
api.post("/users/sign-out", async (c) => {
	const sessionId = c.cookie("sessionId");

	if (sessionId) {
		sessions.delete(sessionId);
	}

	// Clear cookie
	c.cookie("sessionId", "", {
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
		maxAge: 0,
		path: "/",
	});

	return c.json({ message: "Signed out" });
});

/**
 * Get current session status
 * @route GET /api/users/session
 * @description Get current session information
 */
api.get("/users/session", async (c) => {
	const sessionId = c.cookie("sessionId");

	if (!sessionId) {
		return c.json({ authenticated: false });
	}

	const session = sessions.get(sessionId);
	if (!session || session.expiresAt < Date.now()) {
		if (session) sessions.delete(sessionId);
		return c.json({ authenticated: false });
	}

	return c.json({
		authenticated: true,
		userId: session.userId,
		createdAt: new Date(session.createdAt).toISOString(),
		expiresAt: new Date(session.expiresAt).toISOString(),
	});
});

// ============ User Management ============

/**
 * Create a new user
 * @route POST /api/users
 * @description Create a new user account with RBAC role assignment
 */
api.post("/users", optionalAuth, async (c) => {
	try {
		const body = await c.req.json<{
			username: string;
			password: string;
			role?: string;
			email?: string;
		}>();

		if (!body.username || !body.password) {
			return c.json({ error: "username and password are required" }, 400);
		}

		const currentUser = getAuthenticatedUser(c);
		const { RBACManager } = await import("../rbac/manager");
		const rbacManager = new RBACManager();

		try {
			// Default role for public registration (readonly is safest default)
			const defaultRole = "readonly";
			
			// Only admins can specify custom roles
			let userRole = defaultRole;
			if (body.role) {
				if (currentUser?.role === "admin") {
					userRole = body.role;
				} else {
					return c.json({ 
						error: "Only admins can assign custom roles. Public registration defaults to 'readonly' role." 
					}, 403);
				}
			}

			// Validate role exists
			const role = rbacManager.getRoleById(userRole);
			if (!role) {
				return c.json({ error: `Invalid role: ${userRole}. Available roles: admin, trader, analyst, readonly` }, 400);
			}

			// Create user in RBAC system
			const user = await rbacManager.createUser({
				username: body.username,
				password: body.password,
				role: userRole,
				email: body.email,
			});

			return c.json({
				success: true,
				user: {
					id: user.id,
					username: user.username,
					role: user.role,
					featureFlags: user.featureFlags,
				},
			});
		} finally {
			rbacManager.close();
		}
	} catch (error) {
		console.error("Create user error:", error);
		return c.json({ error: "Failed to create user" }, 500);
	}
});

/**
 * Get all users
 * @route GET /api/users
 * @description List all users (public access, but filtered based on auth)
 */
api.get("/users", optionalAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		const { RBACManager } = await import("../rbac/manager");
		const rbacManager = new RBACManager();

		try {
			const users = await rbacManager.getAllUsers();

			// Admin users see all details, public users see limited info
			if (currentUser?.role === "admin") {
				return c.json({
					users: users.map(user => ({
						id: user.id,
						username: user.username,
						role: user.role,
						email: user.email,
						createdAt: user.createdAt,
						lastLogin: user.lastLogin,
					})),
				});
			} else {
				// Public access: only show username and role (no sensitive data)
				return c.json({
					users: users.map(user => ({
						id: user.id,
						username: user.username,
						role: user.role,
						// Exclude email, createdAt, lastLogin for privacy
					})),
					note: "Limited information shown. Admin access required for full details.",
				});
			}
		} finally {
			rbacManager.close();
		}
	} catch (error) {
		console.error("Get users error:", error);
		return c.json({ error: "Failed to get users" }, 500);
	}
});

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @description Get user details by ID
 */
api.get("/users/:id", requireAuth, async (c) => {
	try {
		const userId = c.req.param("id");
		const currentUser = getAuthenticatedUser(c);

		// Users can view their own profile, admins can view any profile
		if (currentUser?.id !== userId && currentUser?.role !== "admin") {
			return c.json({ error: "Access denied" }, 403);
		}

		const { RBACManager } = await import("../rbac/manager");
		const rbacManager = new RBACManager();

		try {
			const users = await rbacManager.getAllUsers();

			// Admin users see all details, public users see limited info
			if (currentUser?.role === "admin") {
				return c.json({
					users: users.map(user => ({
						id: user.id,
						username: user.username,
						role: user.role,
						email: user.email,
						createdAt: user.createdAt,
						lastLogin: user.lastLogin,
					})),
				});
			} else {
				// Public access: only show username and role (no sensitive data)
				return c.json({
					users: users.map(user => ({
						id: user.id,
						username: user.username,
						role: user.role,
					})),
				});
			}
		} catch (error) {
			return c.json(
				{
					error:
						error instanceof Error
							? error.message
							: "Failed to retrieve users",
				},
				500,
			);
		}
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to retrieve user",
			},
			500,
		);
	}
});

// ============ Correlation Graph ============

/**
 * Get correlation graph data for visualization
 * @route GET /api/dashboard/correlation-graph
 * @description Get multi-layer correlation graph data aggregated from line movement and URL anomaly audit tables
 */
api.get("/dashboard/correlation-graph", async (c) => {
	const requestStartTime = performance.now();
	const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const eventId = c.req.query("event_id");
		const timeWindowParam = c.req.query("time_window") || "24";
		const timeWindow = parseInt(timeWindowParam) || 24;

		// Validate event_id
		if (!eventId) {
			return c.json({ error: "event_id parameter is required" }, 400);
		}

		// Validate time_window
		if (timeWindow < 1 || timeWindow > 168) { // Max 1 week
			return c.json({ error: "time_window must be between 1 and 168 hours" }, 400);
		}

		// Build correlation graph using DoD engine
		const db = new Database("./data/research.db", { create: true });
		const engine = new DoDMultiLayerCorrelationGraph(db);

		const graphData = await engine.buildMultiLayerGraph(eventId);

		if (!graphData) {
			return c.json({ error: "No correlation data found for event" }, 404);
		}

		// Calculate timing
		const aggregationDuration = performance.now() - requestStartTime;
		const totalDuration = performance.now() - requestStartTime;

		// Convert ValidatedGraph to frontend format
		interface GraphNode {
			id: string;
			label: string;
			layer?: string;
			bookmaker?: string;
		}
		interface GraphEdge {
			source: string;
			target: string;
			weight?: number;
			layer?: string;
		}
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const bookmakers = new Set<string>();

		// Process each layer to extract nodes and edges
		Object.entries(graphData.layers).forEach(([layerKey, layerData]) => {
			if (!layerData || !layerData.correlations) return;

			// Process correlations to create nodes and edges
			interface CorrelationData {
				source?: string;
				target?: string;
				bookmaker_a?: string;
				bookmaker_b?: string;
				bookmaker?: string;
				severity?: string;
				correlation?: number;
				confidence?: number;
				latency?: number;
			}
			layerData.correlations.forEach((correlation: CorrelationData) => {
				// Create nodes if they don't exist
				const sourceId = `${correlation.source || correlation.bookmaker_a || 'unknown'}`;
				const targetId = `${correlation.target || correlation.bookmaker_b || 'unknown'}`;

				// Add source node
				if (!nodes.find(n => n.id === sourceId)) {
					nodes.push({
						id: sourceId,
						label: sourceId,
						layer: layerKey,
						severity: correlation.severity || 'LOW',
						bookmaker: correlation.bookmaker || correlation.source || 'unknown',
						summary: {
							correlation: correlation.correlation || 0,
							confidence: correlation.confidence || 0,
							latency: correlation.latency || 0,
						}
					});
					if (correlation.bookmaker || correlation.source) {
						bookmakers.add(correlation.bookmaker || correlation.source);
					}
				}

				// Add target node
				if (!nodes.find(n => n.id === targetId)) {
					nodes.push({
						id: targetId,
						label: targetId,
						layer: layerKey,
						severity: correlation.severity || 'LOW',
						bookmaker: correlation.bookmaker || correlation.target || 'unknown',
						summary: {
							correlation: correlation.correlation || 0,
							confidence: correlation.confidence || 0,
							latency: correlation.latency || 0,
						}
					});
					if (correlation.bookmaker || correlation.target) {
						bookmakers.add(correlation.bookmaker || correlation.target);
					}
				}

				// Create edge
				edges.push({
					source: sourceId,
					target: targetId,
					correlation: correlation.correlation || 0,
					confidence: correlation.confidence || 0,
					latency: correlation.latency || 0,
					type: correlation.type || 'correlation',
					layer: layerKey,
					timestamp: correlation.timestamp || graphData.timestamp,
				});
			});
		});

		const responseData = {
			eventId: graphData.eventId,
			timeWindow: timeWindow,
			generatedAt: graphData.timestamp,
			nodes,
			edges,
			layers: graphData.layers,
			statistics: {
				buildLatency: graphData.metrics.buildLatency,
				layerSuccessRate: graphData.metrics.layerSuccessRate,
				totalNodes: nodes.length,
				totalEdges: edges.length,
				bookmakers: Array.from(bookmakers),
			},
		};

		// Log successful completion
		const { apiLogger } = await import("../utils/bun-logger");
		apiLogger.child("correlation-graph").info(`Request ${requestId} completed`, {
			eventId: graphData.eventId,
			timeWindow: `${timeWindow}h`,
			layersProcessed: Object.values(graphData.layers).filter(l => l !== null).length,
			buildLatency: `${graphData.metrics.buildLatency.toFixed(2)}ms`,
			aggregation: `${aggregationDuration.toFixed(2)}ms`,
			total: `${totalDuration.toFixed(2)}ms`,
		});

		return c.json(responseData);
	} catch (error) {
		const errorDuration = performance.now() - requestStartTime;

		const { apiLogger } = await import("../utils/bun-logger");
		apiLogger.child("correlation-graph").error("Request error", {
			requestId,
			eventId: c.req.query("event_id"),
			timeWindow: c.req.query("time_window"),
			duration: `${errorDuration.toFixed(2)}ms`,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to generate correlation graph data",
			},
			500,
		);
	}
});

// ============ RSS Feed ============

/**
 * Generate RSS 2.0 compliant feed XML
 *
 * RSS 2.0 Specification Compliance:
 * - Required: <rss version="2.0">, <channel>, <title>, <link>, <description>
 * - Recommended: <language>, <lastBuildDate>, <pubDate>, <ttl>
 * - Items: <title>, <link>, <description>, <pubDate>, <guid>
 * - Date format: RFC 822 (e.g., "Mon, 01 Jan 2024 12:00:00 GMT")
 * - CDATA sections for HTML content in title/description
 * - atom:link for self-reference (best practice)
 * - Enhanced with version patterns (1.x.x.x.x.x) and richer content
 */
async function generateRSSFeed(): Promise<string> {
	const now = new Date();
	// RFC 822 date format (required by RSS 2.0)
	const buildDate = now.toUTCString();
	// Use port 3001 for API server (matches routes.ts server port)
	const baseUrl = process.env[RSS_ENV.API_URL] || RSS_INTERNAL.DEFAULT_BASE_URL;

	// Get recent git commits for RSS items with enhanced metadata
	let gitCommits: Array<{
		hash: string;
		message: string;
		date: string;
		author?: string;
	}> = [];
	try {
		const gitLog = Bun.spawnSync({
			cmd: [
				"git",
				"log",
				"--oneline",
				"--decorate",
				`-${RSS_INTERNAL.GIT_LOG_LIMIT}`,
				"--date=iso",
				"--pretty=format:%h|%s|%ad|%an",
			],
			cwd: process.cwd(),
		}).stdout.toString();

		if (gitLog && gitLog.trim()) {
			const commits = gitLog.trim().split("\n").slice(0, RSS_INTERNAL.GIT_COMMITS_LIMIT);
			gitCommits = commits
				.map((commit) => {
					const parts = commit.split("|");
					const hash = parts[0]?.trim() || "";
					const message = parts[1]?.trim() || "";
					const dateStr = parts[2]?.trim() || "";
					const author = parts[3]?.trim() || "";
					return {
						hash,
						message,
						date: dateStr,
						author,
					};
				})
				.filter((c) => c.hash && c.message);
		}
	} catch {
		// Git not available or error
	}

	// Get version info from package.json
	let version = "1.0.0";
	try {
		const packageJson = Bun.file("package.json");
		if (await packageJson.exists()) {
			const pkg = await packageJson.json();
			version = pkg.version || version;
		}
	} catch {
		// Fallback to default version
	}

	// Format version as 1.x.x.x.x.x pattern
	const versionPattern = version.split(".").join(".");
	const versionDisplay =
		version.split(".").length === 3 ? `${version}.0.0` : version;

	const items = [
		{
			title: `${RSS_INTERNAL.PLATFORM_NAME} v${versionPattern} - System Status`,
			link: `${baseUrl}${RSS_API_PATHS.HEALTH}`,
			description: `<strong>Version:</strong> ${versionPattern}<br/><strong>Status:</strong> Enhanced system health check with database, pipeline, and performance monitoring<br/><strong>Platform:</strong> ${RSS_INTERNAL.PLATFORM_DESCRIPTION}<br/><strong>Endpoints:</strong> GET ${RSS_API_PATHS.HEALTH} - Comprehensive health check with service status`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.SYSTEM,
		},
		// ============ New Features ============
		{
			title: "Temporal Pattern Engine Available",
			link: `${baseUrl}/api/temporal/analyze`,
			description: `<strong>New Feature:</strong> Temporal Pattern Analysis Engine for detecting time-based patterns in market data. Analyze temporal patterns by entity and market with configurable time windows. Endpoints: GET /api/temporal/analyze/:entity/:market, GET /api/temporal/patterns/:entity/:market, POST /api/temporal/data`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.FEATURE,
		},
		{
			title: "Feature Flag Management API",
			link: `${baseUrl}/api/features`,
			description: `<strong>New Feature:</strong> Complete feature flag management API with RBAC. Create, update, and delete feature flags via REST API. Endpoints: GET /api/features, POST /api/features, PUT /api/features/:id, DELETE /api/features/:id`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.FEATURE,
		},
		{
			title: "Correlation Engine Registry Integration",
			link: `${baseUrl}/api/registry/correlation-engine`,
			description: `<strong>Registry Update:</strong> DoD Multi-Layer Correlation Engine integrated into registry system. Health monitoring, metrics tracking, and layer-by-layer statistics available via /api/registry/correlation-engine`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.REGISTRY,
		},
		// ============ Analytics & Correlation ============
		{
			title: "Correlation Engine Health Check",
			link: `${baseUrl}/api/correlation/health`,
			description: `Health check endpoint for DoD Multi-Layer Correlation Engine. Monitor database latency, layer failures, and system status.`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ANALYTICS,
		},
		{
			title: "Correlation Graph Builder",
			link: `${baseUrl}/api/correlation/graph`,
			description: `Build multi-layer correlation graphs for event analysis. Endpoint: GET /api/correlation/graph/:eventId`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ANALYTICS,
		},
		{
			title: "Trading Analytics - Stats & Profile",
			link: `${baseUrl}/api/stats`,
			description: `Trading statistics and analytics endpoints. GET /api/stats, GET /api/profile, GET /api/sessions, GET /api/trades`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ANALYTICS,
		},
		{
			title: "Pattern Analytics & Trends",
			link: `${baseUrl}/api/patterns/analytics`,
			description: `Pattern analytics and trend detection. GET /api/patterns/analytics, GET /api/trends`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ANALYTICS,
		},
		// ============ Data Import & Streams ============
		{
			title: "Trade Data Streams Management",
			link: `${baseUrl}/api/streams`,
			description: `Manage trade data streams and imports. GET /api/streams, POST /api/streams/file, POST /api/streams/api, POST /api/sync, DELETE /api/streams/:id`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.DATA,
		},
		{
			title: "OHLCV & Balance Data",
			link: `${baseUrl}/api/ohlcv`,
			description: `OHLCV candlestick data and balance information. GET /api/ohlcv, GET /api/balance`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.DATA,
		},
		// ============ Prediction Markets ============
		{
			title: "Polymarket Integration",
			link: `${baseUrl}/api/polymarket/markets`,
			description: `Polymarket prediction market integration with pipeline support. GET /api/polymarket/markets, POST /api/polymarket/fetch, POST /api/polymarket/connect`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PREDICTION_MARKETS,
		},
		{
			title: "Kalshi Integration",
			link: `${baseUrl}/api/kalshi/markets`,
			description: `Kalshi prediction market integration with pipeline support. GET /api/kalshi/markets, POST /api/kalshi/fetch, POST /api/kalshi/connect`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PREDICTION_MARKETS,
		},
		{
			title: "Prediction Market Statistics",
			link: `${baseUrl}/api/prediction/stats`,
			description: `Prediction market statistics and analytics. GET /api/prediction/stats`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PREDICTION_MARKETS,
		},
		// ============ Market Making ============
		{
			title: "Market Making Analytics",
			link: `${baseUrl}/api/mm/stats`,
			description: `Market making statistics and session analysis. GET /api/mm/stats, GET /api/mm/sessions`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.MARKET_MAKING,
		},
		// ============ ORCA Sports Betting ============
		{
			title: "ORCA Sports Betting Normalization",
			link: `${baseUrl}/api/orca/normalize`,
			description: `ORCA sports betting normalization engine. POST /api/orca/normalize, POST /api/orca/normalize/batch, GET /api/orca/lookup/team`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ORCA,
		},
		{
			title: "ORCA Taxonomy & Bookmakers",
			link: `${baseUrl}/api/orca/bookmakers`,
			description: `ORCA taxonomy and bookmaker information. GET /api/orca/bookmakers, GET /api/orca/sports, GET /api/orca/markets, GET /api/orca/stats`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ORCA,
		},
		{
			title: "ORCA Sharp Books Detection",
			link: `${baseUrl}/api/orca/sharp-books`,
			description: `Sharp bookmaker detection and analysis. GET /api/orca/sharp-books, GET /api/orca/sharp-books/tier/:tier, GET /api/orca/sharp-books/tag/:tag, GET /api/orca/sharp-books/status`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ORCA,
		},
		{
			title: "ORCA Streaming & Storage",
			link: `${baseUrl}/api/orca/stream/status`,
			description: `ORCA streaming and storage management. POST /api/orca/stream/start, POST /api/orca/stream/stop, GET /api/orca/stream/status, GET /api/orca/storage/stats`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ORCA,
		},
		// ============ Arbitrage ============
		{
			title: "Arbitrage Detection & Scanner",
			link: `${baseUrl}/api/arbitrage/status`,
			description: `Cross-market arbitrage detection and scanning. GET /api/arbitrage/status, GET /api/arbitrage/opportunities, POST /api/arbitrage/scan`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ARBITRAGE,
		},
		{
			title: "Crypto Arbitrage Matcher",
			link: `${baseUrl}/api/arbitrage/crypto`,
			description: `Cryptocurrency arbitrage matching across exchanges. GET /api/arbitrage/crypto/opportunities, POST /api/arbitrage/crypto/match`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.ARBITRAGE,
		},
		// ============ Deribit Options ============
		{
			title: "Deribit Options Chain & Greeks",
			link: `${baseUrl}/api/deribit/options`,
			description: `Deribit options chain and Greeks calculation. GET /api/deribit/options/:currency/:expiration, GET /api/deribit/greeks/:instrument`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.DERIBIT,
		},
		// ============ Telegram Integration ============
		{
			title: "Telegram Bot Management",
			link: `${baseUrl}${RSS_API_PATHS.TELEGRAM_BOT_STATUS}`,
			description: `Telegram bot control and management. GET ${RSS_API_PATHS.TELEGRAM_BOT_STATUS}, POST /api/telegram/bot/start, POST /api/telegram/bot/stop, POST /api/telegram/bot/restart`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.TELEGRAM,
		},
		{
			title: "Telegram Users & Topics",
			link: `${baseUrl}${RSS_API_PATHS.TELEGRAM_USERS}`,
			description: `Telegram user and topic management. GET ${RSS_API_PATHS.TELEGRAM_USERS}, GET /api/telegram/users/:id, GET ${RSS_API_PATHS.TELEGRAM_TOPICS}, POST ${RSS_API_PATHS.TELEGRAM_BROADCAST}`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.TELEGRAM,
		},
		{
			title: "Telegram Mini App Integration",
			link: `${baseUrl}${RSS_API_PATHS.MINIAPP_STATUS}`,
			description: `Telegram Mini App status and monitoring. GET ${RSS_API_PATHS.MINIAPP_STATUS}, GET ${RSS_API_PATHS.MINIAPP_HEALTH}, GET ${RSS_API_PATHS.MINIAPP_DEPLOYMENT}, GET ${RSS_API_PATHS.MINIAPP_CONFIG}`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.TELEGRAM,
		},
		{
			title: "Factory Wager Mini App - Staging Deployment",
			link: TELEGRAM_MINIAPP_URLS.STAGING,
			description: `Factory Wager Mini App staging environment deployed on Cloudflare Pages. Access the mini app directly or monitor via API endpoints: GET ${RSS_API_PATHS.MINIAPP_STATUS}, GET ${RSS_API_PATHS.MINIAPP_INFO}, GET ${RSS_API_PATHS.MINIAPP_HEALTH}`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.TELEGRAM,
		},
		{
			title: "Covert Steam Alerts",
			link: `${baseUrl}${RSS_API_PATHS.MINIAPP_ALERTS_COVERT_STEAM}`,
			description: `Covert steam alert management for Telegram Mini App. GET ${RSS_API_PATHS.MINIAPP_ALERTS_COVERT_STEAM}, POST ${RSS_API_PATHS.MINIAPP_ALERTS_COVERT_STEAM}, GET ${RSS_API_PATHS.MINIAPP_ALERTS_COVERT_STEAM}/:id`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.TELEGRAM,
		},
		// ============ Registry System ============
		{
			title: "Registry System Overview",
			link: `${baseUrl}${RSS_API_PATHS.REGISTRY}`,
			description: `Unified registry system for all platform registries. GET ${RSS_API_PATHS.REGISTRY}`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.REGISTRY,
		},
		{
			title: "Registry Endpoints",
			link: `${baseUrl}/api/registry/properties`,
			description: `Registry endpoints: /api/registry/properties, /api/registry/data-sources, /api/registry/sharp-books, /api/registry/errors, /api/registry/mcp-tools, /api/registry/cli-commands`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.REGISTRY,
		},
		// ============ MCP & Secrets ============
		{
			title: "MCP Secrets Management",
			link: `${baseUrl}/api/mcp/secrets`,
			description: `MCP secrets management with Bun.secrets integration. GET /api/mcp/secrets, GET /api/mcp/secrets/:server, POST /api/mcp/secrets/:server/api-key`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.MCP,
		},
		// ============ UI Policy Management ============
		{
			title: "UI Policy Management",
			link: `${baseUrl}/api/ui-policy/metrics`,
			description: `UI policy management and metrics. GET /api/ui-policy/metrics, GET /api/api/policies/binary, GET /api/api/policies/digest, POST /api/api/policies/sync`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.UI_POLICY,
		},
		// ============ Users & Authentication ============
		{
			title: "User Authentication & Session Management",
			link: `${baseUrl}/api/users/sign-in`,
			description: `User authentication and session management. POST /api/users/sign-in, POST /api/users/sign-out, GET /api/users/session`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.AUTH,
		},
		{
			title: "User Management API",
			link: `${baseUrl}/api/users`,
			description: `User management endpoints. GET /api/users, GET /api/users/:id, PUT /api/users/:id`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.AUTH,
		},
		// ============ Data Sources & Pipeline ============
		{
			title: "Data Source Registry",
			link: `${baseUrl}/api/sources/enabled`,
			description: `Data source registry with RBAC and feature flags. GET /api/sources/enabled`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PIPELINE,
		},
		// ============ Performance & Debugging ============
		{
			title: "Performance Monitoring & Statistics",
			link: `${baseUrl}/api/performance/stats`,
			description: `Performance monitoring with operation statistics and metrics. GET /api/performance/stats - Get all operation statistics and summaries`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PERFORMANCE,
		},
		{
			title: "Performance Alerts & Anomalies",
			link: `${baseUrl}/api/performance/alerts`,
			description: `Performance alerts and anomaly detection. GET /api/performance/alerts - Get active alerts and recent anomalies detected by PerformanceMonitor`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PERFORMANCE,
		},
		{
			title: "Enhanced System Health Check",
			link: `${baseUrl}${RSS_API_PATHS.HEALTH}`,
			description: `Comprehensive system health check with database, pipeline, and performance monitoring. GET ${RSS_API_PATHS.HEALTH} - Check database connectivity, pipeline health, and performance metrics`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.SYSTEM,
		},
		{
			title: "CPU Profiling & Performance",
			link: `${baseUrl}/api/cpu-profiling/profiles`,
			description: `CPU profiling and performance analysis. GET /api/cpu-profiling/profiles, GET /api/cpu-profiling/profiles/:id, POST /api/cpu-profiling/compare`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.PERFORMANCE,
		},
		{
			title: "Debug & Runtime Information",
			link: `${baseUrl}/api/debug/runtime`,
			description: `Debug endpoints for runtime information. GET /api/debug/memory, GET /api/debug/runtime, POST /api/debug/heap-snapshot`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.DEBUG,
		},
		// ============ Documentation ============
		{
			title: "API Documentation Updated",
			link: `${baseUrl}${RSS_API_PATHS.DOCS}`,
			description: "Complete API documentation with OpenAPI 3.0 specification",
			pubDate: buildDate,
			category: RSS_CATEGORIES.DOCUMENTATION,
		},
		{
			title: "Error Registry Available",
			link: `${baseUrl}${RSS_API_PATHS.DOCS_ERRORS}`,
			description: "Comprehensive error code registry with references",
			pubDate: buildDate,
			category: RSS_CATEGORIES.REGISTRY,
		},
		// ============ Bun Runtime Updates ============
		{
			title: "Bun v1.3 - Stricter Test Behavior in CI",
			link: `https://bun.com/blog/bun-v1.3#stricter-bun-test-in-ci-environments`,
			description: `Bun v1.3 introduces stricter test behavior in CI environments. Tests now fail on new snapshots and have stricter validation. Use CI=true bun test for CI mode. See release notes for details.`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.RUNTIME,
		},
		{
			title: "Bun v1.3 - Processes & Shell Features",
			link: `https://bun.com/blog/bun-v1.3#processes-shell`,
			description: `Bun v1.3 introduces enhanced process spawning and shell features. Improved Bun.spawn() API with timeout, maxBuffer, and ReadableStream stdin support. Enhanced Bun.Shell ($) template tag for better shell script execution.`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.RUNTIME,
		},
		{
			title: "Bun v1.3 - Enhanced Socket Information",
			link: `https://bun.com/blog/bun-v1.3#enhanced-socket-information`,
			description: `Bun v1.3 introduces enhanced socket information APIs. Improved socket metadata and connection details for better debugging and monitoring of WebSocket connections and network sockets.`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.RUNTIME,
		},
		// ============ UI Components ============
		{
			title: "Registry Browser UI",
			link: `${baseUrl}/registry.html`,
			description: `Unified registry browser for all platform registries. Visual interface with category filtering, tag-based search, stats dashboard, and feature flag-based conditional rendering. Access via /registry.html or /api/registry.html`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.UI,
		},
		{
			title: "Team Structure & Departments",
			link: RSS_GITHUB_LINKS.TEAM_PAGE,
			description:
				"8 departments organized with color coding and review assignments. Includes API & Routes, Arbitrage & Trading, ORCA & Sports Betting, Dashboard & UI, Registry & MCP Tools, Security, Performance & Caching, and Documentation & DX.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.TEAM,
		},
		{
			title: "PR Review Process",
			link: RSS_GITHUB_LINKS.PR_REVIEW_PAGE,
			description:
				"Comprehensive PR review checklist with department-specific assignments, review timelines, and approval criteria.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.PROCESS,
		},
		{
			title: "Topics & Categories Organization",
			link: RSS_GITHUB_LINKS.TOPICS_PAGE,
			description:
				"GitHub topics and labels organized by component, type, status, priority, and integration. Includes usage guidelines and search examples.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.ORGANIZATION,
		},
		{
			title: "Registry System Enhanced",
			link: `${baseUrl}${RSS_API_PATHS.REGISTRY}`,
			description:
				`Registry system now includes team departments, topics, and CSS bundler registries. Access via ${RSS_API_PATHS.REGISTRY_TEAM_DEPARTMENTS}, ${RSS_API_PATHS.REGISTRY_TOPICS}, and ${RSS_API_PATHS.REGISTRY_CSS_BUNDLER}`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.REGISTRY,
		},
		{
			title: "Bun CSS Bundler with Syntax Lowering",
			link: `${baseUrl}/docs/BUN-CSS-BUNDLER.md`,
			description:
				"CSS bundling with automatic syntax lowering: CSS nesting, color-mix(), relative colors, LAB colors, logical properties, modern selectors, math functions, media query ranges, and more. Includes CSS modules composition, feature detection, and validation.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.TOOLING,
		},
		{
			title: "CSS Syntax Examples Documentation",
			link: `${baseUrl}/docs/CSS-SYNTAX-EXAMPLES.md`,
			description:
				"Comprehensive examples of modern CSS syntax features with before/after comparisons and browser compatibility matrix. Includes nesting, colors, selectors, math functions, and more.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.DOCUMENTATION,
		},
		{
			title: "Frontend Configuration & Policy Management Integrated into MCP",
			link: `${baseUrl}/docs/4.0.0.0.0.0.0-MCP-ALERTING.md`,
			description:
				"Frontend Configuration & Policy Management (4.1.0.0.0.0.0) now integrated into Master Control Program & Alerting Subsystem. Declarative YAML manifest (config/ui-policy-manifest.yaml) for centralized UI policy control, feature flags, RBAC, and HTMLRewriter transformations. Includes UIPolicyManager service, MCP tools integration, metrics, and real-time WebSocket alerts.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.FEATURE,
		},
		{
			title: "HTML Link Extractor Utility",
			link: `${baseUrl}/docs/HTML-LINK-EXTRACTOR.md`,
			description:
				"New HTML link extraction utility using Bun's HTMLRewriter API. Extract links from HTML content with filtering options, domain extraction, and grouping capabilities. Supports string, Response, ArrayBuffer, and File inputs.",
			pubDate: buildDate,
			category: RSS_CATEGORIES.TOOLING,
		},
		// ============ Hyper-Bun Market Intelligence ============
		{
			title: "Hyper-Bun Market Intelligence",
			link: `${baseUrl}/api/hyper-bun/health`,
			description: `Hyper-Bun market intelligence and analysis. GET /api/hyper-bun/health, GET /api/hyper-bun/metrics, GET /api/hyper-bun/probe/:bookmaker`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.HYPER_BUN,
		},
		// ============ Cache Management ============
		{
			title: "Cache Statistics & Management",
			link: `${baseUrl}/api/cache/stats`,
			description: `Cache statistics and management. GET /api/cache/stats, POST /api/cache/clear`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.CACHE,
		},
		// ============ Metrics & Observability ============
		{
			title: "Prometheus Metrics Endpoint",
			link: `${baseUrl}/api/metrics`,
			description: `Prometheus-compatible metrics endpoint. GET /api/metrics`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.OBSERVABILITY,
		},
		// ============ Git Information ============
		{
			title: "Git Information & Versioning",
			link: `${baseUrl}/api/git-info`,
			description: `Git commit information and versioning. GET /api/git-info`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.SYSTEM,
		},
		// ============ Compliance & Audit ============
		{
			title: "MCP Compliance & Audit Logging",
			link: `${baseUrl}/api/mcp/compliance/stats`,
			description: `MCP compliance statistics and audit logging. GET /api/mcp/compliance/stats`,
			pubDate: buildDate,
			category: RSS_CATEGORIES.COMPLIANCE,
		},
	];

	// Add recent git commits as RSS items with enhanced metadata
	if (gitCommits.length > 0) {
		for (const commit of gitCommits) {
			try {
				const commitDate = new Date(commit.date);
				const commitDateRFC822 = commitDate.toUTCString();
				const authorInfo = commit.author ? ` by ${commit.author}` : "";
				items.push({
					title: `Commit ${commit.hash.substring(0, 7)}: ${commit.message.substring(0, 60)}${commit.message.length > 60 ? "..." : ""}`,
					link: `${RSS_GITHUB_LINKS.COMMIT_BASE}/${commit.hash}`,
					description: `<strong>Git Commit:</strong> ${commit.hash}<br/><strong>Message:</strong> ${commit.message}${authorInfo ? `<br/><strong>Author:</strong> ${commit.author}` : ""}<br/><strong>Date:</strong> ${commitDate.toLocaleString()}`,
					pubDate: commitDateRFC822,
					category: RSS_CATEGORIES.DEVELOPMENT,
					author: commit.author
						? `${commit.author}${RSS_INTERNAL.AUTHOR_EMAIL_DOMAIN}`
						: undefined,
				});
			} catch {
				// Skip invalid dates
			}
		}
	}

	// Get system metrics for enhanced description
	let systemMetrics = "";
	try {
		const memUsage = process.memoryUsage();
		const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
		const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
		systemMetrics = ` | Memory: ${memUsedMB}MB / ${memTotalMB}MB`;
	} catch {
		// Metrics unavailable
	}

	// Format version as extended 1.x.x.x.x.x pattern for RSS depth coverage
	const versionParts = version.split(".");
	const rssVersionPattern =
		versionParts.length >= 3
			? `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}.${versionParts[3] || "0"}.${versionParts[4] || "0"}.${versionParts[5] || "0"}`
			: `${version}.0.0.0.0`;

	// RSS 2.0 compliant item structure with enhanced fields
	const rssItems = items
		.map(
			(item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="true">${item.link}</guid>
      ${item.category ? `<category><![CDATA[${item.category}]]></category>` : ""}
      ${item.author ? `<author>${item.author}</author>` : ""}
      ${item.enclosure ? `<enclosure url="${item.enclosure.url}" length="${item.enclosure.length}" type="${item.enclosure.type}"/>` : ""}
    </item>`,
		)
		.join("");

	// Enhanced RSS 2.0 compliant feed structure with extended version pattern (15-depth coverage)
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title><![CDATA[${RSS_INTERNAL.PLATFORM_NAME} v${rssVersionPattern}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${RSS_INTERNAL.PLATFORM_DESCRIPTION}. Version: ${rssVersionPattern} (Extended: ${versionPattern})${systemMetrics}]]></description>
    <language>${RSS_INTERNAL.LANGUAGE}</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <pubDate>${buildDate}</pubDate>
    <ttl>${RSS_INTERNAL.TTL_MINUTES}</ttl>
    <generator>${RSS_INTERNAL.GENERATOR_NAME} v${rssVersionPattern}</generator>
    <webMaster>${RSS_INTERNAL.WEBMASTER_EMAIL}</webMaster>
    <managingEditor>${RSS_INTERNAL.MANAGING_EDITOR_EMAIL}</managingEditor>
    <copyright>Copyright ${new Date().getFullYear()} ${RSS_INTERNAL.PLATFORM_NAME}</copyright>
    <atom:link href="${baseUrl}${RSS_INTERNAL.ENDPOINT_PATH}" rel="self" type="${RSS_INTERNAL.CONTENT_TYPE}"/>
    <image>
      <url>${RSS_INTERNAL.IMAGE_URL}</url>
      <title>${RSS_INTERNAL.IMAGE_TITLE}</title>
      <link>${baseUrl}</link>
      <width>${RSS_INTERNAL.IMAGE_WIDTH}</width>
      <height>${RSS_INTERNAL.IMAGE_HEIGHT}</height>
    </image>
    ${rssItems}
  </channel>
</rss>`;
}

// RSS Feed endpoint
api.get(RSS_INTERNAL.ENDPOINT_PATH, async (c) => {
	c.header("Content-Type", RSS_INTERNAL.CONTENT_TYPE);
	return c.text(await generateRSSFeed());
});

api.get("/rss", async (c) => {
	c.header("Content-Type", RSS_INTERNAL.CONTENT_TYPE);
	return c.text(await generateRSSFeed());
});

// ============ Sitemap ============

/**
 * Standard XML Sitemap
 * Lists all public endpoints for crawlers/SEO
 * @route GET /sitemap.xml
 */
api.get("/sitemap.xml", (c) => {
	const baseUrl = process.env.BASE_URL || "http://localhost:3001";
	const urls = [
		{ loc: "/", priority: "1.0", changefreq: "daily" },
		{ loc: "/docs", priority: "0.9", changefreq: "weekly" },
		{ loc: "/api/health", priority: "0.8", changefreq: "always" },
		{ loc: "/api/examples", priority: "0.7", changefreq: "weekly" },
		{ loc: RSS_INTERNAL.ENDPOINT_PATH, priority: "0.6", changefreq: "daily" },
		{ loc: "/api/telegram/ev-heatmap", priority: "0.7", changefreq: "hourly" },
		{ loc: "/api/orca/bookmakers", priority: "0.6", changefreq: "weekly" },
		{ loc: "/api/orca/teams", priority: "0.6", changefreq: "weekly" },
		{ loc: "/api/arbitrage/status", priority: "0.7", changefreq: "always" },
		{ loc: "/api/streams", priority: "0.6", changefreq: "always" },
		{ loc: "/api/cache/stats", priority: "0.5", changefreq: "always" },
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
	)
	.join("\n")}
</urlset>`;

	c.header("Content-Type", "application/xml; charset=utf-8");
	return c.text(xml);
});

// ============ Changelog ============

/**
 * Get changelog entries from git commits
 * Returns structured changelog data for dashboard/RSS integration
 */
api.get("/changelog", async (c) => {
	try {
		const limit = parseInt(c.req.query("limit") || "20");
		const category = c.req.query("category"); // Optional: "feat", "fix", "chore", etc.

		// Get recent git commits
		let gitCommits: Array<{
			hash: string;
			message: string;
			date: string;
			author?: string;
			category?: string;
		}> = [];

		try {
			const gitLog = Bun.spawnSync({
				cmd: [
					"git",
					"log",
					"--oneline",
					"--decorate",
					`-${limit}`,
					"--date=iso",
					"--pretty=format:%h|%s|%ad|%an",
				],
				cwd: process.cwd(),
			}).stdout.toString();

			if (gitLog && gitLog.trim()) {
				const commits = gitLog.trim().split("\n").slice(0, limit);
				gitCommits = commits
					.map((commit) => {
						const parts = commit.split("|");
						const hash = parts[0]?.trim() || "";
						const message = parts[1]?.trim() || "";
						const dateStr = parts[2]?.trim() || "";
						const author = parts[3]?.trim() || "";

						// Extract category from commit message with enhanced pattern matching
						// Supports: "feat:", "feat(api):", "fix:", "fix(security):", etc.
						// Also matches component tags: "[api]", "[hyper-bun]", "[orca]", etc.
						let commitCategory = "other";

						// Try conventional commit format first: "type(scope): message"
						const conventionalMatch = message.match(/^(\w+)(\(.+?\))?:/);
						if (conventionalMatch) {
							commitCategory = conventionalMatch[1].toLowerCase();
						} else {
							// Try tag format: "[tag]" or "[tag][subtag]"
							const tagMatch = message.match(/\[([^\]]+)\]/);
							if (tagMatch) {
								const tag = tagMatch[1].toLowerCase();
								// Map common tags to categories
								if (tag.includes("api") || tag.includes("routes")) {
									commitCategory = "api";
								} else if (
									tag.includes("hyper-bun") ||
									tag.includes("hyperbun")
								) {
									commitCategory = "feat";
								} else if (tag.includes("orca")) {
									commitCategory = "orca";
								} else if (tag.includes("arbitrage")) {
									commitCategory = "arbitrage";
								} else if (tag.includes("dashboard") || tag.includes("ui")) {
									commitCategory = "dashboard";
								} else if (tag.includes("registry") || tag.includes("mcp")) {
									commitCategory = "registry";
								} else if (tag.includes("security")) {
									commitCategory = "security";
								} else if (
									tag.includes("docs") ||
									tag.includes("documentation")
								) {
									commitCategory = "docs";
								} else if (tag.includes("test")) {
									commitCategory = "test";
								} else if (
									tag.includes("perf") ||
									tag.includes("performance")
								) {
									commitCategory = "perf";
								} else {
									commitCategory = tag.split(/[\[\]]/)[0] || "other";
								}
							} else {
								// Try keyword matching in message
								const lowerMessage = message.toLowerCase();
								if (
									lowerMessage.includes("feat") ||
									lowerMessage.includes("add") ||
									lowerMessage.includes("new")
								) {
									commitCategory = "feat";
								} else if (
									lowerMessage.includes("fix") ||
									lowerMessage.includes("bug") ||
									lowerMessage.includes("error")
								) {
									commitCategory = "fix";
								} else if (
									lowerMessage.includes("docs") ||
									lowerMessage.includes("documentation")
								) {
									commitCategory = "docs";
								} else if (
									lowerMessage.includes("refactor") ||
									lowerMessage.includes("cleanup")
								) {
									commitCategory = "refactor";
								} else if (lowerMessage.includes("test")) {
									commitCategory = "test";
								} else if (lowerMessage.includes("security")) {
									commitCategory = "security";
								} else if (
									lowerMessage.includes("perf") ||
									lowerMessage.includes("performance")
								) {
									commitCategory = "perf";
								}
							}
						}

						return {
							hash,
							message,
							date: dateStr,
							author,
							category: commitCategory,
						};
					})
					.filter((c) => c.hash && c.message)
					.filter((c) => !category || c.category === category);
			}
		} catch {
			// Git not available
		}

		// Try to read CHANGELOG.md if it exists
		let changelogMd: string | null = null;
		try {
			const changelogFile = Bun.file("CHANGELOG.md");
			if (await changelogFile.exists()) {
				changelogMd = await changelogFile.text();
			}
		} catch {
			// CHANGELOG.md not available
		}

		// Get version from package.json
		let version = "0.1.0";
		try {
			const packageJson = Bun.file("package.json");
			if (await packageJson.exists()) {
				const pkg = await packageJson.json();
				version = pkg.version || version;
			}
		} catch {
			// Fallback to default version
		}

		// Group commits by category
		const byCategory: Record<
			string,
			Array<{
				hash: string;
				message: string;
				date: string;
				author?: string;
			}>
		> = {};

		for (const commit of gitCommits) {
			const cat = commit.category || "other";
			if (!byCategory[cat]) {
				byCategory[cat] = [];
			}
			byCategory[cat].push({
				hash: commit.hash,
				message: commit.message,
				date: commit.date,
				author: commit.author,
			});
		}

		// Import category colors from shared utility
		const { CHANGELOG_CATEGORY_COLORS } = await import(
			"../utils/changelog-colors"
		);
		const categoryColors = CHANGELOG_CATEGORY_COLORS;

		return c.json({
			version,
			total: gitCommits.length,
			categories: Object.keys(byCategory),
			byCategory,
			commits: gitCommits,
			changelogMd: changelogMd || null,
			categoryColors, // Include color mapping in response
			generated: new Date().toISOString(),
		});
	} catch (error) {
		return c.json(
			{
				error: true,
				message:
					error instanceof Error ? error.message : "Failed to get changelog",
			},
			500,
		);
	}
});

/**
 * Get changelog as formatted table (CLI-friendly)
 * Returns plain text table using Bun.inspect.table() format
 *
 * @version 7.1.1.0.0.0.0 - Tabular Data Display
 * Cross-Reference: @see 7.1.1.0.0.0.0 for table generation, @see 9.1.1.4.1.0 for Telegram formatting
 *
 * @example
 * GET /api/changelog/table?limit=10&properties=hash,category,message&colors=true
 */
api.get("/changelog/table", async (c) => {
	try {
		const limit = parseInt(c.req.query("limit") || "20");
		const category = c.req.query("category");
		const properties = c.req.query("properties")?.split(",") || [
			"hash",
			"category",
			"message",
			"date",
		];
		const colors = c.req.query("colors") !== "false"; // Default true

		// Reuse changelog fetching logic (inline to avoid HTTP call)
		let gitCommits: Array<{
			hash: string;
			message: string;
			date: string;
			author?: string;
			category?: string;
		}> = [];

		try {
			const gitLog = Bun.spawnSync({
				cmd: [
					"git",
					"log",
					"--oneline",
					"--decorate",
					`-${limit}`,
					"--date=iso",
					"--pretty=format:%h|%s|%ad|%an",
				],
				cwd: process.cwd(),
			}).stdout.toString();

			if (gitLog && gitLog.trim()) {
				const commits = gitLog.trim().split("\n").slice(0, limit);
				gitCommits = commits
					.map((commit) => {
						const parts = commit.split("|");
						const hash = parts[0]?.trim() || "";
						const message = parts[1]?.trim() || "";
						const dateStr = parts[2]?.trim() || "";
						const author = parts[3]?.trim() || "";

						// Extract category (same logic as /changelog endpoint)
						let commitCategory = "other";
						const conventionalMatch = message.match(/^(\w+)(\(.+?\))?:/);
						if (conventionalMatch) {
							commitCategory = conventionalMatch[1].toLowerCase();
						} else {
							const tagMatch = message.match(/\[([^\]]+)\]/);
							if (tagMatch) {
								const tag = tagMatch[1].toLowerCase();
								if (tag.includes("api") || tag.includes("routes"))
									commitCategory = "api";
								else if (tag.includes("hyper-bun") || tag.includes("hyperbun"))
									commitCategory = "feat";
								else if (tag.includes("orca")) commitCategory = "orca";
								else if (tag.includes("arbitrage"))
									commitCategory = "arbitrage";
								else if (tag.includes("dashboard") || tag.includes("ui"))
									commitCategory = "dashboard";
								else if (tag.includes("registry") || tag.includes("mcp"))
									commitCategory = "registry";
								else if (tag.includes("security")) commitCategory = "security";
								else if (tag.includes("docs") || tag.includes("documentation"))
									commitCategory = "docs";
								else if (tag.includes("test")) commitCategory = "test";
								else if (tag.includes("perf") || tag.includes("performance"))
									commitCategory = "perf";
							}
						}

						return {
							hash,
							message,
							date: dateStr,
							author,
							category: commitCategory,
						};
					})
					.filter((c) => c.hash && c.message)
					.filter((c) => !category || c.category === category);
			}
		} catch {
			// Git not available
		}

		// Import color utilities
		const { CHANGELOG_CATEGORY_COLORS } = await import(
			"../utils/changelog-colors"
		);

		// Prepare table data
		const tableData = gitCommits.map((entry) => {
			const row: Record<string, string> = {};

			for (const prop of properties) {
				if (prop === "hash") {
					row[prop] = entry.hash.substring(0, 7);
				} else if (prop === "category") {
					const cat = entry.category || "other";
					if (colors) {
						const color =
							CHANGELOG_CATEGORY_COLORS[cat] || CHANGELOG_CATEGORY_COLORS.other;
						const r = parseInt(color.slice(1, 3), 16);
						const g = parseInt(color.slice(3, 5), 16);
						const b = parseInt(color.slice(5, 7), 16);
						row[prop] = `\x1b[38;2;${r};${g};${b}m${cat}\x1b[0m`;
					} else {
						row[prop] = cat;
					}
				} else if (prop === "message") {
					const maxLength = 60;
					row[prop] =
						entry.message.length > maxLength
							? entry.message.substring(0, maxLength) + "..."
							: entry.message;
				} else if (prop === "date") {
					try {
						const date = new Date(entry.date);
						row[prop] = date.toLocaleDateString();
					} catch {
						row[prop] = entry.date;
					}
				} else if (prop === "author") {
					row[prop] = entry.author || "--";
				} else {
					row[prop] = String((entry as Record<string, unknown>)[prop] || "--");
				}
			}
			return row;
		});

		// Generate table using Bun.inspect.table() (7.1.1.0.0.0.0)
		const tableOutput = Bun.inspect.table(tableData, {
			columns: properties,
			colors,
		});

		return c.text(tableOutput, 200, {
			"Content-Type": "text/plain; charset=utf-8",
		});
	} catch (error) {
		return c.text(
			`Error generating changelog table: ${error instanceof Error ? error.message : String(error)}`,
			500,
		);
	}
});

// ============ API Discovery ============

api.get("/discovery", (c) => {
	return c.json(getApiDiscovery());
});

// ============ API Examples ============

/**
 * Get all API examples
 * @route GET /api/examples
 * @description Returns code examples for key Bun APIs and integrations
 * @query category - Filter examples by category (e.g., "Testing & Benchmarking")
 * @query name - Get specific example by name
 * @returns {Object} Examples array, categories, and total count
 *
 * @example
 * // Get all examples
 * GET /api/examples
 *
 * @example
 * // Get testing examples
 * GET /api/examples?category=Testing%20%26%20Benchmarking
 *
 * @example
 * // Get snapshot testing example
 * GET /api/examples?name=Snapshot%20Testing%20-%20toMatchSnapshot%20%26%20toMatchInlineSnapshot
 *
 * @see {@link ./examples.ts|API Examples Source}
 * @see {@link ../docs/4.0.0.0.0.0.0-MCP-ALERTING.md#42100000|MCP Snapshot Testing Integration}
 */
api.get("/examples", async (c) => {
	const { getExamplesByCategory, getCategories, apiExamples } = await import(
		"./examples"
	);
	const category = c.req.query("category");
	const name = c.req.query("name");

	if (name) {
		const example = apiExamples.find((ex) => ex.name === name);
		if (!example) {
			return c.json({ error: "Example not found" }, 404);
		}
		return c.json({ example });
	}

	if (category) {
		const examples = getExamplesByCategory(category);
		return c.json({ examples, category });
	}

	return c.json({
		examples: apiExamples,
		categories: getCategories(),
		total: apiExamples.length,
	});
});

// Legacy alias (without /api prefix)
api.get("/examples", async (c) => {
	const { getExamplesByCategory, getCategories, apiExamples } = await import(
		"./examples"
	);
	const category = c.req.query("category");
	const name = c.req.query("name");

	if (name) {
		const example = apiExamples.find((ex) => ex.name === name);
		if (!example) {
			return c.json({ error: "Example not found" }, 404);
		}
		return c.json({ example });
	}

	if (category) {
		const examples = getExamplesByCategory(category);
		return c.json({ examples, category });
	}

	return c.json({
		examples: apiExamples,
		categories: getCategories(),
		total: apiExamples.length,
	});
});

// Get example by name
api.get("/examples/:name", async (c) => {
	const { getExampleByName } = await import("./examples");
	const name = c.req.param("name");
	const example = getExampleByName(name);

	if (!example) {
		return c.json({ error: "Example not found" }, 404);
	}

	return c.json({ example });
});

// ============ Security & Threat Monitoring ============

// Get security threat summary (with /api prefix alias)
api.get("/security/threats", async (c) => {
	const { RuntimeSecurityMonitor } = await import(
		"../security/runtime-monitor"
	);
	const hours = parseInt(c.req.query("hours") || "24");

	const monitor = new RuntimeSecurityMonitor();
	const threats = monitor.getRecentThreats(hours);

	// Group by type
	const summary = threats.reduce(
		(acc, threat) => {
			if (!acc[threat.type]) {
				acc[threat.type] = {
					type: threat.type,
					count: 0,
					maxSeverity: 0,
					firstSeen: threat.detectedAt,
					lastSeen: threat.detectedAt,
				};
			}
			acc[threat.type].count++;
			acc[threat.type].maxSeverity = Math.max(
				acc[threat.type].maxSeverity,
				threat.severity,
			);
			acc[threat.type].firstSeen = Math.min(
				acc[threat.type].firstSeen,
				threat.detectedAt,
			);
			acc[threat.type].lastSeen = Math.max(
				acc[threat.type].lastSeen,
				threat.detectedAt,
			);
			return acc;
		},
		{} as Record<string, unknown>,
	);

	monitor.destroy();

	return c.json({
		summary: Object.values(summary),
		total: threats.length,
		hours,
	});
});

// Legacy alias (without /api prefix)
api.get("/security/threats", async (c) => {
	const { RuntimeSecurityMonitor } = await import(
		"../security/runtime-monitor"
	);
	const hours = parseInt(c.req.query("hours") || "24");

	const monitor = new RuntimeSecurityMonitor();
	const threats = monitor.getRecentThreats(hours);

	// Group by type
	const summary = threats.reduce(
		(acc, threat) => {
			if (!acc[threat.type]) {
				acc[threat.type] = {
					type: threat.type,
					count: 0,
					maxSeverity: 0,
					firstSeen: threat.detectedAt,
					lastSeen: threat.detectedAt,
				};
			}
			acc[threat.type].count++;
			acc[threat.type].maxSeverity = Math.max(
				acc[threat.type].maxSeverity,
				threat.severity,
			);
			acc[threat.type].firstSeen = Math.min(
				acc[threat.type].firstSeen,
				threat.detectedAt,
			);
			acc[threat.type].lastSeen = Math.max(
				acc[threat.type].lastSeen,
				threat.detectedAt,
			);
			return acc;
		},
		{} as Record<string, unknown>,
	);

	monitor.destroy();

	return c.json({
		summary: Object.values(summary),
		total: threats.length,
		hours,
	});
});

// Get active incidents
api.get("/security/incidents", async (c) => {
	const { IncidentResponseOrchestrator } = await import(
		"../security/incident-response"
	);

	const orchestrator = new IncidentResponseOrchestrator();
	const incidents = orchestrator.getActiveIncidents();
	orchestrator.close();

	return c.json({
		incidents,
		total: incidents.length,
	});
});

// Get compliance status
api.get("/security/compliance", async (c) => {
	const { ComplianceLogger } = await import("../security/compliance-logger");
	const days = parseInt(c.req.query("days") || "30");

	const logger = new ComplianceLogger();
	const stats = logger.getComplianceStats(days);
	logger.close();

	return c.json({
		stats,
		days,
		status: stats.totalLogs > 0 ? "healthy" : "no_data",
	});
});

// Generate compliance report
api.get("/security/compliance/report", async (c) => {
	const { ComplianceLogger } = await import("../security/compliance-logger");
	const startDate =
		c.req.query("start") ||
		new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	const endDate = c.req.query("end") || new Date().toISOString();

	const logger = new ComplianceLogger();
	const report = await logger.generateComplianceReport(startDate, endDate);
	logger.close();

	return new Response(report as unknown as BodyInit, {
		headers: {
			"Content-Type": "application/gzip",
			"Content-Disposition": `attachment; filename="compliance-report-${startDate}-${endDate}.gz"`,
		},
	});
});

// ============ Sportsbook & Betting Markets Mini App Integration ============

// Get all sportsbooks
api.get("/api/miniapp/sportsbooks", async (c) => {
	try {
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const sportsbooks = await sportsbookMiniapp.getSportsbooks();
		return c.json({ sportsbooks, total: sportsbooks.length });
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get sportsbooks",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get sportsbook status
api.get("/api/miniapp/sportsbooks/:bookmaker", async (c) => {
	try {
		const bookmaker = c.req.param("bookmaker") as any;
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const status = await sportsbookMiniapp.getSportsbookStatus(bookmaker);
		if (!status) {
			return c.json({ error: true, message: "Sportsbook not found", code: "NX-404" }, 404);
		}
		return c.json(status);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get sportsbook status",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get betting markets
api.get("/api/miniapp/markets", async (c) => {
	try {
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const filters = {
			sport: c.req.query("sport"),
			league: c.req.query("league"),
			marketType: c.req.query("marketType") as any,
			bookmaker: c.req.query("bookmaker") as any,
			eventId: c.req.query("eventId"),
		};
		const markets = await sportsbookMiniapp.getMarkets(filters);
		return c.json({ markets, total: markets.length });
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get markets",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get market by ID
api.get("/api/miniapp/markets/:marketId", async (c) => {
	try {
		const marketId = c.req.param("marketId");
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const market = await sportsbookMiniapp.getMarket(marketId);
		if (!market) {
			return c.json({ error: true, message: "Market not found", code: "NX-404" }, 404);
		}
		return c.json(market);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get market",
				code: "NX-500",
			},
			500,
		);
	}
});

// Compare odds across bookmakers
api.get("/api/miniapp/markets/:marketId/compare", async (c) => {
	try {
		const marketId = c.req.param("marketId");
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const comparison = await sportsbookMiniapp.compareOdds(marketId);
		if (!comparison) {
			return c.json({ error: true, message: "Market not found", code: "NX-404" }, 404);
		}
		return c.json(comparison);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to compare odds",
				code: "NX-500",
			},
			500,
		);
	}
});

// Send alert to Telegram supergroup topic
// POST /api/miniapp/supergroup/send-alert
api.post(RSS_API_PATHS.MINIAPP_SUPERGROUP_SEND_ALERT, async (c) => {
	try {
		const body = await c.req.json();
		const { message, threadId, pinMessage, alertType, alertData } = body;

		if (!message || !threadId) {
			return c.json(
				{
					error: true,
					code: "NX-MCP-021",
					message: "Missing required fields: message and threadId are required",
				},
				400,
			);
		}

		// Get Telegram bot instance
		const { TelegramBotApi } = await import("../api/telegram-ws");
		const chatId = process.env.TELEGRAM_CHAT_ID || Bun.secrets?.TELEGRAM_CHAT_ID;
		
		if (!chatId) {
			return c.json(
				{
					error: true,
					code: "NX-MCP-031",
					message: "Telegram chat ID not configured",
				},
				500,
			);
		}

		const bot = new TelegramBotApi();
		
		// Format message with optional alert data
		let formattedMessage = message;
		if (alertData && alertType === "covert-steam") {
			// Format as covert steam alert
			formattedMessage = `🚨 <b>Covert Steam Alert</b>\n\n${message}`;
			if (alertData.id) {
				formattedMessage += `\n\n<code>Alert ID: ${alertData.id}</code>`;
			}
		} else if (alertData && alertType === "url-anomaly") {
			// Format as URL anomaly alert
			formattedMessage = `⚠️ <b>URL Anomaly Detected</b>\n\n${message}`;
			if (alertData.anomaly_type) {
				formattedMessage += `\n\n<code>Type: ${alertData.anomaly_type}</code>`;
			}
		}

		// Send message to Telegram topic
		const sendResult = await bot.sendMessage(
			chatId,
			formattedMessage,
			threadId,
		);

		if (!sendResult.ok) {
			return c.json(
				{
					error: true,
					code: "NX-900",
					message: sendResult.description || "Failed to send alert to Telegram",
				},
				500,
			);
		}

		const messageId = sendResult.result?.message_id;

		// Pin message if requested
		if (pinMessage && messageId) {
			const pinResult = await bot.pinMessage(chatId, messageId, threadId);
			if (!pinResult.ok) {
				// Log warning but don't fail the request
				console.warn("Failed to pin message:", pinResult.description);
			}
		}

		return c.json({
			success: true,
			messageId,
			threadId,
			pinned: pinMessage && messageId ? true : false,
		});
	} catch (error) {
		return c.json(
			{
				error: true,
				code: "NX-MCP-001",
				message:
					error instanceof Error ? error.message : "Failed to send alert",
			},
			500,
		);
	}
});

// Get arbitrage opportunities
api.get("/api/miniapp/arbitrage", async (c) => {
	try {
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const filters = {
			minEdge: c.req.query("minEdge") ? parseFloat(c.req.query("minEdge")!) : undefined,
			eventId: c.req.query("eventId"),
			marketType: c.req.query("marketType") as any,
			bookmaker: c.req.query("bookmaker") as any,
		};
		const opportunities = await sportsbookMiniapp.getArbitrageOpportunities(filters);
		return c.json({ opportunities, total: opportunities.length });
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get arbitrage opportunities",
				code: "NX-500",
			},
			500,
		);
	}
});

// Execute arbitrage opportunity
api.post("/api/miniapp/arbitrage/:opportunityId/execute", requireAuth, async (c) => {
	try {
		const opportunityId = c.req.param("opportunityId");
		const body = await c.req.json();
		const totalStake = body.totalStake || 100;

		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const result = await sportsbookMiniapp.executeArbitrage(opportunityId, totalStake);
		if (!result) {
			return c.json({ error: true, message: "Failed to execute arbitrage", code: "NX-500" }, 500);
		}
		return c.json(result);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to execute arbitrage",
				code: "NX-500",
			},
			500,
		);
	}
});

// Place a bet
api.post("/api/miniapp/bets", requireAuth, async (c) => {
	try {
		const body = await c.req.json();
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const bet = await sportsbookMiniapp.placeBet(body);
		if (!bet) {
			return c.json({ error: true, message: "Failed to place bet", code: "NX-500" }, 500);
		}
		return c.json(bet);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to place bet",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get all bets
api.get("/api/miniapp/bets", requireAuth, async (c) => {
	try {
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const filters = {
			status: c.req.query("status") as any,
			bookmaker: c.req.query("bookmaker") as any,
			marketId: c.req.query("marketId"),
			limit: c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined,
		};
		const bets = await sportsbookMiniapp.getBets(filters);
		return c.json({ bets, total: bets.length });
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get bets",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get bet by ID
api.get("/api/miniapp/bets/:betId", requireAuth, async (c) => {
	try {
		const betId = c.req.param("betId");
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const bet = await sportsbookMiniapp.getBet(betId);
		if (!bet) {
			return c.json({ error: true, message: "Bet not found", code: "NX-404" }, 404);
		}
		return c.json(bet);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get bet",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get betting statistics
api.get("/api/miniapp/bets/stats", requireAuth, async (c) => {
	try {
		const { sportsbookMiniapp } = await import("../utils/sportsbook-miniapp");
		const stats = await sportsbookMiniapp.getBettingStats();
		if (!stats) {
			return c.json({ error: true, message: "Failed to get stats", code: "NX-500" }, 500);
		}
		return c.json(stats);
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get betting statistics",
				code: "NX-500",
			},
			500,
		);
	}
});

// ============ Market Graph & Shadow Graph Endpoints ============

/**
 * Get shadow movement graph for an event
 * @route GET /api/events/{eventId}/market-graph
 */
api.get("/events/:eventId/market-graph", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		if (!eventId) {
			return c.json({ error: "eventId parameter is required" }, 400);
		}

		const db = new Database("./data/research.db", { create: true });
		const { ShadowGraphOrchestrator } = await import(
			"../arbitrage/shadow-graph/shadow-graph-orchestrator"
		);
		const orchestrator = new ShadowGraphOrchestrator("./data/research.db");
		await orchestrator.initialize();

		// Build shadow graph for event
		const graph = await orchestrator.buildShadowGraphForEvent(eventId);

		if (!graph) {
			return c.json({ error: "No graph data found for event" }, 404);
		}

		// Convert to API format (graph.nodes is a Map)
		const nodes = Array.from(graph.nodes.values()).map((node) => ({
			nodeId: node.nodeId,
			bookmaker: node.bookmaker,
			marketType: node.marketId,
			line: node.lastOdds,
			isDarkPool: node.visibility === "dark",
			liquidity: {
				public: node.displayedLiquidity,
				hidden: node.hiddenLiquidity,
				true: node.displayedLiquidity + node.hiddenLiquidity,
			},
			detectedAt: new Date(node.lastUpdated).toISOString(),
		}));

		const links = Array.from(graph.edges.values()).map((edge) => ({
			sourceNodeId: edge.sourceNodeId,
			targetNodeId: edge.targetNodeId,
			propagationDelay: edge.latencyMs || 0,
			confidence: edge.confidence || 0,
			detectedAt: new Date(edge.lastUpdated).toISOString(),
		}));

		return c.json({
			eventId,
			nodes,
			links,
			metadata: {
				totalNodes: nodes.length,
				totalLinks: links.length,
				darkPoolNodes: nodes.filter((n) => n.isDarkPool).length,
				generatedAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get market graph", error);
		return c.json({ error: "Failed to get market graph" }, 500);
	}
});

/**
 * Get dark pool offerings for an event
 * @route GET /api/events/{eventId}/market-offerings/dark-pool
 */
api.get("/events/:eventId/market-offerings/dark-pool", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		if (!eventId) {
			return c.json({ error: "eventId parameter is required" }, 400);
		}

		const db = new Database("./data/research.db", { create: true });
		const { ShadowGraphOrchestrator } = await import(
			"../arbitrage/shadow-graph/shadow-graph-orchestrator"
		);
		const orchestrator = new ShadowGraphOrchestrator("./data/research.db");
		await orchestrator.initialize();

		const graph = await orchestrator.buildShadowGraphForEvent(eventId);
		if (!graph) {
			return c.json({ eventId, offerings: [], total: 0 });
		}

		const darkPoolNodes = Array.from(graph.nodes.values()).filter(
			(node) => node.visibility === "dark",
		);

		const offerings = darkPoolNodes.map((node) => ({
			nodeId: node.nodeId,
			bookmaker: node.bookmaker,
			marketType: node.marketId,
			line: node.lastOdds,
			trueLiquidity: node.displayedLiquidity + node.hiddenLiquidity,
			detectionMethod: "shadow-graph-analysis",
			confidence: 0.8, // Default confidence
			detectedAt: new Date(node.lastUpdated).toISOString(),
		}));

		return c.json({
			eventId,
			offerings,
			total: offerings.length,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get dark pool offerings", error);
		return c.json({ error: "Failed to get dark pool offerings" }, 500);
	}
});

/**
 * Get liquidity profile for a market node
 * @route GET /api/events/{eventId}/market-offerings/{nodeId}/liquidity
 */
api.get("/events/:eventId/market-offerings/:nodeId/liquidity", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const nodeId = c.req.param("nodeId");

		const db = new Database("./data/research.db", { create: true });
		const { ShadowGraphOrchestrator } = await import(
			"../arbitrage/shadow-graph/shadow-graph-orchestrator"
		);
		const orchestrator = new ShadowGraphOrchestrator("./data/research.db");
		await orchestrator.initialize();

		const graph = await orchestrator.buildShadowGraphForEvent(eventId);
		if (!graph) {
			return c.json({ error: "Event not found" }, 404);
		}

		const node = Array.from(graph.nodes.values()).find((n) => n.nodeId === nodeId);
		if (!node) {
			return c.json({ error: "Node not found" }, 404);
		}

		return c.json({
			nodeId,
			publicLiquidity: node.displayedLiquidity,
			hiddenLiquidity: node.hiddenLiquidity,
			trueLiquidity: node.displayedLiquidity + node.hiddenLiquidity,
			liquidityDistribution: [], // Would need historical data
			updatedAt: new Date(node.lastUpdated).toISOString(),
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get liquidity profile", error);
		return c.json({ error: "Failed to get liquidity profile" }, 500);
	}
});

/**
 * Check if a market line is deceptive
 * @route GET /api/events/{eventId}/market-offerings/{nodeId}/is-deceptive
 */
api.get("/events/:eventId/market-offerings/:nodeId/is-deceptive", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const nodeId = c.req.param("nodeId");

		const db = new Database("./data/research.db", { create: true });
		const { ShadowGraphOrchestrator } = await import(
			"../arbitrage/shadow-graph/shadow-graph-orchestrator"
		);
		const orchestrator = new ShadowGraphOrchestrator("./data/research.db");
		await orchestrator.initialize();

		const graph = await orchestrator.buildShadowGraphForEvent(eventId);
		if (!graph) {
			return c.json({ error: "Event not found" }, 404);
		}

		const node = Array.from(graph.nodes.values()).find((n) => n.nodeId === nodeId);
		if (!node) {
			return c.json({ error: "Node not found" }, 404);
		}

		const reasons: string[] = [];
		let confidence = 0;

		// Check for bait line
		if (node.isBaitLine) {
			reasons.push("Bait line detected");
			confidence += 0.5;
		}

		// Check correlation deviation
		if (node.correlationDeviation > 0.3) {
			reasons.push("High correlation deviation");
			confidence += 0.3;
		}

		// Check for URL anomaly patterns (would need integration with URL anomaly detector)
		// For now, use bait detection as proxy

		return c.json({
			nodeId,
			isDeceptive: node.isBaitLine || node.correlationDeviation > 0.3,
			confidence: Math.min(confidence, 1.0),
			reasons,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to check deceptive line", error);
		return c.json({ error: "Failed to check deceptive line" }, 500);
	}
});

// ============ Covert Steam & Arbitrage Endpoints ============

/**
 * Get covert steam events for an event
 * @route GET /api/events/{eventId}/covert-steam-events
 */
api.get("/events/:eventId/covert-steam-events", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const severityParam = c.req.query("severity");
		const bookmakerFilter = c.req.query("bookmaker");

		const db = new Database("./data/research.db", { create: true });
		
		// Query covert steam events from database
		const query = db.query(`
			SELECT 
				event_identifier,
				detection_timestamp,
				bookmaker_name,
				source_dark_node_id,
				impact_severity_score
			FROM covert_steam_events
			WHERE event_identifier = ?
			${severityParam ? "AND impact_severity_score >= ?" : ""}
			${bookmakerFilter ? "AND bookmaker_name = ?" : ""}
			ORDER BY detection_timestamp DESC
		`);

		const params: (string | number)[] = [eventId];
		if (severityParam) params.push(parseFloat(severityParam));
		if (bookmakerFilter) params.push(bookmakerFilter);

		interface CovertSteamEventRow {
			event_identifier: string;
			detection_timestamp: number;
			bookmaker_name: string;
			source_dark_node_id: string;
			impact_severity_score: number;
		}
		const rows = query.all(...params) as CovertSteamEventRow[];

		const events = rows.map((row) => ({
			event_identifier: row.event_identifier,
			detection_timestamp: row.detection_timestamp,
			bookmaker_name: row.bookmaker_name,
			source_dark_node_id: row.source_dark_node_id,
			impact_severity_score: row.impact_severity_score,
		}));

		return c.json({
			eventId,
			events,
			total: events.length,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get covert steam events", error);
		return c.json({ error: "Failed to get covert steam events" }, 500);
	}
});

/**
 * Get concealed arbitrage opportunities for an event
 * @route GET /api/events/{eventId}/concealed-arbitrage-opportunities
 */
api.get("/events/:eventId/concealed-arbitrage-opportunities", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const minSpreadParam = c.req.query("minSpread");

		const db = new Database("./data/research.db", { create: true });
		const { ShadowArbitrageScanner } = await import(
			"../arbitrage/shadow-graph/shadow-arb-scanner"
		);
		const { ShadowGraphOrchestrator } = await import(
			"../arbitrage/shadow-graph/shadow-graph-orchestrator"
		);

		const orchestrator = new ShadowGraphOrchestrator("./data/research.db");
		await orchestrator.initialize();

		const graph = await orchestrator.buildShadowGraphForEvent(eventId);
		if (!graph) {
			return c.json({ eventId, opportunities: [], total: 0 });
		}

		// Use scanner to find concealed arbitrage opportunities
		const scanner = new ShadowArbitrageScanner(
			async () => graph,
			async (edge) => edge.latencyMs || 10000, // Default window
		);

		const opportunities = await scanner.scanShadowArb(eventId);
		const minSpread = minSpreadParam ? parseFloat(minSpreadParam) : 0;

		const filtered = opportunities.filter(
			(opp) => (opp.profit || 0) >= minSpread,
		);

		return c.json({
			eventId,
			opportunities: filtered.map((opp) => {
				const sourceNode = graph.nodes.get(opp.sourceNodeId);
				const targetNode = graph.nodes.get(opp.targetNodeId);
				return {
					opportunityId: opp.id,
					eventId,
					sourceNode: {
						nodeId: opp.sourceNodeId,
						bookmaker: sourceNode?.bookmaker,
						line: sourceNode?.lastOdds,
					},
					targetNode: {
						nodeId: opp.targetNodeId,
						bookmaker: targetNode?.bookmaker,
						line: targetNode?.lastOdds,
					},
					spread: opp.profit || 0,
					isDarkPool: true,
					confidence: opp.confidence || 0.8,
					detectedAt: new Date().toISOString(),
				};
			}),
			total: filtered.length,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get concealed arbitrage opportunities", error);
		return c.json({ error: "Failed to get concealed arbitrage opportunities" }, 500);
	}
});

/**
 * MLGS Shadow Graph Scan - Multi-Layer Arbitrage Detection
 * @route GET /api/mlgs/shadow-scan/:league
 */
api.get("/api/mlgs/shadow-scan/:league", async (c) => {
	try {
		const { league } = c.req.param();
		const { MLGSGraph } = await import("../../graphs/MLGSGraph");

		// Initialize MLGS graph
		const dbPath = "./data/mlgs.db";
		const mlgs = new MLGSGraph(dbPath);

		// Build full graph for league
		await mlgs.buildFullGraph(league);

		// Find hidden edges (>3% arb)
		const hiddenArbs = await mlgs.findHiddenEdges(
			{
				minWeight: 0.03,
				layer: "L4_SPORT",
			},
			0.9,
		);

		// Predict steam propagation if hidden arbs found
		let propagation = null;
		if (hiddenArbs.length > 0) {
			const sourceNode = {
				id: hiddenArbs[0].edge.source,
				type: "arbitrage",
				data: hiddenArbs[0].sourceData,
				metadata: {},
				lastUpdated: Date.now(),
			};

			propagation = await mlgs.propagateSignal(
				sourceNode,
				["L3_EVENT", "L2_MARKET"],
				{ decayRate: 0.95 },
			);
		}

		// Detect anomaly patterns
		const anomalyPatterns = await mlgs.detectAnomalyPatterns();

		// Get graph metrics
		const metrics = mlgs.getGraphMetrics();

		return c.json({
			league,
			shadowGraph: metrics,
			hiddenArbs: hiddenArbs.map((arb) => ({
				source: arb.edge.source,
				target: arb.edge.target,
				weight: arb.edge.weight,
				confidence: arb.edge.confidence,
				anomalyScore: arb.anomalyScore,
				arbitragePercent: arb.arbitragePercent,
				metadata: arb.edge.metadata,
			})),
			propagationRisk: propagation?.confidenceDecay ?? null,
			executePriority: anomalyPatterns.map((pattern) => ({
				layer: pattern.layer,
				edgeCount: pattern.edgeCount,
				avgRisk: pattern.avgRisk,
				maxProfitPct: pattern.maxProfitPct,
				arbPriority: pattern.arbPriority,
			})),
			scanTimestamp: Date.now(),
		});
	} catch (error) {
		logger.error("NX-500", "Failed to scan MLGS shadow graph", error);
		return c.json({ error: "Failed to scan MLGS shadow graph" }, 500);
	}
});

// ============ Circuit Breaker Endpoints ============

/**
 * Get circuit breaker status for all bookmakers
 * @route GET /api/circuit-breakers/status
 */
api.get("/circuit-breakers/status", async (c) => {
	try {
		const { getCircuitBreaker } = await import(
			"../utils/circuit-breaker-instance"
		);
		const breaker = getCircuitBreaker();
		const allStatus = breaker.getAllStatus();

		const trippedCount = allStatus.filter((s) => s.tripped).length;
		const healthyCount = allStatus.filter((s) => !s.tripped).length;

		return c.json({
			bookmakers: allStatus.map((status) => ({
				bookmaker: status.bookmaker,
				tripped: status.tripped,
				failures: status.failureCount,
				failureThreshold: 10, // Default threshold
				lastError: status.lastError,
				avgLatency: status.avgLatency,
				lastFailureAt: status.lastFailureAt,
				tripCount: status.tripCount,
				lastResetAt: status.lastResetAt,
				lastResetBy: status.lastResetBy,
				lastResetReason: status.lastResetReason,
			})),
			total: allStatus.length,
			trippedCount,
			healthyCount,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get circuit breaker status", error);
		return c.json({ error: "Failed to get circuit breaker status" }, 500);
	}
});

/**
 * Get circuit breaker status for a specific bookmaker
 * @route GET /api/circuit-breakers/{bookmaker}
 */
api.get("/circuit-breakers/:bookmaker", async (c) => {
	try {
		const bookmaker = c.req.param("bookmaker");
		const { getCircuitBreaker } = await import(
			"../utils/circuit-breaker-instance"
		);
		const breaker = getCircuitBreaker();
		const status = breaker.getStatus(bookmaker);

		if (!status) {
			return c.json({ error: "Bookmaker not found" }, 404);
		}

		return c.json({
			bookmaker: status.bookmaker,
			tripped: status.tripped,
			failures: status.failureCount,
			failureThreshold: 10,
			lastError: status.lastError,
			avgLatency: status.avgLatency,
			lastFailureAt: status.lastFailureAt,
			tripCount: status.tripCount,
			lastResetAt: status.lastResetAt,
			lastResetBy: status.lastResetBy,
			lastResetReason: status.lastResetReason,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get circuit breaker status", error);
		return c.json({ error: "Failed to get circuit breaker status" }, 500);
	}
});

/**
 * Manually trip circuit breaker (Admin only)
 * @route POST /api/circuit-breakers/{bookmaker}/trip
 */
api.post("/circuit-breakers/:bookmaker/trip", requireAdmin, async (c) => {
	try {
		const bookmaker = c.req.param("bookmaker");
		const body = await c.req.json().catch(() => ({}));
		const reason = body.reason || "Manual trip via API";

		const { getCircuitBreaker } = await import(
			"../utils/circuit-breaker-instance"
		);
		const breaker = getCircuitBreaker();
		const user = await getAuthenticatedUser(c);
		await breaker.trip(bookmaker, reason, user?.id || "api");

		return c.json({
			success: true,
			bookmaker,
			message: `Circuit breaker tripped for ${bookmaker}`,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to trip circuit breaker", error);
		return c.json({ error: "Failed to trip circuit breaker" }, 500);
	}
});

/**
 * Manually reset circuit breaker (Admin only)
 * @route POST /api/circuit-breakers/{bookmaker}/reset
 */
api.post("/circuit-breakers/:bookmaker/reset", requireAdmin, async (c) => {
	try {
		const bookmaker = c.req.param("bookmaker");
		const body = await c.req.json().catch(() => ({}));
		const reason = body.reason || "Manual reset via API";
		const force = body.force === true;

		const { getCircuitBreaker } = await import(
			"../utils/circuit-breaker-instance"
		);
		const breaker = getCircuitBreaker();
		const user = await getAuthenticatedUser(c);

		try {
			await breaker.reset(bookmaker, {
				reason,
				force,
				user: user?.id || "api",
			});
		} catch (error) {
			return c.json(
				{
					error: error instanceof Error ? error.message : "Reset failed",
				},
				400,
			);
		}

		return c.json({
			success: true,
			bookmaker,
			message: `Circuit breaker reset for ${bookmaker}`,
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		logger.error("NX-500", "Failed to reset circuit breaker", error);
		return c.json(
			{ error: "Failed to reset circuit breaker", message: errorMessage },
			500,
		);
	}
});

// ============ Logging & Operational Controls ============

/**
 * Get log codes registry
 * @route GET /api/logs/codes
 */
api.get("/logs/codes", async (c) => {
	try {
		const { LOG_CODES } = await import("../logging/log-codes");
		
		const codes: Record<string, unknown> = {};
		for (const [code, definition] of Object.entries(LOG_CODES)) {
			codes[code] = {
				code: definition.code,
				level: definition.expectedLevel,
				description: definition.summary,
				category: definition.context,
				commonCauses: definition.commonCauses || [],
				resolutionSteps: definition.resolutionSteps || [],
			};
		}

		return c.json({
			codes,
			total: Object.keys(codes).length,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get log codes", error);
		return c.json({ error: "Failed to get log codes" }, 500);
	}
});

/**
 * Dynamically adjust log level for a source module
 * @route PATCH /api/log-level/{sourceModule}
 */
api.patch("/log-level/:sourceModule", async (c) => {
	try {
		const sourceModule = c.req.param("sourceModule");
		const body = await c.req.json();
		const { level } = body;

		if (!level || !["error", "warn", "info", "debug"].includes(level)) {
			return c.json({ error: "Invalid log level" }, 400);
		}

		const {
			setRuntimeLogLevel,
			getRuntimeLogLevel,
			StandardizedLogLevel,
		} = await import("../logging/logger");

		const previousLevel = getRuntimeLogLevel(sourceModule);
		setRuntimeLogLevel(sourceModule, level as StandardizedLogLevel);

		return c.json({
			success: true,
			module: sourceModule,
			previousLevel: previousLevel || "info",
			newLevel: level,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to update log level", error);
		return c.json({ error: "Failed to update log level" }, 500);
	}
});

// ============ MCP Secrets Management ============

/**
 * Get MCP secrets status for all servers
 * @route GET /api/mcp/secrets
 */
api.get("/mcp/secrets", async (c) => {
	try {
		const { mcpApiKeys, mcpSessions } = await import("../secrets/mcp");
		const servers = await mcpApiKeys.list();
		
		const status = await Promise.all(
			servers.map(async (server) => {
				const hasApiKey = await mcpApiKeys.has(server);
				const hasCookies = await mcpSessions.has(server);
				return {
					server,
					hasApiKey,
					hasCookies,
				};
			})
		);

		return c.json({
			servers: status,
			totalConfigured: status.filter((s) => s.hasApiKey || s.hasCookies).length,
			totalServers: servers.length,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get MCP secrets status", error);
		return c.json({ error: "Failed to get secrets status" }, 500);
	}
});

/**
 * Get MCP server API key (requires read authorization)
 * @route GET /api/mcp/secrets/:server/api-key
 * 
 * IMPORTANT: This route must be defined BEFORE /mcp/secrets/:server
 * to ensure proper route matching (more specific routes first)
 */
api.get("/mcp/secrets/:server/api-key", optionalAuth, async (c) => {
	try {
		const server = c.req.param("server");

		// Get authenticated user from request context
		const user = getAuthenticatedUser(c);

		// Use secret-guard authorization system
		const { authorizeSecretAccess } = await import("../auth/secret-guard");
		const authorized = await authorizeSecretAccess("nexus", "read", user);

		if (!authorized) {
			return c.json({
				error: "Unauthorized",
				code: "HBSE-006",
				message: "Insufficient permissions to read secrets"
			}, 403);
		}

		const { mcpApiKeys } = await import("../secrets/mcp");

		// Check if API key exists
		const hasKey = await mcpApiKeys.has(server);

		if (!hasKey) {
			return c.json({
				server,
				configured: false,
				message: `No API key configured for MCP server: ${server}`
			});
		}

		// Get the API key
		const apiKey = await mcpApiKeys.get(server);

		return c.json({
			server,
			configured: true,
			apiKey: apiKey ? "***" + apiKey.slice(-4) : null, // Mask the key
			message: `API key configured for MCP server: ${server}`
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get API key", error);
		return c.json({ error: "Failed to get API key" }, 500);
	}
});

/**
 * Store MCP server API key (requires write authorization and validation)
 * @route POST /api/mcp/secrets/:server/api-key
 */
api.post("/mcp/secrets/:server/api-key", optionalAuth, async (c) => {
	try {
		const server = c.req.param("server");
		const body = await c.req.json().catch(() => ({}));
		
		// Support both 'value' and 'apiKey' for backward compatibility
		const apiKeyValue = body.value || body.apiKey;
		
		if (!apiKeyValue || typeof apiKeyValue !== "string") {
			return c.json({ 
				error: "Invalid request",
				message: "API key value is required",
				code: "HBSE-007"
			}, 400);
		}

		// Validate secret format
		const { validateSecretValue } = await import("../validation/secret-validator");
		if (!validateSecretValue(apiKeyValue, "api-key")) {
			return c.json({ 
				error: "Invalid API key format",
				message: "API key must be 32-128 characters and contain only alphanumeric characters, underscores, or hyphens",
				code: "HBSE-007"
			}, 400);
		}

		// Get authenticated user from request context
		const user = getAuthenticatedUser(c);

		// Use secret-guard authorization system
		const { authorizeSecretAccess } = await import("../auth/secret-guard");
		const authorized = await authorizeSecretAccess("nexus", "write", user);

		if (!authorized) {
			return c.json({
				error: "Unauthorized",
				code: "HBSE-006",
				message: "Insufficient permissions to write secrets"
			}, 403);
		}

		const { mcpApiKeys } = await import("../secrets/mcp");
		await mcpApiKeys.set(server, apiKeyValue);

		return c.json({
			success: true,
			server,
			message: `API key stored securely for ${server}`,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to store API key", error);
		return c.json({ error: "Failed to store API key" }, 500);
	}
});

/**
 * Delete MCP server API key (requires delete authorization)
 * @route DELETE /api/mcp/secrets/:server/api-key
 */
api.delete("/mcp/secrets/:server/api-key", optionalAuth, async (c) => {
	try {
		const server = c.req.param("server");
		
		// Get authenticated user from request context
		const user = getAuthenticatedUser(c);
		
		// Check authorization (requires authentication)
		if (!user) {
			// Log unauthorized access attempt (no authentication)
			const { HyperBunLogger } = await import("../logging/logger");
			const { LOG_CODES } = await import("../logging/log-codes");
			const authLogger = new HyperBunLogger('SecretGuard');
			authLogger.error(LOG_CODES['HBSE-006'].code, LOG_CODES['HBSE-006'].summary, undefined, {
				operator: 'anonymous',
				operatorRole: 'none',
				service: "nexus",
				operation: "delete",
				action: 'unauthorized_access_attempt',
				reason: 'no_authentication_token',
			});
			
			return c.json({ 
				error: "Unauthorized",
				code: "HBSE-006",
				message: "Authentication required"
			}, 401);
		}
		
		const { authorizeSecretAccess } = await import("../auth/secret-guard");
		const authorized = await authorizeSecretAccess("nexus", "delete", user);
		
		if (!authorized) {
			return c.json({ 
				error: "Forbidden",
				code: "HBSE-006",
				message: "Insufficient permissions to delete secrets"
			}, 403);
		}

		const { mcpApiKeys } = await import("../secrets/mcp");
		await mcpApiKeys.del(server);

		return c.json({
			success: true,
			server,
			message: `API key deleted for ${server}`,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to delete API key", error);
		return c.json({ error: "Failed to delete API key" }, 500);
	}
});

/**
 * Get MCP secrets status for a specific server
 * @route GET /api/mcp/secrets/:server
 * 
 * NOTE: This route is defined AFTER /mcp/secrets/:server/api-key
 * to ensure the more specific route matches first
 */
api.get("/mcp/secrets/:server", async (c) => {
	try {
		const server = c.req.param("server");
		const { mcpApiKeys, mcpSessions } = await import("../secrets/mcp");
		
		const apiKey = await mcpApiKeys.get(server);
		const cookies = await mcpSessions.get(server);
		
		return c.json({
			server,
			hasApiKey: apiKey !== null,
			apiKeyLength: apiKey?.length || 0,
			apiKeyMasked: apiKey 
				? `${apiKey.slice(0, 4)}${"*".repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-4)}`
				: null,
			hasCookies: cookies !== null,
			cookieCount: cookies ? Array.from(cookies).length : 0,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get server secrets", error);
		return c.json({ error: "Failed to get server secrets" }, 500);
	}
});

// Register user management routes
api.route("/api", usersApi);
api.route("/api", featuresApi);

// Register developer workspace routes
import { workspaceApi } from "./workspace-routes";
api.route("/api", workspaceApi);

// ============ MCP Dashboard Endpoints ============

/**
 * List all MCP tools
 * @route GET /api/mcp/tools
 */
api.get("/mcp/tools", async (c) => {
	try {
		const { getMCPToolsRegistry } = await import("./registry");
		const registry = getMCPToolsRegistry();
		return c.json({
			tools: registry.tools,
			total: registry.totalTools,
			categories: registry.categories,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to list MCP tools", error);
		return c.json({ error: "Failed to list tools" }, 500);
	}
});

/**
 * Get MCP tool information
 * @route GET /api/mcp/tools/:toolName
 */
api.get("/mcp/tools/:toolName", async (c) => {
	try {
		const toolName = c.req.param("toolName");
		const { getMCPToolsRegistry } = await import("./registry");
		const registry = getMCPToolsRegistry();
		const tool = registry.tools.find((t) => t.name === toolName);
		
		if (!tool) {
			return c.json({ error: "Tool not found" }, 404);
		}
		
		return c.json(tool);
	} catch (error) {
		logger.error("NX-500", "Failed to get tool info", error);
		return c.json({ error: "Failed to get tool info" }, 500);
	}
});

/**
 * Execute MCP tool
 * @route POST /api/mcp/tools/:toolName
 */
api.post("/mcp/tools/:toolName", async (c) => {
	try {
		const toolName = c.req.param("toolName");
		const body = await c.req.json().catch(() => ({}));
		const args = body.arguments || body.args || {};
		
		// Create MCP server instance and register tools
		const { MCPServer } = await import("../mcp/server");
		const {
			createResearchTools,
			createAnomalyResearchTools,
			createBunShellTools,
			createBunToolingTools,
			createDocsIntegrationTools,
			createSecurityDashboardTools,
		} = await import("../mcp");
		
		const server = new MCPServer();
		const { Database } = await import("bun:sqlite");
		const db = new Database("./data/research.db", { create: true });
		
		// Register all tools
		const researchTools = createResearchTools(db);
		const anomalyTools = createAnomalyResearchTools(db);
		const bunShellTools = createBunShellTools();
		const bunToolingTools = createBunToolingTools();
		const docsTools = createDocsIntegrationTools();
		const securityTools = createSecurityDashboardTools();
		
		server.registerTools([
			...researchTools,
			...anomalyTools,
			...bunShellTools,
			...bunToolingTools,
			...docsTools,
			...securityTools,
		]);
		
		const result = await server.executeTool(toolName, args);
		db.close();
		
		return c.json({
			tool: toolName,
			success: !result.isError,
			result: result.content,
		});
	} catch (error) {
		logger.error("NX-500", "Failed to execute tool", error);
		return c.json({
			error: "Failed to execute tool",
			message: error instanceof Error ? error.message : String(error),
		}, 500);
	}
});

/**
 * Get MCP statistics
 * @route GET /api/mcp/stats
 */
api.get("/mcp/stats", async (c) => {
	try {
		const { getMCPToolsRegistry } = await import("./registry");
		const registry = getMCPToolsRegistry();
		
		// Get metrics from observability
		const { getMetrics } = await import("../observability/metrics");
		const metricsText = await getMetrics();
		
		// Parse Prometheus metrics to extract MCP stats
		const mcpMetrics: Record<string, number> = {};
		const lines = metricsText.split("\n");
		
		for (const line of lines) {
			if (line.startsWith("mcp_tool_invocations_total")) {
				const match = line.match(/mcp_tool_invocations_total\{[^}]*status="([^"]+)"[^}]*\} (\d+)/);
				if (match) {
					const status = match[1];
					const count = parseInt(match[2], 10);
					mcpMetrics[`invocations_${status}`] = (mcpMetrics[`invocations_${status}`] || 0) + count;
				}
			}
		}
		
		const totalInvocations = Object.values(mcpMetrics).reduce((a, b) => a + b, 0);
		const successCount = mcpMetrics.invocations_success || 0;
		const errorCount = mcpMetrics.invocations_error || 0;
		
		return c.json({
			summary: {
				totalTools: registry.totalTools,
				activeTools: registry.tools.length,
				totalInvocations,
				successCount,
				errorCount,
				successRate: totalInvocations > 0 ? Math.round((successCount / totalInvocations) * 100) : 0,
				errorRate: totalInvocations > 0 ? Math.round((errorCount / totalInvocations) * 100) : 0,
				categories: Object.keys(registry.categories).length,
			},
			metrics: mcpMetrics,
			tools: registry.tools.map((t) => ({
				name: t.name,
				category: t.category,
			})),
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get MCP stats", error);
		return c.json({ error: "Failed to get stats" }, 500);
	}
});

/**
 * Get MCP compliance statistics
 * @route GET /api/mcp/compliance/stats
 */
api.get("/mcp/compliance/stats", async (c) => {
	try {
		// Return basic compliance stats
		// Full implementation would query compliance logger
		return c.json({
			totalInvocations: 0,
			loggedInvocations: 0,
			complianceRate: 100,
			lastAudit: new Date().toISOString(),
		});
	} catch (error) {
		logger.error("NX-500", "Failed to get compliance stats", error);
		return c.json({ error: "Failed to get compliance stats" }, 500);
	}
});

// ============ 17.15.0.0.0.0.0 — NEXUS Type Properties & Naming Radiance Overhaul ============
// Versioned registry endpoints with Radiance headers
import {
    getAllRegistryHealth,
    getRegistryMetadata,
    NEXUS_REGISTRY_OF_REGISTRIES,
} from "../17.14.0.0.0.0.0-nexus/registry-of-registries";
import { radianceMiddleware17 } from "../17.15.0.0.0.0.0-radiance/middleware.radiance.17";
import { probeDataSourcesHealth17, queryDataSourcesRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.data-sources.17";
import { probeMcpToolsHealth17, queryMcpToolsRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.mcp-tools.17";
import { probePropertiesHealth17, queryPropertiesRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.properties.17";
import { probeSharpBooksHealth17, querySharpBooksRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.sharp-books.17";
import { v17 } from "../17.15.0.0.0.0.0-radiance/routing.v17";
import {
    getBookmakerProfilesRegistry,
    getCLICommandsRegistry,
    getErrorRegistry,
    getMCPToolsRegistry,
    getRegistriesOverview,
    getSharpBooksRegistry,
    getTeamDepartmentsRegistry,
    getWorkspaceRegistry,
} from "./registry";

// ============ Version 17 Routes ============
// Apply Radiance middleware to all v17 routes
const v17Api = new Hono();
v17Api.use("*", radianceMiddleware17({ version: "17.16.0" }));

// Get all registries overview (enhanced with radiance status) - v17
v17Api.get("/api/v17/registry", async (c) => {
	try {
		const overview = await getRegistriesOverview();
		const healthStatuses = getAllRegistryHealth();
		
		// Enhance registries with real-time health status
		const enhancedRegistries = overview.registries.map((reg) => {
			const health = healthStatuses.get(reg.id);
			const metadata = getRegistryMetadata(reg.id);
			return {
				...reg,
				status: health?.status || reg.status,
				lastChecked: health?.checkedAt || metadata?.lastChecked,
				radianceChannel: metadata?.radianceChannel,
				radianceSeverity: metadata?.radianceSeverity,
				realtime: metadata?.realtime || false,
			};
		});

		return c.json({
			...overview,
			registries: enhancedRegistries,
			version: "17.14.0",
			radiance: {
				enabled: true,
				channels: Object.values(NEXUS_REGISTRY_OF_REGISTRIES)
					.filter((r) => r.realtime)
					.map((r) => ({
						registry: r.id,
						channel: r.radianceChannel,
						severity: r.radianceSeverity,
					})),
			},
		});
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get registries overview",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get registry of registries (meta-registry) - v17
v17Api.get(v17.registry["registry-of-registries"], async (c) => {
	try {
		const healthStatuses = getAllRegistryHealth();
		const registries = Object.values(NEXUS_REGISTRY_OF_REGISTRIES).map((reg) => {
			const health = healthStatuses.get(reg.id);
			return {
				...reg,
				lastStatus: health?.status || reg.lastStatus,
				lastChecked: health?.checkedAt || reg.lastChecked,
				healthy: health?.healthy ?? (reg.lastStatus === "healthy"),
			};
		});

		return c.json({
			version: "17.14.0",
			total: registries.length,
			realtime: registries.filter((r) => r.realtime).length,
			registries,
		});
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get registry of registries",
				code: "NX-500",
			},
			500,
		);
	}
});

// Get registry health status
api.get("/api/registry/:id/health", async (c) => {
	try {
		const id = c.req.param("id");
		const metadata = getRegistryMetadata(id);
		
		if (!metadata) {
			return c.json({ error: true, message: "Registry not found", code: "NX-404" }, 404);
		}

		const { getAllRegistryHealth } = await import("../17.14.0.0.0.0.0-nexus/registry-monitor");
		const healthStatuses = getAllRegistryHealth();
		const health = healthStatuses.get(id);

		return c.json({
			registry: id,
			healthy: health?.healthy ?? false,
			status: health?.status || metadata.lastStatus || "unknown",
			lastChecked: health?.checkedAt || metadata.lastChecked,
			consecutiveFailures: health?.consecutiveFailures || 0,
			radianceChannel: metadata.radianceChannel,
			radianceSeverity: metadata.radianceSeverity,
		});
	} catch (error) {
		return c.json(
			{
				error: true,
				message: "Failed to get registry health",
				code: "NX-500",
			},
			500,
		);
	}
});

// ============ Version 17 Registry Endpoints ============

// Properties Registry v17
v17Api.get(v17.registry.properties, async (c) => {
	try {
		const props = await queryPropertiesRegistry17();
		c.set("radiance.healthStatus", "healthy");
		return c.json({
			registry: "properties",
			version: "17.16.0",
			items: props,
			total: props.length,
		});
	} catch (error) {
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to query properties registry",
				code: "NX-500",
			},
			500,
		);
	}
});

// Properties Health v17
v17Api.get("/api/v17/registry/properties/health", async (c) => {
	const health = await probePropertiesHealth17();
	c.set("radiance.healthStatus", health.status);
	return c.json(health);
});

// MCP Tools Registry v17
v17Api.get(v17.registry["mcp-tools"], async (c) => {
	try {
		const tools = await queryMcpToolsRegistry17();
		c.set("radiance.healthStatus", "healthy");
		return c.json({
			registry: "mcp-tools",
			version: "17.16.0",
			items: tools,
			total: tools.length,
		});
	} catch (error) {
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to query MCP tools registry",
				code: "NX-500",
			},
			500,
		);
	}
});

// MCP Tools Health v17
v17Api.get("/api/v17/registry/mcp-tools/health", async (c) => {
	const health = await probeMcpToolsHealth17();
	c.set("radiance.healthStatus", health.status);
	return c.json(health);
});

// Sharp Books Registry v17
v17Api.get(v17.registry["sharp-books"], async (c) => {
	try {
		const tier = c.req.query("tier") ? parseInt(c.req.query("tier")!) as 1 | 2 | 3 | 4 : undefined;
		const status = c.req.query("status") as "active" | "degraded" | "offline" | undefined;
		const cryptoAccepted = c.req.query("crypto") === "true" ? true : c.req.query("crypto") === "false" ? false : undefined;
		
		const books = await querySharpBooksRegistry17({ tier, status, cryptoAccepted });
		c.set("radiance.healthStatus", "healthy");
		return c.json({
			registry: "sharp-books",
			version: "17.16.0",
			items: books,
			total: books.length,
		});
	} catch (error) {
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to query sharp books registry",
				code: "NX-500",
			},
			500,
		);
	}
});

// Sharp Books Health v17
v17Api.get("/api/v17/registry/sharp-books/health", async (c) => {
	const health = await probeSharpBooksHealth17();
	c.set("radiance.healthStatus", health.status);
	return c.json(health);
});

// Data Sources Registry v17
v17Api.get(v17.registry["data-sources"], async (c) => {
	try {
		const type = c.req.query("type") as "rest" | "websocket" | "graphql" | "grpc" | undefined;
		const auth = c.req.query("auth") as "bearer" | "api-key" | "none" | "oauth2" | undefined;
		const namespace = c.req.query("namespace");
		
		const sources = await queryDataSourcesRegistry17({ type, auth, namespace });
		c.set("radiance.healthStatus", "healthy");
		return c.json({
			registry: "data-sources",
			version: "17.16.0",
			items: sources,
			total: sources.length,
		});
	} catch (error) {
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to query data sources registry",
				code: "NX-500",
			},
			500,
		);
	}
});

// Data Sources Health v17
v17Api.get("/api/v17/registry/data-sources/health", async (c) => {
	const health = await probeDataSourcesHealth17();
	c.set("radiance.healthStatus", health.status);
	return c.json(health);
});

// ============ Version 17 Mini App Routes ============
// Mini App endpoints with Radiance headers

// Mini App Sportsbooks v17
v17Api.get(v17.miniapp.sportsbooks, async (c) => {
	try {
		// Reuse existing handler logic but with v17 route
		const response = await api.fetch(new Request(`${c.req.url.replace('/v17/telegram/miniapp', '/miniapp')}`, c.req.raw));
		const data = await response.json();
		
		c.set("radiance.healthStatus", "healthy");
		return c.json({
			...data,
			version: "17.16.0",
		});
	} catch (error) {
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to get sportsbooks",
				code: "NX-500",
			},
			500,
		);
	}
});

// Mini App Markets v17
v17Api.get(v17.miniapp.markets, async (c) => {
	try {
		const response = await api.fetch(new Request(`${c.req.url.replace('/v17/telegram/miniapp', '/miniapp')}`, c.req.raw));
		const data = await response.json();
		
		c.set("radiance.healthStatus", "healthy");
		return c.json({
			...data,
			version: "17.16.0",
		});
	} catch (error) {
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to get markets",
				code: "NX-500",
			},
			500,
		);
	}
});

// Mini App Status v17
v17Api.get(v17.miniapp.status, async (c) => {
	try {
		const response = await api.fetch(new Request(`${c.req.url.replace('/v17/telegram/miniapp', '/miniapp')}`, c.req.raw));
		const data = await response.json();
		
		c.set("radiance.healthStatus", data.status === "online" ? "healthy" : "degraded");
		return c.json({
			...data,
			version: "17.16.0",
		});
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		logger.error("Failed to get miniapp status", error);
		c.set("radiance.healthStatus", "offline");
		return c.json(
			{
				error: true,
				message: "Failed to get miniapp status",
				code: "NX-500",
				details: errorMessage,
			},
			500,
		);
	}
});

// Mount v17 routes
// Get workspace registry
api.get("/api/registry/workspace", async (c) => {
	try {
		const registry = await getWorkspaceRegistry();
		return c.json(registry);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get workspace registry",
				message: errorMessage,
			},
			500
		);
	}
});

// ============ Registry Endpoints ============

/**
 * Get specific registry by ID
 * @route GET /api/registry/:id
 */
api.get("/api/registry/:id", async (c) => {
	try {
		const registryId = c.req.param("id");

		switch (registryId) {
			case ROUTING_REGISTRY_NAMES.TEAM_DEPARTMENTS: {
				const registry = await getTeamDepartmentsRegistry();
				return c.json(registry);
			}
			case ROUTING_REGISTRY_NAMES.MCP_TOOLS: {
				const registry = getMCPToolsRegistry();
				return c.json(registry);
			}
			case ROUTING_REGISTRY_NAMES.CLI_COMMANDS: {
				const registry = getCLICommandsRegistry();
				return c.json(registry);
			}
			case ROUTING_REGISTRY_NAMES.SHARP_BOOKS: {
				const registry = getSharpBooksRegistry();
				return c.json(registry);
			}
			case ROUTING_REGISTRY_NAMES.ERRORS: {
				const registry = getErrorRegistry();
				return c.json(registry);
			}
			case "bookmaker-profiles": {
				const registry = await getBookmakerProfilesRegistry();
				return c.json(registry);
			}
			case "bookmakers": {
				const { getUnifiedBookmakerRegistry } = await import("./registry");
				const registry = getUnifiedBookmakerRegistry();
				return c.json(registry);
			}
			case "workspace": {
				const registry = await getWorkspaceRegistry();
				return c.json(registry);
			}
			default:
				return c.json(
					{
						error: "Registry not found",
						message: `Registry '${registryId}' is not supported`,
						supportedRegistries: [
							ROUTING_REGISTRY_NAMES.TEAM_DEPARTMENTS,
							ROUTING_REGISTRY_NAMES.MCP_TOOLS,
							ROUTING_REGISTRY_NAMES.CLI_COMMANDS,
							ROUTING_REGISTRY_NAMES.SHARP_BOOKS,
							ROUTING_REGISTRY_NAMES.ERRORS,
							"bookmaker-profiles",
							"bookmakers",
							"workspace",
						],
					},
					404
				);
		}
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to get registry",
				message: errorMessage,
			},
			500
		);
	}
});

// ============ Team Info Endpoints ============

/**
 * Query TEAM.md using the team-info MCP tool
 * @route GET /api/team/info?query=<query>
 * @route POST /api/team/info { query: string }
 */
api.get("/api/team/info", async (c) => {
	try {
		const query = c.req.query("query") || "department:api";
		const { executeTeamInfoTool } = await import("../mcp/tools/team-info");
		const result = await executeTeamInfoTool({ query });
		return c.json(result);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to query team info",
				message: errorMessage,
			},
			500
		);
	}
});

/**
 * [TEAM.ML.REVIEWER.ASSIGNMENT.API.RG:IMPLEMENTATION] PR Reviewer Assignment API
 * Analyze PR and get ML-driven reviewer suggestions
 * @route POST /api/pr/reviewers
 * @body { prNumber: number; baseBranch?: string }
 */
api.post("/api/pr/reviewers", async (c) => {
	try {
		const body = await c.req.json();
		const { prNumber, baseBranch = 'main' } = body;

		if (!prNumber || typeof prNumber !== 'number') {
			return c.json({ error: 'prNumber is required and must be a number' }, 400);
		}

		const { analyzePRAndSuggestReviewers } = await import("../integrations/ml-pr-reviewer-assignment");
		const assignment = await analyzePRAndSuggestReviewers(prNumber, baseBranch);

		return c.json(assignment);
	} catch (error: any) {
		console.error('[TEAM.ML.REVIEWER.ASSIGNMENT.API.RG:ERROR]', error);
		return c.json(
			{ error: error.message || 'Failed to analyze PR and suggest reviewers' },
			500
		);
	}
});

api.post("/api/team/info", async (c) => {
	try {
		const body = await c.req.json();
		const query = body.query || "department:api";
		const { executeTeamInfoTool } = await import("../mcp/tools/team-info");
		const result = await executeTeamInfoTool({ query });
		return c.json(result);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return c.json(
			{
				error: "Failed to query team info",
				message: errorMessage,
			},
			500
		);
	}
});

api.route("/", v17Api);

export default api;
