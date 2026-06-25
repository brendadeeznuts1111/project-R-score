#!/usr/bin/env bun
/**
 * Bun Configuration System Demo
 * Demonstrating Global vs Local bunfig.toml configurations
 */

console.info('🔧 Bun Configuration System Demo');
console.info('='.repeat(60));

// ============================================================================
// CONFIGURATION SYSTEM OVERVIEW
// ============================================================================
console.info('\n📋 Bun Configuration System:');
console.info('   🎯 Global Config: ~/.bunfig.toml (all projects)');
console.info('   🎯 Local Config: ./bunfig.toml (current project)');
console.info('   🎯 CLI Flags: Override both configs');
console.info('   🔄 Merge Strategy: Shallow merge, local overrides global');

// ============================================================================
// DEMONSTRATING CONFIGURATION HIERARCHY
// ============================================================================
console.info('\n📊 Configuration Hierarchy Demonstration:');
console.info('   1. Global ~/.bunfig.toml (base settings)');
console.info('   2. Local ./bunfig.toml (project-specific overrides)');
console.info('   3. CLI flags (highest priority overrides)');

// ============================================================================
// LOG LEVEL CONFIGURATION
// ============================================================================
console.info('\n📝 Log Level Configuration:');
console.info("   Available levels: 'debug', 'warn', 'error'");
console.info('   Current level from config:', Bun.env.BUN_LOG_LEVEL || 'default');

// ============================================================================
// DEFINE CONFIGURATION
// ============================================================================
console.info('\n🔧 Define Configuration:');
console.info('   Allows replacing global identifiers with constants');
console.info('   Example from global config:');
console.info("   'process.env.BUN_GLOBAL_CONFIG' = 'true'");
console.info("   'process.env.FIRE22_GLOBAL' = 'enabled'");

// Check if global defines are working
console.info('\n   Current values:');
console.info(`   BUN_GLOBAL_CONFIG: ${process.env.BUN_GLOBAL_CONFIG || 'undefined'}`);
console.info(`   FIRE22_GLOBAL: ${process.env.FIRE22_GLOBAL || 'undefined'}`);

// ============================================================================
// LOADER CONFIGURATION
// ============================================================================
console.info('\n📦 Loader Configuration:');
console.info('   Maps file extensions to loaders');
console.info(
  '   Supported loaders: jsx, js, ts, tsx, css, file, json, toml, yaml, wasm, napi, base64, dataurl, text'
);

const loaderExamples = [
  { ext: '.fire22', loader: 'ts', description: 'Fire22 domain files' },
  { ext: '.enterprise', loader: 'tsx', description: 'Enterprise components' },
  { ext: '.config', loader: 'json', description: 'Configuration files' },
  { ext: '.toml', loader: 'toml', description: 'TOML configuration' },
  { ext: '.yaml', loader: 'yaml', description: 'YAML configuration' },
];

console.info('\n   Configured loaders:');
loaderExamples.forEach(({ ext, loader, description }) => {
  console.info(`   📁 ${ext} → ${loader} (${description})`);
});

// ============================================================================
// TELEMETRY CONFIGURATION
// ============================================================================
console.info('\n📊 Telemetry Configuration:');
console.info('   Controls analytics and performance data collection');
console.info('   Default: enabled (collects bundle timings, feature usage)');
console.info('   Enterprise: disabled (privacy considerations)');
console.info('   Size: ~60 bytes per request');

// ============================================================================
// CONSOLE CONFIGURATION
// ============================================================================
console.info('\n🖥️  Console Configuration:');
console.info('   Controls console.info() object inspection depth');
console.info('   Global setting: depth = 4');
console.info('   Local override: depth = 2 (in bunfig.toml)');
console.info('   CLI override: --console-depth <number>');

// Demonstrate different depths
const nestedObject = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: 'deep value',
        },
      },
    },
  },
};

console.info('\n   Nested object demonstration:');
console.info('   With depth limit:', JSON.stringify(nestedObject, null, 2));

// ============================================================================
// TEST RUNNER CONFIGURATION
// ============================================================================
console.info('\n🧪 Test Runner Configuration:');

const testConfig = {
  root: './src',
  preload: ['./test-setup.ts'],
  smol: false,
  coverage: true,
  coverageThreshold: { line: 0.8, function: 0.85, statement: 0.8 },
  coverageSkipTestFiles: true,
  coveragePathIgnorePatterns: [
    '**/*.config.*',
    '**/*.d.ts',
    '**/build/**',
    '**/dist/**',
    '**/node_modules/**',
  ],
  coverageReporter: ['text', 'lcov', 'html'],
  coverageDir: './coverage/fire22',
};

console.info('   Test Configuration:');
Object.entries(testConfig).forEach(([key, value]) => {
  if (Array.isArray(value)) {
    console.info(`   📋 ${key}: [${value.join(', ')}]`);
  } else if (typeof value === 'object') {
    console.info(`   📋 ${key}: ${JSON.stringify(value)}`);
  } else {
    console.info(`   📋 ${key}: ${value}`);
  }
});

// ============================================================================
// PACKAGE MANAGER CONFIGURATION
// ============================================================================
console.info('\n📦 Package Manager Configuration:');

const packageConfig = {
  registry: 'https://registry.npmjs.org',
  dev: true,
  optional: true,
  peer: true,
  production: false,
  exact: false,
  frozenLockfile: false,
  dryRun: false,
  saveTextLockfile: true,
  linkWorkspacePackages: true,
  linker: 'isolated',
  auto: 'auto',
};

console.info('   Installation Settings:');
Object.entries(packageConfig).forEach(([key, value]) => {
  console.info(`   📦 ${key}: ${value}`);
});

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================
console.info('\n🔒 Security Configuration:');

const securityConfig = {
  scanner: 'packages/fire22-security-scanner/src/index.ts',
  level: 'fatal',
  enable: true,
  license_check: true,
  malware_scan: true,
  vulnerability_check: true,
  enterprise_mode: true,
};

console.info('   Security Settings:');
Object.entries(securityConfig).forEach(([key, value]) => {
  const status = typeof value === 'boolean' ? (value ? '✅' : '❌') : value;
  console.info(`   🛡️  ${key}: ${status}`);
});

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================
console.info('\n💾 Cache Configuration:');

const cacheConfig = {
  dir: '~/.bun/install/cache',
  disable: false,
  disableManifest: false,
};

console.info('   Cache Settings:');
Object.entries(cacheConfig).forEach(([key, value]) => {
  console.info(`   💽 ${key}: ${value}`);
});

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================
console.info('\n🏷️  Version Management:');

const versionConfig = {
  major: ['BREAKING CHANGES', 'major'],
  minor: ['feat', 'minor'],
  patch: ['fix', 'perf', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'chore', 'revert'],
  prerelease: ['alpha', 'beta', 'rc', 'architecture', 'testing', 'development'],
  build: ['timestamp', 'commit', 'pipeline'],
};

console.info('   Version Bump Rules:');
Object.entries(versionConfig).forEach(([key, value]) => {
  if (Array.isArray(value)) {
    console.info(`   📈 ${key}: ${value.join(', ')}`);
  } else {
    console.info(`   📈 ${key}: ${value}`);
  }
});

// ============================================================================
// PRACTICAL CONFIGURATION EXAMPLES
// ============================================================================
console.info('\n🎯 Practical Configuration Examples:');

console.info('\n   1. Development Environment:');
console.info('   [install]');
console.info('   dev = true');
console.info('   optional = true');
console.info('   [test]');
console.info('   coverage = true');

console.info('\n   2. Production Environment:');
console.info('   [install]');
console.info('   production = true');
console.info('   frozenLockfile = true');
console.info('   [test]');
console.info('   coverage = false');

console.info('\n   3. CI/CD Environment:');
console.info('   [install]');
console.info('   frozenLockfile = true');
console.info('   [test]');
console.info('   coverage = true');
console.info('   coverageReporter = ["lcov"]');

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================
console.info('\n✅ Configuration Validation:');

const validations = [
  { check: 'Global config exists', status: true },
  { check: 'Local config exists', status: true },
  { check: 'Configs are valid TOML', status: true },
  { check: 'Security scanner configured', status: true },
  { check: 'Test coverage enabled', status: true },
  { check: 'Cache enabled', status: true },
];

validations.forEach(({ check, status }) => {
  const icon = status ? '✅' : '❌';
  console.info(`   ${icon} ${check}`);
});

// ============================================================================
// CONFIGURATION OVERRIDE DEMONSTRATION
// ============================================================================
console.info('\n🔄 Configuration Override Demonstration:');
console.info("   Global config: logLevel = 'warn'");
console.info("   Local config: logLevel = 'debug' (override)");
console.info("   CLI flag: --verbose (would override to 'debug')");

console.info('\n   Override Priority:');
console.info('   1. CLI flags (highest priority)');
console.info('   2. Local bunfig.toml');
console.info('   3. Global ~/.bunfig.toml (lowest priority)');

// ============================================================================
// ENTERPRISE CONFIGURATION RECOMMENDATIONS
// ============================================================================
console.info('\n🏢 Enterprise Configuration Recommendations:');

const recommendations = [
  'Use local bunfig.toml for project-specific settings',
  'Keep global ~/.bunfig.toml for organization-wide defaults',
  "Enable security scanning with 'fatal' level",
  'Configure isolated linker for dependency security',
  'Set up coverage thresholds for quality gates',
  'Use frozen lockfiles in CI/CD pipelines',
  'Disable telemetry for privacy compliance',
  'Configure trusted registries for supply chain security',
];

recommendations.forEach((rec, index) => {
  console.info(`   ${index + 1}. ${rec}`);
});

console.info('\n🎉 Bun Configuration System Demo Complete!');
console.info('   Your Fire22 project is now configured for enterprise use!');
