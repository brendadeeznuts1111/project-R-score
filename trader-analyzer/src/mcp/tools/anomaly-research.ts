/**
 * @fileoverview Anomaly Research MCP Tools
 * @module mcp/tools/anomaly-research
 *
 * MCP tools specifically for URL anomaly pattern research and data correction.
 */

import type { Database } from "bun:sqlite";
import { AnomalyAwarePatternMiner } from "../../research/discovery/anomaly-aware-miner";
import { ForensicDataCorrector } from "../../research/data-correction/correction-engine";
import { UrlAnomalyPatternEngine } from "../../research/patterns/url-anomaly-patterns";

/**
 * Create anomaly research MCP tools
 */
export function createAnomalyResearchTools(db: Database) {
	const miner = new AnomalyAwarePatternMiner(db);
	const corrector = new ForensicDataCorrector(db);
	const engine = new UrlAnomalyPatternEngine(db);

	return [
		{
			name: "research-discover-url-patterns",
			description:
				"Discover patterns specifically caused by URL parsing anomalies",
			inputSchema: {
				type: "object",
				properties: {
					sport: { type: "string", default: "NBA" },
					bookmaker: { type: "string" },
					hours: { type: "number", default: 24 },
				},
			},
			execute: async (args: { sport?: string; bookmaker?: string }) => {
				const patterns = await miner.discoverAnomalyArtifactPatterns(
					args.sport || "NBA",
				);

				// Filter by bookmaker if specified
				const filteredPatterns = args.bookmaker
					? patterns.filter((p) =>
							p.affected_bookmakers.includes(args.bookmaker!),
						)
					: patterns;

				if (filteredPatterns.length === 0) {
					return {
						content: [
							{
								text: `No URL anomaly patterns found for ${args.sport || "all sports"}${args.bookmaker ? ` (${args.bookmaker})` : ""}`,
							},
						],
					};
				}

				return {
					content: [
						{
							text:
								`🔗 URL Anomaly Patterns for ${args.sport || "all sports"}\n` +
								filteredPatterns
									.map(
										(p) =>
											`${p.pattern_name} (impact: ${(p.market_impact.false_steam_probability * 100).toFixed(1)}% false steam)\n` +
											`  Bookmaker: ${p.affected_bookmakers.join(", ")}\n` +
											`  URL Sig: ${p.url_signature}\n` +
											`  Frequency: ${p.market_impact.frequency_per_hour.toFixed(1)}/hour`,
									)
									.join("\n\n"),
						},
					],
				};
			},
		},
		{
			name: "research-correct-historical-data",
			description: "Remove URL artifact false positives from historical data",
			inputSchema: {
				type: "object",
				properties: {
					startDate: { type: "string" },
					endDate: { type: "string" },
				},
				required: ["startDate", "endDate"],
			},
			execute: async (args: { startDate: string; endDate: string }) => {
				const stats = await corrector.correctHistoricalData(
					args.startDate,
					args.endDate,
				);

				const report = await corrector.generateCorrectionReport();

				return {
					content: [
						{
							text:
								`✅ Data Correction Complete\n` +
								`Records Corrected: ${stats.correctedRecords}\n` +
								`False Steam Alerts Removed: ${stats.removedSteamAlerts}\n` +
								`Weights Adjusted: ${stats.adjustedWeights}`,
						},
					],
					binary: report,
				};
			},
		},
		{
			name: "research-calculate-false-steam-rate",
			description:
				"Calculate false steam rate caused by URL anomalies per bookmaker",
			inputSchema: {
				type: "object",
				properties: {
					bookmaker: { type: "string" },
					hours: { type: "number", default: 24 },
				},
				required: ["bookmaker"],
			},
			execute: async (args: { bookmaker: string; hours?: number }) => {
				const rate = engine.calculateFalseSteamRate(
					args.bookmaker,
					args.hours || 24,
				);

				const impact =
					rate > 0.1 ? "🚨 HIGH" : rate > 0.05 ? "⚠️  MEDIUM" : "✅ LOW";

				return {
					content: [
						{
							text:
								`False Steam Rate: ${(rate * 100).toFixed(1)}%\n` +
								`Bookmaker: ${args.bookmaker}\n` +
								`Window: ${args.hours || 24} hours\n` +
								`Impact: ${impact}`,
						},
					],
				};
			},
		},
		{
			name: "research-flag-url-artifacts",
			description:
				"Flag all historical patterns likely caused by URL artifacts",
			inputSchema: {
				type: "object",
				properties: {
					bookmaker: { type: "string" },
					minCorrelation: { type: "number", default: 0.7 },
				},
			},
			execute: async (args: {
				bookmaker?: string;
				minCorrelation?: number;
			}) => {
				try {
					// Check if research_pattern_log table exists
					const tableCheck = db
						.query(`
						SELECT name FROM sqlite_master 
						WHERE type='table' AND name='research_pattern_log'
					`)
						.get();

					if (!tableCheck) {
						return {
							content: [
								{
									text: "⚠️  research_pattern_log table does not exist. Patterns cannot be flagged.",
								},
							],
						};
					}

					let flagged;
					if (args.bookmaker) {
						flagged = db
							.query(`
							UPDATE research_pattern_log
							SET notes = '[FLAGGED] Likely URL artifact', is_active = 0
							WHERE pattern_name LIKE '%steam%'
								AND backtest_accuracy > 0.8
								AND json_extract(pre_conditions, '$.bookmaker') = ?1
								AND discovered_at > unixepoch('now', '-30 days')
						`)
							.run(args.bookmaker);
					} else {
						flagged = db
							.query(`
							UPDATE research_pattern_log
							SET notes = '[FLAGGED] Likely URL artifact', is_active = 0
							WHERE pattern_name LIKE '%steam%'
								AND backtest_accuracy > 0.8
								AND discovered_at > unixepoch('now', '-30 days')
						`)
							.run();
					}

					return {
						content: [
							{
								text: `🚩 Flagged ${flagged.changes || 0} patterns as URL artifacts`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Failed to flag patterns: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		},
	];
}
