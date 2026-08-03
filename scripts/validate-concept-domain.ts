#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Gate: every portal semantic concept must carry a valid business domain.
 *
 *   bun run validate:concept-domain
 *   bun run validate:concept-domain -- --strict   # also fail on domain=tbd
 *
 * Wired for CI ownership accountability (active concepts cannot omit domain).
 */
import { colorize } from '../lib/console-depth.ts';
import { isConceptDomain, type ConceptDomain } from '../lib/portal/concept-domains.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';

const STRICT = Bun.argv.includes('--strict');

export type DomainIssue = {
  id: string; // brand-ok — glossary concept key
  reason: 'missing-domain' | 'invalid-domain' | 'domain-tbd';
  domain?: string;
};

export function validateConceptDomains(
  concepts: readonly (typeof PORTAL_SEMANTIC_CONCEPTS)[number][] = PORTAL_SEMANTIC_CONCEPTS,
  opts: { strictTbd?: boolean } = {}
): { ok: boolean; issues: DomainIssue[]; byDomain: Record<string, number> } {
  const issues: DomainIssue[] = [];
  const byDomain: Record<string, number> = {};

  for (const concept of concepts) {
    const raw =
      'domain' in concept && typeof (concept as { domain?: unknown }).domain === 'string'
        ? String((concept as { domain: string }).domain).trim()
        : '';
    if (!raw) {
      issues.push({ id: concept.id, reason: 'missing-domain' });
      continue;
    }
    if (!isConceptDomain(raw)) {
      issues.push({ id: concept.id, reason: 'invalid-domain', domain: raw });
      continue;
    }
    const domain = raw as ConceptDomain;
    byDomain[domain] = (byDomain[domain] ?? 0) + 1;
    if (opts.strictTbd && domain === 'tbd') {
      issues.push({ id: concept.id, reason: 'domain-tbd', domain });
    }
  }

  return { ok: issues.length === 0, issues, byDomain };
}

async function main(): Promise<void> {
  const report = validateConceptDomains(PORTAL_SEMANTIC_CONCEPTS, {
    strictTbd: STRICT,
  });

  if (!report.ok) {
    console.error(
      colorize(`Concept domain validation: FAIL ✗ (${report.issues.length} issue(s))`, '#f85149')
    );
    for (const issue of report.issues.slice(0, 40)) {
      console.error(`  ✗ ${issue.id} · ${issue.reason}${issue.domain ? ` (${issue.domain})` : ''}`);
    }
    process.exit(1);
  }

  const domains = Object.keys(report.byDomain).length;
  console.log(
    colorize(
      `Concept domain validation: PASS ✓ (${PORTAL_SEMANTIC_CONCEPTS.length} concepts · ${domains} domains)`,
      '#3fb950'
    )
  );
}

if (import.meta.main) {
  await main();
}
