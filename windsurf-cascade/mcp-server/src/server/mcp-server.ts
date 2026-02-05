#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MCPServerConfig } from '../schemas/types.js';

/**
 * MCP Server configuration and setup
 * Extracted from the original monolithic file
 */
export class MCPServerSetup {
  private server: McpServer;

  constructor(config: MCPServerConfig = {
    name: "odds-protocol-mcp",
    version: "1.0.0",
    port: 3000,
    transport: "stdio",
    environment: "development"
  }) {
    this.server = new McpServer({
      name: config.name,
      version: config.version,
    });
  }

  getServer(): McpServer {
    return this.server;
  }

  /**
   * Add a tool to the server
   */
  addTool(
    name: string,
    description: string,
    schema: any,
    handler: (args: any) => Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
      isError?: boolean;
    }>
  ): void {
    this.server.tool(name, description, schema, handler);
  }

  /**
   * Add a resource to the server
   */
  addResource(
    name: string,
    mimeType: string,
    handler: (uri: URL) => Promise<{
      contents: Array<{
        uri: URL;
        mimeType: string;
        text: string;
      }>;
    }>
  ): void {
    this.server.resource(name, mimeType, handler);
  }

  /**
   * Add a prompt to the server
   */
  addPrompt(
    name: string,
    description: string,
    schema?: any,
    handler: (args: any) => Promise<{
      messages: Array<{
        role: string;
        content: {
          type: string;
          text: string;
        };
      }>;
    }>
  ): void {
    this.server.prompt(name, description, schema, handler);
  }

  /**
   * Start the server with specified transport
   */
  async startServer(transport: 'stdio' | 'http' = 'stdio', port: number = 3000): Promise<void> {
    if (transport === 'http') {
      // HTTP/SSE transport for web-based MCP clients
      const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
      
      const sseTransport = new SSEServerTransport("/message", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
      
      await this.server.connect(sseTransport);
      console.error(`Odds Protocol MCP Server running on HTTP port ${port}`);
      console.error(`SSE endpoint: http://localhost:${port}/message`);
    } else {
      // Default stdio transport for CLI-based MCP clients
      const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
      
      const stdioTransport = new StdioServerTransport();
      await this.server.connect(stdioTransport);
      console.error("Odds Protocol MCP Server running on stdio");
    }
  }
}

// Factory function for creating configured server instances
export function createMCPServer(config?: MCPServerConfig): MCPServerSetup {
  return new MCPServerSetup(config);
}

// Default server configuration
export const defaultServerConfig: MCPServerConfig = {
  name: "odds-protocol-mcp",
  version: "1.0.0",
  port: 3000,
  transport: "stdio",
  environment: "development"
};

export default MCPServerSetup;