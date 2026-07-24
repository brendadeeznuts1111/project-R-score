/**
 * Telegram flow cards — keyboards, balances, callbacks.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { handleFlowCallback } from '../lib/telegram/flows/callbacks.ts';
import { getBalancesSnapshot } from '../lib/telegram/flows/balances-snapshot.ts';
import { translateKeyboard, playAckKeyboard, parseFlowCallback } from '../lib/telegram/flows/keyboards.ts';
import { runFlow } from '../lib/telegram/flows/registry.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

describe('telegram flows', () => {
  test('translateKeyboard uses en labels', () => {
    const kb = translateKeyboard({
      rows: [[{ textKey: 'btn.balances', callbackData: 'f:balances' }]],
    });
    expect(kb.inline_keyboard[0]![0]!.text).toContain('Balances');
    expect(kb.inline_keyboard[0]![0]!.callback_data).toBe('f:balances');
  });

  test('playAckKeyboard keeps stable callback_data', () => {
    const kb = playAckKeyboard('p1', 'n1', 'es');
    expect(kb.inline_keyboard[0]![0]!.callback_data).toBe('play:p1:n1:placed');
    expect(kb.inline_keyboard[0]![0]!.text).toContain('Colocado');
  });

  test('parseFlowCallback detects refresh', () => {
    expect(parseFlowCallback('f:balances:r')).toEqual({ flowId: 'balances', refresh: true });
    expect(parseFlowCallback('f:menu')).toEqual({ flowId: 'menu', refresh: false });
  });

  test('balancesFlow read-only snapshot', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', NULL, NULL, 'TOC ASH-001', 'ASH-001', '999', 1, $now)`,
      { $id: agentId, $now: now }
    );
    db.run(
      `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status, created_at)
       VALUES ($aid, $agent, 'hardrock', 'user1', 2500, 'active', $now)`,
      { $aid: randomUUIDv7(), $agent: agentId, $now: now }
    );

    const snap = getBalancesSnapshot(db, { treeNodeId: asTreeNodeId(agentId) });
    expect(snap.callSign).toBe('ASH-001');
    expect(snap.hard).toBe(2500);

    const output = runFlow(db, ':memory:', {
      flowId: 'balances',
      chatId: '1',
      userId: '999',
    });
    expect(output.text).toContain('Hard:');
    expect(output.keyboard?.rows.some(r => r.some(b => b.callbackData === 'f:balances:r'))).toBe(true);
    db.close();
  });

  test('handleFlowCallback routes f:status', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', NULL, NULL, 'Agent', 'PAT-001', '42', 1, $now)`,
      { $id: agentId, $now: now }
    );

    const output = handleFlowCallback('f:status', {
      db,
      dbPath: ':memory:',
      chatId: '1',
      userId: '42',
      node: {
        id: agentId,
        type: 'agent',
        parent_id: null,
        expert_id: null,
        name: 'Agent',
        telegram_id: '42',
        call_sign: 'PAT-001',
      },
    });
    expect(output?.text).toContain('Status');
    expect(output?.keyboard).toBeDefined();
    db.close();
  });
});
