#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Concept inventory — list/filter the baked domain glossary with provenance + usage.
 *
 *   bun run concept:inventory
 *   bun run concept:inventory -- --group ops.metric
 *   bun run concept:inventory -- --category ui --output json
 *   bun run concept:inventory -- --correlation-id PR#228
 *   bun run concept:inventory -- --domain compliance --group-by domain
 *   bun run concept:inventory -- --namespace ops --group-by namespace
 *   bun run concept:inventory -- --unused --sort usage --desc
 *   bun run concept:inventory -- --board limits --output markdown
 *
 * Flags:
 *   --group <prefix>          Filter by dotted id prefix (ops.limits, ui.semantic, …)
 *   --domain <id>             Filter by business domain (accounting · partners · portal · …)
 *   --namespace <id>          Filter by vocabulary namespace (api · ops · page · section · ui)
 *   --group-by group|domain|namespace|category  Compact rollup key (default: group)
 *   --category <id>           Filter by glossary category (market · ui · trading · …)
 *   --correlation-id <id>     Filter by concept provenance (e.g. PR#228)
 *   --status active|deprecated  Filter by concept status
 *   --unused                  Only concepts with usage === 0
 *   --used                    Only concepts with usage > 0
 *   --usage-gt <N>            Only concepts with usage > N
 *   --board <name>            Only concepts used on that surface board
 *                             (partner-history · partners · limits · account)
 *   --sort id|usage|group     Sort rows (default: bake order)
 *   --desc                    Reverse the sort order
 *   --run-id <id>             Scan trace id (default: Bun.randomUUIDv7())
 *   --output json|table|markdown  Machine JSON, TTY table (default), or GFM markdown
 *   --help
 *
 * Env fallbacks (flag always wins over env):
 *   CONCEPT_INVENTORY_OUTPUT           ≡ --output
 *   CONCEPT_INVENTORY_FILTER_GROUP     ≡ --group
 *   CONCEPT_INVENTORY_FILTER_CATEGORY  ≡ --category
 *   CONCEPT_INVENTORY_FILTER_DOMAIN    ≡ --domain
 *   CONCEPT_INVENTORY_FILTER_STATUS    ≡ --status
 *   CONCEPT_INVENTORY_SHOW_UNUSED=1    ≡ --unused
 *   CONCEPT_INVENTORY_SORT             ≡ --sort
 *   CONCEPT_INVENTORY_DESC=1           ≡ --desc
 */
import { randomUUIDv7 } from 'bun';
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { inferDomain, isConceptDomain } from '../lib/portal/concept-domains.ts';
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import { asCorrelationId, type CorrelationId } from '../lib/types/branded.ts';
import { isBoardId, scanBoardConceptIds, BOARD_IDS } from '../scripts/validate-surface-coverage.ts';

const REGISTRY_PATH = `${import.meta.dir}/../public/registry/domain-glossary.json`;

export type GlossaryConcept = {
  id: string; // brand-ok — opaque glossary concept id from domain-glossary bake
  label: string;
  description?: string;
  category: string;
  kind?: string;
  status?: string;
  synonyms?: readonly string[] | null;
  seeAlso?: readonly string[] | null;
  source?: string | null;
  correlationId?: string | null; // brand-ok — provenance work-item ref
  addedAt?: string | null;
  domain?: string | null; // brand-ok — business ConceptDomain
  namespace?: string | null; // brand-ok — vocabulary namespace
};

type GlossaryBake = {
  schemaVersion?: number;
  kind?: string;
  generatedAt?: string;
  categories?: Array<{ id: string; label: string }>; // brand-ok — opaque category id from bake
  concepts?: GlossaryConcept[];
  summary?: Record<string, unknown>;
};

export type ConceptInventoryOptions = {
  group?: string;
  domain?: string;
  namespace?: string;
  groupBy: 'group' | 'domain' | 'namespace' | 'category';
  category?: string;
  /** Concept provenance filter (PR#228) — not the scan run id. */
  correlationId?: string; // brand-ok — work-item provenance ref, not CorrelationId UUID
  status?: 'active' | 'deprecated';
  /** Only concepts with usage === 0. */
  unused: boolean;
  /** Only concepts with usage > 0. */
  used: boolean;
  /** Only concepts with usage > N. */
  usageGt?: number;
  sort?: 'id' | 'usage' | 'group' | 'domain' | 'namespace';
  desc: boolean;
  /** Only concepts used on this surface board. */
  board?: string;
  runId: CorrelationId;
  output: 'table' | 'json' | 'markdown';
  help: boolean;
};

export type ConceptInventoryRow = {
  id: string; // brand-ok — opaque glossary concept id (report row)
  label: string;
  group: string;
  domain: string;
  namespace: string;
  category: string;
  kind: string;
  status: string;
  correlationId: string; // brand-ok — work-item provenance ref, not CorrelationId UUID
  addedAt: string;
  usage: number;
};

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

/** Two-segment prefix for grouping (ops.metric → ops.metric; mid → mid). */
export function conceptGroupOf(id: string): string {
  // brand-ok — glossary concept key prefixing
  const parts = id.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (parts[0] ?? 'other');
}

/** Business domain from bake, else inferred from id prefix. */
export function conceptDomainOf(concept: Pick<GlossaryConcept, 'id' | 'domain'>): string {
  const fromBake = (concept.domain ?? '').trim();
  if (fromBake && isConceptDomain(fromBake)) return fromBake;
  return inferDomain(concept.id);
}

/** Vocabulary namespace = bake field or first dotted segment. */
export function conceptNamespaceOf(concept: Pick<GlossaryConcept, 'id' | 'namespace'>): string {
  const fromBake = (concept.namespace ?? '').trim();
  if (fromBake) return fromBake;
  return concept.id.split('.')[0] ?? 'other';
}

export function parseConceptInventoryOptions(
  argv: readonly string[] = Bun.argv,
  env: Record<string, string | undefined> = Bun.env
): ConceptInventoryOptions {
  const outputRaw = argValue(argv, '--output') ?? env.CONCEPT_INVENTORY_OUTPUT;
  const runRaw = argValue(argv, '--run-id') ?? randomUUIDv7();
  const statusRaw = (argValue(argv, '--status') ?? env.CONCEPT_INVENTORY_FILTER_STATUS)?.trim();
  const sortRaw = (argValue(argv, '--sort') ?? env.CONCEPT_INVENTORY_SORT)?.trim();
  const groupByRaw = argValue(argv, '--group-by')?.trim();
  const usageGtRaw = argValue(argv, '--usage-gt')?.trim();
  const usageGt = usageGtRaw === undefined ? undefined : Number.parseInt(usageGtRaw, 10);
  return {
    group: (argValue(argv, '--group') ?? env.CONCEPT_INVENTORY_FILTER_GROUP)?.trim() || undefined,
    domain:
      (argValue(argv, '--domain') ?? env.CONCEPT_INVENTORY_FILTER_DOMAIN)?.trim() || undefined,
    namespace: argValue(argv, '--namespace')?.trim() || undefined,
    groupBy:
      groupByRaw === 'domain' ||
      groupByRaw === 'namespace' ||
      groupByRaw === 'category' ||
      groupByRaw === 'group'
        ? groupByRaw
        : 'group',
    category:
      (argValue(argv, '--category') ?? env.CONCEPT_INVENTORY_FILTER_CATEGORY)?.trim() || undefined,
    correlationId: argValue(argv, '--correlation-id')?.trim() || undefined,
    status: statusRaw === 'active' || statusRaw === 'deprecated' ? statusRaw : undefined,
    unused: argv.includes('--unused') || env.CONCEPT_INVENTORY_SHOW_UNUSED === '1',
    used: argv.includes('--used'),
    usageGt: usageGt !== undefined && Number.isFinite(usageGt) ? usageGt : undefined,
    sort:
      sortRaw === 'id' ||
      sortRaw === 'usage' ||
      sortRaw === 'group' ||
      sortRaw === 'domain' ||
      sortRaw === 'namespace'
        ? sortRaw
        : undefined,
    desc: argv.includes('--desc') || env.CONCEPT_INVENTORY_DESC === '1',
    board: argValue(argv, '--board')?.trim() || undefined,
    runId: asCorrelationId(runRaw),
    output: outputRaw === 'json' ? 'json' : outputRaw === 'markdown' ? 'markdown' : 'table',
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export function filterConcepts(
  concepts: readonly GlossaryConcept[],
  opts: Pick<
    ConceptInventoryOptions,
    'group' | 'domain' | 'namespace' | 'category' | 'correlationId' | 'status'
  >
): GlossaryConcept[] {
  return concepts.filter(c => {
    if (opts.category && c.category !== opts.category) return false;
    if (opts.domain && conceptDomainOf(c) !== opts.domain) return false;
    if (opts.namespace && conceptNamespaceOf(c) !== opts.namespace) return false;
    if (opts.status && (c.status ?? '') !== opts.status) return false;
    if (opts.correlationId) {
      const prov = (c.correlationId ?? '').trim();
      if (prov !== opts.correlationId) return false;
    }
    if (opts.group) {
      const g = opts.group;
      if (c.id !== g && !c.id.startsWith(`${g}.`)) return false;
    }
    return true;
  });
}

export function groupCounts(
  concepts: readonly GlossaryConcept[],
  groupBy: ConceptInventoryOptions['groupBy'] = 'group'
): Array<{
  group: string;
  count: number;
}> {
  const map = new Map<string, number>();
  for (const c of concepts) {
    const key =
      groupBy === 'domain'
        ? conceptDomainOf(c)
        : groupBy === 'namespace'
          ? conceptNamespaceOf(c)
          : groupBy === 'category'
            ? c.category
            : conceptGroupOf(c.id);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
}

function printHelp(): void {
  console.log(`concept:inventory — baked domain glossary inventory

Usage:
  bun run concept:inventory [filters] [--sort id|usage|group] [--desc] [--output json|table|markdown]

Filters:
  --group             Dotted id prefix (e.g. ops.limits, ui.semantic, page)
  --domain            Business domain (accounting · partners · portal · compliance · …)
  --namespace         Vocabulary namespace (api · ops · page · section · ui)
  --category          Glossary category id (ui · market · trading · tournament · …)
  --correlation-id    Concept provenance (e.g. PR#228) — filters rows with that field
  --status            Concept status (active · deprecated)
  --unused            Only concepts with usage === 0
  --used              Only concepts with usage > 0
  --usage-gt <N>      Only concepts with usage > N
  --board             Only concepts used on a surface board
                      (partner-history · partners · limits · account)

Output:
  --group-by group|domain|namespace|category  Compact rollup (default: group)
  --sort id|usage|group|domain|namespace  Sort rows (default: bake order); --desc reverses
  --output table      TTY table (default)
  --output json       Machine JSON (includes runId + usage)
  --output markdown   GitHub-flavored markdown table
  --run-id            Optional scan trace id (default: randomUUIDv7)

Examples:
  bun run concept:inventory -- --group ops.metric
  bun run concept:inventory -- --domain compliance --group-by domain
  bun run concept:inventory -- --namespace ops --group-by namespace
  bun run concept:inventory -- --correlation-id PR#228
  bun run concept:inventory -- --category ui --output json
  bun run concept:inventory -- --unused --sort usage --desc
  bun run concept:inventory -- --status active --output markdown
  bun run concept:inventory -- --board limits
`);
}

export async function loadGlossaryBake(path = REGISTRY_PATH): Promise<GlossaryBake> {
  return (await Bun.file(path).json()) as GlossaryBake;
}

export async function runConceptInventory(
  opts: ConceptInventoryOptions,
  path = REGISTRY_PATH,
  usageCounts?: Map<string, number>,
  boardConcepts?: Set<string>
): Promise<{
  runId: CorrelationId;
  correlationIdFilter?: string;
  total: number;
  matched: number;
  group?: string;
  domain?: string;
  namespace?: string;
  groupBy: ConceptInventoryOptions['groupBy'];
  category?: string;
  status?: string;
  board?: string;
  concepts: ConceptInventoryRow[];
  groups: Array<{ group: string; count: number }>;
}> {
  const bake = await loadGlossaryBake(path);
  const all = bake.concepts ?? [];
  const matched = filterConcepts(all, opts);
  const usages = usageCounts ?? (await countPortalConceptUsages());
  let rows: ConceptInventoryRow[] = matched.map(c => ({
    id: c.id,
    label: c.label,
    group: conceptGroupOf(c.id),
    domain: conceptDomainOf(c),
    namespace: conceptNamespaceOf(c),
    category: c.category,
    kind: c.kind ?? '',
    status: c.status ?? '',
    correlationId: (c.correlationId ?? '').trim(),
    addedAt: (c.addedAt ?? '').trim(),
    usage: usages.get(c.id) ?? 0,
  }));
  if (boardConcepts) rows = rows.filter(r => boardConcepts.has(r.id));
  if (opts.unused) rows = rows.filter(r => r.usage === 0);
  if (opts.used) rows = rows.filter(r => r.usage > 0);
  if (opts.usageGt !== undefined) rows = rows.filter(r => r.usage > (opts.usageGt ?? 0));
  if (opts.sort) {
    const sortKey = opts.sort;
    rows.sort((a, b) => {
      if (sortKey === 'usage') return a.usage - b.usage || a.id.localeCompare(b.id);
      if (sortKey === 'group') return a.group.localeCompare(b.group) || a.id.localeCompare(b.id);
      if (sortKey === 'domain') return a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id);
      if (sortKey === 'namespace')
        return a.namespace.localeCompare(b.namespace) || a.id.localeCompare(b.id);
      return a.id.localeCompare(b.id);
    });
  }
  if (opts.desc) rows = [...rows].reverse();
  return {
    runId: opts.runId,
    correlationIdFilter: opts.correlationId,
    total: all.length,
    matched: rows.length,
    group: opts.group,
    domain: opts.domain,
    namespace: opts.namespace,
    groupBy: opts.groupBy,
    category: opts.category,
    status: opts.status,
    board: opts.board,
    concepts: rows,
    groups: groupCounts(matched, opts.groupBy),
  };
}

function markdownEscape(value: string | undefined): string {
  return (value ?? '').replace(/\|/g, '\\|');
}

/** GitHub-flavored markdown table for inventory rows. */
export function conceptRowsToMarkdown(rows: readonly ConceptInventoryRow[]): string {
  const header =
    '| id | label | domain | namespace | group | category | correlationId | status | usage |';
  const divider = '| --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const body = rows.map(
    r =>
      `| ${r.id} | ${markdownEscape(r.label)} | ${r.domain} | ${r.namespace} | ${r.group} | ${r.category} | ${r.correlationId} | ${r.status} | ${r.usage} |`
  );
  return [header, divider, ...body].join('\n');
}

async function main(): Promise<void> {
  const opts = parseConceptInventoryOptions();
  if (opts.help) {
    printHelp();
    return;
  }

  let boardConcepts: Set<string> | undefined;
  if (opts.board) {
    if (!isBoardId(opts.board)) {
      console.error(
        colorize(`Unknown board "${opts.board}" (expected: ${BOARD_IDS.join(' · ')})`, '#f85149')
      );
      process.exitCode = 1;
      return;
    }
    boardConcepts = await scanBoardConceptIds(opts.board);
  }

  const report = await runConceptInventory(opts, REGISTRY_PATH, undefined, boardConcepts);

  if (opts.output === 'json') {
    jsonOut(report);
    return;
  }

  if (opts.output === 'markdown') {
    console.log(conceptRowsToMarkdown(report.concepts));
    return;
  }

  console.log(
    colorize(
      `concept:inventory · ${report.matched}/${report.total} · runId=${report.runId}`,
      '#58a6ff'
    )
  );
  const filterBits = [
    opts.group ? `group=${opts.group}` : null,
    opts.domain ? `domain=${opts.domain}` : null,
    opts.namespace ? `namespace=${opts.namespace}` : null,
    opts.groupBy !== 'group' ? `groupBy=${opts.groupBy}` : null,
    opts.category ? `category=${opts.category}` : null,
    opts.correlationId ? `correlationId=${opts.correlationId}` : null,
    opts.status ? `status=${opts.status}` : null,
    opts.board ? `board=${opts.board}` : null,
    opts.unused ? 'unused' : null,
    opts.used ? 'used' : null,
    opts.usageGt !== undefined ? `usage>${opts.usageGt}` : null,
    opts.sort ? `sort=${opts.sort}${opts.desc ? ' desc' : ''}` : null,
  ].filter(Boolean);
  if (filterBits.length > 0) {
    console.log(colorize(`filters · ${filterBits.join(' · ')}`, '#8b949e'));
  }

  if (report.concepts.length === 0) {
    console.log(colorize('No concepts matched.', '#d29922'));
    process.exitCode = 1;
    return;
  }

  // Compact summary by prefix when unfiltered or large (unless provenance filter).
  const hasRowFilter =
    opts.group !== undefined ||
    opts.domain !== undefined ||
    opts.namespace !== undefined ||
    opts.correlationId !== undefined ||
    opts.status !== undefined ||
    opts.board !== undefined ||
    opts.unused ||
    opts.used ||
    opts.usageGt !== undefined;
  if (
    (!hasRowFilter || opts.groupBy === 'domain' || opts.groupBy === 'namespace') &&
    report.concepts.length > 40
  ) {
    logTable(report.groups.slice(0, 25), ['group', 'count']);
    console.log(
      colorize(
        `… ${report.groups.length} ${opts.groupBy}s · pass --group / --domain / --namespace to list ids`,
        '#8b949e'
      )
    );
    return;
  }

  logTable(report.concepts, [
    'id',
    'label',
    'domain',
    'namespace',
    'group',
    'category',
    'correlationId',
    'status',
    'usage',
  ]);
}

if (import.meta.main) {
  await main();
}
