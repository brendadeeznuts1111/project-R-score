import { describe, expect, test } from 'bun:test';

import {
  analyzeBrandCoverage,
  analyzeProjectBrandAdoption,
  inferProjectRoot,
  stripSourceComments,
  type BrandCoverageFile,
} from '../tools/brand-coverage.ts';

function row(
  rows: ReturnType<typeof analyzeBrandCoverage>,
  name: string
): ReturnType<typeof analyzeBrandCoverage>[number] {
  const found = rows.find(candidate => candidate.name === name);
  if (!found) throw new Error(`missing coverage row: ${name}`);
  return found;
}

describe('brand coverage reporter', () => {
  test('separates references, construction tiers, and guards', () => {
    const files: BrandCoverageFile[] = [
      {
        path: 'lib/example.ts',
        text: `
          import { asSessionId, parseSessionId, type AccountId } from './types/branded';
          const a = asSessionId('session-1');
          const b = parseSessionId(raw);
          function load(accountId: AccountId) { return accountId; }
        `,
      },
      {
        path: 'lib/guard.ts',
        text: `
          if (BRAND_GUARDS.isStateCode(value)) return value;
          if (isBrandedValue('StateCode', other)) return other;
        `,
      },
      {
        path: 'projects/active/example/src/session.ts',
        project: 'projects/active/example',
        text: `
          import { asSessionId } from '../../../../lib/types/branded.ts';
          const projectSession = asSessionId('project-session');
        `,
      },
    ];

    const rows = analyzeBrandCoverage(files);
    expect(rows).toHaveLength(58);
    expect(row(rows, 'SessionId')).toMatchObject({
      references: 0,
      asCalls: 2,
      parseCalls: 1,
      constructionCalls: 3,
      status: 'covered',
    });
    expect(row(rows, 'SessionId').scopes).toMatchObject({
      spine: { asCalls: 1, parseCalls: 1 },
      projects: { asCalls: 1, parseCalls: 0 },
    });
    expect(row(rows, 'AccountId')).toMatchObject({
      references: 2,
      constructionCalls: 0,
      status: 'referenced-unconstructed',
    });
    expect(row(rows, 'StateCode')).toMatchObject({
      guardCalls: 2,
      status: 'covered',
    });
    expect(row(rows, 'ZipCode').status).toBe('unused');
  });

  test('reports touched files once per brand', () => {
    const rows = analyzeBrandCoverage([
      {
        path: 'lib/session.ts',
        text: `asSessionId('a'); asSessionId('b');`,
      },
    ]);

    expect(row(rows, 'SessionId').files).toEqual(['lib/session.ts']);
  });

  test('ignores brand names in comments while preserving generic guard string literals', () => {
    const source = stripSourceComments(`
      // RunId is not used here.
      const note = "keep // inside strings";
      /* ResourceId is prose. */
      isBrandedValue('StateCode', value);
    `);
    const rows = analyzeBrandCoverage([{ path: 'lib/commented.ts', text: source }]);

    expect(row(rows, 'RunId').status).toBe('unused');
    expect(row(rows, 'ResourceId').status).toBe('unused');
    expect(row(rows, 'StateCode').guardCalls).toBe(1);
    expect(source).toContain('keep // inside strings');
  });

  test('rolls canonical usage up by catalogued project', () => {
    const files: BrandCoverageFile[] = [
      {
        path: 'projects/active/adopted/src/index.ts',
        project: 'projects/active/adopted',
        text: `
          import { asSessionId } from '../../../../lib/types/branded.ts';
          export const id = asSessionId('session');
        `,
      },
      {
        path: 'projects/active/legacy/src/index.ts',
        project: 'projects/active/legacy',
        text: `
          declare const localBrand: unique symbol;
          export type LocalItemId = string & { readonly [localBrand]: true };
        `,
      },
    ];
    const projects = analyzeProjectBrandAdoption(files, [
      'projects/active/adopted',
      'projects/active/legacy',
      'projects/active/external',
    ]);

    expect(projects).toEqual([
      expect.objectContaining({
        project: 'projects/active/adopted',
        status: 'adopted',
        brands: ['SessionId'],
      }),
      expect.objectContaining({
        project: 'projects/active/legacy',
        status: 'local-pattern',
        localBrandTypes: ['LocalItemId'],
      }),
      expect.objectContaining({
        project: 'projects/active/external',
        status: 'external-or-untracked',
      }),
    ]);
  });

  test('infers top-level, category, and experimental product roots', () => {
    expect(
      inferProjectRoot('projects/active/sports-terminal-os/src/middleware/security.ts')
    ).toBe('projects/active/sports-terminal-os');
    expect(
      inferProjectRoot('projects/active/utilities/proton-pass/src/brands.ts')
    ).toBe('projects/active/utilities/proton-pass');
    expect(inferProjectRoot('projects/experimental/2048/src/index.ts')).toBe(
      'projects/experimental/2048'
    );
    expect(inferProjectRoot('lib/types/branded.ts')).toBeUndefined();
    expect(inferProjectRoot('projects/active/analysis/README.md')).toBeUndefined();
  });
});
