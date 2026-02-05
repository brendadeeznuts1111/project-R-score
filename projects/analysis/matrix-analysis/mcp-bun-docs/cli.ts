#!/usr/bin/env bun
/**
 * Bun Docs MCP CLI - Access BUN_DOC_MAP and BUN_DOCS_BASE globally
 * 
 * Usage:
 *   bunx bun-docs-cli --base-url
 *   bunx bun-docs-cli --doc-map
 *   bunx bun-docs-cli --doc-map --term spawn
 *   bunx bun-docs-cli --search spawn
 */

import {
	BUN_BASE_URL,
	BUN_DOCS_BASE,
	BUN_DOC_MAP,
	BUN_DOC_ENTRIES,
	buildDocUrl,
	getDocEntry,
	searchBunDocs,
} from "./lib.ts";

const args = process.argv.slice(2);

function printUsage(): void {
	console.log(`
Bun Docs MCP CLI - Access Bun documentation constants and search

Usage:
  bun-docs-cli [options]

Options:
  --base-url              Print BUN_BASE_URL
  --docs-base            Print BUN_DOCS_BASE
  --doc-map              Print entire BUN_DOC_MAP (JSON)
  --doc-map --term <term> Get specific term from BUN_DOC_MAP
  --search <query>       Search Bun documentation
  --entry <term>         Get curated doc entry for term
  --entry-url <term>     Get doc URL for term
  --list-terms           List all terms in BUN_DOC_MAP
  --count                Print count of entries in BUN_DOC_MAP
  --help                 Show this help message

Examples:
  bunx bun-docs-cli --base-url
  bunx bun-docs-cli --doc-map --term spawn
  bunx bun-docs-cli --search "Bun.serve"
  bunx bun-docs-cli --entry spawn
  bunx bun-docs-cli --list-terms | head -20
`);
}

function getArgValue(flag: string): string | null {
	const index = args.indexOf(flag);
	if (index !== -1 && index + 1 < args.length) {
		return args[index + 1];
	}
	return null;
}

function hasFlag(flag: string): boolean {
	return args.includes(flag);
}

async function main(): Promise<void> {
	if (args.length === 0 || hasFlag("--help") || hasFlag("-h")) {
		printUsage();
		process.exit(0);
	}

	try {
		if (hasFlag("--base-url")) {
			console.log(BUN_BASE_URL);
			return;
		}

		if (hasFlag("--docs-base")) {
			console.log(BUN_DOCS_BASE);
			return;
		}

		if (hasFlag("--doc-map")) {
			const term = getArgValue("--term");
			if (term) {
				const path = BUN_DOC_MAP[term];
				if (path) {
					console.log(JSON.stringify({ term, path, url: buildDocUrl(path) }, null, 2));
				} else {
					console.error(`Term "${term}" not found in BUN_DOC_MAP`);
					process.exit(1);
				}
			} else {
				console.log(JSON.stringify(BUN_DOC_MAP, null, 2));
			}
			return;
		}

		if (hasFlag("--search")) {
			const query = getArgValue("--search");
			if (!query) {
				console.error("Error: --search requires a query argument");
				process.exit(1);
			}
			const results = await searchBunDocs(query);
			console.log(results);
			return;
		}

		if (hasFlag("--entry")) {
			const term = getArgValue("--entry");
			if (!term) {
				console.error("Error: --entry requires a term argument");
				process.exit(1);
			}
			const entry = getDocEntry(term);
			if (entry) {
				console.log(JSON.stringify({ ...entry, url: buildDocUrl(entry.path) }, null, 2));
			} else {
				console.error(`No curated entry found for term: ${term}`);
				process.exit(1);
			}
			return;
		}

		if (hasFlag("--entry-url")) {
			const term = getArgValue("--entry-url");
			if (!term) {
				console.error("Error: --entry-url requires a term argument");
				process.exit(1);
			}
			const entry = getDocEntry(term);
			if (entry) {
				console.log(buildDocUrl(entry.path));
			} else {
				console.error(`No curated entry found for term: ${term}`);
				process.exit(1);
			}
			return;
		}

		if (hasFlag("--list-terms")) {
			const terms = Object.keys(BUN_DOC_MAP).sort();
			terms.forEach((term) => console.log(term));
			return;
		}

		if (hasFlag("--count")) {
			console.log(`BUN_DOC_MAP entries: ${Object.keys(BUN_DOC_MAP).length}`);
			console.log(`BUN_DOC_ENTRIES: ${BUN_DOC_ENTRIES.length}`);
			return;
		}

		// Default: show base URLs
		console.log(`BUN_BASE_URL: ${BUN_BASE_URL}`);
		console.log(`BUN_DOCS_BASE: ${BUN_DOCS_BASE}`);
		console.log(`BUN_DOC_MAP entries: ${Object.keys(BUN_DOC_MAP).length}`);
	} catch (error) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(`Unhandled error:`, err);
		process.exit(1);
	});
}
