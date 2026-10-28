/**
 * Driver factory — selects the automation backend from AUTOMATION_DRIVER.
 *   "webview" → real Bun.WebView (experimental, >= 1.3.12)
 *   "mock"    → simulated steps (default; boots anywhere)
 *
 * Falls back to mock with a warning when "webview" is requested but the
 * runtime lacks Bun.WebView.
 *
 * @see https://bun.com/docs/runtime/webview
 */
import type { AutomationDriver } from "./types.ts";
import { MockDriver } from "./mock-driver.ts";
import { WebViewDriver } from "./webview-driver.ts";

export type DriverMode = "webview" | "mock";

export function resolveDriverMode(env: string | undefined): DriverMode {
  return env === "webview" ? "webview" : "mock";
}

export function createDriver(mode: DriverMode): AutomationDriver {
  if (mode === "webview") {
    if (typeof (Bun as unknown as { WebView?: unknown }).WebView !== "function") {
      console.warn("[driver] Bun.WebView unavailable — falling back to mock driver");
      return new MockDriver();
    }
    return new WebViewDriver({ userAgent: process.env.WEBVIEW_USER_AGENT });
  }
  return new MockDriver();
}
