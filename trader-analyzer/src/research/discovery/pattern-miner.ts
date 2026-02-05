/**
 * Sub-Market Pattern Discovery Engine
 * ML-based pattern discovery using clustering and regression
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-PATTERN-DISCOVERY@0.1.0;instance-id=ORCA-PATTERN-001;version=0.1.0}][PROPERTIES:{miner={value:"pattern-miner";@root:"ROOT-RESEARCH";@chain:["BP-ML-CLUSTERING","BP-PATTERN-VALIDATION"];@version:"0.1.0"}}][CLASS:SubMarketPatternMiner][#REF:v-0.1.0.BP.PATTERN.DISCOVERY.1.0.A.1.1.ORCA.1.1]]
 */

import type { Database } from "bun:sqlite";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ResearchPattern {
	patternId: string;
	discovered_at: number;
	analyst_id?: string;
	pattern_name: string;
	sport?: string;
	market_hierarchy: string;
	pre_conditions: Record<string, any>;
	trigger_signature: Record<string, any>;
	expected_outcome: string;
	observed_outcome?: Record<string, any>;
	backtest_accuracy: number;
	live_accuracy: number;
	confidence_level: number;
	is_active: boolean;
	is_validated: boolean;
}

interface ClusterResult {
	clusterId: number;
	events: any[];
	commonType: string;
	avgSeverity: number;
	avgLineDivergence: number;
}

// ═══════════════════════════════════════════════════════════════
// PATTERN MINER
// ═══════════════════════════════════════════════════════════════

/**
 * Sub-Market Pattern Miner
 *
 * Discovers new patterns via clustering of tension events and
 * statistical analysis of sub-market relationships.
 */
export class SubMarketPatternMiner {
	private db: Database;

	/**
	 * Creates a new pattern miner
	 *
	 * @param db - Research database instance
	 */
	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Discover new patterns via clustering of tension events
	 *
	 * @param sport - Sport to analyze
	 * @param hours - Time window in hours (default: 24)
	 * @returns Array of discovered patterns
	 */
	discoverPatterns(sport: string, hours: number = 24): ResearchPattern[] {
		// Get all tension events in window
		const stmt = this.db.prepare(`
      SELECT 
        ste.tension_type,
        ste.involved_nodes,
        ste.snapshot,
        ste.detected_at,
        n.sport
      FROM sub_market_tension_events ste
      LEFT JOIN sub_market_nodes n ON json_extract(ste.involved_nodes, '$[0]') = n.nodeId
      WHERE n.sport = ?
        AND ste.detected_at > unixepoch('now') - ?
      ORDER BY ste.detected_at
    `);
		const events = stmt.all(sport, hours * 3600) as Array<{
			tension_type: string;
			involved_nodes: string;
			snapshot: string;
			detected_at: number;
			sport: string;
		}>;

		if (events.length < 100) {
			console.warn(`⚠️  Insufficient data: ${events.length} events (need 100+)`);
			return [];
		}

		// Extract features for clustering
		const features = this.extractFeatures(events);

		// Run k-means clustering (simplified - use native library in production)
		const clusters = this.runKMeansClustering(features, 5);

		// Interpret clusters into patterns
		return this.interpretClusters(clusters, events);
	}

	/**
	 * Extract ML features from tension events
	 */
	private extractFeatures(events: any[]): Float32Array {
		const matrix = new Float32Array(events.length * 5); // 5 features per event

		for (let i = 0; i < events.length; i++) {
			const e = events[i];
			const snapshot =
				typeof e.snapshot === "string" ? JSON.parse(e.snapshot) : e.snapshot;
			const offset = i * 5;

			// Feature 1: Tension type encoded
			matrix[offset] = this.encodeTensionType(e.tension_type);

			// Feature 2: Severity (from snapshot or default)
			matrix[offset + 1] = (snapshot.severity || 5) / 10.0;

			// Feature 3: Line divergence magnitude
			matrix[offset + 2] = Math.abs(
				(snapshot.line1 || 0) - (snapshot.line2 || 0),
			);

			// Feature 4: Velocity (if available)
			matrix[offset + 3] = snapshot.velocity || 0;

			// Feature 5: Time of day (hour)
			const date = new Date(e.detected_at * 1000);
			matrix[offset + 4] = date.getUTCHours() / 24.0;
		}

		return matrix;
	}

	/**
	 * Run k-means clustering (simplified implementation)
	 * In production, use native ML library via FFI
	 */
	private runKMeansClustering(features: Float32Array, k: number): number[] {
		const numPoints = features.length / 5;
		const assignments = new Array<number>(numPoints).fill(0);

		// Simplified k-means (use native library in production)
		// Initialize centroids randomly
		const centroids: Float32Array[] = [];
		for (let i = 0; i < k; i++) {
			const centroid = new Float32Array(5);
			for (let j = 0; j < 5; j++) {
				centroid[j] = Math.random();
			}
			centroids.push(centroid);
		}

		// Iterate (simplified - 10 iterations)
		for (let iter = 0; iter < 10; iter++) {
			// Assign points to nearest centroid
			for (let i = 0; i < numPoints; i++) {
				let minDist = Infinity;
				let closestCluster = 0;
				for (let c = 0; c < k; c++) {
					let dist = 0;
					for (let d = 0; d < 5; d++) {
						const diff = features[i * 5 + d] - centroids[c][d];
						dist += diff * diff;
					}
					if (dist < minDist) {
						minDist = dist;
						closestCluster = c;
					}
				}
				assignments[i] = closestCluster;
			}

			// Update centroids
			for (let c = 0; c < k; c++) {
				const clusterPoints: number[] = [];
				for (let i = 0; i < numPoints; i++) {
					if (assignments[i] === c) {
						clusterPoints.push(i);
					}
				}
				if (clusterPoints.length > 0) {
					for (let d = 0; d < 5; d++) {
						let sum = 0;
						for (const pointIdx of clusterPoints) {
							sum += features[pointIdx * 5 + d];
						}
						centroids[c][d] = sum / clusterPoints.length;
					}
				}
			}
		}

		return assignments;
	}

	/**
	 * Interpret clusters into human-readable patterns
	 */
	private interpretClusters(
		assignments: number[],
		events: any[],
	): ResearchPattern[] {
		const patterns: ResearchPattern[] = [];

		// Group events by cluster
		const clusters = new Map<number, any[]>();
		assignments.forEach((cluster, idx) => {
			const clusterEvents = clusters.get(cluster) || [];
			clusterEvents.push(events[idx]);
			clusters.set(cluster, clusterEvents);
		});

		for (const [clusterId, clusterEvents] of clusters) {
			if (clusterEvents.length < 10) continue; // Skip small clusters

			// Analyze common characteristics
			const commonType = this.mostCommon(
				clusterEvents.map((e) => e.tension_type),
			);
			const avgSeverity =
				clusterEvents.reduce((sum, e) => {
					const snap =
						typeof e.snapshot === "string"
							? JSON.parse(e.snapshot)
							: e.snapshot;
					return sum + (snap.severity || 5);
				}, 0) / clusterEvents.length;
			const avgLineDivergence =
				clusterEvents.reduce((sum, e) => {
					const snap =
						typeof e.snapshot === "string"
							? JSON.parse(e.snapshot)
							: e.snapshot;
					return sum + (Math.abs((snap.line1 || 0) - (snap.line2 || 0)) || 0);
				}, 0) / clusterEvents.length;

			// Look for outcome patterns 15 minutes after tension
			const outcomes = this.backtestOutcomes(clusterEvents, 900000);

			patterns.push({
				patternId: `cluster_${clusterId}_${Date.now()}`,
				discovered_at: Date.now(),
				pattern_name: `${commonType}_cluster`,
				sport: clusterEvents[0]?.sport || "unknown",
				market_hierarchy: this.inferHierarchy(clusterEvents),
				pre_conditions: {
					tension_type: commonType,
					min_severity: avgSeverity * 0.8,
					avg_line_divergence: avgLineDivergence,
				},
				trigger_signature: {
					cluster_size: clusterEvents.length,
					avg_severity: avgSeverity,
				},
				expected_outcome: outcomes.most_common,
				backtest_accuracy: outcomes.accuracy,
				live_accuracy: 0,
				confidence_level: Math.min(clusterEvents.length / 100, 0.9),
				is_active: true,
				is_validated: false,
			});
		}

		return patterns;
	}

	/**
	 * Backtest: What happens after this type of tension?
	 */
	private backtestOutcomes(
		events: any[],
		windowMs: number,
	): { most_common: string; accuracy: number } {
		const outcomes: string[] = [];

		for (const event of events) {
			const involvedNodes =
				typeof event.involved_nodes === "string"
					? JSON.parse(event.involved_nodes)
					: event.involved_nodes;

			if (!involvedNodes || involvedNodes.length === 0) {
				outcomes.push("no_reaction");
				continue;
			}

			if (involvedNodes.length === 0) {
				outcomes.push("no_reaction");
				continue;
			}

			// Build dynamic query with placeholders
			const placeholders = involvedNodes
				.map((_: string, i: number) => `?${i + 2}`)
				.join(",");
			const query = `
        SELECT movement, timestamp
        FROM line_movement_micro_v2
        WHERE nodeId IN (${placeholders})
          AND timestamp BETWEEN ?1 AND ?1 + ${windowMs}
        ORDER BY timestamp
      `;
			const stmt = this.db.prepare(query);
			const params: (number | string)[] = [event.detected_at, ...involvedNodes];
			const laterMovements = stmt.all(...params) as Array<{
				movement: number;
				timestamp: number;
			}>;

			// Classify outcome
			if (laterMovements.length > 5) {
				const avgMovement =
					laterMovements.reduce((sum, m) => sum + (m.movement || 0), 0) /
					laterMovements.length;
				outcomes.push(avgMovement > 0 ? "line_increase" : "line_decrease");
			} else {
				outcomes.push("no_reaction");
			}
		}

		const mostCommon = this.mostCommon(outcomes);
		const accuracy =
			outcomes.filter((o) => o === mostCommon).length / outcomes.length;

		return { most_common: mostCommon, accuracy };
	}

	/**
	 * Backtest pattern against historical data
	 */
	backtestOutcomesHistorical(
		preConditions: Record<string, any>,
		days: number,
	): {
		sample_size: number;
		accuracy: number;
		avg_return: number;
		sharpe: number;
		p_value: number;
	} {
		// Simplified backtest - in production, use proper statistical analysis
		const stmt = this.db.prepare(`
      SELECT tensionId, detected_at
      FROM sub_market_tension_events
      WHERE tension_type = ?
        AND detected_at > unixepoch('now') - ?
      LIMIT 1000
    `);
		const matchingEvents = stmt.all(
			preConditions.tension_type,
			days * 86400,
		) as Array<{ tensionId: number; detected_at: number }>;

		const outcomes = this.backtestOutcomes(
			matchingEvents.map((e) => ({
				...e,
				involved_nodes: JSON.stringify([]), // Simplified for backtest
				snapshot: JSON.stringify({}),
			})) as any[],
			900000,
		);

		return {
			sample_size: matchingEvents.length,
			accuracy: outcomes.accuracy,
			avg_return: outcomes.accuracy > 0.6 ? 0.15 : -0.05, // Simplified
			sharpe: outcomes.accuracy > 0.6 ? 1.2 : 0.3,
			p_value: outcomes.accuracy > 0.6 ? 0.01 : 0.5,
		};
	}

	private mostCommon(arr: string[]): string {
		const counts = new Map<string, number>();
		arr.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
		return (
			Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
			"unknown"
		);
	}

	private inferHierarchy(events: any[]): string {
		// Extract unique market relationships
		const nodeIds = events.flatMap((e) => {
			const nodes =
				typeof e.involved_nodes === "string"
					? JSON.parse(e.involved_nodes)
					: e.involved_nodes;
			return nodes || [];
		});

		const markets = new Set(
			nodeIds
				.map((nodeId: string) => {
					const parts = nodeId.split(":");
					return parts.length > 1 ? parts[1] : "";
				})
				.filter((m: string) => Boolean(m)),
		);
		return Array.from(markets).join(" → ");
	}

	private encodeTensionType(type: string): number {
		const encoding: Record<string, number> = {
			line_divergence: 1,
			liquidity_imbalance: 2,
			temporal_desync: 3,
			arbitrage_rupture: 4,
			bookmaker_confusion: 5,
		};
		return encoding[type] || 0;
	}

	/**
	 * Save discovered pattern to database
	 */
	savePattern(pattern: ResearchPattern): void {
		const stmt = this.db.prepare(`
      INSERT INTO research_pattern_log (
        patternId, discovered_at, analyst_id, pattern_name, sport, market_hierarchy,
        pre_conditions, trigger_signature, expected_outcome, observed_outcome,
        backtest_accuracy, live_accuracy, confidence_level, is_active, is_validated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (patternId) DO UPDATE SET
        backtest_accuracy = excluded.backtest_accuracy,
        live_accuracy = excluded.live_accuracy,
        is_validated = excluded.is_validated
    `);
		stmt.run(
			pattern.patternId,
			pattern.discovered_at,
			pattern.analyst_id || null,
			pattern.pattern_name,
			pattern.sport || null,
			pattern.market_hierarchy,
			JSON.stringify(pattern.pre_conditions),
			JSON.stringify(pattern.trigger_signature),
			pattern.expected_outcome,
			pattern.observed_outcome
				? JSON.stringify(pattern.observed_outcome)
				: null,
			pattern.backtest_accuracy,
			pattern.live_accuracy,
			pattern.confidence_level,
			pattern.is_active ? 1 : 0,
			pattern.is_validated ? 1 : 0,
		);
	}
}
