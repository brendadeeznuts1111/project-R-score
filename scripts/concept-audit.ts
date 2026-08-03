#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Unified concept audit — inventory + metadata + surface coverage.
 *
 *   bun run concept:audit
 *   bun run concept:audit -- --strict
 *   bun run concept:audit -- --watch
 *   bun run concept:audit -- --output json --quiet
 *
 * Env (CLI flags override when set):
 *   CONCEPT_WATCH_PATHS / WATCH_PATHS
 *   CONCEPT_AUDIT_STRICT · QUIET · OUTPUT · FILTER (status)
 *   CONCEPT_AUDIT_GROUP · DOMAIN · CATEGORY · BOARD · SORT · DESC
 *   CONCEPT_AUDIT_SHOW_UNUSED · SHOW_USED · SHOW_DEPRECATED · SHOW_ORPHANS
 *   CONCEPT_AUDIT_DOMAIN_SUMMARY · MIN_USAGE · MAX_USAGE · PROVENANCE
 *   CONCEPT_AUDIT_OUTPUT_HEADERS · WATCH_POLL · WATCH_DELAY_MS · VERBOSE
 *
 * Strict fails when metadata or surface-coverage gates fail, when used
 * concepts lack provenance, or when deprecated concepts still appear in
 * board HTML/JS. Unused / surface-only chrome are reported always;
 * `--strict-unused` also fails on portal concepts with zero UI hits
 * (excluding page.* catalog ids).
 *
 * Watch mode uses Bun.file mtime polling (no node:fs) — `--watch-poll` is
 * an alias kept for CLI compatibility.
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  countPortalConceptUsagesDetailed,
  type ConceptUsageBreakdown,
} from '../lib/portal/concept-usage.ts';
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPTS,
} from '../lib/portal/semantic-vocabulary.ts';
import {
  conceptGroupOf,
  parseConceptInventoryOptions,
  runConceptInventory,
} from '../tools/concept-inventory.ts';
import { runConceptMetadataValidation } from './validate-concept-metadata.ts';
import { scanSurfaceCoverage } from './validate-surface-coverage.ts';

const ROOT = `${import.meta.dir}/..`;

/** Default watch set — missing paths are skipped at collect time. */
const DEFAULT_WATCH_PATHS = [
  `${ROOT}/lib/portal/semantic-vocabulary.ts`,
  `${ROOT}/lib/portal/concept-usage.ts`,
  `${ROOT}/scripts/concept-metadata-baseline.json`,
  `${ROOT}/public/registry/domain-glossary.json`,
  `${ROOT}/public/portal`,
];

export const DEFAULT_OUTPUT_HEADERS = [
  'id',
  'label',
  'domain',
  'namespace',
  'group',
  'category',
  'status',
  'provenance',
  'usage',
] as const;

export type ConceptAuditOutput = 'table' | 'json' | 'markdown';
export type ConceptAuditSortField =
  | 'id'
  | 'label'
  | 'domain'
  | 'namespace'
  | 'group'
  | 'category'
  | 'status'
  | 'usage'
  | 'provenance';
export type ConceptAuditProvenanceFilter = 'present' | 'missing' | '';

export type ConceptAuditOptions = {
  watch: boolean;
  watchPoll: boolean;
  watchPaths: string[];
  watchDelayMs: number;
  strict: boolean;
  strictUnused: boolean;
  output: ConceptAuditOutput;
  quiet: boolean;
  verbose: boolean;
  unusedOnly: boolean;
  usedOnly: boolean;
  showDeprecated: boolean;
  showOrphans: boolean;
  domainSummary: boolean;
  /** Status allowlist (empty = all). Comma-split from FILTER / --status. */
  statuses: string[];
  boards: string[];
  groups: string[];
  domains: string[];
  namespaces: string[];
  categories: string[];
  sort: ConceptAuditSortField;
  sortDesc: boolean;
  minUsage: number;
  maxUsage: number;
  provenanceFilter: ConceptAuditProvenanceFilter;
  outputHeaders: string[];
  correlationId?: string; // brand-ok — work-item provenance ref, not CorrelationId UUID
  help: boolean;
};

export type ConceptAuditDetailRow = {
  id: string; // brand-ok — portal concept key
  label: string;
  domain: string; // brand-ok — business ConceptDomain
  namespace: string; // brand-ok — vocabulary namespace
  group: string;
  category: string;
  status: string;
  provenance: string; // brand-ok — correlationId or empty
  usage: number;
  kind: 'used' | 'unused' | 'surface-only';
};

export type ConceptAuditDomainSummary = {
  domain: string; // brand-ok — business ConceptDomain
  count: number;
  used: number;
  unused: number;
  provenance: number;
  provenancePct: number;
};

export type ConceptAuditReport = {
  ok: boolean;
  strict: boolean;
  generatedAt: string;
  summary: {
    totalPortal: number;
    withProvenance: number;
    provenanceCoverage: number;
    usedUi: number;
    unusedUi: number;
    surfaceOnly: number;
    metadataIssues: number;
    surfaceOrphans: number;
    inventoryMisses: number;
    deprecatedUsed: number;
    bakeDrift: number;
    detailRows: number;
  };
  domainSummary: ConceptAuditDomainSummary[];
  boards: Array<{
    board: string;
    files: number;
    usages: number;
    allowlist: number;
  }>;
  details: ConceptAuditDetailRow[];
  metadataIssues: Array<{
    id: string; // brand-ok — glossary concept key
    reason: string;
  }>;
  surfaceOrphans: Array<{ board: string; file: string; concept: string; via: string }>;
  inventoryMisses: string[];
  unused: string[]; // brand-ok — portal concept ids with no html/href/map hits
  surfaceOnly: string[]; // brand-ok — on a surface map but no html/href/map hits
  deprecatedUsed: string[]; // brand-ok — deprecated ids still referenced in UI
  bakeDrift: string[]; // brand-ok — SSOT vs bake provenance mismatch
  failures: string[];
};

// ─── env / argv helpers ─────────────────────────────────────────────────────

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

/** Flag present, else env truthy (`1`/`true`/`yes`/`on`). */
export function resolveBool(
  argv: readonly string[],
  flag: string,
  envKey: string,
  defaultValue = false
): boolean {
  if (argv.includes(flag)) return true;
  const raw = Bun.env[envKey]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return defaultValue;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/** Flag value wins over env; empty → undefined. */
export function resolveStr(
  argv: readonly string[],
  flag: string,
  envKey: string
): string | undefined {
  const fromFlag = argValue(argv, flag)?.trim();
  if (fromFlag) return fromFlag;
  const fromEnv = Bun.env[envKey]?.trim();
  return fromEnv || undefined;
}

export function resolveCsv(argv: readonly string[], flag: string, envKey: string): string[] {
  const raw = resolveStr(argv, flag, envKey);
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function resolveInt(
  argv: readonly string[],
  flag: string,
  envKey: string,
  defaultValue: number
): number {
  const raw = resolveStr(argv, flag, envKey);
  if (raw === undefined) return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function resolveWatchPaths(argv: readonly string[]): string[] {
  const fromFlag = argValue(argv, '--watch-paths');
  const fromEnv = Bun.env.CONCEPT_WATCH_PATHS?.trim() || Bun.env.WATCH_PATHS?.trim() || undefined;
  const raw = fromFlag || fromEnv;
  if (!raw) return DEFAULT_WATCH_PATHS;
  return raw
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (p.startsWith('/') ? p : `${ROOT}/${p}`));
}

function parseOutput(raw: string | undefined): ConceptAuditOutput {
  if (raw === 'json') return 'json';
  if (raw === 'markdown' || raw === 'md') return 'markdown';
  return 'table';
}

function parseSort(raw: string | undefined): ConceptAuditSortField {
  const allowed: ConceptAuditSortField[] = [
    'id',
    'label',
    'domain',
    'namespace',
    'group',
    'category',
    'status',
    'usage',
    'provenance',
  ];
  if (raw && (allowed as string[]).includes(raw)) return raw as ConceptAuditSortField;
  return 'id';
}

function parseProvenanceFilter(raw: string | undefined): ConceptAuditProvenanceFilter {
  if (raw === 'present' || raw === 'missing') return raw;
  return '';
}

export function parseConceptAuditOptions(argv: readonly string[] = Bun.argv): ConceptAuditOptions {
  const outputRaw = resolveStr(argv, '--output', 'CONCEPT_AUDIT_OUTPUT');
  const statusCsv = resolveCsv(argv, '--status', 'CONCEPT_AUDIT_FILTER');
  const headersRaw =
    resolveStr(argv, '--output-headers', 'CONCEPT_AUDIT_OUTPUT_HEADERS') ??
    DEFAULT_OUTPUT_HEADERS.join(',');

  return {
    watch: resolveBool(argv, '--watch', 'CONCEPT_AUDIT_WATCH', false),
    watchPoll: resolveBool(argv, '--watch-poll', 'CONCEPT_AUDIT_WATCH_POLL', false),
    watchPaths: resolveWatchPaths(argv),
    watchDelayMs: resolveInt(argv, '--watch-delay-ms', 'CONCEPT_AUDIT_WATCH_DELAY_MS', 200),
    strict: resolveBool(argv, '--strict', 'CONCEPT_AUDIT_STRICT', false),
    strictUnused: resolveBool(argv, '--strict-unused', 'CONCEPT_AUDIT_STRICT_UNUSED', false),
    output: parseOutput(outputRaw),
    quiet: resolveBool(argv, '--quiet', 'CONCEPT_AUDIT_QUIET', false),
    verbose: resolveBool(argv, '--verbose', 'CONCEPT_AUDIT_VERBOSE', false),
    unusedOnly:
      resolveBool(argv, '--unused', 'CONCEPT_AUDIT_SHOW_UNUSED', false) ||
      resolveBool(argv, '--show-unused', 'CONCEPT_AUDIT_SHOW_UNUSED', false),
    usedOnly: resolveBool(argv, '--show-used', 'CONCEPT_AUDIT_SHOW_USED', false),
    showDeprecated: resolveBool(argv, '--show-deprecated', 'CONCEPT_AUDIT_SHOW_DEPRECATED', false),
    showOrphans: resolveBool(argv, '--show-orphans', 'CONCEPT_AUDIT_SHOW_ORPHANS', false),
    domainSummary: resolveBool(argv, '--domain-summary', 'CONCEPT_AUDIT_DOMAIN_SUMMARY', false),
    statuses: statusCsv,
    boards: resolveCsv(argv, '--board', 'CONCEPT_AUDIT_BOARD'),
    groups: resolveCsv(argv, '--group', 'CONCEPT_AUDIT_GROUP'),
    domains: resolveCsv(argv, '--domain', 'CONCEPT_AUDIT_DOMAIN'),
    namespaces: resolveCsv(argv, '--namespace', 'CONCEPT_AUDIT_NAMESPACE'),
    categories: resolveCsv(argv, '--category', 'CONCEPT_AUDIT_CATEGORY'),
    sort: parseSort(resolveStr(argv, '--sort', 'CONCEPT_AUDIT_SORT')),
    sortDesc: resolveBool(argv, '--desc', 'CONCEPT_AUDIT_DESC', false),
    minUsage: resolveInt(argv, '--min-usage', 'CONCEPT_AUDIT_MIN_USAGE', 0),
    maxUsage: resolveInt(argv, '--max-usage', 'CONCEPT_AUDIT_MAX_USAGE', 9999),
    provenanceFilter: parseProvenanceFilter(
      resolveStr(argv, '--provenance', 'CONCEPT_AUDIT_PROVENANCE')
    ),
    outputHeaders: headersRaw
      .split(',')
      .map(h => h.trim())
      .filter(Boolean),
    correlationId: resolveStr(argv, '--correlation-id', 'CONCEPT_AUDIT_CORRELATION_ID'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

// ─── domain helpers ─────────────────────────────────────────────────────────

function conceptStatus(concept: (typeof PORTAL_SEMANTIC_CONCEPTS)[number]): string {
  return 'status' in concept && typeof concept.status === 'string' ? concept.status : 'active';
}

function conceptCorrelation(concept: (typeof PORTAL_SEMANTIC_CONCEPTS)[number]): string {
  return 'correlationId' in concept && typeof concept.correlationId === 'string'
    ? concept.correlationId.trim()
    : '';
}

/** Category for portal concepts = first id segment (ui · ops · page · section …). */
export function conceptCategoryOf(id: string): string {
  // brand-ok — glossary concept key prefixing
  return id.split('.')[0] ?? 'other';
}

function allSurfaceIds(): Set<string> {
  return new Set<string>([
    ...Object.values(PARTNER_HISTORY_SURFACE_CONCEPTS),
    ...Object.values(PARTNERS_SURFACE_CONCEPTS),
    ...Object.values(LIMIT_SURFACE_CONCEPTS),
    ...Object.values(ACCOUNT_DOSSIER_SURFACE_CONCEPTS),
    ...Object.values(LIMIT_FIELD_CONCEPTS),
  ]);
}

function uiHits(row: ConceptUsageBreakdown | undefined): number {
  if (!row) return 0;
  return row.html + row.href + row.map;
}

function matchesAnyPrefix(
  id: string, // brand-ok — glossary concept key prefix match
  prefixes: readonly string[]
): boolean {
  if (prefixes.length === 0) return true;
  return prefixes.some(g => id === g || id.startsWith(`${g}.`));
}

export function sortDetailRows(
  rows: ConceptAuditDetailRow[],
  sort: ConceptAuditSortField,
  desc: boolean
): ConceptAuditDetailRow[] {
  const mul = desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });
}

export function filterDetailRows(
  rows: readonly ConceptAuditDetailRow[],
  opts: Pick<
    ConceptAuditOptions,
    | 'statuses'
    | 'groups'
    | 'domains'
    | 'namespaces'
    | 'categories'
    | 'unusedOnly'
    | 'usedOnly'
    | 'showDeprecated'
    | 'minUsage'
    | 'maxUsage'
    | 'provenanceFilter'
  >
): ConceptAuditDetailRow[] {
  return rows.filter(row => {
    if (opts.statuses.length > 0 && !opts.statuses.includes(row.status)) return false;
    if (!opts.showDeprecated && row.status === 'deprecated') return false;
    if (opts.groups.length > 0 && !matchesAnyPrefix(row.id, opts.groups)) return false;
    if (opts.domains.length > 0 && !opts.domains.includes(row.domain)) return false;
    if (opts.namespaces.length > 0 && !opts.namespaces.includes(row.namespace)) return false;
    if (opts.categories.length > 0 && !opts.categories.includes(row.category)) return false;
    if (opts.unusedOnly && row.kind === 'used') return false;
    if (opts.usedOnly && row.kind !== 'used') return false;
    if (row.usage < opts.minUsage || row.usage > opts.maxUsage) return false;
    if (opts.provenanceFilter === 'present' && !row.provenance) return false;
    if (opts.provenanceFilter === 'missing' && row.provenance) return false;
    return true;
  });
}

async function bakeProvenanceDrift(): Promise<string[]> {
  const path = `${ROOT}/public/registry/domain-glossary.json`;
  if (!(await Bun.file(path).exists())) return ['domain-glossary.json missing'];
  const bake = (await Bun.file(path).json()) as {
    concepts?: Array<{
      id?: string; // brand-ok — glossary concept key from bake
      source?: string | null;
      correlationId?: string | null; // brand-ok — work-item provenance ref
    }>;
  };
  const byId = new Map(
    (bake.concepts ?? [])
      .filter(c => c.source === 'lib/portal/semantic-vocabulary.ts' && typeof c.id === 'string')
      .map(c => [c.id!, (c.correlationId ?? '').trim()] as const)
  );
  const drift: string[] = [];
  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    const live = conceptCorrelation(concept);
    const baked = byId.get(concept.id);
    if (baked === undefined) {
      drift.push(`${concept.id}: missing-from-bake`);
      continue;
    }
    if (live !== baked) drift.push(`${concept.id}: live=${live || '∅'} bake=${baked || '∅'}`);
  }
  return drift;
}

export async function runConceptAudit(opts: ConceptAuditOptions): Promise<ConceptAuditReport> {
  const [metadata, surface, usages, bakeDrift] = await Promise.all([
    runConceptMetadataValidation(),
    scanSurfaceCoverage({ includeMetadata: true }),
    countPortalConceptUsagesDetailed(),
    bakeProvenanceDrift(),
  ]);

  // Keep inventory path warm / filterable (also validates bake load).
  const firstGroup = opts.groups[0];
  const firstCategory = opts.categories[0];
  await runConceptInventory(
    parseConceptInventoryOptions([
      'bun',
      'tools/concept-inventory.ts',
      ...(firstGroup ? ['--group', firstGroup] : []),
      ...(firstCategory ? ['--category', firstCategory] : []),
      ...(opts.correlationId ? ['--correlation-id', opts.correlationId] : []),
      '--output',
      'json',
    ])
  );

  const surfaceIds = allSurfaceIds();
  const unused: string[] = [];
  const surfaceOnly: string[] = [];
  const deprecatedUsed: string[] = [];
  const allDetails: ConceptAuditDetailRow[] = [];

  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    const status = conceptStatus(concept);
    const row = usages.get(concept.id);
    const ui = uiHits(row);
    const onSurface = surfaceIds.has(concept.id);
    const provenance = conceptCorrelation(concept);

    let kind: ConceptAuditDetailRow['kind'] = 'used';
    if (ui === 0 && !concept.id.startsWith('page.')) {
      if (onSurface) {
        kind = 'surface-only';
        surfaceOnly.push(concept.id);
      } else {
        kind = 'unused';
        unused.push(concept.id);
      }
    }

    if (status === 'deprecated' && ui > 0) {
      deprecatedUsed.push(concept.id);
    }

    allDetails.push({
      id: concept.id,
      label: concept.label,
      domain: concept.domain,
      namespace: concept.namespace,
      group: conceptGroupOf(concept.id),
      category: conceptCategoryOf(concept.id),
      status,
      provenance,
      usage: ui,
      kind,
    });
  }

  const details = sortDetailRows(filterDetailRows(allDetails, opts), opts.sort, opts.sortDesc);

  const domainMap = new Map<
    string,
    { count: number; used: number; unused: number; provenance: number }
  >();
  for (const row of allDetails) {
    const cur = domainMap.get(row.domain) ?? { count: 0, used: 0, unused: 0, provenance: 0 };
    cur.count += 1;
    if (row.kind === 'used') cur.used += 1;
    else cur.unused += 1;
    if (row.provenance) cur.provenance += 1;
    domainMap.set(row.domain, cur);
  }
  const domainSummary = [...domainMap.entries()]
    .map(([domain, v]) => ({
      domain,
      count: v.count,
      used: v.used,
      unused: v.unused,
      provenance: v.provenance,
      provenancePct: v.count === 0 ? 0 : Math.round((v.provenance / v.count) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));

  let boards = surface.boards.map(b => ({
    board: b.board,
    files: b.files,
    usages: b.usages,
    allowlist: b.allowlist,
  }));
  if (opts.boards.length > 0) {
    const allow = new Set(opts.boards);
    boards = boards.filter(b => allow.has(b.board));
  }

  const surfaceOk = surface.orphans.length === 0 && surface.inventoryMisses.length === 0;
  const failures: string[] = [];
  if (!metadata.ok) failures.push(`metadata:${metadata.issues.length}`);
  if (!surfaceOk) {
    failures.push(`surface-orphans:${surface.orphans.length}`);
    failures.push(`inventory-misses:${surface.inventoryMisses.length}`);
  }
  if (surface.missingCorrelationIds.length > 0) {
    failures.push(`used-missing-provenance:${surface.missingCorrelationIds.length}`);
  }
  if (deprecatedUsed.length > 0) failures.push(`deprecated-used:${deprecatedUsed.length}`);
  if (bakeDrift.length > 0) failures.push(`bake-drift:${bakeDrift.length}`);
  if (opts.strictUnused) {
    const unusedFail = unused.filter(id => !id.startsWith('page.'));
    if (unusedFail.length > 0) failures.push(`unused:${unusedFail.length}`);
  }

  const usedUi = PORTAL_SEMANTIC_CONCEPTS.filter(c => uiHits(usages.get(c.id)) > 0).length;
  const withProvenance = metadata.withProvenance;
  const totalPortal = PORTAL_SEMANTIC_CONCEPTS.length;

  const governanceOk =
    metadata.ok &&
    surfaceOk &&
    surface.missingCorrelationIds.length === 0 &&
    deprecatedUsed.length === 0 &&
    bakeDrift.length === 0 &&
    (!opts.strictUnused || unused.filter(id => !id.startsWith('page.')).length === 0);

  return {
    ok: opts.strict ? governanceOk : metadata.ok && surfaceOk,
    strict: opts.strict,
    generatedAt: new Date().toISOString(),
    summary: {
      totalPortal,
      withProvenance,
      provenanceCoverage: totalPortal === 0 ? 0 : withProvenance / totalPortal,
      usedUi,
      unusedUi: unused.length,
      surfaceOnly: surfaceOnly.length,
      metadataIssues: metadata.issues.length,
      surfaceOrphans: surface.orphans.length,
      inventoryMisses: surface.inventoryMisses.length,
      deprecatedUsed: deprecatedUsed.length,
      bakeDrift: bakeDrift.length,
      detailRows: details.length,
    },
    domainSummary,
    boards,
    details,
    metadataIssues: metadata.issues,
    surfaceOrphans: surface.orphans,
    inventoryMisses: surface.inventoryMisses,
    unused: unused.sort(),
    surfaceOnly: surfaceOnly.sort(),
    deprecatedUsed: deprecatedUsed.sort(),
    bakeDrift,
    failures,
  };
}

function printHelp(): void {
  console.log(`concept:audit — unified inventory + metadata + surface coverage

Usage:
  bun run concept:audit [--strict] [--watch] [--output json|table|markdown]

Modes:
  (default)       One-shot report; exit 1 if metadata or surface coverage fail
  --strict        Also fail on used-missing-provenance, deprecated-used, bake drift
  --strict-unused Also fail on unused non-page portal concepts (no html/href/map)
  --watch         Re-run on file changes (Bun.file mtime poll)
  --watch-poll    Alias of --watch (mtime poll)
  --watch-delay-ms N   Debounce between polls (default 200; env CONCEPT_AUDIT_WATCH_DELAY_MS)
  --quiet         Summary + failures only
  --verbose       Extra metadata / sample detail
  --unused        Print unused / surface-only only (or CONCEPT_AUDIT_SHOW_UNUSED=1)
  --output json|table|markdown

Filters (flags or CONCEPT_AUDIT_* env — AND across types, OR within CSV lists):
  --status / FILTER     active,deprecated
  --domain / DOMAIN     accounting,partners,portal,compliance,…
  --namespace / NAMESPACE  api,ops,page,section,ui
  --group / GROUP       ops.metric,ops.filter
  --category / CATEGORY ui,ops  (first id segment; usually equals namespace)
  --board / BOARD       partner-history,partners
  --sort / SORT         id|label|domain|namespace|group|category|status|usage|provenance
  --desc / DESC         reverse sort
  --min-usage / MAX     usage bounds
  --provenance          present|missing
  --show-used           only used rows
  --show-deprecated     include deprecated (default exclude from detail)
  --show-orphans        print surface orphan list
  --domain-summary      print domain rollup tile (count / used / unused)
  --output-headers      comma columns (default: ${DEFAULT_OUTPUT_HEADERS.join(',')})
  --watch-paths / CONCEPT_WATCH_PATHS

Examples:
  CONCEPT_AUDIT_SHOW_UNUSED=1 CONCEPT_AUDIT_GROUP=ops.metric CONCEPT_AUDIT_SORT=usage CONCEPT_AUDIT_DESC=1 bun run concept:audit
  bun run concept:audit -- --domain-summary --domain compliance
  CONCEPT_AUDIT_PROVENANCE=missing bun run concept:audit
  CONCEPT_AUDIT_WATCH_POLL=1 CONCEPT_AUDIT_WATCH_DELAY_MS=500 bun run concept:audit -- --watch
`);
}

function pickDetailColumns(
  rows: readonly ConceptAuditDetailRow[],
  headers: readonly string[]
): Record<string, string | number>[] {
  const keys = headers.length > 0 ? headers : [...DEFAULT_OUTPUT_HEADERS];
  return rows.map(row => {
    const out: Record<string, string | number> = {};
    for (const h of keys) {
      const v = (row as Record<string, string | number>)[h];
      out[h] = v ?? '';
    }
    return out;
  });
}

function printMarkdown(report: ConceptAuditReport, opts: ConceptAuditOptions): void {
  const status = report.ok ? 'OK' : 'FAIL';
  console.log(`# concept:audit · ${status}`);
  console.log('');
  console.log(`| total | provenance | usedUi | unused | surfaceOnly | orphans | drift | details |`);
  console.log(`|------:|-----------:|-------:|-------:|------------:|--------:|------:|--------:|`);
  console.log(
    `| ${report.summary.totalPortal} | ${report.summary.withProvenance} | ${report.summary.usedUi} | ${report.summary.unusedUi} | ${report.summary.surfaceOnly} | ${report.summary.surfaceOrphans} | ${report.summary.bakeDrift} | ${report.summary.detailRows} |`
  );
  if (opts.domainSummary && report.domainSummary.length > 0) {
    console.log('');
    console.log(`## Domains`);
    console.log(`| domain | count | used | unused | provenance | provenance % |`);
    console.log(`|--------|------:|-----:|-------:|-----------:|-------------:|`);
    for (const d of report.domainSummary) {
      console.log(
        `| ${d.domain} | ${d.count} | ${d.used} | ${d.unused} | ${d.provenance} | ${d.provenancePct}% |`
      );
    }
  }
  if (!opts.quiet && report.boards.length > 0) {
    console.log('');
    console.log(`## Boards`);
    console.log(`| board | files | usages | allowlist |`);
    console.log(`|-------|------:|-------:|----------:|`);
    for (const b of report.boards) {
      console.log(`| ${b.board} | ${b.files} | ${b.usages} | ${b.allowlist} |`);
    }
  }
  if (!opts.quiet && report.details.length > 0) {
    console.log('');
    console.log(`## Concepts (${report.details.length})`);
    const headers =
      opts.outputHeaders.length > 0 ? opts.outputHeaders : [...DEFAULT_OUTPUT_HEADERS];
    console.log(`| ${headers.join(' | ')} |`);
    console.log(`| ${headers.map(() => '---').join(' | ')} |`);
    for (const row of report.details) {
      const cells = headers.map(h => {
        const v = (row as Record<string, string | number>)[h];
        return v === undefined || v === '' ? '—' : String(v);
      });
      console.log(`| ${cells.join(' | ')} |`);
    }
  }
  if (report.failures.length > 0) {
    console.log('');
    console.log(`## Failures`);
    for (const f of report.failures) console.log(`- ${f}`);
  }
}

function printReport(report: ConceptAuditReport, opts: ConceptAuditOptions): void {
  if (opts.output === 'json') {
    if (opts.unusedOnly) {
      jsonOut({
        unused: report.unused,
        surfaceOnly: report.surfaceOnly,
        details: report.details,
      });
    } else {
      jsonOut(report);
    }
    return;
  }

  if (opts.output === 'markdown') {
    printMarkdown(report, opts);
    return;
  }

  if (opts.unusedOnly) {
    logTable(
      report.details.length > 0
        ? pickDetailColumns(report.details, opts.outputHeaders)
        : [...report.unused, ...report.surfaceOnly].map(id => ({
            id,
            kind: report.unused.includes(id) ? 'unused' : 'surface-only',
          })),
      report.details.length > 0 ? opts.outputHeaders : ['id', 'kind']
    );
    return;
  }

  console.log(
    colorize(
      `concept:audit · portal=${report.summary.totalPortal} · provenance=${report.summary.withProvenance} · details=${report.summary.detailRows} · ${report.ok ? 'OK' : 'FAIL'}`,
      report.ok ? '#3fb950' : '#f85149'
    )
  );

  logTable(
    [
      {
        total: report.summary.totalPortal,
        provenance: report.summary.withProvenance,
        usedUi: report.summary.usedUi,
        unused: report.summary.unusedUi,
        surfaceOnly: report.summary.surfaceOnly,
        orphans: report.summary.surfaceOrphans,
        drift: report.summary.bakeDrift,
        details: report.summary.detailRows,
      },
    ],
    ['total', 'provenance', 'usedUi', 'unused', 'surfaceOnly', 'orphans', 'drift', 'details']
  );

  if (opts.domainSummary && report.domainSummary.length > 0) {
    console.log(colorize('domain summary', '#8b949e'));
    logTable(report.domainSummary, [
      'domain',
      'count',
      'used',
      'unused',
      'provenance',
      'provenancePct',
    ]);
  }

  if (!opts.quiet) {
    if (report.boards.length > 0) {
      logTable(report.boards, ['board', 'files', 'usages', 'allowlist']);
    }
    if (report.details.length > 0) {
      logTable(pickDetailColumns(report.details, opts.outputHeaders), opts.outputHeaders);
    }
  }

  if (report.failures.length > 0) {
    console.error(colorize(`failures · ${report.failures.join(' · ')}`, '#f85149'));
  }

  if (!opts.quiet) {
    if (report.metadataIssues.length > 0) {
      console.error(colorize('missing provenance:', '#f85149'));
      for (const issue of report.metadataIssues.slice(0, 20)) {
        console.error(`  ✗ ${issue.id} (${issue.reason})`);
      }
    }
    if (opts.showOrphans && report.surfaceOrphans.length > 0) {
      console.error(colorize('surface orphans:', '#f85149'));
      for (const o of report.surfaceOrphans.slice(0, 40)) {
        console.error(`  ✗ ${o.concept} in ${o.file} (${o.via}) [${o.board}]`);
      }
    } else if (report.surfaceOrphans.length > 0) {
      console.error(
        colorize(
          `surface orphans: ${report.surfaceOrphans.length} (set CONCEPT_AUDIT_SHOW_ORPHANS=1 to list)`,
          '#f85149'
        )
      );
    }
    if (report.bakeDrift.length > 0) {
      console.error(colorize('bake drift (run bun run glossary:portal):', '#f85149'));
      for (const d of report.bakeDrift.slice(0, 20)) console.error(`  ✗ ${d}`);
    }
    if (opts.verbose && report.unused.length > 0) {
      console.log(
        colorize(`unused (no UI hits, not on surface) · ${report.unused.length}`, '#8b949e')
      );
      for (const id of report.unused.slice(0, 30)) console.log(`  · ${id}`);
    } else if (!opts.usedOnly && !opts.unusedOnly && report.unused.length > 0) {
      console.log(
        colorize(`unused (no UI hits, not on surface) · ${report.unused.length}`, '#8b949e')
      );
      for (const id of report.unused.slice(0, 15)) console.log(`  · ${id}`);
    }
    if (report.surfaceOnly.length > 0) {
      console.log(
        colorize(
          `surface-only (inventory chrome, no HTML bind) · ${report.surfaceOnly.length} — expected for partner-history collapse`,
          '#8b949e'
        )
      );
    }
  }
}

async function collectWatchTargets(paths: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const file = Bun.file(p);
    if (await file.exists()) {
      out.push(p);
      continue;
    }
    const glob = new Bun.Glob('**/*.{html,js,ts,json}');
    try {
      for await (const rel of glob.scan({ cwd: p, onlyFiles: true })) {
        out.push(`${p}/${rel}`);
      }
    } catch {
      /* path missing */
    }
  }
  return out;
}

async function watchLoop(opts: ConceptAuditOptions): Promise<void> {
  let running = false;
  let queued = false;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const delay = Math.max(50, opts.watchDelayMs);

  const rerun = async (reason: string) => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      console.log(colorize(`\n↻ concept:audit · ${reason}`, '#58a6ff'));
      const report = await runConceptAudit(opts);
      printReport(report, opts);
    } catch (err) {
      console.error(colorize(`audit error: ${String(err)}`, '#f85149'));
    } finally {
      running = false;
      if (queued) {
        queued = false;
        await rerun('queued');
      }
    }
  };

  const schedule = (reason: string) => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      void rerun(reason);
    }, delay);
  };

  await rerun('initial');

  const mtimes = new Map<string, number>();
  const tick = async () => {
    const targets = await collectWatchTargets(opts.watchPaths);
    let changed = false;
    for (const full of targets) {
      const t = Bun.file(full).lastModified;
      const prev = mtimes.get(full);
      if (prev !== undefined && prev !== t) changed = true;
      mtimes.set(full, t);
    }
    if (changed) schedule('mtime');
  };

  await tick();
  // Poll cadence: max(delay, 200) so we don't spin faster than debounce.
  const pollMs = Math.max(delay, 200);
  console.log(
    colorize(
      `watching ${opts.watchPaths.length} path(s) via Bun.file mtime poll (${pollMs}ms, debounce ${delay}ms) · Ctrl-C to stop`,
      '#8b949e'
    )
  );
  const handle = setInterval(() => {
    void tick();
  }, pollMs);
  process.on('SIGINT', () => {
    clearInterval(handle);
    if (debounce) clearTimeout(debounce);
    process.exit(0);
  });
  await new Promise(() => {});
}

async function main(): Promise<void> {
  const opts = parseConceptAuditOptions();
  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.watch || opts.watchPoll) {
    await watchLoop({ ...opts, watch: true });
    return;
  }

  const report = await runConceptAudit(opts);
  printReport(report, opts);
  if (!report.ok) process.exit(1);
}

if (import.meta.main) {
  await main();
}
