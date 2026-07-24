// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Unified ops channel outbox — one envelope, many projectors (R2 · Telegram · Slack).
 *
 * Local dev reads via MemoryChannelStore; Pages uses R2ChannelStore projector.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { sendRegistryAlert } from '../factory/alerts.ts';
import { MemoryChannelStore, type ChannelMessage } from './channels.ts';
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

async function projectR2(row: OutboxRow, payload: Record<string, unknown>): Promise<boolean> {
  await localOpsChannelStore.publish(row.topic, payload, { sender: 'ops-outbox' });
  return true;
}

async function projectTelegram(
  row: OutboxRow,
  payload: Record<string, unknown>,
  token: string
): Promise<boolean> {
  const telegramId = payload.telegramId ?? payload.telegram_id;
  const text = typeof payload.text === 'string' ? payload.text : JSON.stringify(payload);
  if (!telegramId || !token) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: String(telegramId),
      text,
      parse_mode: payload.parseMode === 'Markdown' ? 'Markdown' : undefined,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
  return res.ok && body.ok !== false;
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
        if (projector === 'r2') results.push(await projectR2(row, payload));
        else if (deliver && projector === 'telegram')
          results.push(await projectTelegram(row, payload, token));
        else if (deliver && projector === 'slack')
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
