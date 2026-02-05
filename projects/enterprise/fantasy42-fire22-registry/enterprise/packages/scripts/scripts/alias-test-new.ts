#!/usr/bin/env bun
/**
 * New Alias Test
 * Testing @ff/ alias with direct ES6 imports
 */

// Test the @ff/ alias with direct import
import packageJson from '@ff/package.json';

console.log('🔧 New @ff/ Alias Test');
console.log('='.repeat(40));

console.log('📦 Package.json via @ff/ alias:');
console.log(`   Name: ${packageJson.name}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Scripts count: ${Object.keys(packageJson.scripts || {}).length}`);

console.log('\n✅ @ff/ alias working with ES6 imports!');
