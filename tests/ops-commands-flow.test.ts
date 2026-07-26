/**
 * Ops command dispatch — template flow path + ChatChannelMeta on register.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { initSchema } from '../lib/operations/schema.ts';
import { getChatChannelMeta } from '../lib/telegram/flows/channel-meta.ts';
import {
  dispatchOpsFlowOutput,
  handleOpsRegister,
} from '../lib/telegram/ops-commands.ts';
import { asTelegramUserId } from '../lib/types/branded/portal.ts';

describe('ops-commands flow dispatch', () => {
  test('dispatchOpsFlowOutput returns HTML template card with keyboard', async () => {
    const db = new (await import('bun:sqlite')).Database(':memory:');
    initSchema(db);
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    const parentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at)
       VALUES ($pid, 'partner', 'Parent', NULL, 1, $now)`,
      { $pid: parentId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', $pid, 'Agent', 'PAT-001', '4242', 1, $now)`,
      { $id: agentId, $pid: parentId, $now: now }
    );
    db.run(
      `INSERT INTO partner_profile_bindings (tree_node_id, profile_key, template_id, lifecycle_status, created_at, updated_at)
       VALUES ($id, 'pk', 'default-prospect', 'active', $now, $now)`,
      { $id: agentId, $now: now }
    );

    const output = dispatchOpsFlowOutput(db, ':memory:', {
      telegramUserId: '4242',
      command: '/status',
      args: [],
    });
    expect(output?.parseMode).toBe('HTML');
    expect(output?.text).toContain('Status');
    expect(output?.templateId).toBe('status.v1');
    expect(output?.keyboard?.rows.length).toBeGreaterThan(0);
    db.close();
  });

  test('handleOpsRegister upserts ChatChannelMeta', async () => {
    const db = new (await import('bun:sqlite')).Database(':memory:');
    initSchema(db);
    const now = new Date().toISOString();
    const parentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at)
       VALUES ($pid, 'partner', 'Parent', NULL, 1, $now)`,
      { $pid: parentId, $now: now }
    );

    const reply = handleOpsRegister(db, asTelegramUserId('7777'), [parentId, 'New', 'Agent']);
    expect(reply).toContain('Registered');

    const meta = getChatChannelMeta(db, '7777');
    expect(meta?.chatId).toBe('7777');
    expect(meta?.treeNodeIds.length).toBe(1);
    db.close();
  });
});
