/**
 * @fileoverview MCP Server Entry Point
 * @description Start MCP server with all registered tools
 * @module scripts/mcp-server
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-SERVER-ENTRY@0.1.0;instance-id=MCP-SERVER-ENTRY-001;version=0.1.0}]
 * [PROPERTIES:{server={value:"mcp-server-entry";@root:"ROOT-MCP";@chain:["BP-MCP","BP-SERVER"];@version:"0.1.0"}}]
 * [CLASS:MCPServerEntry][#REF:v-0.1.0.BP.MCP.SERVER.ENTRY.1.0.A.1.1.MCP.1.1]]
 */

import { Database } from "bun:sqlite";
import { MCPServer, createAITeamTools, createAnomalyResearchTools, createBunShellTools, createBunToolingTools, createDocsIntegrationTools, createResearchTools, createSecurityDashboardTools, inspectForensicTools, shadowGraphResearchTools } from "../src/mcp";
import { advancedResearchTools } from "../src/mcp/tools/advanced-research";
import { multiLayerCorrelationTools } from "../src/mcp/tools/multi-layer-correlation";
import { createSearchBunTool } from "../src/mcp/tools/search-bun";
import { createUIPolicyManagementTools } from "../src/mcp/tools/ui-policy-management";
import { getMCPConfig } from "../src/secrets/mcp";
import { ComplianceLogger } from "../src/security/compliance-logger";

/**
 * Start MCP server
 */
async function startMCPServer() {
	const server = new MCPServer();

	// Load MCP configuration from Bun.secrets
	try {
		const nexusConfig = await getMCPConfig("nexus");
		// Note: No console output in stdio mode - breaks JSON-RPC protocol
		// Config loaded silently
	} catch (error) {
		// Non-critical, continue without secrets
		// Note: No console output in stdio mode - breaks JSON-RPC protocol
	}

	// Initialize compliance logger for audit trail
	try {
		const complianceLogger = new ComplianceLogger();
		// Use process.env.USER or fallback to 'mcp-client'
		const userId = process.env.USER || process.env.MCP_USER_ID || "mcp-client";
		server.setComplianceLogger(complianceLogger, userId);
	} catch (error) {
		// Continue without compliance logging
		// Note: No console output in stdio mode - breaks JSON-RPC protocol
	}

	// Register Bun tooling tools
	const bunTools = createBunToolingTools();
	server.registerTools(bunTools);

	// Register Bun Shell demonstration tools
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

	// Register UI Policy Management tools (8.0.0.0.0.0.0)
	const uiPolicyTools = createUIPolicyManagementTools();
	server.registerTools(uiPolicyTools);

	// Register AI-powered Team Tooling tools (includes sitemap generator)
	const aiTeamTools = createAITeamTools();
	server.registerTools(aiTeamTools);
	
	// Register sitemap resources for MCP queries
	server.registerResource({
		uri: 'sitemap://components',
		name: 'Component Sitemap',
		description: 'Complete component dependency map',
		mimeType: 'application/json',
	});
	
	server.registerResource({
		uri: 'sitemap://css-classes',
		name: 'CSS Classes Reference',
		description: 'All CSS classes with semantic anchors',
		mimeType: 'application/json',
	});

	// Register research tools (if database exists)
	try {
		const db = new Database("./data/research.db");
		const researchTools = createResearchTools(db);
		server.registerTools(researchTools);

		// Register anomaly research tools
		const anomalyTools = createAnomalyResearchTools(db);
		server.registerTools(anomalyTools);

		// Register forensic inspection tools (9.1.5.27.0.0.0)
		server.registerTools(inspectForensicTools);

		// Register shadow-graph research tools (1.1.1.1.1.7.0)
		server.registerTools(shadowGraphResearchTools);

		// Register advanced research tools (1.1.1.1.2.0.0)
		server.registerTools(advancedResearchTools);

		// Register multi-layer correlation tools (1.1.1.1.4.5.0)
		server.registerTools(multiLayerCorrelationTools);
	} catch {
		// Research database doesn't exist, skip research tools
	}

	// Register resources
	server.registerResource({
		uri: "file:///README.md",
		name: "README",
		description: "Project README",
		mimeType: "text/markdown",
	});

	server.registerResource({
		uri: "file:///package.json",
		name: "package.json",
		description: "Package configuration",
		mimeType: "application/json",
	});

	// Start server (stdio mode)
	await server.start();
}

// Start server if run directly
if (import.meta.main) {
	startMCPServer().catch((error) => {
		// Output error as JSON-RPC error response instead of console.error
		// This ensures protocol compliance
		const errorResponse = JSON.stringify({
			jsonrpc: "2.0",
			id: null,
			error: {
				code: -32603,
				message: `MCP Server startup failed: ${error instanceof Error ? error.message : String(error)}`,
			},
		}) + "\n";
		Bun.write(Bun.stdout, errorResponse).finally(() => {
			process.exit(1);
		});
	});
}
