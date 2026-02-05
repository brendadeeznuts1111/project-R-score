#!/usr/bin/env bun
/**
 * @fileoverview UI Policy Management MCP Tools
 * @description MCP tools for managing and monitoring UI Policy Manifest
 * @module mcp/tools/ui-policy-management
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-UI-POLICY@8.0.0.0.0.0.0;instance-id=MCP-UI-POLICY-001;version=8.0.0.0.0.0.0}]
 * [PROPERTIES:{mcp={value:"ui-policy-management";@root:"ROOT-MCP";@chain:["BP-MCP-TOOLS","BP-UI-POLICY"];@version:"8.0.0.0.0.0.0"}}]
 * [CLASS:UIPolicyManagementMCP][#REF:v-8.0.0.0.0.0.0.BP.MCP.UI.POLICY.1.0.A.1.1.MCP.1.1]]
 *
 * Version: 8.0.0.0.0.0.0
 * Ripgrep Pattern: 8\.0\.0\.0\.0\.0\.0|MCP-UI-POLICY-001|BP-MCP-UI-POLICY@8\.0\.0\.0\.0\.0\.0
 *
 * @see 8.0.0.0.0.0.0 for Frontend Configuration & Policy Subsystem
 * @see 4.0.0.0.0.0.0 for Master Control Program & Alerting Subsystem
 */

import type { MCPTool } from "../server";
import { UIPolicyManager } from "../../services/ui-policy-manager";
import { policyMetrics } from "../../services/ui-policy-metrics";
import { validateManifest } from "../../../scripts/validate-ui-policy-manifest";

/**
 * 4.0.0.0.0.0.0: UI Policy Management MCP Tools
 *
 * Provides MCP tools for managing and monitoring the UI Policy Manifest,
 * integrated with the Master Control Program & Alerting Subsystem.
 *
 * @returns Array of MCP tools for UI policy management
 */
export function createUIPolicyManagementTools(): MCPTool[] {
	return [
		{
			name: "ui-policy-get-manifest",
			description: "Get current UI Policy Manifest configuration and metadata",
			inputSchema: {
				type: "object",
				properties: {
					include_policies: {
						type: "boolean",
						description: "Include full policy details (default: true)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const policyManager = UIPolicyManager.getInstance();
					const metadata = await policyManager.getMetadata();
					const includePolicies = args.include_policies !== false;

					let content = `📋 UI Policy Manifest\n\n`;
					content += `Version: ${metadata.version}\n`;
					content += `Schema Version: ${metadata.schema_version}\n`;
					content += `Last Updated: ${metadata.last_updated}\n`;
					content += `Description: ${metadata.description}\n`;

					if (includePolicies) {
						const featureFlags = await policyManager.getFeatureFlags();
						const policies = await policyManager.getHTMLRewriterPolicies();

						content += `\n## Feature Flags (${Object.keys(featureFlags).length})\n`;
						for (const [flag, enabled] of Object.entries(featureFlags)) {
							content += `  ${enabled ? "✅" : "❌"} ${flag}\n`;
						}

						content += `\n## HTMLRewriter Policies\n`;
						content += `  ${policies.inject_context_script ? "✅" : "❌"} Context Injection\n`;
						content += `  ${policies.data_feature_pruning?.enabled ? "✅" : "❌"} Feature Flag Pruning\n`;
						content += `  ${policies.data_access_pruning?.enabled ? "✅" : "❌"} RBAC Pruning\n`;
						content += `  ${policies.dynamic_content_implantation?.enabled ? "✅" : "❌"} Dynamic Content\n`;
					}

					return {
						content: [{ text: content }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting UI Policy Manifest: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "ui-policy-get-metrics",
			description: "Get UI Policy Manager metrics and health status",
			inputSchema: {
				type: "object",
				properties: {
					window: {
						type: "string",
						enum: ["hour", "day", "all"],
						description: "Time window for metrics (default: hour)",
					},
					format: {
						type: "string",
						enum: ["summary", "prometheus"],
						description: "Output format (default: summary)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const window = (args.window as "hour" | "day" | "all") || "hour";
					const format = (args.format as "summary" | "prometheus") || "summary";

					if (format === "prometheus") {
						const prometheus = policyMetrics.exportToPrometheus();
						return {
							content: [{ text: prometheus }],
						};
					}

					const summary = policyMetrics.getSummary(window);
					let content = `📊 UI Policy Metrics (${window})\n\n`;
					content += `## Totals\n`;
					content += `  Manifest Loads: ${summary.total.manifestLoads}\n`;
					content += `  Manifest Reloads: ${summary.total.manifestReloads}\n`;
					content += `  Context Builds: ${summary.total.contextBuilds}\n`;
					content += `  Feature Flag Resolutions: ${summary.total.featureFlagResolutions}\n`;
					content += `  Policy Retrievals: ${summary.total.policyRetrievals}\n`;
					content += `  Errors: ${summary.total.errors}\n`;

					content += `\n## Averages\n`;
					content += `  Manifest Load Time: ${summary.averages.manifestLoadTime}ms\n`;
					content += `  Context Build Time: ${summary.averages.contextBuildTime}ms\n`;
					content += `  Feature Flag Resolution Time: ${summary.averages.featureFlagResolutionTime}ms\n`;

					content += `\n## Health\n`;
					content += `  Status: ${summary.health.status.toUpperCase()}\n`;
					content += `  Error Rate: ${(summary.health.errorRate * 100).toFixed(2)}%\n`;
					content += `  Avg Latency: ${summary.health.avgLatency}ms\n`;

					return {
						content: [{ text: content }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting UI Policy metrics: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "ui-policy-validate-manifest",
			description: "Validate UI Policy Manifest file for correctness",
			inputSchema: {
				type: "object",
				properties: {
					path: {
						type: "string",
						description:
							"Path to manifest file (default: config/ui-policy-manifest.yaml)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const manifestPath = args.path || "config/ui-policy-manifest.yaml";
					const result = await validateManifest(manifestPath);

					if (result.valid) {
						let content = `✅ Manifest is valid!\n\n`;
						if (result.metadata) {
							content += `Version: ${result.metadata.version}\n`;
							content += `Schema Version: ${result.metadata.schema_version}\n`;
						}
						if (result.warnings.length > 0) {
							content += `\n⚠️  Warnings (${result.warnings.length}):\n`;
							for (const warning of result.warnings) {
								content += `  • ${warning}\n`;
							}
						}
						return {
							content: [{ text: content }],
						};
					} else {
						let content = `❌ Manifest validation failed!\n\n`;
						content += `Errors (${result.errors.length}):\n`;
						for (const error of result.errors) {
							content += `  • ${error}\n`;
						}
						if (result.warnings.length > 0) {
							content += `\nWarnings (${result.warnings.length}):\n`;
							for (const warning of result.warnings) {
								content += `  • ${warning}\n`;
							}
						}
						return {
							content: [{ text: content }],
							isError: true,
						};
					}
				} catch (error) {
					return {
						content: [
							{
								text: `Error validating manifest: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "ui-policy-reload-manifest",
			description:
				"Hot-reload UI Policy Manifest without restarting the server",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const policyManager = UIPolicyManager.getInstance();
					await policyManager.reload();

					return {
						content: [
							{
								text: "✅ UI Policy Manifest reloaded successfully!\n\nManifest changes are now active without server restart.",
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error reloading manifest: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "ui-policy-get-feature-flags",
			description: "Get current feature flag states with resolution details",
			inputSchema: {
				type: "object",
				properties: {
					flag_name: {
						type: "string",
						description:
							"Specific feature flag name (optional, returns all if not specified)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const policyManager = UIPolicyManager.getInstance();
					const flags = await policyManager.getFeatureFlags();

					if (args.flag_name) {
						const flagName = args.flag_name as string;
						const enabled = flags[flagName];
						if (enabled === undefined) {
							return {
								content: [
									{
										text: `❌ Feature flag "${flagName}" not found in manifest`,
									},
								],
								isError: true,
							};
						}
						return {
							content: [
								{
									text: `Feature Flag: ${flagName}\nStatus: ${enabled ? "✅ Enabled" : "❌ Disabled"}`,
								},
							],
						};
					}

					let content = `📋 Feature Flags (${Object.keys(flags).length})\n\n`;
					for (const [flag, enabled] of Object.entries(flags)) {
						content += `  ${enabled ? "✅" : "❌"} ${flag}\n`;
					}

					return {
						content: [{ text: content }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting feature flags: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "ui-policy-check-health",
			description: "Check UI Policy Manager health status and alert on issues",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const summary = policyMetrics.getSummary("hour");
					const health = summary.health;

					let content = `🏥 UI Policy Manager Health Check\n\n`;
					content += `Status: ${health.status.toUpperCase()}\n`;
					content += `Error Rate: ${(health.errorRate * 100).toFixed(2)}%\n`;
					content += `Avg Latency: ${health.avgLatency}ms\n\n`;

					if (health.status === "unhealthy") {
						content += `🚨 ALERT: System is unhealthy!\n`;
						content += `  • Error rate exceeds 10% or latency > 1000ms\n`;
						content += `  • Recent errors: ${summary.total.errors}\n`;
					} else if (health.status === "degraded") {
						content += `⚠️  WARNING: System is degraded\n`;
						content += `  • Error rate exceeds 5% or latency > 500ms\n`;
					} else {
						content += `✅ System is healthy\n`;
					}

					content += `\nRecent Activity (last hour):\n`;
					content += `  • Manifest Loads: ${summary.total.manifestLoads}\n`;
					content += `  • Context Builds: ${summary.total.contextBuilds}\n`;
					content += `  • Errors: ${summary.total.errors}\n`;

					return {
						content: [{ text: content }],
						isError: health.status === "unhealthy",
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error checking health: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
