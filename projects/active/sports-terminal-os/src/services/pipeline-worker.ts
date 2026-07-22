/**
 * Pipeline Worker — visual evidence layer for odds drift alerts.
 *
 * Reacts to OddsDriftEngine drift alerts by:
 *   1. Scraping the odds page for the affected team (Bun.WebView)
 *   2. Capturing a screenshot as audit evidence (Bun.Image)
 *   3. Generating blur-up placeholder + dark-mode thumbnail
 *   4. Caching thumbnail for /thumbs/:team and /screenshot/:team
 *   5. Broadcasting thumbnail URL + Bun.Image metadata via WebSocket
 *   6. Running TEST-003 remediation on image metadata evidence
 *   7. Sending Telegram notification via h2Fetch (HTTP/2)
 *
 * Graceful degradation: if WebView is unavailable (no Chrome/WebKit),
 * falls back to alert-only mode — no crash, no missing alerts.
 *
 * Used by: src/index.ts Zone 10 startup
 *
 * @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
 */

import type { DriftAlertOutput } from "./odds-drift-engine";
import { h2Fetch } from "../utils/h2-fetch";
import {
  extractImageEvidenceMeta,
  type ImageEvidenceMeta,
} from "../utils/image-metadata";
import {
  buildScreenshotEvidenceRecord,
  runTest003,
  type ScreenshotEvidenceRecord,
  type Test003Response,
} from "./screenshot-remediation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineWorkerOptions {
  /** Called to broadcast thumbnail evidence to WebSocket clients. */
  onBroadcast: (channel: string, payload: Record<string, unknown>) => void;
  /** Telegram bot token (optional — skips notification if unset). */
  telegramBotToken?: string;
  /** Telegram chat ID for alert delivery. */
  telegramChatId?: string;
}

export interface ThumbnailEntry {
  /** JPEG bytes for `/thumbs/:team` (dashboard). */
  bytes: Uint8Array;
  /** PNG evidence bytes for `/screenshot/:team` + TEST-003 (≤400×300). */
  pngBytes: Uint8Array;
  placeholder: string;
  /** Digest of the raw screenshot (audit trail). */
  sha256: string;
  /** JPEG thumb dimensions (from Bun.Image.metadata). */
  width: number;
  height: number;
  capturedAt: number;
  /** Bun.Image metadata for raw screenshot. */
  sourceMeta: ImageEvidenceMeta;
  /** Bun.Image metadata for JPEG thumb body. */
  thumbMeta: ImageEvidenceMeta;
  /** Full evidence record used by TEST-003 (PNG metadata). */
  evidence: ScreenshotEvidenceRecord;
  /** Last TEST-003 remediation response. */
  test003: Test003Response;
  crop?: { x: number; y: number; w: number; h: number };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class PipelineWorker {
  private onBroadcast: (channel: string, payload: Record<string, unknown>) => void;
  private telegramBotToken?: string;
  private telegramChatId?: string;

  /** Thumbnail cache — keyed by canonical team name (or raw team if no match). */
  private thumbnailCache = new Map<string, ThumbnailEntry>();

  /** WebView available flag — set to false if construction fails. */
  private webViewAvailable = true;

  /** Track whether the singleton WebView is currently in use. */
  private scraping = false;

  /** Metrics counters. */
  private scrapeCount = 0;
  private scrapeFailCount = 0;
  private notifyCount = 0;

  constructor(options: PipelineWorkerOptions) {
    this.onBroadcast = options.onBroadcast;
    this.telegramBotToken = options.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = options.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Called by OddsDriftEngine when a drift alert is emitted.
   * Runs the full visual evidence pipeline asynchronously.
   */
  onAlert(alert: DriftAlertOutput): void {
    // Fire-and-forget — don't block the alert pipeline
    this.processAlert(alert).catch((err) => {
      console.error("[pipeline-worker] Alert processing failed:", (err as Error).message ?? err);
    });
  }

  /**
   * Metrics for hygiene dashboard.
   */
  getMetrics(): Record<string, unknown> {
    return {
      thumbnailsCached: this.thumbnailCache.size,
      webViewAvailable: this.webViewAvailable,
      scrapes: this.scrapeCount,
      scrapeFailures: this.scrapeFailCount,
      notifications: this.notifyCount,
    };
  }

  /**
   * Look up a cached thumbnail by team name.
   */
  getThumbnail(team: string): ThumbnailEntry | undefined {
    return this.thumbnailCache.get(normalizeKey(team));
  }

  /**
   * Screenshot API payload — image bytes + Bun.Image metadata + TEST-003.
   */
  getScreenshotResponse(team: string): {
    team: string;
    mediaType: "image/png";
    bytesBase64: string;
    metadata: ImageEvidenceMeta;
    source: ImageEvidenceMeta;
    sha256: string;
    capturedAt: string;
    ok: boolean;
    test003: Test003Response;
    evidence: ScreenshotEvidenceRecord;
  } | undefined {
    const entry = this.getThumbnail(team);
    if (!entry) return undefined;
    return {
      team,
      mediaType: "image/png" as const,
      bytesBase64: Buffer.from(entry.pngBytes).toString("base64"),
      metadata: entry.evidence.thumbnail,
      source: entry.sourceMeta,
      sha256: entry.sha256,
      capturedAt: entry.evidence.capturedAt,
      ok: entry.test003.ok,
      test003: entry.test003,
      evidence: entry.evidence,
    };
  }

  // -------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------

  private async processAlert(alert: DriftAlertOutput): Promise<void> {
    const team = alert.canonicalTeam ?? alert.rawTeam;
    const displayName = alert.canonicalTeam
      ? `${alert.rawTeam} → ${alert.canonicalTeam}`
      : alert.rawTeam;

    console.log(
      `🔔 [pipeline] Drift: ${displayName} ${alert.direction} ${alert.drift} on ${alert.market}`
    );

    // 1. Scrape visual evidence (if WebView is available)
    if (this.webViewAvailable && !this.scraping) {
      try {
        await this.scrapeEvidence(team, alert);
      } catch (err: unknown) {
        this.scrapeFailCount++;
        const msg = (err as Error).message ?? String(err);
        console.warn(`[pipeline] Scrape failed for ${team}: ${msg}`);
        // If WebView construction itself failed, disable for future alerts
        if (msg.includes("WebView") || msg.includes("Chrome") || msg.includes("backend")) {
          this.webViewAvailable = false;
          console.warn("[pipeline] WebView disabled — falling back to alert-only mode");
        }
      }
    }

    // 2. Broadcast thumbnail evidence via WebSocket
    const cached = this.thumbnailCache.get(normalizeKey(team));
    this.onBroadcast("odds-hygiene", {
      type: "pipeline_evidence",
      alert: {
        team: alert.canonicalTeam ?? alert.rawTeam,
        rawTeam: alert.rawTeam,
        drift: alert.drift,
        direction: alert.direction,
        market: alert.market,
        detectedAt: alert.detectedAt,
      },
      evidence: cached
        ? {
            thumbnail: `/thumbs/${encodeURIComponent(team)}`,
            screenshot: `/screenshot/${encodeURIComponent(team)}`,
            placeholder: cached.placeholder,
            width: cached.width,
            height: cached.height,
            sha256: cached.sha256,
            metadata: cached.thumbMeta,
            source: cached.sourceMeta,
            test003: cached.test003,
          }
        : null,
      timestamp: Date.now(),
    });

    // 3. Telegram notification (best-effort)
    if (this.telegramBotToken && this.telegramChatId) {
      try {
        await this.sendTelegramAlert(team, alert, cached);
        this.notifyCount++;
      } catch {
        // Telegram delivery failures are non-fatal
      }
    }
  }

  // -------------------------------------------------------------------
  // WebView scrape
  // -------------------------------------------------------------------

  private async scrapeEvidence(team: string, alert: DriftAlertOutput): Promise<void> {
    this.scraping = true;
    this.scrapeCount++;

    try {
      // await using — native disposal, no transpile overhead
      await using view = new Bun.WebView({ width: 1280, height: 800 });

      // Navigate to a demo odds page (in production, replace with real sportsbook URL)
      const oddsHtml = `<!DOCTYPE html>
<html><body>
  <h1>Odds Alert: ${team}</h1>
  <table class="odds">
    <tr><td>${team}</td><td>${alert.toOdds}</td><td>${alert.market}</td></tr>
    <tr><td>Drift</td><td>${alert.direction} ${alert.drift}</td><td>${alert.detectedAt}</td></tr>
  </table>
</body></html>`;

      await Bun.write("/tmp/odds-evidence.html", oddsHtml);
      await view.navigate("file:///tmp/odds-evidence.html");

      // Settle (onNavigated callback would be cleaner — see mega-liner v8 pattern)
      await new Promise((r) => setTimeout(r, 500));

      // Extract odds-table bounding box for crop region metadata
      let cropRegion: { x: number; y: number; w: number; h: number } | null = null;
      try {
        cropRegion = (await view.evaluate(`
          (() => {
            const table = document.querySelector('table.odds');
            if (!table) return null;
            const r = table.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })()
        `)) as { x: number; y: number; w: number; h: number } | null;
      } catch {
        // Crop extraction is best-effort — full page is still captured
      }

      // Screenshot with zero-copy Buffer encoding
      const screenshotBytes = (await view.screenshot({ encoding: "buffer" })) as Buffer;

      // Evidence chain: Bun.Image metadata (source + resize 400×300 PNG) + TEST-003
      const { record, thumbnailBytes } = await buildScreenshotEvidenceRecord(screenshotBytes, {
        team,
        crop: cropRegion ?? undefined,
      });
      const test003 = runTest003(record);

      // Placeholder from original frame (blur-up preview)
      const placeholder = (await new Bun.Image(screenshotBytes).placeholder()) as string;

      // Dashboard JPEG variant (same bounds; metadata already on PNG evidence)
      const jpegThumb = await new Bun.Image(screenshotBytes)
        .modulate({ brightness: 0.85, saturation: 0.6 })
        .resize(400, 300, { fit: "inside", filter: "mitchell", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .bytes();
      const jpegMeta = await extractImageEvidenceMeta(jpegThumb);

      this.thumbnailCache.set(normalizeKey(team), {
        bytes: jpegThumb,
        pngBytes: thumbnailBytes,
        placeholder,
        sha256: record.source.digest,
        width: jpegMeta.width,
        height: jpegMeta.height,
        capturedAt: Date.now(),
        sourceMeta: record.source,
        thumbMeta: jpegMeta,
        evidence: record,
        test003,
        crop: cropRegion ?? undefined,
      });

      console.log(
        `📸 [pipeline] Evidence captured: ${team} — ${screenshotBytes.length}B screenshot, ` +
          `${jpegThumb.byteLength}B jpeg thumb, ${thumbnailBytes.byteLength}B png evidence, ` +
          `TEST-003=${test003.status}, sha256=${record.source.digest.slice(0, 12)}…`,
      );
    } finally {
      this.scraping = false;
    }
  }

  // -------------------------------------------------------------------
  // Telegram notification
  // -------------------------------------------------------------------

  private async sendTelegramAlert(
    team: string,
    alert: DriftAlertOutput,
    cached: ThumbnailEntry | undefined
  ): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) return;

    const emoji = alert.direction === "up" ? "🟢" : alert.direction === "down" ? "🔴" : "🟡";
    const thumbnailLine = cached
      ? `\n📸 <a href="http://localhost:3000/thumbs/${encodeURIComponent(team)}">Evidence thumbnail</a>`
      : "";

    const text =
      `${emoji} <b>Odds Drift Alert</b>\n` +
      `<b>Team:</b> ${team}\n` +
      `<b>Market:</b> ${alert.market}\n` +
      `<b>Drift:</b> ${alert.direction} ${alert.drift} (${alert.fromOdds} → ${alert.toOdds})\n` +
      `<b>Source:</b> ${alert.source}\n` +
      `<b>Time:</b> ${alert.detectedAt}` +
      thumbnailLine;

    await h2Fetch(
      `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text,
          parse_mode: "HTML",
          disable_notification: alert.drift < 0.03, // Only notify for significant drifts
        }),
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "-");
}
