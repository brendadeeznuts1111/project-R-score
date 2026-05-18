#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - MARKET CORRELATION ANALYTICS 📊
 * 
 * Multi-phase odds correlation analysis:
 * - Last hour to tip-off movements
 * - Post-lineup announcement impact
 * - Asia overnight session (before US wakes)
 * - Cross-market correlation tracking
 * 
 * Index = 100 × (Prob_FIRST - Prob_LAST) / ((Prob_FIRST + Prob_LAST) / 2)
 * 
 * Usage:
 *   bun run examples/market-correlation-demo.ts
 */

// =============================================================================
// Types & Interfaces
// =============================================================================
interface OddsSnapshot {
	timestamp: number;
	odds: number;
	prob: number;
	volume?: number;
	source?: string;
}

interface MarketPhase {
	name: string;
	start: number;
	end: number;
	snapshots: OddsSnapshot[];
}

interface LineupEvent {
	timestamp: number;
	type: "injury" | "rest" | "return" | "starter";
	player: string;
	team: string;
	impact: "high" | "medium" | "low";
}

interface MarketData {
	game: string;
	tipoff: number;
	market: string;
	bookie: string;
	phases: {
		asiaOpen: MarketPhase;
		usOpen: MarketPhase;
		lineupAnnounced: MarketPhase;
		lastHour: MarketPhase;
	};
	lineupEvents: LineupEvent[];
	currentOdds: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

// Odds to implied probability
function oddsToProb(odds: number): number {
	return 1 / odds;
}

// Calculate movement index
function calcIndex(probFirst: number, probLast: number): number {
	const avg = (probFirst + probLast) / 2;
	return avg === 0 ? 0 : 100 * (probFirst - probLast) / avg;
}

// Calculate phase index from snapshots
function calcPhaseIndex(phase: MarketPhase): number {
	if (phase.snapshots.length < 2) return 0;
	const first = phase.snapshots[0].prob;
	const last = phase.snapshots[phase.snapshots.length - 1].prob;
	return calcIndex(first, last);
}

// Calculate correlation between two phases
function calcCorrelation(phase1: MarketPhase, phase2: MarketPhase): number {
	if (phase1.snapshots.length < 2 || phase2.snapshots.length < 2) return 0;
	
	const idx1 = calcPhaseIndex(phase1);
	const idx2 = calcPhaseIndex(phase2);
	
	// Simplified correlation: same direction = positive, opposite = negative
	if (Math.abs(idx1) < 1 || Math.abs(idx2) < 1) return 0;
	
	const sameDirection = (idx1 > 0 && idx2 > 0) || (idx1 < 0 && idx2 < 0);
	const magnitude = Math.min(Math.abs(idx1), Math.abs(idx2)) / Math.max(Math.abs(idx1), Math.abs(idx2));
	
	return sameDirection ? magnitude : -magnitude;
}

// Format time
function formatTime(ts: number): string {
	return new Date(ts).toLocaleTimeString("en-US", { 
		hour: "2-digit", 
		minute: "2-digit",
		hour12: true 
	});
}

function formatTimeZone(ts: number, tz: string): string {
	return new Date(ts).toLocaleTimeString("en-US", { 
		hour: "2-digit", 
		minute: "2-digit",
		hour12: true,
		timeZone: tz
	});
}

function timeAgo(ms: number): string {
	const mins = Math.floor(ms / 60000);
	if (mins < 60) return `${mins}m`;
	const hrs = Math.floor(mins / 60);
	return `${hrs}h ${mins % 60}m`;
}

// =============================================================================
// Generate Sample Market Data
// =============================================================================
function generateMarketData(): MarketData[] {
	const now = Date.now();
	const tipoff = now + 45 * 60000; // 45 mins from now
	
	// Time phases
	const asiaOpenStart = now - 14 * 3600000;  // 14 hours ago (Asia morning)
	const usOpenStart = now - 6 * 3600000;     // 6 hours ago (US morning)
	const lineupTime = now - 90 * 60000;       // 90 mins ago
	const lastHourStart = now - 60 * 60000;    // 1 hour ago
	
	const markets: MarketData[] = [
		{
			game: "LAL @ BOS",
			tipoff,
			market: "Moneyline",
			bookie: "Pinnacle",
			phases: {
				asiaOpen: {
					name: "Asia Open",
					start: asiaOpenStart,
					end: usOpenStart,
					snapshots: [
						{ timestamp: asiaOpenStart, odds: 2.25, prob: oddsToProb(2.25) },
						{ timestamp: asiaOpenStart + 2 * 3600000, odds: 2.20, prob: oddsToProb(2.20) },
						{ timestamp: asiaOpenStart + 5 * 3600000, odds: 2.15, prob: oddsToProb(2.15) },
						{ timestamp: usOpenStart, odds: 2.10, prob: oddsToProb(2.10) },
					]
				},
				usOpen: {
					name: "US Open",
					start: usOpenStart,
					end: lineupTime,
					snapshots: [
						{ timestamp: usOpenStart, odds: 2.10, prob: oddsToProb(2.10) },
						{ timestamp: usOpenStart + 2 * 3600000, odds: 2.05, prob: oddsToProb(2.05) },
						{ timestamp: lineupTime, odds: 2.00, prob: oddsToProb(2.00) },
					]
				},
				lineupAnnounced: {
					name: "Post-Lineup",
					start: lineupTime,
					end: lastHourStart,
					snapshots: [
						{ timestamp: lineupTime, odds: 2.00, prob: oddsToProb(2.00) },
						{ timestamp: lineupTime + 10 * 60000, odds: 1.95, prob: oddsToProb(1.95) },
						{ timestamp: lineupTime + 20 * 60000, odds: 1.92, prob: oddsToProb(1.92) },
						{ timestamp: lastHourStart, odds: 1.94, prob: oddsToProb(1.94) },
					]
				},
				lastHour: {
					name: "Last Hour",
					start: lastHourStart,
					end: now,
					snapshots: [
						{ timestamp: lastHourStart, odds: 1.94, prob: oddsToProb(1.94) },
						{ timestamp: lastHourStart + 15 * 60000, odds: 1.92, prob: oddsToProb(1.92) },
						{ timestamp: lastHourStart + 30 * 60000, odds: 1.90, prob: oddsToProb(1.90) },
						{ timestamp: lastHourStart + 45 * 60000, odds: 1.88, prob: oddsToProb(1.88) },
						{ timestamp: now, odds: 1.87, prob: oddsToProb(1.87) },
					]
				}
			},
			lineupEvents: [
				{ timestamp: lineupTime, type: "starter", player: "A. Davis", team: "LAL", impact: "high" },
				{ timestamp: lineupTime + 5 * 60000, type: "rest", player: "K. Porzingis", team: "BOS", impact: "medium" }
			],
			currentOdds: 1.87
		},
		{
			game: "DEN @ MIA",
			tipoff: tipoff + 2.5 * 3600000, // 2.5 hours later
			market: "Spread -4.5",
			bookie: "Pinnacle",
			phases: {
				asiaOpen: {
					name: "Asia Open",
					start: asiaOpenStart,
					end: usOpenStart,
					snapshots: [
						{ timestamp: asiaOpenStart, odds: 1.95, prob: oddsToProb(1.95) },
						{ timestamp: usOpenStart, odds: 1.92, prob: oddsToProb(1.92) },
					]
				},
				usOpen: {
					name: "US Open",
					start: usOpenStart,
					end: lineupTime,
					snapshots: [
						{ timestamp: usOpenStart, odds: 1.92, prob: oddsToProb(1.92) },
						{ timestamp: lineupTime, odds: 1.88, prob: oddsToProb(1.88) },
					]
				},
				lineupAnnounced: {
					name: "Post-Lineup",
					start: lineupTime,
					end: lastHourStart,
					snapshots: [
						{ timestamp: lineupTime, odds: 1.88, prob: oddsToProb(1.88) },
						{ timestamp: lastHourStart, odds: 1.91, prob: oddsToProb(1.91) },
					]
				},
				lastHour: {
					name: "Last Hour",
					start: lastHourStart,
					end: now,
					snapshots: [
						{ timestamp: lastHourStart, odds: 1.91, prob: oddsToProb(1.91) },
						{ timestamp: now, odds: 1.90, prob: oddsToProb(1.90) },
					]
				}
			},
			lineupEvents: [
				{ timestamp: lineupTime, type: "return", player: "J. Butler", team: "MIA", impact: "high" }
			],
			currentOdds: 1.90
		},
		{
			game: "GSW @ PHX",
			tipoff: tipoff + 5 * 3600000, // 5 hours later
			market: "Total O/U 228.5",
			bookie: "DraftKings",
			phases: {
				asiaOpen: {
					name: "Asia Open",
					start: asiaOpenStart,
					end: usOpenStart,
					snapshots: [
						{ timestamp: asiaOpenStart, odds: 1.90, prob: oddsToProb(1.90) },
						{ timestamp: usOpenStart, odds: 1.95, prob: oddsToProb(1.95) },
					]
				},
				usOpen: {
					name: "US Open",
					start: usOpenStart,
					end: lineupTime,
					snapshots: [
						{ timestamp: usOpenStart, odds: 1.95, prob: oddsToProb(1.95) },
						{ timestamp: lineupTime, odds: 1.92, prob: oddsToProb(1.92) },
					]
				},
				lineupAnnounced: {
					name: "Post-Lineup",
					start: lineupTime,
					end: lastHourStart,
					snapshots: [
						{ timestamp: lineupTime, odds: 1.92, prob: oddsToProb(1.92) },
						{ timestamp: lastHourStart, odds: 1.88, prob: oddsToProb(1.88) },
					]
				},
				lastHour: {
					name: "Last Hour",
					start: lastHourStart,
					end: now,
					snapshots: [
						{ timestamp: lastHourStart, odds: 1.88, prob: oddsToProb(1.88) },
						{ timestamp: now, odds: 1.85, prob: oddsToProb(1.85) },
					]
				}
			},
			lineupEvents: [
				{ timestamp: lineupTime, type: "injury", player: "D. Booker", team: "PHX", impact: "high" }
			],
			currentOdds: 1.85
		}
	];
	
	return markets;
}

// =============================================================================
// Demo Functions
// =============================================================================

function demoTimeZones() {
	console.info("=".repeat(70));
	console.info("1. 🌏 GLOBAL MARKET SESSIONS - Time Zone Overview");
	console.info("=".repeat(70));
	
	const now = Date.now();
	
	const sessions = [
		{ name: "Asia Open (HKT)", tz: "Asia/Hong_Kong", start: -14, end: -6 },
		{ name: "Europe (GMT)", tz: "Europe/London", start: -8, end: -2 },
		{ name: "US Pre-Market (ET)", tz: "America/New_York", start: -6, end: -1 },
		{ name: "Game Day (ET)", tz: "America/New_York", start: -1, end: 0 },
	];
	
	const sessionTable = sessions.map(s => ({
		session: s.name,
		timezone: s.tz.split("/")[1],
		localNow: formatTimeZone(now, s.tz),
		"window": `${s.start}h to ${s.end}h`
	}));
	
	console.info(`\n📅 Current Time: ${new Date(now).toISOString()}`);
	console.info(Bun.inspect.table(sessionTable));
	
	// Asia overnight impact
	console.info(`\n🌙 Asia Overnight Session (Before US Wakes):`);
	console.info(`   Hong Kong: ${formatTimeZone(now - 14 * 3600000, "Asia/Hong_Kong")} - ${formatTimeZone(now - 6 * 3600000, "Asia/Hong_Kong")}`);
	console.info(`   → Sharp Asian syndicates move lines early`);
	console.info(`   → Look for 3%+ moves before US opens`);
}

function demoPhaseAnalysis(markets: MarketData[]) {
	console.info("\n" + "=".repeat(70));
	console.info("2. 📈 PHASE-BY-PHASE MOVEMENT ANALYSIS");
	console.info("=".repeat(70));
	
	console.info(`\n   Index = 100 × (Prob_FIRST - Prob_LAST) / ((Prob_FIRST + Prob_LAST) / 2)`);
	
	for (const market of markets) {
		const phases = market.phases;
		
		console.info(`\n🏀 ${market.game} | ${market.market} | ${market.bookie}`);
		console.info(`   Tip-off in: ${timeAgo(market.tipoff - Date.now())}`);
		
		const phaseTable = [
			{
				phase: "🌏 Asia Open",
				time: `${formatTimeZone(phases.asiaOpen.start, "Asia/Hong_Kong")} HKT`,
				openOdds: phases.asiaOpen.snapshots[0].odds.toFixed(2),
				closeOdds: phases.asiaOpen.snapshots[phases.asiaOpen.snapshots.length - 1].odds.toFixed(2),
				probMove: `${(phases.asiaOpen.snapshots[0].prob * 100).toFixed(1)}% → ${(phases.asiaOpen.snapshots[phases.asiaOpen.snapshots.length - 1].prob * 100).toFixed(1)}%`,
				index: calcPhaseIndex(phases.asiaOpen).toFixed(2),
				changes: phases.asiaOpen.snapshots.length - 1
			},
			{
				phase: "🇺🇸 US Open",
				time: `${formatTimeZone(phases.usOpen.start, "America/New_York")} ET`,
				openOdds: phases.usOpen.snapshots[0].odds.toFixed(2),
				closeOdds: phases.usOpen.snapshots[phases.usOpen.snapshots.length - 1].odds.toFixed(2),
				probMove: `${(phases.usOpen.snapshots[0].prob * 100).toFixed(1)}% → ${(phases.usOpen.snapshots[phases.usOpen.snapshots.length - 1].prob * 100).toFixed(1)}%`,
				index: calcPhaseIndex(phases.usOpen).toFixed(2),
				changes: phases.usOpen.snapshots.length - 1
			},
			{
				phase: "📋 Post-Lineup",
				time: `${formatTime(phases.lineupAnnounced.start)}`,
				openOdds: phases.lineupAnnounced.snapshots[0].odds.toFixed(2),
				closeOdds: phases.lineupAnnounced.snapshots[phases.lineupAnnounced.snapshots.length - 1].odds.toFixed(2),
				probMove: `${(phases.lineupAnnounced.snapshots[0].prob * 100).toFixed(1)}% → ${(phases.lineupAnnounced.snapshots[phases.lineupAnnounced.snapshots.length - 1].prob * 100).toFixed(1)}%`,
				index: calcPhaseIndex(phases.lineupAnnounced).toFixed(2),
				changes: phases.lineupAnnounced.snapshots.length - 1
			},
			{
				phase: "⏰ Last Hour",
				time: `${formatTime(phases.lastHour.start)}`,
				openOdds: phases.lastHour.snapshots[0].odds.toFixed(2),
				closeOdds: phases.lastHour.snapshots[phases.lastHour.snapshots.length - 1].odds.toFixed(2),
				probMove: `${(phases.lastHour.snapshots[0].prob * 100).toFixed(1)}% → ${(phases.lastHour.snapshots[phases.lastHour.snapshots.length - 1].prob * 100).toFixed(1)}%`,
				index: calcPhaseIndex(phases.lastHour).toFixed(2),
				changes: phases.lastHour.snapshots.length - 1
			}
		];
		
		console.info(Bun.inspect.table(phaseTable));
	}
}

function demoLineupImpact(markets: MarketData[]) {
	console.info("\n" + "=".repeat(70));
	console.info("3. 📋 LINEUP ANNOUNCEMENT IMPACT");
	console.info("=".repeat(70));
	
	const allEvents: any[] = [];
	
	for (const market of markets) {
		const preLineup = market.phases.usOpen.snapshots[market.phases.usOpen.snapshots.length - 1];
		const postLineup = market.phases.lineupAnnounced.snapshots[market.phases.lineupAnnounced.snapshots.length - 1];
		
		const lineupIndex = calcIndex(preLineup.prob, postLineup.prob);
		
		for (const event of market.lineupEvents) {
			allEvents.push({
				"⚡": event.impact === "high" ? "🔴" : event.impact === "medium" ? "🟡" : "🟢",
				game: market.game,
				type: event.type.toUpperCase(),
				player: event.player,
				team: event.team,
				preOdds: preLineup.odds.toFixed(2),
				postOdds: postLineup.odds.toFixed(2),
				index: lineupIndex.toFixed(2),
				signal: Math.abs(lineupIndex) > 3 ? "SHARP" : "NORMAL"
			});
		}
	}
	
	console.info(`\n📋 Lineup News Impact on Odds:`);
	console.info(Bun.inspect.table(allEvents));
	
	// Impact interpretation
	console.info(`\n📊 Impact Guide:`);
	console.info(`   🔴 HIGH   = Star player (>15 PPG or All-Star)`);
	console.info(`   🟡 MEDIUM = Key rotation player`);
	console.info(`   🟢 LOW    = Bench player`);
	console.info(`\n   SHARP signal = |Index| > 3 within 30 mins of announcement`);
}

function demoCorrelationMatrix(markets: MarketData[]) {
	console.info("\n" + "=".repeat(70));
	console.info("4. 🔗 CROSS-PHASE CORRELATION ANALYSIS");
	console.info("=".repeat(70));
	
	console.info(`\n📊 Do Asia moves predict US moves? Does lineup news correlate with last hour?`);
	
	for (const market of markets) {
		const phases = market.phases;
		
		// Calculate correlations
		const asiaToUs = calcCorrelation(phases.asiaOpen, phases.usOpen);
		const usToLineup = calcCorrelation(phases.usOpen, phases.lineupAnnounced);
		const lineupToLastHr = calcCorrelation(phases.lineupAnnounced, phases.lastHour);
		const asiaToLastHr = calcCorrelation(phases.asiaOpen, phases.lastHour);
		
		console.info(`\n🏀 ${market.game} | ${market.market}`);
		
		const corrTable = [
			{ comparison: "Asia → US Open", correlation: asiaToUs.toFixed(2), signal: asiaToUs > 0.5 ? "✅ ALIGNED" : asiaToUs < -0.5 ? "⚠️ REVERSED" : "➖ WEAK" },
			{ comparison: "US → Post-Lineup", correlation: usToLineup.toFixed(2), signal: usToLineup > 0.5 ? "✅ ALIGNED" : usToLineup < -0.5 ? "⚠️ REVERSED" : "➖ WEAK" },
			{ comparison: "Lineup → Last Hour", correlation: lineupToLastHr.toFixed(2), signal: lineupToLastHr > 0.5 ? "✅ ALIGNED" : lineupToLastHr < -0.5 ? "⚠️ REVERSED" : "➖ WEAK" },
			{ comparison: "Asia → Last Hour", correlation: asiaToLastHr.toFixed(2), signal: asiaToLastHr > 0.5 ? "✅ ALIGNED" : asiaToLastHr < -0.5 ? "⚠️ REVERSED" : "➖ WEAK" }
		];
		
		console.info(Bun.inspect.table(corrTable));
	}
}

function demoLastHourToTip(markets: MarketData[]) {
	console.info("\n" + "=".repeat(70));
	console.info("5. ⏰ LAST HOUR TO TIP-OFF - Sharp Money Detection");
	console.info("=".repeat(70));
	
	const lastHourData = markets.map(m => {
		const lh = m.phases.lastHour;
		const snapshots = lh.snapshots;
		const index = calcPhaseIndex(lh);
		const velocity = snapshots.length > 1 
			? (snapshots[snapshots.length - 1].odds - snapshots[0].odds) / (snapshots.length - 1)
			: 0;
		
		return {
			game: m.game,
			market: m.market,
			tipIn: timeAgo(m.tipoff - Date.now()),
			openOdds: snapshots[0].odds.toFixed(2),
			currOdds: m.currentOdds.toFixed(2),
			"Δ odds": (m.currentOdds - snapshots[0].odds).toFixed(2),
			changes: snapshots.length - 1,
			velocity: velocity.toFixed(3),
			index: index.toFixed(2),
			alert: Math.abs(index) > 5 ? "🚨 STEAM" : Math.abs(index) > 3 ? "⚡ SHARP" : "➖"
		};
	});
	
	console.info(`\n📊 Last Hour Movement Analysis:`);
	console.info(Bun.inspect.table(lastHourData));
	
	// Steam move detection
	const steamMoves = lastHourData.filter(d => d.alert === "🚨 STEAM");
	if (steamMoves.length > 0) {
		console.info(`\n🚨 STEAM MOVE DETECTED!`);
		steamMoves.forEach(m => {
			console.info(`   ${m.game} ${m.market}: Index ${m.index} (${m.changes} changes in last hour)`);
		});
	}
}

function demoAsiaOvernight(markets: MarketData[]) {
	console.info("\n" + "=".repeat(70));
	console.info("6. 🌙 ASIA OVERNIGHT SESSION - Pre-US Analysis");
	console.info("=".repeat(70));
	
	console.info(`\n🌏 Asian syndicates often move lines 6-14 hours before US opening.`);
	console.info(`   Key insight: Track odds from HK/Manila open to US pre-market.`);
	
	const asiaData = markets.map(m => {
		const asia = m.phases.asiaOpen;
		const usOpen = m.phases.usOpen;
		
		const asiaIndex = calcPhaseIndex(asia);
		const usIndex = calcPhaseIndex(usOpen);
		const continuation = asiaIndex !== 0 && usIndex !== 0 
			? ((asiaIndex > 0) === (usIndex > 0) ? "✅ CONTINUED" : "🔄 REVERSED")
			: "➖ N/A";
		
		return {
			game: m.game,
			"🌙 Asia Open": asia.snapshots[0].odds.toFixed(2),
			"🌅 US Open": usOpen.snapshots[0].odds.toFixed(2),
			asiaMove: `${asiaIndex > 0 ? "+" : ""}${asiaIndex.toFixed(2)}`,
			usMove: `${usIndex > 0 ? "+" : ""}${usIndex.toFixed(2)}`,
			continuation,
			"💡": Math.abs(asiaIndex) > 5 ? "Early sharp action!" : ""
		};
	});
	
	console.info(Bun.inspect.table(asiaData));
	
	console.info(`\n💡 Strategy:`);
	console.info(`   • Asia Index > +5: Sharp money backing underdog overnight`);
	console.info(`   • Asia Index < -5: Sharp money backing favorite overnight`);
	console.info(`   • CONTINUED = US market agrees with Asia → Higher confidence`);
	console.info(`   • REVERSED = US market disagrees → Potential value on reversal`);
}

function demoComprehensiveSummary(markets: MarketData[]) {
	console.info("\n" + "=".repeat(70));
	console.info("7. 📊 COMPREHENSIVE MARKET SUMMARY");
	console.info("=".repeat(70));
	
	const summary = markets.map(m => {
		const phases = m.phases;
		const totalIndex = calcIndex(
			phases.asiaOpen.snapshots[0].prob,
			phases.lastHour.snapshots[phases.lastHour.snapshots.length - 1].prob
		);
		
		const lineupImpact = calcPhaseIndex(phases.lineupAnnounced);
		const lastHrIndex = calcPhaseIndex(phases.lastHour);
		
		return {
			game: m.game,
			market: m.market,
			tipIn: timeAgo(m.tipoff - Date.now()),
			openOdds: phases.asiaOpen.snapshots[0].odds.toFixed(2),
			currOdds: m.currentOdds.toFixed(2),
			totalIdx: totalIndex.toFixed(2),
			lineupIdx: lineupImpact.toFixed(2),
			lastHrIdx: lastHrIndex.toFixed(2),
			"🎯": Math.abs(totalIndex) > 10 ? "STRONG" : Math.abs(totalIndex) > 5 ? "MODERATE" : "STABLE"
		};
	});
	
	console.info(`\n📊 Full Game Summary:`);
	console.info(Bun.inspect.table(summary));
	
	// Betting signals
	console.info(`\n🎯 BETTING SIGNALS:`);
	for (const s of summary) {
		const totalIdx = parseFloat(s.totalIdx);
		if (Math.abs(totalIdx) > 5) {
			const direction = totalIdx > 0 ? "📉 DRIFT (value on current side)" : "📈 STEAM (sharp backing this side)";
			console.info(`   ${s.game} ${s.market}: ${direction}`);
			console.info(`      Opening: ${s.openOdds} → Current: ${s.currOdds} (Index: ${s.totalIdx})`);
		}
	}
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	console.info("\n⚡ @dynamic-spy/kit v9.0 - MARKET CORRELATION ANALYTICS 📊\n");
	console.info(`Bun version: ${Bun.version}`);
	console.info(`Analysis time: ${new Date().toISOString()}`);
	
	const markets = generateMarketData();
	
	demoTimeZones();
	demoPhaseAnalysis(markets);
	demoLineupImpact(markets);
	demoCorrelationMatrix(markets);
	demoLastHourToTip(markets);
	demoAsiaOvernight(markets);
	demoComprehensiveSummary(markets);
	
	console.info("\n" + "=".repeat(70));
	console.info("✅ CORRELATION ANALYSIS COMPLETE");
	console.info("=".repeat(70));
	console.info(`
📐 Index Formula:
   Index = 100 × (Prob_FIRST - Prob_LAST) / ((Prob_FIRST + Prob_LAST) / 2)

📊 Phase Windows:
   🌏 Asia Open:    HKT 9AM-5PM (before US wakes)
   🇺🇸 US Open:      ET 9AM-5PM (pre-game)
   📋 Post-Lineup:  ~90 mins before tip
   ⏰ Last Hour:    Final 60 mins to tip

🎯 Key Signals:
   • |Index| > 10: STRONG move (high confidence)
   • |Index| > 5:  MODERATE move (worth tracking)
   • |Index| < 3:  STABLE (no significant action)
   • Correlation > 0.5: Phases ALIGNED (continuation)
   • Correlation < -0.5: Phases REVERSED (potential value)

Industrial market analytics! 🚀
`);
}

if (import.meta.main) {
	main().catch(console.error);
}

