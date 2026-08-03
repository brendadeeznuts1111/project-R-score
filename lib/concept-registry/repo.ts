// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io — Bun.file
// lib/concept-registry/repo.ts — Concept Registry repository layer.
//
// Plain functions on a bun:sqlite Database (partner-ledger pattern): the DDL
// is owned by schema.ts and every mutation bumps a version snapshot so the
// history is immutable and queryable via GET /api/concepts/:id/versions.

import type { Database } from 'bun:sqlite';

import type {
  ConceptGraph,
  ConceptGraphEdge,
  ConceptGraphNode,
  ConceptListFilters,
  ConceptRegistryRow,
  ConceptReviewRow,
  ConceptUsageRow,
  ConceptVersionRow,
} from './types.ts';

const jsonCols = ['see_also', 'synonyms', 'values'] as const;

/** Typed repository error so the API layer can map to HTTP status codes. */
export class ConceptRegistryError extends Error {
  constructor(
    public kind: 'not-found' | 'conflict' | 'invalid-transition',
    message: string
  ) {
    super(message);
    this.name = 'ConceptRegistryError';
  }
}

function encodeJson(value: readonly string[]): string {
  return JSON.stringify(value);
}

function decodeJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function rowToConcept(row: Record<string, unknown>): ConceptRegistryRow {
  return {
    id: String(row.id),
    label: String(row.label),
    description: row.description === null ? null : String(row.description),
    kind: row.kind === null ? null : String(row.kind),
    category: row.category === null ? null : String(row.category),
    groupPrefix: row.group_prefix === null ? null : String(row.group_prefix),
    status: String(row.status) as ConceptRegistryRow['status'],
    color: row.color === null ? null : String(row.color),
    unit: row.unit === null ? null : String(row.unit),
    format: row.format === null ? null : String(row.format),
    mapsTo: row.maps_to === null ? null : String(row.maps_to),
    seeAlso: decodeJson(String(row.see_also)),
    synonyms: decodeJson(String(row.synonyms)),
    values: decodeJson(String(row.values)),
    url: row.url === null ? null : String(row.url),
    deprecatedBy: row.deprecated_by === null ? null : String(row.deprecated_by),
    source: row.source === null ? null : String(row.source),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deprecatedAt: row.deprecated_at === null ? null : String(row.deprecated_at),
  };
}

function conceptIdExists(db: Database, id: string): boolean {
  // brand-ok — glossary concept key
  const row = db.query('SELECT 1 FROM concepts WHERE id = ?').get(id);
  return row !== null && row !== undefined;
}

function appendVersion(db: Database, conceptId: string, author: string | null = null): void {
  // brand-ok — glossary concept key
  const row = db.query('SELECT * FROM concepts WHERE id = ?').get(conceptId);
  if (row === null || row === undefined) return;
  const { version } = db
    .query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS version FROM concept_versions WHERE concept_id = ?'
    )
    .get(conceptId) as { version: number };
  db.query(
    'INSERT INTO concept_versions (concept_id, version, snapshot, author, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(conceptId, version, JSON.stringify(row), author, new Date().toISOString());
}

function touchConcept(db: Database, id: string): void {
  // brand-ok — glossary concept key
  db.query('UPDATE concepts SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

/** Insert or refresh a concept row from a bake/vocabulary source. Idempotent; bumps a version when fields change. */
export function upsertConcept(
  db: Database,
  input: {
    id: string; // brand-ok — glossary concept key
    label: string;
    description?: string | null;
    kind?: string | null;
    category?: string | null;
    groupPrefix?: string | null;
    status?: ConceptRegistryRow['status'];
    color?: string | null;
    unit?: string | null;
    format?: string | null;
    mapsTo?: string | null;
    seeAlso?: readonly string[];
    synonyms?: readonly string[];
    values?: readonly string[];
    url?: string | null;
    deprecatedBy?: string | null;
    source?: string | null;
  }
): boolean {
  const now = new Date().toISOString();
  const existing = db.query('SELECT * FROM concepts WHERE id = ?').get(input.id) as
    | Record<string, unknown>
    | null
    | undefined;

  const seeAlso = encodeJson([...(input.seeAlso ?? [])]);
  const synonyms = encodeJson([...(input.synonyms ?? [])]);
  const values = encodeJson([...(input.values ?? [])]);

  if (existing) {
    const changed =
      existing.label !== input.label ||
      existing.description !== (input.description ?? null) ||
      existing.kind !== (input.kind ?? null) ||
      existing.category !== (input.category ?? null) ||
      existing.group_prefix !== (input.groupPrefix ?? null) ||
      existing.maps_to !== (input.mapsTo ?? null) ||
      existing.see_also !== seeAlso ||
      existing.url !== (input.url ?? null) ||
      existing.deprecated_by !== (input.deprecatedBy ?? null);
    if (!changed) return false;
    db.query(
      `UPDATE concepts SET label = ?, description = ?, kind = ?, category = ?, group_prefix = ?,
         color = ?, unit = ?, format = ?, maps_to = ?, see_also = ?, synonyms = ?, value_labels = ?,
         url = ?, deprecated_by = ?, source = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.label,
      input.description ?? null,
      input.kind ?? null,
      input.category ?? null,
      input.groupPrefix ?? null,
      input.color ?? null,
      input.unit ?? null,
      input.format ?? null,
      input.mapsTo ?? null,
      seeAlso,
      synonyms,
      values,
      input.url ?? null,
      input.deprecatedBy ?? null,
      input.source ?? null,
      now,
      input.id
    );
    appendVersion(db, input.id);
    return true;
  }

  db.query(
    `INSERT INTO concepts (id, label, description, kind, category, group_prefix, status,
       color, unit, format, maps_to, see_also, synonyms, value_labels, url, deprecated_by, source,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.id,
    input.label,
    input.description ?? null,
    input.kind ?? null,
    input.category ?? null,
    input.groupPrefix ?? null,
    input.status ?? 'active',
    input.color ?? null,
    input.unit ?? null,
    input.format ?? null,
    input.mapsTo ?? null,
    seeAlso,
    synonyms,
    values,
    input.url ?? null,
    input.deprecatedBy ?? null,
    input.source ?? null,
    now,
    now
  );
  appendVersion(db, input.id);
  return true;
}

/**
 * Non-destructive partial update: only fields that are `undefined` are left
 * untouched; `null` clears. Used by the vocabulary migration pass so live
 * semantic-vocabulary values gap-fill bake rows without clobbering
 * bake-owned metadata (category, color, status, url).
 */
export function patchConcept(
  db: Database,
  id: string, // brand-ok — glossary concept key
  patch: {
    label?: string;
    description?: string | null;
    kind?: string | null;
    unit?: string | null;
    format?: string | null;
    seeAlso?: readonly string[];
    synonyms?: readonly string[];
    values?: readonly string[];
    status?: ConceptRegistryRow['status'];
    deprecatedBy?: string | null;
  }
): boolean {
  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  const add = (col: string, value: string | number | null | undefined) => {
    if (value === undefined) return;
    sets.push(`${col} = ?`);
    params.push(value);
  };
  add('label', patch.label);
  add('description', patch.description ?? null);
  add('kind', patch.kind ?? null);
  add('unit', patch.unit ?? null);
  add('format', patch.format ?? null);
  add('status', patch.status ?? undefined);
  add('deprecated_by', patch.deprecatedBy ?? null);
  if (patch.seeAlso !== undefined) add('see_also', encodeJson(patch.seeAlso));
  if (patch.synonyms !== undefined) add('synonyms', encodeJson(patch.synonyms));
  if (patch.values !== undefined) add('value_labels', encodeJson(patch.values));
  if (sets.length === 0) return false;
  params.push(new Date().toISOString(), id);
  db.query(`UPDATE concepts SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...params);
  appendVersion(db, id);
  return true;
}

export function listConcepts(db: Database, filters: ConceptListFilters): ConceptRegistryRow[] {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.group) {
    where.push('group_prefix = ?');
    params.push(filters.group);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .query(
      `SELECT * FROM concepts ${whereSql}
       ORDER BY id LIMIT ? OFFSET ?`
    )
    .all(...params, filters.limit, filters.offset) as Array<Record<string, unknown>>;
  return rows.map(rowToConcept);
}

/** Total rows matching the same filters (for paginated list responses). */
export function countConcepts(db: Database, filters: ConceptListFilters): number {
  const where: string[] = [];
  const params: Array<string> = [];
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.group) {
    where.push('group_prefix = ?');
    params.push(filters.group);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const { total } = db
    .query(`SELECT COUNT(*) AS total FROM concepts ${whereSql}`)
    .get(...params) as { total: number };
  return total;
}

export function getConcept(db: Database, id: string): ConceptRegistryRow | null {
  // brand-ok — glossary concept key
  const row = db.query('SELECT * FROM concepts WHERE id = ?').get(id);
  return row === null || row === undefined ? null : rowToConcept(row as Record<string, unknown>);
}

export function getConceptVersions(db: Database, id: string): ConceptVersionRow[] {
  // brand-ok — glossary concept key
  const rows = db
    .query('SELECT * FROM concept_versions WHERE concept_id = ? ORDER BY version')
    .all(id) as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: Number(row.id),
    conceptId: String(row.concept_id),
    version: Number(row.version),
    snapshot: JSON.parse(String(row.snapshot)) as Record<string, unknown>,
    author: row.author === null ? null : String(row.author),
    createdAt: String(row.created_at),
  }));
}

export function getConceptUsage(db: Database, id: string): ConceptUsageRow[] {
  // brand-ok — glossary concept key
  const rows = db
    .query('SELECT * FROM concept_usage WHERE concept_id = ? ORDER BY last_seen_at DESC')
    .all(id) as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: Number(row.id),
    conceptId: String(row.concept_id),
    board: String(row.board),
    filePath: String(row.file_path),
    count: Number(row.count),
    lastSeenAt: String(row.last_seen_at),
  }));
}

export function getConceptReviews(db: Database, id: string): ConceptReviewRow[] {
  // brand-ok — glossary concept key
  const rows = db
    .query('SELECT * FROM concept_review WHERE concept_id = ? ORDER BY reviewed_at')
    .all(id) as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: Number(row.id),
    conceptId: String(row.concept_id),
    status: String(row.status) as ConceptReviewRow['status'],
    reviewer: row.reviewer === null ? null : String(row.reviewer),
    reviewedAt: String(row.reviewed_at),
    comments: row.comments === null ? null : String(row.comments),
  }));
}

export type ProposeConceptInput = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description?: string;
  kind?: string;
  category?: string;
  groupPrefix?: string;
  color?: string;
  unit?: string;
  format?: string;
  mapsTo?: string;
  seeAlso?: readonly string[];
  synonyms?: readonly string[];
  values?: readonly string[];
  url?: string;
};

/** Create a concept as `proposed` (draft) with version 1. Throws on id conflict. */
export function proposeConcept(db: Database, input: ProposeConceptInput): ConceptRegistryRow {
  if (conceptIdExists(db, input.id)) {
    throw new ConceptRegistryError('conflict', `concept already exists: ${input.id}`);
  }
  const now = new Date().toISOString();
  db.query(
    `INSERT INTO concepts (id, label, description, kind, category, group_prefix, status,
       color, unit, format, maps_to, see_also, synonyms, value_labels, url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.id,
    input.label,
    input.description ?? null,
    input.kind ?? null,
    input.category ?? null,
    input.groupPrefix ?? null,
    input.color ?? null,
    input.unit ?? null,
    input.format ?? null,
    input.mapsTo ?? null,
    encodeJson([...(input.seeAlso ?? [])]),
    encodeJson([...(input.synonyms ?? [])]),
    encodeJson([...(input.values ?? [])]),
    input.url ?? null,
    now,
    now
  );
  appendVersion(db, input.id);
  const row = getConcept(db, input.id);
  if (!row) throw new Error(`insert failed: ${input.id}`);
  return row;
}

function requireStatus(
  db: Database,
  id: string, // brand-ok — glossary concept key
  expected: ConceptRegistryRow['status'],
  op: string
): ConceptRegistryRow {
  const row = getConcept(db, id);
  if (!row) throw new ConceptRegistryError('not-found', `concept not found: ${id}`);
  if (row.status !== expected) {
    throw new ConceptRegistryError(
      'invalid-transition',
      `cannot ${op}: concept ${id} is ${row.status}, expected ${expected}`
    );
  }
  return row;
}

export function approveConcept(
  db: Database,
  id: string, // brand-ok — glossary concept key
  reviewer: string | null = null,
  comments: string | null = null
): ConceptRegistryRow {
  requireStatus(db, id, 'proposed', 'approve');
  const now = new Date().toISOString();
  db.query(`UPDATE concepts SET status = 'active', updated_at = ? WHERE id = ?`).run(now, id);
  db.query(
    'INSERT INTO concept_review (concept_id, status, reviewer, reviewed_at, comments) VALUES (?, ?, ?, ?, ?)'
  ).run(id, 'approved', reviewer, now, comments);
  appendVersion(db, id, reviewer);
  const row = getConcept(db, id);
  if (!row) throw new Error(`approve failed: ${id}`);
  return row;
}

export function rejectConcept(
  db: Database,
  id: string, // brand-ok — glossary concept key
  reviewer: string | null = null,
  comments: string | null = null
): ConceptReviewRow {
  requireStatus(db, id, 'proposed', 'reject');
  const now = new Date().toISOString();
  db.query(
    'INSERT INTO concept_review (concept_id, status, reviewer, reviewed_at, comments) VALUES (?, ?, ?, ?, ?)'
  ).run(id, 'rejected', reviewer, now, comments);
  const row = db
    .query('SELECT * FROM concept_review WHERE concept_id = ? ORDER BY reviewed_at DESC LIMIT 1')
    .get(id) as Record<string, unknown>;
  return {
    id: Number(row.id),
    conceptId: String(row.concept_id),
    status: 'rejected',
    reviewer: row.reviewer === null ? null : String(row.reviewer),
    reviewedAt: String(row.reviewed_at),
    comments: row.comments === null ? null : String(row.comments),
  };
}

export function deprecateConcept(db: Database, id: string, replaceBy?: string): ConceptRegistryRow {
  // brand-ok — glossary concept key
  requireStatus(db, id, 'active', 'deprecate');
  const now = new Date().toISOString();
  db.query(
    `UPDATE concepts SET status = 'deprecated', deprecated_by = ?, deprecated_at = ?, updated_at = ? WHERE id = ?`
  ).run(replaceBy ?? null, now, now, id);
  appendVersion(db, id);
  const row = getConcept(db, id);
  if (!row) throw new Error(`deprecate failed: ${id}`);
  return row;
}

/** Soft delete — allowed from any status; kept in history with review trail. */
export function archiveConcept(db: Database, id: string): ConceptRegistryRow {
  // brand-ok — glossary concept key
  const existing = getConcept(db, id);
  if (!existing) throw new ConceptRegistryError('not-found', `concept not found: ${id}`);
  if (existing.status === 'archived') return existing; // idempotent
  const now = new Date().toISOString();
  db.query(`UPDATE concepts SET status = 'archived', updated_at = ? WHERE id = ?`).run(now, id);
  appendVersion(db, id);
  const row = getConcept(db, id);
  if (!row) throw new Error(`archive failed: ${id}`);
  return row;
}

/** Upsert a usage row for one concept/file occurrence. */
export function recordConceptUsage(
  db: Database,
  conceptId: string, // brand-ok — glossary concept key
  board: string,
  filePath: string,
  count: number,
  lastSeenAt = new Date().toISOString()
): void {
  db.query(
    `INSERT INTO concept_usage (concept_id, board, file_path, count, last_seen_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (concept_id, board, file_path)
     DO UPDATE SET count = excluded.count, last_seen_at = excluded.last_seen_at`
  ).run(conceptId, board, filePath, count, lastSeenAt);
}

const CONCEPT_ATTR_RE = /data-glossary-concept="([^"]+)"/g;
/** Literal glossary key shape — excludes `${...}` template expressions resolved at runtime via G / PARTNER_HISTORY_GLOSSARY. */
const CONCEPT_KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export type ConceptSyncOrphan = {
  key: string; // brand-ok — glossary concept key used in HTML but missing from the registry
  totalCount: number;
  files: Array<{ board: string; filePath: string; count: number }>;
};

export type ConceptSyncReport = {
  scannedFiles: number;
  usageRows: number;
  orphanUsage: ConceptSyncOrphan[];
};

/**
 * Auto-sync with code (Phase 2): greps HTML files under `public/portal` for
 * `data-glossary-concept="<key>"` attributes, upserts concept_usage rows, and
 * reports keys that are used in code but missing from the glossary (orphan
 * usage). Template expressions (`${G.…}`) are excluded — they resolve to
 * concept keys at runtime and are not literal glossary keys.
 */
export async function syncConceptUsage(
  db: Database,
  portalDir = 'public/portal'
): Promise<ConceptSyncReport> {
  const glob = new Bun.Glob('**/*.html');
  const keyFiles = new Map<string, ConceptSyncOrphan>();
  let scannedFiles = 0;
  for (const rel of glob.scanSync({ cwd: portalDir, onlyFiles: true })) {
    scannedFiles++;
    const text = await Bun.file(`${portalDir}/${rel}`).text();
    const counts = new Map<string, number>();
    for (const match of text.matchAll(CONCEPT_ATTR_RE)) {
      const key = match[1]!.trim();
      if (CONCEPT_KEY_RE.test(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const board = rel.split('/')[0] ?? 'root';
    const filePath = `${portalDir}/${rel}`;
    for (const [key, count] of counts) {
      recordConceptUsage(db, key, board, filePath, count);
      const entry = keyFiles.get(key) ?? { key, totalCount: 0, files: [] };
      entry.totalCount += count;
      entry.files.push({ board, filePath, count });
      keyFiles.set(key, entry);
    }
  }

  const orphanUsage: ConceptSyncOrphan[] = [];
  for (const entry of keyFiles.values()) {
    if (!conceptIdExists(db, entry.key)) orphanUsage.push(entry);
  }
  orphanUsage.sort((a, b) => b.totalCount - a.totalCount);

  return {
    scannedFiles,
    usageRows: [...keyFiles.values()].reduce((sum, e) => sum + e.files.length, 0),
    orphanUsage,
  };
}

/**
 * One-shot usage scan (Phase-1 migration seeding) — delegates to the Phase-2
 * sync and returns the number of concept×file usage rows recorded.
 */
export async function scanPortalConceptUsage(
  db: Database,
  portalDir = 'public/portal'
): Promise<number> {
  const report = await syncConceptUsage(db, portalDir);
  return report.usageRows;
}

export type PersistedOrphanUsageRow = {
  conceptId: string; // brand-ok — glossary concept key used in code, missing from concepts
  files: number;
  totalCount: number;
};

/** Persisted orphan usage: concept_usage rows whose key no longer exists in concepts. */
export function findOrphanUsage(db: Database): PersistedOrphanUsageRow[] {
  const rows = db
    .query(
      `SELECT u.concept_id, COUNT(*) AS files, SUM(u.count) AS total_count
       FROM concept_usage u
       LEFT JOIN concepts c ON c.id = u.concept_id
       WHERE c.id IS NULL
       GROUP BY u.concept_id
       ORDER BY total_count DESC`
    )
    .all() as Array<{ concept_id: string; files: number; total_count: number }>; // brand-ok — glossary concept key
  return rows.map(r => ({ conceptId: r.concept_id, files: r.files, totalCount: r.total_count }));
}

export type UnusedConceptCandidate = {
  id: string; // brand-ok — glossary concept key
  status: ConceptRegistryRow['status'];
  lastSeenAt: string | null;
};

/**
 * Deprecation candidates: active/deprecated concepts with no usage rows at all
 * (never referenced in portal HTML) or whose last usage predates the cutoff.
 * `minDays` defaults to 90 per the auto-sync alert spec.
 */
export function unusedConceptCandidates(db: Database, minDays = 90): UnusedConceptCandidate[] {
  const cutoff = new Date(Date.now() - minDays * 86_400_000).toISOString();
  const rows = db
    .query(
      `SELECT c.id, c.status, MAX(u.last_seen_at) AS last_seen
       FROM concepts c
       LEFT JOIN concept_usage u ON u.concept_id = c.id
       WHERE c.status IN ('active', 'deprecated')
       GROUP BY c.id
       HAVING last_seen IS NULL OR last_seen < ?
       ORDER BY c.id`
    )
    .all(cutoff) as Array<{ id: string; status: string; last_seen: string | null }>; // brand-ok — glossary concept key
  return rows.map(r => ({
    id: r.id,
    status: r.status as ConceptRegistryRow['status'],
    lastSeenAt: r.last_seen,
  }));
}

export function buildConceptGraph(db: Database): ConceptGraph {
  const nodes = listConcepts(db, { limit: 100000, offset: 0 }).map<ConceptGraphNode>(c => ({
    id: c.id,
    label: c.label,
    group: c.groupPrefix,
    category: c.category,
    status: c.status,
  }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges: ConceptGraphEdge[] = [];
  const degree = new Map<string, number>();

  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1); // brand-ok — glossary concept key
  const push = (source: string, target: string, type: ConceptGraphEdge['type']) => {
    const targetExists = nodeIds.has(target);
    edges.push({ source, target, type, targetExists });
    bump(source);
    if (targetExists) bump(target);
  };

  for (const concept of nodes) {
    const row = getConcept(db, concept.id);
    if (!row) continue;
    for (const target of row.seeAlso) push(concept.id, target, 'seeAlso');
    if (row.mapsTo) push(concept.id, row.mapsTo, 'mapsTo');
    if (row.deprecatedBy) push(concept.id, row.deprecatedBy, 'deprecatedBy');
  }

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    if (e.targetExists) connected.add(e.target);
  }
  const orphaned = nodes.filter(n => !connected.has(n.id)).length;
  const staleTargets = edges.filter(e => !e.targetExists).length;
  const central = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, deg]) => ({ id, degree: deg }));

  return {
    nodes,
    edges,
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      orphaned,
      central,
      staleTargets,
    },
  };
}
