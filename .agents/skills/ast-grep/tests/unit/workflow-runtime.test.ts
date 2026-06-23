import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  captureBunRuntime,
  detectBunDrift,
  fetchWithTls,
  loadTlsOptions,
} from "../../scripts/scan/transpiler/workflow-effects/runtime.ts";

describe("workflow runtime", () => {
  test("captureBunRuntime returns version and platform", () => {
    const bun = captureBunRuntime();
    expect(bun.version.length).toBeGreaterThan(0);
    expect(bun.platform).toBe(process.platform);
    expect(bun.arch).toBe(process.arch);
  });

  test("detectBunDrift flags version changes", () => {
    const current = captureBunRuntime();
    const drift = detectBunDrift(current, {
      schemaVersion: 1,
      bunVersion: "0.0.0",
      bunRevision: null,
      platform: current.platform,
      arch: current.arch,
      capturedAt: new Date().toISOString(),
    });
    expect(drift.drift).toBe(true);
    expect(drift.versionDelta).toContain("0.0.0");
  });

  test("loadTlsOptions reads CA file from disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflow-tls-"));
    const caPath = join(dir, "ca.pem");
    await writeFile(caPath, "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n");
    const tls = await loadTlsOptions({ ca: caPath, rejectUnauthorized: false });
    expect(tls?.ca).toBeDefined();
    expect(String(tls?.ca)).toContain("BEGIN CERTIFICATE");
    expect(tls?.rejectUnauthorized).toBe(false);
  });

  test("fetchWithTls passes tls option to fetch", async () => {
    let sawTls = false;
    const mockFetch = (async (_url: string, init?: RequestInit) => {
      sawTls = Boolean((init as { tls?: unknown })?.tls);
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    await fetchWithTls(
      "https://example.com/hook",
      { method: "POST", body: "{}" },
      { rejectUnauthorized: false },
      mockFetch,
    );
    expect(sawTls).toBe(true);
  });
});