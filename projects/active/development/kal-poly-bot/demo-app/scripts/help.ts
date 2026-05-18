#!/usr/bin/env bun
// scripts/help.ts - Help system for my-demo-app

console.info('🖥️  my-demo-app - Surgical Precision Platform');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('');
console.info('MCP server with ripgrep codebase search');
console.info('');
console.info('📋 Available Commands:');
console.info('');

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
  console.info(`${category}:`);
  for (const [cmd, desc] of Object.entries(cmds)) {
    console.info(`  ${cmd.padEnd(20)} - ${desc}`);
  }
  console.info('');
}

console.info('📚 For more information:');
console.info('  README.md          - Project documentation');
console.info('  docs/              - Additional documentation');
console.info('');
