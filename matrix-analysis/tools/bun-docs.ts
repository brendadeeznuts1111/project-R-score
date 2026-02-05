#!/usr/bin/env bun
/**
 * Bun docs CLI — deep integration with mcp-bun-docs/lib.ts
 *
 * Commands:
 *   search <query>   — Search Bun docs (searchBunDocs), output markdown
 *   entry <term>     — Resolve curated entry by term (getDocEntry), output JSON or URL
 *   link [key]       — Get reference URL by key (getReferenceUrl), or list keys
 *   version          — Print BUN_DOCS_VERSION / BUN_DOCS_MIN_VERSION
 *
 * Examples:
 *   bun tools/bun-docs.ts search "Bun.serve"
 *   bun tools/bun-docs.ts entry spawn
 *   bun tools/bun-docs.ts link fileAPI
 *   bun tools/bun-docs.ts link
 *
 * @col_93 balanced_braces
 */

import {
	BUN_BLOG_RSS_URL,
	BUN_BLOG_URL,
	BUN_CHANGELOG_RSS,
	BUN_DOC_ENTRIES,
	BUN_DOCS_BASE,
	BUN_DOCS_MIN_VERSION,
	BUN_DOCS_VERSION,
	BUN_FEEDBACK_UPGRADE_FIRST,
	BUN_FEEDBACK_URL,
	BUN_GLOBALS,
	BUN_GLOBALS_API_URL,
	BUN_GUIDES_URL,
	BUN_INSTALL_ADD_URL,
	BUN_NODE_COMPAT_URL,
	BUN_PM_URL,
	BUN_REFERENCE_KEYS,
	BUN_REFERENCE_LINKS,
	BUN_REFERENCE_URL,
	BUN_REPO_RELEASES_URL,
	BUN_REPO_URL,
	BUN_SHOP_URL,
	buildDocUrl,
	getCrossReferences,
	getDocEntry,
	getLatestBunReleaseTitleFromRss,
	getReferenceUrl,
	searchBunDocs,
} from "../mcp-bun-docs/lib.ts";

const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);

function usage(): void {
	console.log(`Bun docs CLI (mcp-bun-docs integration)
Usage:
  bun tools/bun-docs.ts search <query>   Search Bun docs, output markdown
  bun tools/bun-docs.ts entry <term>     Get curated entry (JSON or --url)
  bun tools/bun-docs.ts link [key]       Get reference URL or list keys
  bun tools/bun-docs.ts terms [--count]  List curated terms (optional limit)
  bun tools/bun-docs.ts globals          List Bun globals + API doc URL
  bun tools/bun-docs.ts xrefs <term>     Cross-references for term (related doc links)
  bun tools/bun-docs.ts feedback         Reporting issues: upgrade first, then search
  bun tools/bun-docs.ts shop             Official Bun shop URL
  bun tools/bun-docs.ts blog             Bun blog URL
  bun tools/bun-docs.ts guides           Bun guides index URL
  bun tools/bun-docs.ts rss              Changelog + blog RSS URLs
  bun tools/bun-docs.ts repo             oven-sh/bun repo + releases URLs
  bun tools/bun-docs.ts deps             Package manager + add dependency URLs
  bun tools/bun-docs.ts compat           Node.js compatibility doc URL
  bun tools/bun-docs.ts reference       Bun reference (modules) index URL
  bun tools/bun-docs.ts latest          Latest Bun release title from RSS
  bun tools/bun-docs.ts version         Print doc version constants

Examples:
  bun tools/bun-docs.ts search "Bun.serve"
  bun tools/bun-docs.ts entry spawn --url
  bun tools/bun-docs.ts link fileAPI
  bun tools/bun-docs.ts terms --count=20
  bun tools/bun-docs.ts globals
  bun tools/bun-docs.ts xrefs spawn
  bun tools/bun-docs.ts feedback
  bun tools/bun-docs.ts shop
  bun tools/bun-docs.ts rss
  bun run docs:search -- "fetch"
`);
}

async function main(): Promise<void> {
	if (!cmd) {
		usage();
		process.exit(0);
	}

	switch (cmd) {
		case "search": {
			const query = rest.join(" ").trim() || "Bun";
			const markdown = await searchBunDocs(query);
			console.log(markdown);
			break;
		}
		case "entry": {
			const term = rest.find((a) => !a.startsWith("--")) ?? "";
			const urlOnly = rest.includes("--url");
			if (!term) {
				console.error("Usage: bun tools/bun-docs.ts entry <term> [--url]");
				process.exit(1);
			}
			const entry = getDocEntry(term);
			if (!entry) {
				console.error(`No curated entry for term: ${term}`);
				process.exit(1);
			}
			if (urlOnly) {
				console.log(buildDocUrl(entry.path));
			} else {
				console.log(JSON.stringify(entry, null, 2));
			}
			break;
		}
		case "link": {
			const key = rest[0];
			if (!key) {
				console.log("Reference link keys:");
				for (const k of BUN_REFERENCE_KEYS) {
					console.log(`  ${k} → ${BUN_REFERENCE_LINKS[k]}`);
				}
				break;
			}
			const k = key as keyof typeof BUN_REFERENCE_LINKS;
			if (!(k in BUN_REFERENCE_LINKS)) {
				console.error(`Unknown key: ${key}. Known: ${BUN_REFERENCE_KEYS.join(", ")}`);
				process.exit(1);
			}
			console.log(getReferenceUrl(k));
			break;
		}
		case "terms": {
			const countArg = rest.find((a) => a.startsWith("--count="));
			const limit = countArg ? Number.parseInt(countArg.split("=")[1] ?? "0", 10) : 0;
			const list = limit > 0 ? BUN_DOC_ENTRIES.slice(0, limit) : BUN_DOC_ENTRIES;
			for (const e of list) {
				console.log(`${e.term}\t${e.path}\t${e.bunMinVersion}\t${e.stability}`);
			}
			if (limit > 0) {
				console.log(`... (${BUN_DOC_ENTRIES.length} total, showing ${list.length})`);
			} else {
				console.log(`(${BUN_DOC_ENTRIES.length} terms)`);
			}
			break;
		}
		case "globals": {
			console.log("Bun top-level globals (name → path):");
			for (const g of BUN_GLOBALS) {
				console.log(
					`  ${g.name}\t${buildDocUrl(g.path)}\t${g.description.slice(0, 50)}…`,
				);
			}
			console.log(`\nBun.* API (full list): ${BUN_GLOBALS_API_URL}`);
			break;
		}
		case "xrefs": {
			const term = rest.find((a) => !a.startsWith("--")) ?? "";
			if (!term) {
				console.error("Usage: bun tools/bun-docs.ts xrefs <term>");
				process.exit(1);
			}
			const xrefs = getCrossReferences(term);
			if (xrefs.length === 0) {
				const e = getDocEntry(term);
				if (!e) {
					console.error(`No entry and no cross-refs for term: ${term}`);
					process.exit(1);
				}
				console.log(`No relatedTerms for "${term}". Doc: ${buildDocUrl(e.path)}`);
			} else {
				console.log(`Cross-references for "${term}":`);
				for (const x of xrefs) {
					console.log(`  ${x.term}\t${x.url}`);
				}
			}
			break;
		}
		case "feedback": {
			console.log(BUN_FEEDBACK_UPGRADE_FIRST);
			console.log(`\nDocs: ${BUN_FEEDBACK_URL}`);
			break;
		}
		case "shop": {
			console.log(BUN_SHOP_URL);
			break;
		}
		case "blog": {
			console.log(BUN_BLOG_URL);
			break;
		}
		case "guides": {
			console.log(BUN_GUIDES_URL);
			break;
		}
		case "rss": {
			console.log("Changelog/releases:", BUN_CHANGELOG_RSS);
			console.log("Blog (optional #tag= filter):", BUN_BLOG_RSS_URL);
			break;
		}
		case "repo": {
			console.log("Repo:", BUN_REPO_URL);
			console.log("Releases:", BUN_REPO_RELEASES_URL);
			break;
		}
		case "deps": {
			console.log("Package manager:", BUN_PM_URL);
			console.log("Add dependency guide:", BUN_INSTALL_ADD_URL);
			break;
		}
		case "compat": {
			console.log(BUN_NODE_COMPAT_URL);
			break;
		}
		case "reference": {
			console.log(BUN_REFERENCE_URL);
			break;
		}
		case "latest": {
			const title = await getLatestBunReleaseTitleFromRss();
			console.log(title ?? "(fetch failed or no item title)");
			break;
		}
		case "version": {
			console.log(`BUN_DOCS_VERSION=${BUN_DOCS_VERSION}`);
			console.log(`BUN_DOCS_MIN_VERSION=${BUN_DOCS_MIN_VERSION}`);
			console.log(`BUN_DOCS_BASE=${BUN_DOCS_BASE}`);
			break;
		}
		case "-h":
		case "--help":
		case "help":
			usage();
			break;
		default:
			console.error(`Unknown command: ${cmd}`);
			usage();
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
