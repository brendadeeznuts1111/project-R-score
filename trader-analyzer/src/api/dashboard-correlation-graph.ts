/**
 * Dashboard Correlation Graph Data Aggregation
 * Part of 4.2.2.4.0.0.0 Frontend Implementation & Interaction
 * 
 * Aggregates data from line_movement_audit_v2 and url_anomaly_audit tables
 * to build multi-layer correlation graph data for frontend visualization.
 * 
 * Strategic Benefits (4.2.2.5.0.0.0):
 * - 4.2.2.5.1.0.0: Holistic Insight - Consolidated view of complex relationships across siloed data
 * - 4.2.2.5.2.0.0: Accelerated Root Cause Analysis - Visual correlation identification for anomalies
 * - 4.2.2.5.3.0.0: Enhanced Pattern Discovery - Multi-layered correlation pattern detection
 * - 4.2.2.5.4.0.0: Improved Debugging & Optimization - Understand impact of changes across metrics
 * 
 * Performance Metrics:
 * - Derives performance metrics from line_movement_audit_v2 (response_size, timestamps)
 * - Calculates latency from timestamp deltas
 * - Aggregates performance data for correlation analysis
 * 
 * Logging:
 * - Uses Bun-native logger (src/utils/bun-logger.ts)
 * - Direct stdout.write() for fast output (bypasses console wrapper)
 * - Bun's built-in ANSI colors (no external color library)
 * - Bun's Temporal polyfill (no external date/time library)
 * - Structured object logging benefits from bunfig.toml depth=5 setting
 * - See: BUN_DOCS_URLS.DOCS/runtime/console#object-inspection-depth
 */

import { Database } from "bun:sqlite";
import { correlationGraphLogger } from "../utils/bun-logger";
import { drawCorrelationGraphBanner } from "../utils/banner";
import type {
	CorrelationGraphOperationResult,
	CorrelationGraphAuditLog,
} from "../logging/types";
import { BUN_DOCS_URLS } from "../utils/rss-constants";
import type {
	MultiLayerCorrelationGraphData,
	CorrelationNode,
	CorrelationEdge,
	LayerSummary,
	GraphStatistics,
	NodeSummaryData,
} from "../types/dashboard-correlation-graph";

// In-memory cache with TTL
interface CacheEntry {
	data: MultiLayerCorrelationGraphData;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get database instance (research.db)
 * Uses Bun-native file checking (Bun.file().size) instead of fs.stat
 */
async function getDatabase(): Promise<Database> {
	const dbPath = "./data/research.db";
	const dbFile = Bun.file(dbPath);
	
	// Check if database exists using Bun-native API
	const exists = await dbFile.exists();
	const hasContent = exists && dbFile.size > 0;
	
	correlationGraphLogger.debug("Opening database", { 
		dbPath, 
		exists, 
		hasContent,
		size: exists ? dbFile.size : 0,
	});
	
	const db = new Database(dbPath, { create: true });
	correlationGraphLogger.debug("Database opened", { dbPath });
	return db;
}

/**
 * Calculate correlation strength between two bookmakers based on their activity patterns
 */
function calculateCorrelationStrength(
	bookmaker1Data: Array<{ timestamp: number; responseSize: number }>,
	bookmaker2Data: Array<{ timestamp: number; responseSize: number }>,
): number {
	if (bookmaker1Data.length === 0 || bookmaker2Data.length === 0) {
		return 0;
	}

	// Simple time-based correlation: check if activities happen within similar time windows
	const timeWindow = 60000; // 1 minute window
	let correlatedEvents = 0;
	let totalEvents = Math.max(bookmaker1Data.length, bookmaker2Data.length);

	for (const event1 of bookmaker1Data) {
		for (const event2 of bookmaker2Data) {
			if (Math.abs(event1.timestamp - event2.timestamp) < timeWindow) {
				correlatedEvents++;
				break;
			}
		}
	}

	return Math.min(correlatedEvents / totalEvents, 1.0);
}

/**
 * Determine layer based on bookmaker relationships and event correlations
 */
function determineLayer(
	bookmaker: string,
	eventId: string,
	bookmakerSet: Set<string>,
	eventBookmakers: Map<string, Set<string>>,
): 1 | 2 | 3 | 4 {
	const eventBookmakersSet = eventBookmakers.get(eventId) || new Set();
	
	// Layer 1: Direct anomaly detection (bookmaker has anomalies)
	// Layer 2: Cross-bookmaker correlation within same event
	if (eventBookmakersSet.size > 1 && eventBookmakersSet.has(bookmaker)) {
		return 2;
	}
	
	// Layer 3: Cross-event correlation
	if (bookmakerSet.size > 1) {
		return 3;
	}
	
	// Layer 4: Cross-market correlation (default for complex relationships)
	return 4;
}

/**
 * Map threat_level to severity
 */
function mapThreatLevelToSeverity(threatLevel: string): "low" | "medium" | "high" | "critical" {
	const normalized = threatLevel.toLowerCase();
	if (normalized.includes("critical") || normalized.includes("high")) {
		return "critical";
	}
	if (normalized.includes("medium") || normalized.includes("moderate")) {
		return "high";
	}
	if (normalized.includes("low")) {
		return "low";
	}
	return "medium";
}

/**
 * Generate deeplink URL for a node
 */
function generateDeeplinkUrl(eventId: string, nodeId: string, bookmaker?: string): string {
	const params = new URLSearchParams({
		event_id: eventId,
		node_id: nodeId,
	});
	if (bookmaker) {
		params.set("bookmaker", bookmaker);
	}
	return `/dashboard?deeplink=${encodeURIComponent(params.toString())}`;
}

/**
 * Aggregate correlation graph data from database
 */
export async function aggregateCorrelationGraphData(
	eventId: string,
	timeWindowHours: number,
	requestId?: string,
): Promise<MultiLayerCorrelationGraphData> {
	const startTime = performance.now();
	const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	
	// Generate cache key (simple string key, hash not needed for in-memory cache)
	const cacheKey = `correlation-graph:${eventId}:${timeWindowHours}`;
	
		// Use Bun's console.info for structured logging
		// Benefits from bunfig.toml [console] depth=5 setting
		// See: BUN_DOCS_URLS.DOCS/runtime/console#object-inspection-depth
		console.info(`[correlation-graph] Starting aggregation:`, {
			eventId,
			timeWindow: `${timeWindowHours}h`,
			operationId,
			requestId: requestId || 'none',
		});
	
	// Check cache
	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		const cacheAge = Math.floor((Date.now() - (cached.expiresAt - CACHE_TTL_MS)) / 1000);
		const duration = performance.now() - startTime;
		
		correlationGraphLogger.debug("Cache hit", {
			cacheKey,
			cacheAge: `${cacheAge}s`,
			operationId,
		});
		
		// Log operation result
		const operationResult: CorrelationGraphOperationResult = {
			operationId,
			eventId,
			timeWindow: timeWindowHours,
			requestId,
			success: true,
			duration,
			nodesGenerated: cached.data.nodes.length,
			edgesGenerated: cached.data.edges.length,
			bookmakersProcessed: cached.data.statistics.bookmakers.length,
			layersProcessed: cached.data.layers.length,
			cacheHit: true,
			cacheAge,
		};
		// Use Bun-native logger for cached operation result
		correlationGraphLogger.debug("Operation result (cached)", operationResult);
		
		return cached.data;
	}
	correlationGraphLogger.debug("Cache miss, querying database", {
		cacheKey,
		operationId,
	});

	const db = await getDatabase();
	const now = Date.now();
	const startTimeWindow = now - timeWindowHours * 60 * 60 * 1000;

	try {
		// Query aggregated data with optimized SQL (SQLite-compatible)
		// Use LEFT JOIN to combine movement and anomaly data
		const query = db.query<
			{
				bookmaker: string;
				eventId: string;
				threat_level: string | null;
				timestamp: number;
				response_size: number | null;
				anomaly_count: number;
				movement_count: number;
			},
			[number, number, string]
		>(`
			WITH time_window AS (
				SELECT ?1 as start_time, ?2 as end_time
			),
			movement_agg AS (
				SELECT 
					lma.bookmaker,
					lma.eventId,
					MAX(lma.timestamp) as timestamp,
					AVG(lma.response_size) as response_size,
					COUNT(*) as movement_count
				FROM line_movement_audit_v2 lma
				WHERE lma.eventId = ?3
					AND lma.timestamp >= (SELECT start_time FROM time_window)
					AND lma.timestamp <= (SELECT end_time FROM time_window)
				GROUP BY lma.bookmaker, lma.eventId
			),
			anomaly_agg AS (
				SELECT 
					uaa.bookmaker,
					uaa.eventId,
					MAX(uaa.threat_level) as threat_level,
					MAX(uaa.detected_at) as timestamp,
					COUNT(*) as anomaly_count
				FROM url_anomaly_audit uaa
				WHERE uaa.eventId = ?3
					AND uaa.detected_at >= (SELECT start_time FROM time_window)
					AND uaa.detected_at <= (SELECT end_time FROM time_window)
				GROUP BY uaa.bookmaker, uaa.eventId
			)
			SELECT 
				COALESCE(m.bookmaker, a.bookmaker) as bookmaker,
				COALESCE(m.eventId, a.eventId) as eventId,
				a.threat_level,
				COALESCE(m.timestamp, a.timestamp) as timestamp,
				m.response_size,
				COALESCE(a.anomaly_count, 0) as anomaly_count,
				COALESCE(m.movement_count, 0) as movement_count
			FROM movement_agg m
			LEFT JOIN anomaly_agg a ON m.bookmaker = a.bookmaker AND m.eventId = a.eventId
			UNION ALL
			SELECT 
				a.bookmaker,
				a.eventId,
				a.threat_level,
				a.timestamp,
				NULL as response_size,
				a.anomaly_count,
				0 as movement_count
			FROM anomaly_agg a
			WHERE NOT EXISTS (
				SELECT 1 FROM movement_agg m 
				WHERE m.bookmaker = a.bookmaker AND m.eventId = a.eventId
			)
			ORDER BY timestamp DESC
		`);

		const queryStartTime = performance.now();
		const rawData = query.all(startTimeWindow, now, eventId);
		const queryDuration = performance.now() - queryStartTime;
		correlationGraphLogger.info("SQL query completed", {
			duration: `${queryDuration.toFixed(2)}ms`,
			rows: rawData.length,
			operationId,
		});

		// Build bookmaker and event mappings
		const bookmakerSet = new Set<string>();
		const eventBookmakers = new Map<string, Set<string>>();
		const bookmakerData = new Map<string, Array<{ timestamp: number; responseSize: number }>>();

		for (const row of rawData) {
			bookmakerSet.add(row.bookmaker);
			if (!eventBookmakers.has(row.eventId)) {
				eventBookmakers.set(row.eventId, new Set());
			}
			eventBookmakers.get(row.eventId)!.add(row.bookmaker);

			if (!bookmakerData.has(row.bookmaker)) {
				bookmakerData.set(row.bookmaker, []);
			}
			bookmakerData.get(row.bookmaker)!.push({
				timestamp: row.timestamp,
				responseSize: row.response_size || 0,
			});
		}

		// Use Bun-native logger for structured data display
		correlationGraphLogger.debug("Data processed", {
			rows: rawData.length,
			bookmakers: bookmakerSet.size,
			events: eventBookmakers.size,
			bookmakerList: Array.from(bookmakerSet),
		});

		// Generate nodes
		const nodeStartTime = performance.now();
		const nodes: CorrelationNode[] = [];
		const nodeMap = new Map<string, CorrelationNode>();

		for (const row of rawData) {
			const nodeId = `${row.bookmaker}-${row.eventId}`;
			if (nodeMap.has(nodeId)) {
				continue;
			}

			const layer = determineLayer(row.bookmaker, row.eventId, bookmakerSet, eventBookmakers);
			const severity = mapThreatLevelToSeverity(row.threat_level || "medium");
			
			// Get activity data for this bookmaker
			const activityData = bookmakerData.get(row.bookmaker) || [];
			
			// Calculate correlation strength based on activity frequency
			const correlationStrength = Math.min(activityData.length / 100, 1.0); // Normalize to 0-1

			// Calculate average latency from timestamp deltas in activity data
			let avgLatency: number | undefined = undefined;
			if (activityData.length > 1) {
				const sortedData = [...activityData].sort((a, b) => a.timestamp - b.timestamp);
				const latencies: number[] = [];
				for (let i = 1; i < sortedData.length; i++) {
					const delta = sortedData[i].timestamp - sortedData[i - 1].timestamp;
					if (delta > 0 && delta < 3600000) { // Filter out unreasonable deltas (>1 hour)
						latencies.push(delta);
					}
				}
				if (latencies.length > 0) {
					avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
				}
			}

			const summaryData: NodeSummaryData = {
				anomalyCount: row.anomaly_count || 0,
				movementCount: row.movement_count || 0,
				avgLatency,
				threatLevel: row.threat_level || "medium",
				lastSeen: row.timestamp,
			};

			const node: CorrelationNode = {
				id: nodeId,
				label: `${row.bookmaker} (${row.eventId.slice(0, 8)})`,
				layer,
				bookmaker: row.bookmaker,
				severity,
				correlationStrength,
				summaryData,
				deeplinkUrl: generateDeeplinkUrl(row.eventId, nodeId, row.bookmaker),
			};

			nodes.push(node);
			nodeMap.set(nodeId, node);
		}

		const nodeDuration = performance.now() - nodeStartTime;
		correlationGraphLogger.debug("Nodes generated", {
			count: nodes.length,
			duration: `${nodeDuration.toFixed(2)}ms`,
			byLayer: {
				1: nodes.filter(n => n.layer === 1).length,
				2: nodes.filter(n => n.layer === 2).length,
				3: nodes.filter(n => n.layer === 3).length,
				4: nodes.filter(n => n.layer === 4).length,
			},
		});

		// Generate edges based on correlation
		const edgeStartTime = performance.now();
		const edges: CorrelationEdge[] = [];
		const nodeArray = Array.from(nodes);
		
		for (let i = 0; i < nodeArray.length; i++) {
			for (let j = i + 1; j < nodeArray.length; j++) {
				const node1 = nodeArray[i];
				const node2 = nodeArray[j];

				// Only create edges between nodes in same event or related events
				if (node1.bookmaker === node2.bookmaker) {
					continue; // Skip self-connections
				}

				const data1 = bookmakerData.get(node1.bookmaker!) || [];
				const data2 = bookmakerData.get(node2.bookmaker!) || [];
				const correlationStrength = calculateCorrelationStrength(data1, data2);

				// Only create edge if correlation is significant
				if (correlationStrength > 0.1) {
				const edgeLayer = Math.max(node1.layer, node2.layer) as 1 | 2 | 3 | 4;
				const edgeId = `${node1.id}-${node2.id}`;

				// Calculate latency between correlated events
				let latency: number | undefined = undefined;
				if (data1.length > 0 && data2.length > 0) {
					const timeDeltas: number[] = [];
					for (const event1 of data1) {
						for (const event2 of data2) {
							const delta = Math.abs(event1.timestamp - event2.timestamp);
							if (delta < 600000) { // Within 10 minutes
								timeDeltas.push(delta);
							}
						}
					}
					if (timeDeltas.length > 0) {
						latency = timeDeltas.reduce((sum, d) => sum + d, 0) / timeDeltas.length;
					}
				}

				edges.push({
					id: edgeId,
					source: node1.id,
					target: node2.id,
					layer: edgeLayer,
					correlationStrength,
					latency,
					confidence: correlationStrength * 0.8, // Confidence based on correlation strength
				});
				}
			}
		}

		const edgeDuration = performance.now() - edgeStartTime;
		correlationGraphLogger.debug("Edges generated", {
			count: edges.length,
			duration: `${edgeDuration.toFixed(2)}ms`,
			byLayer: {
				1: edges.filter(e => e.layer === 1).length,
				2: edges.filter(e => e.layer === 2).length,
				3: edges.filter(e => e.layer === 3).length,
				4: edges.filter(e => e.layer === 4).length,
			},
			avgCorrelation: edges.length > 0
				? (edges.reduce((sum, e) => sum + e.correlationStrength, 0) / edges.length).toFixed(3)
				: '0.000',
		});

		// Calculate layer summaries
		const layerStartTime = performance.now();
		const layerSummaries: LayerSummary[] = [];
		for (let layer = 1; layer <= 4; layer++) {
			const layerNodes = nodes.filter((n) => n.layer === layer);
			const layerEdges = edges.filter((e) => e.layer === layer);
			const avgCorrelation =
				layerEdges.length > 0
					? layerEdges.reduce((sum, e) => sum + e.correlationStrength, 0) / layerEdges.length
					: 0;

			layerSummaries.push({
				layer,
				nodeCount: layerNodes.length,
				edgeCount: layerEdges.length,
				avgCorrelationStrength: avgCorrelation,
			});
		}

		const layerDuration = performance.now() - layerStartTime;
		correlationGraphLogger.debug("Layer summaries calculated", {
			duration: `${layerDuration.toFixed(2)}ms`,
			layers: layerSummaries.map(l => ({
				layer: l.layer,
				nodes: l.nodeCount,
				edges: l.edgeCount,
				avgCorrelation: l.avgCorrelationStrength.toFixed(3),
			})),
		});

		// Calculate statistics
		const statsStartTime = performance.now();
		const allBookmakers = Array.from(bookmakerSet);
		const allCorrelations = edges.map((e) => e.correlationStrength);
		const statistics: GraphStatistics = {
			totalNodes: nodes.length,
			totalEdges: edges.length,
			avgCorrelationStrength:
				allCorrelations.length > 0
					? allCorrelations.reduce((sum, c) => sum + c, 0) / allCorrelations.length
					: 0,
			maxCorrelationStrength: allCorrelations.length > 0 ? Math.max(...allCorrelations) : 0,
			bookmakers: allBookmakers,
			timeRange: { start: startTimeWindow, end: now },
		};

		const statsDuration = performance.now() - statsStartTime;
		correlationGraphLogger.debug("Statistics calculated", {
			duration: `${statsDuration.toFixed(2)}ms`,
			statistics: {
				totalNodes: statistics.totalNodes,
				totalEdges: statistics.totalEdges,
				avgCorrelation: statistics.avgCorrelationStrength.toFixed(3),
				maxCorrelation: statistics.maxCorrelationStrength.toFixed(3),
				bookmakers: statistics.bookmakers,
			},
		});

		const result: MultiLayerCorrelationGraphData = {
			eventId,
			timeWindow: timeWindowHours,
			generatedAt: now,
			nodes,
			edges,
			layers: layerSummaries,
			statistics,
		};

		// Cache the result
		cache.set(cacheKey, {
			data: result,
			expiresAt: now + CACHE_TTL_MS,
		});

		const totalDuration = performance.now() - startTime;
		correlationGraphLogger.info("Aggregation complete", {
			nodes: nodes.length,
			edges: edges.length,
			bookmakers: allBookmakers.length,
			duration: `${totalDuration.toFixed(2)}ms`,
			operationId,
		});

		// Draw banner for successful aggregation (only in development/debug mode)
		if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
			drawCorrelationGraphBanner({
				eventId,
				timeWindow: timeWindowHours,
				nodes: nodes.length,
				edges: edges.length,
				bookmakers: allBookmakers.length,
				duration: `${totalDuration.toFixed(2)}ms`,
				operationId,
			});
		}
		// Use Bun's console for structured performance breakdown
		console.debug(`[correlation-graph] Performance breakdown:`, {
			query: `${queryDuration.toFixed(2)}ms`,
			nodes: `${nodeDuration.toFixed(2)}ms`,
			edges: `${edgeDuration.toFixed(2)}ms`,
			layers: `${layerDuration.toFixed(2)}ms`,
			stats: `${statsDuration.toFixed(2)}ms`,
			total: `${totalDuration.toFixed(2)}ms`,
		});

		// Log operation result
		const operationResult: CorrelationGraphOperationResult = {
			operationId,
			eventId,
			timeWindow: timeWindowHours,
			requestId,
			success: true,
			duration: totalDuration,
			nodesGenerated: nodes.length,
			edgesGenerated: edges.length,
			bookmakersProcessed: allBookmakers.length,
			layersProcessed: layerSummaries.length,
			cacheHit: false,
			performanceBreakdown: {
				queryTime: queryDuration,
				nodeGenerationTime: nodeDuration,
				edgeGenerationTime: edgeDuration,
				layerCalculationTime: layerDuration,
				statisticsTime: statsDuration,
			},
		};
		// Use Bun-native logger with structured objects
		// Depth=5 in bunfig.toml shows full nested performanceBreakdown structure
		correlationGraphLogger.debug("Operation result", {
			operationId: operationResult.operationId,
			eventId: operationResult.eventId,
			success: operationResult.success,
			duration: `${operationResult.duration.toFixed(2)}ms`,
			nodes: operationResult.nodesGenerated,
			edges: operationResult.edgesGenerated,
			bookmakers: operationResult.bookmakersProcessed,
			performance: operationResult.performanceBreakdown,
		});

		return result;
	} catch (error) {
		const errorDuration = performance.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		correlationGraphLogger.error("Aggregation error", {
			eventId,
			operationId,
			error: errorMessage,
			duration: `${errorDuration.toFixed(2)}ms`,
			stack: error instanceof Error ? error.stack : undefined,
		});
		
		// Log operation result with error
		const operationResult: CorrelationGraphOperationResult = {
			operationId,
			eventId,
			timeWindow: timeWindowHours,
			requestId,
			success: false,
			duration: errorDuration,
			error: errorMessage,
		};
		// Use Bun-native logger for error result
		correlationGraphLogger.error("Operation result (error)", {
			operationId: operationResult.operationId,
			eventId: operationResult.eventId,
			success: operationResult.success,
			duration: `${operationResult.duration.toFixed(2)}ms`,
			error: operationResult.error,
		});
		
		throw error;
	} finally {
		db.close();
		correlationGraphLogger.debug("Database connection closed");
	}
}

/**
 * Invalidate cache for a specific event or all events
 */
export function invalidateCache(eventId?: string, requestId?: string): void {
	const operationId = `invalidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	
	if (eventId) {
		// Remove all cache entries for this event
		let deletedCount = 0;
		for (const [key] of cache) {
			if (key.includes(`:${eventId}:`)) {
				cache.delete(key);
				deletedCount++;
			}
		}
		correlationGraphLogger.info("Cache invalidated", {
			eventId,
			deletedCount,
			operationId,
			requestId: requestId || 'none',
		});
		
		// Log audit entry
		const auditLog: CorrelationGraphAuditLog = {
			auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			eventId,
			timeWindow: 0,
			requestId: requestId || operationId,
			operation: "cache_invalidate",
			success: true,
			duration: 0,
			metadata: { deletedCount, cacheKey: eventId },
		};
		correlationGraphLogger.debug("Cache invalidation audit", auditLog);
	} else {
		// Clear all cache
		const cacheSize = cache.size;
		cache.clear();
		correlationGraphLogger.info("All cache cleared", {
			deletedCount: cacheSize,
			operationId,
			requestId: requestId || 'none',
		});
		
		// Log audit entry
		const auditLog: CorrelationGraphAuditLog = {
			auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			eventId: "all",
			timeWindow: 0,
			requestId: requestId || operationId,
			operation: "cache_invalidate",
			success: true,
			duration: 0,
			metadata: { deletedCount: cacheSize },
		};
		correlationGraphLogger.debug("Cache invalidation audit", auditLog);
	}
}
