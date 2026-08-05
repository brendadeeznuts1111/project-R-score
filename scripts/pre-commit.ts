#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/shell — Bun Shell
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/** Bun-native Husky pre-commit orchestration. */

import { $ } from 'bun';
import { resolvePath } from '../lib/path-bun.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');
const SKILL_VALIDATION_PATH_RE =
  /^(\.agents\/skills\/|lib\/agent-skills-paths\.ts$|scripts\/validate-agent-skills\.ts$|tests\/agent-skills-validation\.test\.ts$)/;
const TEST_SOURCE_PATH_RE = /\.(ts|tsx|js|jsx|mts|cts)$/;
const CONCEPT_SSOT_PATH_RE =
  /^(lib\/portal\/semantic-vocabulary\.ts|lib\/portal\/concept-|lib\/portal\/page-concepts\.ts|scripts\/validate-surface-coverage\.ts|scripts\/concept-audit\.ts|tools\/generate-surface-coverage-map\.ts|docs\/SURFACE_COVERAGE\.md|docs\/DOMAIN_CONCEPT_SHAPE\.md|public\/portal\/concepts\/index\.html|public\/registry\/domain-glossary\.json|public\/registry\/concepts-state\.json)/;

type Environment = Record<string, string | undefined>;

export type PrecommitEnvironment = {
  skipGitleaks: boolean;
  skipQualityConcept: boolean;
  skipTestChanged: boolean;
};

export function readPrecommitEnvironment(env: Environment = Bun.env): PrecommitEnvironment {
  return {
    skipGitleaks: env.SKIP_GITLEAKS === '1',
    skipQualityConcept: env.SKIP_QUALITY_CONCEPT === '1',
    skipTestChanged: env.SKIP_TEST_CHANGED === '1',
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

function section(label: string, first = false): void {
  console.info(`${first ? '' : '\n'}== pre-commit: ${label} ==`);
}

async function runCommand(
  command: string[],
  options: { quiet?: boolean; env?: Environment } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const shell = $`${command}`
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

export async function runPrecommit(args: string[] = Bun.argv.slice(2)): Promise<number> {
  const dryRun = args.includes('--dry-run');
  const environment = readPrecommitEnvironment();

  section('hygiene ‖ harness', true);
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

  console.info(
    dryRun ? '\n✅ Pre-commit dry-run complete (no changes made)' : '\n✅ Pre-commit checks passed'
  );
  return 0;
}

if (import.meta.main) {
  const exitCode = await runPrecommit();
  if (exitCode !== 0) process.exit(exitCode);
}
