import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';
import { linkTelegramChat } from '../lib/telegram/flows/channel-meta.ts';
import {
  detectTelegramLinkConflict,
  resolveFlowNodeForTelegram,
  resolveSeatTelegramId,
  setActiveCallSignForTelegram,
} from '../lib/telegram/flows/seat-telegram.ts';
import {
  resolvePartnerDmTelegramId as resolvePartnerDmFromRegistry,
  upsertPackageGroupRegistry,
} from '../lib/telegram/package-group-registry.ts';

describe('seat-telegram shared DM', () => {
  test('linkTelegramChat auto shared-dm when telegram_id owned by another seat', () => {
    const db = new Database(':memory:');
    db.run(`
      CREATE TABLE tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        parent_id TEXT,
        expert_id TEXT,
        name TEXT NOT NULL,
        call_sign TEXT UNIQUE,
        telegram_id TEXT UNIQUE,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE ops_chat_channel_meta (
        chat_id TEXT PRIMARY KEY,
        tree_node_ids_json TEXT NOT NULL DEFAULT '[]',
        call_signs_json TEXT NOT NULL DEFAULT '[]',
        locale TEXT NOT NULL DEFAULT 'en',
        topics_json TEXT NOT NULL DEFAULT '{}',
        image_bundle_id TEXT,
        last_template_ids_json TEXT NOT NULL DEFAULT '{}',
        linked_at TEXT,
        active_call_sign TEXT
      );
    `);

    const now = new Date().toISOString();
    const ashId = randomUUIDv7();
    const bilId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($ash, 'agent', 'Ash', 'ASH-001', '8013171035', 1, $now),
              ($bil, 'agent', 'Billy', 'BIL-001', NULL, 1, $now)`,
      { $ash: ashId, $bil: bilId, $now: now }
    );

    const { meta, sharedDm, previousOwnerCallSign } = linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(bilId),
      callSign: 'BIL-001',
      chatId: '8013171035',
    });

    expect(sharedDm).toBe(true);
    expect(previousOwnerCallSign).toBe('ASH-001');
    expect(meta.callSigns).toEqual(expect.arrayContaining(['ASH-001', 'BIL-001']));
    expect(meta.treeNodeIds).toEqual(expect.arrayContaining([ashId, bilId]));

    const bilRow = db
      .query('SELECT telegram_id FROM tree_nodes WHERE id = $id')
      .get({ $id: bilId }) as { telegram_id: string | null }; // brand-ok — sqlite wire
    expect(bilRow.telegram_id).toBeNull();

    expect(resolveSeatTelegramId(db, { callSign: 'BIL-001' })).toBe('8013171035');
    expect(detectTelegramLinkConflict(db, '8013171035', asTreeNodeId(bilId))?.owner.callSign).toBe(
      'ASH-001'
    );

    db.close();
  });

  test('resolvePartnerDmTelegramId finds shared-dm BIL seat', () => {
    const db = new Database(':memory:');
    db.run(`
      CREATE TABLE tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        parent_id TEXT,
        expert_id TEXT,
        name TEXT NOT NULL,
        call_sign TEXT UNIQUE,
        telegram_id TEXT UNIQUE,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE ops_chat_channel_meta (
        chat_id TEXT PRIMARY KEY,
        tree_node_ids_json TEXT NOT NULL DEFAULT '[]',
        call_signs_json TEXT NOT NULL DEFAULT '[]',
        locale TEXT NOT NULL DEFAULT 'en',
        topics_json TEXT NOT NULL DEFAULT '{}',
        image_bundle_id TEXT,
        last_template_ids_json TEXT NOT NULL DEFAULT '{}',
        linked_at TEXT,
        active_call_sign TEXT
      );
    `);

    const now = new Date().toISOString();
    const ashId = randomUUIDv7();
    const bilId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($ash, 'agent', 'Ash', 'ASH-001', '8013171035', 1, $now),
              ($bil, 'agent', 'Billy', 'BIL-001', NULL, 1, $now)`,
      { $ash: ashId, $bil: bilId, $now: now }
    );

    linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(bilId),
      callSign: 'BIL-001',
      chatId: '8013171035',
    });

    upsertPackageGroupRegistry(db, {
      partnerCode: 'BIL',
      chatId: '-1004396694559',
      displayName: 'Billy Ops',
      requestedBy: 'BIL-001',
    });

    expect(resolvePartnerDmFromRegistry(db, 'BIL', 'BIL-001')).toBe('8013171035');
    expect(resolvePartnerDmFromRegistry(db, 'BIL')).toBe('8013171035');

    db.close();
  });

  test('/seat switches active bot context for shared DM', () => {
    const db = new Database(':memory:');
    db.run(`
      CREATE TABLE tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        parent_id TEXT,
        expert_id TEXT,
        name TEXT NOT NULL,
        call_sign TEXT UNIQUE,
        telegram_id TEXT UNIQUE,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE ops_chat_channel_meta (
        chat_id TEXT PRIMARY KEY,
        tree_node_ids_json TEXT NOT NULL DEFAULT '[]',
        call_signs_json TEXT NOT NULL DEFAULT '[]',
        locale TEXT NOT NULL DEFAULT 'en',
        topics_json TEXT NOT NULL DEFAULT '{}',
        image_bundle_id TEXT,
        last_template_ids_json TEXT NOT NULL DEFAULT '{}',
        linked_at TEXT,
        active_call_sign TEXT
      );
    `);

    const now = new Date().toISOString();
    const ashId = randomUUIDv7();
    const bilId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($ash, 'agent', 'Ash', 'ASH-001', '8013171035', 1, $now),
              ($bil, 'agent', 'Billy', 'BIL-001', NULL, 1, $now)`,
      { $ash: ashId, $bil: bilId, $now: now }
    );

    linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(bilId),
      callSign: 'BIL-001',
      chatId: '8013171035',
    });

    expect(resolveFlowNodeForTelegram(db, '8013171035')?.call_sign).toBe('ASH-001');

    const switched = setActiveCallSignForTelegram(db, '8013171035', 'BIL-001');
    expect(switched.ok).toBe(true);
    expect(resolveFlowNodeForTelegram(db, '8013171035')?.call_sign).toBe('BIL-001');

    db.close();
  });

  test('reassignTelegramId moves primary telegram_id to new seat', () => {
    const db = new Database(':memory:');
    db.run(`
      CREATE TABLE tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        parent_id TEXT,
        expert_id TEXT,
        name TEXT NOT NULL,
        call_sign TEXT UNIQUE,
        telegram_id TEXT UNIQUE,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE ops_chat_channel_meta (
        chat_id TEXT PRIMARY KEY,
        tree_node_ids_json TEXT NOT NULL DEFAULT '[]',
        call_signs_json TEXT NOT NULL DEFAULT '[]',
        locale TEXT NOT NULL DEFAULT 'en',
        topics_json TEXT NOT NULL DEFAULT '{}',
        image_bundle_id TEXT,
        last_template_ids_json TEXT NOT NULL DEFAULT '{}',
        linked_at TEXT
      );
    `);

    const now = new Date().toISOString();
    const ashId = randomUUIDv7();
    const bilId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($ash, 'agent', 'Ash', 'ASH-001', '8013171035', 1, $now),
              ($bil, 'agent', 'Billy', 'BIL-001', NULL, 1, $now)`,
      { $ash: ashId, $bil: bilId, $now: now }
    );

    const { sharedDm } = linkTelegramChat(db, {
      treeNodeId: asTreeNodeId(bilId),
      callSign: 'BIL-001',
      chatId: '8013171035',
      reassignTelegramId: true,
    });

    expect(sharedDm).toBeUndefined();
    const ash = db
      .query('SELECT telegram_id FROM tree_nodes WHERE id = $id')
      .get({ $id: ashId }) as { telegram_id: string | null }; // brand-ok — sqlite wire
    const bil = db
      .query('SELECT telegram_id FROM tree_nodes WHERE id = $id')
      .get({ $id: bilId }) as { telegram_id: string | null }; // brand-ok — sqlite wire
    expect(ash.telegram_id).toBeNull();
    expect(bil.telegram_id).toBe('8013171035');

    db.close();
  });
});
