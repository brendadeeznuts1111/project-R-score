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

/** Inline keyboard for play ack callbacks (placed / skip). */
export function playAckReplyMarkup(
  playId: string, // brand-ok — opaque plays.id wire
  nodeId: string // brand-ok — opaque tree_nodes.id wire
) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Placed', callback_data: `play:${playId}:${nodeId}:placed` },
        { text: '⏭ Skip', callback_data: `play:${playId}:${nodeId}:skip` },
      ],
    ],
  };
}

/** Process-local feed for serve-public /api/channels/events (not release-channel meta). */
export const localOpsChannelStore = new MemoryChannelStore();

export type EnqueueOpsChannelOpts = {
  topic: OpsChannelTopic;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  projectors?: OpsChannelProjector[];
};

export type ProcessOutboxOpts = {
  telegramToken?: string;
  slackWebhookUrl?: string;
  /** When false, skip network projectors (tests). Default true. */
  deliver?: boolean;
  /** Durable R2 projector; when omitted, `r2` rows use {@link localOpsChannelStore}. */
  r2Store?: R2ChannelStore | MemoryChannelStore;
};

function defaultProjectors(topic: OpsChannelTopic): OpsChannelProjector[] {
  if (topic === 'alerts') return ['r2', 'slack', 'telegram'];
  if (topic === 'identity') return ['r2'];
  return ['r2', 'telegram'];
}

/** Insert pending row into ops_channel_outbox. */
export function enqueueOpsChannelEvent(db: Database, opts: EnqueueOpsChannelOpts): OpsChannelEvent {
  const id = asOpsChannelEventId(randomUUIDv7());
  const createdAt = new Date().toISOString();
  const projectors = opts.projectors ?? defaultProjectors(opts.topic);
  const payloadJson = JSON.stringify(opts.payload);

  db.run(
    `INSERT OR IGNORE INTO ops_channel_outbox
     (id, topic, event_type, idempotency_key, payload_json, projectors, status, retries, created_at)
     VALUES ($id, $topic, $etype, $ikey, $payload, $proj, 'pending', 0, $created)`,
    {
      $id: id as string,
      $topic: opts.topic,
      $etype: opts.eventType,
      $ikey: opts.idempotencyKey,
      $payload: payloadJson,
      $proj: projectors.join(','),
      $created: createdAt,
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
};

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
  token: string
): Promise<{ ok: boolean; messageId?: number }> {
  const telegramId = payload.telegramId ?? payload.telegram_id;
  const text = typeof payload.text === 'string' ? payload.text : JSON.stringify(payload);
  if (!telegramId || !token) return { ok: false };

  const body: Record<string, unknown> = {
    chat_id: String(telegramId),
    text,
    parse_mode: payload.parseMode === 'Markdown' ? 'Markdown' : undefined,
  };
  if (payload.replyMarkup && typeof payload.replyMarkup === 'object') {
    body.reply_markup = payload.replyMarkup;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { message_id?: number };
  };
  return {
    ok: res.ok && json.ok !== false,
    messageId: json.result?.message_id,
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

/** Drain pending outbox rows through configured projectors. */
export async function processChannelOutbox(
  db: Database,
  opts: ProcessOutboxOpts = {}
): Promise<{ sent: number; failed: number }> {
  const deliver = opts.deliver !== false;
  const token = opts.telegramToken ?? Bun.env.TELEGRAM_BOT_TOKEN ?? '';
  const r2Store = opts.r2Store ?? localOpsChannelStore;
  const pending = db
    .query(
      `SELECT id, topic, event_type, payload_json, projectors, retries
       FROM ops_channel_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`
    )
    .all() as OutboxRow[];

  let sent = 0;
  let failed = 0;

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
      for (const projector of projectors) {
        if (projector === 'r2') {
          if (r2Store === localOpsChannelStore) {
            results.push(await projectLocal(row, payload));
          } else {
            results.push(await projectR2(row, payload, r2Store));
          }
        } else if (deliver && projector === 'telegram') {
          const tg = await projectTelegram(row, payload, token);
          results.push(tg.ok);
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
        } else if (deliver && projector === 'slack')
          results.push(await projectSlack(row, payload, opts.slackWebhookUrl));
        else if (!deliver && projector !== 'r2') results.push(true);
      }
      const ok = results.length === 0 || results.every(Boolean);
      if (ok) {
        db.run(
          `UPDATE ops_channel_outbox SET status = 'sent', sent_at = $now, last_error = NULL WHERE id = $id`,
          { $now: new Date().toISOString(), $id: row.id }
        );
        sent++;
      } else {
        db.run(
          `UPDATE ops_channel_outbox SET status = 'failed', retries = retries + 1, last_error = $err WHERE id = $id`,
          { $err: 'Projector returned false', $id: row.id }
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

/** Helper: welcome DM when Telegram is linked (R2 + Telegram). */
export function enqueuePartnerWelcomeEvent(
  db: Database,
  input: {
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    lifecycleStatus: string;
    telegramId?: string; // brand-ok
    nodeName?: string;
  }
): OpsChannelEvent | null {
  if (!input.telegramId || input.telegramId.startsWith('pending-')) return null;

  const text = [
    `👋 Welcome${input.nodeName ? `, ${input.nodeName}` : ''}!`,
    '',
    'Your partner profile is active.',
    `Template: *${input.partnerTemplate as string}*`,
    '',
    '/status — accounts & P&L',
    '/plays — pending plays with ack buttons',
  ].join('\n');

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
      text,
      parseMode: 'Markdown',
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
  }
): OpsChannelEvent {
  return enqueueOpsChannelEvent(db, {
    topic: 'plays',
    eventType: input.allowed ? 'play.gate.adjusted' : 'play.gate.denied',
    idempotencyKey: `gate:${input.playId}:${input.treeNodeId as string}`,
    payload: {
      playId: input.playId,
      treeNodeId: input.treeNodeId as string,
      allowed: input.allowed,
      action: input.action,
      reason: input.reason,
      adjustedStake: input.adjustedStake,
      templateId: input.templateId != null ? String(input.templateId) : undefined,
    },
    projectors: ['r2'],
  });
}
