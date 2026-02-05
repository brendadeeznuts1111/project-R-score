/**
 * @fileoverview 1.1.1.1.2.0.0: Advanced Research MCP Tools
 * @description MCP tools for advanced detection and analysis
 * @module mcp/tools/advanced-research
 */

import { Database } from "bun:sqlite";
import type { MCPTool } from "../server";
import { ReverseLineMovementDetector } from "../../arbitrage/shadow-graph/reverse-line-movement-detector";
import { SteamOriginationGraph } from "../../arbitrage/shadow-graph/steam-origination-graph";
import { DerivativeMarketCorrelator } from "../../arbitrage/shadow-graph/derivative-market-correlator";
import { TemporalPatternEngine } from "../../arbitrage/shadow-graph/temporal-pattern-engine";
import { CrossSportArbitrage } from "../../arbitrage/shadow-graph/cross-sport-arbitrage";
import { LimitOrderBookReconstructor } from "../../arbitrage/shadow-graph/limit-order-book-reconstructor";
import { BehavioralPatternClassifier } from "../../arbitrage/shadow-graph/behavioral-pattern-classifier";

/**
 * 1.1.1.1.2.0.0: Advanced Research Tools
 */
export const advancedResearchTools: MCPTool[] = [
	{
		name: "research-detect-rlm",
		description: "1.1.1.1.2.1.1: Detect reverse line movement patterns",
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string", description: "Event identifier" },
				nodeId: { type: "string", description: "Shadow node identifier" },
			},
			required: ["eventId", "nodeId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const detector = new ReverseLineMovementDetector(db);

				const rlm = await detector.detectRLM(args.eventId, args.nodeId);

				return {
					content: [
						{
							type: "text",
							text:
								`🔀 Reverse Line Movement Detection\n` +
								`Is RLM: ${rlm.isRLM ? "✅ Yes" : "❌ No"}\n` +
								`Sharp Side: ${rlm.sharpSide}\n` +
								`Confidence: ${(rlm.confidence * 100).toFixed(1)}%\n` +
								`Public Bias: ${rlm.publicBias.toFixed(1)}%\n` +
								`Correlation Score: ${(rlm.correlationScore * 100).toFixed(1)}%\n` +
								`Sharp Contrarian: ${rlm.sharpContrarianIndicator ? "✅" : "❌"}` +
								(rlm.executionTimeWindow
									? `\nExecution Window: ${new Date(rlm.executionTimeWindow.start).toISOString()} - ${new Date(rlm.executionTimeWindow.end).toISOString()}`
									: ""),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error detecting RLM: ${error.message}`,
						},
					],
				};
			}
		},
	},
	{
		name: "research-analyze-steam-origin",
		description: "1.1.1.1.2.2.1: Identify the originator of a steam move",
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string", description: "Event identifier" },
			},
			required: ["eventId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const graph = new SteamOriginationGraph(db);

				const origin = await graph.buildOriginationGraph(args.eventId);

				return {
					content: [
						{
							type: "text",
							text:
								`⚡ Steam Origination Analysis\n` +
								`Aggressor: ${origin.aggressor}\n` +
								`Origins: ${origin.origins.length}\n` +
								(origin.origins[0]
									? `First Move: ${new Date(origin.origins[0].firstMoveTime).toISOString()}\n` +
										`Move Size: ${origin.origins[0].moveSize.toFixed(2)} points\n`
									: "") +
								`Cascade Nodes: ${origin.cascade.size}\n` +
								`Origination Confidence: ${(origin.originationConfidence * 100).toFixed(1)}%\n\n` +
								`Latency Ranking:\n` +
								origin.latencyRanking
									.slice(0, 5)
									.map(
										(r, i) =>
											`${i + 1}. ${r.bookmaker}: ${(r.avgLatency / 1000).toFixed(1)}s`,
									)
									.join("\n"),
						},
					],
					binary: new TextEncoder().encode(
						JSON.stringify(Object.fromEntries(origin.cascade)),
					),
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error analyzing steam origin: ${error.message}`,
						},
					],
				};
			}
		},
	},
	{
		name: "research-calc-derivative-correlation",
		description:
			"1.1.1.1.2.3.1: Calculate correlation between derivative markets",
		inputSchema: {
			type: "object",
			properties: {
				sourceNodeId: {
					type: "string",
					description: "Source market node (e.g., player prop)",
				},
				derivativeNodeId: {
					type: "string",
					description: "Derivative market node (e.g., team total)",
				},
			},
			required: ["sourceNodeId", "derivativeNodeId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const correlator = new DerivativeMarketCorrelator(db);

				const corr = await correlator.detectDerivativeCorrelation(
					args.sourceNodeId,
					args.derivativeNodeId,
				);

				const hedge = await correlator.generateHedgeRecommendation(
					args.sourceNodeId,
					args.derivativeNodeId,
				);

				return {
					content: [
						{
							type: "text",
							text:
								`🔗 Derivative Market Correlation\n` +
								`Correlation: ${(corr.correlation * 100).toFixed(1)}%\n` +
								`Expected Impact: ${corr.expectedImpact.toFixed(2)} points\n` +
								`Actual Impact: ${corr.actualImpact.toFixed(2)} points\n` +
								`Is Leading: ${corr.isLeading ? "✅ Yes" : "❌ No"}\n` +
								`Statistical Significance: ${(corr.statisticalSignificance * 100).toFixed(1)}%\n` +
								`Correlation Break: ${corr.correlationBreak ? "⚠️ Yes" : "✅ No"}\n` +
								(corr.correlationBreak
									? `Break Magnitude: ${corr.breakMagnitude.toFixed(2)} points\n`
									: "") +
								(hedge
									? `\n💡 Hedge Recommendation:\n` +
										`Hedge Node: ${hedge.hedgeNode}\n` +
										`Hedge Size: ${hedge.hedgeSize.toFixed(2)}\n` +
										`Confidence: ${(hedge.confidence * 100).toFixed(1)}%\n` +
										`Reason: ${hedge.reason}`
									: ""),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error calculating derivative correlation: ${error.message}`,
						},
					],
				};
			}
		},
	},
	{
		name: "research-analyze-temporal-patterns",
		description: "1.1.1.1.2.4.1: Analyze temporal patterns in hidden steam",
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string", description: "Event identifier" },
			},
			required: ["eventId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const engine = new TemporalPatternEngine(db);

				const patterns = await engine.analyzeTemporalPatterns(args.eventId);

				return {
					content: [
						{
							type: "text",
							text:
								`⏰ Temporal Pattern Analysis\n` +
								`Time-of-Day Probability: ${(patterns.timeOfDayProbability * 100).toFixed(1)}%\n` +
								`Day-of-Week Factor: ${patterns.dayOfWeekFactor.toFixed(2)}x\n` +
								`Circadian Factor: ${(patterns.circadianFactor * 100).toFixed(1)}%\n` +
								`Halftime Cluster: ${patterns.halftimeCluster ? "✅ Detected" : "❌ None"}\n` +
								`Pattern Deviation: ${(patterns.patternDeviation * 100).toFixed(1)}%\n\n` +
								`Pre-Game Countdown:\n` +
								`Hours Until Game: ${patterns.preGameCountdown.hoursUntilGame.toFixed(1)}\n` +
								`Risk Level: ${patterns.preGameCountdown.riskLevel.toUpperCase()}\n` +
								`Probability: ${(patterns.preGameCountdown.probability * 100).toFixed(1)}%\n\n` +
								`High-Risk Windows:\n` +
								(patterns.highRiskWindows.length > 0
									? patterns.highRiskWindows
											.map(
												(w, i) =>
													`${i + 1}. ${new Date(w.start).toISOString()} - ${new Date(w.end).toISOString()}\n` +
													`   Probability: ${(w.probability * 100).toFixed(1)}%\n` +
													`   Reason: ${w.reason}`,
											)
											.join("\n\n")
									: "None detected"),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error analyzing temporal patterns: ${error.message}`,
						},
					],
				};
			}
		},
	},
	{
		name: "research-find-cross-sport-edges",
		description: "1.1.1.1.2.5.1: Find cross-sport arbitrage edges",
		inputSchema: {
			type: "object",
			properties: {
				playerName: {
					type: "string",
					description: "Player name to search for",
				},
			},
			required: ["playerName"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const crossSport = new CrossSportArbitrage(db);

				const edges = await crossSport.findCrossSportEdges(args.playerName);

				return {
					content: [
						{
							type: "text",
							text:
								`🌐 Cross-Sport Arbitrage Edges\n` +
								`Player: ${args.playerName}\n` +
								`Edges Found: ${edges.length}\n\n` +
								(edges.length > 0
									? edges
											.map(
												(e, i) =>
													`${i + 1}. ${e.sportA.toUpperCase()} ↔ ${e.sportB.toUpperCase()}\n` +
													`   Correlation: ${(e.correlation * 100).toFixed(1)}%\n` +
													`   Arb Opportunity: ${e.arbOpportunity ? "✅ Yes" : "❌ No"}\n` +
													`   Required Hedge: ${(e.requiredHedge * 100).toFixed(1)}%\n` +
													`   Edge Type: ${e.edgeType}\n` +
													`   Confidence: ${(e.confidence * 100).toFixed(1)}%`,
											)
											.join("\n\n")
									: "No cross-sport edges found"),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error finding cross-sport edges: ${error.message}`,
						},
					],
				};
			}
		},
	},
	{
		name: "research-reconstruct-lob",
		description:
			"1.1.1.1.2.6.1: Reconstruct limit order book from micro-movements",
		inputSchema: {
			type: "object",
			properties: {
				nodeId: { type: "string", description: "Shadow node identifier" },
			},
			required: ["nodeId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const reconstructor = new LimitOrderBookReconstructor(db);

				const lob = await reconstructor.reconstructLOB(args.nodeId);

				return {
					content: [
						{
							type: "text",
							text:
								`📊 Limit Order Book Reconstruction\n` +
								`Fair Price: ${lob.fairPrice.toFixed(2)}\n` +
								`Spread: ${lob.spread.toFixed(2)}\n` +
								`Imbalance: ${(lob.imbalance * 100).toFixed(1)}% ${lob.imbalance > 0 ? "(Bid-heavy)" : "(Ask-heavy)"}\n\n` +
								`Top 5 Bids:\n` +
								lob.bids
									.slice(0, 5)
									.map(
										(b, i) =>
											`${i + 1}. ${b.price.toFixed(2)} @ ${b.size.toFixed(0)} ${b.isIceberg ? "🧊" : ""}`,
									)
									.join("\n") +
								`\n\nTop 5 Asks:\n` +
								lob.asks
									.slice(0, 5)
									.map(
										(a, i) =>
											`${i + 1}. ${a.price.toFixed(2)} @ ${a.size.toFixed(0)} ${a.isIceberg ? "🧊" : ""}`,
									)
									.join("\n"),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error reconstructing LOB: ${error.message}`,
						},
					],
				};
			}
		},
	},
	{
		name: "research-classify-behavioral-pattern",
		description: "1.1.1.1.2.7.1: Classify betting patterns as bot vs human",
		inputSchema: {
			type: "object",
			properties: {
				size: { type: "number", description: "Bet size" },
				executionTime: { type: "number", description: "Execution time in ms" },
				ipHash: { type: "string", description: "IP hash" },
				userAgent: { type: "string", description: "User agent string" },
			},
			required: ["size", "executionTime", "ipHash", "userAgent"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const classifier = new BehavioralPatternClassifier(db);

				const classification = classifier.classifyBet({
					size: args.size,
					timestamp: Date.now(),
					executionTime: args.executionTime,
					ipHash: args.ipHash,
					userAgent: args.userAgent,
				});

				const recommendations =
					classifier.generateEvasionRecommendations(classification);

				return {
					content: [
						{
							type: "text",
							text:
								`🤖 Behavioral Pattern Classification\n` +
								`Is Bot: ${classification.isBot ? "✅ Yes" : "❌ No"}\n` +
								`Confidence: ${(classification.confidence * 100).toFixed(1)}%\n` +
								`Signature: ${classification.signature}\n\n` +
								`Features:\n` +
								`- Round Size: ${classification.features.isRoundSize ? "✅" : "❌"}\n` +
								`- Fast Execution: ${classification.features.isFast ? "✅" : "❌"}\n` +
								`- Consistent IP: ${classification.features.isConsistentIP ? "✅" : "❌"}\n` +
								`- Bot User Agent: ${classification.features.isBotUserAgent ? "✅" : "❌"}\n` +
								(recommendations.length > 0
									? `\n💡 Evasion Recommendations:\n` +
										recommendations.map((r) => `- ${r}`).join("\n")
									: ""),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: `Error classifying behavioral pattern: ${error.message}`,
						},
					],
				};
			}
		},
	},
];
