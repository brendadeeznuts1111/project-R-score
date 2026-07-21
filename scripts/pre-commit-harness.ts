#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Pre-commit harness checks — staged root paths.
 * Parallelizes independent gates; auto-annotates Bun doc refs; records timings.
 */
import { HARNESS_FORMAT_GLOBS, HARNESS_PATHS } from '../config/eslint/harness/rollout.ts';
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/harness-gate-timing.json`;

type GateTiming = { name: string; ms: number; ok: boolean };

function isHarnessPath(file: string): boolean {
  const normalized = file.replace(/^\.\//, '');
  if (normalized.startsWith('projects/')) return false;
  if (!normalized.endsWith('.ts') && !normalized.endsWith('.tsx')) return false;
  if (/\.(test|spec|bench)\.ts$/.test(normalized)) return false;

  const prefixes = ['lib/', 'scripts/', 'packages/', 'server/', 'config/', 'tools/'];
  return prefixes.some(prefix => normalized.startsWith(prefix));
}

const DOC_MAP_SSOT = new Set([
  'AGENTS.md',
  'README.md',
  'STRUCTURE.md',
  '.custom-instructions.md',
  'docs/AGENTS.md',
  'docs/README.md',
  'docs/UNIFIED.md',
  'docs/WIRE_BOUNDARY.md',
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'docs/DEVELOPMENT-STANDARDS.md',
  'docs/IMPORT_BOUNDARIES.md',
  'docs/harness/README.md',
  'docs/harness/PROOF.md',
  'docs/harness/FEEDBACK.md',
  'docs/organization/VELOCITY_BASELINE.md',
  'docs/organization/BLOAT_SPEED_PASS.md',
  'lib/README.md',
  'lib/types/branded/README.md',
  'lib/docs/repo-docs.ts',
  'tools/doc-map-check.ts',
]);

function isDocMapPath(file: string): boolean {
  return DOC_MAP_SSOT.has(file.replace(/^\.\//, ''));
}

async function getStagedFiles(): Promise<string[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) return [];
  return out
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
}

async function runGate(name: string, cmd: string[], timings: GateTiming[]): Promise<number> {
  const t0 = performance.now();
  const proc = Bun.spawn(cmd, {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  timings.push({ name, ms: Math.round(performance.now() - t0), ok: code === 0 });
  return code;
}

async function writeTimings(timings: GateTiming[], full: boolean): Promise<void> {
  await ensureDir(`${repoRoot}/reports`);
  const payload = {
    generatedAt: new Date().toISOString(),
    full,
    totalMs: timings.reduce((s, t) => s + t.ms, 0),
    gates: timings,
  };
  await writeJson(TIMING_PATH, payload);
  console.info(`⏱  gate timings → reports/harness-gate-timing.json (${payload.totalMs}ms total)`);
}

async function main(): Promise<void> {
  const full = hasFlag('full');
  const timings: GateTiming[] = [];
  const staged = await getStagedFiles();
  const harnessFiles = staged.filter(isHarnessPath);
  const docMapFiles = staged.filter(isDocMapPath);

  if (docMapFiles.length > 0) {
    console.info(`🗺️  Doc map check (${docMapFiles.length} SSOT path(s) staged)...`);
    const code = await runGate('doc-map', ['bun', 'tools/doc-map-check.ts'], timings);
    if (code !== 0) {
      console.error(
        '❌ Doc map check failed — fix broken links / CANONICAL_* paths\n' +
          '   bun tools/doc-map-check.ts'
      );
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

  if (harnessFiles.length === 0) {
    if (docMapFiles.length > 0) {
      console.info('✅ Harness pre-commit checks passed (doc map only)');
    } else {
      console.info('✅ No staged harness TypeScript or doc-map SSOT files');
    }
    await writeTimings(timings, full);
    return;
  }

  console.info(`🔍 Harness lint (${harnessFiles.length} staged files)...`);
  const lintCode = await runGate(
    'eslint',
    [
      'bun',
      'eslint',
      '--config',
      'eslint.bun-native.config.ts',
      '--fix',
      '--max-warnings',
      '500',
      ...harnessFiles,
    ],
    timings
  );
  if (lintCode !== 0) {
    console.error('❌ Harness ESLint check failed');
    await writeTimings(timings, full);
    process.exit(1);
  }

  console.info('✨ Harness format...');
  const formatCode = await runGate(
    'prettier',
    ['bun', 'x', 'prettier', '--write', ...harnessFiles],
    timings
  );
  if (formatCode !== 0) {
    console.error('❌ Harness Prettier check failed');
    await writeTimings(timings, full);
    process.exit(1);
  }

  // Annotate-on-write then re-check (kills fail→annotate→re-stage loop).
  console.info('🔗 Doc refs (annotate-on-write)...');
  const absFiles = harnessFiles.map(f => `${repoRoot}/${f}`);
  await runGate(
    'doc-refs-annotate',
    ['bun', 'tools/bun-doc-refs.ts', 'annotate', '--write', ...absFiles],
    timings
  );
  const docCheck = await runGate(
    'doc-refs-check',
    ['bun', 'tools/bun-doc-refs.ts', 'check', ...absFiles],
    timings
  );
  if (docCheck !== 0) {
    console.error(
      '❌ Missing canonical Bun doc refs after annotate — resolve manually:\n' +
        '   bun tools/bun-doc-refs.ts suggest "<api>"'
    );
    await writeTimings(timings, full);
    process.exit(1);
  }

  console.info('🏷️  Brand manifest...');
  if (
    (await runGate('brand-manifest', ['bun', 'tools/brand-manifest.ts', '--check'], timings)) !== 0
  ) {
    console.error('❌ Stale brand-manifest.json — run: bun tools/brand-manifest.ts');
    await writeTimings(timings, full);
    process.exit(1);
  }

  // Parallel: brands staged ‖ brands smart (types only on --full)
  console.info(
    full
      ? '🏷️  Branded IDs (staged ‖ smart ‖ types)...'
      : '🏷️  Branded IDs (staged ‖ smart; types deferred)...'
  );

  const brandJobs: Array<Promise<GateTiming & { code: number }>> = [
    (async () => {
      const t0 = performance.now();
      const proc = Bun.spawn(['bun', 'tools/branded-id-check.ts', '--staged', '--strict'], {
        cwd: repoRoot,
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await proc.exited;
      return {
        name: 'brands-staged',
        ms: Math.round(performance.now() - t0),
        ok: code === 0,
        code,
      };
    })(),
    (async () => {
      const t0 = performance.now();
      const proc = Bun.spawn(['bun', 'tools/branded-id-check.ts', '--smart', '--strict'], {
        cwd: repoRoot,
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await proc.exited;
      return { name: 'brands-smart', ms: Math.round(performance.now() - t0), ok: code === 0, code };
    })(),
  ];

  if (full) {
    brandJobs.push(
      (async () => {
        const t0 = performance.now();
        const proc = Bun.spawn(['bun', 'run', 'check:brands:types'], {
          cwd: repoRoot,
          stdout: 'inherit',
          stderr: 'inherit',
        });
        const code = await proc.exited;
        return {
          name: 'brands-types',
          ms: Math.round(performance.now() - t0),
          ok: code === 0,
          code,
        };
      })()
    );
  }

  const brandResults = await Promise.all(brandJobs);
  for (const r of brandResults) timings.push({ name: r.name, ms: r.ms, ok: r.ok });

  const brandStaged = brandResults.find(r => r.name === 'brands-staged')?.code ?? 1;
  const brandSmart = brandResults.find(r => r.name === 'brands-smart')?.code ?? 1;
  const brandTypes = brandResults.find(r => r.name === 'brands-types')?.code ?? 0;

  if (brandStaged !== 0) {
    console.error(
      '❌ New unbranded domain ID (bare string) — use lib/types/branded.ts as*/try*/parse*'
    );
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (brandSmart !== 0) {
    console.error('❌ Actionable unbranded IDs — bun run check:brands');
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (brandTypes !== 0) {
    console.error('❌ Branded type assertions failed — tests/branded-types.test-d.ts');
    await writeTimings(timings, full);
    process.exit(1);
  }

  if (!full) {
    console.info('ℹ️  brand-types deferred (bun run check:brands:types or hook --full)');
  }

  console.info('✅ Harness pre-commit checks passed');
  await writeTimings(timings, full);
  void HARNESS_PATHS;
  void HARNESS_FORMAT_GLOBS;
}

if (import.meta.main) {
  await main();
}
