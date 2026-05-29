#!/usr/bin/env bun
// bench-dx-mcp.ts — Performance benchmark for dx-mcp.ts optimizations
// Compares consolidated walkStats, Bun.file().json(), and parallel rgSearch

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const PROJECT = join(ROOT, 'cascade-mover-v3');
const ITERATIONS = 10;

function hr() {
  console.log('-'.repeat(60));
}

function avg(arr: number[]): string {
  const sum = arr.reduce((a, b) => a + b, 0);
  return (sum / arr.length).toFixed(2);
}

// ── Benchmark 1: walkStats consolidation (3 walks vs 1) ───────
console.log('\nBenchmark 1: walkStats consolidation\n');

function oldCountFiles(dir: string): number {
  let n = 0;
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
      try {
        if (e.isDirectory()) n += oldCountFiles(join(dir, e.name));
        else n++;
      } catch {}
    }
  } catch {}
  return n;
}

function oldDirSize(dir: string): number {
  let total = 0;
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
      try {
        const s = statSync(join(dir, e.name));
        if (e.isFile()) total += s.size;
        else total += oldDirSize(join(dir, e.name));
      } catch {}
    }
  } catch {}
  return total;
}

function oldLastMod(dir: string): number {
  let latest = 0;
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
      try {
        const s = statSync(join(dir, e.name));
        if (s.mtimeMs > latest) latest = s.mtimeMs;
        if (e.isDirectory()) {
          const c = oldLastMod(join(dir, e.name));
          if (c > latest) latest = c;
        }
      } catch {}
    }
  } catch {}
  return latest;
}

function newWalkStats(dir: string): { fileCount: number; sizeKb: number; lastChanged: string } {
  let fileCount = 0;
  let totalSize = 0;
  let latestMtime = 0;
  const walk = (d: string) => {
    try {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
        const fp = join(d, e.name);
        if (e.isDirectory()) {
          walk(fp);
        } else {
          fileCount++;
          try {
            const s = statSync(fp);
            totalSize += s.size;
            if (s.mtimeMs > latestMtime) latestMtime = s.mtimeMs;
          } catch {}
        }
      }
    } catch {}
  };
  walk(dir);
  return {
    fileCount,
    sizeKb: Math.round(totalSize / 1024),
    lastChanged: latestMtime > 0 ? new Date(latestMtime).toISOString().slice(0, 10) : '—',
  };
}

// Old approach (3 walks)
let oldTimes: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  const fc = oldCountFiles(PROJECT);
  const sz = oldDirSize(PROJECT);
  const lm = oldLastMod(PROJECT);
  oldTimes.push(performance.now() - t0);
  if (i === 0) console.log('  old result:', fc, 'files,', Math.round(sz / 1024), 'KB');
}
console.log('  old avg:', avg(oldTimes), 'ms');

// New approach (1 walk)
let newTimes: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  const s = newWalkStats(PROJECT);
  newTimes.push(performance.now() - t0);
  if (i === 0) console.log('  new result:', s.fileCount, 'files,', s.sizeKb, 'KB');
}
console.log('  new avg:', avg(newTimes), 'ms');
console.log('  speedup:', (parseFloat(avg(oldTimes)) / parseFloat(avg(newTimes))).toFixed(2) + 'x');

hr();

// ── Benchmark 2: readFileSync+JSON.parse vs Bun.file().json() ──
console.log('Benchmark 2: package.json parsing\n');

const pkgPath = join(PROJECT, 'package.json');
let readTimes: number[] = [];
let bunTimes: number[] = [];

for (let i = 0; i < ITERATIONS; i++) {
  let t0 = performance.now();
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  readTimes.push(performance.now() - t0);

  t0 = performance.now();
  const pkg2 = await Bun.file(pkgPath).json();
  bunTimes.push(performance.now() - t0);
}
console.log('  readFileSync+JSON.parse avg:', avg(readTimes), 'ms');
console.log('  Bun.file().json() avg:       ', avg(bunTimes), 'ms');
console.log(
  '  speedup:                     ',
  (parseFloat(avg(readTimes)) / Math.max(0.001, parseFloat(avg(bunTimes)))).toFixed(2) + 'x'
);

hr();

// ── Benchmark 3: spawnSync vs Bun.spawnSync ────────────────────
console.log('Benchmark 3: subprocess spawning (git status)\n');

const GIT = Bun.which('git')!;
let nodeTimes: number[] = [];
let bunTimes2: number[] = [];

for (let i = 0; i < ITERATIONS; i++) {
  let t0 = performance.now();
  const r = spawnSync(GIT, ['-C', PROJECT, 'status', '--porcelain'], {
    timeout: 3000,
    encoding: 'utf-8',
  });
  nodeTimes.push(performance.now() - t0);

  t0 = performance.now();
  const p = Bun.spawnSync([GIT, '-C', PROJECT, 'status', '--porcelain'], { timeout: 3000 });
  bunTimes2.push(performance.now() - t0);
}
console.log('  spawnSync (node) avg:', avg(nodeTimes), 'ms');
console.log('  Bun.spawnSync avg:   ', avg(bunTimes2), 'ms');

hr();

// ── Benchmark 4: First call vs cached project scan ─────────────
console.log('Benchmark 4: project scan (first vs cached)\n');

// Import the actual dx-mcp scan function
// Since we can't easily import from dx-mcp.ts, simulate: run MCP tools and measure
console.log('  (measured via dx_timing tool — see tool timing output in MCP session)');

hr();

// ── Benchmark 5: rgSearch sequential vs parallel (simulate) ────
console.log('Benchmark 5: rg_search scope=all speed\n');
const rg = Bun.which('rg');
if (rg) {
  const dirs = ['.', 'scripts', 'lib'];
  const pattern = 'Bun.serve';

  // Sequential
  let seqTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    let all: { dir: string; count: number }[] = [];
    for (const d of dirs) {
      const proc = Bun.spawnSync([rg, '--no-heading', '-n', '--max-count', '10', pattern, d], {
        timeout: 5000,
      });
      all.push({ dir: d, count: proc.stdout.toString().trim().split('\n').filter(Boolean).length });
    }
    seqTimes.push(performance.now() - t0);
  }
  console.log('  sequential (3 dirs) avg:', avg(seqTimes), 'ms');

  // Parallel (Bun-native)
  let parTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const results = await Promise.all(
      dirs.map(async d => {
        const proc = Bun.spawn([rg, '--no-heading', '-n', '--max-count', '10', pattern, d], {
          timeout: 5000,
        });
        const output = await proc.stdout.text();
        const lines = output.trim().split('\n').filter(Boolean);
        return { dir: d, count: lines.length };
      })
    );
    parTimes.push(performance.now() - t0);
  }
  console.log('  parallel (3 dirs) avg:   ', avg(parTimes), 'ms');
  console.log(
    '  speedup:                 ',
    (parseFloat(avg(seqTimes)) / Math.max(0.001, parseFloat(avg(parTimes)))).toFixed(2) + 'x'
  );
}

hr();
console.log('\nBenchmark complete.\n');
