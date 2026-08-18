import { describe, expect, test } from 'bun:test';
import {
  buildBunApiRemediationPlan,
  formatBunApiRemediationPlan,
} from '../tools/bun-api-remediation-plan.ts';

const runtime = { bunVersion: '1.3.14', bunRevision: 'test-revision' };

describe('Bun API remediation plan', () => {
  test('links documented gaps without proposing source edits', () => {
    const plan = buildBunApiRemediationPlan({
      version: 2,
      runtime,
      targets: ['fixture.ts'],
      scannedFileCount: 1,
      occurrenceCount: 1,
      findingCount: 1,
      affectedFileCount: 1,
      findings: [
        {
          surface: 'namespace',
          member: 'sliceAnsi',
          file: 'fixture.ts',
          line: 3,
          column: 5,
          occurrences: 1,
        },
      ],
    });

    expect(plan.items[0]).toMatchObject({
      api: 'Bun.sliceAnsi',
      classification: 'documented-runtime-gap',
      action: 'pin-or-upgrade-runtime',
      canonicalUrl: 'https://bun.com/reference/bun/sliceAnsi',
    });
    expect(formatBunApiRemediationPlan(plan)).toContain('pin-or-upgrade-runtime');
  });

  test('keeps unknown or module-export gaps manual', () => {
    const plan = buildBunApiRemediationPlan({
      version: 2,
      runtime,
      targets: ['fixture.ts'],
      scannedFileCount: 1,
      occurrenceCount: 2,
      findingCount: 2,
      affectedFileCount: 1,
      findings: [
        {
          surface: 'namespace',
          member: 'notInDocs',
          file: 'fixture.ts',
          line: 1,
          column: 5,
          occurrences: 1,
        },
        {
          surface: 'module-export',
          member: 'missingExport',
          file: 'fixture.ts',
          line: 2,
          column: 10,
          occurrences: 1,
        },
      ],
    });

    expect(plan.items.every(item => item.action === 'manual-review')).toBe(true);
    expect(plan.items.every(item => !item.canonicalUrl)).toBe(true);
  });
});
