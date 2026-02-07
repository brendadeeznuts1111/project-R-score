#!/usr/bin/env bun
/**
 * 🏰 FactoryWager v3.8 Mega Test Suite
 *
 * Comprehensive test of all systems
 * Usage: bun run factory-wager-mega-suite.ts
 */

import { themes, themeList, getTheme } from './themes/config/index';
import { cachedCloudflare } from './lib/cloudflare/cached-client';
import { optimizedSecretManager } from './lib/secrets/core/optimized-secret-manager';
import { createProfileEngine } from './src/profile';
import {
  createDashboard,
  createAdminDashboard,
  createClientDashboard,
  createBarberDashboard,
  createAnalyticsDashboard,
} from './src/dashboard';
import { createSyncEngine } from './src/dashboard/sync';
import { createCLI, ProgressBar, Spinner } from './lib/cli';

const COLORS = {
  blue: '\x1b[34m',
  teal: '\x1b[36m',
  green: '\x1b[32m',
  orange: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
};

function printHeader(title: string) {
  console.log();
  console.log(
    `${COLORS.blue}╔══════════════════════════════════════════════════════════════╗${COLORS.reset}`
  );
  console.log(
    `${COLORS.blue}║${COLORS.reset} ${COLORS.bright}${title.padEnd(60)}${COLORS.reset}${COLORS.blue} ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.blue}╚══════════════════════════════════════════════════════════════╝${COLORS.reset}`
  );
}

function printSection(title: string) {
  console.log();
  console.log(`${COLORS.teal}▶ ${title}${COLORS.reset}`);
  console.log(`${COLORS.teal}${'─'.repeat(62)}${COLORS.reset}`);
}

function printPass(message: string) {
  console.log(`  ${COLORS.green}✓${COLORS.reset} ${message}`);
}

function printFail(message: string) {
  console.log(`  ${COLORS.red}✗${COLORS.reset} ${message}`);
}

function printInfo(label: string, value: string) {
  console.log(`  ${COLORS.dim}${label.padEnd(20)}${COLORS.reset} ${value}`);
}

// ==================== TESTS ====================

const results = { pass: 0, fail: 0, skipped: 0 };

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    printPass(name);
    results.pass++;
  } catch (error) {
    printFail(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.fail++;
  }
}

// ==================== MAIN ====================

async function main() {
  const suiteStart = performance.now();

  printHeader('🏰 FACTORYWAGER v3.8 MEGA SUITE');
  console.log(`${COLORS.dim}  Started: ${new Date().toISOString()}${COLORS.reset}`);

  // ==================== THEME SYSTEM ====================
  printSection('Theme System');

  await test('All themes registered', () => {
    if (!themes.light || !themes.dark || !themes.professional || !themes.factorywager) {
      throw new Error('Missing themes');
    }
  });

  await test('Theme list populated', () => {
    if (themeList.length !== 4) throw new Error(`Expected 4 themes, got ${themeList.length}`);
  });

  await test('FactoryWager theme accessible', () => {
    const fw = themes.factorywager;
    if (!fw.meta.name || fw.meta.name !== 'FactoryWager') throw new Error('Wrong theme name');
  });

  await test('Blue palette correct', () => {
    const blue = themes.factorywager.colors.primary['500'];
    if (!blue.includes('210')) throw new Error('Blue hue should be ~210');
  });

  await test('Teal palette correct', () => {
    const teal = themes.factorywager.colors.secondary['500'];
    if (!teal.includes('175')) throw new Error('Teal hue should be ~175');
  });

  await test('Green palette correct', () => {
    const green = themes.factorywager.colors.success['500'];
    if (!green.includes('145')) throw new Error('Green hue should be ~145');
  });

  await test('Orange palette correct', () => {
    const orange = themes.factorywager.colors.warning['500'];
    if (!orange.includes('30')) throw new Error('Orange hue should be ~30');
  });

  await test('Red palette correct', () => {
    const red = themes.factorywager.colors.error['500'];
    if (!red.includes('0')) throw new Error('Red hue should be ~0');
  });

  await test('No purple colors (240-300°)', () => {
    const allColors = [
      ...Object.values(themes.factorywager.colors.primary),
      ...Object.values(themes.factorywager.colors.secondary),
      ...Object.values(themes.factorywager.colors.success),
      ...Object.values(themes.factorywager.colors.warning),
      ...Object.values(themes.factorywager.colors.error),
    ];

    for (const color of allColors) {
      const match = color.match(/hsl\((\d+)/);
      if (match) {
        const hue = parseInt(match[1]);
        if (hue >= 240 && hue <= 300) {
          throw new Error(`Found purple color with hue ${hue}: ${color}`);
        }
      }
    }
  });

  // ==================== DASHBOARD SYSTEM ====================
  printSection('Dashboard System');

  await test('Dashboard builder creates instance', () => {
    const db = createDashboard();
    if (!db) throw new Error('Failed to create dashboard');
  });

  await test('Admin dashboard builds', () => {
    const db = createAdminDashboard();
    const built = db.build();
    if (built.widgets.length === 0) throw new Error('No widgets in admin dashboard');
  });

  await test('Client dashboard builds', () => {
    const db = createClientDashboard();
    const built = db.build();
    if (built.config.view !== 'client') throw new Error('Wrong view type');
  });

  await test('Barber dashboard builds', () => {
    const db = createBarberDashboard();
    const built = db.build();
    if (built.config.view !== 'barber') throw new Error('Wrong view type');
  });

  await test('Analytics dashboard builds', () => {
    const db = createAnalyticsDashboard();
    const built = db.build();
    if (built.config.view !== 'analytics') throw new Error('Wrong view type');
  });

  await test('Dashboard export works', () => {
    const db = createAdminDashboard();
    const json = db.export('json');
    if (!json || json.length === 0) throw new Error('Export failed');
  });

  await test('Sync engine creates', () => {
    const sync = createSyncEngine({ autoConnect: false });
    if (!sync) throw new Error('Failed to create sync engine');
  });

  // ==================== PROFILE SYSTEM ====================
  printSection('Profile System');

  await test('Profile engine creates', () => {
    const engine = createProfileEngine();
    if (!engine) throw new Error('Failed to create profile engine');
  });

  await test('Profile engine accepts config', () => {
    const engine = createProfileEngine({ outputDir: './test-profiles' });
    // Just verify no error
  });

  // ==================== CACHE SYSTEM ====================
  printSection('Cache System');

  await test('Cloudflare cache stats accessible', () => {
    const stats = cachedCloudflare.getCacheStats();
    if (typeof stats.hitRate !== 'number') throw new Error('Invalid hit rate');
  });

  await test('Secret manager metrics accessible', () => {
    const metrics = optimizedSecretManager.getMetrics();
    if (typeof metrics.hitRate !== 'number') throw new Error('Invalid hit rate');
  });

  // ==================== CLI FRAMEWORK ====================
  printSection('CLI Framework');

  await test('CLI creates successfully', () => {
    const cli = createCLI({
      name: 'test',
      version: '1.0.0',
      description: 'Test CLI',
      commands: [],
    });
    if (!cli) throw new Error('Failed to create CLI');
  });

  await test('ProgressBar creates', () => {
    const bar = new ProgressBar(100, 'Test');
    if (!bar) throw new Error('Failed to create progress bar');
  });

  await test('Spinner creates', () => {
    const spinner = new Spinner('Test');
    if (!spinner) throw new Error('Failed to create spinner');
  });

  // ==================== SUMMARY ====================
  const suiteDuration = performance.now() - suiteStart;

  printHeader('SUITE COMPLETE');
  console.log();
  console.log(`  ${COLORS.green}✓ Passed:${COLORS.reset}  ${results.pass}`);
  console.log(`  ${COLORS.red}✗ Failed:${COLORS.reset}  ${results.fail}`);
  console.log(`  ${COLORS.orange}⊘ Skipped:${COLORS.reset} ${results.skipped}`);
  console.log();
  console.log(`  ${COLORS.dim}Duration: ${suiteDuration.toFixed(2)}ms${COLORS.reset}`);
  console.log();

  const total = results.pass + results.fail + results.skipped;
  const passRate = ((results.pass / total) * 100).toFixed(1);

  if (results.fail === 0) {
    console.log(
      `  ${COLORS.green}${COLORS.bright}✓ ALL TESTS PASSED (${passRate}%)${COLORS.reset}`
    );
  } else {
    console.log(`  ${COLORS.red}${COLORS.bright}✗ SOME TESTS FAILED (${passRate}%)${COLORS.reset}`);
  }
  console.log();

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});
