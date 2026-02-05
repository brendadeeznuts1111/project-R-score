/**
 * @fileoverview Advanced Research Orchestrator
 * @description Coordinates all advanced detection and analysis components
 * @module arbitrage/shadow-graph/advanced-research-orchestrator
 */

import { Database } from "bun:sqlite";
import { ReverseLineMovementDetector } from "./reverse-line-movement-detector";
import { SteamOriginationGraph } from "./steam-origination-graph";
import { DerivativeMarketCorrelator } from "./derivative-market-correlator";
import { TemporalPatternEngine } from "./temporal-pattern-engine";
import { CrossSportArbitrage } from "./cross-sport-arbitrage";
import { LimitOrderBookReconstructor } from "./limit-order-book-reconstructor";
import { BehavioralPatternClassifier } from "./behavioral-pattern-classifier";
import { ShadowSteamDetector } from "./hidden-steam-detector";

/**
 * Comprehensive research report
 */
export interface ResearchReport {
	eventId: string;
	hiddenSteam: Array<{
		hiddenNodeId: string;
		visibleNodeId: string;
		severity: number;
		detectedAt: number;
	}>;
	reverseLineMoves: Array<{
		isRLM: boolean;
		sharpSide: string;
		confidence: number;
		nodeId: string;
	}>;
	steamOrigin: {
		aggressor: string;
		origins: Array<{ nodeId: string; firstMoveTime: number }>;
		cascadeSize: number;
	} | null;
	derivativeEdges: Array<{
		sourceNode: string;
		derivativeNode: string;
		correlation: number;
		expectedImpact: number;
		actualImpact: number;
	}>;
	temporalContext: {
		highRiskWindows: number;
		circadianFactor: number;
		preGameRisk: string;
	} | null;
	lobImbalance: {
		fairPrice: number;
		imbalance: number;
		spread: number;
	} | null;
	behavioralSignatures: Array<{
		signature: string;
		confidence: number;
		isBot: boolean;
	}>;
}

/**
 * Advanced Research Orchestrator
 *
 * Coordinates all advanced detection and analysis components
 * to provide comprehensive research reports
 */
export class AdvancedResearchOrchestrator {
	private rlmDetector: ReverseLineMovementDetector;
	private steamOriginGraph: SteamOriginationGraph;
	private derivativeCorrelator: DerivativeMarketCorrelator;
	private temporalEngine: TemporalPatternEngine;
	private crossSportArb: CrossSportArbitrage;
	private lobReconstructor: LimitOrderBookReconstructor;
	private behavioralClassifier: BehavioralPatternClassifier;
	private steamDetector: ShadowSteamDetector;

	constructor(private db: Database) {
		this.rlmDetector = new ReverseLineMovementDetector(db);
		this.steamOriginGraph = new SteamOriginationGraph(db);
		this.derivativeCorrelator = new DerivativeMarketCorrelator(db);
		this.temporalEngine = new TemporalPatternEngine(db);
		this.crossSportArb = new CrossSportArbitrage(db);
		this.lobReconstructor = new LimitOrderBookReconstructor(db);
		this.behavioralClassifier = new BehavioralPatternClassifier(db);
		// Note: ShadowSteamDetector requires dependencies - would need to be initialized properly
		// this.steamDetector = new ShadowSteamDetector(...);
	}

	/**
	 * Analyze event comprehensively
	 *
	 * Runs all detection and analysis components
	 */
	async analyzeEvent(eventId: string): Promise<ResearchReport> {
		console.log(`🔬 Starting comprehensive analysis for event ${eventId}...`);

		const report: ResearchReport = {
			eventId,
			hiddenSteam: [],
			reverseLineMoves: [],
			steamOrigin: null,
			derivativeEdges: [],
			temporalContext: null,
			lobImbalance: null,
			behavioralSignatures: [],
		};

		try {
			// 1. Detect hidden steam (existing functionality)
			// report.hiddenSteam = await this.steamDetector.monitorHiddenSteam(eventId);

			// 2. Detect RLM patterns
			const visibleNodes = await this.getVisibleNodes(eventId);
			for (const node of visibleNodes) {
				const rlm = await this.rlmDetector.detectRLM(eventId, node.nodeId);
				if (rlm.isRLM) {
					report.reverseLineMoves.push({
						isRLM: true,
						sharpSide: rlm.sharpSide,
						confidence: rlm.confidence,
						nodeId: node.nodeId,
					});
				}
			}

			// 3. Trace steam origination
			const steamOrigin =
				await this.steamOriginGraph.buildOriginationGraph(eventId);
			report.steamOrigin = {
				aggressor: steamOrigin.aggressor,
				origins: steamOrigin.origins,
				cascadeSize: steamOrigin.cascade.size,
			};

			// 4. Find derivative edges
			const derivativePairs = await this.findDerivativePairs(eventId);
			for (const pair of derivativePairs) {
				const corr =
					await this.derivativeCorrelator.detectDerivativeCorrelation(
						pair.playerProp,
						pair.teamTotal,
					);
				if (corr.correlation > 0.7) {
					report.derivativeEdges.push({
						sourceNode: pair.playerProp,
						derivativeNode: pair.teamTotal,
						correlation: corr.correlation,
						expectedImpact: corr.expectedImpact,
						actualImpact: corr.actualImpact,
					});
				}
			}

			// 5. Analyze temporal patterns
			const temporalPatterns =
				await this.temporalEngine.analyzeTemporalPatterns(eventId);
			report.temporalContext = {
				highRiskWindows: temporalPatterns.highRiskWindows.length,
				circadianFactor: temporalPatterns.circadianFactor,
				preGameRisk: temporalPatterns.preGameCountdown.riskLevel,
			};

			// 6. Reconstruct LOB for key nodes
			const keyNode = visibleNodes[0]?.nodeId;
			if (keyNode) {
				const lob = await this.lobReconstructor.reconstructLOB(keyNode);
				report.lobImbalance = {
					fairPrice: lob.fairPrice,
					imbalance: lob.imbalance,
					spread: lob.spread,
				};
			}

			// 7. Classify behavioral patterns
			const recentBets = await this.getRecentBets(eventId, 300000); // Last 5 minutes
			for (const bet of recentBets) {
				const signature = this.behavioralClassifier.classifyBet(bet);
				if (signature.isBot) {
					report.behavioralSignatures.push({
						signature: signature.signature,
						confidence: signature.confidence,
						isBot: true,
					});
				}
			}
		} catch (error) {
			console.error(`Error analyzing event ${eventId}:`, error);
		}

		console.log(`✅ Analysis complete for event ${eventId}`);
		return report;
	}

	/**
	 * Get visible nodes for an event
	 */
	private async getVisibleNodes(
		eventId: string,
	): Promise<Array<{ nodeId: string }>> {
		return this.db
			.query<{ node_id: string }, [string]>(
				`SELECT node_id 
				 FROM shadow_nodes 
				 WHERE event_id = ?1 AND visibility = 'display'`,
			)
			.all(eventId)
			.map((row) => ({ nodeId: row.node_id }));
	}

	/**
	 * Find derivative market pairs (player props → team totals)
	 */
	private async findDerivativePairs(eventId: string): Promise<
		Array<{
			playerProp: string;
			teamTotal: string;
		}>
	> {
		// Find player prop nodes and team total nodes
		const playerProps = this.db
			.query<{ node_id: string }, [string]>(
				`SELECT node_id 
				 FROM shadow_nodes 
				 WHERE event_id = ?1 
				   AND market_id LIKE '%player%' 
				   AND market_id LIKE '%prop%'`,
			)
			.all(eventId);

		const teamTotals = this.db
			.query<{ node_id: string }, [string]>(
				`SELECT node_id 
				 FROM shadow_nodes 
				 WHERE event_id = ?1 
				   AND market_id LIKE '%total%' 
				   AND market_id NOT LIKE '%player%'`,
			)
			.all(eventId);

		// Create pairs (simplified: match by bookmaker)
		const pairs: Array<{ playerProp: string; teamTotal: string }> = [];

		for (const prop of playerProps) {
			const propBookmaker = prop.node_id.split(":")[2]; // Extract bookmaker
			const matchingTotal = teamTotals.find((t) =>
				t.node_id.includes(propBookmaker),
			);

			if (matchingTotal) {
				pairs.push({
					playerProp: prop.node_id,
					teamTotal: matchingTotal.node_id,
				});
			}
		}

		return pairs;
	}

	/**
	 * Get recent bets for behavioral analysis
	 */
	private async getRecentBets(
		eventId: string,
		windowMs: number,
	): Promise<
		Array<{
			size: number;
			timestamp: number;
			executionTime: number;
			ipHash: string;
			userAgent: string;
		}>
	> {
		// Placeholder: would query actual bet data
		// For now, simulate from line movements
		const movements = this.db
			.query<
				{ bet_size: number | null; execution_time_ms: number | null },
				[string, number]
			>(
				`SELECT bet_size, execution_time_ms
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.event_id = ?1
				   AND lm.timestamp > ?2
				   AND lm.bet_size IS NOT NULL`,
			)
			.all(eventId, Date.now() - windowMs);

		return movements
			.filter((m) => m.bet_size !== null)
			.map((m) => ({
				size: m.bet_size!,
				timestamp: Date.now(),
				executionTime: m.execution_time_ms || 0,
				ipHash: "unknown",
				userAgent: "unknown",
			}));
	}
}
