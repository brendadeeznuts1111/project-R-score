/**
 * Ops command dispatch — template flow path + ChatChannelMeta on register.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { initSchema } from '../lib/operations/schema.ts';
import { getPartnerGeoProfile } from '../lib/operations/state-regulation.ts';
import { getChatChannelMeta } from '../lib/telegram/flows/channel-meta.ts';
import {
  dispatchOpsCommand,
  dispatchOpsFlowOutput,
  handleOpsDossier,
  handleOpsRegister,
} from '../lib/telegram/ops-commands.ts';
import { asTelegramUserId } from '../lib/types/branded/portal.ts';
import { FACTORY_BOT_COMMANDS } from '../lib/telegram/telegram-api.ts';

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

  test('handleOpsDossier returns portal deep-link for linked seat', async () => {
    const db = new (await import('bun:sqlite')).Database(':memory:');
    initSchema(db);
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'Ash Agent', 'ASH-001', '4242', 1, $now)`,
      { $id: agentId, $now: now }
    );
    const reply = handleOpsDossier(db, {
      id: agentId,
      type: 'agent',
      parent_id: null,
      expert_id: null,
      name: 'Ash Agent',
      telegram_id: '4242',
      call_sign: 'ASH-001',
    });
    expect(reply).toContain('Account dossier');
    expect(reply).toContain(`/portal/account/?account=${encodeURIComponent(agentId)}`);
    expect(reply).toContain('#partner/ASH/telegram/general');
    expect(reply).toContain('page.accountDossier');

    const dispatched = dispatchOpsCommand(db, ':memory:', {
      telegramUserId: '4242',
      command: '/dossier',
      args: [],
      chatType: 'private',
    });
    expect(dispatched).toContain('/portal/account/?account=');
    db.close();
  });

  test('FACTORY_BOT_COMMANDS catalogs dossier and limits', () => {
    const cmds = FACTORY_BOT_COMMANDS.map(c => c.command);
    expect(cmds).toContain('dossier');
    expect(cmds).toContain('limits');
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

  test('handleOpsRegister applies trailing state= age= zip= loc= compliance', async () => {
    const db = new (await import('bun:sqlite')).Database(':memory:');
    initSchema(db);
    const now = new Date().toISOString();
    const parentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at)
       VALUES ($pid, 'partner', 'Parent', NULL, 1, $now)`,
      { $pid: parentId, $now: now }
    );

    const reply = handleOpsRegister(db, asTelegramUserId('8888'), [
      parentId,
      'Alice',
      'Chen',
      'state=NJ',
      'age=28',
      'loc=Newark',
      'zip=07102',
    ]);
    expect(reply).toContain('Registered');
    expect(reply).toContain('Compliance');
    expect(reply).toContain('NJ');

    const meta = getChatChannelMeta(db, '8888');
    expect(meta?.treeNodeIds.length).toBe(1);
    const nodeId = meta!.treeNodeIds[0]!;
    const geo = getPartnerGeoProfile(db, nodeId);
    expect(geo?.stateCode).toBe('NJ');
    expect(geo?.age).toBe(28);
    expect(geo?.location).toBe('Newark');
    expect(geo?.zipCode).toBe('07102');

    const name = db
      .query('SELECT name FROM tree_nodes WHERE id = $id')
      .get({ $id: nodeId as string }) as { name: string };
    expect(name.name).toBe('Alice Chen');
    db.close();
  });
});
