#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v8.1 - BUN UTILS INDUSTRIALIZED! 🚀
 * 
 * Bun.version + Bun.sleep + Bun.which + randomUUIDv7 → Arbitrage Factory Supercharged!
 * 
 * Features:
 * - Live utils dashboard endpoint
 * - Precise arbitrage timing with Bun.sleep()
 * - Monotonic UUID tracking with Bun.randomUUIDv7()
 * - Tool discovery with Bun.which()
 * - High-precision timing with Bun.nanoseconds()
 * 
 * Usage:
 *   bun run examples/bun-utils-arb-factory-demo.ts
 *   bun run examples/bun-utils-arb-factory-demo.ts --server
 */

import { peek } from "bun";

// =============================================================================
// Stats Tracking
// =============================================================================
const utilsStats = {
	sleepCalls: 0,
	uuidsGenerated: 0,
	whichCalls: 0,
	deepEquals: 0,
	nanosecondsCalls: 0,
	arbsExecuted: 0,
	marketsProcessed: 0,
};

// =============================================================================
// Arbitrage Types
// =============================================================================
interface ArbitrageOpportunity {
	id: string;
	game: string;
	market: string;
	bookie1: { name: string; odds: number };
	bookie2: { name: string; odds: number };
	profit: number;
	timestamp: number;
}

interface BookieOdds {
	bookie: string;
	game: string;
	homeOdds: number;
	awayOdds: number;
	timestamp: number;
}

// =============================================================================
// Sharp Bookies
// =============================================================================
const SHARP_BOOKIES = ["pinnacle", "sbobet", "betfair", "matchbook", "betdaq"];
const NBA_GAMES = [
	"LAL @ BOS",
	"DEN @ MIA", 
	"GSW @ PHX",
	"MIL @ NYK",
	"DAL @ LAC"
];

// =============================================================================
// 1. Bun.version/revision - Runtime Info
// =============================================================================
function demoVersionInfo() {
	console.log("=".repeat(60));
	console.log("1. 📋 BUN VERSION INFO - Canary Detection");
	console.log("=".repeat(60));

	const isCanary = Bun.version.includes("canary");
	const majorVersion = parseInt(Bun.version.split(".")[0]);

	console.log(`\n📋 Runtime Info:`);
	console.log(`   Bun.version:  ${Bun.version}`);
	console.log(`   Bun.revision: ${Bun.revision.slice(0, 12)}...`);
	console.log(`   Is Canary:    ${isCanary}`);
	console.log(`   Major:        ${majorVersion}`);
	console.log(`   Bun.main:     ${Bun.main.split("/").slice(-2).join("/")}`);

	// Version compatibility check
	const minVersion = "1.0.0";
	const isCompatible = Bun.semver.satisfies(Bun.version.split("-")[0], `>=${minVersion}`);
	console.log(`\n✅ Compatible with >=${minVersion}: ${isCompatible}`);
}

// =============================================================================
// 2. Bun.sleep() - Precise Arbitrage Timing
// =============================================================================
async function demoSleepTiming() {
	console.log("\n" + "=".repeat(60));
	console.log("2. ⏱️ Bun.sleep() - PRECISE ARBITRAGE TIMING");
	console.log("=".repeat(60));

	// Precision test
	console.log(`\n📊 Sleep Precision Test:`);
	const precisionTests = [10, 50, 100, 250];
	
	for (const target of precisionTests) {
		const start = performance.now();
		await Bun.sleep(target);
		utilsStats.sleepCalls++;
		const actual = performance.now() - start;
		const drift = actual - target;
		const emoji = Math.abs(drift) < 5 ? "✅" : Math.abs(drift) < 10 ? "⚠️" : "❌";
		console.log(`   ${target}ms target → ${actual.toFixed(2)}ms actual (${drift > 0 ? "+" : ""}${drift.toFixed(2)}ms drift) ${emoji}`);
	}

	// Simulated bookie polling
	console.log(`\n🔄 Simulated Bookie Polling (3 rounds):`);
	for (let round = 0; round < 3; round++) {
		const roundStart = performance.now();
		
		// Simulate fetching from all sharp bookies
		await Promise.all(SHARP_BOOKIES.map(async (bookie) => {
			await Bun.sleep(10 + Math.random() * 20); // Simulate API latency
			utilsStats.sleepCalls++;
		}));
		
		const roundTime = performance.now() - roundStart;
		console.log(`   Round ${round + 1}: ${SHARP_BOOKIES.length} bookies in ${roundTime.toFixed(1)}ms`);
		
		// Rate limit between rounds
		await Bun.sleep(100);
		utilsStats.sleepCalls++;
	}

	// Date-based sleep
	console.log(`\n📅 Date-based Sleep:`);
	const futureDate = new Date(Date.now() + 100);
	const dateStart = performance.now();
	await Bun.sleep(futureDate);
	utilsStats.sleepCalls++;
	console.log(`   Slept until ${futureDate.toISOString().split("T")[1].slice(0, 12)}`);
	console.log(`   Actual: ${(performance.now() - dateStart).toFixed(2)}ms`);
}

// =============================================================================
// 3. Bun.randomUUIDv7() - Monotonic Arb Tracking
// =============================================================================
function demoUUIDv7Tracking() {
	console.log("\n" + "=".repeat(60));
	console.log("3. 🆔 Bun.randomUUIDv7() - MONOTONIC ARB TRACKING");
	console.log("=".repeat(60));

	// Generate arb IDs
	console.log(`\n📋 Arbitrage ID Generation:`);
	const arbs: ArbitrageOpportunity[] = [];
	
	for (let i = 0; i < 5; i++) {
		const arbId = Bun.randomUUIDv7();
		utilsStats.uuidsGenerated++;
		
		arbs.push({
			id: arbId,
			game: NBA_GAMES[i % NBA_GAMES.length],
			market: "Moneyline",
			bookie1: { name: "Pinnacle", odds: 1.90 + Math.random() * 0.2 },
			bookie2: { name: "Bet365", odds: 2.00 + Math.random() * 0.2 },
			profit: 0.01 + Math.random() * 0.03,
			timestamp: Date.now()
		});
	}

	// Display with table
	const arbTable = arbs.map(a => ({
		arbId: a.id.slice(0, 18) + "...",
		game: a.game,
		profit: (a.profit * 100).toFixed(2) + "%",
		b1: `${a.bookie1.name} ${a.bookie1.odds.toFixed(2)}`,
		b2: `${a.bookie2.name} ${a.bookie2.odds.toFixed(2)}`
	}));
	console.log(Bun.inspect.table(arbTable));

	// Monotonic verification
	console.log(`\n✅ Monotonic Verification:`);
	const ids = Array.from({ length: 1000 }, () => {
		utilsStats.uuidsGenerated++;
		return Bun.randomUUIDv7();
	});
	const sorted = [...ids].sort();
	const isMonotonic = ids.every((id, i) => id === sorted[i]);
	console.log(`   1000 UUIDs generated: ${isMonotonic ? "✅ All monotonic!" : "❌ Not monotonic"}`);

	// Encoding options
	console.log(`\n📦 Encoding Options:`);
	console.log(`   hex:       ${Bun.randomUUIDv7("hex")}`);
	utilsStats.uuidsGenerated++;
	console.log(`   base64:    ${Bun.randomUUIDv7("base64")}`);
	utilsStats.uuidsGenerated++;
	console.log(`   base64url: ${Bun.randomUUIDv7("base64url")}`);
	utilsStats.uuidsGenerated++;
	
	const buffer = Bun.randomUUIDv7("buffer");
	utilsStats.uuidsGenerated++;
	console.log(`   buffer:    Uint8Array(${buffer.length}) [${Array.from(buffer.slice(0, 4)).join(", ")}...]`);
}

// =============================================================================
// 4. Bun.which() - Scraper Dependencies
// =============================================================================
function demoWhichDiscovery() {
	console.log("\n" + "=".repeat(60));
	console.log("4. 🔍 Bun.which() - SCRAPER DEPENDENCIES");
	console.log("=".repeat(60));

	// Essential tools
	const essentialTools = ["bun", "node", "git", "curl", "jq"];
	const optionalTools = ["redis-cli", "docker", "kubectl", "ffmpeg"];

	console.log(`\n📋 Essential Tools:`);
	essentialTools.forEach(tool => {
		const path = Bun.which(tool);
		utilsStats.whichCalls++;
		const status = path ? `✅ ${path}` : "❌ Not found";
		console.log(`   ${tool.padEnd(12)} → ${status}`);
	});

	console.log(`\n📋 Optional Tools:`);
	optionalTools.forEach(tool => {
		const path = Bun.which(tool);
		utilsStats.whichCalls++;
		const status = path ? `✅ ${path.split("/").slice(-2).join("/")}` : "⚠️ Not installed";
		console.log(`   ${tool.padEnd(12)} → ${status}`);
	});

	// Custom PATH search
	console.log(`\n🔧 Custom PATH Search:`);
	const customPaths = ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin"];
	for (const customPath of customPaths) {
		const bunPath = Bun.which("bun", { PATH: customPath });
		utilsStats.whichCalls++;
		console.log(`   ${customPath.padEnd(20)} → ${bunPath ? "bun found" : "not found"}`);
	}
}

// =============================================================================
// 5. Bun.nanoseconds() - High-Precision Timing
// =============================================================================
async function demoNanosecondsTiming() {
	console.log("\n" + "=".repeat(60));
	console.log("5. ⚡ Bun.nanoseconds() - HIGH-PRECISION TIMING");
	console.log("=".repeat(60));

	// Precision comparison
	console.log(`\n📊 Precision Comparison:`);
	
	const perfStart = performance.now();
	const nanoStart = Bun.nanoseconds();
	utilsStats.nanosecondsCalls++;
	
	// Do some work
	let sum = 0;
	for (let i = 0; i < 100000; i++) sum += i;
	
	const nanoEnd = Bun.nanoseconds();
	const perfEnd = performance.now();
	utilsStats.nanosecondsCalls++;

	console.log(`   performance.now(): ${(perfEnd - perfStart).toFixed(6)} ms`);
	console.log(`   Bun.nanoseconds(): ${nanoEnd - nanoStart} ns (${((nanoEnd - nanoStart) / 1e6).toFixed(6)} ms)`);

	// Simulated arb execution timing
	console.log(`\n🏀 Arb Execution Timing:`);
	const arbTimings: { game: string; latency: string }[] = [];

	for (const game of NBA_GAMES.slice(0, 3)) {
		const start = Bun.nanoseconds();
		utilsStats.nanosecondsCalls++;
		
		// Simulate arb calculation
		await Bun.sleep(5 + Math.random() * 10);
		utilsStats.sleepCalls++;
		utilsStats.arbsExecuted++;
		
		const end = Bun.nanoseconds();
		utilsStats.nanosecondsCalls++;
		
		arbTimings.push({
			game,
			latency: `${((end - start) / 1e6).toFixed(2)}ms`
		});
	}

	console.log(Bun.inspect.table(arbTimings));
}

// =============================================================================
// 6. Bun.deepEquals() - Market Comparison
// =============================================================================
function demoDeepEquals() {
	console.log("\n" + "=".repeat(60));
	console.log("6. 🔄 Bun.deepEquals() - MARKET COMPARISON");
	console.log("=".repeat(60));

	// Compare market snapshots
	const snapshot1: BookieOdds = {
		bookie: "Pinnacle",
		game: "LAL @ BOS",
		homeOdds: 1.95,
		awayOdds: 2.05,
		timestamp: Date.now()
	};

	const snapshot2: BookieOdds = {
		bookie: "Pinnacle",
		game: "LAL @ BOS",
		homeOdds: 1.95,
		awayOdds: 2.05,
		timestamp: Date.now()
	};

	const snapshot3: BookieOdds = {
		bookie: "Pinnacle",
		game: "LAL @ BOS",
		homeOdds: 1.93, // Changed!
		awayOdds: 2.07,
		timestamp: Date.now()
	};

	console.log(`\n📋 Market Snapshot Comparison:`);
	
	// Compare without timestamp
	const compare1 = { ...snapshot1, timestamp: 0 };
	const compare2 = { ...snapshot2, timestamp: 0 };
	const compare3 = { ...snapshot3, timestamp: 0 };

	const eq12 = Bun.deepEquals(compare1, compare2);
	utilsStats.deepEquals++;
	const eq13 = Bun.deepEquals(compare1, compare3);
	utilsStats.deepEquals++;

	console.log(`   Snapshot 1 vs 2: ${eq12 ? "✅ Same odds" : "❌ Different"}`);
	console.log(`   Snapshot 1 vs 3: ${eq13 ? "✅ Same odds" : "⚠️ ODDS CHANGED!"}`);

	// Detect changes
	if (!eq13) {
		console.log(`\n🚨 Odds Movement Detected:`);
		console.log(`   Home: ${snapshot1.homeOdds} → ${snapshot3.homeOdds} (Δ ${(snapshot3.homeOdds - snapshot1.homeOdds).toFixed(2)})`);
		console.log(`   Away: ${snapshot1.awayOdds} → ${snapshot3.awayOdds} (Δ ${(snapshot3.awayOdds - snapshot1.awayOdds).toFixed(2)})`);
	}

	// Batch comparison
	console.log(`\n📊 Batch Comparison (1000 markets):`);
	const markets1 = Array.from({ length: 1000 }, (_, i) => ({ id: i, odds: 1.95 }));
	const markets2 = Array.from({ length: 1000 }, (_, i) => ({ id: i, odds: 1.95 }));
	markets2[500].odds = 1.93; // One change

	const start = performance.now();
	let changedCount = 0;
	for (let i = 0; i < markets1.length; i++) {
		if (!Bun.deepEquals(markets1[i], markets2[i])) {
			changedCount++;
		}
		utilsStats.deepEquals++;
	}
	const time = performance.now() - start;

	console.log(`   Compared: 1000 markets in ${time.toFixed(2)}ms`);
	console.log(`   Changed:  ${changedCount} market(s)`);
}

// =============================================================================
// 7. Utils Stats Summary
// =============================================================================
function printUtilsStats() {
	console.log("\n" + "=".repeat(60));
	console.log("7. 📊 UTILS STATS DASHBOARD");
	console.log("=".repeat(60));

	const dashboard = {
		bun: {
			version: Bun.version,
			revision: Bun.revision.slice(0, 12)
		},
		utils: {
			sleepCalls: utilsStats.sleepCalls,
			uuidsGenerated: utilsStats.uuidsGenerated,
			whichCalls: utilsStats.whichCalls,
			deepEquals: utilsStats.deepEquals,
			nanosecondsCalls: utilsStats.nanosecondsCalls
		},
		arbitrage: {
			main: Bun.main.split("/").slice(-2).join("/"),
			arbsExecuted: utilsStats.arbsExecuted,
			marketsProcessed: utilsStats.marketsProcessed
		}
	};

	console.log(`\n📋 curl http://localhost:3000/utils-stats`);
	console.log(JSON.stringify(dashboard, null, 2));
}

// =============================================================================
// 8. Live Server with Utils Dashboard
// =============================================================================
function createUtilsServer(port: number) {
	return Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			// Utils stats endpoint
			if (url.pathname === "/utils-stats") {
				return Response.json({
					bun: {
						version: Bun.version,
						revision: Bun.revision.slice(0, 12)
					},
					utils: utilsStats,
					arbitrage: {
						main: Bun.main.split("/").slice(-2).join("/"),
						uptime: process.uptime()
					}
				});
			}

			// Generate arb endpoint
			if (url.pathname === "/arb") {
				const arbId = Bun.randomUUIDv7();
				utilsStats.uuidsGenerated++;
				utilsStats.arbsExecuted++;

				return Response.json({
					arbId,
					game: NBA_GAMES[Math.floor(Math.random() * NBA_GAMES.length)],
					profit: (0.01 + Math.random() * 0.03).toFixed(4),
					timestamp: Date.now()
				});
			}

			// Tools check endpoint
			if (url.pathname === "/tools") {
				const tools = ["bun", "node", "git", "curl", "jq", "redis-cli", "docker"];
				const results: Record<string, string | null> = {};
				
				for (const tool of tools) {
					results[tool] = Bun.which(tool);
					utilsStats.whichCalls++;
				}

				return Response.json(results);
			}

			// Health check with sleep
			if (url.pathname === "/health") {
				const start = Bun.nanoseconds();
				await Bun.sleep(10);
				utilsStats.sleepCalls++;
				const latency = Bun.nanoseconds() - start;
				utilsStats.nanosecondsCalls += 2;

				return Response.json({
					status: "ok",
					latencyNs: latency,
					latencyMs: (latency / 1e6).toFixed(2)
				});
			}

			return Response.json({ 
				endpoints: ["/utils-stats", "/arb", "/tools", "/health"] 
			});
		}
	});
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	console.log("\n⚡ @dynamic-spy/kit v8.1 - BUN UTILS INDUSTRIALIZED! 🚀\n");

	const args = Bun.argv.slice(2);
	const serverMode = args.includes("--server");

	demoVersionInfo();
	await demoSleepTiming();
	demoUUIDv7Tracking();
	demoWhichDiscovery();
	await demoNanosecondsTiming();
	demoDeepEquals();
	printUtilsStats();

	if (serverMode) {
		const port = 3003;
		const server = createUtilsServer(port);
		console.log("\n" + "=".repeat(60));
		console.log("8. 🚀 LIVE UTILS SERVER");
		console.log("=".repeat(60));
		console.log(`\n🌐 Server running on http://localhost:${port}`);
		console.log(`   /utils-stats  → Utils dashboard`);
		console.log(`   /arb          → Generate arb ID`);
		console.log(`   /tools        → Check installed tools`);
		console.log(`   /health       → Health check with timing`);
		console.log(`\n📡 Server mode - press Ctrl+C to stop`);
		return;
	}

	console.log("\n" + "=".repeat(60));
	console.log("✅ UTILS SUPERPOWERS SUMMARY");
	console.log("=".repeat(60));
	console.log(`
| Util            | Arbitrage Use      | Impact        |
|-----------------|--------------------| --------------|
| Bun.version     | Canary detection   | Auto-upgrade  |
| Bun.sleep       | Precise timing     | 100ms polls   |
| Bun.which       | Tool discovery     | Zero config   |
| randomUUIDv7    | Arb tracking       | Monotonic     |
| Bun.nanoseconds | Latency measurement| Sub-µs        |
| Bun.deepEquals  | Market comparison  | Change detect |
| Bun.main        | CLI vs lib         | Hybrid mode   |

Bun utils → Precise arbitrage → Industrial timing! 🚀
`);
}

if (import.meta.main) {
	main().catch(console.error);
}

