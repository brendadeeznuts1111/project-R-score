// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';

import {
  approveProposal,
  canTransition,
  computeConceptHealth,
  conceptHistory,
  deprecateWithReason,
  ensureConceptRegistrySchema,
  getConcept,
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

  test('reject hard → rejected', () => {
    const db = memDb();
    proposeForReview(db, { id: 'ops.metric.x', label: 'X' });
    const rejected = rejectProposal(db, 'ops.metric.x', 'duplicate', 'rev', false);
    expect(rejected.status).toBe('rejected');
  });

  test('health metrics flag deprecated-still-used', () => {
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
  });
});
