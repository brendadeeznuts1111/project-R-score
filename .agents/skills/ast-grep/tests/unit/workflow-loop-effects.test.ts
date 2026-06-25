import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyWorkflowFixes,
  generateWorkflowReport,
  sendWorkflowAlert,
  type WorkflowScannerResult,
} from "../../scripts/scan/transpiler/workflow-loop.ts";
import { captureBunRuntime } from "../../scripts/scan/transpiler/workflow-effects/runtime.ts";

const semverFail: WorkflowScannerResult = {
  scannerId: "semver",
  status: "fail",
  elapsedMs: 12,
  issues: [
    {
      severity: "critical",
      message: "lodash@4.17.20 violates policy",
      package: "lodash",
      remediation: {
        action: "upgrade",
        safeRange: ">=4.17.21",
        suggestedVersion: "4.17.21",
        latestInLockfile: "4.17.20",
        command: "bun add lodash@4.17.21",
      },
    },
  ],
};

describe("workflow-loop effects", () => {
  test("sendWorkflowAlert posts JSON payload to webhook", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    let capturedTls = false;
    const mockFetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = String(init?.body ?? "");
      capturedTls = Boolean((init as { tls?: unknown })?.tls);
      return new Response("ok", { status: 200 });
    };

    const drift = { hasDrift: true, network: undefined };
    const bun = captureBunRuntime();
    const result = await sendWorkflowAlert(
      "test-domain",
      [semverFail],
      drift,
      "https://hooks.example.com/alert",
      { fetch: mockFetch as typeof fetch, tls: { rejectUnauthorized: false } },
      { tls: { rejectUnauthorized: false }, bun, includeBunVersion: true },
    );

    expect(result.ok).toBe(true);
    expect(capturedUrl).toBe("https://hooks.example.com/alert");
    const payload = JSON.parse(capturedBody) as {
      domain: string;
      bun?: { version: string };
      results: Array<{ scanner: string; issues: number }>;
      drift: { hasDrift: boolean };
    };
    expect(payload.domain).toBe("test-domain");
    expect(payload.bun?.version).toBe(bun.version);
    expect(payload.results[0]?.scanner).toBe("semver");
    expect(payload.results[0]?.issues).toBe(1);
    expect(payload.drift.hasDrift).toBe(true);
    expect(capturedTls).toBe(true);
  });

  test("applyWorkflowFixes spawns bun add for critical semver violations", async () => {
    const spawned: string[][] = [];
    const mockSpawn = ((args: string[]) => ({
      exited: Promise.resolve(0),
    })) as typeof Bun.spawn;
    const trackingSpawn = ((args: string[]) => {
      spawned.push([...args]);
      return { exited: Promise.resolve(0) };
    }) as typeof Bun.spawn;

    const cmds = await applyWorkflowFixes("test-domain", [semverFail], {
      repo: "/tmp",
      deps: { spawn: trackingSpawn },
    });

    expect(spawned.length).toBe(1);
    expect(spawned[0]).toEqual(["bun", "add", "lodash@4.17.21"]);
    expect(cmds[0]).toContain("lodash@4.17.21");
    void mockSpawn;
  });

  test("generateWorkflowReport writes markdown report to disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflow-report-"));
    const path = join(dir, "report.md");
    const bun = captureBunRuntime();
    const written = await generateWorkflowReport(
      "test-domain",
      [semverFail],
      { hasDrift: false },
      path,
      {},
      { bun, includeBunVersion: true },
    );

    expect(written).toBe(path);
    const content = await readFile(path, "utf8");
    expect(content).toContain("# workflow: test-domain");
    expect(content).toContain("## runtime");
    expect(content).toContain(bun.version);
    expect(content).toContain("semver (fail)");
    expect(content).toContain("lodash@4.17.20");
  });
});