#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Pre-commit harness checks — staged root paths.
 * Parallelizes independent gates; auto-annotates Bun doc refs; records timings.
 */
import { buildHarnessEslintArgs } from '../config/eslint/harness/command.ts';
import { isHarnessFormatPath, isHarnessLintPath } from '../config/eslint/harness/rollout.ts';
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/harness-gate-timing.json`;

type GateTiming = { name: string; ms: number; ok: boolean };

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

/** Pages static plane — portal/registry/monitoring shells. */
function isPublicPlanePath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  return (
    n.startsWith('public/portal/') ||
    n.startsWith('public/registry/') ||
    n.startsWith('public/monitoring/') ||
    n === 'public/index.html' ||
    n === 'public/_redirects' ||
    n === 'public/_headers'
  );
}

/** Runtime flags catalog SSOT — keep JSON valid and in sync with live bun --help. */
function isRuntimeFlagsPath(file: string): boolean {
  return file.replace(/^\.\//, '') === 'config/runtime-flags.json';
}

/**
 * Machine/project bunfig policy surface — fast offline doctor --group bunfig only.
 * Escape: SKIP_DOCTOR_BUNFIG=1
 */
export function isDoctorBunfigPath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  return (
    n === 'bunfig.toml' ||
    n === 'config/machine.bunfig.toml.template' ||
    n === 'scripts/ensure-machine-bunfig.ts' ||
    n === 'scripts/lib/machine-bunfig.ts' ||
    n === 'tools/lib/portal-cli-doctor-bunfig.ts'
  );
}

/**
 * Doctor-state bake surface — portable fingerprint only (no full doctor suite).
 * Escape: SKIP_DOCTOR_STATE_CHECK=1
 */
export function isDoctorStatePath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  return n === 'public/registry/doctor-state.json' || n === 'tools/bake-doctor.ts';
}

/**
 * TypeScript 6+ types discovery — monorepo-owned tsconfigs / audit tool.
 * Escape: SKIP_TSCONFIG_TYPES=1
 */
export function isTsconfigTypesPath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  if (n === 'tools/tsconfig-types-audit.ts') return true;
  if (n === 'tsconfig.base.json' || n === 'tsconfig.bun.json') return true;
  if (n === 'tsconfig.check.json' || n === 'tsconfig.lint.json') return true;
  if (n === 'tools/tsconfig.json') return true;
  if (n.startsWith('packages/') && n.endsWith('/tsconfig.json')) return true;
  if (n.startsWith('tests/tsconfig.') && n.endsWith('.json')) return true;
  return false;
}

/** Audit findings/concepts SSOT — verify even when no harness .ts is staged. */
export function isAuditSsotPath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  return (
    n.startsWith('tools/audit-findings/') ||
    n.startsWith('tools/audit-concepts/') ||
    n.startsWith('tools/audit-evidence/') ||
    n.startsWith('lib/audit/') ||
    n.startsWith('docs/audit/') ||
    n === 'tools/audit-catalog.ts' ||
    n === 'tools/audit-catalog.json' ||
    n === 'tools/audit-emit-stub.ts' ||
    n === 'tools/audit-migrate-to-sha3.ts' ||
    n === 'tests/audit-catalog.test.ts' ||
    n === 'lib/types/branded/audit.ts' ||
    n === 'tools/bun-doc-refs.ts' ||
    n === 'tools/bun-docs-curated.ts'
  );
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
  const harnessFiles = staged.filter(isHarnessLintPath);
  /** Lint scope ∪ tests / *.test.ts — Prettier only (ESLint stays on harnessFiles). */
  const formatFiles = staged.filter(isHarnessFormatPath);
  const docMapFiles = staged.filter(isDocMapPath);

  async function runPrettierWrite(files: string[]): Promise<void> {
    if (files.length === 0) return;
    console.info(`✨ Harness format (${files.length} staged file(s))...`);
    const formatCode = await runGate(
      'prettier',
      ['bun', 'x', 'prettier', '--write', ...files],
      timings
    );
    if (formatCode !== 0) {
      console.error('❌ Harness Prettier check failed');
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

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

  const auditFiles = staged.filter(isAuditSsotPath);
  if (auditFiles.length > 0) {
    console.info(`🧾 Audit catalog verify (${auditFiles.length} path(s) staged)...`);
    const code = await runGate('audit-verify', ['bun', 'run', 'audit:verify'], timings);
    if (code !== 0) {
      console.error(
        '❌ Audit catalog verify failed — evidence/graph/relatedDocs/catalog parity\n' +
          '   bun run audit:verify\n' +
          '   bun run audit:catalog:build'
      );
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

  const publicFiles = staged.filter(isPublicPlanePath);
  if (publicFiles.length > 0) {
    console.info(`🌐 Public plane discovery (${publicFiles.length} path(s) staged)...`);
    const code = await runGate('public-discover', ['bun', 'run', 'public:discover:check'], timings);
    if (code !== 0) {
      console.error(
        '❌ Public plane discovery failed — broken registry ref or portal anti-pattern\n' +
          '   bun run public:discover:check\n' +
          '   bun run verify:portal:static\n' +
          '   docs/harness/tenants/public-plane.md'
      );
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

  const runtimeFlagsFiles = staged.filter(isRuntimeFlagsPath);
  if (runtimeFlagsFiles.length > 0) {
    console.info(`🚩 Runtime flags catalog (${runtimeFlagsFiles.length} path(s) staged)...`);
    const code = await runGate('runtime-flags', ['bun', 'run', 'portal:flags:check'], timings);
    if (code !== 0) {
      console.error(
        '❌ Runtime flags catalog failed — fix schema/shortcode/help or bun --help parity\n' +
          '   bun run portal:flags:check'
      );
      await writeTimings(timings, full);
      process.exit(1);
    }
  }

  // Bunfig policy surface — offline doctor group only (no full doctor / no Access network).
  const doctorBunfigFiles = staged.filter(isDoctorBunfigPath);
  if (doctorBunfigFiles.length > 0) {
    if (Bun.env.SKIP_DOCTOR_BUNFIG === '1') {
      console.info('⏭️  SKIP_DOCTOR_BUNFIG=1 — portal doctor bunfig group skipped');
    } else {
      console.info(`🩺 Portal doctor bunfig (${doctorBunfigFiles.length} path(s) staged)...`);
      const code = await runGate(
        'doctor-bunfig',
        ['bun', 'run', 'portal:doctor:bunfig:check'],
        timings
      );
      if (code !== 0) {
        console.error(
          '❌ Portal doctor bunfig failed — machine/project install policy surface\n' +
            '   bun run portal:doctor:bunfig:check\n' +
            '   escape: SKIP_DOCTOR_BUNFIG=1\n' +
            '   docs/harness/tenants/portal-doctor.md'
        );
        await writeTimings(timings, full);
        process.exit(1);
      }
    }
  }

  // Doctor-state bake surface — portable fingerprint (ensure machine bunfig + check).
  const doctorStateFiles = staged.filter(isDoctorStatePath);
  if (doctorStateFiles.length > 0) {
    if (Bun.env.SKIP_DOCTOR_STATE_CHECK === '1') {
      console.info('⏭️  SKIP_DOCTOR_STATE_CHECK=1 — doctor-state fingerprint skipped');
    } else {
      console.info(`🩺 Doctor-state fingerprint (${doctorStateFiles.length} path(s) staged)...`);
      const code = await runGate('doctor-state', ['bun', 'run', 'bake:doctor:check'], timings);
      if (code !== 0) {
        console.error(
          '❌ Doctor-state fingerprint failed — re-bake or fix portable groups\n' +
            '   bun run bake:doctor\n' +
            '   bun run bake:doctor:check\n' +
            '   escape: SKIP_DOCTOR_STATE_CHECK=1\n' +
            '   docs/harness/tenants/portal-doctor.md'
        );
        await writeTimings(timings, full);
        process.exit(1);
      }
    }
  }

  // TypeScript 6+ types allowlist — monorepo-owned configs must resolve "bun" (or emit-clean).
  const tsconfigTypesFiles = staged.filter(isTsconfigTypesPath);
  if (tsconfigTypesFiles.length > 0) {
    if (Bun.env.SKIP_TSCONFIG_TYPES === '1') {
      console.info('⏭️  SKIP_TSCONFIG_TYPES=1 — tsconfig types audit skipped');
    } else {
      console.info(`📘 TS6 types audit (${tsconfigTypesFiles.length} path(s) staged)...`);
      const code = await runGate(
        'tsconfig-types',
        ['bun', 'run', 'check:tsconfig-types', '--', '--strict'],
        timings
      );
      if (code !== 0) {
        console.error(
          '❌ TS6 types audit failed — monorepo-owned tsconfigs must resolve "types": ["bun"]\n' +
            '   bun run check:tsconfig-types -- --strict\n' +
            '   escape: SKIP_TSCONFIG_TYPES=1\n' +
            '   https://bun.com/docs/typescript-6 · docs/harness/tenants/monorepo-workspaces.md'
        );
        await writeTimings(timings, full);
        process.exit(1);
      }
    }
  }

  if (harnessFiles.length === 0) {
    // Tests / *.test.ts are outside ESLint scope but still get Prettier.
    if (formatFiles.length > 0) {
      await runPrettierWrite(formatFiles);
      await assertStagedMatchesWorktree(formatFiles, timings, full);
    }
    if (
      docMapFiles.length > 0 ||
      projectsFiles.length > 0 ||
      libFiles.length > 0 ||
      auditFiles.length > 0 ||
      publicFiles.length > 0 ||
      runtimeFlagsFiles.length > 0 ||
      doctorBunfigFiles.length > 0 ||
      doctorStateFiles.length > 0 ||
      tsconfigTypesFiles.length > 0 ||
      formatFiles.length > 0
    ) {
      console.info(
        '✅ Harness pre-commit checks passed (doc/projects/lib/audit/public/flags/bunfig/doctor-state/tsconfig-types/format gates only)'
      );
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
      ...buildHarnessEslintArgs({
        cacheLocation: `${repoRoot}/.cache/eslint-bun-native`,
        files: harnessFiles,
        fix: true,
        maxWarnings: 0,
      }),
    ],
    timings
  );
  if (lintCode !== 0) {
    console.error('❌ Harness ESLint check failed');
    await writeTimings(timings, full);
    process.exit(1);
  }

  await runPrettierWrite(formatFiles);

  // Annotate-on-write — staged lint paths only (never defaultPaths fan-out; skip tests).
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
  await assertStagedMatchesWorktree(formatFiles, timings, full);

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
  const npmInstallStaged = staged.some(f => {
    const n = f.replace(/^\.\//, '');
    return (
      n === 'package.json' ||
      n === '.npmrc' ||
      n === 'bunfig.toml' ||
      n.startsWith('.github/workflows/') ||
      n.startsWith('scripts/') ||
      n.startsWith('tools/') ||
      n.startsWith('lib/')
    );
  });

  // Parallel: staged adoption + committed-tree adoption + catalog collision proof.
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
    spawnGate('brands-catalog', ['bun', 'test', 'tests/branded-catalog.test.ts']),
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
    parallelJobs.push(spawnGate('import-graph', ['bun', 'scripts/check-import-graph.ts']));
  }
  // Tier-A package gate always runs (sole successor to check-banned-wrappers).
  parallelJobs.push(spawnGate('bun-deps-tier-a', ['bun', 'scripts/check-bun-deps-tier-a.ts']));
  if (libStaged || scriptsStaged || toolsStaged) {
    parallelJobs.push(spawnGate('oxlint-ratchet', ['bun', 'scripts/check-oxlint-ratchet.ts']));
    parallelJobs.push(
      spawnGate('console-format-staged', ['bun', 'scripts/lint-console-format.ts', '--staged'])
    );
    parallelJobs.push(
      spawnGate('console-format-ratchet', ['bun', 'scripts/lint-console-format.ts'])
    );
  }
  if (npmInstallStaged) {
    parallelJobs.push(spawnGate('npm-install', ['bun', 'run', 'check:npm-install']));
    parallelJobs.push(spawnGate('bun-pm-cache', ['bun', 'run', 'check:bun-pm-cache']));
  }

  // Monorepo-health formula/UI/history — unit tests only (full ratchet lives in ci:core).
  const monorepoHealthStaged = staged.some(f => {
    const n = f.replace(/^\.\//, '');
    return (
      n === 'tools/monorepo-health.ts' ||
      n === 'scripts/check-monorepo-health.ts' ||
      n === 'scripts/monorepo-health-baseline.json' ||
      n.startsWith('lib/harness/monorepo-health') ||
      n.startsWith('tests/monorepo-health') ||
      n === 'tests/check-monorepo-health.test.ts' ||
      n === 'docs/harness/tenants/monorepo-health.md'
    );
  });
  if (monorepoHealthStaged) {
    parallelJobs.push(
      spawnGate('monorepo-health-tests', [
        'bun',
        'scripts/check-monorepo-health.ts',
        '--tests-only',
      ])
    );
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
  const brandCatalog = parallelResults.find(r => r.name === 'brands-catalog')?.code ?? 1;
  const brandTypes = parallelResults.find(r => r.name === 'brands-types')?.code ?? 0;
  const pathBun = parallelResults.find(r => r.name === 'path-bun')?.code ?? 0;
  const bunEnv = parallelResults.find(r => r.name === 'bun-env')?.code ?? 0;
  const importGraph = parallelResults.find(r => r.name === 'import-graph')?.code ?? 0;
  const oxlintRatchet = parallelResults.find(r => r.name === 'oxlint-ratchet')?.code ?? 0;
  const consoleFormatStaged =
    parallelResults.find(r => r.name === 'console-format-staged')?.code ?? 0;
  const consoleFormatRatchet =
    parallelResults.find(r => r.name === 'console-format-ratchet')?.code ?? 0;
  const npmInstall = parallelResults.find(r => r.name === 'npm-install')?.code ?? 0;
  const bunDepsTierA = parallelResults.find(r => r.name === 'bun-deps-tier-a')?.code ?? 0;
  const monorepoHealthTests =
    parallelResults.find(r => r.name === 'monorepo-health-tests')?.code ?? 0;
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
  if (brandCatalog !== 0) {
    console.error('❌ Domain entity catalog collision or constructor contract failure');
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
  if (importGraph !== 0) {
    console.error('❌ import cycle or deep-relative-import growth — bun run check:import-graph');
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (oxlintRatchet !== 0) {
    console.error('❌ oxlint warnings grew — bun run check:oxlint-ratchet');
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (consoleFormatStaged !== 0) {
    console.error(
      '❌ raw console.table / pretty-JSON in staged lines — use logTable/logDepth (bun run check:console-format)'
    );
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (consoleFormatRatchet !== 0) {
    console.error('❌ console-format hits grew — bun run check:console-format');
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (npmInstall !== 0) {
    console.error(
      '❌ npm/yarn/pnpm install command detected in production path — bun run check:npm-install'
    );
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (bunDepsTierA !== 0) {
    console.error(
      '❌ Tier-A Bun wrapper declared as a direct dependency — bun scripts/check-bun-deps-tier-a.ts'
    );
    await writeTimings(timings, full);
    process.exit(1);
  }
  if (monorepoHealthTests !== 0) {
    console.error(
      '❌ monorepo-health unit tests failed — bun scripts/check-monorepo-health.ts --tests-only\n' +
        '   full ratchet: bun run check:monorepo-health (ci:core)'
    );
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
}

if (import.meta.main) {
  await main();
}
