import { describe, expect, test } from 'bun:test';
import {
  addedLineBrandViolations,
  GOVERNED_TYPESCRIPT_ROOTS,
  projectLegacyAttribution,
  trackedTypeScriptFiles,
} from '../tools/branded-id-check.ts';

describe('branded ID added-line gate', () => {
  test('smart inventory covers every governed tracked TypeScript root', async () => {
    const files = await trackedTypeScriptFiles();

    expect(files.length).toBeGreaterThan(0);
    expect(files.every(file => /\.tsx?$/.test(file))).toBe(true);
    for (const root of GOVERNED_TYPESCRIPT_ROOTS) {
      expect(files.some(file => file.startsWith(`${root}/`))).toBe(true);
    }
  });

  test('governs project TSX additions and ignores deleted legacy lines', async () => {
    const diff = [
      'diff --git a/projects/active/demo/view.tsx b/projects/active/demo/view.tsx',
      '--- a/projects/active/demo/view.tsx',
      '+++ b/projects/active/demo/view.tsx',
      '@@ -7 +7,2 @@',
      '-export function old(accountId: string) {}', // brand-ok — detector fixture
      '+export function next(accountId: AccountId) {}',
      '+export function unsafe(sessionId: string) {}', // brand-ok — detector fixture
    ].join('\n');

    const rows = await addedLineBrandViolations(diff);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      file: 'projects/active/demo/view.tsx',
      line: 8,
    });
    expect(rows[0]?.text).toContain('sessionId');
    expect(rows[0]?.text).toContain('SessionId');
  });

  test('honors explicit brand-ok on a wrapped next line', async () => {
    const diff = [
      'diff --git a/projects/active/demo/wire.ts b/projects/active/demo/wire.ts',
      '--- a/projects/active/demo/wire.ts',
      '+++ b/projects/active/demo/wire.ts',
      '@@ -0,0 +1,2 @@',
      '+export function provider(id: string) {}', // brand-ok — detector fixture
      '+// brand-ok — opaque provider primary key',
    ].join('\n');

    expect(await addedLineBrandViolations(diff)).toEqual([]);
  });

  test('reports every ID-shaped binding on one added line', async () => {
    const diff = [
      'diff --git a/lib/example.ts b/lib/example.ts',
      '--- a/lib/example.ts',
      '+++ b/lib/example.ts',
      '@@ -0,0 +1 @@',
      '+export function unsafe(userId: string, requestId: string) {}', // brand-ok — detector fixture
    ].join('\n');

    const rows = await addedLineBrandViolations(diff);
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.text)).toEqual([
      expect.stringContaining('userId'),
      expect.stringContaining('requestId'),
    ]);
  });

  test('summarizes warning-only project legacy by project and file', () => {
    const rows = projectLegacyAttribution([
      {
        file: 'projects/active/enterprise/alpha/src/a.ts',
        reason: 'legacy project inventory (warning-only)',
      },
      {
        file: 'projects/active/enterprise/alpha/src/a.ts',
        reason: 'legacy project inventory (warning-only)',
      },
      {
        file: 'projects/active/sports-terminal-os/src/b.ts',
        reason: 'legacy project inventory (warning-only)',
      },
      {
        file: 'lib/example.ts',
        reason: 'legacy baseline',
      },
    ]);

    expect(rows).toEqual([
      {
        project: 'projects/active/enterprise/alpha',
        hits: 2,
        files: 1,
        topFiles: [
          {
            path: 'projects/active/enterprise/alpha/src/a.ts',
            hits: 2,
          },
        ],
      },
      {
        project: 'projects/active/sports-terminal-os',
        hits: 1,
        files: 1,
        topFiles: [
          {
            path: 'projects/active/sports-terminal-os/src/b.ts',
            hits: 1,
          },
        ],
      },
    ]);
  });
});
