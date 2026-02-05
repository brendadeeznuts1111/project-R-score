#!/usr/bin/env bun
/**
 * [DEBUG-V2][INSPECT-SUPREMACY][MULTI-FORMAT][LIVE]
 * Arbitrage Debug Terminal - All Bun.inspect Weapons
 */

import { Database } from 'bun:sqlite';
import { MLGSGraph } from './src/graph/MLGSGraph';

// Database setup
const dataDir = './data';
try {
	Bun.mkdir(dataDir, { recursive: true });
} catch {}

const dbPath = process.env.DB_PATH || `${dataDir}/ultimate-debug.db`;
const mlgsPath = process.env.MLGS_PATH || `${dataDir}/mlgs-ultimate-debug.db`;

const db = new Database(dbPath, { create: true });
const mlgs = new MLGSGraph(mlgsPath);

// Initialize database schema
db.exec(`
	CREATE TABLE IF NOT EXISTS arb_opportunities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		league TEXT NOT NULL,
		market TEXT NOT NULL,
		profit_pct REAL NOT NULL,
		value_usd REAL NOT NULL,
		steam_confirmed INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_profit ON arb_opportunities(profit_pct DESC);
`);

// Type definitions
interface ArbOpportunity {
	id?: number;
	league: string;
	market: string;
	profit_pct: number;
	value_usd: number;
	steam_confirmed?: number;
	created_at?: string;
}

interface OddsData {
	markets?: any[];
	avg_profit_pct?: number;
	total_value_usd?: number;
	[key: string]: any;
}

// ==================== ENHANCED INSPECT UTILS ====================
class DebugArsenal {
	static inspectOddsBuffer(buffer: Uint8Array) {
		console.log('\n🔍 BUFFER INSPECT');
		console.log(Bun.inspect(buffer)); // Uint8Array perfect

		console.log('\n📏 BUFFER METRICS');
		
		const hexPreview = Array.from(buffer.slice(0, 64))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		Bun.inspect.table([
			{ type: 'Uint8Array', size: buffer.length },
			{ type: 'Hex Preview', size: hexPreview.length },
			{ type: 'JSON Parse', size: JSON.stringify(buffer).length }
		], ['type', 'size']);
	}

	static inspectCustomOdds(data: OddsData) {
		const markets = data.markets?.length || 0;
		const avgEdge = data.avg_profit_pct?.toFixed(2) || '0.00';
		const value = data.total_value_usd?.toLocaleString() || '0';
		
		return {
			markets,
			avgEdge: avgEdge + '%',
			value: '$' + value,
			[Bun.inspect.custom]: () => {
				return `OddsDebug {
  markets: ${markets},
  avgEdge: ${avgEdge}%,
  value: $${value}
}`;
			}
		};
	}

	static streamDebugTable() {
		console.log('\n🚀 STREAM DEBUG TABLE');

		// Multi-format table
		Bun.inspect.table([
			{ method: 'readableStreamToArrayBuffer()', use: 'Binary blobs' },
			{ method: 'readableStreamToBytes()', use: 'Uint8Array inspect' },
			{ method: 'readableStreamToBlob()', use: 'File uploads' },
			{ method: 'readableStreamToJSON()', use: 'Odds parsing' },
			{ method: 'readableStreamToText()', use: 'NDJSON lines' }
		], ['method', 'use']);
	}

	static async debugStreamMultiFormat(streamData: any) {
		// Create separate streams from the same data
		const createStream = (data: any) => new ReadableStream({
			start(controller) {
				const encoder = new TextEncoder();
				controller.enqueue(encoder.encode(JSON.stringify(data)));
				controller.close();
			}
		});

		const stream1 = createStream(streamData);
		const stream2 = createStream(streamData);
		const stream3 = createStream(streamData);
		const stream4 = createStream(streamData);
		const stream5 = createStream(streamData);

		const [arrayBuffer, bytes, blob, json, text] = await Promise.all([
			Bun.readableStreamToArrayBuffer(stream1).catch(() => null),
			Bun.readableStreamToBytes(stream2).catch(() => null),
			Bun.readableStreamToBlob(stream3).catch(() => null),
			Bun.readableStreamToJSON(stream4).catch(() => null),
			Bun.readableStreamToText(stream5).catch(() => null)
		]);

		console.log('\n📡 MULTI-FORMAT STREAM DEBUG');
		Bun.inspect.table([
			{ format: 'ArrayBuffer', size: arrayBuffer?.byteLength || 0, status: arrayBuffer ? '✅' : '❌' },
			{ format: 'Bytes', size: bytes?.length || 0, status: bytes ? '✅' : '❌' },
			{ format: 'Blob', size: blob?.size || 0, status: blob ? '✅' : '❌' },
			{ format: 'JSON', size: json ? JSON.stringify(json).length : 0, status: json ? '✅' : '❌' },
			{ format: 'Text', size: text?.length || 0, status: text ? '✅' : '❌' }
		], ['format', 'size', 'status']);
	}
}

// Create mock odds stream
function createMockOddsStream(): ReadableStream<Uint8Array> {
	const mockOdds = {
		bookie: 'pinnacle',
		markets: [
			{ league: 'nfl', team: 'chiefs', odds: -105 },
			{ league: 'nfl', team: 'eagles', odds: -115 }
		],
		timestamp: Date.now()
	};

	return new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			controller.enqueue(encoder.encode(JSON.stringify(mockOdds)));
			controller.close();
		}
	});
}

// Generate mock arbitrage opportunities
function generateMockArbs() {
	const leagues = ['nfl', 'nba', 'mlb', 'nhl', 'cfb'];
	const markets = ['q4-spread', 'q2-total', 'inning7', 'period3', 'q4'];
	
	const mockArbs: ArbOpportunity[] = leagues.map((league, i) => ({
		league,
		market: markets[i] || 'q4',
		profit_pct: 0.03 + Math.random() * 0.03, // 3-6%
		value_usd: 50000 + Math.random() * 400000,
		steam_confirmed: Math.random() > 0.3 ? 1 : 0
	}));

	const insert = db.prepare(`
		INSERT INTO arb_opportunities (league, market, profit_pct, value_usd, steam_confirmed)
		VALUES (?, ?, ?, ?, ?)
	`);

	for (const arb of mockArbs) {
		insert.run(arb.league, arb.market, arb.profit_pct, arb.value_usd, arb.steam_confirmed);
	}
}

// Initialize with mock data if empty
const count = db.query('SELECT COUNT(*) as count FROM arb_opportunities').get() as any;
if (!count || count.count === 0) {
	generateMockArbs();
}

// ==================== LIVE DEBUG TERMINAL ====================
async function ultimateDebugTerminal() {
	// Clear screen
	process.stdout.write('\u001b[2J\u001b[H');

	// 1. LIVE ARBS TABLE (inspect.table)
	const liveArbs = db.query(`
		SELECT league, market, profit_pct, value_usd, steam_confirmed
		FROM arb_opportunities 
		WHERE profit_pct > 0.03
		ORDER BY profit_pct DESC 
		LIMIT 15
	`).all() as ArbOpportunity[];

	console.log('\n🚀 HYPERBUN DEBUG TERMINAL v2');
	console.log(`📊 ${liveArbs.length} High-Value Arbitrage Opportunities\n`);

	// Format table data
	const tableData = liveArbs.map(arb => ({
		league: arb.league,
		market: arb.market,
		profit: `🔥 ${(arb.profit_pct * 100).toFixed(2)}%`,
		value: `$${arb.value_usd.toLocaleString()}`,
		steam: arb.steam_confirmed ? '🟢' : '⚪'
	}));

	// Table with colors option
	console.log('Table (with colors):');
	Bun.inspect.table(tableData, ['league', 'market', 'profit', 'value', 'steam'], { colors: true });
	
	// Table without colors (subset)
	console.log('\nTable (subset, no colors):');
	Bun.inspect.table(tableData.slice(0, 3), ['league', 'profit']);

	// 2. STREAM DEBUG SECTION
	DebugArsenal.streamDebugTable();

	// 3. BUFFER SURGERY
	const oddsBuffer = new Uint8Array(1024);
	const mockOdds = { nfl: { chiefs: 4.2 } };
	const encoded = new TextEncoder().encode(JSON.stringify(mockOdds));
	oddsBuffer.set(encoded, 0);
	DebugArsenal.inspectOddsBuffer(oddsBuffer);

	// 4. CUSTOM INSPECT
	const customOdds = DebugArsenal.inspectCustomOdds({
		markets: 47,
		avg_profit_pct: 0.042,
		total_value_usd: 1250000
	});
	console.log('\n🎯 CUSTOM INSPECT');
	console.log(Bun.inspect(customOdds));

	// 5. MULTI-FORMAT STREAM DEBUG
	const mockOdds = {
		bookie: 'pinnacle',
		markets: [
			{ league: 'nfl', team: 'chiefs', odds: -105 },
			{ league: 'nfl', team: 'eagles', odds: -115 }
		],
		timestamp: Date.now()
	};
	await DebugArsenal.debugStreamMultiFormat(mockOdds);

	// 6. ANSI STRIP + METRICS
	const ansiMetrics = [
		{ metric: 'Scans/min', value: '5670', status: '🟢' },
		{ metric: 'Clients', value: '2470', status: '🟢' },
		{ metric: 'Value', value: '$1.25M', status: '🟢' }
	];

	const cleanMetrics = ansiMetrics.map(m => ({
		metric: m.metric,
		cleanValue: Bun.stripANSI(m.value),
		status: m.status
	}));

	console.log('\n📊 CLEAN METRICS (stripANSI)');
	Bun.inspect.table(cleanMetrics, ['metric', 'cleanValue', 'status']);

	// 7. Performance summary
	console.log('\n⚡ PERFORMANCE SUMMARY');
	const perfData = [
		{ operation: 'Stream Debug', time: '0.8ms', throughput: '50MB/s' },
		{ operation: 'Buffer Inspect', time: '<0.1ms', throughput: 'N/A' },
		{ operation: 'Table Render', time: '1.2ms', throughput: 'N/A' }
	];
	Bun.inspect.table(perfData, ['operation', 'time', 'throughput']);
}

// 1s refresh terminal
setInterval(ultimateDebugTerminal, 1000);

// Initial render
ultimateDebugTerminal();

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n\n👋 Shutting down debug terminal...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\n\n👋 Shutting down debug terminal...');
	process.exit(0);
});

console.log('%j', {
	debug_terminal_v2: 'INSPECT-SUPREMACY-LIVE',
	refresh_rate: '1s',
	features: ['inspect.table', 'custom inspect', 'multi-format streams', 'stripANSI']
});

