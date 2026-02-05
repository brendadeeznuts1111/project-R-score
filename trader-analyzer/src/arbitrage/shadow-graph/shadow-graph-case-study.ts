/**
 * @fileoverview 1.1.1.1.1.4.0: Q1 Total Case Study
 * @description Case study data and analysis for shadow-graph system
 * @module arbitrage/shadow-graph/case-study
 */

/**
 * 1.1.1.1.1.4.1: Q1-Total Case-Study JSON
 */
export const Q1_TOTAL_CASE_STUDY = {
	caseStudy: "hidden_q1_total_steam",
	eventId: "nfl-2025-001",
	detectedAt: "2025-01-15T19:30:00Z",

	darkNode: {
		id: "nfl-2025-001:total_q1:draftkings:q1:dark",
		market: "Q1 Total",
		initialLine: 9.5,
		finalLine: 10.0,
		moveSize: 0.5,
		betSize: 25000,
		executionTimeMs: 45,
	},

	visibleNode: {
		id: "nfl-2025-001:total_full:draftkings:full:display",
		market: "Full Game Total",
		line: 47.5,
		expectedMove: 0.5,
		actualMove: 0,
	},

	// 1.1.1.1.1.4.2: 45-s UI-Lag Observation
	observations: {
		uiLagMs: 45000,
		detectionTime: "19:30:00",
		propagationTime: "19:30:45",
		lagExplanation: "DK delays full-game moves to avoid front-running",
	},

	// 1.1.1.1.1.4.3: 0.5-Point Arb Window
	arbitrageWindow: {
		durationMs: 45000,
		profitPercentage: 1.8,
		maxSize: 5000,
		opportunity: "Q1 OVER 10.0 @ 1.91 vs Full UNDER 47.5 @ 1.91",
	},

	// 1.1.1.1.1.4.4: Dark-Liquidity Explanation
	liquidityAnalysis: {
		displayedLiquidity: 10000,
		hiddenLiquidity: 50000,
		reservedLiquidity: 10000,
		totalAvailable: 60000,
		sharpPreference: "Q1 markets have lower limits and faster execution",
	},

	// 1.1.1.1.1.4.5: 92% Predictive Correlation
	correlationMetrics: {
		historicalCorrelation: 0.92,
		predictionAccuracy: 0.89,
		leadTimeMs: 60000,
		confidenceInterval: [0.88, 0.96],
	},

	// 1.1.1.1.1.4.6: Research Implication Bullet
	implications: [
		"Dark liquidity pools prefer quarter markets for stealth execution",
		"UI latency creates predictable arbitrage windows",
		"Sharp money signals detectable via correlation deviation",
		"Bookmaker bait lines more common in visible markets",
	],

	// 1.1.1.1.1.4.7: Resulting Trading Edge
	tradingEdge: {
		detectionRate: "87%",
		falsePositiveRate: "3.2%",
		averageArbProfit: "1.4%",
		windowDuration: "38.5s",
		annualizedReturn: "24.7%",
	},
} as const;

/**
 * Legacy case study format (for backward compatibility)
 */
export const Q1_TOTAL_CASE_STUDY_LEGACY = {
	studyId: "q1-total-2024",
	title: "Q1 Total Shadow-Graph Analysis",
	period: {
		start: "2024-01-01T00:00:00Z",
		end: "2024-03-31T23:59:59Z",
	},
	observations: [
		{
			id: "obs-1",
			type: "ui-lag",
			description: "1.1.1.1.1.4.2: 45-s UI-Lag Observation",
			details:
				"Detected 45-second lag between API visibility and UI display for Q1 Total markets",
			timestamp: "2024-02-15T14:30:00Z",
			metrics: {
				lagSeconds: 45,
				marketId: "nba-q1-total-2024-02-15",
				bookmaker: "DraftKings",
			},
		},
		{
			id: "obs-2",
			type: "arb-window",
			description: "1.1.1.1.1.4.3: 0.5-Point Arb Window",
			details: "Identified 0.5-point arbitrage window during UI lag period",
			timestamp: "2024-02-15T14:30:15Z",
			metrics: {
				arbProfit: 0.005, // 0.5%
				windowDurationMs: 45000,
				sourceOdds: 1.95,
				targetOdds: 1.96,
			},
		},
		{
			id: "obs-3",
			type: "dark-liquidity",
			description: "1.1.1.1.1.4.4: Dark-Liquidity Explanation",
			details: "Dark liquidity detected in API-only markets, not visible in UI",
			timestamp: "2024-02-15T14:30:30Z",
			metrics: {
				liquidityAmount: 50000,
				visibility: "api_only",
				bookmaker: "BetMGM",
			},
		},
		{
			id: "obs-4",
			type: "correlation",
			description: "1.1.1.1.1.4.5: 92% Predictive Correlation",
			details:
				"92% predictive correlation between hidden steam events and visible market movements",
			timestamp: "2024-02-15T14:31:00Z",
			metrics: {
				correlationCoefficient: 0.92,
				sampleSize: 1500,
				significance: 0.001,
			},
		},
	],
	implications: [
		{
			id: "impl-1",
			description: "1.1.1.1.1.4.6: Research Implication Bullet",
			points: [
				"UI lag creates exploitable arbitrage windows",
				"Dark liquidity provides additional opportunities",
				"High correlation enables predictive trading",
				"Shadow-graph system successfully identifies hidden opportunities",
			],
		},
	],
	result: {
		description: "1.1.1.1.1.4.7: Resulting Trading Edge",
		metrics: {
			totalOpportunities: 342,
			averageProfit: 0.0032, // 0.32%
			totalProfit: 1094.4,
			winRate: 0.87,
			sharpeRatio: 2.3,
		},
	},
};
