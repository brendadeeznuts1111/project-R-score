#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Pre-commit harness checks — staged root paths.
 * Parallelizes independent gates; auto-annotates Bun doc refs; records timings.
 */
import { buildHarnessEslintArgs } from '../config/eslint/harness/command.ts';
import { isHarnessFormatPath, isHarnessLintPath } from '../config/eslint/harness/rollout.ts';
import { printGateFailure, type GateFailureInput } from '../lib/harness/gate-fail.ts';
import { isColorKernelPath } from '../lib/portal/color-kernel-paths.ts';
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/harness-gate-timing.json`;

type GateTiming = { name: string; ms: number; ok: boolean };

async function failGate(
  timings: GateTiming[],
  full: boolean,
  input: GateFailureInput
): Promise<never> {
  await writeTimings(timings, full);
  printGateFailure(input);
  process.exit(1);
}

const DOC_MAP_SSOT = new Set([
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  'STRUCTURE.md',
  '.custom-instructions.md',
  'docs/AGENTS.md',
  'docs/README.md',
  'docs/UNIFIED.md',
  'docs/WIRE_BOUNDARY.md',
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'docs/markdown/API_REFERENCE.md',
  'docs/markdown/CONTRIBUTING_MARKDOWN.md',
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

const NATIVE_CAPABILITIES_SYNC_PATHS = new Set([
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'lib/docs/bun-native-capabilities-sync.ts',
  'tools/bun-native-capabilities-sync.ts',
  'tests/bun-native-capabilities-sync.test.ts',
  '.agents/skills/ast-grep/bun-patterns.json',
]);

function isNativeCapabilitiesSyncPath(file: string): boolean {
  return NATIVE_CAPABILITIES_SYNC_PATHS.has(file.replace(/^\.\//, ''));
}

async function stagedPatchIncludes(files: string[], needle: string): Promise<boolean> {
  if (files.length === 0) return false;
  const proc = Bun.spawn(['git', 'diff', '--cached', '-U0', '--', ...files], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const patch = await new Response(proc.stdout).text();
  const code = await proc.exited;
  return code === 0 && patch.includes(needle);
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

/**
 * Glossary section mounts — offline HTMLRewriter probe when bake/boards change.
 * Escape: SKIP_GLOSSARY_VERIFY=1
 */
export function isGlossaryVerifyPath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  if (n === 'public/registry/domain-glossary.json') return true;
  if (n === 'lib/portal/page-glossary.ts') return true;
  if (n === 'tools/glossary-verify.ts') return true;
  if (n === 'tests/glossary-verify.test.ts') return true;
  return /^public\/portal\/(account|limits|partners|partner-history)\//.test(n);
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
 * ESLint --fix / Prettier --write / doc-refs annotate rewrite staged files
 * after they were added. Fold those rewrites back into the index automatically
 * (the deeplink-automation hook pattern) instead of failing the commit and
 * making the operator re-stage + re-run every gate.
 */
async function assertStagedMatchesWorktree(
  files: string[],
  timings: GateTiming[],
  full: boolean
): Promise<void> {
  const t0 = performance.now();
  const dirty = await filesWithUnstagedDiff(files);
  if (dirty.length > 0) {
    const code = await runGate('auto-restage', ['git', 'add', '--', ...dirty], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Auto-restage',
        gate: 'auto-restage',
        why: 'Could not auto-restage files rewritten by format/annotate',
        fix: `git add -- ${dirty.join(' ')}`,
      });
    }
    console.info(
      `↻ Auto-restaged ${dirty.length} file(s) rewritten by format/annotate gates:\n` +
        dirty.map(f => `   ${f}`).join('\n')
    );
  }
  timings.push({
    name: 'staged-worktree',
    ms: Math.round(performance.now() - t0),
    ok: true,
  });
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
  const markdownFiles = staged.filter(file => file.toLowerCase().endsWith('.md'));
  const nativeCapabilitiesFiles = staged.filter(isNativeCapabilitiesSyncPath);
  const nativeCapabilitiesTriggered =
    nativeCapabilitiesFiles.length > 0 ||
    (await stagedPatchIncludes(harnessFiles, 'Bun.markdown.'));

  async function runPrettierWrite(files: string[]): Promise<void> {
    if (files.length === 0) return;
    console.info(`✨ Harness format (${files.length} staged file(s))...`);
    const formatCode = await runGate(
      'prettier',
      ['bun', 'x', 'prettier', '--write', ...files],
      timings
    );
    if (formatCode !== 0) {
      await failGate(timings, full, {
        title: 'Harness Prettier',
        gate: 'prettier',
        why: 'Prettier --write failed on staged harness files',
        fix: 'bun x prettier --write <files>',
      });
    }
  }

  if (docMapFiles.length > 0) {
    console.info(`🗺️  Doc map check (${docMapFiles.length} SSOT path(s) staged)...`);
    const code = await runGate('doc-map', ['bun', 'tools/doc-map-check.ts'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Doc map',
        gate: 'doc-map',
        why: 'Broken links / CANONICAL_* paths',
        fix: 'bun tools/doc-map-check.ts',
      });
    }
  }

  if (markdownFiles.length > 0) {
    console.info(`📝 Markdown contract (${markdownFiles.length} staged file(s))...`);
    const code = await runGate(
      'markdown-contract',
      ['bun', 'scripts/check-docs.ts', ...markdownFiles],
      timings
    );
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Markdown contract',
        gate: 'markdown-contract',
        why: 'Staged markdown failed docs contract',
        fix: 'bun run check:docs',
      });
    }
  }

  if (nativeCapabilitiesTriggered) {
    console.info('📝 Bun native Markdown evidence...');
    const code = await runGate('native-docs', ['bun', 'run', 'docs:native:check'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Native Markdown evidence',
        gate: 'native-docs',
        why: 'Bun native Markdown evidence is stale',
        fix: 'bun run docs:native:sync',
        detail: 'Preview first: bun run docs:native:preview',
      });
    }
  }

  const projectsFiles = staged.filter(f => f.replace(/^\.\//, '').startsWith('projects/'));
  if (projectsFiles.length > 0) {
    console.info(`📦 Projects root contract (${projectsFiles.length} path(s) staged)...`);
    const code = await runGate('projects-roots', ['bun', 'run', 'projects:roots:check'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Projects roots',
        gate: 'projects-roots',
        why: 'Product root contract failed — fix structure, Bun engine, package manager, or lockfile',
        fix: 'bun run projects:roots:check',
      });
    }

    const projectSourceFiles: string[] = [];
    for (const file of projectsFiles) {
      if (!/\.[cm]?[jt]sx?$/i.test(file)) continue;
      if (await Bun.file(file).exists()) projectSourceFiles.push(file);
    }
    if (projectSourceFiles.length > 0) {
      console.info(`🧩 Projects syntax (${projectSourceFiles.length} staged source file(s))...`);
      const syntaxCode = await runGate(
        'projects-syntax',
        ['bun', 'tools/bun-doc-refs.ts', 'syntax', ...projectSourceFiles],
        timings
      );
      if (syntaxCode !== 0) {
        console.error(
          '❌ Active project source contains syntax errors\n' +
            `   bun tools/bun-doc-refs.ts syntax ${projectSourceFiles.join(' ')}`
        );
        await writeTimings(timings, full);
        process.exit(1);
      }

      console.info(`🔬 Bun API drift (${projectSourceFiles.length} staged source file(s))...`);
      const driftCode = await runGate(
        'projects-bun-api-drift',
        ['bun', 'tools/bun-api-drift.ts', '--max=0', ...projectSourceFiles],
        timings
      );
      if (driftCode !== 0) {
        console.error(
          '❌ Staged project source uses an API absent from the installed Bun runtime\n' +
            `   bun tools/bun-api-drift.ts --max=0 ${projectSourceFiles.join(' ')}`
        );
        await writeTimings(timings, full);
        process.exit(1);
      }
    }
  }

  const libFiles = staged.filter(f => f.replace(/^\.\//, '').startsWith('lib/'));
  const areaMapToolStaged = staged.some(f => {
    const n = f.replace(/^\.\//, '');
    return (
      n === 'tools/lib-area-map-check.ts' ||
      n === 'tests/lib-area-map-check.test.ts' ||
      n === 'package.json'
    );
  });
  if (libFiles.length > 0) {
    console.info(`📚 Lib domain indexes (${libFiles.length} path(s) staged)...`);
    const code = await runGate('lib-domains', ['bun', 'run', 'lib:domains:check'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Lib domains',
        gate: 'lib-domains',
        why: 'Lib domain index missing README.md',
        fix: 'bun run lib:domains:check',
      });
    }
  }
  if (libFiles.length > 0 || areaMapToolStaged) {
    console.info(`🗺️  Lib Area map paths...`);
    const mapCode = await runGate('lib-area-maps', ['bun', 'run', 'lib:area-maps:check'], timings);
    if (mapCode !== 0) {
      await failGate(timings, full, {
        title: 'Lib Area maps',
        gate: 'lib-area-maps',
        why: 'Area map / Ownership map entry paths/globs invalid',
        fix: 'bun run lib:area-maps:check',
      });
    }
  }

  const auditFiles = staged.filter(isAuditSsotPath);
  if (auditFiles.length > 0) {
    console.info(`🧾 Audit catalog verify (${auditFiles.length} path(s) staged)...`);
    const code = await runGate('audit-verify', ['bun', 'run', 'audit:verify'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Audit catalog',
        gate: 'audit-verify',
        why: 'evidence/graph/relatedDocs/catalog parity failed',
        fix: 'bun run audit:verify',
        detail: 'Rebuild: bun run audit:catalog:build',
      });
    }
  }

  const publicFiles = staged.filter(isPublicPlanePath);
  if (publicFiles.length > 0) {
    console.info(`🌐 Public plane discovery (${publicFiles.length} path(s) staged)...`);
    const code = await runGate('public-discover', ['bun', 'run', 'public:discover:check'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Public plane discovery',
        gate: 'public-discover',
        why: 'Broken registry ref or portal anti-pattern',
        fix: 'bun run public:discover:check',
        detail: 'Also: bun run verify:portal:static · docs/harness/tenants/public-plane.md',
      });
    }
  }

  const glossaryVerifyFiles = staged.filter(isGlossaryVerifyPath);
  if (glossaryVerifyFiles.length > 0 && Bun.env.SKIP_GLOSSARY_VERIFY !== '1') {
    console.info(
      `📖 Glossary DOM mounts (${glossaryVerifyFiles.length} path(s) staged) · HTMLRewriter…`
    );
    const code = await runGate('glossary-verify', ['bun', 'run', 'glossary:verify'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Glossary verify',
        gate: 'glossary-verify',
        why: 'Missing/duplicate section domId or unparseable hash',
        fix: 'bun run glossary:verify',
        detail: 'Strict: bun run glossary:verify:strict · escape: SKIP_GLOSSARY_VERIFY=1',
      });
    }
  }

  // Theme-dark color kernels — CSS stale + aliases/floors (claim color-kernel-theme-aliases).
  // Escape: SKIP_COLOR_KERNEL=1
  const colorKernelFiles = staged.filter(isColorKernelPath);
  if (colorKernelFiles.length > 0) {
    if (Bun.env.SKIP_COLOR_KERNEL === '1') {
      console.info('⏭️  SKIP_COLOR_KERNEL=1 — portal:theme:check skipped');
    } else {
      console.info(`🎨 Color kernel theme check (${colorKernelFiles.length} path(s) staged)...`);
      const code = await runGate('color-kernel', ['bun', 'run', 'portal:theme:check'], timings);
      if (code !== 0) {
        await failGate(timings, full, {
          title: 'Color kernel theme',
          gate: 'color-kernel',
          why: 'theme-tokens stale or alias/floor drift',
          fix: 'bun run portal:theme:check',
          detail: 'Also: bun run validate:colors · escape: SKIP_COLOR_KERNEL=1',
        });
      }
    }
  }
  const runtimeFlagsFiles = staged.filter(isRuntimeFlagsPath);
  if (runtimeFlagsFiles.length > 0) {
    console.info(`🚩 Runtime flags catalog (${runtimeFlagsFiles.length} path(s) staged)...`);
    const code = await runGate('runtime-flags', ['bun', 'run', 'portal:flags:check'], timings);
    if (code !== 0) {
      await failGate(timings, full, {
        title: 'Runtime flags',
        gate: 'runtime-flags',
        why: 'schema/shortcode/help or bun --help parity failed',
        fix: 'bun run portal:flags:check',
      });
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
        await failGate(timings, full, {
          title: 'Portal doctor bunfig',
          gate: 'doctor-bunfig',
          why: 'machine/project install policy surface failed',
          fix: 'bun run portal:doctor:bunfig:check',
          detail: 'escape: SKIP_DOCTOR_BUNFIG=1 · docs/harness/tenants/portal-doctor.md',
        });
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
        await failGate(timings, full, {
          title: 'Doctor-state fingerprint',
          gate: 'doctor-state',
          why: 'Portable doctor-state fingerprint mismatch',
          fix: 'bun run bake:doctor:check',
          detail: 'Re-bake: bun run bake:doctor · escape: SKIP_DOCTOR_STATE_CHECK=1',
        });
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
        await failGate(timings, full, {
          title: 'TS6 types audit',
          gate: 'tsconfig-types',
          why: 'Monorepo-owned tsconfigs must resolve types: ["bun"]',
          fix: 'bun run check:tsconfig-types -- --strict',
          detail: 'escape: SKIP_TSCONFIG_TYPES=1 · docs/harness/tenants/monorepo-workspaces.md',
        });
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
      formatFiles.length > 0 ||
      nativeCapabilitiesTriggered
    ) {
      console.info(
        '✅ Harness pre-commit checks passed (doc/projects/lib/audit/public/flags/bunfig/doctor-state/tsconfig-types/format/native-docs gates only)'
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
    await failGate(timings, full, {
      title: 'Harness ESLint',
      gate: 'eslint',
      why: 'ESLint failed on staged harness files',
      fix: 'bun run lint:harness -- --fix',
    });
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
    await failGate(timings, full, {
      title: 'Doc refs',
      gate: 'doc-refs-check',
      why: 'Missing canonical Bun doc refs after annotate',
      fix: 'bun tools/bun-doc-refs.ts suggest "<api>"',
    });
  }

  // Kill green-commit / dirty-tree / amend thrash (eslint --fix · prettier · annotate).
  await assertStagedMatchesWorktree(formatFiles, timings, full);

  console.info('🏷️  Brand manifest...');
  if (
    (await runGate('brand-manifest', ['bun', 'tools/brand-manifest.ts', '--check'], timings)) !== 0
  ) {
    await failGate(timings, full, {
      title: 'Brand manifest',
      gate: 'brand-manifest',
      why: 'Stale brand-manifest.json',
      fix: 'bun tools/brand-manifest.ts',
    });
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
  /**
   * Dependency manifests only. bun-pm-cache is a machine-environment health
   * check (~5s — cache dir path/exists/size), not a code-change gate; running
   * it on every scripts/tools/lib commit halves hook throughput for nothing.
   */
  const depManifestStaged = staged.some(f => {
    const n = f.replace(/^\.\//, '');
    return (
      n === 'package.json' ||
      n === '.npmrc' ||
      n === 'bunfig.toml' ||
      n === 'bun.lock' ||
      n === 'bun.lockb'
    );
  });

  // Parallel: staged adoption + path/env policy + console-format staged mode.
  // Repo-wide trend gates (brands-smart/catalog, import-graph,
  // console-format ratchet) live in pre-push / ci:core — one enforcement
  // point per concern; commit time is for "did MY diff break anything".
  console.info('🏷️  Branded IDs (staged) + policy gates...');

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
  // Tier-A package gate always runs (sole successor to check-banned-wrappers).
  parallelJobs.push(spawnGate('bun-deps-tier-a', ['bun', 'scripts/check-bun-deps-tier-a.ts']));
  // Mixed-lane guard (warn-only): bakes staged together with source files.
  parallelJobs.push(spawnGate('mixed-lane', ['bun', 'scripts/check-mixed-lane.ts']));
  if (libStaged || scriptsStaged || toolsStaged) {
    parallelJobs.push(
      spawnGate('console-format-staged', ['bun', 'scripts/lint-console-format.ts', '--staged'])
    );
  }
  if (npmInstallStaged) {
    parallelJobs.push(spawnGate('npm-install', ['bun', 'run', 'check:npm-install']));
  }
  if (depManifestStaged) {
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
  const brandTypes = parallelResults.find(r => r.name === 'brands-types')?.code ?? 0;
  const pathBun = parallelResults.find(r => r.name === 'path-bun')?.code ?? 0;
  const bunEnv = parallelResults.find(r => r.name === 'bun-env')?.code ?? 0;
  const consoleFormatStaged =
    parallelResults.find(r => r.name === 'console-format-staged')?.code ?? 0;
  const npmInstall = parallelResults.find(r => r.name === 'npm-install')?.code ?? 0;
  const bunDepsTierA = parallelResults.find(r => r.name === 'bun-deps-tier-a')?.code ?? 0;
  const monorepoHealthTests =
    parallelResults.find(r => r.name === 'monorepo-health-tests')?.code ?? 0;
  const complexityStaged =
    parallelResults.find(r => r.name === 'harness-complexity-staged')?.code ?? 0;

  if (brandStaged !== 0) {
    await failGate(timings, full, {
      title: 'Branded IDs',
      gate: 'brands-staged',
      why: 'New unbranded domain ID (bare string) in staged changes',
      fix: 'bun tools/branded-id-check.ts --staged --strict',
      detail: 'Use lib/types/branded.ts as*/try*/parse* constructors',
    });
  }
  if (brandTypes !== 0) {
    await failGate(timings, full, {
      title: 'Branded types',
      gate: 'brands-types',
      why: 'Branded type assertions failed',
      fix: 'bun run check:brands:types',
      detail: 'tests/branded-types.test-d.ts',
    });
  }
  if (pathBun !== 0) {
    await failGate(timings, full, {
      title: 'path-bun',
      gate: 'path-bun',
      why: 'path/node:path import in lib/ or tools/',
      fix: 'bun run check:path-bun',
      detail: 'Use lib/path-bun',
    });
  }
  if (bunEnv !== 0) {
    await failGate(timings, full, {
      title: 'Bun.env',
      gate: 'bun-env',
      why: 'process.env used in lib/ or scripts/',
      fix: 'bun run check:bun-env',
      detail: 'Prefer Bun.env',
    });
  }
  if (consoleFormatStaged !== 0) {
    await failGate(timings, full, {
      title: 'Console format',
      gate: 'console-format-staged',
      why: 'raw console.table / pretty-JSON / object dump in staged lines',
      fix: 'bun run check:console-format',
      detail: 'Use logTable / logDepth / cliOut from lib/console (// console-ok to suppress)',
    });
  }
  if (npmInstall !== 0) {
    await failGate(timings, full, {
      title: 'npm install ban',
      gate: 'npm-install',
      why: 'npm/yarn/pnpm install command in production path',
      fix: 'bun run check:npm-install',
    });
  }
  if (bunDepsTierA !== 0) {
    await failGate(timings, full, {
      title: 'Tier-A Bun deps',
      gate: 'bun-deps-tier-a',
      why: 'Tier-A Bun wrapper declared as a direct dependency',
      fix: 'bun scripts/check-bun-deps-tier-a.ts',
    });
  }
  if (monorepoHealthTests !== 0) {
    await failGate(timings, full, {
      title: 'Monorepo health tests',
      gate: 'monorepo-health-tests',
      why: 'monorepo-health unit tests failed',
      fix: 'bun scripts/check-monorepo-health.ts --tests-only',
      detail: 'Full ratchet: bun run check:monorepo-health (ci:core)',
    });
  }
  if (complexityStaged !== 0) {
    await failGate(timings, full, {
      title: 'Harness complexity',
      gate: 'harness-complexity-staged',
      why: 'Complexity floor exceeded on staged harness files',
      fix: 'bun run check:harness-complexity:staged',
      detail:
        'Prefer refactor; raise only via: bun run check:harness-complexity -- --update-baseline --yes',
    });
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
