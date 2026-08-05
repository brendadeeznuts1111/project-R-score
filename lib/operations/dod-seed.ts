// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/hashing — Bun.hash
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata (demo strip)
/**
 * Demo seed for DOD review queue — populates dod_submissions so
 * `ops:snapshot` → `/registry/dod-queue.json` + portal /portal/dod/ look live.
 *
 * Uses direct SQL (not DODVerifier.process) so seeding stays offline-fast and
 * does not hang on Telegram notify / image watermark paths.
 *
 * @see tools/ops-seed-dod.ts
 * @see lib/dod/export-queue-snapshot.ts
 */
import { randomUUIDv7 } from 'bun';
import { Database } from 'bun:sqlite';
import { DEFAULT_OPS_DB_PATH } from './db.ts';
import {
  extractAccountingAmount,
  parseBunImageMetaStrip,
  type DodImageMetaStrip,
} from '../dod/enrich-entry.ts';
import { DODVerifier } from '../dod/verifier.ts';

export type SeedDodDemoOpts = {
  dbPath?: string;
  force?: boolean;
  /** Only seed when dod_submissions is empty (default true). */
  ifEmpty?: boolean;
};

export type SeedDodDemoResult = {
  seeded: boolean;
  reason?: string;
  inserted?: number;
  byStatus?: Record<string, number>;
};

type DemoRow = {
  type: string;
  status: string;
  tamper: number;
  ocr: string | null;
  reason?: string;
  lat?: number;
  lng?: number;
  /** Bot API chat id for package forum (demo). */
  tgChat?: string;
  tgMsg?: number;
  tgThread?: number;
  tgTopic?: string;
  imageMeta?: DodImageMetaStrip;
};

/** OCR includes partner CODE so /portal/dod/ can deep-link Accounting confirm. */
const DEMO_ROWS: DemoRow[] = [
  {
    type: 'balance',
    status: 'flagged',
    tamper: 78,
    ocr: 'ASH · Balance $12,450.00 FanDuel',
    tgChat: '-1002147483001',
    tgMsg: 1842,
    tgThread: 42,
    tgTopic: 'accounting',
    imageMeta: parseBunImageMetaStrip({
      width: 1170,
      height: 2532,
      format: 'jpeg',
      size: 482_110,
      exif: { Software: 'Screenshot', Device: { Model: 'iPhone 15 Pro' } },
    })!,
  },
  {
    type: 'slip',
    status: 'flagged',
    tamper: 62,
    ocr: 'BIL-001 · NBA LAL -4.5 $250 · DraftKings',
    tgChat: '-1002147483002',
    tgMsg: 991,
    tgThread: 42,
    tgTopic: 'accounting',
    imageMeta: parseBunImageMetaStrip({
      width: 1080,
      height: 1920,
      format: 'png',
      size: 310_440,
      exif: { Device: { Model: 'iPhone 15 Pro' } },
    })!,
  },
  {
    type: 'receipt',
    status: 'pending',
    tamper: 18,
    ocr: 'NOV · Deposit confirmation $500',
    tgChat: '-1002147483003',
    tgMsg: 2201,
    tgThread: 42,
    tgTopic: 'accounting',
    imageMeta: parseBunImageMetaStrip({
      width: 1179,
      height: 2556,
      format: 'webp',
      size: 198_220,
      exif: { Software: 'Telegram', Device: { Model: 'iPhone 15 Pro' } },
    })!,
  },
  {
    type: 'balance',
    status: 'verified',
    tamper: 12,
    ocr: 'SPEN · Balance $8,200.00 BetMGM',
    tgChat: '-1002147483004',
    tgMsg: 440,
    tgThread: 42,
    tgTopic: 'accounting',
    imageMeta: parseBunImageMetaStrip({
      width: 1170,
      height: 2532,
      format: 'jpeg',
      size: 401_880,
      exif: { Device: { Model: 'iPhone 15 Pro' }, DateTimeOriginal: '2026:07:24 03:30:00' },
    })!,
  },
  {
    type: 'id',
    status: 'rejected',
    tamper: 91,
    ocr: 'ID document — blurry',
    reason: 'Image unreadable; resubmit clear photo',
    imageMeta: parseBunImageMetaStrip({
      width: 800,
      height: 600,
      format: 'jpeg',
      size: 88_120,
    })!,
  },
  {
    type: 'location',
    status: 'pending',
    tamper: 25,
    ocr: null,
    lat: 25.7617,
    lng: -80.1918,
    imageMeta: parseBunImageMetaStrip({
      width: 1024,
      height: 768,
      format: 'png',
      size: 156_000,
      gps: { lat: 25.7617, lng: -80.1918 },
      exif: { Device: { Model: 'iPhone 15 Pro' } },
    })!,
  },
];

export function isDodQueueEmpty(dbPath = DEFAULT_OPS_DB_PATH): boolean {
  try {
    using verifier = new DODVerifier(dbPath);
    return verifier.list('all').length === 0;
  } catch {
    return true;
  }
}

function demoHash(label: string): string {
  return Bun.hash(label).toString(16).padStart(16, '0');
}

/** Ensure table exists, then insert demo rows. */
export async function seedDodDemo(opts: SeedDodDemoOpts = {}): Promise<SeedDodDemoResult> {
  const dbPath = opts.dbPath ?? DEFAULT_OPS_DB_PATH;
  const ifEmpty = opts.ifEmpty ?? true;

  // Constructor creates dod_submissions + migrations.
  {
    using _boot = new DODVerifier(dbPath);
    if (!opts.force && ifEmpty && _boot.list('all').length > 0) {
      return {
        seeded: false,
        reason: 'dod_submissions already present (use --force to add anyway)',
        inserted: 0,
      };
    }
  }

  const db = new Database(dbPath);
  try {
    const insert = db.prepare(`
      INSERT INTO dod_submissions (
        id, agent_id, type, status, visual_hash, metadata_hash, signature,
        tamper_score, extracted_text, geo_lat, geo_lng, device_model, s3_path,
        submitted_at, processed_at, reviewed_at, reviewed_by, rejection_reason,
        telegram_chat_id, telegram_message_id, telegram_thread_id, telegram_topic,
        image_meta_json, accounting_amount
      ) VALUES (
        $id, $aid, $type, $st, $vh, $mh, $sig,
        $ts, $ocr, $lat, $lng, $dev, $s3,
        $sub, $proc, $rev, $by, $reason,
        $tgChat, $tgMsg, $tgThread, $tgTopic,
        $imgMeta, $amt
      )
    `);

    const byStatus: Record<string, number> = {};
    let inserted = 0;
    const now = Date.now();

    for (let i = 0; i < DEMO_ROWS.length; i++) {
      const row = DEMO_ROWS[i]!;
      const id = randomUUIDv7();
      const agentId = randomUUIDv7();
      const submittedAt = new Date(now - i * 3_600_000).toISOString();
      const reviewed =
        row.status === 'verified' || row.status === 'rejected'
          ? new Date(now - i * 3_600_000 + 600_000).toISOString()
          : null;
      const amt = extractAccountingAmount(row.ocr ?? undefined) ?? null;

      insert.run({
        $id: id,
        $aid: agentId,
        $type: row.type,
        $st: row.status,
        $vh: demoHash(`vh:${id}`),
        $mh: demoHash(`mh:${id}`),
        $sig: demoHash(`sig:${id}${agentId}`),
        $ts: row.tamper,
        $ocr: row.ocr,
        $lat: row.lat ?? null,
        $lng: row.lng ?? null,
        $dev: 'iPhone 15 Pro',
        $s3: `demo/${id}.webp`,
        $sub: submittedAt,
        $proc: submittedAt,
        $rev: reviewed,
        $by: reviewed ? 'demo-seed' : null,
        $reason: row.reason ?? null,
        $tgChat: row.tgChat ?? null,
        $tgMsg: row.tgMsg ?? null,
        $tgThread: row.tgThread ?? null,
        $tgTopic: row.tgTopic ?? null,
        $imgMeta: row.imageMeta ? JSON.stringify(row.imageMeta) : null,
        $amt: amt,
      });

      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      inserted++;
    }

    return { seeded: true, inserted, byStatus };
  } finally {
    db.close();
  }
}
