#!/usr/bin/env bun
// scripts/help.ts - Help system for my-demo-app

console.log('🖥️  my-demo-app - Surgical Precision Platform');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('MCP server with ripgrep codebase search');
console.log('');
console.log('📋 Available Commands:');
console.log('');

// Group commands by category
const commands = {
  'Development': {
    'bun run dev': 'Start development server',
    'bun run build': 'Build for production',
    'bun run test': 'Run test suite'
  },
  'Code Quality': {
    'bun run lint': 'Check code style',
    'bun run type-check': 'Verify TypeScript types'
  }
};


commands['MCP Server'] = {
  'bun run mcp:start': 'Start MCP code search server',
  'bun run mcp:search': 'Test MCP search API',
  'bun run mcp:health': 'Check MCP server health'
};




commands['Benchmarks'] = {
  'bun run bench:all': 'Run all benchmarks',
  'bun run bench:performance': 'Performance benchmarks',
  'bun run bench:search': 'Search speed benchmarks'
};

for (const [category, cmds] of Object.entries(commands)) {
  console.log(`${category}:`);
  for (const [cmd, desc] of Object.entries(cmds)) {
    console.log(`  ${cmd.padEnd(20)} - ${desc}`);
  }
  console.log('');
}

console.log('📚 For more information:');
console.log('  README.md          - Project documentation');
console.log('  docs/              - Additional documentation');
console.log('');
