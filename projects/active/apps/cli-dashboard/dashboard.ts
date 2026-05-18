#!/usr/bin/env bun
/**
 * CLI Dashboard - Interactive terminal dashboard
 * Demonstrates project isolation with Bun.main context
 */

// Entry guard - only allow direct execution
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { which, spawn } from "bun";

console.info(`
╔═══════════════════════════════════════════════════════════╗
║  CLI Dashboard Starting                                   ║
║  Entrypoint: ${Bun.main}${' '.repeat(Math.max(0, 80 - Bun.main.length))}║
║  Log Level: ${process.env.LOG_LEVEL || 'info'}${' '.repeat(Math.max(0, 40 - (process.env.LOG_LEVEL || 'info').length))}║
╚═══════════════════════════════════════════════════════════╝
`);

const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));

console.info(`Project Home: ${process.env.PROJECT_HOME || mainDir}`);
console.info(`BUN_PLATFORM_HOME: ${process.env.BUN_PLATFORM_HOME || 'Not set'}`);
console.info(`PROJECT_BIN: ${process.env.PROJECT_BIN || mainDir}/scripts`);
console.info('');

// Interactive dashboard components
interface DashboardComponent {
  name: string;
  update: () => Promise<string>;
}

// System info component
async function systemInfo(): Promise<string> {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  return `
┌─ System Info
│ Uptime: ${(uptime / 3600).toFixed(1)} hours
│ RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB
│ Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB
│ Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB
│ External: ${(mem.external / 1024 / 1024).toFixed(1)} MB
`;
}

// Project context component
async function projectContext(): Promise<string> {
  return `
┌─ Project Context
│ Entrypoint: ${Bun.main}
│ Main Dir: ${mainDir}
│ CWD: ${Bun.cwd}
│ Platform Home: ${process.env.BUN_PLATFORM_HOME || 'Not set'}
`;
}

// Process component
async function processInfo(): Promise<string> {
  return `
┌─ Process Info
│ PID: ${process.pid}
│ Platform: ${Bun.platform}
│ Arch: ${Bun.arch}
│ CPU Count: ${Bun.cpuCount()}
`;
}

// Available commands component
async function availableCommands(): Promise<string> {
  const commonBins = ['bun', 'node', 'npm', 'npx', 'git', 'bash'];
  const found: string[] = [];

  for (const bin of commonBins) {
    const path = which(bin, { cwd: mainDir });
    if (path) {
      found.push(`${bin}: ${path}`);
    }
  }

  return `
┌─ Available Commands
${found.length > 0 ? found.map(f => `│ ${f}`).join('\n') : '│ (none found)'}
`;
}

// Collect all components
const components: DashboardComponent[] = [
  { name: 'System', update: systemInfo },
  { name: 'Project', update: projectContext },
  { name: 'Process', update: processInfo },
  { name: 'Commands', update: availableCommands }
];

// Dashboard rendering loop
async function renderDashboard() {
  const debug = process.env.LOG_LEVEL === 'debug';

  console.clear();
  console.info(`
╔═══════════════════════════════════════════════════════════╗
║  CLI Dashboard - Live Updates                            ║
║  Entrypoint: ${Bun.main.split('/').pop()}${' '.repeat(Math.max(0, 45 - Bun.main.split('/').pop()!.length))}║
╚═══════════════════════════════════════════════════════════╝
`);

  for (const comp of components) {
    try {
      const output = await comp.update();
      console.info(output);
    } catch (err) {
      if (debug) {
        console.info(`│ [ERROR] ${comp.name}: ${err}`);
      } else {
        console.info(`│ [ERROR] ${comp.name}: (enable debug for details)`);
      }
    }
  }

  console.info(`
┌─ Quick Actions
│ Press Ctrl+C to exit
│ Run: bun tools/overseer-cli.ts cli-dashboard bun run dashboard --debug
`);
}

// Main loop with refresh
const refreshInterval = debug ? 1000 : 3000;
let running = true;

async function startDashboard() {
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.info('\n\n👋 Dashboard shutting down...');
    running = false;
    Bun.exit(0);
  });

  while (running) {
    await renderDashboard();
    await new Promise(resolve => setTimeout(resolve, refreshInterval));
  }
}

console.info('Starting dashboard (refresh:', refreshInterval, 'ms)...');
console.info('Press Ctrl+C to exit.\n');

// Start after brief delay
setTimeout(startDashboard, 500);