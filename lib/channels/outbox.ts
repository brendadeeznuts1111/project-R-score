// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Unified ops channel outbox — one envelope, many projectors (R2 · Telegram · Slack).
 *
 * `projectLocal` → in-process MemoryChannelStore (serve-public dev feed).
 * `projectR2` → durable R2ChannelStore when `opts.r2Store` is supplied.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { sendRegistryAlert } from '../factory/alerts.ts';
import { MemoryChannelStore, R2ChannelStore, type ChannelMessage } from './channels.ts';
import {
  asOpsChannelEventId,
  asPartnerTemplateId,
  type PartnerTemplateId,
  type TreeNodeId,
} from '../types/branded/operations.ts';
import type {
  OpsChannelEvent,
  OpsChannelHealthSlice,
  OpsChannelProjector,
  OpsChannelTopic,
} from './ops-channel-event.ts';
import { parseProjectors } from './ops-channel-event.ts';
import { sendTelegramBotMessage } from '../telegram/telegram-api.ts';
import { recordBroadcastOutboxSend } from '../telegram/broadcast-log.ts';
import { rememberTemplateMessageId } from '../telegram/flows/channel-meta.ts';
import { playAckKeyboard, translateKeyboard } from '../telegram/flows/keyboards.ts';
import { resolveOpsChatForOutbox } from '../telegram/surfaces.ts';
import {
  resolvePackageGroupTopicsForChat,
  threadIdForPackageGroupOutboxTopic,
  PACKAGE_GROUP_FORUMS_META_DIR,
} from '../telegram/package-group-forum.ts';
import { resolvePackageGroupRegistryForTreeNode } from '../telegram/package-group-registry.ts';
import { loadTelegramEnv, threadIdForOutboxTopic } from '../telegram/telegram-config.ts';
import { renderForNode } from '../telegram/templates/render.ts';
import type { TemplateId } from '../telegram/templates/types.ts';

/** Inline keyboard for play ack callbacks (placed / skip). */
export function playAckReplyMarkup(
  playId: string, // brand-ok — opaque plays.id wire
  nodeId: string, // brand-ok — opaque tree_nodes.id wire
  locale: 'en' | 'es' = 'en'
) {
  return playAckKeyboard(playId, nodeId, locale);
}

/** Process-local feed for serve-public /api/channels/events (not release-channel meta). */
export const localOpsChannelStore = new MemoryChannelStore();

export type EnqueueOpsChannelOpts = {
  topic: OpsChannelTopic;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  projectors?: OpsChannelProjector[];
  /** Defer drain until this ISO timestamp (rate-limit stagger / 429 backoff). */
  availableAt?: string | null;
};

export type ProcessOutboxOpts = {
  telegramToken?: string;
  slackWebhookUrl?: string;
  /** When false, skip network projectors (tests). Default true. */
  deliver?: boolean;
  /** Durable R2 projector; when omitted, `r2` rows use {@link localOpsChannelStore}. */
  r2Store?: R2ChannelStore | MemoryChannelStore;
  /** Max pending rows per drain call (default 250). */
  limit?: number;
  /** Override forum metadata dir for package-group thread routing. */
  forumsMetaDir?: string;
};

function defaultProjectors(topic: OpsChannelTopic): OpsChannelProjector[] {
  if (topic === 'alerts') return ['r2', 'slack', 'telegram'];
  if (topic === 'identity' || topic === 'toc') return ['r2'];
  return ['r2', 'telegram'];
}

/** Insert pending row into ops_channel_outbox. */
export function enqueueOpsChannelEvent(db: Database, opts: EnqueueOpsChannelOpts): OpsChannelEvent {
  const id = asOpsChannelEventId(randomUUIDv7());
  const createdAt = new Date().toISOString();
  const projectors = opts.projectors ?? defaultProjectors(opts.topic);
  const payloadJson = JSON.stringify(opts.payload);

  const result = db.run(
    `INSERT OR IGNORE INTO ops_channel_outbox
     (id, topic, event_type, idempotency_key, payload_json, projectors, status, retries, created_at, available_at)
     VALUES ($id, $topic, $etype, $ikey, $payload, $proj, 'pending', 0, $created, $avail)`,
    {
      $id: id as string,
      $topic: opts.topic,
      $etype: opts.eventType,
      $ikey: opts.idempotencyKey,
      $payload: payloadJson,
      $proj: projectors.join(','),
      $created: createdAt,
      $avail: opts.availableAt ?? null,
    }
  );

  return {
    id,
    topic: opts.topic,
    eventType: opts.eventType,
    payload: opts.payload,
    idempotencyKey: opts.idempotencyKey,
    projectors,
    createdAt,
    inserted: result.changes > 0,
  };
}

export function queryOpsChannelHealth(db: Database): OpsChannelHealthSlice {
  const counts = db
    .query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
         COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent
       FROM ops_channel_outbox`
    )
    .get() as { pending: number; failed: number; sent: number };

  const oldest = db
    .query(
      `SELECT created_at FROM ops_channel_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`
    )
    .get() as { created_at: string } | null;

  const total = counts.sent + counts.failed;
  const failRate = total > 0 ? counts.failed / total : 0;

  return {
    pending: counts.pending,
    failed: counts.failed,
    sent: counts.sent,
    oldestPendingAt: oldest?.created_at ?? null,
    failRate,
  };
}

type OutboxRow = {
  id: string; // brand-ok — OpsChannelEventId
  topic: OpsChannelTopic;
  event_type: string;
  payload_json: string;
  projectors: string;
  retries: number;
  available_at: string | null;
};

const MAX_RATE_LIMIT_DEFERRALS = 5;

async function projectLocal(row: OutboxRow, payload: Record<string, unknown>): Promise<boolean> {
  await localOpsChannelStore.publish(row.topic, payload, { sender: 'ops-outbox' });
  return true;
}

async function projectR2(
  row: OutboxRow,
  payload: Record<string, unknown>,
  store: R2ChannelStore | MemoryChannelStore
): Promise<boolean> {
  await store.publish(row.topic, payload, { sender: 'ops-outbox' });
  return true;
}

async function projectTelegram(
  row: OutboxRow,
  payload: Record<string, unknown>,
  token: string,
  opts?: {
    db?: Database;
    forumsMetaDir?: string;
    packageTopicsCache?: Map<string, Record<string, number> | null>;
  }
): Promise<{
  ok: boolean;
  messageId?: number;
  error?: string;
  errorCode?: number;
  retryAfterSec?: number;
}> {
  const env = loadTelegramEnv();
  const dmTarget = payload.telegramId ?? payload.telegram_id;
  const text = typeof payload.text === 'string' ? payload.text : JSON.stringify(payload);
  if (!token) return { ok: false };

  const explicitThread =
    typeof payload.messageThreadId === 'number'
      ? payload.messageThreadId
      : typeof payload.message_thread_id === 'number'
        ? payload.message_thread_id
        : undefined;

  let chatId: string | number | null = dmTarget != null ? String(dmTarget) : null; // brand-ok — Telegram chat_id wire
  let messageThreadId = explicitThread;
  let resolvedOps: ReturnType<typeof resolveOpsChatForOutbox> = null;

  if (!chatId) {
    resolvedOps = resolveOpsChatForOutbox({ topic: row.topic });
    if (resolvedOps) chatId = resolvedOps.chatId;
  }

  if (!chatId) return { ok: false, error: 'no chat target' };

  if (messageThreadId == null && opts?.db) {
    const chatKey = String(chatId);
    let packageTopics = opts.packageTopicsCache?.get(chatKey);
    if (packageTopics === undefined) {
      const lookup = await resolvePackageGroupTopicsForChat(
        opts.db,
        chatKey,
        opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR
      );
      packageTopics = lookup?.topics ?? null;
      opts.packageTopicsCache?.set(chatKey, packageTopics);
    }
    if (packageTopics) {
      messageThreadId = threadIdForPackageGroupOutboxTopic(
        packageTopics,
        row.topic as OpsChannelTopic,
        row.event_type
      );
    }
  }

  if (messageThreadId == null && resolvedOps) {
    // Forum threads for ops hub / concern surfaces (shared TELEGRAM_TOPICS map).
    if (resolvedOps.chatId === env.opsChatId || resolvedOps.source === 'ops_chat') {
      messageThreadId = threadIdForOutboxTopic(
        env.topics,
        row.topic as OpsChannelTopic,
        row.event_type
      );
    } else if (resolvedOps.surfaceSlug === 'hq' || resolvedOps.surfaceSlug === 'ash-staging') {
      messageThreadId = threadIdForOutboxTopic(
        env.topics,
        row.topic as OpsChannelTopic,
        row.event_type
      );
    }
  }

  const rawParse = payload.parseMode ?? payload.parse_mode;
  const parseMode =
    rawParse === 'HTML' || rawParse === 'Markdown' ? (rawParse as 'HTML' | 'Markdown') : undefined;

  const result = await sendTelegramBotMessage(token, {
    chatId,
    text,
    parseMode,
    replyMarkup:
      payload.replyMarkup && typeof payload.replyMarkup === 'object'
        ? (payload.replyMarkup as Record<string, unknown>)
        : undefined,
    messageThreadId,
  });

  return {
    ok: result.ok,
    messageId: result.messageId,
    error: result.ok
      ? undefined
      : (result.description ?? `telegram error ${result.errorCode ?? '?'}`),
    errorCode: result.errorCode,
    retryAfterSec: result.retryAfterSec,
  };
}

async function projectSlack(
  row: OutboxRow,
  payload: Record<string, unknown>,
  webhookUrl?: string
): Promise<boolean> {
  const message =
    typeof payload.message === 'string' ? payload.message : `[${row.event_type}] ${row.topic}`;
  const severity = (payload.severity as 'info' | 'warning' | 'critical') ?? 'info';
  const result = await sendRegistryAlert(message, severity, { slackWebhookUrl: webhookUrl });
  return result.slack;
}

export type RequeueFailedOutboxOpts = {
  /** Only requeue rows with retries below this ceiling (default: no ceiling). */
  maxRetries?: number;
  /** Max rows to flip per call (default 500). */
  limit?: number;
};

/**
 * Flip failed outbox rows back to pending so `processChannelOutbox` can retry.
 * Inspired by DLQ requeue patterns (eventferry / pg-transactional-outbox).
 */
export function requeueFailedChannelOutbox(
  db: Database,
  opts: RequeueFailedOutboxOpts = {}
): number {
  const limit = opts.limit ?? 500;
  const maxRetries = opts.maxRetries;
  if (maxRetries != null) {
    const result = db.run(
      `UPDATE ops_channel_outbox
       SET status = 'pending', last_error = NULL, available_at = NULL
       WHERE id IN (
         SELECT id FROM ops_channel_outbox
         WHERE status = 'failed' AND retries < $max
         ORDER BY created_at ASC
         LIMIT $lim
       )`,
      { $max: maxRetries, $lim: limit }
    );
    return result.changes;
  }
  const result = db.run(
    `UPDATE ops_channel_outbox
     SET status = 'pending', last_error = NULL, available_at = NULL
     WHERE id IN (
       SELECT id FROM ops_channel_outbox
       WHERE status = 'failed'
       ORDER BY created_at ASC
       LIMIT $lim
     )`,
    { $lim: limit }
  );
  return result.changes;
}

/** Drain pending outbox rows through configured projectors. */
export async function processChannelOutbox(
  db: Database,
  opts: ProcessOutboxOpts = {}
): Promise<{ sent: number; failed: number }> {
  const deliver = opts.deliver !== false;
  const token = opts.telegramToken ?? loadTelegramEnv().effectiveToken ?? '';
  const r2Store = opts.r2Store ?? localOpsChannelStore;
  const limit = Math.max(1, Math.min(opts.limit ?? 250, 2000));
  const now = new Date().toISOString();
  const pending = db
    .query(
      `SELECT id, topic, event_type, payload_json, projectors, retries, available_at
       FROM ops_channel_outbox
       WHERE status = 'pending' AND (available_at IS NULL OR available_at <= $now)
       ORDER BY created_at ASC LIMIT $limit`
    )
    .all({ $now: now, $limit: limit }) as OutboxRow[];

  let sent = 0;
  let failed = 0;
  const packageTopicsCache = new Map<string, Record<string, number> | null>();

  for (const row of pending) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    } catch {
      db.run(
        `UPDATE ops_channel_outbox SET status = 'failed', last_error = $err, retries = retries + 1 WHERE id = $id`,
        { $err: 'Invalid payload_json', $id: row.id }
      );
      failed++;
      continue;
    }

    const projectors = parseProjectors(row.projectors);
    try {
      const results: boolean[] = [];
      let telegramErr: string | undefined;
      let telegramRateLimit: { retryAfterSec: number } | undefined;
      for (const projector of projectors) {
        if (projector === 'r2') {
          if (r2Store === localOpsChannelStore) {
            results.push(await projectLocal(row, payload));
          } else {
            results.push(await projectR2(row, payload, r2Store));
          }
        } else if (deliver && projector === 'telegram') {
          if (!token) {
            // Skip optional telegram when token absent — do not poison R2-ok rows.
            results.push(true);
          } else {
            const tg = await projectTelegram(row, payload, token, {
              db,
              forumsMetaDir: opts.forumsMetaDir,
              packageTopicsCache,
            });
            results.push(tg.ok);
            if (!tg.ok && tg.error) telegramErr = tg.error;
            if (
              !tg.ok &&
              tg.errorCode === 429 &&
              row.retries < MAX_RATE_LIMIT_DEFERRALS &&
              tg.retryAfterSec != null
            ) {
              telegramRateLimit = { retryAfterSec: tg.retryAfterSec };
            }
            if (
              tg.ok &&
              tg.messageId != null &&
              typeof payload.playId === 'string' &&
              typeof payload.nodeId === 'string'
            ) {
              db.run(
                `UPDATE play_distribution SET telegram_message_id = $mid
                 WHERE play_id = $pid AND node_id = $nid`,
                { $mid: tg.messageId, $pid: payload.playId, $nid: payload.nodeId }
              );
            }
            if (tg.ok && tg.messageId != null) {
              const templateId = payload.templateId;
              const chatRef = payload.telegramId ?? payload.telegram_id;
              if (
                typeof templateId === 'string' &&
                chatRef != null &&
                !String(chatRef).startsWith('pending-')
              ) {
                rememberTemplateMessageId(
                  db,
                  String(chatRef),
                  templateId as import('../telegram/templates/types.ts').TemplateId,
                  tg.messageId
                );
              }
            }
            if (tg.ok && row.event_type === 'ops.broadcast') {
              recordBroadcastOutboxSend(db, payload, {
                ok: true,
                messageId: tg.messageId,
              });
            }
          }
        } else if (deliver && projector === 'slack') {
          const webhook = opts.slackWebhookUrl?.trim() || Bun.env.SLACK_WEBHOOK_URL?.trim();
          if (!webhook) {
            results.push(true);
          } else {
            results.push(await projectSlack(row, payload, webhook));
          }
        } else if (!deliver && projector !== 'r2') results.push(true);
      }
      const ok = results.length === 0 || results.every(Boolean);
      if (ok) {
        db.run(
          `UPDATE ops_channel_outbox SET status = 'sent', sent_at = $now, last_error = NULL, available_at = NULL WHERE id = $id`,
          { $now: new Date().toISOString(), $id: row.id }
        );
        sent++;
      } else if (telegramRateLimit) {
        const availableAt = new Date(
          Date.now() + telegramRateLimit.retryAfterSec * 1000
        ).toISOString();
        db.run(
          `UPDATE ops_channel_outbox
           SET status = 'pending', available_at = $at, retries = retries + 1, last_error = $err
           WHERE id = $id`,
          {
            $at: availableAt,
            $err: `rate_limit:429 retry_after=${telegramRateLimit.retryAfterSec}s`,
            $id: row.id,
          }
        );
      } else {
        db.run(
          `UPDATE ops_channel_outbox SET status = 'failed', retries = retries + 1, last_error = $err WHERE id = $id`,
          {
            $err: telegramErr ?? 'Projector returned false',
            $id: row.id,
          }
        );
        failed++;
      }
    } catch (e) {
      db.run(
        `UPDATE ops_channel_outbox SET status = 'failed', retries = retries + 1, last_error = $err WHERE id = $id`,
        { $err: e instanceof Error ? e.message : String(e), $id: row.id }
      );
      failed++;
    }
  }

  return { sent, failed };
}

/** Read local MemoryChannelStore events for serve-public. */
export async function readLocalChannelEvents(
  topic: string,
  since: number
): Promise<ChannelMessage[]> {
  return localOpsChannelStore.readSince(topic, since);
}

/** Helper: enqueue play telegram payload after gate+reserve. */
export function enqueuePlayTelegramEvent(
  db: Database,
  input: {
    playId: string; // brand-ok
    nodeId: TreeNodeId;
    telegramId: string; // brand-ok
    text: string;
  }
): OpsChannelEvent {
  return enqueueOpsChannelEvent(db, {
    topic: 'plays',
    eventType: 'play.dispatched',
    idempotencyKey: `play:${input.playId}:${input.nodeId as string}`,
    payload: {
      playId: input.playId,
      nodeId: input.nodeId as string,
      telegramId: input.telegramId,
      text: input.text,
      parseMode: 'Markdown',
      replyMarkup: playAckReplyMarkup(input.playId, input.nodeId as string),
    },
    projectors: ['r2', 'telegram'],
  });
}

/** Helper: settlement event for bridge consumers. */
export function enqueueSettlementChannelEvent(
  db: Database,
  input: {
    playId: string; // brand-ok
    leafNodeId: TreeNodeId;
    result: string;
    pnl: number;
    profileKey?: string;
  }
): OpsChannelEvent {
  return enqueueOpsChannelEvent(db, {
    topic: 'plays',
    eventType: 'play.settled',
    idempotencyKey: `settle:${input.playId}:${input.leafNodeId as string}`,
    payload: {
      playId: input.playId,
      leafNodeId: input.leafNodeId as string,
      result: input.result,
      pnl: input.pnl,
      profileKey: input.profileKey,
    },
    projectors: ['r2'],
  });
}

/** Helper: identity bind notification. */
export function enqueueIdentityChannelEvent(
  db: Database,
  input: {
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    lifecycleStatus: string;
  }
): OpsChannelEvent {
  return enqueueOpsChannelEvent(db, {
    topic: 'identity',
    eventType: 'partner.bound',
    idempotencyKey: `bind:${input.treeNodeId as string}`,
    payload: {
      treeNodeId: input.treeNodeId as string,
      profileKey: input.profileKey,
      partnerTemplate: input.partnerTemplate as string,
      lifecycleStatus: input.lifecycleStatus,
    },
    projectors: ['r2'],
  });
}

/** Helper: welcome DM when Telegram is linked (R2 + Telegram) — HTML template pack. */
export function enqueuePartnerWelcomeEvent(
  db: Database,
  input: {
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    lifecycleStatus: string;
    telegramId?: string; // brand-ok
    nodeName?: string;
    templateId?: TemplateId;
  }
): OpsChannelEvent | null {
  if (!input.telegramId || input.telegramId.startsWith('pending-')) return null;

  const templateId = input.templateId ?? 'partner.welcome.v1';
  const rendered = renderForNode(db, templateId, input.treeNodeId);
  const text =
    rendered?.text ??
    [
      `<b>Welcome${input.nodeName ? ` · ${input.nodeName}` : ''}</b>`,
      `Template: <code>${input.partnerTemplate as string}</code>`,
      '',
      '<i>Profile active · use Status / Balances keyboards.</i>',
    ].join('\n');
  const replyMarkup = rendered?.keyboard ? translateKeyboard(rendered.keyboard, 'en') : undefined;

  return enqueueOpsChannelEvent(db, {
    topic: 'identity',
    eventType: 'partner.welcome',
    idempotencyKey: `welcome:${input.treeNodeId as string}`,
    payload: {
      treeNodeId: input.treeNodeId as string,
      profileKey: input.profileKey,
      partnerTemplate: input.partnerTemplate as string,
      lifecycleStatus: input.lifecycleStatus,
      telegramId: input.telegramId,
      templateId,
      text,
      parseMode: 'HTML',
      replyMarkup,
    },
    projectors: ['r2', 'telegram'],
  });
}

/** Helper: onboard.complete.v1 after package bind (R2 + Telegram when linked). */
export function enqueueOnboardCompleteEvent(
  db: Database,
  input: {
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    telegramId?: string; // brand-ok
  }
): OpsChannelEvent | null {
  if (!input.telegramId || input.telegramId.startsWith('pending-')) return null;

  const rendered = renderForNode(db, 'onboard.complete.v1', input.treeNodeId);
  if (!rendered) return null;

  return enqueueOpsChannelEvent(db, {
    topic: 'identity',
    eventType: 'partner.onboard.complete',
    idempotencyKey: `onboard.complete:${input.treeNodeId as string}`,
    payload: {
      treeNodeId: input.treeNodeId as string,
      profileKey: input.profileKey,
      partnerTemplate: input.partnerTemplate as string,
      telegramId: input.telegramId,
      templateId: 'onboard.complete.v1',
      text: rendered.text,
      parseMode: 'HTML',
      replyMarkup: rendered.keyboard ? translateKeyboard(rendered.keyboard, 'en') : undefined,
    },
    projectors: ['r2', 'telegram'],
  });
}

/** Helper: play gated (policy denied or adjusted) for observability projectors. */
export function enqueuePlayGatedChannelEvent(
  db: Database,
  input: {
    playId: string; // brand-ok — plays.id
    treeNodeId: TreeNodeId;
    allowed: boolean;
    action: string;
    reason?: string;
    adjustedStake?: number;
    templateId?: PartnerTemplateId | string;
    /** TOC routing rank (1 = highest weightedScore). */
    rankedRank?: number;
    callSign?: string | null;
    weightedScore?: number;
  }
): OpsChannelEvent {
  const eventType =
    input.allowed && input.action === 'adjust'
      ? 'play.gate.adjusted'
      : input.action === 'defer'
        ? 'play.gate.defer'
        : 'play.gate.denied';
  return enqueueOpsChannelEvent(db, {
    topic: 'plays',
    eventType,
    idempotencyKey: `gate:${input.playId}:${input.treeNodeId as string}`,
    payload: {
      playId: input.playId,
      treeNodeId: input.treeNodeId as string,
      allowed: input.allowed,
      action: input.action,
      reason: input.reason,
      adjustedStake: input.adjustedStake,
      templateId: input.templateId != null ? String(input.templateId) : undefined,
      rankedRank: input.rankedRank,
      callSign: input.callSign ?? undefined,
      weightedScore: input.weightedScore,
    },
    projectors: ['r2'],
  });
}

export type EnqueueLimitRaiseAlertInput = {
  treeNodeId: TreeNodeId;
  sportsbook: string;
  sportId: string; // brand-ok — SportId wire
  marketId: string; // brand-ok — MarketId wire
  betType: string;
  previousMax: number;
  newLimit: number;
  /** Optional DM / explicit chat for the primary ops path. */
  telegramId?: string; // brand-ok — Telegram chat_id wire
  /** Partner CODE when already known (skips call_sign derivation). */
  partnerCode?: string;
  /** Explicit package-group forum chat_id (overrides registry resolution). */
  packageGroupChatId?: string; // brand-ok — Telegram chat_id wire
  /** Skip package-group forum mirror (ops-only). Default false. */
  skipPackageGroupForum?: boolean;
};

/**
 * Limit raise alert: always enqueue ops `alerts` (r2 + telegram → ops hub).
 * When the tree node maps to a linked package-group forum, also enqueue a
 * telegram mirror so capital/ops see the raise next to seat-desk traffic
 * (Liquidity/Outs preferred, else Alerts — see threadIdForPackageGroupOutboxTopic).
 */
export function enqueueLimitRaiseAlert(
  db: Database,
  input: EnqueueLimitRaiseAlertInput
): OpsChannelEvent {
  const message = [
    `🚀 <b>Limit raised</b> — ${input.sportsbook}`,
    `${input.sportId}/${input.marketId} ${input.betType}`,
    `$${input.previousMax} → <b>$${input.newLimit}</b>`,
  ].join('\n');

  const treeNodeId = input.treeNodeId as string;
  const idemBase = `limit.raise:${treeNodeId}:${input.sportsbook}:${input.sportId}:${input.marketId}:${input.betType}:${input.newLimit}`;
  const basePayload = {
    treeNodeId,
    sportsbook: input.sportsbook,
    sportId: input.sportId,
    marketId: input.marketId,
    betType: input.betType,
    previousMax: input.previousMax,
    newLimit: input.newLimit,
    parseMode: 'HTML' as const,
    text: message,
  };

  const opsEvent = enqueueOpsChannelEvent(db, {
    topic: 'alerts',
    eventType: 'account.limit_raise',
    idempotencyKey: idemBase,
    payload: {
      ...basePayload,
      telegramId: input.telegramId,
    },
    projectors: ['r2', 'telegram'],
  });

  if (!input.skipPackageGroupForum) {
    let forumChatId = input.packageGroupChatId?.trim() || null;
    let partnerCode = input.partnerCode?.trim().toUpperCase() || undefined;

    if (!forumChatId) {
      const reg = resolvePackageGroupRegistryForTreeNode(db, treeNodeId, {
        partnerCode: input.partnerCode,
      });
      if (reg) {
        forumChatId = reg.chatId;
        partnerCode = reg.partnerCode;
      }
    }

    // Mirror only when we have a distinct package-group chat (not the same as DM/ops target).
    if (forumChatId && forumChatId !== input.telegramId) {
      enqueueOpsChannelEvent(db, {
        topic: 'alerts',
        eventType: 'account.limit_raise',
        idempotencyKey: `${idemBase}:pkg`,
        payload: {
          ...basePayload,
          telegramId: forumChatId,
          partnerCode,
          packageGroupForum: true,
        },
        // r2 already carried by the ops row; telegram-only mirror to partner forum.
        projectors: ['telegram'],
      });
    }
  }

  return opsEvent;
}
