#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 RSS/XML Feed Validation & Monitoring

console.info("🔍 Tier-1380 Feed Validation Suite\n");

// ─── Feed Validation Functions ───────────────────────
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

		// Parse XML
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "application/xml");

		// Check for parser errors
		const parseError = doc.querySelector("parsererror");
		if (parseError) {
			const errorMsg = parseError.textContent?.trim() || "Unknown parse error";
			console.info(`   ❌ Parse Error: ${errorMsg}`);
			return { valid: false, error: errorMsg, contentType, size: text.length };
		}

		// Check for RSS/Atom elements
		const rssElement = doc.querySelector("rss");
		const feedElement = doc.querySelector("feed");
		const isRSS = !!rssElement;
		const isAtom = !!feedElement;

		if (!isRSS && !isAtom) {
			console.info(`   ⚠️  Not RSS/Atom feed`);
			return {
				valid: false,
				error: "Not RSS/Atom feed",
				contentType,
				size: text.length,
			};
		}

		// Extract feed info
		const title = doc.querySelector("title")?.textContent?.trim() || "No title";
		const items =
			doc.querySelectorAll("item").length + doc.querySelectorAll("entry").length;
		const version = rssElement?.getAttribute("version") || (isAtom ? "Atom" : "Unknown");

		console.info(`   ✅ Valid ${isRSS ? "RSS" : "Atom"} ${version}`);
		console.info(`   📰 Title: ${title}`);
		console.info(`   📄 Items: ${items}`);

		return {
			valid: true,
			type: isRSS ? "RSS" : "Atom",
			version,
			title,
			items,
			contentType,
			size: text.length,
		};
	} catch (error) {
		console.info(`   ❌ Error: ${error.message}`);
		return { valid: false, error: error.message };
	}
}

// ─── Quick Health Checks (One-Liner Style) ───────────
async function quickHealthChecks() {
	console.info("⚡ Quick Health Checks (One-Liner Style):\n");

	// 1. Basic XML validity
	console.info("1. XML Validity Check:");
	try {
		const xmlCheck = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((t) => {
				try {
					new DOMParser().parseFromString(t, "application/xml");
					return "Valid RSS";
				} catch (e) {
					return `Invalid XML: ${e.message}`;
				}
			});
		console.info(`   Result: ${xmlCheck}`);
	} catch (e) {
		console.info(`   Error: ${e.message}`);
	}

	// 2. Parser error detection
	console.info("\n2. Parser Error Detection:");
	try {
		const errorCheck = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((t) => {
				const d = new DOMParser().parseFromString(t, "application/xml");
				const err = d.querySelector("parsererror");
				return err ? `Parse error: ${err.textContent?.trim() || "Unknown"}` : "Feed OK";
			});
		console.info(`   Result: ${errorCheck}`);
	} catch (e) {
		console.info(`   Error: ${e.message}`);
	}

	// 3. Content-Type header check
	console.info("\n3. Content-Type Header:");
	try {
		const contentType = await fetch("https://bun.com/rss.xml").then(
			(r) => r.headers.get("content-type") ?? "missing",
		);
		console.info(`   Result: ${contentType}`);
	} catch (e) {
		console.info(`   Error: ${e.message}`);
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
				.then((t) => new DOMParser().parseFromString(t, "application/xml"));

			const duration = Date.now() - start;
			times.push(duration);
			console.info(`   Iteration ${i + 1}: ${duration}ms`);
		} catch (e) {
			console.info(`   Iteration ${i + 1}: Error - ${e.message}`);
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
	console.info("🎯 Tier-1380 RSS/XML Feed Validation & Monitoring\n");

	// Quick one-liner style health checks
	await quickHealthChecks();

	// Comprehensive feed validation
	console.info("\n" + "=".repeat(60));
	await monitorFeeds();

	// Performance analysis
	console.info("\n" + "=".repeat(60));
	await analyzePerformance();

	console.info("\n💡 One-Liner Examples:");
	console.info(
		'   1. XML validity: bun -e \'await fetch("url").then(r=>r.text()).then(t=>{try{new DOMParser().parseFromString(t,"application/xml");console.info("Valid")}catch(e){console.info("Invalid:",e.message)}})\'',
	);
	console.info(
		'   2. Error detection: bun -e \'await fetch("url").then(r=>r.text()).then(t=>{const d=new DOMParser().parseFromString(t,"application/xml");console.info(d.querySelector("parsererror")?"Error":"OK")}\'',
	);
	console.info(
		'   3. Content-Type: bun -e \'await fetch("url").then(r=>console.info(r.headers.get("content-type")))\'',
	);
}

main().catch(console.error);
