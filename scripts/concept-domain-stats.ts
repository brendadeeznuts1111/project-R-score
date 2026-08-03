#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept domain stats — health metrics per vocabulary domain.
 *
 *   bun scripts/concept-domain-stats.ts [--domain <d>] [--output json|table]
 *
 * Env: CONCEPT_DOMAIN_STATS_DOMAIN · CONCEPT_DOMAIN_OUTPUT (flags win).
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  PORTAL_SEMANTIC_DOMAINS,
} from '../lib/portal/semantic-vocabulary.ts';
import {
  conceptDomainOf,
  conceptStatusOf,
  type DomainConceptInput,
} from './concept-domain-list.ts';

export type DomainGroupCount = {
  group: string; // brand-ok — two-segment concept id prefix
  count: number;
};

export type DomainStats = {
  domain: string; // brand-ok — vocabulary domain (first id segment)
  total: number;
  active: number;
  deprecated: number;
  archived: number;
  usageTotal: number;
  usedConcepts: number;
  zeroUsageIds: string[]; // brand-ok — concept ids with zero usage
  provenance: number;
  provenancePct: number;
  groups: DomainGroupCount[];
  oldestAddedAt: string | null;
  newestAddedAt: string | null;
};

/** Two-segment group prefix (`ops.limits.node` → `ops.limits`). */
export function conceptGroupOf(id: string): string {
  // brand-ok — glossary concept key prefixing
  const parts = id.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (parts[0] ?? 'other');
}

export function buildDomainStats(
  concepts: readonly DomainConceptInput[],
  usageCounts: ReadonlyMap<string, number>,
  domain?: string
): DomainStats[] {
  const domains = domain ? [domain] : PORTAL_SEMANTIC_DOMAINS;
  const out: DomainStats[] = [];

  for (const d of domains) {
    const rows = concepts.filter(c => conceptDomainOf(c) === d);
    if (!domain && rows.length === 0) continue;

    let usageTotal = 0;
    let usedConcepts = 0;
    let active = 0;
    let deprecated = 0;
    let archived = 0;
    let provenance = 0;
    const zeroUsageIds: string[] = [];
    const groups = new Map<string, number>();
    const addedAts: string[] = [];

    for (const c of rows) {
      const usage = usageCounts.get(c.id) ?? 0;
      usageTotal += usage;
      if (usage > 0) usedConcepts += 1;
      else zeroUsageIds.push(c.id);

      const status = conceptStatusOf(c);
      if (status === 'deprecated') deprecated += 1;
      else if (status === 'archived') archived += 1;
      else active += 1;

      if ((c.correlationId ?? '').trim().length > 0) provenance += 1;
      groups.set(conceptGroupOf(c.id), (groups.get(conceptGroupOf(c.id)) ?? 0) + 1);
      if (c.addedAt) addedAts.push(c.addedAt);
    }

    addedAts.sort();
    out.push({
      domain: d,
      total: rows.length,
      active,
      deprecated,
      archived,
      usageTotal,
      usedConcepts,
      zeroUsageIds: zeroUsageIds.sort(),
      provenance,
      provenancePct: rows.length === 0 ? 0 : Math.round((provenance / rows.length) * 100),
      groups: [...groups.entries()]
        .map(([group, count]) => ({ group, count }))
        .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group)),
      oldestAddedAt: addedAts[0] ?? null,
      newestAddedAt: addedAts[addedAts.length - 1] ?? null,
    });
  }

  return out;
}

function resolveStr(argv: readonly string[], flag: string, envKey: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  const i = argv.indexOf(flag);
  const fromFlag = (eq ? eq.slice(flag.length + 1) : i !== -1 ? argv[i + 1] : undefined)?.trim();
  if (fromFlag) return fromFlag;
  return Bun.env[envKey]?.trim() || undefined;
}

async function main(): Promise<void> {
  const output =
    resolveStr(Bun.argv, '--output', 'CONCEPT_DOMAIN_OUTPUT') === 'json' ? 'json' : 'table';
  const domain = resolveStr(Bun.argv, '--domain', 'CONCEPT_DOMAIN_STATS_DOMAIN');
  if (domain && !(PORTAL_SEMANTIC_DOMAINS as readonly string[]).includes(domain)) {
    console.error(
      colorize(
        `unknown domain '${domain}' · expected one of ${PORTAL_SEMANTIC_DOMAINS.join(', ')}`,
        '#f85149'
      )
    );
    process.exit(1);
  }

  const usageCounts = await countPortalConceptUsages();
  const stats = buildDomainStats(PORTAL_SEMANTIC_CONCEPTS, usageCounts, domain);

  if (output === 'json') {
    jsonOut(domain ? (stats[0] ?? null) : stats);
    return;
  }

  for (const s of stats) {
    console.log(
      colorize(
        `${s.domain} · total=${s.total} active=${s.active} deprecated=${s.deprecated} archived=${s.archived} · usage=${s.usageTotal} (${s.usedConcepts} used) · provenance=${s.provenancePct}%`,
        '#8b949e'
      )
    );
    logTable(s.groups, ['group', 'count']);
    if (s.zeroUsageIds.length > 0) {
      console.log(colorize(`zero-usage (${s.zeroUsageIds.length}):`, '#8b949e'));
      for (const id of s.zeroUsageIds.slice(0, 20)) console.log(`  · ${id}`);
      if (s.zeroUsageIds.length > 20) console.log(`  … ${s.zeroUsageIds.length - 20} more`);
    }
    if (s.oldestAddedAt || s.newestAddedAt) {
      console.log(`addedAt · oldest=${s.oldestAddedAt ?? '—'} newest=${s.newestAddedAt ?? '—'}`);
    }
    console.log('');
  }
}

if (import.meta.main) {
  await main();
}
