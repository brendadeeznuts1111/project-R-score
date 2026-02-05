#!/usr/bin/env bun
/**
 * TOML Import Demo for Fire22
 * Demonstrates Bun's native TOML file import support
 */

import config from '../fire22-config.toml';

// Import the bunfig.toml directly (if needed)
// import bunfig from "../bunfig.toml";

// Type-safe access to TOML data
interface Fire22Config {
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email: string;
    organization: string;
  };
  project: {
    architecture: string;
    runtime: string;
    framework: string;
    domains: string[];
  };
  environment: {
    production: boolean;
    debug: boolean;
    log_level: string;
    timezone: string;
  };
  features: {
    security_scanner: boolean;
    telemetry: boolean;
    auto_install: boolean;
    coverage_reporting: boolean;
  };
  dependencies: {
    bun: string;
    typescript: string;
    semver: string;
  };
  domains: Array<{
    name: string;
    version: string;
    description: string;
  }>;
}

console.log('🔧 Fire22 TOML Import Demo');
console.log('='.repeat(50));

// Access TOML data directly
console.log(`📦 Project: ${config.name}`);
console.log(`🏷️  Version: ${config.version}`);
console.log(`📝 Description: ${config.description}`);
console.log(`👤 Author: ${config.author.name} (${config.author.email})`);
console.log(`🏢 Organization: ${config.author.organization}`);

console.log('\n🏗️  Architecture:');
console.log(`   Framework: ${config.project.framework}`);
console.log(`   Runtime: ${config.project.runtime}`);
console.log(`   Style: ${config.project.architecture}`);

console.log('\n🌍 Environment:');
console.log(`   Production: ${config.environment.production}`);
console.log(`   Debug: ${config.environment.debug}`);
console.log(`   Log Level: ${config.environment.log_level}`);
console.log(`   Timezone: ${config.environment.timezone}`);

console.log('\n✨ Features:');
Object.entries(config.features).forEach(([feature, enabled]) => {
  console.log(`   ${enabled ? '✅' : '❌'} ${feature.replace('_', ' ')}`);
});

console.log('\n📋 Dependencies:');
Object.entries(config.dependencies).forEach(([dep, version]) => {
  console.log(`   ${dep}: ${version}`);
});

console.log('\n🔍 Domains:');
config.domains.forEach((domain, index) => {
  console.log(`   ${index + 1}. ${domain.name} v${domain.version}`);
  console.log(`      ${domain.description}`);
});

console.log('\n🎯 Project Domains Array:');
console.log(config.project.domains);

// Demonstrate type safety with TypeScript
const typedConfig = config as Fire22Config;
console.log('\n🔒 Type-safe access:');
console.log(`Security Scanner: ${typedConfig.features.security_scanner}`);
console.log(`First Domain: ${typedConfig.domains[0].name}`);

export { config as fire22Config };
export type { Fire22Config };
