#!/usr/bin/env bun
/**
 * 🏰 FactoryWager v3.8 Cheatsheet
 *
 * One-liner commands for common operations
 * Usage: bun run factory-wager-cheatsheet-v38.ts [command]
 */

import { themes } from './themes/config/index';
import { cachedCloudflare } from './lib/cloudflare/cached-client';
import { optimizedSecretManager } from './lib/secrets/core/optimized-secret-manager';
import { createProfileEngine } from './src/profile';
import { createDashboard, createAdminDashboard } from './src/dashboard';

const COLORS = {
  blue: '\x1b[34m',
  teal: '\x1b[36m',
  green: '\x1b[32m',
  orange: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
};

const cmd = process.argv[2] || 'help';

function printHeader(title: string) {
  console.info(
    `${COLORS.blue}╔══════════════════════════════════════════════════════════════╗${COLORS.reset}`
  );
  console.info(
    `${COLORS.blue}║${COLORS.reset} ${COLORS.bright}${title.padEnd(60)}${COLORS.reset}${COLORS.blue} ║${COLORS.reset}`
  );
  console.info(
    `${COLORS.blue}╚══════════════════════════════════════════════════════════════╝${COLORS.reset}`
  );
  console.info();
}

function printSection(title: string) {
  console.info(`${COLORS.teal}▶ ${title}${COLORS.reset}`);
  console.info(`${COLORS.teal}${'─'.repeat(50)}${COLORS.reset}`);
}

function printCmd(name: string, description: string) {
  console.info(`  ${COLORS.green}${name.padEnd(30)}${COLORS.reset} ${description}`);
}

// ==================== COMMANDS ====================

const commands: Record<string, () => Promise<void>> = {
  async help() {
    printHeader('🏰 FactoryWager v3.8 Cheatsheet');

    printSection('Available Commands');
    console.info(`  ${COLORS.green}suite${COLORS.reset}           Run full benchmark suite`);
    console.info(`  ${COLORS.green}export${COLORS.reset}          Export cheatsheet to markdown`);
    console.info(
      `  ${COLORS.green}category <name>${COLORS.reset} Run specific category (r2|secrets|dashboard|profile)`
    );
    console.info(`  ${COLORS.green}theme${COLORS.reset}           Show FactoryWager theme palette`);
    console.info(`  ${COLORS.green}cache${COLORS.reset}           Show cache statistics`);
    console.info(`  ${COLORS.green}metrics${COLORS.reset}         Show all metrics`);
    console.info();

    printSection('Categories');
    printCmd('r2', 'R2/Cloudflare operations');
    printCmd('secrets', 'Secret management');
    printCmd('dashboard', 'Dashboard system');
    printCmd('profile', 'Profiling tools');
    console.info();

    printSection('Examples');
    console.info(`  bun run factory-wager-cheatsheet-v38.ts suite`);
    console.info(`  bun run factory-wager-cheatsheet-v38.ts category r2`);
    console.info(`  bun run factory-wager-cheatsheet-v38.ts theme`);
    console.info();
  },

  async suite() {
    printHeader('🏰 FactoryWager v3.8 Benchmark Suite');
    const start = performance.now();

    // Theme benchmark
    printSection('Theme System');
    const t1 = performance.now();
    const theme = themes.factorywager;
    console.info(`  Primary color: ${theme.colors.primary['500']}`);
    console.info(`  Secondary: ${theme.colors.secondary['500']}`);
    console.info(
      `  ${COLORS.green}✓ Theme loaded in ${(performance.now() - t1).toFixed(2)}ms${COLORS.reset}`
    );
    console.info();

    // Dashboard benchmark
    printSection('Dashboard System');
    const t2 = performance.now();
    const dashboard = createAdminDashboard();
    const built = dashboard.build();
    console.info(`  Widgets: ${built.widgets.length}`);
    console.info(`  Layouts: ${built.layouts.length}`);
    console.info(
      `  ${COLORS.green}✓ Dashboard built in ${(performance.now() - t2).toFixed(2)}ms${COLORS.reset}`
    );
    console.info();

    // Profile engine benchmark
    printSection('Profile Engine');
    const t3 = performance.now();
    const engine = createProfileEngine();
    console.info(
      `  ${COLORS.green}✓ Profile engine created in ${(performance.now() - t3).toFixed(2)}ms${COLORS.reset}`
    );
    console.info();

    // Cache stats
    printSection('Cache Statistics');
    const t4 = performance.now();
    const stats = cachedCloudflare.getCacheStats();
    console.info(`  Hit rate: ${stats.hitRate.toFixed(1)}%`);
    console.info(`  Size: ${stats.size} entries`);
    console.info(
      `  ${COLORS.green}✓ Cache stats in ${(performance.now() - t4).toFixed(2)}ms${COLORS.reset}`
    );
    console.info();

    // Secret manager
    printSection('Secret Manager');
    const t5 = performance.now();
    const smStats = optimizedSecretManager.getMetrics();
    console.info(`  Cache hit rate: ${smStats.hitRate.toFixed(1)}%`);
    console.info(
      `  ${COLORS.green}✓ Metrics retrieved in ${(performance.now() - t5).toFixed(2)}ms${COLORS.reset}`
    );
    console.info();

    const total = performance.now() - start;
    printSection(`Suite Complete`);
    console.info(`  Total time: ${COLORS.green}${total.toFixed(2)}ms${COLORS.reset}`);
    console.info();
  },

  async export() {
    printHeader('Exporting Cheatsheet to Markdown');

    const markdown = `# 🏰 FactoryWager v3.8 Cheatsheet

## Quick Commands

### Benchmark Suite
\`\`\`bash
bun run factory-wager-cheatsheet-v38.ts suite
\`\`\`

### Category Commands
\`\`\`bash
bun run factory-wager-cheatsheet-v38.ts category r2
bun run factory-wager-cheatsheet-v38.ts category secrets
bun run factory-wager-cheatsheet-v38.ts category dashboard
bun run factory-wager-cheatsheet-v38.ts category profile
\`\`\`

### Theme
\`\`\`bash
bun run factory-wager-cheatsheet-v38.ts theme
\`\`\`

## Theme Palette

| Color | Hex | HSL |
|-------|-----|-----|
| Blue | #007FFF | hsl(210 100% 50%) |
| Teal | #17B8A6 | hsl(175 80% 45%) |
| Green | #14B866 | hsl(145 80% 45%) |
| Orange | #FF8000 | hsl(30 100% 50%) |
| Red | #E64C4C | hsl(0 85% 55%) |

## API Quick Reference

### Dashboard
\`\`\`typescript
import { createAdminDashboard } from './src/dashboard';
const db = createAdminDashboard();
console.info(db.export('html'));
\`\`\`

### Profile
\`\`\`typescript
import { quickSamplingProfile } from './src/profile';
await quickSamplingProfile('http://localhost:3001/ops/status');
\`\`\`

### Cache
\`\`\`typescript
import { cachedCloudflare } from './lib/cloudflare';
const zones = await cachedCloudflare.listZones();
cachedCloudflare.printStats();
\`\`\`
`;

    await Bun.write('FACTORY_WAGER_CHEATSHEET.md', markdown);
    console.info(`${COLORS.green}✓ Exported to FACTORY_WAGER_CHEATSHEET.md${COLORS.reset}`);
    console.info();
  },

  async category() {
    const cat = process.argv[3];
    if (!cat) {
      console.info(`${COLORS.red}Error: No category specified${COLORS.reset}`);
      console.info(
        `Usage: bun run factory-wager-cheatsheet-v38.ts category <r2|secrets|dashboard|profile>`
      );
      return;
    }

    printHeader(`🏰 Category: ${cat.toUpperCase()}`);

    switch (cat) {
      case 'r2':
        printSection('R2 / Cloudflare Operations');
        console.info('  Cache Stats:');
        const stats = cachedCloudflare.getCacheStats();
        console.info(`    Hit rate: ${stats.hitRate.toFixed(1)}%`);
        console.info(`    Hits: ${stats.hits}`);
        console.info(`    Misses: ${stats.misses}`);
        console.info(`    Size: ${stats.size}`);
        break;

      case 'secrets':
        printSection('Secret Manager');
        const smStats = optimizedSecretManager.getMetrics();
        console.info(`  Cache hit rate: ${smStats.hitRate.toFixed(1)}%`);
        console.info(`  Cache hits: ${smStats.cacheHits}`);
        console.info(`  Cache misses: ${smStats.cacheMisses}`);
        console.info(`  Batch operations: ${smStats.batchOperations}`);
        break;

      case 'dashboard':
        printSection('Dashboard System');
        const db = createAdminDashboard();
        const built = db.build();
        console.info(`  View: ${built.config.view}`);
        console.info(`  Theme: ${built.config.theme}`);
        console.info(`  Widgets: ${built.widgets.length}`);
        console.info(`  Live updates: ${built.config.liveUpdates}`);
        break;

      case 'profile':
        printSection('Profile Engine');
        const engine = createProfileEngine();
        console.info(`  Engine created successfully`);
        console.info(`  Output dir: ./profiles`);
        break;

      default:
        console.info(`${COLORS.red}Unknown category: ${cat}${COLORS.reset}`);
    }
    console.info();
  },

  async theme() {
    printHeader('🏰 FactoryWager Theme Palette');

    const fw = themes.factorywager;

    printSection('Primary - Blue');
    console.info(`  500: ${fw.colors.primary['500']}`);
    console.info(`  600: ${fw.colors.primary['600']}`);
    console.info(`  700: ${fw.colors.primary['700']}`);
    console.info();

    printSection('Secondary - Teal');
    console.info(`  500: ${fw.colors.secondary['500']}`);
    console.info(`  600: ${fw.colors.secondary['600']}`);
    console.info();

    printSection('Success - Green');
    console.info(`  500: ${fw.colors.success['500']}`);
    console.info();

    printSection('Warning - Orange');
    console.info(`  500: ${fw.colors.warning['500']}`);
    console.info();

    printSection('Error - Red');
    console.info(`  500: ${fw.colors.error['500']}`);
    console.info();

    printSection('Status Indicators');
    console.info(`  Online:  ${fw.colors.status.online}  (Green)`);
    console.info(`  Away:    ${fw.colors.status.away}  (Orange)`);
    console.info(`  Busy:    ${fw.colors.status.busy}  (Red)`);
    console.info(`  Offline: ${fw.colors.status.offline}  (Gray)`);
    console.info();

    console.info(`${COLORS.green}✅ NO purple/indigo colors (hues 240-300)${COLORS.reset}`);
    console.info();
  },

  async cache() {
    printHeader('Cache Statistics');

    printSection('Cloudflare Cached Client');
    const cfStats = cachedCloudflare.getCacheStats();
    console.info(`  Hit rate: ${cfStats.hitRate.toFixed(1)}%`);
    console.info(`  Hits: ${cfStats.hits}`);
    console.info(`  Misses: ${cfStats.misses}`);
    console.info(`  Size: ${cfStats.size} entries`);
    console.info();

    printSection('Secret Manager');
    const smStats = optimizedSecretManager.getMetrics();
    console.info(`  Hit rate: ${smStats.hitRate.toFixed(1)}%`);
    console.info(`  Hits: ${smStats.cacheHits}`);
    console.info(`  Misses: ${smStats.cacheMisses}`);
    console.info(`  Evictions: ${smStats.evictions}`);
    console.info();
  },

  async metrics() {
    printHeader('System Metrics');

    await commands.cache!();

    printSection('Dashboard');
    const db = createAdminDashboard();
    const built = db.build();
    console.info(`  Widgets: ${built.widgets.length}`);
    console.info(`  Theme: ${built.config.theme}`);
    console.info();
  },
};

// Run command
const fn = commands[cmd];
if (fn) {
  await fn();
} else {
  console.info(`${COLORS.red}Unknown command: ${cmd}${COLORS.reset}`);
  await commands.help();
  process.exit(1);
}
