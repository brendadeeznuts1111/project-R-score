/**
 * @fileoverview Bun Shell MCP Tools
 * @description MCP tools demonstrating Bun Shell capabilities
 * @module mcp/tools/bun-shell-tools
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-BUN-SHELL-TOOLS@0.1.0;instance-id=MCP-BUN-SHELL-TOOLS-001;version=0.1.0}]
 * [PROPERTIES:{mcp={value:"bun-shell-tools";@root:"ROOT-MCP";@chain:["BP-MCP-TOOLS","BP-BUN-SHELL"];@version:"0.1.0"}}]
 * [CLASS:BunShellMCPTools][#REF:v-0.1.0.BP.MCP.BUN.SHELL.TOOLS.1.0.A.1.1.MCP.1.1]]
 */

import { $ } from "bun";

/**
 * Bun Shell demonstration MCP tools
 */
export function createBunShellTools(): Array<{
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, any>;
		required?: string[];
	};
	execute: (args: Record<string, any>) => Promise<{
		content: Array<{ type?: string; text?: string; data?: any }>;
		isError?: boolean;
	}>;
}> {
	return [
		{
			name: "shell-execute",
			description: "Execute a shell command using Bun Shell and return output",
			inputSchema: {
				type: "object",
				properties: {
					command: {
						type: "string",
						description: "Shell command to execute",
					},
					quiet: {
						type: "boolean",
						default: true,
						description: "Suppress output to console",
					},
				},
				required: ["command"],
			},
			execute: async (args: Record<string, any>) => {
				const { command, quiet = true } = args as {
					command: string;
					quiet?: boolean;
				};
				try {
					const result = quiet
						? await $`${command}`.quiet()
						: await $`${command}`;

					return {
						content: [
							{
								text:
									`Command: ${args.command}\n` +
									`Exit Code: ${result.exitCode}\n` +
									`Stdout: ${result.stdout.toString().trim()}\n` +
									`Stderr: ${result.stderr.toString().trim() || "(empty)"}`,
							},
						],
					};
				} catch (err: any) {
					return {
						content: [
							{
								text:
									`Error executing command: ${err.message}\n` +
									`Exit Code: ${err.exitCode}\n` +
									`Stderr: ${err.stderr?.toString() || err.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "shell-pipe",
			description: "Execute piped commands using Bun Shell",
			inputSchema: {
				type: "object",
				properties: {
					commands: {
						type: "array",
						items: { type: "string" },
						description: "Array of commands to pipe together",
					},
				},
				required: ["commands"],
			},
			execute: async (args: Record<string, any>) => {
				const { commands } = args as { commands: string[] };
				try {
					// Build pipe command: cmd1 | cmd2 | cmd3
					const pipeCommand = commands.join(" | ");
					const result = await $`${pipeCommand}`.text();

					return {
						content: [
							{
								text:
									`Piped Commands: ${args.commands.join(" | ")}\n` +
									`Result: ${result.trim()}`,
							},
						],
					};
				} catch (err: any) {
					return {
						content: [
							{
								text: `Error in pipe: ${err.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "shell-redirect-response",
			description: "Use fetch Response as stdin with Bun Shell",
			inputSchema: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "URL to fetch and use as stdin",
					},
					command: {
						type: "string",
						default: "wc -c",
						description: "Command to process the Response",
					},
				},
				required: ["url"],
			},
			execute: async (args: Record<string, any>) => {
				const { url, command = "wc -c" } = args as {
					url: string;
					command?: string;
				};
				try {
					const response = await fetch(url);
					const result = await $`cat < ${response} | ${command}`.text();

					return {
						content: [
							{
								text:
									`URL: ${args.url}\n` +
									`Command: ${command}\n` +
									`Result: ${result.trim()}`,
							},
						],
					};
				} catch (err: any) {
					return {
						content: [
							{
								text: `Error: ${err.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "shell-glob",
			description: "Use glob patterns with Bun Shell commands",
			inputSchema: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: "Glob pattern (e.g., 'src/**/*.ts')",
					},
					command: {
						type: "string",
						default: "wc -l",
						description: "Command to run on matched files",
					},
				},
				required: ["pattern"],
			},
			execute: async (args: Record<string, any>) => {
				const { pattern, command = "wc -l" } = args as {
					pattern: string;
					command?: string;
				};
				try {
					const result = await $`find . -name ${pattern} | ${command}`.text();

					return {
						content: [
							{
								text:
									`Pattern: ${args.pattern}\n` +
									`Command: ${command}\n` +
									`Result: ${result.trim()}`,
							},
						],
					};
				} catch (err: any) {
					return {
						content: [
							{
								text: `Error: ${err.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "shell-brace-expansion",
			description: "Demonstrate brace expansion with Bun Shell",
			inputSchema: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: "Pattern with braces (e.g., 'echo {1,2,3}')",
					},
				},
				required: ["pattern"],
			},
			execute: async (args: Record<string, any>) => {
				const { pattern } = args as { pattern: string };
				try {
					const expanded = $.braces(pattern);
					const results: string[] = [];

					for (const cmd of expanded) {
						const result = await $`${cmd}`.text();
						results.push(`${cmd} => ${result.trim()}`);
					}

					return {
						content: [
							{
								text:
									`Pattern: ${args.pattern}\n` +
									`Expanded: ${expanded.length} commands\n\n` +
									results.join("\n"),
							},
						],
					};
				} catch (err: any) {
					return {
						content: [
							{
								text: `Error: ${err.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "shell-env-command",
			description: "Execute command with custom environment variables",
			inputSchema: {
				type: "object",
				properties: {
					command: {
						type: "string",
						description: "Command to execute",
					},
					env: {
						type: "object",
						description: "Environment variables to set",
					},
				},
				required: ["command"],
			},
			execute: async (args: Record<string, any>) => {
				const { command, env } = args as {
					command: string;
					env?: Record<string, string>;
				};
				try {
					const result = env
						? await $`${command}`.env(env).text()
						: await $`${command}`.text();

					return {
						content: [
							{
								text:
									`Command: ${args.command}\n` +
									(args.env ? `Env: ${JSON.stringify(args.env)}\n` : "") +
									`Result: ${result.trim()}`,
							},
						],
					};
				} catch (err: any) {
					return {
						content: [
							{
								text: `Error: ${err.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
