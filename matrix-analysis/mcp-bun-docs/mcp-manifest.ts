/**
 * MCP Manifest for Bun documentation
 * Basic manifest URL and types for the matrix view
 */

export const MCP_MANIFEST_URL = "https://bun.com/api/mcp/manifest";

export interface SearchBunSchema {
	type: string;
	properties: Record<string, any>;
	required: string[];
}

export interface SearchBunTool {
	name: string;
	description: string;
	inputSchema: SearchBunSchema;
	operationId: string;
}

export interface MCPManifest {
	server: string;
	capabilities: {
		tools: any[];
		resources: any[];
		prompts: any[];
	};
}
