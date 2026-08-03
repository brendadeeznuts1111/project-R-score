// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  DOMAIN_BY_PREFIX,
  inferDomain,
  isConceptDomain,
} from '../lib/portal/concept-domains.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import { planDomainBackfill } from '../scripts/concept-domain-backfill.ts';
import { validateConceptDomains } from '../scripts/validate-concept-domain.ts';
import {
  buildInventoryRows,
  domainSummaryTable,
} from '../tools/concept-inventory.ts';

describe('concept domains', () => {
  test('inferDomain uses longest prefix match', () => {
    expect(inferDomain('ops.limits.account')).toBe('compliance');
    expect(inferDomain('ops.metric.raises')).toBe('partners');
    expect(inferDomain('ui.semantic.surface')).toBe('portal');
    expect(inferDomain('accounting.transfer')).toBe('accounting');
    expect(inferDomain('telegram.handshake')).toBe('telegram');
    expect(inferDomain('api.agent')).toBe('infrastructure');
    expect(inferDomain('totally.unknown.xyz')).toBe('tbd');
  });

  test('DOMAIN_BY_PREFIX is sorted by specificity (no shorter-before-longer trap)', () => {
    // ops.limits. must beat ops.
    expect(inferDomain('ops.limits.foo')).toBe('compliance');
    expect(inferDomain('ops.channel.foo')).toBe('operations');
  });

  test('every portal concept has a valid business domain', () => {
    const report = validateConceptDomains();
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(Object.keys(report.byDomain).length).toBeGreaterThan(0);
    for (const c of PORTAL_SEMANTIC_CONCEPTS) {
      expect(isConceptDomain(c.domain)).toBe(true);
    }
  });

  test('backfill plan is fully assigned (no missing domains on SSOT)', () => {
    const { plan, tbd } = planDomainBackfill();
    expect(plan.every(p => p.hadDomain)).toBe(true);
    expect(plan.length).toBe(PORTAL_SEMANTIC_CONCEPTS.length);
    // tbd is ok only if prefixes miss — current vocab should not need it
    expect(tbd.length).toBe(0);
  });

  test('domain summary aggregates inventory rows', () => {
    const usage = new Map(PORTAL_SEMANTIC_CONCEPTS.map((c, i) => [c.id, i % 3 === 0 ? 2 : 0]));
    const rows = buildInventoryRows(PORTAL_SEMANTIC_CONCEPTS, usage, {});
    const summary = domainSummaryTable(rows);
    const totalConcepts = summary.reduce((s, r) => s + r.concepts, 0);
    expect(totalConcepts).toBe(PORTAL_SEMANTIC_CONCEPTS.length);
    expect(summary.every(r => r.used + r.unused === r.concepts)).toBe(true);
  });

  test('inventory filters by domain and unused', () => {
    const usage = new Map([['ui.semantic.surface', 5]]);
    const unusedPortal = buildInventoryRows(PORTAL_SEMANTIC_CONCEPTS, usage, {
      domain: 'portal',
      unusedOnly: true,
      usedOnly: false,
    });
    expect(unusedPortal.every(r => r.domain === 'portal')).toBe(true);
    expect(unusedPortal.every(r => r.usage === 0)).toBe(true);
    expect(unusedPortal.some(r => r.id === 'ui.semantic.surface')).toBe(false);
  });
});
