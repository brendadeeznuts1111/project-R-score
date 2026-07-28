import { describe, expect, test } from 'bun:test';

import {
  analyzeBrandCoverage,
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
    ];

    const rows = analyzeBrandCoverage(files);
    expect(rows).toHaveLength(47);
    expect(row(rows, 'SessionId')).toMatchObject({
      references: 0,
      asCalls: 1,
      parseCalls: 1,
      constructionCalls: 2,
      status: 'covered',
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
});
