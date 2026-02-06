/**
 * Tier-1380 OMEGA: 90-Column Matrix Table Visualization
 *
 * Enhanced matrix table with 90 columns, team colors, and protocol hyperlinks
 *
 * @module MatrixTable90
 * @tier 1380-OMEGA-90COL
 */

import { getTeamForColumn, TEAMS, type TeamId } from "../core/team/TeamManager";
import { type BaseColumn, COLUMN_STANDARDS } from "./column-standards";
import {
	COLUMN_ZONES_90,
	EXTENDED_COLUMN_STANDARDS,
	getZoneForColumn,
} from "./column-standards-extended";

// Merge all 90 column standards
const ALL_COLUMNS: Record<string, BaseColumn> = {
	...COLUMN_STANDARDS,
	...EXTENDED_COLUMN_STANDARDS,
};

// ANSI Colors
const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	underline: "\x1b[4m",
	// Team colors
	runtime: "\x1b[38;5;75m", // Blue
	security: "\x1b[38;5;203m", // Red
	platform: "\x1b[38;5;141m", // Purple
	tension: "\x1b[38;5;208m", // Orange
	infra: "\x1b[38;5;78m", // Green
	validation: "\x1b[38;5;220m", // Yellow
	// Zone colors
	extensibility: "\x1b[38;5;250m", // White/Gray
	// States
	active: "\x1b[32m",
	inactive: "\x1b[90m",
	warning: "\x1b[33m",
	error: "\x1b[31m",
	// Hyperlink
	hyperlink: "\x1b]8;;",
};

const TEAM_COLORS: Record<TeamId, string> = {
	runtime: COLORS.runtime,
	security: COLORS.security,
	platform: COLORS.platform,
	tension: COLORS.tension,
	infra: COLORS.infra,
	validation: COLORS.validation,
};

/**
 * Matrix cell data
 */
export interface MatrixCell {
	column: BaseColumn;
	value: unknown;
	team?: TeamId;
	status: "active" | "inactive" | "warning" | "error";
	lastUpdated?: Date;
	profileLink?: string; // OSC 8 hyperlink
}

/**
 * Matrix table options
 */
export interface MatrixTableOptions {
	team?: TeamId;
	zone?: string;
	columns?: string; // Range like "31-45" or "61-75"
	showValues?: boolean;
	showTeams?: boolean;
	showZones?: boolean;
	compact?: boolean;
	protocol?: boolean; // Enable OSC 8 hyperlinks
	full?: boolean; // Show all 90 columns
}

/**
 * Create OSC 8 hyperlink
 */
function _createHyperlink(text: string, url: string): string {
	return `${COLORS.hyperlink}${url}\x07${text}\x1b]8;;\x07`;
}

/**
 * Parse column range string (e.g., "31-45")
 */
function parseColumnRange(range: string): [number, number] {
	const parts = range.split("-").map((p) => parseInt(p.trim(), 10));
	if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
		return [parts[0], parts[1]];
	}
	return [1, 90];
}

/**
 * Render 90-column matrix with team colors and zones
 */
export function renderMatrixGrid(options: MatrixTableOptions = {}): string {
	const {
		team,
		zone,
		columns,
		showTeams = true,
		showZones = true,
		full = true,
	} = options;
	const lines: string[] = [];

	// Header
	lines.push(
		`${COLORS.bold}╔══════════════════════════════════════════════════════════════════════════════╗${COLORS.reset}`,
	);
	lines.push(
		`${COLORS.bold}║${COLORS.reset}  🔥 Tier-1380 OMEGA 90-Column Matrix${" ".repeat(51)}${COLORS.bold}║${COLORS.reset}`,
	);
	lines.push(
		`${COLORS.bold}╚══════════════════════════════════════════════════════════════════════════════╝${COLORS.reset}`,
	);
	lines.push("");

	// Zone legend
	if (showZones) {
		lines.push("Team Zones:");
		lines.push(
			`  ${COLORS.runtime}🔵 Runtime (1-10)${COLORS.reset}    ${COLORS.security}🔴 Security (11-20)${COLORS.reset}  ${COLORS.platform}🟣 Platform (21-30)${COLORS.reset}`,
		);
		lines.push(
			`  ${COLORS.tension}🟠 Tension (31-45)${COLORS.reset}   ${COLORS.infra}🟢 Infra (46-60)${COLORS.reset}     ${COLORS.validation}🟡 Validation (61-75)${COLORS.reset}`,
		);
		lines.push(`  ${COLORS.extensibility}⚪ Extensibility (76-90)${COLORS.reset}`);
		lines.push("");
	}

	// Determine column range
	let startCol = 1;
	let endCol = 90;

	if (columns) {
		[startCol, endCol] = parseColumnRange(columns);
	} else if (zone && COLUMN_ZONES_90[zone as keyof typeof COLUMN_ZONES_90]) {
		const z = COLUMN_ZONES_90[zone as keyof typeof COLUMN_ZONES_90];
		startCol = z.start;
		endCol = z.end;
	} else if (!full) {
		endCol = 60; // Default to 60 for backward compatibility
	}

	// Calculate rows (10 columns per row)
	const startRow = Math.floor((startCol - 1) / 10);
	const endRow = Math.floor((endCol - 1) / 10);

	// Grid
	for (let row = startRow; row <= endRow; row++) {
		const rowStart = row * 10 + 1;
		const rowEnd = row * 10 + 10;

		// Zone header for this row
		const zoneName = getZoneForColumn(rowStart);
		if (zoneName) {
			const zoneColor = COLUMN_ZONES_90[zoneName]?.color || COLORS.dim;
			lines.push(
				`${zoneColor}${rowStart.toString().padStart(2)}-${rowEnd.toString().padStart(2)} │${COLORS.reset}`,
			);
		}

		const rowStr: string[] = [];
		for (let col = 0; col < 10; col++) {
			const idx = row * 10 + col + 1;

			// Skip if outside requested range
			if (idx < startCol || idx > endCol) {
				rowStr.push("  ");
				continue;
			}

			const column = Object.values(ALL_COLUMNS).find((c) => c.index === idx);

			if (column) {
				const colTeam = getTeamForColumn(idx);
				const isTargetTeam = !team || colTeam?.id === team;
				const isInZone = !zone || getZoneForColumn(idx) === zone;

				if (showTeams && colTeam && isTargetTeam && isInZone) {
					const color = TEAM_COLORS[colTeam.id];
					const display = idx.toString().padStart(2, "0");

					// Add profile link indicator for column 76
					if (idx === 76 && options.protocol) {
						rowStr.push(`${color}${display}🔗${COLORS.reset}`);
					} else {
						rowStr.push(`${color}${display}${COLORS.reset}`);
					}
				} else if (!isTargetTeam || !isInZone) {
					rowStr.push(`${COLORS.dim}${idx.toString().padStart(2, "0")}${COLORS.reset}`);
				} else {
					rowStr.push(idx.toString().padStart(2, "0"));
				}
			} else {
				rowStr.push(`${COLORS.dim}..${COLORS.reset}`);
			}
		}
		lines.push(`  ${rowStr.join(" ")}`);
	}

	lines.push("");

	// Profile link footer
	if (options.protocol) {
		lines.push(`${COLORS.dim}Profile Links:${COLORS.reset}`);
		lines.push(`  🔗 Col 76: Clickable CPU profile link (OSC 8)`);
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Render detailed column table
 */
export function renderColumnTable(options: MatrixTableOptions = {}): string {
	const { team, zone, columns, showValues = true } = options;
	const lines: string[] = [];

	let cols = Object.values(ALL_COLUMNS);

	if (team) {
		cols = cols.filter((c) => getTeamForColumn(c.index)?.id === team);
	}

	if (zone) {
		cols = cols.filter((c) => getZoneForColumn(c.index) === zone);
	}

	if (columns) {
		const [start, end] = parseColumnRange(columns);
		cols = cols.filter((c) => c.index >= start && c.index <= end);
	}

	cols.sort((a, b) => a.index - b.index);

	lines.push(`${COLORS.bold}90-Column Matrix Details${COLORS.reset}\n`);
	lines.push(
		`${COLORS.dim}Idx │ Zone         │ Team │ ID                    │ Type     │ Req │ Description${COLORS.reset}`,
	);
	lines.push(`${COLORS.dim}${"─".repeat(120)}${COLORS.reset}`);

	for (const col of cols.slice(0, 50)) {
		// Limit to prevent overflow
		const colTeam = getTeamForColumn(col.index);
		const colZone = getZoneForColumn(col.index) || "unknown";
		const teamColor = colTeam ? TEAM_COLORS[colTeam.id] : COLORS.dim;
		const teamStr = colTeam
			? `${teamColor}${colTeam.id.slice(0, 4)}${COLORS.reset}`
			: "    ";

		const desc = col.description.slice(0, 40).padEnd(40);

		lines.push(
			`${col.index.toString().padStart(2)}  │ ${colZone.padEnd(12)} │ ${teamStr} │ ${col.id.slice(0, 20).padEnd(20)} │ ${col.type.padEnd(8)} │ ${col.required ? "✓" : " "}   │ ${desc}`,
		);
	}

	if (cols.length > 50) {
		lines.push(`${COLORS.dim}... and ${cols.length - 50} more columns${COLORS.reset}`);
	}

	return lines.join("\n");
}

/**
 * Render matrix statistics by team
 */
export function renderTeamStats(): string {
	const lines: string[] = [];
	lines.push(`${COLORS.bold}90-Column Matrix Statistics by Team${COLORS.reset}\n`);

	for (const team of Object.values(TEAMS)) {
		const cols = team.matrixColumns;
		const percentage = ((cols.length / 90) * 100).toFixed(1);

		lines.push(`${TEAM_COLORS[team.id]}${team.emoji} ${team.name}${COLORS.reset}`);
		lines.push(
			`  Columns: ${cols.length}/90 (${percentage}%) - ${cols[0]}-${cols[cols.length - 1]}`,
		);
		lines.push(`  Responsibilities: ${team.responsibilities.join(", ")}`);
		lines.push("");
	}

	// Zone summary
	lines.push(`${COLORS.bold}Zone Distribution:${COLORS.reset}`);
	const zones = [
		{ name: "Core", range: "1-10", color: COLORS.runtime },
		{ name: "Security", range: "11-20", color: COLORS.security },
		{ name: "Platform", range: "21-30", color: COLORS.platform },
		{ name: "Tension", range: "31-45", color: COLORS.tension },
		{ name: "Infra", range: "46-60", color: COLORS.infra },
		{ name: "Validation", range: "61-75", color: COLORS.validation },
		{ name: "Extensibility", range: "76-90", color: COLORS.extensibility },
	];

	for (const zone of zones) {
		lines.push(`  ${zone.color}${zone.name.padEnd(13)}${COLORS.reset} ${zone.range}`);
	}

	return lines.join("\n");
}

/**
 * Interactive matrix query
 */
export function queryMatrix(query: {
	team?: TeamId;
	zone?: string;
	minColumn?: number;
	maxColumn?: number;
	hasProfile?: boolean;
}): {
	columns: BaseColumn[];
	count: number;
} {
	let columns = Object.values(ALL_COLUMNS);

	if (query.team) {
		columns = columns.filter((c) => getTeamForColumn(c.index)?.id === query.team);
	}

	if (query.zone) {
		columns = columns.filter((c) => getZoneForColumn(c.index) === query.zone);
	}

	if (query.minColumn !== undefined) {
		columns = columns.filter((c) => c.index >= query.minColumn!);
	}

	if (query.maxColumn !== undefined) {
		columns = columns.filter((c) => c.index <= query.maxColumn!);
	}

	if (query.hasProfile) {
		columns = columns.filter((c) => c.index === 76); // Profile link column
	}

	return { columns, count: columns.length };
}

/**
 * Render sample 90-column grid with hyperlinks
 */
export function renderFull90Demo(): string {
	const lines: string[] = [];

	lines.push(renderMatrixGrid({ full: true, protocol: true }));
	lines.push("");
	lines.push(renderTeamStats());

	return lines.join("\n");
}

// CLI
if (import.meta.main) {
	const command = Bun.argv[2];

	switch (command) {
		case "grid": {
			const full = Bun.argv.includes("--full");
			const protocol = Bun.argv.includes("--protocol");
			const zone = Bun.argv.find((a) => a.startsWith("--zone="))?.split("=")[1];
			const columns = Bun.argv.find((a) => a.startsWith("--columns="))?.split("=")[1];
			const team = Bun.argv
				.find((a) => a.startsWith("--team="))
				?.split("=")[1] as TeamId;

			console.log(renderMatrixGrid({ full, protocol, zone, columns, team }));
			break;
		}

		case "table": {
			console.log(renderColumnTable());
			break;
		}

		case "stats": {
			console.log(renderTeamStats());
			break;
		}

		case "query": {
			const team = Bun.argv[3] as TeamId;
			const zone = Bun.argv[4];
			const result = queryMatrix({ team, zone });
			console.log(`Query results:`);
			console.log(`  Team: ${team || "all"}`);
			console.log(`  Zone: ${zone || "all"}`);
			console.log(`  Found: ${result.count} columns`);
			for (const col of result.columns.slice(0, 20)) {
				const t = getTeamForColumn(col.index);
				console.log(`    ${col.index}: ${col.id} (${t?.id || "unassigned"})`);
			}
			if (result.columns.length > 20) {
				console.log(`    ... and ${result.columns.length - 20} more`);
			}
			break;
		}

		case "demo": {
			console.log(renderFull90Demo());
			break;
		}

		case "zones": {
			console.log("90-Column Matrix Zones:\n");
			for (const [name, zone] of Object.entries(COLUMN_ZONES_90)) {
				console.log(
					`${zone.emoji} ${name.padEnd(13)} ${zone.start.toString().padStart(2)}-${zone.end.toString().padStart(2)}`,
				);
			}
			break;
		}

		default: {
			console.log("Tier-1380 OMEGA 90-Column Matrix Table\n");
			console.log("Commands:");
			console.log("  grid [options]    Show colored matrix grid");
			console.log("    --full          Show all 90 columns (default: 60)");
			console.log("    --protocol      Enable OSC 8 hyperlinks");
			console.log("    --zone=<name>   Filter by zone");
			console.log("    --columns=x-y   Show column range");
			console.log("    --team=<name>   Filter by team");
			console.log("  table             Show detailed column table");
			console.log("  stats             Show team statistics");
			console.log("  query [team] [zone]  Query columns");
			console.log("  zones             List all zones");
			console.log("  demo              Full demonstration");
			console.log(
				"\nZones: core, security, platform, tension, infra, validation, extensibility",
			);
			console.log("Teams: runtime, security, platform, tension, infra, validation");
		}
	}
}
