/**
 * Real automation driver backed by Bun.WebView (headless, experimental).
 *
 * API notes (verified against Bun 1.3.14 / bun-types):
 * - There is NO `waitForSelector` — we poll via `view.evaluate`.
 * - `view.type(text)` only types into the focused element — focus via `click(selector)` first.
 * - `view.click(selector)` has built-in actionability waiting.
 * - `view.cdp()` is Chrome-backend only and requires a prior `navigate()`.
 * - The constructor has no proxy/argv option — proxy support is a documented gap.
 *
 * @see https://bun.com/docs/runtime/webview
 * @see https://bun.com/docs/runtime/webview#new-bun-webview-options
 */
import type { AutomationDriver, LoginSelectors, SessionSnapshot } from "./types.ts";

const WAIT_POLL_MS = 120;

/** Map browser `KeyboardEvent.key` values to Bun.WebView VirtualKey names where they differ. */
const KEY_MAP: Record<string, string> = {
  " ": "Space",
  Escape: "Escape",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

export class WebViewDriver implements AutomationDriver {
  readonly kind = "webview" as const;
  private viewRef: Bun.WebView | null;
  private closed = false;

  constructor(opts: { width?: number; height?: number; userAgent?: string; url?: string }) {
    this.viewRef = new Bun.WebView({
      backend: "chrome",
      width: opts.width ?? 1280,
      height: opts.height ?? 720,
      url: opts.url ?? "about:blank",
    });
    if (opts.userAgent) {
      // UA override must run after the first navigation (CDP session setup).
      void this.viewRef.navigate("about:blank").then(() =>
        this.viewRef?.cdp("Network.setUserAgentOverride", { userAgent: opts.userAgent }),
      );
    }
  }

  private get view(): Bun.WebView {
    if (this.closed || !this.viewRef) throw new Error("WebView driver is closed");
    return this.viewRef;
  }

  async navigate(url: string): Promise<void> {
    await this.view.navigate(url);
  }

  async waitForSelector(selector: string, timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    // expression must be a single expression; wrap in an IIFE
    const script = `(() => !!document.querySelector(${JSON.stringify(selector)}))()`;
    for (;;) {
      if (await this.view.evaluate<boolean>(script)) return;
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for selector: ${selector}`);
      }
      await Bun.sleep(WAIT_POLL_MS);
    }
  }

  async fillLogin(selectors: LoginSelectors, username: string, password: string): Promise<void> {
    // click(selector) waits for actionability, then focuses the element; type() fills the focused element.
    await this.view.click(selectors.username);
    await this.view.type(username);
    await this.view.click(selectors.password);
    await this.view.type(password);
  }

  async submit(selector: string): Promise<void> {
    await this.view.click(selector);
  }

  async waitForSuccess(selector: string, timeoutMs = 30_000): Promise<void> {
    await this.waitForSelector(selector, timeoutMs);
  }

  async capture(): Promise<SessionSnapshot> {
    const cookies = await this.view.evaluate<string>("document.cookie");
    const local = await this.view.evaluate<string>("JSON.stringify(localStorage ?? {})");
    const session = await this.view.evaluate<string>("JSON.stringify(sessionStorage ?? {})");
    return { cookies: cookies ?? "", local_storage: local ?? "{}", session_storage: session ?? "{}" };
  }

  async screenshot(): Promise<Uint8Array> {
    const buf = await this.view.screenshot({ encoding: "buffer", format: "png" });
    return new Uint8Array(buf);
  }

  async click(x: number, y: number): Promise<void> {
    await this.view.click(x, y);
  }

  async press(key: string): Promise<void> {
    await this.view.press(KEY_MAP[key] ?? key);
  }

  async evaluate<T = unknown>(script: string): Promise<T> {
    return this.view.evaluate<T>(script);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.viewRef?.close();
    this.viewRef = null;
  }
}
