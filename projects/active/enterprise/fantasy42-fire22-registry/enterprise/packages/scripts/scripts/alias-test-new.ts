#!/usr/bin/env bun
/**
 * New Alias Test
 * Testing @ff/ alias with direct ES6 imports
 */

// Test the @ff/ alias with direct import
import packageJson from '@ff/package.json';

console.info('🔧 New @ff/ Alias Test');
console.info('='.repeat(40));

console.info('📦 Package.json via @ff/ alias:');
console.info(`   Name: ${packageJson.name}`);
console.info(`   Version: ${packageJson.version}`);
console.info(`   Scripts count: ${Object.keys(packageJson.scripts || {}).length}`);

console.info('\n✅ @ff/ alias working with ES6 imports!');
