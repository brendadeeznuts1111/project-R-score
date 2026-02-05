#!/usr/bin/env bun

/**
 * NBA Arbitrage Demo Data Generator
 * Creates sample NBA arbitrage opportunities for demonstration
 */

import { OrcaArbitrageStorage } from "../src/orca/arbitrage/storage";
import type { OrcaArbitrageOpportunity } from "../src/orca/arbitrage/types";

async function createNBADemoData() {
	console.log("🏀 Creating NBA arbitrage demo data...");

	const storage = new OrcaArbitrageStorage();

	// Sample NBA games with arbitrage opportunities
	const nbaOpportunities: Omit<OrcaArbitrageOpportunity, 'id' | 'detectedAt' | 'updatedAt'>[] = [
		{
			eventId: "nba-2025-12-06-lakers-warriors",
			eventName: "Los Angeles Lakers vs Golden State Warriors",
			sport: "NBA",
			eventDate: "2025-12-06T22:00:00Z",
			marketType: "moneyline",
			outcomeType: "home",
			bookmakerA: {
				bookmaker: "pinnacle",
				bookType: "sharp",
				odds: 1.85,
				stake: 1000,
				maxStake: 50000,
			},
			bookmakerB: {
				bookmaker: "circa",
				bookType: "sharp",
				odds: 2.05,
				stake: 1000,
				maxStake: 25000,
			},
			edge: 0.032, // 3.2% edge
			tensionScore: 0.85,
			status: "live",
			confidence: 0.95,
			metadata: {
				homeTeam: "Los Angeles Lakers",
				awayTeam: "Golden State Warriors",
				league: "NBA",
				season: "2025-26",
			},
		},
		{
			eventId: "nba-2025-12-06-celtics-heat",
			eventName: "Boston Celtics vs Miami Heat",
			sport: "NBA",
			eventDate: "2025-12-06T19:30:00Z",
			marketType: "spread",
			outcomeType: "home",
			bookmakerA: {
				bookmaker: "ps3838",
				bookType: "sharp",
				odds: 1.92,
				stake: 500,
				maxStake: 100000,
			},
			bookmakerB: {
				bookmaker: "pinnacle",
				bookType: "sharp",
				odds: 1.98,
				stake: 500,
				maxStake: 75000,
			},
			edge: 0.025, // 2.5% edge
			tensionScore: 0.78,
			status: "live",
			confidence: 0.92,
			metadata: {
				homeTeam: "Boston Celtics",
				awayTeam: "Miami Heat",
				spread: -4.5,
				league: "NBA",
				season: "2025-26",
			},
		},
		{
			eventId: "nba-2025-12-07-nuggets-clippers",
			eventName: "Denver Nuggets vs LA Clippers",
			sport: "NBA",
			eventDate: "2025-12-07T21:00:00Z",
			marketType: "total",
			outcomeType: "over",
			bookmakerA: {
				bookmaker: "bookmaker",
				bookType: "sharp",
				odds: 1.88,
				stake: 750,
				maxStake: 30000,
			},
			bookmakerB: {
				bookmaker: "betcris",
				bookType: "sharp",
				odds: 2.02,
				stake: 750,
				maxStake: 20000,
			},
			edge: 0.041, // 4.1% edge
			tensionScore: 0.91,
			status: "detected",
			confidence: 0.88,
			metadata: {
				homeTeam: "Denver Nuggets",
				awayTeam: "LA Clippers",
				total: 225.5,
				league: "NBA",
				season: "2025-26",
			},
		},
	];

	// Store the opportunities
	for (const opp of nbaOpportunities) {
		try {
			await storage.storeOpportunity(opp);
			console.log(`✅ Stored NBA opportunity: ${opp.eventName} (${(opp.edge * 100).toFixed(1)}% edge)`);
		} catch (error) {
			console.error(`❌ Failed to store ${opp.eventName}:`, error);
		}
	}

	// Query and display stored opportunities
	const stored = storage.queryOpportunities({
		filter: { sport: "NBA" },
		limit: 10,
	});

	console.log(`\n📊 Stored NBA arbitrage opportunities: ${stored.length}`);
	stored.forEach((opp, i) => {
		console.log(`${i + 1}. ${opp.eventName}`);
		console.log(`   Edge: ${(opp.edge * 100).toFixed(1)}% | Status: ${opp.status}`);
		console.log(`   Books: ${opp.bookmakerA.bookmaker} vs ${opp.bookmakerB.bookmaker}`);
		console.log(`   Odds: ${opp.bookmakerA.odds} / ${opp.bookmakerB.odds}`);
		console.log("");
	});

	console.log("🎯 NBA arbitrage demo data created successfully!");
}

createNBADemoData().catch(console.error);