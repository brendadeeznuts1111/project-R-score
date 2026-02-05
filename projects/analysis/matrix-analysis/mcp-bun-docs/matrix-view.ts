#!/usr/bin/env bun
/**
 * Bun MCP matrix view - consts, types, patterns
 * @col_93 balanced_braces (skills) - code blocks have balanced braces/brackets/parens
 * Run: bun mcp-bun-docs/matrix-view.ts
 */

import {
	BUN_CHANGELOG_RSS,
	BUN_DOC_ENTRIES,
	BUN_DOC_MAP,
	BUN_DOCS_BASE,
	BUN_DOCS_JSON_URL,
	BUN_DOCS_MIN_VERSION,
	BUN_DOCS_VERSION,
	filterEntriesByStability,
	filterEntriesByVersion,
	SEARCH_WEIGHTS,
} from "./lib.ts";
import { MCP_MANIFEST_URL } from "./mcp-manifest.ts";

const lastUpdated = new Date().toISOString().slice(0, 10);

// Const variables (Version in own column)
const _consts = [
	{
		Const: "BUN_DOCS_BASE",
		Value: BUN_DOCS_BASE,
		Version: "-",
		Module: "lib.ts",
		Purpose: "Base URL for doc links",
	},
	{
		Const: "MCP_MANIFEST_URL",
		Value: MCP_MANIFEST_URL,
		Version: "-",
		Module: "bun-mcp-manifest.ts",
		Purpose: "Manifest fetch endpoint",
	},
	{
		Const: "BUN_DOCS_JSON_URL",
		Value: BUN_DOCS_JSON_URL,
		Version: "-",
		Module: "lib.ts",
		Purpose: "GitHub docs.json source (MCP reference)",
	},
	{
		Const: "BUN_DOCS_VERSION",
		Value: BUN_DOCS_VERSION,
		Version: BUN_DOCS_VERSION,
		Module: "lib.ts",
		Purpose: "Version pinning",
	},
	{
		Const: "BUN_DOCS_MIN_VERSION",
		Value: BUN_DOCS_MIN_VERSION,
		Version: BUN_DOCS_MIN_VERSION,
		Module: "lib.ts",
		Purpose: "Minimum supported version",
	},
	{
		Const: "BUN_CHANGELOG_RSS",
		Value: BUN_CHANGELOG_RSS,
		Version: "-",
		Module: "lib.ts",
		Purpose: "Tier-1380 auto-sync RSS",
	},
	{
		Const: "LastUpdated",
		Value: lastUpdated,
		Version: "-",
		Module: "matrix-view",
		Purpose: "Matrix snapshot date",
	},
];

// BUN_DOC_MAP entries (curated term → path)
const _docMapRows = Object.entries(BUN_DOC_MAP).map(([Term, Path]) => ({
	Term,
	Path,
	FullURL: `${BUN_DOCS_BASE}/${Path}`,
}));

// Types
const _types = [
	{ Type: "SearchResult", Fields: "title, url, snippet?", Module: "lib.ts" },
	{
		Type: "BunDocEntry",
		Fields: "term, path, bunMinVersion, stability, platforms, security, relatedTerms?",
		Module: "lib.ts",
	},
	{
		Type: "SearchBunSchema",
		Fields: "type, properties, required",
		Module: "bun-mcp-manifest.ts",
	},
	{
		Type: "SearchBunTool",
		Fields: "name, description, inputSchema, operationId",
		Module: "bun-mcp-manifest.ts",
	},
	{
		Type: "MCPManifest",
		Fields: "server, capabilities.tools, resources, prompts",
		Module: "bun-mcp-manifest.ts",
	},
];

// Tier-1380 Matrix v2: traceability sample (stability + version filter demo)
const _prodSafe = filterEntriesByStability(
	filterEntriesByVersion(BUN_DOC_ENTRIES, BUN_DOCS_VERSION),
	["stable"],
);
const _experimentalOnly = BUN_DOC_ENTRIES.filter((e) => e.stability === "experimental");
const _v2Sample = [
	...BUN_DOC_ENTRIES.slice(0, 4).map((e) => ({
		Term: e.term,
		bunMinVersion: e.bunMinVersion,
		Stability: e.stability,
		Platforms: e.platforms.join(","),
		Security: e.security.classification,
		Related: (e.relatedTerms ?? []).slice(0, 2).join(", ") || "-",
	})),
	{
		Term: "...",
		bunMinVersion: "-",
		Stability: "-",
		Platforms: "-",
		Security: "-",
		Related: `${BUN_DOC_ENTRIES.length} total`,
	},
];

// Search URL patterns
const _patterns = [
	{
		Pattern: "Mintlify search",
		URL: "https://bun.com/api/search?q=...",
		Purpose: "Primary search attempt",
	},
	{
		Pattern: "Alt search",
		URL: "https://bun.com/search?q=...",
		Purpose: "Fallback search",
	},
	{
		Pattern: "Doc path",
		URL: "BUN_DOCS_BASE + path",
		Purpose: "Curated map resolution",
	},
	{
		Pattern: "GitHub docs.json",
		URL: "https://github.com/oven-sh/bun/blob/af76296637931381e9509c204c5f1af9cc174534/docs/docs.json",
		Purpose: "MCP reference source",
	},
	{
		Pattern: "Default fallback",
		URL: "BUN_DOCS_BASE, BUN_DOCS_BASE/mcp",
		Purpose: "Unknown query fallback",
	},
];

// Search weights (HTTP bias)
const _weightRows = Object.entries(SEARCH_WEIGHTS).map(([Term, Weight]) => ({
	Term,
	Weight,
	Purpose: Weight >= 2 ? "High (80% query hit)" : "Normal",
})) as { Term: string; Weight: number; Purpose: string }[];

// SearchBun input params
const _searchParams = [
	{ Param: "query", Type: "string", Required: "yes", Purpose: "Search terms" },
	{ Param: "version", Type: "string", Required: "no", Purpose: "Filter by Bun version" },
	{
		Param: "language",
		Type: "string",
		Required: "no",
		Purpose: "Language code (en, zh, es)",
	},
	{
		Param: "apiReferenceOnly",
		Type: "boolean",
		Required: "no",
		Purpose: "Only API reference docs",
	},
	{ Param: "codeOnly", Type: "boolean", Required: "no", Purpose: "Only code snippets" },
] as const;

// Export all data for external use
export {
	_consts,
	_docMapRows,
	_types,
	_prodSafe,
	_experimentalOnly,
	_v2Sample,
	_patterns,
	_weightRows,
	_searchParams,
	lastUpdated,
};

// Display matrix when run directly
if (import.meta.path === Bun.main) {
	console.log(`\n🔍 Bun MCP Matrix View (${lastUpdated})\n`);
	
	console.log("📋 Constants:");
	console.table(_consts);
	
	console.log("\n📚 Documentation Map:");
	console.table(_docMapRows.slice(0, 10)); // Show first 10
	
	console.log("\n🏷️  Types:");
	console.table(_types);
	
	console.log("\n⚖️  Search Weights:");
	console.table(_weightRows);
	
	console.log("\n🔧 Search Parameters:");
	console.table(_searchParams);
	
	console.log(`\n📊 Matrix Summary:`);
	console.log(`- Total doc entries: ${BUN_DOC_ENTRIES.length}`);
	console.log(`- Production-safe entries: ${_prodSafe.length}`);
	console.log(`- Experimental entries: ${_experimentalOnly.length}`);
	console.log(`- Search patterns: ${_patterns.length}`);
}
