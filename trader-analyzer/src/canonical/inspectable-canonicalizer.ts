/**
 * @fileoverview Inspectable Market Canonicalizer
 * @description Enhanced MarketCanonicalizer with Bun inspection and debugging capabilities
 * @module canonical/inspectable-canonicalizer
 */

import { inspect, nanoseconds } from "bun";
import {
	type CanonicalMarketWithMetadata,
	MarketCanonicalizer,
	type MarketIdentifier,
} from "./market-canonicalizer";

export class InspectableMarketCanonicalizer extends MarketCanonicalizer {
	// Add custom inspection method
	[inspect.custom](depth: number, options: any): string {
		const cacheStats = this.getCacheStats();

		const summary = {
			type: "MarketCanonicalizer",
			exchangeNamespaces: this.exchangeNamespaces.size,
			memoryCache: {
				entries: this.cache.size,
				promiseCache: this.promiseCache.size,
				hitRatio: cacheStats.hitRatio
					? `${(cacheStats.hitRatio * 100).toFixed(1)}%`
					: "N/A",
			},
			performance: {
				canonicalizations: cacheStats.size || 0,
				promiseResolutions: cacheStats.promiseSize || 0,
			},
			namespaces: Array.from(this.exchangeNamespaces.keys()),
		};

		// Create a detailed table of namespace info
		const namespaceTable = Array.from(this.exchangeNamespaces.entries()).map(
			([exchange, bytes]) => ({
				Exchange: exchange,
				"Namespace UUID": bytesToHex(bytes).substring(0, 8) + "...",
				"Byte Length": bytes.length,
			}),
		);

		const summaryStr = inspect(summary, {
			...options,
			depth: depth - 1,
			colors: true,
			compact: false,
		});

		// Use inspect for table-like display (Bun doesn't have inspect.table)
		const tableStr =
			namespaceTable.length > 0
				? namespaceTable
						.map(
							(row) =>
								`  ${row.Exchange.padEnd(20)} ${row["Namespace UUID"].padEnd(12)} ${row["Byte Length"]}`,
						)
						.join("\n")
				: "  (no namespaces)";

		return `${summaryStr}\n\nNamespace Table:\n  Exchange            Namespace    Byte Length\n${tableStr}`;
	}

	// Enhanced canonicalize with timing
	canonicalizeWithInspection(
		market: MarketIdentifier,
	): CanonicalMarketWithMetadata {
		const start = nanoseconds();
		const result = super.canonicalize(market);
		const end = nanoseconds();

		console.log(`📊 Canonicalization: ${(end - start) / 1_000_000}ms`);
		console.log(`   UUID: ${result.uuid}`);
		console.log(`   Tags: ${(result.tags ?? []).join(", ")}`);
		console.log(`   Cache Key: ${result.apiMetadata.cacheKey}`);

		return result;
	}

	// Batch canonicalize with progress
	batchCanonicalizeWithInspection(
		markets: MarketIdentifier[],
	): Map<string, CanonicalMarketWithMetadata> {
		console.log(`🔄 Batch canonicalizing ${markets.length} markets...`);

		const start = nanoseconds();
		const result = super.batchCanonicalize(markets);
		const end = nanoseconds();

		const durationMs = (end - start) / 1_000_000;
		const perItemMs = durationMs / markets.length;

		console.log(
			`✅ Batch complete: ${durationMs.toFixed(2)}ms total, ${perItemMs.toFixed(2)}ms per item`,
		);

		// Create summary table
		const summary = Array.from(result.entries())
			.slice(0, 5)
			.map(([uuid, market]) => ({
				UUID: uuid.substring(0, 8) + "...",
				Exchange: market.exchange,
				"Native ID":
					market.marketId.length > 20
						? market.marketId.substring(0, 17) + "..."
						: market.marketId,
				Tags: (market.tags ?? []).length,
			}));

		if (summary.length > 0) {
			console.log("\nSample Results:");
			const tableHeader = "  UUID      Exchange      Native ID          Tags";
			const tableRows = summary
				.map(
					(row) =>
						`  ${row.UUID.padEnd(10)} ${row.Exchange.padEnd(12)} ${row["Native ID"].padEnd(18)} ${row.Tags}`,
				)
				.join("\n");
			console.log(tableHeader);
			console.log(tableRows);
		}

		return result;
	}

	// Get detailed stats
	getDetailedStats(): string {
		const cacheStats = this.getCacheStats();

		// Count markets by exchange
		const exchangeBreakdown: Record<string, number> = {};
		for (const market of this.cache.values()) {
			exchangeBreakdown[market.exchange] =
				(exchangeBreakdown[market.exchange] || 0) + 1;
		}

		const stats = {
			"Memory Cache Size": this.cache.size,
			"Promise Cache Size": this.promiseCache.size,
			"Exchange Namespaces": this.exchangeNamespaces.size,
			"Cache Hit Ratio": cacheStats.hitRatio
				? `${(cacheStats.hitRatio * 100).toFixed(1)}%`
				: "N/A",
			"Total Canonicalizations": cacheStats.size || 0,
			"Exchange Breakdown": exchangeBreakdown,
		};

		return inspect(stats, { colors: true, depth: 2, compact: false });
	}
}

// Helper function
function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// Create inspectable singleton
let _inspectableCanonicalizer: InspectableMarketCanonicalizer | null = null;
export function getInspectableMarketCanonicalizer(): InspectableMarketCanonicalizer {
	if (!_inspectableCanonicalizer) {
		_inspectableCanonicalizer = new InspectableMarketCanonicalizer();
	}
	return _inspectableCanonicalizer;
}
