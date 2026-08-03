#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Concept inventory — list/filter the baked domain glossary.
 *
 *   bun run concept:inventory
 *   bun run concept:inventory -- --group ops.limits
 *   bun run concept:inventory -- --category ui --output json
 *   bun run concept:inventory -- --group ui.semantic --category ui --correlation-id <id>
 *
 * Flags:
 *   --group <prefix>     Filter by dotted id prefix (ops.limits, ui.semantic, …)
 *   --category <id>      Filter by glossary category (market · ui · trading · …)
 *   --correlation-id <id> Trace id (default: Bun.randomUUIDv7())
 *   --output json|table  Machine JSON or TTY table (default: table)
 *   --help
 */
import { randomUUIDv7 } from 'bun';
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { asCorrelationId, type CorrelationId } from '../lib/types/branded.ts';

const REGISTRY_PATH = `${import.meta.dir}/../public/registry/domain-glossary.json`;

type GlossaryConcept = {
  id: string; // brand-ok — opaque glossary concept id from domain-glossary bake
  label: string;
  description?: string;
  category: string;
  kind?: string;
  status?: string;
  synonyms?: readonly string[] | null;
  seeAlso?: readonly string[] | null;
  source?: string | null;
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
  correlationId: CorrelationId;
  output: 'table' | 'json';
  help: boolean;
};

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

export function parseConceptInventoryOptions(
  argv: readonly string[] = Bun.argv
): ConceptInventoryOptions {
  const outputRaw = argValue(argv, '--output');
  const correlationRaw = argValue(argv, '--correlation-id') ?? randomUUIDv7();
  return {
    group: argValue(argv, '--group')?.trim() || undefined,
    category: argValue(argv, '--category')?.trim() || undefined,
    correlationId: asCorrelationId(correlationRaw),
    output: outputRaw === 'json' ? 'json' : 'table',
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export function filterConcepts(
  concepts: readonly GlossaryConcept[],
  opts: Pick<ConceptInventoryOptions, 'group' | 'category'>
): GlossaryConcept[] {
  return concepts.filter(c => {
    if (opts.category && c.category !== opts.category) return false;
    if (opts.group) {
      const g = opts.group;
      // Exact id, or dotted prefix with a following segment boundary.
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
    const parts = c.id.split('.');
    const key = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (parts[0] ?? 'other');
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
  --group      Dotted id prefix (e.g. ops.limits, ui.semantic, page)
  --category   Glossary category id (ui · market · trading · tournament · …)

Output:
  --output table  TTY table (default)
  --output json   Machine JSON (includes correlationId)

Examples:
  bun run concept:inventory -- --group ops.limits
  bun run concept:inventory -- --category ui --output json
`);
}

export async function loadGlossaryBake(path = REGISTRY_PATH): Promise<GlossaryBake> {
  return (await Bun.file(path).json()) as GlossaryBake;
}

export async function runConceptInventory(
  opts: ConceptInventoryOptions,
  path = REGISTRY_PATH
): Promise<{
  correlationId: CorrelationId;
  total: number;
  matched: number;
  group?: string;
  category?: string;
  concepts: Array<{
    id: string; // brand-ok — opaque glossary concept id (report row)
    label: string;
    category: string;
    kind: string;
    status: string;
  }>;
  groups: Array<{ group: string; count: number }>;
}> {
  const bake = await loadGlossaryBake(path);
  const all = bake.concepts ?? [];
  const matched = filterConcepts(all, opts);
  const rows = matched.map(c => ({
    id: c.id,
    label: c.label,
    category: c.category,
    kind: c.kind ?? '',
    status: c.status ?? '',
  }));
  return {
    correlationId: opts.correlationId,
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
      `concept:inventory · ${report.matched}/${report.total} · correlationId=${report.correlationId}`,
      '#58a6ff'
    )
  );
  if (opts.group || opts.category) {
    console.log(
      colorize(`filters · group=${opts.group ?? '—'} · category=${opts.category ?? '—'}`, '#8b949e')
    );
  }

  if (report.concepts.length === 0) {
    console.log(colorize('No concepts matched.', '#d29922'));
    process.exitCode = 1;
    return;
  }

  // Compact summary by prefix when unfiltered or large.
  if (!opts.group && report.concepts.length > 40) {
    logTable(report.groups.slice(0, 25), ['group', 'count']);
    console.log(colorize(`… ${report.groups.length} groups · pass --group to list ids`, '#8b949e'));
    return;
  }

  logTable(report.concepts, ['id', 'label', 'category', 'kind', 'status']);
}

if (import.meta.main) {
  await main();
}
