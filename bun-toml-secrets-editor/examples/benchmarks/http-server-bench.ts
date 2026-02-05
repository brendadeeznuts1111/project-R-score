// examples/http-server-bench.ts
// HTTP server benchmark for testing response.bytes() vs response.text()

import {
	handleBufferedRequest,
	handleOptimizedRequest,
	handleStandardRequest,
} from "./50-col-matrix";

const PORT = 3001;
const HOST = "localhost";

// Create HTTP server
const server = Bun.serve({
	port: PORT,
	hostname: HOST,
	async fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === "/standard") {
			return handleStandardRequest();
		}

		if (url.pathname === "/optimized") {
			return handleOptimizedRequest();
		}

		if (url.pathname === "/buffered") {
			return handleBufferedRequest();
		}

		if (url.pathname === "/health") {
			return new Response(
				JSON.stringify({ status: "ok", timestamp: Date.now() }),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log(`
╔══════════════════════════════════════════════════════════╗
║   🌐 HTTP Server Benchmark Server                       ║
║   Testing response.bytes() vs response.text()           ║
╚══════════════════════════════════════════════════════════╝

Server running at: http://${HOST}:${PORT}

Endpoints:
  GET /standard   - Standard JSON response
  GET /optimized  - Optimized (hoisted) response
  GET /buffered   - Buffered (response.bytes()) response
  GET /health     - Health check

Benchmark with:
  bombardier -c 256 -n 10000 http://${HOST}:${PORT}/standard
  bombardier -c 256 -n 10000 http://${HOST}:${PORT}/optimized
  bombardier -c 256 -n 10000 http://${HOST}:${PORT}/buffered

Or use wrk:
  wrk -t12 -c400 -d30s http://${HOST}:${PORT}/standard
  wrk -t12 -c400 -d30s http://${HOST}:${PORT}/optimized
  wrk -t12 -c400 -d30s http://${HOST}:${PORT}/buffered
`);

// Keep server running
process.on("SIGINT", () => {
	console.log("\n👋 Shutting down server...");
	server.stop();
	process.exit(0);
});
