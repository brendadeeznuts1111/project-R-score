/**
 * @fileoverview Tick Storage with SQLite
 * @description Persistent storage for ticks, movements, and velocity data
 * @module ticks/storage
 */

import { Database } from "bun:sqlite";
import type {
	LatencyStats,
	LineMovement,
	ProcessedTick,
	TickStats,
	VelocityWindow,
} from "./types";

/**
 * TickStorage - SQLite-based storage for tick data
 *
 * Features:
 * - High-performance bulk inserts
 * - Time-series queries for analysis
 * - Movement history for CLV tracking
 * - Velocity snapshots
 */
export class TickStorage {
	private db: Database;
	private insertTickStmt: ReturnType<Database["prepare"]>;
	private insertMovementStmt: ReturnType<Database["prepare"]>;
	private insertVelocityStmt: ReturnType<Database["prepare"]>;
	private insertLatencyStmt: ReturnType<Database["prepare"]>;

	constructor(dbPath = "./data/ticks.db") {
		this.db = new Database(dbPath);
		this.db.exec("PRAGMA journal_mode = WAL");
		this.db.exec("PRAGMA synchronous = NORMAL");
		this.db.exec("PRAGMA cache_size = -64000"); // 64MB cache

		this.initSchema();

		// Prepare statements for performance
		this.insertTickStmt = this.db.prepare(`
      INSERT INTO ticks (venue, instrument_id, timestamp, bid, ask, mid, spread_bps, latency_ms, seq_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		this.insertMovementStmt = this.db.prepare(`
      INSERT INTO movements (venue, instrument_id, timestamp, previous_mid, current_mid, delta, delta_bps, direction, velocity, acceleration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		this.insertVelocityStmt = this.db.prepare(`
      INSERT INTO velocities (venue, instrument_id, window_start, window_end, ticks, open_mid, close_mid, high_mid, low_mid, velocity, acceleration, volatility, direction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		this.insertLatencyStmt = this.db.prepare(`
      INSERT INTO latency_stats (venue, instrument_id, timestamp, window_ms, sample_count, min_ms, max_ms, mean_ms, p50_ms, p90_ms, p95_ms, p99_ms, std_dev, jitter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
	}

	private initSchema(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS ticks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue TEXT NOT NULL,
        instrument_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        bid REAL NOT NULL,
        ask REAL NOT NULL,
        mid REAL NOT NULL,
        spread_bps REAL NOT NULL,
        latency_ms REAL NOT NULL,
        seq_num INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_ticks_venue_instrument ON ticks(venue, instrument_id);
      CREATE INDEX IF NOT EXISTS idx_ticks_timestamp ON ticks(timestamp);

      CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue TEXT NOT NULL,
        instrument_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        previous_mid REAL NOT NULL,
        current_mid REAL NOT NULL,
        delta REAL NOT NULL,
        delta_bps REAL NOT NULL,
        direction TEXT NOT NULL,
        velocity REAL NOT NULL,
        acceleration REAL NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_movements_venue_instrument ON movements(venue, instrument_id);
      CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp);
      CREATE INDEX IF NOT EXISTS idx_movements_direction ON movements(direction);

      CREATE TABLE IF NOT EXISTS velocities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue TEXT NOT NULL,
        instrument_id TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        window_end INTEGER NOT NULL,
        ticks INTEGER NOT NULL,
        open_mid REAL NOT NULL,
        close_mid REAL NOT NULL,
        high_mid REAL NOT NULL,
        low_mid REAL NOT NULL,
        velocity REAL NOT NULL,
        acceleration REAL NOT NULL,
        volatility REAL NOT NULL,
        direction TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_velocities_venue_instrument ON velocities(venue, instrument_id);
      CREATE INDEX IF NOT EXISTS idx_velocities_window_end ON velocities(window_end);

      CREATE TABLE IF NOT EXISTS latency_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue TEXT NOT NULL,
        instrument_id TEXT,
        timestamp INTEGER NOT NULL,
        window_ms INTEGER NOT NULL,
        sample_count INTEGER NOT NULL,
        min_ms REAL NOT NULL,
        max_ms REAL NOT NULL,
        mean_ms REAL NOT NULL,
        p50_ms REAL NOT NULL,
        p90_ms REAL NOT NULL,
        p95_ms REAL NOT NULL,
        p99_ms REAL NOT NULL,
        std_dev REAL NOT NULL,
        jitter REAL NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_latency_venue ON latency_stats(venue);
      CREATE INDEX IF NOT EXISTS idx_latency_timestamp ON latency_stats(timestamp);
    `);
	}

	/**
	 * Store a processed tick
	 */
	storeTick(tick: ProcessedTick): void {
		this.insertTickStmt.run(
			tick.venue,
			tick.instrumentId,
			tick.timestamp,
			tick.bid,
			tick.ask,
			tick.mid,
			tick.spreadBps,
			tick.latencyMs,
			tick.seqNum,
		);
	}

	/**
	 * Store multiple ticks in a transaction
	 */
	storeTicks(ticks: ProcessedTick[]): void {
		const txn = this.db.transaction(() => {
			for (const tick of ticks) {
				this.storeTick(tick);
			}
		});
		txn();
	}

	/**
	 * Store a line movement
	 */
	storeMovement(movement: LineMovement): void {
		this.insertMovementStmt.run(
			movement.venue,
			movement.instrumentId,
			movement.timestamp,
			movement.previousMid,
			movement.currentMid,
			movement.delta,
			movement.deltaBps,
			movement.direction,
			movement.velocity,
			movement.acceleration,
		);
	}

	/**
	 * Store a velocity snapshot
	 */
	storeVelocity(velocity: VelocityWindow): void {
		this.insertVelocityStmt.run(
			velocity.venue,
			velocity.instrumentId,
			velocity.windowStart,
			velocity.windowEnd,
			velocity.ticks,
			velocity.openMid,
			velocity.closeMid,
			velocity.highMid,
			velocity.lowMid,
			velocity.velocity,
			velocity.acceleration,
			velocity.volatility,
			velocity.direction,
		);
	}

	/**
	 * Store latency statistics
	 */
	storeLatencyStats(stats: LatencyStats): void {
		this.insertLatencyStmt.run(
			stats.venue,
			stats.instrumentId ?? null,
			Date.now(),
			stats.windowMs,
			stats.sampleCount,
			stats.min,
			stats.max,
			stats.mean,
			stats.p50,
			stats.p90,
			stats.p95,
			stats.p99,
			stats.stdDev,
			stats.jitter,
		);
	}

	/**
	 * Get tick history for an instrument
	 */
	getTicks(
		venue: string,
		instrumentId: string,
		options?: { since?: number; until?: number; limit?: number },
	): ProcessedTick[] {
		const since = options?.since ?? 0;
		const until = options?.until ?? Date.now();
		const limit = options?.limit ?? 1000;

		const rows = this.db
			.query<
				{
					venue: string;
					instrument_id: string;
					timestamp: number;
					bid: number;
					ask: number;
					mid: number;
					spread_bps: number;
					latency_ms: number;
					seq_num: number;
				},
				[string, string, number, number, number]
			>(`
      SELECT venue, instrument_id, timestamp, bid, ask, mid, spread_bps, latency_ms, seq_num
      FROM ticks
      WHERE venue = ? AND instrument_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `)
			.all(venue, instrumentId, since, until, limit);

		return rows.map((r) => ({
			venue: r.venue,
			instrumentId: r.instrument_id,
			timestamp: r.timestamp,
			receivedAt: r.timestamp,
			bid: r.bid,
			ask: r.ask,
			mid: r.mid,
			spread: r.ask - r.bid,
			spreadBps: r.spread_bps,
			latencyMs: r.latency_ms,
			seqNum: r.seq_num,
		}));
	}

	/**
	 * Get movement history for an instrument
	 */
	getMovements(
		venue: string,
		instrumentId: string,
		options?: {
			since?: number;
			until?: number;
			limit?: number;
			direction?: "up" | "down";
		},
	): LineMovement[] {
		const since = options?.since ?? 0;
		const until = options?.until ?? Date.now();
		const limit = options?.limit ?? 1000;

		let query = `
      SELECT * FROM movements
      WHERE venue = ? AND instrument_id = ? AND timestamp >= ? AND timestamp <= ?
    `;
		const params: any[] = [venue, instrumentId, since, until];

		if (options?.direction) {
			query += " AND direction = ?";
			params.push(options.direction);
		}

		query += " ORDER BY timestamp DESC LIMIT ?";
		params.push(limit);

		const rows = this.db.query<any, any[]>(query).all(...params);

		return rows.map((r: any) => ({
			instrumentId: r.instrument_id,
			venue: r.venue,
			timestamp: r.timestamp,
			previousMid: r.previous_mid,
			currentMid: r.current_mid,
			delta: r.delta,
			deltaBps: r.delta_bps,
			direction: r.direction as "up" | "down" | "unchanged",
			velocity: r.velocity,
			acceleration: r.acceleration,
			ticksSinceMove: 0,
			timeSinceMove: 0,
		}));
	}

	/**
	 * Get velocity history
	 */
	getVelocities(
		venue: string,
		instrumentId: string,
		options?: { since?: number; until?: number; limit?: number },
	): VelocityWindow[] {
		const since = options?.since ?? 0;
		const until = options?.until ?? Date.now();
		const limit = options?.limit ?? 1000;

		const rows = this.db
			.query<any, [string, string, number, number, number]>(`
      SELECT * FROM velocities
      WHERE venue = ? AND instrument_id = ? AND window_end >= ? AND window_end <= ?
      ORDER BY window_end DESC
      LIMIT ?
    `)
			.all(venue, instrumentId, since, until, limit);

		return rows.map((r: any) => ({
			instrumentId: r.instrument_id,
			venue: r.venue,
			windowStart: r.window_start,
			windowEnd: r.window_end,
			ticks: r.ticks,
			openMid: r.open_mid,
			closeMid: r.close_mid,
			highMid: r.high_mid,
			lowMid: r.low_mid,
			velocity: r.velocity,
			acceleration: r.acceleration,
			volatility: r.volatility,
			direction: r.direction as "bullish" | "bearish" | "neutral",
		}));
	}

	/**
	 * Get latency history
	 */
	getLatencyHistory(
		venue: string,
		options?: { instrumentId?: string; since?: number; limit?: number },
	): LatencyStats[] {
		const since = options?.since ?? 0;
		const limit = options?.limit ?? 100;

		let query =
			"SELECT * FROM latency_stats WHERE venue = ? AND timestamp >= ?";
		const params: any[] = [venue, since];

		if (options?.instrumentId) {
			query += " AND instrument_id = ?";
			params.push(options.instrumentId);
		}

		query += " ORDER BY timestamp DESC LIMIT ?";
		params.push(limit);

		const rows = this.db.query<any, any[]>(query).all(...params);

		return rows.map((r: any) => ({
			venue: r.venue,
			instrumentId: r.instrument_id,
			windowMs: r.window_ms,
			sampleCount: r.sample_count,
			min: r.min_ms,
			max: r.max_ms,
			mean: r.mean_ms,
			median: r.p50_ms,
			p50: r.p50_ms,
			p90: r.p90_ms,
			p95: r.p95_ms,
			p99: r.p99_ms,
			stdDev: r.std_dev,
			jitter: r.jitter,
		}));
	}

	/**
	 * Get aggregate movement stats
	 */
	getMovementStats(
		venue: string,
		instrumentId: string,
		since: number,
	): {
		totalMoves: number;
		upMoves: number;
		downMoves: number;
		avgDeltaBps: number;
		maxDeltaBps: number;
		avgVelocity: number;
		maxVelocity: number;
	} {
		const row = this.db
			.query<any, [string, string, number]>(`
      SELECT
        COUNT(*) as total_moves,
        SUM(CASE WHEN direction = 'up' THEN 1 ELSE 0 END) as up_moves,
        SUM(CASE WHEN direction = 'down' THEN 1 ELSE 0 END) as down_moves,
        AVG(ABS(delta_bps)) as avg_delta_bps,
        MAX(ABS(delta_bps)) as max_delta_bps,
        AVG(ABS(velocity)) as avg_velocity,
        MAX(ABS(velocity)) as max_velocity
      FROM movements
      WHERE venue = ? AND instrument_id = ? AND timestamp >= ?
    `)
			.get(venue, instrumentId, since);

		return {
			totalMoves: row?.total_moves ?? 0,
			upMoves: row?.up_moves ?? 0,
			downMoves: row?.down_moves ?? 0,
			avgDeltaBps: row?.avg_delta_bps ?? 0,
			maxDeltaBps: row?.max_delta_bps ?? 0,
			avgVelocity: row?.avg_velocity ?? 0,
			maxVelocity: row?.max_velocity ?? 0,
		};
	}

	/**
	 * Get CLV (Closing Line Value) analysis
	 * Compares entry price to final/closing price
	 */
	getClvAnalysis(
		venue: string,
		instrumentId: string,
		entryTime: number,
		closeTime: number,
	): {
		entryMid: number | null;
		closeMid: number | null;
		clvBps: number | null;
		movementsInWindow: number;
		velocityAtEntry: number | null;
		velocityAtClose: number | null;
	} {
		// Get tick at entry time
		const entryTick = this.db
			.query<any, [string, string, number]>(`
      SELECT mid FROM ticks
      WHERE venue = ? AND instrument_id = ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT 1
    `)
			.get(venue, instrumentId, entryTime);

		// Get tick at close time
		const closeTick = this.db
			.query<any, [string, string, number]>(`
      SELECT mid FROM ticks
      WHERE venue = ? AND instrument_id = ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT 1
    `)
			.get(venue, instrumentId, closeTime);

		// Count movements in window
		const movementCount = this.db
			.query<any, [string, string, number, number]>(`
      SELECT COUNT(*) as count FROM movements
      WHERE venue = ? AND instrument_id = ? AND timestamp >= ? AND timestamp <= ?
    `)
			.get(venue, instrumentId, entryTime, closeTime);

		// Get velocity at entry
		const entryVelocity = this.db
			.query<any, [string, string, number]>(`
      SELECT velocity FROM velocities
      WHERE venue = ? AND instrument_id = ? AND window_end <= ?
      ORDER BY window_end DESC
      LIMIT 1
    `)
			.get(venue, instrumentId, entryTime);

		// Get velocity at close
		const closeVelocity = this.db
			.query<any, [string, string, number]>(`
      SELECT velocity FROM velocities
      WHERE venue = ? AND instrument_id = ? AND window_end <= ?
      ORDER BY window_end DESC
      LIMIT 1
    `)
			.get(venue, instrumentId, closeTime);

		const entryMid = entryTick?.mid ?? null;
		const closeMid = closeTick?.mid ?? null;
		const clvBps =
			entryMid && closeMid && entryMid > 0
				? ((closeMid - entryMid) / entryMid) * 10000
				: null;

		return {
			entryMid,
			closeMid,
			clvBps,
			movementsInWindow: movementCount?.count ?? 0,
			velocityAtEntry: entryVelocity?.velocity ?? null,
			velocityAtClose: closeVelocity?.velocity ?? null,
		};
	}

	/**
	 * Get storage statistics
	 */
	getStats(): {
		tickCount: number;
		movementCount: number;
		velocityCount: number;
		latencyCount: number;
		dbSizeBytes: number;
	} {
		const tickCount =
			this.db
				.query<{ count: number }, []>("SELECT COUNT(*) as count FROM ticks")
				.get()?.count ?? 0;
		const movementCount =
			this.db
				.query<{ count: number }, []>("SELECT COUNT(*) as count FROM movements")
				.get()?.count ?? 0;
		const velocityCount =
			this.db
				.query<{ count: number }, []>(
					"SELECT COUNT(*) as count FROM velocities",
				)
				.get()?.count ?? 0;
		const latencyCount =
			this.db
				.query<{ count: number }, []>(
					"SELECT COUNT(*) as count FROM latency_stats",
				)
				.get()?.count ?? 0;

		// Get DB file size
		const file = Bun.file(this.db.filename);
		const dbSizeBytes = file.size;

		return {
			tickCount,
			movementCount,
			velocityCount,
			latencyCount,
			dbSizeBytes,
		};
	}

	/**
	 * Vacuum database to reclaim space
	 */
	vacuum(): void {
		this.db.exec("VACUUM");
	}

	/**
	 * Prune old data
	 */
	prune(olderThan: number): { ticksDeleted: number; movementsDeleted: number } {
		const tickResult = this.db.run("DELETE FROM ticks WHERE timestamp < ?", [
			olderThan,
		]);
		const movementResult = this.db.run(
			"DELETE FROM movements WHERE timestamp < ?",
			[olderThan],
		);

		return {
			ticksDeleted: tickResult.changes,
			movementsDeleted: movementResult.changes,
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}

/**
 * Create storage instance
 */
export function createTickStorage(dbPath?: string): TickStorage {
	return new TickStorage(dbPath);
}

/**
 * Global storage instance
 */
let globalStorage: TickStorage | null = null;

export function getTickStorage(): TickStorage {
	if (!globalStorage) {
		globalStorage = new TickStorage();
	}
	return globalStorage;
}

export function setTickStorage(storage: TickStorage | null): void {
	globalStorage = storage;
}
