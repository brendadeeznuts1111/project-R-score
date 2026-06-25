import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  formatSnapshotBenchStatus,
  runSnapshotBenchLoop,
  summarizeSnapshotBenchRuns,
  type SnapshotBenchRunResult,
} from "../../scripts/scan/transpiler/snapshot-bench-loop.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("snapshot-bench-loop", () => {
  test("summarizeSnapshotBenchRuns computes pass rate, schema, and phase p50", () => {
    const runs: SnapshotBenchRunResult[] = [
      {
        iteration: 1,
        elapsedMs: 120,
        ok: true,
        snapshotOk: true,
        sections: [],
        phases: { loadMs: 5, networkMs: 40, validateMs: 60, groundTruthMs: 15 },
      },
      {
        iteration: 2,
        elapsedMs: 90,
        ok: true,
        snapshotOk: true,
        sections: [],
        phases: { loadMs: 4, networkMs: 35, validateMs: 45, groundTruthMs: 10 },
      },
      {
        iteration: 3,
        elapsedMs: 200,
        ok: false,
        snapshotOk: false,
        sections: ["semver"],
        phases: { loadMs: 6, networkMs: 50, validateMs: 120, groundTruthMs: 20 },
      },
    ];
    const summary = summarizeSnapshotBenchRuns("sports-terminal-os", runs, {
      snapshotPath: "baselines/sports-terminal-os/snapshot.json",
      liveNetwork: true,
      groundTruth: true,
      targetMs: 1500,
    });
    expect(summary.schemaVersion).toBe(1);
    expect(summary.tool).toBe("skill-loop-bench-snapshot");
    expect(summary.passRate).toBeCloseTo(2 / 3, 2);
    expect(summary.p50Ms).toBe(120);
    expect(summary.p95Ms).toBe(200);
    expect(summary.rating).toBeGreaterThan(0);
    expect(summary.phaseP50?.loadP50Ms).toBe(5);
    expect(summary.phaseP50?.networkP50Ms).toBe(40);
    expect(summary.phaseP50?.validateP50Ms).toBe(60);
    expect(summary.phaseP50?.groundTruthP50Ms).toBe(15);
    expect(formatSnapshotBenchStatus(summary)).toContain("bench-snapshot");
    expect(formatSnapshotBenchStatus(summary, { verbose: true })).toContain("phases_p50=");
    expect(formatSnapshotBenchStatus(summary, { verbose: true })).toContain("network=40ms");
  });

  test("runSnapshotBenchLoop passes for sports-terminal golden snapshot", async () => {
    const summary = await runSnapshotBenchLoop({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      domain: "sports-terminal-os",
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      iterations: 2,
      targetMs: 3000,
      groundTruth: true,
    });
    expect(summary.passRate).toBe(1);
    expect(summary.rating).toBeGreaterThanOrEqual(70);
    expect(summary.liveNetwork).toBe(true);
    expect(summary.groundTruth).toBe(true);
    expect(summary.runs.every((r) => r.ok)).toBe(true);
  });
});