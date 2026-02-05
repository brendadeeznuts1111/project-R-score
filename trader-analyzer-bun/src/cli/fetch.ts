#!/usr/bin/env bun

/**
 * Trader Analyzer CLI
 *
 * Usage:
 *   bun run cli import <file> [name]     - Import trades from CSV/JSON
 *   bun run cli api <exchange> <key> <secret> [symbol]  - Fetch from exchange
 *   bun run cli sync                     - Fetch latest from saved API
 *   bun run cli streams                  - List all streams
 *   bun run cli stats [--from] [--to]    - Show trading stats
 *   bun run cli profile                  - Show trader profile
 *   bun run cli mm                       - Show market-making stats
 *   bun run cli polymarket <address>     - Fetch from Polymarket
 *   bun run cli kalshi <email> <pass>    - Fetch from Kalshi
 *   bun run cli markets [platform]       - List prediction markets
 *   bun run cli clear [id]               - Remove stream(s)
 */

import { calculateMMStats } from "../analytics/marketmaking";
import { analyzeTraderProfile } from "../analytics/profile";
import { calculatePositionSessions, calculateStats } from "../analytics/stats";
import * as store from "../data/store";
import { initTradeStream } from "../data/stream";
import { CCXTProvider } from "../providers/ccxt";
import { KalshiProvider } from "../providers/kalshi";
import { PolymarketProvider } from "../providers/polymarket";
import type { PredictionTrade } from "../types";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
	switch (command) {
		case "import":
			await importFile();
			break;
		case "api":
			await fetchFromApi();
			break;
		case "sync":
			await syncLatest();
			break;
		case "streams":
			await listStreams();
			break;
		case "stats":
			await showStats();
			break;
		case "profile":
			await showProfile();
			break;
		case "mm":
			await showMMStats();
			break;
		case "polymarket":
			await fetchPolymarket();
			break;
		case "kalshi":
			await fetchKalshi();
			break;
		case "markets":
			await listMarkets();
			break;
		case "clear":
			await clearStreams();
			break;
		default:
			showHelp();
	}
}

// ============ Commands ============

async function importFile() {
	const filePath = args[1];
	const name = args[2];

	if (!filePath) {
		console.log("Usage: bun run cli import <file> [name]");
		process.exit(1);
	}

	console.log(`\n📁 Importing from ${filePath}...`);

	try {
		const trades = await store.loadTradesFromFile(filePath);

		if (trades.length === 0) {
			console.log("❌ No trades found in file\n");
			process.exit(1);
		}

		const stream = await initTradeStream();
		const id = `file-${Date.now()}`;
		const meta = stream.add(id, name || filePath, "file", "BTC/USD", trades);
		await stream.save();

		console.log(`✅ Imported ${trades.length} trades`);
		console.log(`   Stream ID: ${meta.id}`);
		console.log(
			`   Date range: ${meta.from.split("T")[0]} to ${meta.to.split("T")[0]}\n`,
		);
	} catch (error) {
		console.log(
			`❌ ${error instanceof Error ? error.message : "Import failed"}\n`,
		);
		process.exit(1);
	}
}

async function fetchFromApi() {
	const exchange = args[1];
	const apiKey = args[2];
	const apiSecret = args[3];
	const symbol = args[4] || "BTC/USD:BTC";

	if (!exchange || !apiKey || !apiSecret) {
		console.log("Usage: bun run cli api <exchange> <key> <secret> [symbol]");
		console.log("");
		console.log("Exchanges: bitmex, binance, bybit, okx");
		process.exit(1);
	}

	console.log(`\n🔌 Connecting to ${exchange}...`);

	try {
		// Save credentials
		await store.saveCredentials({ exchange, apiKey, apiSecret });

		// Connect
		const provider = new CCXTProvider({ exchange, apiKey, apiSecret });
		const connectResult = await provider.connect();

		if (!connectResult.ok) {
			console.log(`❌ ${connectResult.error.message}\n`);
			process.exit(1);
		}

		console.log(`✅ Connected`);
		console.log(`📥 Fetching trades for ${symbol}...`);

		const tradesResult = await provider.fetchAllTrades(symbol, (count) => {
			process.stdout.write(`\r   ${count} trades...`);
		});

		if (!tradesResult.ok) {
			console.log(`\n❌ ${tradesResult.error.message}\n`);
			process.exit(1);
		}

		console.log(`\r✅ Fetched ${tradesResult.data.length} trades`);

		// Save to stream
		const stream = await initTradeStream();
		const id = `api-${exchange}-${Date.now()}`;
		const meta = stream.add(
			id,
			`${exchange} API`,
			"api",
			symbol,
			tradesResult.data,
		);
		await stream.save();

		console.log(`   Stream ID: ${meta.id}`);
		console.log(
			`   Date range: ${meta.from.split("T")[0]} to ${meta.to.split("T")[0]}\n`,
		);
	} catch (error) {
		console.log(
			`❌ ${error instanceof Error ? error.message : "Fetch failed"}\n`,
		);
		process.exit(1);
	}
}

async function syncLatest() {
	console.log("\n🔄 Syncing latest trades...");

	const creds = await store.loadCredentials();
	if (!creds) {
		console.log(
			"❌ No saved credentials. Run: bun run cli api <exchange> <key> <secret>\n",
		);
		process.exit(1);
	}

	try {
		const stream = await initTradeStream();
		const range = stream.getDateRange();
		const since = range.to ? new Date(range.to).getTime() + 1 : undefined;

		const provider = new CCXTProvider(creds);
		await provider.connect();

		const tradesResult = await provider.fetchTrades(undefined, since, 500);
		if (!tradesResult.ok) {
			console.log(`❌ ${tradesResult.error.message}\n`);
			process.exit(1);
		}

		if (tradesResult.data.length === 0) {
			console.log("✅ No new trades\n");
			return;
		}

		// Update existing or create new
		const existing = stream.list().filter((s) => s.source === "api");
		if (existing.length > 0) {
			stream.update(existing[0].id, tradesResult.data);
		} else {
			stream.add(
				`api-${creds.exchange}-${Date.now()}`,
				`${creds.exchange} API`,
				"api",
				"BTC/USD",
				tradesResult.data,
			);
		}
		await stream.save();

		console.log(`✅ Synced ${tradesResult.data.length} new trades\n`);
	} catch (error) {
		console.log(
			`❌ ${error instanceof Error ? error.message : "Sync failed"}\n`,
		);
		process.exit(1);
	}
}

async function listStreams() {
	const stream = await initTradeStream();
	const streams = stream.list();
	const range = stream.getDateRange();

	console.log("\n📊 Data Streams:\n");

	if (streams.length === 0) {
		console.log("   No streams. Import data first.\n");
		return;
	}

	for (const s of streams) {
		const from = s.from.split("T")[0];
		const to = s.to.split("T")[0];
		console.log(`   [${s.source}] ${s.name}`);
		console.log(`      ID: ${s.id}`);
		console.log(`      Trades: ${s.count.toLocaleString()}`);
		console.log(`      Range: ${from} → ${to}`);
		console.log("");
	}

	console.log(`   Total: ${stream.getTotalCount().toLocaleString()} trades`);
	if (range.from && range.to) {
		console.log(
			`   Full range: ${range.from.split("T")[0]} → ${range.to.split("T")[0]}`,
		);
	}
	console.log("");
}

async function showStats() {
	const from = getArg("--from");
	const to = getArg("--to");

	const stream = await initTradeStream();
	const trades = stream.getRange(from, to);

	if (trades.length === 0) {
		console.log("\n❌ No trades. Import data first.\n");
		process.exit(1);
	}

	const orders = await store.loadOrders();
	const wallet = await store.loadWallet();
	const stats = calculateStats(trades, orders, wallet);

	console.log("\n═══════════════════════════════════════════════════════");
	console.log("                   TRADING STATS                        ");
	console.log("═══════════════════════════════════════════════════════\n");

	console.log("── Volume ────────────────────────────────────────────");
	console.log(`   Total Trades:    ${stats.totalTrades.toLocaleString()}`);
	console.log(`   Total Volume:    ${stats.totalVolume.toLocaleString()}`);
	console.log(`   Trading Days:    ${stats.tradingDays}`);
	console.log(`   Trades/Day:      ${stats.avgTradesPerDay.toFixed(1)}`);

	console.log("\n── Performance ───────────────────────────────────────");
	console.log(`   Win Rate:        ${stats.winRate.toFixed(2)}%`);
	console.log(
		`   Profit Factor:   ${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}`,
	);
	console.log(`   Avg Win:         ${stats.avgWin.toFixed(4)}`);
	console.log(`   Avg Loss:        ${stats.avgLoss.toFixed(4)}`);

	console.log("\n── PnL ───────────────────────────────────────────────");
	console.log(`   Total PnL:       ${stats.totalPnl.toFixed(4)}`);
	console.log(`   Total Fees:      ${stats.totalFees.toFixed(4)}`);
	console.log(`   Net PnL:         ${stats.netPnl.toFixed(4)}`);

	console.log("\n═══════════════════════════════════════════════════════\n");
}

async function showProfile() {
	const stream = await initTradeStream();
	const trades = stream.merge();

	if (trades.length === 0) {
		console.log("\n❌ No trades. Import data first.\n");
		process.exit(1);
	}

	const orders = await store.loadOrders();
	const wallet = await store.loadWallet();
	const stats = calculateStats(trades, orders, wallet);
	const sessions = calculatePositionSessions(trades);
	const profile = analyzeTraderProfile(stats, trades, orders, sessions);

	console.log("\n═══════════════════════════════════════════════════════");
	console.log("                  TRADER PROFILE                        ");
	console.log("═══════════════════════════════════════════════════════\n");

	console.log(`   Style:           ${profile.style.toUpperCase()}`);
	console.log(`   Risk:            ${profile.risk}`);
	console.log(`   Difficulty:      ${profile.difficulty}`);

	console.log("\n── Metrics ───────────────────────────────────────────");
	console.log(`   Win Rate:        ${profile.metrics.winRate.toFixed(2)}%`);
	console.log(`   Profit Factor:   ${profile.metrics.profitFactor.toFixed(2)}`);
	console.log(
		`   Avg Hold:        ${(profile.metrics.avgHoldingMinutes / 60).toFixed(1)} hours`,
	);
	console.log(
		`   Trades/Week:     ${profile.metrics.tradesPerWeek.toFixed(1)}`,
	);
	console.log(`   Discipline:      ${profile.metrics.disciplineScore}/100`);

	console.log("\n── Strengths ─────────────────────────────────────────");
	for (const s of profile.insights.strengths) {
		console.log(`   ✅ ${s}`);
	}

	console.log("\n── Weaknesses ────────────────────────────────────────");
	for (const w of profile.insights.weaknesses) {
		console.log(`   ⚠️  ${w}`);
	}

	console.log("\n── Summary ───────────────────────────────────────────");
	console.log(`   ${profile.insights.summary}`);

	console.log("\n═══════════════════════════════════════════════════════\n");
}

async function clearStreams() {
	const id = args[1];
	const stream = await initTradeStream();

	if (id) {
		if (!stream.get(id)) {
			console.log(`\n❌ Stream not found: ${id}\n`);
			process.exit(1);
		}
		stream.remove(id);
		await stream.save();
		console.log(`\n✅ Removed stream: ${id}\n`);
	} else {
		await stream.clear();
		await store.clearAll();
		console.log("\n✅ Cleared all data\n");
	}
}

// ============ Market Making ============

async function showMMStats() {
	const from = getArg("--from");
	const to = getArg("--to");

	const stream = await initTradeStream();
	const trades = stream.getRange(from, to);

	if (trades.length === 0) {
		console.log("\n❌ No trades. Import data first.\n");
		process.exit(1);
	}

	const orders = await store.loadOrders();
	const stats = calculateMMStats(trades, orders, []);

	console.log("\n═══════════════════════════════════════════════════════");
	console.log("               MARKET MAKING STATS                      ");
	console.log("═══════════════════════════════════════════════════════\n");

	console.log("── Volume ────────────────────────────────────────────");
	console.log(`   Total Trades:    ${stats.totalTrades.toLocaleString()}`);
	console.log(
		`   Maker Trades:    ${stats.makerTrades.toLocaleString()} (${(stats.makerRatio * 100).toFixed(1)}%)`,
	);
	console.log(`   Taker Trades:    ${stats.takerTrades.toLocaleString()}`);
	console.log(`   Total Volume:    ${stats.totalVolume.toFixed(2)}`);

	console.log("\n── Inventory ─────────────────────────────────────────");
	console.log(`   Avg Inventory:   ${stats.avgInventory.toFixed(4)}`);
	console.log(`   Max Inventory:   ${stats.maxInventory.toFixed(4)}`);
	console.log(`   Turnover:        ${stats.inventoryTurnover.toFixed(2)}x`);
	console.log(`   Skew:            ${(stats.inventorySkew * 100).toFixed(1)}%`);

	console.log("\n── Performance ───────────────────────────────────────");
	console.log(`   Gross PnL:       ${stats.grossPnl.toFixed(4)}`);
	console.log(`   Rebates:         ${stats.rebates.toFixed(4)}`);
	console.log(`   Fees:            ${stats.fees.toFixed(4)}`);
	console.log(`   Net PnL:         ${stats.netPnl.toFixed(4)}`);
	console.log(`   PnL/Trade:       ${stats.pnlPerTrade.toFixed(6)}`);

	console.log("\n── Risk ──────────────────────────────────────────────");
	console.log(`   Max Drawdown:    ${stats.maxDrawdown.toFixed(4)}`);
	console.log(`   Sharpe Ratio:    ${stats.sharpeRatio.toFixed(2)}`);

	console.log("\n═══════════════════════════════════════════════════════\n");
}

// ============ Prediction Markets ============

async function fetchPolymarket() {
	const address = args[1];

	if (!address) {
		console.log("Usage: bun run cli polymarket <wallet-address>");
		console.log("");
		console.log("Your Polymarket wallet address (funder address)");
		process.exit(1);
	}

	console.log(`\n🔮 Connecting to Polymarket...`);

	try {
		const provider = new PolymarketProvider({ funderAddress: address });
		await provider.connect();

		console.log(`✅ Connected`);
		console.log(`📥 Fetching trades for ${address.slice(0, 10)}...`);

		const tradesResult = await provider.fetchAllTrades(undefined, (count) => {
			process.stdout.write(`\r   ${count} trades...`);
		});

		if (!tradesResult.ok) {
			console.log(`\n❌ ${tradesResult.error.message}\n`);
			process.exit(1);
		}

		console.log(`\r✅ Fetched ${tradesResult.data.length} trades`);

		// Save to stream
		const stream = await initTradeStream();
		const id = `polymarket-${Date.now()}`;
		const meta = stream.add(
			id,
			"Polymarket",
			"api",
			"PREDICTION",
			tradesResult.data,
		);
		await stream.save();

		console.log(`   Stream ID: ${meta.id}`);
		console.log(
			`   Date range: ${meta.from.split("T")[0]} to ${meta.to.split("T")[0]}\n`,
		);
	} catch (error) {
		console.log(
			`❌ ${error instanceof Error ? error.message : "Fetch failed"}\n`,
		);
		process.exit(1);
	}
}

async function fetchKalshi() {
	const email = args[1];
	const password = args[2];
	const demo = args.includes("--demo");

	if (!email || !password) {
		console.log("Usage: bun run cli kalshi <email> <password> [--demo]");
		console.log("");
		console.log("Options:");
		console.log("  --demo    Use Kalshi demo/paper trading API");
		process.exit(1);
	}

	console.log(`\n🎯 Connecting to Kalshi${demo ? " (demo)" : ""}...`);

	try {
		const provider = new KalshiProvider({ email, password, demo });
		const connectResult = await provider.connect();

		if (!connectResult.ok) {
			console.log(`❌ ${connectResult.error.message}\n`);
			process.exit(1);
		}

		console.log(`✅ Connected`);
		console.log(`📥 Fetching trades...`);

		const tradesResult = await provider.fetchAllTrades(undefined, (count) => {
			process.stdout.write(`\r   ${count} trades...`);
		});

		if (!tradesResult.ok) {
			console.log(`\n❌ ${tradesResult.error.message}\n`);
			process.exit(1);
		}

		console.log(`\r✅ Fetched ${tradesResult.data.length} trades`);

		// Save credentials
		await store.saveCredentials({
			exchange: "kalshi",
			apiKey: email,
			apiSecret: password,
			testnet: demo,
		});

		// Save to stream
		const stream = await initTradeStream();
		const id = `kalshi-${Date.now()}`;
		const meta = stream.add(
			id,
			"Kalshi",
			"api",
			"PREDICTION",
			tradesResult.data,
		);
		await stream.save();

		console.log(`   Stream ID: ${meta.id}`);
		console.log(
			`   Date range: ${meta.from.split("T")[0]} to ${meta.to.split("T")[0]}\n`,
		);
	} catch (error) {
		console.log(
			`❌ ${error instanceof Error ? error.message : "Fetch failed"}\n`,
		);
		process.exit(1);
	}
}

async function listMarkets() {
	const platform = args[1] || "polymarket";
	const limit = parseInt(getArg("--limit") || "20");

	console.log(`\n📊 Fetching ${platform} markets...\n`);

	try {
		if (platform === "polymarket") {
			const provider = new PolymarketProvider({});
			await provider.connect();
			const result = await provider.fetchMarkets(limit);

			if (!result.ok) {
				console.log(`❌ ${result.error.message}\n`);
				process.exit(1);
			}

			console.log("── Active Markets ────────────────────────────────────\n");
			for (const market of result.data) {
				const yesPrice = market.outcomes[0]?.price || 0;
				console.log(`   ${market.question}`);
				console.log(
					`   YES: ${(yesPrice * 100).toFixed(0)}¢  |  Volume: $${market.volume.toLocaleString()}`,
				);
				console.log("");
			}
		} else if (platform === "kalshi") {
			const provider = new KalshiProvider({});
			await provider.connect();
			const result = await provider.fetchMarkets("open", limit);

			if (!result.ok) {
				console.log(`❌ ${result.error.message}\n`);
				process.exit(1);
			}

			console.log("── Active Markets ────────────────────────────────────\n");
			for (const market of result.data) {
				const yesPrice = market.outcomes[0]?.price || 0;
				console.log(`   [${market.id}] ${market.question}`);
				console.log(
					`   YES: ${(yesPrice * 100).toFixed(0)}¢  |  Volume: ${market.volume.toLocaleString()}`,
				);
				console.log("");
			}
		} else {
			console.log(`❌ Unknown platform: ${platform}`);
			console.log("   Supported: polymarket, kalshi\n");
			process.exit(1);
		}
	} catch (error) {
		console.log(`❌ ${error instanceof Error ? error.message : "Failed"}\n`);
		process.exit(1);
	}
}

// ============ Helpers ============

function getArg(flag: string): string | undefined {
	const idx = args.indexOf(flag);
	if (idx !== -1 && args[idx + 1]) {
		return args[idx + 1];
	}
	return undefined;
}

function showHelp() {
	console.log(`
╔═══════════════════════════════════════════════════════════╗
║              Trader Analyzer CLI                          ║
╚═══════════════════════════════════════════════════════════╝

Usage:
  bun run src/cli/fetch.ts <command> [options]

═══ Data Import ═══════════════════════════════════════════

  import <file> [name]
    Import trades from CSV or JSON file

  api <exchange> <key> <secret> [symbol]
    Fetch trades from exchange API
    Exchanges: bitmex, binance, bybit, okx

  sync
    Fetch latest trades from saved API credentials

═══ Prediction Markets ════════════════════════════════════

  polymarket <wallet-address>
    Fetch trades from Polymarket using your wallet address

  kalshi <email> <password> [--demo]
    Fetch trades from Kalshi (--demo for paper trading)

  markets [platform] [--limit N]
    List active markets on polymarket or kalshi

═══ Analytics ═════════════════════════════════════════════

  streams
    List all data streams

  stats [--from YYYY-MM-DD] [--to YYYY-MM-DD]
    Show trading statistics

  profile
    Show trader profile analysis

  mm [--from YYYY-MM-DD] [--to YYYY-MM-DD]
    Show market-making analytics (maker/taker, inventory, PnL)

═══ Maintenance ═══════════════════════════════════════════

  clear [id]
    Remove a specific stream or all data

═══ Examples ══════════════════════════════════════════════

  # Import historical CSV
  bun run src/cli/fetch.ts import ./trades.csv "Historical"

  # Connect to BitMEX
  bun run src/cli/fetch.ts api bitmex YOUR_KEY YOUR_SECRET

  # Fetch Polymarket trades
  bun run src/cli/fetch.ts polymarket 0x1234...abcd

  # List Kalshi markets
  bun run src/cli/fetch.ts markets kalshi --limit 10

  # View market-making stats
  bun run src/cli/fetch.ts mm --from 2024-01-01
`);
}

main().catch(console.error);
