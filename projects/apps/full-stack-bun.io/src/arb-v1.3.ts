#!/usr/bin/env bun
/**
 * [ARB-V1.3][STANDALONE][BUN-1.3.6+]
 * Standalone Arbitrage Engine v1.3
 * 
 * Features:
 * - Standalone binary compilation ready
 * - No autoload dependencies
 * - Optimized for Bun 1.3.6+
 */

import { Database } from "bun:sqlite";

// ==================== STANDALONE DB ====================
const dbPath = process.env.DB_PATH || './data/arb-v1.3.db';

// Ensure data directory exists
try {
	Bun.mkdir('./data', { recursive: true });
} catch {
	// Directory may already exist
}

const db = new Database(dbPath, {
	create: true,
	readwrite: true,
	strict: true,
	wal: true
});

// ==================== INITIALIZE SCHEMA ====================
db.exec(`
	CREATE TABLE IF NOT EXISTS opportunities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		market TEXT NOT NULL,
		bookie1 TEXT NOT NULL,
		bookie2 TEXT NOT NULL,
		odds1 REAL NOT NULL,
		odds2 REAL NOT NULL,
		profit REAL NOT NULL,
		timestamp INTEGER NOT NULL
	);
	
	CREATE INDEX IF NOT EXISTS idx_timestamp ON opportunities(timestamp);
	CREATE INDEX IF NOT EXISTS idx_profit ON opportunities(profit DESC);
`);

// ==================== ARBITRAGE DETECTOR ====================
interface Opportunity {
	market: string;
	bookie1: string;
	bookie2: string;
	odds1: number;
	odds2: number;
	profit: number;
}

function calculateArbitrage(odds1: number, odds2: number): number | null {
	// Calculate implied probabilities
	const prob1 = 1 / odds1;
	const prob2 = 1 / odds2;
	const totalProb = prob1 + prob2;
	
	// Arbitrage exists if total probability < 1
	if (totalProb < 1) {
		const profit = (1 - totalProb) * 100;
		return profit;
	}
	
	return null;
}

function detectOpportunities(markets: Array<{ market: string; bookie: string; odds: number }>): Opportunity[] {
	const opportunities: Opportunity[] = [];
	const marketMap = new Map<string, Array<{ bookie: string; odds: number }>>();
	
	// Group by market
	for (const m of markets) {
		if (!marketMap.has(m.market)) {
			marketMap.set(m.market, []);
		}
		marketMap.get(m.market)!.push({ bookie: m.bookie, odds: m.odds });
	}
	
	// Find arbitrage opportunities
	for (const [market, bookies] of marketMap.entries()) {
		for (let i = 0; i < bookies.length; i++) {
			for (let j = i + 1; j < bookies.length; j++) {
				const profit = calculateArbitrage(bookies[i].odds, bookies[j].odds);
				if (profit && profit > 0.5) { // Minimum 0.5% profit
					opportunities.push({
						market,
						bookie1: bookies[i].bookie,
						bookie2: bookies[j].bookie,
						odds1: bookies[i].odds,
						odds2: bookies[j].odds,
						profit
					});
				}
			}
		}
	}
	
	return opportunities;
}

// ==================== MAIN ENGINE ====================
async function main() {
	console.log('🚀 Arbitrage Engine v1.3 - Standalone Build');
	console.log(`📊 Database: ${dbPath}`);
	
	// Example: Process sample markets
	const sampleMarkets = [
		{ market: 'Lakers-Celtics', bookie: 'pinnacle', odds: 1.95 },
		{ market: 'Lakers-Celtics', bookie: 'draftkings', odds: 2.05 },
		{ market: 'Warriors-Kings', bookie: 'pinnacle', odds: 1.90 },
		{ market: 'Warriors-Kings', bookie: 'betfair', odds: 1.98 },
	];
	
	const opportunities = detectOpportunities(sampleMarkets);
	
	console.log(`\n✅ Found ${opportunities.length} arbitrage opportunities:`);
	
	for (const opp of opportunities) {
		console.log(`\n💰 ${opp.market}`);
		console.log(`   ${opp.bookie1}: ${opp.odds1.toFixed(2)}`);
		console.log(`   ${opp.bookie2}: ${opp.odds2.toFixed(2)}`);
		console.log(`   Profit: ${opp.profit.toFixed(2)}%`);
		
		// Store in database
		db.prepare(`
			INSERT INTO opportunities (market, bookie1, bookie2, odds1, odds2, profit, timestamp)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`).run(
			opp.market,
			opp.bookie1,
			opp.bookie2,
			opp.odds1,
			opp.odds2,
			opp.profit,
			Date.now()
		);
	}
	
	console.log('\n✅ Standalone arbitrage engine ready!');
	console.log('📦 Build with: bun build --compile --no-autoload-* src/arb-v1.3.ts --outfile arb-v1.3');
}

if (import.meta.main) {
	main().catch(console.error);
}

