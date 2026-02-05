#!/usr/bin/env bun
// Demo script for Bytecode Profiling CLI
// Shows how to use the new CLI options

console.log('🔥 Bytecode Profiling CLI Demo');
console.log('=============================\n');

console.log('1. Show help:');
console.log('$ bun run cli/test.ts --help\n');

// Export to make this file a module
export {};

// Run help
await import('../cli/test.ts').then(m => m.testCommand(['--help']));

console.log('\n2. Profile config loading:');
console.log('$ bun run cli/test.ts --profile-config --config=local\n');

// Profile config loading
await import('../cli/test.ts').then(m => m.testCommand(['--profile-config', '--config=local']));

console.log('\n3. Run with bytecode profiling:');
console.log('$ bun run cli/test.ts --profile --config=local\n');

// Run with profiling (using a minimal test to avoid actual test execution)
await import('../cli/test.ts').then(m => m.testCommand(['--profile', '--config=local']));

console.log('\n4. Compare profiles:');
console.log('$ bun run cli/test.ts --compare-profiles --config=local\n');

// Compare profiles
await import('../cli/test.ts').then(m => m.testCommand(['--compare-profiles', '--config=local']));

console.log('\n✅ Demo complete! Check artifacts/ for saved bytecode profiles.');
