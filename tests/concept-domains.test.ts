// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  DOMAIN_METADATA,
  inferDomain,
  isConceptDomain,
} from '../lib/portal/concept-domains.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';

describe('concept-domains', () => {
  test('inferDomain maps prefixes with longest-match wins', () => {
    expect(inferDomain('ops.limits.account')).toBe('compliance');
    expect(inferDomain('ops.metric.raises')).toBe('operations');
    expect(inferDomain('ui.semantic.tone')).toBe('portal');
    expect(inferDomain('page.concepts')).toBe('portal');
    expect(inferDomain('api.health')).toBe('infrastructure');
    expect(inferDomain('partner.seat')).toBe('partners');
    expect(inferDomain('unknown.thing')).toBe('tbd');
  });

  test('DOMAIN_METADATA covers every ConceptDomain', () => {
    for (const domain of Object.keys(DOMAIN_METADATA)) {
      expect(isConceptDomain(domain)).toBe(true);
      expect(DOMAIN_METADATA[domain as keyof typeof DOMAIN_METADATA].label.length).toBeGreaterThan(
        0
      );
    }
  });

  test('every portal concept has namespace + business domain', () => {
    for (const c of PORTAL_SEMANTIC_CONCEPTS) {
      expect(c.namespace.length).toBeGreaterThan(0);
      expect(c.id.startsWith(`${c.namespace}.`)).toBe(true);
      expect(isConceptDomain(c.domain)).toBe(true);
    }
  });
});
