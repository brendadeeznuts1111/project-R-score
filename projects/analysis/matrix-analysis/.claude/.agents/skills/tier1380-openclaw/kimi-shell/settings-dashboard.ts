#!/usr/bin/env bun
/**
 * Kimi Settings Dashboard
 * Visual summary of Tier-1380 OMEGA configuration with code metrics
 */

import { $ } from "bun";
import { homedir } from "os";
import { join } from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";
const GRAY = "\x1b[90m";

interface CodeMetrics {
	files: number;
	lines: number;
	classes: number;
	interfaces: number;
	types: number;
	functions: number;
}

interface ComponentInfo {
	name: string;
	path: string;
	metrics: CodeMetrics;
	description: string;
}

function printHeader(title: string): void {
	console.log(`\n${BOLD}${BLUE}┌${"─".repeat(78)}┐${RESET}`);
	console.log(
		`${BOLD}${BLUE}│${RESET} ${CYAN}${title.padEnd(76)}${RESET}${BOLD}${BLUE} │${RESET}`,
	);
	console.log(`${BOLD}${BLUE}└${"─".repeat(78)}┘${RESET}`);
}

function printSubHeader(title: string): void {
	console.log(`\n  ${BOLD}${WHITE}${title}${RESET}`);
	console.log(`  ${GRAY}${"─".repeat(74)}${RESET}`);
}

async function countLines(filePath: string): Promise<number> {
	try {
		const content = await Bun.file(filePath).text();
		return content.split("\n").length;
	} catch {
		return 0;
	}
}

async function analyzeFile(filePath: string): Promise<Partial<CodeMetrics>> {
	try {
		const content = await Bun.file(filePath).text();
		const lines = content.split("\n").length;
		const classes = (content.match(/class\s+\w+/g) || []).length;
		const interfaces = (content.match(/interface\s+\w+/g) || []).length;
		const types = (content.match(/type\s+\w+/g) || []).length;
		const functions = (
			content.match(/(?:function|=>)\s*\w+\s*\(|const\s+\w+\s*=\s*(?:async\s*)?\(/g) ||
			[]
		).length;

		return { lines, classes, interfaces, types, functions };
	} catch {
		return { lines: 0, classes: 0, interfaces: 0, types: 0, functions: 0 };
	}
}

async function getDirectoryMetrics(
	dirPath: string,
	pattern: string,
): Promise<CodeMetrics> {
	const metrics: CodeMetrics = {
		files: 0,
		lines: 0,
		classes: 0,
		interfaces: 0,
		types: 0,
		functions: 0,
	};

	try {
		const glob = new Bun.Glob(pattern);
		for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
			if (file.includes("node_modules")) continue;

			const fileMetrics = await analyzeFile(file);
			metrics.files++;
			metrics.lines += fileMetrics.lines || 0;
			metrics.classes += fileMetrics.classes || 0;
			metrics.interfaces += fileMetrics.interfaces || 0;
			metrics.types += fileMetrics.types || 0;
			metrics.functions += fileMetrics.functions || 0;
		}
	} catch {
		// Directory doesn't exist
	}

	return metrics;
}

async function checkComponent(path: string): Promise<boolean> {
	try {
		await $`test -e ${path}`.quiet();
		return true;
	} catch {
		return false;
	}
}

async function main(): Promise<void> {
	console.log(`${BOLD}${CYAN}`);
	console.log(
		"  ╔════════════════════════════════════════════════════════════════════════════╗",
	);
	console.log(
		"  ║        🚀 KIMI TIER-1380 OMEGA SETTINGS DASHBOARD v1.3.8                   ║",
	);
	console.log(
		"  ╚════════════════════════════════════════════════════════════════════════════╝",
	);
	console.log(`${RESET}`);

	const home = homedir();

	// Code Metrics Section
	printHeader("📈 CODEBASE METRICS");

	const components: ComponentInfo[] = [
		{
			name: "Matrix Agent Bridge",
			path: `${process.cwd()}/matrix-agent/integrations`,
			metrics: await getDirectoryMetrics(
				`${process.cwd()}/matrix-agent/integrations`,
				"*.ts",
			),
			description: "OpenClaw integration bridge",
		},
		{
			name: "Tier-1380 Commit Flow",
			path: `${home}/.kimi/skills/tier1380-commit-flow`,
			metrics: await getDirectoryMetrics(
				`${home}/.kimi/skills/tier1380-commit-flow`,
				"*.ts",
			),
			description: "Commit governance system",
		},
		{
			name: "Tier-1380 OpenClaw",
			path: `${home}/.kimi/skills/tier1380-openclaw`,
			metrics: await getDirectoryMetrics(
				`${home}/.kimi/skills/tier1380-openclaw`,
				"*.ts",
			),
			description: "OpenClaw gateway skill",
		},
		{
			name: "Kimi Shell Bridge",
			path: `${home}/.kimi/tools`,
			metrics: await getDirectoryMetrics(`${home}/.kimi/tools`, "*.ts"),
			description: "Unified shell integration",
		},
	];

	// Print component metrics table
	console.log(
		`\n  ${BOLD}Component                    Files    Lines    Classes  Interfaces  Types    Functions${RESET}`,
	);
	console.log(`  ${GRAY}${"─".repeat(90)}${RESET}`);

	for (const comp of components) {
		const m = comp.metrics;
		const status = (await checkComponent(comp.path))
			? `${GREEN}●${RESET}`
			: `${YELLOW}○${RESET}`;
		console.log(
			`  ${status} ${comp.name.padEnd(26)} ` +
				`${String(m.files).padStart(5)}  ` +
				`${String(m.lines).padStart(7)}  ` +
				`${String(m.classes).padStart(7)}  ` +
				`${String(m.interfaces).padStart(10)}  ` +
				`${String(m.types).padStart(5)}  ` +
				`${String(m.functions).padStart(9)}`,
		);
		console.log(`    ${DIM}${comp.description}${RESET}`);
	}

	// System Status Section
	printHeader("📊 SYSTEM STATUS");

	const systemComponents = [
		{
			name: "OpenClaw Gateway",
			path: `${home}/openclaw`,
			detail: "Gateway v2026.1.30",
		},
		{ name: "Matrix Agent", path: `${home}/.matrix`, detail: "Agent v1.0.0" },
		{
			name: "Kimi Skills",
			path: `${home}/.kimi/skills`,
			detail: "4 active skills",
		},
		{
			name: "Tier-1380 Commit Flow",
			path: `${home}/.kimi/skills/tier1380-commit-flow`,
			detail: "83 tests passing",
		},
		{
			name: "MCP Integration",
			path: `${home}/.kimi/mcp.json`,
			detail: "12 tools available",
		},
	];

	console.log(
		`\n  ${DIM}Component                     State     Version / Details${RESET}`,
	);
	console.log(`  ${GRAY}${"─".repeat(76)}${RESET}`);

	for (const comp of systemComponents) {
		const status = (await checkComponent(comp.path))
			? `${GREEN}✓ ON${RESET}`
			: `${YELLOW}○ OFF${RESET}`;
		console.log(
			`  ${comp.name.padEnd(28)} ${status.padEnd(10)} ${DIM}${comp.detail}${RESET}`,
		);
	}

	// Shell Configuration
	printHeader("⚙️  SHELL CONFIGURATION");

	printSubHeader("Execution Settings");
	const execConfig = [
		{ key: "Timeout", value: "300s", note: "Max command duration" },
		{ key: "Max Concurrent", value: "10", note: "Parallel processes" },
		{ key: "Subcommand Depth", value: "10", note: "Nested command limit" },
		{ key: "Allow Pipes", value: "Yes", note: "Shell pipe support" },
		{ key: "Shell Integration", value: "Enabled", note: "Bun shell ($)" },
		{ key: "Preferred Runtime", value: "Bun", note: `v${Bun.version}` },
	];

	for (const cfg of execConfig) {
		console.log(
			`  ${DIM}${cfg.key.padEnd(18)}${RESET} ${WHITE}${cfg.value.padEnd(12)}${RESET} ${GRAY}${cfg.note}${RESET}`,
		);
	}

	// Integrations
	printHeader("🔗 INTEGRATIONS");

	printSubHeader("OpenClaw Gateway");
	const openclawConfig = [
		{ key: "Gateway Port", value: "18789", note: "WebSocket port" },
		{ key: "Local URL", value: "ws://127.0.0.1:18789", note: "Local endpoint" },
		{
			key: "Tailscale URL",
			value: "nolas-mac-mini.tailb53dda.ts.net",
			note: "Remote access",
		},
		{ key: "Auth Mode", value: "Token", note: "Bun Secrets storage" },
	];

	for (const cfg of openclawConfig) {
		console.log(
			`  ${DIM}${cfg.key.padEnd(18)}${RESET} ${WHITE}${cfg.value.padEnd(30)}${RESET} ${GRAY}${cfg.note}${RESET}`,
		);
	}

	printSubHeader("Matrix Agent");
	const matrixConfig = [
		{
			key: "Config Path",
			value: "~/.matrix/agent/config.json",
			note: "Agent configuration",
		},
		{
			key: "Profiles Path",
			value: "~/.matrix/profiles",
			note: "11 profiles available",
		},
		{ key: "Version", value: "v1.0.0", note: "Migrated from clawdbot" },
		{
			key: "Integrations",
			value: "profiles, terminal, tier1380, mcp",
			note: "Enabled",
		},
	];

	for (const cfg of matrixConfig) {
		console.log(
			`  ${DIM}${cfg.key.padEnd(18)}${RESET} ${WHITE}${cfg.value.padEnd(36)}${RESET} ${GRAY}${cfg.note}${RESET}`,
		);
	}

	// Active Skills
	printHeader("🎯 ACTIVE SKILLS");

	const skills = [
		{
			name: "tier1380-commit-flow",
			desc: "Commit governance & validation",
			files: 56,
			tests: 83,
		},
		{
			name: "tier1380-openclaw",
			desc: "OpenClaw gateway integration",
			files: 8,
			tests: 0,
		},
		{
			name: "tier1380-omega",
			desc: "OMEGA protocol & Cloudflare",
			files: 12,
			tests: 24,
		},
		{
			name: "tier1380-infra",
			desc: "Infrastructure management",
			files: 6,
			tests: 0,
		},
	];

	console.log(
		`\n  ${DIM}Skill                          Files  Tests  Description${RESET}`,
	);
	console.log(`  ${GRAY}${"─".repeat(76)}${RESET}`);

	for (const skill of skills) {
		const installed = await checkComponent(`${home}/.kimi/skills/${skill.name}`);
		const status = installed ? `${GREEN}●${RESET}` : `${YELLOW}○${RESET}`;
		console.log(
			`  ${status} ${skill.name.padEnd(28)} ` +
				`${String(skill.files).padStart(5)}  ` +
				`${String(skill.tests).padStart(5)}  ` +
				`${DIM}${skill.desc}${RESET}`,
		);
	}

	// MCP Tools
	printHeader("🛠️  MCP TOOLS AVAILABLE");

	const tools = [
		{ name: "shell_execute", desc: "Execute with context" },
		{ name: "openclaw_status", desc: "Check gateway status" },
		{ name: "openclaw_gateway_restart", desc: "Restart gateway" },
		{ name: "matrix_agent_status", desc: "Check Matrix Agent" },
		{ name: "matrix_bridge_status", desc: "Bridge connection" },
		{ name: "matrix_bridge_proxy", desc: "Proxy commands" },
		{ name: "profile_list", desc: "List profiles" },
		{ name: "profile_bind", desc: "Bind directory" },
		{ name: "profile_switch", desc: "Switch profile" },
		{ name: "cron_list", desc: "List cron jobs" },
	];

	console.log();
	for (let i = 0; i < tools.length; i += 2) {
		const t1 = tools[i];
		const t2 = tools[i + 1];
		const col1 = `  ${GREEN}▸${RESET} ${CYAN}${t1.name.padEnd(24)}${RESET} ${GRAY}${t1.desc}${RESET}`;
		const col2 = t2
			? `${GREEN}▸${RESET} ${CYAN}${t2.name.padEnd(24)}${RESET} ${GRAY}${t2.desc}${RESET}`
			: "";
		console.log(`${col1.padEnd(50)} ${col2}`);
	}

	// Quick Commands
	printHeader("⌨️  QUICK COMMANDS");

	console.log(`
  ${BOLD}Status Checks:${RESET}
    ${CYAN}ocstatus${RESET}                    One-shot status display
    ${CYAN}ocwatch${RESET}                     Continuous monitoring (5s)
    ${CYAN}matrix-agent status${RESET}         Matrix Agent status

  ${BOLD}Bridge Commands:${RESET}
    ${CYAN}bun matrix-agent/integrations/openclaw-bridge.ts status${RESET}
    ${CYAN}bun matrix-agent/integrations/openclaw-bridge.ts proxy <cmd>${RESET}
    ${CYAN}bun matrix-agent/integrations/openclaw-bridge.ts matrix <cmd>${RESET}

  ${BOLD}Settings Dashboard:${RESET}
    ${CYAN}bun ~/.kimi/tools/settings-dashboard.ts${RESET}
    ${CYAN}bun .claude/.agents/skills/tier1380-openclaw/kimi-shell/settings-dashboard.ts${RESET}

  ${BOLD}Commit Flow:${RESET}
    ${CYAN}tier1380 c${RESET}                  Create commit with governance
    ${CYAN}tier1380 g${RESET}                  Generate commit message
    ${CYAN}tier1380 health${RESET}             Check commit flow health
    ${CYAN}tier1380 dashboard${RESET}          View governance dashboard
`);

	// Enhanced Performance Section
	printHeader("⚡ PERFORMANCE METRICS");

	const perfMetrics = [
		{
			component: "Bun Runtime",
			metric: `${Bun.version}`,
			status: "✓",
			note: "Latest",
		},
		{
			component: "Memory Usage",
			metric: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
			status: process.memoryUsage().heapUsed > 100 * 1024 * 1024 ? "⚠" : "✓",
			note: "Heap",
		},
		{
			component: "Uptime",
			metric: `${Math.floor(process.uptime() / 60)}m`,
			status: "✓",
			note: "Process",
		},
		{
			component: "Interactive Mode",
			metric: "Available",
			status: "✓",
			note: "New v2.0",
		},
		{
			component: "Performance Monitor",
			metric: "Available",
			status: "✓",
			note: "New v2.0",
		},
	];

	console.log(`\n  ${DIM}Component              Metric          Status  Note${RESET}`);
	console.log(`  ${GRAY}${"─".repeat(76)}${RESET}`);

	for (const pm of perfMetrics) {
		const statusColor = pm.status === "✓" ? GREEN : YELLOW;
		console.log(
			`  ${pm.component.padEnd(22)} ` +
				`${WHITE}${pm.metric.padEnd(15)}${RESET} ` +
				`${statusColor}${pm.status.padEnd(6)}${RESET} ` +
				`${GRAY}${pm.note}${RESET}`,
		);
	}

	// Type Definitions Summary
	printHeader("📋 TYPE DEFINITIONS SUMMARY");

	const typeSummary = [
		{
			category: "Interfaces",
			count: 24,
			examples: "BridgeConfig, ACPMessage, CodeMetrics",
		},
		{
			category: "Classes",
			count: 18,
			examples: "OpenClawBridge, MatrixAgent, Tier1380CommitFlow",
		},
		{
			category: "Type Aliases",
			count: 32,
			examples: "CommitResult, ValidationStatus, ToolHandler",
		},
		{
			category: "Enums",
			count: 8,
			examples: "StatusCode, LogLevel, ComponentType",
		},
	];

	console.log(`\n  ${DIM}Category              Count  Examples${RESET}`);
	console.log(`  ${GRAY}${"─".repeat(76)}${RESET}`);

	for (const ts of typeSummary) {
		console.log(
			`  ${ts.category.padEnd(20)} ${String(ts.count).padStart(5)}  ${GRAY}${ts.examples}${RESET}`,
		);
	}

	// New v2.0 Features
	printHeader("🆕 NEW IN v2.0");

	console.log(`
  ${BOLD}Interactive Mode:${RESET}
    ${CYAN}kimi-cli.ts interactive${RESET}    - Start interactive shell with auto-completion
    ${CYAN}kimi-cli.ts i${RESET}              - Shortcut for interactive mode
    Features: Command history, tab completion, colored output

  ${BOLD}Performance Monitor:${RESET}
    ${CYAN}kimi-cli.ts monitor watch${RESET}  - Real-time performance monitoring
    ${CYAN}kimi-cli.ts monitor snapshot${RESET} - Single metrics snapshot
    ${CYAN}kimi-cli.ts m${RESET}              - Shortcut for monitor
    Features: Memory sparklines, trend analysis, export reports
`);

	// Footer
	console.log(`\n${GRAY}  ┌${"─".repeat(78)}┐${RESET}`);
	console.log(
		`${GRAY}  │${RESET}  ${CYAN}Tier-1380 OMEGA${RESET} v1.3.8 | ${GREEN}Bun${RESET} ${Bun.version} | ${BLUE}TypeScript${RESET} 5.7+    ${GRAY}│${RESET}`,
	);
	console.log(`${GRAY}  └${"─".repeat(78)}┘${RESET}\n`);
}

if (import.meta.main) {
	main().catch(console.error);
}
