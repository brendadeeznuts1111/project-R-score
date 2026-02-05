/**
 * @dynamic-spy/kit v3.3 - Advanced Cache
 * 
 * Multi-layer SQLite cache with heatmap and advanced queries
 */

import { Database } from "bun:sqlite";

export interface HeatmapEntry {
	sport: string;
	league: string;
	market: string;
	arb_profit: number;
	heat_level: number;
}

export interface CacheMetrics {
	hits: number;
	misses: number;
	ratio: string;
	size: string;
}

export class AdvancedCache {
	private db: Database;
	private stats = {
		hits: 0,
		misses: 0
	};

	constructor(cachePath: string = './cache/arb.db') {
		// Ensure cache directory exists
		try {
			const fs = require('fs');
			fs.mkdirSync('./cache', { recursive: true });
		} catch (e: any) {
			if (e.code !== 'EEXIST') {
				throw e;
			}
		}

		this.db = new Database(cachePath, { create: true });
		this.createSchema();
	}

	/**
	 * Create advanced cache schema
	 */
	private createSchema() {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS markets (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				sport TEXT NOT NULL,
				league TEXT NOT NULL,
				market TEXT UNIQUE NOT NULL,
				bookies TEXT,
				arb_profit REAL DEFAULT 0,
				heat_level INTEGER DEFAULT 0,
				last_updated INTEGER NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			);

			CREATE INDEX IF NOT EXISTS idx_sport ON markets(sport);
			CREATE INDEX IF NOT EXISTS idx_arb_profit ON markets(arb_profit DESC);
			CREATE INDEX IF NOT EXISTS idx_heat ON markets(heat_level DESC);
			CREATE INDEX IF NOT EXISTS idx_last_updated ON markets(last_updated);
		`);
	}

	/**
	 * Get odds for a market
	 */
	async getOdds(sport: string, league?: string, market?: string): Promise<any | null> {
		let query = 'SELECT * FROM markets WHERE sport = ?';
		const params: any[] = [sport];

		if (league) {
			query += ' AND league = ?';
			params.push(league);
		}

		if (market) {
			query += ' AND market = ?';
			params.push(market);
		}

		const result = this.db.query(query).get(...params) as any;

		if (result) {
			this.stats.hits++;
			return {
				...result,
				bookies: JSON.parse(result.bookies || '[]'),
				arb_profit: result.arb_profit,
				heat_level: result.heat_level
			};
		}

		this.stats.misses++;
		return null;
	}

	/**
	 * Cache odds with heat level
	 */
	async cacheOdds(
		sport: string,
		league: string,
		market: string,
		odds: any,
		arbProfit: number = 0,
		heatLevel: number = 0
	) {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO markets 
			(sport, league, market, bookies, arb_profit, heat_level, last_updated)
			VALUES (?, ?, ?, ?, ?, ?, unixepoch())
		`);

		stmt.run(
			sport,
			league,
			market,
			JSON.stringify(odds.bookies || odds || []),
			arbProfit,
			heatLevel
		);
	}

	/**
	 * Get top 10 hottest markets (heatmap)
	 */
	async getHeatmap(limit: number = 10): Promise<HeatmapEntry[]> {
		const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

		const results = this.db.query(`
			SELECT sport, league, market, arb_profit, heat_level
			FROM markets 
			WHERE last_updated > ?
			ORDER BY heat_level DESC, arb_profit DESC 
			LIMIT ?
		`).all(fiveMinutesAgo, limit) as any[];

		return results.map(row => ({
			sport: row.sport,
			league: row.league,
			market: row.market,
			arb_profit: row.arb_profit,
			heat_level: row.heat_level
		}));
	}

	/**
	 * Get cache metrics
	 */
	async getMetrics(): Promise<CacheMetrics> {
		const total = this.stats.hits + this.stats.misses;
		const ratio = total > 0
			? ((this.stats.hits / total) * 100).toFixed(1) + '%'
			: '0.0%';

		// Get database file size
		const dbFile = Bun.file('./cache/arb.db');
		let size = '0.0MB';
		try {
			const exists = await dbFile.exists();
			if (exists) {
				const fileSize = (await dbFile.arrayBuffer()).byteLength;
				size = `${(fileSize / 1024 / 1024).toFixed(1)}MB`;
			}
		} catch {
			size = '0.0MB';
		}

		return {
			hits: this.stats.hits,
			misses: this.stats.misses,
			ratio,
			size
		};
	}

	/**
	 * Cleanup old markets (older than 24 hours)
	 */
	async cleanupOldMarkets() {
		const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
		const result = this.db.exec(`
			DELETE FROM markets WHERE last_updated < ${oneDayAgo}
		`);
		return result;
	}

	close() {
		this.db.close();
	}
}



