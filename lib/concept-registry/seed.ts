// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Seed concept registry from portal semantic vocabulary + domain-glossary bake.
 */
import type { Database } from 'bun:sqlite';
import { PORTAL_SEMANTIC_CONCEPTS } from '../portal/semantic-vocabulary.ts';
import { joinPath } from '../path-bun.ts';
import {
  defaultAuthor,
  deprecateConcept,
  getConcept,
  upsertConcept,
  upsertUsage,
} from './repository.ts';
import { conceptCategoryOf, conceptGroupOf, type ConceptStatus } from './types.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

export type SeedReport = {
  fromVocabulary: number;
  fromGlossary: number;
  usageRows: number;
  total: number;
  author: string;
};

type GlossaryBakeConcept = {
  id?: string; // brand-ok — glossary concept key from bake
  label?: string;
  description?: string;
  category?: string;
  kind?: string;
  status?: string;
  color?: string | null;
  unit?: string | null;
  format?: string | null;
  mapsTo?: string | null;
  seeAlso?: string[] | null;
  source?: string | null;
  deprecatedBy?: string | null; // brand-ok — replacement concept key
  correlationId?: string | null; // brand-ok — work-item provenance ref
};

function mapStatus(raw: string | undefined): ConceptStatus {
  if (raw === 'deprecated') return 'deprecated';
  if (raw === 'proposed') return 'proposed';
  if (raw === 'archived') return 'archived';
  return 'active';
}

/** Seed portal semantic vocabulary (SSOT TypeScript). */
export function seedFromSemanticVocabulary(db: Database, author = defaultAuthor()): number {
  let n = 0;
  for (const c of PORTAL_SEMANTIC_CONCEPTS) {
    upsertConcept(
      db,
      {
        id: c.id,
        label: c.label,
        kind: 'ui',
        category: conceptCategoryOf(c.id),
        group: conceptGroupOf(c.id),
        summary: c.description,
        unit: 'unit' in c && typeof c.unit === 'string' ? c.unit : undefined,
        format: 'format' in c && typeof c.format === 'string' ? c.format : undefined,
        seeAlso: [...c.seeAlso],
        status: 'active',
        source: 'lib/portal/semantic-vocabulary.ts',
        author,
        correlationId:
          'correlationId' in c && typeof c.correlationId === 'string'
            ? c.correlationId
            : 'semantic-vocabulary',
      },
      author
    );
    n++;
  }
  return n;
}

/** Seed / merge domain-glossary bake (Kalshi cores + Factory overlays). */
export async function seedFromDomainGlossary(
  db: Database,
  glossaryPath = joinPath(REPO_ROOT, 'public/registry/domain-glossary.json'),
  author = defaultAuthor()
): Promise<number> {
  const file = Bun.file(glossaryPath);
  if (!(await file.exists())) return 0;
  const bake = (await file.json()) as { concepts?: GlossaryBakeConcept[] };
  let n = 0;
  for (const c of bake.concepts ?? []) {
    if (typeof c.id !== 'string' || !c.id.trim()) continue;
    const id = c.id.trim();
    upsertConcept(
      db,
      {
        id,
        label: typeof c.label === 'string' && c.label.trim() ? c.label.trim() : id,
        kind: typeof c.kind === 'string' ? c.kind : 'composite',
        category: typeof c.category === 'string' ? c.category : conceptCategoryOf(id),
        group: conceptGroupOf(id),
        summary: typeof c.description === 'string' ? c.description : undefined,
        color: typeof c.color === 'string' ? c.color : undefined,
        unit: typeof c.unit === 'string' ? c.unit : undefined,
        format: typeof c.format === 'string' ? c.format : undefined,
        mapsTo: typeof c.mapsTo === 'string' ? c.mapsTo : undefined,
        seeAlso: Array.isArray(c.seeAlso)
          ? c.seeAlso.filter((x): x is string => typeof x === 'string')
          : undefined,
        status: mapStatus(typeof c.status === 'string' ? c.status : undefined),
        source: typeof c.source === 'string' ? c.source : 'public/registry/domain-glossary.json',
        author,
        correlationId: typeof c.correlationId === 'string' ? c.correlationId : undefined,
      },
      author
    );
    if (typeof c.deprecatedBy === 'string' && c.deprecatedBy.trim()) {
      const existing = getConcept(db, id);
      if (existing && existing.status !== 'deprecated') {
        deprecateConcept(db, id, c.deprecatedBy.trim(), author);
      } else if (existing) {
        deprecateConcept(db, id, c.deprecatedBy.trim(), author);
      }
    }
    n++;
  }
  return n;
}

/**
 * Lightweight usage scan — HTML/JS references to known concept ids under public/portal.
 * Not a full AST; good enough for Phase 1 auto-sync demo.
 */
export async function seedUsageFromPortal(
  db: Database,
  portalRoot = joinPath(REPO_ROOT, 'public/portal')
): Promise<number> {
  const concepts = (
    db.query(`SELECT id FROM concepts`).all() as Array<{
      id: string; // brand-ok — glossary concept key
    }>
  ).map(r => r.id);
  if (concepts.length === 0) return 0;

  // Longest-first so we don't double-count shorter prefixes incorrectly when scanning.
  const sorted = [...concepts].sort((a, b) => b.length - a.length);
  const glob = new Bun.Glob('**/*.{html,js}');
  let rows = 0;
  const ts = new Date().toISOString();

  for await (const rel of glob.scan({ cwd: portalRoot, onlyFiles: true })) {
    const full = `${portalRoot}/${rel}`;
    const text = await Bun.file(full).text();
    const board = rel.split('/')[0] ?? 'portal';
    for (const id of sorted) {
      // Skip very short ids (noise)
      if (id.length < 4) continue;
      let count = 0;
      let idx = 0;
      while (true) {
        const hit = text.indexOf(id, idx);
        if (hit === -1) break;
        count++;
        idx = hit + id.length;
      }
      if (count > 0) {
        upsertUsage(db, {
          conceptId: id,
          board,
          filePath: `public/portal/${rel}`,
          count,
          lastSeenAt: ts,
        });
        rows++;
      }
    }
  }
  return rows;
}

export async function seedConceptRegistry(
  db: Database,
  opts: { skipUsage?: boolean; author?: string } = {}
): Promise<SeedReport> {
  const author = opts.author ?? defaultAuthor();
  const fromVocabulary = seedFromSemanticVocabulary(db, author);
  const fromGlossary = await seedFromDomainGlossary(db, undefined, author);
  const usageRows = opts.skipUsage ? 0 : await seedUsageFromPortal(db);
  const total = (db.query(`SELECT COUNT(*) AS n FROM concepts`).get() as { n: number }).n;
  return { fromVocabulary, fromGlossary, usageRows, total, author };
}
