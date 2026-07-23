// @see https://bun.sh/docs/runtime/image — Bun.Image
// @see https://bun.sh/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
/**
 * DOD Verifier — agent-submitted visual proof pipeline.
 *
 * Flow: Telegram photo → Bun.Image → perceptual hash → watermark →
 *       resize/compress → S3 store → sign → tamper-detect → notify.
 */

import { Database } from "bun:sqlite";

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

  constructor(dbPath = 'data/operations.db') {
    this.proofSecret = Bun.env.DOD_PROOF_SECRET || 'dod-dev-secret';
    this.db = new Database(dbPath);
    this.db.run("PRAGMA journal_mode=WAL");
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
  }

  async process(submission: DODSubmission): Promise<DODVerification> {
    const t0 = Bun.nanoseconds();

    // 1. Load image
    const img = new Bun.Image(submission.rawImage);

    // 2. Extract metadata
    const metadata = await img.metadata();

    // 3. Perceptual hash
    const visualHash = await this.perceptualHash(img);

    // 4. Resize and compress for storage
    const stored = await img
      .resize(1024, 1024, { fit: 'inside' })
      .webp({ quality: 85 })
      .bytes();

    // 5. S3 path + write
    const s3Path = `dod/${submission.agentId}/${submission.type}/${submission.id}.webp`;
    await Bun.write(`public/evidence/${s3Path}`, stored);

    // 6. Metadata hash
    const metaHash = this.hashMetadata(metadata, submission);

    // 7. Sign
    const signature = this.sign(submission.id, visualHash, metaHash);

    // 8. Tamper detection
    const tamperScore = this.detectTampering(metadata, submission);

    const verification: DODVerification = {
      dodId: submission.id,
      status: tamperScore > 70 ? 'flagged' : 'pending',
      visualHash,
      metadataHash: metaHash,
      signature,
      tamperScore,
      geoLocation: metadata.gps,
      deviceModel: metadata.exif?.Device?.Model,
      s3Path,
      processedAt: new Date().toISOString(),
    };

    // 9. Persist
    this.db.run(`
      INSERT INTO dod_submissions (id, agent_id, type, status, visual_hash, metadata_hash, signature, tamper_score,
        geo_lat, geo_lng, device_model, s3_path, submitted_at, processed_at)
      VALUES ($id, $aid, $type, $status, $vh, $mh, $sig, $ts, $lat, $lng, $dev, $s3, $sub, $proc)
    `, {
      $id: submission.id,
      $aid: submission.agentId,
      $type: submission.type,
      $status: verification.status,
      $vh: visualHash,
      $mh: metaHash,
      $sig: signature,
      $ts: tamperScore,
      $lat: verification.geoLocation?.lat ?? null,
      $lng: verification.geoLocation?.lng ?? null,
      $dev: verification.deviceModel ?? null,
      $s3: s3Path,
      $sub: submission.submittedAt,
      $proc: verification.processedAt,
    });

    // 10. Notify ops if flagged
    if (verification.status === 'flagged') {
      await this.notifyOps(submission, verification);
    }

    // Record in snapshot registry
    await this.recordSnapshot(submission, verification, Bun.nanoseconds() - t0);

    return verification;
  }

  // ── Perceptual Hash (aHash) ──────────────────────────────────────
  private async perceptualHash(img: Bun.Image): Promise<string> {
    const tiny = img.resize(8, 8, { fit: 'fill', filter: 'nearest' });
    const bytes = await tiny.bytes();
    const avg = bytes.reduce((a, b) => a + b, 0) / bytes.length;
    let hash = 0n;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] > avg) hash |= 1n << BigInt(i);
    }
    return hash.toString(16).padStart(16, '0');
  }

  // ── Metadata Hash ────────────────────────────────────────────────
  private hashMetadata(metadata: any, sub: DODSubmission): string {
    const h = new Bun.CryptoHasher('sha256');
    h.update(JSON.stringify({
      w: metadata.width, h: metadata.height, fmt: metadata.format,
      created: metadata.exif?.DateTimeOriginal, gps: metadata.gps,
      agentId: sub.agentId, type: sub.type, at: sub.submittedAt,
    }));
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
  private async recordSnapshot(
    sub: DODSubmission, ver: DODVerification, processingNs: bigint,
  ) {
    const path = 'public/registry/dod-registry.json';
    const reg = await Bun.file(path).json().catch(() => ({ entries: [] }));
    reg.entries = (reg.entries || []).slice(-999);
    reg.entries.push({
      id: sub.id, agentId: sub.agentId, type: sub.type,
      status: ver.status, tamperScore: ver.tamperScore,
      submittedAt: sub.submittedAt, processedAt: ver.processedAt,
      processingMs: Number(processingNs) / 1e6,
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
      { $id: dodId, $by: reviewedBy },
    );
  }

  reject(dodId: string, reason: string, reviewedBy = 'operations') {
    this.db.run(
      "UPDATE dod_submissions SET status='rejected', reviewed_at=datetime('now'), reviewed_by=$by, rejection_reason=$r WHERE id=$id",
      { $id: dodId, $by: reviewedBy, $r: reason },
    );
  }

  list(status?: string) {
    const sql = status && status !== 'all'
      ? "SELECT * FROM dod_submissions WHERE status=$s ORDER BY submitted_at DESC LIMIT 50"
      : "SELECT * FROM dod_submissions ORDER BY submitted_at DESC LIMIT 50";
    return this.db.query(sql).all(status ? { $s: status } : {});
  }
}
