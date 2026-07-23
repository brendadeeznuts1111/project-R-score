// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Play dispatcher — transactional publish + Telegram outbox.
 *
 * Extends {@link PlaySigner} with optional full validation (stake/rate + fraud),
 * outbox enqueue, growth metrics, and flush to Telegram Bot API.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { AccountService } from './account-service.ts';
import { detectFraudSignals } from './fraud-guard.ts';
import { validatePlay } from './play-validation.ts';
import type { PlayInput, PlaySigner } from './play-signing.ts';

export type PublishDispatchOpts = {
  /** When true (default false), run validatePlayFull before insert and throw on fail. */
  validate?: boolean;
  /** When true (default true), flush outbox after enqueue. Tests pass false. */
  flush?: boolean;
  /** Telegram bot token for flush; falls back to TELEGRAM_BOT_TOKEN env. */
  telegramToken?: string;
  /** When true (default true), record growth metrics per recipient. */
  recordMetrics?: boolean;
};

export type PublishDispatchResult = {
  id: string; // brand-ok — play id
  enqueued: number;
  signedHash: string;
  sentAt: string;
};

export type FlushOutboxOpts = {
  token: string;
};

/** Stake/rate/duplicate + fraud signals. */
export function validatePlayFull(db: Database, play: PlayInput) {
  const base = validatePlay(db, play);
  if (!base.valid) return base;
  return detectFraudSignals(db, play);
}

function formatPlayMessage(
  play: PlayInput & { id: string; signedHash: string } // brand-ok
): string {
  const lines = [
    `🎯 *${play.sport}* · ${play.market}`,
    `*${play.event}*`,
    `Selection: ${play.selection}`,
    `Odds: ${play.odds}`,
    `Stake: $${play.stakeRecommended}`,
  ];
  if (play.confidence != null && play.confidence > 0) {
    lines.push(`Confidence: ${(play.confidence * 100).toFixed(0)}%`);
  }
  lines.push(`Play \`${play.id.slice(0, 8)}\` · sig \`${play.signedHash.slice(0, 12)}\``);
  return lines.join('\n');
}

/**
 * Sign + insert play, fan-out distribution + pending outbox rows.
 * Optional validation throws Error(reason) before any insert.
 */
export async function publishAndDispatch(
  signer: PlaySigner,
  play: PlayInput,
  db: Database,
  opts: PublishDispatchOpts = {}
): Promise<PublishDispatchResult> {
  const validate = opts.validate === true;
  const doFlush = opts.flush !== false;
  const recordMetrics = opts.recordMetrics !== false;

  if (validate) {
    const check = validatePlayFull(db, play);
    if (!check.valid) {
      throw new Error(check.reason);
    }
  }

  const id = randomUUIDv7(); // brand-ok
  const signedHash = signer.sign(play);
  const sentAt = new Date().toISOString();
  const confidence = play.confidence ?? 0;

  const recipients = db
    .query(
      `SELECT id, telegram_id FROM tree_nodes
       WHERE expert_id = $eid AND active = 1 AND telegram_id IS NOT NULL AND telegram_id != ''`
    )
    .all({ $eid: play.expertId }) as { id: string; telegram_id: string }[]; // brand-ok

  const payload = formatPlayMessage({ ...play, id, signedHash });
  const now = sentAt;

  db.transaction(() => {
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at)
       VALUES ($id, $eid, $sport, $market, $event, $sel, $odds, $stake, $conf, $hash, $sent)`,
      {
        $id: id,
        $eid: play.expertId,
        $sport: play.sport,
        $market: play.market,
        $event: play.event,
        $sel: play.selection,
        $odds: play.odds,
        $stake: play.stakeRecommended,
        $conf: confidence,
        $hash: signedHash,
        $sent: sentAt,
      }
    );

    for (const { id: nodeId, telegram_id: telegramId } of recipients) {
      db.run(
        `INSERT OR IGNORE INTO play_distribution (play_id, node_id, channel, received_at)
         VALUES ($pid, $nid, 'telegram', $now)`,
        { $pid: id, $nid: nodeId, $now: now }
      );

      const outboxId = randomUUIDv7(); // brand-ok
      db.run(
        `INSERT INTO telegram_outbox (id, node_id, play_id, telegram_id, payload, status, retries, created_at)
         VALUES ($id, $nid, $pid, $tg, $payload, 'pending', 0, $now)`,
        {
          $id: outboxId,
          $nid: nodeId,
          $pid: id,
          $tg: telegramId,
          $payload: payload,
          $now: now,
        }
      );

      if (recordMetrics) {
        new AccountService(db).recordPlayReceived(nodeId);
      }
    }
  })();

  const enqueued = recipients.length;

  if (doFlush) {
    const token = opts.telegramToken ?? Bun.env.TELEGRAM_BOT_TOKEN ?? '';
    if (token) {
      await flushOutbox(db, { token });
    }
  }

  return { id, enqueued, signedHash, sentAt };
}

/**
 * Send pending telegram_outbox rows via Bot API. Marks sent/failed.
 */
export async function flushOutbox(
  db: Database,
  opts: FlushOutboxOpts
): Promise<{ sent: number; failed: number }> {
  const pending = db
    .query(
      `SELECT id, telegram_id, payload FROM telegram_outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    )
    .all() as { id: string; telegram_id: string; payload: string }[]; // brand-ok

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${opts.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: row.telegram_id,
            text: row.payload,
            parse_mode: 'Markdown',
          }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && body.ok !== false) {
        db.run(
          `UPDATE telegram_outbox SET status = 'sent', sent_at = $now WHERE id = $id`,
          { $now: new Date().toISOString(), $id: row.id }
        );
        sent++;
      } else {
        db.run(
          `UPDATE telegram_outbox SET status = 'failed', retries = retries + 1 WHERE id = $id`,
          { $id: row.id }
        );
        failed++;
      }
    } catch {
      db.run(
        `UPDATE telegram_outbox SET status = 'failed', retries = retries + 1 WHERE id = $id`,
        { $id: row.id }
      );
      failed++;
    }
  }

  return { sent, failed };
}
