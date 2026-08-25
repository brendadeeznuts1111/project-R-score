import { describe, expect, test } from 'bun:test';
import {
  classifyMigrationFindings,
  formatMigrationAudit,
  type ExpectedMigrationFinding,
  type MigrationFinding,
} from '../../scripts/bun-1.4-migration-audit.ts';

const EXPECTED: ExpectedMigrationFinding = {
  file: 'tests/bun-1.4.0-breaking-changes-contract.test.ts',
  ruleId: 'bun-1.4-no-recursive-rmdir',
  textIncludes: '.rmdirSync(',
};

const FINDING: MigrationFinding = {
  file: EXPECTED.file,
  line: 63,
  message: 'recursive rmdir was removed',
  ruleId: EXPECTED.ruleId,
  text: "require('node:fs').rmdirSync(dir, { recursive: true })",
};

describe('Bun 1.4 migration audit', () => {
  test('accepts the exact reviewed negative-contract finding', () => {
    const report = classifyMigrationFindings([FINDING], [EXPECTED]);
    expect(report).toMatchObject({
      ok: true,
      expected: [FINDING],
      missingExpected: [],
      unexpected: [],
    });
    expect(formatMigrationAudit(report)).toContain('Status: PASS');
  });

  test('fails closed when an expected finding disappears', () => {
    const report = classifyMigrationFindings([], [EXPECTED]);
    expect(report.ok).toBe(false);
    expect(report.missingExpected).toEqual([EXPECTED]);
    expect(formatMigrationAudit(report)).toContain('Stale expected findings');
  });

  test('fails closed for a new violation or duplicate expected match', () => {
    const unexpected = { ...FINDING, file: 'lib/http/legacy.ts', line: 10 };
    expect(classifyMigrationFindings([FINDING, unexpected], [EXPECTED]).unexpected).toEqual([
      unexpected,
    ]);
    expect(classifyMigrationFindings([FINDING, FINDING], [EXPECTED]).ok).toBe(false);
  });
});

