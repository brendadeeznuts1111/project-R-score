/**
 * @fileoverview [23.3.1.0.0.0.0] Platform Component Scaffolding MCP Tool API-1.0 [PLATFORM]
 * @description MCP tool for auto-generating component stubs with enhanced metadata, test files, and team integration
 * @module mcp/tools/component-scaffold
 * @version 1.3.4
 * @ref v-1.3.4.MCPT.COMPSCAF.PLAT.1.0.A.1.1.DOC.1.1
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-COMPONENT-SCAFFOLD@1.3.4;instance-id=MCP-SCAFFOLD-001;version=1.3.4}]
 * [PROPERTIES:{mcp={value:"component-scaffold";@root:"23.3.0.0.0.0.0";@chain:["BP-CODE-INTEGRITY","BP-MCP-TOOLS"];@version:"1.3.4"}}]
 * [CLASS:ComponentScaffoldMCP][#REF:v-1.3.4.MCPT.COMPSCAF.PLAT.1.0.A.1.1.MCP.1.1]]
 */

import { $ } from "bun";
import { dirname, join } from "path";
import type { MCPTool } from "../server";

/**
 * Create component scaffolding tool
 */
export function createComponentScaffoldTool(): MCPTool {
	return {
		name: "component-scaffold",
		description:
			"Auto-generate component stubs with test files, metadata updates, and CI integration. Generates TypeScript components with 95% coverage target.",
		inputSchema: {
			type: "object",
			properties: {
				component: {
					type: "string",
					description: "Component name (e.g., 'test-status')",
				},
				path: {
					type: "string",
					description:
						"Path to components directory (e.g., 'apps/@registry-dashboard/src/components/')",
				},
				team: {
					type: "string",
					description: "Team ID (platform_tools, sports_correlation, market_analytics)",
					enum: ["platform_tools", "sports_correlation", "market_analytics"],
				},
				description: {
					type: "string",
					description: "Component description for JSDoc",
				},
				dependencies: {
					type: "array",
					items: { type: "string" },
					description: "List of dependencies (comma-separated or array)",
				},
				exports: {
					type: "array",
					items: { type: "string" },
					description: "List of exported symbols",
				},
				apiVersion: {
					type: "string",
					description: "API version (e.g., '1.0', '2.3')",
				},
				coverage: {
					type: "number",
					description: "Test coverage target (default: 0.95)",
					default: 0.95,
				},
				critical: {
					type: "boolean",
					description: "Whether component is critical (default: true)",
					default: true,
				},
				updateManifest: {
					type: "boolean",
					description: "Update manifest.json (default: true)",
					default: true,
				},
				notify: {
					type: "boolean",
					description: "Send Telegram notification (default: false)",
					default: false,
				},
				rss: {
					type: "boolean",
					description: "Publish to RSS feed (default: false)",
					default: false,
				},
			},
			required: ["component", "path"],
		},
		execute: async (args: Record<string, any>) => {
			try {
				const {
					component,
					path,
					team,
					description,
					dependencies,
					exports,
					apiVersion,
					coverage = 0.95,
					critical = true,
					updateManifest = true,
					notify = false,
					rss = false,
				} = args;

				if (!component || !path) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										error: "Missing required parameters",
										required: ["component", "path"],
									},
									null,
									2,
								),
							},
						],
						isError: true,
					};
				}

				// Run scaffolding script
				const scaffoldScript = "scripts/mcp-scaffold.ts";
				const scriptFile = Bun.file(scaffoldScript);
				if (!(await scriptFile.exists())) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										error: "Scaffolding script not found",
										path: scaffoldScript,
									},
									null,
									2,
								),
							},
						],
						isError: true,
					};
				}

				// Build command arguments array
				const cmdArgs = [
					"bun",
					"run",
					scaffoldScript,
					"--type",
					"component",
					"--name",
					component,
					"--path",
					path,
					"--coverage",
					coverage.toString(),
					"--critical",
					critical.toString(),
				];

				// Add optional parameters
				if (team) cmdArgs.push("--team", team);
				if (description) cmdArgs.push("--description", description);
				if (dependencies) {
					const deps = Array.isArray(dependencies) ? dependencies.join(",") : dependencies;
					cmdArgs.push("--dependencies", deps);
				}
				if (exports) {
					const exp = Array.isArray(exports) ? exports.join(",") : exports;
					cmdArgs.push("--exports", exp);
				}
				if (apiVersion) cmdArgs.push("--api-version", apiVersion);
				if (!updateManifest) cmdArgs.push("--no-manifest");
				if (notify) cmdArgs.push("--notify");
				if (rss) cmdArgs.push("--rss");

				// Build command using Bun's $ shell API
				const cmd = $(cmdArgs);
				const result = await cmd.quiet();

				// Determine output files
				const componentPath = path.endsWith("/") ? path.slice(0, -1) : path;
				const componentFile = join(componentPath, `${component}.ts`);
				const testFile = join(componentPath, `${component}.test.ts`);
				const manifestPath = join(dirname(componentPath), "manifest.json");

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									status: "success",
									component,
									metadata: {
										team: team || null,
										description: description || null,
										apiVersion: apiVersion || "1.0",
										dependencies: dependencies || [],
										exports: exports || [],
									},
									generated: {
										component: componentFile,
										test: testFile,
										manifest: updateManifest ? manifestPath : null,
									},
									coverage_target: coverage,
									critical,
									output: result.stdout.toString(),
									next_steps: [
										`Review generated component: ${componentFile}`,
										`Run tests: bun test ${testFile}`,
										`Verify coverage: bun test --coverage ${testFile}`,
										team ? `Component assigned to team: ${team}` : null,
										apiVersion ? `API version: ${apiVersion}` : null,
									].filter(Boolean),
								},
								null,
								2,
							),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									error: "Scaffolding failed",
									message: error.message,
									stack: error.stack,
								},
								null,
								2,
							),
						},
					],
					isError: true,
				};
			}
		},
	};
}

/**
 * Execute component scaffolding tool (for direct script usage)
 */
export async function executeComponentScaffoldTool(args: {
	component: string;
	path: string;
	coverage?: number;
	critical?: boolean;
	updateManifest?: boolean;
}): Promise<{
	status: string;
	component: string;
	generated: {
		component: string;
		test: string;
		manifest: string | null;
	};
}> {
	const tool = createComponentScaffoldTool();
	const result = await tool.execute(args);
	const content = result.content[0];
	
	if (result.isError || !content.text) {
		throw new Error(content.text || "Scaffolding failed");
	}

	return JSON.parse(content.text);
}
