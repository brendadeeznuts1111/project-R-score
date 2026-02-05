#!/usr/bin/env bun

/**
 * Team Hierarchy CLI + Auto-Themed Terminal Launcher
 *
 * Subcommands for managing team membership on profiles
 * and launching Bun.Terminal with role-based theming.
 *
 * @module team/cli
 * @tier 1380-OMEGA
 */

import { ShellKimiPerformanceGuard } from "../../workers/shell-kimi-performance-guard.ts";
import { TerminalColorInjector } from "../../workers/terminal-color-injector.ts";
import {
	addMember,
	demoteMember,
	getHierarchy,
	getMember,
	promoteMember,
	removeMember,
} from "./TeamRegistry.ts";
import { enabledFlags, ROLE_ORDER, ROLE_TIER_MAP, type TeamRole } from "./types.ts";

// ═══════════════════════════════════════════════════════════════════════════
// ANSI helpers (matches tier1380.ts style)
// ═══════════════════════════════════════════════════════════════════════════

const C = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
	orange: "\x1b[38;2;255;107;53m",
};

function printHeader(title: string): void {
	console.log(`\n${C.orange}${"═".repeat(50)}${C.reset}`);
	console.log(
		`${C.orange}║${C.reset} ${C.bold}${title.padEnd(46)}${C.reset} ${C.orange}║${C.reset}`,
	);
	console.log(`${C.orange}${"═".repeat(50)}${C.reset}\n`);
}

function printOk(msg: string): void {
	console.log(`${C.green}✓${C.reset} ${msg}`);
}

function printErr(msg: string): void {
	console.log(`${C.red}✗${C.reset} ${msg}`);
}

function printKV(key: string, value: string): void {
	console.log(`  ${C.dim}${key.padEnd(20)}${C.reset} ${C.cyan}${value}${C.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Team Commands
// ═══════════════════════════════════════════════════════════════════════════

export async function cmdTeamAdd(
	profileName: string,
	teamId: string,
	role: string,
): Promise<void> {
	if (!ROLE_ORDER.includes(role as TeamRole)) {
		printErr(`Invalid role: ${role}. Valid: ${ROLE_ORDER.join(", ")}`);
		process.exit(1);
	}

	const result = await addMember(profileName, teamId, role as TeamRole);
	if (!result) {
		printErr(`Profile not found: ${profileName}`);
		process.exit(1);
	}

	printOk(
		`Added ${C.cyan}${profileName}${C.reset} to team ${C.cyan}${teamId}${C.reset} as ${C.bold}${role}${C.reset}`,
	);
	printKV("Tier", String(result.team!.tier));
	printKV("Email", result.team!.email);
	printKV("Permissions", enabledFlags(result.team!.permissions).join(", "));
}

export async function cmdTeamRemove(profileName: string): Promise<void> {
	const ok = await removeMember(profileName);
	if (!ok) {
		printErr(`Profile not found or has no team: ${profileName}`);
		process.exit(1);
	}
	printOk(`Removed ${C.cyan}${profileName}${C.reset} from team`);
}

export async function cmdTeamPromote(profileName: string): Promise<void> {
	const before = await getMember(profileName);
	if (!before?.team) {
		printErr(`Profile has no team membership: ${profileName}`);
		process.exit(1);
	}

	const result = await promoteMember(profileName);
	if (!result) {
		printErr(`Cannot promote: ${profileName} is already ${C.bold}lead${C.reset}`);
		process.exit(1);
	}

	printOk(
		`Promoted ${C.cyan}${profileName}${C.reset}: ${before.team.role} → ${C.bold}${result.team!.role}${C.reset}`,
	);
	printKV("New Tier", String(result.team!.tier));
	printKV("Permissions", enabledFlags(result.team!.permissions).join(", "));
}

export async function cmdTeamDemote(profileName: string): Promise<void> {
	const before = await getMember(profileName);
	if (!before?.team) {
		printErr(`Profile has no team membership: ${profileName}`);
		process.exit(1);
	}

	const result = await demoteMember(profileName);
	if (!result) {
		printErr(`Cannot demote: ${profileName} is already ${C.bold}contributor${C.reset}`);
		process.exit(1);
	}

	printOk(
		`Demoted ${C.cyan}${profileName}${C.reset}: ${before.team.role} → ${C.bold}${result.team!.role}${C.reset}`,
	);
	printKV("New Tier", String(result.team!.tier));
	printKV("Permissions", enabledFlags(result.team!.permissions).join(", "));
}

export async function cmdTeamShow(profileName: string): Promise<void> {
	const profile = await getMember(profileName);
	if (!profile) {
		printErr(`Profile not found: ${profileName}`);
		process.exit(1);
	}

	printHeader(`Profile: ${profileName}`);
	printKV("Name", profile.name);
	printKV("Version", profile.version);
	if (profile.author) printKV("Author", profile.author);
	if (profile.environment) printKV("Environment", profile.environment);

	if (profile.team) {
		console.log();
		printKV("Team", profile.team.id);
		printKV("Role", profile.team.role);
		printKV("Tier", String(profile.team.tier));
		printKV("Email", profile.team.email);
		printKV("Joined", profile.team.joinedAt);
		printKV("Permissions", enabledFlags(profile.team.permissions).join(", "));
	} else {
		console.log(`\n  ${C.dim}No team membership${C.reset}`);
	}
}

export async function cmdTeamHierarchy(teamId?: string): Promise<void> {
	const title = teamId ? `Team Hierarchy: ${teamId}` : "All Teams Hierarchy";
	printHeader(title);

	const hierarchy = await getHierarchy(teamId);
	let total = 0;

	const roleLabels: Record<TeamRole, string> = {
		lead: `${C.orange}LEAD${C.reset}`,
		senior: `${C.cyan}SENIOR${C.reset}`,
		developer: `${C.green}DEVELOPER${C.reset}`,
		contributor: `${C.dim}CONTRIBUTOR${C.reset}`,
	};

	for (const role of ROLE_ORDER) {
		const members = hierarchy[role];
		if (members.length === 0) continue;

		const tier = ROLE_TIER_MAP[role];
		console.log(`  ${roleLabels[role]} ${C.dim}(Tier ${tier})${C.reset}`);

		const tableData = members.map((m) => ({
			profile: m.name,
			team: m.team!.id,
			email: m.team!.email,
			permissions: enabledFlags(m.team!.permissions).join(", "),
		}));

		console.log(
			Bun.inspect.table(tableData, ["profile", "team", "email", "permissions"]),
		);

		total += members.length;
	}

	if (total === 0) {
		console.log(`  ${C.dim}No team members found${C.reset}`);
	} else {
		console.log(`  ${C.dim}Total: ${total} members${C.reset}`);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Auto-Themed Terminal Launcher (AsyncLocalStorage + Bun.Terminal)
// ═══════════════════════════════════════════════════════════════════════════

import { launchProfileTerminal } from "./profile-terminal.ts";

export async function cmdTerminalLaunch(profileName: string): Promise<void> {
	const profile = await getMember(profileName);
	if (!profile) {
		printErr(`Profile not found: ${profileName}`);
		process.exit(1);
	}

	// Generate theme from profile name
	const guard = new ShellKimiPerformanceGuard();
	const theme = guard.generateMemberTheme(profileName);
	const injector = new TerminalColorInjector(theme);

	// Display banner
	const teamLabel = profile.team
		? `Team: ${profile.team.id}  Role: ${profile.team.role}  Tier: ${profile.team.tier}`
		: "No team assigned";
	const emailLabel = profile.team ? `Email: ${profile.team.email}` : "";
	const permsLabel = profile.team
		? `Permissions: ${enabledFlags(profile.team.permissions).join(", ")}`
		: "";

	const banner = injector.box(
		[
			`${C.bold}Tier-1380 Terminal${C.reset}`,
			`Profile: ${profileName}`,
			teamLabel,
			emailLabel,
			permsLabel,
		]
			.filter(Boolean)
			.join("\n"),
		50,
	);

	console.log(banner);
	console.log();

	// Use AsyncLocalStorage-based terminal launcher
	// Bun v1.3.7+ ensures Terminal callbacks fire correctly inside AsyncLocalStorage.run()
	const result = await launchProfileTerminal({
		profileName,
		teamId: profile.team?.id ?? "",
		role: (profile.team?.role ?? "member") as import("./types.ts").TeamRole,
		email: profile.team?.email ?? "",
		env: profile.env,
		enableR2Streaming: false, // CLI mode - no R2 streaming
	});

	console.log();
	printOk(`Session complete (${result.duration}ms, ${result.bytesStreamed} bytes)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Help
// ═══════════════════════════════════════════════════════════════════════════

export function printTeamHelp(): void {
	console.log(`
${C.bold}Team Hierarchy Commands${C.reset}

${C.bold}Usage:${C.reset} bun tier1380 team <subcommand> [args]

${C.bold}Subcommands:${C.reset}
  add <profile> <team> <role>   Add profile to team
  remove <profile>              Remove from team
  promote <profile>             Promote one level up
  demote <profile>              Demote one level down
  show <profile>                Show member details
  hierarchy [team]              Display org hierarchy

${C.bold}Roles:${C.reset}  lead (1380) > senior (1370) > developer (950) > contributor (500)

${C.bold}Terminal:${C.reset}
  terminal launch <profile>     Launch auto-themed PTY

${C.bold}Examples:${C.reset}
  bun tier1380 team add dev engineering senior
  bun tier1380 team promote dev
  bun tier1380 team hierarchy engineering
  bun tier1380 terminal launch dev
`);
}
