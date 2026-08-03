// validate-surface-coverage.test.ts — cross-page surface-coverage gate.

import { describe, expect, test } from 'bun:test';
import {
  collectUsedConcepts,
  validateSurfaceCoverage,
  type SurfaceCoverageResult,
} from '../scripts/validate-surface-coverage';

describe('validateSurfaceCoverage', () => {
  test('empty results pass', () => {
    expect(validateSurfaceCoverage([])).toEqual([]);
  });

  test('orphans and unknowns flatten into issues', () => {
    const results: SurfaceCoverageResult[] = [
      { surface: 'partners', orphans: ['ops.metric.new_thing'], unknown: [], unwired: [], broken: [] },
      { surface: 'limits', orphans: [], unknown: ['invented.concept'], unwired: [], broken: [] },
    ];
    const issues = validateSurfaceCoverage(results);
    expect(issues).toEqual([
      'ORPHAN: "ops.metric.new_thing" used in partners but not in the surface allowlist',
      'UNKNOWN: "invented.concept" used in limits but not in the canonical glossary',
    ]);
  });
});

describe('collectUsedConcepts', () => {
  test('literal markers, shorthand resolution, and dynamic skips', async () => {
    const { PARTNER_HISTORY_GLOSSARY } = (await import(
      '../public/portal/partner-history/glossary-map.js'
    )) as { PARTNER_HISTORY_GLOSSARY: Record<string, string> };
    const shorthand = (key: string) => PARTNER_HISTORY_GLOSSARY[key];
    const text = `
      <div data-glossary-concept="ops.limits.account"></div>
      <div data-glossary-concept="\${G.raises}"></div>
      <div data-glossary-concept="\${PARTNER_HISTORY_GLOSSARY.visibleChanges}"></div>
      <div data-glossary-concept="\${book.typeGlossaryId}"></div>
      <div data-glossary-concept="\${isMasked ? G.a : G.b}"></div>
    `;
    const { used, dynamic } = collectUsedConcepts(text, shorthand);
    expect([...used].sort()).toEqual([
      'ops.limits.account',
      'ops.limits.change_direction', // G.raises maps here
      'section.recentLimitChanges', // MAP.visibleChanges maps here
    ]);
    expect(dynamic).toBe(2); // ${book.typeGlossaryId} + the ternary
  });
});

void 0;

void 0;
