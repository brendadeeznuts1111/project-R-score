// @see https://bun.com/docs/test/code-coverage — focused coverage contract
// @see https://bun.com/docs/test/snapshots — normalized command snapshot
import { describe, expect, test } from 'bun:test';
import {
  FOCUSED_COVERAGE_DIR,
  FOCUSED_COVERAGE_FILE_REGISTRY,
  FOCUSED_COVERAGE_OWNERSHIP,
  FOCUSED_COVERAGE_REPORTERS,
  buildFocusedCoveragePlan,
  focusedCoverageEnv,
  normalizeFocusedCoverageExitCode,
  runFocusedCoveragePlan,
} from '../lib/harness/focused-coverage.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const FILE = 'tests/agent-odds-http.test.ts';

describe('focused coverage contract', () => {
  test('normalizes exact files, name pattern, reporters, output, and ownership', async () => {
    const plan = await buildFocusedCoveragePlan(
      [FILE, '--test-name-pattern=API', '--bail=1'],
      ROOT
    );
    expect(plan.ownership).toEqual({
      package: 'factorywager-enterprise',
      ownerModule: 'harness',
      group: 'test-execution',
      role: 'focused-coverage-command',
      authority: 'package.json#scripts.test:coverage',
    });
    expect(plan.reporters).toEqual([...FOCUSED_COVERAGE_REPORTERS]);
    expect(plan.coverageDir).toBe(FOCUSED_COVERAGE_DIR);
    expect({ plan, fileRegistry: FOCUSED_COVERAGE_FILE_REGISTRY }).toMatchSnapshot();
  });

  test('supports short name filtering and typed diagnostic flags', async () => {
    const plan = await buildFocusedCoveragePlan(
      [FILE, '-t', 'rejects invalid', '--randomize', '--seed=42', '--parallel=2'],
      ROOT
    );
    expect(plan.files).toEqual([FILE]);
    expect(plan.testFlags).toEqual([
      '-t',
      'rejects invalid',
      '--randomize',
      '--seed=42',
      '--parallel=2',
    ]);
  });

  test('fails clearly for empty, invalid, outside, and non-test selections', async () => {
    expect(buildFocusedCoveragePlan([], ROOT)).rejects.toThrow('requires at least one exact test');
    expect(buildFocusedCoveragePlan(['tests/missing.test.ts'], ROOT)).rejects.toThrow(
      'does not exist'
    );
    expect(buildFocusedCoveragePlan(['package.json'], ROOT)).rejects.toThrow(
      'not an exact .test/.spec file'
    );
    expect(buildFocusedCoveragePlan(['../outside.test.ts'], ROOT)).rejects.toThrow(
      'inside the repository'
    );
    expect(buildFocusedCoveragePlan([FILE, FILE], ROOT)).rejects.toThrow('duplicate test file');
  });

  test('rejects selection/output mutation and unknown flags', async () => {
    for (const flag of [
      '--coverage',
      '--coverage-dir=elsewhere',
      '--watch',
      '--changed',
      '-u',
      '--pass-with-no-tests',
    ]) {
      expect(buildFocusedCoveragePlan([FILE, flag], ROOT), flag).rejects.toThrow(
        'owned or forbidden'
      );
    }
    expect(buildFocusedCoveragePlan([FILE, '--mystery'], ROOT)).rejects.toThrow(
      'unsupported test:coverage flag'
    );
    expect(buildFocusedCoveragePlan([FILE, '--parallel=2', '--isolate'], ROOT)).rejects.toThrow(
      'already implies isolation'
    );
  });

  test('creates a hermetic test environment and preserves child failure codes', async () => {
    const env = focusedCoverageEnv({
      PATH: '/bin',
      BUN_OPTIONS: '--hot',
      BUN_TEST_WORKER_ID: 'forged',
      JEST_WORKER_ID: 'forged',
    });
    expect(env.NODE_ENV).toBe('test');
    expect(env.DO_NOT_TRACK).toBe('1');
    expect(env.BUN_OPTIONS).toBeUndefined();
    expect(env.BUN_TEST_WORKER_ID).toBeUndefined();
    expect(env.JEST_WORKER_ID).toBeUndefined();
    expect(normalizeFocusedCoverageExitCode(17)).toBe(17);
    expect(normalizeFocusedCoverageExitCode(undefined)).toBe(1);
    const plan = await buildFocusedCoveragePlan([FILE], ROOT);
    const childCode = await runFocusedCoveragePlan(plan, ROOT, async command => {
      expect(command).toContain('--coverage');
      return 17;
    });
    expect(childCode).toBe(17);
  });

  test('every accountable file has package, owner, group, role, scope, and exists', async () => {
    expect(new Set(FOCUSED_COVERAGE_FILE_REGISTRY.map(entry => entry.file)).size).toBe(
      FOCUSED_COVERAGE_FILE_REGISTRY.length
    );
    for (const entry of FOCUSED_COVERAGE_FILE_REGISTRY) {
      expect(entry.package, entry.file).toBe('factorywager-enterprise');
      expect(entry.ownerModule, entry.file).toBe('harness');
      expect(entry.group, entry.file).toBe('test-execution');
      expect(entry.role, entry.file).not.toBe('');
      expect(entry.scope, entry.file).toMatch(/^(self|generated|shared)$/);
      expect(await Bun.file(joinPath(ROOT, entry.file)).exists(), entry.file).toBe(true);
    }
  });

  test('root script and operator metadata name the real command', async () => {
    const pkg = (await Bun.file(joinPath(ROOT, 'package.json')).json()) as {
      scripts: Record<string, string>;
      profiles: { code: { testing: { scripts: string[] } } };
      cheatsheets: { cli: { development: { commands: Record<string, string> } } };
    };
    expect(pkg.scripts['test:coverage']).toBe('bun scripts/run-test-coverage.ts');
    expect(pkg.profiles.code.testing.scripts).toContain('test:coverage');
    expect(pkg.cheatsheets.cli.development.commands['Focused Coverage']).toContain(
      'bun run test:coverage --'
    );
    expect(FOCUSED_COVERAGE_OWNERSHIP.authority).toBe('package.json#scripts.test:coverage');
  });

  test('CLI dry-run exposes the same normalized plan', async () => {
    const proc = Bun.spawn(
      ['bun', 'scripts/run-test-coverage.ts', FILE, '--test-name-pattern=API', '--dry-run', '--json'],
      { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code, stderr).toBe(0);
    const plan = JSON.parse(stdout) as { files: string[]; bunArgs: string[] };
    expect(plan.files).toEqual([FILE]);
    expect(plan.bunArgs).toContain('--test-name-pattern=API');
  });
});
