#!/usr/bin/env bun
/**
 * Unified Test Runner
 *
 * Consolidates all test commands into a single, intuitive interface.
 *
 * Usage:
 *   bun tools/unified-test-runner.ts [command] [options]
 *
 * Commands:
 *   run [group]       Run tests (default: all)
 *   groups            List all test groups
 *   list              Alias for groups
 *   profile <name>    Use test profile
 *   process <action>  Process management
 *   organize          Organize tests
 *   ci                Run in CI mode
 *
 * Examples:
 *   bun tools/unified-test-runner.ts run smoke
 *   bun tools/unified-test-runner.ts run --profile=benchmark
 *   bun tools/unified-test-runner.ts groups
 *   bun tools/unified-test-runner.ts process kill
 */

import { fmt } from "../.claude/lib/cli.ts";
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";

interface TestGroup {
	name: string;
	description: string;
	duration: string;
	tags: string[];
	command: string;
}

const TEST_GROUPS: TestGroup[] = [
	{
		name: "smoke",
		description: "Critical path smoke tests",
		duration: "~30s",
		tags: ["smoke", "critical"],
		command: "bun test --group=smoke",
	},
	{
		name: "unit",
		description: "Unit tests for individual components",
		duration: "~2min",
		tags: ["unit"],
		command: "bun test --group=unit",
	},
	{
		name: "integration",
		description: "Integration tests between components",
		duration: "~5min",
		tags: ["integration"],
		command: "bun test --group=integration",
	},
	{
		name: "e2e",
		description: "End-to-end workflow tests",
		duration: "~10min",
		tags: ["e2e"],
		command: "bun test --group=e2e",
	},
	{
		name: "performance",
		description: "Performance and benchmark tests",
		duration: "~15min",
		tags: ["performance", "benchmark"],
		command: "bun test --group=performance",
	},
	{
		name: "security",
		description: "Security scans and vulnerability tests",
		duration: "~5min",
		tags: ["security"],
		command: "bun test --group=security",
	},
	{
		name: "network",
		description: "Network-related tests",
		duration: "~3min",
		tags: ["network"],
		command: "bun test --group=network",
	},
	{
		name: "ci",
		description: "CI-specific optimized tests",
		duration: "~8min",
		tags: ["ci"],
		command: "bun test --config=ci",
	},
];

const TEST_PROFILES = [
	{ name: "default", description: "Standard test execution" },
	{
		name: "benchmark",
		description: "Performance-optimized",
		command: "bun run profile:benchmark",
	},
	{
		name: "test-performance",
		description: "Performance tests",
		command: "bun run profile:test-perf",
	},
	{
		name: "test-comprehensive",
		description: "Full comprehensive suite",
		command: "bun run profile:test-full",
	},
	{
		name: "integration",
		description: "Integration-focused",
		command: "bun run profile:integration",
	},
];

const PROCESS_ACTIONS = ["kill", "list", "monitor", "graceful", "kill-all"] as const;

function printUsage(): void {
	console.log(`
${fmt.bold("🧪 Unified Test Runner")}

${fmt.bold("Usage:")} bun tools/unified-test-runner.ts [command] [options]

${fmt.bold("Commands:")}

  ${fmt.cyan("run [group]")}        Run tests (default: all groups)
                            Examples: "smoke", "unit", "integration", "e2e"
                            Use "all" to run all groups
                            Use "--profile=<name>" to use test profile
                            Use "--" to pass additional bun test options

  ${fmt.cyan("groups")}            List all available test groups
  ${fmt.cyan("list")}             Alias for "groups"

  ${fmt.cyan("profile <name>")}   Use a test profile
                            Profiles: ${TEST_PROFILES.map((p) => p.name).join(", ")}

  ${fmt.cyan("process <action>")} Process management
                            Actions: ${PROCESS_ACTIONS.join(", ")}

  ${fmt.cyan("organize")}         Organize tests (runs test-organizer)

  ${fmt.cyan("ci")}              Run in CI mode (optimized for CI/CD)

${fmt.bold("Examples:")}
  ${fmt.dim("$")} bun tools/unified-test-runner.ts run smoke
  ${fmt.dim("$")} bun tools/unified-test-runner.ts run all --profile=benchmark
  ${fmt.dim("$")} bun tools/unified-test-runner.ts run integration -- --coverage
  ${fmt.dim("$")} bun tools/unified-test-runner.ts groups
  ${fmt.dim("$")} bun tools/unified-test-runner.ts process monitor
  ${fmt.dim("$")} bun tools/unified-test-runner.ts ci

${fmt.bold("Test Groups:")}
${TEST_GROUPS.map((g) => `  ${fmt.green(g.name)}${" ".repeat(12 - g.name.length)} ${g.duration} - ${g.description}`).join("\n")}

${fmt.bold("Test Profiles:")}
${TEST_PROFILES.map((p) => `  ${fmt.cyan(p.name)}${" ".repeat(12 - p.name.length)} ${p.description}`).join("\n")}
`);
}

async function runTests(
	group: string | null,
	options: Record<string, any>,
): Promise<void> {
	const startTime = Date.now();

	// Apply profile if specified
	if (options.profile) {
		const profile = TEST_PROFILES.find((p) => p.name === options.profile);
		if (profile?.command) {
			console.log(`${fmt.info("Using profile")}: ${fmt.bold(options.profile)}`);
			// Execute profile setup command
			const profileCmd = profile.command;
			console.log(`${fmt.dim("Running")}: ${profileCmd}`);
			// Profile commands typically set environment variables or run setup
			// For now, we'll just note it and continue
		} else {
			console.error(fmt.fail(`Unknown profile: ${options.profile}`));
			console.log(`Available profiles: ${TEST_PROFILES.map((p) => p.name).join(", ")}`);
			process.exit(EXIT_CODES.USAGE_ERROR);
		}
	}

	// Determine which groups to run
	const groupsToRun = group
		? group === "all"
			? TEST_GROUPS
			: TEST_GROUPS.filter((g) => g.name === group)
		: TEST_GROUPS;

	if (groupsToRun.length === 0) {
		console.error(fmt.fail(`No test groups found matching: ${group}`));
		console.log(`Available groups: ${TEST_GROUPS.map((g) => g.name).join(", ")}`);
		process.exit(EXIT_CODES.USAGE_ERROR);
	}

	console.log(
		`${fmt.info("Running tests")}: ${fmt.bold(groupsToRun.map((g) => g.name).join(", "))}`,
	);
	console.log();

	let overallSuccess = true;

	for (const testGroup of groupsToRun) {
		console.log(`${fmt.bold("▶")} ${testGroup.name} (${testGroup.duration})`);
		console.log(`${fmt.dim("   ")} ${testGroup.description}`);
		console.log(`${fmt.dim("   ")} ${testGroup.command}`);
		console.log();

		const result = Bun.spawnSync({
			cmd: testGroup.command,
			args: options._args || [],
			stdio: "inherit",
		});

		if (result.code !== 0) {
			overallSuccess = false;
			console.log(
				`${fmt.fail("✗")} ${testGroup.name} failed with exit code ${result.code}`,
			);
		} else {
			console.log(`${fmt.success("✓")} ${testGroup.name} completed`);
		}
		console.log();
	}

	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`─────────────────────────────────────`);
	console.log(
		`${fmt.bold("Summary")}: ${overallSuccess ? fmt.success("All passed") : fmt.fail("Some failed")} in ${totalTime}s`,
	);

	process.exit(overallSuccess ? EXIT_CODES.SUCCESS : EXIT_CODES.GENERIC_ERROR);
}

async function listGroups(): void {
	console.log(`${fmt.bold("Available Test Groups")}\n`);
	console.log(`${"Group".padEnd(12)} ${"Duration".padEnd(10)} Description`);
	console.log(
		`${"─".repeat(12)} ${"─".repeat(10)} ──────────────────────────────────────`,
	);
	for (const group of TEST_GROUPS) {
		console.log(
			`${fmt.green(group.name).padEnd(12)} ${group.duration.padEnd(10)} ${group.description}`,
		);
	}
	console.log();
	console.log(`${fmt.bold("Usage:")} bun tools/unified-test-runner.ts run <group>`);
	console.log(`${fmt.bold("Example:")} bun tools/unified-test-runner.ts run smoke`);
}

async function useProfile(profileName: string): Promise<void> {
	const profile = TEST_PROFILES.find((p) => p.name === profileName);
	if (!profile) {
		console.error(fmt.fail(`Unknown profile: ${profileName}`));
		console.log(`Available profiles: ${TEST_PROFILES.map((p) => p.name).join(", ")}`);
		process.exit(EXIT_CODES.USAGE_ERROR);
	}

	if (profile.command) {
		console.log(`${fmt.info("Activating profile")}: ${fmt.bold(profileName)}`);
		console.log(`${fmt.dim("Command")}: ${profile.command}`);
		// Execute the profile command
		const result = Bun.spawnSync({
			cmd: profile.command,
			stdio: "inherit",
		});
		process.exit(result.code);
	} else {
		console.log(
			`${fmt.info("Profile")}: ${fmt.bold(profileName)} - ${profile.description}`,
		);
		console.log(`${fmt.warn("Note")}: This profile is informational only`);
	}
}

async function processManagement(action: string): Promise<void> {
	console.log(`${fmt.info("Process management")}: ${fmt.bold(action)}`);

	const commands = {
		kill: "bun scripts/test-process-manager.ts kill",
		list: "bun scripts/test-process-manager.ts list",
		monitor: "bun scripts/test-process-manager.ts monitor",
		graceful: "bun scripts/test-process-manager.ts graceful",
		"kill-all": "bun scripts/test-process-manager.ts kill-all",
	};

	const command = commands[action as keyof typeof commands];
	if (!command) {
		console.error(fmt.fail(`Unknown action: ${action}`));
		console.log(`Available actions: ${PROCESS_ACTIONS.join(", ")}`);
		process.exit(EXIT_CODES.USAGE_ERROR);
	}

	const result = Bun.spawnSync({
		cmd: command,
		stdio: "inherit",
	});
	process.exit(result.code);
}

async function runOrganize(): Promise<void> {
	console.log(`${fmt.info("Running test organizer")}...`);
	const result = Bun.spawnSync({
		cmd: "bun scripts/test-organizer.ts",
		stdio: "inherit",
	});
	process.exit(result.code);
}

async function runCI(): Promise<void> {
	console.log(`${fmt.info("CI mode")} - Running optimized test suite...`);
	console.log();

	// CI typically runs: smoke, unit, integration with coverage
	const ciGroups = ["smoke", "unit", "integration"];
	await runTests("all", { ...process.argv, _args: ["--coverage"] });
}

async function main(): Promise<void> {
	const args = Bun.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		printUsage();
		process.exit(EXIT_CODES.SUCCESS);
	}

	const command = args[0];
	const restArgs = args.slice(1);

	// Parse options
	const options: Record<string, any> = { _args: [] };
	let inArgs = false;
	for (const arg of restArgs) {
		if (arg === "--") {
			inArgs = true;
			continue;
		}
		if (inArgs) {
			options._args.push(arg);
			continue;
		}
		if (arg.startsWith("--")) {
			const [key, value] = arg.slice(2).split("=");
			if (value !== undefined) {
				options[key] = value;
			} else {
				options[key] = true;
			}
		} else if (arg.startsWith("-")) {
			// Short options not supported yet
			console.warn(fmt.warn(`Unknown option: ${arg}`));
		} else {
			// Positional arg after command
			if (options._positional === undefined) {
				options._positional = arg;
			} else if (Array.isArray(options._positional)) {
				options._positional.push(arg);
			} else {
				options._positional = [options._positional, arg];
			}
		}
	}

	try {
		switch (command) {
			case "run": {
				const group = options._positional as string | null;
				await runTests(group, options);
				break;
			}

			case "groups":
			case "list":
				await listGroups();
				break;

			case "profile":
				if (!options._positional) {
					console.error(fmt.fail("Profile name is required"));
					console.log("Usage: test profile <name>");
					console.log(`Available: ${TEST_PROFILES.map((p) => p.name).join(", ")}`);
					process.exit(EXIT_CODES.USAGE_ERROR);
				}
				await useProfile(options._positional as string);
				break;

			case "process":
				if (!options._positional) {
					console.error(fmt.fail("Process action is required"));
					console.log("Usage: test process <action>");
					console.log(`Available: ${PROCESS_ACTIONS.join(", ")}`);
					process.exit(EXIT_CODES.USAGE_ERROR);
				}
				await processManagement(options._positional as string);
				break;

			case "organize":
				await runOrganize();
				break;

			case "ci":
				await runCI();
				break;

			default:
				console.error(fmt.fail(`Unknown command: ${command}`));
				printUsage();
				process.exit(EXIT_CODES.USAGE_ERROR);
		}
	} catch (error) {
		console.error(fmt.fail(`Error: ${error}`));
		if (process.env.DEBUG) {
			console.error(error);
		}
		process.exit(EXIT_CODES.GENERIC_ERROR);
	}
}

main();
