// @see https://bun.com/docs/runtime/sqlite
/**
 * Handle Telegram play ack callback_query: play:{playId}:{nodeId}:placed|skip
 */
import { seatAuthorizedForTelegramUser } from './flows/seat-telegram.ts';

export type PlayCallbackResult = { ok: true; message: string } | { ok: false; message: string };

export function parsePlayCallbackData(data: string): {
  playId: string; // brand-ok
  nodeId: string; // brand-ok
  action: 'placed' | 'skip';
} | null {
  const m = /^play:([^:]+):([^:]+):(placed|skip)$/.exec(data.trim());
  if (!m) return null;
  return { playId: m[1]!, nodeId: m[2]!, action: m[3] as 'placed' | 'skip' };
}

export function handlePlayCallback(
  db: Database,
  telegramUserId: string, // brand-ok
  data: string
): PlayCallbackResult {
  const parsed = parsePlayCallbackData(data);
  if (!parsed) return { ok: false, message: 'Invalid callback.' };

  const node = db
    .query('SELECT id FROM tree_nodes WHERE id = $id AND active = 1')
    .get({ $id: parsed.nodeId }) as { id: string } | null; // brand-ok
  if (!node || !seatAuthorizedForTelegramUser(db, telegramUserId, parsed.nodeId)) {
    return { ok: false, message: 'Not authorized for this play.' };
  }

  const dist = db
    .query(
      `SELECT stake_actual, ack_status FROM play_distribution
       WHERE play_id = $pid AND node_id = $nid`
    )
    .get({ $pid: parsed.playId, $nid: parsed.nodeId }) as {
    stake_actual: number | null;
    ack_status: string;
  } | null;
  if (!dist) return { ok: false, message: 'Play not found.' };

  const now = new Date().toISOString();
  if (parsed.action === 'placed') {
    db.run(
      `UPDATE play_distribution SET ack_status = 'placed', status = 'placed', acted_at = $now
       WHERE play_id = $pid AND node_id = $nid`,
      { $now: now, $pid: parsed.playId, $nid: parsed.nodeId }
    );
    const stake = dist.stake_actual ?? 0;
    new AccountService(db).recordPlayPlaced(parsed.nodeId, stake, 0);
    return { ok: true, message: 'Marked as placed. Good luck!' };
  }

  db.run(
    `UPDATE play_distribution SET ack_status = 'skipped', status = 'passed', acted_at = $now
     WHERE play_id = $pid AND node_id = $nid`,
    { $now: now, $pid: parsed.playId, $nid: parsed.nodeId }
  );
  return { ok: true, message: 'Play skipped.' };
}
