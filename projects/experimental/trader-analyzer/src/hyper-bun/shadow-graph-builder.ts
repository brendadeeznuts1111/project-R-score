import { Database } from "bun:sqlite";
import { logger } from "./console-enhancement";

/**
 * SubMarket Shadow Graph Builder
 *
 * Implements database-aware market operations using Bun's native SQLite integration.
 * Builds shadow graphs of market movements for pattern detection and trend analysis.
 */
export class SubMarketShadowGraphBuilder {
	private db: Database;
	private historicalQuery: any;

	constructor(dbPath: string = "markets.db") {
		this.db = new Database(dbPath);

		// Optimize SQLite for concurrent operations
		this.db.exec("PRAGMA journal_mode = WAL;");
		this.db.exec("PRAGMA synchronous = NORMAL;");

		this.initializeTables();

		// Prepare frequently used queries after tables are created
		this.historicalQuery = this.db.query(`
      SELECT * FROM line_movements
      WHERE nodeId = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `);
	}

	private initializeTables(): void {
		// Create tables if they don't exist
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS line_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nodeId TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        line_value REAL,
        volume REAL,
        bookmaker TEXT,
        market_type TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_node_timestamp ON line_movements(nodeId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_bookmaker ON line_movements(bookmaker);
    `);
	}

	/**
	 * Retrieve historical line movement data for a specific market node
	 * Uses Bun-native SQLite prepared statements for optimal performance
	 */
	async retrieveHistoricalLineData(
		nodeId: string,
	): Promise<LineMovementData[]> {
		try {
			const results = this.historicalQuery.all(nodeId) as LineMovementData[];
			return results;
		} catch (error) {
			logger.error(
				`Failed to retrieve historical data for node ${nodeId}`,
				error,
			);
			throw new Error(`Historical data retrieval failed: ${error}`);
		}
	}

	/**
	 * Analyze trend patterns from historical data
	 * Hyper-Bun domain logic for market trend detection
	 */
	analyzeTrendPatterns(historicalData: LineMovementData[]): TrendAnalysis {
		if (historicalData.length < 2) {
			return {
				trend: "insufficient_data",
				confidence: 0,
				momentum: 0,
				dataPoints: historicalData.length,
				timeRange: { start: undefined, end: undefined },
			};
		}

		// Calculate momentum using price velocity
		const midPoint = Math.floor(historicalData.length / 2);
		const recent = historicalData.slice(0, midPoint); // Most recent half
		const older = historicalData.slice(midPoint); // Older half

		if (older.length === 0) {
			// Not enough data for comparison, use trend from first vs last
			const first = historicalData[historicalData.length - 1].line_value || 0;
			const last = historicalData[0].line_value || 0;
			const momentum = last - first;
			const trend =
				momentum > 0.05 ? "upward" : momentum < -0.05 ? "downward" : "stable";
			const confidence = Math.min(Math.abs(momentum) / 0.2, 1);

			return {
				trend,
				confidence,
				momentum,
				dataPoints: historicalData.length,
				timeRange: {
					start: historicalData[historicalData.length - 1]?.timestamp,
					end: historicalData[0]?.timestamp,
				},
			};
		}

		const recentAvg =
			recent.reduce((sum, d) => sum + (d.line_value || 0), 0) / recent.length;
		const olderAvg =
			older.reduce((sum, d) => sum + (d.line_value || 0), 0) / older.length;

		const momentum = recentAvg - olderAvg;
		const trend =
			momentum > 0.1 ? "upward" : momentum < -0.1 ? "downward" : "stable";
		const confidence = Math.min(Math.abs(momentum) / 0.5, 1); // Normalize confidence

		return {
			trend,
			confidence,
			momentum,
			dataPoints: historicalData.length,
			timeRange: {
				start: historicalData[historicalData.length - 1]?.timestamp,
				end: historicalData[0]?.timestamp,
			},
		};
	}

	/**
	 * Detect hidden momentum patterns that may indicate market manipulation
	 * Advanced Hyper-Bun pattern detection algorithm
	 */
	detectHiddenMomentum(
		historicalData: LineMovementData[],
	): HiddenMomentumAnalysis {
		const anomalies: Anomaly[] = [];
		const volatility: number[] = [];

		// Calculate rolling volatility
		for (let i = 1; i < historicalData.length; i++) {
			const current = historicalData[i].line_value || 0;
			const previous = historicalData[i - 1].line_value || 0;
			const change = Math.abs(current - previous);
			volatility.push(change);
		}

		const avgVolatility =
			volatility.reduce((sum, v) => sum + v, 0) / volatility.length;
		const stdDev = Math.sqrt(
			volatility.reduce((sum, v) => sum + Math.pow(v - avgVolatility, 2), 0) /
				volatility.length,
		);

		// Detect anomalies (changes > 2 standard deviations)
		volatility.forEach((vol, index) => {
			if (vol > avgVolatility + 2 * stdDev) {
				anomalies.push({
					index: index + 1,
					timestamp: historicalData[index + 1].timestamp,
					severity: (vol - avgVolatility) / stdDev,
					description: "Unusual line movement volatility",
				});
			}
		});

		return {
			hasHiddenMomentum: anomalies.length > 0,
			anomalies,
			volatilityProfile: {
				average: avgVolatility,
				standardDeviation: stdDev,
				maxVolatility: Math.max(...volatility),
				minVolatility: Math.min(...volatility),
			},
		};
	}

	/**
	 * Build complete shadow graph for a market node
	 * Combines historical data retrieval with trend analysis
	 */
	async buildShadowGraph(nodeId: string): Promise<ShadowGraph> {
		const historicalData = await this.retrieveHistoricalLineData(nodeId);
		const trendAnalysis = this.analyzeTrendPatterns(historicalData);
		const hiddenMomentum = this.detectHiddenMomentum(historicalData);

		return {
			nodeId,
			historicalData,
			trendAnalysis,
			hiddenMomentum,
			generatedAt: Date.now(),
			dataFreshness:
				historicalData.length > 0
					? Date.now() - historicalData[0].timestamp
					: 0,
		};
	}

	/**
	 * Clean up resources
	 */
	close(): void {
		this.db.close();
	}
}

// Type definitions
export interface LineMovementData {
	id: number;
	nodeId: string;
	timestamp: number;
	line_value?: number;
	volume?: number;
	bookmaker: string;
	market_type: string;
	metadata?: string;
}

export interface TrendAnalysis {
	trend: "upward" | "downward" | "stable" | "insufficient_data";
	confidence: number;
	momentum: number;
	dataPoints: number;
	timeRange: {
		start?: number;
		end?: number;
	};
}

export interface Anomaly {
	index: number;
	timestamp: number;
	severity: number;
	description: string;
}

export interface HiddenMomentumAnalysis {
	hasHiddenMomentum: boolean;
	anomalies: Anomaly[];
	volatilityProfile: {
		average: number;
		standardDeviation: number;
		maxVolatility: number;
		minVolatility: number;
	};
}

export interface ShadowGraph {
	nodeId: string;
	historicalData: LineMovementData[];
	trendAnalysis: TrendAnalysis;
	hiddenMomentum: HiddenMomentumAnalysis;
	generatedAt: number;
	dataFreshness: number;
}
