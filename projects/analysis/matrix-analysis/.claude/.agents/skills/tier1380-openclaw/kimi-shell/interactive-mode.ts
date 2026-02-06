#!/usr/bin/env bun
/**
 * Kimi Shell Interactive Mode
 * Enhanced REPL with auto-completion, history, and command chaining
 */

import { appendFileSync, existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	gray: "\x1b[90m",
	red: "\x1b[31m",
};

interface CommandHistory {
	commands: string[];
	index: number;
}

const HISTORY_FILE = join(homedir(), ".kimi", "shell_history");
const MAX_HISTORY = 1000;

// Variable storage for command chaining
const variables: Map<string, string> = new Map();

const COMMANDS = [
	"metrics",
	"metrics collect",
	"metrics dashboard",
	"metrics record",
	"shell",
	"shell status",
	"shell exec",
	"shell switch",
	"settings",
	"vault",
	"vault health",
	"vault list",
	"workflow",
	"workflow mcp",
	"workflow acp",
	"job",
	"job run",
	"job list",
	"job status",
	"job logs",
	"session",
	"session create",
	"session list",
	"session switch",
	"help",
	"exit",
	"quit",
	"vars",
	"clear",
	"history",
];

function loadHistory(): CommandHistory {
	try {
		if (existsSync(HISTORY_FILE)) {
			const content = readFileSync(HISTORY_FILE, "utf-8");
			const commands = content.split("\n").filter(Boolean).slice(-MAX_HISTORY);
			return { commands, index: commands.length };
		}
	} catch {
		// Ignore errors
	}
	return { commands: [], index: 0 };
}

function saveHistory(history: CommandHistory): void {
	try {
		const content = history.commands.join("\n") + "\n";
		appendFileSync(HISTORY_FILE, content);
	} catch {
		// Ignore errors
	}
}

function getCompletions(input: string): string[] {
	if (!input) return [];
	return COMMANDS.filter((cmd) => cmd.startsWith(input.toLowerCase()));
}

function printPrompt(): void {
	process.stdout.write(`${COLORS.cyan}🐚 kimi>${COLORS.reset} `);
}

function printWelcome(): void {
	console.log(`${COLORS.bold}${COLORS.cyan}`);
	console.log("╔══════════════════════════════════════════════════════════════════╗");
	console.log("║           🐚 Kimi Shell Interactive Mode v2.0                     ║");
	console.log("║           Tier-1380 OMEGA | Variables | Chaining | Jobs           ║");
	console.log("╚══════════════════════════════════════════════════════════════════╝");
	console.log(`${COLORS.reset}`);
}

function printHelp(): void {
	console.log(`
${COLORS.bold}Available Commands:${COLORS.reset}
  metrics [collect|dashboard|record]  - Metrics operations
  shell [status|exec|switch]          - Shell management
  settings                            - Settings dashboard
  vault [health|list]                 - Vault credentials
  workflow [mcp|acp]                  - Workflow visualizer
  job [run|list|status|logs]          - Background jobs
  session [create|list|switch]        - Session management

${COLORS.bold}Interactive Commands:${COLORS.reset}
  help                                - Show this help
  history                             - Show command history
  vars                                - Show variables
  clear                               - Clear screen
  exit, quit                          - Exit shell

${COLORS.bold}Command Chaining:${COLORS.reset}
  cmd1 && cmd2                        - Run cmd2 if cmd1 succeeds
  cmd1 || cmd2                        - Run cmd2 if cmd1 fails
  var = value                         - Set variable
  $var                                - Use variable
`);
}

/** Expand $var or ${var} in string */
function expandVariables(str: string): string {
	// Expand ${var} syntax
	str = str.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, varName) => {
		return variables.get(varName) || match;
	});

	// Expand $var syntax
	str = str.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
		return variables.get(varName) || match;
	});

	return str;
}

/** Execute chained commands */
async function executeChain(input: string, operator: "&&" | "||"): Promise<void> {
	const commands = input.split(operator).map((s) => s.trim());

	for (let i = 0; i < commands.length; i++) {
		const cmd = commands[i];
		console.log(`${COLORS.gray}[${i + 1}/${commands.length}]${COLORS.reset} ${cmd}`);

		const args = cmd.split(/\s+/);
		const { $ } = await import("bun");
		const scriptPath = join(import.meta.dir, "kimi-cli.ts");

		try {
			const result = await $`bun ${scriptPath} ${args}`.nothrow();
			const success = result.exitCode === 0;

			if (operator === "&&" && !success) {
				console.log(
					`${COLORS.red}✗ Chain broken (exit ${result.exitCode})${COLORS.reset}`,
				);
				return;
			}

			if (operator === "||" && success) {
				console.log(`${COLORS.green}✓ Chain succeeded${COLORS.reset}`);
				return;
			}

			if (result.stdout) console.log(result.stdout.toString());
			if (result.stderr) console.error(result.stderr.toString());
		} catch (error) {
			if (operator === "&&") {
				console.error(`${COLORS.red}✗ Chain broken: ${error}${COLORS.reset}`);
				return;
			}
		}
	}

	if (operator === "&&") {
		console.log(`${COLORS.green}✓ Chain completed${COLORS.reset}`);
	}
}

/** Parse and execute command with chaining support */
async function executeCommand(input: string): Promise<void> {
	const trimmed = input.trim();
	if (!trimmed) return;

	// Handle variable assignment: var = value
	const varMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
	if (varMatch) {
		const [, varName, value] = varMatch;
		// Expand variables in value
		const expanded = expandVariables(value);
		variables.set(varName, expanded);
		console.log(`${COLORS.gray}${varName} = ${expanded}${COLORS.reset}`);
		return;
	}

	// Handle command with variable expansion
	const expanded = expandVariables(trimmed);

	// Check for command chaining
	if (expanded.includes(" && ")) {
		await executeChain(expanded, "&&");
		return;
	}

	if (expanded.includes(" || ")) {
		await executeChain(expanded, "||");
		return;
	}

	const args = expanded.split(/\s+/);
	const cmd = args[0].toLowerCase();

	switch (cmd) {
		case "help":
			printHelp();
			return;
		case "exit":
		case "quit":
			console.log(`${COLORS.green}Goodbye! 👋${COLORS.reset}`);
			process.exit(0);
			break;
		case "clear":
			console.clear();
			return;
		case "history": {
			const history = loadHistory();
			history.commands.forEach((cmd, i) => {
				console.log(
					`  ${COLORS.gray}${String(i + 1).padStart(3)}${COLORS.reset}  ${cmd}`,
				);
			});
			return;
		}
		case "vars":
		case "variables": {
			console.log(`${COLORS.bold}Variables:${COLORS.reset}`);
			if (variables.size === 0) {
				console.log(`  ${COLORS.gray}No variables set${COLORS.reset}`);
			} else {
				for (const [name, value] of variables) {
					console.log(`  ${COLORS.cyan}${name}${COLORS.reset} = ${value}`);
				}
			}
			return;
		}
	}

	// Delegate to kimi-cli
	const { $ } = await import("bun");
	const scriptPath = join(import.meta.dir, "kimi-cli.ts");

	try {
		const result = await $`bun ${scriptPath} ${args}`.nothrow();
		if (result.stdout) console.log(result.stdout.toString());
		if (result.stderr) console.error(result.stderr.toString());
	} catch (error) {
		console.error(`${COLORS.red}Error: ${error}${COLORS.reset}`);
	}
}

async function readLine(): Promise<string> {
	return new Promise((resolve) => {
		let input = "";

		const onData = (data: Buffer) => {
			const char = data.toString();

			if (char === "\n" || char === "\r") {
				process.stdout.write("\n");
				process.stdin.off("data", onData);
				resolve(input);
				return;
			}

			if (char === "\t") {
				// Tab completion
				const completions = getCompletions(input);
				if (completions.length === 1) {
					input = completions[0];
					process.stdout.write(`\r${COLORS.cyan}🐚 kimi>${COLORS.reset} ${input}`);
				} else if (completions.length > 1) {
					console.log(`\n${COLORS.gray}${completions.join("  ")}${COLORS.reset}`);
					printPrompt();
					process.stdout.write(input);
				}
				return;
			}

			if (char === "\x7F") {
				// Backspace
				if (input.length > 0) {
					input = input.slice(0, -1);
					process.stdout.write("\b \b");
				}
				return;
			}

			if (char.charCodeAt(0) >= 32) {
				input += char;
				process.stdout.write(char);
			}
		};

		process.stdin.on("data", onData);
	});
}

export async function startInteractiveMode(): Promise<void> {
	printWelcome();

	const history = loadHistory();

	// Enable raw mode for better input handling
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
	}
	process.stdin.resume();

	while (true) {
		printPrompt();

		const input = await readLine();

		if (input.trim()) {
			history.commands.push(input.trim());
			if (history.commands.length > MAX_HISTORY) {
				history.commands.shift();
			}
			saveHistory(history);

			await executeCommand(input);
		}
	}
}

if (import.meta.main) {
	startInteractiveMode().catch(console.error);
}
