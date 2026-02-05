#!/usr/bin/env bun

/**
 * @fileoverview Dashboard HTTP Server
 * @description Serves the dashboard HTML file with proper CORS headers
 * @module scripts/dashboard-server
 */

// Use Bun.serve() directly (Bun 1.0+)
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { UIContextRewriter, createUIContextFromRequest } from "../src/services/ui-context-rewriter";
import { UIPolicyManager } from "../src/services/ui-policy-manager";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

// Git commit info cache
let gitCommitInfo: { hash: string; shortHash: string; branch: string } | null = null;

// Get git commit information
async function getGitCommitInfo(): Promise<{ hash: string; shortHash: string; branch: string } | null> {
	if (gitCommitInfo) return gitCommitInfo;

	try {
		const [hashResult, branchResult] = await Promise.all([
			Bun.spawn(["git", "rev-parse", "HEAD"], { stdout: "pipe" }),
			Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], { stdout: "pipe" }),
		]);

		const hash = (await hashResult.stdout.text()).trim();
		const branch = (await branchResult.stdout.text()).trim();

		if (hash && branch) {
			gitCommitInfo = {
				hash,
				shortHash: hash.substring(0, 7),
				branch,
			};
			return gitCommitInfo;
		}
	} catch {
		// Git not available
	}

	return null;
}

// Generate ETag from file content
function generateETag(content: string | ArrayBuffer): string {
	const hasher = new Bun.CryptoHasher("md5");
	if (typeof content === "string") {
		hasher.update(content);
	} else {
		hasher.update(content);
	}
	const digest = hasher.digest("hex").substring(0, 16);
	return `W/"${digest}"`;
}

const PORT = parseInt(process.env.DASHBOARD_PORT || "8080", 10);
const API_BASE = process.env.API_URL || "http://localhost:3001";

// MIME types
const MIME_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".eot": "application/vnd.ms-fontobject",
};

// CORS headers
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Expose-Headers": "ETag, X-Git-Commit, X-Git-Branch, Set-Cookie, X-CSRF-Token",
	"Access-Control-Max-Age": "86400",
};

// Serve static files
async function serveStatic(path: string, request: Request): Promise<Response | null> {
	try {
		// Security: prevent directory traversal
		const safePath = join(PROJECT_ROOT, path.replace(/\.\./g, ""));

		const file = Bun.file(safePath);
		if (!(await file.exists())) {
			return null;
		}

		const ext = extname(path);
		const contentType = MIME_TYPES[ext] || "application/octet-stream";

		// Generate ETag from file content
		const content = await file.arrayBuffer();
		const etag = generateETag(content);

		// Check If-None-Match header
		const ifNoneMatch = request.headers.get("If-None-Match");
		if (ifNoneMatch === etag) {
			return new Response(null, {
				status: 304,
				headers: {
					ETag: etag,
					"Content-Type": contentType,
					...CORS_HEADERS,
				},
			});
		}

		// Get git commit info for headers
		const gitInfo = await getGitCommitInfo();
		const headers: Record<string, string> = {
			"Content-Type": contentType,
			ETag: etag,
			...CORS_HEADERS,
		};

		if (gitInfo) {
			headers["X-Git-Commit"] = gitInfo.shortHash;
			headers["X-Git-Branch"] = gitInfo.branch;
		}

		return new Response(file, { headers });
	} catch {
		return null;
	}
}

// Proxy API requests
async function proxyAPI(path: string, request: Request): Promise<Response | null> {
	try {
		const url = new URL(path, API_BASE);
		const apiRequest = new Request(url, {
			method: request.method,
			headers: request.headers,
			body: request.method !== "GET" && request.method !== "HEAD" ? await request.clone().arrayBuffer() : undefined,
		});

		const response = await fetch(apiRequest);
		const data = await response.arrayBuffer();

		// Get git commit info for headers
		const gitInfo = await getGitCommitInfo();
		const headers: Record<string, string> = {
			...Object.fromEntries(response.headers.entries()),
			...CORS_HEADERS,
		};

		if (gitInfo) {
			headers["X-Git-Commit"] = gitInfo.shortHash;
			headers["X-Git-Branch"] = gitInfo.branch;
		}

		return new Response(data, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	} catch (error) {
		const gitInfo = await getGitCommitInfo();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...CORS_HEADERS,
		};

		if (gitInfo) {
			headers["X-Git-Commit"] = gitInfo.shortHash;
			headers["X-Git-Branch"] = gitInfo.branch;
		}

		return new Response(
			JSON.stringify({ error: "API proxy failed", message: String(error) }),
			{
				status: 502,
				headers,
			},
		);
	}
}

// Main server
Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: CORS_HEADERS,
			});
		}

		// Serve documentation markdown files FIRST (before API proxy)
		if (path.startsWith("/docs/") && path.endsWith(".md")) {
			const docPath = path.replace("/docs/", "");
			// Security: prevent directory traversal
			const safePath = docPath.replace(/\.\./g, "");
			const docFile = join(PROJECT_ROOT, "docs", safePath);
			const file = Bun.file(docFile);
			
			if (await file.exists()) {
				const content = await file.text();
				const etag = generateETag(content);
				
				// Check If-None-Match header
				const ifNoneMatch = request.headers.get("If-None-Match");
				if (ifNoneMatch === etag) {
					return new Response(null, {
						status: 304,
						headers: {
							ETag: etag,
							"Content-Type": "text/markdown; charset=utf-8",
							...CORS_HEADERS,
						},
					});
				}
				
				return new Response(content, {
					headers: {
						"Content-Type": "text/markdown; charset=utf-8",
						ETag: etag,
						...CORS_HEADERS,
					},
				});
			}
			return new Response("Documentation not found", { status: 404 });
		}
		
		// API proxy routes - proxy to main API server
		// Note: /health and /metrics are handled by main app, not api routes
		if (
			path === "/health" ||
			path === "/metrics" ||
			path === "/api" ||
			path.startsWith("/api/") ||
			path.startsWith("/telegram/") ||
			path.startsWith("/streams") ||
			path.startsWith("/arbitrage/") ||
			path.startsWith("/cache/") ||
			path.startsWith("/stats") ||
			path.startsWith("/orca/") ||
			path.startsWith("/discovery") ||
			path === "/docs" ||
			path === "/docs/openapi.json" ||
			path.startsWith("/docs/errors")
		) {
			return proxyAPI(path, request) || new Response("Not Found", { status: 404 });
		}

		// Serve dashboard HTML files (index.html, examples.html, registry.html, mlgs-developer-dashboard.html, etc.)
		if (path === "/mlgs-developer-dashboard" || path === "/mlgs-developer-dashboard.html") {
			const file = Bun.file(join(PROJECT_ROOT, "dashboard", "mlgs-developer-dashboard.html"));
			if (await file.exists()) {
				return new Response(file, {
					headers: {
						"Content-Type": "text/html; charset=utf-8",
						...CORS_HEADERS,
					},
				});
			}
		}
		if (path === "/" || path === "/index.html") {
			const dashboardPath = join(PROJECT_ROOT, "dashboard", "index.html");
			const file = Bun.file(dashboardPath);
			if (await file.exists()) {
				let content = await file.text();
				// Inject API_BASE if needed (check if it's already set)
				// Replace existing API_BASE assignment or add if missing
				if (content.includes("const API_BASE") || content.includes("let API_BASE") || content.includes("var API_BASE")) {
					// Replace existing assignment
					content = content.replace(
						/(const|let|var)\s+API_BASE\s*=\s*[^;]+;/,
						`const API_BASE = "${API_BASE}";`,
					);
				} else {
					// Add API_BASE before the first script tag or at the beginning of script section
					const scriptMatch = content.match(/<script[^>]*>/);
					if (scriptMatch) {
						content = content.replace(
							/(<script[^>]*>)/,
							`$1\n        const API_BASE = "${API_BASE}";`,
						);
					}
				}

				// Generate ETag
				const etag = generateETag(content);

				// Check If-None-Match header
				const ifNoneMatch = request.headers.get("If-None-Match");
				if (ifNoneMatch === etag) {
					return new Response(null, {
						status: 304,
						headers: {
							ETag: etag,
							...CORS_HEADERS,
						},
					});
				}

				// Get git commit info for headers
				const gitInfo = await getGitCommitInfo();
				const headers: Record<string, string> = {
					"Content-Type": "text/html; charset=utf-8",
					ETag: etag,
					...CORS_HEADERS,
				};

				if (gitInfo) {
					headers["X-Git-Commit"] = gitInfo.shortHash;
					headers["X-Git-Branch"] = gitInfo.branch;
				}

				return new Response(content, { headers });
			}
		}

		// Serve other dashboard HTML files (examples.html, registry.html, etc.)
		// Check for .html files at root level (not under /dashboard/)
		if (path.endsWith(".html") && !path.startsWith("/dashboard/") && path !== "/" && path !== "/index.html") {
			const htmlFile = path.startsWith("/") ? path.substring(1) : path;
			const dashboardPath = join(PROJECT_ROOT, "dashboard", htmlFile);
			const file = Bun.file(dashboardPath);
			if (await file.exists()) {
				let content: string;
				
				// Use HTMLRewriter UI context service for registry.html (and optionally others)
				// 8.3.2.0.0.0.0: Route handler orchestration with UIPolicyManager
				if (htmlFile === "registry.html" || htmlFile === "index.html") {
					try {
						// 8.3.2.0.0.0.0: Use UIPolicyManager to build context and get policies
						const uiPolicyManager = UIPolicyManager.getInstance();
						
						// 8.2.2.3.0.0.0: Runtime feature flag overrides (e.g., from health checks)
						const runtimeFeatureFlags: Record<string, boolean> = {
							// Example: shadowGraph: performanceMonitor.isFeatureHealthy('shadowGraphViz')
							// For now, use defaults from manifest
						};

						// 8.2.2.3.0.0.0: Build UI context from manifest defaults and runtime data
						const uiContext = await uiPolicyManager.buildUIContext(request, runtimeFeatureFlags);
						
						// 8.2.2.4.0.0.0: Get HTMLRewriter policies
						const htmlRewriterPolicies = await uiPolicyManager.getHTMLRewriterPolicies();

						// 8.3.1.0.0.0.0: Create UIContextRewriter with policies
						const rewriter = new UIContextRewriter(uiContext, {}, htmlRewriterPolicies);
						
						if (rewriter.isAvailable()) {
							const htmlContent = await file.text();
							const transformed = rewriter.transform(htmlContent);
							content = transformed instanceof Response 
								? await transformed.text() 
								: transformed;
						} else {
							// Fallback to string replacement
							content = await file.text();
							const contextScript = `<script>window.HYPERBUN_UI_CONTEXT = ${JSON.stringify(uiContext)};</script>`;
							content = content.replace('</head>', `${contextScript}\n</head>`);
						}
					} catch (error) {
						// Fallback to simple API_BASE injection if HTMLRewriter fails
						console.error(`[dashboard-server] HTMLRewriter failed for ${htmlFile}:`, error);
						content = await file.text();
						if (content.includes("const API_BASE") || content.includes("let API_BASE") || content.includes("var API_BASE")) {
							content = content.replace(
								/(const|let|var)\s+API_BASE\s*=\s*[\s\S]*?;/,
								`const API_BASE = "${API_BASE}";`,
							);
						} else {
							const scriptMatch = content.match(/<script[^>]*>/);
							if (scriptMatch) {
								content = content.replace(
									/(<script[^>]*>)/,
									`$1\n        const API_BASE = "${API_BASE}";`,
								);
							}
						}
					}
				} else {
					// For other HTML files, use simple API_BASE injection
					content = await file.text();
					
					// Inject API_BASE for examples.html if needed
					if (htmlFile === "examples.html") {
						if (content.includes("const API_BASE") || content.includes("let API_BASE") || content.includes("var API_BASE")) {
							content = content.replace(
								/(const|let|var)\s+API_BASE\s*=\s*[\s\S]*?;/,
								`const API_BASE = "${API_BASE}";`,
							);
						} else {
							const scriptMatch = content.match(/<script[^>]*>/);
							if (scriptMatch) {
								content = content.replace(
									/(<script[^>]*>)/,
									`$1\n        const API_BASE = "${API_BASE}";`,
								);
							}
						}
					}
				}

				// Generate ETag
				const etag = generateETag(content);

				// Check If-None-Match header
				const ifNoneMatch = request.headers.get("If-None-Match");
				if (ifNoneMatch === etag) {
					return new Response(null, {
						status: 304,
						headers: {
							ETag: etag,
							"Content-Type": "text/html; charset=utf-8",
							...CORS_HEADERS,
						},
					});
				}

				// Get git commit info for headers
				const gitInfo = await getGitCommitInfo();
				const headers: Record<string, string> = {
					"Content-Type": "text/html; charset=utf-8",
					ETag: etag,
					...CORS_HEADERS,
				};

				if (gitInfo) {
					headers["X-Git-Commit"] = gitInfo.shortHash;
					headers["X-Git-Branch"] = gitInfo.branch;
				}

				return new Response(content, { headers });
			}
		}

		// Serve static JavaScript files from dashboard/js directory
		if (path.startsWith("/js/")) {
			const staticPath = path.replace("/js/", "");
			const filePath = join("dashboard", "js", staticPath);
			const response = await serveStatic(filePath, request);
			if (response) {
				return response;
			}
			// If serveStatic returns null, file doesn't exist - return 404
			return new Response("JavaScript file not found", {
				status: 404,
				headers: {
					"Content-Type": "text/plain",
					...CORS_HEADERS,
				},
			});
		}

		// Serve static files from dashboard directory
		if (path.startsWith("/dashboard/")) {
			const staticPath = path.replace("/dashboard/", "");
			const response = await serveStatic(join("dashboard", staticPath), request);
			if (response) return response;
		}

		// Serve static files from styles directory
		if (path.startsWith("/styles/")) {
			const staticPath = path.replace("/styles/", "");
			const response = await serveStatic(join("styles", staticPath), request);
			if (response) return response;
		}

		// Serve data files (telegram logs, etc.)
		if (path.startsWith("/data/")) {
			const staticPath = path.replace("/data/", "");
			const response = await serveStatic(join("data", staticPath), request);
			if (response) return response;
		}

		// Serve manifest.json
		if (path === "/manifest.json" || path === "/dashboard/manifest.json") {
			const manifestPath = join(PROJECT_ROOT, "dashboard", "manifest.json");
			const file = Bun.file(manifestPath);
			if (await file.exists()) {
				const content = await file.arrayBuffer();
				const etag = generateETag(content);

				// Check If-None-Match header
				const ifNoneMatch = request.headers.get("If-None-Match");
				if (ifNoneMatch === etag) {
					return new Response(null, {
						status: 304,
						headers: {
							ETag: etag,
							...CORS_HEADERS,
						},
					});
				}

				return new Response(file, {
					headers: {
						"Content-Type": "application/json; charset=utf-8",
						ETag: etag,
						...CORS_HEADERS,
					},
				});
			}
		}

		// 404
		return new Response("Not Found", {
			status: 404,
			headers: CORS_HEADERS,
		});
	},
	error(error) {
		// Use logger if available, otherwise console.error
		if (typeof Bun !== "undefined") {
			// Try to import logger
			import("../src/utils/logger").then(({ logger }) => {
				logger.error("Dashboard server error", error);
			}).catch(() => {
				console.error("Server error:", error);
			});
		} else {
			console.error("Server error:", error);
		}
		return new Response("Internal Server Error", {
			status: 500,
			headers: CORS_HEADERS,
		});
	},
});

// Log git commit info on startup
getGitCommitInfo().then(async (info) => {
	if (info) {
		try {
			const { logger } = await import("../src/utils/logger");
			logger.info(`📦 Git: ${info.branch} @ ${info.shortHash}`);
		} catch {
			console.log(`📦 Git: ${info.branch} @ ${info.shortHash}`);
		}
	}
}).catch(() => {});

// Startup messages
(async () => {
	try {
		const { logger } = await import("../src/utils/logger");
		logger.info(`🚀 Dashboard server running on http://localhost:${PORT}`);
		logger.info(`📊 Dashboard: http://localhost:${PORT}/`);
		logger.info(`🔗 API Proxy: ${API_BASE}`);
		logger.info(`\nPress Ctrl+C to stop`);
	} catch {
		console.log(`🚀 Dashboard server running on http://localhost:${PORT}`);
		console.log(`📊 Dashboard: http://localhost:${PORT}/`);
		console.log(`🔗 API Proxy: ${API_BASE}`);
		console.log(`\nPress Ctrl+C to stop`);
	}
})();
