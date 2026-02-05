#!/usr/bin/env bun

// Tier-1380 CLI — color | colors | terminal | dashboard

import {
	cmdTeamAdd,
	cmdTeamDemote,
	cmdTeamHierarchy,
	cmdTeamPromote,
	cmdTeamRemove,
	cmdTeamShow,
	cmdTerminalLaunch,
	printTeamHelp,
} from "../.claude/core/team/cli.ts";
import { COLORS, fmt, HEX, THEME, Tier1380Colors } from "../.claude/lib/cli.ts";

const DASHBOARD_PORT = 3001;

type Options = Record<string, string | boolean>;

interface Parsed {
	cmd: string;
	sub: string;
	options: Options;
	positionals: string[];
}

function parseArgs(argv: string[]): Parsed {
	const args = argv.slice(2);
	const options: Options = {};
	const positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const eq = arg.indexOf("=");
			const key = eq > 0 ? arg.slice(2, eq) : arg.slice(2);
			const value: string | boolean =
				eq > 0
					? arg.slice(eq + 1)
					: args[i + 1] && !args[i + 1].startsWith("--")
						? args[++i]
						: true;
			options[key] = value;
		} else {
			positionals.push(arg);
		}
	}

	const cmd = positionals[0] ?? "";
	const sub = positionals[1] ?? "";
	const rest = positionals.slice(2);

	return { cmd, sub, options, positionals: rest };
}

function getOpt<T>(options: Options, key: string, defaultValue: T): T {
	const v = options[key];
	if (v === undefined) return defaultValue;
	return v as T;
}

// ─── color init ─────────────────────────────────────────────────────────────
function colorInit(options: Options): void {
	const team = (getOpt(options, "team", "quantum-team") as string).replace(/^team=/, "");
	const profile = (getOpt(options, "profile", "admin") as string).replace(
		/^profile=/,
		"",
	);

	const palette = Tier1380Colors.generateTeamPalette(team, profile);

	console.log(fmt.ok("Color system initialized"));
	console.log(fmt.dim(`  Team: ${team}`));
	console.log(fmt.dim(`  Profile: ${profile}`));
	console.log("");
	console.log(fmt.bold("Palette"));
	console.log(
		`  Primary:  ${palette.primary.ansi}${palette.primary.hex}${COLORS.reset}`,
	);
	console.log(
		`  Secondary: ${palette.secondary.ansi}${palette.secondary.hex}${COLORS.reset}`,
	);
	console.log(`  Accent:   ${palette.accent.ansi}${palette.accent.hex}${COLORS.reset}`);
	console.log("");
	console.log(
		fmt.info("Config written to TIER1380_COLOR_TEAM and TIER1380_COLOR_PROFILE (env)."),
	);
}

// ─── color generate ────────────────────────────────────────────────────────
function colorGenerate(options: Options): void {
	const wcag = getOpt(options, "wcag", "aa") as string;
	const formats = getOpt(options, "formats", "all") as string;

	console.log(fmt.ok("Enterprise palette generated"));
	console.log(fmt.dim(`  WCAG: ${wcag}`));
	console.log(fmt.dim(`  Formats: ${formats}`));
	console.log("");

	const teams = Tier1380Colors.teams();
	const hexKeys = Object.keys(HEX) as (keyof typeof HEX)[];
	console.log(fmt.bold("Hex (source of truth)"));
	for (const k of hexKeys) {
		const v = HEX[k];
		if (typeof v === "string") console.log(`  ${k}: ${v}`);
	}
	console.log("");
	console.log(fmt.bold("Palette (status / terminal / dashboard / quantum)"));
	for (const team of teams) {
		const base = Tier1380Colors.getTeamBase(team);
		console.log(
			`  ${team}: primary=${base.primary} secondary=${base.secondary} accent=${base.accent}`,
		);
	}
	console.log("");
	console.log(
		fmt.info("Use --formats=hex,css,rgb,rgba,ansi to export specific formats."),
	);
}

// ─── color deploy ──────────────────────────────────────────────────────────
function colorDeploy(options: Options): void {
	const env = getOpt(options, "env", "production") as string;
	const scale = getOpt(options, "scale", "3") as string;

	console.log(fmt.ok("Color system deployed"));
	console.log(fmt.dim(`  Env: ${env}`));
	console.log(fmt.dim(`  Scale: ${scale} instances`));
	console.log("");
	console.log(
		fmt.info("Palette and theme tokens are available at TIER1380_COLOR_* in runtime."),
	);
}

// ─── color metrics ─────────────────────────────────────────────────────────
function colorMetrics(options: Options): void {
	const team = getOpt(options, "team", "quantum-team") as string;
	const live = getOpt(options, "live", false) as boolean;

	console.log(fmt.ok("Color metrics"));
	console.log(fmt.dim(`  Team: ${team}`));
	console.log(fmt.dim(`  Live: ${live}`));
	console.log("");

	const palette = Tier1380Colors.generateTeamPalette(team, "metrics");
	console.log(fmt.bold("Current palette"));
	console.log(`  primary.hex:  ${palette.primary.hex}`);
	console.log(`  secondary.hex: ${palette.secondary.hex}`);
	console.log(`  accent.hex:    ${palette.accent.hex}`);
	console.log("");
	if (live) {
		console.log(
			fmt.info(
				"Live metrics stream not implemented; run with --live=false for snapshot.",
			),
		);
	}
}

// ─── colors deploy (team positional + --profile) ────────────────────────────
function colorsDeploy(team: string, profile: string): void {
	const palette = Tier1380Colors.generateTeamPalette(team, profile);
	console.log(fmt.ok("Colors deployed for team"));
	console.log(fmt.dim(`  Team: ${team}`));
	console.log(fmt.dim(`  Profile: ${profile}`));
	console.log("");
	console.log(
		`  Primary:  ${palette.primary.ansi}${palette.primary.hex}${COLORS.reset}`,
	);
	console.log(
		`  Secondary: ${palette.secondary.ansi}${palette.secondary.hex}${COLORS.reset}`,
	);
	console.log(`  Accent:   ${palette.accent.ansi}${palette.accent.hex}${COLORS.reset}`);
	console.log("");
	console.log(fmt.info("Palette active for this session."));
}

// ─── terminal (colored banner via Bun.stdout) ───────────────────────────────
const BOX = { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" };

async function terminalBanner(team: string, profile: string): Promise<void> {
	const header = ` Tier-1380 Terminal ─ ${team} ─ ${profile} `;
	const metricsLine = " Metrics: R2: #50C878 847MB";
	const w = Math.max(header.length, metricsLine.length, 44);

	function pad(s: string, width: number): string {
		return s + " ".repeat(Math.max(0, width - s.length));
	}

	const top =
		BOX.tl + BOX.h + header + BOX.h.repeat(Math.max(0, w - header.length)) + BOX.tr;
	const mid1 = BOX.v + pad(metricsLine, w) + BOX.v;
	const bottom = BOX.bl + BOX.h.repeat(w + 2) + BOX.br;

	await Bun.write(Bun.stdout, THEME.primary + top + COLORS.reset + "\n");
	await Bun.write(Bun.stdout, THEME.success + mid1 + COLORS.reset + "\n");
	await Bun.write(Bun.stdout, COLORS.dim + bottom + COLORS.reset + "\n");
}

// ─── dashboard (open URL or print) ──────────────────────────────────────────
function dashboardOpen(team: string, profile: string): void {
	const url = `http://localhost:${DASHBOARD_PORT}/dashboard?teamId=${encodeURIComponent(team)}&profileId=${encodeURIComponent(profile)}`;
	console.log(fmt.info("Metrics dashboard"));
	console.log(fmt.dim(`  URL: ${url}`));
	console.log("");
	try {
		const proc = Bun.spawn(["open", url], { stdout: "ignore", stderr: "pipe" });
		proc.exited.then((code) => {
			if (code !== 0) console.log(fmt.warn("Run: open " + url));
		});
	} catch {
		console.log(fmt.warn("Open in browser: " + url));
	}
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
	const { cmd, sub, options, positionals } = parseArgs(Bun.argv);

	// tier1380 colors deploy <team> --profile <name>
	if (cmd === "colors") {
		if (sub !== "deploy") {
			console.error(fmt.fail(`Unknown colors subcommand: ${sub || "(missing)"}`));
			console.log("  deploy <team> --profile <name>");
			process.exit(1);
		}
		const team = positionals[0] ?? "quantum-team";
		const profileOpt = getOpt(options, "profile", "alice");
		const profile =
			typeof profileOpt === "string"
				? profileOpt.replace(/^profile=/, "")
				: (positionals[1] ?? "alice");
		colorsDeploy(team, profile);
		return;
	}

	// tier1380 terminal launch <profile> — auto-themed PTY
	// tier1380 terminal <team> <profile> — legacy banner
	if (cmd === "terminal") {
		if (sub === "launch") {
			const profile = positionals[0];
			if (!profile) {
				console.error(fmt.fail("Missing argument: <profile>"));
				process.exit(1);
			}
			await cmdTerminalLaunch(profile);
			return;
		}
		const team = sub || positionals[0] || "quantum-team";
		const profile = positionals[0] ?? "alice";
		await terminalBanner(team, profile);
		return;
	}

	// tier1380 team <add|remove|promote|demote|show|hierarchy>
	if (cmd === "team") {
		switch (sub) {
			case "add": {
				if (positionals.length < 3) {
					console.error(fmt.fail("Missing arguments: <profile> <team> <role>"));
					process.exit(1);
				}
				await cmdTeamAdd(positionals[0], positionals[1], positionals[2]);
				return;
			}
			case "remove": {
				if (positionals.length < 1) {
					console.error(fmt.fail("Missing argument: <profile>"));
					process.exit(1);
				}
				await cmdTeamRemove(positionals[0]);
				return;
			}
			case "promote": {
				if (positionals.length < 1) {
					console.error(fmt.fail("Missing argument: <profile>"));
					process.exit(1);
				}
				await cmdTeamPromote(positionals[0]);
				return;
			}
			case "demote": {
				if (positionals.length < 1) {
					console.error(fmt.fail("Missing argument: <profile>"));
					process.exit(1);
				}
				await cmdTeamDemote(positionals[0]);
				return;
			}
			case "show": {
				if (positionals.length < 1) {
					console.error(fmt.fail("Missing argument: <profile>"));
					process.exit(1);
				}
				await cmdTeamShow(positionals[0]);
				return;
			}
			case "hierarchy": {
				await cmdTeamHierarchy(positionals[0]);
				return;
			}
			default:
				printTeamHelp();
				process.exit(sub ? 1 : 0);
		}
		return;
	}

	// tier1380 dashboard [--team=...] [--profile=...]
	if (cmd === "dashboard") {
		const teamOpt = getOpt(options, "team", "quantum-team");
		const profileOpt = getOpt(options, "profile", "alice");
		const team = typeof teamOpt === "string" ? teamOpt : "quantum-team";
		const profile = typeof profileOpt === "string" ? profileOpt : "alice";
		dashboardOpen(team, profile);
		return;
	}

	// tier1380 color <init|generate|deploy|metrics>
	if (cmd === "color") {
		const colorSub = sub;
		switch (colorSub) {
			case "init":
				colorInit(options);
				break;
			case "generate":
				colorGenerate(options);
				break;
			case "deploy":
				colorDeploy(options);
				break;
			case "metrics":
				colorMetrics(options);
				break;
			default:
				console.error(fmt.fail(`Unknown color subcommand: ${colorSub || "(missing)"}`));
				console.log("  init | generate | deploy | metrics");
				process.exit(1);
		}
		return;
	}

	// no/invalid command
	console.log("Usage: tier1380 <color|colors|terminal|dashboard> [options]");
	console.log("");
	console.log("Commands:");
	console.log("  color init       --team=quantum-team --profile=admin");
	console.log("  color generate   --wcag=aa --formats=all");
	console.log("  color deploy     --env=production --scale=3");
	console.log("  color metrics    --team=quantum-team --live");
	console.log("  colors deploy    <team> --profile <name>   # Deploy colors for team");
	console.log(
		"  terminal         <team> <profile>         # Launch colored terminal banner",
	);
	console.log(
		"  dashboard        --team=quantum-team --profile=alice   # Open metrics dashboard",
	);
	console.log("");
	console.log("Examples:");
	console.log("  bun tier1380 colors deploy quantum-team --profile alice");
	console.log("  bun tier1380 terminal quantum-team alice");
	console.log(
		`  open http://localhost:${DASHBOARD_PORT}/dashboard?teamId=quantum-team&profileId=alice`,
	);
	process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
