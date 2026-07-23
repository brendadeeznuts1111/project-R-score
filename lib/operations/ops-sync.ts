// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
/**
 * Ops-sync — apply portal channel events (account_assigned / telegram_linked)
 * to the operations tree, with an R2 jsonl consumer and SQLite cursor.
 */
import type { Database } from 'bun:sqlite';
import { S3Client } from 'bun';
import type { AccountService } from './account-service.ts';

const DEFAULT_TOPIC = 'ops-sync';
const EVENTS_KEY = 'channels/ops-sync/events.jsonl';

/** Shape compatible with scripts/lib/r2-bridge R2BridgeConfig. */
export type OpsSyncR2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string; // brand-ok — AWS credential key, not domain ID
  secretAccessKey: string;
  requestPayer?: boolean;
};

export type OpsSyncEvent = {
  type: string;
  tenantId: string; // brand-ok
  oidcSubject?: string;
  email?: string;
  accountId?: string; // brand-ok
  telegramUserId?: string; // brand-ok
  name?: string;
};

function coerceEvent(event: OpsSyncEvent | Record<string, unknown>): OpsSyncEvent | null {
  if (typeof event !== 'object' || event === null) return null;
  const type = event.type;
  const tenantId = event.tenantId;
  if (typeof type !== 'string' || typeof tenantId !== 'string') return null;
  return {
    type,
    tenantId,
    oidcSubject: typeof event.oidcSubject === 'string' ? event.oidcSubject : undefined,
    email: typeof event.email === 'string' ? event.email : undefined,
    accountId: typeof event.accountId === 'string' ? event.accountId : undefined,
    telegramUserId: typeof event.telegramUserId === 'string' ? event.telegramUserId : undefined,
    name: typeof event.name === 'string' ? event.name : undefined,
  };
}

/**
 * Only apply when tenantId === 'factory'.
 * - account_assigned → syncProspectFromPortal (status prospect)
 * - telegram_linked → syncProspectFromPortal with telegramId when present
 * Return false for other tenants or unhandled types.
 */
export function applyOpsSyncEvent(
  svc: AccountService,
  event: OpsSyncEvent | Record<string, unknown>
): boolean {
  const e = coerceEvent(event);
  if (!e || e.tenantId !== 'factory') return false;

  if (e.type === 'account_assigned' || e.type === 'telegram_linked') {
    if (!e.oidcSubject || !e.email) return false;
    svc.syncProspectFromPortal({
      oidcSubject: e.oidcSubject,
      email: e.email,
      name: e.name,
      telegramId: e.telegramUserId,
    });
    return true;
  }

  return false;
}

/** ops_sync_cursor: topic PRIMARY KEY, last_seq. Default topic 'ops-sync'. Empty → 0 */
export function getSyncCursor(db: Database, topic: string = DEFAULT_TOPIC): number {
  const row = db
    .query('SELECT last_seq FROM ops_sync_cursor WHERE topic = $t')
    .get({ $t: topic }) as { last_seq: number } | null;
  return row?.last_seq ?? 0;
}

export function setSyncCursor(db: Database, seq: number, topic: string = DEFAULT_TOPIC): void {
  db.run(
    `INSERT INTO ops_sync_cursor (topic, last_seq) VALUES ($t, $s)
     ON CONFLICT(topic) DO UPDATE SET last_seq = excluded.last_seq`,
    { $t: topic, $s: seq }
  );
}

/**
 * Consume channels/ops-sync/events.jsonl from R2 since the stored cursor.
 * Best-effort: R2 read failure or no events → processed=0, lastSeq=getSyncCursor.
 */
export async function processOpsSyncQueue(
  db: Database,
  svc: AccountService,
  r2: OpsSyncR2Config
): Promise<{ processed: number; lastSeq: number }> {
  const lastSeq = getSyncCursor(db, DEFAULT_TOPIC);

  try {
    const client = new S3Client({
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucket: r2.bucket,
      endpoint: r2.endpoint,
      ...(r2.requestPayer ? { requestPayer: true } : {}),
    });
    const file = client.file(EVENTS_KEY);
    if (!(await file.exists())) {
      return { processed: 0, lastSeq };
    }

    const text = await file.text();
    let processed = 0;
    let maxSeq = lastSeq;

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as { seq?: number; payload?: unknown };
        if (typeof msg.seq !== 'number' || msg.seq <= lastSeq) continue;

        const payload = msg.payload;
        if (payload !== null && typeof payload === 'object') {
          if (applyOpsSyncEvent(svc, payload as Record<string, unknown>)) {
            processed += 1;
          }
        }

        if (msg.seq > maxSeq) maxSeq = msg.seq;
      } catch {
        /* skip corrupt line */
      }
    }

    if (maxSeq > lastSeq) {
      setSyncCursor(db, maxSeq, DEFAULT_TOPIC);
    }

    return { processed, lastSeq: maxSeq };
  } catch {
    return { processed: 0, lastSeq };
  }
}
