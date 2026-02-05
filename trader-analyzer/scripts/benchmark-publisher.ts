#!/usr/bin/env bun
/**
 * @fileoverview Benchmark Results RSS Publisher
 * @description Publish benchmark results to RSS feed and Telegram notifications
 * @module scripts/benchmark-publisher
 */

import { Database } from 'bun:sqlite';
import { notifyTopic } from '../packages/@graph/telegram/src/notifications';
import { getTopicInfo, type PackageName } from '../packages/@graph/telegram/src/topics';
import { refreshRSSCache } from '../src/utils/rss-cache-refresh';

interface BenchmarkResult {
	packageName: string;
	version?: string;
	avgDuration: number;
	stdDev: number;
	repeats: number;
	passed: number;
	failed: number;
	minDuration: number;
	maxDuration: number;
	properties?: Record<string, any>;
	timestamp: number;
}

/**
 * Publish benchmark results to internal RSS feed
 */
export async function publishBenchmarkToRSS(
	packageName: string,
	benchmarkResult: BenchmarkResult,
): Promise<void> {
	// Save to registry database
	const db = new Database('registry.db');

	// Create table if it doesn't exist
	db.exec(`
		CREATE TABLE IF NOT EXISTS rss_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			feed_type TEXT NOT NULL,
			package_name TEXT NOT NULL,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);

	db.prepare(
		`
    INSERT INTO rss_items (feed_type, package_name, title, content, timestamp)
    VALUES (?, ?, ?, ?, datetime('now'))
  `,
	).run(
		'benchmark',
		packageName,
		`Benchmark: ${packageName}${benchmarkResult.version ? ` v${benchmarkResult.version}` : ''}`,
		JSON.stringify({
			avgDuration: benchmarkResult.avgDuration,
			stdDev: benchmarkResult.stdDev,
			repeats: benchmarkResult.repeats,
			passed: benchmarkResult.passed,
			failed: benchmarkResult.failed,
			minDuration: benchmarkResult.minDuration,
			maxDuration: benchmarkResult.maxDuration,
			properties: benchmarkResult.properties,
		}),
	);

	console.log(`💾 Benchmark results saved to registry database`);

	// Notify Telegram topic
	const topicInfo = getTopicInfo(packageName as PackageName);
	if (topicInfo) {
		const successRate = ((benchmarkResult.passed / benchmarkResult.repeats) * 100).toFixed(1);
		const statusEmoji = benchmarkResult.failed === 0 ? '✅' : '⚠️';

		const message =
			`${statusEmoji} **Benchmark Results: ${packageName}**\n\n` +
			`📋 **Config:** ${benchmarkResult.repeats} repeats\n` +
			`✅ **Passed:** ${benchmarkResult.passed}/${benchmarkResult.repeats} (${successRate}%)\n` +
			`⏱️ **Avg Time:** ${benchmarkResult.avgDuration.toFixed(2)}ms\n` +
			`📈 **Std Dev:** ${benchmarkResult.stdDev.toFixed(2)}ms\n` +
			`⏱️ **Min/Max:** ${benchmarkResult.minDuration.toFixed(2)}ms / ${benchmarkResult.maxDuration.toFixed(2)}ms\n\n` +
			`[View Details](https://registry.internal.yourcompany.com/benchmarks/${encodeURIComponent(packageName)})`;

		try {
			await notifyTopic(topicInfo.topicId, message, { silent: true });
			console.log(`📱 Notification sent to topic: ${topicInfo.name}`);
		} catch (error) {
			console.error(`❌ Failed to send notification: ${error}`);
		}
	} else {
		console.warn(`⚠️  No topic found for package: ${packageName}, skipping notification`);
	}

	// Update RSS feed cache (if internal API is available)
	const refreshResult = await refreshRSSCache({ package: packageName });
	if (refreshResult.success) {
		console.log(`🔄 RSS feed cache refreshed via ${refreshResult.endpoint}`);
	} else if (refreshResult.error) {
		console.warn(`⚠️  RSS cache refresh failed: ${refreshResult.error}`);
	}
}

// CLI entry point
if (import.meta.main) {
	const [packageName, ...args] = Bun.argv.slice(2);

	if (!packageName) {
		console.error('Usage: bun run scripts/benchmark-publisher.ts <package-name> [json-result]');
		console.error('');
		console.error('Example:');
		console.error('  bun run scripts/benchmark-publisher.ts @graph/layer4 < benchmark-result.json');
		process.exit(1);
	}

	try {
		// Read benchmark result from stdin or args
		let benchmarkResult: BenchmarkResult;

		if (args.length > 0) {
			benchmarkResult = JSON.parse(args.join(' '));
		} else {
			const stdin = await Bun.stdin.text();
			benchmarkResult = JSON.parse(stdin);
		}

		await publishBenchmarkToRSS(packageName, benchmarkResult);
		console.log(`✅ Benchmark results published for ${packageName}`);
	} catch (error) {
		console.error(`❌ Error publishing benchmark: ${error}`);
		process.exit(1);
	}
}
