#!/usr/bin/env bun
/**
 * Tier-1380 RSS Canonicalization Verification
 *
 * Confirms:
 * 1. Unified feed (bun.com/rss.xml, bun.sh/rss.xml) returns 200 application/xml
 * 2. Dead paths (bun.com/blog/rss.xml, bun.sh/blog/rss.xml) return 404
 * 3. Col-89 width of first 200 chars of feed and a typical preview
 *
 * Run: bun mcp-bun-docs/scripts/verify-rss-canonicalization.ts
 */

import { BUN_CHANGELOG_RSS } from "../lib.ts";

const BUN_SH_RSS = "https://bun.sh/rss.xml";
const DEAD_PATHS = [
	"https://bun.com/blog/rss.xml",
	"https://bun.sh/blog/rss.xml",
] as const;

async function main(): Promise<void> {
	console.log("Tier-1380 RSS Canonicalization Verification\n");

	// 1. Unified feed on both hosts
	for (const url of [BUN_CHANGELOG_RSS, BUN_SH_RSS]) {
		const res = await fetch(url);
		const ct = res.headers.get("content-type") ?? "";
		const ok = res.ok && (ct.includes("xml") || ct.includes("rss"));
		console.log(url);
		console.log(
			`  HTTP ${res.status}  Content-Type: ${ct?.slice(0, 50)}  ${ok ? "✓" : "✗"}`,
		);
		if (res.ok) {
			const text = await res.text();
			const w = Bun.stringWidth(text.slice(0, 200), { countAnsiEscapeCodes: false });
			console.log(`  First 200 chars width: ${w} cols`);
		}
		console.log("");
	}

	// 2. Dead paths 404
	for (const url of DEAD_PATHS) {
		const res = await fetch(url);
		const expect404 = res.status === 404;
		console.log(url);
		console.log(`  HTTP ${res.status}  ${expect404 ? "✓ (404 expected)" : "✗"}`);
		console.log("");
	}

	// 3. Col-89 preview width
	const preview = "Bun v1.3.7 released – GB9c Indic fix, stringWidth table -27%";
	const width = Bun.stringWidth(preview);
	const safe = width <= 89;
	console.log("Typical RSS item preview (Col-89 check):");
	console.log(`  "${preview}"`);
	console.log(`  Width: ${width} cols  ${safe ? "✓ under 89" : "✗ over 89"}`);

	console.log("\n▵⟂⥂ rss unified – verification complete.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
