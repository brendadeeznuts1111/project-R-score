#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: Column Standards CLI - Phase 3.29
 *
 * God-tier interactive surface for matrix column exploration:
 * - get, list, search, validate commands
 * - Zone shortcuts: tension, cloudflare, chrome
 * - Fuzzy search across name/owner/description
 * - Full validation of required fields
 * - Interactive mode, config persistence, shell integration
 * - Tab-completion (--complete), fuzzy zone/ID suggest, auto-export teaser
 *
 * @module column-standards-all
 * @tier 1380-OMEGA-96COL
 * @phase 3.29
 */

import fuzzysort from "fuzzysort";
import {
	type ColumnDefinition,
	getColumn,
	getColumnsByTeam,
	getColumnsByZone,
	getZoneForColumnIndex,
	MATRIX_COLUMNS,
	ZONES,
} from "./column-standards-index.ts";

// Re-exports for consumers (test-matrix-90, matrix-cli, bench-matrix-90)
export const ALL_COLUMNS_91 = MATRIX_COLUMNS;
export { getColumn, getColumnsByTeam, getColumnsByZone, getZoneForColumnIndex, ZONES };

// ═════════════════════════════════════════════════════════════════════════════
// BUN UTILITIES - Leveraging Bun's native capabilities
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Securely hash sensitive values using Bun's built-in argon2id
 */
async function secureHash(value: string): Promise<string> {
	return await Bun.password.hash(value, { algorithm: "argon2id" });
}

/**
 * Verify a hashed value
 */
async function secureVerify(value: string, hash: string): Promise<boolean> {
	return await Bun.password.verify(value, hash);
}

/**
 * Deep compare two objects using Bun's deepEquals
 */
function deepEqual(obj1: unknown, obj2: unknown): boolean {
	return Bun.deepEquals(obj1, obj2);
}

/**
 * Get high-resolution timestamp using Bun.nanoseconds()
 */
function getNanoTime(): bigint {
	return Bun.nanoseconds();
}

/**
 * Format nanoseconds to human-readable duration
 */
function formatNanoDuration(nanos: bigint): string {
	const ms = Number(nanos) / 1000000;
	if (ms < 1) return `${(Number(nanos) / 1000).toFixed(0)}μs`;
	if (ms < 1000) return `${ms.toFixed(1)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Debounce utility for preventing rapid-fire executions
 */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	return ((...args: Parameters<T>) => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	}) as T;
}

/**
 * Check if a command exists in PATH using Bun.which()
 * Used for dependency detection (jq, rg, etc.)
 */
function checkCommand(cmd: string): { exists: boolean; path: string | null } {
	const path = Bun.which(cmd);
	return { exists: path !== null, path };
}

/**
 * Display data as a formatted table using Bun.inspect.table()
 * https://bun.sh/docs/runtime/utils
 */
function displayTable(data: Record<string, unknown>[], columns?: string[]): void {
	if (data.length === 0) {
		console.log("No data to display");
		return;
	}

	// Use Bun.inspect.table for consistent formatting
	const tableConfig = columns
		? {
				columns: columns.reduce((acc, col) => ({ ...acc, [col]: { title: col } }), {}),
			}
		: undefined;

	console.log(Bun.inspect.table(data, tableConfig as any));
}

// ═════════════════════════════════════════════════════════════════════════════
// CONFIG MANAGEMENT - With secure password hashing for sensitive values
// ═════════════════════════════════════════════════════════════════════════════

interface CliConfig {
	version: string;
	cli: {
		defaultOutput: string;
		colors: boolean;
		pager: boolean;
		jsonCompact: boolean;
	};
	favorites: number[];
	aliases: Record<string, string>;
	shortcuts: Record<string, number>;
	// Encrypted sensitive values (API keys, tokens, etc.)
	secrets?: Record<string, string>; // stored as bcrypt hashes
}

const DEFAULT_CONFIG: CliConfig = {
	version: "3.29.0",
	cli: {
		defaultOutput: "table",
		colors: true,
		pager: false,
		jsonCompact: false,
	},
	favorites: [],
	aliases: {},
	shortcuts: {},
	secrets: {},
};

let config: CliConfig = { ...DEFAULT_CONFIG };

async function loadConfig(): Promise<void> {
	try {
		const configPath = `${import.meta.dir}/column-standards-config.json`;
		const file = await Bun.file(configPath).text();
		const loaded = JSON.parse(file);
		config = { ...DEFAULT_CONFIG, ...loaded, secrets: loaded.secrets || {} };
	} catch {
		// Use defaults if no config file
	}
}

async function saveConfig(): Promise<void> {
	const configPath = `${import.meta.dir}/column-standards-config.json`;
	// Check for config changes before saving
	const currentConfig = JSON.stringify(config, null, 2);
	const savedConfig = await Bun.file(configPath).text();
	if (!deepEqual(JSON.parse(currentConfig), JSON.parse(savedConfig || "{}"))) {
		await Bun.write(configPath, currentConfig);
	}
}

const args = Bun.argv.slice(2);
const cmd = args[0]?.toLowerCase();

// ═════════════════════════════════════════════════════════════════════════════
// TAB-COMPLETION (--complete / --install-complete) — run before alias resolution
// ═════════════════════════════════════════════════════════════════════════════

const COMPLETION_COMMANDS = [
	"list",
	"get",
	"search",
	"validate",
	"stats",
	"zones",
	"tension",
	"cloudflare",
	"chrome",
	"core",
	"validation",
	"watch",
	"export",
	"preview",
	"pipe",
	"find",
	"interactive",
	"fav",
	"config",
	"doctor",
	"matrix",
	"shortcuts",
	"flags",
	"version",
	"help",
];
const COMPLETION_ZONES = Object.keys(ZONES);
const COMPLETION_COL_IDS = Object.keys(MATRIX_COLUMNS)
	.map(Number)
	.sort((a, b) => a - b)
	.map(String);

const OMEGA_HISTORY_FILE = `${process.env["HOME"] || process.env["USERPROFILE"] || "~"}/.omega-cols-history`;

async function getHistoryTermsAsync(): Promise<string[]> {
	try {
		const exists = await Bun.file(OMEGA_HISTORY_FILE).exists();
		if (!exists) return [];
		const content = await Bun.file(OMEGA_HISTORY_FILE).text();
		return content.split("\n").filter(Boolean).slice(-50);
	} catch {
		return [];
	}
}

async function appendSearchToHistory(term: string): Promise<void> {
	if (!term?.trim()) return;
	try {
		const exists = await Bun.file(OMEGA_HISTORY_FILE).exists();
		let lines = exists
			? (await Bun.file(OMEGA_HISTORY_FILE).text()).split("\n").filter(Boolean)
			: [];
		lines = lines.filter((t) => t !== term);
		lines.push(term);
		lines = lines.slice(-100);
		await Bun.write(OMEGA_HISTORY_FILE, lines.join("\n") + "\n");
	} catch {
		// Non-critical
	}
}

if (args[0] === "--complete") {
	const word = (args[1] ?? "").toLowerCase();
	const prev = (args[2] ?? "").toLowerCase();
	let suggests: string[] = [];
	const emptyMeansAll = (arr: string[]) =>
		!word.trim()
			? arr
			: fuzzysort.go(word, arr, { threshold: -10000 }).map((r) => r.target);
	if (!prev) {
		suggests = emptyMeansAll(COMPLETION_COMMANDS);
	} else if (prev === "get") {
		suggests = emptyMeansAll(COMPLETION_COL_IDS);
	} else if (prev === "search") {
		const searchCandidates = [...COMPLETION_ZONES];
		try {
			const hist = await getHistoryTermsAsync();
			searchCandidates.push(...hist);
		} catch {
			// fallback
		}
		const uniq = [...new Set(searchCandidates)];
		suggests = emptyMeansAll(uniq);
	} else {
		suggests = emptyMeansAll(COMPLETION_COMMANDS);
	}
	console.log(suggests.join("\n"));
	process.exit(0);
}

const columns = MATRIX_COLUMNS as Record<number, ColumnDefinition>;

// Track current view for auto-reprint after reload
let currentMode: string | null = null;
let currentFilter: string | undefined;
let currentTarget: string | undefined;

// ═════════════════════════════════════════════════════════════════════════════
// COLOR & FORMATTING
// ═════════════════════════════════════════════════════════════════════════════

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	orange: "\x1b[38;5;208m",
	purple: "\x1b[38;5;141m",
};

// ═════════════════════════════════════════════════════════════════════════════
// HANDLE --install-complete AFTER COLORS ARE AVAILABLE
// ═════════════════════════════════════════════════════════════════════════════

if (args[0] === "--install-complete") {
	const scriptPath = `${import.meta.dir}/column-standards-all.ts`;
	const alias = "matrix-cols"; // matches bun matrix:cols muscle memory

	console.log(
		`\n🚀 Installing tab-completion for ${COLORS.cyan}${alias}${COLORS.reset}...\n`,
	);

	console.log(
		`${COLORS.bold}Add ONE of these lines to your shell config:${COLORS.reset}\n`,
	);

	console.log(
		`${COLORS.yellow}# ─── Bash / Zsh ───────────────────────────────────────${COLORS.reset}`,
	);
	console.log(
		`${COLORS.green}complete -C "bun run ${scriptPath}" ${alias}${COLORS.reset}`,
	);

	console.log(
		`\n${COLORS.yellow}# ─── Fish ─────────────────────────────────────────────${COLORS.reset}`,
	);
	console.log(
		`${COLORS.green}complete -c ${alias} -a "(bun run ${scriptPath} --complete (commandline -ct))"${COLORS.reset}`,
	);

	console.log(
		`\n${COLORS.dim}After adding, run: source ~/.zshrc  (or ~/.bashrc)${COLORS.reset}`,
	);
	console.log(`${COLORS.dim}Then enjoy: ${alias} g[TAB] → get${COLORS.reset}`);
	console.log(
		`${COLORS.dim}         ${alias} get 4[TAB] → 41 42 45 ...${COLORS.reset}\n`,
	);

	process.exit(0);
}

function header(text: string): void {
	console.log(
		`${COLORS.bold}${COLORS.orange}🔥 Tier-1380 OMEGA:${COLORS.reset} ${text}`,
	);
}

function subheader(text: string): void {
	console.log(`${COLORS.cyan}${text}${COLORS.reset}`);
}

function error(text: string): void {
	console.log(`${COLORS.red}❌ ${text}${COLORS.reset}`);
}

function success(text: string): void {
	console.log(`${COLORS.green}✅ ${text}${COLORS.reset}`);
}

function warning(text: string): void {
	console.log(`${COLORS.yellow}⚠️  ${text}${COLORS.reset}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// COLUMN PRINTING
// ═════════════════════════════════════════════════════════════════════════════

function printCol(id: string | number): void {
	const colId = typeof id === "string" ? Number.parseInt(id, 10) : id;
	if (Number.isNaN(colId)) {
		error(`Invalid column id: ${id}`);
		process.exit(1);
	}

	const col = columns[colId];
	if (!col) {
		error(`Column ${colId} not found`);
		process.exit(1);
	}

	// If JSON mode, just output the JSON
	if (JSON_MODE) {
		console.log(JSON.stringify(col, null, 2));
		return;
	}

	header(`Column ${colId}`);
	console.log();

	// Main info box
	console.log(
		`${COLORS.bold}${col.color} ┌────────────────────────────────────────${COLORS.reset}`,
	);
	console.log(`${col.color} │${COLORS.reset} ${COLORS.bold}${col.name}${COLORS.reset}`);
	console.log(
		`${col.color} │${COLORS.reset} ${COLORS.dim}Index:${COLORS.reset} ${col.index}  ${COLORS.dim}Zone:${COLORS.reset} ${col.zone}  ${COLORS.dim}Owner:${COLORS.reset} ${col.owner}`,
	);
	console.log(
		`${col.color} │${COLORS.reset} ${COLORS.dim}Type:${COLORS.reset} ${col.type}  ${COLORS.dim}Required:${COLORS.reset} ${col.required ? "✓ yes" : "○ no"}`,
	);
	console.log(`${col.color} └────────────────────────────────────────${COLORS.reset}`);
	console.log();

	if (col.description) {
		subheader("Description:");
		console.log(`  ${col.description}`);
		console.log();
	}

	// Optional fields
	const optionalFields: [string, unknown][] = [
		["Values", col.values?.join(", ")],
		["Range", col.range ? `[${col.range[0]}, ${col.range[1]}]` : undefined],
		["Unit", col.unit],
		["Precision", col.precision],
		["Trigger", col.trigger],
		["Warning", col.warning],
		["Critical", col.critical],
		["Formula", col.formula],
		["Pattern", col.pattern],
		["Protocol", col.protocol],
		["Example", col.example],
		["Format", col.format],
		["Default", col.default],
		["Alias", col.alias],
		["Alert", col.alert],
		["Profile Link", col.profileLink ? "Yes" : undefined],
	];

	const definedFields = optionalFields.filter(([, val]) => val !== undefined);
	if (definedFields.length > 0) {
		subheader("Properties:");
		for (const [key, val] of definedFields) {
			console.log(`  ${COLORS.dim}${key.padEnd(12)}${COLORS.reset} ${val}`);
		}
		console.log();
	}

	// URI Pattern
	if (col.uriPattern) {
		subheader("URI Pattern:");
		console.log(
			`  ${COLORS.cyan}${col.uriPattern.protocol || "https"}://${col.uriPattern.hostname || "..."}${col.uriPattern.pathname || ""}${COLORS.reset}`,
		);
		if (col.uriPattern.query) {
			console.log(
				`  ${COLORS.dim}Query params:${COLORS.reset}`,
				JSON.stringify(col.uriPattern.query),
			);
		}
		console.log();
	}

	// Full JSON for piping
	subheader("Full Definition (JSON):");
	console.log(JSON.stringify(col, null, 2));
}

// ═════════════════════════════════════════════════════════════════════════════
// LISTING & FILTERING
// ═════════════════════════════════════════════════════════════════════════════

function listAll(filter?: string): void {
	const allCols = Object.values(columns);

	// Apply filter if provided
	let filtered = allCols;
	if (filter) {
		const filterLower = filter.toLowerCase();
		filtered = allCols.filter((col) => {
			const idMatch = String(col.index).includes(filter);
			const nameMatch = col.name?.toLowerCase().includes(filterLower);
			const ownerMatch = col.owner?.toLowerCase().includes(filterLower);
			const zoneMatch = col.zone?.toLowerCase().includes(filterLower);
			const descMatch = col.description?.toLowerCase().includes(filterLower);
			const typeMatch = col.type?.toLowerCase().includes(filterLower);
			return idMatch || nameMatch || ownerMatch || zoneMatch || descMatch || typeMatch;
		});
	}

	header(`Column Standards (${filtered.length}/${allCols.length} total)`);
	console.log();

	// Group by zone for better readability
	const byZone = new Map<string, ColumnDefinition[]>();
	for (const col of filtered) {
		const zoneCols = byZone.get(col.zone) || [];
		zoneCols.push(col);
		byZone.set(col.zone, zoneCols);
	}

	// Sort zones by index order
	const zoneOrder = [
		"default",
		"core",
		"security",
		"cloudflare",
		"tension",
		"infra",
		"validation",
		"chrome",
		"extensibility",
		"skills",
	];

	for (const zone of zoneOrder) {
		const zoneCols = byZone.get(zone);
		if (!zoneCols || zoneCols.length === 0) continue;

		const zoneMeta = ZONES[zone as keyof typeof ZONES];
		const zoneEmoji = zoneMeta?.emoji || "•";
		console.log(
			`${zoneEmoji} ${COLORS.bold}${zone.toUpperCase()}${COLORS.reset} (${zoneCols.length})`,
		);

		for (const col of zoneCols.sort((a, b) => a.index - b.index)) {
			const profileIcon = col.profileLink ? " 🔗" : "";
			const namePadded = col.name.padEnd(28);
			const ownerPadded = col.owner.padEnd(10);
			console.log(
				`  ${col.color}${String(col.index).padStart(2)}${COLORS.reset} ${namePadded} ${COLORS.dim}${ownerPadded}${COLORS.reset} ${col.type}${profileIcon}`,
			);
		}
		console.log();
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// FUZZY SEARCH (fuzzysort-ranked + top-3 preview + history)
// ═════════════════════════════════════════════════════════════════════════════

function search(term: string): void {
	if (!term) {
		error("Search term required");
		console.log("Usage: bun matrix/column-standards-all.ts search <term>");
		process.exit(1);
	}

	header(`Searching columns for "${term}"...`);
	console.log();

	const searchable = Object.entries(columns).map(([id, def]) => ({
		id,
		name: def.name ?? "",
		owner: def.owner ?? "",
		description: def.description ?? "",
		zone: def.zone ?? "",
		type: def.type ?? "",
		def,
	}));

	const results = fuzzysort.go(term, searchable, {
		keys: ["name", "owner", "description", "zone", "type", "id"],
		threshold: -10000,
	});

	const hits = results.map((r) => [r.obj.id, r.obj.def] as [string, ColumnDefinition]);

	if (hits.length === 0) {
		warning("No matches found.");
		console.log();
		console.log(`${COLORS.dim}Try searching for:${COLORS.reset}`);
		console.log(`  • Zone names: "tension", "cloudflare", "chrome"`);
		console.log(`  • Types: "url", "float", "enum", "boolean"`);
		console.log(`  • Owners: "runtime", "platform", "infra"`);
		console.log(`  • Column names: "profile", "cookie", "anomaly"`);
		return;
	}

	// Top 3 preview inline
	const top3 = hits.slice(0, 3);
	subheader("Top 3 hits:");
	for (const [id, def] of top3) {
		console.log(`  ${def.color}${id}${COLORS.reset} ${def.name} (${def.zone})`);
	}
	console.log();

	success(`${hits.length} match${hits.length === 1 ? "" : "es"} found`);
	console.log();

	for (const [id, def] of hits) {
		console.log(`${def.color}┌── Column ${id}: ${def.name}${COLORS.reset}`);
		console.log(
			`${def.color}│${COLORS.reset}  Owner: ${COLORS.cyan}${def.owner}${COLORS.reset}  Zone: ${def.zone}  Type: ${def.type}`,
		);
		if (def.description) {
			const desc =
				def.description.length > 60
					? `${def.description.slice(0, 57)}...`
					: def.description;
			console.log(
				`${def.color}│${COLORS.reset}  Desc:  ${COLORS.dim}${desc}${COLORS.reset}`,
			);
		}
		if (def.uriPattern) {
			const uri = `${def.uriPattern.protocol || "https"}://${def.uriPattern.hostname}${def.uriPattern.pathname || ""}`;
			console.log(
				`${def.color}│${COLORS.reset}  URI:   ${COLORS.purple}${uri}${COLORS.reset}`,
			);
		}
		console.log();
	}

	appendSearchToHistory(term).catch(() => null);
}

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION (+ auto-export teaser on success)
// ═════════════════════════════════════════════════════════════════════════════

async function promptExportTeaser(): Promise<void> {
	process.stdout.write(
		`${COLORS.green}🟢 All columns valid – Export to column-standards.md? [y/n]${COLORS.reset} `,
	);
	const reader = Bun.stdin.stream().getReader();
	const { value } = await reader.read();
	reader.releaseLock();
	const input = value ? new TextDecoder().decode(value).trim().toLowerCase() : "";
	if (input === "y" || input === "yes") {
		await exportToMarkdown("column-standards.md");
	}
}

async function validate(): Promise<void> {
	header("Validating column standards schema...");
	console.log();

	let errors = 0;
	let warnings = 0;
	const errorList: string[] = [];
	const warningList: string[] = [];

	Object.entries(columns).forEach(([id, def]) => {
		const issues: string[] = [];

		if (!def.name) issues.push("missing name");
		if (!def.owner) issues.push("missing owner");
		if (!def.color) issues.push("missing color");
		if (!def.type) issues.push("missing type");
		if (!def.zone) issues.push("missing zone");
		if (def.index === undefined) issues.push("missing index");
		if (def.required === undefined) issues.push("missing required flag");

		// Type-specific validations
		if (def.type === "float" && def.range && def.range.length !== 2) {
			issues.push("float type should have range [min, max]");
		}
		if (def.type === "enum" && (!def.values || def.values.length === 0)) {
			warnings++;
			warningList.push(`Col ${id}: enum type should have values array`);
		}
		if (def.type === "url" && !def.pattern && !def.uriPattern) {
			warnings++;
			warningList.push(`Col ${id}: url type should have pattern or uriPattern`);
		}

		if (issues.length > 0) {
			errors += issues.length;
			errorList.push(`Col ${id} (${def.name || "unnamed"}): ${issues.join(", ")}`);
		}
	});

	// Summary
	console.log(`${COLORS.bold}Schema:${COLORS.reset}`);
	console.log(`  Total columns: ${Object.keys(columns).length}`);
	console.log(`  Zones: ${Object.keys(ZONES).length}`);
	console.log();

	if (errors === 0 && warnings === 0) {
		success("All columns valid! 🎉");
		await promptExportTeaser();
	} else {
		if (errors > 0) {
			error(`${errors} validation error${errors === 1 ? "" : "s"}`);
			for (const err of errorList) {
				console.log(`  ${COLORS.red}•${COLORS.reset} ${err}`);
			}
		}
		if (warnings > 0) {
			console.log();
			warning(`${warnings} warning${warnings === 1 ? "" : "s"}`);
			for (const warn of warningList.slice(0, 10)) {
				console.log(`  ${COLORS.yellow}•${COLORS.reset} ${warn}`);
			}
			if (warningList.length > 10) {
				console.log(
					`  ${COLORS.dim}... and ${warningList.length - 10} more${COLORS.reset}`,
				);
			}
		}
		console.log();
		process.exit(1);
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// ZONE SHORTCUTS
// ═════════════════════════════════════════════════════════════════════════════

function listZone(zoneName: string): void {
	const zone = ZONES[zoneName as keyof typeof ZONES];
	if (!zone) {
		error(`Unknown zone: ${zoneName}`);
		console.log();
		console.log("Available zones:");
		for (const [name, meta] of Object.entries(ZONES)) {
			console.log(`  ${meta.emoji} ${name.padEnd(13)} cols ${meta.start}-${meta.end}`);
		}
		process.exit(1);
	}

	const zoneCols = Object.values(columns).filter((col) => col.zone === zoneName);

	header(`${zone.emoji} ${zoneName.toUpperCase()} Zone (${zoneCols.length} columns)`);
	console.log();
	console.log(`${COLORS.dim}Team:${COLORS.reset} ${zone.team}`);
	console.log(`${COLORS.dim}Range:${COLORS.reset} columns ${zone.start}-${zone.end}`);
	if (zone.description) {
		console.log(`${COLORS.dim}Desc:${COLORS.reset} ${zone.description}`);
	}
	console.log();

	for (const col of zoneCols.sort((a, b) => a.index - b.index)) {
		const profileIcon = col.profileLink ? " 🔗" : "";
		const reqIcon = col.required ? " ✓" : "";
		console.log(
			`  ${col.color}${String(col.index).padStart(2)}${COLORS.reset} ${col.name.padEnd(28)} ${col.type}${profileIcon}${reqIcon}`,
		);
		if (col.description) {
			const desc =
				col.description.length > 50
					? `${col.description.slice(0, 47)}...`
					: col.description;
			console.log(`      ${COLORS.dim}${desc}${COLORS.reset}`);
		}
	}
	console.log();
}

function listChrome(): void {
	// Chrome columns are 71-75 (also part of validation zone)
	const chromeCols = Object.values(columns).filter(
		(col) => col.index >= 71 && col.index <= 75,
	);

	header("🔷 Chrome State Columns (71-75)");
	console.log();
	console.log(`${COLORS.dim}Team:${COLORS.reset} platform`);
	console.log(`${COLORS.dim}Purpose:${COLORS.reset} Chrome state & cookie management`);
	console.log();

	for (const col of chromeCols) {
		console.log(
			`  ${col.color}${String(col.index).padStart(2)}${COLORS.reset} ${col.name.padEnd(24)} ${col.type}`,
		);
		if (col.description) {
			console.log(`      ${COLORS.dim}${col.description}${COLORS.reset}`);
		}
		if (col.uriPattern) {
			const uri = `${col.uriPattern.protocol}://${col.uriPattern.hostname}${col.uriPattern.pathname}`;
			console.log(`      ${COLORS.purple}→ ${uri}${COLORS.reset}`);
		}
	}
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// STATS & INFO
// ═════════════════════════════════════════════════════════════════════════════

function showStats(): void {
	const allCols = Object.values(columns);

	// If JSON mode, output structured data
	if (JSON_MODE) {
		const byZone: Record<string, number> = {};
		for (const [name, _meta] of Object.entries(ZONES)) {
			byZone[name] = allCols.filter((c) => c.zone === name).length;
		}

		const byOwner: Record<string, number> = {};
		for (const col of allCols) {
			byOwner[col.owner] = (byOwner[col.owner] || 0) + 1;
		}

		const byType: Record<string, number> = {};
		for (const col of allCols) {
			byType[col.type] = (byType[col.type] || 0) + 1;
		}

		console.log(
			JSON.stringify(
				{
					totalColumns: allCols.length,
					totalZones: Object.keys(ZONES).length,
					byZone,
					byOwner,
					byType,
					profileLinkColumns: allCols.filter((c) => c.profileLink).map((c) => c.index),
				},
				null,
				2,
			),
		);
		return;
	}

	header("Matrix Column Statistics");
	console.log();

	// By zone
	console.log(`${COLORS.bold}By Zone:${COLORS.reset}`);
	for (const [name, meta] of Object.entries(ZONES)) {
		const count = allCols.filter((c) => c.zone === name).length;
		const bar = "█".repeat(Math.round(count / 2));
		console.log(
			`  ${meta.emoji} ${name.padEnd(13)} ${String(count).padStart(2)} ${meta.color}${bar}${COLORS.reset}`,
		);
	}
	console.log();

	// By owner/team
	console.log(`${COLORS.bold}By Owner:${COLORS.reset}`);
	const byOwner = new Map<string, number>();
	for (const col of allCols) {
		byOwner.set(col.owner, (byOwner.get(col.owner) || 0) + 1);
	}
	for (const [owner, count] of [...byOwner.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${owner.padEnd(10)} ${String(count).padStart(2)}`);
	}
	console.log();

	// By type
	console.log(`${COLORS.bold}By Type:${COLORS.reset}`);
	const byType = new Map<string, number>();
	for (const col of allCols) {
		byType.set(col.type, (byType.get(col.type) || 0) + 1);
	}
	for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${type.padEnd(12)} ${String(count).padStart(2)}`);
	}
	console.log();

	// Profile links
	const profileCols = allCols.filter((c) => c.profileLink);
	console.log(
		`${COLORS.bold}Profile Link Columns:${COLORS.reset} ${profileCols.length}`,
	);
	for (const col of profileCols) {
		console.log(`  ${col.color}${col.index}${COLORS.reset} ${col.name} (${col.zone})`);
	}
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// HELP
// ═════════════════════════════════════════════════════════════════════════════

function showHelp(): void {
	header("Column Standards CLI - Phase 3.29");
	console.log();

	console.log(`${COLORS.bold}Usage:${COLORS.reset}`);
	console.log(
		`  ${COLORS.cyan}bun matrix/column-standards-all.ts${COLORS.reset} [command] [arg]`,
	);
	console.log();

	console.log(`${COLORS.bold}Commands:${COLORS.reset}`);
	console.log(
		`  ${COLORS.yellow}list [filter]${COLORS.reset}      Show all columns (optionally filtered)`,
	);
	console.log(
		`  ${COLORS.yellow}get <col>${COLORS.reset}          Show single column detail`,
	);
	console.log(
		`  ${COLORS.yellow}search <term>${COLORS.reset}      Fuzzy search name/owner/desc/type`,
	);
	console.log(
		`  ${COLORS.yellow}validate${COLORS.reset}           Check required fields schema`,
	);
	console.log(
		`  ${COLORS.yellow}stats${COLORS.reset}              Show distribution statistics`,
	);
	console.log(`  ${COLORS.yellow}zones${COLORS.reset}              List all zones`);
	console.log(
		`  ${COLORS.yellow}watch${COLORS.reset}              Watch for changes & auto-reload`,
	);
	console.log(
		`  ${COLORS.yellow}export [path]${COLORS.reset}      Export to Markdown reference`,
	);
	console.log(
		`  ${COLORS.yellow}preview <col>${COLORS.reset}      Preview hyperlinks for URI column`,
	);
	console.log(
		`  ${COLORS.yellow}pipe <format>${COLORS.reset}      Export as tsv/csv/names/env/grep-tags`,
	);
	console.log(
		`  ${COLORS.yellow}find <criteria>${COLORS.reset}    Advanced multi-criteria search`,
	);
	console.log(
		`  ${COLORS.yellow}interactive${COLORS.reset}        Start interactive REPL mode`,
	);
	console.log(
		`  ${COLORS.yellow}fav${COLORS.reset}                Show favorite columns`,
	);
	console.log(
		`  ${COLORS.yellow}config${COLORS.reset}             Manage CLI configuration`,
	);
	console.log(
		`  ${COLORS.yellow}doctor${COLORS.reset}             Check environment & dependencies`,
	);
	console.log(
		`  ${COLORS.yellow}matrix${COLORS.reset}             Show full matrix grid view`,
	);
	console.log(
		`  ${COLORS.yellow}shortcuts${COLORS.reset}          List all shortcuts & aliases`,
	);
	console.log(
		`  ${COLORS.yellow}flags${COLORS.reset}              Show detailed flag documentation`,
	);
	console.log(
		`  ${COLORS.dim}--complete [word] [prev]${COLORS.reset}  Tab-completion (suggestions for shell)`,
	);
	console.log(
		`  ${COLORS.dim}--install-complete${COLORS.reset}   Print shell hook for Bash/Zsh/Fish`,
	);
	console.log(
		`  ${COLORS.dim}--json${COLORS.reset}               Output as JSON (for any command)`,
	);
	console.log(`  ${COLORS.dim}--version, -v${COLORS.reset}        Show CLI version`);
	console.log();

	console.log(`${COLORS.bold}Zone Shortcuts:${COLORS.reset}`);
	console.log(
		`  ${COLORS.yellow}tension${COLORS.reset}            Show tension zone (31-45)`,
	);
	console.log(
		`  ${COLORS.yellow}cloudflare${COLORS.reset}         Show Cloudflare zone (21-30)`,
	);
	console.log(
		`  ${COLORS.yellow}chrome${COLORS.reset}             Show Chrome state columns (71-75)`,
	);
	console.log(
		`  ${COLORS.yellow}core${COLORS.reset}               Show core zone (1-10)`,
	);
	console.log(
		`  ${COLORS.yellow}validation${COLORS.reset}         Show validation zone (61-75)`,
	);
	console.log();

	console.log(`${COLORS.bold}Examples:${COLORS.reset}`);
	console.log(`  bun matrix/column-standards-all.ts get 45`);
	console.log(`  bun matrix/column-standards-all.ts search tension`);
	console.log(`  bun matrix/column-standards-all.ts list url`);
	console.log(`  bun matrix/column-standards-all.ts validate`);
	console.log(`  bun matrix/column-standards-all.ts cloudflare`);
	console.log(`  bun matrix/column-standards-all.ts watch`);
	console.log(`  bun matrix/column-standards-all.ts watch tension --export-on-change`);
	console.log(`  bun matrix/column-standards-all.ts export docs/cols.md`);
	console.log(`  bun matrix/column-standards-all.ts preview 45`);
	console.log(`  bun matrix/column-standards-all.ts pipe tsv > columns.tsv`);
	console.log(`  bun matrix/column-standards-all.ts find zone=tension required=true`);
	console.log(`  bun matrix/column-standards-all.ts stats --json | jq '.byZone'`);
	console.log(`  bun matrix/column-standards-all.ts interactive`);
	console.log(`  bun matrix/column-standards-all.ts fav add 45`);
	console.log(`  bun matrix/column-standards-all.ts config set cli.colors false`);
	console.log(`  bun matrix/column-standards-all.ts doctor`);
	console.log(`  bun matrix/column-standards-all.ts matrix`);
	console.log(`  bun matrix/column-standards-all.ts shortcuts`);
	console.log(`  bun matrix/column-standards-all.ts flags`);
	console.log();

	console.log(`${COLORS.bold}Zones:${COLORS.reset}`);
	for (const [name, meta] of Object.entries(ZONES)) {
		console.log(
			`  ${meta.emoji} ${name.padEnd(13)} ${String(meta.start).padStart(2)}-${String(meta.end).padStart(2)} (${meta.end - meta.start + 1} cols) - ${meta.team}`,
		);
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// JSON OUTPUT MODE - For scripting and piping
// ═════════════════════════════════════════════════════════════════════════════

let JSON_MODE = false;

function enableJsonMode(): void {
	JSON_MODE = true;
}

function output(data: unknown): void {
	if (JSON_MODE) {
		console.log(JSON.stringify(data, null, 2));
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// PIPE COMMAND - Shell-friendly output formats
// ═════════════════════════════════════════════════════════════════════════════

function pipeFormat(format: string): void {
	switch (format) {
		case "tsv":
		case "csv": {
			const separator = format === "tsv" ? "\t" : ",";
			console.log(
				["index", "name", "type", "owner", "zone", "required"].join(separator),
			);
			for (const col of Object.values(columns).sort((a, b) => a.index - b.index)) {
				console.log(
					[col.index, col.name, col.type, col.owner, col.zone, col.required].join(
						separator,
					),
				);
			}
			break;
		}
		case "names":
			for (const col of Object.values(columns).sort((a, b) => a.index - b.index)) {
				console.log(col.name);
			}
			break;
		case "ids":
			for (let i = 0; i <= 96; i++) {
				if (columns[i]) console.log(i);
			}
			break;
		case "grep-tags": {
			// Generate grep-ready patterns
			for (const col of Object.values(columns)) {
				const tagName = col.name.toUpperCase().replace(/-/g, "_");
				console.log(`[${tagName}:VALUE]`);
			}
			break;
		}
		case "env": {
			// Export as environment variable style
			for (const col of Object.values(columns)) {
				const envName = `MATRIX_COL_${col.index}_${col.name.toUpperCase().replace(/-/g, "_")}`;
				console.log(`${envName}="${col.type}:${col.owner}:${col.zone}"`);
			}
			break;
		}
		default:
			error(`Unknown pipe format: ${format}`);
			console.log();
			console.log("Available formats:");
			console.log("  tsv        Tab-separated values");
			console.log("  csv        Comma-separated values");
			console.log("  names      Just column names (one per line)");
			console.log("  ids        Just column IDs (one per line)");
			console.log("  grep-tags  Grep tag patterns for log searching");
			console.log("  env        Environment variable style export");
			process.exit(1);
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// FIND COMMAND - Advanced multi-criteria filtering
// ═════════════════════════════════════════════════════════════════════════════

function findColumns(criteria: string[]): void {
	if (criteria.length === 0) {
		error("Find requires at least one criteria");
		console.log();
		console.log("Usage: bun matrix:cols find <criteria>");
		console.log();
		console.log("Criteria formats:");
		console.log("  zone=<zone>       Filter by zone (tension, cloudflare, etc.)");
		console.log("  owner=<owner>     Filter by owner (runtime, platform, etc.)");
		console.log("  type=<type>       Filter by type (url, float, enum, etc.)");
		console.log("  required=true     Only required columns");
		console.log("  has=uriPattern    Columns with specific property");
		console.log();
		console.log("Examples:");
		console.log("  bun matrix:cols find zone=tension required=true");
		console.log("  bun matrix:cols find owner=platform type=url");
		console.log("  bun matrix:cols find has=profileLink");
		process.exit(1);
	}

	let results = Object.values(columns);

	for (const criterion of criteria) {
		const [key, value] = criterion.split("=");
		if (!key || value === undefined) {
			error(`Invalid criterion: ${criterion}. Use key=value format.`);
			continue;
		}

		switch (key) {
			case "zone":
				results = results.filter((c) => c.zone === value);
				break;
			case "owner":
				results = results.filter((c) => c.owner === value);
				break;
			case "type":
				results = results.filter((c) => c.type === value);
				break;
			case "required":
				results = results.filter((c) => c.required === (value === "true"));
				break;
			case "has":
				results = results.filter((c) => (c as any)[value] !== undefined);
				break;
			default:
				error(`Unknown criterion key: ${key}`);
		}
	}

	header(`Find Results (${results.length} matches)`);
	console.log();
	console.log(`${COLORS.dim}Criteria:${COLORS.reset} ${criteria.join(" + ")}`);
	console.log();

	if (JSON_MODE) {
		output(results.sort((a, b) => a.index - b.index));
		return;
	}

	for (const col of results.sort((a, b) => a.index - b.index)) {
		console.log(
			`  ${col.color}${String(col.index).padStart(2)}${COLORS.reset} ${col.name.padEnd(28)} ${COLORS.dim}${col.zone}/${col.owner}${COLORS.reset} ${col.type}`,
		);
	}
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// NATIVE WATCH MODE - Bun.file().watch() Live-Reload Supremacy
// ═════════════════════════════════════════════════════════════════════════════

async function watchMode(): Promise<void> {
	const mode = args[1]?.toLowerCase() || "list";
	const target = args[2];
	const verbose = args.includes("--verbose");
	const exportOnChange = args.includes("--export-on-change");
	let changeCount = 0;

	// Set current view for auto-reprint
	currentMode = mode;
	currentFilter = target;
	currentTarget = target;

	console.clear();
	header(`🔥 OMEGA Native Watch Mode – Live Standards Supremacy`);
	console.log();
	console.log(`${COLORS.dim}Native Bun.file().watch() activated${COLORS.reset}`);
	console.log(`${COLORS.dim}Monitoring:${COLORS.reset}`);
	console.log(`  • matrix/column-standards-index.ts`);
	console.log(`  • matrix/standards/**/*.ts (recursive)`);
	console.log();
	console.log(
		`${COLORS.dim}Mode:${COLORS.reset} ${COLORS.cyan}${mode}${COLORS.reset}${target ? ` → ${target}` : ""}`,
	);
	console.log(
		`${COLORS.dim}Options:${COLORS.reset} ${exportOnChange ? "🟣 auto-export" : ""}${verbose ? " 🔊 verbose" : ""}`,
	);
	console.log();
	console.log(`${COLORS.yellow}Press Ctrl+C to exit${COLORS.reset}`);
	console.log();

	// Native file watcher - zero dependencies!
	// Using fs.watch as Bun.file().watch() is not available in 1.3.7
	const fs = await import("fs");
	const path = await import("path");

	const watchPaths = [
		"./matrix/column-standards-index.ts",
		"./matrix/standards", // Watch directory recursively
	];

	let watchTimer: ReturnType<typeof setInterval> | null = null;
	let lastFileHash: string | null = null;

	// Helper to check if file is TypeScript
	const isTypeScript = (filePath: string): boolean => filePath.endsWith(".ts");

	// Helper to calculate file hash for integrity checking
	const getFileHash = async (filePath: string): Promise<string> => {
		try {
			const data = await Bun.file(filePath).arrayBuffer();
			return Bun.hash.crc32(data).toString(16);
		} catch {
			return "0";
		}
	};

	// Watch the main file and directory recursively
	const watchers = watchPaths.map((watchPath) => {
		if (fs.statSync(watchPath).isDirectory()) {
			// Recursive directory watching
			return fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
				if (!filename || !isTypeScript(filename)) return;

				const fullPath = path.join(watchPath, filename);
				if (verbose) {
					console.log(
						`${COLORS.dim}[${new Date().toLocaleTimeString()}]${COLORS.reset} ${COLORS.cyan}📝${COLORS.reset} Changed: ${fullPath}`,
					);
				}

				triggerReload(fullPath);
			});
		} else {
			// Single file watching
			return fs.watch(watchPath, { persistent: true }, (eventType, filename) => {
				if (verbose) {
					console.log(
						`${COLORS.dim}[${new Date().toLocaleTimeString()}]${COLORS.reset} ${COLORS.cyan}📝${COLORS.reset} Changed: ${watchPath}`,
					);
				}

				triggerReload(watchPath);
			});
		}
	});

	// Centralized reload trigger with debouncing and integrity check
	const triggerReload = async (changedFile: string) => {
		// Check if the main index file actually changed
		const currentIndexHash = await getFileHash("./matrix/column-standards-index.ts");
		if (lastFileHash && lastFileHash === currentIndexHash) {
			if (verbose)
				console.log(
					`${COLORS.dim}No actual content change in index file${COLORS.reset}`,
				);
			return;
		}

		// Debounce the reload
		if (watchTimer) clearTimeout(watchTimer);
		watchTimer = setTimeout(async () => {
			const startTime = getNanoTime();
			changeCount++;

			if (verbose) {
				console.log(
					`${COLORS.dim}[${new Date().toLocaleTimeString()}]${COLORS.reset} ${COLORS.yellow}🔄${COLORS.reset} Detected change — reloading...`,
				);
			}

			try {
				// Dynamic import with cache busting
				const cacheBust = `?update=${Date.now()}`;
				const fresh = await import(`./column-standards-index.ts${cacheBust}`);

				// Update global columns reference
				Object.assign(columns, fresh.MATRIX_COLUMNS);

				// Store the new hash
				lastFileHash = currentIndexHash;

				// Clear and re-render
				console.clear();
				header(`🔥 OMEGA Native Watch – Standards Reloaded #${changeCount}`);
				console.log();
				console.log(
					`${COLORS.green}✅ Standards hot-reloaded @ ${new Date().toLocaleTimeString()}${COLORS.reset}`,
				);
				console.log();

				// Re-render based on current mode
				if (mode === "list" || mode === "all") {
					listAll(target);
				} else if (mode === "get" && target) {
					printCol(target);
				} else if (Object.keys(ZONES).includes(mode)) {
					listZone(mode);
				} else if (mode === "search" && target) {
					search(target);
				} else if (mode === "validate") {
					await validate();
				} else {
					listAll();
				}

				// Auto-export if requested
				if (exportOnChange) {
					console.log();
					subheader("🟣 Auto-exporting...");
					await exportToMarkdown("column-standards.md");
					console.log(
						`${COLORS.green}   └─ Exported column-standards.md${COLORS.reset}`,
					);
				}

				// Performance metrics with nanosecond precision
				const renderTime = getNanoTime() - startTime;
				console.log();
				console.log(
					`${COLORS.dim}   └─ Reloaded in ${formatNanoDuration(renderTime)} | ${Object.keys(columns).length} columns | Native fs.watch()${COLORS.reset}`,
				);

				// Manual garbage collection for long-running watch sessions
				if (changeCount % 10 === 0) {
					Bun.gc("full");
					if (verbose)
						console.log(
							`${COLORS.dim}   └─ GC triggered (${changeCount} changes)${COLORS.reset}`,
						);
				}

				// Optional: Redis pub/sub for downstream sync
				if (process.env["REDIS_URL"]) {
					try {
						// @ts-expect-error - redis may not be installed
						const redis = await import("redis");
						const client = redis.createClient({ url: process.env["REDIS_URL"] });
						await client.connect();
						await client.publish(
							"omega:columns:changed",
							JSON.stringify({
								timestamp: Date.now(),
								mode,
								target,
								changed: Object.keys(columns).length,
								changeCount,
								native: true,
							}),
						);
						await client.quit();
						if (verbose)
							console.log(`${COLORS.dim}   └─ Published to Redis${COLORS.reset}`);
					} catch (e) {
						if (verbose)
							console.log(`${COLORS.dim}   └─ Redis not available${COLORS.reset}`);
					}
				}

				// Optional: Webhook notification
				if (process.env["OMEGA_WEBHOOK_URL"]) {
					try {
						await fetch(process.env["OMEGA_WEBHOOK_URL"], {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								event: "columns:changed",
								mode,
								target,
								count: Object.keys(columns).length,
								timestamp: Date.now(),
								native: true,
							}),
						});
						if (verbose) console.log(`${COLORS.dim}   └─ Webhook sent${COLORS.reset}`);
					} catch (e) {
						if (verbose) console.log(`${COLORS.dim}   └─ Webhook failed${COLORS.reset}`);
					}
				}
			} catch (error) {
				console.error(`${COLORS.red}❌ Reload failed:${COLORS.reset}`, error);
				console.log(
					`${COLORS.yellow}⚠️ Continuing with previous state...${COLORS.reset}`,
				);
			}
		}, 120); // 120ms debounce
	};

	// Initial render
	// Initialize file hash for integrity checking
	lastFileHash = await getFileHash("./matrix/column-standards-index.ts");

	if (mode === "list" || mode === "all") {
		listAll(target);
	} else if (mode === "get" && target) {
		printCol(target);
	} else if (Object.keys(ZONES).includes(mode)) {
		listZone(mode);
	} else if (mode === "search" && target) {
		search(target);
	} else if (mode === "validate") {
		await validate();
	} else {
		listAll();
	}

	// Graceful shutdown
	process.on("SIGINT", () => {
		console.log(`\n${COLORS.yellow}🛑 Native watch mode terminating...${COLORS.reset}`);

		// Final export if requested
		if (exportOnChange) {
			console.log(`${COLORS.dim}Final export...${COLORS.reset}`);
			exportToMarkdown("column-standards.md").catch(() => {});
		}

		// Clear any pending timer
		if (watchTimer) clearTimeout(watchTimer);

		// Close all fs watchers
		watchers.forEach((w) => w.close());

		console.log(
			`${COLORS.green}✅ Native watch mode terminated. Total changes: ${changeCount}${COLORS.reset}`,
		);
		process.exit(0);
	});
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT TO MARKDOWN - Generate reference documentation
// ═════════════════════════════════════════════════════════════════════════════

async function exportToMarkdown(outputPath?: string): Promise<void> {
	const targetPath = outputPath || "matrix/COLUMN-REFERENCE.md";

	let md = `# Tier-1380 OMEGA: Column Standards Reference

> Auto-generated on ${new Date().toISOString()}
> Total columns: ${Object.keys(columns).length}

## Quick Navigation

| Zone | Range | Count | Team |
|------|-------|-------|------|
`;

	// Zone summary table
	for (const [name, meta] of Object.entries(ZONES)) {
		const count = Object.values(columns).filter((c) => c.zone === name).length;
		md += `| ${meta.emoji} ${name} | ${meta.start}-${meta.end} | ${count} | ${meta.team} |\n`;
	}

	md += `
## All Columns

`;

	// Group by zone
	const zoneOrder = [
		"default",
		"core",
		"security",
		"cloudflare",
		"tension",
		"infra",
		"validation",
		"chrome",
		"extensibility",
		"skills",
	];

	for (const zone of zoneOrder) {
		const zoneCols = Object.values(columns)
			.filter((c) => c.zone === zone)
			.sort((a, b) => a.index - b.index);
		if (zoneCols.length === 0) continue;

		const meta = ZONES[zone as keyof typeof ZONES];
		md += `### ${meta.emoji} ${zone.charAt(0).toUpperCase() + zone.slice(1)} Zone (${zoneCols.length} columns)\n\n`;
		md += `| Col | Name | Type | Owner | Required | Description |\n`;
		md += `|-----|------|------|-------|----------|-------------|\n`;

		for (const col of zoneCols) {
			const desc = col.description
				? col.description.replace(/\|/g, "\\|").slice(0, 40) +
					(col.description.length > 40 ? "..." : "")
				: "";
			md += `| ${col.index} | \`${col.name}\` | ${col.type} | ${col.owner} | ${col.required ? "✓" : ""} | ${desc} |\n`;
		}
		md += "\n";
	}

	// Add detailed section for columns with URI patterns
	md += `## Columns with URI Patterns\n\n`;
	const uriCols = Object.values(columns).filter((c) => c.uriPattern);
	for (const col of uriCols) {
		md += `### Column ${col.index}: ${col.name}\n\n`;
		md += `- **Type:** ${col.type}\n`;
		md += `- **Owner:** ${col.owner}\n`;
		md += `- **Zone:** ${col.zone}\n`;
		if (col.uriPattern) {
			md += `- **URI:** \`${col.uriPattern.protocol}://${col.uriPattern.hostname}${col.uriPattern.pathname}\`\n`;
		}
		if (col.description) {
			md += `- **Description:** ${col.description}\n`;
		}
		md += "\n";
	}

	// Write to file
	await Bun.write(targetPath, md);

	success(`Reference documentation exported to ${targetPath}`);
	console.log();
	console.log(
		`${COLORS.dim}File size:${COLORS.reset} ${(md.length / 1024).toFixed(2)} KB`,
	);
	console.log(
		`${COLORS.dim}Columns documented:${COLORS.reset} ${Object.keys(columns).length}`,
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// HYPERLINK PREVIEW - Generate clickable terminal links
// ═════════════════════════════════════════════════════════════════════════════

function hyperlinkPreview(id: string | number): void {
	const colId = typeof id === "string" ? Number.parseInt(id, 10) : id;
	if (Number.isNaN(colId)) {
		error(`Invalid column id: ${id}`);
		process.exit(1);
	}

	const col = columns[colId];
	if (!col) {
		error(`Column ${colId} not found`);
		process.exit(1);
	}

	header(`Hyperlink Preview: Column ${colId}`);
	console.log();

	// Standard column info
	printCol(id);
	console.log();

	// Hyperlink section
	if (col.uriPattern || col.pattern) {
		subheader("🔗 Clickable Links");
		console.log();

		if (col.uriPattern) {
			const url = `${col.uriPattern.protocol}://${col.uriPattern.hostname}${col.uriPattern.pathname}`;
			// OSC 8 hyperlink format: \e]8;;URL\e\\TEXT\e]8;;\e\\
			const hyperlink = `\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`;
			console.log(`  ${COLORS.cyan}Canonical:${COLORS.reset} ${hyperlink}`);
		}

		if (col.pattern) {
			// Generate example URL from pattern
			const exampleUrl = col.pattern
				.replace(/{timestamp}/g, Date.now().toString())
				.replace(/{id}/g, "example")
				.replace(/{tier}/g, "1380")
				.replace(/{env}/g, "prod");
			const fullUrl = `${col.protocol || "https"}://${exampleUrl}`;
			const hyperlink = `\x1b]8;;${fullUrl}\x1b\\${fullUrl}\x1b]8;;\x1b\\`;
			console.log(`  ${COLORS.cyan}Example:${COLORS.reset}   ${hyperlink}`);
		}

		console.log();
		subheader("📋 Copy-Paste Templates");
		console.log();

		if (col.pattern) {
			console.log(`${COLORS.dim}Bun fetch:${COLORS.reset}`);
			console.log(
				`    const res = await fetch("${col.protocol || "https"}://${col.pattern.split("/")[0]}...");`,
			);
			console.log();

			console.log(`${COLORS.dim}curl:${COLORS.reset}`);
			console.log(
				`    curl -s "${col.protocol || "https"}://${col.pattern}" | head -20`,
			);
			console.log();
		}
	} else {
		warning("No URI pattern defined for this column");
		console.log();
		console.log(
			`${COLORS.dim}This column does not have clickable links.${COLORS.reset}`,
		);
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// INTERACTIVE MODE - REPL-style column exploration
// ═════════════════════════════════════════════════════════════════════════════

async function interactiveMode(): Promise<void> {
	header("Interactive Mode 🎮");
	console.log();
	console.log(`${COLORS.bold}Examples:${COLORS.reset}`);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols list${COLORS.reset}                    List all columns`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols get 45${COLORS.reset}                   Show column 45`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols search profile${COLORS.reset}          Search columns`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols tension${COLORS.reset}                List tension zone`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols watch${COLORS.reset}                  Watch for changes`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols watch tension --export-on-change${COLORS.reset}  Watch tension + auto-export`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols validate${COLORS.reset}               Validate schema`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols export${COLORS.reset}                 Export to markdown`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols pipe tsv${COLORS.reset}                Output as TSV`,
	);
	console.log(
		`  ${COLORS.cyan}bun matrix:cols --install-complete${COLORS.reset}     Install tab-completion`,
	);

	const reader = Bun.stdin.stream().getReader();
	const decoder = new TextDecoder();

	while (true) {
		process.stdout.write(`${COLORS.orange}matrix>${COLORS.reset} `);

		const { value } = await reader.read();
		if (!value) break;

		const input = decoder.decode(value).trim();
		if (!input) continue;
		if (input === "exit" || input === "quit") break;
		if (input === "help") {
			console.log();
			console.log("Quick commands:");
			console.log("  45           Show column 45");
			console.log("  tension      Show tension zone");
			console.log("  search url   Search for URL columns");
			console.log("  find type=float  Find float columns");
			console.log();
			continue;
		}

		// Check if it's a column number
		const colNum = Number.parseInt(input, 10);
		if (!Number.isNaN(colNum) && columns[colNum]) {
			printCol(colNum);
			console.log();
			continue;
		}

		// Check if it's a zone shortcut
		if (["tension", "cloudflare", "chrome", "core", "validation"].includes(input)) {
			if (input === "chrome") listChrome();
			else listZone(input);
			console.log();
			continue;
		}

		// Handle commands
		const parts = input.split(" ");
		const cmd = parts[0];
		const arg = parts.slice(1).join(" ");

		switch (cmd) {
			case "search":
				search(arg);
				break;
			case "find":
				findColumns(parts.slice(1));
				break;
			case "fav":
			case "favorites":
				showFavorites();
				break;
			case "zones":
				console.log();
				for (const [name, meta] of Object.entries(ZONES)) {
					console.log(`  ${meta.emoji} ${name}`);
				}
				break;
			case "get":
				if (arg) printCol(arg);
				break;
			default:
				console.log(`${COLORS.red}Unknown command: ${cmd}${COLORS.reset}`);
				console.log(`Type ${COLORS.cyan}help${COLORS.reset} for available commands`);
		}
		console.log();
	}

	console.log();
	success("Goodbye! 👋");
}

// ═════════════════════════════════════════════════════════════════════════════
// FAVORITES MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

async function showFavorites(): Promise<void> {
	header("Favorite Columns ⭐");
	console.log();

	await loadConfig();

	if (config.favorites.length === 0) {
		console.log("No favorites yet. Add with: fav add <col>");
		return;
	}

	for (const colId of config.favorites) {
		const col = columns[colId];
		if (col) {
			console.log(
				`  ${col.color}${String(col.index).padStart(2)}${COLORS.reset} ${col.name.padEnd(28)} ${COLORS.dim}${col.zone}${COLORS.reset}`,
			);
		}
	}
	console.log();
}

async function addFavorite(colId: string): Promise<void> {
	const id = Number.parseInt(colId, 10);
	if (Number.isNaN(id) || !columns[id]) {
		error(`Invalid column: ${colId}`);
		return;
	}

	await loadConfig();
	if (!config.favorites.includes(id)) {
		config.favorites.push(id);
		await saveConfig();
		success(`Added column ${id} to favorites`);
	} else {
		warning(`Column ${id} is already in favorites`);
	}
}

async function removeFavorite(colId: string): Promise<void> {
	const id = Number.parseInt(colId, 10);
	await loadConfig();
	const idx = config.favorites.indexOf(id);
	if (idx > -1) {
		config.favorites.splice(idx, 1);
		await saveConfig();
		success(`Removed column ${id} from favorites`);
	} else {
		error(`Column ${id} is not in favorites`);
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// CONFIG COMMANDS
// ═════════════════════════════════════════════════════════════════════════════

function showConfig(): void {
	header("CLI Configuration ⚙️");
	console.log();
	console.log(JSON.stringify(config, null, 2));
}

async function configCommand(subcmd: string, ...args: string[]): Promise<void> {
	switch (subcmd) {
		case "show":
			showConfig();
			break;
		case "reset":
			config = { ...DEFAULT_CONFIG };
			await saveConfig();
			success("Configuration reset to defaults");
			break;
		case "set": {
			const [key, value] = args;
			if (!key || !value) {
				error("Usage: config set <key> <value>");
				return;
			}
			// Simple path-based setter
			const parts = key.split(".");
			let target: any = config;
			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				if (part) target = target[part];
			}
			const lastPart = parts[parts.length - 1];
			if (lastPart) {
				target[lastPart] = value === "true" ? true : value === "false" ? false : value;
			}
			await saveConfig();
			success(`Set ${key} = ${value}`);
			break;
		}
		case "secret": {
			const [action, name, value] = args;
			if (!config.secrets) config.secrets = {};

			if (action === "set" && name && value) {
				// Store the secret as a hash
				const hash = await secureHash(value);
				config.secrets[name] = hash;
				await saveConfig();
				success(`Secret '${name}' stored securely`);
			} else if (action === "get" && name) {
				// Verify a secret against stored hash
				const hash = config.secrets[name];
				if (!hash) {
					error(`Secret '${name}' not found`);
					return;
				}
				// In real usage, you'd prompt for the value to verify
				console.log(`${COLORS.dim}Secret '${name}' is stored${COLORS.reset}`);
			} else if (action === "list") {
				// List all secret names (not values)
				const names = Object.keys(config.secrets);
				if (names.length === 0) {
					console.log(`${COLORS.dim}No secrets stored${COLORS.reset}`);
				} else {
					console.log(`${COLORS.cyan}Stored secrets:${COLORS.reset}`);
					names.forEach((name) => console.log(`  • ${name}`));
				}
			} else {
				error("Usage: config secret <set|get|list> <name> [value]");
			}
			break;
		}
		default:
			console.log("Usage:");
			console.log("  config show              Show current config");
			console.log("  config set <key> <val>   Set config value");
			console.log("  config reset             Reset to defaults");
			console.log("  config secret set <name> <value>  Store secret securely");
			console.log("  config secret list       List stored secrets");
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// DOCTOR COMMAND - Environment diagnostics using Bun.which()
// ═════════════════════════════════════════════════════════════════════════════

async function doctor(): Promise<void> {
	header("Environment Diagnostics 🩺");
	console.log();

	// Check Bun version
	console.log(`${COLORS.bold}Runtime:${COLORS.reset}`);
	console.log(`  Bun: ${Bun.version}`);
	console.log(`  TypeScript: ${Bun.version}`);
	console.log();

	// Check for optional dependencies using Bun.which()
	console.log(`${COLORS.bold}Optional Dependencies:${COLORS.reset}`);
	const deps = [
		{ cmd: "jq", desc: "JSON processing", used: "stats --json | jq" },
		{ cmd: "rg", desc: "Fast grep", used: "pipe grep-tags | rg" },
		{ cmd: "fzf", desc: "Fuzzy finder", used: "interactive enhancement" },
		{ cmd: "bat", desc: "Syntax highlighting", used: "preview enhancement" },
		{ cmd: "delta", desc: "Diff highlighting", used: "compare columns" },
	];

	const depStatuses = deps.map((dep) => {
		const { exists, path } = checkCommand(dep.cmd);
		return {
			Command: dep.cmd,
			Status: exists ? "✅" : "⚪",
			Path: path || "not found",
			Purpose: dep.desc,
			Example: dep.used,
		};
	});

	// Use Bun.inspect.table for nice formatting
	displayTable(depStatuses);
	console.log();

	// Check CLI installation
	console.log(`${COLORS.bold}CLI Installation:${COLORS.reset}`);
	const cliPath = import.meta.path;
	console.log(`  Script: ${cliPath}`);
	console.log(`  Config: ${import.meta.dir}/column-standards-config.json`);
	console.log(`  Columns: ${Object.keys(columns).length}`);
	console.log(`  Zones: ${Object.keys(ZONES).length}`);
	console.log();

	// Recommendations
	console.log(`${COLORS.bold}Recommendations:${COLORS.reset}`);
	const missingDeps = deps.filter((d) => !checkCommand(d.cmd).exists);
	if (missingDeps.length > 0) {
		console.log(`  Install for enhanced experience:`);
		for (const dep of missingDeps) {
			console.log(`    ${COLORS.dim}• ${dep.cmd}${COLORS.reset} - ${dep.desc}`);
		}
	} else {
		success("All optional dependencies installed!");
	}
	console.log();

	// Shell integration check
	console.log(`${COLORS.bold}Shell Integration:${COLORS.reset}`);
	const hasCompletion = await Bun.file(
		`${import.meta.dir}/column-standards-completion.bash`,
	).exists();
	console.log(`  Completion script: ${hasCompletion ? "✅ found" : "❌ missing"}`);
	console.log(`  Aliases defined: ${Object.keys(config.aliases).length}`);
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// MATRIX COMMAND - Display full matrix using Bun.inspect.table()
// ═════════════════════════════════════════════════════════════════════════════

function showMatrix(): void {
	header("Tier-1380 OMEGA: Full Matrix View 📊");
	console.log();

	// Create matrix grid (10 columns x 10 rows)
	const matrix: string[][] = [];
	const _headers = Array.from({ length: 10 }, (_, i) => `+${i}`);

	for (let row = 0; row < 10; row++) {
		const rowData: string[] = [`${row * 10}`];
		for (let col = 0; col < 10; col++) {
			const idx = row * 10 + col;
			const colDef = columns[idx];
			if (colDef) {
				// Show emoji and truncated name
				const name =
					colDef.name.length > 12 ? `${colDef.name.slice(0, 9)}...` : colDef.name;
				rowData.push(`${colDef.color}${idx}${COLORS.reset} ${name}`);
			} else {
				rowData.push("");
			}
		}
		matrix.push(rowData);
	}

	// Display using Bun.inspect
	console.log("Column index →");
	const tableData = matrix.map((row, idx) => ({
		Row: `${idx * 10}`,
		...row.slice(1).reduce((acc, cell, i) => ({ ...acc, [`+${i}`]: cell }), {}),
	}));

	displayTable(tableData);
	console.log();

	// Zone legend
	console.log(`${COLORS.bold}Zone Legend:${COLORS.reset}`);
	const zoneData = Object.entries(ZONES).map(([name, meta]) => ({
		Zone: `${meta.emoji} ${name}`,
		Range: `${meta.start}-${meta.end}`,
		Team: meta.team,
		Description: meta.description || "",
	}));
	displayTable(zoneData, ["Zone", "Range", "Team", "Description"]);
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// SHORTCUTS COMMAND - List all shortcuts and aliases
// ═════════════════════════════════════════════════════════════════════════════

async function showShortcuts(): Promise<void> {
	header("Shortcuts & Quick Reference ⚡");
	console.log();

	await loadConfig();

	// Built-in zone shortcuts
	console.log(`${COLORS.bold}Zone Shortcuts:${COLORS.reset}`);
	const zoneShortcuts = [
		{
			Shortcut: "tension",
			Command: "list tension",
			Description: "Tension zone (31-45)",
		},
		{
			Shortcut: "cloudflare",
			Command: "list cloudflare",
			Description: "Cloudflare zone (21-30)",
		},
		{
			Shortcut: "chrome",
			Command: "list chrome",
			Description: "Chrome state (71-75)",
		},
		{ Shortcut: "core", Command: "list core", Description: "Core zone (1-10)" },
		{
			Shortcut: "validation",
			Command: "list validation",
			Description: "Validation zone (61-75)",
		},
	];
	displayTable(zoneShortcuts);
	console.log();

	// User-defined aliases
	console.log(`${COLORS.bold}User Aliases:${COLORS.reset}`);
	if (Object.keys(config.aliases).length > 0) {
		const aliasData = Object.entries(config.aliases).map(([name, cmd]) => ({
			Alias: name,
			ExpandsTo: cmd,
		}));
		displayTable(aliasData);
	} else {
		console.log("  No aliases defined. Add in column-standards-config.json");
	}
	console.log();

	// Named shortcuts
	console.log(`${COLORS.bold}Named Column Shortcuts:${COLORS.reset}`);
	const namedData = Object.entries(config.shortcuts).map(([name, idx]) => {
		const col = columns[idx];
		return {
			Name: name,
			Column: idx,
			Actual: col ? col.name : "unknown",
		};
	});
	displayTable(namedData);
	console.log();

	// Flag reference
	console.log(`${COLORS.bold}Global Flags:${COLORS.reset}`);
	const flags = [
		{ Flag: "--complete [word] [prev]", Description: "Tab-completion suggestions" },
		{ Flag: "--install-complete", Description: "Print shell hook (Bash/Zsh/Fish)" },
		{ Flag: "--json", Description: "Output as JSON (pipeable)" },
		{ Flag: "--help, -h", Description: "Show help" },
		{ Flag: "--version, -v", Description: "Show version" },
	];
	displayTable(flags);
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// FLAGS COMMAND - Detailed flag documentation
// ═════════════════════════════════════════════════════════════════════════════

function showFlags(): void {
	header("Command-Line Flags Reference 🚩");
	console.log();

	// Global flags
	console.log(`${COLORS.bold}Global Flags:${COLORS.reset}`);
	console.log(
		`  ${COLORS.cyan}--complete [word] [prev]${COLORS.reset}  Tab-completion; output candidates (for shell complete -C)`,
	);
	console.log(
		`  ${COLORS.cyan}--install-complete${COLORS.reset}  Print Bash/Zsh/Fish hook for tab-completion`,
	);
	console.log(`  ${COLORS.cyan}--json${COLORS.reset}          Output results as JSON`);
	console.log(`  ${COLORS.cyan}--help, -h${COLORS.reset}      Show help message`);
	console.log(`  ${COLORS.cyan}--version, -v${COLORS.reset}   Show CLI version`);
	console.log(`  ${COLORS.cyan}--no-color${COLORS.reset}      Disable colored output`);
	console.log();

	// Command-specific flags
	console.log(`${COLORS.bold}Command-Specific Options:${COLORS.reset}`);
	const cmdFlags = [
		{ Command: "list", Options: "[filter] - zone, type, or owner filter" },
		{ Command: "get", Options: "<col> --json for raw output" },
		{ Command: "search", Options: "<term> --json for results array" },
		{
			Command: "find",
			Options: "key=value pairs (zone, owner, type, required, has)",
		},
		{
			Command: "watch",
			Options: "[mode] [target] --export-on-change --verbose",
		},
		{
			Command: "export",
			Options: "[path] defaults to matrix/COLUMN-REFERENCE.md",
		},
		{ Command: "fav", Options: "[add|remove] <col> or show list" },
		{ Command: "config", Options: "show|set|reset|secret" },
	];
	displayTable(cmdFlags);
	console.log();

	// Examples with flags
	console.log(`${COLORS.bold}Usage Examples:${COLORS.reset}`);
	console.log(`  ${COLORS.dim}# JSON output for scripting${COLORS.reset}`);
	console.log(`  bun matrix:cols get 45 --json | jq '.name'`);
	console.log();
	console.log(`  ${COLORS.dim}# No colors for piping${COLORS.reset}`);
	console.log(`  bun matrix:cols list --no-color | grep url`);
	console.log();
	console.log(`  ${COLORS.dim}# Multiple flags${COLORS.reset}`);
	console.log(`  bun matrix:cols find zone=tension --json --no-color`);
	console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════

// Handle global flags
if (args.includes("--json")) {
	enableJsonMode();
	args.splice(args.indexOf("--json"), 1);
}

if (args.includes("--no-color")) {
	// Disable colors by resetting COLORS
	for (const key of Object.keys(COLORS)) {
		(COLORS as Record<string, string>)[key] = "";
	}
	args.splice(args.indexOf("--no-color"), 1);
}

if (!cmd) {
	currentMode = "list";
	currentFilter = "";
	listAll(currentFilter);
} else if (cmd === "list") {
	currentMode = "list";
	currentFilter = args[1];
	listAll(currentFilter);
} else if (cmd === "get") {
	currentMode = "get";
	currentTarget = args[1] || "";
	printCol(currentTarget);
} else if (cmd === "search") {
	search(args[1] || "");
} else if (cmd === "validate") {
	await validate();
} else if (cmd === "stats") {
	showStats();
} else if (cmd === "zones") {
	console.log();
	header("Available Zones");
	console.log();
	for (const [name, meta] of Object.entries(ZONES)) {
		const colCount = meta.end - meta.start + 1;
		console.log(
			`  ${meta.emoji} ${COLORS.bold}${name.padEnd(13)}${COLORS.reset} ${String(meta.start).padStart(2)}-${String(meta.end).padStart(2)} (${colCount} cols)`,
		);
		console.log(`      Team: ${meta.team}`);
		if (meta.description) {
			console.log(`      ${COLORS.dim}${meta.description}${COLORS.reset}`);
		}
		console.log();
	}
} else if (cmd === "tension") {
	listZone("tension");
} else if (cmd === "cloudflare") {
	listZone("cloudflare");
} else if (cmd === "chrome") {
	listChrome();
} else if (cmd === "core") {
	listZone("core");
} else if (cmd === "validation") {
	listZone("validation");
} else if (cmd === "watch") {
	await watchMode();
} else if (cmd === "export") {
	await exportToMarkdown(args[1]);
} else if (cmd === "preview" || cmd === "link") {
	hyperlinkPreview(args[1] || "");
} else if (cmd === "pipe") {
	pipeFormat(args[1] || "tsv");
} else if (cmd === "find") {
	findColumns(args.slice(1));
} else if (cmd === "interactive" || cmd === "i" || cmd === "repl") {
	await interactiveMode();
} else if (cmd === "fav" || cmd === "favorites") {
	const subcmd = args[1];
	if (subcmd === "add") await addFavorite(args[2] || "");
	else if (subcmd === "remove" || subcmd === "rm") await removeFavorite(args[2] || "");
	else await showFavorites();
} else if (cmd === "config") {
	await configCommand(args[1] || "", ...args.slice(2));
} else if (cmd === "doctor" || cmd === "diag" || cmd === "check") {
	await doctor();
} else if (cmd === "matrix" || cmd === "grid") {
	showMatrix();
} else if (cmd === "shortcuts" || cmd === "alias") {
	await showShortcuts();
} else if (cmd === "flags" || cmd === "options") {
	showFlags();
} else if (cmd === "version" || cmd === "--version" || cmd === "-v") {
	console.log(`Tier-1380 OMEGA Column Standards CLI v${config.version}`);
} else if (cmd === "help" || cmd === "--help" || cmd === "-h") {
	showHelp();
} else if (cmd === "watch") {
	await watchMode();
} else {
	error(`Unknown command: ${cmd || "empty"}`);
	console.log();
	console.log(
		`${COLORS.dim}Run 'bun matrix:cols help' for available commands${COLORS.reset}`,
	);
	process.exit(1);
}
