// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  type PortalSemanticConceptKey,
} from './semantic-vocabulary.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from './page-concepts.ts';
import { asDomId, type DomId } from '../types/branded.ts';
import {
  PORTAL_GLOSSARY_CONCEPT_HASH_INIT,
  PORTAL_SECTION_HASH_INIT,
  isPortalSectionHash,
} from './url-planes.ts';

/**
 * First-class section mount for glossary ↔ URL bar ↔ DOM.
 * URL fragment matches {@link PORTAL_SECTION_HASH_INIT} (`#section:{hash}`).
 * Concept deep links use {@link PORTAL_GLOSSARY_CONCEPT_HASH_INIT}.
 * `domId` is the board element id (varies by board — section: / ad-section- / bare).
 * `title` is the human heading SSOT (boards may still hardcode h2 until phase 2).
 *
 * @see ./url-planes.ts — pathname vs hash planes
 */
export type PortalGlossarySection = {
  hash: string;
  domId: DomId;
  conceptId: PortalSemanticConceptKey;
  /** Human-readable section heading (bake SSOT; phase 1 optional for HTML). */
  title: string;
};

/** Re-export hash URLPattern inits so mounts and routers share one named owner. */
export { PORTAL_SECTION_HASH_INIT, PORTAL_GLOSSARY_CONCEPT_HASH_INIT };

export type PortalGlossarySurface = {
  path: `/${string}/`;
  concept: PortalSemanticConceptKey;
  sections: readonly PortalGlossarySection[];
};

/** Partners / most boards: `id="section:{hash}"` (matches PORTAL_SECTION_HASH_INIT). */
function sectionMount(
  hash: string,
  conceptId: PortalSemanticConceptKey,
  title: string
): PortalGlossarySection {
  const domId = asDomId(`section:${hash}`);
  if (!isPortalSectionHash(domId)) {
    throw new Error(`sectionMount: hash ${hash} does not satisfy PORTAL_SECTION_HASH_INIT`);
  }
  return { hash, domId, conceptId, title };
}

/** Account dossier: `id="ad-section-{hash}"`. */
function adSectionMount(
  hash: string,
  conceptId: PortalSemanticConceptKey,
  title: string
): PortalGlossarySection {
  return { hash, domId: asDomId(`ad-section-${hash}`), conceptId, title };
}

/** Limits / partner-history: bare `id="{hash}"` with URL `#section:{hash}`. */
function bareMount(
  hash: string,
  conceptId: PortalSemanticConceptKey,
  title: string
): PortalGlossarySection {
  return { hash, domId: asDomId(hash), conceptId, title };
}

/**
 * Section mounts + titles — SSOT for domain-glossary bake `surfaces[].sections`.
 * Titles match current board headings (limits / partners / partner-history / account).
 */
const PAGE_SECTIONS: Readonly<
  Partial<Record<PortalSemanticConceptKey, readonly PortalGlossarySection[]>>
> = {
  ['page.bookmakers']: [
    bareMount('artifact', 'ui.semantic.artifact', 'Artifact'),
    bareMount('books', 'ui.semantic.resources', 'Books'),
  ],
  [LIMIT_SURFACE_CONCEPTS.page]: [
    bareMount('account-control', LIMIT_SURFACE_CONCEPTS.accountControl, 'Account limit control'),
    bareMount(
      'compliance-kpi-control',
      LIMIT_SURFACE_CONCEPTS.complianceKpis,
      'Compliance policy KPIs'
    ),
    bareMount(
      'jurisdiction-control',
      LIMIT_SURFACE_CONCEPTS.jurisdictionCatalog,
      'Jurisdiction policy catalog'
    ),
    bareMount('pattern-summary', LIMIT_SURFACE_CONCEPTS.patternSummary, 'Pattern summary'),
    bareMount('prediction', LIMIT_SURFACE_CONCEPTS.prediction, 'Limit raise prediction'),
    bareMount('research-queue', LIMIT_FIELD_CONCEPTS.evidenceTrace, 'Pattern research queue'),
    bareMount(
      'sportsbook-patterns',
      LIMIT_SURFACE_CONCEPTS.sportsbookPatterns,
      'Sportsbook patterns'
    ),
    bareMount(
      'geo-patterns-section',
      LIMIT_SURFACE_CONCEPTS.stateZipPatterns,
      'State & ZIP patterns'
    ),
    bareMount(
      'downline-context',
      LIMIT_SURFACE_CONCEPTS.downlineContext,
      'Partner → downline context'
    ),
    bareMount(
      'connection-audit',
      LIMIT_SURFACE_CONCEPTS.dataConnectionAudit,
      'Data connection audit'
    ),
    bareMount('recent-changes', LIMIT_SURFACE_CONCEPTS.recentLimitChanges, 'Recent limit changes'),
    bareMount('node-breakdown', LIMIT_SURFACE_CONCEPTS.perNodeBreakdown, 'Per-node breakdown'),
  ],
  [PARTNER_HISTORY_SURFACE_CONCEPTS.page]: [
    bareMount(
      'opening-baseline',
      PARTNER_HISTORY_SURFACE_CONCEPTS.openingBaseline,
      'Sportsbook opening baseline'
    ),
    // Same board also mounts recent/node panels (hrefs + ids); govern them.
    bareMount('recent-changes', LIMIT_SURFACE_CONCEPTS.recentLimitChanges, 'Recent limit changes'),
    bareMount('node-breakdown', LIMIT_SURFACE_CONCEPTS.perNodeBreakdown, 'Per-account breakdown'),
  ],
  [ACCOUNT_DOSSIER_SURFACE_CONCEPTS.page]: [
    adSectionMount('identity', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.identity, 'Identity'),
    adSectionMount('tree', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.tree, 'Connected tree'),
    adSectionMount('location', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.location, 'Location & license'),
    adSectionMount('traces', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.traces, 'Evidence traces'),
    adSectionMount('policies', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.policies, 'Applicable policies'),
    adSectionMount('telemetry', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.telemetry, 'Limit telemetry'),
    adSectionMount('changes', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.changes, 'Limit changes'),
    adSectionMount('outs', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.outs, 'Partner outs & books'),
    adSectionMount('telegram', ACCOUNT_DOSSIER_SURFACE_CONCEPTS.telegram, 'Telegram package group'),
    adSectionMount(
      'accounting',
      ACCOUNT_DOSSIER_SURFACE_CONCEPTS.accounting,
      'Per-account accounting'
    ),
    adSectionMount(
      'activity',
      ACCOUNT_DOSSIER_SURFACE_CONCEPTS.activity,
      'Telegram & ops activity'
    ),
  ],
  [PARTNERS_SURFACE_CONCEPTS.page]: [
    sectionMount('telegram', PARTNERS_SURFACE_CONCEPTS.telegram, 'Telegram package groups'),
    sectionMount('accounting', PARTNERS_SURFACE_CONCEPTS.accounting, 'Accounting deals'),
    sectionMount(
      'accounts-limits',
      PARTNERS_SURFACE_CONCEPTS.accountsLimits,
      'Accounts and limits'
    ),
    sectionMount('onboard', PARTNERS_SURFACE_CONCEPTS.onboard, 'Onboarding flow'),
    sectionMount('deposits', PARTNERS_SURFACE_CONCEPTS.deposits, 'Betting deposits'),
    sectionMount('partner-message', PARTNERS_SURFACE_CONCEPTS.partnerMessage, 'Partner messages'),
    sectionMount('outs', PARTNERS_SURFACE_CONCEPTS.outs, 'Outs'),
    sectionMount('books', PARTNERS_SURFACE_CONCEPTS.bookDetail, 'Books'),
    sectionMount('tag-filter-bar', PARTNERS_SURFACE_CONCEPTS.tags, 'Partner tags'),
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

/** Lookup section title by URL section hash. */
export function sectionTitle(
  surface: PortalGlossarySurface | undefined,
  hash: string
): string | undefined {
  return surface?.sections.find(s => s.hash === hash)?.title;
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
      if (!section.title?.trim()) {
        throw new Error(`Empty section title: ${surface.path}#${section.hash}`);
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
