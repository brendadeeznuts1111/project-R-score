#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Portal concept inventory — filter/group by business domain.
 *
 *   bun run concept:inventory
 *   bun run concept:inventory -- --domain accounting
 *   bun run concept:inventory -- --group-by domain
 *   bun run concept:inventory -- --unused --group-by domain
 *   bun run concept:inventory -- --domain-summary
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  CONCEPT_DOMAINS,
  DOMAIN_METADATA,
  type ConceptDomain,
  isConceptDomain,
} from '../lib/portal/concept-domains.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConcept,
} from '../lib/portal/semantic-vocabulary.ts';
import { joinPath } from '../lib/path-bun.ts';

const REPO = joinPath(import.meta.dir, '..');

export type InventoryOptions = {
  domain?: ConceptDomain;
  groupBy: 'domain' | 'id' | 'semanticType';
  unusedOnly: boolean;
  usedOnly: boolean;
  domainSummary: boolean;
  output: 'table' | 'json';
  help: boolean;
};

export type InventoryRow = {
  id: string; // brand-ok — glossary concept key
  label: string;
  domain: ConceptDomain;
  semanticType: string;
  usage: number;
  used: boolean;
};

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

export function parseInventoryOptions(argv: readonly string[] = Bun.argv): InventoryOptions {
  const domainRaw = argValue(argv, '--domain')?.trim();
  const groupByRaw = argValue(argv, '--group-by')?.trim();
  return {
    domain: domainRaw && isConceptDomain(domainRaw) ? domainRaw : undefined,
    groupBy:
      groupByRaw === 'domain' || groupByRaw === 'semanticType' || groupByRaw === 'id'
        ? groupByRaw
        : 'id',
    unusedOnly: argv.includes('--unused'),
    usedOnly: argv.includes('--used'),
    domainSummary: argv.includes('--domain-summary'),
    output: argValue(argv, '--output') === 'json' ? 'json' : 'table',
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

/** Count concept id hits under public/portal (simple substring scan). */
export async function scanPortalUsage(
  concepts: readonly PortalSemanticConcept[]
): Promise<Map<string, number>> {
  const portalRoot = joinPath(REPO, 'public/portal');
  const counts = new Map<string, number>(concepts.map(c => [c.id, 0]));
  const sorted = [...concepts].map(c => c.id).sort((a, b) => b.length - a.length);
  const glob = new Bun.Glob('**/*.{html,js}');
  try {
    for await (const rel of glob.scan({ cwd: portalRoot, onlyFiles: true })) {
      const text = await Bun.file(`${portalRoot}/${rel}`).text();
      for (const id of sorted) {
        if (id.length < 6) continue;
        let n = 0;
        let idx = 0;
        while (true) {
          const hit = text.indexOf(id, idx);
          if (hit === -1) break;
          n++;
          idx = hit + id.length;
        }
        if (n > 0) counts.set(id, (counts.get(id) ?? 0) + n);
      }
    }
  } catch {
    /* portal missing */
  }
  return counts;
}

export function buildInventoryRows(
  concepts: readonly PortalSemanticConcept[],
  usage: Map<string, number>,
  opts: Pick<InventoryOptions, 'domain' | 'unusedOnly' | 'usedOnly'>
): InventoryRow[] {
  const rows: InventoryRow[] = [];
  for (const c of concepts) {
    if (opts.domain && c.domain !== opts.domain) continue;
    const n = usage.get(c.id) ?? 0;
    const used = n > 0;
    if (opts.unusedOnly && used) continue;
    if (opts.usedOnly && !used) continue;
    rows.push({
      id: c.id,
      label: c.label,
      domain: c.domain,
      semanticType: c.semanticType,
      usage: n,
      used,
    });
  }
  return rows.sort((a, b) => a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
}

export type DomainSummaryRow = {
  domain: ConceptDomain;
  label: string;
  concepts: number;
  used: number;
  unused: number;
  usageHits: number;
};

export function domainSummaryTable(rows: readonly InventoryRow[]): DomainSummaryRow[] {
  const by = new Map<ConceptDomain, DomainSummaryRow>();
  for (const d of CONCEPT_DOMAINS) {
    by.set(d, {
      domain: d,
      label: DOMAIN_METADATA[d].label,
      concepts: 0,
      used: 0,
      unused: 0,
      usageHits: 0,
    });
  }
  for (const r of rows) {
    const row = by.get(r.domain)!;
    row.concepts++;
    row.usageHits += r.usage;
    if (r.used) row.used++;
    else row.unused++;
  }
  return [...by.values()]
    .filter(r => r.concepts > 0)
    .sort((a, b) => b.concepts - a.concepts || a.domain.localeCompare(b.domain));
}

function printHelp(): void {
  console.log(`concept:inventory — portal semantic concepts by business domain

Usage:
  bun run concept:inventory [--domain accounting] [--group-by domain] [--unused]
  bun run concept:inventory -- --domain-summary
  bun run concept:inventory -- --output json

Flags:
  --domain <ConceptDomain>   Filter to one business domain
  --group-by domain|id|semanticType
  --unused / --used          Usage filters (portal HTML/JS scan)
  --domain-summary           Per-domain health table
  --output table|json
`);
}

async function main(): Promise<void> {
  const opts = parseInventoryOptions();
  if (opts.help) {
    printHelp();
    return;
  }

  const usage = await scanPortalUsage(PORTAL_SEMANTIC_CONCEPTS);
  // For domain summary, ignore unused/used filters on the base set
  const allRows = buildInventoryRows(PORTAL_SEMANTIC_CONCEPTS, usage, {
    domain: opts.domain,
    unusedOnly: false,
    usedOnly: false,
  });
  const filtered = buildInventoryRows(PORTAL_SEMANTIC_CONCEPTS, usage, opts);

  if (opts.domainSummary || Bun.argv.includes('--domain-summary')) {
    const summary = domainSummaryTable(allRows);
    const total = {
      domain: 'TOTAL' as const,
      label: '',
      concepts: summary.reduce((s, r) => s + r.concepts, 0),
      used: summary.reduce((s, r) => s + r.used, 0),
      unused: summary.reduce((s, r) => s + r.unused, 0),
      usageHits: summary.reduce((s, r) => s + r.usageHits, 0),
    };
    if (opts.output === 'json') {
      jsonOut({ ok: true, summary, total });
      return;
    }
    console.log(colorize('🏢 Domain summary', '#58a6ff'));
    logTable(
      [
        ...summary.map(r => ({
          domain: r.domain,
          concepts: r.concepts,
          used: r.used,
          unused: r.unused,
          hits: r.usageHits,
        })),
        {
          domain: 'TOTAL',
          concepts: total.concepts,
          used: total.used,
          unused: total.unused,
          hits: total.usageHits,
        },
      ],
      ['domain', 'concepts', 'used', 'unused', 'hits']
    );
    return;
  }

  if (opts.groupBy === 'domain') {
    const summary = domainSummaryTable(filtered);
    if (opts.output === 'json') {
      jsonOut({ ok: true, groups: summary, rows: filtered });
      return;
    }
    for (const g of summary) {
      console.log(
        colorize(
          `\n${DOMAIN_METADATA[g.domain].emoji} ${g.domain} · ${g.concepts} concepts · used=${g.used} unused=${g.unused}`,
          '#58a6ff'
        )
      );
      const slice = filtered.filter(r => r.domain === g.domain);
      logTable(
        slice.map(r => ({ id: r.id, label: r.label, usage: r.usage })),
        ['id', 'label', 'usage']
      );
    }
    return;
  }

  if (opts.output === 'json') {
    jsonOut({ ok: true, count: filtered.length, concepts: filtered });
    return;
  }

  logTable(
    filtered.map(r => ({
      id: r.id,
      domain: r.domain,
      label: r.label,
      usage: r.usage,
    })),
    ['id', 'domain', 'label', 'usage']
  );
  console.log(colorize(`count=${filtered.length}`, '#8b949e'));
}

if (import.meta.main) {
  await main();
}
