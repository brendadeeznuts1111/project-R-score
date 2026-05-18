#!/usr/bin/env bun
/**
 * Bunfig.toml Import Demo
 * Demonstrates importing the project's bunfig.toml configuration
 */

import bunfig from '../bunfig.toml';

console.info('🔧 Bunfig.toml Import Demo');
console.info('='.repeat(50));

// Access bunfig configuration
console.info('📋 Bunfig Configuration Sections:');
console.info(Object.keys(bunfig).join(', '));

console.info('\n⚙️  Runtime Configuration:');
console.info(`   Preload: ${bunfig.preload}`);
console.info(`   JSX: ${bunfig.jsx}`);
console.info(`   JSX Factory: ${bunfig.jsxFactory}`);
console.info(`   Log Level: ${bunfig.logLevel}`);

console.info('\n🧪 Test Configuration:');
console.info(`   Root: ${bunfig.test?.root}`);
console.info(`   Preload: ${bunfig.test?.preload}`);
console.info(`   Coverage: ${bunfig.test?.coverage}`);
console.info(`   Timezone: ${bunfig.test?.timezone}`);

console.info('\n📦 Install Configuration:');
console.info(`   Registry: ${bunfig.install?.registry?.url}`);
console.info(`   Dev Dependencies: ${bunfig.install?.dev}`);
console.info(`   Exact Versions: ${bunfig.install?.exact}`);
console.info(`   Auto-install: ${bunfig.install?.auto}`);

console.info('\n🔒 Security Configuration:');
console.info(`   Scanner: ${bunfig.install?.security?.scanner}`);
console.info(`   Level: ${bunfig.install?.security?.level}`);
console.info(`   Enable: ${bunfig.install?.security?.enable}`);

console.info('\n🏷️  Version Configuration:');
console.info(`   Major bumps: ${bunfig.version?.major?.join(', ')}`);
console.info(`   Minor bumps: ${bunfig.version?.minor?.join(', ')}`);
console.info(`   Patch bumps: ${bunfig.version?.patch?.join(', ')}`);

console.info('\n🏗️  Architecture Versions:');
if (bunfig.version?.domains) {
  Object.entries(bunfig.version.domains).forEach(([domain, version]) => {
    console.info(`   ${domain}: ${version}`);
  });
}

console.info('\n🛣️  Path Aliases:');
if (bunfig.resolve?.aliases) {
  Object.entries(bunfig.resolve.aliases).forEach(([alias, path]) => {
    console.info(`   ${alias} → ${path}`);
  });
}

console.info('\n📊 Metadata:');
if (bunfig.version?.metadata) {
  Object.entries(bunfig.version.metadata).forEach(([key, value]) => {
    console.info(`   ${key}: ${value}`);
  });
}

// Demonstrate accessing nested configuration
console.info('\n🔍 Accessing Nested Configuration:');
console.info(`Coverage Threshold Line: ${bunfig.test?.coverageThreshold?.line}`);
console.info(`Security Policies: ${bunfig.install?.security?.fire22?.policies?.join(', ')}`);

export { bunfig };
