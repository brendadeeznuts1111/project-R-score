#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
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
  'docs/harness/FRESH-RERUN.md',
  'docs/harness/FEEDBACK.md',
  'docs/harness/AUTHORITY.md',
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

/** Worktree ≠ index for these paths (write tools rewrote without re-stage). */
async function filesWithUnstagedDiff(files: string[]): Promise<string[]> {
  if (files.length === 0) return [];
  const proc = Bun.spawn(['git', 'diff', '--name-only', '--', ...files], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
}

/**
 * ESLint --fix / Prettier --write / doc-refs annotate must not leave a
 * green commit with a dirty tree (amend thrash). Fail with re-stage repair.
 */
async function assertStagedMatchesWorktree(
  files: string[],
  timings: GateTiming[],
  full: boolean
): Promise<void> {
  const t0 = performance.now();
  const dirty = await filesWithUnstagedDiff(files);
  timings.push({
    name: 'staged-worktree',
    ms: Math.round(performance.now() - t0),
    ok: dirty.length === 0,
  });
  if (dirty.length === 0) return;
  console.error('');
  console.error('❌ Format/annotate rewrote staged files — commit would leave a dirty tree');
  console.error(
    '   invariant: index must match worktree for staged harness files after write tools'
  );
  console.error('   owner: scripts/pre-commit-harness.ts · docs/harness/FEEDBACK.md');
  console.error('   repair:');
  console.error(`     git add ${dirty.join(' ')}`);
  console.error('     # then re-run: git commit');
  await writeTimings(timings, full);
  process.exit(1);
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

  const projectsFiles = staged.filter(f => f.replace(/^\.\//, '').startsWith('projects/'));
  if (projectsFiles.length > 0) {
    console.info(`📦 Projects root contract (${projectsFiles.length} path(s) staged)...`);
    const code = await runGate('projects-roots', ['bun', 'run', 'projects:roots:check'], timings);
    if (code !== 0) {
      console.error(
        '❌ Product-leaf root contract failed — each leaf needs README.md + package.json\n' +
          '   bun run projects:roots:check'
      );
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

  const libFiles = staged.filter(f => f.replace(/^\.\//, '').startsWith('lib/'));
  if (libFiles.length > 0) {
    console.info(`📚 Lib domain indexes (${libFiles.length} path(s) staged)...`);
    const code = await runGate('lib-domains', ['bun', 'run', 'lib:domains:check'], timings);
    if (code !== 0) {
      console.error(
        '❌ Lib domain index contract failed — each lib/*/ needs README.md\n' +
          '   bun run lib:domains:check'
      );
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

  if (harnessFiles.length === 0) {
    if (docMapFiles.length > 0 || projectsFiles.length > 0 || libFiles.length > 0) {
      console.info('✅ Harness pre-commit checks passed (doc/projects/lib gates only)');
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
      '--cache',
      '--cache-location',
      `${repoRoot}/.cache/eslint-bun-native`,
      '--cache-strategy',
      'content',
      '--fix',
      '--max-warnings',
      '0',
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

  // Annotate-on-write — staged paths only (never defaultPaths fan-out).
  console.info('🔗 Doc refs (annotate-on-write, staged only)...');
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

  // Kill green-commit / dirty-tree / amend thrash (eslint --fix · prettier · annotate).
  await assertStagedMatchesWorktree(harnessFiles, timings, full);

  console.info('🏷️  Brand manifest...');
  if (
    (await runGate('brand-manifest', ['bun', 'tools/brand-manifest.ts', '--check'], timings)) !== 0
  ) {
    console.error('❌ Stale brand-manifest.json — run: bun tools/brand-manifest.ts');
    await writeTimings(timings, full);
    process.exit(1);
  }

  const libStaged = harnessFiles.some(f => f.replace(/^\.\//, '').startsWith('lib/'));
  const scriptsStaged = harnessFiles.some(f => f.replace(/^\.\//, '').startsWith('scripts/'));
  const toolsStaged = harnessFiles.some(f => f.replace(/^\.\//, '').startsWith('tools/'));

  // Parallel: brands staged ‖ brands smart ‖ path-bun ‖ bun-env (types only on --full)
  console.info(
    full
      ? '🏷️  Branded IDs + ratchets (staged ‖ smart ‖ types ‖ path-bun ‖ bun-env)...'
      : '🏷️  Branded IDs + ratchets (staged ‖ smart ‖ path-bun ‖ bun-env; types deferred)...'
  );

  async function spawnGate(name: string, cmd: string[]): Promise<GateTiming & { code: number }> {
    const t0 = performance.now();
    const proc = Bun.spawn(cmd, {
      cwd: repoRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const code = await proc.exited;
    return { name, ms: Math.round(performance.now() - t0), ok: code === 0, code };
  }

  const parallelJobs: Array<Promise<GateTiming & { code: number }>> = [
    spawnGate('brands-staged', ['bun', 'tools/branded-id-check.ts', '--staged', '--strict']),
    spawnGate('brands-smart', [
      'bun',
      'tools/branded-id-check.ts',
      '--smart',
      '--strict',
      '--quiet',
    ]),
  ];

  const brandedTypesStaged = staged.some(f => {
    const n = f.replace(/^\.\//, '');
    return (
      n === 'lib/types/branded.ts' ||
      n.startsWith('lib/types/branded/') ||
      n.includes('tests/branded-types') ||
      n.includes('tsconfig.branded')
    );
  });
  if (full || brandedTypesStaged) {
    parallelJobs.push(spawnGate('brands-types', ['bun', 'run', 'check:brands:types']));
  }
  if (libStaged || toolsStaged) {
    parallelJobs.push(spawnGate('path-bun', ['bun', 'scripts/check-path-bun.ts']));
  }
  if (libStaged || scriptsStaged) {
    parallelJobs.push(spawnGate('bun-env', ['bun', 'scripts/check-bun-env.ts']));
  }

  // Complexity floor on staged lib/harness sources (Bun.stdin path list — not npm pre*).
  const harnessComplexityStaged = staged.some(f => {
    const n = f.replace(/^\.\//, '');
    return (
      n.startsWith('lib/harness/') &&
      n.endsWith('.ts') &&
      !n.endsWith('.test.ts') &&
      !n.endsWith('.d.ts')
    );
  });
  if (harnessComplexityStaged) {
    parallelJobs.push(
      spawnGate('harness-complexity-staged', ['bun', 'run', 'check:harness-complexity:staged'])
    );
  }

  const parallelResults = await Promise.all(parallelJobs);
  for (const r of parallelResults) timings.push({ name: r.name, ms: r.ms, ok: r.ok });

  const brandStaged = parallelResults.find(r => r.name === 'brands-staged')?.code ?? 1;
  const brandSmart = parallelResults.find(r => r.name === 'brands-smart')?.code ?? 1;
  const brandTypes = parallelResults.find(r => r.name === 'brands-types')?.code ?? 0;
  const pathBun = parallelResults.find(r => r.name === 'path-bun')?.code ?? 0;
  const bunEnv = parallelResults.find(r => r.name === 'bun-env')?.code ?? 0;
  const complexityStaged =
    parallelResults.find(r => r.name === 'harness-complexity-staged')?.code ?? 0;

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
  if (pathBun !== 0) {
    console.error('❌ path/node:path in lib/|tools/ — use lib/path-bun (bun run check:path-bun)');
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (bunEnv !== 0) {
    console.error('❌ process.env in lib/|scripts/ — use Bun.env (bun run check:bun-env)');
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (complexityStaged !== 0) {
    console.error(
      '❌ harness complexity floor exceeded on staged files — bun run check:harness-complexity:staged\n' +
        '   prefer refactor; raise only via: bun run check:harness-complexity -- --update-baseline --yes'
    );
    await writeTimings(timings, full);
    process.exit(1);
  }

  if (!full && !brandedTypesStaged) {
    console.info(
      'ℹ️  brand-types deferred (bun run check:brands:types, hook --full, or stage lib/types/branded/**)'
    );
  }

  console.info('✅ Harness pre-commit checks passed');
  await writeTimings(timings, full);
  void HARNESS_PATHS;
  void HARNESS_FORMAT_GLOBS;
}

if (import.meta.main) {
  await main();
}
