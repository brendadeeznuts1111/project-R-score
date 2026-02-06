#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: Column Standards CLI Demo
 *
 * Interactive showcase of all CLI capabilities
 * Run: bun matrix/column-standards-demo.ts
 */

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	yellow: "\x1b[33m",
	green: "\x1b[32m",
	orange: "\x1b[38;5;208m",
};

function section(title: string) {
	console.log();
	console.log(`${COLORS.bold}${COLORS.orange}▶ ${title}${COLORS.reset}`);
	console.log(`${COLORS.dim}${"─".repeat(60)}${COLORS.reset}`);
}

function cmd(command: string) {
	console.log(`${COLORS.cyan}$ ${command}${COLORS.reset}`);
}

async function run(command: string, args: string[] = []) {
	cmd(`bun matrix/column-standards-all.ts ${command}`);
	const proc = Bun.spawn(
		["bun", "matrix/column-standards-all.ts", ...command.split(" "), ...args],
		{
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const output = await new Response(proc.stdout).text();
	const lines = output.split("\n").slice(0, 15);
	console.log(lines.join("\n"));
	if (output.split("\n").length > 15) {
		console.log(
			`${COLORS.dim}... (${output.split("\n").length - 15} more lines)${COLORS.reset}`,
		);
	}
	await proc.exited;
}

console.log(`${COLORS.bold}${COLORS.orange}
╔══════════════════════════════════════════════════════════════╗
║  🔥 Tier-1380 OMEGA: Column Standards CLI Demo 🔥           ║
║                                                              ║
║  Showcase of all capabilities - Phase 3.29                   ║
╚══════════════════════════════════════════════════════════════╝
${COLORS.reset}`);

// Basic Commands
section("1. Basic Commands");
await run("get 45");

section("2. Zone Shortcuts");
await run("tension");

section("3. Search");
await run("search profile");

section("4. Find (Multi-criteria)");
await run("find zone=tension required=true");

section("5. Stats");
await run("stats");

section("6. Pipe Formats");
await run("pipe tsv");

section("7. Favorites");
await run("fav");

section("8. Validate");
await run("validate");

console.log();
console.log(`${COLORS.bold}${COLORS.green}✅ Demo Complete!${COLORS.reset}`);
console.log();
console.log("Try these commands:");
console.log(
	`  ${COLORS.cyan}bun matrix:cols interactive${COLORS.reset}  - Interactive REPL mode`,
);
console.log(
	`  ${COLORS.cyan}bun matrix:cols preview 45${COLORS.reset}    - Clickable hyperlinks`,
);
console.log(
	`  ${COLORS.cyan}bun matrix:cols export${COLORS.reset}        - Generate markdown docs`,
);
console.log();
