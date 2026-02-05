#!/usr/bin/env bun
/**
 * Analyze CLI — structure scan, types, deps. Default subcommand: scan.
 *
 * Usage:
 *   bun tools/analyze.ts              → scan (default roots)
 *   bun tools/analyze.ts scan          → same
 *   bun tools/analyze.ts scan --all    → scan entire repo
 *   bun tools/analyze.ts types        → exported types
 *   bun tools/analyze.ts deps          → import graph / circular
 *
 * Options (global / scan):
 *   --roots=<dir1,dir2>   Roots to scan (default: src,mcp-bun-docs,tools,.claude/core)
 *   --all                 Scan from cwd (all .ts/.tsx, wider reach)
 *   --depth=<n>           Max depth under each root (default: unlimited)
 *   --limit=<n>           Max rows in table (default: 25)
 *   --format=table|json   Output format (default: table)
 *   --metrics             Include imports/exports counts in scan
 *   --help, -h            Show usage
 */

const DEFAULT_ROOTS = ["src", "mcp-bun-docs", "tools", ".claude/core"];
const DEFAULT_LIMIT = 25;
const GLOB_PATTERN = "**/*.{ts,tsx}";

/** Lazy-load mcp-bun-docs for xref (optional dependency). */
async function getDocResolver(): Promise<{
	getDocEntry: (term: string) => { path: string } | null;
	buildDocUrl: (path: string) => string;
} | null> {
	try {
		const lib = await import("../mcp-bun-docs/lib.ts");
		return { getDocEntry: lib.getDocEntry, buildDocUrl: lib.buildDocUrl };
	} catch {
		return null;
	}
}

type Format = "table" | "json" | "tree" | "dot";

interface AnalyzeConfig {
	roots?: string[];
	limit?: number;
	ignore?: string[];
	complexity?: { threshold?: number };
}

export async function loadConfig(): Promise<AnalyzeConfig> {
	const cwd = process.cwd();
	let config: AnalyzeConfig = {};
	try {
		const jsonPath = cwd + "/.analyze.json";
		const f = Bun.file(jsonPath);
		if (await f.exists()) {
			const data = (await f.json()) as Record<string, unknown>;
			config = {
				...(Array.isArray(data.roots) && { roots: data.roots as string[] }),
				...(typeof data.limit === "number" ? { limit: data.limit } : {}),
				...(Array.isArray(data.ignore) ? { ignore: data.ignore as string[] } : {}),
				...(data.complexity &&
				typeof data.complexity === "object" &&
				(data.complexity as Record<string, unknown>).threshold != null
					? {
							complexity: {
								threshold: Number(
									(data.complexity as Record<string, unknown>).threshold,
								),
							},
						}
					: {}),
			};
			return config;
		}
	} catch {
		//
	}
	try {
		const tomlPath = cwd + "/bunfig.toml";
		const f = Bun.file(tomlPath);
		if (await f.exists()) {
			const text = await f.text();
			const analyzeMatch = text.match(/\[analyze\]\s*([\s\S]*?)(?=\[|z)/);
			if (analyzeMatch) {
				const block = analyzeMatch[1];
				const rootsM = block.match(/roots\s*=\s*\[([^\]]+)\]/);
				if (rootsM)
					config.roots = rootsM[1].split(",").map((s) => s.replace(/["']/g, "").trim());
				const limitM = block.match(/limit\s*=\s*(\d+)/);
				if (limitM) config.limit = Number.parseInt(limitM[1], 10);
				const ignoreM = block.match(/ignore\s*=\s*\[([^\]]+)\]/);
				if (ignoreM)
					config.ignore = ignoreM[1]
						.split(",")
						.map((s) => s.replace(/["']/g, "").trim());
				const threshM = block.match(/threshold\s*=\s*(\d+)/);
				if (threshM) config.complexity = { threshold: Number.parseInt(threshM[1], 10) };
			}
		}
	} catch {
		//
	}
	return config;
}

/** Simple glob match: double-star-slash prefix = path contains rest; single-star prefix = path ends with rest. */
export function matchesIgnore(path: string, patterns: string[]): boolean {
	for (const p of patterns) {
		const t = p.trim();
		if (!t) continue;
		if (t.startsWith("**/")) {
			if (path.includes(t.slice(3))) return true;
		} else if (t.startsWith("*")) {
			if (path.endsWith(t.slice(1)) || path.includes("/" + t.slice(1))) return true;
		} else if (path.includes(t)) {
			return true;
		}
	}
	return false;
}

export function parseArgs(
	argv: string[],
	config: AnalyzeConfig = {},
): {
	cmd: string;
	rest: string[];
	roots: string[];
	all: boolean;
	limit: number;
	format: Format;
	metrics: boolean;
	depth: number | null;
	ignorePatterns: string[];
} {
	const rest = argv.slice(2);
	let cmd = rest[0] ?? "";

	const knownCommands = [
		"scan",
		"types",
		"props",
		"deps",
		"classes",
		"strength",
		"complexity",
		"rename",
		"polish",
		"coverage",
		"xref",
	];
	const benchMode = rest.includes("--bench");
	const coverageMode =
		rest.includes("--coverage") &&
		(cmd === "" || cmd === "scan" || !knownCommands.includes(cmd));
	const explicitHelp = cmd === "-h" || cmd === "--help";

	if (benchMode) {
		return {
			cmd: "bench",
			rest: rest.filter((a) => a !== "--bench" && !a.startsWith("--bench-format=")),
			roots: (() => {
				const rootsArg = rest.find((a) => a.startsWith("--roots="));
				return rootsArg
					? rootsArg
							.slice("--roots=".length)
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean)
					: config.roots?.length
						? config.roots
						: [...DEFAULT_ROOTS];
			})(),
			all: false,
			limit: config.limit ?? DEFAULT_LIMIT,
			format: "table",
			metrics: true,
			depth: null,
			ignorePatterns: config.ignore ?? [],
		};
	}

	if (explicitHelp) {
		return {
			cmd: "help",
			rest,
			roots: config.roots?.length ? config.roots : [...DEFAULT_ROOTS],
			all: false,
			limit: config.limit ?? DEFAULT_LIMIT,
			format: "table",
			metrics: true,
			depth: null,
			ignorePatterns: config.ignore ?? [],
		};
	}

	// --coverage as sole/primary flag → coverage subcommand
	if (coverageMode) {
		cmd = "coverage";
	}
	// No subcommand or first arg is an option → default to scan
	else if (cmd === "" || cmd.startsWith("--") || !knownCommands.includes(cmd)) {
		cmd = "scan";
	}

	const rootsArg = rest.find((a) => a.startsWith("--roots="));
	const roots = rootsArg
		? rootsArg
				.slice("--roots=".length)
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		: config.roots?.length
			? config.roots
			: [...DEFAULT_ROOTS];

	const all = rest.includes("--all");
	const limitArg = rest.find((a) => a.startsWith("--limit="));
	const limit = limitArg
		? Math.max(
				1,
				Number.parseInt(limitArg.slice("--limit=".length), 10) || DEFAULT_LIMIT,
			)
		: (config.limit ?? DEFAULT_LIMIT);

	const formatArg = rest.find((a) => a.startsWith("--format="));
	const formatRaw = formatArg?.slice("--format=".length) ?? "table";
	const format = (
		["table", "json", "tree", "dot"].includes(formatRaw) ? formatRaw : "table"
	) as Format;

	const metrics = rest.includes("--metrics") || !rest.includes("--no-metrics");

	const depthArg = rest.find((a) => a.startsWith("--depth="));
	const depth = depthArg
		? Number.parseInt(depthArg.slice("--depth=".length), 10) || null
		: null;

	const ignoreArg = rest.find((a) => a.startsWith("--ignore="));
	const ignorePatterns = ignoreArg
		? ignoreArg
				.slice("--ignore=".length)
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		: (config.ignore ?? []);

	const restForCmd = knownCommands.includes(rest[0] ?? "") ? rest.slice(1) : rest;
	return {
		cmd,
		rest: restForCmd,
		roots,
		all,
		limit,
		format,
		metrics,
		depth,
		ignorePatterns,
	};
}

function usage(): void {
	console.log(`Analyze CLI (default: scan)

Usage:
  bun tools/analyze.ts                    Run default: scan with default roots
  bun tools/analyze.ts scan               Same
  bun tools/analyze.ts scan --all         Scan entire repo (**/*.ts, **/*.tsx)
  bun tools/analyze.ts types [--props] [--kind=interface|type|class|enum]  Exported types; --kind filters
  bun tools/analyze.ts props [--kind=...]   Types with properties; --kind = interface | type | class | enum
  bun tools/analyze.ts deps [--circular] [--format=dot]   Imports / circular / import graph DOT
  bun tools/analyze.ts complexity [--threshold=N]  Cyclomatic-style complexity (default: 10)
  bun tools/analyze.ts classes [--inheritance] [--format=tree|dot]  Class hierarchy (--inheritance = tree)
  bun tools/analyze.ts strength [--weakest] [--penalize-lines]  Strength (--penalize-lines = discount huge files)
  bun tools/analyze.ts rename <Old> <New> [--auto] Rename symbol (default: dry-run)
  bun tools/analyze.ts polish [--fix-imports]      Remove unused imports (default: dry-run)
  bun tools/analyze.ts xref <term>                 Resolve term to Bun doc URL (mcp-bun-docs)
  bun tools/analyze.ts coverage [--roots=dir1,dir2] [--] [test args]
                                Run bun test --coverage (--roots limits to those dirs)
  bun tools/analyze.ts --coverage [--roots=...]   Same as 'coverage'
  bun tools/analyze.ts --bench [--roots=...]       Benchmark read-only subcommands

Config: .analyze.json or bunfig.toml [analyze] (roots, limit, ignore, complexity.threshold)

Options (scan / default):
  --roots=<dir1,dir2>   Roots (default: src,mcp-bun-docs,tools,.claude/core)
  --all                 Scan from cwd (wider reach)
  --depth=<n>            Max directory depth
  --ignore=<glob1,glob2> Exclude paths (e.g. **/*.test.ts,**/node_modules)
  --limit=<n>            Max rows (default: 25)
  --format=table|json|tree|dot  Output (tree/dot for classes; dot for deps import graph)
  --metrics             Include imports/exports (default: on)
  --no-metrics          Skip imports/exports columns
  --help, -h            This message

Examples:
  bun tools/analyze.ts
  bun tools/analyze.ts --limit=10
  bun tools/analyze.ts scan --all --format=json
  bun tools/analyze.ts scan --roots=src,mcp-bun-docs
  bun tools/analyze.ts deps --circular
  bun tools/analyze.ts complexity --threshold=15
  bun tools/analyze.ts types --props
  bun tools/analyze.ts props --limit=15
  bun tools/analyze.ts types --kind=interface
  bun tools/analyze.ts props --kind=class
`);
}

interface ScanRow {
	file: string;
	lines: number;
	imports?: number;
	exports?: number;
}

export async function runScan(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const glob = new Bun.Glob(GLOB_PATTERN);
	const rows: ScanRow[] = [];
	const roots = opts.all ? ["."] : opts.roots;

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				if (opts.depth != null) {
					const segs = path.split("/").length;
					const rootSegs = root === "." ? 0 : root.split("/").length;
					if (segs - rootSegs > opts.depth) continue;
				}
				const file = Bun.file(path);
				const text = await file.text();
				const lines = text.split(/\n/).length;
				const row: ScanRow = { file: path, lines };
				if (opts.metrics) {
					row.imports = (text.match(/^import\s+.+from\s+['"]/gm) || []).length;
					row.exports = (
						text.match(/^export\s+(const|function|class|interface|type|enum|async)/gm) ||
						[]
					).length;
				}
				rows.push(row);
			}
		} catch {
			// skip missing roots
		}
	}

	rows.sort((a, b) => b.lines - a.lines);
	const slice = rows.slice(0, opts.limit);

	if (opts.format === "json") {
		console.log(JSON.stringify({ total: rows.length, files: slice }, null, 2));
		return;
	}

	console.log("📂 Structure scan (top " + opts.limit + " by lines)\n");
	const cols = opts.metrics
		? ["file", "lines", "imports", "exports"]
		: ["file", "lines"];
	console.log(
		Bun.inspect.table(slice, cols as (keyof ScanRow)[], {
			colors: process.stdout.isTTY && !process.env.NO_COLOR,
		}),
	);
	console.log("\nTotal files scanned:", rows.length);
}

/** Extract property/member names from type body (interface/class/type alias). Heuristic. */
export function extractProps(
	text: string,
	kind: "interface" | "type" | "class",
): string[] {
	const props: string[] = [];
	if (kind === "interface" || kind === "type") {
		const keyMatch = text.match(/\b(\w+)\s*[?:]/g);
		if (keyMatch) {
			for (const k of keyMatch) {
				const name = k.replace(/\s*[?:].*$/, "").trim();
				if (name && name !== "constructor") props.push(name);
			}
		}
	}
	if (kind === "class") {
		const methodMatch = text.match(/(?:^\s*(?:async\s+)?(?:get|set)\s+)?(\w+)\s*[=(]/gm);
		if (methodMatch) {
			for (const m of methodMatch) {
				const name = m
					.replace(/\s*[=(].*$/, "")
					.replace(/^(?:async|get|set)\s+/, "")
					.trim();
				if (name && name !== "constructor") props.push(name);
			}
		}
	}
	return [...new Set(props)].slice(0, 20);
}

/** Find body block after declaration (single-level { ... }). */
function findTypeBody(text: string, afterIndex: number): string {
	let i = text.indexOf("{", afterIndex);
	if (i === -1) return "";
	let depth = 1;
	i += 1;
	const start = i;
	while (i < text.length && depth > 0) {
		const c = text[i];
		if (c === "{") depth++;
		else if (c === "}") depth--;
		i++;
	}
	return text.slice(start, i - 1);
}

const KIND_VALUES = ["interface", "type", "class", "enum"] as const;
type KindFilter = (typeof KIND_VALUES)[number] | null;

/** Extract enum member names from body (Name, or Name = value). */
export function extractEnumMembers(body: string): string[] {
	const names: string[] = [];
	const re = /(\w+)\s*(?:=\s*[^,}\n]+)?[,}]/g;
	let match;
	while ((match = re.exec(body)) !== null) names.push(match[1]);
	return [...new Set(names)].slice(0, 20);
}

export async function runTypes(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const withProps = opts.rest.includes("--props") || opts.cmd === "props";
	const kindArg = opts.rest.find((a) => a.startsWith("--kind="));
	const kindValue = kindArg ? kindArg.slice("--kind=".length) : null;
	const kindFilter: KindFilter =
		kindValue && KIND_VALUES.includes(kindValue as any)
			? (kindValue as KindFilter)
			: null;
	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const types: { name: string; file: string; kind: string; props?: string }[] = [];

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				const text = await Bun.file(path).text();
				const iface = [...text.matchAll(/export\s+interface\s+(\w+)/g)];
				const typeAlias = [...text.matchAll(/export\s+type\s+(\w+)\s*=/g)];
				const cls = [...text.matchAll(/export\s+class\s+(\w+)/g)];
				const enums = [...text.matchAll(/export\s+enum\s+(\w+)/g)];
				for (const m of iface) {
					const body = withProps ? findTypeBody(text, m.index! + m[0].length) : "";
					const props = withProps ? extractProps(body, "interface") : undefined;
					types.push({
						name: m[1],
						file: path,
						kind: "interface",
						...(props?.length ? { props: props.join(", ") } : {}),
					});
				}
				for (const m of typeAlias) {
					const body = withProps ? findTypeBody(text, m.index! + m[0].length) : "";
					const props = withProps ? extractProps(body, "type") : undefined;
					types.push({
						name: m[1],
						file: path,
						kind: "type",
						...(props?.length ? { props: props.join(", ") } : {}),
					});
				}
				for (const m of cls) {
					const body = withProps ? findTypeBody(text, m.index! + m[0].length) : "";
					const props = withProps ? extractProps(body, "class") : undefined;
					types.push({
						name: m[1],
						file: path,
						kind: "class",
						...(props?.length ? { props: props.join(", ") } : {}),
					});
				}
				for (const m of enums) {
					const body = withProps ? findTypeBody(text, m.index! + m[0].length) : "";
					const props = withProps ? extractEnumMembers(body) : undefined;
					types.push({
						name: m[1],
						file: path,
						kind: "enum",
						...(props?.length ? { props: props.join(", ") } : {}),
					});
				}
			}
		} catch {
			//
		}
	}

	const filtered = kindFilter ? types.filter((t) => t.kind === kindFilter) : types;
	const slice = filtered.slice(0, opts.limit) as {
		name: string;
		file: string;
		kind: string;
		props?: string;
		docUrl?: string;
	}[];
	if (opts.rest.includes("--xref")) {
		const resolver = await getDocResolver();
		if (resolver) {
			const xrefList: { term: string; url: string }[] = [];
			for (const row of slice) {
				const entry = resolver.getDocEntry(row.name);
				if (entry) {
					row.docUrl = resolver.buildDocUrl(entry.path);
					xrefList.push({ term: row.name, url: row.docUrl });
				}
			}
			if (opts.format === "json") {
				console.log(
					JSON.stringify(
						{
							total: filtered.length,
							kind: kindFilter ?? "all",
							types: slice,
							xref: xrefList,
						},
						null,
						2,
					),
				);
				return;
			}
		}
	}
	if (opts.format === "json") {
		console.log(
			JSON.stringify(
				{ total: filtered.length, kind: kindFilter ?? "all", types: slice },
				null,
				2,
			),
		);
		return;
	}
	let cols: string[] = withProps
		? ["name", "kind", "props", "file"]
		: ["name", "kind", "file"];
	if (slice.some((r) => r.docUrl)) cols = [...cols, "docUrl"];
	if (withProps && opts.format === "table") {
		slice.forEach((r) => {
			if (r.props && r.props.length > 52) r.props = r.props.slice(0, 49) + "…";
		});
	}
	const kindLabel = kindFilter ? " (" + kindFilter + " only)" : "";
	console.log(
		withProps
			? "📐 Types and properties (top " + opts.limit + kindLabel + ")\n"
			: "📐 Exported types (top " + opts.limit + kindLabel + ")\n",
	);
	console.log(
		Bun.inspect.table(slice, cols as (keyof (typeof types)[0])[], {
			colors: process.stdout.isTTY && !process.env.NO_COLOR,
		}),
	);
	console.log("\nTotal types:", filtered.length);
}

function resolveSpecToPath(
	fromPath: string,
	spec: string,
	normalizedToPath: Map<string, string>,
): string | null {
	if (!spec.startsWith(".") && !spec.startsWith("/")) return null; // skip node/bun packages
	const dir = fromPath.includes("/") ? fromPath.replace(/\/[^/]+$/, "") : ".";
	const candidate = (dir === "." ? spec : `${dir}/${spec}`).replace(/\/\.\//g, "/");
	const normalized = candidate.replace(/\/$/, "").replace(/\.tsx?$/, "");
	if (normalizedToPath.has(normalized)) return normalizedToPath.get(normalized)!;
	const withIndex = normalized + "/index";
	if (normalizedToPath.has(withIndex)) return normalizedToPath.get(withIndex)!;
	return null;
}

function findCycles(edges: Map<string, string[]>): string[][] {
	const cycles: string[][] = [];
	const stack: string[] = [];
	const index = new Map<string, number>();
	const lowlink = new Map<string, number>();
	let id = 0;
	const scc: string[] = [];

	function strong(v: string): void {
		index.set(v, id);
		lowlink.set(v, id);
		id++;
		stack.push(v);

		for (const w of edges.get(v) ?? []) {
			if (!index.has(w)) {
				strong(w);
				lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
			} else if (stack.includes(w)) {
				lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
			}
		}

		if (lowlink.get(v) === index.get(v)) {
			const comp: string[] = [];
			let w: string;
			do {
				w = stack.pop()!;
				comp.push(w);
			} while (w !== v);
			if (comp.length > 1) cycles.push(comp);
		}
	}

	for (const v of edges.keys()) {
		if (!index.has(v)) strong(v);
	}
	return cycles;
}

export async function runDeps(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const circular = opts.rest.includes("--circular");
	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const importsByFile = new Map<string, string[]>();
	const allPaths: string[] = [];

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				allPaths.push(path);
				const text = await Bun.file(path).text();
				const imps = (text.match(/^import\s+.+from\s+['"]([^'"]+)['"]/gm) || [])
					.map((line) => {
						const m = line.match(/from\s+['"]([^'"]+)['"]/);
						return m ? m[1] : "";
					})
					.filter(Boolean);
				if (imps.length) importsByFile.set(path, imps);
			}
		} catch {
			//
		}
	}

	const normalizedToPath = new Map<string, string>();
	for (const p of allPaths) {
		const n = p.replace(/\.tsx?$/, "");
		normalizedToPath.set(n, p);
		normalizedToPath.set(p, p);
	}

	const edges = new Map<string, string[]>();
	for (const [fromPath, specs] of importsByFile) {
		const toPaths: string[] = [];
		for (const spec of specs) {
			const to = resolveSpecToPath(fromPath, spec, normalizedToPath);
			if (to && to !== fromPath) toPaths.push(to);
		}
		if (toPaths.length) edges.set(fromPath, toPaths);
	}

	// G3: deps --format=dot — import graph as Graphviz DOT
	if (opts.format === "dot") {
		console.log("digraph imports {");
		for (const [fromPath, toPaths] of edges) {
			const fromId = '"' + fromPath.replace(/"/g, '\\"') + '"';
			for (const to of toPaths) {
				const toId = '"' + to.replace(/"/g, '\\"') + '"';
				console.log("  " + fromId + " -> " + toId + ";");
			}
		}
		console.log("}");
		return;
	}

	if (opts.format === "json") {
		const out: Record<string, unknown> = Object.fromEntries(importsByFile);
		if (circular) {
			const cycles = findCycles(edges);
			out.circular = cycles;
		}
		console.log(JSON.stringify(out, null, 2));
		return;
	}

	console.log("📦 Imports (sample)\n");
	const entries = [...importsByFile.entries()].slice(0, opts.limit);
	const rows = entries.map(([file, imps]) => ({
		file,
		imports: imps.length,
		sample: imps.slice(0, 3).join(", "),
	}));
	console.log(
		Bun.inspect.table(rows, ["file", "imports", "sample"], {
			colors: process.stdout.isTTY && !process.env.NO_COLOR,
		}),
	);
	console.log("\nTotal files with imports:", importsByFile.size);

	if (circular) {
		const cycles = findCycles(edges);
		if (cycles.length === 0) {
			console.log("\n🔄 No circular dependencies found.");
		} else {
			console.log("\n🔄 Circular dependencies (" + cycles.length + "):\n");
			for (let i = 0; i < cycles.length; i++) {
				const c = cycles[i];
				console.log("  " + (i + 1) + ". " + c.join(" → ") + " → " + c[0]);
			}
		}
	}
}

/** Simple complexity approximation based on code patterns */
function approxComplexity(text: string): number {
	// Count various complexity indicators
	const conditions = (text.match(/\b(if|else|switch|case|for|while|try|catch)\b/g) || [])
		.length;
	const nested = (text.match(/\b(if|for|while)\b.*\b(if|for|while)\b/gs) || []).length;
	const functions = (text.match(/\b(function|=>|class)\b/g) || []).length;
	const returns = (text.match(/\b(return)\b/g) || []).length;

	// Basic complexity score
	return conditions + nested * 2 + functions + Math.floor(returns / 2);
}

export async function runComplexity(
	opts: ReturnType<typeof parseArgs>,
	config: AnalyzeConfig,
): Promise<void> {
	const thresholdArg = opts.rest.find((a) => a.startsWith("--threshold="));
	const threshold = thresholdArg
		? Math.max(1, Number.parseInt(thresholdArg.slice("--threshold=".length), 10) || 10)
		: (config.complexity?.threshold ?? 10);
	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const rows: { file: string; lines: number; complexity: number }[] = [];

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				const text = await Bun.file(path).text();
				const lines = text.split(/\n/).length;
				const complexity = approxComplexity(text);
				if (complexity >= threshold) rows.push({ file: path, lines, complexity });
			}
		} catch {
			//
		}
	}
	rows.sort((a, b) => b.complexity - a.complexity);
	const slice = rows.slice(0, opts.limit);

	if (opts.format === "json") {
		console.log(
			JSON.stringify({ threshold, total: rows.length, files: slice }, null, 2),
		);
		return;
	}
	console.log("📊 Complexity (threshold ≥ " + threshold + ", top " + opts.limit + ")\n");
	console.log(
		Bun.inspect.table(slice, ["file", "lines", "complexity"], {
			colors: process.stdout.isTTY && !process.env.NO_COLOR,
		}),
	);
	console.log("\nFiles at or above threshold:", rows.length);
}

export async function runClasses(opts: ReturnType<typeof parseArgs>): Promise<void> {
	// G1: --inheritance = alias for "show tree" when format is table/json
	const useTree =
		opts.rest.includes("--inheritance") &&
		(opts.format === "table" || opts.format === "json");
	const effectiveFormat = useTree ? "tree" : opts.format;

	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const classList: { name: string; extends: string; file: string }[] = [];
	const nameToFile = new Map<string, string>();

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				const text = await Bun.file(path).text();
				const matches = [
					...text.matchAll(/export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?/g),
				];
				for (const m of matches) {
					const name = m[1];
					const ext = m[2] ?? "";
					classList.push({ name, extends: ext, file: path });
					nameToFile.set(name, path);
				}
			}
		} catch {
			//
		}
	}

	const parentToChildren = new Map<string, string[]>();
	for (const row of classList) {
		if (row.extends) {
			const list = parentToChildren.get(row.extends) ?? [];
			list.push(row.name);
			parentToChildren.set(row.extends, list);
		}
	}
	const treeRoots = [
		...new Set(
			classList
				.filter((r) => !r.extends || !nameToFile.has(r.extends))
				.map((r) => r.name),
		),
	];

	function buildTreeLines(parent: string, prefix: string): string[] {
		const children = parentToChildren.get(parent) ?? [];
		const lines: string[] = [];
		for (let i = 0; i < children.length; i++) {
			const isLast = i === children.length - 1;
			const branch = isLast ? "└── " : "├── ";
			lines.push(prefix + branch + children[i]);
			const nextPrefix = prefix + (isLast ? "    " : "│   ");
			lines.push(...buildTreeLines(children[i], nextPrefix));
		}
		return lines;
	}

	if (effectiveFormat === "dot") {
		console.log("digraph inheritance {");
		for (const row of classList) {
			if (row.extends) console.log('  "' + row.name + '" -> "' + row.extends + '";');
		}
		console.log("}");
		return;
	}

	if (effectiveFormat === "tree") {
		const out: string[] = [];
		for (const root of treeRoots) {
			out.push(root);
			out.push(...buildTreeLines(root, ""));
		}
		console.log(out.slice(0, opts.limit * 3).join("\n"));
		if (treeRoots.length === 0) console.log("(no exported classes with extends)");
		return;
	}

	const sliceWithXref = classList.slice(0, opts.limit) as {
		name: string;
		extends: string;
		file: string;
		docUrl?: string;
	}[];
	if (opts.rest.includes("--xref")) {
		const resolver = await getDocResolver();
		if (resolver) {
			const xrefList: { term: string; url: string }[] = [];
			for (const row of sliceWithXref) {
				const entry = resolver.getDocEntry(row.name);
				if (entry) {
					row.docUrl = resolver.buildDocUrl(entry.path);
					xrefList.push({ term: row.name, url: row.docUrl });
				}
			}
			if (effectiveFormat === "json") {
				console.log(
					JSON.stringify(
						{ total: classList.length, classes: sliceWithXref, xref: xrefList },
						null,
						2,
					),
				);
				return;
			}
		}
	}
	if (effectiveFormat === "json") {
		console.log(
			JSON.stringify({ total: classList.length, classes: sliceWithXref }, null, 2),
		);
		return;
	}
	const classCols: string[] = sliceWithXref.some((r) => r.docUrl)
		? ["name", "extends", "file", "docUrl"]
		: ["name", "extends", "file"];
	console.log("📊 Classes (top " + opts.limit + ")\n");
	console.log(
		Bun.inspect.table(sliceWithXref, classCols, {
			colors: process.stdout.isTTY && !process.env.NO_COLOR,
		}),
	);
	console.log("\nTotal classes:", classList.length);
}

/** G2: Optional line penalty — files over LINE_PENALTY_THRESHOLD get score scaled down. */
const LINE_PENALTY_THRESHOLD = 500;

export async function runStrength(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const weakest = opts.rest.includes("--weakest");
	const penalizeLines = opts.rest.includes("--penalize-lines");
	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const rows: {
		file: string;
		score: number;
		lines: number;
		complexity: number;
		exports: number;
	}[] = [];

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				const text = await Bun.file(path).text();
				const lines = text.split(/\n/).length;
				const complexity = approxComplexity(text);
				const exports = (
					text.match(/^export\s+(const|function|class|interface|type|enum|async)/gm) ||
					[]
				).length;
				let score = complexity <= 0 ? exports * 100 : (exports / (1 + complexity)) * 100;
				if (penalizeLines && lines > LINE_PENALTY_THRESHOLD) {
					score *= LINE_PENALTY_THRESHOLD / lines;
				}
				rows.push({
					file: path,
					score: Math.round(score * 10) / 10,
					lines,
					complexity,
					exports,
				});
			}
		} catch {
			//
		}
	}
	rows.sort((a, b) => (weakest ? a.score - b.score : b.score - a.score));
	const slice = rows.slice(0, opts.limit);

	if (opts.format === "json") {
		console.log(JSON.stringify({ total: rows.length, weakest, files: slice }, null, 2));
		return;
	}
	console.log(
		weakest
			? "📉 Weakest components (top " + opts.limit + ")\n"
			: "📈 Strongest components (top " + opts.limit + ")\n",
	);
	console.log(
		Bun.inspect.table(slice, ["file", "score", "lines", "complexity", "exports"], {
			colors: process.stdout.isTTY && !process.env.NO_COLOR,
		}),
	);
	console.log("\nTotal files:", rows.length);
}

export async function runRename(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const rest = opts.rest.filter((a) => !a.startsWith("--"));
	const oldName = rest[0];
	const newName = rest[1];
	const dryRun = !opts.rest.includes("--auto");
	const caseSensitive = opts.rest.includes("--case-sensitive");
	if (!oldName || !newName) {
		console.error(
			"Usage: bun tools/analyze.ts rename <OldName> <NewName> [--dry-run] [--auto] [--case-sensitive]",
		);
		process.exit(1);
	}
	const flags = caseSensitive ? "g" : "gi";
	const wordRe = new RegExp(
		"\\b" + oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
		flags,
	);
	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const hits: { file: string; line: number; snippet: string }[] = [];
	const filesToEdit: string[] = [];

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				const text = await Bun.file(path).text();
				const lines = text.split("\n");
				let hasMatch = false;
				for (let i = 0; i < lines.length; i++) {
					if (lines[i].match(wordRe)) {
						hits.push({
							file: path,
							line: i + 1,
							snippet: lines[i].trim().slice(0, 60),
						});
						hasMatch = true;
					}
				}
				if (hasMatch) filesToEdit.push(path);
			}
		} catch {
			//
		}
	}

	if (dryRun) {
		console.log("Rename (dry-run): " + oldName + " → " + newName + "\n");
		if (hits.length === 0) {
			console.log("No occurrences found.");
			return;
		}
		const slice = hits.slice(0, opts.limit);
		console.log(
			Bun.inspect.table(slice, ["file", "line", "snippet"], {
				colors: process.stdout.isTTY && !process.env.NO_COLOR,
			}),
		);
		console.log(
			"\nTotal occurrences: " +
				hits.length +
				" in " +
				filesToEdit.length +
				" files. Run with --auto to apply.",
		);
		return;
	}

	for (const path of filesToEdit) {
		let text = await Bun.file(path).text();
		text = text.replace(wordRe, newName);
		await Bun.write(path, text);
	}
	console.log(
		"Renamed " + oldName + " → " + newName + " in " + filesToEdit.length + " files.",
	);
}

/** Collect binding names from a single import line (type-only imports excluded for simplicity). */
function getImportBindings(line: string): string[] {
	const names: string[] = [];
	const mDefault = line.match(/import\s+(\w+)\s+from\s+['"]/);
	if (mDefault) names.push(mDefault[1]);
	const mStar = line.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]/);
	if (mStar) names.push(mStar[1]);
	const mNamed = line.match(/\{\s*([^}]+)\s*\}\s*from\s+['"]/);
	if (mNamed) {
		for (const part of mNamed[1].split(",")) {
			const as = part.match(/(\w+)\s+as\s+(\w+)/);
			names.push(as ? as[2] : (part.trim().split(/\s/)[0] ?? ""));
		}
	}
	return names.filter(Boolean);
}

/** Check if any of the bindings appear in text (word boundary). */
function anyBindingUsed(bindings: string[], text: string): boolean {
	for (const b of bindings) {
		const re = new RegExp("\\b" + b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
		if (re.test(text)) return true;
	}
	return false;
}

export async function runPolish(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const dryRun = !opts.rest.includes("--auto") && !opts.rest.includes("--fix-imports");
	const glob = new Bun.Glob(GLOB_PATTERN);
	const roots = opts.all ? ["."] : opts.roots;
	const changes: { file: string; removed: string }[] = [];

	for (const root of roots) {
		try {
			for await (const f of glob.scan({ cwd: root, onlyFiles: true })) {
				const path = root === "." ? f : `${root}/${f}`;
				if (opts.ignorePatterns.length && matchesIgnore(path, opts.ignorePatterns))
					continue;
				const text = await Bun.file(path).text();
				const lines = text.split("\n");
				const newLines: string[] = [];
				let modified = false;
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const importMatch = line.match(/^\s*import\s+.+from\s+['"]/);
					if (!importMatch) {
						newLines.push(line);
						continue;
					}
					const bindings = getImportBindings(line);
					if (bindings.length === 0) {
						newLines.push(line);
						continue;
					}
					const restOfFile = lines.slice(i + 1).join("\n") + "\n" + newLines.join("\n");
					if (anyBindingUsed(bindings, restOfFile)) {
						newLines.push(line);
					} else {
						modified = true;
						changes.push({ file: path, removed: line.trim().slice(0, 60) });
					}
				}
				if (modified && !dryRun) {
					await Bun.write(path, newLines.join("\n"));
				}
			}
		} catch {
			//
		}
	}

	if (dryRun) {
		console.log("Polish (dry-run): unused imports\n");
		if (changes.length === 0) {
			console.log("No unused imports found.");
			return;
		}
		const slice = changes.slice(0, opts.limit);
		console.log(
			Bun.inspect.table(slice, ["file", "removed"], {
				colors: process.stdout.isTTY && !process.env.NO_COLOR,
			}),
		);
		console.log(
			"\nTotal: " +
				changes.length +
				" unused import(s). Run with --fix-imports or --auto to remove.",
		);
		return;
	}
	console.log("Removed " + changes.length + " unused import(s).");
}

/** 4.2: Subcommand xref — resolve term to Bun doc URL via mcp-bun-docs. */
export async function runXref(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const term = opts.rest.filter((a) => !a.startsWith("--"))[0];
	if (!term) {
		console.error("Usage: bun tools/analyze.ts xref <term>");
		process.exit(1);
	}
	const resolver = await getDocResolver();
	if (!resolver) {
		console.error("xref: mcp-bun-docs not available");
		process.exit(1);
	}
	const entry = resolver.getDocEntry(term);
	if (opts.format === "json") {
		const xref = entry ? [{ term, url: resolver.buildDocUrl(entry.path) }] : [];
		console.log(JSON.stringify({ term, xref }, null, 2));
		return;
	}
	if (!entry) {
		console.log("No doc entry for: " + term);
		return;
	}
	console.log(resolver.buildDocUrl(entry.path));
}

const BENCH_COMMANDS = [
	"scan",
	"types",
	"deps",
	"complexity",
	"classes",
	"strength",
] as const;

async function runCoverage(opts: ReturnType<typeof parseArgs>): Promise<void> {
	const passthrough = opts.rest.filter(
		(a) => a !== "--coverage" && !a.startsWith("--roots="),
	);
	// Only pass --roots= dirs to bun test when user explicitly passed --roots= (else full suite)
	const rootsExplicit = process.argv.some((a) => a.startsWith("--roots="));
	const rootsToPass = rootsExplicit ? opts.roots : [];
	const args = [process.execPath, "test", "--coverage", ...rootsToPass, ...passthrough];
	const proc = Bun.spawn(args, {
		cwd: process.cwd(),
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});
	const exitCode = await proc.exited;
	process.exit(exitCode ?? 0);
}

async function runBench(
	opts: ReturnType<typeof parseArgs>,
	config: AnalyzeConfig,
): Promise<void> {
	const benchFormat = opts.rest.some((a) => a.startsWith("--bench-format="))
		? (opts.rest
				.find((a) => a.startsWith("--bench-format="))!
				.slice("--bench-format=".length) as "table" | "json")
		: "table";
	const roots = opts.roots.join(",");
	const scriptPath = import.meta.path;
	const rows: {
		command: string;
		ms: number;
		files: number | string;
		filesPerSec: number | string;
	}[] = [];

	for (const cmd of BENCH_COMMANDS) {
		const t0 = Bun.nanoseconds();
		const proc = Bun.spawn(
			[process.execPath, scriptPath, cmd, `--roots=${roots}`, "--format=json"],
			{ cwd: process.cwd(), stdout: "pipe", stderr: "pipe" },
		);
		await proc.exited;
		const ms = (Bun.nanoseconds() - t0) / 1e6;
		let files: number | string = 0;
		try {
			const out = await new Response(proc.stdout).text();
			const j = JSON.parse(out) as Record<string, unknown>;
			files = (
				typeof j.total === "number" ? j.total : ((j.files as unknown[])?.length ?? 0)
			) as number;
		} catch {
			files = "-";
		}
		const filesPerSec =
			typeof files === "number" && files > 0 && ms > 0
				? Math.round(files / (ms / 1000))
				: "-";
		rows.push({ command: cmd, ms: Math.round(ms), files, filesPerSec });
	}

	if (benchFormat === "json") {
		console.log(
			JSON.stringify(
				{ benchmark: "analyze", commands: rows, timestamp: Date.now() },
				null,
				2,
			),
		);
	} else {
		console.log("⏱️ Analyze benchmark (read-only commands)\n");
		console.log(
			Bun.inspect.table(rows, ["command", "ms", "files", "filesPerSec"], {
				colors: process.stdout.isTTY && !process.env.NO_COLOR,
			}),
		);
	}

	// Broadcast plan status to MCP realtime
	try {
		const { updateAnalyzePlanStatus } = await import("./analyze-plan-status.ts");
		await updateAnalyzePlanStatus({
			stage: "2.x",
			completed: ["2.1", "2.2"],
			message: "Bench harness + entry done",
		});
	} catch {
		// Plan status updater optional
	}
}

async function main(): Promise<void> {
	const config = await loadConfig();
	const opts = parseArgs(process.argv, config);

	if (opts.cmd === "help" || opts.cmd === "") {
		usage();
		process.exit(0);
	}

	switch (opts.cmd) {
		case "scan":
			await runScan(opts);
			break;
		case "types":
		case "props":
			await runTypes(opts);
			break;
		case "deps":
			await runDeps(opts);
			break;
		case "complexity":
			await runComplexity(opts, config);
			break;
		case "classes":
			await runClasses(opts);
			break;
		case "strength":
			await runStrength(opts);
			break;
		case "rename":
			await runRename(opts);
			break;
		case "polish":
			await runPolish(opts);
			break;
		case "xref":
			await runXref(opts);
			break;
		case "coverage":
			await runCoverage(opts);
			break;
		case "bench":
			await runBench(opts, config);
			break;
		default:
			usage();
			process.exit(0);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
