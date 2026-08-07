#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept domain list — one rollup row per vocabulary domain
 * (api · ops · page · section · ui = first dotted id segment).
 *
 *   bun scripts/concept-domain-list.ts [--output json|table]
 *
 * Env: CONCEPT_DOMAIN_OUTPUT (json|table — flag wins).
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  PORTAL_SEMANTIC_DOMAINS,
} from '../lib/portal/semantic-vocabulary.ts';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('concept:domain:list', Bun.argv.slice(2))
  : Bun.argv.slice(2);
export type ConceptLifecycleStatus = 'active' | 'deprecated' | 'archived';

/** Minimal structural shape — fixtures and PORTAL_SEMANTIC_CONCEPTS both fit. */
export type DomainConceptInput = {
  readonly id: string; // brand-ok — glossary concept key
  readonly namespace?: string; // brand-ok — vocabulary namespace
  readonly correlationId?: string; // brand-ok — work-item provenance ref
  readonly addedAt?: string;
  readonly status?: ConceptLifecycleStatus;
};

export type DomainListRow = {
  domain: string; // brand-ok — vocabulary domain (first id segment)
  total: number;
  used: number;
  unused: number;
  /** deprecated + archived concepts. */
  inactive: number;
  /** % of concepts carrying a non-empty correlationId. */
  provenancePct: number;
};

/**
 * conceptStatusOf lands in lib/portal/semantic-vocabulary.ts on the lifecycle
 * lane; inline the same rule until it ships (absent/unknown → active).
 */
export function conceptStatusOf(concept: DomainConceptInput): ConceptLifecycleStatus {
  return concept.status === 'deprecated' || concept.status === 'archived'
    ? concept.status
    : 'active';
}

/** Vocabulary domain = first dotted id segment (`ops.limits.node` → `ops`). */
export function conceptDomainOf(concept: DomainConceptInput): string {
  return concept.id.split('.')[0] ?? 'other';
}

export function buildDomainList(
  concepts: readonly DomainConceptInput[],
  usageCounts: ReadonlyMap<string, number>,
  domains: readonly string[] = PORTAL_SEMANTIC_DOMAINS
): DomainListRow[] {
  return domains.map(domain => {
    const rows = concepts.filter(c => conceptDomainOf(c) === domain);
    const used = rows.filter(c => (usageCounts.get(c.id) ?? 0) > 0).length;
    const inactive = rows.filter(c => conceptStatusOf(c) !== 'active').length;
    const withProvenance = rows.filter(c => (c.correlationId ?? '').trim().length > 0).length;
    return {
      domain,
      total: rows.length,
      used,
      unused: rows.length - used,
      inactive,
      provenancePct: rows.length === 0 ? 0 : Math.round((withProvenance / rows.length) * 100),
    };
  });
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
  const usageCounts = await countPortalConceptUsages();
  const rows = buildDomainList(PORTAL_SEMANTIC_CONCEPTS, usageCounts);

  if (output === 'json') {
    jsonOut(rows);
    return;
  }

  console.log(colorize('concept domains · portal semantic vocabulary', '#8b949e'));
  logTable(rows, ['domain', 'total', 'used', 'unused', 'inactive', 'provenancePct']);
}

if (import.meta.main) {
  await main();
}
