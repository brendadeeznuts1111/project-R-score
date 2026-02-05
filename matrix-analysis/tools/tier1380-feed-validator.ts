#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 RSS/XML Feed Validation & Monitoring

console.log("🔍 Tier-1380 Feed Validation Suite\n");

// ─── Feed Validation Functions ───────────────────────
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

		// Parse XML
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "application/xml");

		// Check for parser errors
		const parseError = doc.querySelector("parsererror");
		if (parseError) {
			const errorMsg = parseError.textContent?.trim() || "Unknown parse error";
			console.log(`   ❌ Parse Error: ${errorMsg}`);
			return { valid: false, error: errorMsg, contentType, size: text.length };
		}

		// Check for RSS/Atom elements
		const rssElement = doc.querySelector("rss");
		const feedElement = doc.querySelector("feed");
		const isRSS = !!rssElement;
		const isAtom = !!feedElement;

		if (!isRSS && !isAtom) {
			console.log(`   ⚠️  Not RSS/Atom feed`);
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

		console.log(`   ✅ Valid ${isRSS ? "RSS" : "Atom"} ${version}`);
		console.log(`   📰 Title: ${title}`);
		console.log(`   📄 Items: ${items}`);

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
		console.log(`   ❌ Error: ${error.message}`);
		return { valid: false, error: error.message };
	}
}

// ─── Quick Health Checks (One-Liner Style) ───────────
async function quickHealthChecks() {
	console.log("⚡ Quick Health Checks (One-Liner Style):\n");

	// 1. Basic XML validity
	console.log("1. XML Validity Check:");
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
		console.log(`   Result: ${xmlCheck}`);
	} catch (e) {
		console.log(`   Error: ${e.message}`);
	}

	// 2. Parser error detection
	console.log("\n2. Parser Error Detection:");
	try {
		const errorCheck = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((t) => {
				const d = new DOMParser().parseFromString(t, "application/xml");
				const err = d.querySelector("parsererror");
				return err ? `Parse error: ${err.textContent?.trim() || "Unknown"}` : "Feed OK";
			});
		console.log(`   Result: ${errorCheck}`);
	} catch (e) {
		console.log(`   Error: ${e.message}`);
	}

	// 3. Content-Type header check
	console.log("\n3. Content-Type Header:");
	try {
		const contentType = await fetch("https://bun.com/rss.xml").then(
			(r) => r.headers.get("content-type") ?? "missing",
		);
		console.log(`   Result: ${contentType}`);
	} catch (e) {
		console.log(`   Error: ${e.message}`);
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
				.then((t) => new DOMParser().parseFromString(t, "application/xml"));

			const duration = Date.now() - start;
			times.push(duration);
			console.log(`   Iteration ${i + 1}: ${duration}ms`);
		} catch (e) {
			console.log(`   Iteration ${i + 1}: Error - ${e.message}`);
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
	console.log("🎯 Tier-1380 RSS/XML Feed Validation & Monitoring\n");

	// Quick one-liner style health checks
	await quickHealthChecks();

	// Comprehensive feed validation
	console.log("\n" + "=".repeat(60));
	await monitorFeeds();

	// Performance analysis
	console.log("\n" + "=".repeat(60));
	await analyzePerformance();

	console.log("\n💡 One-Liner Examples:");
	console.log(
		'   1. XML validity: bun -e \'await fetch("url").then(r=>r.text()).then(t=>{try{new DOMParser().parseFromString(t,"application/xml");console.log("Valid")}catch(e){console.log("Invalid:",e.message)}})\'',
	);
	console.log(
		'   2. Error detection: bun -e \'await fetch("url").then(r=>r.text()).then(t=>{const d=new DOMParser().parseFromString(t,"application/xml");console.log(d.querySelector("parsererror")?"Error":"OK")}\'',
	);
	console.log(
		'   3. Content-Type: bun -e \'await fetch("url").then(r=>console.log(r.headers.get("content-type")))\'',
	);
}

main().catch(console.error);
