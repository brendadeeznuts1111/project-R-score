// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  parseConceptAuditOptions,
  runConceptAudit,
} from '../scripts/concept-audit.ts';

describe('concept:audit', () => {
  test('parses watch, strict, and filter flags', () => {
    const opts = parseConceptAuditOptions([
      'bun',
      'scripts/concept-audit.ts',
      '--strict',
      '--watch-poll',
      '--unused',
      '--board',
      'partner-history',
      '--output',
      'json',
      '--quiet',
    ]);
    expect(opts.strict).toBe(true);
    expect(opts.watchPoll).toBe(true);
    expect(opts.unusedOnly).toBe(true);
    expect(opts.board).toBe('partner-history');
    expect(opts.output).toBe('json');
    expect(opts.quiet).toBe(true);
  });

  test('one-shot strict audit passes on current vocabulary', async () => {
    const report = await runConceptAudit(
      parseConceptAuditOptions([
        'bun',
        'scripts/concept-audit.ts',
        '--strict',
        '--output',
        'json',
        '--quiet',
      ])
    );
    expect(report.ok).toBe(true);
    expect(report.summary.totalPortal).toBeGreaterThan(0);
    expect(report.summary.withProvenance).toBe(report.summary.totalPortal);
    expect(report.summary.surfaceOrphans).toBe(0);
    expect(report.summary.bakeDrift).toBe(0);
    expect(report.boards.length).toBeGreaterThan(0);
    // Partner-history chrome is surface-only by design (glossary collapse).
    expect(report.surfaceOnly.some(id => id.startsWith('ops.metric.'))).toBe(true);
  });

  test('unused filter lists only zero-UI concepts', async () => {
    const report = await runConceptAudit(
      parseConceptAuditOptions([
        'bun',
        'scripts/concept-audit.ts',
        '--unused',
        '--output',
        'json',
      ])
    );
    expect(report.unused.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(report.unused.every(id => !id.startsWith('ops.metric.'))).toBe(true);
  });
});
