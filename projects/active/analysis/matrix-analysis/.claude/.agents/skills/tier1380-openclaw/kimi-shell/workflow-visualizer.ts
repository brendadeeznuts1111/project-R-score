#!/usr/bin/env bun
/**
 * Shell Workflow Visualizer
 * Shows MCP and ACP integration flows
 */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";

function printHeader(title: string): void {
	console.info(`\n${BOLD}${BLUE}╔${"═".repeat(76)}╗${RESET}`);
	console.info(
		`${BOLD}${BLUE}║${RESET} ${CYAN}${title.padEnd(74)}${RESET}${BOLD}${BLUE} ║${RESET}`,
	);
	console.info(`${BOLD}${BLUE}╚${"═".repeat(76)}╝${RESET}`);
}

function printSection(title: string): void {
	console.info(`\n  ${BOLD}${WHITE}${title}${RESET}`);
	console.info(`  ${DIM}${"─".repeat(74)}${RESET}`);
}

function printArrow(label: string, color: string = CYAN): void {
	console.info(`    ${color}▼${RESET} ${DIM}${label}${RESET}`);
}

function printBox(label: string, type: "mcp" | "acp" | "bun" | "service"): void {
	const colors = {
		mcp: MAGENTA,
		acp: YELLOW,
		bun: GREEN,
		service: BLUE,
	};
	const color = colors[type];
	const prefix =
		type === "mcp"
			? "[MCP]"
			: type === "acp"
				? "[ACP]"
				: type === "bun"
					? "[BUN]"
					: "[SRV]";
	console.info(`    ${color}┌${"─".repeat(50)}┐${RESET}`);
	console.info(`    ${color}│${RESET} ${prefix} ${label.padEnd(43)}${color}│${RESET}`);
	console.info(`    ${color}└${"─".repeat(50)}┘${RESET}`);
}

function printCode(code: string, lang: string = "typescript"): void {
	console.info(`\n    ${DIM}${lang}:${RESET}`);
	console.info(`    ${DIM}${"─".repeat(40)}${RESET}`);
	for (const line of code.split("\n")) {
		console.info(`    ${CYAN}${line}${RESET}`);
	}
}

function showMCPFlow(): void {
	printHeader("MCP (Model Context Protocol) WORKFLOW");

	console.info(`\n  ${BOLD}Step 1: User initiates request${RESET}`);
	printArrow("JSON-RPC Request");
	printBox("kimi mcp call shell_execute", "mcp");

	printArrow("MCP Server receives");
	printBox("unified-shell-bridge.ts", "mcp");

	printArrow("Parse & validate");
	console.info(`    ${MAGENTA}┌${"─".repeat(50)}┐${RESET}`);
	console.info(`    ${MAGENTA}│${RESET} ${WHITE}tools/call${RESET} ${MAGENTA}│${RESET}`);
	console.info(
		`    ${MAGENTA}│${RESET} ${DIM}• Extract tool name${RESET} ${MAGENTA}│${RESET}`,
	);
	console.info(
		`    ${MAGENTA}│${RESET} ${DIM}• Validate arguments${RESET} ${MAGENTA}│${RESET}`,
	);
	console.info(
		`    ${MAGENTA}│${RESET} ${DIM}• Check permissions${RESET} ${MAGENTA}│${RESET}`,
	);
	console.info(`    ${MAGENTA}└${"─".repeat(50)}┘${RESET}`);

	printArrow("Execute tool handler");
	printBox("handleToolCall(name, args)", "mcp");

	printArrow("Load environment");
	console.info(`    ${BLUE}┌${"─".repeat(50)}┐${RESET}`);
	console.info(`    ${BLUE}│${RESET} ${WHITE}Bun.secrets.get()${RESET} ${BLUE}│${RESET}`);
	console.info(`    ${BLUE}│${RESET} ${DIM}• OpenClaw token${RESET} ${BLUE}│${RESET}`);
	console.info(`    ${BLUE}│${RESET} ${DIM}• Profile env${RESET} ${BLUE}│${RESET}`);
	console.info(`    ${BLUE}└${"─".repeat(50)}┘${RESET}`);

	printArrow("Execute command");
	printBox("Bun.shell($)", "bun");

	printArrow("Return response");
	printBox("JSON-RPC Response", "mcp");

	printCode(
		`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "Gateway: running"
    }]
  }
}`,
		"json",
	);
}

function showACPFlow(): void {
	printHeader("ACP (Agent Communication Protocol) WORKFLOW");

	console.info(`\n  ${BOLD}Step 1: Create ACP message${RESET}`);
	printCode(`const message: ACPMessage = {
  id: "cmd-123",
  type: "command",
  source: "matrix",
  target: "openclaw",
  payload: {
    name: "gateway.restart",
    args: ["--port=18789"]
  },
  timestamp: "2026-02-01T10:30:00Z"
};`);

	printArrow("Serialize & send", YELLOW);
	printBox("OpenClawBridge.sendToOpenClaw()", "acp");

	printArrow("ACP transport");
	console.info(`    ${YELLOW}┌${"─".repeat(50)}┐${RESET}`);
	console.info(
		`    ${YELLOW}│${RESET} ${WHITE}WebSocket / CLI${RESET} ${YELLOW}│${RESET}`,
	);
	console.info(
		`    ${YELLOW}│${RESET} ${DIM}• ws://127.0.0.1:18789${RESET} ${YELLOW}│${RESET}`,
	);
	console.info(
		`    ${YELLOW}│${RESET} ${DIM}• openclaw <cmd>${RESET} ${YELLOW}│${RESET}`,
	);
	console.info(`    ${YELLOW}└${"─".repeat(50)}┘${RESET}`);

	printArrow("OpenClaw receives");
	printBox("Gateway ACP Handler", "service");

	printArrow("Process & respond");
	printBox("ACP Response", "acp");

	printCode(`{
  id: "cmd-123",
  type: "response",
  source: "openclaw",
  payload: {
    success: true,
    pid: 12345
  },
  timestamp: "2026-02-01T10:30:01Z"
}`);
}

function showIntegratedFlow(): void {
	printHeader("INTEGRATED WORKFLOW: Profile Switch + OpenClaw");

	printSection("Actors");
	console.info(`    ${MAGENTA}[MCP]${RESET} Kimi Shell (User Interface)`);
	console.info(`    ${YELLOW}[ACP]${RESET} Matrix Agent Bridge`);
	console.info(`    ${GREEN}[BUN]${RESET} Bun.shell($) (Execution)`);
	console.info(`    ${BLUE}[SRV]${RESET} OpenClaw Gateway`);

	printSection("Sequence");

	console.info(`\n  ${BOLD}1. User switches profile${RESET}`);
	console.info(
		`     $ ${CYAN}kimi mcp call profile_switch '{"profile": "prod"}'${RESET}`,
	);
	printArrow("MCP Request → Bridge", MAGENTA);

	console.info(`\n  ${BOLD}2. Load profile environment${RESET}`);
	console.info(`     ${DIM}Reading ~/.matrix/profiles/prod.json${RESET}`);
	printArrow("Profile env → Bun.shell", GREEN);

	console.info(`\n  ${BOLD}3. Verify OpenClaw status${RESET}`);
	console.info(`     ${DIM}Check gateway with new profile context${RESET}`);
	printArrow("ACP Query → Gateway", YELLOW);

	console.info(`\n  ${BOLD}4. Gateway responds${RESET}`);
	console.info(`     ${DIM}Status: running, Port: 18789${RESET}`);
	printArrow("ACP Response → Bridge", YELLOW);

	console.info(`\n  ${BOLD}5. MCP Response to user${RESET}`);
	printCode(
		`{
  "profile": "prod",
  "openclaw": {
    "running": true,
    "port": 18789,
    "tailscale": "nolas-mac-mini..."
  }
}`,
		"json",
	);
}

function showToolMatrix(): void {
	printHeader("TOOL AVAILABILITY MATRIX");

	printSection("Available Tools by Protocol");

	const tools = [
		{ name: "shell_execute", mcp: true, acp: false, bun: true },
		{ name: "profile_list", mcp: true, acp: true, bun: false },
		{ name: "profile_switch", mcp: true, acp: true, bun: false },
		{ name: "openclaw_status", mcp: true, acp: true, bun: true },
		{ name: "openclaw_restart", mcp: true, acp: false, bun: true },
		{ name: "matrix_agent_status", mcp: true, acp: true, bun: false },
		{ name: "matrix_bridge_proxy", mcp: true, acp: false, bun: false },
		{ name: "cron_list", mcp: true, acp: false, bun: true },
	];

	console.info(
		`\n    ${BOLD}Tool                    MCP    ACP    Bun    Description${RESET}`,
	);
	console.info(`    ${DIM}${"─".repeat(74)}${RESET}`);

	for (const tool of tools) {
		const mcp = tool.mcp ? `${MAGENTA}●${RESET}` : `${DIM}○${RESET}`;
		const acp = tool.acp ? `${YELLOW}●${RESET}` : `${DIM}○${RESET}`;
		const bun = tool.bun ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
		console.info(
			`    ${tool.name.padEnd(22)} ${mcp.padEnd(6)} ${acp.padEnd(6)} ${bun.padEnd(6)} ${DIM}${getToolDesc(tool.name)}${RESET}`,
		);
	}
}

function getToolDesc(name: string): string {
	const descs: Record<string, string> = {
		shell_execute: "Execute arbitrary commands",
		profile_list: "List available profiles",
		profile_switch: "Switch active profile",
		openclaw_status: "Check gateway status",
		openclaw_restart: "Restart gateway",
		matrix_agent_status: "Check agent status",
		matrix_bridge_proxy: "Proxy between systems",
		cron_list: "List cron jobs",
	};
	return descs[name] || "";
}

function showQuickReference(): void {
	printHeader("QUICK REFERENCE");

	printSection("Commands");

	console.info(`
    ${BOLD}Start MCP Server:${RESET}
      $ ${CYAN}kimi mcp serve${RESET}

    ${BOLD}Execute via MCP:${RESET}
      $ ${CYAN}kimi mcp call shell_execute '{"command": "openclaw status"}'${RESET}

    ${BOLD}Direct Bun Shell:${RESET}
      $ ${CYAN}bun -e 'const { $ } = await import("bun"); await $\u0060openclaw status\u0060'${RESET}

    ${BOLD}Matrix Agent Bridge:${RESET}
      $ ${CYAN}bun matrix-agent/integrations/openclaw-bridge.ts status${RESET}

    ${BOLD}Settings Dashboard:${RESET}
      $ ${CYAN}bun ~/.kimi/tools/settings-dashboard.ts${RESET}
  `);

	printSection("Environment Variables");

	console.info(`
    ${DIM}# Add to ~/.zshrc${RESET}
    export MATRIX_PROFILES_DIR="$HOME/.matrix/profiles"
    export KIMI_MCP_CONFIG="$HOME/.kimi/mcp.json"
    export OPENCLAW_GATEWAY_TOKEN=$(bun -e '...')
  `);
}

async function main(): Promise<void> {
	const args = Bun.argv.slice(2);
	const flow = args[0] || "all";

	switch (flow) {
		case "mcp":
			showMCPFlow();
			break;
		case "acp":
			showACPFlow();
			break;
		case "integrated":
			showIntegratedFlow();
			break;
		case "matrix":
			showToolMatrix();
			break;
		case "all":
		default:
			showMCPFlow();
			showACPFlow();
			showIntegratedFlow();
			showToolMatrix();
			showQuickReference();
			break;
	}

	console.info(`\n${DIM}  ┌${"─".repeat(74)}┐${RESET}`);
	console.info(
		`${DIM}  │${RESET}  ${CYAN}Tier-1380 OMEGA${RESET} | ${MAGENTA}MCP${RESET} + ${YELLOW}ACP${RESET} Integration | ${GREEN}Bun${RESET} v${Bun.version}  ${DIM}│${RESET}`,
	);
	console.info(`${DIM}  └${"─".repeat(74)}┘${RESET}\n`);
}

if (import.meta.main) {
	main().catch(console.error);
}
