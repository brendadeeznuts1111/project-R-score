#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: Bun API Reference
 *
 * Canonical mapping of Bun APIs used in the Omega-Matrix codebase.
 * Generated from Matrix Area analysis.
 *
 * @module bun-api-reference
 * @tier 1380-OMEGA-HARDENED
 */

import { color } from "bun";

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type ApiKind = "function" | "method" | "class" | "object" | "string";

export interface BunApiEntry {
	id: number;
	api: string;
	kind: ApiKind;
	signature: string;
	matrixArea: string[];
	notes: string;
}

// ═══════════════════════════════════════════════════════════════
// BUN API CATALOG (20 Core APIs)
// ═══════════════════════════════════════════════════════════════

export const BUN_API_CATALOG: BunApiEntry[] = [
	{
		id: 1,
		api: "Bun.file(path)",
		kind: "function",
		signature: "Bun.file(path: string | URL | BunFile): BunFile",
		matrixArea: ["scripts/matrix", "omega-integrity", "registry"],
		notes: "Almost every file read → seal → validate loop",
	},
	{
		id: 2,
		api: "BunFile.text()",
		kind: "method",
		signature: "text(): Promise<string>",
		matrixArea: ["everywhere"],
		notes: "Primary way matrix reads source before hashing/sealing",
	},
	{
		id: 3,
		api: "BunFile.arrayBuffer()",
		kind: "method",
		signature: "arrayBuffer(): Promise<ArrayBuffer>",
		matrixArea: ["integrity", "crc32 fast-path"],
		notes: "Used when sealing binary files",
	},
	{
		id: 4,
		api: "Bun.file().stream()",
		kind: "method",
		signature: "stream(): ReadableStream<Uint8Array>",
		matrixArea: ["large file sync", "S3 proxy"],
		notes: "Streaming upload to registry mirror",
	},
	{
		id: 5,
		api: "Bun.write(dest, data)",
		kind: "function",
		signature:
			"write(dest: string | BunFile, data: string | Blob | TypedArray | ArrayBuffer) → Promise<void>",
		matrixArea: ["registry store", "cache write"],
		notes: "Atomic-ish writes in registry ops",
	},
	{
		id: 6,
		api: "Bun.spawn / Bun.spawnSync",
		kind: "function",
		signature:
			"spawn(cmd: string[], opts?: SpawnOptions): Subprocess\nspawnSync(…): SyncSubprocess",
		matrixArea: ["dep-analysis", "audit", "build macros"],
		notes: "bun why, bun outdated, bun audit calls",
	},
	{
		id: 7,
		api: "Bun.Cookie",
		kind: "class",
		signature:
			"new Bun.Cookie(name, value, opts?)\nnew Bun.Cookie(cookieString)\nnew Bun.Cookie(object)",
		matrixArea: ["session", "theme", "auth layers"],
		notes: "Core of mcp_session & mcp_theme cookie handling",
	},
	{
		id: 8,
		api: "Bun.CookieMap",
		kind: "class",
		signature:
			"new Bun.CookieMap(cookieHeader?: string)\nget/set/delete/toSetCookieHeaders()",
		matrixArea: ["middleware", "request context"],
		notes: "Parses → typed access → refresh Set-Cookie",
	},
	{
		id: 9,
		api: "Bun.color(input)",
		kind: "function",
		signature: "color(input: string | number[] | number): [r,g,b]",
		matrixArea: ["theme engine", "contrast calc"],
		notes: "Converts palette → rgba / css var",
	},
	{
		id: 10,
		api: "Bun.serve(options)",
		kind: "function",
		signature: "serve({ fetch, websocket?, port?, hostname?, ... }): Server",
		matrixArea: ["dev server", "registry API"],
		notes: "Main HTTP + WS entrypoint",
	},
	{
		id: 11,
		api: "Bun.password",
		kind: "object",
		signature:
			"hash(password: string, opts?): Promise<string>\nverify(hash, password): Promise<boolean>",
		matrixArea: ["auth"],
		notes: "Sometimes used in session token minting",
	},
	{
		id: 12,
		api: "Bun.crypto",
		kind: "object",
		signature: "subtle.digest(algorithm, data) etc.",
		matrixArea: ["integrity", "signing"],
		notes: "Future signed session cookie path",
	},
	{
		id: 13,
		api: "Bun.glob(pattern)",
		kind: "function",
		signature: "glob(pattern: string, opts?): Promise<string[]>",
		matrixArea: ["matrix scan", "validation glob"],
		notes: "**/*.ts, rules/**/*.md etc.",
	},
	{
		id: 14,
		api: "Bun.which(command)",
		kind: "function",
		signature: "which(cmd: string): string | null",
		matrixArea: ["tooling detection"],
		notes: "Verifies bun/node/npm availability",
	},
	{
		id: 15,
		api: "Bun.build(config)",
		kind: "function",
		signature:
			"build({ entrypoints, outfile, target, minify?, ... }): Promise<BuildOutput>",
		matrixArea: ["executable compilation"],
		notes: "Produces signed dist/ binaries",
	},
	{
		id: 16,
		api: "Bun.env",
		kind: "object",
		signature: "Bun.env: NodeJS.ProcessEnv (but faster)",
		matrixArea: ["config", "secrets"],
		notes: "process.env replacement in most matrix code",
	},
	{
		id: 17,
		api: "Bun.nanoseconds()",
		kind: "function",
		signature: "nanoseconds(): bigint",
		matrixArea: ["micro-benchmarks"],
		notes: "High-resolution timing in performance tables",
	},
	{
		id: 18,
		api: "Bun.sleep(ms)",
		kind: "function",
		signature: "sleep(ms: number): Promise<void>",
		matrixArea: ["rate limiting", "backoff"],
		notes: "Sometimes in test / retry logic",
	},
	{
		id: 19,
		api: "Bun.gc(force?: boolean)",
		kind: "function",
		signature: "gc(force?: boolean): void",
		matrixArea: ["memory tuning"],
		notes: "Rare, but appears in stress tests",
	},
	{
		id: 20,
		api: "Bun.main",
		kind: "string",
		signature: "Bun.main: string (entry point path)",
		matrixArea: ["monorepo", "tooling scripts"],
		notes: "Used in path resolution tricks",
	},
];

// ═══════════════════════════════════════════════════════════════
// API LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Find API by ID
 */
export function getApiById(id: number): BunApiEntry | undefined {
	return BUN_API_CATALOG.find((api) => api.id === id);
}

/**
 * Find APIs by kind
 */
export function getApisByKind(kind: ApiKind): BunApiEntry[] {
	return BUN_API_CATALOG.filter((api) => api.kind === kind);
}

/**
 * Find APIs used in a matrix area
 */
export function getApisByArea(area: string): BunApiEntry[] {
	return BUN_API_CATALOG.filter((api) =>
		api.matrixArea.some((a) => a.toLowerCase().includes(area.toLowerCase())),
	);
}

/**
 * Search APIs by name or notes
 */
export function searchApis(query: string): BunApiEntry[] {
	const q = query.toLowerCase();
	return BUN_API_CATALOG.filter(
		(api) =>
			api.api.toLowerCase().includes(q) ||
			api.notes.toLowerCase().includes(q) ||
			api.signature.toLowerCase().includes(q),
	);
}

// ═══════════════════════════════════════════════════════════════
// API COVERAGE VERIFICATION
// ═══════════════════════════════════════════════════════════════

export interface ApiCoverageResult {
	api: string;
	used: boolean;
	files: string[];
}

/**
 * Check API usage in a directory
 */
export async function checkApiCoverage(dir: string): Promise<ApiCoverageResult[]> {
	const glob = new Bun.Glob("**/*.ts");
	const results: ApiCoverageResult[] = [];

	for (const entry of BUN_API_CATALOG) {
		// Extract the API name for grep
		const apiName = entry.api
			.replace(/\(.*\)/, "")
			.replace("Bun.", "")
			.trim();
		const files: string[] = [];

		for await (const path of glob.scan({ cwd: dir, onlyFiles: true })) {
			const fullPath = `${dir}/${path}`;
			const content = await Bun.file(fullPath).text();

			// Check for API usage
			if (
				content.includes(`Bun.${apiName}`) ||
				content.includes(`import { ${apiName}`) ||
				(content.includes(`from "bun"`) && content.includes(apiName))
			) {
				files.push(path);
			}
		}

		results.push({
			api: entry.api,
			used: files.length > 0,
			files,
		});
	}

	return results;
}

// ═══════════════════════════════════════════════════════════════
// HSL STATUS COLORS FOR API COVERAGE
// ═══════════════════════════════════════════════════════════════

const COVERAGE_HSL = {
	HIGH: { h: 120, s: 60, l: 40 }, // Green - well covered
	MEDIUM: { h: 60, s: 80, l: 50 }, // Yellow - some coverage
	LOW: { h: 30, s: 80, l: 50 }, // Orange - minimal
	NONE: { h: 0, s: 80, l: 50 }, // Red - not used
} as const;

/**
 * Get coverage color based on file count
 */
function getCoverageColor(fileCount: number): string {
	let hsl: { h: number; s: number; l: number };

	if (fileCount >= 5) hsl = COVERAGE_HSL.HIGH;
	else if (fileCount >= 2) hsl = COVERAGE_HSL.MEDIUM;
	else if (fileCount >= 1) hsl = COVERAGE_HSL.LOW;
	else hsl = COVERAGE_HSL.NONE;

	return color(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, "ansi256") || "";
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

if (import.meta.main) {
	const command = Bun.argv[2];
	const arg = Bun.argv[3];

	console.info("📚 Tier-1380 OMEGA: Bun API Reference\n");

	switch (command) {
		case "list": {
			// List all APIs
			const data = BUN_API_CATALOG.map((api) => ({
				ID: api.id,
				API: api.api,
				Kind: api.kind,
				Areas: api.matrixArea.join(", "),
			}));
			console.info(Bun.inspect.table(data));
			break;
		}

		case "search": {
			if (!arg) {
				console.info("Usage: bun bun-api-reference.ts search <query>");
				break;
			}
			const results = searchApis(arg);
			if (results.length === 0) {
				console.info(`No APIs found matching "${arg}"`);
			} else {
				console.info(`Found ${results.length} APIs:\n`);
				for (const api of results) {
					console.info(`  ${api.id}. ${api.api}`);
					console.info(`     ${api.signature}`);
					console.info(`     Areas: ${api.matrixArea.join(", ")}`);
					console.info(`     Notes: ${api.notes}\n`);
				}
			}
			break;
		}

		case "kind": {
			if (!arg) {
				console.info(
					"Usage: bun bun-api-reference.ts kind <function|method|class|object|string>",
				);
				break;
			}
			const results = getApisByKind(arg as ApiKind);
			console.info(`${results.length} ${arg} APIs:\n`);
			for (const api of results) {
				console.info(`  ${api.id}. ${api.api}`);
			}
			break;
		}

		case "area": {
			if (!arg) {
				console.info("Usage: bun bun-api-reference.ts area <area>");
				break;
			}
			const results = getApisByArea(arg);
			console.info(`${results.length} APIs in "${arg}":\n`);
			for (const api of results) {
				console.info(`  ${api.id}. ${api.api} - ${api.notes}`);
			}
			break;
		}

		case "coverage": {
			const dir = arg || "scripts/matrix";
			console.info(`Checking API coverage in ${dir}...\n`);

			const coverage = await checkApiCoverage(dir);
			const used = coverage.filter((c) => c.used);
			const unused = coverage.filter((c) => !c.used);

			console.info(`Coverage: ${used.length}/${coverage.length} APIs used\n`);

			console.info("Used APIs:");
			for (const c of used) {
				const colorCode = getCoverageColor(c.files.length);
				console.info(`  ${colorCode}●\x1b[0m ${c.api} (${c.files.length} files)`);
			}

			if (unused.length > 0) {
				console.info("\nUnused APIs:");
				for (const c of unused) {
					console.info(`  \x1b[90m○\x1b[0m ${c.api}`);
				}
			}
			break;
		}

		case "signatures": {
			console.info("API Signatures:\n");
			for (const api of BUN_API_CATALOG) {
				console.info(`${api.id}. ${api.api}`);
				console.info(`   ${api.signature.replace(/\n/g, "\n   ")}\n`);
			}
			break;
		}

		default: {
			console.info("Usage: bun matrix/bun-api-reference.ts <command> [arg]\n");
			console.info("Commands:");
			console.info("  list                List all 20 core APIs");
			console.info("  search <query>      Search APIs by name/notes");
			console.info(
				"  kind <type>         Filter by kind (function/method/class/object/string)",
			);
			console.info("  area <area>         Find APIs by matrix area");
			console.info("  coverage [dir]      Check API usage in directory");
			console.info("  signatures          Show all API signatures");
		}
	}
}
