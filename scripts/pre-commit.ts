#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/shell — Bun Shell
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Bun-native Husky pre-commit orchestration. */

import { $ } from 'bun';
import { resolvePath } from '../lib/path-bun.ts';
import { checkBunPin, type BunPinCheck } from '../lib/verification/bun-runtime-pin.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';
import { isMoneySqlScannable } from './lint-money-sql.ts';

export { checkBunPin, type BunPinCheck } from '../lib/verification/bun-runtime-pin.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');
const SKILL_VALIDATION_PATH_RE =
  /^(\.agents\/skills\/|lib\/agent-skills-paths\.ts$|scripts\/validate-agent-skills\.ts$|tests\/agent-skills-validation\.test\.ts$)/;
const TEST_SOURCE_PATH_RE = /\.(ts|tsx|js|jsx|mts|cts)$/;
const CONCEPT_SSOT_PATH_RE =
  /^(lib\/portal\/semantic-vocabulary\.ts|lib\/portal\/concept-|lib\/portal\/page-concepts\.ts|scripts\/validate-surface-coverage\.ts|scripts\/concept-audit\.ts|tools\/generate-surface-coverage-map\.ts|docs\/SURFACE_COVERAGE\.md|docs\/DOMAIN_CONCEPT_SHAPE\.md|public\/portal\/concepts\/index\.html|public\/registry\/domain-glossary\.json|public\/registry\/concepts-state\.json)/;
const PARTNER_DASHBOARD_PLAN_PATH_RE =
  /^(docs\/design\/partner-dashboard-(mvp\.(toml|md)|semantic-map\.md)|lib\/partner-profile\/schema\.ts|lib\/portal\/(concept-domains|partner-routes|semantic-vocabulary|theme|url-planes)\.ts|lib\/telegram\/partner-ops-color-kernel\.ts|packages\/partners\/|public\/portal\/theme\.jsonc|public\/portal\/theme-tokens\.css|public\/portal\/partners\/|public\/registry\/(domain-glossary|partner-profiles)\.json|scripts\/validate-partner-dashboard-plan\.ts|tests\/(partners-package|validate-partner-dashboard-plan)\.test\.ts)/;

type Environment = Record<string, string | undefined>;

export type PrecommitEnvironment = {
  skipGitleaks: boolean;
  skipQualityConcept: boolean;
  skipTestChanged: boolean;
  skipWireLint: boolean;
  skipDomainLint: boolean;
};

export function readPrecommitEnvironment(env: Environment = Bun.env): PrecommitEnvironment {
  return {
    skipGitleaks: env.SKIP_GITLEAKS === '1',
    skipQualityConcept: env.SKIP_QUALITY_CONCEPT === '1',
    skipTestChanged: env.SKIP_TEST_CHANGED === '1',
    skipWireLint: env.SKIP_WIRE_LINT === '1',
    skipDomainLint: env.SKIP_DOMAIN_LINT === '1',
  };
}

export function isSkillValidationPath(path: string): boolean {
  return SKILL_VALIDATION_PATH_RE.test(path);
}

export function isTestSourcePath(path: string): boolean {
  return TEST_SOURCE_PATH_RE.test(path);
}

export function isConceptSsotPath(path: string): boolean {
  return CONCEPT_SSOT_PATH_RE.test(path);
}

export function isPartnerDashboardPlanPath(path: string): boolean {
  return PARTNER_DASHBOARD_PLAN_PATH_RE.test(path);
}

/** Staged paths that should trigger partner-surface wire-trap lint (Layer C). */
export function isPartnerWireLintPath(path: string): boolean {
  if (/\.(ts|tsx)$/.test(path)) return true;
  return (
    path === 'public/registry/partner-surface-inventory.json' ||
    path === 'docs/design/partner-surface-inventory.md'
  );
}

/**
 * Inventory / lint SSOT paths — when staged, also pass --strict-globs so allowlist
 * rot fails the commit. Ordinary .ts commits use --scan only (empty nested
 * checkouts like Kalshi-bot/ in worktrees warn, not error).
 */
export function isPartnerWireInventorySsotPath(path: string): boolean {
  return (
    path === 'lib/docs/partner-surface-inventory.ts' ||
    path === 'lib/docs/partner-surface-wire-lint.ts' ||
    path === 'scripts/validate-wire-traps.ts' ||
    path === 'public/registry/partner-surface-inventory.json'
  );
}

/** Staged paths that should trigger partner-surface domain isolation lint (Layer D). */
export function isPartnerDomainLintPath(path: string): boolean {
  if (/\.(ts|tsx)$/.test(path)) return true;
  return (
    path === 'public/registry/partner-surface-inventory.json' ||
    path === 'docs/design/partner-surface-inventory.md' ||
    path === 'docs/design/partner-surface-inventory.generated.md'
  );
}

/**
 * Domain-lint SSOT paths — when staged, also pass --strict so out-of-home brand
 * type uses fail the commit. Ordinary .ts commits use --scan only (warn default).
 */
export function isPartnerDomainInventorySsotPath(path: string): boolean {
  return (
    path === 'lib/docs/partner-surface-inventory.ts' ||
    path === 'lib/docs/partner-surface-domain-lint.ts' ||
    path === 'scripts/validate-partner-domain-isolation.ts' ||
    path === 'public/registry/partner-surface-inventory.json'
  );
}

function section(label: string, first = false): void {
  console.info(`${first ? '' : '\n'}== pre-commit: ${label} ==`);
}

async function runCommand(
  command: string[],
  options: { quiet?: boolean; env?: Environment } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const resolvedBun = command[0] === 'bun' ? resolveVerificationBunBinary() : null;
  if (resolvedBun && !resolvedBun.matchesRuntime) {
    throw new Error(
      `pre-commit child executable ${resolvedBun.path} reports ${resolvedBun.spawnedVersion ?? 'an unknown version'}, expected ${resolvedBun.runtimeVersion}`
    );
  }
  const resolvedCommand = resolvedBun ? [resolvedBun.path, ...command.slice(1)] : command;
  const shell = $`${resolvedCommand}`
    .cwd(REPO_ROOT)
    .env(options.env ?? Bun.env)
    .nothrow();
  const result = options.quiet ? await shell.quiet() : await shell;
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

async function requireCommand(command: string[], failureMessage: string): Promise<number> {
  const result = await runCommand(command);
  if (result.exitCode !== 0) console.error(failureMessage);
  return result.exitCode;
}

async function gitLines(args: string[]): Promise<string[]> {
  const result = await runCommand(['git', ...args], { quiet: true });
  if (result.exitCode !== 0) {
    if (result.stderr.trim()) console.error(result.stderr.trimEnd());
    throw new Error(`git ${args.join(' ')} failed with exit code ${result.exitCode}`);
  }
  return result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

export async function runPrecommit(
  args: string[] = applyUnknownLongOptionGuardFor('precommit', Bun.argv.slice(2))
): Promise<number> {
  const dryRun = args.includes('--dry-run');
  const environment = readPrecommitEnvironment();

  section('bun stable pin (.bun-version ‖ packageManager ‖ engines)', true);
  const pin = await checkBunPin();
  if (!pin.ok) {
    console.error(`❌ ${pin.message}`);
    return 1;
  }
  console.info(`✅ ${pin.message}`);

  section('hygiene ‖ harness');
  const [hygiene, harness] = await Promise.all([
    runCommand(['bun', 'scripts/repo-hygiene.ts', '--staged']),
    runCommand(['bun', 'scripts/pre-commit-harness.ts']),
  ]);
  if (hygiene.exitCode !== 0) {
    console.error('❌ repo hygiene failed');
    return hygiene.exitCode;
  }
  if (harness.exitCode !== 0) {
    console.error('❌ harness pre-commit failed');
    return harness.exitCode;
  }

  section('package.json scripts guard');
  if (dryRun) {
    console.info('  [dry-run] bun scripts/check-package-scripts.ts');
  } else {
    const code = await requireCommand(
      ['bun', 'scripts/check-package-scripts.ts'],
      '❌ package-scripts guard failed'
    );
    if (code !== 0) return code;
  }

  // Read the index after harness formatting/annotation has auto-restaged any rewrites.
  const [stagedFiles, allStagedFiles] = await Promise.all([
    gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
    gitLines(['diff', '--cached', '--name-only']),
  ]);

  if (allStagedFiles.includes('.mcp.json')) {
    section('mcp sync (.mcp.json staged)');
    if (dryRun) {
      console.info('  [dry-run] bun scripts/mcp-sync.ts && git add .vscode/mcp.json');
    } else {
      let code = await requireCommand(['bun', 'scripts/mcp-sync.ts'], '❌ mcp sync failed');
      if (code !== 0) return code;
      code = await requireCommand(
        ['git', 'add', '--', '.vscode/mcp.json'],
        '❌ staging generated .vscode/mcp.json failed'
      );
      if (code !== 0) return code;
    }
  }

  section('financial SQL storage (path-gated)');
  if (stagedFiles.some(isMoneySqlScannable)) {
    const code = await requireCommand(
      ['bun', 'scripts/lint-money-sql.ts', '--staged'],
      '❌ financial SQL storage guard failed'
    );
    if (code !== 0) return code;
  } else {
    console.info('  ⏭️  no staged SQL/migration/schema/ledger DDL — skip money-sql');
  }

  section('partner dashboard semantic plan (path-gated)');
  if (stagedFiles.some(isPartnerDashboardPlanPath)) {
    const code = await requireCommand(
      ['bun', 'run', 'partner:dashboard-plan:validate'],
      '❌ partner dashboard semantic plan validation failed'
    );
    if (code !== 0) return code;
  } else {
    console.info('  ⏭️  no partner dashboard semantic plan paths staged — skip');
  }

  section('agent skills (path-gated)');
  if (stagedFiles.some(isSkillValidationPath)) {
    if (dryRun) {
      console.info('  [dry-run] bun run skills:validate');
    } else {
      const code = await requireCommand(
        ['bun', 'run', 'skills:validate'],
        '❌ agent skills validation failed'
      );
      if (code !== 0) return code;
    }
  } else {
    console.info('  ⏭️  no agent skill paths staged — skip skills:validate');
  }

  section('ast-grep + semver');
  {
    const code = await requireCommand(
      ['bun', 'scripts/pre-commit-ast-grep.ts', '--staged'],
      '❌ ast-grep + semver failed'
    );
    if (code !== 0) return code;
  }

  section('gitleaks secret scan (staged)');
  if (environment.skipGitleaks) {
    console.info('  ⏭️  SKIP_GITLEAKS=1');
  } else if (Bun.which('gitleaks')) {
    if (dryRun) {
      console.info('  [dry-run] gitleaks protect --staged --config .gitleaks.toml --verbose');
    } else {
      const code = await requireCommand(
        ['gitleaks', 'protect', '--staged', '--config', '.gitleaks.toml', '--verbose'],
        '❌ gitleaks secret scan failed'
      );
      if (code !== 0) return code;
    }
  } else {
    console.info(
      dryRun
        ? '  ⚠️  [dry-run] gitleaks not installed — would skip'
        : '  ⚠️  gitleaks not installed — skip (brew install gitleaks)'
    );
  }

  section('test:changed (staged-scoped, bail)');
  const hasTestSources = stagedFiles.some(isTestSourcePath);
  if (dryRun) {
    if (hasTestSources) {
      const code = await requireCommand(
        ['bun', 'scripts/bun-test-changed-staged.ts', '--dry-run', '--bail=1'],
        '❌ test:changed dry-run failed'
      );
      if (code !== 0) return code;
    } else {
      console.info('  ⏭️  [dry-run] no staged TS/JS — test:changed would skip');
    }
  } else if (environment.skipTestChanged) {
    console.info('  ⏭️  SKIP_TEST_CHANGED=1');
  } else if (hasTestSources) {
    const code = await requireCommand(
      ['bun', 'scripts/bun-test-changed-staged.ts', '--bail=1'],
      '❌ test:changed failed (bail=1). Fix or SKIP_TEST_CHANGED=1 with reason in commit message.'
    );
    if (code !== 0) return code;
  } else {
    console.info('  ⏭️  no staged TS/JS — skip test:changed');
  }

  section('quality:concept (path-gated)');
  if (environment.skipQualityConcept) {
    console.info('  ⏭️  SKIP_QUALITY_CONCEPT=1');
  } else if (stagedFiles.some(isConceptSsotPath)) {
    if (dryRun) {
      console.info('  [dry-run] bun run quality:concept');
    } else {
      const code = await requireCommand(
        ['bun', 'run', 'quality:concept'],
        '❌ quality:concept failed. Fix or SKIP_QUALITY_CONCEPT=1 with reason in commit message.'
      );
      if (code !== 0) return code;
    }
  } else {
    console.info('  ⏭️  no concept SSOT staged — skip quality:concept');
  }

  section('partner-surface wire lint (path-gated)');
  if (environment.skipWireLint) {
    console.info('  ⏭️  SKIP_WIRE_LINT=1');
  } else if (stagedFiles.some(isPartnerWireLintPath)) {
    const strictGlobs = stagedFiles.some(isPartnerWireInventorySsotPath);
    const wireCmd = [
      'bun',
      'scripts/validate-wire-traps.ts',
      '--scan',
      ...(strictGlobs ? (['--strict-globs'] as const) : []),
    ];
    if (dryRun) {
      console.info(`  [dry-run] ${wireCmd.join(' ')}`);
    } else {
      const code = await requireCommand(
        [...wireCmd],
        '❌ Wire lint failed. Use PartnerCode / ExternalPartnerRef, add // wire-ok: <reason>, register boundaryPathGlobs, or SKIP_WIRE_LINT=1 with reason in commit message.\n' +
          '   Help: bun scripts/validate-wire-traps.ts --hlp · Why: bun scripts/validate-wire-traps.ts --why'
      );
      if (code !== 0) return code;
    }
  } else {
    console.info('  ⏭️  no staged .ts/.tsx or partner-surface inventory — skip wire lint');
  }

  section('partner-surface domain lint (path-gated)');
  if (environment.skipDomainLint) {
    console.info('  ⏭️  SKIP_DOMAIN_LINT=1');
  } else if (stagedFiles.some(isPartnerDomainLintPath)) {
    const strict = stagedFiles.some(isPartnerDomainInventorySsotPath);
    const domainCmd = [
      'bun',
      'scripts/validate-partner-domain-isolation.ts',
      '--scan',
      ...(strict ? (['--strict'] as const) : []),
    ];
    if (dryRun) {
      console.info(`  [dry-run] ${domainCmd.join(' ')}`);
    } else {
      const code = await requireCommand(
        [...domainCmd],
        '❌ Domain lint failed. Keep inventory brand types in home globs, expand homes on the brand bag, or SKIP_DOMAIN_LINT=1 with reason in commit message.\n' +
          '   Help: bun scripts/validate-partner-domain-isolation.ts --hlp · Rules: … --rules'
      );
      if (code !== 0) return code;
    }
  } else {
    console.info('  ⏭️  no staged .ts/.tsx or partner-surface inventory — skip domain lint');
  }

  console.info(
    dryRun ? '\n✅ Pre-commit dry-run complete (no changes made)' : '\n✅ Pre-commit checks passed'
  );
  return 0;
}

if (import.meta.main) {
  const exitCode = await runPrecommit();
  if (exitCode !== 0) process.exit(exitCode);
}
