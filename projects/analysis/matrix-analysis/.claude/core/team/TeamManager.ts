/**
 * Tier-1380 OMEGA: Team Manager (90-Column Edition)
 *
 * Team identity, permissions, and namespace management
 * Updated for 90-column matrix expansion
 *
 * @module TeamManager
 * @tier 1380-OMEGA-90COL
 */

export type TeamId =
	| "runtime"
	| "security"
	| "platform"
	| "infra"
	| "tension"
	| "validation";

export interface Team {
	id: TeamId;
	name: string;
	email: string;
	tier: "950" | "1320" | "1370" | "1380";
	color: string;
	emoji: string;
	responsibilities: string[];
	matrixColumns: number[]; // Primary columns this team owns
}

export interface TeamMember {
	id: string;
	name: string;
	email: string;
	team: TeamId;
	role: "lead" | "senior" | "engineer";
	matrixPermissions: number[]; // Columns they can modify
}

/**
 * Team definitions for 90-column matrix
 */
export const TEAMS: Record<TeamId, Team> = {
	runtime: {
		id: "runtime",
		name: "Factory Wager Runtime",
		email: "runtime@factory-wager.com",
		tier: "950",
		color: "#3b82f6",
		emoji: "⚡",
		responsibilities: ["JavaScript engine", "Performance", "Core APIs"],
		matrixColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	},
	security: {
		id: "security",
		name: "Factory Wager Security",
		email: "security@factory-wager.com",
		tier: "1320",
		color: "#ef4444",
		emoji: "🔒",
		responsibilities: ["Secrets", "CSRF", "Forensics", "Audits"],
		matrixColumns: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
	},
	platform: {
		id: "platform",
		name: "Factory Wager Platform",
		email: "platform@factory-wager.com",
		tier: "1320",
		color: "#8b5cf6",
		emoji: "🏗️",
		responsibilities: ["Storage", "R2/S3", "Databases", "Edge"],
		matrixColumns: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
	},
	tension: {
		id: "tension",
		name: "Factory Wager Tension Field",
		email: "tension@factory-wager.com",
		tier: "1380",
		color: "#f97316",
		emoji: "🌊",
		responsibilities: [
			"Anomaly detection",
			"Volume analysis",
			"XGBoost models",
			"Overreaction metrics",
		],
		matrixColumns: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
	},
	infra: {
		id: "infra",
		name: "Factory Wager Infrastructure",
		email: "infra@factory-wager.com",
		tier: "1320",
		color: "#10b981",
		emoji: "🌐",
		responsibilities: ["Hardware", "ARM64", "SIMD", "Compiler opts"],
		matrixColumns: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
	},
	validation: {
		id: "validation",
		name: "Factory Wager Validation",
		email: "validation@factory-wager.com",
		tier: "1380",
		color: "#eab308",
		emoji: "✅",
		responsibilities: [
			"Schema validation",
			"Baseline tracking",
			"Compliance",
			"Regression detection",
		],
		matrixColumns: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75],
	},
};

/**
 * 90-Column zone ownership
 */
export const COLUMN_ZONES = {
	core: { team: "runtime", range: [1, 10], color: "\x1b[38;5;75m" },
	security: { team: "security", range: [11, 20], color: "\x1b[38;5;203m" },
	platform: { team: "platform", range: [21, 30], color: "\x1b[38;5;141m" },
	tension: { team: "tension", range: [31, 45], color: "\x1b[38;5;208m" },
	infra: { team: "infra", range: [46, 60], color: "\x1b[38;5;78m" },
	validation: { team: "validation", range: [61, 75], color: "\x1b[38;5;220m" },
	extensibility: { team: "infra", range: [76, 90], color: "\x1b[38;5;250m" },
};

/**
 * Get team by ID
 */
export function getTeam(id: TeamId): Team {
	return TEAMS[id];
}

/**
 * List all teams
 */
export function listTeams(): Team[] {
	return Object.values(TEAMS);
}

/**
 * Get team for a matrix column (90-column)
 */
export function getTeamForColumn(columnIndex: number): Team | undefined {
	// Check tension zone (31-45)
	if (columnIndex >= 31 && columnIndex <= 45) {
		return TEAMS.tension;
	}
	// Check validation zone (61-75)
	if (columnIndex >= 61 && columnIndex <= 75) {
		return TEAMS.validation;
	}
	// Check extensibility zone (76-90)
	if (columnIndex >= 76 && columnIndex <= 90) {
		return TEAMS.infra;
	}
	// Fall back to original mapping
	return Object.values(TEAMS).find((t) => t.matrixColumns.includes(columnIndex));
}

/**
 * Check if team can access column
 */
export function canAccessColumn(teamId: TeamId, columnIndex: number): boolean {
	const team = TEAMS[teamId];
	return team?.matrixColumns.includes(columnIndex) || false;
}

/**
 * Get column ownership map for 90-column matrix
 */
export function getColumnOwnership(): Map<number, TeamId> {
	const map = new Map<number, TeamId>();

	// Core (1-10): runtime
	for (let i = 1; i <= 10; i++) map.set(i, "runtime");

	// Security (11-20): security
	for (let i = 11; i <= 20; i++) map.set(i, "security");

	// Platform (21-30): platform
	for (let i = 21; i <= 30; i++) map.set(i, "platform");

	// Tension (31-45): tension
	for (let i = 31; i <= 45; i++) map.set(i, "tension");

	// Infra (46-60): infra
	for (let i = 46; i <= 60; i++) map.set(i, "infra");

	// Validation (61-75): validation
	for (let i = 61; i <= 75; i++) map.set(i, "validation");

	// Extensibility (76-90): infra (managed)
	for (let i = 76; i <= 90; i++) map.set(i, "infra");

	return map;
}

/**
 * Get zone for column index
 */
export function getZoneForColumn(index: number): string | null {
	if (index >= 1 && index <= 10) return "core";
	if (index >= 11 && index <= 20) return "security";
	if (index >= 21 && index <= 30) return "platform";
	if (index >= 31 && index <= 45) return "tension";
	if (index >= 46 && index <= 60) return "infra";
	if (index >= 61 && index <= 75) return "validation";
	if (index >= 76 && index <= 90) return "extensibility";
	return null;
}

/**
 * Format team badge for terminal
 */
export function formatTeamBadge(team: Team): string {
	return `${team.emoji} ${team.name}`;
}

/**
 * 90-Column matrix visualization
 */
export function getTeamMatrixVisualization(): string {
	const lines: string[] = [];
	lines.push("Tier-1380 OMEGA 90-Column Team Ownership:");
	lines.push("");

	// Header with zones
	lines.push(
		"Zone Map: 🔵Core 🔴Security 🟣Platform 🟠Tension 🟢Infra 🟡Validation ⚪Extensibility",
	);
	lines.push("");

	// 9 rows of 10 columns each
	for (let row = 0; row < 9; row++) {
		const rowStr: string[] = [];
		for (let col = 0; col < 10; col++) {
			const idx = row * 10 + col + 1;
			const team = getTeamForColumn(idx);
			if (team) {
				rowStr.push(team.id.slice(0, 2).toUpperCase());
			} else {
				rowStr.push("..");
			}
		}
		lines.push(
			`${(row * 10 + 1).toString().padStart(2)}-${((row + 1) * 10).toString().padStart(2)}: ${rowStr.join(" ")}`,
		);
	}

	lines.push("");
	lines.push("Legend:");
	for (const team of Object.values(TEAMS)) {
		lines.push(`  ${team.id.slice(0, 2).toUpperCase()} = ${team.emoji} ${team.name}`);
	}
	lines.push("  .. = Unassigned");

	return lines.join("\n");
}

/**
 * Get team statistics
 */
export function getTeamStats(): Record<TeamId, { columns: number; percentage: string }> {
	const stats = {} as Record<TeamId, { columns: number; percentage: string }>;

	for (const team of Object.values(TEAMS)) {
		const count = team.matrixColumns.length;
		const pct = ((count / 90) * 100).toFixed(1);
		stats[team.id] = { columns: count, percentage: `${pct}%` };
	}

	return stats;
}

// CLI
if (import.meta.main) {
	const command = Bun.argv[2];

	switch (command) {
		case "list": {
			console.log("Tier-1380 OMEGA Teams (90-Column Matrix):\n");
			for (const team of listTeams()) {
				console.log(`${formatTeamBadge(team)}`);
				console.log(`  Tier: ${team.tier}`);
				console.log(`  Email: ${team.email}`);
				console.log(
					`  Columns: ${team.matrixColumns[0]}-${team.matrixColumns[team.matrixColumns.length - 1]} (${team.matrixColumns.length} cols)`,
				);
				console.log(`  Responsibilities: ${team.responsibilities.join(", ")}`);
				console.log();
			}
			break;
		}

		case "matrix": {
			console.log(getTeamMatrixVisualization());
			break;
		}

		case "stats": {
			console.log("Team Statistics (90-Column Matrix):\n");
			const stats = getTeamStats();
			for (const [teamId, stat] of Object.entries(stats)) {
				const team = TEAMS[teamId as TeamId];
				console.log(
					`${team.emoji} ${team.name}: ${stat.columns} columns (${stat.percentage})`,
				);
			}
			break;
		}

		case "owns": {
			const col = parseInt(Bun.argv[3], 10);
			if (Number.isNaN(col) || col < 1 || col > 90) {
				console.log("Usage: bun run TeamManager.ts owns <column (1-90)>");
				process.exit(1);
			}
			const team = getTeamForColumn(col);
			const zone = getZoneForColumn(col);
			if (team) {
				console.log(`Column ${col} (${zone}): ${formatTeamBadge(team)}`);
			} else {
				console.log(`Column ${col}: Unassigned`);
			}
			break;
		}

		case "can": {
			const teamId = Bun.argv[3] as TeamId;
			const col = parseInt(Bun.argv[4], 10);
			if (!teamId || Number.isNaN(col)) {
				console.log("Usage: bun run TeamManager.ts can <team> <column>");
				process.exit(1);
			}
			if (!TEAMS[teamId]) {
				console.log(`Unknown team: ${teamId}`);
				console.log(`Available: ${Object.keys(TEAMS).join(", ")}`);
				process.exit(1);
			}
			const can = canAccessColumn(teamId, col);
			console.log(
				`${TEAMS[teamId].emoji} ${teamId} ${can ? "✅ CAN" : "❌ CANNOT"} access column ${col}`,
			);
			break;
		}

		case "zone": {
			const col = parseInt(Bun.argv[3], 10);
			if (Number.isNaN(col) || col < 1 || col > 90) {
				console.log("Usage: bun run TeamManager.ts zone <column (1-90)>");
				process.exit(1);
			}
			const zone = getZoneForColumn(col);
			const team = getTeamForColumn(col);
			console.log(`Column ${col}:`);
			console.log(`  Zone: ${zone || "unknown"}`);
			console.log(`  Team: ${team ? formatTeamBadge(team) : "unassigned"}`);
			break;
		}

		default: {
			console.log("Tier-1380 OMEGA Team Manager (90-Column)\n");
			console.log("Commands:");
			console.log("  list              List all teams with 90-column ownership");
			console.log("  matrix            Show 90-column team ownership grid");
			console.log("  stats             Show team column statistics");
			console.log("  owns <col>        Show which team owns a column (1-90)");
			console.log("  can <team> <col>  Check if team can access column");
			console.log("  zone <col>        Show zone and team for column");
			console.log("\nTeams: runtime, security, platform, tension, infra, validation");
		}
	}
}
