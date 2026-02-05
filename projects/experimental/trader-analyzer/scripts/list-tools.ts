#!/usr/bin/env bun
/**
 * @fileoverview MCP Tools Lister
 * @description List all available MCP tools with descriptions and schemas
 * @module scripts/list-tools
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-TOOLS-LISTER@0.1.0;instance-id=MCP-TOOLS-LISTER-001;version=0.1.0}]
 * [PROPERTIES:{cli={value:"list-tools";@root:"ROOT-CLI";@chain:["BP-MCP","BP-CLI"];@version:"0.1.0"}}]
 * [CLASS:MCPToolsLister][#REF:v-0.1.0.BP.MCP.TOOLS.LISTER.1.0.A.1.1.CLI.1.1]]
 */

import { MCPServer, createBunToolingTools, createBunShellTools, createAstAnalysisTools } from "../src/mcp";
import { Database } from "bun:sqlite";
import { colors } from "../src/utils/bun";

/**
 * Format tool schema for display
 */
function formatSchema(schema: any): string {
	if (!schema.properties || Object.keys(schema.properties).length === 0) {
		return colors.gray("(no parameters)");
	}

	const params: string[] = [];
	for (const [key, prop] of Object.entries(schema.properties)) {
		const propInfo = prop as any;
		const required = schema.required?.includes(key) ? colors.red("*") : " ";
		const type = propInfo.type || "any";
		const desc = propInfo.description ? colors.gray(` - ${propInfo.description}`) : "";
		const defaultVal = propInfo.default !== undefined ? colors.gray(` (default: ${propInfo.default})`) : "";
		params.push(`  ${required} ${colors.cyan(key)}: ${colors.yellow(type)}${desc}${defaultVal}`);
	}

	return params.join("\n");
}

/**
 * List all MCP tools
 */
async function listTools(): Promise<void> {
	const server = new MCPServer();

	// Register all tools
	const bunTools = createBunToolingTools();
	server.registerTools(bunTools);

	const shellTools = createBunShellTools();
	server.registerTools(shellTools);

	// Register AST Analysis tools
	const astTools = createAstAnalysisTools();
	server.registerTools(astTools);

	// Try to register research tools if database exists
	try {
		const db = new Database("./data/research.db");
		const { createResearchTools } = await import("../src/research/mcp/tools/research-explorer");
		const researchTools = createResearchTools(db);
		server.registerTools(researchTools);
		db.close();
	} catch {
		// Research database doesn't exist, skip
	}

	const tools = server.listTools();

	console.log(colors.brightCyan("╔═══ NEXUS MCP TOOLS ═══╗\n"));
	console.log(`${colors.green("Total Tools:")} ${colors.brightWhite(tools.length.toString())}\n`);

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
		} else if (tool.name.startsWith("ast-") || tool.name.startsWith("pattern-") || tool.name.startsWith("anti-") || tool.name.startsWith("smell-")) {
			category = "AST Analysis";
		}

		if (!categories.has(category)) {
			categories.set(category, []);
		}
		categories.get(category)!.push(tool);
	}

	// Display by category
	for (const [category, categoryTools] of categories.entries()) {
		console.log(colors.brightYellow(`\n${category} (${categoryTools.length})`));
		console.log(colors.gray("─".repeat(60)));

		for (const tool of categoryTools) {
			console.log(`\n${colors.brightGreen(tool.name)}`);
			console.log(`  ${colors.gray(tool.description)}`);
			console.log(`  ${colors.cyan("Parameters:")}`);
			console.log(formatSchema(tool.inputSchema));
		}
	}

	console.log(`\n${colors.gray("─".repeat(60))}`);
	console.log(`\n${colors.yellow("Usage:")}`);
	console.log(`  ${colors.gray("bun run mcp-server")} - Start MCP server`);
	console.log(`  ${colors.gray("bun run list-tools")} - List all tools`);
	console.log(`  ${colors.gray("bun run dashboard")} - View tools in dashboard\n`);
}

// Run if executed directly
if (import.meta.main) {
	listTools().catch((error) => {
		console.error(colors.red("Error listing tools:"), error);
		process.exit(1);
	});
}
