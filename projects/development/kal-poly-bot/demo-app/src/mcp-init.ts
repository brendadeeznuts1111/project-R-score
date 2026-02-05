// src/mcp-init.ts - MCP Server Initialization
import { BunMCPServer } from '../mcp/server.ts';

console.log('🔍 Initializing MCP CodeSearch server...');

const server = new BunMCPServer();
server.start().catch(error => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});
