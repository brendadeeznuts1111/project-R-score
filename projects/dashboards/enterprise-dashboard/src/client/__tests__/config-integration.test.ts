/**
 * Config integration tests – /themes.css and /api/config/status.
 * Require the dashboard server running (e.g. bun run dev) on BASE_URL.
 * When server is down, tests skip. Run with server up for full assertions:
 *   bun run dev   # terminal 1
 *   TEST_SERVER_URL=http://localhost:8080 bun test src/client/__tests__/config-integration.test.ts  # terminal 2
 */

import { describe, it, expect, beforeAll } from "bun:test";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:8080";
let serverUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }
});

describe("Config Integration", () => {
  it("serves theme CSS with correct content-type", async () => {
    if (!serverUp) {
      console.warn("Skipping: server not running at " + BASE_URL);
      return;
    }
    const res = await fetch(`${BASE_URL}/themes.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    const css = await res.text();
    expect(css).toContain("--theme-primary");
    expect(res.headers.get("etag")).toMatch(/^"[a-f0-9]{8}"$/);
  });

  it("returns config status with integrity hash", async () => {
    if (!serverUp) {
      console.warn("Skipping: server not running at " + BASE_URL);
      return;
    }
    const res = await fetch(`${BASE_URL}/api/config/status`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { integrity?: string };
    expect(data.integrity).toMatch(/^[a-f0-9]{8}$/);
  });
});
