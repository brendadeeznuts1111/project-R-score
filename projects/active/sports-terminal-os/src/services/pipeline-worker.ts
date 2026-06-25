/**
 * Pipeline Worker — visual evidence layer for odds drift alerts.
 *
 * Reacts to OddsDriftEngine drift alerts by:
 *   1. Scraping the odds page for the affected team (Bun.WebView)
 *   2. Capturing a screenshot as audit evidence (Bun.Image)
 *   3. Generating blur-up placeholder + dark-mode thumbnail
 *   4. Caching thumbnail for /thumbs/:team HTTP endpoint
 *   5. Broadcasting thumbnail URL via WebSocket pubsub
 *   6. Sending Telegram notification via h2Fetch (HTTP/2)
 *
 * Graceful degradation: if WebView is unavailable (no Chrome/WebKit),
 * falls back to alert-only mode — no crash, no missing alerts.
 *
 * Used by: src/index.ts Zone 10 startup
 */

import type { DriftAlertOutput } from "./odds-drift-engine";
import { h2Fetch } from "../utils/h2-fetch";

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

interface ThumbnailEntry {
  bytes: Uint8Array;
  placeholder: string;
  sha256: string;
  width: number;
  height: number;
  capturedAt: number;
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
            placeholder: cached.placeholder,
            width: cached.width,
            height: cached.height,
            sha256: cached.sha256,
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

      // Bun.Image pipeline
      const img = new Bun.Image(screenshotBytes);
      const meta = await img.metadata();

      // SHA-256 for audit
      const hasher = new Bun.CryptoHasher("sha256");
      hasher.update(screenshotBytes);
      const sha256 = hasher.digest("hex") as string;

      // Placeholder (base64 blur-up for instant preview)
      const placeholder = (await img.placeholder()) as string;

      // Dark-mode thumbnail
      const thumb = img
        .modulate({ brightness: 0.85, saturation: 0.6 })
        .resize(400, 300, { fit: "inside", filter: "mitchell", withoutEnlargement: true });
      const thumbBytes = await thumb.jpeg({ quality: 85 }).bytes();

      // Cache with crop region metadata
      this.thumbnailCache.set(normalizeKey(team), {
        bytes: thumbBytes,
        placeholder,
        sha256,
        width: meta.width,
        height: meta.height,
        capturedAt: Date.now(),
        crop: cropRegion ?? undefined,
      } as ThumbnailEntry & { crop?: { x: number; y: number; w: number; h: number } });

      console.log(
        `📸 [pipeline] Evidence captured: ${team} — ${screenshotBytes.length}B screenshot, ` +
        `${thumbBytes.byteLength}B thumb, sha256=${sha256.slice(0, 12)}…`
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
