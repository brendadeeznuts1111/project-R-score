// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  categorizeOrphanHref,
  collectSeveritySortedErrors,
  compareProbeErrorsBySeverity,
  formatByteSize,
  formatOrphanDetail,
  groupOrphanHrefs,
  parseWeaveColumns,
  parseWeaveOptions,
  selectUnexpectedOrphans,
  renderWeaveMatrix,
  renderWeaveSeeAlso,
  renderWeaveSummary,
  summarizeWeaveGroups,
  weaveShortcode,
  type WeaveProbeRow,
} from '../lib/verification/pages-edge-weave.ts';

function row(
  partial: Pick<WeaveProbeRow, 'group' | 'path' | 'status' | 'latencyMs' | 'detail'> &
    Partial<WeaveProbeRow>
): WeaveProbeRow {
  return {
    httpStatus: partial.httpStatus ?? (partial.status === 'pass' ? 200 : 404),
    sizeBytes: partial.sizeBytes ?? 100,
    contentType: partial.contentType ?? 'application/json',
    ...partial,
  };
}

describe('pages-edge-weave options', () => {
  test('parseWeaveOptions defaults', () => {
    const opts = parseWeaveOptions(['bun', 'tools/verify-pages-edge.ts', '--weave']);
    expect(opts.retries).toBe(3);
    expect(opts.backoffMs).toBe(1000);
    expect(opts.output).toBe('table');
    expect(opts.summaryOnly).toBe(false);
    expect(opts.orphansMode).toBe('group');
    expect(opts.subdomainsConfig).toBe('config/subdomains.json');
    expect(opts.columns).toContain('httpStatus');
    expect(opts.correlationId.length).toBeGreaterThan(8);
    expect(opts.checks).toEqual({
      surfaces: true,
      artifacts: true,
      docs: true,
      meta: true,
      orphans: true,
      subdomains: true,
    });
  });

  test('parseWeaveOptions --no-subdomains and --columns', () => {
    expect(parseWeaveOptions(['--weave', '--no-subdomains']).checks.subdomains).toBe(false);
    const cols = parseWeaveOptions([
      '--weave',
      '--columns',
      'path,group,latency',
    ]);
    expect(cols.columns).toEqual(['path', 'group', 'latency']);
    expect(parseWeaveColumns('path,nope,detail')).toEqual(['path', 'detail']);
  });

  test('parseWeaveOptions reads retries backoff output correlation-id summary and toggles', () => {
    const opts = parseWeaveOptions([
      'bun',
      'tools/verify-pages-edge.ts',
      '--weave',
      '--retries',
      '5',
      '--backoff',
      '250',
      '--output',
      'json',
      '--summary',
      '--correlation-id',
      'run-abc',
      '--no-orphans',
      '--no-docs',
    ]);
    expect(opts.retries).toBe(5);
    expect(opts.backoffMs).toBe(250);
    expect(opts.output).toBe('json');
    expect(opts.summaryOnly).toBe(true);
    expect(opts.correlationId).toBe('run-abc');
    expect(opts.orphansMode).toBe('off');
    expect(opts.checks.orphans).toBe(false);
    expect(opts.checks.docs).toBe(false);
    expect(opts.checks.surfaces).toBe(true);
  });

  test('parseWeaveOptions --orphans modes', () => {
    expect(parseWeaveOptions(['--weave', '--orphans=report']).orphansMode).toBe('report');
    expect(parseWeaveOptions(['--weave', '--orphans=group']).orphansMode).toBe('group');
    expect(parseWeaveOptions(['--weave', '--orphans=warn']).orphansMode).toBe('warn');
    const spaced = parseWeaveOptions(['--weave', '--orphans', 'off']);
    expect(spaced.orphansMode).toBe('off');
    expect(spaced.checks.orphans).toBe(false);
  });

  test('retries floor is 1', () => {
    const opts = parseWeaveOptions(['--weave', '--retries', '0']);
    expect(opts.retries).toBe(1);
  });

  test('weaveShortcode strips non-alnum and truncates to 8', () => {
    expect(weaveShortcode('run-1')).toBe('run1');
    expect(weaveShortcode('0193abcd-ef01-7000-8000-abcdef012345')).toBe('0193abcd');
  });

  test('formatByteSize and WEAVE_DASHBOARD_URL see also', () => {
    expect(formatByteSize(500)).toBe('500 B');
    expect(formatByteSize(2048)).toBe('2.0 KB');
    const prev = Bun.env.WEAVE_DASHBOARD_URL;
    Bun.env.WEAVE_DASHBOARD_URL = 'https://example.test/portal/dashboard/';
    try {
      const out = renderWeaveSeeAlso('https://project-r-score.pages.dev');
      expect(out).toContain('Dashboard:');
      expect(out).toContain('https://example.test/portal/dashboard/');
    } finally {
      if (prev === undefined) delete Bun.env.WEAVE_DASHBOARD_URL;
      else Bun.env.WEAVE_DASHBOARD_URL = prev;
    }
  });
});

describe('pages-edge-weave orphan categories', () => {
  test('categorizeOrphanHref maps known paths', () => {
    expect(categorizeOrphanHref('/registry/portal-weave.json')).toBe(
      'Shared / Cross-cutting state'
    );
    expect(categorizeOrphanHref('/registry/compliance-shadow.json')).toBe('Compliance & Audit');
    expect(categorizeOrphanHref('/registry/vault-map.json')).toBe('Infrastructure & Vault');
    expect(categorizeOrphanHref('/registry/telegram-handshake-catalog.json')).toBe(
      'Telegram & Partners'
    );
    expect(categorizeOrphanHref('/registry/limit-raises.json')).toBe('Skills & Registry Ops');
    expect(categorizeOrphanHref('/registry/tennis/agent-auth.json')).toBe('Script-only / Misc');
  });

  test('groupOrphanHrefs preserves category order and omits empty buckets', () => {
    const buckets = groupOrphanHrefs([
      '/registry/monitoring.json',
      '/registry/brand-keymap.json',
      '/registry/dod-queue.json',
    ]);
    expect(buckets.map(b => b.label)).toEqual([
      'Shared / Cross-cutting state',
      'Compliance & Audit',
      'Script-only / Misc',
    ]);
    expect(buckets[0]?.hrefs).toEqual(['/registry/brand-keymap.json']);
  });

  test('formatOrphanDetail group mode prints inventory', () => {
    const out = formatOrphanDetail(
      [{ href: '/registry/static.json' }, { href: '/registry/formdata-proof.json' }],
      'group'
    );
    expect(out).toContain('2 unlinked (group):');
    expect(out).toContain('Shared / Cross-cutting state (1):');
    expect(out).toContain('Script-only / Misc (1):');
    expect(out).toContain('/registry/static.json');
  });

  test('selectUnexpectedOrphans skips intentional purposes', () => {
    const linked = new Set(['/registry/ops-summary.json']);
    const { unexpected, intentional } = selectUnexpectedOrphans(
      [
        { href: '/registry/ops-summary.json', purpose: 'ui' },
        { href: '/registry/portal-weave.json', purpose: 'shared' },
        { href: '/registry/mystery.json' },
        { href: '/registry/proof-taxonomy-audit.json', purpose: 'audit' },
      ],
      linked
    );
    expect(intentional.map(a => a.href)).toEqual([
      '/registry/portal-weave.json',
      '/registry/proof-taxonomy-audit.json',
    ]);
    expect(unexpected.map(a => a.href)).toEqual(['/registry/mystery.json']);
  });
});

describe('pages-edge-weave matrix', () => {
  const sampleRows: WeaveProbeRow[] = [
    row({
      group: 'surfaces',
      path: '/portal/',
      status: 'pass',
      latencyMs: 10,
      sizeBytes: 1024,
      detail: '200',
    }),
    row({
      group: 'surfaces',
      path: '/portal/ops/',
      status: 'fail',
      latencyMs: 20,
      sizeBytes: 0,
      detail: '404',
    }),
    row({
      group: 'artifacts',
      path: '/registry/x.json',
      status: 'pass',
      latencyMs: 5,
      sizeBytes: 2048,
      detail: '200',
    }),
  ];

  test('renderWeaveMatrix includes group headers, per-row group, and TOTAL', () => {
    const out = renderWeaveMatrix(sampleRows);
    expect(out).toContain('surfaces');
    expect(out).toContain('/portal/');
    expect(out).toContain('TOTAL');
    expect(out).toContain('artifacts');
    expect(out).toContain('httpStatus');
  });

  test('summarizeWeaveGroups and renderWeaveSummary include latency size errors', () => {
    const groups = summarizeWeaveGroups(sampleRows);
    const surfaces = groups.find(g => g.group === 'surfaces');
    expect(surfaces?.pass).toBe(1);
    expect(surfaces?.fail).toBe(1);
    expect(surfaces?.avgLatencyMs).toBe(15);
    expect(surfaces?.maxLatencyMs).toBe(20);
    expect(surfaces?.totalSizeBytes).toBe(1024);
    expect(surfaces?.errors[0]).toBe('404 on /portal/ops/');
    const total = groups.find(g => g.group === 'TOTAL');
    expect(total?.passPct).toBe(67);
    expect(total?.totalSizeBytes).toBe(3072);
    const out = renderWeaveSummary(groups);
    expect(out).toContain('avg latency');
    expect(out).toContain('total size');
    expect(out).toContain('errors');
  });

  test('collectSeveritySortedErrors orders 5xx before 4xx before unknown', () => {
    const fails: WeaveProbeRow[] = [
      row({
        group: 'surfaces',
        path: '/a',
        status: 'fail',
        httpStatus: 404,
        latencyMs: 1,
        detail: '404',
      }),
      row({
        group: 'surfaces',
        path: '/b',
        status: 'fail',
        httpStatus: 503,
        latencyMs: 1,
        detail: '503',
      }),
      row({
        group: 'surfaces',
        path: '/c',
        status: 'fail',
        httpStatus: 500,
        latencyMs: 1,
        detail: '500',
      }),
      row({
        group: 'surfaces',
        path: '/d',
        status: 'fail',
        httpStatus: null,
        latencyMs: 1,
        detail: 'unreachable',
      }),
    ];
    expect(collectSeveritySortedErrors(fails)).toEqual([
      '500 on /c',
      '503 on /b',
      '404 on /a',
    ]);
    expect(compareProbeErrorsBySeverity(fails[1]!, fails[0]!)).toBeLessThan(0);
  });
});

describe('verify-pages-edge --weave wiring', () => {
  test('tool imports weave module and documents flags', async () => {
    const text = await Bun.file('tools/verify-pages-edge.ts').text();
    expect(text).toContain('pages-edge-weave.ts');
    expect(text).toContain('runWeaveVerify');
    expect(text).toContain('parseWeaveOptions');
    expect(text).toContain('--retries');
    expect(text).toContain('--output table|json');
    expect(text).toContain('--summary');
    expect(text).toContain('--no-surfaces');
    expect(text).toContain('--correlation-id');
    expect(text).toContain('--orphans=group|report|warn|off');
    expect(text).toContain('--orphans=off');
    expect(text).toContain('--no-subdomains');
    expect(text).toContain('--columns');
  });

  test('package.json exposes verify:weave script', async () => {
    const pkg = (await Bun.file('package.json').json()) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.['verify:weave']).toBe('bun tools/verify-pages-edge.ts --weave');
  });

  test('domain sweep runs verify:weave gate', async () => {
    const text = await Bun.file('tools/domain-sweep.ts').text();
    expect(text).toContain("'verify:weave'");
    expect(text).toContain("'--weave'");
  });
});
