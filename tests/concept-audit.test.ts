// @see https://bun.com/docs/test — bun:test
import { afterEach, describe, expect, test } from 'bun:test';

import {
  conceptCategoryOf,
  filterDetailRows,
  parseConceptAuditOptions,
  runConceptAudit,
  sortDetailRows,
  type ConceptAuditDetailRow,
} from '../scripts/concept-audit.ts';

const ENV_KEYS = [
  'CONCEPT_WATCH_PATHS',
  'WATCH_PATHS',
  'CONCEPT_AUDIT_STRICT',
  'CONCEPT_AUDIT_QUIET',
  'CONCEPT_AUDIT_OUTPUT',
  'CONCEPT_AUDIT_FILTER',
  'CONCEPT_AUDIT_GROUP',
  'CONCEPT_AUDIT_CATEGORY',
  'CONCEPT_AUDIT_BOARD',
  'CONCEPT_AUDIT_SORT',
  'CONCEPT_AUDIT_DESC',
  'CONCEPT_AUDIT_SHOW_UNUSED',
  'CONCEPT_AUDIT_SHOW_USED',
  'CONCEPT_AUDIT_SHOW_DEPRECATED',
  'CONCEPT_AUDIT_SHOW_ORPHANS',
  'CONCEPT_AUDIT_MIN_USAGE',
  'CONCEPT_AUDIT_MAX_USAGE',
  'CONCEPT_AUDIT_PROVENANCE',
  'CONCEPT_AUDIT_OUTPUT_HEADERS',
  'CONCEPT_AUDIT_WATCH_POLL',
  'CONCEPT_AUDIT_WATCH_DELAY_MS',
  'CONCEPT_AUDIT_VERBOSE',
] as const;

const savedEnv = new Map<string, string | undefined>();

function clearConceptEnv(): void {
  for (const key of ENV_KEYS) {
    if (!savedEnv.has(key)) savedEnv.set(key, Bun.env[key]);
    delete Bun.env[key];
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const prev = savedEnv.get(key);
    if (prev === undefined) delete Bun.env[key];
    else Bun.env[key] = prev;
  }
  savedEnv.clear();
});

describe('concept:audit', () => {
  test('parses watch, strict, and filter flags', () => {
    clearConceptEnv();
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
    expect(opts.boards).toEqual(['partner-history']);
    expect(opts.output).toBe('json');
    expect(opts.quiet).toBe(true);
  });

  test('reads CONCEPT_AUDIT_* env with CLI override', () => {
    clearConceptEnv();
    Bun.env.CONCEPT_AUDIT_STRICT = '1';
    Bun.env.CONCEPT_AUDIT_OUTPUT = 'markdown';
    Bun.env.CONCEPT_AUDIT_FILTER = 'active,deprecated';
    Bun.env.CONCEPT_AUDIT_GROUP = 'ops.metric,ops.filter';
    Bun.env.CONCEPT_AUDIT_SORT = 'usage';
    Bun.env.CONCEPT_AUDIT_DESC = '1';
    Bun.env.CONCEPT_AUDIT_SHOW_UNUSED = '1';
    Bun.env.CONCEPT_AUDIT_MIN_USAGE = '2';
    Bun.env.CONCEPT_AUDIT_MAX_USAGE = '50';
    Bun.env.CONCEPT_AUDIT_PROVENANCE = 'missing';
    Bun.env.CONCEPT_AUDIT_OUTPUT_HEADERS = 'id,usage,provenance';
    Bun.env.CONCEPT_AUDIT_WATCH_DELAY_MS = '500';
    Bun.env.CONCEPT_WATCH_PATHS = 'lib/portal/semantic-vocabulary.ts,public/portal';

    const fromEnv = parseConceptAuditOptions(['bun', 'scripts/concept-audit.ts']);
    expect(fromEnv.strict).toBe(true);
    expect(fromEnv.output).toBe('markdown');
    expect(fromEnv.statuses).toEqual(['active', 'deprecated']);
    expect(fromEnv.groups).toEqual(['ops.metric', 'ops.filter']);
    expect(fromEnv.sort).toBe('usage');
    expect(fromEnv.sortDesc).toBe(true);
    expect(fromEnv.unusedOnly).toBe(true);
    expect(fromEnv.minUsage).toBe(2);
    expect(fromEnv.maxUsage).toBe(50);
    expect(fromEnv.provenanceFilter).toBe('missing');
    expect(fromEnv.outputHeaders).toEqual(['id', 'usage', 'provenance']);
    expect(fromEnv.watchDelayMs).toBe(500);
    expect(fromEnv.watchPaths.some(p => p.endsWith('lib/portal/semantic-vocabulary.ts'))).toBe(
      true
    );

    // CLI wins
    const mixed = parseConceptAuditOptions([
      'bun',
      'scripts/concept-audit.ts',
      '--output',
      'json',
      '--sort',
      'id',
    ]);
    expect(mixed.output).toBe('json');
    expect(mixed.sort).toBe('id');
    expect(mixed.strict).toBe(true); // still from env
  });

  test('filterDetailRows and sortDetailRows apply AND filters', () => {
    const rows: ConceptAuditDetailRow[] = [
      {
        id: 'ops.metric.a',
        label: 'A',
        group: 'ops.metric',
        category: 'ops',
        status: 'active',
        provenance: 'legacy',
        usage: 3,
        kind: 'used',
      },
      {
        id: 'ops.filter.b',
        label: 'B',
        group: 'ops.filter',
        category: 'ops',
        status: 'active',
        provenance: '',
        usage: 0,
        kind: 'unused',
      },
      {
        id: 'ui.semantic.tone',
        label: 'Tone',
        group: 'ui.semantic',
        category: 'ui',
        status: 'active',
        provenance: 'legacy',
        usage: 0,
        kind: 'unused',
      },
      {
        id: 'ops.metric.old',
        label: 'Old',
        group: 'ops.metric',
        category: 'ops',
        status: 'deprecated',
        provenance: 'x',
        usage: 1,
        kind: 'used',
      },
    ];

    const filtered = filterDetailRows(rows, {
      statuses: ['active'],
      groups: ['ops.metric', 'ops.filter'],
      categories: [],
      unusedOnly: true,
      usedOnly: false,
      showDeprecated: false,
      minUsage: 0,
      maxUsage: 9999,
      provenanceFilter: 'missing',
    });
    expect(filtered.map(r => r.id)).toEqual(['ops.filter.b']);

    const sorted = sortDetailRows(
      [
        { ...rows[0]!, usage: 1 },
        { ...rows[1]!, usage: 9 },
      ],
      'usage',
      true
    );
    expect(sorted[0]!.usage).toBe(9);
  });

  test('conceptCategoryOf uses first id segment', () => {
    expect(conceptCategoryOf('ops.metric.foo')).toBe('ops');
    expect(conceptCategoryOf('ui.semantic.tone')).toBe('ui');
  });

  test('one-shot strict audit passes on current vocabulary', async () => {
    clearConceptEnv();
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
    expect(report.details.length).toBeGreaterThan(0);
    // Partner-history chrome is surface-only by design (glossary collapse).
    expect(report.surfaceOnly.some(id => id.startsWith('ops.metric.'))).toBe(true);
  });

  test('unused filter lists only zero-UI concepts', async () => {
    clearConceptEnv();
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
    expect(report.details.every(r => r.kind !== 'used')).toBe(true);
  });

  test('env SHOW_USED + CATEGORY filters detail rows', async () => {
    clearConceptEnv();
    Bun.env.CONCEPT_AUDIT_SHOW_USED = '1';
    Bun.env.CONCEPT_AUDIT_CATEGORY = 'ui';
    Bun.env.CONCEPT_AUDIT_SORT = 'usage';
    Bun.env.CONCEPT_AUDIT_DESC = '1';
    const report = await runConceptAudit(
      parseConceptAuditOptions(['bun', 'scripts/concept-audit.ts', '--output', 'json', '--quiet'])
    );
    expect(report.details.every(r => r.category === 'ui')).toBe(true);
    expect(report.details.every(r => r.kind === 'used')).toBe(true);
    for (let i = 1; i < report.details.length; i++) {
      expect(report.details[i - 1]!.usage).toBeGreaterThanOrEqual(report.details[i]!.usage);
    }
  });
});
