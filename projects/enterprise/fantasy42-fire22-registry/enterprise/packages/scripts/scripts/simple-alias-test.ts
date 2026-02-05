#!/usr/bin/env bun
/**
 * Simple Path Alias Test
 * Testing @ff/ alias functionality
 */

// Test importing a TOML file from root
import config from '@ff/fire22-config.toml';

console.log('🔧 Simple @ff/ Alias Test');
console.log('='.repeat(40));

console.log('📁 Testing @ff/ alias:');
console.log(`   Project: ${config.name}`);
console.log(`   Version: ${config.version}`);
console.log(`   Description: ${config.description}`);

console.log('\n✅ @ff/ alias is working!');
console.log('   Successfully imported fire22-config.toml from project root');

export { config };
