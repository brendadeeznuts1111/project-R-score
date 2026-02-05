#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v8.3 - BUNX DEMO ⚡
 * 
 * Run packages from npm - 100x faster than npx!
 * 
 * Features:
 * - Auto-install and run npm packages
 * - --bun flag to force Bun runtime
 * - --package flag for different binary names
 * - Global cache for reuse
 * 
 * Usage:
 *   bun run examples/bunx-demo.ts
 *   bun run examples/bunx-demo.ts --server
 */

import { $ } from "bun";

// =============================================================================
// Types
// =============================================================================
interface BunxCommand {
	cmd: string;
	description: string;
	category: string;
}

interface PackageInfo {
	name: string;
	binary: string;
	installed: boolean;
	version?: string;
}

// =============================================================================
// 1. Bunx Overview
// =============================================================================
function demoBunxOverview() {
	console.log("=".repeat(70));
	console.log("1. ⚡ BUNX OVERVIEW - 100x FASTER THAN NPX");
	console.log("=".repeat(70));

	console.log(`
📋 What is bunx?
   Run packages from npm - Bun's equivalent of npx or yarn dlx.
   Auto-installs and runs package executables instantly!

⚡ Speed:
   bunx is roughly 100x faster than npx for locally installed packages.

🔧 How it works:
   1. Checks for locally installed package first
   2. Falls back to auto-installing from npm
   3. Stores in Bun's global cache for reuse

📦 Alias:
   bunx = bun x (both work the same)
`);
}

// =============================================================================
// 2. Basic Commands
// =============================================================================
function demoBunxCommands() {
	console.log("\n" + "=".repeat(70));
	console.log("2. 📋 BUNX COMMANDS");
	console.log("=".repeat(70));

	const commands: BunxCommand[] = [
		{ cmd: "bunx cowsay 'Hello!'", description: "Run cowsay", category: "Fun" },
		{ cmd: "bunx prisma migrate", description: "Run Prisma migrations", category: "Database" },
		{ cmd: "bunx prettier foo.js", description: "Format with Prettier", category: "Formatting" },
		{ cmd: "bunx eslint .", description: "Lint with ESLint", category: "Linting" },
		{ cmd: "bunx tsc --init", description: "Init TypeScript config", category: "TypeScript" },
		{ cmd: "bunx vite dev", description: "Start Vite dev server", category: "Build" },
		{ cmd: "bunx esbuild app.ts --bundle", description: "Bundle with esbuild", category: "Build" },
		{ cmd: "bunx uglify-js@3.14.0 app.js", description: "Run specific version", category: "Versioning" },
	];

	console.log(`\n📋 Common Commands:\n`);
	console.log(Bun.inspect.table(commands));
}

// =============================================================================
// 3. Flags Reference
// =============================================================================
function demoBunxFlags() {
	console.log("\n" + "=".repeat(70));
	console.log("3. 🚩 BUNX FLAGS");
	console.log("=".repeat(70));

	const flags = [
		{ flag: "--bun", type: "boolean", desc: "Force Bun runtime (ignore Node shebang)" },
		{ flag: "-p, --package", type: "string", desc: "Specify package when binary differs" },
		{ flag: "--no-install", type: "boolean", desc: "Skip install if not found" },
		{ flag: "--verbose", type: "boolean", desc: "Verbose installation output" },
		{ flag: "--silent", type: "boolean", desc: "Suppress installation output" },
	];

	console.log(`\n📋 Available Flags:\n`);
	console.log(Bun.inspect.table(flags));

	console.log(`
⚠️ Flag Order Matters:
   bunx --bun my-cli      ✅ Correct (--bun before package)
   bunx my-cli --bun      ❌ Wrong (--bun passed to package)
`);
}

// =============================================================================
// 4. Arbitrage Tool Commands
// =============================================================================
function demoArbCommands() {
	console.log("\n" + "=".repeat(70));
	console.log("4. 🏀 ARBITRAGE TOOL COMMANDS");
	console.log("=".repeat(70));

	const arbCommands: BunxCommand[] = [
		{ cmd: "bunx --bun ccxt-cli fetch binance BTC/USDT", description: "Fetch crypto prices", category: "Crypto" },
		{ cmd: "bunx puppeteer-cli screenshot https://odds.com", description: "Screenshot odds page", category: "Scraping" },
		{ cmd: "bunx playwright test", description: "Run E2E scraper tests", category: "Testing" },
		{ cmd: "bunx autocannon http://localhost:3000", description: "Load test arb server", category: "Performance" },
		{ cmd: "bunx clinic doctor -- bun arb-server.ts", description: "Profile performance", category: "Profiling" },
		{ cmd: "bunx json-server odds-db.json", description: "Mock odds API server", category: "Mocking" },
		{ cmd: "bunx http-server ./cache", description: "Serve cached odds files", category: "Serving" },
		{ cmd: "bunx concurrently 'bun scrape' 'bun analyze'", description: "Run parallel tasks", category: "Parallel" },
	];

	console.log(`\n📋 Arbitrage Tooling:\n`);
	console.log(Bun.inspect.table(arbCommands));
}

// =============================================================================
// 5. --package Flag Examples
// =============================================================================
function demoPackageFlag() {
	console.log("\n" + "=".repeat(70));
	console.log("5. 📦 --PACKAGE FLAG (Binary ≠ Package Name)");
	console.log("=".repeat(70));

	console.log(`
🔧 When binary name differs from package name:

   # Angular CLI (package: @angular/cli, binary: ng)
   bunx -p @angular/cli ng new my-app
   bunx --package @angular/cli ng serve

   # Renovate (package: renovate, binary: renovate-config-validator)
   bunx -p renovate renovate-config-validator

   # Create React App
   bunx -p create-react-app create-react-app my-app

   # Next.js
   bunx -p next next dev

   # Nest.js CLI
   bunx -p @nestjs/cli nest new my-api
`);

	// Package examples table
	const packageExamples = [
		{ package: "@angular/cli", binary: "ng", example: "bunx -p @angular/cli ng new app" },
		{ package: "@nestjs/cli", binary: "nest", example: "bunx -p @nestjs/cli nest new api" },
		{ package: "create-react-app", binary: "create-react-app", example: "bunx create-react-app app" },
		{ package: "renovate", binary: "renovate-config-validator", example: "bunx -p renovate renovate-config-validator" },
		{ package: "typescript", binary: "tsc", example: "bunx tsc --init" },
	];

	console.log(`\n📋 Package → Binary Mapping:\n`);
	console.log(Bun.inspect.table(packageExamples));
}

// =============================================================================
// 6. --bun Flag (Force Bun Runtime)
// =============================================================================
function demoBunFlag() {
	console.log("\n" + "=".repeat(70));
	console.log("6. 🏃 --BUN FLAG (Force Bun Runtime)");
	console.log("=".repeat(70));

	console.log(`
🔧 Force Bun instead of Node.js:

   # Many packages have #!/usr/bin/env node shebang
   # Use --bun to run with Bun's faster runtime

   bunx --bun vite dev           # Vite with Bun
   bunx --bun esbuild app.ts     # esbuild with Bun
   bunx --bun tsx script.ts      # tsx with Bun
   bunx --bun vitest run         # Vitest with Bun
   bunx --bun jest               # Jest with Bun

📊 Performance Comparison:

   Tool        Node.js     Bun         Speedup
   ─────────────────────────────────────────────
   vite dev    1.2s        0.3s        4x faster
   esbuild     0.8s        0.2s        4x faster
   vitest      2.1s        0.5s        4x faster

💡 When to use --bun:
   • Faster startup for dev servers
   • Better performance for build tools
   • Native TypeScript support
   • Access to Bun APIs
`);
}

// =============================================================================
// 7. Shebang Examples
// =============================================================================
function demoShebangs() {
	console.log("\n" + "=".repeat(70));
	console.log("7. 📜 SHEBANGS");
	console.log("=".repeat(70));

	console.log(`
📜 Shebang determines which runtime executes the file:

   #!/usr/bin/env node    → Runs with Node.js
   #!/usr/bin/env bun     → Runs with Bun

📄 Example: arb-scanner.ts

   #!/usr/bin/env bun
   /**
    * Arbitrage Scanner CLI
    * Always runs with Bun for speed!
    */
   
   const args = Bun.argv.slice(2);
   const sport = args[0] || 'nba';
   
   console.log(\`Scanning \${sport} markets...\`);
   // ... scanner logic

📦 package.json bin field:

   {
     "name": "arb-scanner",
     "bin": {
       "arb-scan": "dist/scanner.js",
       "arb-analyze": "dist/analyzer.js"
     }
   }

🚀 Run your CLI:

   bunx arb-scanner nba       # From npm
   bunx ./dist/scanner.js     # Local file
`);
}

// =============================================================================
// 8. Arbitrage Scripts
// =============================================================================
function demoArbScripts() {
	console.log("\n" + "=".repeat(70));
	console.log("8. 🏀 ARBITRAGE BUNX SCRIPTS");
	console.log("=".repeat(70));

	console.log(`
📜 package.json scripts using bunx:

{
  "scripts": {
    // Development
    "dev": "bunx --bun vite dev",
    "dev:server": "bunx --bun nodemon arb-server.ts",
    
    // Scraping
    "scrape:odds": "bunx puppeteer-cli scrape-odds.js",
    "scrape:parallel": "bunx concurrently 'bun scrape:pinnacle' 'bun scrape:betfair'",
    
    // Testing
    "test": "bunx --bun vitest run",
    "test:e2e": "bunx --bun playwright test",
    "test:load": "bunx autocannon -c 100 -d 30 http://localhost:3000",
    
    // Build
    "build": "bunx --bun esbuild src/index.ts --bundle --outdir=dist",
    "build:standalone": "bun build --compile src/arb-engine.ts --outfile arb-engine",
    
    // Database
    "db:migrate": "bunx prisma migrate dev",
    "db:generate": "bunx prisma generate",
    "db:studio": "bunx prisma studio",
    
    // Utilities
    "format": "bunx prettier --write .",
    "lint": "bunx eslint . --fix",
    "typecheck": "bunx tsc --noEmit"
  }
}

💡 Pro Tips:
   • Use --bun for all build/dev tools
   • bunx caches packages globally
   • Specify versions for reproducibility: bunx package@1.2.3
`);
}

// =============================================================================
// 9. Live Server with bunx stats - TYPED
// =============================================================================

// ── Enums ───────────────────────────────────────────────────────────────────

/** Execution status of a bunx call */
const enum BunxStatus {
	Pending = "pending",
	Executing = "executing",
	Success = "success",
	Failed = "failed",
	Timeout = "timeout",
	Cached = "cached",
}

/** Patch application status */
const enum PatchStatus {
	Applied = "applied",
	Pending = "pending",
	Failed = "failed",
	Reverted = "reverted",
}

/** Package registry source */
const enum Registry {
	Npm = "npm",
	Jsr = "jsr",
	GitHub = "github",
	Local = "local",
}

// ── Core Types ──────────────────────────────────────────────────────────────

/** Bunx execution flags */
interface BunxFlags {
	/** Force Bun runtime instead of Node */
	bun: boolean;
	/** Skip auto-install if not cached */
	noInstall: boolean;
	/** Verbose output */
	verbose: boolean;
	/** Silent mode */
	silent: boolean;
	/** Custom raw flags */
	raw: string[];
}

/** Single bunx execution call */
interface BunxCall {
	/** Unique call ID (UUIDv7) */
	id: string;
	/** Package name */
	pkg: string;
	/** Semver version (optional) */
	version?: string;
	/** Execution flags */
	flags: BunxFlags;
	/** Was package cached? */
	cached: boolean;
	/** Execution status */
	status: BunxStatus;
	/** Startup time in ms */
	startupMs: number;
	/** Total execution time in ms */
	executionMs: number;
	/** Exit code (0 = success) */
	exitCode: number;
	/** Timestamp (epoch ms) */
	timestamp: number;
	/** Registry source */
	registry: Registry;
	/** Memory usage in bytes */
	memoryBytes?: number;
}

/** Patch file change entry */
interface PatchChange {
	/** File path within package */
	file: string;
	/** Line number */
	line: number;
	/** Original value */
	from: string;
	/** New value */
	to: string;
	/** Change type */
	type: "modify" | "add" | "delete";
}

/** Package patch information */
interface PatchInfo {
	/** Package version */
	version: string;
	/** Patch application timestamp */
	patchedAt: string;
	/** Patch file size in bytes */
	size: number;
	/** Human-readable change descriptions */
	changes: string[];
	/** Detailed change entries */
	changeLog: PatchChange[];
	/** Applied config overrides */
	config: Record<string, unknown>;
	/** Patch status */
	status: PatchStatus;
	/** Patch file path */
	patchFile: string;
	/** Git hash of patch */
	hash: string;
	/** Author who created patch */
	author?: string;
	/** Reason for patch */
	reason?: string;
}

/** Bunx execution statistics */
interface BunxStats {
	/** Total calls made */
	totalCalls: number;
	/** Successful cache hits */
	cacheHits: number;
	/** Cache misses (required install) */
	cacheMisses: number;
	/** Unique packages installed this session */
	packagesInstalled: string[];
	/** Pre-cached packages */
	cachedPackages: string[];
	/** Recent call history */
	recentCalls: BunxCall[];
	/** Average startup time in ms */
	avgStartupMs: number;
	/** Total execution time in ms */
	totalTimeMs: number;
	/** Failed executions */
	failures: number;
	/** Timeout kills */
	timeouts: number;
	/** Peak memory usage */
	peakMemoryBytes: number;
}

/** Patch management statistics */
interface PatchStats {
	/** All patches by package name */
	patches: Record<string, PatchInfo>;
	/** Total patch count */
	totalPatches: number;
	/** Total size of all patches */
	totalSize: number;
	/** Last patch application timestamp */
	lastApplied: string;
	/** Patches directory path */
	patchesDir: string;
	/** Git-tracked patches */
	gitTracked: boolean;
	/** Auto-apply on install */
	autoApply: boolean;
}

/** Bun runtime information */
interface BunInfo {
	/** Bun version (e.g., "1.3.4") */
	version: string;
	/** Git revision hash */
	revision: string;
	/** Main entry point */
	main: string;
	/** NODE_ENV value */
	env: string;
	/** Memory limit in bytes */
	memoryLimit?: number;
	/** Available CPUs */
	cpus: number;
}

/** Server runtime state */
interface ServerState {
	/** Bunx execution stats */
	bunx: BunxStats;
	/** Patch management stats */
	patches: PatchStats;
	/** Server start timestamp */
	startedAt: number;
	/** Request count */
	requestCount: number;
	/** Bun runtime info */
	bun: BunInfo;
}

/** API response wrapper */
interface ApiResponse<T> {
	/** Response data */
	data: T;
	/** Response timestamp */
	timestamp: string;
	/** Request duration in ms */
	durationMs: number;
}

// ── Utility Types ───────────────────────────────────────────────────────────

/** Package identifier with optional version */
type PackageSpec = `${string}@${string}` | string;

/** Semver range */
type SemverRange = `^${string}` | `~${string}` | `>=${string}` | string;

/** Patch config for specific packages */
type PatchConfig = {
	[K in "axios" | "ccxt" | "ws" | string]: Partial<PatchInfo>;
};

/** Cache key for bunx lookups */
type CacheKey = `bunx:${string}:${string}`;

/** Generate cache key */
function cacheKey(pkg: string, version = "latest"): CacheKey {
	return `bunx:${pkg}:${version}`;
}

/** Generate UUIDv7 for call tracking */
function generateCallId(): string {
	return Bun.randomUUIDv7();
}

// ── Server Factory ──────────────────────────────────────────────────────────

function createBunxServer(port: number) {
	const state: ServerState = {
		bun: {
			version: Bun.version,
			revision: Bun.revision.slice(0, 12),
			main: Bun.main,
			env: Bun.env.NODE_ENV || "development",
			cpus: navigator?.hardwareConcurrency || 8,
		},
		bunx: {
			totalCalls: 0,
			cacheHits: 0,
			cacheMisses: 0,
			packagesInstalled: [],
			cachedPackages: ["prettier", "eslint", "vite", "esbuild", "vitest", "prisma", "tsx", "autocannon"],
			recentCalls: [],
			avgStartupMs: 0,
			totalTimeMs: 0,
			failures: 0,
			timeouts: 0,
			peakMemoryBytes: 0,
		},
		patches: {
			patches: {
				axios: {
					version: "1.6.0",
					patchedAt: new Date(Date.now() - 86400000).toISOString(),
					size: 1247,
					changes: ["timeout: 30000 → 5000", "retries: 0 → 3"],
					changeLog: [
						{ file: "lib/defaults.js", line: 42, from: "timeout: 30000", to: "timeout: 5000", type: "modify" },
						{ file: "lib/defaults.js", line: 43, from: "retries: 0", to: "retries: 3", type: "modify" },
					],
					config: { timeout: 5000, retries: 3 },
					status: PatchStatus.Applied,
					patchFile: "patches/axios+1.6.0.patch",
					hash: "a1b2c3d4",
					reason: "Custom arb timeout (30s → 5s)",
				},
				ccxt: {
					version: "4.0.0",
					patchedAt: new Date(Date.now() - 172800000).toISOString(),
					size: 892,
					changes: ["rateLimit: 1000 → 100", "enableRateLimit: true"],
					changeLog: [
						{ file: "js/base/Exchange.js", line: 128, from: "rateLimit: 1000", to: "rateLimit: 100", type: "modify" },
						{ file: "js/base/Exchange.js", line: 129, from: "enableRateLimit: false", to: "enableRateLimit: true", type: "modify" },
					],
					config: { rateLimit: 100, enableRateLimit: true, retries: 3 },
					status: PatchStatus.Applied,
					patchFile: "patches/ccxt+4.0.0.patch",
					hash: "e5f6g7h8",
					reason: "Rate limit handling for arbitrage",
				},
				ws: {
					version: "8.14.0",
					patchedAt: new Date(Date.now() - 259200000).toISOString(),
					size: 456,
					changes: ["binaryType: 'blob' → 'arraybuffer'", "maxPayload: 1MB → 10MB"],
					changeLog: [
						{ file: "lib/websocket.js", line: 87, from: "binaryType: 'blob'", to: "binaryType: 'arraybuffer'", type: "modify" },
						{ file: "lib/websocket.js", line: 92, from: "maxPayload: 1048576", to: "maxPayload: 10485760", type: "modify" },
					],
					config: { binary: true, maxPayload: 10485760 },
					status: PatchStatus.Applied,
					patchFile: "patches/ws+8.14.0.patch",
					hash: "i9j0k1l2",
					reason: "Optimized binary messages for odds streaming",
				},
			},
			totalPatches: 3,
			totalSize: 2595,
			lastApplied: new Date().toISOString(),
			patchesDir: "patches/",
			gitTracked: true,
			autoApply: true,
		},
		startedAt: Date.now(),
		requestCount: 0,
	};

	return Bun.serve({
		port,
		fetch(req) {
			const requestStart = Bun.nanoseconds();
			state.requestCount++;
			const url = new URL(req.url);

			// ── GET /bunx-stats ─────────────────────────────────────────────
			if (url.pathname === "/bunx-stats") {
				const uptime = Date.now() - state.startedAt;
				const durationMs = (Bun.nanoseconds() - requestStart) / 1e6;
				
				return Response.json({
					bun: state.bun,
					bunx: {
						totalCalls: state.bunx.totalCalls,
						cacheHits: state.bunx.cacheHits,
						cacheMisses: state.bunx.cacheMisses,
						failures: state.bunx.failures,
						timeouts: state.bunx.timeouts,
						cacheHitRate: state.bunx.totalCalls > 0
							? `${((state.bunx.cacheHits / state.bunx.totalCalls) * 100).toFixed(1)}%`
							: "N/A",
						packagesInstalled: state.bunx.packagesInstalled,
						cachedPackages: state.bunx.cachedPackages,
						recentCalls: state.bunx.recentCalls.slice(-5),
					},
					performance: {
						avgStartupMs: state.bunx.totalCalls > 0
							? Math.round(state.bunx.totalTimeMs / state.bunx.totalCalls)
							: 0,
						totalTimeMs: Math.round(state.bunx.totalTimeMs),
						peakMemoryBytes: state.bunx.peakMemoryBytes,
						npxComparison: "100x faster",
					},
					server: {
						uptime: `${(uptime / 1000).toFixed(1)}s`,
						uptimeMs: uptime,
						port,
						requestCount: state.requestCount,
						durationMs: Math.round(durationMs * 100) / 100,
					},
				});
			}

			// ── GET /bunx?pkg=<name>&version=<ver>&flags=<f1,f2> ────────────
			if (url.pathname === "/bunx") {
				const pkg = url.searchParams.get("pkg") || "cowsay";
				const version = url.searchParams.get("version") || undefined;
				const rawFlags = url.searchParams.get("flags")?.split(",") || [];
				const cached = state.bunx.cachedPackages.includes(pkg);
				const startupMs = cached ? 5 + Math.random() * 10 : 120 + Math.random() * 50;
				const executionMs = startupMs + Math.random() * 20;
				const memoryBytes = Math.round(50_000_000 + Math.random() * 100_000_000);

				// Parse flags
				const flags: BunxFlags = {
					bun: rawFlags.includes("--bun"),
					noInstall: rawFlags.includes("--no-install"),
					verbose: rawFlags.includes("--verbose"),
					silent: rawFlags.includes("--silent"),
					raw: rawFlags.filter(f => !["--bun", "--no-install", "--verbose", "--silent"].includes(f)),
				};

				// Update stats
				state.bunx.totalCalls++;
				if (cached) state.bunx.cacheHits++;
				else state.bunx.cacheMisses++;
				state.bunx.totalTimeMs += startupMs;
				state.bunx.peakMemoryBytes = Math.max(state.bunx.peakMemoryBytes, memoryBytes);

				if (!state.bunx.packagesInstalled.includes(pkg)) {
					state.bunx.packagesInstalled.push(pkg);
				}

				const call: BunxCall = {
					id: generateCallId(),
					pkg,
					version,
					flags,
					cached,
					status: cached ? BunxStatus.Cached : BunxStatus.Success,
					startupMs: Math.round(startupMs),
					executionMs: Math.round(executionMs),
					exitCode: 0,
					timestamp: Date.now(),
					registry: Registry.Npm,
					memoryBytes,
				};
				state.bunx.recentCalls.push(call);
				if (state.bunx.recentCalls.length > 20) {
					state.bunx.recentCalls.shift();
				}

				const durationMs = (Bun.nanoseconds() - requestStart) / 1e6;
				return Response.json({
					id: call.id,
					command: version ? `bunx ${pkg}@${version}` : `bunx ${pkg}`,
					flags: Object.entries(flags)
						.filter(([k, v]) => v === true || (Array.isArray(v) && v.length > 0))
						.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
					status: call.status,
					cached,
					registry: call.registry,
					timing: {
						startupMs: call.startupMs,
						executionMs: call.executionMs,
						totalMs: call.startupMs + call.executionMs,
					},
					exitCode: call.exitCode,
					memoryBytes: call.memoryBytes,
					timestamp: new Date(call.timestamp).toISOString(),
					_meta: {
						cacheKey: cacheKey(pkg, version),
						requestDurationMs: Math.round(durationMs * 100) / 100,
					},
				});
			}

			// ── GET /patch-stats ────────────────────────────────────────────
			if (url.pathname === "/patch-stats") {
				const durationMs = (Bun.nanoseconds() - requestStart) / 1e6;
				return Response.json({
					...state.patches,
					_meta: { requestDurationMs: Math.round(durationMs * 100) / 100 },
				});
			}

			// ── GET /patch/:pkg ─────────────────────────────────────────────
			if (url.pathname.startsWith("/patch/")) {
				const pkg = url.pathname.split("/")[2];
				const patch = state.patches.patches[pkg];
				if (!patch) {
					return Response.json({ error: `No patch for ${pkg}`, available: Object.keys(state.patches.patches) }, { status: 404 });
				}
				return Response.json({ pkg, ...patch });
			}

			// ── GET /types ──────────────────────────────────────────────────
			if (url.pathname === "/types") {
				return Response.json({
					enums: {
						BunxStatus: ["pending", "executing", "success", "failed", "timeout", "cached"],
						PatchStatus: ["applied", "pending", "failed", "reverted"],
						Registry: ["npm", "jsr", "github", "local"],
					},
					types: {
						BunxFlags: {
							bun: "boolean - Force Bun runtime",
							noInstall: "boolean - Skip auto-install",
							verbose: "boolean - Verbose output",
							silent: "boolean - Silent mode",
							raw: "string[] - Custom flags",
						},
						BunxCall: {
							id: "string - UUIDv7",
							pkg: "string - Package name",
							version: "string? - Semver version",
							flags: "BunxFlags",
							cached: "boolean",
							status: "BunxStatus",
							startupMs: "number",
							executionMs: "number",
							exitCode: "number",
							timestamp: "number - epoch ms",
							registry: "Registry",
							memoryBytes: "number?",
						},
						PatchChange: {
							file: "string - File path",
							line: "number",
							from: "string - Original",
							to: "string - New value",
							type: "'modify' | 'add' | 'delete'",
						},
						PatchInfo: {
							version: "string",
							patchedAt: "string - ISO timestamp",
							size: "number - bytes",
							changes: "string[] - Human readable",
							changeLog: "PatchChange[]",
							config: "Record<string, unknown>",
							status: "PatchStatus",
							patchFile: "string - Path",
							hash: "string - Git hash",
							author: "string?",
							reason: "string?",
						},
					},
					utilityTypes: {
						PackageSpec: "`${string}@${string}` | string",
						SemverRange: "`^${string}` | `~${string}` | `>=${string}` | string",
						CacheKey: "`bunx:${string}:${string}`",
					},
				});
			}

			// ── GET / ───────────────────────────────────────────────────────
			const durationMs = (Bun.nanoseconds() - requestStart) / 1e6;
			return Response.json({
				name: "bunx-demo-server",
				version: Bun.version,
				endpoints: {
					"/": "GET → This index",
					"/bunx-stats": "GET → Bunx usage statistics",
					"/bunx?pkg=<name>": "GET → Simulate bunx call",
					"/bunx?pkg=<name>&version=<ver>": "GET → With version",
					"/bunx?pkg=<name>&flags=--bun,--verbose": "GET → With flags",
					"/patch-stats": "GET → All patch info",
					"/patch/:pkg": "GET → Single patch info",
					"/types": "GET → Type definitions",
				},
				_meta: {
					requestCount: state.requestCount,
					uptime: `${((Date.now() - state.startedAt) / 1000).toFixed(1)}s`,
					durationMs: Math.round(durationMs * 100) / 100,
				},
			});
		},
	});
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	const args = Bun.argv.slice(2);
	const serverMode = args.includes("--server");

	// Server mode: clean output, just start the server
	if (serverMode) {
		const ports = [3004, 3005, 3006, 3007, 3008];
		let server: ReturnType<typeof Bun.serve> | null = null;
		let port = 3004;
		
		for (const p of ports) {
			try {
				server = createBunxServer(p);
				port = p;
				break;
			} catch {
				continue;
			}
		}
		
		if (!server) {
			console.error("❌ All ports in use (3004-3008)");
			process.exit(1);
		}
		
		console.log(`\n⚡ BUNX SERVER | Bun ${Bun.version} | Port ${port}\n`);
		console.log(`📡 Endpoints:`);
		console.log(`   curl http://localhost:${port}/bunx-stats`);
		console.log(`   curl http://localhost:${port}/patch-stats`);
		console.log(`   curl http://localhost:${port}/bunx?pkg=vitest`);
		console.log(`\n🟢 Ready`);
		return;
	}

	// Demo mode: full output
	console.log("\n⚡ @dynamic-spy/kit v8.3 - BUNX DEMO ⚡\n");
	console.log(`Bun version: ${Bun.version}`);

	demoBunxOverview();
	demoBunxCommands();
	demoBunxFlags();
	demoArbCommands();
	demoPackageFlag();
	demoBunFlag();
	demoShebangs();
	demoArbScripts();

	console.log("\n" + "=".repeat(70));
	console.log("✅ BUNX SUMMARY");
	console.log("=".repeat(70));
	console.log(`
⚡ Quick Reference:

   bunx <package>              # Run package
   bunx <package>@<version>    # Run specific version
   bunx --bun <package>        # Force Bun runtime
   bunx -p <pkg> <binary>      # When binary ≠ package name
   bunx --no-install <package> # Skip auto-install

🏀 Arbitrage Essentials:

   bunx --bun vitest run       # Fast tests
   bunx autocannon localhost   # Load testing
   bunx prisma migrate         # Database
   bunx concurrently '...'     # Parallel tasks

📊 Performance:
   • 100x faster than npx
   • Global cache for instant reruns
   • Native TypeScript support

bunx → Instant package execution → Industrial speed! 🚀
`);
}

if (import.meta.main) {
	main().catch(console.error);
}

