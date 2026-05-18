#!/usr/bin/env bun
// src/index.ts - Surgical Precision Platform Entry Point

console.info('🔬 my-demo-app - Surgical Precision Platform');
console.info('🚀 Starting up...');
console.info('');


// Start MCP server if enabled
import './mcp-init.ts';




console.info('✅ Platform initialized successfully!');
console.info('');
console.info('🎯 Available commands:');
console.info('   bun run help    - Show help');
console.info('   bun run mcp:start - Start MCP server');

console.info('');

// Keep the process alive if MCP server is running

process.on('SIGINT', () => {
  console.info('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Keep alive
setInterval(() => {}, 1000);

