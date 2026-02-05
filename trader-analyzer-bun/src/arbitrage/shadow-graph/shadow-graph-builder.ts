/**
 * @fileoverview 1.1.1.1.1.2.0: Shadow-Graph Builder
 * @description Algorithms for building shadow-graph from market data
 * @module arbitrage/shadow-graph/shadow-graph-builder
 */

import type {
	ShadowGraph,
	ShadowNode,
	ShadowEdge,
	NodeVisibility,
	LiquidityDepth,
	EdgeType,
} from "./types";
import { MICRO_BET_AMOUNT } from "./shadow-graph-constants";
import {
	generateShadowNodeId,
	generateShadowEdgeId,
	generateNodeId,
	generateEdgeId,
} from "./shadow-graph-database";

/**
 * UI node scraped from display
 */
interface UINode {
	eventId: string;
	marketId: string;
	bookmaker: string;
	odds?: number;
	metadata?: Record<string, unknown>;
}

/**
 * API node from API probe
 */
interface APINode {
	eventId: string;
	marketId: string;
	bookmaker: string;
	odds?: number;
	metadata?: Record<string, unknown>;
}

/**
 * Test bet result
 */
interface TestBetResult {
	success: boolean;
	amount: number;
	liquidityType?: "displayed" | "hidden" | "reserved";
}

/**
 * 1.1.1.1.1.2.1: Probe-All-SubMarkets Algorithm
 *
 * ShadowMarketProber class for comprehensive market probing and visibility detection
 */
export class ShadowMarketProber {
	constructor(
		private scrapeUINodes: (eventId: string) => Promise<UINode[]>,
		private probeAPINode: (uiNode: UINode) => Promise<APINode | null>,
		private placeTestBet: (
			node: ShadowNode,
			amount: number,
		) => Promise<TestBetResult>,
		private placeAPIBet: (
			node: ShadowNode,
			amount: number,
		) => Promise<TestBetResult>,
		private calculateCorrelationDeviation: (
			node: ShadowNode,
			allNodes: ShadowNode[],
		) => Promise<number>,
		private discoverDarkNodes: (eventId: string) => Promise<ShadowNode[]>,
	) {}

	/**
	 * 1.1.1.1.1.2.1: Probe-All-SubMarkets Algorithm
	 *
	 * Probes all sub-markets and builds complete shadow-graph
	 * Returns a complete graph with nodes and edges for analysis
	 */
	async probeAllSubMarkets(
		eventId: string,
		period: string = "live",
	): Promise<ShadowGraph> {
		const nodes: ShadowNode[] = [];

		// Get all visible nodes from UI scraping
		const visibleNodes = await this.scrapeUINodes(eventId);

		// 1.1.1.1.1.2.2: UI-vs-API Visibility Check
		for (const visibleNode of visibleNodes) {
			const apiNode = await this.probeAPINode(visibleNode);

			// Check if node exists in API but not UI (dark node)
			if (apiNode && !this.nodesMatch(visibleNode, apiNode)) {
				const shadowNodeId = generateShadowNodeId(
					apiNode.eventId,
					apiNode.marketId,
					apiNode.bookmaker,
					period,
					NodeVisibility.DARK,
				);

				// 1.1.1.1.1.2.3: Micro-Bet Liquidity Probe
				const liquidityDepth = await this.probeLiquidity({
					nodeId: shadowNodeId,
					eventId: apiNode.eventId,
					marketId: apiNode.marketId,
					bookmaker: apiNode.bookmaker,
					visibility: NodeVisibility.DARK,
					displayedLiquidity: 0,
					hiddenLiquidity: 0,
					reservedLiquidity: 0,
					expectedCorrelation: 0.5,
					actualCorrelation: 0,
					correlationDeviation: 0,
					isBaitLine: false,
					lastProbeSuccess: null,
					baitDetectionCount: 0,
					parentNodeId: null,
					lastUpdated: Date.now(),
				});

				nodes.push({
					nodeId: shadowNodeId,
					eventId: apiNode.eventId,
					marketId: apiNode.marketId,
					bookmaker: apiNode.bookmaker,
					visibility: NodeVisibility.DARK,
					displayedLiquidity: liquidityDepth.displayed,
					hiddenLiquidity: liquidityDepth.hidden,
					reservedLiquidity: liquidityDepth.reserved,
					expectedCorrelation: 0.5,
					actualCorrelation: 0,
					correlationDeviation: 0,
					isBaitLine: false,
					lastProbeSuccess: null,
					baitDetectionCount: 0,
					parentNodeId: null,
					lastUpdated: Date.now(),
				});
			}

			// Add visible node
			const displayShadowNodeId = generateShadowNodeId(
				visibleNode.eventId,
				visibleNode.marketId,
				visibleNode.bookmaker,
				period,
				NodeVisibility.DISPLAY,
			);

			nodes.push({
				nodeId: displayShadowNodeId,
				eventId: visibleNode.eventId,
				marketId: visibleNode.marketId,
				bookmaker: visibleNode.bookmaker,
				visibility: NodeVisibility.DISPLAY,
				displayedLiquidity: 10000, // Default displayed liquidity
				hiddenLiquidity: 0,
				reservedLiquidity: 0,
				expectedCorrelation: 0.5,
				actualCorrelation: 0,
				correlationDeviation: 0,
				isBaitLine: false,
				lastProbeSuccess: null,
				baitDetectionCount: 0,
				parentNodeId: null,
				lastUpdated: Date.now(),
			});
		}

		// 1.1.1.1.1.2.5: Dark-Node Discovery Loop
		const darkNodes = await this.discoverDarkNodes(eventId);
		nodes.push(...darkNodes);

		// 1.1.1.1.1.2.4: Correlation-Deviation Engine
		for (const node of nodes) {
			node.correlationDeviation = await this.calculateCorrelationDeviation(
				node,
				nodes,
			);
			node.actualCorrelation =
				node.expectedCorrelation - node.correlationDeviation;
		}

		// 1.1.1.1.1.2.6: Shadow-Edge Creation Factory
		const edges = await this.createShadowEdges(nodes);

		// 1.1.1.1.1.2.7: Graph Return Object
		return buildShadowGraph(nodes, edges);
	}

	/**
	 * Check if two nodes match (same market/bookmaker)
	 */
	private nodesMatch(uiNode: UINode, apiNode: APINode): boolean {
		return (
			uiNode.marketId === apiNode.marketId &&
			uiNode.bookmaker === apiNode.bookmaker &&
			uiNode.eventId === apiNode.eventId
		);
	}

	/**
	 * 1.1.1.1.1.2.3: Micro-Bet Liquidity Probe Implementation
	 *
	 * Probes liquidity by attempting test bets at various amounts
	 */
	private async probeLiquidity(node: ShadowNode): Promise<LiquidityDepth> {
		const testAmounts = [1, 10, 100, 1000]; // USD
		let displayed = 0;
		let hidden = 0;

		for (const amount of testAmounts) {
			try {
				const result = await this.placeTestBet(node, amount);
				if (result.success) {
					displayed = Math.max(displayed, amount);
				}
			} catch (error) {
				// Test hidden liquidity via API
				try {
					const apiResult = await this.placeAPIBet(node, amount);
					if (apiResult.success) {
						hidden = Math.max(hidden, amount);
					}
				} catch {
					// Continue to next amount
				}
			}
		}

		// Estimate reserved liquidity (bookmaker's hidden buffer)
		// Typically 10% of total visible liquidity
		const reserved = Math.max(0, (displayed + hidden) * 0.1);

		return { displayed, hidden, reserved };
	}

	/**
	 * 1.1.1.1.1.2.6: Shadow-Edge Creation Factory
	 *
	 * Creates edges between nodes based on correlations and relationships
	 */
	private async createShadowEdges(nodes: ShadowNode[]): Promise<ShadowEdge[]> {
		const edges: ShadowEdge[] = [];

		// Create edges between nodes with same market but different visibility
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const node1 = nodes[i];
				const node2 = nodes[j];

				// Same market, different bookmakers or visibility
				if (
					node1.marketId === node2.marketId &&
					(node1.bookmaker !== node2.bookmaker ||
						node1.visibility !== node2.visibility)
				) {
					// Determine edge type
					let edgeType: EdgeType = "visible";
					if (
						node1.visibility === NodeVisibility.DARK ||
						node2.visibility === NodeVisibility.DARK
					) {
						edgeType = "dark";
					} else if (node1.visibility !== node2.visibility) {
						edgeType = "temporal_lag";
					}

					// Calculate latency (simplified - in production would measure actual propagation)
					const latencyMs = Math.abs(node1.lastUpdated - node2.lastUpdated);

					// Calculate propagation rate (events per second)
					const propagationRate = latencyMs > 0 ? 1000 / latencyMs : 0;

					// Check for arbitrage opportunity
					const arbProfit = this.calculateArbProfit(node1, node2);
					const hiddenArbitrage =
						arbProfit > 0 &&
						(node1.visibility === NodeVisibility.API_ONLY ||
							node1.visibility === NodeVisibility.DARK ||
							node2.visibility === NodeVisibility.API_ONLY ||
							node2.visibility === NodeVisibility.DARK);

					const shadowEdgeId = generateShadowEdgeId(node1.nodeId, node2.nodeId);
					edges.push({
						edgeId,
						fromNodeId: node1.nodeId,
						toNodeId: node2.nodeId,
						edgeType,
						latencyMs,
						propagationRate,
						hiddenArbitrage,
						lastArbProfit: arbProfit > 0 ? arbProfit : null,
						arbDetectionCount: hiddenArbitrage ? 1 : 0,
					});
				}
			}
		}

		return edges;
	}

	/**
	 * Calculate potential arbitrage profit between two nodes
	 * Simplified calculation - in production would use actual odds
	 */
	private calculateArbProfit(node1: ShadowNode, node2: ShadowNode): number {
		// Use correlation deviation as proxy for arbitrage opportunity
		// Higher deviation = higher potential profit
		const avgDeviation =
			(node1.correlationDeviation + node2.correlationDeviation) / 2;
		return avgDeviation * 0.1; // Scale factor
	}
}

/**
 * 1.1.1.1.1.2.2: UI-vs-API Visibility Check
 *
 * Checks visibility of a market in both UI and API
 * (Kept as standalone function for backward compatibility)
 */
export async function checkUIVsAPIVisibility(
	marketId: string,
	bookmaker: string,
	displayCheck: (marketId: string, bookmaker: string) => Promise<boolean>,
	apiCheck: (marketId: string, bookmaker: string) => Promise<boolean>,
): Promise<NodeVisibility> {
	const [displayVisible, apiVisible] = await Promise.all([
		displayCheck(marketId, bookmaker),
		apiCheck(marketId, bookmaker),
	]);

	if (displayVisible && apiVisible) return NodeVisibility.DISPLAY;
	if (apiVisible && !displayVisible) return NodeVisibility.API_ONLY;
	return NodeVisibility.DARK;
}

/**
 * 1.1.1.1.1.2.3: Micro-Bet Liquidity Probe
 *
 * Probes liquidity by attempting a micro-bet
 * (Kept as standalone function for backward compatibility)
 */
export async function probeMicroBetLiquidity(
	node: ShadowNode,
	probeAmount: number = MICRO_BET_AMOUNT,
): Promise<LiquidityDepth> {
	// In production, this would make an actual micro-bet API call
	// For now, simulate liquidity based on node visibility

	let displayed = 0;
	let hidden = 0;
	let reserved = 0;

	if (node.visibility === NodeVisibility.DISPLAY) {
		displayed = probeAmount * 10;
	} else if (node.visibility === NodeVisibility.API_ONLY) {
		hidden = probeAmount * 10;
	} else {
		// Dark liquidity
		reserved = probeAmount * 5;
	}

	return {
		displayed,
		hidden,
		reserved,
	};
}

/**
 * 1.1.1.1.1.2.4: Correlation-Deviation Engine
 *
 * Calculates correlation deviation for a node against all other nodes
 * (Kept as standalone function for backward compatibility)
 */
export async function calculateCorrelationDeviationForNode(
	node: ShadowNode,
	allNodes: ShadowNode[],
): Promise<number> {
	// Find nodes with same market but different bookmakers
	const relatedNodes = allNodes.filter(
		(n) => n.marketId === node.marketId && n.bookmaker !== node.bookmaker,
	);

	if (relatedNodes.length === 0) {
		return 0.5; // Default deviation if no related nodes
	}

	// Calculate average correlation deviation
	let totalDeviation = 0;
	for (const relatedNode of relatedNodes) {
		// Expected correlation is typically high (0.8-0.95) for similar markets
		const expectedCorrelation = 0.9;
		const actualCorrelation = relatedNode.actualCorrelation || 0.5;
		const deviation = Math.abs(expectedCorrelation - actualCorrelation);
		totalDeviation += deviation;
	}

	return totalDeviation / relatedNodes.length;
}

/**
 * 1.1.1.1.1.2.5: Dark-Node Discovery Loop
 *
 * Discovers dark nodes (hidden liquidity) by probing markets
 * (Kept as standalone function for backward compatibility)
 */
export async function discoverDarkNodes(
	eventId: string,
	bookmaker: string,
	period: string,
	knownMarkets: string[],
	probeFunction: (
		marketId: string,
	) => Promise<{ visible: boolean; odds?: number }>,
): Promise<ShadowNode[]> {
	const darkNodes: ShadowNode[] = [];

	for (const marketId of knownMarkets) {
		const result = await probeFunction(marketId);

		if (!result.visible) {
			// Found a dark node
			const darkShadowNodeId = generateShadowNodeId(
				eventId,
				marketId,
				bookmaker,
				period,
				NodeVisibility.DARK,
			);
			darkNodes.push({
				nodeId: darkShadowNodeId,
				eventId,
				marketId,
				bookmaker,
				visibility: NodeVisibility.DARK,
				displayedLiquidity: 0,
				hiddenLiquidity: 0,
				reservedLiquidity: 0,
				expectedCorrelation: 0.5,
				actualCorrelation: 0,
				correlationDeviation: 0,
				isBaitLine: false,
				lastProbeSuccess: null,
				baitDetectionCount: 0,
				parentNodeId: null,
				lastUpdated: Date.now(),
			});
		}
	}

	return darkNodes;
}

/**
 * 1.1.1.1.1.2.6: Shadow-Edge Creation Factory
 *
 * Creates shadow edges between nodes with latency and correlation metrics
 */
export function createShadowEdge(
	sourceNode: ShadowNode,
	targetNode: ShadowNode,
	edgeType: EdgeType,
	latencyMs: number | null,
	propagationRate: number = 0,
	arbitrageProfit: number | null = null,
): ShadowEdge {
	const shadowEdgeId = generateShadowEdgeId(
		sourceNode.nodeId,
		targetNode.nodeId,
	);
	const hiddenArbitrage =
		arbitrageProfit !== null &&
		arbitrageProfit > 0 &&
		(sourceNode.visibility === NodeVisibility.API_ONLY ||
			targetNode.visibility === NodeVisibility.API_ONLY ||
			sourceNode.visibility === NodeVisibility.DARK ||
			targetNode.visibility === NodeVisibility.DARK);

	return {
		edgeId,
		fromNodeId: sourceNode.nodeId,
		toNodeId: targetNode.nodeId,
		edgeType,
		latencyMs,
		propagationRate,
		hiddenArbitrage,
		lastArbProfit: arbitrageProfit,
		arbDetectionCount: hiddenArbitrage ? 1 : 0,
	};
}

/**
 * 1.1.1.1.1.2.7: Graph Return Object
 *
 * Builds complete shadow-graph from nodes and edges
 */
export function buildShadowGraph(
	nodes: ShadowNode[],
	edges: ShadowEdge[],
): ShadowGraph {
	const nodeMap = new Map<string, ShadowNode>();
	const edgeMap = new Map<string, ShadowEdge>();

	for (const node of nodes) {
		nodeMap.set(node.nodeId, node);
	}

	for (const edge of edges) {
		edgeMap.set(edge.edgeId, edge);
	}

	return {
		nodes: nodeMap,
		edges: edgeMap,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}
