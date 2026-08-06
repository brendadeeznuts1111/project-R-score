import { describe, expect, test } from 'bun:test';
import {
  CHROME_DOMAIN_LANE_IDS,
  CONCEPT_DOMAINS,
  SESSION_LANE_IDS,
  SESSION_LANES,
  WORKSPACE_TAXONOMY_CORRELATIONS,
  buildWorkspaceTaxonomyMap,
  correlationsForSessionLane,
  explainHomonym,
  isConceptDomain,
  isSessionLane,
} from '../lib/docs/workspace-taxonomy.ts';
import { PORTAL_DOMAIN_LANE_META } from '../lib/portal/chrome-catalog.ts';

describe('workspace taxonomy', () => {
  test('every SESSION_LANES id is a SessionLaneId', () => {
    expect(SESSION_LANES.map(l => l.id)).toEqual([...SESSION_LANE_IDS]);
    for (const id of SESSION_LANE_IDS) {
      expect(isSessionLane(id)).toBe(true);
    }
    expect(isSessionLane('trading')).toBe(false);
  });

  test('every session lane has exactly one correlation row', () => {
    expect(WORKSPACE_TAXONOMY_CORRELATIONS.length).toBe(SESSION_LANE_IDS.length);
    const lanes = WORKSPACE_TAXONOMY_CORRELATIONS.map(r => r.sessionLane).sort();
    expect(lanes).toEqual([...SESSION_LANE_IDS].sort());
    for (const id of SESSION_LANE_IDS) {
      const row = correlationsForSessionLane(id);
      expect(row.sessionLane).toBe(id);
      expect(typeof row.rationale).toBe('string');
      expect(row.rationale.length).toBeGreaterThan(10);
    }
  });

  test('correlation chrome/concept ids resolve against live exports', () => {
    const chromeSet = new Set(CHROME_DOMAIN_LANE_IDS);
    expect(chromeSet.size).toBe(PORTAL_DOMAIN_LANE_META.length);
    for (const row of WORKSPACE_TAXONOMY_CORRELATIONS) {
      for (const c of row.chromeDomains) {
        expect(chromeSet.has(c)).toBe(true);
      }
      for (const d of row.conceptDomains) {
        expect(isConceptDomain(d)).toBe(true);
        expect(CONCEPT_DOMAINS).toContain(d);
      }
      // Shape is correlates-only (no parent/child keys)
      expect('parent' in row).toBe(false);
      expect('child' in row).toBe(false);
      expect('children' in row).toBe(false);
      expect(Array.isArray(row.chromeDomains)).toBe(true);
      expect(Array.isArray(row.conceptDomains)).toBe(true);
      expect(Array.isArray(row.commitScopeHints)).toBe(true);
    }
  });

  test('partner homonym spans session + chrome + concept (+ commit hint)', () => {
    const exp = explainHomonym('partner');
    expect(exp.summary).toContain('homonym');
    const machines = new Set(exp.hits.map(h => h.machine));
    expect(machines.has('sessionLane')).toBe(true);
    expect(machines.has('chromeDomain')).toBe(true);
    expect(machines.has('conceptDomain')).toBe(true);
    expect(exp.hits.some(h => h.id === 'partners')).toBe(true);
  });

  test('explainHomonym accepts display form harness/infra', () => {
    const exp = explainHomonym('harness/infra');
    expect(exp.hits.some(h => h.machine === 'sessionLane' && h.id === 'harness-infra')).toBe(
      true
    );
  });

  test('buildWorkspaceTaxonomyMap is stable-shaped', () => {
    const map = buildWorkspaceTaxonomyMap('2026-08-06T00:00:00.000Z');
    expect(map.kind).toBe('workspace-lane-map');
    expect(map.schemaVersion).toBe(1);
    expect(map.claim).toBe('workspace-lane-cross-map');
    expect(map.principle).toBe('correlations-not-containment');
    expect(map.sessionLanes.length).toBe(9);
    expect(map.chromeDomains.length).toBe(6);
    expect(map.conceptDomains.length).toBe(CONCEPT_DOMAINS.length);
    expect(map.correlations.length).toBe(9);
    expect(map.docs.lib).toBe('lib/docs/workspace-taxonomy.ts');
  });
});
