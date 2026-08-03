#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Auto-assign business `domain` on portal semantic concepts from id prefix.
 *
 *   bun run concept:domain:backfill              # write lib/portal/semantic-vocabulary.ts
 *   bun run concept:domain:backfill -- --check    # fail if missing/invalid domain
 *   bun run concept:domain:backfill -- --dry-run
 *
 * Id **namespace** (api|ops|page|section|ui) is not the same as business
 * {@link ConceptDomain} — see lib/portal/concept-domains.ts.
 */
import { colorize, logTable } from '../lib/console-depth.ts';
import {
  DOMAIN_METADATA,
  inferDomain,
  isConceptDomain,
  type ConceptDomain,
} from '../lib/portal/concept-domains.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';

const VOCAB_PATH = `${import.meta.dir}/../lib/portal/semantic-vocabulary.ts`;
const CHECK = Bun.argv.includes('--check');
const DRY = Bun.argv.includes('--dry-run');

type PlanRow = {
  id: string; // brand-ok — glossary concept key
  domain: ConceptDomain;
  hadDomain: boolean;
  changed: boolean;
};

function currentDomain(
  concept: (typeof PORTAL_SEMANTIC_CONCEPTS)[number]
): ConceptDomain | undefined {
  if (
    'domain' in concept &&
    typeof concept.domain === 'string' &&
    isConceptDomain(concept.domain)
  ) {
    return concept.domain;
  }
  return undefined;
}

export function planDomainBackfill(
  concepts: readonly (typeof PORTAL_SEMANTIC_CONCEPTS)[number][] = PORTAL_SEMANTIC_CONCEPTS
): { plan: PlanRow[]; tbd: string[] } {
  const plan: PlanRow[] = [];
  const tbd: string[] = [];
  for (const concept of concepts) {
    const inferred = inferDomain(concept.id);
    if (inferred === 'tbd') tbd.push(concept.id);
    const current = currentDomain(concept);
    const had = current !== undefined;
    plan.push({
      id: concept.id,
      domain: had ? current! : inferred,
      hadDomain: had,
      changed: !had || current !== inferred,
    });
  }
  return { plan, tbd };
}

/**
 * Insert or replace `domain: '…',` immediately after each concept `id: '…',` line
 * inside PORTAL_SEMANTIC_CONCEPTS object literals (not the KEYS array).
 */
export async function writeDomains(plan: PlanRow[]): Promise<number> {
  let src = await Bun.file(VOCAB_PATH).text();
  const start = src.indexOf('export const PORTAL_SEMANTIC_CONCEPTS = [');
  if (start < 0) throw new Error('PORTAL_SEMANTIC_CONCEPTS not found');
  const end = src.indexOf('] as const satisfies readonly PortalSemanticConcept[]', start);
  if (end < 0) throw new Error('PORTAL_SEMANTIC_CONCEPTS terminator not found');

  let block = src.slice(start, end);
  let written = 0;
  const byId = new Map(plan.map(p => [p.id, p.domain]));

  // Match id lines inside object literals: "    id: 'foo',"
  block = block.replace(
    /( {2,4}id: '([^']+)',)(\n {2,4}domain: '[^']*',)?/g,
    (full, idLine: string, id: string, existingDomain: string | undefined) => {
      // brand-ok id — glossary concept key
      const domain = byId.get(id);
      if (!domain) return full;
      const next = `${idLine}\n    domain: '${domain}',`;
      if (existingDomain) {
        if (existingDomain.includes(`'${domain}'`)) return full;
        written++;
        return next;
      }
      written++;
      return next;
    }
  );

  // Page-definition spread objects use domain: 'portal' as const
  if (!block.includes("domain: 'portal' as const")) {
    const next = block.replace(
      /(\.\.\.PORTAL_PAGE_CONCEPT_DEFINITIONS\.map\(page => \(\{[\s\S]*?id: page\.id,)(\n)/,
      `$1\n    domain: 'portal' as const,$2`
    );
    if (next !== block) {
      block = next;
      written++;
    }
  }

  src = `${src.slice(0, start)}${block}${src.slice(end)}`;
  if (!DRY) await Bun.write(VOCAB_PATH, src);
  return written;
}

async function main(): Promise<void> {
  const { plan, tbd } = planDomainBackfill();
  const needing = plan.filter(p => p.changed || !p.hadDomain);
  const byDomain = new Map<ConceptDomain, number>();
  for (const row of plan) {
    byDomain.set(row.domain, (byDomain.get(row.domain) ?? 0) + 1);
  }

  if (CHECK) {
    const missing = plan.filter(p => !p.hadDomain);
    const invalid = PORTAL_SEMANTIC_CONCEPTS.filter(
      c => !('domain' in c) || !isConceptDomain(String((c as { domain?: string }).domain))
    );
    if (missing.length > 0 || invalid.length > 0) {
      console.error(
        colorize(
          `❌ domain check failed · missing=${missing.length} invalid=${invalid.length}`,
          '#f85149'
        )
      );
      for (const row of missing.slice(0, 20)) {
        console.error(`  · ${row.id} → ${row.domain}`);
      }
      process.exit(1);
    }
    console.log(`✅ domain backfill check · ${plan.length} concepts · domains ok`);
    if (tbd.length > 0) {
      console.log(colorize(`note: ${tbd.length} concept(s) map to tbd`, '#8b949e'));
    }
    return;
  }

  if (DRY) {
    console.log(
      colorize(`🔍 Dry run – would touch ${needing.length}/${plan.length} concepts`, '#8b949e')
    );
    logTable(
      needing.slice(0, 20).map(r => ({
        id: r.id,
        domain: r.domain,
        label: DOMAIN_METADATA[r.domain].label,
      })),
      ['id', 'domain', 'label']
    );
    logTable(
      [...byDomain.entries()]
        .map(([domain, count]) => ({
          domain,
          count,
          label: DOMAIN_METADATA[domain].label,
        }))
        .sort((a, b) => b.count - a.count),
      ['domain', 'count', 'label']
    );
    return;
  }

  const written = await writeDomains(plan);
  // Re-import is stale — plan was pre-write. Report edit count.
  console.log(
    `✅ wrote domain backfill · ${written} edit(s) · ${plan.length} concepts · planned-changes=${needing.length}`
  );
  logTable(
    [...byDomain.entries()]
      .map(([domain, count]) => ({
        domain,
        count,
        label: DOMAIN_METADATA[domain].label,
      }))
      .sort((a, b) => b.count - a.count),
    ['domain', 'count', 'label']
  );
  if (tbd.length > 0) {
    console.log(colorize(`note: ${tbd.length} concept(s) map to tbd`, '#8b949e'));
    for (const id of tbd.slice(0, 15)) console.log(`  · ${id}`);
  }
}

if (import.meta.main) {
  await main();
}
