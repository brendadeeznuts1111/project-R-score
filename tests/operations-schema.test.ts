/**
 * Unified operations schema tests.
 * @see ../lib/operations/schema.ts
 */
import { describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { openOperationsDb } from '../lib/operations/db.ts';

describe('operations schema', () => {
  test('creates all SSOT tables', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map(t => t.name);
    for (const table of [
      'experts',
      'tree_nodes',
      'sb_accounts',
      'rails',
      'plays',
      'play_distribution',
      'growth_metrics',
      'telegram_outbox',
      'phones',
      'funding',
      'operations',
      'positions',
      'ops_sync_cursor',
      'platforms',
      'partner_platform_accounts',
      'partner_profile_bindings',
      'play_gate_decisions',
      'ops_channel_outbox',
      'coverage_snapshots',
      'expert_platform_prefs',
      'provisioning_tasks',
      'experiments',
      'experiment_variants',
      'experiment_assignments',
      'experiment_metrics',
      'prediction_accuracy',
      'prediction_shadow',
    ]) {
      expect(names).toContain(table);
    }
    db.close();
  });

  test('WAL and busy_timeout pragmas apply', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const journal = db.query('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(['wal', 'memory']).toContain(journal.journal_mode);
    db.close();
  });

  test('creates missing parent directories for file-backed databases', async () => {
    const root = `.tmp/operations-db-parent-${crypto.randomUUID()}`;
    const path = `${root}/nested/operations.db`;
    await rm(root, { recursive: true, force: true });

    const db = openOperationsDb({ path });
    expect(await Bun.file(path).exists()).toBe(true);
    db.close();

    await rm(root, { recursive: true, force: true });
  });

  test('tree_nodes has portal sync columns', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const cols = db.query('PRAGMA table_info(tree_nodes)').all() as { name: string }[];
    const names = cols.map(c => c.name);
    expect(names).toContain('oidc_subject');
    expect(names).toContain('status');
    expect(names).toContain('email');
    db.close();
  });

  test('platforms gains coverage columns via migrate', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const cols = db.query('PRAGMA table_info(platforms)').all() as { name: string }[];
    const names = cols.map(c => c.name);
    expect(names).toContain('status');
    expect(names).toContain('api_available');
    db.close();
  });
});
