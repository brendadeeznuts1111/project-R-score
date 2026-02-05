#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 RSS Audit & Logging System (Bun Compatible)

console.log("🔍 Tier-1380 RSS Audit & Logging System\n");

// ─── Bun-Compatible RSS Parsing ───────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function parseRSSFeed(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const text = await response.text();

		// Extract items using regex (Bun-compatible)
		const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];
		const items = [];

		for (const itemText of itemMatches) {
			const titleMatch = itemText.match(/<title[^>]*>([^<]+)<\/title>/i);
			const linkMatch = itemText.match(/<link[^>]*>([^<]+)<\/link>/i);
			const pubDateMatch = itemText.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i);
			const descMatch = itemText.match(/<description[^>]*>([^<]+)<\/description>/i);

			items.push({
				title: titleMatch ? titleMatch[1].trim() : "No title",
				link: linkMatch ? linkMatch[1].trim() : "",
				pubDate: pubDateMatch ? pubDateMatch[1].trim() : "",
				description: descMatch ? descMatch[1].trim() : "",
			});
		}

		return items;
	} catch (error) {
		const errorMsg =
			error && typeof error === "object" && "message" in error
				? error.message
				: String(error);
		console.log(`❌ Error parsing RSS: ${errorMsg}`);
		return [];
	}
}

// ─── Audit Functions ─────────────────────────────────
async function auditLatestTitle(url) {
	console.log("📋 RSS Title Audit (Col-89 Compliance):");

	const items = await parseRSSFeed(url);
	if (items.length === 0) {
		console.log("   No items found");
		return;
	}

	const latest = items[0]; // First item is typically latest
	const title = latest.title;
	const width = Bun.stringWidth(title);
	const isViolation = width > 89;

	console.log(`   Title: ${title}`);
	console.log(`   Width: ${width} columns`);
	console.log(`   Status: ${isViolation ? "❌ VIOLATION" : "✅ OK"}`);

	if (isViolation) {
		console.log(`   Preview: ${title.substring(0, 60)}...`);
	}

	return { title, width, isViolation };
}

async function logToAuditFile(url, logFile = "audit-rss.log") {
	console.log(`📝 Logging to Audit File: ${logFile}`);

	const items = await parseRSSFeed(url);
	if (items.length === 0) {
		console.log("   No items to log");
		return;
	}

	const latest = items[0];
	const timestamp = new Date().toISOString();
	const logEntry = `${timestamp} | ${latest.title}\n`;

	try {
		await Bun.write(logFile, logEntry, { createPath: true });
		console.log(`   ✅ Logged: ${latest.title.substring(0, 50)}...`);
		console.log(`   📁 File: ${logFile}`);
	} catch (error) {
		const errorMsg =
			error && typeof error === "object" && "message" in error
				? error.message
				: String(error);
		console.log(`   ❌ Log error: ${errorMsg}`);
	}
}

async function exportToJSONLines(url, limit = 5) {
	console.log(`📤 Exporting to JSON Lines (latest ${limit} items):`);

	const items = await parseRSSFeed(url);
	const limited = items.slice(0, limit);

	if (limited.length === 0) {
		console.log("   No items to export");
		return;
	}

	console.log("   JSON Lines output:");
	limited.forEach((item, index) => {
		const jsonLine = JSON.stringify({
			title: item.title,
			link: item.link,
			pubDate: item.pubDate,
			description:
				item.description.substring(0, 100) +
				(item.description.length > 100 ? "..." : ""),
		});
		console.log(`   ${index + 1}. ${jsonLine}`);
	});

	return limited;
}

// ─── Advanced Audit Analytics ─────────────────────────
async function analyzeFeedCompliance(url) {
	console.log("📊 Feed Compliance Analysis:");

	const items = await parseRSSFeed(url);
	if (items.length === 0) {
		console.log("   No items to analyze");
		return;
	}

	let violations = 0;
	let totalWidth = 0;
	let maxWidth = 0;
	const violationItems = [];

	items.forEach((item, index) => {
		const width = Bun.stringWidth(item.title);
		totalWidth += width;
		if (width > maxWidth) maxWidth = width;

		if (width > 89) {
			violations++;
			violationItems.push({ index: index + 1, title: item.title, width });
		}
	});

	const avgWidth = totalWidth / items.length;
	const complianceRate = (((items.length - violations) / items.length) * 100).toFixed(1);

	console.log(`   Total items: ${items.length}`);
	console.log(`   Violations: ${violations} (${complianceRate}% compliant)`);
	console.log(`   Average width: ${avgWidth.toFixed(1)} columns`);
	console.log(`   Max width: ${maxWidth} columns`);

	if (violations > 0) {
		console.log("\n❌ Violation Details:");
		violationItems.slice(0, 3).forEach((v) => {
			console.log(
				`   Item ${v.index}: ${v.width} cols → ${v.title.substring(0, 50)}...`,
			);
		});
		if (violations > 3) {
			console.log(`   ... and ${violations - 3} more violations`);
		}
	}

	return {
		total: items.length,
		violations,
		complianceRate: parseFloat(complianceRate),
		avgWidth,
		maxWidth,
	};
}

// ─── One-Liner Demonstrations (Bun Compatible) ─────────
async function demonstrateOneLiners() {
	console.log("⚡ Bun-Compatible One-Liner Demonstrations:\n");

	// 15. Title width audit (Bun version)
	console.log("15. RSS Title Width Audit:");
	try {
		const auditResult = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((text) => {
				const titleMatch = text.match(/<item[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/);
				const title = titleMatch ? titleMatch[1].trim() : "No title";
				const width = Bun.stringWidth(title);
				return { title, width, violation: width > 89 };
			});

		console.log(
			`   RSS Audit: Title width ${auditResult.width} cols → ${auditResult.violation ? "VIOLATION" : "OK"}`,
		);
		console.log(`   Title: ${auditResult.title.substring(0, 60)}...`);
	} catch (e) {
		console.log(`   Error: ${e}`);
	}

	// 16. Audit logging (Bun version)
	console.log("\n16. RSS Audit Logging:");
	try {
		const logResult = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then(async (text) => {
				const titleMatch = text.match(/<item[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/);
				const title = titleMatch ? titleMatch[1].trim() : "No title";
				const timestamp = new Date().toISOString();
				const logEntry = `${timestamp} | ${title}\n`;

				await Bun.write("audit-rss-demo.log", logEntry, { createPath: true });
				return { title, logged: true };
			});

		console.log(`   ✅ Logged: ${logResult.title.substring(0, 50)}...`);
		console.log(`   📁 File: audit-rss-demo.log`);
	} catch (e) {
		console.log(`   Error: ${e}`);
	}

	// 17. JSON Lines export (Bun version)
	console.log("\n17. RSS → JSON Lines Export:");
	try {
		const jsonExport = await fetch("https://bun.com/rss.xml")
			.then((r) => r.text())
			.then((text) => {
				const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];
				const items = [];

				for (let i = 0; i < Math.min(3, itemMatches.length); i++) {
					const itemText = itemMatches[i];
					const titleMatch = itemText.match(/<title[^>]*>([^<]+)<\/title>/i);
					const linkMatch = itemText.match(/<link[^>]*>([^<]+)<\/link>/i);
					const pubDateMatch = itemText.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i);

					if (titleMatch) {
						items.push({
							title: titleMatch[1].trim(),
							link: linkMatch ? linkMatch[1].trim() : "",
							pubDate: pubDateMatch ? pubDateMatch[1].trim() : "",
						});
					}
				}

				return items;
			});

		jsonExport.forEach((item, index) => {
			console.log(`   ${index + 1}. ${JSON.stringify(item)}`);
		});
	} catch (e) {
		console.log(`   Error: ${e}`);
	}
}

// ─── Main Execution ─────────────────────────────────
async function main() {
	console.log("🎯 Tier-1380 RSS Audit & Logging System\n");

	const rssUrl = "https://bun.com/rss.xml";

	// One-liner demonstrations
	await demonstrateOneLiners();

	console.log("\n" + "=".repeat(60));

	// Comprehensive audit
	await auditLatestTitle(rssUrl);

	console.log("\n" + "─".repeat(40));

	await logToAuditFile(rssUrl, "audit-rss-comprehensive.log");

	console.log("\n" + "─".repeat(40));

	await exportToJSONLines(rssUrl, 3);

	console.log("\n" + "=".repeat(60));

	await analyzeFeedCompliance(rssUrl);

	console.log("\n💡 Bun-Compatible One-Liner Examples:");
	console.log(
		'   15. Title audit: bun -e \'fetch("url").then(r=>r.text()).then(t=>{const m=t.match(/<item[^>]*>[\\s\\S]*?<title[^>]*>([^<]+)<\\/title>/);const title=m?m[1].trim():"No title";const w=Bun.stringWidth(title);console.log(`RSS Audit: ${w} cols → ${w>89?"VIOLATION":"OK"}: ${title.substring(0,30)}...`)}\'',
	);
	console.log(
		'   16. Audit logging: bun -e \'fetch("url").then(r=>r.text()).then(async t=>{const m=t.match(/<item[^>]*>[\\s\\S]*?<title[^>]*>([^<]+)<\\/title>/);const title=m?m[1].trim():"No title";await Bun.write("audit.log",`${new Date().toISOString()} | ${title}\\n`);console.log("Logged")}\')',
	);
	console.log(
		'   17. JSON export: bun -e \'fetch("url").then(r=>r.text()).then(t=>{const items=t.match(/<item[^>]*>[\\s\\S]*?<\\/item>/g)||[];items.slice(0,3).forEach((i,idx)=>{const title=i.match(/<title[^>]*>([^<]+)<\\/title>/);const link=i.match(/<link[^>]*>([^<]+)<\\/link>/);console.log(`${idx+1}. ${JSON.stringify({title:title?title[1].trim():"",link:link?link[1].trim():""})}`)}))\'',
	);
}

main().catch(console.error);
