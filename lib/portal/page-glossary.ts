import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  type PortalSemanticConceptKey,
} from './semantic-vocabulary.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from './page-concepts.ts';

export type PortalGlossarySurface = {
  path: `/${string}/`;
  concept: PortalSemanticConceptKey;
  sections: Readonly<Record<string, PortalSemanticConceptKey>>;
};

const PAGE_SECTIONS: Readonly<
  Partial<Record<PortalSemanticConceptKey, Readonly<Record<string, PortalSemanticConceptKey>>>>
> = {
  [LIMIT_SURFACE_CONCEPTS.page]: {
    'account-control': LIMIT_SURFACE_CONCEPTS.accountControl,
    'compliance-kpi-control': LIMIT_SURFACE_CONCEPTS.complianceKpis,
    'jurisdiction-control': LIMIT_SURFACE_CONCEPTS.jurisdictionCatalog,
    'pattern-summary': LIMIT_SURFACE_CONCEPTS.patternSummary,
    prediction: LIMIT_SURFACE_CONCEPTS.prediction,
    // The research queue is an evidence-trace projection, not a duplicate
    // terminology namespace of its own.
    'research-queue': LIMIT_FIELD_CONCEPTS.evidenceTrace,
    'sportsbook-patterns': LIMIT_SURFACE_CONCEPTS.sportsbookPatterns,
    'geo-patterns-section': LIMIT_SURFACE_CONCEPTS.stateZipPatterns,
    'downline-context': LIMIT_SURFACE_CONCEPTS.downlineContext,
    'connection-audit': LIMIT_SURFACE_CONCEPTS.dataConnectionAudit,
    'recent-changes': LIMIT_SURFACE_CONCEPTS.recentLimitChanges,
    'node-breakdown': LIMIT_SURFACE_CONCEPTS.perNodeBreakdown,
  },
  [PARTNER_HISTORY_SURFACE_CONCEPTS.page]: {
    'opening-baseline': PARTNER_HISTORY_SURFACE_CONCEPTS.openingBaseline,
  },
  [ACCOUNT_DOSSIER_SURFACE_CONCEPTS.page]: {
    // Keys match board `id="ad-section-…"` / hash `#section:key` (glossary UX).
    // Section hashes (#section:accounting) use legacy surface concepts to preserve bookmarks.
    // The rendered heading uses ops.view.per_account. See also: ops.view.per_account.
    identity: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.identity,
    tree: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.tree,
    location: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.location,
    traces: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.traces,
    policies: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.policies,
    telemetry: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.telemetry,
    changes: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.changes,
    outs: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.outs,
    telegram: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.telegram,
    accounting: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.accounting,
    activity: ACCOUNT_DOSSIER_SURFACE_CONCEPTS.activity,
  },
  [PARTNERS_SURFACE_CONCEPTS.page]: {
    telegram: PARTNERS_SURFACE_CONCEPTS.telegram,
    accounting: PARTNERS_SURFACE_CONCEPTS.accounting,
    'accounts-limits': PARTNERS_SURFACE_CONCEPTS.accountsLimits,
    deposits: PARTNERS_SURFACE_CONCEPTS.deposits,
    'partner-message': PARTNERS_SURFACE_CONCEPTS.partnerMessage,
    // Keys must match board `id="section:…"` / mount ids (glossary UX → #section:key).
    outs: PARTNERS_SURFACE_CONCEPTS.outs,
    books: PARTNERS_SURFACE_CONCEPTS.bookDetail,
    'tag-filter-bar': PARTNERS_SURFACE_CONCEPTS.tags,
  },
};

export const PORTAL_GLOSSARY_SURFACES: readonly PortalGlossarySurface[] =
  PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => ({
    path: page.path,
    concept: page.id,
    sections: PAGE_SECTIONS[page.id] ?? {},
  }));

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
