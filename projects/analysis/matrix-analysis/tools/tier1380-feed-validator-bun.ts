#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 RSS/XML Feed Validation (Bun Compatible)

console.info("🔍 Tier-1380 Feed Validation Suite (Bun Compatible)\n");

// ─── Bun-Compatible Feed Validation ───────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function validateFeedXML(url) {
	console.info(`📡 Validating: ${url}`);

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get("content-type") ?? "missing";
		console.info(`   Content-Type: ${contentType}`);

		const text = await response.text();
		console.info(`   Size: ${text.length} bytes`);

		// Basic XML structure validation (regex-based)
		const xmlPattern = /^\s*<\?xml[^>]*\?>/;
		const hasXMLDeclaration = xmlPattern.test(text);
		const hasRSS = text.includes("<rss");
		const hasAtom = text.includes("<feed");
		const hasItems = text.includes("<item") || text.includes("<entry");

		if (!hasRSS && !hasAtom) {
			console.info(`   ⚠️  Not RSS/Atom feed`);
			return {
				valid: false,
				error: "Not RSS/Atom feed",
				contentType,
				size: text.length,
			};
		}

		if (!hasItems) {
			console.info(`   ⚠️  No items found`);
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
			console.info(`   ⚠️  Possible XML structure issue`);
			return {
				valid: false,
				error: "XML structure issue",
				contentType,
				size: text.length,
			};
		}

		console.info(`   ✅ Valid ${hasRSS ? "RSS" : "Atom"} ${version}`);
		console.info(`   📰 Title: ${title}`);
		console.info(`   📄 Items: ${items}`);
		console.info(`   🏷️  XML Declaration: ${hasXMLDeclaration ? "Yes" : "No"}`);

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
		console.info(`   ❌ Error: ${errorMsg}`);
		return { valid: false, error: errorMsg };
	}
}

// ─── Quick Health Checks (Bun One-Liner Style) ───────
async function quickHealthChecks() {
	console.info("⚡ Quick Health Checks (Bun One-Liner Style):\n");

	// 1. Basic feed structure check
	console.info("1. Feed Structure Check:");
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
		console.info(`   Result: ${JSON.stringify(structureCheck, null, 6)}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.info(`   Error: ${errorMsg}`);
	}

	// 2. Content-Type validation
	console.info("\n2. Content-Type Validation:");
	try {
		const contentType = await fetch("https://bun.com/rss.xml").then(
			(r) => r.headers.get("content-type") ?? "missing",
		);
		const isValid = contentType.includes("xml") || contentType.includes("rss");
		console.info(`   Content-Type: ${contentType}`);
		console.info(`   Valid: ${isValid ? "✅" : "❌"}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.info(`   Error: ${errorMsg}`);
	}

	// 3. Feed size and basic metrics
	console.info("\n3. Feed Metrics:");
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
		console.info(`   Size: ${metrics.size} bytes`);
		console.info(`   Lines: ${metrics.lines}`);
		console.info(`   RSS format: ${metrics.hasRSS ? "Yes" : "No"}`);
		console.info(`   Items: ${metrics.hasItems}`);
		console.info(`   Has title: ${metrics.hasTitle ? "Yes" : "No"}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.info(`   Error: ${errorMsg}`);
	}
}

// ─── Batch Feed Monitoring ─────────────────────────
async function monitorFeeds() {
	console.info("\n📊 Batch Feed Monitoring:\n");

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
		console.info(""); // Add spacing between feeds
	}

	// Summary
	console.info("📈 Monitoring Summary:");
	const valid = results.filter((r) => r.valid).length;
	const invalid = results.filter((r) => !r.valid).length;
	const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
	const totalItems = results.reduce((sum, r) => sum + (r.items || 0), 0);

	console.info(`   Total feeds: ${results.length}`);
	console.info(`   Valid: ${valid} ✅`);
	console.info(`   Invalid: ${invalid} ❌`);
	console.info(`   Total size: ${(totalSize / 1024).toFixed(1)}KB`);
	console.info(`   Total items: ${totalItems}`);

	// Show successful feeds
	const successful = results.filter((r) => r.valid);
	if (successful.length > 0) {
		console.info("\n✅ Valid Feeds:");
		successful.forEach((f) => {
			console.info(`   ${f.url}: ${f.type} ${f.version} (${f.items} items)`);
		});
	}

	// Show failed feeds
	const failed = results.filter((r) => !r.valid);
	if (failed.length > 0) {
		console.info("\n❌ Failed Feeds:");
		failed.forEach((f) => {
			console.info(`   ${f.url}: ${f.error}`);
		});
	}

	return results;
}

// ─── Feed Performance Analysis ─────────────────────
async function analyzePerformance() {
	console.info("\n⚡ Performance Analysis:\n");

	const url = "https://bun.com/rss.xml";
	const iterations = 3;
	const times = [];

	console.info(`Testing ${url} (${iterations} iterations)...`);

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
			console.info(`   Iteration ${i + 1}: ${duration}ms`);
		} catch (e) {
			const errorMsg =
				e && typeof e === "object" && "message" in e ? e.message : String(e);
			console.info(`   Iteration ${i + 1}: Error - ${errorMsg}`);
		}
	}

	if (times.length > 0) {
		const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
		const min = Math.min(...times);
		const max = Math.max(...times);

		console.info(`\n📊 Performance Stats:`);
		console.info(`   Average: ${avg.toFixed(1)}ms`);
		console.info(`   Min: ${min}ms`);
		console.info(`   Max: ${max}ms`);
		console.info(`   Success rate: ${((times.length / iterations) * 100).toFixed(1)}%`);
	}
}

// ─── Main Execution ─────────────────────────────────
async function main() {
	console.info("🎯 Tier-1380 RSS/XML Feed Validation (Bun Compatible)\n");

	// Quick one-liner style health checks
	await quickHealthChecks();

	// Comprehensive feed validation
	console.info("\n" + "=".repeat(60));
	await monitorFeeds();

	// Performance analysis
	console.info("\n" + "=".repeat(60));
	await analyzePerformance();

	console.info("\n💡 Bun One-Liner Examples:");
	console.info(
		'   1. Feed structure: bun -e \'fetch("url").then(r=>({ct:r.headers.get("content-type"),t:r.text()})).then(async ({ct,t})=>({ct,size:(await t).length,hasRSS:(await t).includes("<rss")})).then(console.log)\'',
	);
	console.info(
		'   2. Content-Type: bun -e \'fetch("url").then(r=>console.info(r.headers.get("content-type")))\'',
	);
	console.info(
		"   3. Basic metrics: bun -e 'fetch(\"url\").then(r=>r.text()).then(t=>console.info({size:t.length,items:(t.match(/<item/g)||[]).length}))'",
	);
}

main().catch(console.error);
