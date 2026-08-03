// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Concept Registry repository — CRUD, versioning, usage, review.
 */
import type { Database } from 'bun:sqlite';
import {
  type ConceptListFilters,
  type ConceptProvenanceRow,
  type ConceptReviewRow,
  type ConceptStatus,
  type ConceptUsageRow,
  type ConceptVersion,
  type ProposeConceptInput,
  type RegistryConcept,
  type ReviewStatus,
  conceptCategoryOf,
  conceptGroupOf,
  isConceptStatus,
  parseNonEmpty,
} from './types.ts';

type ConceptRow = {
  id: string; // brand-ok — glossary concept key (SQLite row)
  label: string;
  kind: string;
  category: string;
  group_name: string;
  domain: string | null;
  status: string;
  color: string | null;
  unit: string | null;
  format: string | null;
  summary: string | null;
  maps_to: string | null;
  see_also_json: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  deprecated_at: string | null;
  deprecated_by: string | null;
  deprecation_reason: string | null;
};

function parseSeeAlso(json: string): string[] {
  try {
    const v: unknown = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  } catch {
    return [];
  }
}

function rowToConcept(r: ConceptRow): RegistryConcept {
  const status = isConceptStatus(r.status) ? r.status : 'active';
  return {
    id: r.id,
    label: r.label,
    kind: r.kind,
    category: r.category,
    groupName: r.group_name,
    domain: r.domain ?? null,
    status,
    color: r.color,
    unit: r.unit,
    format: r.format,
    summary: r.summary,
    mapsTo: r.maps_to,
    seeAlso: parseSeeAlso(r.see_also_json),
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deprecatedAt: r.deprecated_at,
    deprecatedBy: r.deprecated_by,
    deprecationReason: r.deprecation_reason ?? null,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function defaultAuthor(): string {
  const env = Bun.env.CONCEPT_REGISTRY_AUTHOR?.trim();
  if (env) return env;
  const git = Bun.spawnSync(['git', 'config', 'user.name'], {
    stdout: 'pipe',
    stderr: 'ignore',
  });
  if (git.exitCode === 0) {
    const name = git.stdout.toString().trim();
    if (name) return name;
  }
  return 'system';
}

function nextVersion(db: Database, conceptId: string): number {
  // brand-ok — glossary concept key
  const row = db
    .query(`SELECT COALESCE(MAX(version), 0) AS v FROM concept_versions WHERE concept_id = $id`)
    .get({ $id: conceptId }) as { v: number } | null;
  return (row?.v ?? 0) + 1;
}

function writeVersion(db: Database, concept: RegistryConcept, author: string, ts: string): void {
  const version = nextVersion(db, concept.id);
  db.query(
    `INSERT INTO concept_versions (concept_id, version, snapshot, created_at, author)
     VALUES ($id, $ver, $snap, $ts, $author)`
  ).run({
    $id: concept.id,
    $ver: version,
    $snap: JSON.stringify(concept),
    $ts: ts,
    $author: author,
  });
}

function insertConceptRow(db: Database, c: RegistryConcept): void {
  db.query(
    `INSERT INTO concepts (
       id, label, kind, category, group_name, domain, status, color, unit, format, summary,
       maps_to, see_also_json, source, created_at, updated_at, deprecated_at, deprecated_by,
       deprecation_reason
     ) VALUES (
       $id, $label, $kind, $cat, $grp, $domain, $status, $color, $unit, $fmt, $sum,
       $maps, $see, $src, $created, $updated, $depAt, $depBy, $depReason
     )`
  ).run({
    $id: c.id,
    $label: c.label,
    $kind: c.kind,
    $cat: c.category,
    $grp: c.groupName,
    $domain: c.domain,
    $status: c.status,
    $color: c.color,
    $unit: c.unit,
    $fmt: c.format,
    $sum: c.summary,
    $maps: c.mapsTo,
    $see: JSON.stringify(c.seeAlso),
    $src: c.source,
    $created: c.createdAt,
    $updated: c.updatedAt,
    $depAt: c.deprecatedAt,
    $depBy: c.deprecatedBy,
    $depReason: c.deprecationReason,
  });
}

function updateConceptRow(db: Database, c: RegistryConcept): void {
  db.query(
    `UPDATE concepts SET
       label = $label, kind = $kind, category = $cat, group_name = $grp, domain = $domain,
       status = $status, color = $color, unit = $unit, format = $fmt, summary = $sum,
       maps_to = $maps, see_also_json = $see, source = $src, updated_at = $updated,
       deprecated_at = $depAt, deprecated_by = $depBy, deprecation_reason = $depReason
     WHERE id = $id`
  ).run({
    $id: c.id,
    $label: c.label,
    $kind: c.kind,
    $cat: c.category,
    $grp: c.groupName,
    $domain: c.domain,
    $status: c.status,
    $color: c.color,
    $unit: c.unit,
    $fmt: c.format,
    $sum: c.summary,
    $maps: c.mapsTo,
    $see: JSON.stringify(c.seeAlso),
    $src: c.source,
    $updated: c.updatedAt,
    $depAt: c.deprecatedAt,
    $depBy: c.deprecatedBy,
    $depReason: c.deprecationReason,
  });
}

export function getConcept(
  db: Database,
  id: string // brand-ok — glossary concept key
): RegistryConcept | null {
  const row = db
    .query(`SELECT * FROM concepts WHERE id = $id`)
    .get({ $id: id }) as ConceptRow | null;
  return row ? rowToConcept(row) : null;
}

export function listConcepts(db: Database, filters: ConceptListFilters = {}): RegistryConcept[] {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};

  const statuses = filters.status
    ? Array.isArray(filters.status)
      ? filters.status
      : [filters.status]
    : [];
  if (statuses.length === 1) {
    clauses.push('status = $status');
    params.$status = statuses[0]!;
  } else if (statuses.length > 1) {
    const keys = statuses.map((_, i) => `$st${i}`);
    clauses.push(`status IN (${keys.join(',')})`);
    statuses.forEach((s, i) => {
      params[`$st${i}`] = s;
    });
  }

  const categories = filters.category
    ? Array.isArray(filters.category)
      ? filters.category
      : [filters.category]
    : [];
  if (categories.length === 1) {
    clauses.push('category = $cat');
    params.$cat = categories[0]!;
  } else if (categories.length > 1) {
    const keys = categories.map((_, i) => `$c${i}`);
    clauses.push(`category IN (${keys.join(',')})`);
    categories.forEach((c, i) => {
      params[`$c${i}`] = c;
    });
  }

  const groups = filters.group
    ? Array.isArray(filters.group)
      ? filters.group
      : [filters.group]
    : [];
  if (groups.length === 1) {
    clauses.push('(group_name = $grp OR id = $grp OR id LIKE $grpLike)');
    params.$grp = groups[0]!;
    params.$grpLike = `${groups[0]}.%`;
  }

  if (filters.q?.trim()) {
    clauses.push('(id LIKE $q OR label LIKE $q OR summary LIKE $q)');
    params.$q = `%${filters.q.trim()}%`;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit ?? 5000, 1), 20000);
  const offset = Math.max(filters.offset ?? 0, 0);
  params.$limit = limit;
  params.$offset = offset;

  const rows = db
    .query(`SELECT * FROM concepts ${where} ORDER BY id ASC LIMIT $limit OFFSET $offset`)
    .all(params) as ConceptRow[];
  return rows.map(rowToConcept);
}

export function upsertConcept(
  db: Database,
  input: ProposeConceptInput & {
    status?: ConceptStatus;
    source?: string | null;
  },
  author = defaultAuthor()
): RegistryConcept {
  const id = parseNonEmpty(input.id, 'id');
  const label = parseNonEmpty(input.label, 'label');
  const ts = nowIso();
  const existing = getConcept(db, id);
  const concept: RegistryConcept = {
    id,
    label,
    kind: input.kind?.trim() || existing?.kind || 'composite',
    category: input.category?.trim() || existing?.category || conceptCategoryOf(id),
    groupName: input.group?.trim() || existing?.groupName || conceptGroupOf(id),
    domain: input.domain?.trim() || existing?.domain || null,
    status: input.status ?? existing?.status ?? 'proposed',
    color: input.color ?? existing?.color ?? null,
    unit: input.unit ?? existing?.unit ?? null,
    format: input.format ?? existing?.format ?? null,
    summary: input.summary ?? existing?.summary ?? null,
    mapsTo: input.mapsTo ?? existing?.mapsTo ?? null,
    seeAlso: input.seeAlso ?? existing?.seeAlso ?? [],
    source: input.source !== undefined ? input.source : (existing?.source ?? null),
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
    deprecatedAt: existing?.deprecatedAt ?? null,
    deprecatedBy: existing?.deprecatedBy ?? null,
    deprecationReason: existing?.deprecationReason ?? null,
  };

  if (existing) updateConceptRow(db, concept);
  else insertConceptRow(db, concept);
  writeVersion(db, concept, author, ts);

  if (input.correlationId?.trim()) {
    recordProvenance(db, {
      conceptId: id,
      correlationId: input.correlationId.trim(),
      author,
      committedAt: ts,
    });
  }

  return concept;
}

export function proposeConcept(
  db: Database,
  input: ProposeConceptInput,
  author = defaultAuthor()
): RegistryConcept {
  const existing = getConcept(db, input.id);
  if (existing && existing.status !== 'archived' && existing.status !== 'rejected') {
    throw new Error(`concept already exists: ${input.id} (status=${existing.status})`);
  }
  const concept = upsertConcept(db, { ...input, status: 'proposed' }, author);
  const ts = nowIso();
  db.query(
    `INSERT INTO concept_review (concept_id, status, reviewer, reviewed_at, comments, created_at)
     VALUES ($id, 'proposed', NULL, NULL, NULL, $ts)`
  ).run({ $id: concept.id, $ts: ts });
  return concept;
}

export function approveConcept(
  db: Database,
  id: string, // brand-ok — glossary concept key
  reviewer = defaultAuthor(),
  comments?: string
): RegistryConcept {
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  if (existing.status !== 'proposed' && existing.status !== 'rejected') {
    // allow re-approve of active as no-op version bump with comment
    if (existing.status !== 'active') {
      throw new Error(`cannot approve concept in status=${existing.status}`);
    }
  }
  const ts = nowIso();
  const next: RegistryConcept = {
    ...existing,
    status: 'active',
    updatedAt: ts,
    deprecatedAt: null,
    deprecatedBy: null,
    deprecationReason: null,
  };
  updateConceptRow(db, next);
  writeVersion(db, next, reviewer, ts);
  db.query(
    `INSERT INTO concept_review (concept_id, status, reviewer, reviewed_at, comments, created_at)
     VALUES ($id, 'approved', $rev, $ts, $c, $ts)`
  ).run({
    $id: id,
    $rev: reviewer,
    $ts: ts,
    $c: comments ?? null,
  });
  return next;
}

export function deprecateConcept(
  db: Database,
  id: string, // brand-ok — glossary concept key
  replaceBy?: string, // brand-ok — replacement glossary concept key
  author = defaultAuthor(),
  reason?: string
): RegistryConcept {
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  if (existing.status === 'archived') {
    throw new Error(`cannot deprecate archived concept: ${id}`);
  }
  const ts = nowIso();
  const next: RegistryConcept = {
    ...existing,
    status: 'deprecated',
    updatedAt: ts,
    deprecatedAt: ts,
    deprecatedBy: replaceBy?.trim() || existing.deprecatedBy,
    deprecationReason: reason?.trim() || existing.deprecationReason,
  };
  updateConceptRow(db, next);
  writeVersion(db, next, author, ts);
  return next;
}

/** Soft delete → archived. */
export function archiveConcept(
  db: Database,
  id: string, // brand-ok — glossary concept key
  author = defaultAuthor(),
  force = false
): RegistryConcept {
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  if (existing.status === 'active' && !force) {
    throw new Error(`refusing to archive active concept ${id} without force`);
  }
  const ts = nowIso();
  const next: RegistryConcept = {
    ...existing,
    status: 'archived',
    updatedAt: ts,
  };
  updateConceptRow(db, next);
  writeVersion(db, next, author, ts);
  return next;
}

export function listVersions(
  db: Database,
  conceptId: string // brand-ok — glossary concept key
): ConceptVersion[] {
  return (
    db
      .query(
        `SELECT concept_id, version, snapshot, created_at, author
         FROM concept_versions WHERE concept_id = $id ORDER BY version DESC`
      )
      .all({ $id: conceptId }) as Array<{
      concept_id: string; // brand-ok — glossary concept key (SQLite column)
      version: number;
      snapshot: string;
      created_at: string;
      author: string;
    }>
  ).map(r => ({
    conceptId: r.concept_id,
    version: r.version,
    snapshot: r.snapshot,
    createdAt: r.created_at,
    author: r.author,
  }));
}

export function listUsage(
  db: Database,
  conceptId: string // brand-ok — glossary concept key
): ConceptUsageRow[] {
  return (
    db
      .query(
        `SELECT concept_id, board, file_path, count, last_seen_at
         FROM concept_usage WHERE concept_id = $id ORDER BY count DESC, file_path ASC`
      )
      .all({ $id: conceptId }) as Array<{
      concept_id: string; // brand-ok — glossary concept key (SQLite column)
      board: string;
      file_path: string;
      count: number;
      last_seen_at: string;
    }>
  ).map(r => ({
    conceptId: r.concept_id,
    board: r.board,
    filePath: r.file_path,
    count: r.count,
    lastSeenAt: r.last_seen_at,
  }));
}

export function upsertUsage(
  db: Database,
  row: Omit<ConceptUsageRow, 'lastSeenAt'> & { lastSeenAt?: string }
): void {
  const ts = row.lastSeenAt ?? nowIso();
  db.query(
    `INSERT INTO concept_usage (concept_id, board, file_path, count, last_seen_at)
     VALUES ($id, $board, $path, $count, $ts)
     ON CONFLICT(concept_id, board, file_path) DO UPDATE SET
       count = excluded.count,
       last_seen_at = excluded.last_seen_at`
  ).run({
    $id: row.conceptId,
    $board: row.board,
    $path: row.filePath,
    $count: row.count,
    $ts: ts,
  });
}

export function recordProvenance(db: Database, row: ConceptProvenanceRow): void {
  db.query(
    `INSERT INTO concept_provenance (concept_id, correlation_id, author, committed_at)
     VALUES ($id, $corr, $author, $ts)
     ON CONFLICT(concept_id, correlation_id) DO UPDATE SET
       author = excluded.author,
       committed_at = excluded.committed_at`
  ).run({
    $id: row.conceptId,
    $corr: row.correlationId,
    $author: row.author,
    $ts: row.committedAt,
  });
}

export function listReviews(
  db: Database,
  conceptId: string // brand-ok — glossary concept key
): ConceptReviewRow[] {
  return (
    db
      .query(
        `SELECT id, concept_id, status, reviewer, reviewed_at, comments, created_at
         FROM concept_review WHERE concept_id = $id ORDER BY id DESC`
      )
      .all({ $id: conceptId }) as Array<{
      id: number;
      concept_id: string; // brand-ok — glossary concept key (SQLite column)
      status: string;
      reviewer: string | null;
      reviewed_at: string | null;
      comments: string | null;
      created_at: string;
    }>
  ).map(r => ({
    id: r.id,
    conceptId: r.concept_id,
    status: r.status as ReviewStatus,
    reviewer: r.reviewer,
    reviewedAt: r.reviewed_at,
    comments: r.comments,
    createdAt: r.created_at,
  }));
}

export function countConcepts(db: Database): number {
  const row = db.query(`SELECT COUNT(*) AS n FROM concepts`).get() as { n: number };
  return row.n;
}
