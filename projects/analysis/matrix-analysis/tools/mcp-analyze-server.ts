#!/usr/bin/env bun
/**
 * MCP Analyze Server — expose analyze CLI as MCP tools (stages 5.x).
 * Read-only commands only: scan, types, deps, complexity, classes, strength.
 * Run: bun tools/mcp-analyze-server.ts
 * Register in .mcp.json as "analyze" or "analyze-local".
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ANALYZE_SCRIPT = import.meta.dir + "/analyze.ts";
const READ_ONLY_COMMANDS = [
	"scan",
	"types",
	"deps",
	"complexity",
	"classes",
	"strength",
] as const;

async function runAnalyze(
	command: string,
	opts: { roots?: string; limit?: number; format?: string } = {},
): Promise<string> {
	const args = [command, "--format=" + (opts.format ?? "json")];
	if (opts.roots) args.push("--roots=" + opts.roots);
	if (opts.limit != null) args.push("--limit=" + String(opts.limit));
	const proc = Bun.spawn({
		cmd: [process.execPath, ANALYZE_SCRIPT, ...args],
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const out = await new Response(proc.stdout).text();
	const err = await new Response(proc.stderr).text();
	const code = await proc.exited;
	if (code !== 0 && err) {
		return JSON.stringify({ error: err.trim(), exitCode: code });
	}
	return out;
}

const server = new McpServer(
	{ name: "analyze", version: "1.0.0" },
	{ capabilities: { tools: {}, resources: {} } },
);

const rootsSchema = z
	.string()
	.optional()
	.describe("Comma-separated roots (e.g. src,tools)");
const limitSchema = z.number().optional().describe("Max rows (default 25)");
const formatSchema = z
	.enum(["json", "table"])
	.optional()
	.describe("Output format (default json)");

for (const cmd of READ_ONLY_COMMANDS) {
	const toolName = "analyze_" + cmd;
	server.tool(
		toolName,
		`Run analyze ${cmd} (read-only). Returns JSON by default.`,
		{ roots: rootsSchema, limit: limitSchema, format: formatSchema },
		async (args) => {
			const result = await runAnalyze(cmd, {
				roots: args.roots,
				limit: args.limit,
				format: args.format,
			});
			return { content: [{ type: "text" as const, text: result }] };
		},
	);
}

// 5.2: Single-tool variant
server.tool(
	"analyze",
	"Run any read-only analyze subcommand (scan, types, deps, complexity, classes, strength). Single tool to reduce tool count.",
	{
		command: z
			.enum(READ_ONLY_COMMANDS as unknown as [string, ...string[]])
			.describe("Subcommand to run"),
		roots: rootsSchema,
		limit: limitSchema,
		format: formatSchema,
	},
	async (args) => {
		const result = await runAnalyze(args.command, {
			roots: args.roots,
			limit: args.limit,
			format: args.format,
		});
		return { content: [{ type: "text" as const, text: result }] };
	},
);

// 5.4: Optional resource — static placeholder (stateless server)
server.resource(
	"analyze-results",
	"analyze://results",
	{
		description:
			"Analyze results placeholder. Call analyze_scan, analyze_types, etc. for actual data.",
	},
	async () => ({
		contents: [
			{
				uri: "analyze://results",
				mimeType: "application/json",
				text: JSON.stringify(
					{
						message: "Use analyze or analyze_<command> tools for results.",
						commands: [...READ_ONLY_COMMANDS],
					},
					null,
					2,
				),
			},
		],
	}),
);

async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
