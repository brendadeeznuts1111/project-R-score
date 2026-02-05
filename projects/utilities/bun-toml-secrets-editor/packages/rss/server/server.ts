// src/server.ts - Complete RSS Optimizer with v1.3.7 features
import { dns } from "bun";
import { Reporter } from "../cli/reporter.js";
import { IntegratedFooterSystem } from "../components/integrated-footer-system.js";
import { batchFetch } from "../rss/batch-fetcher.js";
import { predictiveDNS } from "../rss/predictive-dns.js";
import { RSSFetcher } from "../rss/rss-fetcher.js";
import { prefetchOnStartup } from "../rss/startup.js";
import { cliController } from "./cli-controller.js";

const fetcher = new RSSFetcher();
const reporter = new Reporter();

// Get Bun version safely
const bunVersion =
	(typeof Bun !== "undefined" && (Bun as any).version) || "1.3.7";

// 1. Prefetch DNS on startup
prefetchOnStartup();

// v1.3.7: Store server instance for safe export
const server = (Bun as any).serve({
	port: 3000,

	async fetch(req: Request) {
		const url = new URL(req.url);

		if (url.pathname === "/feed") {
			const feedUrl = url.searchParams.get("url");
			if (!feedUrl) return new Response("Missing URL", { status: 400 });

			try {
				const fetchResult = await fetcher.fetch(feedUrl);
				// Profiler returns { result, operationId, duration }, extract the actual data
				const result = fetchResult.result || fetchResult;

				// Generate markdown profile if requested (v1.3.7)
				if (url.searchParams.has("profile")) {
					const profileMd = await generateProfileMarkdown(
						result,
						fetchResult.operationId,
						fetchResult.duration,
					);
					return new Response(profileMd, {
						headers: { "Content-Type": "text/markdown" },
					});
				}

				return Response.json(fetchResult, {
					headers: {
						"X-Bun-Version": bunVersion,
						"X-Header-Casing": "preserved", // v1.3.7
					},
				});
			} catch (e: any) {
				return new Response(JSON.stringify({ error: e.message }), {
					status: 500,
					headers: { "Content-Type": "application/json" },
				});
			}
		}

		if (url.pathname === "/cli") {
			// Terminal-friendly output with wrapAnsi
			const feedUrl =
				url.searchParams.get("url") || "https://news.ycombinator.com/rss";
			const fetchResult = await fetcher.fetch(feedUrl);
			// Extract actual result from profiler wrapper
			const result = fetchResult.result || fetchResult;

			const output = reporter.formatFeed(result, 0);
			return new Response(output, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		if (url.pathname === "/batch") {
			// Batch fetch with DNS prefetch
			const urls = url.searchParams.getAll("url");
			if (urls.length === 0) {
				return new Response("Missing URLs. Use: /batch?url=...&url=...", {
					status: 400,
				});
			}

			try {
				const batchResult = await batchFetch(urls);
				return Response.json(batchResult);
			} catch (e: any) {
				return new Response(JSON.stringify({ error: e.message }), {
					status: 500,
				});
			}
		}

		if (url.pathname === "/stats") {
			// Return DNS and fetcher stats
			const dnsStats = dns.getCacheStats();
			const fetcherStats = fetcher.getStats();
			const predictiveStats = predictiveDNS.getStats();

			return Response.json({
				dns: dnsStats,
				fetcher: fetcherStats,
				predictive: predictiveStats,
				bun: {
					version: bunVersion,
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Footer integration endpoints
		if (url.pathname === "/footer") {
			const footerSystem = new IntegratedFooterSystem({
				serverPort: 3000,
				enableRSSIntegration: true,
				enableSystemStats: true,
				enableLiveMetrics: true,
			});

			const footerHTML = await footerSystem.createIntegratedFooter();
			return new Response(footerHTML, {
				headers: { "Content-Type": "text/html" },
			});
		}

		if (url.pathname === "/footer/stats") {
			const footerSystem = new IntegratedFooterSystem();
			const stats = await footerSystem.gatherSystemStats();
			return Response.json(stats);
		}

		if (url.pathname === "/footer/rss-status") {
			const footerSystem = new IntegratedFooterSystem();
			const rssStatus = await footerSystem.getRSSStatus();
			return Response.json(rssStatus);
		}

		// CLI Control endpoints
		if (url.pathname === "/cli/commands") {
			const commands = cliController.getAvailableCommands();
			return Response.json(commands);
		}

		if (url.pathname === "/cli/execute") {
			if (req.method !== "POST") {
				return new Response("Method not allowed", { status: 405 });
			}

			try {
				const body = await req.json();
				const { command, args = [], description, category } = body;

				if (!command) {
					return new Response("Command is required", { status: 400 });
				}

				const result = await cliController.executeCommand(
					command,
					args,
					description,
					category,
				);

				return Response.json(result);
			} catch (error: any) {
				return Response.json({ error: error.message }, { status: 400 });
			}
		}

		if (url.pathname === "/cli/status") {
			const commandId = url.searchParams.get("id");
			if (commandId) {
				const command = cliController.getCommandStatus(commandId);
				if (!command) {
					return new Response("Command not found", { status: 404 });
				}
				return Response.json(command);
			} else {
				const history = cliController.getCommandHistory();
				const running = cliController.getRunningCommands();
				return Response.json({ history, running });
			}
		}

		if (url.pathname === "/cli/history") {
			const limit = parseInt(url.searchParams.get("limit") || "20");
			const history = cliController.getCommandHistory(limit);
			return Response.json(history);
		}

		if (url.pathname === "/health") {
			return Response.json({
				status: "healthy",
				timestamp: new Date().toISOString(),
				version: bunVersion,
				uptime: process.uptime(),
				memory: process.memoryUsage(),
			});
		}

		return new Response(`RSS Optimizer v${bunVersion}
Endpoints:
  /feed?url=...&profile  - Fetch RSS with optional markdown profile
  /cli?url=...           - Terminal-friendly output
  /batch?url=...&url=... - Batch fetch with DNS prefetch
  /stats                 - DNS and performance statistics
  /footer                - Get integrated footer HTML
  /footer/stats          - Get system statistics for footer
  /footer/rss-status     - Get RSS feed status for footer
  /cli/commands          - Get available CLI commands
  /cli/execute           - Execute CLI command (POST)
  /cli/status            - Get command status or all commands
  /cli/history           - Get command history
  /health                - Health check
`);
	},
});

if (typeof globalThis !== "undefined") {
	(globalThis as any).server = server;
}

console.log(`🚀 RSS Optimizer v${bunVersion} running on http://localhost:3000`);
console.log(
	"Endpoints: /feed, /cli, /batch, /stats, /footer, /footer/stats, /footer/rss-status, /cli/*",
);

export default server;

// Helper for markdown profile generation
async function generateProfileMarkdown(
	result: any,
	operationId?: string,
	duration?: number,
): Promise<string> {
	const timestamp = new Date().toISOString();
	const metrics = result.meta || {};

	return `# RSS Feed Profile

Generated: ${timestamp}
Bun Version: ${bunVersion}
Operation ID: \`${operationId || "N/A"}\`
Duration: ${duration ? `${duration.toFixed(2)}ms` : "N/A"}

## Performance Metrics
- **Fetch Time**: ${metrics.fetchTime || "N/A"}
- **Parse Time**: ${metrics.parseTime || "N/A"}
- **Headers Preserved**: ${metrics.headersPreserved ? "✅ Yes" : "❌ No"}

## Feed Information
- **Title**: ${result.rss?.channel?.title || result.feed?.title || "Unknown"}
- **Items**: ${result.rss?.channel?.item?.length || result.feed?.entry?.length || 0}
- **Type**: ${result.rss ? "RSS" : result.feed ? "Atom" : "Unknown"}

## v1.3.7 Features Used
- ✅ Header casing preservation
- ✅ Bun.wrapAnsi() for CLI output
- ✅ Performance profiling with node:inspector
- ✅ FFI environment variable support
- ✅ Fast async/await execution

---
*Generated by RSS Optimizer with Bun ${bunVersion}*
`;
}
