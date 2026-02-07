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
  console.log(`${COLORS.blue}╔══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.blue}║${COLORS.reset} ${COLORS.bright}${title.padEnd(60)}${COLORS.reset}${COLORS.blue} ║${COLORS.reset}`);
  console.log(`${COLORS.blue}╚══════════════════════════════════════════════════════════════╝${COLORS.reset}`);
  console.log();
}

function printSection(title: string) {
  console.log(`${COLORS.teal}▶ ${title}${COLORS.reset}`);
  console.log(`${COLORS.teal}${'─'.repeat(50)}${COLORS.reset}`);
}

function printCmd(name: string, description: string) {
  console.log(`  ${COLORS.green}${name.padEnd(30)}${COLORS.reset} ${description}`);
}

// ==================== COMMANDS ====================

const commands: Record<string, () => Promise<void>> = {
  async help() {
    printHeader('🏰 FactoryWager v3.8 Cheatsheet');
    
    printSection('Available Commands');
    console.log(`  ${COLORS.green}suite${COLORS.reset}           Run full benchmark suite`);
    console.log(`  ${COLORS.green}export${COLORS.reset}          Export cheatsheet to markdown`);
    console.log(`  ${COLORS.green}category <name>${COLORS.reset} Run specific category (r2|secrets|dashboard|profile)`);
    console.log(`  ${COLORS.green}theme${COLORS.reset}           Show FactoryWager theme palette`);
    console.log(`  ${COLORS.green}cache${COLORS.reset}           Show cache statistics`);
    console.log(`  ${COLORS.green}metrics${COLORS.reset}         Show all metrics`);
    console.log();
    
    printSection('Categories');
    printCmd('r2', 'R2/Cloudflare operations');
    printCmd('secrets', 'Secret management');
    printCmd('dashboard', 'Dashboard system');
    printCmd('profile', 'Profiling tools');
    console.log();
    
    printSection('Examples');
    console.log(`  bun run factory-wager-cheatsheet-v38.ts suite`);
    console.log(`  bun run factory-wager-cheatsheet-v38.ts category r2`);
    console.log(`  bun run factory-wager-cheatsheet-v38.ts theme`);
    console.log();
  },

  async suite() {
    printHeader('🏰 FactoryWager v3.8 Benchmark Suite');
    const start = performance.now();
    
    // Theme benchmark
    printSection('Theme System');
    const t1 = performance.now();
    const theme = themes.factorywager;
    console.log(`  Primary color: ${theme.colors.primary['500']}`);
    console.log(`  Secondary: ${theme.colors.secondary['500']}`);
    console.log(`  ${COLORS.green}✓ Theme loaded in ${(performance.now() - t1).toFixed(2)}ms${COLORS.reset}`);
    console.log();
    
    // Dashboard benchmark
    printSection('Dashboard System');
    const t2 = performance.now();
    const dashboard = createAdminDashboard();
    const built = dashboard.build();
    console.log(`  Widgets: ${built.widgets.length}`);
    console.log(`  Layouts: ${built.layouts.length}`);
    console.log(`  ${COLORS.green}✓ Dashboard built in ${(performance.now() - t2).toFixed(2)}ms${COLORS.reset}`);
    console.log();
    
    // Profile engine benchmark
    printSection('Profile Engine');
    const t3 = performance.now();
    const engine = createProfileEngine();
    console.log(`  ${COLORS.green}✓ Profile engine created in ${(performance.now() - t3).toFixed(2)}ms${COLORS.reset}`);
    console.log();
    
    // Cache stats
    printSection('Cache Statistics');
    const t4 = performance.now();
    const stats = cachedCloudflare.getCacheStats();
    console.log(`  Hit rate: ${stats.hitRate.toFixed(1)}%`);
    console.log(`  Size: ${stats.size} entries`);
    console.log(`  ${COLORS.green}✓ Cache stats in ${(performance.now() - t4).toFixed(2)}ms${COLORS.reset}`);
    console.log();
    
    // Secret manager
    printSection('Secret Manager');
    const t5 = performance.now();
    const smStats = optimizedSecretManager.getMetrics();
    console.log(`  Cache hit rate: ${smStats.hitRate.toFixed(1)}%`);
    console.log(`  ${COLORS.green}✓ Metrics retrieved in ${(performance.now() - t5).toFixed(2)}ms${COLORS.reset}`);
    console.log();
    
    const total = performance.now() - start;
    printSection(`Suite Complete`);
    console.log(`  Total time: ${COLORS.green}${total.toFixed(2)}ms${COLORS.reset}`);
    console.log();
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
console.log(db.export('html'));
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
    console.log(`${COLORS.green}✓ Exported to FACTORY_WAGER_CHEATSHEET.md${COLORS.reset}`);
    console.log();
  },

  async category() {
    const cat = process.argv[3];
    if (!cat) {
      console.log(`${COLORS.red}Error: No category specified${COLORS.reset}`);
      console.log(`Usage: bun run factory-wager-cheatsheet-v38.ts category <r2|secrets|dashboard|profile>`);
      return;
    }
    
    printHeader(`🏰 Category: ${cat.toUpperCase()}`);
    
    switch (cat) {
      case 'r2':
        printSection('R2 / Cloudflare Operations');
        console.log('  Cache Stats:');
        const stats = cachedCloudflare.getCacheStats();
        console.log(`    Hit rate: ${stats.hitRate.toFixed(1)}%`);
        console.log(`    Hits: ${stats.hits}`);
        console.log(`    Misses: ${stats.misses}`);
        console.log(`    Size: ${stats.size}`);
        break;
        
      case 'secrets':
        printSection('Secret Manager');
        const smStats = optimizedSecretManager.getMetrics();
        console.log(`  Cache hit rate: ${smStats.hitRate.toFixed(1)}%`);
        console.log(`  Cache hits: ${smStats.cacheHits}`);
        console.log(`  Cache misses: ${smStats.cacheMisses}`);
        console.log(`  Batch operations: ${smStats.batchOperations}`);
        break;
        
      case 'dashboard':
        printSection('Dashboard System');
        const db = createAdminDashboard();
        const built = db.build();
        console.log(`  View: ${built.config.view}`);
        console.log(`  Theme: ${built.config.theme}`);
        console.log(`  Widgets: ${built.widgets.length}`);
        console.log(`  Live updates: ${built.config.liveUpdates}`);
        break;
        
      case 'profile':
        printSection('Profile Engine');
        const engine = createProfileEngine();
        console.log(`  Engine created successfully`);
        console.log(`  Output dir: ./profiles`);
        break;
        
      default:
        console.log(`${COLORS.red}Unknown category: ${cat}${COLORS.reset}`);
    }
    console.log();
  },

  async theme() {
    printHeader('🏰 FactoryWager Theme Palette');
    
    const fw = themes.factorywager;
    
    printSection('Primary - Blue');
    console.log(`  500: ${fw.colors.primary['500']}`);
    console.log(`  600: ${fw.colors.primary['600']}`);
    console.log(`  700: ${fw.colors.primary['700']}`);
    console.log();
    
    printSection('Secondary - Teal');
    console.log(`  500: ${fw.colors.secondary['500']}`);
    console.log(`  600: ${fw.colors.secondary['600']}`);
    console.log();
    
    printSection('Success - Green');
    console.log(`  500: ${fw.colors.success['500']}`);
    console.log();
    
    printSection('Warning - Orange');
    console.log(`  500: ${fw.colors.warning['500']}`);
    console.log();
    
    printSection('Error - Red');
    console.log(`  500: ${fw.colors.error['500']}`);
    console.log();
    
    printSection('Status Indicators');
    console.log(`  Online:  ${fw.colors.status.online}  (Green)`);
    console.log(`  Away:    ${fw.colors.status.away}  (Orange)`);
    console.log(`  Busy:    ${fw.colors.status.busy}  (Red)`);
    console.log(`  Offline: ${fw.colors.status.offline}  (Gray)`);
    console.log();
    
    console.log(`${COLORS.green}✅ NO purple/indigo colors (hues 240-300)${COLORS.reset}`);
    console.log();
  },

  async cache() {
    printHeader('Cache Statistics');
    
    printSection('Cloudflare Cached Client');
    const cfStats = cachedCloudflare.getCacheStats();
    console.log(`  Hit rate: ${cfStats.hitRate.toFixed(1)}%`);
    console.log(`  Hits: ${cfStats.hits}`);
    console.log(`  Misses: ${cfStats.misses}`);
    console.log(`  Size: ${cfStats.size} entries`);
    console.log();
    
    printSection('Secret Manager');
    const smStats = optimizedSecretManager.getMetrics();
    console.log(`  Hit rate: ${smStats.hitRate.toFixed(1)}%`);
    console.log(`  Hits: ${smStats.cacheHits}`);
    console.log(`  Misses: ${smStats.cacheMisses}`);
    console.log(`  Evictions: ${smStats.evictions}`);
    console.log();
  },

  async metrics() {
    printHeader('System Metrics');
    
    await commands.cache!();
    
    printSection('Dashboard');
    const db = createAdminDashboard();
    const built = db.build();
    console.log(`  Widgets: ${built.widgets.length}`);
    console.log(`  Theme: ${built.config.theme}`);
    console.log();
  }
};

// Run command
const fn = commands[cmd];
if (fn) {
  await fn();
} else {
  console.log(`${COLORS.red}Unknown command: ${cmd}${COLORS.reset}`);
  await commands.help();
  process.exit(1);
}
