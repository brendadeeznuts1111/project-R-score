/**
 * Tier-1380 OMEGA: Matrix Table Visualization
 *
 * Enhanced matrix table with team colors, filtering, and aggregation
 * Integrates with RSS, Blog, Team, and Mapping systems
 *
 * @module MatrixTable
 * @tier 1380-OMEGA
 */

import { getTeamForColumn, TEAMS, type TeamId } from "../core/team/TeamManager";
import { type BaseColumn, COLUMN_STANDARDS } from "./column-standards";

// ANSI Colors
const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	// Team colors
	runtime: "\x1b[38;5;75m",
	security: "\x1b[38;5;203m",
	platform: "\x1b[38;5;141m",
	infra: "\x1b[38;5;78m",
	// States
	active: "\x1b[32m",
	inactive: "\x1b[90m",
	warning: "\x1b[33m",
};

const TEAM_COLORS: Record<TeamId, string> = {
	runtime: COLORS.runtime,
	security: COLORS.security,
	platform: COLORS.platform,
	infra: COLORS.infra,
};

/**
 * Matrix cell data
 */
export interface MatrixCell {
	column: BaseColumn;
	value: unknown;
	team?: TeamId;
	status: "active" | "inactive" | "warning";
	lastUpdated?: Date;
}

/**
 * Matrix table options
 */
export interface MatrixTableOptions {
	team?: TeamId;
	category?: string;
	showValues?: boolean;
	showTeams?: boolean;
	compact?: boolean;
}

/**
 * Render 60-column matrix with team colors
 */
export function renderMatrixGrid(options: MatrixTableOptions = {}): string {
	const { team, showTeams = true } = options;
	const lines: string[] = [];

	lines.push(`${COLORS.bold}Tier-1380 OMEGA 60-Column Matrix${COLORS.reset}\n`);

	// Legend
	if (showTeams) {
		lines.push("Teams:");
		for (const [id, t] of Object.entries(TEAMS)) {
			lines.push(`  ${TEAM_COLORS[id as TeamId]}${t.emoji} ${t.name}${COLORS.reset}`);
		}
		lines.push("");
	}

	// Grid
	for (let row = 0; row < 6; row++) {
		const rowStr: string[] = [];
		for (let col = 0; col < 10; col++) {
			const idx = row * 10 + col + 1;
			const column = Object.values(COLUMN_STANDARDS).find((c) => c.index === idx);

			if (column) {
				const colTeam = getTeamForColumn(idx);
				const isTargetTeam = !team || colTeam?.id === team;

				if (showTeams && colTeam) {
					const color = isTargetTeam ? TEAM_COLORS[colTeam.id] : COLORS.inactive;
					rowStr.push(`${color}${idx.toString().padStart(2, "0")}${COLORS.reset}`);
				} else {
					rowStr.push(idx.toString().padStart(2, "0"));
				}
			} else {
				rowStr.push(`${COLORS.dim}..${COLORS.reset}`);
			}
		}
		lines.push(`  ${rowStr.join(" ")}`);
	}

	return lines.join("\n");
}

/**
 * Render detailed column table
 */
export function renderColumnTable(options: MatrixTableOptions = {}): string {
	const { team, category, showValues = true } = options;
	const lines: string[] = [];

	let columns = Object.values(COLUMN_STANDARDS);

	if (team) {
		columns = columns.filter((c) => getTeamForColumn(c.index)?.id === team);
	}

	if (category) {
		columns = columns.filter((c) => c.category === category);
	}

	columns.sort((a, b) => a.index - b.index);

	lines.push(`${COLORS.bold}Column Details${COLORS.reset}\n`);
	lines.push(
		`${COLORS.dim}Idx | Team | ID                    | Type     | Required | Value${COLORS.reset}`,
	);
	lines.push(`${COLORS.dim}${"─".repeat(90)}${COLORS.reset}`);

	for (const col of columns) {
		const colTeam = getTeamForColumn(col.index);
		const teamStr = colTeam
			? `${TEAM_COLORS[colTeam.id]}${colTeam.id.slice(0, 4)}${COLORS.reset}`
			: "    ";

		const valueStr = showValues ? String(col.defaultValue).slice(0, 20).padEnd(20) : "";

		lines.push(
			`${col.index.toString().padStart(2)}  ${teamStr}  ${col.id.padEnd(20)} ${col.type.padEnd(8)} ${col.required ? "yes" : "no "}     ${valueStr}`,
		);
	}

	return lines.join("\n");
}

/**
 * Render matrix statistics by team
 */
export function renderTeamStats(): string {
	const lines: string[] = [];
	lines.push(`${COLORS.bold}Matrix Statistics by Team${COLORS.reset}\n`);

	for (const team of Object.values(TEAMS)) {
		const cols = team.matrixColumns;
		const categories = new Set(cols.map((c) => getColumnCategory(c)));

		lines.push(`${TEAM_COLORS[team.id]}${team.emoji} ${team.name}${COLORS.reset}`);
		lines.push(`  Columns: ${cols.length} (${cols[0]}-${cols[cols.length - 1]})`);
		lines.push(`  Categories: ${Array.from(categories).join(", ")}`);
		lines.push(`  Tier: ${team.tier}`);
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Get column category by index
 */
function getColumnCategory(index: number): string {
	const col = Object.values(COLUMN_STANDARDS).find((c) => c.index === index);
	return col?.category || "unknown";
}

/**
 * Render RSS feed as matrix
 */
export function renderRSSMatrix(
	feedItems: Array<{ title: string; team: string; date: Date }>,
): string {
	const lines: string[] = [];
	lines.push(`${COLORS.bold}RSS Feed Matrix${COLORS.reset}\n`);

	for (const item of feedItems) {
		const teamColor = TEAM_COLORS[item.team as TeamId] || COLORS.dim;
		lines.push(
			`${teamColor}[${item.team.slice(0, 4).toUpperCase()}]${COLORS.reset} ${item.title}`,
		);
		lines.push(
			`       ${COLORS.dim}${item.date.toISOString().split("T")[0]}${COLORS.reset}`,
		);
	}

	return lines.join("\n");
}

/**
 * Render blog post matrix
 */
export function renderBlogMatrix(
	posts: Array<{ title: string; team: string; tier: string }>,
): string {
	const lines: string[] = [];
	lines.push(`${COLORS.bold}Blog Post Matrix${COLORS.reset}\n`);

	for (const post of posts) {
		const teamColor = TEAM_COLORS[post.team as TeamId] || COLORS.dim;
		const tierColor = post.tier === "1380" ? COLORS.active : COLORS.warning;
		lines.push(
			`${teamColor}[${post.team.slice(0, 4).toUpperCase()}]${COLORS.reset} ${tierColor}[${post.tier}]${COLORS.reset} ${post.title}`,
		);
	}

	return lines.join("\n");
}

/**
 * Interactive matrix query
 */
export function queryMatrix(query: {
	team?: TeamId;
	minTier?: number;
	category?: string;
}): {
	columns: BaseColumn[];
	count: number;
} {
	let columns = Object.values(COLUMN_STANDARDS);

	if (query.team) {
		const teamCols = TEAMS[query.team]?.matrixColumns || [];
		columns = columns.filter((c) => teamCols.includes(c.index));
	}

	if (query.category) {
		columns = columns.filter((c) => c.category === query.category);
	}

	return { columns, count: columns.length };
}

// CLI
if (import.meta.main) {
	const command = Bun.argv[2];

	switch (command) {
		case "grid": {
			console.log(renderMatrixGrid());
			break;
		}

		case "team": {
			const team = Bun.argv[3] as TeamId;
			if (team && !TEAMS[team]) {
				console.error(`Unknown team: ${team}`);
				process.exit(1);
			}
			console.log(renderMatrixGrid({ team }));
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
			const result = queryMatrix({ team });
			console.log(`Query results for team=${team || "all"}:`);
			console.log(`  Found: ${result.count} columns`);
			for (const col of result.columns) {
				console.log(`    ${col.index}: ${col.id}`);
			}
			break;
		}

		case "demo": {
			console.log(renderMatrixGrid());
			console.log("\n");
			console.log(renderTeamStats());
			break;
		}

		default: {
			console.log("Tier-1380 OMEGA Matrix Table\n");
			console.log("Commands:");
			console.log("  grid         Show colored matrix grid");
			console.log("  team <name>  Show grid for specific team");
			console.log("  table        Show detailed column table");
			console.log("  stats        Show team statistics");
			console.log("  query <team> Query columns by team");
			console.log("  demo         Full demonstration");
		}
	}
}
