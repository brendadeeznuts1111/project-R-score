#!/usr/bin/env bun
// Demo script for Table Format in CLI
// Shows how to use the --table flag with Bun.inspect

// Export to make this file a module
export {};

console.info('📊 Table Format Demo');
console.info('====================\n');

console.info('1. Standard format:');
console.info('$ bun run cli/test.ts --config=local\n');

// Run standard format
await import('../cli/test.ts').then(m => m.testCommand(['--config=local']));

console.info('\n2. Table format:');
console.info('$ bun run cli/test.ts --table --config=local\n');

// Run table format
await import('../cli/test.ts').then(m => m.testCommand(['--table', '--config=local']));

console.info('\n3. Table format with profiling:');
console.info('$ bun run cli/test.ts --table --profile --config=local\n');

// Run table format with profiling
await import('../cli/test.ts').then(m => m.testCommand(['--table', '--profile', '--config=local']));

console.info('\n✅ Demo complete! Compare the visual difference between formats.');
