// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { enqueuePlayTelegramEvent } from '../lib/channels/outbox.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';
import { handlePlayCallback, parsePlayCallbackData } from '../lib/telegram/play-callback.ts';

describe('play telegram ack', () => {
  test('parsePlayCallbackData', () => {
    const p = parsePlayCallbackData('play:pid:nid:placed');
    expect(p?.playId).toBe('pid');
    expect(p?.nodeId).toBe('nid');
    expect(p?.action).toBe('placed');
  });

  test('handlePlayCallback placed updates ack_status and growth', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = Bun.randomUUIDv7();
    const playId = Bun.randomUUIDv7();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, status, created_at)
       VALUES ($id, 'agent', 'A', '999', 1, 'active', $n)`,
      { $id: nodeId, $n: now }
    );
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($eid, 'E', 'NBA', 'totals', 0.5, 1, $n)`,
      { $eid: Bun.randomUUIDv7(), $n: now }
    );
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, result, sent_at)
       VALUES ($pid, (SELECT id FROM experts LIMIT 1), 'NBA', 'spread', 'LAL/BOS', 'LAL', -110, 100, 'hash', 'pending', $n)`,
      { $pid: playId, $n: now }
    );
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at, stake_actual, ack_status)
       VALUES ($pid, $nid, 'telegram', $n, 100, 'pending')`,
      { $pid: playId, $nid: nodeId, $n: now }
    );

    const result = handlePlayCallback(db, '999', `play:${playId}:${nodeId}:placed`);
    expect(result.ok).toBe(true);

    const row = db
      .query('SELECT ack_status FROM play_distribution WHERE play_id = $p AND node_id = $n')
      .get({ $p: playId, $n: nodeId }) as { ack_status: string };
    expect(row.ack_status).toBe('placed');

    const gm = db
      .query('SELECT plays_placed FROM growth_metrics WHERE node_id = $id')
      .get({ $id: nodeId }) as { plays_placed: number } | null;
    expect(gm?.plays_placed).toBe(1);
    db.close();
  });

  test('enqueuePlayTelegramEvent includes inline keyboard', () => {
    const db = openOperationsDb({ path: ':memory:' });
    enqueuePlayTelegramEvent(db, {
      playId: 'play-1',
      nodeId: asTreeNodeId(Bun.randomUUIDv7()),
      telegramId: '555',
      text: 'Test play',
    });
    const row = db
      .query('SELECT payload_json FROM ops_channel_outbox LIMIT 1')
      .get() as { payload_json: string };
    const payload = JSON.parse(row.payload_json) as {
      replyMarkup?: { inline_keyboard: Array<Array<{ callback_data: string }>> };
    };
    expect(payload.replyMarkup?.inline_keyboard?.[0]?.[0]?.callback_data).toContain(':placed');
    db.close();
  });
});
