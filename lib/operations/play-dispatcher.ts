// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
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
import {
  enqueuePlayGatedChannelEvent,
  enqueuePlayTelegramEvent,
  processChannelOutbox,
} from '../channels/outbox.ts';
import { resolveProductionOutboxOpts } from '../channels/outbox-prod-opts.ts';
import { asTreeNodeId, asGateDecisionId } from '../types/branded/operations.ts';
import { AccountService } from './account-service.ts';
import { detectFraudSignals } from './fraud-guard.ts';
import { reservePlayWithRetry, releasePlay } from './liquidity.ts';
import {
  bindPartnerProfile,
  evaluateForNode,
  inferSignalTypeFromPlay,
  recordGateDecision,
} from './partner-profile-bridge.ts';
import { validatePlay } from './play-validation.ts';
import { rankPlayRecipients } from './toc-play-routing.ts';
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

  const recipients = rankPlayRecipients(db, play.expertId);

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
  })();

  let enqueued = 0;

  const signalType = inferSignalTypeFromPlay(play);

  for (const { nodeId } of recipients) {
    const treeNodeId = asTreeNodeId(nodeId);
    const hasBinding = db
      .query('SELECT 1 FROM partner_profile_bindings WHERE tree_node_id = $id')
      .get({ $id: nodeId });
    if (!hasBinding) {
      bindPartnerProfile(db, treeNodeId);
    }
  }

  for (const { nodeId, telegramId, weightedScore, ropeBlocked } of recipients) {
    const treeNodeId = asTreeNodeId(nodeId);

    if (ropeBlocked) {
      const evaluation = {
        allowed: false as const,
        action: 'defer' as const,
        reason: `TOC routing defer (weightedScore=${weightedScore.toFixed(2)})`,
        decisionId: asGateDecisionId(randomUUIDv7()),
      };
      recordGateDecision(db, id, treeNodeId, evaluation);
      enqueuePlayGatedChannelEvent(db, {
        playId: id,
        treeNodeId,
        allowed: false,
        action: 'defer',
        reason: evaluation.reason,
      });
      continue;
    }

    const gate = evaluateForNode(db, treeNodeId, {
      suggestedStake: play.stakeRecommended,
      signalType,
      bookSlug: play.bookSlug,
    });
    recordGateDecision(db, id, treeNodeId, gate);
    if (!gate.allowed) {
      enqueuePlayGatedChannelEvent(db, {
        playId: id,
        treeNodeId,
        allowed: false,
        action: gate.action,
        reason: gate.reason,
        adjustedStake: gate.adjustedStake,
        templateId: gate.templateId,
      });
      continue;
    }

    const stake = gate.adjustedStake ?? play.stakeRecommended;
    const book = play.bookSlug?.trim() || '_all';
    const reserve = reservePlayWithRetry(db, nodeId, stake, book, {
      checkCoverage: book !== '_all',
    });
    if (!reserve.ok) {
      enqueuePlayGatedChannelEvent(db, {
        playId: id,
        treeNodeId,
        allowed: false,
        action: 'block',
        reason: reserve.reason ?? 'reserve failed',
        templateId: gate.templateId,
      });
      continue;
    }

    try {
      db.transaction(() => {
        db.run(
          `INSERT OR IGNORE INTO play_distribution (play_id, node_id, channel, received_at, stake_actual, ack_status)
           VALUES ($pid, $nid, 'telegram', $now, $stake, 'pending')`,
          { $pid: id, $nid: nodeId, $now: now, $stake: stake }
        );

        enqueuePlayTelegramEvent(db, {
          playId: id,
          nodeId: treeNodeId,
          telegramId,
          text: payload,
        });

        if (recordMetrics) {
          new AccountService(db).recordPlayReceived(nodeId);
        }
      })();
      enqueued++;
    } catch {
      releasePlay(db, nodeId, stake);
    }
  }

  if (doFlush) {
    const token = opts.telegramToken ?? Bun.env.TELEGRAM_BOT_TOKEN ?? '';
    if (token) {
      await flushOutbox(db, { token });
    } else {
      await processChannelOutbox(db, resolveProductionOutboxOpts({ deliver: false }));
    }
  }

  return { id, enqueued, signedHash, sentAt };
}

/**
 * Flush unified ops_channel_outbox (Telegram via projector) and legacy telegram_outbox rows.
 */
export async function flushOutbox(
  db: Database,
  opts: FlushOutboxOpts
): Promise<{ sent: number; failed: number }> {
  const unified = await processChannelOutbox(
    db,
    resolveProductionOutboxOpts({ telegramToken: opts.token, deliver: true })
  );

  const pending = db
    .query(
      `SELECT id, telegram_id, payload FROM telegram_outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    )
    .all() as { id: string; telegram_id: string; payload: string }[]; // brand-ok

  let sent = unified.sent;
  let failed = unified.failed;

  for (const row of pending) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${opts.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: row.telegram_id,
          text: row.payload,
          parse_mode: 'Markdown',
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && body.ok !== false) {
        db.run(`UPDATE telegram_outbox SET status = 'sent', sent_at = $now WHERE id = $id`, {
          $now: new Date().toISOString(),
          $id: row.id,
        });
        sent++;
      } else {
        db.run(
          `UPDATE telegram_outbox SET status = 'failed', retries = retries + 1 WHERE id = $id`,
          { $id: row.id }
        );
        failed++;
      }
    } catch {
      db.run(`UPDATE telegram_outbox SET status = 'failed', retries = retries + 1 WHERE id = $id`, {
        $id: row.id,
      });
      failed++;
    }
  }

  return { sent, failed };
}
