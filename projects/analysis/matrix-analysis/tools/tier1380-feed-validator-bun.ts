#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 RSS/XML Feed Validation (Bun Compatible)

console.log("🔍 Tier-1380 Feed Validation Suite (Bun Compatible)\n");

// ─── Bun-Compatible Feed Validation ───────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function validateFeedXML(url) {
	console.log(`📡 Validating: ${url}`);

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get("content-type") ?? "missing";
		console.log(`   Content-Type: ${contentType}`);

		const text = await response.text();
		console.log(`   Size: ${text.length} bytes`);

		// Basic XML structure validation (regex-based)
		const xmlPattern = /^\s*<\?xml[^>]*\?>/;
		const hasXMLDeclaration = xmlPattern.test(text);
		const hasRSS = text.includes("<rss");
		const hasAtom = text.includes("<feed");
		const hasItems = text.includes("<item") || text.includes("<entry");

		if (!hasRSS && !hasAtom) {
			console.log(`   ⚠️  Not RSS/Atom feed`);
			return {
				valid: false,
				error: "Not RSS/Atom feed",
				contentType,
				size: text.length,
			};
		}

		if (!hasItems) {
			console.log(`   ⚠️  No items found`);
			return { valid: false, error: "No items in feed", contentType, size: text.length };
		}

		// Extract feed info using regex
		const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
		const title = titleMatch ? titleMatch[1].trim() : "No title";

		// Count items
		const itemMatches = text.match(/<item[^>]*>/g) || [];
		const entryMatches = text.match(/<entry[^>]*>/g) || [];
		const items = itemMatches.length + entryMatches.length;

		// Extract RSS version
		const rssVersionMatch = text.match(/<rss[^>]*version="([^"]+)"/i);
		const version = rssVersionMatch ? rssVersionMatch[1] : hasAtom ? "Atom" : "Unknown";

		// Basic XML well-formedness check
		const openTags = (text.match(/<[^/][^>]*>/g) || []).length;
		const closeTags = (text.match(/<\/[^>]+>/g) || []).length;
		const wellFormed = Math.abs(openTags - closeTags) <= 1; // Allow for self-closing tags

		if (!wellFormed) {
			console.log(`   ⚠️  Possible XML structure issue`);
			return {
				valid: false,
				error: "XML structure issue",
				contentType,
				size: text.length,
			};
		}

		console.log(`   ✅ Valid ${hasRSS ? "RSS" : "Atom"} ${version}`);
		console.log(`   📰 Title: ${title}`);
		console.log(`   📄 Items: ${items}`);
		console.log(`   🏷️  XML Declaration: ${hasXMLDeclaration ? "Yes" : "No"}`);

		return {
			valid: true,
			type: hasRSS ? "RSS" : "Atom",
			version,
			title,
			items,
			contentType,
			size: text.length,
			hasXMLDeclaration,
			wellFormed,
		};
	} catch (error) {
		const errorMsg =
			error && typeof error === "object" && "message" in error
				? error.message
				: String(error);
		console.log(`   ❌ Error: ${errorMsg}`);
		return { valid: false, error: errorMsg };
	}
}

// ─── Quick Health Checks (Bun One-Liner Style) ───────
async function quickHealthChecks() {
	console.log("⚡ Quick Health Checks (Bun One-Liner Style):\n");

	// 1. Basic feed structure check
	console.log("1. Feed Structure Check:");
	try {
		const structureCheck = await fetch("https://bun.com/rss.xml")
			.then((r) => ({
				contentType: r.headers.get("content-type") ?? "missing",
				text: r.text(),
			}))
			.then(async ({ contentType, text }) => {
				const content = await text;
				return {
					contentType,
					size: content.length,
					hasRSS: content.includes("<rss"),
					hasItems: content.includes("<item"),
					hasXML: content.includes("<?xml"),
				};
			});
		console.log(`   Result: ${JSON.stringify(structureCheck, null, 6)}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.log(`   Error: ${errorMsg}`);
	}

	// 2. Content-Type validation
	console.log("\n2. Content-Type Validation:");
	try {
		const contentType = await fetch("https://bun.com/rss.xml").then(
			(r) => r.headers.get("content-type") ?? "missing",
		);
		const isValid = contentType.includes("xml") || contentType.includes("rss");
		console.log(`   Content-Type: ${contentType}`);
		console.log(`   Valid: ${isValid ? "✅" : "❌"}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.log(`   Error: ${errorMsg}`);
	}

	// 3. Feed size and basic metrics
	console.log("\n3. Feed Metrics:");
	try {
		const metrics = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((text) => ({
				size: text.length,
				lines: text.split("\n").length,
				hasRSS: text.includes("<rss"),
				hasItems: (text.match(/<item/g) || []).length,
				hasTitle: text.includes("<title"),
			}));
		console.log(`   Size: ${metrics.size} bytes`);
		console.log(`   Lines: ${metrics.lines}`);
		console.log(`   RSS format: ${metrics.hasRSS ? "Yes" : "No"}`);
		console.log(`   Items: ${metrics.hasItems}`);
		console.log(`   Has title: ${metrics.hasTitle ? "Yes" : "No"}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.log(`   Error: ${errorMsg}`);
	}
}

// ─── Batch Feed Monitoring ─────────────────────────
async function monitorFeeds() {
	console.log("\n📊 Batch Feed Monitoring:\n");

	const feeds = [
		"https://bun.com/rss.xml",
		"https://feeds.bbci.co.uk/news/rss.xml",
		"https://rss.cnn.com/rss/edition.rss",
		"https://feeds.feedburner.com/TechCrunch",
	];

	const results = [];

	for (const feed of feeds) {
		const result = await validateFeedXML(feed);
		results.push({ url: feed, ...result });
		console.log(""); // Add spacing between feeds
	}

	// Summary
	console.log("📈 Monitoring Summary:");
	const valid = results.filter((r) => r.valid).length;
	const invalid = results.filter((r) => !r.valid).length;
	const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
	const totalItems = results.reduce((sum, r) => sum + (r.items || 0), 0);

	console.log(`   Total feeds: ${results.length}`);
	console.log(`   Valid: ${valid} ✅`);
	console.log(`   Invalid: ${invalid} ❌`);
	console.log(`   Total size: ${(totalSize / 1024).toFixed(1)}KB`);
	console.log(`   Total items: ${totalItems}`);

	// Show successful feeds
	const successful = results.filter((r) => r.valid);
	if (successful.length > 0) {
		console.log("\n✅ Valid Feeds:");
		successful.forEach((f) => {
			console.log(`   ${f.url}: ${f.type} ${f.version} (${f.items} items)`);
		});
	}

	// Show failed feeds
	const failed = results.filter((r) => !r.valid);
	if (failed.length > 0) {
		console.log("\n❌ Failed Feeds:");
		failed.forEach((f) => {
			console.log(`   ${f.url}: ${f.error}`);
		});
	}

	return results;
}

// ─── Feed Performance Analysis ─────────────────────
async function analyzePerformance() {
	console.log("\n⚡ Performance Analysis:\n");

	const url = "https://bun.com/rss.xml";
	const iterations = 3;
	const times = [];

	console.log(`Testing ${url} (${iterations} iterations)...`);

	for (let i = 0; i < iterations; i++) {
		const start = Date.now();

		try {
			await fetch(url)
				.then((r) => r.text())
				.then((text) => {
					// Basic validation
					if (!text.includes("<rss") || !text.includes("<item")) {
						throw new Error("Invalid feed structure");
					}
				});

			const duration = Date.now() - start;
			times.push(duration);
			console.log(`   Iteration ${i + 1}: ${duration}ms`);
		} catch (e) {
			const errorMsg =
				e && typeof e === "object" && "message" in e ? e.message : String(e);
			console.log(`   Iteration ${i + 1}: Error - ${errorMsg}`);
		}
	}

	if (times.length > 0) {
		const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
		const min = Math.min(...times);
		const max = Math.max(...times);

		console.log(`\n📊 Performance Stats:`);
		console.log(`   Average: ${avg.toFixed(1)}ms`);
		console.log(`   Min: ${min}ms`);
		console.log(`   Max: ${max}ms`);
		console.log(`   Success rate: ${((times.length / iterations) * 100).toFixed(1)}%`);
	}
}

// ─── Main Execution ─────────────────────────────────
async function main() {
	console.log("🎯 Tier-1380 RSS/XML Feed Validation (Bun Compatible)\n");

	// Quick one-liner style health checks
	await quickHealthChecks();

	// Comprehensive feed validation
	console.log("\n" + "=".repeat(60));
	await monitorFeeds();

	// Performance analysis
	console.log("\n" + "=".repeat(60));
	await analyzePerformance();

	console.log("\n💡 Bun One-Liner Examples:");
	console.log(
		'   1. Feed structure: bun -e \'fetch("url").then(r=>({ct:r.headers.get("content-type"),t:r.text()})).then(async ({ct,t})=>({ct,size:(await t).length,hasRSS:(await t).includes("<rss")})).then(console.log)\'',
	);
	console.log(
		'   2. Content-Type: bun -e \'fetch("url").then(r=>console.log(r.headers.get("content-type")))\'',
	);
	console.log(
		"   3. Basic metrics: bun -e 'fetch(\"url\").then(r=>r.text()).then(t=>console.log({size:t.length,items:(t.match(/<item/g)||[]).length}))'",
	);
}

main().catch(console.error);
