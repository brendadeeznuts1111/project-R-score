#!/usr/bin/env bun
/**
 * Unified Shell Bridge for Kimi Shell + OpenClaw + Profile Terminal
 * Integrates all three systems into a single MCP interface
 */

import { $ } from "bun";
import { existsSync } from "fs";

interface ShellContext {
	profile?: string;
	openclaw?: boolean;
	matrix?: boolean;
	workingDir?: string;
}

// Load OpenClaw token from Bun secrets
async function getOpenClawToken(): Promise<string | null> {
	try {
		return await Bun.secrets.get({
			service: "com.openclaw.gateway",
			name: "gateway_token",
		});
	} catch {
		return null;
	}
}

// Load profile environment
async function loadProfileEnv(profile: string): Promise<Record<string, string>> {
	const profilePath = `${process.env.HOME}/.matrix/profiles/${profile}.json`;
	if (!existsSync(profilePath)) return {};

	try {
		const profileData = await Bun.file(profilePath).json();
		return profileData.env || {};
	} catch {
		return {};
	}
}

// Execute command with full context
export async function executeCommand(
	command: string,
	context: ShellContext = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const env: Record<string, string> = { ...process.env };

	// Load profile context
	if (context.profile) {
		env.MATRIX_ACTIVE_PROFILE = context.profile;
		const profileEnv = await loadProfileEnv(context.profile);
		Object.assign(env, profileEnv);
	}

	// Load OpenClaw token
	if (context.openclaw) {
		const token = await getOpenClawToken();
		if (token) env.OPENCLAW_GATEWAY_TOKEN = token;
	}

	// Set working directory
	const cwd = context.workingDir || process.cwd();

	// Execute
	const result = await $`${{ raw: command }}`.env(env).cwd(cwd).nothrow();

	return {
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
		exitCode: result.exitCode,
	};
}

// OpenClaw status check
async function getOpenClawStatus(): Promise<object> {
	const token = await getOpenClawToken();
	if (!token) {
		return { error: "OpenClaw token not found in keychain" };
	}

	try {
		const result = await $`openclaw status 2>&1`
			.env({ OPENCLAW_GATEWAY_TOKEN: token })
			.nothrow();
		return {
			running: result.exitCode === 0,
			output: result.stdout.toString(),
			errors: result.stderr.toString(),
		};
	} catch (e) {
		return { error: String(e) };
	}
}

// Profile terminal operations
async function profileTerminal(command: string, args: string[] = []): Promise<object> {
	const cliPath = `${process.env.HOME}/.claude/core/terminal/cli.ts`;
	const result = await $`bun run ${cliPath} ${command} ${args}`.nothrow();
	return {
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
		exitCode: result.exitCode,
	};
}

// List available profiles
async function listProfiles(): Promise<string[]> {
	const profilesDir = `${process.env.HOME}/.matrix/profiles`;
	try {
		const files = await $`ls ${profilesDir}/*.json 2>/dev/null`.text();
		return files
			.split("\n")
			.filter((f) => f.trim())
			.map((f) => f.replace(/.*\//, "").replace(".json", ""));
	} catch {
		return [];
	}
}

// MCP Server handlers
async function handleToolCall(name: string, args: any): Promise<object> {
	switch (name) {
		case "shell_execute": {
			return executeCommand(args.command, {
				profile: args.profile,
				openclaw: args.openclaw,
				matrix: args.matrix,
				workingDir: args.workingDir,
			});
		}

		case "shell_execute_stream": {
			const result = await executeCommand(args.command, {
				profile: args.profile,
				openclaw: args.openclaw,
			});
			return {
				...result,
				stream: true,
			};
		}

		case "openclaw_status": {
			return getOpenClawStatus();
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
			const profiles = await listProfiles();
			return { profiles };
		}

		case "profile_bind": {
			return profileTerminal("bind", [args.profile]);
		}

		case "profile_switch": {
			return profileTerminal("switch", [args.profile]);
		}

		case "profile_status": {
			return profileTerminal("status");
		}

		case "clawbot_migrate":
			return handleMatrixAgentTools("clawbot_migrate", args);
		case "clawbot_legacy_config":
			return handleMatrixAgentTools("clawbot_legacy_config", args);
		case "matrix_agent_status": {
			const result =
				await $`bun ${process.env.HOME}/.matrix/matrix-agent.ts status`.nothrow();
			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		case "cron_list": {
			const result = await $`crontab -l 2>/dev/null || echo "No crontab"`.nothrow();
			return {
				crontab: result.stdout.toString(),
			};
		}

		case "r2_status": {
			const result = await $`bun tools/tier1380-registry.ts r2:status`.nothrow();
			return {
				connected: result.exitCode === 0,
				output: result.stdout.toString(),
			};
		}

		case "r2_upload": {
			const { localPath, r2Key } = args;
			const result =
				await $`bun tools/tier1380-registry.ts r2:upload ${localPath} ${r2Key || ""}`.nothrow();
			return {
				success: result.exitCode === 0,
				output: result.stdout.toString(),
				errors: result.stderr.toString(),
			};
		}

		case "r2_download": {
			const { r2Key, localPath } = args;
			const result =
				await $`bun tools/tier1380-registry.ts r2:download ${r2Key} ${localPath || ""}`.nothrow();
			return {
				success: result.exitCode === 0,
				output: result.stdout.toString(),
				errors: result.stderr.toString(),
			};
		}

		case "registry_check": {
			const result = await $`bun tools/tier1380-registry.ts check`.nothrow();
			return {
				connected: result.exitCode === 0,
				output: result.stdout.toString(),
			};
		}

		case "kimi_shell_status": {
			const result = await $`bun tools/tier1380-registry.ts shell:status`.nothrow();
			return {
				output: result.stdout.toString(),
			};
		}

		case "matrix_bridge_status": {
			const bridgePath = `${process.env.HOME}/nolarose-mcp-config/matrix-agent/integrations/openclaw-bridge.ts`;
			const result = await $`bun ${bridgePath} status`.nothrow();
			return {
				connected: result.exitCode === 0,
				output: result.stdout.toString(),
				errors: result.stderr.toString(),
			};
		}

		case "matrix_bridge_proxy": {
			const { target, command, args = [] } = args;
			const bridgePath = `${process.env.HOME}/nolarose-mcp-config/matrix-agent/integrations/openclaw-bridge.ts`;
			const result =
				await $`bun ${bridgePath} ${target === "matrix" ? "matrix" : "proxy"} ${command} ${args}`.nothrow();
			return {
				success: result.exitCode === 0,
				output: result.stdout.toString(),
				errors: result.stderr.toString(),
			};
		}

		default:
			return { error: `Unknown tool: ${name}` };
	}
}

// Main MCP loop
if (import.meta.main) {
	console.log(
		JSON.stringify({
			jsonrpc: "2.0",
			id: 0,
			result: {
				protocolVersion: "2024-11-05",
				capabilities: {
					tools: {},
				},
				serverInfo: {
					name: "unified-shell-bridge",
					version: "1.0.0",
				},
			},
		}),
	);

	for await (const line of console) {
		try {
			const request = JSON.parse(line);

			if (request.method === "tools/list") {
				console.log(
					JSON.stringify({
						jsonrpc: "2.0",
						id: request.id,
						result: {
							tools: [
								{
									name: "shell_execute",
									description: "Execute shell command with profile/OpenClaw context",
									inputSchema: {
										type: "object",
										properties: {
											command: { type: "string" },
											profile: { type: "string", optional: true },
											openclaw: { type: "boolean", optional: true },
											workingDir: { type: "string", optional: true },
										},
										required: ["command"],
									},
								},
								{
									name: "openclaw_status",
									description: "Check OpenClaw gateway status",
									inputSchema: { type: "object" },
								},
								{
									name: "openclaw_gateway_restart",
									description: "Restart OpenClaw gateway",
									inputSchema: { type: "object" },
								},
								{
									name: "profile_list",
									description: "List available Matrix profiles",
									inputSchema: { type: "object" },
								},
								{
									name: "profile_bind",
									description: "Bind current directory to profile",
									inputSchema: {
										type: "object",
										properties: {
											profile: { type: "string" },
										},
										required: ["profile"],
									},
								},
								{
									name: "profile_switch",
									description: "Switch to different profile",
									inputSchema: {
										type: "object",
										properties: {
											profile: { type: "string" },
										},
										required: ["profile"],
									},
								},
								{
									name: "profile_status",
									description: "Show profile-terminal binding status",
									inputSchema: { type: "object" },
								},
								{
									name: "matrix_agent_status",
									description: "Check Matrix Agent status",
									inputSchema: { type: "object" },
								},
								{
									name: "cron_list",
									description: "List configured cron jobs",
									inputSchema: { type: "object" },
								},
								{
									name: "r2_status",
									description: "Check R2 connection status",
									inputSchema: { type: "object" },
								},
								{
									name: "r2_upload",
									description: "Upload file to R2",
									inputSchema: {
										type: "object",
										properties: {
											localPath: { type: "string" },
											r2Key: { type: "string", optional: true },
										},
										required: ["localPath"],
									},
								},
								{
									name: "r2_download",
									description: "Download file from R2",
									inputSchema: {
										type: "object",
										properties: {
											r2Key: { type: "string" },
											localPath: { type: "string", optional: true },
										},
										required: ["r2Key"],
									},
								},
								{
									name: "registry_check",
									description: "Check OMEGA registry connection",
									inputSchema: { type: "object" },
								},
								{
									name: "kimi_shell_status",
									description: "Show Kimi shell integration status",
									inputSchema: { type: "object" },
								},
								{
									name: "matrix_bridge_status",
									description: "Check Matrix ↔ OpenClaw bridge status",
									inputSchema: { type: "object" },
								},
								{
									name: "matrix_bridge_proxy",
									description: "Proxy command through Matrix ↔ OpenClaw bridge",
									inputSchema: {
										type: "object",
										properties: {
											target: { type: "string", enum: ["matrix", "openclaw"] },
											command: { type: "string" },
											args: {
												type: "array",
												items: { type: "string" },
												optional: true,
											},
										},
										required: ["target", "command"],
									},
								},
							],
						},
					}),
				);
			} else if (request.method === "tools/call") {
				const result = await handleToolCall(
					request.params.name,
					request.params.arguments,
				);
				console.log(
					JSON.stringify({
						jsonrpc: "2.0",
						id: request.id,
						result: {
							content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
						},
					}),
				);
			}
		} catch (e) {
			console.error("Error:", e);
		}
	}
}

// Matrix Agent (Clawdbot) specific tools
async function handleMatrixAgentTools(name: string, args: any): Promise<object> {
	const agentPath = `${process.env.HOME}/.matrix/matrix-agent.ts`;

	switch (name) {
		case "clawbot_migrate": {
			// Check migration status
			const marker = `${process.env.HOME}/.matrix/.migrated-from-clawdbot`;
			if (existsSync(marker)) {
				const data = await Bun.file(marker).json();
				return { migrated: true, ...data };
			}
			return { migrated: false };
		}

		case "clawbot_legacy_config": {
			// Read legacy clawdbot config (read-only)
			const legacyConfig = `${process.env.HOME}/.clawdbot/clawdbot.json`;
			if (!existsSync(legacyConfig)) {
				return { error: "Legacy config not found" };
			}
			try {
				const config = await Bun.file(legacyConfig).json();
				return {
					legacyConfig: config,
					note: "This is the legacy clawdbot config (read-only). Matrix Agent uses ~/.matrix/agent/config.json",
				};
			} catch (e) {
				return { error: String(e) };
			}
		}

		case "matrix_agent_init": {
			const result = await $`bun ${agentPath} init`.nothrow();
			return {
				initialized: result.exitCode === 0,
				output: result.stdout.toString(),
				errors: result.stderr.toString(),
			};
		}

		case "matrix_agent_health": {
			const result = await $`bun ${agentPath} health`.nothrow();
			return {
				healthy: result.exitCode === 0,
				output: result.stdout.toString(),
			};
		}

		case "matrix_agent_migrate": {
			const result = await $`bun ${agentPath} migrate`.nothrow();
			return {
				migrated: result.exitCode === 0,
				output: result.stdout.toString(),
			};
		}

		case "matrix_agent_profile": {
			const result =
				await $`bun ${agentPath} profile ${args.command || "list"} ${args.args || ""}`.nothrow();
			return {
				output: result.stdout.toString(),
				stderr: result.stderr.toString(),
				exitCode: result.exitCode,
			};
		}

		default:
			return null;
	}
}
