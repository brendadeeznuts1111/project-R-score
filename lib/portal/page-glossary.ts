import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  type PortalSemanticConceptKey,
} from './semantic-vocabulary.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from './page-concepts.ts';
import { PORTAL_GLOSSARY_CONCEPT_HASH_INIT, PORTAL_SECTION_HASH_INIT } from './url-planes.ts';

/**
 * First-class section mount for glossary ↔ URL bar ↔ DOM.
 * URL fragment matches {@link PORTAL_SECTION_HASH_INIT} (`#section:{hash}`).
 * Concept deep links use {@link PORTAL_GLOSSARY_CONCEPT_HASH_INIT}.
 * `domId` is the board element id (varies by board — section: / ad-section- / bare).
 *
 * @see ./url-planes.ts — pathname vs hash planes
 */
export type PortalGlossarySection = {
  hash: string;
  domId: string;
  conceptId: PortalSemanticConceptKey;
};

/** Re-export hash URLPattern inits so mounts and routers share one named owner. */
export { PORTAL_SECTION_HASH_INIT, PORTAL_GLOSSARY_CONCEPT_HASH_INIT };

export type PortalGlossarySurface = {
  path: `/${string}/`;
  concept: PortalSemanticConceptKey;
  sections: readonly PortalGlossarySection[];
};

/** Partners / most boards: `id="section:{hash}"` (matches PORTAL_SECTION_HASH_INIT). */
function sectionMount(hash: string, conceptId: PortalSemanticConceptKey): PortalGlossarySection {
  const domId = `section:${hash}`;
  if (!new URLPattern(PORTAL_SECTION_HASH_INIT).test({ hash: domId })) {
    throw new Error(`sectionMount: hash ${hash} does not satisfy PORTAL_SECTION_HASH_INIT`);
  }
  return { hash, domId, conceptId };
}

/** Account dossier: `id="ad-section-{hash}"`. */
function adSectionMount(hash: string, conceptId: PortalSemanticConceptKey): PortalGlossarySection {
  return { hash, domId: `ad-section-${hash}`, conceptId };
}

/** Limits / partner-history: bare `id="{hash}"` with URL `#section:{hash}`. */
function bareMount(hash: string, conceptId: PortalSemanticConceptKey): PortalGlossarySection {
  return { hash, domId: hash, conceptId };
}

const PAGE_SECTIONS: Readonly<
  Partial<Record<PortalSemanticConceptKey, readonly PortalGlossarySection[]>>
> = {
  [LIMIT_SURFACE_CONCEPTS.page]: [
    bareMount('account-control', LIMIT_SURFACE_CONCEPTS.accountControl),
    bareMount('compliance-kpi-control', LIMIT_SURFACE_CONCEPTS.complianceKpis),
    bareMount('jurisdiction-control', LIMIT_SURFACE_CONCEPTS.jurisdictionCatalog),
    bareMount('pattern-summary', LIMIT_SURFACE_CONCEPTS.patternSummary),
    bareMount('prediction', LIMIT_SURFACE_CONCEPTS.prediction),
    bareMount('research-queue', LIMIT_FIELD_CONCEPTS.evidenceTrace),
    bareMount('sportsbook-patterns', LIMIT_SURFACE_CONCEPTS.sportsbookPatterns),
    bareMount('geo-patterns-section', LIMIT_SURFACE_CONCEPTS.stateZipPatterns),
    bareMount('downline-context', LIMIT_SURFACE_CONCEPTS.downlineContext),
    bareMount('connection-audit', LIMIT_SURFACE_CONCEPTS.dataConnectionAudit),
    bareMount('recent-changes', LIMIT_SURFACE_CONCEPTS.recentLimitChanges),
    bareMount('node-breakdown', LIMIT_SURFACE_CONCEPTS.perNodeBreakdown),
  ],
  [PARTNER_HISTORY_SURFACE_CONCEPTS.page]: [
    bareMount('opening-baseline', PARTNER_HISTORY_SURFACE_CONCEPTS.openingBaseline),
    // Same board also mounts recent/node panels (hrefs + ids); govern them.
    bareMount('recent-changes', LIMIT_SURFACE_CONCEPTS.recentLimitChanges),
    bareMount('node-breakdown', LIMIT_SURFACE_CONCEPTS.perNodeBreakdown),
  ],
  [ACCOUNT_DOSSIER_SURFACE_CONCEPTS.page]: [
    adSectionMount('identity', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.identity),
    adSectionMount('tree', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.tree),
    adSectionMount('location', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.location),
    adSectionMount('traces', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.traces),
    adSectionMount('policies', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.policies),
    adSectionMount('telemetry', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.telemetry),
    adSectionMount('changes', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.changes),
    adSectionMount('outs', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.outs),
    adSectionMount('telegram', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.telegram),
    adSectionMount('accounting', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.accounting),
    adSectionMount('activity', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.activity),
  ],
  [PARTNERS_SURFACE_CONCEPTS.page]: [
    sectionMount('telegram', PARTNERS_SURFACE_CONCEPTS.telegram),
    sectionMount('accounting', PARTNERS_SURFACE_CONCEPTS.accounting),
    sectionMount('accounts-limits', PARTNERS_SURFACE_CONCEPTS.accountsLimits),
    sectionMount('onboard', PARTNERS_SURFACE_CONCEPTS.onboard),
    sectionMount('deposits', PARTNERS_SURFACE_CONCEPTS.deposits),
    sectionMount('partner-message', PARTNERS_SURFACE_CONCEPTS.partnerMessage),
    sectionMount('outs', PARTNERS_SURFACE_CONCEPTS.outs),
    sectionMount('books', PARTNERS_SURFACE_CONCEPTS.bookDetail),
    sectionMount('tag-filter-bar', PARTNERS_SURFACE_CONCEPTS.tags),
  ],
};

export const PORTAL_GLOSSARY_SURFACES: readonly PortalGlossarySurface[] =
  PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => ({
    path: page.path,
    concept: page.id,
    sections: PAGE_SECTIONS[page.id] ?? [],
  }));

/** Lookup concept id by URL section hash (`#section:{hash}`). */
export function sectionConceptId(
  surface: PortalGlossarySurface | undefined,
  hash: string
): PortalSemanticConceptKey | undefined {
  return surface?.sections.find(s => s.hash === hash)?.conceptId;
}

/** Legacy Record view (hash → conceptId) for tests / simple maps. */
export function sectionsByHash(
  surface: PortalGlossarySurface | undefined
): Record<string, PortalSemanticConceptKey> {
  const out: Record<string, PortalSemanticConceptKey> = {};
  for (const s of surface?.sections ?? []) out[s.hash] = s.conceptId;
  return out;
}

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
    const hashes = new Set<string>();
    const domIds = new Set<string>();
    for (const section of surface.sections) {
      if (!knownConcepts.has(section.conceptId)) {
        throw new Error(
          `Unknown section glossary concept: ${surface.path}#${section.hash} → ${section.conceptId}`
        );
      }
      if (hashes.has(section.hash)) {
        throw new Error(`Duplicate section hash on ${surface.path}: ${section.hash}`);
      }
      if (domIds.has(section.domId)) {
        throw new Error(`Duplicate section domId on ${surface.path}: ${section.domId}`);
      }
      hashes.add(section.hash);
      domIds.add(section.domId);
    }
  }
}

/**
 * Section hashes present as mounts in board HTML but missing from
 * {@link PORTAL_GLOSSARY_SURFACES}. Ungoverned hashes break breadcrumb sync.
 */
export function orphanDomSectionHashes(path: `/${string}/`, html: string): string[] {
  const surface = PORTAL_GLOSSARY_SURFACES.find(s => s.path === path);
  const mappedHashes = new Set((surface?.sections ?? []).map(s => s.hash));
  const orphans = new Set<string>();

  for (const m of html.matchAll(/\bid="section:([^"]+)"/g)) {
    if (!mappedHashes.has(m[1]!)) orphans.add(m[1]!);
  }
  for (const m of html.matchAll(/\bid="ad-section-([^"]+)"/g)) {
    if (!mappedHashes.has(m[1]!)) orphans.add(m[1]!);
  }
  // Bare mounts linked as #section:{hash} (limits / partner-history).
  for (const m of html.matchAll(/href="#section:([^"]+)"/g)) {
    const hash = m[1]!;
    if (mappedHashes.has(hash)) continue;
    if (html.includes(`id="${hash}"`) || html.includes(`id="section:${hash}"`)) {
      orphans.add(hash);
    }
  }

  return [...orphans].sort();
}

/** Sections in the surface map whose `domId` is absent from board HTML. */
export function missingDomSectionMounts(path: `/${string}/`, html: string): string[] {
  const surface = PORTAL_GLOSSARY_SURFACES.find(s => s.path === path);
  if (!surface) return [];
  return surface.sections.filter(s => !html.includes(`id="${s.domId}"`)).map(s => s.hash);
}
