#!/usr/bin/env bun
// src/index.ts - Surgical Precision Platform Entry Point

console.log('🔬 my-demo-app - Surgical Precision Platform');
console.log('🚀 Starting up...');
console.log('');


// Start MCP server if enabled
import './mcp-init.ts';




console.log('✅ Platform initialized successfully!');
console.log('');
console.log('🎯 Available commands:');
console.log('   bun run help    - Show help');
console.log('   bun run mcp:start - Start MCP server');

console.log('');

// Keep the process alive if MCP server is running

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Keep alive
setInterval(() => {}, 1000);

