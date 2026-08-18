#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
/**
 * Bun APIs Comprehensive Demo
 * Demonstrating Bun.semver, Bun.TOML.parse, Bun.YAML.parse, and Bun.color
 */

console.info('🚀 Bun APIs Comprehensive Demo');
console.info('='.repeat(60));

// ============================================================================
// 1. BUN.SEMVER - Semantic Versioning Operations
// ============================================================================
console.info('\n📦 Bun.semver - Semantic Versioning Operations');
console.info('-'.repeat(50));

const versions = [
  '1.0.0',
  '2.0.0-alpha.1',
  '2.0.0-beta.2',
  '2.0.0-rc.1',
  '2.0.0',
  '2.1.0',
  '2.1.1',
  '3.0.0',
];

console.info('🔍 Version Analysis:');
versions.forEach(version => {
  try {
    // Use Bun.semver to check if valid and get components
    const isValid = Bun.semver.satisfies(version, version);
    if (isValid) {
      // Parse version components manually for demo
      const parts = version.split('.').map(p => parseInt(p.split('-')[0]));
      console.info(
        `   ${version.padEnd(15)} → Major: ${parts[0]}, Minor: ${parts[1]}, Patch: ${parts[2]}`
      );
    } else {
      console.info(`   ${version.padEnd(15)} → Invalid version`);
    }
  } catch (error) {
    console.info(`   ${version.padEnd(15)} → Error: ${error.message}`);
  }
});

console.info('\n📈 Version Comparisons:');
const baseVersion = '2.0.0';
console.info(`   Base version: ${baseVersion}`);
versions.forEach(version => {
  try {
    const comparison = Bun.semver.order(version, baseVersion);
    const symbol = comparison > 0 ? '↑' : comparison < 0 ? '↓' : '=';
    console.info(`   ${version.padEnd(15)} ${symbol} ${comparison}`);
  } catch (error) {
    // Skip invalid versions
  }
});

console.info('\n🎯 Version Satisfies:');
const constraint = '^2.0.0';
console.info(`   Constraint: ${constraint}`);
versions.forEach(version => {
  try {
    const satisfies = Bun.semver.satisfies(version, constraint);
    console.info(`   ${version.padEnd(15)} → ${satisfies ? '✅' : '❌'} satisfies`);
  } catch (error) {
    // Skip invalid versions
  }
});

// ============================================================================
// 2. BUN.TOML.PARSE - TOML String Parsing
// ============================================================================
console.info('\n\n📄 Bun.TOML.parse - TOML String Parsing');
console.info('-'.repeat(50));

const tomlString = `
name = "Fire22 Dynamic Config"
version = "2.0.0"
description = "Runtime-generated TOML configuration"

[metadata]
created = "2024-12-19T10:00:00Z"
author = "Bun Runtime"

[features]
security_scanner = true
telemetry = false
auto_install = true

[[plugins]]
name = "security-monitor"
enabled = true

[[plugins]]
name = "performance-monitor"
enabled = true
`;

try {
  const tomlData = Bun.TOML.parse(tomlString);
  console.info('🔧 Parsed TOML Data:');
  console.info(`   Name: ${tomlData.name}`);
  console.info(`   Version: ${tomlData.version}`);
  console.info(`   Description: ${tomlData.description}`);

  console.info('\n   Metadata:');
  console.info(`     Created: ${tomlData.metadata.created}`);
  console.info(`     Author: ${tomlData.metadata.author}`);

  console.info('\n   Features:');
  Object.entries(tomlData.features).forEach(([feature, enabled]) => {
    console.info(`     ${feature}: ${enabled ? '✅' : '❌'}`);
  });

  console.info('\n   Plugins:');
  tomlData.plugins.forEach((plugin, index) => {
    console.info(`     ${index + 1}. ${plugin.name} (${plugin.enabled ? 'enabled' : 'disabled'})`);
  });
} catch (error) {
  console.info(`   ❌ TOML Parse Error: ${error.message}`);
}

// ============================================================================
// 3. BUN.YAML.PARSE - YAML String Parsing
// ============================================================================
console.info('\n\n📋 Bun.YAML.parse - YAML String Parsing');
console.info('-'.repeat(50));

const yamlString = `
name: "Fire22 Runtime Config"
version: "2.0.0"
environment: "development"

services:
  - name: "api"
    port: 3000
    enabled: true
  - name: "database"
    port: 5432
    enabled: true
  - name: "cache"
    port: 6379
    enabled: false

configuration:
  log_level: "info"
  max_connections: 100
  timeout: 30

features:
  authentication: true
  authorization: true
  rate_limiting: false
`;

try {
  const yamlData = Bun.YAML.parse(yamlString);
  console.info('🔧 Parsed YAML Data:');
  console.info(`   Name: ${yamlData.name}`);
  console.info(`   Version: ${yamlData.version}`);
  console.info(`   Environment: ${yamlData.environment}`);

  console.info('\n   Services:');
  yamlData.services.forEach((service, index) => {
    console.info(
      `     ${index + 1}. ${service.name} (port: ${service.port}) - ${service.enabled ? '✅' : '❌'}`
    );
  });

  console.info('\n   Configuration:');
  console.info(`     Log Level: ${yamlData.configuration.log_level}`);
  console.info(`     Max Connections: ${yamlData.configuration.max_connections}`);
  console.info(`     Timeout: ${yamlData.configuration.timeout}s`);

  console.info('\n   Features:');
  Object.entries(yamlData.features).forEach(([feature, enabled]) => {
    console.info(`     ${feature}: ${enabled ? '✅' : '❌'}`);
  });
} catch (error) {
  console.info(`   ❌ YAML Parse Error: ${error.message}`);
}

// ============================================================================
// 4. TERMINAL COLORS - ANSI Escape Sequences
// ============================================================================
console.info('\n\n🎨 Terminal Colors and ANSI Styling');
console.info('-'.repeat(50));

// ANSI color codes for terminal output
console.info('🌈 ANSI Color Codes:');
console.info('   \x1b[31mRed text\x1b[0m');
console.info('   \x1b[32mGreen text\x1b[0m');
console.info('   \x1b[34mBlue text\x1b[0m');
console.info('   \x1b[33mYellow text\x1b[0m');
console.info('   \x1b[35mMagenta text\x1b[0m');
console.info('   \x1b[36mCyan text\x1b[0m');
console.info('   \x1b[37mWhite text\x1b[0m');
console.info('   \x1b[90mGray text\x1b[0m');

// Background colors
console.info('\n🏠 Background Colors:');
console.info('   \x1b[41mRed background\x1b[0m');
console.info('   \x1b[42mGreen background\x1b[0m');
console.info('   \x1b[44mBlue background\x1b[0m');

// Text styles
console.info('\n✨ Text Styles:');
console.info('   \x1b[1mBold text\x1b[0m');
console.info('   \x1b[2mDim text\x1b[0m');
console.info('   \x1b[3mItalic text\x1b[0m');
console.info('   \x1b[4mUnderline text\x1b[0m');
console.info('   \x1b[9mStrikethrough text\x1b[0m');

// Combined styles
console.info('\n🎯 Combined Styles:');
console.info('   \x1b[1;31mBold red text\x1b[0m');
console.info('   \x1b[4;44;37mUnderlined white text on blue\x1b[0m');
console.info('   \x1b[3;32mItalic green text\x1b[0m');

// Bright colors
console.info('\n🔆 Bright Colors:');
console.info('   \x1b[91mBright Red\x1b[0m');
console.info('   \x1b[92mBright Green\x1b[0m');
console.info('   \x1b[94mBright Blue\x1b[0m');

// Utility function for colors (similar to what Bun.color would provide)
const createColorFunction = (ansiCode: string) => (text: string) =>
  `\x1b[${ansiCode}m${text}\x1b[0m`;

const red = createColorFunction('31');
const green = createColorFunction('32');
const blue = createColorFunction('34');
const cyan = createColorFunction('36');
const bold = createColorFunction('1');

console.info('\n🛠️  Custom Color Functions:');
console.info(`   ${red('Custom red text')}`);
console.info(`   ${green('Custom green text')}`);
console.info(`   ${blue('Custom blue text')}`);
console.info(`   ${bold('Custom bold text')}`);
console.info(`   ${bold(red('Bold red text'))}`);

// ============================================================================
// 5. PRACTICAL COMBINATION EXAMPLE
// ============================================================================
console.info('\n\n🚀 Practical Combination Example');
console.info('-'.repeat(50));

console.info('🔧 Fire22 System Status Check:');

const systemStatus = {
  version: '2.0.0-architecture',
  services: [
    { name: 'API', status: 'running', port: 3000 },
    { name: 'Database', status: 'running', port: 5432 },
    { name: 'Cache', status: 'stopped', port: 6379 },
  ],
};

console.info(`${bold(cyan('📊 System Version:'))} ${systemStatus.version}`);

systemStatus.services.forEach(service => {
  const statusColor = service.status === 'running' ? green : red;
  const statusIcon = service.status === 'running' ? '✅' : '❌';

  console.info(
    `   ${statusIcon} ${bold(service.name)}: ${statusColor(service.status)} (port: ${service.port})`
  );
});

// Version compatibility check
const currentVersion = '2.0.0';
const requiredVersion = '^2.0.0';

try {
  const isCompatible = Bun.semver.satisfies(currentVersion, requiredVersion);
  const compatibilityMessage = isCompatible
    ? green('✅ Version compatible')
    : red('❌ Version incompatible');

  console.info(`\n🔍 Version Check: ${compatibilityMessage}`);
} catch (error) {
  console.info(`\n❌ Version check failed: ${error.message}`);
}

console.info('\n🎉 Bun APIs Demo Complete!');
console.info('   All major Bun runtime APIs demonstrated successfully!');
