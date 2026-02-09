#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { generatePalette } from '../lib/utils/advanced-hsl-colors';
import { InstrumentedDomain } from './lib/instrumented-domain';
import type { BrandBenchReport, DomainScenarioMetrics, MetricSummary } from './lib/brand-bench-types';

type RunnerOptions = {
  full360: boolean;
  seeds: number[];
  iterations: number;
  warmup: number;
  outputDir: string;
  runId: string;
  sampleCount: number;
  quiet: boolean;
  profileFiles: string[];
  scenarioIterations: number;
};

function nowRunId(): string {
  return new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[pos] ?? 0;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function defaultSeeds(full360: boolean): number[] {
  if (full360) {
    return Array.from({ length: 360 }, (_, i) => i);
  }
  return Array.from({ length: 12 }, (_, i) => i * 30);
}

function parseIntArg(name: string, raw: string | undefined, fallback: number): number {
  const n = raw ? Number(raw) : fallback;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return Math.floor(n);
}

function parseArgs(argv: string[]): RunnerOptions {
  const isCi = Bun.env.CI === 'true' || Bun.env.CI === '1';
  const full360 = argv.includes('--full360');
  const seedArg = argv.find(a => a.startsWith('--seeds='))?.slice('--seeds='.length) || '';
  const seeds = seedArg
    ? seedArg.split(',').map(v => Number(v.trim())).filter(v => Number.isFinite(v) && v >= 0 && v <= 360)
    : defaultSeeds(full360);

  const iterations = parseIntArg('iterations', argv.find(a => a.startsWith('--iterations='))?.split('=')[1], isCi ? 1500 : 20000);
  const warmup = parseIntArg('warmup', argv.find(a => a.startsWith('--warmup='))?.split('=')[1], Math.max(100, Math.floor(iterations / 10)));
  const sampleCount = parseIntArg('sample-count', argv.find(a => a.startsWith('--sample-count='))?.split('=')[1], 256);
  const scenarioIterations = parseIntArg('scenario-iterations', argv.find(a => a.startsWith('--scenario-iterations='))?.split('=')[1], isCi ? 4 : 16);
  const outputDir = resolve(argv.find(a => a.startsWith('--output-dir='))?.split('=')[1] || 'reports/brand-bench');
  const runId = argv.find(a => a.startsWith('--run-id='))?.split('=')[1] || nowRunId();
  const quiet = argv.includes('--json-only') || argv.includes('--quiet');
  const profileFiles = (argv.find(a => a.startsWith('--profile-files='))?.split('=')[1] || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  return {
    full360,
    seeds,
    iterations,
    warmup,
    outputDir,
    runId,
    sampleCount,
    quiet,
    profileFiles,
    scenarioIterations,
  };
}

function metricFromSync(
  name: string,
  options: RunnerOptions,
  fn: (iteration: number) => void
): MetricSummary {
  for (let i = 0; i < options.warmup; i += 1) fn(i);

  const sampleEvery = Math.max(1, Math.floor(options.iterations / options.sampleCount));
  const samples: number[] = [];

  const startNs = Bun.nanoseconds();
  for (let i = 0; i < options.iterations; i += 1) {
    if (i % sampleEvery === 0) {
      const s = Bun.nanoseconds();
      fn(i);
      const e = Bun.nanoseconds();
      samples.push(Number(e - s) / 1e6);
    } else {
      fn(i);
    }
  }
  const endNs = Bun.nanoseconds();

  const totalMs = Number(endNs - startNs) / 1e6;
  const opsPerSec = options.iterations / (totalMs / 1000);
  const sorted = samples.sort((a, b) => a - b);

  const metric: MetricSummary = {
    iterations: options.iterations,
    warmup: options.warmup,
    totalMs: Number(totalMs.toFixed(3)),
    opsPerSec: Number(opsPerSec.toFixed(2)),
    p50Ms: Number(quantile(sorted, 0.5).toFixed(4)),
    p95Ms: Number(quantile(sorted, 0.95).toFixed(4)),
  };

  if (!options.quiet) {
    console.log(`${name}: ${metric.opsPerSec.toFixed(0)} ops/sec (p95=${metric.p95Ms.toFixed(4)}ms)`);
  }
  return metric;
}

async function metricFromAsync(
  name: string,
  options: RunnerOptions,
  iterations: number,
  warmup: number,
  fn: (iteration: number) => Promise<void>
): Promise<MetricSummary> {
  for (let i = 0; i < warmup; i += 1) await fn(i);

  const sampleEvery = Math.max(1, Math.floor(iterations / Math.max(8, Math.min(options.sampleCount, iterations))));
  const samples: number[] = [];

  const startNs = Bun.nanoseconds();
  for (let i = 0; i < iterations; i += 1) {
    if (i % sampleEvery === 0) {
      const s = Bun.nanoseconds();
      await fn(i);
      const e = Bun.nanoseconds();
      samples.push(Number(e - s) / 1e6);
    } else {
      await fn(i);
    }
  }
  const endNs = Bun.nanoseconds();

  const totalMs = Number(endNs - startNs) / 1e6;
  const opsPerSec = iterations / (totalMs / 1000);
  const sorted = samples.sort((a, b) => a - b);

  const metric: MetricSummary = {
    iterations,
    warmup,
    totalMs: Number(totalMs.toFixed(3)),
    opsPerSec: Number(opsPerSec.toFixed(2)),
    p50Ms: Number(quantile(sorted, 0.5).toFixed(4)),
    p95Ms: Number(quantile(sorted, 0.95).toFixed(4)),
  };

  if (!options.quiet) {
    console.log(`${name}: ${metric.opsPerSec.toFixed(0)} ops/sec (p95=${metric.p95Ms.toFixed(4)}ms)`);
  }
  return metric;
}

async function collectProfileFiles(options: RunnerOptions): Promise<string[]> {
  const profileDir = join(options.outputDir, 'profiles');
  const explicit = [...options.profileFiles];
  if (!existsSync(profileDir)) return explicit;

  const names = await readdir(profileDir);
  for (const name of names) {
    if (!name.endsWith('.cpuprofile')) continue;
    if (name.includes(options.runId) || name.startsWith('brand_seed_') || name.startsWith('brand_bench_')) {
      explicit.push(join(profileDir, name));
    }
  }
  return Array.from(new Set(explicit));
}

async function runDomainScenario(
  name: string,
  memory: number,
  tension: number,
  options: RunnerOptions
): Promise<DomainScenarioMetrics> {
  const scenario = new InstrumentedDomain({
    id: `${name}.factory-wager.com`,
    color: '#4fd1c5',
    config: { name, memory, tension },
    memory,
    tension,
  });

  const footprints: number[] = [];
  const withPerformanceMs = metricFromSync(`domain.${name}.withPerformance`, options, () => {
    const snap = scenario.withPerformance;
    footprints.push(snap.memoryFootprint);
  });

  const loadResourcesMs = await metricFromAsync(
    `domain.${name}.loadResources`,
    options,
    options.scenarioIterations,
    Math.min(2, options.scenarioIterations),
    async () => {
      await scenario.loadResources();
    }
  );

  return {
    withPerformanceMs,
    loadResourcesMs,
    avgMemoryFootprint: Number(mean(footprints).toFixed(2)),
  };
}

export async function runBrandBench(options: RunnerOptions): Promise<BrandBenchReport> {
  const markdownBySeed = options.seeds.map(seed => `# Brand ${seed}\n\nSeed=${seed}\n`);

  const operations: Record<string, MetricSummary> = {
    generatePalette: metricFromSync('brand.generatePalette', options, (i) => {
      const seed = options.seeds[i % options.seeds.length] || 210;
      generatePalette({ h: seed, s: 90, l: 60 });
    }),
    bunColorHex: metricFromSync('brand.Bun.color(hex)', options, (i) => {
      const seed = options.seeds[i % options.seeds.length] || 210;
      Bun.color(`hsl(${seed}, 90%, 60%)`, 'hex');
    }),
    bunColorAnsi: metricFromSync('brand.Bun.color(ansi)', options, (i) => {
      const seed = options.seeds[i % options.seeds.length] || 210;
      Bun.color(`hsl(${seed}, 90%, 60%)`, 'ansi');
    }),
    markdownRender: metricFromSync('brand.Bun.markdown.render', options, (i) => {
      Bun.markdown.render(markdownBySeed[i % markdownBySeed.length] || markdownBySeed[0] || '# Brand');
    }),
    markdownReact: metricFromSync('brand.Bun.markdown.react', options, (i) => {
      Bun.markdown.react(markdownBySeed[i % markdownBySeed.length] || markdownBySeed[0] || '# Brand');
    }),
  };

  const domainInstrumentation: Record<string, DomainScenarioMetrics> = {
    lowMemLowTension: await runDomainScenario('low-mem-low-tension', 128, 0.2, options),
    highMemLowTension: await runDomainScenario('high-mem-low-tension', 512, 0.2, options),
    lowMemHighTension: await runDomainScenario('low-mem-high-tension', 128, 0.9, options),
    highMemHighTension: await runDomainScenario('high-mem-high-tension', 512, 0.9, options),
  };

  const violations: BrandBenchReport['violations'] = [];
  const opValues = Object.values(operations);
  if (opValues.some(m => !Number.isFinite(m.opsPerSec) || m.opsPerSec <= 0)) {
    violations.push({
      metric: 'operations',
      kind: 'throughput_drop',
      severity: 'fail',
      baseline: 1,
      current: 0,
      deltaAbs: -1,
      deltaPct: -100,
      message: 'One or more operations reported non-positive throughput.',
    });
  }

  const status: BrandBenchReport['status'] = violations.some(v => v.severity === 'fail')
    ? 'fail'
    : violations.some(v => v.severity === 'warn')
      ? 'warn'
      : 'ok';

  const profileFiles = await collectProfileFiles(options);

  const report: BrandBenchReport = {
    runId: options.runId,
    createdAt: new Date().toISOString(),
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    seedSet: options.seeds,
    iterations: options.iterations,
    warmup: options.warmup,
    operations,
    domainInstrumentation,
    profileFiles,
    status,
    violations,
  };

  await mkdir(options.outputDir, { recursive: true });
  await mkdir(join(options.outputDir, 'profiles'), { recursive: true });
  const runPath = join(options.outputDir, `${options.runId}.json`);
  const latestPath = join(options.outputDir, 'latest.json');

  await writeFile(runPath, JSON.stringify(report, null, 2));
  await writeFile(latestPath, JSON.stringify(report, null, 2));

  if (!options.quiet) {
    console.log(`brand-bench report: ${runPath}`);
    console.log(`brand-bench latest: ${latestPath}`);
  }

  return report;
}

if (import.meta.main) {
  const options = parseArgs(process.argv.slice(2));
  const report = await runBrandBench(options);
  if (options.quiet) {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(report.status === 'fail' ? 1 : 0);
}
