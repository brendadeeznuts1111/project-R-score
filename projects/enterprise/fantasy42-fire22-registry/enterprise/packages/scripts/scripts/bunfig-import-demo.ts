#!/usr/bin/env bun
/**
 * Bunfig.toml Import Demo
 * Demonstrates importing the project's bunfig.toml configuration
 */

import bunfig from '../bunfig.toml';

console.log('🔧 Bunfig.toml Import Demo');
console.log('='.repeat(50));

// Access bunfig configuration
console.log('📋 Bunfig Configuration Sections:');
console.log(Object.keys(bunfig).join(', '));

console.log('\n⚙️  Runtime Configuration:');
console.log(`   Preload: ${bunfig.preload}`);
console.log(`   JSX: ${bunfig.jsx}`);
console.log(`   JSX Factory: ${bunfig.jsxFactory}`);
console.log(`   Log Level: ${bunfig.logLevel}`);

console.log('\n🧪 Test Configuration:');
console.log(`   Root: ${bunfig.test?.root}`);
console.log(`   Preload: ${bunfig.test?.preload}`);
console.log(`   Coverage: ${bunfig.test?.coverage}`);
console.log(`   Timezone: ${bunfig.test?.timezone}`);

console.log('\n📦 Install Configuration:');
console.log(`   Registry: ${bunfig.install?.registry?.url}`);
console.log(`   Dev Dependencies: ${bunfig.install?.dev}`);
console.log(`   Exact Versions: ${bunfig.install?.exact}`);
console.log(`   Auto-install: ${bunfig.install?.auto}`);

console.log('\n🔒 Security Configuration:');
console.log(`   Scanner: ${bunfig.install?.security?.scanner}`);
console.log(`   Level: ${bunfig.install?.security?.level}`);
console.log(`   Enable: ${bunfig.install?.security?.enable}`);

console.log('\n🏷️  Version Configuration:');
console.log(`   Major bumps: ${bunfig.version?.major?.join(', ')}`);
console.log(`   Minor bumps: ${bunfig.version?.minor?.join(', ')}`);
console.log(`   Patch bumps: ${bunfig.version?.patch?.join(', ')}`);

console.log('\n🏗️  Architecture Versions:');
if (bunfig.version?.domains) {
  Object.entries(bunfig.version.domains).forEach(([domain, version]) => {
    console.log(`   ${domain}: ${version}`);
  });
}

console.log('\n🛣️  Path Aliases:');
if (bunfig.resolve?.aliases) {
  Object.entries(bunfig.resolve.aliases).forEach(([alias, path]) => {
    console.log(`   ${alias} → ${path}`);
  });
}

console.log('\n📊 Metadata:');
if (bunfig.version?.metadata) {
  Object.entries(bunfig.version.metadata).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

// Demonstrate accessing nested configuration
console.log('\n🔍 Accessing Nested Configuration:');
console.log(`Coverage Threshold Line: ${bunfig.test?.coverageThreshold?.line}`);
console.log(`Security Policies: ${bunfig.install?.security?.fire22?.policies?.join(', ')}`);

export { bunfig };
