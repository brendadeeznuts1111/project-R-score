#!/usr/bin/env bun
import { existsSync, mkdirSync } from "node:fs";
/**
 * Tier-1380 RSS hydration — v1.3.7 changelog feed
 *
 * Usage: bun run matrix:rss --source=bun-sh-releases --output=./feeds/bun-v1.3.7.xml
 */
import { BUN_CHANGELOG_RSS, BUN_DOCS_VERSION } from "../lib.ts";

async function fetchBunRss(source: string): Promise<string> {
	if (source === "bun-sh-releases" || source === "bun.com") {
		const url = BUN_CHANGELOG_RSS;
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
		return res.text();
	}
	throw new Error(`Unknown source: ${source}`);
}

function filterForVersion(xml: string, version: string): string {
	// Optional: filter items mentioning version. If none, return full feed.
	const v = version.replace(/\./g, "\\.");
	const re = new RegExp(`<item>[\\s\\S]*?${v}[\\s\\S]*?</item>`, "gi");
	const matches = xml.match(re);
	if (matches && matches.length > 0) {
		const header = xml.replace(/<item>[\s\S]*/i, "").trim();
		return `${header}\n${matches.join("\n")}\n</channel></rss>`;
	}
	return xml;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const source =
		args.find((a) => a.startsWith("--source="))?.split("=")[1] ?? "bun-sh-releases";
	const output =
		args.find((a) => a.startsWith("--output="))?.split("=")[1] ??
		`./feeds/bun-v${BUN_DOCS_VERSION}.xml`;
	const version =
		args.find((a) => a.startsWith("--version="))?.split("=")[1] ?? BUN_DOCS_VERSION;

	console.log(
		`\n  🔷 Tier-1380 RSS Hydration\n  Source: ${source}\n  Output: ${output}\n`,
	);

	const xml = await fetchBunRss(source).catch((e) => {
		console.error("  ✗ Fetch failed:", e.message);
		process.exit(1);
	});

	const filtered = filterForVersion(xml, version);
	const dir = output.replace(/\/[^/]+$/, "");
	if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
	await Bun.write(output, filtered);
	console.log(`  ✓ Wrote ${output}\n`);
}

main();
