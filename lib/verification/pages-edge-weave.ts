// @see https://bun.com/blog/bun-v1.3.14#no-orphans — --no-orphans
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-fileurltopath — Bun.fileURLToPath
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Pages-edge weave consistency — portal-weave.json surface/artifact probes.
 *
 * CLI: `bun run verify:weave` · `bun tools/verify-pages-edge.ts --weave …`
 *
 * Flags: `--retries N` · `--backoff MS` · `--output table|json` · `--correlation-id <id>` · `--summary`
 *        `--columns path,group,httpStatus,latency,size,contentType,detail`
 * Orphans: `--orphans=group` (default) · `--orphans=report` · `--orphans=warn` · `--orphans=off` (alias: no-orphans flag)
 * Subdomains (default on): `--no-subdomains` · `--subdomains-config <path>` · `--all`
 * Toggles: `--no-surfaces` · `--no-artifacts` · `--no-docs` · `--no-meta` · no-orphans flag · `--no-subdomains`
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 * @see lib/http/portal-weave.ts
 * @see config/subdomains.json
 */

import { inspectTable, jsonOut } from '../console-depth.ts';
import { fileURLToPath } from '../bun-path-url.ts';
import { isIntentionalOrphanPurpose } from '../http/portal-weave.ts';
import { randomUUIDv7, sleep } from '../time.ts';
import { asCorrelationId, type CorrelationId } from '../types/branded.ts';
import {
  DEFAULT_SUBDOMAINS_CONFIG,
  loadSubdomainsConfig,
  runSubdomainProbes,
} from './pages-edge-weave-subdomains.ts';

export type WeaveCheckTier = 'core';

export type WeaveCheck = {
  name: string;
  ok: boolean;
  detail: string;
  tier: WeaveCheckTier;
};

export type WeaveProbeRow = {
  group: string;
  path: string;
  status: 'pass' | 'fail';
  httpStatus: number | null;
  latencyMs: number;
  sizeBytes: number;
  contentType: string;
  detail: string;
};

export type OrphansMode = 'off' | 'group' | 'warn' | 'report';

export type WeaveChecksToggle = {
  surfaces: boolean;
  artifacts: boolean;
  docs: boolean;
  meta: boolean;
  /** Warning-only orphan scan (never fails the run). False when orphansMode is `off`. */
  orphans: boolean;
  /** Cross-host probes from config/subdomains.json (default on). */
  subdomains: boolean;
};

export const WEAVE_DETAIL_COLUMNS = [
  'path',
  'group',
  'httpStatus',
  'latency',
  'size',
  'contentType',
  'detail',
] as const;

export type WeaveDetailColumn = (typeof WEAVE_DETAIL_COLUMNS)[number];

export type WeaveOptions = {
  retries: number;
  backoffMs: number;
  output: 'table' | 'json';
  /** When true, print only the group summary (no per-path matrix). */
  summaryOnly: boolean;
  correlationId: CorrelationId;
  /**
   * Orphan detail shape:
   * - `group` (default) — category inventory
   * - `report` — flat full path list
   * - `warn` — truncated preview
   * - `off` — skip check
   */
  orphansMode: OrphansMode;
  /** Probe matrix path (default config/subdomains.json). */
  subdomainsConfig: string;
  /** Detail-table columns (default WEAVE_DETAIL_COLUMNS). */
  columns: WeaveDetailColumn[];
  checks: WeaveChecksToggle;
};

/** Stable orphan categories — first matching pattern wins; remainder → Script-only / Misc. */
export const ORPHAN_CATEGORIES: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: 'Shared / Cross-cutting state',
    pattern:
      /\/(brand-keymap|domain-glossary|surfaces-state|verification-index|static|content-type-matrix|doc-index|portal-weave)(\.json)?$/,
  },
  {
    label: 'Compliance & Audit',
    pattern: /\/(compliance[^/]*|dod-queue|proof-taxonomy-audit)(\.json)?$/,
  },
  {
    label: 'Infrastructure & Vault',
    pattern:
      /\/(env-inventory|vault-health|vault-map|capability-map-subset|install-hygiene-report)(\.json)?$/,
  },
  {
    label: 'Telegram & Partners',
    pattern: /\/(telegram-handshake[^/]*|seat-capital-desk|partners-ops)(\.json)?$/,
  },
  {
    label: 'Skills & Registry Ops',
    pattern: /\/(skills-catalog|harness-skills-catalog|limit-raises|package-info)(\.json)?$/,
  },
];

export const ORPHAN_MISC_LABEL = 'Script-only / Misc';

export type OrphanCategoryBucket = {
  label: string;
  hrefs: string[];
};

/** Classify a registry href into an orphan category label. */
export function categorizeOrphanHref(href: string): string {
  for (const cat of ORPHAN_CATEGORIES) {
    if (cat.pattern.test(href)) return cat.label;
  }
  return ORPHAN_MISC_LABEL;
}

/** Group orphan hrefs in category order (empty buckets omitted). */
export function groupOrphanHrefs(hrefs: string[]): OrphanCategoryBucket[] {
  const buckets = new Map<string, string[]>();
  const order = [...ORPHAN_CATEGORIES.map(c => c.label), ORPHAN_MISC_LABEL];
  for (const label of order) buckets.set(label, []);
  for (const href of hrefs) {
    const label = categorizeOrphanHref(href);
    buckets.get(label)!.push(href);
  }
  return order
    .map(label => ({ label, hrefs: buckets.get(label) ?? [] }))
    .filter(b => b.hrefs.length > 0);
}

export type WeaveGroupSummary = {
  group: string;
  pass: number;
  fail: number;
  total: number;
  passPct: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  totalSizeBytes: number;
  errors: string[];
};

export type WeavePayload = {
  summary?: Record<string, number>;
  surfaces?: Array<{ id?: string; href?: string }>; // brand-ok — opaque wire DTO id
  artifacts?: Array<{
    id?: string; // brand-ok — opaque wire DTO id
    href?: string;
    purpose?: string; // brand-ok — wire purpose enum; filtered via isIntentionalOrphanPurpose
  }>;
  components?: Array<{ id?: string; path?: string }>; // brand-ok — opaque wire DTO id
  wiki?: Array<{ id?: string; href?: string }>; // brand-ok — opaque wire DTO id
  scripts?: Array<{ id?: string; label?: string; doc?: string }>; // brand-ok — opaque wire DTO id
  related?: Record<string, string>;
};

export type WeaveRunResult = {
  correlationId: CorrelationId;
  shortcode: string;
  timestamp: string;
  elapsedMs: number;
  base: string;
  checks: WeaveCheck[];
  rows: WeaveProbeRow[];
  groups: WeaveGroupSummary[];
  ok: boolean;
};

/** First 8 alphanumeric chars of correlationId for quick reference. */
export function weaveShortcode(correlationId: CorrelationId | string): string {
  const raw = String(correlationId);
  const compact = raw.replace(/[^a-zA-Z0-9]/g, '');
  return (compact || raw).slice(0, 8);
}

export function formatByteSize(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function emptyGroup(group: string): WeaveGroupSummary {
  return {
    group,
    pass: 0,
    fail: 0,
    total: 0,
    passPct: 0,
    avgLatencyMs: 0,
    maxLatencyMs: 0,
    totalSizeBytes: 0,
    errors: [],
  };
}

/** Severity band: 5xx > 4xx > 3xx > other/unknown (null). */
export function httpStatusSeverityBand(httpStatus: number | null): number {
  if (httpStatus == null) return 0;
  if (httpStatus >= 500) return 3;
  if (httpStatus >= 400) return 2;
  if (httpStatus >= 300) return 1;
  return 0;
}

/** Compare fail rows: higher severity band first; ascending status within band; path tie-break. */
export function compareProbeErrorsBySeverity(a: WeaveProbeRow, b: WeaveProbeRow): number {
  const band = httpStatusSeverityBand(b.httpStatus) - httpStatusSeverityBand(a.httpStatus);
  if (band !== 0) return band;
  const as = a.httpStatus ?? 0;
  const bs = b.httpStatus ?? 0;
  if (as !== bs) return as - bs;
  return a.path.localeCompare(b.path);
}

/** Deduped fail labels (`503 on /path`), 5xx before 4xx, capped at `limit`. */
export function collectSeveritySortedErrors(rows: WeaveProbeRow[], limit = 3): string[] {
  const fails = rows.filter(r => r.status === 'fail').sort(compareProbeErrorsBySeverity);
  const labels = fails.map(r => {
    const code = r.httpStatus == null ? '?' : String(r.httpStatus);
    return `${code} on ${r.path}`;
  });
  return [...new Set(labels)].slice(0, limit);
}

export function summarizeWeaveGroups(rows: WeaveProbeRow[]): WeaveGroupSummary[] {
  const map = new Map<string, WeaveProbeRow[]>();
  for (const r of rows) {
    const list = map.get(r.group) ?? [];
    list.push(r);
    map.set(r.group, list);
  }
  const groups: WeaveGroupSummary[] = [];
  for (const [group, items] of map) {
    const pass = items.filter(i => i.status === 'pass').length;
    const fail = items.length - pass;
    const latencies = items.map(i => i.latencyMs);
    groups.push({
      group,
      pass,
      fail,
      total: items.length,
      passPct: items.length > 0 ? Math.round((pass / items.length) * 100) : 0,
      avgLatencyMs:
        items.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / items.length) : 0,
      maxLatencyMs: items.length > 0 ? Math.max(...latencies) : 0,
      totalSizeBytes: items.reduce((s, i) => s + (i.sizeBytes || 0), 0),
      errors: collectSeveritySortedErrors(items),
    });
  }
  const pass = rows.filter(r => r.status === 'pass').length;
  const total = rows.length;
  const latencies = rows.map(r => r.latencyMs);
  groups.push({
    group: 'TOTAL',
    pass,
    fail: total - pass,
    total,
    passPct: total > 0 ? Math.round((pass / total) * 100) : 0,
    avgLatencyMs: total > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / total) : 0,
    maxLatencyMs: total > 0 ? Math.max(...latencies) : 0,
    totalSizeBytes: rows.reduce((s, r) => s + (r.sizeBytes || 0), 0),
    errors: collectSeveritySortedErrors(rows),
  });
  return groups.length === 1 ? [emptyGroup('TOTAL')] : groups;
}

/** Compact group pass/fail table with latency · size · errors (inspectTable). */
export function renderWeaveSummary(groups: WeaveGroupSummary[]): string {
  return inspectTable(
    groups.map(g => ({
      group: g.group,
      pass: g.pass,
      fail: g.fail,
      total: g.total,
      'pass %': `${g.passPct}%`,
      'avg latency': `${g.avgLatencyMs}ms`,
      'max latency': `${g.maxLatencyMs}ms`,
      'total size': formatByteSize(g.totalSizeBytes),
      errors: g.fail > 0 ? g.errors.join('; ') || `${g.fail} fail` : '-',
    })),
    [
      'group',
      'pass',
      'fail',
      'total',
      'pass %',
      'avg latency',
      'max latency',
      'total size',
      'errors',
    ],
    { colors: true }
  );
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function renderWeaveSeeAlso(base: string): string {
  const lines = [
    'See also',
    `  · Weave JSON: ${base}/registry/portal-weave.json`,
    `  · Portal:     ${base}/portal/`,
    '  · Docs:       docs/harness/tenants/cloudflare-pages.md',
  ];
  const dash = Bun.env.WEAVE_DASHBOARD_URL?.trim();
  if (dash) lines.splice(3, 0, `  · Dashboard:  ${dash}`);
  return lines.join('\n');
}

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (!v || v.startsWith('-')) return undefined;
  return v;
}

function argNumber(argv: string[], flag: string, fallback: number): number {
  const raw = argValue(argv, flag);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

const ORPHANS_MODES = new Set<OrphansMode>(['off', 'group', 'warn', 'report']);
const COLUMN_SET = new Set<string>(WEAVE_DETAIL_COLUMNS);

export function parseWeaveColumns(raw: string | undefined): WeaveDetailColumn[] {
  if (!raw?.trim()) return [...WEAVE_DETAIL_COLUMNS];
  const cols = raw
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)
    .filter((c): c is WeaveDetailColumn => COLUMN_SET.has(c));
  return cols.length > 0 ? cols : [...WEAVE_DETAIL_COLUMNS];
}

function parseOrphansMode(argv: string[]): OrphansMode {
  if (argv.includes('--no-orphans')) return 'off';
  const eq = argv.find(a => a.startsWith('--orphans='));
  if (eq) {
    const v = eq.slice('--orphans='.length) as OrphansMode;
    if (ORPHANS_MODES.has(v)) return v;
  }
  const spaced = argValue(argv, '--orphans') as OrphansMode | undefined;
  if (spaced && ORPHANS_MODES.has(spaced)) return spaced;
  return 'group';
}

/** Parse `--weave` companion flags from argv (defaults: retries=3, backoff=1000, output=table). */
export function parseWeaveOptions(argv: string[] = Bun.argv): WeaveOptions {
  const outputRaw = argValue(argv, '--output');
  const orphansMode = parseOrphansMode(argv);
  const subdomainsOff = argv.includes('--no-subdomains');
  return {
    retries: Math.max(1, argNumber(argv, '--retries', 3)),
    backoffMs: argNumber(argv, '--backoff', 1000),
    output: outputRaw === 'json' ? 'json' : 'table',
    summaryOnly: argv.includes('--summary'),
    correlationId: asCorrelationId(argValue(argv, '--correlation-id') ?? randomUUIDv7()),
    orphansMode,
    subdomainsConfig: argValue(argv, '--subdomains-config') ?? DEFAULT_SUBDOMAINS_CONFIG,
    columns: parseWeaveColumns(argValue(argv, '--columns')),
    checks: {
      surfaces: !argv.includes('--no-surfaces'),
      artifacts: !argv.includes('--no-artifacts'),
      docs: !argv.includes('--no-docs'),
      meta: !argv.includes('--no-meta'),
      orphans: orphansMode !== 'off',
      subdomains: !subdomainsOff,
    },
  };
}

/** Unlinked artifacts whose purpose is not intentional (shared|script|audit). */
export function selectUnexpectedOrphans<T extends { href?: string; purpose?: string }>(
  artifacts: T[],
  linked: ReadonlySet<string | undefined>
): { unexpected: T[]; intentional: T[] } {
  const unlinked = artifacts.filter(a => a.href && !linked.has(a.href));
  const intentional = unlinked.filter(a => isIntentionalOrphanPurpose(a.purpose));
  const unexpected = unlinked.filter(a => !isIntentionalOrphanPurpose(a.purpose));
  return { unexpected, intentional };
}

export function formatOrphanDetail(
  orphans: Array<{ href?: string }>,
  mode: Exclude<OrphansMode, 'off'>
): string {
  if (orphans.length === 0) return 'all artifacts linked';
  const hrefs = orphans.map(o => o.href).filter((h): h is string => Boolean(h));
  if (mode === 'report') {
    return `${hrefs.length} unlinked (report):\n${hrefs.map(h => `  ${h}`).join('\n')}`;
  }
  if (mode === 'group') {
    const buckets = groupOrphanHrefs(hrefs);
    const lines = [`${hrefs.length} unlinked (group):`];
    for (const b of buckets) {
      lines.push(`  ${b.label} (${b.hrefs.length}):`);
      for (const h of b.hrefs) lines.push(`    ${h}`);
    }
    return lines.join('\n');
  }
  const preview = hrefs.slice(0, 4).join(', ');
  return `${hrefs.length} unlinked (warn): ${preview}`;
}

async function check(name: string, fn: () => Promise<string | void>): Promise<WeaveCheck> {
  try {
    const detail = (await fn()) ?? 'ok';
    return { name, ok: true, detail, tier: 'core' };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e), tier: 'core' };
  }
}

function contentTypeOf(res: Response): string {
  return (res.headers.get('content-type') ?? '').split(';')[0]?.trim() || '';
}

function sizeOf(res: Response, body: ArrayBuffer): number {
  const cl = res.headers.get('content-length');
  if (cl) {
    const n = Number(cl);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return body.byteLength;
}

export type EdgeProbeOpts = {
  retries: number;
  backoffMs: number;
  /** Require parseable JSON object (also auto when Content-Type is application/json). */
  requireJson?: boolean;
  /** Accept Cloudflare Access 302 as success. */
  allowAccess?: boolean;
};

/** Single-fetch probe with retries; returns a full WeaveProbeRow (minus group — filled by caller). */
export async function probeEdgeHref(
  base: string,
  href: string,
  opts: EdgeProbeOpts
): Promise<Omit<WeaveProbeRow, 'group'>> {
  let lastErr: Error | undefined;
  const t0 = performance.now();
  const url = `${base}${href}`;
  for (let attempt = 0; attempt < opts.retries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      const location = res.headers.get('location') ?? '';
      const access = res.status === 302 && location.includes('cloudflareaccess');
      const contentType = contentTypeOf(res);
      const latencyMs = Math.round(performance.now() - t0);

      if (access) {
        if (!opts.allowAccess) {
          throw new Error(`${href} → 302 Access`);
        }
        return {
          path: href,
          status: 'pass',
          httpStatus: 302,
          latencyMs,
          sizeBytes: 0,
          contentType,
          detail: '302 Access',
        };
      }
      if (!res.ok) throw new Error(`${href} → ${res.status}`);

      const body = await res.arrayBuffer();
      const sizeBytes = sizeOf(res, body);
      const wantsJson =
        opts.requireJson || contentType.includes('application/json') || href.endsWith('.json');

      if (wantsJson) {
        try {
          const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
          if (parsed === null || typeof parsed !== 'object') {
            throw new Error('JSON not an object');
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`${href} → invalid JSON (${msg})`);
        }
      }

      return {
        path: href,
        status: 'pass',
        httpStatus: res.status,
        latencyMs,
        sizeBytes,
        contentType,
        detail: wantsJson ? `${res.status} json` : `${res.status}`,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt + 1 < opts.retries) {
        await sleep(opts.backoffMs * (attempt + 1));
      }
    }
  }
  return {
    path: href,
    status: 'fail',
    httpStatus: null,
    latencyMs: Math.round(performance.now() - t0),
    sizeBytes: 0,
    contentType: '',
    detail: (lastErr?.message ?? `${href} → unreachable`).slice(0, 48),
  };
}

function rowCells(
  item: WeaveProbeRow,
  columns: WeaveDetailColumn[]
): Record<string, string | number> {
  const all: Record<WeaveDetailColumn, string | number> = {
    path: item.path,
    group: item.group,
    httpStatus: item.httpStatus ?? '-',
    latency: `${item.latencyMs}ms`,
    size: formatByteSize(item.sizeBytes),
    contentType: item.contentType || '-',
    detail: item.detail,
  };
  const out: Record<string, string | number> = {};
  for (const c of columns) out[c] = all[c];
  return out;
}

/** Grouped coverage matrix over per-path probe rows (console-depth wrapper). */
export function renderWeaveMatrix(
  rows: WeaveProbeRow[],
  columns: WeaveDetailColumn[] = [...WEAVE_DETAIL_COLUMNS]
): string {
  const groups = new Map<string, WeaveProbeRow[]>();
  for (const r of rows) {
    const list = groups.get(r.group) ?? [];
    list.push(r);
    groups.set(r.group, list);
  }
  const tableRows: Array<Record<string, string | number>> = [];
  const pathKey = columns.includes('path') ? 'path' : columns[0]!;
  for (const [group, items] of groups) {
    const fail = items.filter(i => i.status === 'fail').length;
    const avg = Math.round(items.reduce((s, i) => s + i.latencyMs, 0) / items.length);
    const header: Record<string, string | number> = {};
    for (const c of columns) header[c] = '';
    header[pathKey] = `── ${group} ──`;
    if (columns.includes('group')) header.group = `(${items.length})`;
    if (columns.includes('detail')) {
      header.detail = fail === 0 ? `${items.length}✓` : `${fail}✗`;
    }
    if (columns.includes('latency')) header.latency = `${avg}ms avg`;
    tableRows.push(header);
    for (const item of items) {
      tableRows.push(rowCells(item, columns));
    }
  }
  const total = rows.length;
  const passed = rows.filter(r => r.status === 'pass').length;
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const footer: Record<string, string | number> = {};
  for (const c of columns) footer[c] = '';
  footer[pathKey] = 'TOTAL';
  if (columns.includes('group')) footer.group = `(${total})`;
  if (columns.includes('detail')) footer.detail = `${passed}✓ ${total - passed}✗ · ${rate}%`;
  tableRows.push(footer);
  return inspectTable(tableRows, [...columns], { colors: true });
}

function needsPortalWeave(checks: WeaveChecksToggle): boolean {
  return checks.surfaces || checks.artifacts || checks.docs || checks.meta || checks.orphans;
}

export async function runWeaveChecks(
  base: string,
  options: WeaveOptions
): Promise<{ checks: WeaveCheck[]; rows: WeaveProbeRow[] }> {
  const out: WeaveCheck[] = [];
  const rows: WeaveProbeRow[] = [];
  const retry: EdgeProbeOpts = {
    retries: options.retries,
    backoffMs: options.backoffMs,
    allowAccess: true,
  };

  let weave: WeavePayload | null = null;
  if (needsPortalWeave(options.checks)) {
    const res = await fetch(`${base}/registry/portal-weave.json`);
    if (!res.ok) throw new Error(`portal-weave.json → ${res.status}`);
    weave = (await res.json()) as WeavePayload;
  }

  const probeGroup = async (
    group: string,
    hrefs: Array<string | undefined>,
    requireJson = false
  ): Promise<{ detail: string; groupRows: WeaveProbeRow[] }> => {
    const targets = hrefs.filter((h): h is string => Boolean(h));
    const groupRows = await Promise.all(
      targets.map(async href => {
        const hit = await probeEdgeHref(base, href, { ...retry, requireJson });
        return { group, ...hit } satisfies WeaveProbeRow;
      })
    );
    const fails = groupRows.filter(r => r.status === 'fail').map(r => r.detail);
    if (fails.length) {
      return {
        detail: fails.slice(0, 4).join(' · '),
        groupRows,
      };
    }
    return { detail: `${targets.length}/${targets.length} reachable`, groupRows };
  };

  // Parallel network groups (surfaces · artifacts · components · subdomains)
  const networkJobs: Array<
    Promise<{ name: string; ok: boolean; detail: string; rows: WeaveProbeRow[] }>
  > = [];

  if (weave && options.checks.surfaces) {
    networkJobs.push(
      (async () => {
        const r = await probeGroup(
          'surfaces',
          (weave.surfaces ?? []).map(s => s.href)
        );
        const ok = r.groupRows.every(x => x.status === 'pass');
        return { name: 'weave surfaces', ok, detail: r.detail, rows: r.groupRows };
      })()
    );
  }

  if (weave && options.checks.artifacts) {
    networkJobs.push(
      (async () => {
        const r = await probeGroup(
          'artifacts',
          (weave.artifacts ?? []).map(a => a.href),
          true
        );
        const ok = r.groupRows.every(x => x.status === 'pass');
        return { name: 'weave artifacts', ok, detail: r.detail, rows: r.groupRows };
      })()
    );
    networkJobs.push(
      (async () => {
        const r = await probeGroup(
          'components',
          (weave.components ?? []).map(c => c.path)
        );
        const ok = r.groupRows.every(x => x.status === 'pass');
        return { name: 'weave components', ok, detail: r.detail, rows: r.groupRows };
      })()
    );
  }

  if (options.checks.subdomains) {
    networkJobs.push(
      (async () => {
        const cfg = await loadSubdomainsConfig(options.subdomainsConfig);
        const result = await runSubdomainProbes(cfg, {
          retries: options.retries,
          backoffMs: options.backoffMs,
        });
        return {
          name: 'weave subdomains',
          ok: result.ok,
          detail: result.detail,
          rows: result.rows,
        };
      })()
    );
  }

  const networkResults = await Promise.all(networkJobs);
  for (const r of networkResults) {
    rows.push(...r.rows);
    out.push({ name: r.name, ok: r.ok, detail: r.detail, tier: 'core' });
  }

  if (weave && options.checks.docs) {
    out.push(
      await check('weave script docs', async () => {
        const missing: string[] = [];
        for (const s of weave.scripts ?? []) {
          if (!s.doc) continue;
          const docPath = s.doc.startsWith('/') ? `${REPO_ROOT}${s.doc}` : `${REPO_ROOT}/${s.doc}`;
          if (!(await Bun.file(docPath).exists())) {
            missing.push(`${s.label ?? s.id}→${s.doc}`);
          }
        }
        if (missing.length) throw new Error(missing.slice(0, 4).join(' · '));
        const total = (weave.scripts ?? []).filter(s => s.doc).length;
        return `${total}/${total} doc paths exist`;
      })
    );
  }

  if (weave && options.checks.meta) {
    out.push(
      await check('weave meta counts', async () => {
        const s = weave.summary ?? {};
        const actual: Record<string, number> = {
          surfaces: weave.surfaces?.length ?? 0,
          artifacts: weave.artifacts?.length ?? 0,
          components: weave.components?.length ?? 0,
          wiki: weave.wiki?.length ?? 0,
          scripts: weave.scripts?.length ?? 0,
        };
        const mismatched = Object.entries(actual).filter(
          ([k, v]) => s[k] !== undefined && s[k] !== v
        );
        if (mismatched.length) {
          throw new Error(mismatched.map(([k, v]) => `${k}: summary ${s[k]}≠${v}`).join(' · '));
        }
        return Object.entries(actual)
          .map(([k, v]) => `${k}=${v}`)
          .join(' · ');
      })
    );
  }

  if (weave && options.checks.orphans) {
    const linked = new Set([
      ...(weave.surfaces ?? []).map(s => s.href),
      ...(weave.wiki ?? []).map(w => w.href),
      ...(weave.components ?? []).map(c => c.path),
      ...Object.values(weave.related ?? {}),
    ]);
    const { unexpected: orphans, intentional } = selectUnexpectedOrphans(
      weave.artifacts ?? [],
      linked
    );
    const mode = options.orphansMode === 'off' ? 'group' : options.orphansMode;
    let detail: string;
    if (orphans.length === 0) {
      detail = intentional.length
        ? `0 unexpected (${intentional.length} intentional purpose)`
        : 'all artifacts linked';
    } else {
      detail = formatOrphanDetail(orphans, mode);
      if (intentional.length) {
        detail += `\n  (${intentional.length} intentional purpose skipped)`;
      }
    }
    out.push({
      name: 'weave orphans',
      ok: true,
      detail,
      tier: 'core',
    });
  }

  return { checks: out, rows };
}

/** Run weave verify and print table or JSON. Returns process-style exit code 0|1. */
export async function runWeaveVerify(
  base: string,
  options?: WeaveOptions
): Promise<WeaveRunResult> {
  const opts = options ?? parseWeaveOptions();
  const t0 = performance.now();
  const timestamp = new Date().toISOString();
  const { checks, rows } = await runWeaveChecks(base, opts);
  const elapsedMs = Math.round(performance.now() - t0);
  const failed = checks.filter(c => !c.ok);
  const groups = summarizeWeaveGroups(rows);
  const shortcode = weaveShortcode(opts.correlationId);
  const result: WeaveRunResult = {
    correlationId: opts.correlationId,
    shortcode,
    timestamp,
    elapsedMs,
    base,
    checks,
    rows,
    groups,
    ok: failed.length === 0,
  };

  if (opts.output === 'json') {
    jsonOut(result);
    return result;
  }

  const pass = rows.filter(r => r.status === 'pass').length;
  console.log(
    `Weave verify · ${opts.correlationId} (${shortcode}) · ${timestamp} · ${formatElapsed(elapsedMs)}`
  );
  console.log(
    `base=${base} · retries=${opts.retries} · backoffMs=${opts.backoffMs} · probes=${rows.length} · ${pass}✓ ${rows.length - pass}✗`
  );
  for (const c of checks) {
    console.log(c.ok ? `✓ ${c.name}: ${c.detail}` : `✗ ${c.name}: ${c.detail}`);
  }
  console.log('\nSummary');
  console.log(renderWeaveSummary(groups));
  if (!opts.summaryOnly) {
    console.log(`\nDetails (${rows.length} probes)`);
    console.log(renderWeaveMatrix(rows, opts.columns));
  }
  console.log(`\n${renderWeaveSeeAlso(base)}`);
  if (!result.ok) {
    console.error(`\n❌ ${failed.length} weave check(s) failed`);
  } else {
    console.log('\n✅ Weave verify passed');
  }
  return result;
}
