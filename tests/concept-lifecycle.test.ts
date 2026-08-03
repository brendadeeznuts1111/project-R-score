// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';

import {
  approveConcept,
  approveProposal,
  archiveConcept,
  canTransition,
  computeConceptHealth,
  conceptHistory,
  deprecateConcept,
  deprecateWithReason,
  ensureConceptRegistrySchema,
  getConcept,
  handleConceptRegistryRequest,
  listProposals,
  proposeForReview,
  rejectProposal,
  saveDraft,
  submitProposal,
  upsertUsage,
} from '../lib/concept-registry/index.ts';

function memDb(): Database {
  const db = new Database(':memory:');
  ensureConceptRegistrySchema(db);
  return db;
}

describe('concept lifecycle', () => {
  test('state machine allows draft → proposed → active → deprecated', () => {
    expect(canTransition('draft', 'proposed')).toBe(true);
    expect(canTransition('proposed', 'active')).toBe(true);
    expect(canTransition('active', 'deprecated')).toBe(true);
    expect(canTransition('deprecated', 'archived')).toBe(true);
    expect(canTransition('active', 'draft')).toBe(false);
    expect(canTransition('rejected', 'active')).toBe(false);
  });

  test('draft → submit → approve → deprecate with reason', () => {
    const db = memDb();
    const draft = saveDraft(db, {
      id: 'accounting.batch_import',
      label: 'Batch Import',
      domain: 'accounting',
      category: 'ops',
      group: 'accounting',
      summary: 'Import ledger rows',
    });
    expect(draft.status).toBe('draft');
    expect(draft.domain).toBe('accounting');

    const proposed = submitProposal(db, 'accounting.batch_import', 'author');
    expect(proposed.status).toBe('proposed');

    const pending = listProposals(db, 'proposed');
    expect(pending.some(p => p.conceptId === 'accounting.batch_import')).toBe(true);

    const active = approveProposal(db, 'accounting.batch_import', 'reviewer');
    expect(active.status).toBe('active');

    const deprecated = deprecateWithReason(db, 'accounting.batch_import', {
      replaceBy: 'accounting.deposit',
      reason: 'Consolidated into deposit',
      author: 'reviewer',
    });
    expect(deprecated.status).toBe('deprecated');
    expect(deprecated.deprecatedBy).toBe('accounting.deposit');
    expect(deprecated.deprecationReason).toBe('Consolidated into deposit');

    const hist = conceptHistory(db, 'accounting.batch_import');
    expect(hist.length).toBeGreaterThanOrEqual(3);
    expect(hist.some(e => e.kind === 'version')).toBe(true);
  });

  test('propose --draft and reject soft returns to draft', () => {
    const db = memDb();
    proposeForReview(db, {
      id: 'ops.metric.demo',
      label: 'Demo',
      asDraft: false,
    });
    expect(getConcept(db, 'ops.metric.demo')?.status).toBe('proposed');

    const rejected = rejectProposal(db, 'ops.metric.demo', 'Use accounting.deposit', 'rev', true);
    expect(rejected.status).toBe('draft');
  });

  test('reject hard → rejected; cannot approve without resubmit', () => {
    const db = memDb();
    proposeForReview(db, { id: 'ops.metric.x', label: 'X' });
    const rejected = rejectProposal(db, 'ops.metric.x', 'duplicate', 'rev', false);
    expect(rejected.status).toBe('rejected');
    expect(() => approveProposal(db, 'ops.metric.x', 'rev')).toThrow(
      /submit|illegal lifecycle/
    );
    expect(() => approveConcept(db, 'ops.metric.x', 'rev')).toThrow(
      /submit|illegal lifecycle/
    );
  });

  test('resubmit of rejected merges field updates then becomes proposed', () => {
    const db = memDb();
    proposeForReview(db, {
      id: 'ops.metric.resub',
      label: 'Old',
      domain: 'operations',
    });
    rejectProposal(db, 'ops.metric.resub', 'needs rename', 'rev', false);
    const again = proposeForReview(db, {
      id: 'ops.metric.resub',
      label: 'New Label',
      domain: 'partners',
      summary: 'updated summary',
    });
    expect(again.status).toBe('proposed');
    expect(again.label).toBe('New Label');
    expect(again.domain).toBe('partners');
    expect(again.summary).toBe('updated summary');
    const prop = listProposals(db, 'proposed').find(p => p.conceptId === 'ops.metric.resub');
    expect(prop?.rejectionReason).toBeNull();
  });

  test('illegal transitions throw from repository gates', () => {
    const db = memDb();
    proposeForReview(db, { id: 'ops.metric.gate', label: 'G' });
    approveProposal(db, 'ops.metric.gate');
    expect(() => deprecateConcept(db, 'ops.metric.gate')).not.toThrow();
    // already deprecated — cannot deprecate again
    expect(() => deprecateConcept(db, 'ops.metric.gate')).toThrow(/illegal lifecycle/);
    expect(() => archiveConcept(db, 'ops.metric.gate')).not.toThrow(); // deprecated → archived
  });

  test('health metrics flag deprecated-still-used; snapshot PK stable', () => {
    const db = memDb();
    proposeForReview(db, { id: 'ops.metric.a', label: 'A' });
    approveProposal(db, 'ops.metric.a');
    deprecateWithReason(db, 'ops.metric.a', { reason: 'old' });
    upsertUsage(db, {
      conceptId: 'ops.metric.a',
      board: 'partners',
      filePath: 'public/portal/partners/index.html',
      count: 3,
    });

    const health = computeConceptHealth(db);
    expect(health.total).toBeGreaterThanOrEqual(1);
    expect(health.deprecationBacklog).toBeGreaterThanOrEqual(1);
    expect(health.alerts.some(a => /deprecated/.test(a))).toBe(true);

    computeConceptHealth(db);
    computeConceptHealth(db);
    const n = (
      db.query(`SELECT COUNT(*) AS n FROM concept_health WHERE concept_id = ''`).get() as {
        n: number;
      }
    ).n;
    // six global metrics, one row each
    expect(n).toBe(6);
  });

  test('HTTP propose/approve go through lifecycle (reject blocked path)', async () => {
    const db = memDb();
    const proposeRes = await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts/propose', {
        method: 'POST',
        body: JSON.stringify({
          id: 'ops.metric.http',
          label: 'Http',
          domain: 'partners',
          asDraft: true,
        }),
      }),
      db
    );
    expect(proposeRes!.status).toBe(201);
    const body = (await proposeRes!.json()) as { concept: { status: string; domain: string } };
    expect(body.concept.status).toBe('draft');
    expect(body.concept.domain).toBe('partners');

    // submit via propose again without asDraft
    await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts/propose', {
        method: 'POST',
        body: JSON.stringify({
          id: 'ops.metric.http',
          label: 'Http2',
          domain: 'compliance',
        }),
      }),
      db
    );
    expect(getConcept(db, 'ops.metric.http')?.status).toBe('proposed');
    expect(getConcept(db, 'ops.metric.http')?.label).toBe('Http2');

    const approveRes = await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts/ops.metric.http/approve', {
        method: 'PATCH',
        body: JSON.stringify({ reviewer: 'ci' }),
      }),
      db
    );
    const approved = (await approveRes!.json()) as { concept: { status: string } };
    expect(approved.concept.status).toBe('active');
  });
});
