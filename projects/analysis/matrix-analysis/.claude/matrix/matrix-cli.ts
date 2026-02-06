/**
 * Tier-1380 OMEGA: Matrix CLI
 *
 * Command-line interface for matrix operations
 *
 * @module matrix-cli
 * @tier 1380-OMEGA
 */

import { TEAMS } from "../core/team/TeamManager";
import {
	ALL_COLUMNS_91,
	getColumn,
	getColumnsByTeam,
	getColumnsByZone,
	ZONES,
} from "./column-standards-all";

// ═════════════════════════════════════════════════════════════════════════════
// CLI COMMANDS
// ═════════════════════════════════════════════════════════════════════════════

const COMMANDS = {
	// Test commands
	test: async (_args: string[]) => {
		console.log("🔥 Running Matrix Tests...\n");
		const { spawn } = await import("bun");
		const proc = spawn(["bun", "test", "matrix/test-matrix-90.test.ts"], {
			stdout: "inherit",
			stderr: "inherit",
		});
		await proc.exited;
	},

	// Benchmark commands
	bench: async (args: string[]) => {
		console.log("🔥 Running Matrix Benchmarks...\n");
		const { spawn } = await import("bun");

		const env = { ...process.env };
		if (args.includes("--cpu-prof")) {
			env.ENABLE_CPU_PROF = "true";
			console.log("📝 CPU profiling enabled\n");
		}

		const iterations =
			args.find((a) => a.startsWith("--iter="))?.split("=")[1] || "10000";
		env.BENCH_ITERATIONS = iterations;

		const proc = spawn(["bun", "run", "matrix/bench-matrix-90.bench.ts"], {
			stdout: "inherit",
			stderr: "inherit",
			env,
		});
		await proc.exited;
	},

	// CPU Profile command
	"cpu-prof": async (_args: string[]) => {
		console.log("🔥 Running with CPU Profile...\n");
		const { spawn } = await import("bun");

		const proc = spawn(
			["bun", "--cpu-prof", "--cpu-prof-md", "run", "matrix/bench-matrix-90.bench.ts"],
			{
				stdout: "inherit",
				stderr: "inherit",
				env: { ...process.env, ENABLE_CPU_PROF: "true" },
			},
		);

		const exitCode = await proc.exited;

		if (exitCode === 0) {
			console.log("\n✅ CPU Profile generated");
			console.log("📄 Look for: *.cpuprofile and *.md files");
		}
	},

	// Grid display
	grid: (args: string[]) => {
		const full = args.includes("--full");
		const zone = args.find((a) => a.startsWith("--zone="))?.split("=")[1];

		console.log("\n🔥 Tier-1380 OMEGA Matrix Grid\n");
		console.log("═".repeat(80));

		const startCol = full ? 0 : 1;
		const endCol = full ? 91 : 90;

		for (let row = 0; row < 10; row++) {
			const rowStart = row * 10 + startCol;
			const rowEnd = Math.min(row * 10 + 9 + startCol, endCol);

			if (rowStart > endCol) break;

			const cells: string[] = [];
			for (let i = rowStart; i <= rowEnd; i++) {
				const col = ALL_COLUMNS_91[i];
				if (!col) continue;

				if (zone && col.zone !== zone) {
					cells.push("   ");
				} else {
					const color = col.color;
					cells.push(`${color}${i.toString().padStart(2)}${"\x1b[0m"}`);
				}
			}

			console.log(
				`${rowStart.toString().padStart(2)}-${rowEnd.toString().padStart(2)} │ ${cells.join(" ")}`,
			);
		}

		console.log("═".repeat(80));
		console.log("\nZones:");
		for (const [name, meta] of Object.entries(ZONES)) {
			console.log(`  ${meta.emoji} ${name.padEnd(13)} ${meta.start}-${meta.end}`);
		}
	},

	// Column info
	col: (args: string[]) => {
		const idx = Number(args[0]);
		if (Number.isNaN(idx)) {
			console.log("Usage: matrix-cli col <index>");
			return;
		}

		const col = getColumn(idx);
		if (!col) {
			console.log(`Column ${idx} not found`);
			return;
		}

		console.log(`\n🔥 Column ${idx}: ${col.name}\n`);
		console.log(Bun.inspect(col, { colors: true, depth: 3 }));
	},

	// Team info
	team: (args: string[]) => {
		const teamId = args[0] as keyof typeof TEAMS;
		if (!teamId || !TEAMS[teamId]) {
			console.log("Teams:", Object.keys(TEAMS).join(", "));
			return;
		}

		const team = TEAMS[teamId];
		const cols = getColumnsByTeam(teamId);

		console.log(`\n${team.emoji} ${team.name}\n`);
		console.log(`Tier: ${team.tier}`);
		console.log(`Columns: ${cols.length}`);
		console.log(`Responsibilities: ${team.responsibilities.join(", ")}`);
		console.log("\nColumn ranges:");

		for (const col of cols.slice(0, 10)) {
			console.log(`  ${col.index}: ${col.name}`);
		}
		if (cols.length > 10) {
			console.log(`  ... and ${cols.length - 10} more`);
		}
	},

	// Zone info
	zone: (args: string[]) => {
		const zoneName = args[0];
		if (!zoneName) {
			console.log("Zones:", Object.keys(ZONES).join(", "));
			return;
		}

		const cols = getColumnsByZone(zoneName);
		if (cols.length === 0) {
			console.log(`Zone "${zoneName}" not found`);
			return;
		}

		const meta = ZONES[zoneName as keyof typeof ZONES];
		console.log(`\n${meta?.emoji || "📊"} ${zoneName} Zone\n`);
		console.log(`Range: ${meta?.start}-${meta?.end}`);
		console.log(`Columns: ${cols.length}`);

		for (const col of cols) {
			const profile = col.profileLink ? " 🔗" : "";
			console.log(`  ${col.index}: ${col.name}${profile}`);
		}
	},

	// Environment info
	env: () => {
		console.log("\n🔥 Matrix Environment\n");
		console.log(`Bun version: ${Bun.version}`);
		console.log(`Node ENV: ${process.env.NODE_ENV || "not set"}`);
		console.log(`Matrix Tier: ${process.env.MATRIX_TIER || "1380"}`);
		console.log(`Enable Cache: ${process.env.ENABLE_CACHE !== "false"}`);
		console.log(`Validation Strict: ${process.env.VALIDATION_STRICT === "true"}`);
	},

	// Grep Cloudflare columns
	"grep:cf": () => {
		console.log("\n🔥 Cloudflare Zone Columns (21-30)\n");
		const cfCols = Object.values(ALL_COLUMNS_91).filter((c) => c.zone === "cloudflare");
		for (const col of cfCols) {
			const owner = col.owner === "security" ? "🔴" : "🟣";
			const profile = col.profileLink ? " 🔗" : "";
			console.log(
				`  ${owner} ${col.index.toString().padStart(2)} ${col.name}${profile}`,
			);
			console.log(`     Type: ${col.type} | Owner: ${col.owner}`);
			if (col.description) console.log(`     ${col.description}`);
			console.log();
		}
	},

	// Grep DEFAULT column
	"grep:default": async () => {
		console.log("\n⚪ DEFAULT Column (0) - Zone Fallback Values\n");
		const defCol = getColumn(0);
		if (defCol) {
			console.log(`  ${defCol.index}: ${defCol.name}`);
			console.log(`  Type: ${defCol.type} | Owner: ${defCol.owner}`);
			console.log(`  Description: ${defCol.description}`);
			console.log("\n  Zone-specific defaults:");
			const { getDefaultValue } = await import("./default-value-resolver");
			const zones = ["tension", "validation", "security", "integrity", "core"] as const;
			for (const zone of zones) {
				const num = getDefaultValue(zone, "number");
				const str = getDefaultValue(zone, "string");
				console.log(`    ${zone.padEnd(12)} number: ${num}, string: "${str}"`);
			}
		}
	},

	// Query columns with filters
	query: (args: string[]) => {
		const colIdx = args.find((a) => a.startsWith("--columns="))?.split("=")[1];
		const minVal = args.find((a) => a.startsWith("--min-value="))?.split("=")[1];
		const team = args.find((a) => a.startsWith("--team="))?.split("=")[1];
		const jsonOutput = args.includes("--json");

		let cols = Object.values(ALL_COLUMNS_91);

		if (colIdx) {
			const idx = parseInt(colIdx, 10);
			cols = cols.filter((c) => c.index === idx);
		}

		if (team) {
			cols = cols.filter((c) => c.owner === team);
		}

		const result = {
			query: {
				columns: colIdx || "all",
				team: team || "all",
				minValue: minVal || null,
			},
			results: cols.map((c) => ({
				index: c.index,
				name: c.name,
				type: c.type,
				owner: c.owner,
				zone: c.zone,
				profileLink: c.profileLink || false,
			})),
			count: cols.length,
			timestamp: new Date().toISOString(),
		};

		if (jsonOutput) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.log("\n🔥 Matrix Query\n");
			console.log(
				`  Filters: columns=${colIdx || "all"}, team=${team || "all"}, min-value=${minVal || "none"}`,
			);
			console.log(`  Results: ${cols.length} columns\n`);

			for (const col of cols.slice(0, 10)) {
				console.log(`  ${col.index}: ${col.name} (${col.owner}, ${col.type})`);
			}
		}
	},

	// Help
	help: () => {
		console.log(`
🔥 Tier-1380 OMEGA Matrix CLI

Commands:
  test              Run test suite
  bench             Run benchmarks
  bench --cpu-prof  Run with CPU profiling
  cpu-prof          Generate CPU profile (--cpu-prof-md)
  grid              Show matrix grid
  grid --full       Show all 92 columns (0-91)
  grid --zone=X     Filter by zone
  col <index>       Show column details
  team <name>       Show team info
  zone <name>       Show zone info
  grep:cf           Show Cloudflare columns (21-30)
  grep:default      Show DEFAULT column with fallback values
  query             Query columns with filters
  env               Show environment
  help              Show this help

Examples:
  bun matrix/matrix-cli.ts test
  bun matrix/matrix-cli.ts bench --cpu-prof --iter=50000
  bun matrix/matrix-cli.ts grid --zone=tension
  bun matrix/matrix-cli.ts col 31
  bun matrix/matrix-cli.ts team tension
  bun matrix/matrix-cli.ts zone cloudflare
  bun matrix/matrix-cli.ts grep:cf
  bun matrix/matrix-cli.ts grep:default
  bun matrix/matrix-cli.ts query --columns=23 --team=security --min-value=100
`);
	},
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

const command = Bun.argv[2] || "help";
const args = Bun.argv.slice(3);

if (command in COMMANDS) {
	await COMMANDS[command as keyof typeof COMMANDS](args);
} else {
	console.log(`Unknown command: ${command}`);
	COMMANDS.help([]);
}
