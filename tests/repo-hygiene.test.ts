// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  ALLOWED_ROOT_DIRS,
  ROOT_DIRECTORY_ROUTES,
  ROOT_INTEGRATIONS,
  rootOutputRoute,
} from '../config/repo-root-policy.ts';
import {
  ALLOWED_STAGED_ENTRYPOINTS,
  dedupeViolations,
  findGitignored,
  findStrayFiles,
  findTrackedViolations,
  type Violation,
} from '../scripts/repo-hygiene.ts';

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
    const ignored = findGitignored(['temp-perf.db', 'test-metafile.json']);
    expect(ignored).toEqual(new Set(['temp-perf.db', 'test-metafile.json']));
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
