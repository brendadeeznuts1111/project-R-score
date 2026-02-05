#!/usr/bin/env bun
/**
 * Direct Import Test
 * Testing imports without aliases first
 */

// Test direct imports from project root
import config from '../fire22-config.toml';
import bunfig from '../bunfig.toml';

console.log('🔧 Direct Import Test');
console.log('='.repeat(40));

console.log('📁 Direct imports from project root:');
console.log(`   Project: ${config.name}`);
console.log(`   Version: ${config.version}`);

console.log('\n⚙️  Bunfig Configuration:');
console.log(`   JSX: ${bunfig.jsx}`);
console.log(`   Log Level: ${bunfig.logLevel}`);

console.log('\n✅ Direct imports working!');
console.log("   Now let's test the @ff/ alias...");

// Test the @ff/ alias
try {
  const aliasTest = require('@ff/package.json');
  console.log('   @ff/ alias: ✅ Working');
} catch (error) {
  console.log('   @ff/ alias: ❌ Not working');
  console.log(`   Error: ${error.message}`);
}

export { config, bunfig };
