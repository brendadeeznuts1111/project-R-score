// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
import { describe, expect, test } from 'bun:test';
import {
  ALLOWED_ROOT_DIRS,
  ROOT_DIRECTORY_ROUTES,
  ROOT_INTEGRATIONS,
  rootOutputRoute,
} from '../config/repo-root-policy.ts';
import {
  ALLOWED_STAGED_ENTRYPOINTS,
  ROOT_GITIGNORE_EXPECTATIONS,
  checkRootGitignoreContract,
  dedupeViolations,
  findGitignored,
  findStrayFiles,
  findTrackedViolations,
  inspectGitignored,
  type Violation,
} from '../scripts/repo-hygiene.ts';
import { createTestWorkspace } from './harness.ts';

describe('repository root policy', () => {
  test('framework and operator roots have explicit integration owners', () => {
    expect(ROOT_INTEGRATIONS._includes.owner).toBe('github-pages');
    expect(ROOT_INTEGRATIONS['artifact-registry'].owner).toBe('bookmakers-registry');
    expect(ROOT_INTEGRATIONS['functions-bun-only'].owner).toBe('platform-routing');
    expect(ROOT_INTEGRATIONS.warehouse.owner).toBe('image-pipeline');

    for (const root of Object.keys(ROOT_INTEGRATIONS)) {
      expect(ALLOWED_ROOT_DIRS.has(root)).toBe(true);
    }
  });

  test('generated directories route beneath artifacts', () => {
    expect(ROOT_DIRECTORY_ROUTES.snapshots.target).toBe('artifacts/snapshots/');
    expect(ROOT_DIRECTORY_ROUTES['artifacts-browser'].target).toBe('artifacts/browser/');
    expect(rootOutputRoute('snapshots/')?.owner).toBe('portal-snapshot');
  });

  test('retired root parking names are not allowlisted and route if resurrected', () => {
    const retired = [
      'database',
      'herdr-worktrees',
      'logs',
      'services',
      'src',
      'utils',
      'workers',
    ] as const;
    for (const name of retired) {
      expect(ALLOWED_ROOT_DIRS.has(name)).toBe(false);
      expect(rootOutputRoute(`${name}/`)?.action).toMatch(/do not recreate|delete if reappear/);
    }
    expect(ROOT_DIRECTORY_ROUTES.utils.target).toBe('lib/utils/');
    expect(ROOT_DIRECTORY_ROUTES['herdr-worktrees'].target).toContain('.worktrees');
  });

  test('known file producers have actionable owners', () => {
    expect(rootOutputRoute('test-metafile.json')).toMatchObject({
      owner: 'bun-file-analyzer-tests',
      target: 'os temporary directory',
    });
    expect(rootOutputRoute('shortcuts.db')).toMatchObject({
      owner: 'shortcut-registry',
      target: 'shortcut-registry/shortcuts.db',
    });
  });
});

describe('repo hygiene mechanics', () => {
  test('allows canonical ast-grep test entrypoints', () => {
    expect(ALLOWED_STAGED_ENTRYPOINTS).toEqual(
      new Set([
        '.agents/skills/ast-grep/scripts/test-cli.ts',
        '.agents/skills/ast-grep/scripts/scan/transpiler/test-runner.ts',
      ])
    );
  });

  test('checks ignored candidates in one batch', () => {
    const ignored = findGitignored([
      'temp-perf.db',
      'reports/path with spaces.json',
      'packages/example/bun.lock',
    ]);
    expect(ignored).toEqual(new Set(['temp-perf.db', 'reports/path with spaces.json']));
  });

  test('Bun-native root ignore contract owns positive and negative probes', async () => {
    expect(ROOT_GITIGNORE_EXPECTATIONS.length).toBeGreaterThanOrEqual(12);
    expect(await checkRootGitignoreContract()).toEqual([]);

    expect(inspectGitignored(['.bun-version']).get('.bun-version')).toMatchObject({
      source: '.gitignore',
      pattern: '!.bun-version',
      ignored: false,
    });
  });

  test('root ignore contract fails closed on duplicate, broad, and missing rules', async () => {
    await using workspace = await createTestWorkspace('factorywager-gitignore-');
    const source = await Bun.file(`${import.meta.dir}/../.gitignore`).text();
    const init = Bun.spawnSync(['git', 'init', '-q'], { cwd: workspace.root });
    expect(init.exitCode).toBe(0);

    await Bun.write(workspace.resolve('.gitignore'), `${source}\ncoverage/\n`);
    expect(await checkRootGitignoreContract(workspace.root)).toContainEqual(
      expect.objectContaining({ rule: 'duplicate-gitignore-rule' })
    );

    await Bun.write(workspace.resolve('.gitignore'), `${source}\nbun.lock\n`);
    expect(await checkRootGitignoreContract(workspace.root)).toContainEqual(
      expect.objectContaining({ file: 'bun.lock', rule: 'gitignore-overmatch' })
    );

    await Bun.write(
      workspace.resolve('.gitignore'),
      source.replace(/^\.wrangler\/$/m, '')
    );
    expect(await checkRootGitignoreContract(workspace.root)).toContainEqual(
      expect.objectContaining({
        file: '.wrangler/state.json',
        rule: 'gitignore-undermatch',
      })
    );
  });

  test('deduplicates identical file/rule findings', () => {
    const finding: Violation = {
      file: 'test-metafile.json',
      rule: 'stray-output-root',
      owner: 'bun-file-analyzer-tests',
      action: 'move',
    };
    expect(dedupeViolations([finding, finding])).toEqual([finding]);
  });

  test('root stray scan returns unique file/rule pairs', async () => {
    const findings = await findStrayFiles();
    const keys = findings.map(({ file, rule }) => `${file}\0${rule}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('tracked scan ignores local runtime residue and keeps the committed tree clean', async () => {
    expect(await findTrackedViolations()).toEqual([]);
  });
});
