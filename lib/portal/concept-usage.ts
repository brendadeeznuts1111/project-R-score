// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Count concept id references under public/portal (HTML/JS) plus surface-map
 * inventory membership. Used by concept:inventory.
 */
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  HEALTH_FIELD_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPTS,
} from './semantic-vocabulary.ts';

const ROOT = `${import.meta.dir}/../../public/portal`;

const LITERAL_ATTR = /data-glossary-concept\s*=\s*"([^"${][^"]*)"/g;
const HREF_LITERAL = /#glossary:([A-Za-z0-9._-]+)/g;
/** Quoted concept-like ids in glossary-map.js value positions. */
const QUOTED_CONCEPT = /:\s*'([a-z][a-z0-9._-]{2,})'/g;

export type ConceptUsageBreakdown = {
  html: number;
  href: number;
  map: number;
  surface: number;
  total: number;
};

function bump(
  counts: Map<string, ConceptUsageBreakdown>,
  id: string, // brand-ok — glossary concept key, not an entity identity
  field: keyof Omit<ConceptUsageBreakdown, 'total'>
): void {
  const key = id.trim();
  if (!key) return;
  const row = counts.get(key) ?? { html: 0, href: 0, map: 0, surface: 0, total: 0 };
  row[field] += 1;
  row.total = row.html + row.href + row.map + row.surface;
  counts.set(key, row);
}

function surfaceMaps(): Array<Record<string, string>> {
  return [
    PARTNER_HISTORY_SURFACE_CONCEPTS as Record<string, string>,
    PARTNERS_SURFACE_CONCEPTS as Record<string, string>,
    LIMIT_SURFACE_CONCEPTS as Record<string, string>,
    ACCOUNT_DOSSIER_SURFACE_CONCEPTS as Record<string, string>,
    LIMIT_FIELD_CONCEPTS as Record<string, string>,
    HEALTH_FIELD_CONCEPTS as Record<string, string>,
  ];
}

export async function countPortalConceptUsagesDetailed(
  root = ROOT
): Promise<Map<string, ConceptUsageBreakdown>> {
  const counts = new Map<string, ConceptUsageBreakdown>();
  const known = new Set(PORTAL_SEMANTIC_CONCEPTS.map(c => c.id));

  const glob = new Bun.Glob('**/*.{html,js}');
  for await (const rel of glob.scan({ cwd: root, onlyFiles: true })) {
    const text = await Bun.file(`${root}/${rel}`).text();
    for (const match of text.matchAll(LITERAL_ATTR)) {
      if (match[1]) bump(counts, match[1], 'html');
    }
    for (const match of text.matchAll(HREF_LITERAL)) {
      if (match[1]) bump(counts, match[1], 'href');
    }
    // glossary-map.js (and similar) string values that are known portal ids
    if (rel.endsWith('glossary-map.js')) {
      for (const match of text.matchAll(QUOTED_CONCEPT)) {
        const id = match[1];
        if (id && known.has(id)) bump(counts, id, 'map');
      }
    }
  }

  for (const map of surfaceMaps()) {
    for (const id of Object.values(map)) {
      bump(counts, id, 'surface');
    }
  }

  return counts;
}

/** Flat total counts for inventory tables. */
export async function countPortalConceptUsages(root = ROOT): Promise<Map<string, number>> {
  const detailed = await countPortalConceptUsagesDetailed(root);
  const flat = new Map<string, number>();
  for (const [id, row] of detailed) {
    flat.set(id, row.total);
  }
  return flat;
}
