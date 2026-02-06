#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit Flow CLI
 * Unified command-line interface for all commit governance tools
 */

const COMMANDS = {
	commit: {
		description: "Create a commit with validation",
		script: "git-commit.ts",
		args: "[message] [--sign] [--amend] [--co-author <name>]",
	},
	"generate-msg": {
		description: "Generate commit message from staged changes",
		script: "generate-message.ts",
		args: "",
	},
	"validate-msg": {
		description: "Validate commit message format",
		script: "validate-message.ts",
		args: "<message>",
	},
	check: {
		description: "Run pre-commit checks",
		script: "pre-commit-hook.ts",
		args: "[--fix] [--quick]",
	},
	governance: {
		description: "Run governance checks",
		script: "governance-check.ts",
		args: "[scope]",
	},
	hooks: {
		description: "Manage git hooks",
		script: "install-hooks.ts",
		args: "<install|uninstall|status> [--auto-fix]",
	},
	history: {
		description: "View commit history and analytics",
		script: "commit-history.ts",
		args: "<sync|analytics|history>",
	},
	dashboard: {
		description: "Open governance dashboard",
		script: "governance-dashboard.ts",
		args: "[--once] [--interval=<sec>]",
	},
	flow: {
		description: "Execute flow steps",
		script: "flow-executor.ts",
		args: "<lint|test|type-check|commit-msg|full> [--fix] [--push]",
	},
	branch: {
		description: "Validate branch name",
		script: "branch-validator.ts",
		args: "[branch-name]",
	},
	squash: {
		description: "Squash commits interactively",
		script: "commit-squash.ts",
		args: "<count> [message] [--confirm]",
	},
	pr: {
		description: "Create GitHub PR",
		script: "pr-create.ts",
		args: "[--draft] [--base=<branch>]",
	},
	config: {
		description: "Manage configuration",
		script: "../lib/config.ts",
		args: "<show|set|reset>",
	},
	changelog: {
		description: "Generate changelog",
		script: "changelog-generator.ts",
		args: "[--version=X.X.X] [--since=tag] [--output=file]",
	},
	stats: {
		description: "Show commit statistics",
		script: "commit-stats.ts",
		args: "[--days=N]",
	},
	health: {
		description: "Run health check",
		script: "health-check.ts",
		args: "",
	},
	report: {
		description: "Generate violation report",
		script: "violation-reporter.ts",
		args: "[--format=text|json|markdown] [--output=file] [--fix]",
	},
	benchmark: {
		description: "Run performance benchmarks",
		script: "benchmark.ts",
		args: "",
	},
	"snapshot-compare": {
		description: "Compare two snapshots",
		script: "snapshot-compare.ts",
		args: "<before> <after> [--output=report.md]",
	},
	"snapshot-cleanup": {
		description: "Apply retention policy to snapshots",
		script: "snapshot-retention.ts",
		args: "[--dir=./snapshots] [--max-age=30] [--max-count=10] [--dry-run]",
	},
	"snapshot-create": {
		description: "Create tenant snapshot",
		script: "snapshot-create.ts",
		args: "<tenant> [output-dir]",
	},
	"snapshot-notify": {
		description: "Start SSE snapshot notifier",
		script: "snapshot-notifier.ts",
		args: "[--port=3336]",
	},
	"snapshot-cron": {
		description: "Run automated snapshot cron",
		script: "snapshot-cron.ts",
		args: "[--interval=24] [--dir=./snapshots] [--once]",
	},
	validate: {
		description: "Validate with Bun.deepMatch schema",
		script: "../lib/schema-validator.ts",
		args: "[--schema=commit|snapshot] [--json=input]",
	},
	crc32: {
		description: "CRC32 hardware acceleration",
		script: "../lib/crc32-validator.ts",
		args: "<checksum|validate|benchmark|fingerprint> [args]",
	},
} as const;

type Command = keyof typeof COMMANDS;

const SCRIPT_DIR = `${import.meta.dir}/scripts`;

function printHelp(): void {
	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Commit Flow CLI                    ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();
	console.log("Usage: bun cli.ts <command> [options]");
	console.log();
	console.log("Commands:");
	console.log();

	const maxCmdLen = Math.max(...Object.keys(COMMANDS).map((c) => c.length));

	for (const [name, cmd] of Object.entries(COMMANDS)) {
		const paddedName = name.padEnd(maxCmdLen);
		console.log(`  ${paddedName}  ${cmd.description}`);
		console.log(`  ${" ".repeat(maxCmdLen)}  ${cmd.args}`);
		console.log();
	}

	console.log("Examples:");
	console.log('  bun cli.ts commit "[RUNTIME][CHROME][TIER:1380] Fix entropy"');
	console.log("  bun cli.ts generate-msg");
	console.log("  bun cli.ts check --fix");
	console.log("  bun cli.ts hooks install --auto-fix");
	console.log("  bun cli.ts dashboard");
}

async function runCommand(command: Command, args: string[]): Promise<number> {
	const cmd = COMMANDS[command];
	if (!cmd) {
		console.error(`Unknown command: ${command}`);
		return 1;
	}

	const scriptPath = `${SCRIPT_DIR}/${cmd.script}`;

	try {
		const proc = Bun.spawn({
			cmd: ["bun", scriptPath, ...args],
			stdio: ["inherit", "inherit", "inherit"],
		});

		const exitCode = await proc.exited;
		return exitCode;
	} catch (error) {
		console.error(`Failed to run ${command}:`, error);
		return 1;
	}
}

function generateCompletions(): void {
	const commands = Object.keys(COMMANDS).join(" ");
	const completions = `# Tier-1380 OMEGA Commit Flow CLI Completions
# Add to your .bashrc/.zshrc: source <(bun cli.ts --completions)

_tier1380_complete() {
    local cur=\${COMP_WORDS[COMP_CWORD]}
    local commands="${commands}"
    
    COMPREPLY=( $(compgen -W "$commands" -- $cur) )
}

complete -F _tier1380_complete tier1380
`;
	console.log(completions);
}

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const command = args[0] as Command | string;

	if (!command || command === "--help" || command === "-h") {
		printHelp();
		process.exit(0);
	}

	if (command === "--completions") {
		generateCompletions();
		process.exit(0);
	}

	if (command === "--version" || command === "-v") {
		console.log("Tier-1380 OMEGA Commit Flow CLI v2.0.0");
		process.exit(0);
	}

	// Shortcuts
	const shortcuts: Record<string, Command> = {
		c: "commit",
		g: "generate-msg",
		v: "validate-msg",
		chk: "check",
		h: "hooks",
		d: "dashboard",
		f: "flow",
		b: "branch",
		sq: "squash",
		p: "pr",
		cfg: "config",
		cl: "changelog",
		st: "stats",
		health: "health",
		rep: "report",
		bench: "benchmark",
		diff: "snapshot-compare",
		clean: "snapshot-cleanup",
		snap: "snapshot-create",
		notify: "snapshot-notify",
		cron: "snapshot-cron",
		val: "validate",
		crc: "crc32",
	};

	const resolvedCommand = shortcuts[command] || (command as Command);

	if (!(resolvedCommand in COMMANDS)) {
		console.error(`Unknown command: ${command}`);
		console.log();
		printHelp();
		process.exit(1);
	}

	const exitCode = await runCommand(resolvedCommand, args.slice(1));
	process.exit(exitCode);
}

export { COMMANDS, printHelp, runCommand };
