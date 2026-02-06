#!/usr/bin/env bun
/**
 * Tier-1380 MCP Flow Executor
 *
 * Executes predefined MCP flows combining multiple tools
 * for OpenClaw, Matrix Agent, and infrastructure operations.
 */

import { $ } from "bun";
import { existsSync } from "fs";

// Flow definitions
interface FlowStep {
	name: string;
	tool: string;
	args?: Record<string, any>;
	condition?: string;
	onError?: "continue" | "stop" | "retry";
}

interface Flow {
	name: string;
	description: string;
	steps: FlowStep[];
}

const FLOWS: Record<string, Flow> = {
	"openclaw-health": {
		name: "OpenClaw Health Check",
		description: "Comprehensive health check of OpenClaw infrastructure",
		steps: [
			{
				name: "Check Gateway Status",
				tool: "openclaw_status",
				onError: "continue",
			},
			{
				name: "Check Matrix Agent",
				tool: "matrix_agent_status",
				onError: "continue",
			},
			{
				name: "Run Health Command",
				tool: "shell_execute",
				args: { command: "bun run matrix:openclaw:health" },
				onError: "continue",
			},
		],
	},

	"profile-deploy": {
		name: "Profile Deployment",
		description: "Deploy and activate a Matrix profile",
		steps: [
			{
				name: "List Available Profiles",
				tool: "profile_list",
			},
			{
				name: "Switch to Profile",
				tool: "profile_switch",
				args: { profile: "${profile}" },
			},
			{
				name: "Validate Environment",
				tool: "shell_execute",
				args: { command: "bun run matrix:profile:use ${profile} --dry-run" },
			},
			{
				name: "Check OpenClaw",
				tool: "openclaw_status",
			},
			{
				name: "Apply Profile",
				tool: "shell_execute",
				args: { command: "bun run matrix:profile:use ${profile}" },
			},
			{
				name: "Verify Binding",
				tool: "profile_status",
			},
		],
	},

	"system-diagnostic": {
		name: "Full System Diagnostic",
		description: "Comprehensive diagnostic of all Tier-1380 components",
		steps: [
			{
				name: "OpenClaw Status",
				tool: "openclaw_status",
				onError: "continue",
			},
			{
				name: "Matrix Agent Status",
				tool: "matrix_agent_status",
				onError: "continue",
			},
			{
				name: "Infrastructure Status",
				tool: "shell_execute",
				args: { command: "bun run matrix:openclaw:status --json" },
				onError: "continue",
			},
			{
				name: "Terminal Status",
				tool: "profile_status",
				onError: "continue",
			},
		],
	},

	"legacy-migration": {
		name: "Legacy Migration",
		description: "Migrate from clawdbot to Matrix Agent",
		steps: [
			{
				name: "Check Legacy Config",
				tool: "clawbot_legacy_config",
				onError: "continue",
			},
			{
				name: "Check Migration Status",
				tool: "shell_execute",
				args: {
					command:
						"ls ~/.matrix/.migrated-from-clawdbot 2>/dev/null && echo 'Already migrated' || echo 'Not migrated'",
				},
			},
			{
				name: "Run Migration",
				tool: "clawbot_migrate",
				condition: "not_migrated",
			},
			{
				name: "Verify Agent",
				tool: "matrix_agent_status",
			},
			{
				name: "Verify Gateway",
				tool: "openclaw_status",
			},
			{
				name: "Health Check",
				tool: "shell_execute",
				args: { command: "bun run matrix:openclaw:health" },
			},
		],
	},
};

// Tool implementations
async function executeTool(name: string, args: Record<string, any> = {}): Promise<any> {
	const _bridgePath = `${process.env.HOME}/.kimi/tools/unified-shell-bridge.ts`;

	switch (name) {
		case "shell_execute": {
			// Use bash -c to properly execute complex commands
			const result = await $`bash -c ${args.command}`
				.env(args.env || process.env)
				.cwd(args.workingDir || process.cwd())
				.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "openclaw_status": {
			const token = await getOpenClawToken();
			if (!token) return { error: "Token not found" };
			const result = await $`openclaw status 2>&1`
				.env({ OPENCLAW_GATEWAY_TOKEN: token })
				.nothrow();
			return {
				running: result.exitCode === 0,
				output: result.stdout.toString(),
			};
		}

		case "openclaw_gateway_restart": {
			await $`pkill -f "openclaw gateway" 2>/dev/null || true`;
			await new Promise((r) => setTimeout(r, 1000));
			const token = await getOpenClawToken();
			if (!token) return { error: "Token not found" };
			const result = await $`openclaw gateway --port 18789 &`
				.env({ OPENCLAW_GATEWAY_TOKEN: token })
				.nothrow();
			return { restarted: true, pid: result.pid };
		}

		case "profile_list": {
			const profilesDir = `${process.env.HOME}/.matrix/profiles`;
			try {
				const files = await $`ls ${profilesDir}/*.json 2>/dev/null`.text();
				return {
					profiles: files
						.split("\n")
						.filter((f) => f.trim())
						.map((f) => f.replace(/.*\//, "").replace(".json", "")),
				};
			} catch {
				return { profiles: [] };
			}
		}

		case "profile_bind": {
			const cliPath = `${process.env.HOME}/.claude/core/terminal/cli.ts`;
			const result = await $`bun run ${cliPath} bind ${args.profile}`.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "profile_switch": {
			const cliPath = `${process.env.HOME}/.claude/core/terminal/cli.ts`;
			const result = await $`bun run ${cliPath} switch ${args.profile}`.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "profile_status": {
			const cliPath = `${process.env.HOME}/.claude/core/terminal/cli.ts`;
			const result = await $`bun run ${cliPath} status`.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "matrix_agent_status": {
			const result =
				await $`bun ${process.env.HOME}/.matrix/matrix-agent.ts status`.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "clawbot_migrate": {
			const result =
				await $`bun ${process.env.HOME}/.matrix/matrix-agent.ts migrate`.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "clawbot_legacy_config": {
			const configPath = `${process.env.HOME}/.clawdbot/clawdbot.json`;
			if (!existsSync(configPath)) {
				return { error: "Legacy config not found" };
			}
			try {
				const config = await Bun.file(configPath).json();
				return { config };
			} catch (e) {
				return { error: String(e) };
			}
		}

		case "cron_list": {
			const result = await $`crontab -l 2>/dev/null || echo "No crontab"`.nothrow();
			return { crontab: result.stdout.toString() };
		}

		default:
			return { error: `Unknown tool: ${name}` };
	}
}

async function getOpenClawToken(): Promise<string | null> {
	try {
		return await Bun.secrets.get({
			service: "com.openclaw.gateway",
			name: "gateway_token",
		});
	} catch {
		return process.env.OPENCLAW_GATEWAY_TOKEN || null;
	}
}

// Execute a flow
async function executeFlow(
	flowName: string,
	params: Record<string, string> = {},
): Promise<void> {
	const flow = FLOWS[flowName];
	if (!flow) {
		console.error(`Unknown flow: ${flowName}`);
		console.log(`Available flows: ${Object.keys(FLOWS).join(", ")}`);
		process.exit(1);
	}

	console.log(`\n🔄 Executing flow: ${flow.name}\n`);
	console.log(`Description: ${flow.description}\n`);
	console.log("─".repeat(70));

	const results: { step: string; success: boolean; result: any }[] = [];

	for (let i = 0; i < flow.steps.length; i++) {
		const step = flow.steps[i];
		console.log(`\n[${i + 1}/${flow.steps.length}] ${step.name}`);
		console.log(`    Tool: ${step.tool}`);

		// Substitute parameters
		const args: Record<string, any> = {};
		if (step.args) {
			for (const [key, value] of Object.entries(step.args)) {
				if (typeof value === "string") {
					args[key] = value.replace(/\$\{(\w+)\}/g, (_, name) => params[name] || "");
				} else {
					args[key] = value;
				}
			}
		}

		try {
			const result = await executeTool(step.tool, args);
			const success =
				!result.error && (result.exitCode === undefined || result.exitCode === 0);

			results.push({ step: step.name, success, result });

			if (success) {
				console.log(`    ✅ Success`);
				if (result.stdout) {
					const lines = result.stdout.split("\n").slice(0, 5);
					for (const line of lines) {
						if (line.trim()) console.log(`       ${line}`);
					}
				}
			} else {
				console.log(`    ⚠️  Warning/Error`);
				if (result.error) console.log(`       Error: ${result.error}`);
				if (result.stderr) console.log(`       ${result.stderr}`);

				if (step.onError === "stop") {
					console.log(`\n❌ Flow stopped due to error in step: ${step.name}`);
					break;
				}
			}
		} catch (e) {
			console.log(`    ❌ Exception: ${e}`);
			results.push({
				step: step.name,
				success: false,
				result: { error: String(e) },
			});

			if (step.onError === "stop") {
				console.log(`\n❌ Flow stopped due to exception in step: ${step.name}`);
				break;
			}
		}
	}

	console.log(`\n${"─".repeat(70)}`);
	console.log("\n📊 Flow Summary\n");

	const successful = results.filter((r) => r.success).length;
	const total = results.length;

	console.log(`Steps completed: ${total}`);
	console.log(`Successful: ${successful}`);
	console.log(`Failed: ${total - successful}`);

	if (successful === total) {
		console.log("\n✅ Flow completed successfully!");
	} else if (successful >= total / 2) {
		console.log("\n⚠️  Flow completed with warnings");
	} else {
		console.log("\n❌ Flow completed with errors");
	}

	console.log();
}

// Main
const main = async () => {
	const args = process.argv.slice(2);
	const flowName = args[0];

	if (!flowName || flowName === "--help" || flowName === "-h") {
		console.log(`
🔄 Tier-1380 MCP Flow Executor

Usage: mcp-flow.ts <flow-name> [params...]

Available flows:
${Object.entries(FLOWS)
	.map(([key, flow]) => `  ${key.padEnd(20)} - ${flow.description}`)
	.join("\n")}

Parameters:
  params are key=value pairs for flow variables

Examples:
  bun mcp-flow.ts openclaw-health
  bun mcp-flow.ts profile-deploy profile=production
  bun mcp-flow.ts system-diagnostic
  bun mcp-flow.ts legacy-migration
`);
		process.exit(0);
	}

	if (flowName === "list") {
		console.log("\nAvailable flows:\n");
		for (const [key, flow] of Object.entries(FLOWS)) {
			console.log(`  ${key}`);
			console.log(`    ${flow.description}`);
			console.log(`    Steps: ${flow.steps.length}`);
			console.log();
		}
		process.exit(0);
	}

	// Parse parameters
	const params: Record<string, string> = {};
	for (const arg of args.slice(1)) {
		const [key, value] = arg.split("=");
		if (key && value) {
			params[key] = value;
		}
	}

	await executeFlow(flowName, params);
};

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
