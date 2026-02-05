/**
 * Sub-Market Tension Detection Engine
 * Real-time detection of conflicts between related sub-markets
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TENSION-DETECTION@0.1.0;instance-id=ORCA-TENSION-001;version=0.1.0}][PROPERTIES:{detector={value:"tension-detector";@root:"ROOT-RESEARCH";@chain:["BP-SUB-MARKET-NODES","BP-PATTERN-DISCOVERY"];@version:"0.1.0"}}][CLASS:SubMarketTensionDetector][#REF:v-0.1.0.BP.TENSION.DETECTION.1.0.A.1.1.ORCA.1.1]]
 */

import type { Database } from "bun:sqlite";
import { initializeResearchSchema } from "../schema/sub-market-nodes";

// Simple EventEmitter implementation for Bun
class EventEmitter {
	private events: Map<string, Function[]> = new Map();

	on(event: string, listener: Function): void {
		const listeners = this.events.get(event) || [];
		listeners.push(listener);
		this.events.set(event, listeners);
	}

	emit(event: string, ...args: any[]): void {
		const listeners = this.events.get(event) || [];
		listeners.forEach((listener) => listener(...args));
	}
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TensionEvent {
	tensionId?: number;
	tension_type: string;
	severity: number;
	nodes: string[];
	snapshot: any;
	eventId?: string;
}

interface TensionThresholds {
	line_divergence: number; // Points
	liquidity_imbalance: number; // Ratio
	temporal_desync: number; // Milliseconds
	arbitrage_rupture: number; // Percentage (0-1)
	bookmaker_confusion: number; // Standard deviations
}

// ═══════════════════════════════════════════════════════════════
// TENSION DETECTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Sub-Market Tension Detector
 *
 * Real-time monitoring and detection of tension events between
 * related sub-market nodes using mathematical consistency checks.
 */
export class SubMarketTensionDetector extends EventEmitter {
	private db: Database;
	private monitoringInterval: Timer | null = null;
	private readonly THRESHOLDS: TensionThresholds = {
		line_divergence: 0.5, // Points
		liquidity_imbalance: 10.0, // Ratio
		temporal_desync: 60000, // 1 minute lag
		arbitrage_rupture: 0.03, // 3% arb
		bookmaker_confusion: 0.25, // Same book diff
	};

	/**
	 * Creates a new tension detector
	 *
	 * @param dbPath - Path to research database
	 */
	constructor(dbPath: string = "data/research.db") {
		super();
		this.db = initializeResearchSchema(dbPath);
	}

	/**
	 * Start real-time monitoring loop
	 *
	 * @param intervalMs - Monitoring interval in milliseconds (default: 5000)
	 */
	startMonitoring(intervalMs: number = 5000): void {
		if (this.monitoringInterval) {
			console.warn("⚠️  Monitoring already running");
			return;
		}

		console.log(`🔬 Starting tension monitoring (${intervalMs}ms interval)`);

		this.monitoringInterval = setInterval(() => {
			this.checkAllActiveEvents().catch((error) => {
				console.error("❌ Tension check error:", error);
			});
		}, intervalMs);
	}

	/**
	 * Stop real-time monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
			console.log("🔬 Tension monitoring stopped");
		}
	}

	/**
	 * Check all events that had movement in last 60 seconds
	 */
	private async checkAllActiveEvents(): Promise<void> {
		try {
			const stmt = this.db.prepare(`
        SELECT DISTINCT eventId 
        FROM line_movement_micro_v2
        WHERE timestamp > unixepoch('now') - ?
      `);
			const activeEvents = stmt.all(60) as Array<{ eventId: string }>;

			if (activeEvents.length === 0) return;

			// Run tension checks in parallel
			const tensions = await Promise.all(
				activeEvents.flatMap(({ eventId }) => [
					this.checkLineDivergence(eventId),
					this.checkLiquidityImbalance(eventId),
					this.checkTemporalDesync(eventId),
					this.checkArbitrageRupture(eventId),
					this.checkBookmakerConfusion(eventId),
				]),
			);

			const allTensions = tensions.flat();
			for (const tension of allTensions) {
				if (tension) {
					await this.recordTension(tension);
				}
			}
		} catch (error) {
			console.error("Error checking active events:", error);
		}
	}

	/**
	 * Check: Related nodes should have mathematically consistent lines
	 * Example: First half total should be ~50% of full game total
	 */
	private async checkLineDivergence(eventId: string): Promise<TensionEvent[]> {
		try {
			const stmt = this.db.prepare(`
        WITH node_pairs AS (
          SELECT 
            n1.nodeId as node1_id,
            n2.nodeId as node2_id,
            n1.last_line as line1,
            n2.last_line as line2,
            n1.base_line_type as type1,
            n2.base_line_type as type2
          FROM sub_market_nodes n1
          JOIN sub_market_nodes n2 ON n1.eventId = n2.eventId
          WHERE n1.eventId = ?
            AND n1.parent_node_id = n2.nodeId
            AND n1.last_move_timestamp > unixepoch('now') - 300
            AND n1.last_line IS NOT NULL
            AND n2.last_line IS NOT NULL
        ),
        calculations AS (
          SELECT 
            node1_id,
            node2_id,
            line1,
            line2,
            type1,
            type2,
            CASE 
              WHEN type1 LIKE '%total%' AND type2 LIKE '%total%' THEN 
                ABS(line1 - (line2 * 0.5))
              WHEN type1 LIKE '%spread%' AND type2 LIKE '%spread%' THEN 
                ABS(line1 - line2)
              ELSE 0
            END as divergence_points
          FROM node_pairs
        )
        SELECT * FROM calculations
        WHERE divergence_points > ?
      `);
			const divergences = stmt.all(
				eventId,
				this.THRESHOLDS.line_divergence,
			) as Array<{
				node1_id: string;
				node2_id: string;
				line1: number;
				line2: number;
				type1: string;
				type2: string;
				divergence_points: number;
			}>;

			return divergences.map((d) => ({
				tension_type: "line_divergence",
				severity: Math.min(Math.floor(d.divergence_points * 2), 10),
				nodes: [d.node1_id, d.node2_id],
				snapshot: {
					eventId,
					line1: d.line1,
					line2: d.line2,
					expected_relation: `${d.type1}→${d.type2}`,
					divergence: d.divergence_points,
				},
			}));
		} catch (error) {
			console.error(`Error checking line divergence for ${eventId}:`, error);
			return [];
		}
	}

	/**
	 * Check: Liquidity should be proportional across related nodes
	 * Example: Full game should have 3-5x more volume than first half
	 */
	private async checkLiquidityImbalance(
		eventId: string,
	): Promise<TensionEvent[]> {
		try {
			const stmt = this.db.prepare(`
        WITH liquidity AS (
          SELECT 
            nodeId,
            implied_volume,
            parent_node_id
          FROM sub_market_nodes
          WHERE eventId = ? 
            AND implied_volume IS NOT NULL
            AND parent_node_id IS NOT NULL
        )
        SELECT 
          l1.nodeId as child,
          l2.nodeId as parent,
          l1.implied_volume / l2.implied_volume as ratio
        FROM liquidity l1
        JOIN liquidity l2 ON l1.parent_node_id = l2.nodeId
        WHERE l1.implied_volume / l2.implied_volume > ?
      `);
			const imbalances = stmt.all(
				eventId,
				this.THRESHOLDS.liquidity_imbalance,
			) as Array<{
				child: string;
				parent: string;
				ratio: number;
			}>;

			return imbalances.map((i) => ({
				tension_type: "liquidity_imbalance",
				severity: Math.min(Math.floor(i.ratio / 2), 10),
				nodes: [i.child, i.parent],
				snapshot: {
					eventId,
					ratio: i.ratio,
				},
			}));
		} catch (error) {
			console.error(
				`Error checking liquidity imbalance for ${eventId}:`,
				error,
			);
			return [];
		}
	}

	/**
	 * Check: Child nodes should not lag >60s behind parent movements
	 */
	private async checkTemporalDesync(eventId: string): Promise<TensionEvent[]> {
		try {
			const stmt = this.db.prepare(`
        SELECT 
          child.nodeId as childId,
          parent.nodeId as parentId,
          ABS(child.last_move_timestamp - parent.last_move_timestamp) * 1000 as lag_ms
        FROM sub_market_nodes child
        JOIN sub_market_nodes parent ON child.parent_node_id = parent.nodeId
        WHERE child.eventId = ?
          AND child.last_move_timestamp > unixepoch('now') - 600
          AND ABS(child.last_move_timestamp - parent.last_move_timestamp) * 1000 > ?
      `);
			const desyncs = stmt.all(
				eventId,
				this.THRESHOLDS.temporal_desync,
			) as Array<{
				childId: string;
				parentId: string;
				lag_ms: number;
			}>;

			return desyncs.map((d) => ({
				tension_type: "temporal_desync",
				severity: Math.min(Math.floor(d.lag_ms / 10000), 10),
				nodes: [d.childId, d.parentId],
				snapshot: {
					eventId,
					lagMs: d.lag_ms,
				},
			}));
		} catch (error) {
			console.error(`Error checking temporal desync for ${eventId}:`, error);
			return [];
		}
	}

	/**
	 * Check: Arbitrage between related nodes >3%
	 */
	private async checkArbitrageRupture(
		eventId: string,
	): Promise<TensionEvent[]> {
		try {
			// Simplified check - in production, use proper arbitrage detection
			const stmt = this.db.prepare(`
        WITH node_odds AS (
          SELECT 
            nodeId,
            last_line,
            last_odds,
            CASE 
              WHEN last_odds > 0 THEN 1.0 / (1.0 + last_odds / 100.0)
              ELSE 1.0 / (1.0 + 100.0 / ABS(last_odds))
            END as imp_prob
          FROM sub_market_nodes
          WHERE eventId = ?
            AND base_line_type IN ('moneyline', 'spread', 'total')
            AND last_odds IS NOT NULL
        )
        SELECT 
          n1.nodeId as node1,
          n2.nodeId as node2,
          1.0 - (n1.imp_prob + n2.imp_prob) as arb_profit
        FROM node_odds n1
        JOIN node_odds n2 ON n1.nodeId != n2.nodeId
        WHERE n1.base_line_type = n2.base_line_type
          AND ABS(n1.last_line + n2.last_line) < 0.1
          AND (1.0 - (n1.imp_prob + n2.imp_prob)) > ?
      `);
			const arbs = stmt.all(
				eventId,
				this.THRESHOLDS.arbitrage_rupture,
			) as Array<{
				node1: string;
				node2: string;
				arb_profit: number;
			}>;

			return arbs.map((a) => ({
				tension_type: "arbitrage_rupture",
				severity: Math.min(Math.floor(a.arb_profit * 100), 10),
				nodes: [a.node1, a.node2],
				snapshot: {
					eventId,
					arbProfit: a.arb_profit,
				},
			}));
		} catch (error) {
			console.error(`Error checking arbitrage rupture for ${eventId}:`, error);
			return [];
		}
	}

	/**
	 * Check: Same bookmaker has inconsistent lines across nodes
	 */
	private async checkBookmakerConfusion(
		eventId: string,
	): Promise<TensionEvent[]> {
		try {
			const stmt = this.db.prepare(`
        WITH stats AS (
          SELECT 
            bookmaker,
            base_line_type,
            AVG(last_line) as median_line,
            (SUM((last_line - AVG(last_line)) * (last_line - AVG(last_line))) / COUNT(*)) as variance
          FROM sub_market_nodes
          WHERE eventId = ?
            AND last_move_timestamp > unixepoch('now') - 600
            AND last_line IS NOT NULL
          GROUP BY bookmaker, base_line_type
        )
        SELECT 
          n.bookmaker,
          n.nodeId,
          n.last_line,
          s.median_line,
          SQRT(s.variance) as stddev_line
        FROM sub_market_nodes n
        JOIN stats s ON n.bookmaker = s.bookmaker AND n.base_line_type = s.base_line_type
        WHERE n.eventId = ?
          AND ABS(n.last_line - s.median_line) > ? * SQRT(s.variance)
      `);
			const confusions = stmt.all(
				eventId,
				this.THRESHOLDS.bookmaker_confusion,
			) as Array<{
				bookmaker: string;
				nodeId: string;
				last_line: number;
				median_line: number;
				stddev_line: number;
			}>;

			return confusions.map((c) => ({
				tension_type: "bookmaker_confusion",
				severity: Math.min(Math.floor(c.stddev_line * 10), 10),
				nodes: [c.nodeId],
				snapshot: {
					eventId,
					bookmaker: c.bookmaker,
					line: c.last_line,
					median: c.median_line,
					deviation: c.stddev_line,
				},
			}));
		} catch (error) {
			console.error(
				`Error checking bookmaker confusion for ${eventId}:`,
				error,
			);
			return [];
		}
	}

	/**
	 * Record tension event (with deduplication)
	 */
	private async recordTension(
		tension: Omit<TensionEvent, "tensionId">,
	): Promise<void> {
		try {
			// Create deduplication hash
			const hashInput = JSON.stringify({
				type: tension.tension_type,
				nodes: tension.nodes.sort(),
			});
			const dedupeHash = Bun.hash(hashInput).toString();

			// Insert with conflict resolution (don't recreate if <60s old)
			// Check if recent duplicate exists
			const existingStmt = this.db.prepare(
				`SELECT tensionId, detected_at FROM sub_market_tension_events WHERE dedupe_hash = ? ORDER BY detected_at DESC LIMIT 1`,
			);
			const existing = existingStmt.get(dedupeHash) as
				| { tensionId: number; detected_at: number }
				| undefined;

			if (
				existing &&
				Math.floor(Date.now() / 1000) - existing.detected_at < 60
			) {
				return; // Skip duplicate within 60 seconds
			}

			const insertStmt = this.db.prepare(`
        INSERT INTO sub_market_tension_events (
          eventId, involved_nodes, tension_type, severity, snapshot, detected_at, dedupe_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING tensionId
      `);
			const result = insertStmt.get(
				tension.snapshot.eventId || "",
				JSON.stringify(tension.nodes),
				tension.tension_type,
				tension.severity,
				JSON.stringify(tension.snapshot),
				Math.floor(Date.now() / 1000),
				dedupeHash,
			) as { tensionId: number } | undefined;

			if (result?.tensionId) {
				console.log(
					`🚨 TENSION [${tension.tension_type}] severity=${tension.severity} nodes=${tension.nodes.length}`,
				);

				// Emit event for WebSocket broadcasting
				this.emit("tension", {
					...tension,
					tensionId: result.tensionId,
				} as TensionEvent);

				// Alert on high severity
				if (tension.severity >= 8) {
					this.emit("critical_tension", {
						...tension,
						tensionId: result.tensionId,
					} as TensionEvent);
				}
			}
		} catch (error) {
			console.error("Error recording tension:", error);
		}
	}

	/**
	 * Get active tension events for an event
	 */
	getActiveTensions(eventId: string): TensionEvent[] {
		const stmt = this.db.prepare(`
      SELECT 
        tensionId,
        tension_type,
        severity,
        involved_nodes,
        snapshot
      FROM sub_market_tension_events
      WHERE eventId = ?
        AND resolved_at IS NULL
      ORDER BY detected_at DESC
      LIMIT 100
    `);
		const tensions = stmt.all(eventId) as Array<{
			tensionId: number;
			tension_type: string;
			severity: number;
			involved_nodes: string;
			snapshot: string;
		}>;

		return tensions.map((t) => ({
			tensionId: t.tensionId,
			tension_type: t.tension_type,
			severity: t.severity,
			nodes: JSON.parse(t.involved_nodes),
			snapshot: JSON.parse(t.snapshot),
		}));
	}

	/**
	 * Resolve tension event
	 */
	resolveTension(tensionId: number): void {
		const stmt = this.db.prepare(
			`UPDATE sub_market_tension_events SET resolved_at = unixepoch() WHERE tensionId = ?`,
		);
		stmt.run(tensionId);
	}
}
