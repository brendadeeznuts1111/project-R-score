// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/test/parallel#isolate — --isolate
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --randomize
// @see https://bun.com/docs/test/code-coverage — --coverage · reporters · thresholds
// @see https://bun.com/docs/test/index#run-tests — file and name filtering
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { bunSpawnArgs } from '../bun-executable.ts';
import { relativePath, resolvePath } from '../path-bun.ts';

export const FOCUSED_COVERAGE_OWNERSHIP = Object.freeze({
  package: 'factorywager-enterprise',
  ownerModule: 'harness',
  group: 'test-execution',
  role: 'focused-coverage-command',
  authority: 'package.json#scripts.test:coverage',
}) as Readonly<{
  package: 'factorywager-enterprise';
  ownerModule: 'harness';
  group: 'test-execution';
  role: 'focused-coverage-command';
  authority: 'package.json#scripts.test:coverage';
}>;

export const FOCUSED_COVERAGE_REPORTERS = ['text', 'lcov'] as const;
export const FOCUSED_COVERAGE_DIR = 'coverage/focused' as const;

export const FOCUSED_COVERAGE_FILE_REGISTRY = Object.freeze(
  [
    ['lib/harness/focused-coverage.ts', 'contract', 'self'],
    ['scripts/run-test-coverage.ts', 'cli', 'self'],
    ['tests/focused-coverage.test.ts', 'proof', 'self'],
    ['tests/__snapshots__/focused-coverage.test.ts.snap', 'snapshot', 'generated'],
    ['package.json', 'command-authority', 'shared'],
    ['lib/portal/bun-test-snapshots.ts', 'snapshot-catalog', 'shared'],
    ['docs/harness/tenants/bun-test-flags.md', 'operator-runbook', 'shared'],
    ['docs/harness/code-quality.md', 'ownership-doc', 'shared'],
    ['lib/harness/README.md', 'area-map', 'shared'],
    [
      '.agents/skills/project-r-ops-management/references/command-map.md',
      'ops-command-map',
      'shared',
    ],
  ].map(([file, role, scope]) => ({
    file: file!,
    package: FOCUSED_COVERAGE_OWNERSHIP.package,
    ownerModule: FOCUSED_COVERAGE_OWNERSHIP.ownerModule,
    group: FOCUSED_COVERAGE_OWNERSHIP.group,
    role: role!,
    scope: scope as 'self' | 'generated' | 'shared',
  }))
) as readonly Readonly<{
  file: string;
  package: typeof FOCUSED_COVERAGE_OWNERSHIP.package;
  ownerModule: typeof FOCUSED_COVERAGE_OWNERSHIP.ownerModule;
  group: typeof FOCUSED_COVERAGE_OWNERSHIP.group;
  role: string;
  scope: 'self' | 'generated' | 'shared';
}>[];

const VALUE_FLAGS = new Set([
  '-t',
  '--test-name-pattern',
  '--timeout',
  '--retry',
  '--rerun-each',
  '--seed',
  '--max-concurrency',
]);
const BOOLEAN_FLAGS = new Set([
  '--randomize',
  '--smol',
  '--dots',
  '--concurrent',
  '--isolate',
  '--parallel',
  '--bail',
]);
const ASSIGNMENT_FLAGS = [
  '--test-name-pattern=',
  '--timeout=',
  '--retry=',
  '--rerun-each=',
  '--seed=',
  '--max-concurrency=',
  '--parallel=',
  '--bail=',
] as const;
const OWNED_OR_FORBIDDEN_FLAGS = [
  '--coverage',
  '--coverage-reporter',
  '--coverage-dir',
  '--watch',
  '--changed',
  '--pass-with-no-tests',
  '--update-snapshots',
  '-u',
] as const;
const TEST_FILE_RE = /(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/;

export type FocusedCoveragePlan = {
  kind: 'focused-coverage';
  ownership: typeof FOCUSED_COVERAGE_OWNERSHIP;
  files: string[];
  testFlags: string[];
  reporters: [...typeof FOCUSED_COVERAGE_REPORTERS];
  coverageDir: typeof FOCUSED_COVERAGE_DIR;
  bunArgs: string[];
};

export class FocusedCoverageUsageError extends Error {
  override name = 'FocusedCoverageUsageError';
}

function isOwnedOrForbiddenFlag(arg: string): boolean {
  return OWNED_OR_FORBIDDEN_FLAGS.some(flag => arg === flag || arg.startsWith(`${flag}=`));
}

function validateTestFlags(flags: readonly string[]): string[] {
  const accepted: string[] = [];
  for (let index = 0; index < flags.length; index++) {
    const arg = flags[index]!;
    if (isOwnedOrForbiddenFlag(arg)) {
      throw new FocusedCoverageUsageError(
        `${arg} is owned or forbidden by test:coverage; select exact files and let the wrapper own coverage output`
      );
    }
    if (BOOLEAN_FLAGS.has(arg)) {
      accepted.push(arg);
      continue;
    }
    if (ASSIGNMENT_FLAGS.some(prefix => arg.startsWith(prefix))) {
      if (arg.endsWith('=')) throw new FocusedCoverageUsageError(`${arg} requires a value`);
      accepted.push(arg);
      continue;
    }
    if (VALUE_FLAGS.has(arg)) {
      const value = flags[index + 1];
      if (!value || value.startsWith('-')) {
        throw new FocusedCoverageUsageError(`${arg} requires a value`);
      }
      accepted.push(arg, value);
      index++;
      continue;
    }
    throw new FocusedCoverageUsageError(`unsupported test:coverage flag: ${arg}`);
  }
  if (
    accepted.some(arg => arg === '--parallel' || arg.startsWith('--parallel=')) &&
    accepted.includes('--isolate')
  ) {
    throw new FocusedCoverageUsageError(
      '--parallel already implies isolation; do not pass --isolate'
    );
  }
  return accepted;
}

export async function buildFocusedCoveragePlan(
  argv: readonly string[],
  root: string
): Promise<FocusedCoveragePlan> {
  const args = argv[0] === '--' ? argv.slice(1) : [...argv];
  const firstFlag = args.findIndex(arg => arg.startsWith('-'));
  const selectorEnd = firstFlag === -1 ? args.length : firstFlag;
  const selectors = args.slice(0, selectorEnd);
  const testFlags = validateTestFlags(args.slice(selectorEnd));

  if (selectors.length === 0) {
    throw new FocusedCoverageUsageError(
      'test:coverage requires at least one exact test file before any flags'
    );
  }

  const rootAbs = resolvePath(root);
  const files: string[] = [];
  for (const selector of selectors) {
    const abs = resolvePath(rootAbs, selector);
    const rel = relativePath(rootAbs, abs);
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('/')) {
      throw new FocusedCoverageUsageError(`test file must stay inside the repository: ${selector}`);
    }
    if (!TEST_FILE_RE.test(`/${rel}`)) {
      throw new FocusedCoverageUsageError(`not an exact .test/.spec file: ${selector}`);
    }
    if (!(await Bun.file(abs).exists())) {
      throw new FocusedCoverageUsageError(`test file does not exist: ${selector}`);
    }
    if (files.includes(rel)) {
      throw new FocusedCoverageUsageError(`duplicate test file: ${selector}`);
    }
    files.push(rel);
  }

  const bunArgs = [
    'test',
    '--coverage',
    ...FOCUSED_COVERAGE_REPORTERS.map(reporter => `--coverage-reporter=${reporter}`),
    `--coverage-dir=${FOCUSED_COVERAGE_DIR}`,
    ...files,
    ...testFlags,
  ];
  return {
    kind: 'focused-coverage',
    ownership: FOCUSED_COVERAGE_OWNERSHIP,
    files,
    testFlags,
    reporters: [...FOCUSED_COVERAGE_REPORTERS],
    coverageDir: FOCUSED_COVERAGE_DIR,
    bunArgs,
  };
}

export function focusedCoverageEnv(
  base: Record<string, string | undefined> = Bun.env
): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries(base).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  env.NODE_ENV = 'test';
  env.DO_NOT_TRACK ||= '1';
  env.TMPDIR ||= Bun.env.TMPDIR || Bun.env.TMP || '/tmp';
  delete env.BUN_OPTIONS;
  delete env.BUN_TEST_WORKER_ID;
  delete env.JEST_WORKER_ID;
  return env;
}

export function normalizeFocusedCoverageExitCode(code: number | null | undefined): number {
  return code ?? 1;
}

export type FocusedCoverageRunner = (
  command: string[],
  context: { cwd: string; env: Record<string, string> }
) => Promise<number | null | undefined>;

const spawnFocusedCoverage: FocusedCoverageRunner = async (command, context) => {
  const proc = Bun.spawn(command, {
    cwd: context.cwd,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: context.env,
  });
  return proc.exited;
};

export async function runFocusedCoveragePlan(
  plan: FocusedCoveragePlan,
  root: string,
  runner: FocusedCoverageRunner = spawnFocusedCoverage
): Promise<number> {
  const code = await runner(bunSpawnArgs(plan.bunArgs), {
    cwd: root,
    env: focusedCoverageEnv(),
  });
  return normalizeFocusedCoverageExitCode(code);
}
