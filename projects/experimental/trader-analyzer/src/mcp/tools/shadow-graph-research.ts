/**
 * @fileoverview 1.1.1.1.1.7.0: Shadow-Graph Research MCP Tools
 * @description MCP tools for shadow-graph research and analysis
 * @module mcp/tools/shadow-graph-research
 */

import { Database } from "bun:sqlite";
import type { MCPTool } from "../server";
import { buildShadowGraph } from "../../arbitrage/shadow-graph/shadow-graph-builder";
import { monitorHiddenSteam } from "../../arbitrage/shadow-graph/hidden-steam-detector";
import { ShadowArbitrageScanner } from "../../arbitrage/shadow-graph/shadow-arb-scanner";
import { Q1_TOTAL_CASE_STUDY } from "../../arbitrage/shadow-graph/shadow-graph-case-study";
import type {
	ShadowGraph,
	ShadowNode,
	ShadowEdge,
	ShadowNodeRow,
	ShadowEdgeRow,
} from "../../arbitrage/shadow-graph/types";
import { NodeVisibility } from "../../arbitrage/shadow-graph/types";
import {
	initializeShadowGraphDatabase,
	rowToShadowNode,
	rowToShadowEdge,
} from "../../arbitrage/shadow-graph/shadow-graph-database";

/**
 * 1.1.1.1.1.7.0: Shadow-Graph Research Tools
 */
export const shadowGraphResearchTools: MCPTool[] = [
	{
		name: "research-scan-hidden-steam",
		description: "1.1.1.1.1.7.1: Scan for hidden steam across all events",
		// 1.1.1.1.1.7.5: Input-Schema Definitions
		inputSchema: {
			type: "object",
			properties: {
				sport: {
					type: "string",
					enum: ["nfl", "nba", "mlb", "all"],
					description: "Sport to scan",
				},
				minSeverity: {
					type: "number",
					minimum: 0,
					maximum: 10,
					default: 7,
					description: "Minimum severity score",
				},
				sharpOnly: {
					type: "boolean",
					default: true,
					description: "Only show confirmed sharp money",
				},
				timeWindow: {
					type: "string",
					enum: ["1h", "6h", "24h", "7d"],
					default: "24h",
					description: "Time window for scanning",
				},
			},
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				initializeShadowGraphDatabase(db);

				// Convert time window to milliseconds
				const timeWindowMs: Record<string, number> = {
					"1h": 3600000,
					"6h": 21600000,
					"24h": 86400000,
					"7d": 604800000,
				};
				const timeRange = timeWindowMs[args.timeWindow || "24h"];

				// Query for hidden nodes (filter by sport if specified)
				const hiddenNodeRows = db
					.query<ShadowNodeRow, [string, number]>(
						`SELECT * FROM shadow_nodes 
					 WHERE visibility IN ('api_only', 'dark') 
					 AND (event_id LIKE ?1 OR ?1 = 'all')
					 AND last_updated > ?2`,
					)
					.all(
						args.sport === "all" ? "%" : `%${args.sport}%`,
						Date.now() - timeRange,
					);

				// Query for visible nodes
				const visibleNodeRows = db
					.query<ShadowNodeRow, [string, number]>(
						`SELECT * FROM shadow_nodes 
					 WHERE visibility = 'display' 
					 AND (event_id LIKE ?1 OR ?1 = 'all')
					 AND last_updated > ?2`,
					)
					.all(
						args.sport === "all" ? "%" : `%${args.sport}%`,
						Date.now() - timeRange,
					);

				const hiddenNodes = hiddenNodeRows.map(rowToShadowNode);
				const visibleNodes = visibleNodeRows.map(rowToShadowNode);

				// Get historical data
				const historicalData = new Map();
				for (const node of [...hiddenNodes, ...visibleNodes]) {
					const history = db
						.query<{ timestamp: number; odds: number }, [string]>(
							`SELECT timestamp, odds FROM shadow_node_history 
						 WHERE node_id = ?1 
						 ORDER BY timestamp DESC 
						 LIMIT 100`,
						)
						.all(node.nodeId);
					historicalData.set(node.nodeId, history);
				}

				// Monitor for hidden steam
				const allEvents = await monitorHiddenSteam(
					visibleNodes,
					hiddenNodes,
					historicalData,
				);

				// Filter events
				const filtered = allEvents.filter(
					(e) =>
						e.severity >= (args.minSeverity || 7) &&
						(!args.sharpOnly || e.sharpMoneyIndicator === "confirmed"),
				);

				db.close();

				// 1.1.1.1.1.7.7: Return Content Formatter
				return {
					content: [
						{
							type: "text",
							text:
								`🔍 Hidden Steam Scan Results\n` +
								`Time: ${new Date().toISOString()}\n` +
								`Sport: ${args.sport || "all"}\n` +
								`Events Found: ${filtered.length}\n\n` +
								filtered
									.map(
										(e) =>
											`• ${e.eventId} | Severity: ${e.severity} | ` +
											`Lag: ${(e.visibleLagMs / 1000).toFixed(1)}s | ` +
											`Move: ${e.hiddenMoveSize}pts | ` +
											`Sharp: ${e.sharpMoneyIndicator}`,
									)
									.join("\n"),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error scanning hidden steam: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
	{
		name: "research-build-shadow-graph",
		description: "1.1.1.1.1.7.2: Build complete shadow graph for analysis",
		inputSchema: {
			type: "object",
			properties: {
				eventId: {
					type: "string",
					required: true,
					description: "Event ID to build graph for",
				},
				includeHidden: {
					type: "boolean",
					default: true,
					description: "Include hidden/dark nodes",
				},
				maxNodes: {
					type: "number",
					default: 100,
					description: "Maximum nodes to return",
				},
			},
			required: ["eventId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				initializeShadowGraphDatabase(db);

				// Query nodes for event
				const nodeRows = db
					.query<ShadowNodeRow, [string, boolean]>(
						`SELECT * FROM shadow_nodes 
					 WHERE event_id = ?1 
					 ${args.includeHidden !== false ? "" : "AND visibility = 'display'"}
					 LIMIT ?2`,
					)
					.all(args.eventId, args.maxNodes || 100);

				const nodes = nodeRows.map(rowToShadowNode);

				// Query edges
				const edgeRows = db
					.query<ShadowEdgeRow, [string]>(
						`SELECT * FROM shadow_edges 
					 WHERE from_node_id IN (SELECT node_id FROM shadow_nodes WHERE event_id = ?1)
					 OR to_node_id IN (SELECT node_id FROM shadow_nodes WHERE event_id = ?1)`,
					)
					.all(args.eventId);

				const edges = edgeRows.map(rowToShadowEdge);

				// Build graph
				const graph = buildShadowGraph(nodes, edges);

				// Convert to arrays for serialization
				const nodeArray = Array.from(graph.nodes.values()).slice(
					0,
					args.maxNodes || 100,
				);
				const edgeArray = Array.from(graph.edges.values()).slice(
					0,
					(args.maxNodes || 100) * 10,
				);

				// 1.1.1.1.1.7.6: Binary Export Buffer
				const graphData = {
					metadata: {
						eventId: args.eventId,
						generatedAt: Date.now(),
						nodeCount: graph.nodes.size,
						edgeCount: graph.edges.size,
						darkNodeCount: nodeArray.filter((n) => n.visibility === "dark")
							.length,
					},
					nodes: nodeArray,
					edges: edgeArray,
				};

				db.close();

				return {
					content: [
						{
							type: "text",
							text:
								`🌑 Shadow Graph Built\n` +
								`Event: ${args.eventId}\n` +
								`Total Nodes: ${graph.nodes.size}\n` +
								`Dark Nodes: ${graphData.metadata.darkNodeCount}\n` +
								`Hidden Arb Edges: ${edgeArray.filter((e) => e.hiddenArbitrage).length}`,
						},
						{
							type: "text",
							mimeType: "application/json",
							data: Buffer.from(JSON.stringify(graphData, null, 2)),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error building shadow graph: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
	{
		name: "research-measure-propagation-latency",
		description: "1.1.1.1.1.7.3: Measure latency between node movements",
		inputSchema: {
			type: "object",
			properties: {
				fromNodeId: {
					type: "string",
					required: true,
					description: "Source node ID",
				},
				toNodeId: {
					type: "string",
					required: true,
					description: "Target node ID",
				},
				sampleSize: {
					type: "number",
					default: 100,
					description: "Number of samples to analyze",
				},
			},
			required: ["fromNodeId", "toNodeId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				initializeShadowGraphDatabase(db);

				// Measure latency from line movements table (if exists)
				// Fallback to edge latency if movements table doesn't exist
				let latencies: {
					avg_lag_ms: number;
					median_lag_ms: number;
					sample_count: number;
				};

				try {
					const result = db
						.query<
							{
								avg_lag_ms: number;
								median_lag_ms: number;
								sample_count: number;
							},
							[string, string, number]
						>(
							`SELECT 
						 AVG(m2.timestamp - m1.timestamp) as avg_lag_ms,
						 COUNT(*) as sample_count
					 FROM line_movements m1
					 JOIN line_movements m2 ON m1.event_id = m2.event_id
					 WHERE m1.node_id = ?1 AND m2.node_id = ?2
					   AND m2.timestamp - m1.timestamp BETWEEN 0 AND 300000
					 LIMIT ?3`,
						)
						.get(args.fromNodeId, args.toNodeId, args.sampleSize || 100);

					latencies = result || {
						avg_lag_ms: 0,
						median_lag_ms: 0,
						sample_count: 0,
					};
				} catch {
					// Fallback to edge latency
					const edgeRow = db
						.query<ShadowEdgeRow, [string, string]>(
							`SELECT * FROM shadow_edges 
						 WHERE (from_node_id = ?1 AND to_node_id = ?2) 
						 OR (from_node_id = ?2 AND to_node_id = ?1)`,
						)
						.get(args.fromNodeId, args.toNodeId);

					if (edgeRow) {
						const edge = rowToShadowEdge(edgeRow);
						latencies = {
							avg_lag_ms: edge.latencyMs || 0,
							median_lag_ms: edge.latencyMs || 0,
							sample_count: 1,
						};
					} else {
						latencies = {
							avg_lag_ms: 0,
							median_lag_ms: 0,
							sample_count: 0,
						};
					}
				}

				db.close();

				return {
					content: [
						{
							type: "text",
							text:
								`⏱️ Propagation Latency\n` +
								`From: ${args.fromNodeId}\n` +
								`To: ${args.toNodeId}\n` +
								`Samples: ${latencies.sample_count}\n` +
								`Average: ${(latencies.avg_lag_ms / 1000).toFixed(2)}s\n` +
								`Median: ${(latencies.median_lag_ms / 1000).toFixed(2)}s`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error measuring latency: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
	{
		name: "research-detect-bait-lines",
		description:
			"1.1.1.1.1.7.4: Detect bait lines (displayed but not tradable)",
		inputSchema: {
			type: "object",
			properties: {
				bookmaker: {
					type: "string",
					enum: ["draftkings", "fanduel", "betmgm"],
					description: "Bookmaker to scan",
				},
				eventId: {
					type: "string",
					description: "Optional event ID filter",
				},
				probeAmount: {
					type: "number",
					default: 1.0,
					description: "Amount to probe with",
				},
			},
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				initializeShadowGraphDatabase(db);

				// Query for potential bait lines
				// Bait lines typically have:
				// - Displayed liquidity but probe fails
				// - is_bait_line flag set
				// - Low actual liquidity
				const query = args.eventId
					? db.query<ShadowNodeRow, [string, string]>(
							`SELECT * FROM shadow_nodes 
							 WHERE bookmaker = ?1 
							 AND event_id = ?2
							 AND is_bait_line = 1`,
						)
					: db.query<ShadowNodeRow, [string]>(
							`SELECT * FROM shadow_nodes 
							 WHERE bookmaker = ?1 
							 AND is_bait_line = 1`,
						);

				const baitLineRows = args.eventId
					? query.all(args.bookmaker || "%", args.eventId)
					: query.all(args.bookmaker || "%");

				const baitLines = baitLineRows.map(rowToShadowNode);
				db.close();

				return {
					content: [
						{
							type: "text",
							text:
								`🎣 Bait Line Detection\n` +
								`Bookmaker: ${args.bookmaker || "all"}\n` +
								`Event: ${args.eventId || "All"}\n` +
								`Bait Lines Found: ${baitLines.length}\n\n` +
								baitLines
									.map(
										(line, i) =>
											`${i + 1}. ${line.marketId} @ ${line.lastOdds || "N/A"} ` +
											`(Displayed: $${line.displayedLiquidity}, ` +
											`Actual: $${line.hiddenLiquidity + line.reservedLiquidity})`,
									)
									.join("\n"),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error detecting bait lines: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
];
