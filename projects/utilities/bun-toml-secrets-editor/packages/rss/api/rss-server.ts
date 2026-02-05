#!/usr/bin/env bun

// src/api/rss-server.ts - HTTP Server for RSS Storage API

const server = Bun.serve({
	port: process.env.RSS_API_PORT || 3001,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;
		const method = req.method;

		// CORS headers
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		};

		// Handle CORS preflight
		if (method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Root endpoint
			if (path === "/" && method === "GET") {
				return Response.json(
					{
						status: "ok",
						message: "RSS Storage API is running",
						version: "1.0.0",
						endpoints: {
							health: "/health",
							docs: "/api",
							feeds: "/api/feeds",
							validate: "/api/validate?url=<feed-url>",
							discover: "/api/discover?url=<website-url>",
						},
						documentation: "Visit /api for full API documentation",
					},
					{ headers: corsHeaders },
				);
			}

			// Health check endpoint
			if (path === "/health" && method === "GET") {
				return Response.json(
					{
						status: "healthy",
						timestamp: new Date().toISOString(),
						version: "1.0.0",
					},
					{ headers: corsHeaders },
				);
			}

			// API Documentation endpoint
			if (path === "/api" && method === "GET") {
				return Response.json(
					{
						title: "RSS Storage API",
						version: "1.0.0",
						endpoints: {
							health: {
								method: "GET",
								path: "/health",
								description: "Health check",
							},
							feeds: {
								method: "GET",
								path: "/api/feeds?url=<feed-url>",
								description: "Retrieve feeds",
							},
							validate: {
								method: "GET",
								path: "/api/validate?url=<feed-url>",
								description: "Validate feed URL",
							},
							discover: {
								method: "GET",
								path: "/api/discover?url=<website-url>",
								description: "Discover feeds",
							},
						},
					},
					{ headers: corsHeaders },
				);
			}

			// 404 for unknown endpoints
			return Response.json(
				{ error: "Endpoint not found" },
				{ status: 404, headers: corsHeaders },
			);
		} catch (error) {
			console.error("API Error:", error);
			return Response.json(
				{
					error: "Internal server error",
					details: error instanceof Error ? error.message : String(error),
				},
				{ status: 500, headers: corsHeaders },
			);
		}
	},
});

console.log(
	`🚀 RSS Storage API Server running on http://localhost:${server.port}`,
);
console.log(`📖 API Documentation: http://localhost:${server.port}/api`);
console.log(`💚 Health Check: http://localhost:${server.port}/health`);

export default server;
