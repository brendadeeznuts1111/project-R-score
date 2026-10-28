#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 *   bun run concept:domain:backfill              # write lib/portal/semantic-vocabulary.ts
 *   bun run concept:domain:backfill -- --check   # fail if missing/invalid domain
 *   bun run concept:domain:backfill -- --dry-run
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

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('concept:domain:backfill', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const VOCAB_PATH = `${import.meta.dir}/../lib/portal/semantic-vocabulary.ts`;
const CHECK = argv.includes('--check');
const DRY = argv.includes('--dry-run');

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
