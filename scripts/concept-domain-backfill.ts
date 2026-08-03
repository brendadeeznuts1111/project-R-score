#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Auto-assign business `domain` on portal semantic concepts from id prefix.
 *
 *   bun run concept:domain:backfill              # write lib/portal/semantic-vocabulary.ts
 *   bun run concept:domain:backfill -- --check   # fail if missing/invalid domain
 *   bun run concept:domain:backfill -- --dry-run
 *
 * Vocabulary **namespace** (api|ops|page|…) is separate — see
 * `inferPortalSemanticNamespace`. This backfill owns business {@link ConceptDomain}.
 */
import {
  DOMAIN_METADATA,
  inferDomain,
  isConceptDomain,
  type ConceptDomain,
} from '../lib/portal/concept-domains.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import { colorize, logTable } from '../lib/console-depth.ts';

const VOCAB_PATH = `${import.meta.dir}/../lib/portal/semantic-vocabulary.ts`;
const CHECK = Bun.argv.includes('--check');
const DRY = Bun.argv.includes('--dry-run');

export type PlanRow = {
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
    const had = currentDomain(concept) !== undefined;
    const current = currentDomain(concept);
    plan.push({
      id: concept.id,
      domain: inferred,
      hadDomain: had,
      changed: !had || current !== inferred,
    });
  }
  return { plan, tbd };
}

export async function writeDomainBackfill(
  plan: PlanRow[],
  opts?: { dryRun?: boolean; vocabPath?: string }
): Promise<number> {
  const dryRun = opts?.dryRun ?? DRY;
  const vocabPath = opts?.vocabPath ?? VOCAB_PATH;
  let src = await Bun.file(vocabPath).text();
  let written = 0;

  const idRe = /\n  \{\n    id: '([^']+)',/g;
  const inserts: Array<{ at: number; text: string }> = [];

  for (const match of src.matchAll(idRe)) {
    const id = match[1]!;
    const row = plan.find(p => p.id === id);
    if (!row) continue;
    const from = match.index! + match[0].length;
    const closeComma = src.indexOf('\n  },', from);
    const closeBare = src.indexOf('\n  }', from);
    let close = -1;
    if (closeComma !== -1 && (closeBare === -1 || closeComma <= closeBare)) close = closeComma;
    else close = closeBare;
    if (close === -1) continue;
    const block = src.slice(match.index!, close);

    // Skip if this block's domain is already a business domain (not a leftover namespace).
    if (/\n    domain:\s*'/.test(block)) {
      const next = block.replace(/\n    domain:\s*'[^']*',/, `\n    domain: '${row.domain}',`);
      if (next !== block) {
        src = `${src.slice(0, match.index!)}${next}${src.slice(close)}`;
        written++;
      }
      continue;
    }

    // Prefer insert after namespace when present; else after id.
    const nsMatch = block.match(/\n    namespace: '[^']*',/);
    if (nsMatch && nsMatch.index !== undefined) {
      const at = match.index! + nsMatch.index + nsMatch[0].length;
      inserts.push({ at, text: `\n    domain: '${row.domain}',` });
    } else {
      inserts.push({ at: from, text: `\n    domain: '${row.domain}',` });
    }
  }

  inserts.sort((a, b) => b.at - a.at);
  for (const ins of inserts) {
    src = `${src.slice(0, ins.at)}${ins.text}${src.slice(ins.at)}`;
    written++;
  }

  // Page map spread — ensure domain: 'portal' as const after namespace.
  if (!src.includes("domain: 'portal' as const")) {
    src = src.replace(
      /namespace: 'page' as const,\n/,
      `namespace: 'page' as const,\n    domain: 'portal' as const,\n`
    );
    written++;
  }

  if (!dryRun) await Bun.write(vocabPath, src);
  return written;
}

async function main(): Promise<void> {
  const { plan, tbd } = planDomainBackfill();
  const needing = plan.filter(p => p.changed);
  const byDomain = new Map<ConceptDomain, number>();
  for (const row of plan) {
    byDomain.set(row.domain, (byDomain.get(row.domain) ?? 0) + 1);
  }

  if (CHECK) {
    const missing = plan.filter(p => !p.hadDomain);
    if (missing.length > 0) {
      console.error(colorize(`❌ ${missing.length} concept(s) missing business domain`, '#f85149'));
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
      colorize(
        `🔍 Dry run – would assign domains to ${needing.length}/${plan.length} concepts`,
        '#8b949e'
      )
    );
    logTable(
      needing.slice(0, 15).map(r => ({
        id: r.id,
        domain: r.domain,
        label: DOMAIN_METADATA[r.domain].label,
      })),
      ['id', 'domain', 'label']
    );
    if (needing.length > 15) console.log(`  … and ${needing.length - 15} more`);
    logTable(
      [...byDomain.entries()]
        .map(([domain, count]) => ({ domain, count, label: DOMAIN_METADATA[domain].label }))
        .sort((a, b) => b.count - a.count),
      ['domain', 'count', 'label']
    );
    return;
  }

  const written = await writeDomainBackfill(plan);
  console.log(
    `✅ wrote domain backfill · ${written} edit(s) · ${plan.length} concepts · changed=${needing.length}`
  );
  logTable(
    [...byDomain.entries()]
      .map(([domain, count]) => ({ domain, count, label: DOMAIN_METADATA[domain].label }))
      .sort((a, b) => b.count - a.count),
    ['domain', 'count', 'label']
  );
  if (tbd.length > 0) {
    console.log(colorize(`note: ${tbd.length} concept(s) map to tbd`, '#8b949e'));
  }
}

if (import.meta.main) {
  await main();
}
