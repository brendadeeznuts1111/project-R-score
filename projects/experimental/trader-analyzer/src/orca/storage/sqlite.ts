/**
 * @fileoverview ORCA SQLite Storage
 * @description Persistent storage for aliases, odds cache, and analytics using bun:sqlite
 * @module orca/storage/sqlite
 */

import { Database } from "bun:sqlite";
import type { OrcaBookmaker, OrcaOddsUpdate, OrcaSport } from "../../types";

/**
 * ORCA SQLite database for persistent storage
 *
 * Uses Bun's native SQLite (bun:sqlite) for:
 * - Team/league/sport alias persistence
 * - Odds history for backtesting
 * - Event tracking across sessions
 */
export class OrcaStorage {
	private db: Database;

	constructor(path = "./data/orca.sqlite") {
		this.db = new Database(path);
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		// Team aliases table
		this.db.run(`
      CREATE TABLE IF NOT EXISTS team_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookmaker TEXT NOT NULL,
        alias TEXT NOT NULL,
        canonical TEXT NOT NULL,
        sport TEXT NOT NULL,
        league TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bookmaker, alias)
      )
    `);

		// Sport aliases table
		this.db.run(`
      CREATE TABLE IF NOT EXISTS sport_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookmaker TEXT NOT NULL,
        alias TEXT NOT NULL,
        canonical TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bookmaker, alias)
      )
    `);

		// Odds history table
		this.db.run(`
      CREATE TABLE IF NOT EXISTS odds_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        market_id TEXT NOT NULL,
        selection_id TEXT NOT NULL,
        bookmaker TEXT NOT NULL,
        odds REAL NOT NULL,
        line REAL,
        timestamp INTEGER NOT NULL,
        is_open INTEGER DEFAULT 1,
        max_stake REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// Create indexes
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_odds_event ON odds_history(event_id)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_odds_market ON odds_history(market_id)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_odds_timestamp ON odds_history(timestamp)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_team_aliases_bookmaker ON team_aliases(bookmaker)`,
		);

		// Events table for tracking
		this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        sport TEXT NOT NULL,
        league TEXT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        start_time TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

		console.log("ORCA Storage: SQLite initialized");
	}

	/**
	 * Add a team alias
	 */
	addTeamAlias(
		bookmaker: OrcaBookmaker,
		alias: string,
		canonical: string,
		sport: OrcaSport,
		league: string,
		confidence = 1.0,
	): void {
		const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO team_aliases (bookmaker, alias, canonical, sport, league, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
		stmt.run(
			bookmaker,
			alias.toLowerCase(),
			canonical,
			sport,
			league,
			confidence,
		);
	}

	/**
	 * Look up a team alias
	 */
	lookupTeamAlias(bookmaker: OrcaBookmaker, alias: string): string | null {
		const stmt = this.db.prepare(`
      SELECT canonical FROM team_aliases WHERE bookmaker = ? AND alias = ?
    `);
		const result = stmt.get(bookmaker, alias.toLowerCase()) as {
			canonical: string;
		} | null;
		return result?.canonical || null;
	}

	/**
	 * Add a sport alias
	 */
	addSportAlias(
		bookmaker: OrcaBookmaker,
		alias: string,
		canonical: OrcaSport,
	): void {
		const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sport_aliases (bookmaker, alias, canonical)
      VALUES (?, ?, ?)
    `);
		stmt.run(bookmaker, alias.toLowerCase(), canonical);
	}

	/**
	 * Look up a sport alias
	 */
	lookupSportAlias(bookmaker: OrcaBookmaker, alias: string): OrcaSport | null {
		const stmt = this.db.prepare(`
      SELECT canonical FROM sport_aliases WHERE bookmaker = ? AND alias = ?
    `);
		const result = stmt.get(bookmaker, alias.toLowerCase()) as {
			canonical: OrcaSport;
		} | null;
		return result?.canonical || null;
	}

	/**
	 * Store odds update for history/backtesting
	 */
	storeOdds(update: OrcaOddsUpdate): void {
		const stmt = this.db.prepare(`
      INSERT INTO odds_history (event_id, market_id, selection_id, bookmaker, odds, line, timestamp, is_open, max_stake)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
		stmt.run(
			update.eventId,
			update.marketId,
			update.selectionId,
			update.bookmaker,
			update.odds,
			update.line || null,
			update.timestamp,
			update.isOpen ? 1 : 0,
			update.maxStake || null,
		);
	}

	/**
	 * Store multiple odds updates (batch)
	 */
	storeOddsBatch(updates: OrcaOddsUpdate[]): void {
		const stmt = this.db.prepare(`
      INSERT INTO odds_history (event_id, market_id, selection_id, bookmaker, odds, line, timestamp, is_open, max_stake)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		const insertMany = this.db.transaction((items: OrcaOddsUpdate[]) => {
			for (const update of items) {
				stmt.run(
					update.eventId,
					update.marketId,
					update.selectionId,
					update.bookmaker,
					update.odds,
					update.line || null,
					update.timestamp,
					update.isOpen ? 1 : 0,
					update.maxStake || null,
				);
			}
		});

		insertMany(updates);
	}

	/**
	 * Get odds history for a market
	 */
	getOddsHistory(
		marketId: string,
		options?: { bookmaker?: OrcaBookmaker; since?: number; limit?: number },
	): OrcaOddsUpdate[] {
		let query = `SELECT * FROM odds_history WHERE market_id = ?`;
		const params: (string | number)[] = [marketId];

		if (options?.bookmaker) {
			query += ` AND bookmaker = ?`;
			params.push(options.bookmaker);
		}

		if (options?.since) {
			query += ` AND timestamp >= ?`;
			params.push(options.since);
		}

		query += ` ORDER BY timestamp DESC`;

		if (options?.limit) {
			query += ` LIMIT ?`;
			params.push(options.limit);
		}

		const stmt = this.db.prepare(query);
		const rows = stmt.all(...params) as any[];

		return rows.map((row) => ({
			marketId: row.market_id,
			selectionId: row.selection_id,
			eventId: row.event_id,
			bookmaker: row.bookmaker as OrcaBookmaker,
			odds: row.odds,
			line: row.line,
			timestamp: row.timestamp,
			isOpen: row.is_open === 1,
			maxStake: row.max_stake,
			marketType: "spread" as const, // Would need to store this
		}));
	}

	/**
	 * Store or update an event
	 */
	upsertEvent(
		id: string,
		sport: OrcaSport,
		league: string | null,
		homeTeam: string,
		awayTeam: string,
		startTime: string,
		status = "scheduled",
	): void {
		const stmt = this.db.prepare(`
      INSERT INTO events (id, sport, league, home_team, away_team, start_time, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `);
		stmt.run(id, sport, league, homeTeam, awayTeam, startTime, status);
	}

	/**
	 * Get event by ID
	 */
	getEvent(id: string): any | null {
		const stmt = this.db.prepare(`SELECT * FROM events WHERE id = ?`);
		return stmt.get(id);
	}

	/**
	 * Get storage statistics
	 */
	getStats(): {
		teamAliases: number;
		sportAliases: number;
		oddsRecords: number;
		events: number;
		dbSize: string;
	} {
		const teamCount = this.db
			.prepare(`SELECT COUNT(*) as count FROM team_aliases`)
			.get() as { count: number };
		const sportCount = this.db
			.prepare(`SELECT COUNT(*) as count FROM sport_aliases`)
			.get() as { count: number };
		const oddsCount = this.db
			.prepare(`SELECT COUNT(*) as count FROM odds_history`)
			.get() as { count: number };
		const eventCount = this.db
			.prepare(`SELECT COUNT(*) as count FROM events`)
			.get() as { count: number };

		// Get database file size
		const pageCount = this.db.prepare(`PRAGMA page_count`).get() as {
			page_count: number;
		};
		const pageSize = this.db.prepare(`PRAGMA page_size`).get() as {
			page_size: number;
		};
		const dbSizeBytes = pageCount.page_count * pageSize.page_size;
		const dbSize =
			dbSizeBytes > 1024 * 1024
				? `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`
				: `${(dbSizeBytes / 1024).toFixed(2)} KB`;

		return {
			teamAliases: teamCount.count,
			sportAliases: sportCount.count,
			oddsRecords: oddsCount.count,
			events: eventCount.count,
			dbSize,
		};
	}

	/**
	 * Get SQLite version
	 */
	getVersion(): string {
		const result = this.db
			.prepare(`SELECT sqlite_version() as version`)
			.get() as { version: string };
		return result.version;
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}

/**
 * Global storage instance
 */
let globalStorage: OrcaStorage | null = null;

/**
 * Get or create global storage instance
 */
export function getOrcaStorage(path?: string): OrcaStorage {
	if (!globalStorage) {
		globalStorage = new OrcaStorage(path);
	}
	return globalStorage;
}
