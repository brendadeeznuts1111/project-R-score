// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Short-lived Bun.WebView HTML capture for Tier 4 book agents.
 *
 * Operations plane only — do not wrap odds SQLite (`openOddsDb`).
 * Screenshot PNG capture stays in `lib/operator-research/screenshot.ts`.
 */

export type CaptureHtmlViaWebViewOptions = {
  timeoutMs?: number;
  /** Extra settle time after navigate load before evaluate (ms). */
  settleMs?: number;
  width?: number;
  height?: number;
};

/**
 * Navigate headless WebView → evaluate `document.documentElement.outerHTML`.
 * Caller owns gating (`--html` + `--live` / `OPERATOR_WEBVIEW_SCRAPE=1`).
 */
export async function captureHtmlViaWebView(
  url: string,
  options: CaptureHtmlViaWebViewOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 18_000;
  const settleMs = options.settleMs ?? 800;
  await using wv = new Bun.WebView({
    width: options.width ?? 1280,
    height: options.height ?? 720,
    headless: true,
  });
  const nav = wv.navigate(url);
  await Promise.race([
    nav,
    Bun.sleep(timeoutMs).then(() => {
      throw new Error(`WebView navigate timeout ${timeoutMs}ms`);
    }),
  ]);
  if (settleMs > 0) await Bun.sleep(settleMs);
  const html: unknown = await wv.evaluate('document.documentElement.outerHTML');
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('WebView evaluate did not return HTML string');
  }
  return html;
}
