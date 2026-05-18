#!/usr/bin/env bun
/**
 * Dashboard CLI - Manage and run the Fraud Detection Dashboard
 * Provides commands for starting dev server, running benchmarks, and validation
 */

// Detect Bun runtime
if (!process.versions.bun) {
	console.error("❌ This CLI requires Bun runtime.");
	console.error("   Install Bun: https://bun.sh");
	console.error("   Then run: bun cli/dashboard/dashboard-cli.ts");
	process.exit(1);
}

import { $ } from "bun";
import { serve } from "bun";
import { join } from "path";

const DASHBOARD_DIR = join(import.meta.dir, "../../pages");
const DEFAULT_PORT = 8080;
const DEFAULT_HOST = "localhost";

// CLI Commands
const commands = {
	serve: "Start development server for dashboard",
	bench: "Run performance benchmarks",
	validate: "Validate all optimizations",
	build: "Build TypeScript files for production",
	help: "Show this help message",
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || "help";

async function main() {
	switch (command) {
		case "serve":
		case "start":
		case "dev":
			await startDevServer();
			break;

		case "bench":
		case "benchmark":
			await runBenchmarks();
			break;

		case "validate":
		case "check":
			await validateOptimizations();
			break;

		case "build":
			await buildDashboard();
			break;

		case "help":
		case "--help":
		case "-h":
		default:
			showHelp();
			break;
	}
}

// Start development server
async function startDevServer() {
	// Use Bun.env (Bun's preferred method) with fallback to process.env for compatibility
	const port = parseInt(Bun.env.PORT || process.env.PORT || args[1] || String(DEFAULT_PORT));
	const host = Bun.env.HOST || process.env.HOST || args[2] || DEFAULT_HOST;

	console.info("🚀 Starting Dashboard Development Server...\n");

	// Check if dev-server.ts exists
	const devServerPath = join(DASHBOARD_DIR, "dev-server.ts");
	const devServerExists = await Bun.file(devServerPath).exists();

	if (devServerExists) {
		console.info(`📡 Starting server on http://${host}:${port}`);
		console.info(
			`📊 Dashboard: http://${host}:${port}/dashboard.html?demo=ai-risk-analysis\n`,
		);
		console.info("💡 Press Ctrl+C to stop\n");

		// Run the dev server
		await $`cd ${DASHBOARD_DIR} && bun dev-server.ts`.env({
			PORT: String(port),
			HOST: host,
		});
	} else {
		// Fallback: Use Bun's built-in server
		console.info(`📡 Starting Bun server on http://${host}:${port}`);
		console.info(
			`📊 Dashboard: http://${host}:${port}/dashboard.html?demo=ai-risk-analysis\n`,
		);

		serve({
			port,
			hostname: host,
			fetch(req) {
				const url = new URL(req.url);
				const filePath = join(DASHBOARD_DIR, url.pathname.replace(/^\//, ""));

				try {
					const file = Bun.file(filePath);
					return new Response(file, {
						headers: {
							"Content-Type": getContentType(filePath),
							"Access-Control-Allow-Origin": "*",
						},
					});
				} catch {
					return new Response("Not Found", { status: 404 });
				}
			},
		});

		console.info("💡 Press Ctrl+C to stop\n");
	}
}

// Run performance benchmarks
async function runBenchmarks() {
	console.info("📊 Running Performance Benchmarks...\n");

	// Check if running from project root or pages directory
	const benchPath = join(DASHBOARD_DIR, "..", "bench", "fraud-detection-bench.ts");
	const altBenchPath = join(DASHBOARD_DIR, "bench", "fraud-detection-bench.ts");
	
	let benchExists = await Bun.file(benchPath).exists();
	let actualBenchPath = benchPath;
	
	if (!benchExists) {
		benchExists = await Bun.file(altBenchPath).exists();
		actualBenchPath = altBenchPath;
	}

	if (benchExists) {
		// Run from project root to ensure proper imports
		const projectRoot = join(DASHBOARD_DIR, "..");
		await $`cd ${projectRoot} && bun bench/fraud-detection-bench.ts`;
	} else {
		console.error("❌ Benchmark file not found:");
		console.error(`   Tried: ${benchPath}`);
		console.error(`   Tried: ${altBenchPath}`);
		process.exit(1);
	}
}

// Validate optimizations
async function validateOptimizations() {
	console.info("✅ Validating Optimizations...\n");

	const checks = [
		{
			name: "HTML Preconnect",
			check: async () => {
				const html = await Bun.file(
					join(DASHBOARD_DIR, "dashboard.html"),
				).text();
				return html.includes('rel="preconnect"');
			},
		},
		{
			name: "Element Caching",
			check: async () => {
				const js = await Bun.file(
					join(DASHBOARD_DIR, "assets/js/main.js"),
				).text();
				return js.includes("PERFMASTER PABLO: ELEMENT CACHING");
			},
		},
		{
			name: "DNS Prefetch",
			check: async () => {
				const ts = await Bun.file(
					join(DASHBOARD_DIR, "../ai/prediction/anomaly-predict.ts"),
				).text();
				return ts.includes("dns.prefetch");
			},
		},
		{
			name: "Response Buffering",
			check: async () => {
				const ts = await Bun.file(
					join(DASHBOARD_DIR, "../ai/prediction/anomaly-predict.ts"),
				).text();
				return ts.includes("response.bytes()");
			},
		},
		{
			name: "Max Requests Config",
			check: async () => {
				const ts = await Bun.file(
					join(DASHBOARD_DIR, "../ai/network/network-optimizer.ts"),
				).text();
				return ts.includes("BUN_CONFIG_MAX_HTTP_REQUESTS");
			},
		},
	];

	let allPassed = true;

	for (const { name, check } of checks) {
		const passed = await check();
		const icon = passed ? "✅" : "❌";
		console.info(`${icon} ${name}: ${passed ? "Active" : "Missing"}`);
		if (!passed) allPassed = false;
	}

	console.info("\n" + "=".repeat(50));
	if (allPassed) {
		console.info("✅ All optimizations validated!");
	} else {
		console.info("❌ Some optimizations are missing");
		process.exit(1);
	}
}

// Build dashboard for production
async function buildDashboard() {
	const isProduction = Bun.env.NODE_ENV === "production" || process.env.NODE_ENV === "production";
	const env = isProduction ? "production" : "development";
	
	console.info(`🔨 Building Dashboard for ${env.toUpperCase()}...\n`);

	// Build TypeScript heatmap with --define for dead code elimination
	const heatmapSrc = join(DASHBOARD_DIR, "risk-heatmap.ts");
	const heatmapDest = join(DASHBOARD_DIR, "assets/js/risk-heatmap.js");

	console.info("📦 Compiling risk-heatmap.ts...");
	console.info(`   Using --define process.env.NODE_ENV="${env}"`);
	
	// Use --define to statically replace NODE_ENV for dead code elimination
	// Bun.$ needs command and args separated, not a single string
	const buildArgs = [
		"build",
		heatmapSrc,
		"--outdir",
		join(DASHBOARD_DIR, "assets/js"),
		"--target",
		"browser",
		"--define",
		`process.env.NODE_ENV="${env}"`,
	];
	
	if (isProduction) {
		buildArgs.push("--minify");
	}
	
	await $`bun ${buildArgs}`;

	console.info("✅ Build complete!");
	console.info(`   Output: ${heatmapDest}`);
	console.info(`   Environment: ${env}`);
	if (isProduction) {
		console.info("   ⚡ Dead code elimination enabled (production-only code removed)");
	}
}

// Show help message
function showHelp() {
	console.info("🎯 Dashboard CLI - Fraud Detection Dashboard Manager\n");
	console.info("Usage: bun cli/dashboard/dashboard-cli.ts <command> [options]\n");
	console.info("Commands:\n");

	for (const [cmd, desc] of Object.entries(commands)) {
		console.info(`  ${cmd.padEnd(12)} ${desc}`);
	}

	console.info("\nExamples:");
	console.info("  bun cli/dashboard/dashboard-cli.ts serve          # Start dev server");
	console.info("  bun cli/dashboard/dashboard-cli.ts serve 3000    # Start on port 3000");
	console.info("  bun cli/dashboard/dashboard-cli.ts bench          # Run benchmarks");
	console.info("  bun cli/dashboard/dashboard-cli.ts validate      # Validate optimizations");
	console.info("  bun cli/dashboard/dashboard-cli.ts build         # Build for production");
}

// Get content type from file path
function getContentType(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase();
	const types: Record<string, string> = {
		html: "text/html",
		js: "application/javascript",
		ts: "application/typescript",
		css: "text/css",
		json: "application/json",
		png: "image/png",
		jpg: "image/jpeg",
		svg: "image/svg+xml",
	};
	return types[ext || ""] || "application/octet-stream";
}

// Run CLI
main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
