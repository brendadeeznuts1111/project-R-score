// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/hashing — Bun.hash
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

/** OCR includes partner CODE so /portal/dod/ can deep-link Accounting confirm. */
const DEMO_ROWS = [
  {
    type: 'balance',
    status: 'flagged',
    tamper: 78,
    ocr: 'ASH · Balance $12,450.00 FanDuel',
  },
  {
    type: 'slip',
    status: 'flagged',
    tamper: 62,
    ocr: 'BIL-001 · NBA LAL -4.5 $250 · DraftKings',
  },
  {
    type: 'receipt',
    status: 'pending',
    tamper: 18,
    ocr: 'NOV · Deposit confirmation $500',
  },
  {
    type: 'balance',
    status: 'verified',
    tamper: 12,
    ocr: 'SPEN · Balance $8,200.00 BetMGM',
  },
  {
    type: 'id',
    status: 'rejected',
    tamper: 91,
    ocr: 'ID document — blurry',
    reason: 'Image unreadable; resubmit clear photo',
  },
  {
    type: 'location',
    status: 'pending',
    tamper: 25,
    ocr: null as string | null,
    lat: 25.7617,
    lng: -80.1918,
  },
] as const;

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

  // Constructor creates dod_submissions if missing.
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
        submitted_at, processed_at, reviewed_at, reviewed_by, rejection_reason
      ) VALUES (
        $id, $aid, $type, $st, $vh, $mh, $sig,
        $ts, $ocr, $lat, $lng, $dev, $s3,
        $sub, $proc, $rev, $by, $reason
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
        $lat: 'lat' in row ? row.lat : null,
        $lng: 'lng' in row ? row.lng : null,
        $dev: 'iPhone 15 Pro',
        $s3: `demo/${id}.webp`,
        $sub: submittedAt,
        $proc: submittedAt,
        $rev: reviewed,
        $by: reviewed ? 'demo-seed' : null,
        $reason: 'reason' in row ? row.reason : null,
      });

      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      inserted++;
    }

    return { seeded: true, inserted, byStatus };
  } finally {
    db.close();
  }
}
