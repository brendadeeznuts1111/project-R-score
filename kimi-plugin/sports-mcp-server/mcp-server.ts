#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, createHandler } from "./lib/tools";
import { disconnectAll } from "./lib/ws-pool";

const F402_ENDPOINT = Bun.env.F402_ENDPOINT ?? "https://fantasy402.com/api/v1";
const WS_ENDPOINT = Bun.env.F402_WS ?? "wss://fantasy402.com/ws";

const server = new Server(
  { name: "sports-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, createHandler(server));

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[MCP] Sports MCP Server running on stdio");
console.error(`[MCP] Config: endpoint=${F402_ENDPOINT}, ws=${WS_ENDPOINT}`);

process.on("SIGINT", () => {
  console.error("[MCP] Shutting down...");
  disconnectAll();
  process.exit(0);
});
