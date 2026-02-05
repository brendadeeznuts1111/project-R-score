#!/usr/bin/env bun
/**
 * Network-Controlled Test Runner
 *
 * Demonstrates various ways to control network requests and auto-installs during test execution.
 *
 * Usage:
 *   bun run scripts/test-network-controlled.ts [mode]
 *
 * Modes:
 *   - offline:   Use --prefer-offline flag
 *   - frozen:    Use --frozen-lockfile flag
 *   - ci:        Use CI configuration
 *   - isolated:  Combine multiple network restrictions
 */

import { spawn } from 'bun';

type TestMode = 'offline' | 'frozen' | 'ci' | 'isolated' | 'default';

interface TestConfig {
  mode: TestMode;
  flags: string[];
  env: Record<string, string>;
  description: string;
}

const configs: Record<TestMode, TestConfig> = {
  // Prefer offline mode - uses cache when possible, falls back to network if needed
  offline: {
    mode: 'offline',
    flags: ['--prefer-offline'],
    env: {
      BUN_INSTALL_SKIP_DOWNLOAD: '0', // Allow downloads if cache miss
      CI: '0'
    },
    description: 'Prefer offline - use cache, fallback to network if needed'
  },

  // Frozen lockfile mode - error if lockfile would change
  frozen: {
    mode: 'frozen',
    flags: ['--frozen-lockfile'],
    env: {
      BUN_INSTALL_SKIP_DOWNLOAD: '0',
      CI: '0'
    },
    description: 'Frozen lockfile - fail if dependencies need updating'
  },

  // CI mode - combines multiple restrictions
  ci: {
    mode: 'ci',
    flags: ['--config=ci'],
    env: {
      CI: '1',
      BUN_INSTALL_SKIP_DOWNLOAD: '0'
    },
    description: 'CI mode - frozen lockfile + coverage + longer timeout'
  },

  // Isolated mode - maximum network restriction
  isolated: {
    mode: 'isolated',
    flags: ['--prefer-offline', '--frozen-lockfile'],
    env: {
      CI: '1',
      BUN_INSTALL_SKIP_DOWNLOAD: '1', // Skip all downloads
      BUN_DISABLE_INSTALL: '1', // Disable auto-installs entirely
      NO_UPDATE: '1'
    },
    description: 'Isolated - maximum network restriction, no auto-installs'
  },

  // Default mode - no special restrictions
  default: {
    mode: 'default',
    flags: [],
    env: {
      CI: '0'
    },
    description: 'Default - normal test execution'
  }
};

function printBanner() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     Network-Controlled Test Runner - bun test Network Control Demo      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log();
}

function printUsage() {
  console.log('Usage: bun run scripts/test-network-controlled.ts [mode]');
  console.log();
  console.log('Available modes:');
  Object.entries(configs).forEach(([mode, config]) => {
    console.log(`  ${mode.padEnd(10)} ${config.description}`);
  });
  console.log();
  console.log('Examples:');
  console.log('  bun run scripts/test-network-controlled.ts offline');
  console.log('  bun run scripts/test-network-controlled.ts frozen');
  console.log('  bun run scripts/test-network-controlled.ts isolated');
  console.log();
}

async function runTests(config: TestConfig, testPatterns: string[] = []) {
  console.log(`🧪 Running tests in ${config.mode} mode`);
  console.log(`📝 ${config.description}`);
  console.log();

  // Build command with flags
  const args = ['test', ...config.flags, ...testPatterns.map(p => p.startsWith('./') ? p : `./${p}`)];

  console.log('Command:', `bun ${args.join(' ')}`);
  console.log('Environment variables:');
  Object.entries(config.env).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });
  console.log();

  // Spawn the test process
  const proc = spawn({
    cmd: ['bun', ...args],
    env: { ...process.env, ...config.env },
    stdout: 'inherit',
    stderr: 'inherit'
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`✅ Tests completed successfully in ${config.mode} mode`);
  } else {
    console.log(`❌ Tests failed in ${config.mode} mode with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = (args[0] || 'default') as TestMode;
  const testPatterns = args.slice(1);

  printBanner();

  if (!configs[mode]) {
    console.error(`❌ Unknown mode: ${mode}`);
    console.log();
    printUsage();
    process.exit(1);
  }

  if (args.length === 0) {
    printUsage();
    return;
  }

  const config = configs[mode];

  // Show current network settings
  console.log('📊 Current Network Settings:');
  console.log(`  Prefer Offline: ${config.flags.includes('--prefer-offline') ? '✅' : '❌'}`);
  console.log(`  Frozen Lockfile: ${config.flags.includes('--frozen-lockfile') ? '✅' : '❌'}`);
  console.log(`  CI Mode: ${config.env.CI === '1' ? '✅' : '❌'}`);
  console.log(`  Skip Downloads: ${config.env.BUN_INSTALL_SKIP_DOWNLOAD === '1' ? '✅' : '❌'}`);
  console.log(`  Disable Install: ${config.env.BUN_DISABLE_INSTALL === '1' ? '✅' : '❌'}`);
  console.log();

  await runTests(config, testPatterns);
}

// Handle help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printBanner();
  printUsage();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
