// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.sh/docs/runtime/image — Bun.Image
// @see https://bun.sh/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
/**
 * DOD Verifier — agent-submitted visual proof pipeline.
 *
 * Flow: Telegram photo → Bun.Image → perceptual hash → watermark →
 *       resize/compress → S3 store → sign → tamper-detect → notify.
 */

import { Database } from 'bun:sqlite';
import { averageHash, hammingDistance } from './evidence.ts';

/** Magic-byte sniffing: PNG, JPEG, WebP (RIFF), GIF. */
export function validateImage(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) return false;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true; // RIFF....WEBP
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true; // GIF8
  return false;
}

// ── AES-GCM at-rest encryption (PII: type 'id') ─────────────────
async function aesKey(keyMaterial: string): Promise<CryptoKey> {
  const digest = new Bun.CryptoHasher('sha256').update(keyMaterial).digest();
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypt bytes; output = 12-byte IV ‖ ciphertext. */
export async function encryptAesGcm(data: Uint8Array, keyMaterial: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(keyMaterial), data);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return out;
}

/** Decrypt output of {@link encryptAesGcm}. */
export async function decryptAesGcm(data: Uint8Array, keyMaterial: string): Promise<Uint8Array> {
  const iv = data.subarray(0, 12);
  const ct = data.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await aesKey(keyMaterial), ct);
  return new Uint8Array(pt);
}

// ── Evidence stores ──────────────────────────────────────────────
/** Verification-model version stamped into registry snapshots (bump on detector changes). */
export const DOD_MODEL_VERSION = 'dod-verifier/2.1.0';

export type DODEvidenceStore = {
  put(key: string, bytes: Uint8Array): Promise<void>;
  /** Optional read-back for rebuild-index. */
  get?(key: string): Promise<Uint8Array | null>;
  /** Optional listing for rebuild-index. */
  list?(prefix: string): Promise<string[]>;
};

/** Local filesystem store (default; also the test store). */
export function localEvidenceStore(root: string): DODEvidenceStore {
  return {
    async put(key, bytes) {
      await Bun.write(`${root}/${key}`, bytes);
    },
    async get(key) {
      const f = Bun.file(`${root}/${key}`);
      return (await f.exists()) ? f.bytes() : null;
    },
    async list(prefix) {
      const keys: string[] = [];
      for await (const f of new Bun.Glob(`${prefix}**/*`).scan(root)) {
        keys.push(f);
      }
      return keys;
    },
  };
}

/**
 * R2/S3 store when env is present (DOD_R2_BUCKET + CLOUDFLARE_ACCOUNT_ID +
 * R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY); returns null otherwise.
 */
export function r2EvidenceStoreFromEnv(): DODEvidenceStore | null {
  const bucket = Bun.env.DOD_R2_BUCKET;
  const accountId = Bun.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY;
  if (!bucket || !accountId || !accessKeyId || !secretAccessKey) return null;
  const client = new Bun.S3Client({
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
  });
  return {
    async put(key, bytes) {
      await client.write(key, bytes);
    },
    async get(key) {
      const f = client.file(key);
      return (await f.exists()) ? new Uint8Array(await f.bytes()) : null;
    },
    async list(prefix) {
      const res = await client.list({ prefix });
      return (res.contents ?? []).map(o => o.key).filter((k): k is string => !!k);
    },
  };
}

/** First plausible dollar amount in OCR text, e.g. "$12,345.67" → 12345.67. */
export function extractAmount(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const m = text.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return undefined;
  const n = Number(m[1]!.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

export interface DODSubmission {
  id: string; // brand-ok — UUIDv7
  agentId: string; // brand-ok
  type: 'balance' | 'slip' | 'receipt' | 'id' | 'location' | 'device';
  rawImage: Uint8Array;
  submittedAt: string;
  telegramMessageId?: number;
}

export interface DODVerification {
  dodId: string;
  status: 'pending' | 'verified' | 'rejected' | 'flagged';
  visualHash: string;
  metadataHash: string;
  signature: string;
  tamperScore: number;
  extractedText?: string;
  geoLocation?: { lat: number; lng: number };
  deviceModel?: string;
  s3Path: string;
  processedAt: string;
}

export class DODVerifier {
  private proofSecret: string;
  private db: Database;
  private evidenceRoot: string;
  private registryPath: string;
  private store: DODEvidenceStore;
  private idEncryptionKey?: string;
  private onVerifiedBalance?: (agentId: string, amount?: number) => Promise<void>;

  constructor(
    dbPath = 'data/operations.db',
    opts: {
      evidenceRoot?: string;
      registryPath?: string;
      store?: DODEvidenceStore;
      idEncryptionKey?: string;
      onVerifiedBalance?: (agentId: string, amount?: number) => Promise<void>;
    } = {}
  ) {
    this.proofSecret = Bun.env.DOD_PROOF_SECRET || 'dod-dev-secret';
    this.evidenceRoot = opts.evidenceRoot ?? 'public/evidence';
    this.registryPath = opts.registryPath ?? 'public/registry/dod-registry.json';
    this.store = opts.store ?? r2EvidenceStoreFromEnv() ?? localEvidenceStore(this.evidenceRoot);
    this.idEncryptionKey = opts.idEncryptionKey ?? Bun.env.DOD_ID_ENCRYPTION_KEY;
    this.onVerifiedBalance = opts.onVerifiedBalance;
    this.db = new Database(dbPath);
    this.db.run('PRAGMA journal_mode=WAL');
    this.initTable();
  }

  private initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS dod_submissions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        visual_hash TEXT,
        metadata_hash TEXT,
        signature TEXT,
        tamper_score INTEGER DEFAULT 0,
        extracted_text TEXT,
        geo_lat REAL,
        geo_lng REAL,
        device_model TEXT,
        s3_path TEXT,
        submitted_at TEXT NOT NULL,
        processed_at TEXT,
        reviewed_at TEXT,
        reviewed_by TEXT,
        rejection_reason TEXT
      )
    `);
    // Migration: encrypted-at-rest flag (Batch 2).
    const cols = this.db.query('PRAGMA table_info(dod_submissions)').all() as { name: string }[];
    if (!cols.some(c => c.name === 'encrypted')) {
      this.db.run('ALTER TABLE dod_submissions ADD COLUMN encrypted INTEGER DEFAULT 0');
    }
  }

  async process(submission: DODSubmission): Promise<DODVerification> {
    const t0 = Bun.nanoseconds();

    // 0a. Validate image magic bytes before decoding.
    if (!validateImage(submission.rawImage)) {
      throw new Error('Invalid image format (magic bytes: expected PNG/JPEG/WebP/GIF)');
    }

    // 0b. Per-agent rate limit (default 10/hour, DOD_RATE_LIMIT_PER_HOUR override).
    this.checkRateLimit(submission.agentId);

    // 1. Load image
    const img = new Bun.Image(submission.rawImage);

    // 2. Extract metadata
    const metadata = await img.metadata();

    // 3. Perceptual hash (pixel-based aHash — shared implementation with evidence.ts)
    const visualHash = await averageHash(submission.rawImage);

    // 4. Apply operations watermark
    const watermarked = await this.applyWatermark(img, submission);

    // 5. Resize and compress for storage
    const stored = await watermarked
      .resize(1024, 1024, { fit: 'inside' })
      .webp({ quality: 85 })
      .bytes();

    // 5. Randomized storage path (no agentId in URL; deterministic per id+secret)
    const prefix = Bun.hash
      .crc32(submission.id + this.proofSecret)
      .toString(36)
      .slice(0, 8);

    // 5b. PII: encrypt 'id' documents at rest (AES-GCM, key from DOD_ID_ENCRYPTION_KEY)
    let storeBytes: Uint8Array = stored;
    let encrypted = false;
    if (submission.type === 'id' && this.idEncryptionKey) {
      storeBytes = await encryptAesGcm(stored, this.idEncryptionKey);
      encrypted = true;
    }
    const s3Path = `dod/${prefix}/${submission.id}.webp${encrypted ? '.enc' : ''}`;
    await this.store.put(s3Path, storeBytes);

    // 6. Metadata hash
    const metaHash = this.hashMetadata(metadata, submission);

    // 7. Sign
    const signature = this.sign(submission.id, visualHash, metaHash);

    // 8. Tamper detection
    const tamperScore = this.detectTampering(metadata, submission);

    // 8b. OCR for document types (degrades to '' on CDN/WebView failure).
    // Balance proofs only pay the OCR cost when a liquidity hook needs the amount.
    const extractedText =
      submission.type === 'slip' ||
      submission.type === 'receipt' ||
      (submission.type === 'balance' && this.onVerifiedBalance != null)
        ? await this.extractText(img)
        : undefined;

    // 8c. Auto-approve low-risk submissions (manual review only for the rest)
    const autoApproved = this.autoApprove(submission, tamperScore, extractedText);

    const verification: DODVerification = {
      dodId: submission.id,
      status: autoApproved ? 'verified' : tamperScore > 70 ? 'flagged' : 'pending',
      visualHash,
      metadataHash: metaHash,
      signature,
      tamperScore,
      extractedText,
      geoLocation: metadata.gps,
      deviceModel: metadata.exif?.Device?.Model,
      s3Path,
      processedAt: new Date().toISOString(),
    };

    // 9. Persist
    this.db.run(
      `
      INSERT INTO dod_submissions (id, agent_id, type, status, visual_hash, metadata_hash, signature, tamper_score,
        extracted_text, geo_lat, geo_lng, device_model, s3_path, submitted_at, processed_at, encrypted)
      VALUES ($id, $aid, $type, $status, $vh, $mh, $sig, $ts, $text, $lat, $lng, $dev, $s3, $sub, $proc, $enc)
    `,
      {
        $id: submission.id,
        $aid: submission.agentId,
        $type: submission.type,
        $status: verification.status,
        $vh: visualHash,
        $mh: metaHash,
        $sig: signature,
        $ts: tamperScore,
        $text: extractedText ?? null,
        $lat: verification.geoLocation?.lat ?? null,
        $lng: verification.geoLocation?.lng ?? null,
        $dev: verification.deviceModel ?? null,
        $s3: s3Path,
        $sub: submission.submittedAt,
        $proc: verification.processedAt,
        $enc: encrypted ? 1 : 0,
      }
    );

    // 9b. Sidecar record — the store is the source of truth; SQLite is a
    // rebuildable index (see rebuildIndex()).
    await this.store.put(
      `dod-records/${submission.id}.json`,
      new TextEncoder().encode(
        JSON.stringify({
          submission: { ...submission, rawImage: undefined },
          verification,
          encrypted,
        })
      )
    );

    // 10. Liquidity cross-reference — verified balance proofs update positions
    if (
      verification.status === 'verified' &&
      submission.type === 'balance' &&
      this.onVerifiedBalance
    ) {
      await this.onVerifiedBalance(submission.agentId, extractAmount(extractedText));
    }

    // 11. Notify ops if flagged
    if (verification.status === 'flagged') {
      await this.notifyOps(submission, verification);
    }

    // Record in snapshot registry
    await this.recordSnapshot(submission, verification, Bun.nanoseconds() - t0);

    return verification;
  }

  // ── Rate Limit ─────────────────────────────────────────────────
  private checkRateLimit(agentId: string): void {
    // brand-ok — external agent key, not domain AgentId
    const maxPerHour = Number(Bun.env.DOD_RATE_LIMIT_PER_HOUR ?? 10);
    const row = this.db
      .query(
        "SELECT COUNT(*) as c FROM dod_submissions WHERE agent_id = $id AND submitted_at > datetime('now', '-1 hour')"
      )
      .get({ $id: agentId }) as { c: number };
    if (row.c >= maxPerHour) {
      throw new Error(`Rate limited: ${row.c}/${maxPerHour} DODs in the last hour — retry later`);
    }
  }

  // ── Auto-Approve Rules ─────────────────────────────────────────
  private autoApprove(sub: DODSubmission, tamperScore: number, extractedText?: string): boolean {
    // 20 is the no-EXIF floor (screenshots legitimately lack EXIF); anything
    // above it implies an additional tamper signal.
    if (tamperScore > 20) return false;
    if (sub.type === 'balance') {
      const row = this.db
        .query(
          "SELECT COUNT(*) as c FROM dod_submissions WHERE agent_id = $a AND status = 'verified'"
        )
        .get({ $a: sub.agentId }) as { c: number };
      return row.c >= 10;
    }
    if ((sub.type === 'receipt' || sub.type === 'slip') && extractAmount(extractedText) != null) {
      return true;
    }
    return false;
  }

  // ── Watermark via WebView ──────────────────────────────────────
  private async applyWatermark(img: Bun.Image, sub: DODSubmission): Promise<Bun.Image> {
    try {
      const text = `OPS-${sub.agentId.slice(0, 8)}-${sub.id.slice(0, 8)}`;
      const meta = await img.metadata();
      const wv = new Bun.WebView({
        width: meta.width || 400,
        height: (meta.height || 300) + 24,
        html: `<style>body{margin:0;background:#000}img{width:100%;object-fit:contain}.wm{position:absolute;bottom:4px;right:8px;background:rgba(0,0,0,0.7);color:#fff;font:11px monospace;padding:2px 6px;border-radius:3px}</style><img src="data:image/webp;base64,${Buffer.from(await img.webp({ quality: 90 }).bytes()).toString('base64')}"/><div class="wm">${text}</div>`,
        headless: true,
      });
      await Bun.sleep(200);
      const ss = await wv.screenshot({ format: 'png' });
      wv.close();
      return new Bun.Image(ss);
    } catch {
      return img; // fallback: return unwatermarked
    }
  }

  // ── OCR via WebView + Tesseract ──────────────────────────────
  private async extractText(img: Bun.Image): Promise<string> {
    try {
      const encoded = Buffer.from(await img.webp({ quality: 80 }).bytes()).toString('base64');
      const wv = new Bun.WebView({
        width: 800,
        height: 600,
        html: `<script src="https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js"></script><img id="t"/><script>document.getElementById('t').src='data:image/webp;base64,${encoded}';Tesseract.recognize(document.getElementById('t')).then(r=>window.r=r.data.text);</script>`,
        headless: true,
      });
      await Bun.sleep(3000);
      const text = await wv.evaluate('window.r || ""');
      wv.close();
      return String(text);
    } catch {
      return '';
    }
  }

  // ── Metadata Hash ────────────────────────────────────────────────
  private hashMetadata(metadata: any, sub: DODSubmission): string {
    const h = new Bun.CryptoHasher('sha256');
    h.update(
      JSON.stringify({
        w: metadata.width,
        h: metadata.height,
        fmt: metadata.format,
        created: metadata.exif?.DateTimeOriginal,
        gps: metadata.gps,
        agentId: sub.agentId,
        type: sub.type,
        at: sub.submittedAt,
      })
    );
    return h.digest('hex');
  }

  // ── Signature ────────────────────────────────────────────────────
  private sign(dodId: string, visualHash: string, metaHash: string): string {
    const h = new Bun.CryptoHasher('sha256', this.proofSecret);
    h.update(`${dodId}:${visualHash}:${metaHash}`);
    return h.digest('hex');
  }

  // ── Tamper Detection ─────────────────────────────────────────────
  private detectTampering(metadata: any, sub: DODSubmission): number {
    let score = 0;
    if (!metadata.exif?.DateTimeOriginal) score += 20;
    if (metadata.exif?.Software?.match(/photoshop|gimp|paint/i)) score += 30;
    if (sub.type === 'location' && !metadata.gps) score += 25;
    if (metadata.exif?.DateTimeOriginal) {
      const created = new Date(metadata.exif.DateTimeOriginal);
      const submitted = new Date(sub.submittedAt);
      const hoursDiff = (submitted.getTime() - created.getTime()) / 3600000;
      if (hoursDiff > 24) score += 15;
      if (hoursDiff < 0) score += 40;
    }
    if ((metadata.width || 0) % 2 !== 0 || (metadata.height || 0) % 2 !== 0) score += 5;
    return Math.min(score, 100);
  }

  // ── Snapshot Registry ────────────────────────────────────────────
  private async recordSnapshot(sub: DODSubmission, ver: DODVerification, processingNs: bigint) {
    const path = this.registryPath;
    const reg = await Bun.file(path)
      .json()
      .catch(() => ({ entries: [] }));
    reg.entries = (reg.entries || []).slice(-999);
    reg.entries.push({
      id: sub.id,
      agentId: sub.agentId,
      type: sub.type,
      status: ver.status,
      tamperScore: ver.tamperScore,
      submittedAt: sub.submittedAt,
      processedAt: ver.processedAt,
      processingMs: Number(processingNs) / 1e6,
      // HMAC signature (id:visualHash:metaHash) — tamper evidence, validated
      // by the dod-registry contract for new entries.
      signature: ver.signature,
      modelVersion: DOD_MODEL_VERSION,
    });
    await Bun.write(path, JSON.stringify(reg, null, 2));
  }

  // ── Notify Ops ───────────────────────────────────────────────────
  private async notifyOps(sub: DODSubmission, ver: DODVerification) {
    const token = Bun.env.TELEGRAM_BOT_TOKEN;
    const chatId = Bun.env.TELEGRAM_OPS_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: [
          '🚩 *FLAGGED DOD*',
          `Agent: \`${sub.agentId.slice(0, 8)}\``,
          `Type: ${sub.type}`,
          `Tamper: ${ver.tamperScore}/100`,
          `ID: \`${sub.id.slice(0, 8)}\``,
          `Review: /portal/dod/${sub.id}`,
        ].join('\n'),
        parse_mode: 'Markdown',
      }),
    });
  }

  // ── Review Actions ───────────────────────────────────────────────
  approve(dodId: string, reviewedBy = 'operations') {
    this.db.run(
      "UPDATE dod_submissions SET status='verified', reviewed_at=datetime('now'), reviewed_by=$by WHERE id=$id",
      { $id: dodId, $by: reviewedBy }
    );
  }

  reject(dodId: string, reason: string, reviewedBy = 'operations') {
    this.db.run(
      "UPDATE dod_submissions SET status='rejected', reviewed_at=datetime('now'), reviewed_by=$by, rejection_reason=$r WHERE id=$id",
      { $id: dodId, $by: reviewedBy, $r: reason }
    );
  }

  list(status?: string) {
    const sql =
      status && status !== 'all'
        ? 'SELECT * FROM dod_submissions WHERE status=$s ORDER BY submitted_at DESC LIMIT 50'
        : 'SELECT * FROM dod_submissions ORDER BY submitted_at DESC LIMIT 50';
    return this.db.query(sql).all(status ? { $s: status } : {});
  }

  /** Find submissions with similar perceptual hashes (Hamming distance). */
  findSimilar(hash: string, maxDistance = 5): { id: string; agent_id: string; distance: number }[] {
    const all = this.db
      .query('SELECT id, agent_id, visual_hash FROM dod_submissions WHERE visual_hash IS NOT NULL')
      .all() as { id: string; agent_id: string; visual_hash: string }[]; // brand-ok x2 — opaque DB row, not domain types

    return all
      .map(row => ({
        id: row.id,
        agent_id: row.agent_id,
        distance: hammingDistance(hash, row.visual_hash),
      }))
      .filter(r => r.distance > 0 && r.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  }

  /** Clean up old pending DODs older than N days. */
  cleanupPending(maxAgeDays = 7): number {
    const result = this.db.run(
      "DELETE FROM dod_submissions WHERE status='pending' AND submitted_at < datetime('now', ? || ' days')",
      [String(-maxAgeDays)]
    );
    return result.changes;
  }

  /**
   * Rebuild the SQLite index from sidecar records in the evidence store.
   * Requires a store with list/get (local fs and R2 both support it).
   * Returns the number of records restored.
   */
  async rebuildIndex(): Promise<number> {
    if (!this.store.list || !this.store.get) {
      throw new Error('rebuildIndex: evidence store does not support list/get');
    }
    const keys = await this.store.list('dod-records/');
    let restored = 0;
    for (const key of keys) {
      if (!key.endsWith('.json')) continue;
      const raw = await this.store.get(key);
      if (!raw) continue;
      try {
        const record = JSON.parse(new TextDecoder().decode(raw)) as {
          submission: DODSubmission;
          verification: DODVerification;
          encrypted?: boolean;
        };
        const { submission: s, verification: v } = record;
        this.db.run(
          `INSERT OR REPLACE INTO dod_submissions (id, agent_id, type, status, visual_hash, metadata_hash, signature, tamper_score,
            extracted_text, geo_lat, geo_lng, device_model, s3_path, submitted_at, processed_at, encrypted)
          VALUES ($id, $aid, $type, $status, $vh, $mh, $sig, $ts, $text, $lat, $lng, $dev, $s3, $sub, $proc, $enc)`,
          {
            $id: s.id,
            $aid: s.agentId,
            $type: s.type,
            $status: v.status,
            $vh: v.visualHash,
            $mh: v.metadataHash,
            $sig: v.signature,
            $ts: v.tamperScore,
            $text: v.extractedText ?? null,
            $lat: v.geoLocation?.lat ?? null,
            $lng: v.geoLocation?.lng ?? null,
            $dev: v.deviceModel ?? null,
            $s3: v.s3Path,
            $sub: s.submittedAt,
            $proc: v.processedAt,
            $enc: record.encrypted ? 1 : 0,
          }
        );
        restored++;
      } catch {
        // skip malformed record
      }
    }
    return restored;
  }

  /** Agent-side receipt: status + hashes for a submitted DOD. */
  receipt(dodId: string) {
    // brand-ok — opaque external DOD id
    return (
      this.db
        .query(
          'SELECT id, agent_id, type, status, visual_hash, signature, submitted_at, processed_at FROM dod_submissions WHERE id=$id'
        )
        .get({ $id: dodId }) ?? null
    );
  }

  /** Agent-side verification: recompute HMAC and compare (constant length). */
  verifySignature(dodId: string, visualHash: string, metaHash: string, signature: string): boolean {
    // brand-ok — opaque external DOD id
    return this.sign(dodId, visualHash, metaHash) === signature;
  }

  /** Close the DB (and any future shared resources). */
  close(): void {
    this.db.close();
  }
}
