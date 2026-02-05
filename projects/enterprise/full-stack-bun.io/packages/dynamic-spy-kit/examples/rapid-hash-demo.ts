/**
 * @dynamic-spy/kit v9.0 - Rapid Hash Demo
 * 
 * One-line summary:
 * 
 * ```ts
 * import { hash } from "bun";
 * 
 * const h = hash.rapidhash("key"); // 9166712279701818032n — 2× faster than city/metro, 64-bit non-crypto
 * ```
 * 
 * Use `h` as a **high-speed key** for hash maps, bloom filters, or checksums inside your hot loop; no external dep required.
 */

import { hash } from "bun";
import {
	rapidHash,
	rapidHashString,
	rapidHashNumber,
	RapidHashMap,
	RapidBloomFilter,
	rapidChecksum,
} from "../src/utils/rapid-hash";

function demoBasicUsage() {
	console.log("=".repeat(60));
	console.log("1. Basic Rapid Hash Usage");
	console.log("=".repeat(60));

	const h = hash.rapidhash("key");
	console.log(`hash.rapidhash("key"): ${h}`);
	console.log(`Type: ${typeof h} (${h.constructor.name})`);
	console.log(`Value: ${h.toString()}n`);
}

function demoHashMap() {
	console.log("\n" + "=".repeat(60));
	console.log("2. Rapid Hash Map");
	console.log("=".repeat(60));

	const map = new RapidHashMap<string>();

	// Use rapid hash for fast lookups
	map.set("feed-1", "AI_FEED_2");
	map.set("feed-2", "AI_FEED_3");
	map.set("feed-3", "AI_FEED_4");

	console.log(`Map size: ${map.size}`);
	console.log(`feed-1 → ${map.get("feed-1")}`);
	console.log(`feed-2 → ${map.get("feed-2")}`);
	console.log(`Has feed-3: ${map.has("feed-3")}`);
}

function demoBloomFilter() {
	console.log("\n" + "=".repeat(60));
	console.log("3. Rapid Bloom Filter");
	console.log("=".repeat(60));

	const bloom = new RapidBloomFilter(1000, 3);

	// Add items
	const items = ["feed-1", "feed-2", "feed-3", "feed-4", "feed-5"];
	items.forEach(item => bloom.add(item));

	console.log(`Bloom filter size: ${bloom.size}`);
	console.log(`Might contain feed-1: ${bloom.mightContain("feed-1")}`);
	console.log(`Might contain feed-6: ${bloom.mightContain("feed-6")}`);
	console.log(`Might contain feed-3: ${bloom.mightContain("feed-3")}`);
}

function demoChecksum() {
	console.log("\n" + "=".repeat(60));
	console.log("4. Rapid Checksum");
	console.log("=".repeat(60));

	const data1 = "feed-data-12345";
	const data2 = "feed-data-12345";
	const data3 = "feed-data-67890";

	const checksum1 = rapidChecksum(data1);
	const checksum2 = rapidChecksum(data2);
	const checksum3 = rapidChecksum(data3);

	console.log(`Checksum 1: ${checksum1.toString()}n`);
	console.log(`Checksum 2: ${checksum2.toString()}n`);
	console.log(`Checksum 3: ${checksum3.toString()}n`);
	console.log(`Data 1 === Data 2: ${checksumEqual(checksum1, checksum2)}`);
	console.log(`Data 1 === Data 3: ${checksumEqual(checksum1, checksum3)}`);
}

function demoPerformance() {
	console.log("\n" + "=".repeat(60));
	console.log("5. Performance Benchmark");
	console.log("=".repeat(60));

	const iterations = 1_000_000;
	const key = "feed-key-12345";

	// Rapid hash benchmark
	const start1 = performance.now();
	for (let i = 0; i < iterations; i++) {
		hash.rapidhash(`${key}-${i}`);
	}
	const rapidTime = performance.now() - start1;

	console.log(`Rapid hash (${iterations.toLocaleString()} iterations): ${rapidTime.toFixed(2)}ms`);
	console.log(`Throughput: ${((iterations / rapidTime) * 1000).toFixed(0)} hashes/sec`);
}

function demoFeedRegistryUsage() {
	console.log("\n" + "=".repeat(60));
	console.log("6. Feed Registry Integration");
	console.log("=".repeat(60));

	const map = new RapidHashMap<{ id: string; priority: number }>();

	// Simulate feed registry lookups
	const feeds = [
		{ id: "AI_FEED_2", priority: 1250 },
		{ id: "AI_FEED_3", priority: 1220 },
		{ id: "AI_FEED_4", priority: 1200 },
	];

	feeds.forEach(feed => {
		const hashKey = rapidHashString(feed.id);
		map.set(feed.id, feed);
		console.log(`${feed.id} → hash: ${hashKey.substring(0, 16)}...`);
	});

	// Fast lookup
	const feed = map.get("AI_FEED_2");
	if (feed) {
		console.log(`Found: ${feed.id} (priority: ${feed.priority})`);
	}
}

async function main() {
	console.log("\n⚡ Rapid Hash Demo - Bun.hash.rapidhash()\n");

	demoBasicUsage();
	demoHashMap();
	demoBloomFilter();
	demoChecksum();
	demoPerformance();
	demoFeedRegistryUsage();

	console.log("\n" + "=".repeat(60));
	console.log("✅ Demo Complete!");
	console.log("=".repeat(60) + "\n");
}

if (import.meta.main) {
	main().catch(console.error);
}

