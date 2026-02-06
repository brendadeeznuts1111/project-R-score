/**
 * Tier-1380 OMEGA: Column Context Visualizer
 *
 * Visual representation of the 60-column matrix with standards
 *
 * @module column-ctx-visualizer
 * @tier 1380-OMEGA
 */

import {
	COLUMN_STANDARDS,
	type ColumnCategory,
	type ColumnContext,
	createColumnContext,
	getColumnsByCategory,
} from "./column-standards";

// ============================================================================
// Visual Rendering
// ============================================================================

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
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgBlue: "\x1b[44m",
};

const CATEGORY_COLORS: Record<ColumnCategory, string> = {
	core: COLORS.cyan,
	security: COLORS.red,
	storage: COLORS.blue,
	compute: COLORS.green,
	protocol: COLORS.magenta,
	hardware: COLORS.yellow,
	audit: COLORS.white,
};

/**
 * Render a 60-column matrix visualization
 */
export function renderMatrixGrid(): void {
	console.log(`${COLORS.bold}Tier-1380 OMEGA 60-Column Matrix${COLORS.reset}\n`);

	const categories: ColumnCategory[] = [
		"core",
		"security",
		"storage",
		"compute",
		"protocol",
		"hardware",
		"audit",
	];

	// Legend
	console.log("Legend:");
	for (const cat of categories) {
		const cols = getColumnsByCategory(cat);
		console.log(
			`  ${CATEGORY_COLORS[cat]}██${COLORS.reset} ${cat.padEnd(10)} (${cols.length} cols)`,
		);
	}
	console.log();

	// Grid: 6 rows of 10 columns
	for (let row = 0; row < 6; row++) {
		const rowCols: string[] = [];

		for (let col = 0; col < 10; col++) {
			const index = row * 10 + col + 1;
			const column = Object.values(COLUMN_STANDARDS).find((c) => c.index === index);

			if (column) {
				const color = CATEGORY_COLORS[column.category];
				const padded = index.toString().padStart(2, "0");
				rowCols.push(`${color}${padded}${COLORS.reset}`);
			} else {
				rowCols.push(`${COLORS.dim}--${COLORS.reset}`);
			}
		}

		console.log(`  ${rowCols.join(" ")}`);
	}

	console.log();
}

/**
 * Render detailed column information with Options/Props/Description
 */
export function renderColumnDetails(index: number): void {
	const col = Object.values(COLUMN_STANDARDS).find((c) => c.index === index);

	if (!col) {
		console.log(`${COLORS.red}Column ${index} not defined${COLORS.reset}`);
		return;
	}

	const color = CATEGORY_COLORS[col.category];

	console.log(
		`${COLORS.bold}╔══════════════════════════════════════════════════════════════╗${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${color}${col.displayName}${COLORS.reset}${"".padEnd(46 - col.displayName.length)}${COLORS.bold}║${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}╠══════════════════════════════════════════════════════════════╣${COLORS.reset}`,
	);

	// Basic Info
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Index:${COLORS.reset}      ${col.index.toString().padStart(2, "0")}${"".padEnd(44)}${COLORS.bold}║${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}ID:${COLORS.reset}         ${col.id.padEnd(44)}${COLORS.bold}║${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Category:${COLORS.reset}   ${color}${col.category.padEnd(44 - col.category.length)}${COLORS.reset}${COLORS.bold}║${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Type:${COLORS.reset}       ${col.type.padEnd(44)}${COLORS.bold}║${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Required:${COLORS.reset}   ${col.required ? `${COLORS.green}YES${COLORS.reset}` : `${COLORS.yellow}NO`}${"".padEnd(41)}${COLORS.bold}║${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Bun Ver:${COLORS.reset}    ${col.bunVersion.padEnd(44)}${COLORS.bold}║${COLORS.reset}`,
	);

	console.log(
		`${COLORS.bold}╠══════════════════════════════════════════════════════════════╣${COLORS.reset}`,
	);

	// Description
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Description:${COLORS.reset}${"".padEnd(42)}${COLORS.bold}║${COLORS.reset}`,
	);
	const descLines = wrapText(col.description, 56);
	for (const line of descLines) {
		console.log(
			`${COLORS.bold}║${COLORS.reset}    ${line.padEnd(58)}${COLORS.bold}║${COLORS.reset}`,
		);
	}

	console.log(
		`${COLORS.bold}╠══════════════════════════════════════════════════════════════╣${COLORS.reset}`,
	);

	// Options/Props (for enum types)
	if (col.type === "enum") {
		console.log(
			`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Options/Props:${COLORS.reset}${"".padEnd(40)}${COLORS.bold}║${COLORS.reset}`,
		);
		// Common enum values based on column ID
		const options = getEnumOptions(col.id);
		for (const opt of options) {
			const marker =
				opt === col.defaultValue
					? `${COLORS.green}●${COLORS.reset}`
					: `${COLORS.dim}○${COLORS.reset}`;
			console.log(
				`${COLORS.bold}║${COLORS.reset}    ${marker} ${opt.padEnd(55)}${COLORS.bold}║${COLORS.reset}`,
			);
		}
		console.log(
			`${COLORS.bold}╠══════════════════════════════════════════════════════════════╣${COLORS.reset}`,
		);
	}

	// Default Value
	console.log(
		`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Default:${COLORS.reset}    ${String(col.defaultValue).padEnd(44)}${COLORS.bold}║${COLORS.reset}`,
	);

	// Validation
	if (col.validate) {
		console.log(
			`${COLORS.bold}║${COLORS.reset}  ${COLORS.dim}Validation:${COLORS.reset} ${COLORS.green}Custom validator defined${COLORS.reset}${"".padEnd(24)}${COLORS.bold}║${COLORS.reset}`,
		);
	}

	console.log(
		`${COLORS.bold}╚══════════════════════════════════════════════════════════════╝${COLORS.reset}`,
	);
}

/**
 * Get common enum options for a column
 */
function getEnumOptions(columnId: string): string[] {
	const options: Record<string, string[]> = {
		engine_mode: ["standard", "strict", "fast"],
		gc_strategy: ["generational", "incremental", "compact"],
		module_system: ["esm", "cjs", "both"],
		target_platform: ["bun", "node", "bun-darwin-arm64", "bun-linux-x64"],
		secret_redaction: ["auto", "off"],
		secret_propagation: ["inherit", "none"],
		storage_backend: ["r2", "s3", "sqlite", "postgres", "none"],
		content_encoding: ["identity", "gzip", "br", "zstd"],
		content_disposition: ["inline", "attachment"],
		jit_tier: ["llint", "baseline", "dfg", "ftl"],
		hardware_accel: ["pclmulqdq", "armv8", "none"],
		timer_state: ["real", "fake", "dilated"],
		compiler_opt_level: ["O0", "O1", "O2", "O3", "Os", "Oz"],
	};

	return options[columnId] || ["unknown"];
}

/**
 * Wrap text to max width
 */
function wrapText(text: string, maxWidth: number): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let current = "";

	for (const word of words) {
		if ((current + word).length > maxWidth) {
			lines.push(current.trim());
			current = `${word} `;
		} else {
			current += `${word} `;
		}
	}

	if (current.trim()) {
		lines.push(current.trim());
	}

	return lines;
}

/**
 * Render a full context with values
 */
export function renderContext(ctx: ColumnContext): void {
	console.log(`${COLORS.bold}Column Context${COLORS.reset}`);
	console.log(`  Version: ${ctx.version}`);
	console.log(`  Bun: ${ctx.bunVersion}`);
	console.log(`  Run ID: ${ctx.meta.runId}`);
	console.log(`  Environment: ${ctx.meta.environment}`);
	console.log(`  Platform: ${ctx.meta.platform}/${ctx.meta.arch}`);
	console.log();

	const categories: ColumnCategory[] = [
		"core",
		"security",
		"storage",
		"compute",
		"protocol",
		"hardware",
		"audit",
	];

	for (const cat of categories) {
		const cols = getColumnsByCategory(cat);
		if (cols.length === 0) continue;

		const color = CATEGORY_COLORS[cat];
		console.log(`${color}${COLORS.bold}${cat.toUpperCase()}${COLORS.reset}`);

		for (const col of cols.sort((a, b) => a.index - b.index)) {
			const val = ctx.columns[col.id];
			const status = val?.valid
				? `${COLORS.green}✓${COLORS.reset}`
				: val?.error
					? `${COLORS.red}✗${COLORS.reset}`
					: `${COLORS.dim}○${COLORS.reset}`;

			const valueStr = String(val?.value ?? "unset").slice(0, 20);
			console.log(
				`  ${status} ${col.index.toString().padStart(2, "0")} ${col.id.padEnd(25)} = ${valueStr}`,
			);
		}

		console.log();
	}
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const command = Bun.argv[2];

	switch (command) {
		case "grid": {
			renderMatrixGrid();
			break;
		}

		case "show": {
			const index = parseInt(Bun.argv[3], 10);
			if (Number.isNaN(index) || index < 1 || index > 60) {
				console.log("Usage: bun run column-ctx-visualizer.ts show <1-60>");
				process.exit(1);
			}
			renderColumnDetails(index);
			break;
		}

		case "demo": {
			const ctx = createColumnContext({
				runId: `demo-${Date.now()}`,
				environment: "demo",
				commit: "abc123",
				platform: process.platform,
				arch: process.arch,
			});

			renderContext(ctx);
			break;
		}

		case "search": {
			const query = Bun.argv[3]?.toLowerCase();
			if (!query) {
				console.log("Usage: bun run column-ctx-visualizer.ts search <term>");
				process.exit(1);
			}

			console.log(`Searching for: "${query}"\n`);

			const matches = Object.values(COLUMN_STANDARDS).filter(
				(col) =>
					col.id.toLowerCase().includes(query) ||
					col.displayName.toLowerCase().includes(query) ||
					col.description.toLowerCase().includes(query),
			);

			for (const col of matches) {
				console.log(`${col.index.toString().padStart(2, "0")}: ${col.displayName}`);
				console.log(`    ${col.description}\n`);
			}

			console.log(`Found ${matches.length} match(es)`);
			break;
		}

		default: {
			console.log("Tier-1380 OMEGA Column Context Visualizer\n");
			console.log("Commands:");
			console.log("  grid          Show 60-column matrix grid");
			console.log("  show <index>  Show detailed column info (1-60)");
			console.log("  demo          Render demo context");
			console.log("  search <term> Search columns by term");
		}
	}
}
