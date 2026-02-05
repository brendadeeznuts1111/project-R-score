#!/usr/bin/env bun
/**
 * @fileoverview MCP CLI - Execute MCP tools from command line
 * @description Command-line interface for executing MCP tools
 * @module cli/mcp
 *
 * Bun 1.3 Features Used:
 * - Bun.argv for CLI args
 * - Native fetch for API calls
 * - Bun-native utilities
 */

import {
	MCPServer,
	createBunToolingTools,
	createBunShellTools,
	createDocsIntegrationTools,
	createSecurityDashboardTools,
	createBunUtilsTools,
	multiLayerCorrelationTools,
} from "../mcp";
import { createSearchBunTool } from "../mcp/tools/search-bun";
import { Database } from "bun:sqlite";
import { colors } from "../utils/bun";

// ANSI color codes
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
};

// Initialize MCP server with all tools
async function getMCPServer(): Promise<MCPServer> {
	const server = new MCPServer();

	try {
		// Register Bun tooling tools
		const bunTools = createBunToolingTools();
		server.registerTools(bunTools);

		// Register Bun Shell tools
		const shellTools = createBunShellTools();
		server.registerTools(shellTools);

		// Register Documentation Integration tools
		const docsTools = createDocsIntegrationTools();
		server.registerTools(docsTools);

		// Register SearchBun tool
		const searchBunTools = createSearchBunTool();
		server.registerTools(searchBunTools);

		// Register Security Dashboard tools
		const securityTools = createSecurityDashboardTools();
		server.registerTools(securityTools);

		// Register Bun Runtime Utilities tools (7.0.0.0.0.0.0)
		const bunUtilsTools = createBunUtilsTools();
		server.registerTools(bunUtilsTools);

		// Register multi-layer correlation tools (1.1.1.1.4.5.0)
		server.registerTools(multiLayerCorrelationTools);
	} catch (error) {
		console.error(
			`${c.red}Error initializing core MCP tools: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		console.error(
			`${c.dim}Check that all required exports exist in src/mcp/index.ts${c.reset}`,
		);
		if (error instanceof Error && error.stack) {
			console.error(`${c.dim}${error.stack}${c.reset}`);
		}
		throw error;
	}

	// Register research tools (if database exists)
	try {
		const db = new Database("./data/research.db");
		const { createResearchTools } = await import(
			"../research/mcp/tools/research-explorer"
		);
		const researchTools = createResearchTools(db);
		server.registerTools(researchTools);

		// Register anomaly research tools
		const { createAnomalyResearchTools } = await import(
			"../mcp/tools/anomaly-research"
		);
		const anomalyTools = createAnomalyResearchTools(db);
		server.registerTools(anomalyTools);
	} catch (error: any) {
		// Research database doesn't exist or tools unavailable, skip research tools
		if (error?.code !== "SQLITE_CANTOPEN" && error?.code !== "ENOENT") {
			console.warn(
				`${c.yellow}Warning: Could not load research tools: ${error?.message || String(error)}${c.reset}`,
			);
			console.warn(
				`${c.dim}Research tools require ./data/research.db to exist${c.reset}`,
			);
		}
	}

	return server;
}

/**
 * List all available MCP tools
 */
async function listTools(): Promise<void> {
	const server = await getMCPServer();
	const tools = server.listTools();

	console.log(`\n${c.cyan}${c.bold}╔═══ NEXUS MCP TOOLS ═══╗${c.reset}\n`);
	console.log(
		`${c.green}Total Tools:${c.reset} ${c.bold}${tools.length}${c.reset}\n`,
	);

	// Group tools by category
	const categories = new Map<string, typeof tools>();

	for (const tool of tools) {
		let category = "Other";
		if (tool.name.startsWith("tooling-")) {
			category = "Bun Tooling";
		} else if (tool.name.startsWith("shell-")) {
			category = "Bun Shell";
		} else if (tool.name.startsWith("research-")) {
			category = "Research";
		} else if (tool.name.startsWith("docs-")) {
			category = "Documentation";
		} else if (tool.name.startsWith("security-")) {
			category = "Security";
		} else if (tool.name.startsWith("bun-")) {
			category = "Bun Utils";
		} else if (tool.name.startsWith("covert-steam-")) {
			category = "Covert Steam";
		} else if (tool.name.startsWith("multi-layer-")) {
			category = "Multi-Layer Correlation";
		}

		if (!categories.has(category)) {
			categories.set(category, []);
		}
		categories.get(category)!.push(tool);
	}

	// Display by category
	for (const [category, categoryTools] of categories.entries()) {
		console.log(
			`${c.yellow}${c.bold}${category} (${categoryTools.length})${c.reset}`,
		);
		console.log(`${c.dim}${"─".repeat(60)}${c.reset}`);

		for (const tool of categoryTools) {
			console.log(`\n  ${c.green}${tool.name}${c.reset}`);
			console.log(`    ${c.dim}${tool.description}${c.reset}`);

			if (
				tool.inputSchema.properties &&
				Object.keys(tool.inputSchema.properties).length > 0
			) {
				console.log(`    ${c.cyan}Parameters:${c.reset}`);
				for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
					const propInfo = prop as any;
					const required = tool.inputSchema.required?.includes(key)
						? `${c.red}*${c.reset}`
						: " ";
					const type = propInfo.type || "any";
					const desc = propInfo.description
						? ` ${c.dim}- ${propInfo.description}${c.reset}`
						: "";
					const defaultVal =
						propInfo.default !== undefined
							? ` ${c.dim}(default: ${propInfo.default})${c.reset}`
							: "";
					console.log(
						`      ${required} ${c.cyan}${key}${c.reset}: ${c.yellow}${type}${c.reset}${desc}${defaultVal}`,
					);
				}
			} else {
				console.log(`    ${c.dim}(no parameters)${c.reset}`);
			}
		}
		console.log("");
	}
}

/**
 * Execute an MCP tool
 */
async function executeTool(
	toolName: string,
	args: Record<string, any>,
): Promise<void> {
	const server = await getMCPServer();
	const tools = server.listTools();
	const tool = tools.find((t) => t.name === toolName);

	if (!tool) {
		console.error(`${c.red}Tool not found: ${toolName}${c.reset}`);
		console.error(
			`${c.dim}Run 'bun run mcp list' to see available tools${c.reset}`,
		);
		process.exit(1);
	}

	try {
		console.log(`${c.cyan}Executing: ${c.bold}${toolName}${c.reset}\n`);
		const result = await tool.execute(args);

		// Display results (including errors)
		for (const content of result.content) {
			if (content.type === "text" && content.text) {
				if (result.isError) {
					console.error(`${c.red}${content.text}${c.reset}`);
				} else {
					console.log(content.text);
				}
			} else if (content.data) {
				console.log(JSON.stringify(content.data, null, 2));
			}
		}

		if (result.isError) {
			process.exit(1);
		}
	} catch (error) {
		console.error(
			`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		if (error instanceof Error && error.stack) {
			console.error(`${c.dim}${error.stack}${c.reset}`);
		}
		process.exit(1);
	}
}

/**
 * Parse JSON arguments from command line
 */
function parseArgs(args: string[]): Record<string, any> {
	const parsed: Record<string, any> = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg.startsWith("--")) {
			// Check for --key=value format first
			if (arg.includes("=")) {
				const [key, value] = arg.split("=", 2);
				const cleanKey = key.slice(2); // Remove '--'
				try {
					parsed[cleanKey] = JSON.parse(value);
				} catch {
					parsed[cleanKey] = value;
				}
			} else {
				// Handle --key value format
				const key = arg.slice(2);
				const nextArg = args[i + 1];

				// Check if next arg is a value (not another flag)
				if (nextArg && !nextArg.startsWith("--")) {
					// Try to parse as JSON, fallback to string
					try {
						parsed[key] = JSON.parse(nextArg);
					} catch {
						parsed[key] = nextArg;
					}
					i++; // Skip next arg
				} else {
					parsed[key] = true; // Boolean flag
				}
			}
		} else if (arg.includes("=")) {
			// Handle key=value format (without -- prefix)
			const [key, value] = arg.split("=", 2);
			try {
				parsed[key] = JSON.parse(value);
			} catch {
				parsed[key] = value;
			}
		}
	}

	return parsed;
}

// ============ CLI ============
const HELP = `
${c.cyan}${c.bold}MCP CLI - Execute MCP tools from command line${c.reset}

${c.yellow}Commands:${c.reset}
  list                                    List all available MCP tools
  exec <tool-name> [--key=value ...]      Execute an MCP tool
  run <tool-name> [--key=value ...]       Alias for exec

${c.yellow}Examples:${c.reset}
  bun run mcp list
  bun run mcp exec tooling-diagnostics
  bun run mcp exec tooling-check-health --endpoint=http://localhost:3000/health
  bun run mcp exec shell-execute --command="echo hello"
  bun run mcp exec research-discover-patterns --sport=NBA --hours=24
  bun run mcp exec bun-inspect-table --data='[{"name":"test","value":123}]' --columns='["name","value"]'
  bun run mcp exec bun-generate-uuid --count=5

${c.yellow}Argument Format:${c.reset}
  Use --key=value or --key value for parameters
  Boolean flags: --flag (sets to true)
  JSON values: --key='{"nested": "value"}'
  
${c.dim}Note: Some tools require the research database (./data/research.db)${c.reset}
`;

async function main(): Promise<void> {
	// Bun.argv format: [ '/path/to/bun', '/path/to/cli.ts', '--flag1', '--flag2', 'value' ]
	// Skip first two elements (bun executable and script path)
	const args = Bun.argv.slice(2);
	const [cmd, ...rest] = args;

	if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
		console.log(HELP);
		return;
	}

	try {
		switch (cmd) {
			case "list":
			case "ls":
				await listTools();
				break;

			case "exec":
			case "run":
			case "execute":
				if (rest.length < 1) {
					console.error(
						`${c.red}Usage: ${cmd} <tool-name> [--key=value ...]${c.reset}`,
					);
					console.error(
						`${c.dim}Run 'bun run mcp list' to see available tools${c.reset}`,
					);
					process.exit(1);
				}
				const toolName = rest[0];
				const toolArgs = parseArgs(rest.slice(1));
				await executeTool(toolName, toolArgs);
				break;

			default:
				console.error(`${c.red}Unknown command: ${cmd}${c.reset}`);
				console.log(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(
			`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		if (error instanceof Error) {
			// Provide helpful hints for common errors
			if (error.message.includes("Cannot find module")) {
				console.error(
					`${c.yellow}Hint: Check that all required files exist and exports are correct${c.reset}`,
				);
				console.error(
					`${c.dim}See docs/MCP-CLI-TROUBLESHOOTING.md for help${c.reset}`,
				);
			}
			if (error.stack) {
				console.error(`${c.dim}${error.stack}${c.reset}`);
			}
		}
		process.exit(1);
	}
}

// Run main function if this is the main module
if (import.meta.main) {
	main().catch((error) => {
		console.error(
			`${c.red}Fatal error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		if (error instanceof Error && error.stack) {
			console.error(`${c.dim}${error.stack}${c.reset}`);
		}
		process.exit(1);
	});
}
