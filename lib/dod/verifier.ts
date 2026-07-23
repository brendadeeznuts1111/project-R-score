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

    // 4. Apply operations watermark
    const watermarked = await this.applyWatermark(img, submission);

    // 5. Resize and compress for storage
    const stored = await watermarked
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

  // ── Watermark via WebView ──────────────────────────────────────
  private async applyWatermark(img: Bun.Image, sub: DODSubmission): Promise<Bun.Image> {
    try {
      const text = `OPS-${sub.agentId.slice(0, 8)}-${sub.id.slice(0, 8)}`;
      const meta = await img.metadata();
      const wv = new Bun.WebView({
        width: meta.width || 400, height: (meta.height || 300) + 24,
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
        width: 800, height: 600,
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

  /** Find submissions with similar perceptual hashes (Hamming distance). */
  findSimilar(hash: string, maxDistance = 5): { id: string; agent_id: string; distance: number }[] {
    const all = this.db.query(
      "SELECT id, agent_id, visual_hash FROM dod_submissions WHERE visual_hash IS NOT NULL",
    ).all() as { id: string; agent_id: string; visual_hash: string }[];

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
      [String(-maxAgeDays)],
    );
    return result.changes;
  }
}

function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][xor]!;
  }
  return dist;
}
