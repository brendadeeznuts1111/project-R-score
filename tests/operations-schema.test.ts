/**
 * Unified operations schema tests.
 * @see ../lib/operations/schema.ts
 */
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  migratePartnerProfileBindingsLifecycle,
  migrateSchema,
} from '../lib/operations/schema.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded/index.ts';

function insertTreeNode(db: ReturnType<typeof openOperationsDb>, treeNodeId: TreeNodeId): void {
  db.query(
    `INSERT INTO tree_nodes (id, type, name, created_at)
     VALUES ($id, 'partner', $id, '2026-08-04T00:00:00.000Z')`
  ).run({ $id: treeNodeId });
}

function installLegacyPartnerProfileBindings(db: ReturnType<typeof openOperationsDb>): void {
  db.run(`
    DROP TABLE partner_profile_bindings;
    CREATE TABLE partner_profile_bindings (
      tree_node_id TEXT PRIMARY KEY REFERENCES tree_nodes(id),
      template_id TEXT NOT NULL,
      profile_key TEXT NOT NULL UNIQUE,
      lifecycle_status TEXT NOT NULL DEFAULT 'materialized'
        CHECK(lifecycle_status IN ('signup', 'materialized', 'kyc_pending', 'active', 'suspended', 'terminated')),
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX idx_ppb_template ON partner_profile_bindings(template_id);
    CREATE INDEX idx_ppb_lifecycle ON partner_profile_bindings(lifecycle_status);
  `);
}

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
      'limit_forecast_issues',
      'limit_forecast_outcomes',
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

  test('fresh partner bindings accept the canonical lifecycle and reject other states', () => {
    const db = openOperationsDb({ path: ':memory:' });
    for (const id of ['cultivating-node', 'graduated-node', 'frozen-node', 'unknown-node']) {
      insertTreeNode(db, asTreeNodeId(id));
    }

    const insert = db.query(
      `INSERT INTO partner_profile_bindings
        (tree_node_id, template_id, profile_key, lifecycle_status, created_at, updated_at)
       VALUES ($node, 'partner-template-v0', $profile, $status, 'created', 'updated')`
    );
    insert.run({
      $node: 'cultivating-node',
      $profile: 'profile-cultivating',
      $status: 'cultivating',
    });
    insert.run({
      $node: 'graduated-node',
      $profile: 'profile-graduated',
      $status: 'graduated',
    });
    expect(() =>
      insert.run({ $node: 'frozen-node', $profile: 'profile-frozen', $status: 'frozen' })
    ).toThrow();
    expect(() =>
      insert.run({ $node: 'unknown-node', $profile: 'profile-unknown', $status: 'unknown' })
    ).toThrow();

    const statuses = db
      .query('SELECT lifecycle_status FROM partner_profile_bindings ORDER BY lifecycle_status')
      .all() as Array<{ lifecycle_status: string }>;
    expect(statuses.map(row => row.lifecycle_status)).toEqual(['cultivating', 'graduated']);
    db.close();
  });

  test('upgrades the legacy lifecycle constraint without losing rows or table constraints', () => {
    const db = openOperationsDb({ path: ':memory:' });
    db.run('PRAGMA foreign_keys = ON');
    installLegacyPartnerProfileBindings(db);
    for (const id of ['existing-node', 'default-node', 'duplicate-node']) {
      insertTreeNode(db, asTreeNodeId(id));
    }
    db.query(
      `INSERT INTO partner_profile_bindings
        (tree_node_id, template_id, profile_key, lifecycle_status, metadata_json, created_at, updated_at)
       VALUES ($node, $template, $profile, 'active', $metadata, $created, $updated)`
    ).run({
      $node: 'existing-node',
      $template: 'partner-template-v0',
      $profile: 'profile-existing',
      $metadata: '{"seat":"alpha","limit":1250}',
      $created: '2026-01-02T03:04:05.000Z',
      $updated: '2026-07-08T09:10:11.000Z',
    });

    migrateSchema(db);

    expect(
      db.query('SELECT * FROM partner_profile_bindings WHERE tree_node_id = $id').get({
        $id: 'existing-node',
      })
    ).toEqual({
      tree_node_id: 'existing-node',
      template_id: 'partner-template-v0',
      profile_key: 'profile-existing',
      lifecycle_status: 'active',
      metadata_json: '{"seat":"alpha","limit":1250}',
      created_at: '2026-01-02T03:04:05.000Z',
      updated_at: '2026-07-08T09:10:11.000Z',
    });

    const tableSql = db
      .query(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'partner_profile_bindings'`)
      .get() as { sql: string };
    expect(tableSql.sql).toContain("'cultivating'");
    expect(tableSql.sql).toContain("'graduated'");

    const indexes = db.query(`PRAGMA index_list(partner_profile_bindings)`).all() as Array<{
      name: string;
      unique: number;
    }>;
    expect(indexes.map(index => index.name)).toContain('idx_ppb_template');
    expect(indexes.map(index => index.name)).toContain('idx_ppb_lifecycle');
    expect(indexes.some(index => index.unique === 1)).toBe(true);

    const foreignKeys = db.query(`PRAGMA foreign_key_list(partner_profile_bindings)`).all() as Array<{
      table: string;
      from: string;
      to: string;
    }>;
    expect(foreignKeys).toContainEqual(
      expect.objectContaining({ table: 'tree_nodes', from: 'tree_node_id', to: 'id' })
    );
    expect((db.query('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys).toBe(1);

    db.query(
      `INSERT INTO partner_profile_bindings
        (tree_node_id, template_id, profile_key, created_at, updated_at)
       VALUES ('default-node', 'partner-template-v0', 'profile-default', 'created', 'updated')`
    ).run();
    expect(
      (
        db
          .query('SELECT lifecycle_status FROM partner_profile_bindings WHERE tree_node_id = $id')
          .get({ $id: 'default-node' }) as { lifecycle_status: string }
      ).lifecycle_status
    ).toBe('materialized');
    expect(() =>
      db
        .query(
          `INSERT INTO partner_profile_bindings
            (tree_node_id, template_id, profile_key, created_at, updated_at)
           VALUES ('duplicate-node', 'partner-template-v0', 'profile-existing', 'created', 'updated')`
        )
        .run()
    ).toThrow();
    expect(() =>
      db
        .query(
          `INSERT INTO partner_profile_bindings
            (tree_node_id, template_id, profile_key, created_at, updated_at)
           VALUES ('missing-node', 'partner-template-v0', 'profile-missing', 'created', 'updated')`
        )
        .run()
    ).toThrow();

    const schemaVersion = (
      db.query('PRAGMA schema_version').get() as { schema_version: number }
    ).schema_version;
    migratePartnerProfileBindingsLifecycle(db);
    expect((db.query('PRAGMA schema_version').get() as { schema_version: number }).schema_version).toBe(
      schemaVersion
    );
    db.close();
  });

  test('rolls back the lifecycle rebuild when legacy rows violate foreign keys', () => {
    const db = openOperationsDb({ path: ':memory:' });
    installLegacyPartnerProfileBindings(db);
    db.query(
      `INSERT INTO partner_profile_bindings
        (tree_node_id, template_id, profile_key, lifecycle_status, created_at, updated_at)
       VALUES ('orphan-node', 'partner-template-v0', 'profile-orphan', 'active', 'created', 'updated')`
    ).run();

    expect(() => migratePartnerProfileBindingsLifecycle(db)).toThrow('failed foreign-key check');

    const tableSql = db
      .query(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'partner_profile_bindings'`)
      .get() as { sql: string };
    expect(tableSql.sql).not.toContain("'cultivating'");
    expect(
      (
        db.query('SELECT COUNT(*) AS count FROM partner_profile_bindings').get() as { count: number }
      ).count
    ).toBe(1);
    expect(
      (
        db
          .query(
            `SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'partner_profile_bindings__lifecycle'`
          )
          .get() as { count: number }
      ).count
    ).toBe(0);
    db.close();
  });
});
