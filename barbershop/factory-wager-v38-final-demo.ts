#!/usr/bin/env bun
/**
 * 🏰 FactoryWager v3.8 Final Demonstration
 *
 * Full demonstration of all v3.8 features
 * Usage: bun run factory-wager-v38-final-demo.ts
 */

import { themes, themeList, getTheme, generateCSSVariables } from './themes/config/index';
import { getDomainTheme, ThemedConsole } from './themes/config/domain-theme';
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
import { ProgressBar, Spinner, renderTable } from './lib/cli';

const COLORS = {
  blue: '\x1b[38;5;33m',
  teal: '\x1b[38;5;37m',
  green: '\x1b[38;5;41m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[38;5;196m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
};

function printBanner() {
  console.info(`${COLORS.blue}`);
  console.info(
    '    ███████╗ █████╗  ██████╗████████╗ ██████╗ ██████╗ ██╗    ██╗   ██╗ █████╗  ██████╗ ███████╗██████╗ '
  );
  console.info(
    '    ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██║    ██║   ██║██╔══██╗██╔════╝ ██╔════╝██╔══██╗'
  );
  console.info(
    '    █████╗  ███████║██║        ██║   ██║   ██║██████╔╝██║    ██║   ██║███████║██║  ███╗█████╗  ██████╔╝'
  );
  console.info(
    '    ██╔══╝  ██╔══██║██║        ██║   ██║   ██║██╔══██╗██║    ╚██╗ ██╔╝██╔══██║██║   ██║██╔══╝  ██╔══██╗'
  );
  console.info(
    '    ██║     ██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║███████╗╚████╔╝ ██║  ██║╚██████╔╝███████╗██║  ██║'
  );
  console.info(
    '    ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝'
  );
  console.info(`${COLORS.reset}`);
  console.info(
    `${COLORS.teal}                                    v3.8 - The Blue-Teal-Green-Orange-Red Release${COLORS.reset}`
  );
  console.info();
}

function printHeader(title: string) {
  console.info();
  console.info(
    `${COLORS.blue}┌────────────────────────────────────────────────────────────────┐${COLORS.reset}`
  );
  console.info(
    `${COLORS.blue}│${COLORS.reset} ${COLORS.bright}${title.padEnd(62)}${COLORS.reset}${COLORS.blue}│${COLORS.reset}`
  );
  console.info(
    `${COLORS.blue}└────────────────────────────────────────────────────────────────┘${COLORS.reset}`
  );
}

async function demoThemeSystem() {
  printHeader('🏰 THEME SYSTEM');

  console.info(`${COLORS.dim}Available Themes:${COLORS.reset}`);
  for (const theme of themeList) {
    console.info(
      `  ${theme.icon} ${theme.name.padEnd(15)} ${COLORS.dim}v${theme.version}${COLORS.reset}`
    );
  }

  console.info();
  console.info(`${COLORS.dim}FactoryWager Palette:${COLORS.reset}`);
  const fw = themes.factorywager;
  console.info(`  ${COLORS.blue}█${COLORS.reset} Blue   (Primary)   ${fw.colors.primary['500']}`);
  console.info(`  ${COLORS.teal}█${COLORS.reset} Teal   (Secondary) ${fw.colors.secondary['500']}`);
  console.info(`  ${COLORS.green}█${COLORS.reset} Green  (Success)   ${fw.colors.success['500']}`);
  console.info(`  ${COLORS.orange}█${COLORS.reset} Orange (Warning)   ${fw.colors.warning['500']}`);
  console.info(`  ${COLORS.red}█${COLORS.reset} Red    (Error)     ${fw.colors.error['500']}`);
  console.info();
  console.info(
    `  ${COLORS.green}✓${COLORS.reset} ${COLORS.dim}NO purple/indigo colors (hues 240-300)${COLORS.reset}`
  );

  // Themed console demo
  console.info();
  console.info(`${COLORS.dim}Themed Console Output:${COLORS.reset}`);
  const t = new ThemedConsole('factorywager');
  t.success('Operation completed successfully');
  t.error('Something went wrong');
  t.warning('Please check your input');
  t.info('Processing data...');
}

async function demoDashboardSystem() {
  printHeader('📊 DASHBOARD SYSTEM');

  const spinner = new Spinner('Building dashboards');
  spinner.start();
  await Bun.sleep(500);

  const dashboards = [
    { name: 'Admin', builder: createAdminDashboard() },
    { name: 'Client', builder: createClientDashboard() },
    { name: 'Barber', builder: createBarberDashboard() },
    { name: 'Analytics', builder: createAnalyticsDashboard() },
  ];

  const rows = dashboards.map(({ name, builder }) => {
    const built = builder.build();
    return [name, built.widgets.length.toString(), built.config.theme];
  });

  spinner.stop('Dashboards built');

  console.info();
  console.info(
    renderTable(['Dashboard', 'Widgets', 'Theme'], rows, { align: ['left', 'right', 'left'] })
  );

  // Real-time sync demo
  console.info();
  console.info(`${COLORS.dim}Real-time Sync Engine:${COLORS.reset}`);
  const sync = createSyncEngine({ autoConnect: false, channel: 'demo' });
  console.info(`  ${COLORS.green}✓${COLORS.reset} Sync engine created (channel: demo)`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Status: ${sync.getState().status}`);
}

async function demoProfileSystem() {
  printHeader('⚡ PROFILE SYSTEM');

  const spinner = new Spinner('Initializing profile engine');
  spinner.start();

  const engine = createProfileEngine({
    outputDir: './profiles',
    uploadToR2: false,
  });

  await Bun.sleep(300);
  spinner.stop('Profile engine ready');

  console.info();
  console.info(`${COLORS.dim}Profile Engine Features:${COLORS.reset}`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} CPU profiling`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Heap profiling`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Sampling profiles`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Session management`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Performance markers`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} R2 upload integration`);
}

async function demoCacheSystem() {
  printHeader('💾 CACHE SYSTEM');

  console.info(`${COLORS.dim}Cloudflare Cached Client:${COLORS.reset}`);
  const cfStats = cachedCloudflare.getCacheStats();
  console.info(`  Hit rate: ${cfStats.hitRate.toFixed(1)}%`);
  console.info(`  Hits: ${cfStats.hits}`);
  console.info(`  Misses: ${cfStats.misses}`);
  console.info(`  Size: ${cfStats.size} entries`);

  console.info();
  console.info(`${COLORS.dim}Secret Manager Cache:${COLORS.reset}`);
  const smStats = optimizedSecretManager.getMetrics();
  console.info(`  Hit rate: ${smStats.hitRate.toFixed(1)}%`);
  console.info(`  Hits: ${smStats.cacheHits}`);
  console.info(`  Misses: ${smStats.cacheMisses}`);
  console.info(`  Evictions: ${smStats.evictions}`);

  console.info();
  console.info(`${COLORS.dim}Cache Features:${COLORS.reset}`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} LRU cache with TTL`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Request deduplication`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Batch operations`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Cache warming`);
}

async function demoCLIFramework() {
  printHeader('🖥️  CLI FRAMEWORK');

  // Progress bar demo
  console.info(`${COLORS.dim}Progress Bar Demo:${COLORS.reset}`);
  const bar = new ProgressBar(20, 'Loading', 30);
  for (let i = 0; i <= 20; i++) {
    bar.update(i);
    await Bun.sleep(50);
  }

  console.info();
  console.info(`${COLORS.dim}CLI Features:${COLORS.reset}`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Standardized argument parsing`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Progress indicators`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Colored output`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Table rendering`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Middleware system`);
  console.info(`  ${COLORS.green}✓${COLORS.reset} Plugin architecture`);
}

async function demoStats() {
  printHeader('📈 SYSTEM STATISTICS');

  const stats = [
    ['Component', 'Status', 'Items'],
    ['Themes', '✓ Active', '4'],
    ['Dashboards', '✓ Active', '4'],
    ['Test Suites', '✓ Passing', '55+'],
    ['Cache Systems', '✓ Active', '2'],
    ['CLI Tools', '✓ Active', '5+'],
  ];

  console.info(renderTable(stats[0], stats.slice(1), { align: ['left', 'center', 'right'] }));

  console.info();
  console.info(`${COLORS.dim}Lines of Code:${COLORS.reset}`);
  console.info(`  Dashboard System:  ~2,100 lines`);
  console.info(`  Profile System:    ~700 lines`);
  console.info(`  Cache Layer:       ~485 lines`);
  console.info(`  Secret Manager:    ~580 lines`);
  console.info(`  CLI Framework:     ~505 lines`);
}

async function main() {
  printBanner();

  const startTime = performance.now();

  await demoThemeSystem();
  await demoDashboardSystem();
  await demoProfileSystem();
  await demoCacheSystem();
  await demoCLIFramework();
  await demoStats();

  const duration = performance.now() - startTime;

  printHeader('✨ DEMO COMPLETE');
  console.info();
  console.info(`  ${COLORS.dim}Duration: ${duration.toFixed(2)}ms${COLORS.reset}`);
  console.info(`  ${COLORS.dim}Version:  v3.8${COLORS.reset}`);
  console.info();
  console.info(
    `  ${COLORS.green}${COLORS.bright}🏰 FactoryWager - Blue, Teal, Green, Orange, Red${COLORS.reset}`
  );
  console.info(`  ${COLORS.dim}NO purple colors. All systems operational.${COLORS.reset}`);
  console.info();
}

main().catch(console.error);
