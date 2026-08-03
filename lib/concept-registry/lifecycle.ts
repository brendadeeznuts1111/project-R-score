// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Concept lifecycle — draft / propose / review / deprecate + history + health.
 */
import type { Database } from 'bun:sqlite';
import {
  approveConcept,
  defaultAuthor,
  deprecateConcept,
  getConcept,
  listConcepts,
  listReviews,
  listUsage,
  listVersions,
  proposeConcept,
  upsertConcept,
} from './repository.ts';
import type {
  ConceptHistoryEvent,
  ConceptHealthSnapshot,
  ConceptProposalRow,
  ConceptStatus,
  ProposeConceptInput,
  RegistryConcept,
} from './types.ts';
import { CONCEPT_STATUSES, canTransition } from './types.ts';

function nowIso(): string {
  return new Date().toISOString();
}

function ageDays(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (now - t) / (1000 * 60 * 60 * 24));
}

function assertTransition(from: ConceptStatus, to: ConceptStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal lifecycle transition: ${from} → ${to}`);
  }
}

function upsertProposal(
  db: Database,
  conceptId: string, // brand-ok — glossary concept key
  status: ConceptStatus,
  opts: {
    reviewer?: string | null;
    rejectionReason?: string | null;
    reviewedAt?: string | null;
    /** When true, SET rejection_reason = NULL (approve / resubmit). */
    clearRejection?: boolean;
  } = {}
): void {
  const ts = nowIso();
  const existing = db
    .query(
      `SELECT id FROM concept_proposals WHERE concept_id = $id ORDER BY created_at DESC LIMIT 1`
    )
    .get({ $id: conceptId }) as { id: string } | null; // brand-ok — proposal id

  const clear = opts.clearRejection === true || status === 'active' || status === 'proposed';
  const reason = clear
    ? null
    : opts.rejectionReason !== undefined
      ? opts.rejectionReason
      : undefined;

  if (existing) {
    if (clear) {
      db.query(
        `UPDATE concept_proposals SET
           status = $status,
           reviewer = COALESCE($rev, reviewer),
           reviewed_at = COALESCE($revAt, reviewed_at),
           rejection_reason = NULL,
           updated_at = $ts
         WHERE id = $id`
      ).run({
        $id: existing.id,
        $status: status,
        $rev: opts.reviewer ?? null,
        $revAt: opts.reviewedAt ?? null,
        $ts: ts,
      });
    } else {
      db.query(
        `UPDATE concept_proposals SET
           status = $status,
           reviewer = COALESCE($rev, reviewer),
           reviewed_at = COALESCE($revAt, reviewed_at),
           rejection_reason = COALESCE($reason, rejection_reason),
           updated_at = $ts
         WHERE id = $id`
      ).run({
        $id: existing.id,
        $status: status,
        $rev: opts.reviewer ?? null,
        $revAt: opts.reviewedAt ?? null,
        $reason: reason ?? null,
        $ts: ts,
      });
    }
    return;
  }

  db.query(
    `INSERT INTO concept_proposals (
       id, concept_id, status, reviewer, reviewed_at, rejection_reason, created_at, updated_at
     ) VALUES ($id, $cid, $status, $rev, $revAt, $reason, $ts, $ts)`
  ).run({
    $id: Bun.randomUUIDv7(),
    $cid: conceptId,
    $status: status,
    $rev: opts.reviewer ?? null,
    $revAt: opts.reviewedAt ?? null,
    $reason: clear ? null : (opts.rejectionReason ?? null),
    $ts: ts,
  });
}

/** Create or update a draft concept (WIP, not yet for review). */
export function saveDraft(
  db: Database,
  input: ProposeConceptInput,
  author = defaultAuthor()
): RegistryConcept {
  const existing = getConcept(db, input.id);
  if (existing && existing.status !== 'draft' && existing.status !== 'rejected') {
    throw new Error(`cannot draft over concept in status=${existing.status}`);
  }
  const concept = upsertConcept(db, { ...input, status: 'draft' }, author);
  upsertProposal(db, concept.id, 'draft');
  return concept;
}

/**
 * Propose for review.
 * - asDraft: true → draft only
 * - default → proposed (ready for reviewer)
 * - existing draft/rejected: merge field updates from input, then → proposed
 */
export function proposeForReview(
  db: Database,
  input: ProposeConceptInput,
  author = defaultAuthor()
): RegistryConcept {
  if (input.asDraft) {
    return saveDraft(db, input, author);
  }
  const existing = getConcept(db, input.id);
  if (existing?.status === 'draft' || existing?.status === 'rejected') {
    // Merge CLI/API field updates before status flip (do not discard label/domain/…).
    upsertConcept(
      db,
      {
        ...input,
        id: existing.id,
        label: input.label || existing.label,
        status: existing.status,
      },
      author
    );
    return submitProposal(db, input.id, author, input.reviewer);
  }
  const concept = proposeConcept(db, input, author);
  upsertProposal(db, concept.id, 'proposed', {
    reviewer: input.reviewer ?? null,
    clearRejection: true,
  });
  return concept;
}

/** draft|rejected → proposed (optionally merge field updates via input). */
export function submitProposal(
  db: Database,
  id: string, // brand-ok — glossary concept key
  author = defaultAuthor(),
  reviewer?: string,
  fieldUpdates?: Partial<ProposeConceptInput>
): RegistryConcept {
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  assertTransition(existing.status, 'proposed');
  const next = upsertConcept(
    db,
    {
      id: existing.id,
      label: fieldUpdates?.label?.trim() || existing.label,
      kind: fieldUpdates?.kind ?? existing.kind,
      category: fieldUpdates?.category ?? existing.category,
      group: fieldUpdates?.group ?? existing.groupName,
      domain: fieldUpdates?.domain ?? existing.domain ?? undefined,
      summary: fieldUpdates?.summary ?? existing.summary ?? undefined,
      color: fieldUpdates?.color ?? existing.color ?? undefined,
      unit: fieldUpdates?.unit ?? existing.unit ?? undefined,
      format: fieldUpdates?.format ?? existing.format ?? undefined,
      mapsTo: fieldUpdates?.mapsTo ?? existing.mapsTo ?? undefined,
      seeAlso: fieldUpdates?.seeAlso ?? existing.seeAlso,
      status: 'proposed',
      source: existing.source,
      correlationId: fieldUpdates?.correlationId,
    },
    author
  );
  const ts = nowIso();
  db.query(
    `INSERT INTO concept_review (concept_id, status, reviewer, reviewed_at, comments, created_at)
     VALUES ($id, 'proposed', $rev, NULL, NULL, $ts)`
  ).run({ $id: id, $rev: reviewer ?? null, $ts: ts });
  upsertProposal(db, id, 'proposed', {
    reviewer: reviewer ?? null,
    clearRejection: true,
  });
  return next;
}

/** proposed → rejected (or draft if soft). */
export function rejectProposal(
  db: Database,
  id: string, // brand-ok — glossary concept key
  reason: string,
  reviewer = defaultAuthor(),
  soft = false
): RegistryConcept {
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  const to: ConceptStatus = soft ? 'draft' : 'rejected';
  assertTransition(existing.status, to);
  const ts = nowIso();
  const next = upsertConcept(
    db,
    {
      id: existing.id,
      label: existing.label,
      kind: existing.kind,
      category: existing.category,
      group: existing.groupName,
      domain: existing.domain ?? undefined,
      summary: existing.summary ?? undefined,
      status: to,
      source: existing.source,
      seeAlso: existing.seeAlso,
    },
    reviewer
  );
  db.query(
    `INSERT INTO concept_review (concept_id, status, reviewer, reviewed_at, comments, created_at)
     VALUES ($id, 'rejected', $rev, $ts, $c, $ts)`
  ).run({
    $id: id,
    $rev: reviewer,
    $ts: ts,
    $c: reason,
  });
  upsertProposal(db, id, to, {
    reviewer,
    rejectionReason: reason,
    reviewedAt: ts,
  });
  return next;
}

export function approveProposal(
  db: Database,
  id: string, // brand-ok — glossary concept key
  reviewer = defaultAuthor(),
  comments?: string
): RegistryConcept {
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  // Only draft may auto-advance to proposed; rejected must explicitly resubmit.
  if (existing.status === 'draft') {
    submitProposal(db, id, reviewer);
  } else if (existing.status === 'rejected') {
    throw new Error(`cannot approve rejected concept ${id}; submit (→ proposed) first`);
  } else if (existing.status !== 'proposed' && existing.status !== 'active') {
    assertTransition(existing.status, 'active');
  }
  const next = approveConcept(db, id, reviewer, comments);
  upsertProposal(db, id, 'active', {
    reviewer,
    reviewedAt: nowIso(),
    clearRejection: true,
  });
  return next;
}

export function deprecateWithReason(
  db: Database,
  id: string, // brand-ok — glossary concept key
  opts: {
    replaceBy?: string;
    reason?: string;
    author?: string;
  } = {}
): RegistryConcept {
  const author = opts.author ?? defaultAuthor();
  const existing = getConcept(db, id);
  if (!existing) throw new Error(`concept not found: ${id}`);
  assertTransition(existing.status, 'deprecated');
  const deprecated = deprecateConcept(db, id, opts.replaceBy, author, opts.reason);
  upsertProposal(db, id, 'deprecated', { reviewer: author, reviewedAt: nowIso() });
  return deprecated;
}

export function listProposals(
  db: Database,
  status?: ConceptStatus | ConceptStatus[]
): ConceptProposalRow[] {
  const statuses = status ? (Array.isArray(status) ? status : [status]) : [];
  let sql = `SELECT id, concept_id, status, reviewer, reviewed_at, rejection_reason, created_at, updated_at
             FROM concept_proposals`;
  const params: Record<string, string> = {};
  if (statuses.length === 1) {
    sql += ` WHERE status = $st`;
    params.$st = statuses[0]!;
  } else if (statuses.length > 1) {
    const keys = statuses.map((_, i) => `$s${i}`);
    sql += ` WHERE status IN (${keys.join(',')})`;
    statuses.forEach((s, i) => {
      params[`$s${i}`] = s;
    });
  }
  sql += ` ORDER BY created_at ASC`;
  const rows = db.query(sql).all(params) as Array<{
    id: string; // brand-ok — proposal id
    concept_id: string; // brand-ok — glossary concept key
    status: string;
    reviewer: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
  }>;
  const now = Date.now();
  return rows.map(r => ({
    id: r.id,
    conceptId: r.concept_id,
    status: r.status as ConceptStatus,
    reviewer: r.reviewer,
    reviewedAt: r.reviewed_at,
    rejectionReason: r.rejection_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ageDays: ageDays(r.created_at, now),
  }));
}

export function conceptHistory(
  db: Database,
  conceptId: string // brand-ok — glossary concept key
): ConceptHistoryEvent[] {
  const events: ConceptHistoryEvent[] = [];
  for (const v of listVersions(db, conceptId)) {
    let status = '?';
    try {
      const snap = JSON.parse(v.snapshot) as { status?: string };
      status = snap.status ?? '?';
    } catch {
      /* ignore */
    }
    events.push({
      at: v.createdAt,
      kind: 'version',
      summary: `v${v.version} · status=${status}`,
      author: v.author,
      detail: { version: v.version, status },
    });
  }
  for (const r of listReviews(db, conceptId)) {
    events.push({
      at: r.reviewedAt ?? r.createdAt,
      kind: 'review',
      summary: `review · ${r.status}${r.comments ? ` · ${r.comments}` : ''}`,
      author: r.reviewer,
      detail: { status: r.status, comments: r.comments },
    });
  }
  const proposals = listProposals(db).filter(p => p.conceptId === conceptId);
  for (const p of proposals) {
    events.push({
      at: p.updatedAt,
      kind: 'proposal',
      summary: `proposal · ${p.status}${p.rejectionReason ? ` · ${p.rejectionReason}` : ''}`,
      author: p.reviewer,
      detail: { status: p.status, ageDays: p.ageDays },
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function computeConceptHealth(db: Database): ConceptHealthSnapshot {
  const concepts = listConcepts(db, { limit: 20000 });
  const byStatus = Object.fromEntries(CONCEPT_STATUSES.map(s => [s, 0])) as Record<
    ConceptStatus,
    number
  >;
  let withProvenance = 0;
  let used = 0;
  let deprecatedUsed = 0;

  for (const c of concepts) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    const prov = db
      .query(`SELECT 1 AS hit FROM concept_provenance WHERE concept_id = $id LIMIT 1`)
      .get({ $id: c.id }) as { hit: number } | null;
    if (prov) withProvenance++;
    const usage = listUsage(db, c.id);
    const hits = usage.reduce((s, u) => s + u.count, 0);
    if (hits > 0) {
      used++;
      if (c.status === 'deprecated') deprecatedUsed++;
    }
  }

  const proposals = listProposals(db, ['draft', 'proposed']);
  let proposalAgeDaysMax = 0;
  let proposalsOlderThan7d = 0;
  for (const p of proposals) {
    proposalAgeDaysMax = Math.max(proposalAgeDaysMax, p.ageDays);
    if (p.ageDays > 7) proposalsOlderThan7d++;
  }

  const total = concepts.length;
  const usageRatio = total === 0 ? 1 : used / total;
  const provenanceCoverage = total === 0 ? 1 : withProvenance / total;

  const alerts: string[] = [];
  if (proposalsOlderThan7d > 0) {
    alerts.push(`${proposalsOlderThan7d} proposal(s) older than 7 days`);
  }
  if (usageRatio < 0.8 && total > 10) {
    alerts.push(`usage ratio ${(usageRatio * 100).toFixed(0)}% below 80%`);
  }
  if (deprecatedUsed > 0) {
    alerts.push(`${deprecatedUsed} deprecated concept(s) still used`);
  }
  if (provenanceCoverage < 0.9 && total > 0) {
    alerts.push(`provenance coverage ${(provenanceCoverage * 100).toFixed(0)}% below 90%`);
  }

  const measuredAt = nowIso();
  const metrics: Array<[string, number]> = [
    ['total', total],
    ['usage_ratio', usageRatio],
    ['provenance_coverage', provenanceCoverage],
    ['deprecation_backlog', deprecatedUsed],
    ['proposal_age_max_days', proposalAgeDaysMax],
    ['proposals_older_7d', proposalsOlderThan7d],
  ];
  // Snapshot semantics: one row per (concept_id, metric_name) — replace in place.
  for (const [name, value] of metrics) {
    db.query(
      `INSERT INTO concept_health (concept_id, metric_name, metric_value, measured_at)
       VALUES ('', $name, $val, $ts)
       ON CONFLICT(concept_id, metric_name) DO UPDATE SET
         metric_value = excluded.metric_value,
         measured_at = excluded.measured_at`
    ).run({ $name: name, $val: value, $ts: measuredAt });
  }

  return {
    measuredAt,
    total,
    byStatus,
    proposalAgeDaysMax,
    proposalsOlderThan7d,
    usageRatio,
    deprecationBacklog: deprecatedUsed,
    provenanceCoverage,
    alerts,
  };
}
