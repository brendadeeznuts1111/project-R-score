/**
 * @fileoverview ORCA Arbitrage Storage
 * @description Persistent storage for ORCA arbitrage opportunities
 * @module orca/arbitrage/storage
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ORCA-ARBITRAGE-STORAGE@0.1.0;instance-id=ORCA-ARB-STORAGE-001;version=0.1.0}]
 * [PROPERTIES:{storage={value:"orca-arbitrage-storage";@root:"ROOT-ORCA";@chain:["BP-SQLITE","BP-WAL","BP-ARBITRAGE"];@version:"0.1.0"}}]
 * [CLASS:OrcaArbitrageStorage]
 * [#REF:v-0.1.0.BP.ORCA.ARBITRAGE.STORAGE.1.0.A.1.1.ORCA.1.1]]
 */

import { Database } from "bun:sqlite";
import { DATABASE_PATHS } from "../../pipeline/constants";
import type {
	ArbitrageFilter,
	ArbitrageQueryOptions,
	ArbitrageStatus,
	Bookmaker,
	BookPairStats,
	OrcaArbitrageOpportunity,
} from "./types";

/**
 * Storage for ORCA arbitrage opportunities
 */
export class OrcaArbitrageStorage {
	private db: Database;

	constructor(
		dbPath = DATABASE_PATHS.sources.replace(
			"sources.sqlite",
			"orca-arbitrage.sqlite",
		),
	) {
		this.db = new Database(dbPath);
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		this.db.exec("PRAGMA journal_mode = WAL;");
		this.db.exec("PRAGMA synchronous = NORMAL;");
		this.db.exec("PRAGMA foreign_keys = ON;");

		// Arbitrage opportunities table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
				id TEXT PRIMARY KEY,
				event_id TEXT NOT NULL,
				event_description TEXT NOT NULL,
				outcome_path_type TEXT NOT NULL,
				outcome_path_outcome TEXT NOT NULL,
				outcome_path_full TEXT NOT NULL,
				book_a_book TEXT NOT NULL,
				book_a_type TEXT NOT NULL,
				book_a_american_odds INTEGER NOT NULL,
				book_a_decimal_odds REAL NOT NULL,
				book_a_implied_prob REAL NOT NULL,
				book_a_available_stake REAL NOT NULL,
				book_a_timestamp INTEGER NOT NULL,
				book_b_book TEXT NOT NULL,
				book_b_type TEXT NOT NULL,
				book_b_american_odds INTEGER NOT NULL,
				book_b_decimal_odds REAL NOT NULL,
				book_b_implied_prob REAL NOT NULL,
				book_b_available_stake REAL NOT NULL,
				book_b_timestamp INTEGER NOT NULL,
				edge REAL NOT NULL,
				max_stake_detected REAL NOT NULL,
				tension_score REAL NOT NULL,
				status TEXT NOT NULL,
				filled_amount REAL,
				profit_locked REAL,
				execution_time_ms INTEGER,
				accounts_used INTEGER,
				detected_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				expires_at INTEGER
			)
		`);

		// Book pair statistics table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS book_pair_stats (
				book_a TEXT NOT NULL,
				book_b TEXT NOT NULL,
				active_arbs INTEGER DEFAULT 0,
				total_size REAL DEFAULT 0,
				average_edge REAL DEFAULT 0,
				highest_edge REAL DEFAULT 0,
				last_update INTEGER NOT NULL,
				PRIMARY KEY (book_a, book_b)
			)
		`);

		// Scan statistics table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS scan_statistics (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				scan_timestamp INTEGER NOT NULL,
				markets_scanned INTEGER NOT NULL,
				opportunities_detected INTEGER NOT NULL,
				false_positives INTEGER DEFAULT 0,
				duration_ms INTEGER
			)
		`);

		// Indexes
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_arb_event_id ON arbitrage_opportunities(event_id);
			CREATE INDEX IF NOT EXISTS idx_arb_status ON arbitrage_opportunities(status);
			CREATE INDEX IF NOT EXISTS idx_arb_detected_at ON arbitrage_opportunities(detected_at);
			CREATE INDEX IF NOT EXISTS idx_arb_edge ON arbitrage_opportunities(edge);
			CREATE INDEX IF NOT EXISTS idx_arb_book_pair ON arbitrage_opportunities(book_a_book, book_b_book);
		`);
	}

	/**
	 * Store an arbitrage opportunity
	 */
	storeOpportunity(opportunity: OrcaArbitrageOpportunity): void {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO arbitrage_opportunities (
				id, event_id, event_description,
				outcome_path_type, outcome_path_outcome, outcome_path_full,
				book_a_book, book_a_type, book_a_american_odds, book_a_decimal_odds,
				book_a_implied_prob, book_a_available_stake, book_a_timestamp,
				book_b_book, book_b_type, book_b_american_odds, book_b_decimal_odds,
				book_b_implied_prob, book_b_available_stake, book_b_timestamp,
				edge, max_stake_detected, tension_score, status,
				filled_amount, profit_locked, execution_time_ms, accounts_used,
				detected_at, updated_at, expires_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			opportunity.id,
			opportunity.eventId,
			opportunity.eventDescription,
			opportunity.outcomePath.type,
			opportunity.outcomePath.outcome,
			opportunity.outcomePath.full,
			opportunity.bookA.book,
			opportunity.bookA.type,
			opportunity.bookA.americanOdds,
			opportunity.bookA.decimalOdds,
			opportunity.bookA.impliedProbability,
			opportunity.bookA.availableStake,
			opportunity.bookA.timestamp,
			opportunity.bookB.book,
			opportunity.bookB.type,
			opportunity.bookB.americanOdds,
			opportunity.bookB.decimalOdds,
			opportunity.bookB.impliedProbability,
			opportunity.bookB.availableStake,
			opportunity.bookB.timestamp,
			opportunity.edge,
			opportunity.maxStakeDetected,
			opportunity.tensionScore,
			opportunity.status,
			opportunity.filledAmount ?? null,
			opportunity.profitLocked ?? null,
			opportunity.executionTimeMs ?? null,
			opportunity.accountsUsed ?? null,
			opportunity.detectedAt,
			opportunity.updatedAt,
			opportunity.expiresAt ?? null,
		);

		// Update book pair stats
		this.updateBookPairStats(
			opportunity.bookA.book,
			opportunity.bookB.book,
			opportunity,
		);
	}

	/**
	 * Get an arbitrage opportunity by ID
	 */
	getOpportunity(id: string): OrcaArbitrageOpportunity | null {
		const stmt = this.db.prepare(`
			SELECT * FROM arbitrage_opportunities WHERE id = ?
		`);

		const row = stmt.get(id) as any;
		if (!row) return null;

		return this.rowToOpportunity(row);
	}

	/**
	 * Query arbitrage opportunities
	 */
	queryOpportunities(
		options: ArbitrageQueryOptions = {},
	): OrcaArbitrageOpportunity[] {
		const conditions: string[] = [];
		const params: any[] = [];

		// Apply filters
		if (options.filter) {
			const filter = options.filter;

			if (filter.minEdge !== undefined) {
				conditions.push("edge >= ?");
				params.push(filter.minEdge);
			}

			if (filter.maxEdge !== undefined) {
				conditions.push("edge <= ?");
				params.push(filter.maxEdge);
			}

			if (filter.minTensionScore !== undefined) {
				conditions.push("tension_score >= ?");
				params.push(filter.minTensionScore);
			}

			if (filter.minStake !== undefined) {
				conditions.push("max_stake_detected >= ?");
				params.push(filter.minStake);
			}

			if (filter.status && filter.status.length > 0) {
				conditions.push(
					`status IN (${filter.status.map(() => "?").join(",")})`,
				);
				params.push(...filter.status);
			}

			if (filter.bookmakers && filter.bookmakers.length > 0) {
				conditions.push(
					`(book_a_book IN (${filter.bookmakers.map(() => "?").join(",")}) OR book_b_book IN (${filter.bookmakers.map(() => "?").join(",")}))`,
				);
				params.push(...filter.bookmakers, ...filter.bookmakers);
			}

			if (filter.eventId) {
				conditions.push("event_id = ?");
				params.push(filter.eventId);
			}

			if (filter.outcomeType) {
				conditions.push("outcome_path_type = ?");
				params.push(filter.outcomeType);
			}
		}

		// Build query
		let query = "SELECT * FROM arbitrage_opportunities";
		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(" AND ")}`;
		}

		// Sort
		const sortBy = options.sortBy || "detectedAt";
		const sortOrder = options.sortOrder || "desc";
		const sortField = this.mapSortField(sortBy);
		query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;

		// Limit/offset
		if (options.limit) {
			query += ` LIMIT ?`;
			params.push(options.limit);
		}

		if (options.offset) {
			query += ` OFFSET ?`;
			params.push(options.offset);
		}

		const stmt = this.db.prepare(query);
		const rows = stmt.all(...params) as any[];

		return rows.map((row) => this.rowToOpportunity(row));
	}

	/**
	 * Get book pair statistics
	 */
	getBookPairStats(): BookPairStats[] {
		const stmt = this.db.prepare(`
			SELECT * FROM book_pair_stats
			ORDER BY total_size DESC
		`);

		const rows = stmt.all() as any[];

		return rows.map((row) => ({
			bookA: row.book_a as Bookmaker,
			bookB: row.book_b as Bookmaker,
			activeArbs: row.active_arbs,
			totalSize: row.total_size,
			averageEdge: row.average_edge,
			highestEdge: row.highest_edge,
			lastUpdate: row.last_update,
		}));
	}

	/**
	 * Update opportunity status
	 */
	updateStatus(
		id: string,
		status: ArbitrageStatus,
		updates?: Partial<OrcaArbitrageOpportunity>,
	): boolean {
		const updateFields: string[] = ["status = ?", "updated_at = ?"];
		const params: any[] = [status, Date.now()];

		if (updates?.filledAmount !== undefined) {
			updateFields.push("filled_amount = ?");
			params.push(updates.filledAmount);
		}

		if (updates?.profitLocked !== undefined) {
			updateFields.push("profit_locked = ?");
			params.push(updates.profitLocked);
		}

		if (updates?.executionTimeMs !== undefined) {
			updateFields.push("execution_time_ms = ?");
			params.push(updates.executionTimeMs);
		}

		if (updates?.accountsUsed !== undefined) {
			updateFields.push("accounts_used = ?");
			params.push(updates.accountsUsed);
		}

		params.push(id); // For WHERE clause

		const stmt = this.db.prepare(`
			UPDATE arbitrage_opportunities
			SET ${updateFields.join(", ")}
			WHERE id = ?
		`);

		const result = stmt.run(...params);
		return result.changes > 0;
	}

	/**
	 * Record scan statistics
	 */
	recordScanStats(stats: {
		marketsScanned: number;
		opportunitiesDetected: number;
		falsePositives: number;
		durationMs?: number;
	}): void {
		const stmt = this.db.prepare(`
			INSERT INTO scan_statistics (scan_timestamp, markets_scanned, opportunities_detected, false_positives, duration_ms)
			VALUES (?, ?, ?, ?, ?)
		`);

		stmt.run(
			Date.now(),
			stats.marketsScanned,
			stats.opportunitiesDetected,
			stats.falsePositives,
			stats.durationMs ?? null,
		);
	}

	/**
	 * Get recent scan statistics
	 */
	getRecentScanStats(limit = 10): Array<{
		timestamp: number;
		marketsScanned: number;
		opportunitiesDetected: number;
		falsePositives: number;
		durationMs: number | null;
	}> {
		const stmt = this.db.prepare(`
			SELECT * FROM scan_statistics
			ORDER BY scan_timestamp DESC
			LIMIT ?
		`);

		const rows = stmt.all(limit) as any[];

		return rows.map((row) => ({
			timestamp: row.scan_timestamp,
			marketsScanned: row.markets_scanned,
			opportunitiesDetected: row.opportunities_detected,
			falsePositives: row.false_positives,
			durationMs: row.duration_ms,
		}));
	}

	/**
	 * Update book pair statistics
	 */
	private updateBookPairStats(
		bookA: Bookmaker,
		bookB: Bookmaker,
		opportunity: OrcaArbitrageOpportunity,
	): void {
		// Get current stats
		const getStmt = this.db.prepare(`
			SELECT * FROM book_pair_stats WHERE book_a = ? AND book_b = ?
		`);

		const row = getStmt.get(bookA, bookB) as any;

		// Check if this is a new opportunity or an update
		const existingOpp = this.db
			.prepare("SELECT status FROM arbitrage_opportunities WHERE id = ?")
			.get(opportunity.id) as { status: string } | null;
		const isNew = !existingOpp;
		const wasActive =
			existingOpp &&
			(existingOpp.status === "live" || existingOpp.status === "detected");
		const isActive =
			opportunity.status === "live" || opportunity.status === "detected";

		if (!row) {
			// Create new entry
			const activeArbs = isActive ? 1 : 0;
			const insertStmt = this.db.prepare(`
				INSERT INTO book_pair_stats (book_a, book_b, active_arbs, total_size, average_edge, highest_edge, last_update)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`);

			insertStmt.run(
				bookA,
				bookB,
				activeArbs,
				opportunity.maxStakeDetected,
				opportunity.edge,
				opportunity.edge,
				Date.now(),
			);
		} else {
			// Update existing entry - adjust active_arbs based on status change
			let activeArbs = row.active_arbs;
			if (isNew && isActive) {
				activeArbs += 1;
			} else if (!isNew) {
				if (wasActive && !isActive) {
					activeArbs = Math.max(0, activeArbs - 1);
				} else if (!wasActive && isActive) {
					activeArbs += 1;
				}
			}

			// Update total size (only add if new, otherwise keep existing)
			const totalSize = isNew
				? row.total_size + opportunity.maxStakeDetected
				: Math.max(row.total_size, opportunity.maxStakeDetected);

			// Recalculate average edge based on active opportunities
			const averageEdge =
				activeArbs > 0
					? (row.average_edge * row.active_arbs + opportunity.edge) /
						Math.max(1, activeArbs)
					: row.average_edge;

			const highestEdge = Math.max(row.highest_edge, opportunity.edge);

			const updateStmt = this.db.prepare(`
				UPDATE book_pair_stats
				SET active_arbs = ?, total_size = ?, average_edge = ?, highest_edge = ?, last_update = ?
				WHERE book_a = ? AND book_b = ?
			`);

			updateStmt.run(
				activeArbs,
				totalSize,
				averageEdge,
				highestEdge,
				Date.now(),
				bookA,
				bookB,
			);
		}
	}

	/**
	 * Convert database row to opportunity object
	 */
	private rowToOpportunity(row: any): OrcaArbitrageOpportunity {
		return {
			id: row.id,
			eventId: row.event_id,
			eventDescription: row.event_description,
			outcomePath: {
				type: row.outcome_path_type,
				outcome: row.outcome_path_outcome,
				full: row.outcome_path_full,
			},
			bookA: {
				book: row.book_a_book as Bookmaker,
				type: row.book_a_type as "sharp" | "soft" | "exchange",
				americanOdds: row.book_a_american_odds,
				decimalOdds: row.book_a_decimal_odds,
				impliedProbability: row.book_a_implied_prob,
				availableStake: row.book_a_available_stake,
				timestamp: row.book_a_timestamp,
			},
			bookB: {
				book: row.book_b_book as Bookmaker,
				type: row.book_b_type as "sharp" | "soft" | "exchange",
				americanOdds: row.book_b_american_odds,
				decimalOdds: row.book_b_decimal_odds,
				impliedProbability: row.book_b_implied_prob,
				availableStake: row.book_b_available_stake,
				timestamp: row.book_b_timestamp,
			},
			edge: row.edge,
			maxStakeDetected: row.max_stake_detected,
			tensionScore: row.tension_score,
			status: row.status as ArbitrageStatus,
			filledAmount: row.filled_amount ?? undefined,
			profitLocked: row.profit_locked ?? undefined,
			executionTimeMs: row.execution_time_ms ?? undefined,
			accountsUsed: row.accounts_used ?? undefined,
			detectedAt: row.detected_at,
			updatedAt: row.updated_at,
			expiresAt: row.expires_at ?? undefined,
		};
	}

	/**
	 * Map sort field to database column
	 */
	private mapSortField(field: string): string {
		const mapping: Record<string, string> = {
			edge: "edge",
			stake: "max_stake_detected",
			tensionScore: "tension_score",
			detectedAt: "detected_at",
			updatedAt: "updated_at",
		};

		return mapping[field] || "detected_at";
	}

	/**
	 * Store multiple opportunities in a batch (more efficient)
	 */
	storeOpportunitiesBatch(opportunities: OrcaArbitrageOpportunity[]): void {
		const insertStmt = this.db.prepare(`
			INSERT OR REPLACE INTO arbitrage_opportunities (
				id, event_id, event_description,
				outcome_path_type, outcome_path_outcome, outcome_path_full,
				book_a_book, book_a_type, book_a_american_odds, book_a_decimal_odds,
				book_a_implied_prob, book_a_available_stake, book_a_timestamp,
				book_b_book, book_b_type, book_b_american_odds, book_b_decimal_odds,
				book_b_implied_prob, book_b_available_stake, book_b_timestamp,
				edge, max_stake_detected, tension_score, status,
				filled_amount, profit_locked, execution_time_ms, accounts_used,
				detected_at, updated_at, expires_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const insertMany = this.db.transaction(
			(ops: OrcaArbitrageOpportunity[]) => {
				for (const opportunity of ops) {
					insertStmt.run(
						opportunity.id,
						opportunity.eventId,
						opportunity.eventDescription,
						opportunity.outcomePath.type,
						opportunity.outcomePath.outcome,
						opportunity.outcomePath.full,
						opportunity.bookA.book,
						opportunity.bookA.type,
						opportunity.bookA.americanOdds,
						opportunity.bookA.decimalOdds,
						opportunity.bookA.impliedProbability,
						opportunity.bookA.availableStake,
						opportunity.bookA.timestamp,
						opportunity.bookB.book,
						opportunity.bookB.type,
						opportunity.bookB.americanOdds,
						opportunity.bookB.decimalOdds,
						opportunity.bookB.impliedProbability,
						opportunity.bookB.availableStake,
						opportunity.bookB.timestamp,
						opportunity.edge,
						opportunity.maxStakeDetected,
						opportunity.tensionScore,
						opportunity.status,
						opportunity.filledAmount ?? null,
						opportunity.profitLocked ?? null,
						opportunity.executionTimeMs ?? null,
						opportunity.accountsUsed ?? null,
						opportunity.detectedAt,
						opportunity.updatedAt,
						opportunity.expiresAt ?? null,
					);

					// Update book pair stats for each opportunity
					this.updateBookPairStats(
						opportunity.bookA.book,
						opportunity.bookB.book,
						opportunity,
					);
				}
			},
		);

		insertMany(opportunities);
	}

	/**
	 * Clean up expired opportunities
	 */
	cleanupExpired(maxAge: number = 24 * 60 * 60 * 1000): number {
		const cutoff = Date.now() - maxAge;
		const stmt = this.db.prepare(`
			UPDATE arbitrage_opportunities
			SET status = 'expired', updated_at = ?
			WHERE status IN ('detected', 'live')
			AND detected_at < ?
		`);

		const result = stmt.run(Date.now(), cutoff);
		return result.changes;
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
