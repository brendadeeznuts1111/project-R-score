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
import { loadTelegramEnv } from '../telegram/telegram-config.ts';
import { asTreeNodeId, asGateDecisionId, tryStateCode } from '../types/branded/operations.ts';
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
import { ComplianceRepository, ensureStateRegulationSchema } from './state-regulation.ts';
import { rankPlayRecipients, type TocRoutingContext } from './toc-play-routing.ts';
import type { PlayInput, PlaySigner } from './play-signing.ts';

export type PublishDispatchOpts = {
  /** When true (default false), run validatePlayFull before insert and throw on fail. */
  validate?: boolean;
  /** When true (default true), flush outbox after enqueue. Tests pass false. */
  flush?: boolean;
  /** Telegram bot token for flush; falls back to TELEGRAM_BOT_FACTORY / TELEGRAM_BOT_TOKEN. */
  telegramToken?: string;
  /** When true (default true), record growth metrics per recipient. */
  recordMetrics?: boolean;
  /** Override baked TOC snapshot for recipient ranking (tests / dry-run). */
  routingContext?: TocRoutingContext;
  /**
   * Jurisdiction for regulatory gate when play.stateCode is unset.
   * When neither is set, state compliance is skipped (legacy plays).
   */
  stateCode?: string;
  /**
   * When true (default), run MA/NJ compliance per recipient when a state is resolved.
   * Set false only for fixtures that intentionally bypass regulation.
   */
  enforceStateCompliance?: boolean;
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
  const playState = tryStateCode(play.stateCode) ?? tryStateCode(opts.stateCode) ?? null;
  const enforceState = opts.enforceStateCompliance !== false;
  if (playState || enforceState) {
    ensureStateRegulationSchema(db);
  }
  const compliance = playState && enforceState ? new ComplianceRepository(db) : null;

  const recipients = rankPlayRecipients(db, play.expertId, {
    context: opts.routingContext,
  });

  const payload = formatPlayMessage({ ...play, id, signedHash });
  const now = sentAt;

  db.transaction(() => {
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, state_code)
       VALUES ($id, $eid, $sport, $market, $event, $sel, $odds, $stake, $conf, $hash, $sent, $state)`,
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
        $state: playState,
      }
    );
  })();

  let enqueued = 0;

  const signalType = inferSignalTypeFromPlay(play);
  const betType = play.betType?.trim() || 'straight';

  for (const { nodeId } of recipients) {
    const treeNodeId = asTreeNodeId(nodeId);
    const hasBinding = db
      .query('SELECT 1 FROM partner_profile_bindings WHERE tree_node_id = $id')
      .get({ $id: nodeId });
    if (!hasBinding) {
      bindPartnerProfile(db, treeNodeId);
    }
  }

  for (const {
    nodeId,
    telegramId,
    callSign,
    weightedScore,
    ropeBlocked,
    rankedRank,
  } of recipients) {
    const treeNodeId = asTreeNodeId(nodeId);

    if (ropeBlocked) {
      const evaluation = {
        allowed: false as const,
        action: 'defer' as const,
        reason: `TOC routing defer (weightedScore=${weightedScore.toFixed(2)}${callSign ? ` · ${callSign}` : ''})`,
        decisionId: asGateDecisionId(randomUUIDv7()),
      };
      recordGateDecision(db, id, treeNodeId, evaluation);
      enqueuePlayGatedChannelEvent(db, {
        playId: id,
        treeNodeId,
        allowed: false,
        action: 'defer',
        reason: evaluation.reason,
        rankedRank,
        callSign,
        weightedScore,
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

    // State regulatory gate (license · limits · special rules) — after partner policy, before reserve.
    if (compliance && playState) {
      const reg = compliance.checkAndRecord({
        nodeId: treeNodeId,
        stateCode: playState,
        sportId: play.sport,
        marketId: play.market,
        wagerAmount: stake,
        betType,
        playId: id,
      });
      if (!reg.allowed) {
        const decisionId = asGateDecisionId(randomUUIDv7());
        recordGateDecision(db, id, treeNodeId, {
          allowed: false,
          action: 'block',
          reason: reg.reason,
          decisionId,
          templateId: gate.templateId,
        });
        enqueuePlayGatedChannelEvent(db, {
          playId: id,
          treeNodeId,
          allowed: false,
          action: 'block',
          reason: reg.reason,
          templateId: gate.templateId,
        });
        continue;
      }
    }

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
          `INSERT OR IGNORE INTO play_distribution (play_id, node_id, channel, received_at, stake_actual, ack_status, state_code)
           VALUES ($pid, $nid, 'telegram', $now, $stake, 'pending', $state)`,
          { $pid: id, $nid: nodeId, $now: now, $stake: stake, $state: playState }
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
    const token = opts.telegramToken?.trim() || loadTelegramEnv().effectiveToken || '';
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
