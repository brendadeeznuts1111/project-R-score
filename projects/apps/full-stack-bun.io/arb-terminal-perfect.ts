#!/usr/bin/env bun
/**
 * [TERMINAL-PERFECT][STRINGWIDTH][ANSI-AWARE][60FPS]
 * Arbitrage Terminal - Perfect ANSI Table Alignment
 */

import { Database } from 'bun:sqlite';
import { MLGSGraph } from './src/graph/MLGSGraph';

// ANSI color codes
const ANSI = {
	reset: '\u001b[0m',
	bold: '\u001b[1m',
	red: '\u001b[31m',
	green: '\u001b[32m',
	yellow: '\u001b[33m',
	blue: '\u001b[34m',
	magenta: '\u001b[35m',
	cyan: '\u001b[36m',
	gray: '\u001b[90m',
};

// Database setup
const dataDir = './data';
try {
	Bun.mkdir(dataDir, { recursive: true });
} catch {}

const dbPath = process.env.DB_PATH || `${dataDir}/terminal-arb.db`;
const mlgsPath = process.env.MLGS_PATH || `${dataDir}/mlgs-terminal.db`;

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
		execute_now INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_profit ON arb_opportunities(profit_pct DESC);
	CREATE INDEX IF NOT EXISTS idx_created ON arb_opportunities(created_at DESC);
`);

// Type definitions
interface ArbOpportunity {
	id?: number;
	league: string;
	market: string;
	profit_pct: number;
	value_usd: number;
	execute?: boolean;
	execute_now?: number;
	created_at?: string;
}

interface TableRow {
	rank: string;
	league: string;
	profit: string;
	value: string;
	status: string;
}

// ANSI-aware padding helper
function padToWidth(str: string, targetWidth: number): string {
	const width = Bun.stringWidth(str);
	const padding = Math.max(0, targetWidth - width);
	return str + ' '.repeat(padding);
}

// ANSI-aware table formatter
function formatArbTableRow(arb: ArbOpportunity, rank: number): TableRow {
	const profitColor = arb.profit_pct > 0.05 
		? ANSI.red 
		: arb.profit_pct > 0.04 
		? ANSI.yellow 
		: ANSI.green;
	
	const profitStr = `${profitColor}${(arb.profit_pct * 100).toFixed(2)}%${ANSI.reset}`;
	const status = arb.execute_now || arb.execute
		? `${ANSI.green}EXEC${ANSI.reset}` 
		: `${ANSI.gray}WAIT${ANSI.reset}`;
	
	return {
		rank: String(rank).padStart(2),
		league: arb.league,
		profit: profitStr,
		value: `$${arb.value_usd.toLocaleString()}`,
		status: status
	};
}

// Create progress bar with ANSI colors
function createProgressBar(value: number, width: number): string {
	const filled = Math.floor(Math.min(value, 100) / 100 * width);
	const empty = width - filled;
	
	let color = ANSI.green;
	if (value >= 5) color = ANSI.green;
	else if (value >= 4) color = ANSI.yellow;
	else color = ANSI.red;
	
	return `${color}${'█'.repeat(filled)}${ANSI.gray}${'░'.repeat(empty)}${ANSI.reset}`;
}

// Display perfect terminal table
async function displayPerfectTerminal() {
	try {
		const liveArbs = db.query(`
			SELECT league, market, profit_pct, value_usd, execute_now
			FROM arb_opportunities 
			WHERE profit_pct > 0.025
			ORDER BY profit_pct DESC 
			LIMIT 10
		`).all() as ArbOpportunity[];

		// Clear screen
		process.stdout.write('\u001b[2J\u001b[H');

		// Header
		console.log(`\n${ANSI.bold}${ANSI.cyan}🚀 HYPERBUN ARBITRAGE TERMINAL${ANSI.reset}`);
		
		const totalValue = liveArbs.reduce((sum, arb) => sum + (arb.value_usd || 0), 0);
		console.log(`📊 ${ANSI.cyan}Scans: 5,670/min | Value: $${totalValue.toLocaleString()}${ANSI.reset}\n`);

		if (liveArbs.length === 0) {
			console.log(`${ANSI.gray}No arbitrage opportunities found.${ANSI.reset}\n`);
			return;
		}

		// Format table rows
		const tableRows = liveArbs.map((arb, i) => formatArbTableRow(arb, i + 1));

		// Calculate max widths using Bun.stringWidth() for ANSI-aware width
		const maxWidths = {
			rank: Math.max(4, ...tableRows.map(r => Bun.stringWidth(r.rank))),
			league: Math.max(6, ...tableRows.map(r => Bun.stringWidth(r.league))),
			profit: Math.max(6, ...tableRows.map(r => Bun.stringWidth(r.profit))),
			value: Math.max(5, ...tableRows.map(r => Bun.stringWidth(r.value))),
			status: Math.max(5, ...tableRows.map(r => Bun.stringWidth(r.status)))
		};

		// Calculate total table width
		const separatorWidth = 3; // " │ " between columns
		const totalWidth = maxWidths.rank + maxWidths.league + maxWidths.profit + 
			maxWidths.value + maxWidths.status + (separatorWidth * 4);

		// Header separator
		console.log('═'.repeat(totalWidth));

		
		// Header row (perfectly aligned using ANSI-aware padding)
		const headerRow = [
			padToWidth('Rank', maxWidths.rank),
			padToWidth('League', maxWidths.league),
			padToWidth('Profit', maxWidths.profit),
			padToWidth('Value', maxWidths.value),
			padToWidth('Status', maxWidths.status)
		].join(' │ ');
		
		console.log(headerRow);
		console.log('─'.repeat(totalWidth));

		// ANSI-perfect rows (using ANSI-aware padding)
		tableRows.forEach(row => {
			const rowStr = [
				padToWidth(row.rank, maxWidths.rank),
				padToWidth(row.league, maxWidths.league),
				padToWidth(row.profit, maxWidths.profit),
				padToWidth(row.value, maxWidths.value),
				padToWidth(row.status, maxWidths.status)
			].join(' │ ');
			
			console.log(rowStr);
		});

		console.log('═'.repeat(totalWidth));

		// Progress bars (ANSI-aware)
		const progressBars = liveArbs.slice(0, 5).map((arb, i) => ({
			label: `${arb.league} ${arb.market || 'Q' + (i + 4)}`,
			pct: arb.profit_pct * 100,
			bar: createProgressBar(arb.profit_pct * 100, 40)
		}));

		console.log(`\n${ANSI.bold}📈 PROFIT DISTRIBUTION${ANSI.reset}`);
		progressBars.forEach(({ label, pct, bar }) => {
			const paddedLabel = padToWidth(label, 12);
			console.log(`${paddedLabel} ${bar} ${pct.toFixed(1)}%`);
		});

	} catch (error) {
		console.error('%j', { terminal_error: error });
	}
}

// Display progress metrics
async function displayProgressMetrics() {
	try {
		const metrics = db.query(`
			SELECT 
				COUNT(*) as total_scans,
				AVG(profit_pct) * 100 as avg_profit,
				SUM(value_usd) as total_value,
				COUNT(CASE WHEN profit_pct > 0.05 THEN 1 END) as high_value
			FROM arb_opportunities 
			WHERE created_at > datetime('now', '-1 hour')
		`).get() as any;

		const totalScans = metrics?.total_scans || 0;
		const avgProfit = metrics?.avg_profit || 0;
		const totalValue = metrics?.total_value || 0;
		const highValue = metrics?.high_value || 0;

		const scanProgress = Math.min((totalScans / 6000) * 100, 100);
		const profitProgress = Math.min((avgProfit / 5) * 100, 100);
		const valueProgress = Math.min((totalValue / 1e6) * 100, 100);
		const highValueProgress = Math.min((highValue / 10) * 100, 100);

		console.log(`\n${ANSI.bold}⚙️  LIVE METRICS${ANSI.reset}`);
		console.log(`Scans: ${createProgressBar(scanProgress, 30)} ${totalScans}/min`);
		console.log(`Profit: ${createProgressBar(profitProgress, 30)} ${avgProfit.toFixed(2)}%`);
		console.log(`Value:  ${createProgressBar(valueProgress, 30)} $${(totalValue / 1000).toLocaleString()}K`);
		console.log(`High$:  ${createProgressBar(highValueProgress, 30)} ${highValue}`);
	} catch (error) {
		console.error('%j', { metrics_error: error });
	}
}

// Generate mock arbitrage opportunities for demo
async function generateMockArbs() {
	const leagues = ['NFL', 'NBA', 'MLB', 'NHL', 'CFB'];
	const markets = ['Q4', 'Q2', 'Inning7', 'Period3', 'Q4'];
	
	const mockArbs: ArbOpportunity[] = leagues.map((league, i) => ({
		league,
		market: markets[i] || 'Q4',
		profit_pct: 0.03 + Math.random() * 0.03, // 3-6%
		value_usd: 50000 + Math.random() * 400000,
		execute_now: Math.random() > 0.5 ? 1 : 0
	}));

	// Insert mock data
	const insert = db.prepare(`
		INSERT INTO arb_opportunities (league, market, profit_pct, value_usd, execute_now)
		VALUES (?, ?, ?, ?, ?)
	`);

	for (const arb of mockArbs) {
		insert.run(arb.league, arb.market, arb.profit_pct, arb.value_usd, arb.execute_now);
	}
}

// Initialize with mock data if table is empty
const count = db.query('SELECT COUNT(*) as count FROM arb_opportunities').get() as any;
if (!count || count.count === 0) {
	await generateMockArbs();
}

// 60fps terminal refresh (16ms = ~60fps)
let frameCount = 0;
setInterval(async () => {
	await displayPerfectTerminal();
	frameCount++;
	
	// Update metrics every 6 frames (10fps)
	if (frameCount % 6 === 0) {
		await displayProgressMetrics();
	}
}, 16); // ~60fps

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log(`\n${ANSI.cyan}Shutting down terminal...${ANSI.reset}`);
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log(`\n${ANSI.cyan}Shutting down terminal...${ANSI.reset}`);
	process.exit(0);
});

console.log('%j', {
	terminal_perfect: 'ANSI-AWARE-LIVE',
	stringWidth: 'enabled',
	refresh_rate: '60fps',
	metrics_rate: '10fps'
});

