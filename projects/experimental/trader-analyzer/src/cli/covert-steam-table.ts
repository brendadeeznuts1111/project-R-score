#!/usr/bin/env bun
/**
 * Covert Steam Alert Table Display Utilities
 *
 * Uses Bun.inspect.table() for beautiful tabular data display
 *
 * @module cli/covert-steam-table
 */

import type { CovertSteamEventRecord } from "../types/covert-steam";
import {
	getCovertSteamSeverityLevel,
	getCovertSteamSeverityEmoji,
} from "../telegram/covert-steam-alert";

/**
 * Display Covert Steam alerts in a formatted table using Bun.inspect.table()
 */
export function displayAlertsTable(
	alerts: CovertSteamEventRecord[],
	options: {
		limit?: number;
		showDeepLink?: boolean;
	} = {},
): void {
	const { limit = 10, showDeepLink = false } = options;

	const tableData = alerts.slice(0, limit).map((alert) => {
		const severityScore = alert.impact_severity_score ?? 0;
		const severityLevel = getCovertSteamSeverityLevel(severityScore);
		const severityEmoji = getCovertSteamSeverityEmoji(severityScore);

		return {
			Event: alert.event_identifier,
			Bookmaker: alert.bookmaker_name || "N/A",
			Severity: `${severityScore.toFixed(1)} ${severityEmoji}`,
			Level: severityLevel,
			Timestamp: new Date(alert.detection_timestamp)
				.toISOString()
				.replace("T", " ")
				.substring(0, 19),
			Node: alert.source_dark_node_id || "N/A",
		};
	});

	console.log(
		Bun.inspect.table(
			tableData,
			["Event", "Bookmaker", "Severity", "Level", "Timestamp", "Node"],
			{
				colors: true,
			},
		),
	);
}

/**
 * Display severity threshold information in a table
 */
export function displaySeverityThresholdsTable(currentScore?: number): void {
	const thresholdData = [
		{
			Level: "CRITICAL",
			Range: ">= 9",
			Emoji: "🚨",
			"Auto-Pin": "Yes",
			Current: currentScore !== undefined && currentScore >= 9 ? "✓" : "",
		},
		{
			Level: "HIGH",
			Range: ">= 7 and < 9",
			Emoji: "⚠️",
			"Auto-Pin": "No",
			Current:
				currentScore !== undefined && currentScore >= 7 && currentScore < 9
					? "✓"
					: "",
		},
		{
			Level: "MEDIUM",
			Range: ">= 5 and < 7",
			Emoji: "📈",
			"Auto-Pin": "No",
			Current:
				currentScore !== undefined && currentScore >= 5 && currentScore < 7
					? "✓"
					: "",
		},
		{
			Level: "LOW",
			Range: "< 5",
			Emoji: "📊",
			"Auto-Pin": "No",
			Current: currentScore !== undefined && currentScore < 5 ? "✓" : "",
		},
	];

	console.log(
		Bun.inspect.table(
			thresholdData,
			["Level", "Range", "Emoji", "Auto-Pin", "Current"],
			{
				colors: true,
			},
		),
	);
}

/**
 * Display topic mappings in a table
 */
export async function displayTopicsTable(): Promise<void> {
	// Use dynamic imports to avoid circular dependencies
	const { getAllMappings, TOPIC_NAMES } = await import(
		"../telegram/topic-mapping.js"
	);
	const { COVERT_STEAM_DEFAULT_TOPIC_ID } = await import(
		"../telegram/constants.js"
	);

	const topicMappings = getAllMappings();
	const topicTableData = Object.entries(topicMappings).map(
		([name, threadId]) => {
			const topicName =
				TOPIC_NAMES[threadId as keyof typeof TOPIC_NAMES] || name;
			return {
				Topic: topicName,
				"Thread ID": threadId.toString(),
				"Logical ID": name,
				Default: threadId === COVERT_STEAM_DEFAULT_TOPIC_ID ? "✓" : "",
			};
		},
	);

	console.log(
		Bun.inspect.table(
			topicTableData,
			["Topic", "Thread ID", "Logical ID", "Default"],
			{
				colors: true,
			},
		),
	);
}

/**
 * Display alert statistics in tables
 */
export function displayAlertStatsTable(stats: {
	total: number;
	bySeverity: {
		critical: number;
		high: number;
		medium: number;
		low: number;
	};
	byBookmaker: Record<string, number>;
}): void {
	const severityData = [
		{
			Level: "CRITICAL",
			Count: stats.bySeverity.critical.toString(),
			Percentage: `${((stats.bySeverity.critical / stats.total) * 100).toFixed(1)}%`,
		},
		{
			Level: "HIGH",
			Count: stats.bySeverity.high.toString(),
			Percentage: `${((stats.bySeverity.high / stats.total) * 100).toFixed(1)}%`,
		},
		{
			Level: "MEDIUM",
			Count: stats.bySeverity.medium.toString(),
			Percentage: `${((stats.bySeverity.medium / stats.total) * 100).toFixed(1)}%`,
		},
		{
			Level: "LOW",
			Count: stats.bySeverity.low.toString(),
			Percentage: `${((stats.bySeverity.low / stats.total) * 100).toFixed(1)}%`,
		},
	];

	const bookmakerData = Object.entries(stats.byBookmaker).map(
		([bookmaker, count]) => ({
			Bookmaker: bookmaker,
			Alerts: count.toString(),
			Percentage: `${((count / stats.total) * 100).toFixed(1)}%`,
		}),
	);

	console.log("Severity Breakdown:");
	console.log(
		Bun.inspect.table(severityData, ["Level", "Count", "Percentage"], {
			colors: true,
		}),
	);

	console.log("\nBy Bookmaker:");
	console.log(
		Bun.inspect.table(bookmakerData, ["Bookmaker", "Alerts", "Percentage"], {
			colors: true,
		}),
	);
}
