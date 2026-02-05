#!/usr/bin/env bun
// scripts/tension-quick.ts
// Quick tension field operations and one-liners

import { $ } from 'bun';

const command = process.argv[2];
const args = process.argv.slice(3);

async function runCommand() {
  switch (command) {
    case 'validate':
      await validateHeaders();
      break;

    case 'validate-errors':
      await validateErrors();
      break;

    case 'count-headers':
      await countHeaders();
      break;

    case 'show-headers':
      await showHeaders();
      break;

    case 'find-required':
      await findRequired();
      break;

    case 'watch':
      await startWatcher();
      break;

    case 'dev-server':
      await startDevServer();
      break;

    case 'compute':
      await computeTension(args[0]);
      break;

    case 'snapshot':
      await createSnapshot(args[0]);
      break;

    case 'find-anomalies':
      await findAnomalies();
      break;

    case 'count-inertia':
      await countInertia();
      break;

    case 'find-legacy':
      await findLegacy();
      break;

    case 'show-config':
      await showConfig();
      break;

    case 'benchmark':
      await benchmark(args[0]);
      break;

    case 'memory-snapshot':
      await memorySnapshot();
      break;

    case 'health-check':
      await healthCheck();
      break;

    case 'status':
      await statusCheck();
      break;

    default:
      console.log(`
🔥 Tension Field Quick Commands:

Validation:
  validate          - Validate all headers
  validate-errors   - Show only validation errors
  count-headers     - Count TENSION headers
  show-headers      - Show header overview
  find-required     - Find all REQUIRED rules

Development:
  watch             - Start live reload watcher
  dev-server        - Start dev server + open dashboard
  compute <game>    - Compute tension for game
  snapshot <game>   - Save tension snapshot
  find-anomalies    - Find all anomaly thresholds

Analysis:
  count-inertia     - Count inertia references
  find-legacy       - Find legacy code
  show-config       - Show propagation config
  benchmark <n>     - Run N propagations
  memory-snapshot   - Memory usage after propagation

System:
  health-check      - Quick project health
  status            - All-in-one status check

Usage: bun scripts/tension-quick.ts <command> [args]
      `);
  }
}

async function validateHeaders() {
  console.log('🔍 Validating headers...');
  await $`bun scripts/validate-headers.ts`.quiet();
}

async function validateErrors() {
  console.log('❌ Validation errors:');
  await $`bun scripts/validate-headers.ts 2>&1 | grep -i "❌"`.quiet();
}

async function countHeaders() {
  const result = await $`rg -c '\\[TENSION-[A-Z]+-' --type=ts`.text();
  console.log(`📊 Found ${result.trim().split('\n').reduce((a, b) => a + parseInt(b.split(':')[1] || '0'), 0)} TENSION headers`);
}

async function showHeaders() {
  await $`rg -o '\\[([A-Z]+)-.*?\\[([A-Z]+)\\]' --type=ts | sort | uniq -c`.quiet();
}

async function findRequired() {
  await $`rg -l '.*REQUIRED.*' | xargs rg -l 'TENSION' | sort`.quiet();
}

async function startWatcher() {
  console.log('👀 Starting tension watcher...');
  await $`bun scripts/watch-tension.ts`.quiet();
}

async function startDevServer() {
  console.log('🚀 Starting dev server...');
  const server = Bun.spawn(['bun', 'dev'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  // Wait a moment then open browser
  await Bun.sleep(1000);

  try {
    await $`open http://localhost:3000`.quiet();
  } catch {
    await $`xdg-open http://localhost:3000`.quiet();
  }

  await server.exited;
}

async function computeTension(game: string) {
  if (!game) {
    console.error('❌ Please provide a game identifier');
    return;
  }
  await $`bun src/tension-field/core.ts ${game}`.quiet();
}

async function createSnapshot(game: string) {
  if (!game) {
    console.error('❌ Please provide a game identifier');
    return;
  }
  const timestamp = Date.now();
  await $`bun src/tension-field/core.ts ${game} > tension-snapshots/snapshot-${timestamp}.json`.quiet();
  console.log(`📸 Snapshot saved: tension-snapshots/snapshot-${timestamp}.json`);
}

async function findAnomalies() {
  await $`rg -C 3 '0\\.9|boostThreshold|convergenceThreshold'`.quiet();
}

async function countInertia() {
  await $`rg -c inertia src/**/*.ts`.quiet();
}

async function findLegacy() {
  await $`rg -i 'legacy|bridge|compat' src/**/*.ts`.quiet();
}

async function showConfig() {
  console.log('⚙️ Current propagation config:');
  await $`bun -e 'console.log(await import("./src/graph-propagation/propagate.ts").then(m => m.globalTensionGraph.config))'`.quiet();
}

async function benchmark(count: string = '100') {
  const n = parseInt(count) || 100;
  console.log(`⚡ Running ${n} propagations...`);

  await $`bun -e 'console.time("prop"); Promise.all(Array(${n}).fill(0).map(()=>import("./src/graph-propagation/propagate.ts").then(m=>m.runFullGraphPropagation("demo")))).then(()=>console.timeEnd("prop"))'`.quiet();
}

async function memorySnapshot() {
  await $`bun -e 'await import("./src/graph-propagation/propagate.ts").then(async m=>{await m.runFullGraphPropagation("demo"); console.log(process.memoryUsage())})'`.quiet();
}

async function healthCheck() {
  console.log('🏥 Tension Field Health Check');
  console.log('==========================');

  try {
    await $`bun validate`.quiet();
    console.log('✅ Validation passed');
  } catch {
    console.log('❌ Validation failed');
  }

  const headerCount = await $`rg -c '\\[TENSION-[A-Z]+-' --type=ts`.text();
  console.log(`📊 Headers: ${headerCount.trim().split('\n').reduce((a, b) => a + parseInt(b.split(':')[1] || '0'), 0)}`);

  const version = await $`bun --version`.text();
  console.log(`🔧 Bun: ${version.trim()}`);

  console.log('🚀 Tension-god status: ACTIVE ✓');
}

async function statusCheck() {
  console.log('📊 All-in-one Status Check');
  console.log('========================');

  await healthCheck();
  console.log();

  console.log('📋 Recent TENSION files:');
  await $`rg -l '\\[TENSION-[A-Z]+-' | head -3`.quiet();
}

// Run the command
runCommand().catch(console.error);
