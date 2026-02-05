/**
 * @fileoverview MCP Module Exports
 * @description Model Context Protocol server and tools
 * @module mcp
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP@0.1.0;instance-id=MCP-001;version=0.1.0}]
 * [PROPERTIES:{mcp={value:"mcp-module";@root:"ROOT-MCP";@chain:["BP-MCP","BP-SERVER"];@version:"0.1.0"}}]
 * [CLASS:MCPModule][#REF:v-0.1.0.BP.MCP.1.0.A.1.1.MCP.1.1]]
 */

export { createResearchTools } from "../research/mcp/tools/research-explorer";
export { MCPServer, type MCPTool } from "./server";
export { createAnomalyResearchTools } from "./tools/anomaly-research";
export { createBunShellTools } from "./tools/bun-shell-tools";
export { createBunToolingTools } from "./tools/bun-tooling";
export { createDocsIntegrationTools } from "./tools/docs-integration";
export { createSecurityDashboardTools } from "./tools/security-dashboard";
export { createSearchBunTool } from "./tools/search-bun";
export { createUIPolicyManagementTools } from "./tools/ui-policy-management";
export { createCovertSteamAlertTools } from "./tools/covert-steam-alerts";
export { createBunUtilsTools } from "./tools/bun-utils";
export { inspectForensicTools } from "./tools/inspect-forensic";
export { shadowGraphResearchTools } from "./tools/shadow-graph-research";
export { advancedResearchTools } from "./tools/advanced-research";
export {
	multiLayerCorrelationTools,
	registerMultiLayerCorrelationTools,
} from "./tools/multi-layer-correlation";
