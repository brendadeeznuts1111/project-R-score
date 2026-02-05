/**
 * @fileoverview Hyper-Bun Shadow System Orchestrator
 * @description Main system orchestrator for shadow-graph monitoring and trading
 * @module arbitrage/shadow-graph/orchestrator
 */

import { Database } from "bun:sqlite";
import { ShadowMarketProber } from "./shadow-graph-builder";
import { ShadowSteamDetector } from "./hidden-steam-detector";
import {
	ShadowArbitrageScanner,
	type ShadowArbitrageOpportunity,
} from "./shadow-arb-scanner";
import { ShadowGraphAlertSystem } from "./alert-system";
import { HistoricalDataCollector } from "./historical-data-collector";
import { HiddenNodePredictor } from "./hidden-node-predictor";
import { EdgeReliabilityAnalyzer } from "./edge-reliability-analyzer";
import { initializeShadowGraphDatabase } from "./shadow-graph-database";
import type { ShadowGraph } from "./types";

/**
 * Main Hyper-Bun Shadow System v1.3.3
 *
 * Orchestrates shadow-graph monitoring, hidden steam detection, arbitrage scanning,
 * and automated alerting for dark liquidity and sharp money movements
 */
export class ShadowGraphOrchestrator {
	private marketProber: ShadowMarketProber;
	private steamDetector: ShadowSteamDetector;
	private arbitrageScanner: ShadowArbitrageScanner;
	private alertSystem: ShadowGraphAlertSystem;
	private historicalCollector: HistoricalDataCollector;
	private nodePredictor: HiddenNodePredictor;
	private reliabilityAnalyzer: EdgeReliabilityAnalyzer;
	private monitoringIntervals: Map<string, ReturnType<typeof setInterval>> =
		new Map();
	private db: Database;

	constructor(dbPath: string = "./data/research.db") { // Uses SHADOW_GRAPH_PATHS.RESEARCH_DB
		this.db = new Database(dbPath, { create: true });
		initializeShadowGraphDatabase(this.db);

		// Initialize components with dependency injection
		this.marketProber = new ShadowMarketProber(
			async (eventId) => {
				// Scrape UI nodes implementation
				return [];
			},
			async (uiNode) => {
				// Probe API node implementation
				return null;
			},
			async (node, amount) => {
				// Place test bet implementation
				return { success: false, amount };
			},
			async (node, amount) => {
				// Place API bet implementation
				return { success: false, amount };
			},
			async (node, allNodes) => {
				// Calculate correlation deviation implementation
				return 0;
			},
			async (eventId) => {
				// Discover dark nodes implementation
				return [];
			},
		);

		this.steamDetector = new ShadowSteamDetector(
			async (eventId) => {
				// Build shadow graph
				return await this.buildShadowGraphForEvent(eventId);
			},
			async (node) => {
				// Get recent movement
				return { size: 0, timestamp: Date.now() };
			},
			async (node, timestamp) => {
				// Get visible response
				return { lagMs: 0, timestamp: Date.now() };
			},
			async (movement) => {
				// Classify sharp money
				return "false" as const;
			},
			async (darkNode, visibleNode) => {
				// Check arbitrage
				return false;
			},
		);

		this.arbitrageScanner = new ShadowArbitrageScanner(
			async (eventId) => {
				return await this.buildShadowGraphForEvent(eventId);
			},
			async (edge) => {
				// Estimate arb window
				return (edge.latencyMs || 1000) * 10;
			},
		);

		this.alertSystem = new ShadowGraphAlertSystem(this.db);

		// Initialize advanced analysis components
		this.historicalCollector = new HistoricalDataCollector(this.db);
		this.nodePredictor = new HiddenNodePredictor(this.db);
		this.reliabilityAnalyzer = new EdgeReliabilityAnalyzer(this.db);
	}

	/**
	 * Initialize the shadow system
	 */
	async initialize(): Promise<void> {
		console.log("🚀 Initializing Hyper-Bun Shadow System...");

		// Start historical data collection
		this.historicalCollector.startPeriodicSnapshots();

		// Train hidden node predictor (async, don't wait)
		this.nodePredictor.train().catch((error) => {
			console.warn("Failed to train hidden node predictor:", error);
		});

		// Create database tables
		await this.createSchema();

		// Start monitoring for all active events
		const activeEvents = await this.getActiveEvents();

		for (const event of activeEvents) {
			// Build initial shadow graph
			await this.buildShadowGraphForEvent(event.id);

			// Start real-time monitoring
			this.startEventMonitoring(event.id);
		}

		// Schedule periodic reliability analysis (every hour)
		setInterval(
			async () => {
				for (const event of activeEvents) {
					await this.reliabilityAnalyzer
						.analyzeAndUpdateAllEdges(event.id)
						.catch(console.error);
				}
			},
			60 * 60 * 1000,
		); // 1 hour

		console.log("🕵️‍♂️ Hyper-Bun Shadow System v1.3.3 Initialized");
		console.log(`📊 Monitoring ${activeEvents.length} events`);
	}

	/**
	 * Build shadow graph for an event
	 *
	 * Probes all sub-markets and constructs complete shadow-graph
	 */
	private async buildShadowGraphForEvent(
		eventId: string,
	): Promise<ShadowGraph> {
		// Use ShadowMarketProber to build graph
		return await this.marketProber.probeAllSubMarkets(eventId, "live");
	}

	/**
	 * Create database schema
	 */
	private async createSchema(): Promise<void> {
		// Schema already created in constructor via initializeShadowGraphDatabase
		// Additional tables can be created here if needed
	}

	/**
	 * Get active events from database
	 */
	private async getActiveEvents(): Promise<
		Array<{ id: string; name: string }>
	> {
		const events = this.db
			.query<{ id: string; name: string }, []>(
				`SELECT id, name FROM events WHERE start_time > ?1`,
			)
			.all(Date.now());

		return events;
	}

	/**
	 * Start event monitoring loop
	 */
	private startEventMonitoring(eventId: string): void {
		// Monitor hidden steam every 30 seconds
		const interval = setInterval(async () => {
			try {
				const steamEvents =
					await this.steamDetector.monitorHiddenSteam(eventId);

				for (const event of steamEvents) {
					// Trigger alerts
					await this.alertSystem.processHiddenSteamEvent(event);

					// Scan for arbitrage opportunities
					const arbitrageOpportunities =
						await this.arbitrageScanner.scanShadowArb(eventId);

					// Queue profitable opportunities (>2% profit)
					for (const opportunity of arbitrageOpportunities.filter(
						(opp) => opp.profit > 0.02,
					)) {
						await this.queueArbitrageTrade(opportunity);
					}
				}
			} catch (error) {
				console.error(`Error monitoring event ${eventId}:`, error);
			}
		}, 30000); // 30 seconds

		this.monitoringIntervals.set(eventId, interval);
	}

	/**
	 * Queue arbitrage trade for execution
	 *
	 * Places trades on both dark and visible nodes to capture arbitrage profit
	 */
	private async queueArbitrageTrade(
		opportunity: ShadowArbitrageOpportunity,
	): Promise<void> {
		// Implement trading logic
		console.log(
			`💰 Shadow Arbitrage Opportunity: ${(opportunity.profit * 100).toFixed(2)}% profit, ` +
				`capacity: $${opportunity.capacity.toFixed(2)}, ` +
				`confidence: ${(opportunity.confidence * 100).toFixed(1)}%`,
		);

		// Place trades on both sides (50% of capacity each)
		const tradeSize = opportunity.capacity * 0.5;
		await this.placeTrade(opportunity.darkNode.nodeId, "buy", tradeSize);
		await this.placeTrade(opportunity.visibleNode.nodeId, "sell", tradeSize);

		// Monitor for fill and hedge
		await this.monitorArbitrageExecution(opportunity);
	}

	/**
	 * Place a trade on a shadow node
	 *
	 * @param shadowNodeId - Node ID to place trade on
	 * @param side - Trade side: "buy" or "sell"
	 * @param amount - Trade amount in base currency
	 */
	private async placeTrade(
		shadowNodeId: string,
		side: "buy" | "sell",
		amount: number,
	): Promise<void> {
		// In production, implement actual trade placement via bookmaker API
		console.log(
			`📊 Placing ${side} trade on shadow node ${shadowNodeId}, amount: $${amount.toFixed(2)}`,
		);
	}

	/**
	 * Monitor arbitrage execution and hedge when needed
	 *
	 * Tracks trade fills and executes hedges to lock in profit
	 */
	private async monitorArbitrageExecution(
		opportunity: ShadowArbitrageOpportunity,
	): Promise<void> {
		// In production, monitor trade fills and execute hedges
		console.log(
			`👀 Monitoring arbitrage execution: edge ${opportunity.edgeId}, ` +
				`window: ${(opportunity.windowMs / 1000).toFixed(1)}s`,
		);
	}

	/**
	 * Shutdown monitoring for an event
	 */
	stopEventMonitoring(eventId: string): void {
		const interval = this.monitoringIntervals.get(eventId);
		if (interval) {
			clearInterval(interval);
			this.monitoringIntervals.delete(eventId);
		}
	}

	/**
	 * Shutdown all monitoring
	 */
	shutdown(): void {
		for (const [eventId, interval] of this.monitoringIntervals) {
			clearInterval(interval);
		}
		this.monitoringIntervals.clear();
		this.db.close();
	}
}
