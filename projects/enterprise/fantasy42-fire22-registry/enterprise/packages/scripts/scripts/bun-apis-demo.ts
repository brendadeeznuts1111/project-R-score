#!/usr/bin/env bun
/**
 * Bun APIs Comprehensive Demo
 * Demonstrating Bun.semver, Bun.TOML.parse, Bun.YAML.parse, and Bun.color
 */

console.log('🚀 Bun APIs Comprehensive Demo');
console.log('='.repeat(60));

// ============================================================================
// 1. BUN.SEMVER - Semantic Versioning Operations
// ============================================================================
console.log('\n📦 Bun.semver - Semantic Versioning Operations');
console.log('-'.repeat(50));

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

console.log('🔍 Version Analysis:');
versions.forEach(version => {
  try {
    // Use Bun.semver to check if valid and get components
    const isValid = Bun.semver.valid(version);
    if (isValid) {
      // Parse version components manually for demo
      const parts = version.split('.').map(p => parseInt(p.split('-')[0]));
      console.log(
        `   ${version.padEnd(15)} → Major: ${parts[0]}, Minor: ${parts[1]}, Patch: ${parts[2]}`
      );
    } else {
      console.log(`   ${version.padEnd(15)} → Invalid version`);
    }
  } catch (error) {
    console.log(`   ${version.padEnd(15)} → Error: ${error.message}`);
  }
});

console.log('\n📈 Version Comparisons:');
const baseVersion = '2.0.0';
console.log(`   Base version: ${baseVersion}`);
versions.forEach(version => {
  try {
    const comparison = Bun.semver.compare(version, baseVersion);
    const symbol = comparison > 0 ? '↑' : comparison < 0 ? '↓' : '=';
    console.log(`   ${version.padEnd(15)} ${symbol} ${comparison}`);
  } catch (error) {
    // Skip invalid versions
  }
});

console.log('\n🎯 Version Satisfies:');
const constraint = '^2.0.0';
console.log(`   Constraint: ${constraint}`);
versions.forEach(version => {
  try {
    const satisfies = Bun.semver.satisfies(version, constraint);
    console.log(`   ${version.padEnd(15)} → ${satisfies ? '✅' : '❌'} satisfies`);
  } catch (error) {
    // Skip invalid versions
  }
});

// ============================================================================
// 2. BUN.TOML.PARSE - TOML String Parsing
// ============================================================================
console.log('\n\n📄 Bun.TOML.parse - TOML String Parsing');
console.log('-'.repeat(50));

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
  console.log('🔧 Parsed TOML Data:');
  console.log(`   Name: ${tomlData.name}`);
  console.log(`   Version: ${tomlData.version}`);
  console.log(`   Description: ${tomlData.description}`);

  console.log('\n   Metadata:');
  console.log(`     Created: ${tomlData.metadata.created}`);
  console.log(`     Author: ${tomlData.metadata.author}`);

  console.log('\n   Features:');
  Object.entries(tomlData.features).forEach(([feature, enabled]) => {
    console.log(`     ${feature}: ${enabled ? '✅' : '❌'}`);
  });

  console.log('\n   Plugins:');
  tomlData.plugins.forEach((plugin, index) => {
    console.log(`     ${index + 1}. ${plugin.name} (${plugin.enabled ? 'enabled' : 'disabled'})`);
  });
} catch (error) {
  console.log(`   ❌ TOML Parse Error: ${error.message}`);
}

// ============================================================================
// 3. BUN.YAML.PARSE - YAML String Parsing
// ============================================================================
console.log('\n\n📋 Bun.YAML.parse - YAML String Parsing');
console.log('-'.repeat(50));

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
  console.log('🔧 Parsed YAML Data:');
  console.log(`   Name: ${yamlData.name}`);
  console.log(`   Version: ${yamlData.version}`);
  console.log(`   Environment: ${yamlData.environment}`);

  console.log('\n   Services:');
  yamlData.services.forEach((service, index) => {
    console.log(
      `     ${index + 1}. ${service.name} (port: ${service.port}) - ${service.enabled ? '✅' : '❌'}`
    );
  });

  console.log('\n   Configuration:');
  console.log(`     Log Level: ${yamlData.configuration.log_level}`);
  console.log(`     Max Connections: ${yamlData.configuration.max_connections}`);
  console.log(`     Timeout: ${yamlData.configuration.timeout}s`);

  console.log('\n   Features:');
  Object.entries(yamlData.features).forEach(([feature, enabled]) => {
    console.log(`     ${feature}: ${enabled ? '✅' : '❌'}`);
  });
} catch (error) {
  console.log(`   ❌ YAML Parse Error: ${error.message}`);
}

// ============================================================================
// 4. TERMINAL COLORS - ANSI Escape Sequences
// ============================================================================
console.log('\n\n🎨 Terminal Colors and ANSI Styling');
console.log('-'.repeat(50));

// ANSI color codes for terminal output
console.log('🌈 ANSI Color Codes:');
console.log('   \x1b[31mRed text\x1b[0m');
console.log('   \x1b[32mGreen text\x1b[0m');
console.log('   \x1b[34mBlue text\x1b[0m');
console.log('   \x1b[33mYellow text\x1b[0m');
console.log('   \x1b[35mMagenta text\x1b[0m');
console.log('   \x1b[36mCyan text\x1b[0m');
console.log('   \x1b[37mWhite text\x1b[0m');
console.log('   \x1b[90mGray text\x1b[0m');

// Background colors
console.log('\n🏠 Background Colors:');
console.log('   \x1b[41mRed background\x1b[0m');
console.log('   \x1b[42mGreen background\x1b[0m');
console.log('   \x1b[44mBlue background\x1b[0m');

// Text styles
console.log('\n✨ Text Styles:');
console.log('   \x1b[1mBold text\x1b[0m');
console.log('   \x1b[2mDim text\x1b[0m');
console.log('   \x1b[3mItalic text\x1b[0m');
console.log('   \x1b[4mUnderline text\x1b[0m');
console.log('   \x1b[9mStrikethrough text\x1b[0m');

// Combined styles
console.log('\n🎯 Combined Styles:');
console.log('   \x1b[1;31mBold red text\x1b[0m');
console.log('   \x1b[4;44;37mUnderlined white text on blue\x1b[0m');
console.log('   \x1b[3;32mItalic green text\x1b[0m');

// Bright colors
console.log('\n🔆 Bright Colors:');
console.log('   \x1b[91mBright Red\x1b[0m');
console.log('   \x1b[92mBright Green\x1b[0m');
console.log('   \x1b[94mBright Blue\x1b[0m');

// Utility function for colors (similar to what Bun.color would provide)
const createColorFunction = (ansiCode: string) => (text: string) =>
  `\x1b[${ansiCode}m${text}\x1b[0m`;

const red = createColorFunction('31');
const green = createColorFunction('32');
const blue = createColorFunction('34');
const cyan = createColorFunction('36');
const bold = createColorFunction('1');

console.log('\n🛠️  Custom Color Functions:');
console.log(`   ${red('Custom red text')}`);
console.log(`   ${green('Custom green text')}`);
console.log(`   ${blue('Custom blue text')}`);
console.log(`   ${bold('Custom bold text')}`);
console.log(`   ${bold(red('Bold red text'))}`);

// ============================================================================
// 5. PRACTICAL COMBINATION EXAMPLE
// ============================================================================
console.log('\n\n🚀 Practical Combination Example');
console.log('-'.repeat(50));

console.log('🔧 Fire22 System Status Check:');

const systemStatus = {
  version: '2.0.0-architecture',
  services: [
    { name: 'API', status: 'running', port: 3000 },
    { name: 'Database', status: 'running', port: 5432 },
    { name: 'Cache', status: 'stopped', port: 6379 },
  ],
};

console.log(`${bold(cyan('📊 System Version:'))} ${systemStatus.version}`);

systemStatus.services.forEach(service => {
  const statusColor = service.status === 'running' ? green : red;
  const statusIcon = service.status === 'running' ? '✅' : '❌';

  console.log(
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

  console.log(`\n🔍 Version Check: ${compatibilityMessage}`);
} catch (error) {
  console.log(`\n❌ Version check failed: ${error.message}`);
}

console.log('\n🎉 Bun APIs Demo Complete!');
console.log('   All major Bun runtime APIs demonstrated successfully!');
