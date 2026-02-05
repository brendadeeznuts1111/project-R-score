#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 RSS Cache & Performance Analytics

console.log("🚀 Tier-1380 RSS Cache & Performance Analytics\n");

// ─── Cache Management ─────────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function checkETag(url, savedETag = null) {
	console.log("🏷️  ETag Cache Validation:");

	/** @type {any} */
	const headers = {};
	if (savedETag) {
		headers["If-None-Match"] = savedETag;
	}

	const startTime = Date.now();

	try {
		const response = await fetch(url, { headers });
		const fetchTime = Date.now() - startTime;
		const currentETag = response.headers.get("etag");
		const status = response.status;

		const isCached = status === 304;
		console.log(
			`   Status: ${isCached ? "✅ Not modified – use cache" : "🔄 Fresh fetch"}`,
		);
		console.log(`   HTTP Status: ${status}`);
		console.log(`   ETag: ${currentETag || "None"}`);
		console.log(`   Fetch Time: ${fetchTime}ms`);

		if (savedETag) {
			console.log(`   Saved ETag: ${savedETag}`);
			console.log(`   Cache Hit: ${isCached ? "✅ Yes" : "❌ No"}`);
		}

		return {
			status,
			etag: currentETag,
			isCached,
			fetchTime,
			content: isCached ? null : await response.text(),
		};
	} catch (error) {
		const errorMsg =
			error && typeof error === "object" && "message" in error
				? error.message
				: String(error);
		console.log(`   ❌ Error: ${errorMsg}`);
		return { error: errorMsg };
	}
}

// ─── Performance Benchmarking ───────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function benchmarkFetchAndParse(url, iterations = 3) {
	console.log("⚡ Fetch & Parse Benchmark:");

	const times = [];
	const results = [];

	for (let i = 0; i < iterations; i++) {
		console.log(`   Iteration ${i + 1}:`);

		const startTime = Date.now();

		try {
			const response = await fetch(url);
			const text = await response.text();

			// Bun-compatible parsing (regex-based)
			const parseStartTime = Date.now();
			const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];
			const parseTime = Date.now() - parseStartTime;

			const totalTime = Date.now() - startTime;

			times.push(totalTime);
			results.push({
				iteration: i + 1,
				fetchTime: totalTime - parseTime,
				parseTime,
				totalTime,
				itemCount: itemMatches.length,
				contentSize: text.length,
			});

			console.log(
				`     Fetch+Parse: ${totalTime}ms (Fetch: ${totalTime - parseTime}ms, Parse: ${parseTime}ms)`,
			);
			console.log(
				`     Items: ${itemMatches.length}, Size: ${(text.length / 1024).toFixed(1)}KB`,
			);
		} catch (error) {
			const errorMsg =
				error && typeof error === "object" && "message" in error
					? error.message
					: String(error);
			console.log(`     ❌ Error: ${errorMsg}`);
		}
	}

	if (times.length > 0) {
		const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
		const min = Math.min(...times);
		const max = Math.max(...times);

		console.log(`\n📊 Benchmark Summary:`);
		console.log(`   Average: ${avg.toFixed(2)}ms`);
		console.log(`   Min: ${min}ms`);
		console.log(`   Max: ${max}ms`);
		console.log(`   Success Rate: ${((times.length / iterations) * 100).toFixed(1)}%`);
	}

	return results;
}

// ─── Content Size Audit ───────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function auditFeedSize(url) {
	console.log("📏 Feed Size Audit:");

	try {
		const response = await fetch(url);
		const text = await response.text();

		// Extract items and descriptions using regex
		const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];
		let totalDescLength = 0;
		let totalTitleLength = 0;
		/** @type {any[]} */
		const itemDetails = [];

		itemMatches.forEach((itemText, index) => {
			const descMatch = itemText.match(/<description[^>]*>([^<]+)<\/description>/i);
			const titleMatch = itemText.match(/<title[^>]*>([^<]+)<\/title>/i);

			const descLength = descMatch ? descMatch[1].length : 0;
			const titleLength = titleMatch ? titleMatch[1].length : 0;

			totalDescLength += descLength;
			totalTitleLength += titleLength;

			if (index < 5) {
				// Store first 5 for detailed analysis
				itemDetails.push({
					index: index + 1,
					titleLength,
					descLength,
					totalLength: titleLength + descLength,
				});
			}
		});

		const itemCount = itemMatches.length;
		const avgDescLength = itemCount > 0 ? totalDescLength / itemCount : 0;
		const avgTitleLength = itemCount > 0 ? totalTitleLength / itemCount : 0;
		const totalChars = totalDescLength + totalTitleLength;

		console.log(`   Items: ${itemCount}`);
		console.log(`   Total description chars: ${totalDescLength.toLocaleString()}`);
		console.log(`   Total title chars: ${totalTitleLength.toLocaleString()}`);
		console.log(`   Total content chars: ${totalChars.toLocaleString()}`);
		console.log(`   Avg description length: ${Math.round(avgDescLength)} chars`);
		console.log(`   Avg title length: ${Math.round(avgTitleLength)} chars`);
		console.log(`   Feed size: ${(text.length / 1024).toFixed(1)}KB`);

		// Show largest items
		if (itemDetails.length > 0) {
			console.log(`\n📊 Top 5 Items by Size:`);
			itemDetails
				.sort((a, b) => b.totalLength - a.totalLength)
				.forEach((item) => {
					console.log(
						`   Item ${item.index}: ${item.totalLength} chars (Title: ${item.titleLength}, Desc: ${item.descLength})`,
					);
				});
		}

		return {
			itemCount,
			totalDescLength,
			totalTitleLength,
			totalChars,
			avgDescLength: Math.round(avgDescLength),
			avgTitleLength: Math.round(avgTitleLength),
			feedSizeKB: text.length / 1024,
		};
	} catch (error) {
		const errorMsg =
			error && typeof error === "object" && "message" in error
				? error.message
				: String(error);
		console.log(`   ❌ Error: ${errorMsg}`);
		return { error: errorMsg };
	}
}

// ─── One-Liner Demonstrations (Bun Compatible) ───────
async function demonstrateOneLiners() {
	console.log("⚡ Bun-Compatible One-Liner Demonstrations:\n");

	// 12. Simple ETag check
	console.log("12. ETag Cache Validation:");
	try {
		const etagResult = await fetch("https://bun.com/rss.xml").then((r) => ({
			status: r.status,
			etag: r.headers.get("etag"),
		}));

		const isCached = etagResult.status === 304;
		console.log(`   ${isCached ? "✅ Not modified – use cache" : "🔄 Fresh fetch"}`);
		console.log(`   ETag: ${etagResult.etag || "None"}`);
	} catch (e) {
		console.log(`   Error: ${e}`);
	}

	// 13. Performance benchmark (simplified)
	console.log("\n13. Performance Benchmark:");
	try {
		const start = Date.now();
		await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((text) => {
				const items = (text.match(/<item/g) || []).length;
				const duration = Date.now() - start;
				console.log(`   Fetch+parse: ${duration.toFixed(2)}ms (${items} items)`);
			});
	} catch (e) {
		console.log(`   Error: ${e}`);
	}

	// 14. Content size audit
	console.log("\n14. Content Size Audit:");
	try {
		await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((text) => {
				const descMatches =
					text.match(/<description[^>]*>([^<]+)<\/description>/gi) || [];
				let totalDescLength = 0;
				descMatches.forEach((desc) => {
					const content = desc.match(/<description[^>]*>([^<]+)<\/description>/i);
					if (content) totalDescLength += content[1].length;
				});

				const itemCount = (text.match(/<item/g) || []).length;
				const avgLength = itemCount > 0 ? totalDescLength / itemCount : 0;

				console.log(`   Items: ${itemCount}`);
				console.log(`   Total desc chars: ${totalDescLength}`);
				console.log(`   Avg: ${Math.round(avgLength)}`);
			});
	} catch (e) {
		console.log(`   Error: ${e}`);
	}
}

// ─── Cache Simulation ─────────────────────────────────
async function simulateCacheWorkflow() {
	console.log("\n🔄 Cache Workflow Simulation:");

	const url = "https://bun.com/rss.xml";

	// First fetch - should get fresh content
	console.log("1. Initial fetch (cache miss expected):");
	const firstResult = await checkETag(url);

	if (firstResult.etag) {
		console.log("\n2. Second fetch with ETag (cache hit expected):");
		// @ts-expect-error - Type mismatch for runtime compatibility
		const secondResult = await checkETag(url, firstResult.etag);

		console.log("\n3. Cache Analysis:");
		const timeSaved = firstResult.fetchTime - (secondResult.fetchTime || 0);
		console.log(`   Time saved: ${Math.max(0, timeSaved)}ms`);
		console.log(
			`   Bandwidth saved: ${secondResult.isCached ? `${(firstResult.content?.length || 0) / 1024}KB` : "0KB"}`,
		);
		console.log(
			`   Cache efficiency: ${secondResult.isCached ? "✅ Optimal" : "⚠️  No caching benefit"}`,
		);
	}
}

// ─── Main Execution ─────────────────────────────────
async function main() {
	console.log("🎯 Tier-1380 RSS Cache & Performance Analytics\n");

	const rssUrl = "https://bun.com/rss.xml";

	// One-liner demonstrations
	await demonstrateOneLiners();

	console.log("\n" + "=".repeat(60));

	// Comprehensive ETag check
	await checkETag(rssUrl);

	console.log("\n" + "─".repeat(40));

	// Performance benchmark
	await benchmarkFetchAndParse(rssUrl, 3);

	console.log("\n" + "─".repeat(40));

	// Content size audit
	await auditFeedSize(rssUrl);

	console.log("\n" + "=".repeat(60));

	// Cache workflow simulation
	await simulateCacheWorkflow();

	console.log("\n💡 Bun-Compatible One-Liner Examples:");
	console.log(
		'   12. ETag check: bun -e \'fetch("url").then(r=>console.log(r.status===304?"Not modified":"Fresh fetch",r.headers.get("etag")))\'',
	);
	console.log(
		'   13. Benchmark: bun -e \'const s=Date.now();fetch("url").then(r=>r.text()).then(t=>console.log("Time:",Date.now()-s,"ms"))\'',
	);
	console.log(
		"   14. Size audit: bun -e 'fetch(\"url\").then(r=>r.text()).then(t=>{const items=(t.match(/<item/g)||[]).length;const descs=(t.match(/<description[^>]*>([^<]+)<\\/description>/gi)||[]).reduce((sum,d)=>sum+d.match(/<description[^>]*>([^<]+)<\\/description>/i)[1].length,0);console.log(`Items:${items},Desc chars:${descs},Avg:${Math.round(descs/items)}`)})'",
	);
}

main().catch(console.error);
