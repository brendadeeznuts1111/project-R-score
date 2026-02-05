#!/usr/bin/env bun
/**
 * [AI.TEAM.TOOLS.RG:IMPLEMENTATION] AI Team Tooling MCP Tools
 * @fileoverview AI Team Tooling MCP Tools
 * @description Wrapper functions to create MCP tools for AI-powered team tooling.
 * Provides unified access to LSP Bridge, Benchmark Tool, RSS Monitor, Team Coordinator,
 * Component Scaffold, and Sitemap Generator tools for AI-assisted development.
 * @module mcp/tools/ai-team-tools
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-AI-TEAM-TOOLS@1.3.3;instance-id=MCP-AI-TEAM-TOOLS-001;version=1.3.3}]
 * [PROPERTIES:{mcp={value:"ai-team-tools";@root:"3.3.3";@chain:["BP-MCP-TOOLS","BP-AI-TEAM"];@version:"1.3.3"}}]
 * [CLASS:AITeamToolsMCP][#REF:v-1.3.3.BP.MCP.AI.TEAM.TOOLS.1.0.A.1.1.MCP.1.1]]
 *
 * @see {@link docs/MCP-AI-TEAM-INTEGRATION.md} - Complete architecture documentation
 * @see {@link docs/api/COMPONENT-SITEMAP.md#3.3.3} - Component sitemap integration details
 * @see {@link src/mcp/tools/lsp-bridge.ts} - LSP Bridge tool implementation
 * @see {@link src/mcp/tools/benchmark-tool.ts} - Benchmark optimization tool
 * @see {@link src/mcp/tools/rss-monitor.ts} - RSS monitoring tool
 * @see {@link src/mcp/tools/team-coordinator.ts} - Team coordination tool
 * @see {@link src/mcp/tools/component-scaffold.ts} - Component scaffolding tool
 * @see {@link src/mcp/tools/sitemap-generator.ts} - Sitemap generator tool
 */

// [AI.TEAM.TOOLS.IMPORTS.RG:IMPLEMENTATION] Import MCP Tool Types and Tool Implementations
import type { MCPTool } from '../server';
import {
	createBenchmarkTool,
	executeBenchmarkTool,
} from './benchmark-tool';
import {
	createComponentScaffoldTool,
	executeComponentScaffoldTool,
} from './component-scaffold';
import {
	createLSPBridgeTool,
	executeLSPBridgeTool,
} from './lsp-bridge';
import {
	createRSSMonitorTool,
	executeRSSMonitorTool,
} from './rss-monitor';
import {
	createSitemapGeneratorTool,
	executeSitemapGeneratorTool
} from './sitemap-generator';
import {
	createTeamCoordinatorTool,
	executeTeamCoordinatorTool,
} from './team-coordinator';
import {
	createTeamInfoTool,
	executeTeamInfoTool,
} from './team-info';
import {
	createTelegramAlertTool,
	executeTelegramAlertTool,
} from './telegram-alerts';

/**
 * [AI.TEAM.TOOLS.CREATE.RG:IMPLEMENTATION] Create AI-powered team tooling tools
 *
 * Creates and returns an array of MCP tools for AI-assisted development:
 * - **LSP Bridge**: AI-powered code suggestions with context awareness
 * - **Benchmark Tool**: AI-driven property optimization using benchmark results
 * - **RSS Monitor**: AI-summarized team updates from RSS feeds
 * - **Team Coordinator**: AI-assigned reviews and notifications based on team structure
 * - **Component Scaffold**: Auto-generate component stubs with test files and metadata
 * - **Sitemap Generator**: Generate and query component sitemap data dynamically
 * - **Team Info**: Query TEAM.md to discover organizational structure, roles, and responsibilities (Human Capital Orchestration)
 *
 * @returns {MCPTool[]} Array of MCP tools ready for registration with MCP server
 *
 * @example
 * ```typescript
 * import { createAITeamTools } from './mcp/tools/ai-team-tools';
 * import { MCPServer } from './mcp/server';
 *
 * const server = new MCPServer();
 * const tools = createAITeamTools();
 * server.registerTools(tools);
 * ```
 *
 * @example
 * ```typescript
 * // Individual tool usage via MCP protocol
 * // AI Assistant → MCP Server → lsp-bridge-analyze
 * const result = await mcpTool.execute({
 *   packageName: '@graph/layer4',
 *   filePath: 'src/correlation.ts',
 *   query: 'How does correlation detection work?'
 * });
 * ```
 *
 * @see {@link docs/MCP-AI-TEAM-INTEGRATION.md#1-mcp-lsp-bridge} - LSP Bridge documentation
 * @see {@link docs/MCP-AI-TEAM-INTEGRATION.md#2-mcp-benchmark-tool} - Benchmark Tool documentation
 * @see {@link docs/MCP-AI-TEAM-INTEGRATION.md#3-mcp-rss-monitor} - RSS Monitor documentation
 * @see {@link docs/MCP-AI-TEAM-INTEGRATION.md#4-mcp-team-coordinator} - Team Coordinator documentation
 */
export function createAITeamTools(): MCPTool[] {
	// [AI.TEAM.TOOLS.INITIALIZE.RG:IMPLEMENTATION] Initialize tool instances
	const lspTool = createLSPBridgeTool();
	const benchmarkTool = createBenchmarkTool();
	const rssTool = createRSSMonitorTool();
	const teamTool = createTeamCoordinatorTool();
	const scaffoldTool = createComponentScaffoldTool();
	const sitemapTool = createSitemapGeneratorTool();
	const telegramAlertTool = createTelegramAlertTool();
	const teamInfoTool = createTeamInfoTool();

	// [AI.TEAM.TOOLS.REGISTRATION.RG:IMPLEMENTATION] Register MCP tools array
	return [
		/**
		 * [LSP.BRIDGE.TOOL.RG:IMPLEMENTATION] LSP Bridge Tool
		 * @name lsp-bridge-analyze
		 * @description AI-powered code suggestions with context awareness
		 * @see {@link src/mcp/tools/lsp-bridge.ts} - Implementation details
		 */
		{
			name: lspTool.name,
			description: lspTool.description,
			inputSchema: lspTool.inputSchema,
			// [LSP.BRIDGE.EXECUTE.RG:IMPLEMENTATION] Execute LSP Bridge Tool
			execute: async (args: Record<string, any>) => {
				// [LSP.BRIDGE.ARGS.RG:SCHEMA] LSP Bridge Tool Arguments Schema
				const result = await executeLSPBridgeTool(args as {
					packageName: string;
					filePath?: string;
					query: string;
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
		/**
		 * [BENCHMARK.TOOL.RG:IMPLEMENTATION] Benchmark Optimization Tool
		 * @name benchmark-optimize
		 * @description AI-driven property optimization using benchmark results
		 * @see {@link src/mcp/tools/benchmark-tool.ts} - Implementation details
		 */
		{
			name: benchmarkTool.name,
			description: benchmarkTool.description,
			inputSchema: benchmarkTool.inputSchema,
			// [BENCHMARK.EXECUTE.RG:IMPLEMENTATION] Execute Benchmark Tool
			execute: async (args: Record<string, any>) => {
				// [BENCHMARK.ARGS.RG:SCHEMA] Benchmark Tool Arguments Schema
				const result = await executeBenchmarkTool(args as {
					packageName: string;
					property: string;
					optimizationGoal?: string;
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
		/**
		 * [RSS.MONITOR.TOOL.RG:IMPLEMENTATION] RSS Monitor Tool
		 * @name rss-monitor-summarize
		 * @description AI-summarized team updates from RSS feeds
		 * @see {@link src/mcp/tools/rss-monitor.ts} - Implementation details
		 */
		{
			name: rssTool.name,
			description: rssTool.description,
			inputSchema: rssTool.inputSchema,
			// [RSS.MONITOR.EXECUTE.RG:IMPLEMENTATION] Execute RSS Monitor Tool
			execute: async (args: Record<string, any>) => {
				// [RSS.MONITOR.ARGS.RG:SCHEMA] RSS Monitor Tool Arguments Schema
				const result = await executeRSSMonitorTool(args as {
					teamId?: string;
					packageName?: string;
					summarize?: boolean;
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
		/**
		 * [SITEMAP.GENERATOR.TOOL.RG:IMPLEMENTATION] Sitemap Generator Tool
		 * @name sitemap-generate
		 * @description Generate and query component sitemap data dynamically
		 * @see {@link src/mcp/tools/sitemap-generator.ts} - Implementation details
		 */
		{
			name: sitemapTool.name,
			description: sitemapTool.description,
			inputSchema: sitemapTool.inputSchema,
			// [SITEMAP.GENERATOR.EXECUTE.RG:IMPLEMENTATION] Execute Sitemap Generator Tool
			execute: async (args: Record<string, any>) => {
				// [SITEMAP.GENERATOR.ARGS.RG:SCHEMA] Sitemap Generator Tool Arguments Schema
				const result = await executeSitemapGeneratorTool(args as {
					action: 'generate' | 'list-components' | 'list-css' | 'get-dependencies';
					componentName?: string;
					category?: string;
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
		/**
		 * [TEAM.COORDINATOR.TOOL.RG:IMPLEMENTATION] Team Coordinator Tool
		 * @name team-coordinator-assign
		 * @description AI-assigned reviews and notifications based on team structure
		 * @see {@link src/mcp/tools/team-coordinator.ts} - Implementation details
		 */
		{
			name: teamTool.name,
			description: teamTool.description,
			inputSchema: teamTool.inputSchema,
			// [TEAM.COORDINATOR.EXECUTE.RG:IMPLEMENTATION] Execute Team Coordinator Tool
			execute: async (args: Record<string, any>) => {
				// [TEAM.COORDINATOR.ARGS.RG:SCHEMA] Team Coordinator Tool Arguments Schema
				const result = await executeTeamCoordinatorTool(args as {
					prNumber?: number;
					packageNames?: string[];
					action: 'assign_reviewers' | 'notify_team';
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
		/**
		 * [COMPONENT.SCAFFOLD.TOOL.RG:IMPLEMENTATION] Component Scaffold Tool
		 * @name component-scaffold
		 * @description Auto-generate component stubs with test files and metadata updates
		 * @see {@link src/mcp/tools/component-scaffold.ts} - Implementation details
		 * @see {@link scripts/mcp-scaffold.ts} - CLI script implementation
		 */
		{
			name: scaffoldTool.name,
			description: scaffoldTool.description,
			inputSchema: scaffoldTool.inputSchema,
			// [COMPONENT.SCAFFOLD.EXECUTE.RG:IMPLEMENTATION] Execute Component Scaffold Tool
			execute: async (args: Record<string, any>) => {
				// [COMPONENT.SCAFFOLD.ARGS.RG:SCHEMA] Component Scaffold Tool Arguments Schema
				const result = await executeComponentScaffoldTool(args as {
					component: string;
					path: string;
					coverage?: number;
					critical?: boolean;
					updateManifest?: boolean;
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
		/**
		 * [TELEGRAM.ALERT.TOOL.RG:IMPLEMENTATION] Telegram Alert Tool
		 * @name telegram-publish-tension-alert
		 * @description Publish market tension alert to Telegram supergroup with intelligent routing and pinning
		 * @see {@link src/mcp/tools/telegram-alerts.ts} - Implementation details
		 * @see {@link src/telegram/tension-alerts.ts} - Tension alert router
		 */
		{
			name: telegramAlertTool.name,
			description: telegramAlertTool.description,
			inputSchema: telegramAlertTool.inputSchema,
			// [TELEGRAM.ALERT.EXECUTE.RG:IMPLEMENTATION] Execute Telegram Alert Tool
			execute: async (args: Record<string, any>) => {
				// [TELEGRAM.ALERT.ARGS.RG:SCHEMA] Telegram Alert Tool Arguments Schema
				const result = await executeTelegramAlertTool(args as {
					severity: 'critical' | 'high' | 'medium' | 'low';
					bookmaker: string;
					eventId: string;
					nodes: string[];
					snapshot?: any;
					teamId: 'sports_correlation' | 'market_analytics' | 'platform_tools';
				});

				return result;
			},
		},
		/**
		 * [TEAM.INFO.TOOL.RG:IMPLEMENTATION] Team Info Tool
		 * @name mlgs.team.info
		 * @description Query TEAM.md document to discover organizational structure, roles, and responsibilities
		 * @see {@link src/mcp/tools/team-info.ts} - Implementation details
		 * @see {@link .github/TEAM.md} - Team structure documentation
		 */
		{
			name: teamInfoTool.name,
			description: teamInfoTool.description,
			inputSchema: teamInfoTool.inputSchema,
			// [TEAM.INFO.EXECUTE.RG:IMPLEMENTATION] Execute Team Info Tool
			execute: async (args: Record<string, any>) => {
				// [TEAM.INFO.ARGS.RG:SCHEMA] Team Info Tool Arguments Schema
				const result = await executeTeamInfoTool(args as {
					query: string;
				});

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			},
		},
	];
}
