#!/usr/bin/env bun
/**
 * Simple Path Alias Test
 * Testing @ff/ alias functionality
 */

// Test importing a TOML file from root
import config from '@ff/fire22-config.toml';

console.info('🔧 Simple @ff/ Alias Test');
console.info('='.repeat(40));

console.info('📁 Testing @ff/ alias:');
console.info(`   Project: ${config.name}`);
console.info(`   Version: ${config.version}`);
console.info(`   Description: ${config.description}`);

console.info('\n✅ @ff/ alias is working!');
console.info('   Successfully imported fire22-config.toml from project root');

export { config };
