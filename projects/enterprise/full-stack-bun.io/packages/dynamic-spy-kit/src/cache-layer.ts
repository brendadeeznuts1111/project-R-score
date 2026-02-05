/**
 * @dynamic-spy/kit v3.2 - Cache Layer
 * 
 * Bun-native storage with SQLite and BunFile
 */

import { Database } from "bun:sqlite";
import { MappingEngine } from "./mapping-engine";

export interface CacheStats {
	cacheHits: number;
	cacheMisses: number;
	hitRatio: string;
	storage: string;
	marketsCached: number;
	lastSync: string;
	source: string;
}

export class SportsCache {
	private db: Database;
	private cacheFile: BunFile;
	private stats = {
		cacheHits: 0,
		cacheMisses: 0
	};

	constructor(cachePath: string = './cache/sports-mapping.db') {
		// Ensure cache directory exists
		try {
			// Use fs.mkdirSync for compatibility
			const fs = require('fs');
			fs.mkdirSync('./cache', { recursive: true });
		} catch (e: any) {
			if (e.code !== 'EEXIST') {
				// Ignore if directory already exists
			}
		}

		// Initialize SQLite database
		this.db = new Database(cachePath, { create: true });
		this.cacheFile = Bun.file('./cache/mappings.json');

		this.initSchema();
	}

	private initSchema() {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS sports_mapping (
				sport TEXT,
				league TEXT,
				market TEXT PRIMARY KEY,
				bookies TEXT,
				odds_data TEXT,
				lastUpdated INTEGER DEFAULT (unixepoch())
			);

			CREATE INDEX IF NOT EXISTS idx_sport_league ON sports_mapping(sport, league);
			CREATE INDEX IF NOT EXISTS idx_lastUpdated ON sports_mapping(lastUpdated);
		`);
	}

	async initMapping() {
		// Initialize cache with mapping data
		const mappingEngine = new MappingEngine();
		const sports = mappingEngine.getAllSports();

		for (const sport of sports) {
			const sportData = mappingEngine.getSport(sport);
			if (!sportData) continue;

			for (const [league, markets] of Object.entries(sportData.mapping)) {
				for (const market of markets) {
					await this.cacheOdds(sport, league, market, {
						bookies: ['pinnacle', 'draftkings', 'betfair'],
						odds: {}
					});
				}
			}
		}

		// Save mapping JSON
		await Bun.write(this.cacheFile, JSON.stringify(mappingEngine.getStats()));
	}

	async getMarkets(sport: string, league?: string, market?: string): Promise<any[]> {
		let query = 'SELECT * FROM sports_mapping WHERE sport = ?';
		const params: any[] = [sport];

		if (league) {
			query += ' AND league = ?';
			params.push(league);
		}

		if (market) {
			query += ' AND market = ?';
			params.push(market);
		}

		const result = this.db.query(query).all(...params);

		if (result.length > 0) {
			this.stats.cacheHits++;
			return result.map(row => ({
				...row,
				bookies: JSON.parse((row as any).bookies || '[]'),
				odds_data: JSON.parse((row as any).odds_data || '{}')
			}));
		}

		this.stats.cacheMisses++;
		return [];
	}

	async cacheOdds(sport: string, league: string, market: string, odds: any) {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO sports_mapping 
			(sport, league, market, bookies, odds_data, lastUpdated)
			VALUES (?, ?, ?, ?, ?, unixepoch())
		`);

		stmt.run(
			sport,
			league,
			market,
			JSON.stringify(odds.bookies || []),
			JSON.stringify(odds.odds_data || odds)
		);
	}

	async getCacheStats(): Promise<CacheStats> {
		const total = this.stats.cacheHits + this.stats.cacheMisses;
		const hitRatio = total > 0 
			? ((this.stats.cacheHits / total) * 100).toFixed(1) + '%'
			: '0.0%';

		const marketsCached = this.db.query('SELECT COUNT(*) as count FROM sports_mapping').get() as any;
		const lastSync = this.db.query('SELECT MAX(lastUpdated) as lastSync FROM sports_mapping').get() as any;

		// Get file size
		let storage = '0.0MB';
		try {
			const fileInfo = await this.cacheFile.exists();
			if (fileInfo) {
				const size = (await this.cacheFile.arrayBuffer()).byteLength;
				storage = `${(size / 1024 / 1024).toFixed(1)}MB`;
			}
		} catch {
			// File might not exist yet
			storage = '0.0MB';
		}

		return {
			cacheHits: this.stats.cacheHits,
			cacheMisses: this.stats.cacheMisses,
			hitRatio,
			storage,
			marketsCached: marketsCached?.count || 0,
			lastSync: lastSync?.lastSync 
				? new Date(lastSync.lastSync * 1000).toISOString()
				: new Date().toISOString(),
			source: '@yourorg/sports-data@1.2.3'
		};
	}

	async clearCache() {
		this.db.exec('DELETE FROM sports_mapping');
		this.stats.cacheHits = 0;
		this.stats.cacheMisses = 0;
	}

	close() {
		this.db.close();
	}
}

