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
 *   bun run concept:inventory -- --unused --sort usage --desc
 *   bun run concept:inventory -- --board limits --output markdown
 *
 * Flags:
 *   --group <prefix>          Filter by dotted id prefix (ops.limits, ui.semantic, …)
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
 */
import { randomUUIDv7 } from 'bun';
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
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
  sort?: 'id' | 'usage' | 'group';
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

export function parseConceptInventoryOptions(
  argv: readonly string[] = Bun.argv
): ConceptInventoryOptions {
  const outputRaw = argValue(argv, '--output');
  const runRaw = argValue(argv, '--run-id') ?? randomUUIDv7();
  const statusRaw = argValue(argv, '--status')?.trim();
  const sortRaw = argValue(argv, '--sort')?.trim();
  const usageGtRaw = argValue(argv, '--usage-gt')?.trim();
  const usageGt = usageGtRaw === undefined ? undefined : Number.parseInt(usageGtRaw, 10);
  return {
    group: argValue(argv, '--group')?.trim() || undefined,
    category: argValue(argv, '--category')?.trim() || undefined,
    correlationId: argValue(argv, '--correlation-id')?.trim() || undefined,
    status: statusRaw === 'active' || statusRaw === 'deprecated' ? statusRaw : undefined,
    unused: argv.includes('--unused'),
    used: argv.includes('--used'),
    usageGt: usageGt !== undefined && Number.isFinite(usageGt) ? usageGt : undefined,
    sort: sortRaw === 'id' || sortRaw === 'usage' || sortRaw === 'group' ? sortRaw : undefined,
    desc: argv.includes('--desc'),
    board: argValue(argv, '--board')?.trim() || undefined,
    runId: asCorrelationId(runRaw),
    output: outputRaw === 'json' ? 'json' : outputRaw === 'markdown' ? 'markdown' : 'table',
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export function filterConcepts(
  concepts: readonly GlossaryConcept[],
  opts: Pick<ConceptInventoryOptions, 'group' | 'category' | 'correlationId'>
): GlossaryConcept[] {
  return concepts.filter(c => {
    if (opts.category && c.category !== opts.category) return false;
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

export function groupCounts(concepts: readonly GlossaryConcept[]): Array<{
  group: string;
  count: number;
}> {
  const map = new Map<string, number>();
  for (const c of concepts) {
    const key = conceptGroupOf(c.id);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
}

function printHelp(): void {
  console.log(`concept:inventory — baked domain glossary inventory

Usage:
  bun run concept:inventory [--group <prefix>] [--category <id>] [--correlation-id <id>] [--output json|table]

Filters:
  --group             Dotted id prefix (e.g. ops.limits, ui.semantic, page)
  --category          Glossary category id (ui · market · trading · tournament · …)
  --correlation-id    Concept provenance (e.g. PR#228) — filters rows with that field

Output:
  --output table      TTY table (default)
  --output json       Machine JSON (includes runId + usage)
  --run-id            Optional scan trace id (default: randomUUIDv7)

Examples:
  bun run concept:inventory -- --group ops.metric
  bun run concept:inventory -- --correlation-id PR#228
  bun run concept:inventory -- --category ui --output json
`);
}

export async function loadGlossaryBake(path = REGISTRY_PATH): Promise<GlossaryBake> {
  return (await Bun.file(path).json()) as GlossaryBake;
}

export async function runConceptInventory(
  opts: ConceptInventoryOptions,
  path = REGISTRY_PATH,
  usageCounts?: Map<string, number>
): Promise<{
  runId: CorrelationId;
  correlationIdFilter?: string;
  total: number;
  matched: number;
  group?: string;
  category?: string;
  concepts: ConceptInventoryRow[];
  groups: Array<{ group: string; count: number }>;
}> {
  const bake = await loadGlossaryBake(path);
  const all = bake.concepts ?? [];
  const matched = filterConcepts(all, opts);
  const usages = usageCounts ?? (await countPortalConceptUsages());
  const rows: ConceptInventoryRow[] = matched.map(c => ({
    id: c.id,
    label: c.label,
    group: conceptGroupOf(c.id),
    category: c.category,
    kind: c.kind ?? '',
    status: c.status ?? '',
    correlationId: (c.correlationId ?? '').trim(),
    addedAt: (c.addedAt ?? '').trim(),
    usage: usages.get(c.id) ?? 0,
  }));
  return {
    runId: opts.runId,
    correlationIdFilter: opts.correlationId,
    total: all.length,
    matched: matched.length,
    group: opts.group,
    category: opts.category,
    concepts: rows,
    groups: groupCounts(matched),
  };
}

async function main(): Promise<void> {
  const opts = parseConceptInventoryOptions();
  if (opts.help) {
    printHelp();
    return;
  }

  const report = await runConceptInventory(opts);

  if (opts.output === 'json') {
    jsonOut(report);
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
    opts.category ? `category=${opts.category}` : null,
    opts.correlationId ? `correlationId=${opts.correlationId}` : null,
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
  if (!opts.group && !opts.correlationId && report.concepts.length > 40) {
    logTable(report.groups.slice(0, 25), ['group', 'count']);
    console.log(colorize(`… ${report.groups.length} groups · pass --group to list ids`, '#8b949e'));
    return;
  }

  logTable(report.concepts, [
    'id',
    'label',
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
