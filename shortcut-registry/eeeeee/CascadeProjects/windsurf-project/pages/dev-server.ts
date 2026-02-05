#!/usr/bin/env bun
/**
 * Development Server for Dashboard
 * Serves the dashboard with proper CORS headers and TypeScript support
 */

// Detect Bun runtime
if (!process.versions.bun) {
	console.error("❌ This dev server requires Bun runtime.");
	console.error("   Install Bun: https://bun.sh");
	console.error("   Then run: bun pages/dev-server.ts");
	process.exit(1);
}

import { serve } from "bun";
import { join, extname } from "path";

// Use Bun.env (Bun's preferred method) with fallback to process.env for compatibility
// Bun automatically loads .env, .env.local, .env.production, etc.
const PORT = parseInt(Bun.env.PORT || process.env.PORT || "8080");
const HOST = Bun.env.HOST || process.env.HOST || "localhost";

// MIME types
const mimeTypes: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".ts": "application/typescript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
};

// Get file path from URL
function getFilePath(url: string): string {
	const urlPath = new URL(url).pathname;
	const basePath = join(import.meta.dir, ".");
	
	// Default to dashboard.html for root
	if (urlPath === "/" || urlPath === "") {
		return join(basePath, "dashboard.html");
	}
	
	// Remove leading slash and resolve path
	const filePath = join(basePath, urlPath.replace(/^\//, ""));
	return filePath;
}

// Serve file with appropriate headers
async function serveFile(filePath: string): Promise<Response> {
	try {
		const file = Bun.file(filePath);
		if (!(await file.exists())) {
			return new Response("File not found", { status: 404 });
		}

		const ext = extname(filePath);
		const mimeType = mimeTypes[ext] || "application/octet-stream";

		return new Response(file, {
			headers: {
				"Content-Type": mimeType,
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	} catch (error) {
		console.error(`Error serving ${filePath}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
}

// Handle TypeScript files - compile on the fly
async function handleTypeScript(filePath: string): Promise<Response> {
	try {
		const file = Bun.file(filePath);
		if (!(await file.exists())) {
			return new Response("File not found", { status: 404 });
		}

		// Bun can handle TypeScript imports, but for browser we need to serve as JS
		// For now, serve the TS file and let Bun handle it
		return new Response(file, {
			headers: {
				"Content-Type": "application/javascript",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error(`Error serving TypeScript ${filePath}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
}

const server = serve({
	port: PORT,
	hostname: HOST,
	async fetch(req) {
		const url = new URL(req.url);

		// Handle CORS preflight
		if (req.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		// Handle TypeScript files
		if (url.pathname.endsWith(".ts")) {
			const filePath = getFilePath(req.url);
			return await handleTypeScript(filePath);
		}

		// Handle regular files
		const filePath = getFilePath(req.url);
		return await serveFile(filePath);
	},
});

console.log(`🚀 Dashboard Dev Server running on http://${HOST}:${PORT}`);
console.log(`📊 Open dashboard: http://${HOST}:${PORT}/dashboard.html?demo=ai-risk-analysis`);
console.log(`📊 Or root: http://${HOST}:${PORT}/?demo=ai-risk-analysis`);
console.log(`\n💡 Press Ctrl+C to stop the server`);
