/**
 * @fileoverview Anomaly-Aware Pattern Miner
 * @module research/discovery/anomaly-aware-miner
 *
 * Extends SubMarketPatternMiner to filter out URL artifact patterns from real patterns.
 * Uses correlation analysis to identify patterns caused by URL parsing anomalies.
 */

import type { Database } from "bun:sqlite";
import { SubMarketPatternMiner, type ResearchPattern } from "./pattern-miner";
import {
	UrlAnomalyPatternEngine,
	type UrlAnomalyPattern,
} from "../patterns/url-anomaly-patterns";

/**
 * Anomaly-Aware Pattern Miner
 *
 * Filters out patterns that are highly correlated with URL parsing anomalies,
 * preventing false positive pattern discoveries caused by URL entity splitting bugs.
 */
export class AnomalyAwarePatternMiner extends SubMarketPatternMiner {
	/**
	 * Override to filter out URL artifact patterns from real patterns
	 */
	override discoverPatterns(
		sport: string,
		hours: number = 24,
	): ResearchPattern[] {
		const rawPatterns = super.discoverPatterns(sport, hours);

		// Check each pattern for URL anomaly correlation
		const cleanPatterns = rawPatterns.filter((pattern) => {
			const anomalyCorrelation = this.checkAnomalyCorrelation(pattern);

			// If highly correlated with URL anomalies, mark as artifact
			if (anomalyCorrelation > 0.8) {
				try {
					this.db.run(
						`
						UPDATE research_pattern_log
						SET notes = ?, is_validated = FALSE
						WHERE patternId = ?
					`,
						[
							`[ARTIFACT] Likely caused by URL parsing anomalies`,
							pattern.patternId,
						],
					);
				} catch (error) {
					// Table might not exist yet, log but continue
					console.warn(
						`Failed to update pattern log: ${error instanceof Error ? error.message : String(error)}`,
					);
				}

				return false; // Exclude from production patterns
			}

			return true;
		});

		return cleanPatterns;
	}

	/**
	 * Check if pattern correlates with URL anomalies
	 * Returns correlation coefficient (0-1) where >0.8 indicates strong correlation
	 */
	private checkAnomalyCorrelation(pattern: ResearchPattern): number {
		const cutoffTime = Math.floor(Date.now() / 1000) - 24 * 3600;
		const bookmaker =
			(pattern.pre_conditions?.bookmaker as string) ||
			(pattern as any).affected_bookmakers?.[0] ||
			"all";

		try {
			// SQLite doesn't have CORR function, so we calculate correlation manually
			const result = this.db
				.query(`
				WITH pattern_events AS (
					SELECT eventId, detected_at 
					FROM sub_market_tension_events
					WHERE tension_type = 'line_divergence'
						AND detected_at > ?1
				),
				anomaly_events AS (
					SELECT DISTINCT eventId, detected_at
					FROM url_anomaly_audit
					WHERE bookmaker = ?2
						AND detected_at > ?1
				),
				combined AS (
					SELECT 
						CASE WHEN pe.eventId IS NOT NULL THEN 1 ELSE 0 END as has_pattern,
						CASE WHEN ae.eventId IS NOT NULL THEN 1 ELSE 0 END as has_anomaly
					FROM pattern_events pe
					LEFT JOIN anomaly_events ae ON pe.eventId = ae.eventId
					
					UNION ALL
					
					SELECT 
						CASE WHEN pe.eventId IS NOT NULL THEN 1 ELSE 0 END as has_pattern,
						CASE WHEN ae.eventId IS NOT NULL THEN 1 ELSE 0 END as has_anomaly
					FROM anomaly_events ae
					LEFT JOIN pattern_events pe ON ae.eventId = pe.eventId
					WHERE pe.eventId IS NULL
				)
				SELECT 
					COUNT(*) as n,
					AVG(has_pattern) as avg_pattern,
					AVG(has_anomaly) as avg_anomaly,
					SUM((has_pattern - (SELECT AVG(has_pattern) FROM combined)) * 
					    (has_anomaly - (SELECT AVG(has_anomaly) FROM combined))) as covariance,
					SUM(POWER(has_pattern - (SELECT AVG(has_pattern) FROM combined), 2)) as var_pattern,
					SUM(POWER(has_anomaly - (SELECT AVG(has_anomaly) FROM combined), 2)) as var_anomaly
				FROM combined
			`)
				.get(cutoffTime, bookmaker) as {
				n: number;
				avg_pattern: number;
				avg_anomaly: number;
				covariance: number;
				var_pattern: number;
				var_anomaly: number;
			} | null;

			if (
				!result ||
				result.n < 2 ||
				result.var_pattern === 0 ||
				result.var_anomaly === 0
			) {
				return 0;
			}

			// Calculate Pearson correlation coefficient
			const correlation =
				result.covariance / Math.sqrt(result.var_pattern * result.var_anomaly);

			return Math.abs(correlation);
		} catch (error) {
			// If tables don't exist or query fails, assume no correlation
			console.warn(
				`Failed to check anomaly correlation: ${error instanceof Error ? error.message : String(error)}`,
			);
			return 0;
		}
	}

	/**
	 * Discover patterns *specifically* caused by URL anomalies (for research)
	 */
	async discoverAnomalyArtifactPatterns(
		sport: string,
		hours: number = 24,
	): Promise<UrlAnomalyPattern[]> {
		const anomalyEngine = new UrlAnomalyPatternEngine(this.db);
		return await anomalyEngine.discoverAnomalyPatterns(sport, hours);
	}
}
