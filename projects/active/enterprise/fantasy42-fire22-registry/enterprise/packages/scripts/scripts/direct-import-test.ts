#!/usr/bin/env bun
/**
 * Direct Import Test
 * Testing imports without aliases first
 */

// Test direct imports from project root
import config from '../fire22-config.toml';
import bunfig from '../bunfig.toml';

console.info('🔧 Direct Import Test');
console.info('='.repeat(40));

console.info('📁 Direct imports from project root:');
console.info(`   Project: ${config.name}`);
console.info(`   Version: ${config.version}`);

console.info('\n⚙️  Bunfig Configuration:');
console.info(`   JSX: ${bunfig.jsx}`);
console.info(`   Log Level: ${bunfig.logLevel}`);

console.info('\n✅ Direct imports working!');
console.info("   Now let's test the @ff/ alias...");

// Test the @ff/ alias
try {
  const aliasTest = require('@ff/package.json');
  console.info('   @ff/ alias: ✅ Working');
} catch (error) {
  console.info('   @ff/ alias: ❌ Not working');
  console.info(`   Error: ${error.message}`);
}

export { config, bunfig };
