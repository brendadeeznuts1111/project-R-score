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

console.info('🔧 Fire22 TOML Import Demo');
console.info('='.repeat(50));

// Access TOML data directly
console.info(`📦 Project: ${config.name}`);
console.info(`🏷️  Version: ${config.version}`);
console.info(`📝 Description: ${config.description}`);
console.info(`👤 Author: ${config.author.name} (${config.author.email})`);
console.info(`🏢 Organization: ${config.author.organization}`);

console.info('\n🏗️  Architecture:');
console.info(`   Framework: ${config.project.framework}`);
console.info(`   Runtime: ${config.project.runtime}`);
console.info(`   Style: ${config.project.architecture}`);

console.info('\n🌍 Environment:');
console.info(`   Production: ${config.environment.production}`);
console.info(`   Debug: ${config.environment.debug}`);
console.info(`   Log Level: ${config.environment.log_level}`);
console.info(`   Timezone: ${config.environment.timezone}`);

console.info('\n✨ Features:');
Object.entries(config.features).forEach(([feature, enabled]) => {
  console.info(`   ${enabled ? '✅' : '❌'} ${feature.replace('_', ' ')}`);
});

console.info('\n📋 Dependencies:');
Object.entries(config.dependencies).forEach(([dep, version]) => {
  console.info(`   ${dep}: ${version}`);
});

console.info('\n🔍 Domains:');
config.domains.forEach((domain, index) => {
  console.info(`   ${index + 1}. ${domain.name} v${domain.version}`);
  console.info(`      ${domain.description}`);
});

console.info('\n🎯 Project Domains Array:');
console.info(config.project.domains);

// Demonstrate type safety with TypeScript
const typedConfig = config as Fire22Config;
console.info('\n🔒 Type-safe access:');
console.info(`Security Scanner: ${typedConfig.features.security_scanner}`);
console.info(`First Domain: ${typedConfig.domains[0].name}`);

export { config as fire22Config };
export type { Fire22Config };
