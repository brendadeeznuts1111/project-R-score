import { LIMIT_SURFACE_CONCEPTS, type PortalSemanticConceptKey } from './semantic-vocabulary.ts';

export type PortalGlossarySurface = {
  path: `/${string}/`;
  concept: PortalSemanticConceptKey;
  sections: Readonly<Record<string, PortalSemanticConceptKey>>;
};

export const PORTAL_GLOSSARY_SURFACES = [
  {
    path: '/portal/limits/',
    concept: LIMIT_SURFACE_CONCEPTS.page,
    sections: {
      'account-control': LIMIT_SURFACE_CONCEPTS.accountControl,
      'compliance-kpi-control': LIMIT_SURFACE_CONCEPTS.complianceKpis,
      'jurisdiction-control': LIMIT_SURFACE_CONCEPTS.jurisdictionCatalog,
      'pattern-summary': LIMIT_SURFACE_CONCEPTS.patternSummary,
      prediction: LIMIT_SURFACE_CONCEPTS.prediction,
      'sportsbook-patterns': LIMIT_SURFACE_CONCEPTS.sportsbookPatterns,
      'geo-patterns-section': LIMIT_SURFACE_CONCEPTS.stateZipPatterns,
      'downline-context': LIMIT_SURFACE_CONCEPTS.downlineContext,
      'connection-audit': LIMIT_SURFACE_CONCEPTS.dataConnectionAudit,
      'recent-changes': LIMIT_SURFACE_CONCEPTS.recentLimitChanges,
      'node-breakdown': LIMIT_SURFACE_CONCEPTS.perNodeBreakdown,
    },
  },
] as const satisfies readonly PortalGlossarySurface[];

export function validatePortalGlossarySurfaces(
  knownConcepts: ReadonlySet<PortalSemanticConceptKey>
): void {
  const paths = new Set<string>();
  for (const surface of PORTAL_GLOSSARY_SURFACES) {
    if (paths.has(surface.path)) throw new Error(`Duplicate glossary surface: ${surface.path}`);
    paths.add(surface.path);
    if (!knownConcepts.has(surface.concept)) {
      throw new Error(`Unknown page glossary concept: ${surface.path} → ${surface.concept}`);
    }
    for (const [section, concept] of Object.entries(surface.sections)) {
      if (!knownConcepts.has(concept)) {
        throw new Error(
          `Unknown section glossary concept: ${surface.path}#${section} → ${concept}`
        );
      }
    }
  }
}
