import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  formatCloseLoopStatus,
  runCloseLoop,
} from "../../scripts/scan/transpiler/close-loop.ts";
import {
  buildCloseLoopPlan,
  formatLoopPlanText,
} from "../../scripts/scan/transpiler/skill-loop-plan.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");
const SCAN = "projects/active/sports-terminal-os/dist/frontend";

describe("close-loop", () => {
  test("buildCloseLoopPlan explain lists pipeline steps", async () => {
    const plan = await buildCloseLoopPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      domain: "sports-terminal-os",
      scanPath: SCAN,
      iterations: 3,
      groundTruth: true,
      seed: true,
      baselineWrite: true,
      failOnDrift: true,
      flags: { dryRun: true, explain: true, failOnRating: true, minRating: 70 },
    });
    expect(plan.action).toBe("close-loop");
    const text = formatLoopPlanText(plan);
    expect(text).toContain("validateNetworkGroundTruth");
    expect(text).toContain("runSnapshotBenchLoop");
    expect(text).toContain("diffLoopBaselines");
    expect(text).toContain("writeLoopBaseline");
  });

  test("formatCloseLoopStatus includes step summary", () => {
    const line = formatCloseLoopStatus({
      schemaVersion: 1,
      tool: "skill-loop-close-loop",
      domain: "sports-terminal-os",
      steps: [
        { id: "ground-truth", ok: true, elapsedMs: 10 },
        { id: "bench-snapshot", ok: true, elapsedMs: 200 },
      ],
      ok: true,
      rating: 100,
      grade: "A",
    });
    expect(line).toContain("close-loop");
    expect(line).toContain("ground-truth=ok");
    expect(line).toContain("rating=100");
  });

  test("runCloseLoop passes for sports-terminal golden path", async () => {
    const summary = await runCloseLoop({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      domain: "sports-terminal-os",
      scanPath: SCAN,
      iterations: 2,
      benchSnapshot: { groundTruth: true, targetMs: 3000 },
    });
    expect(summary.ok).toBe(true);
    expect(summary.steps.some((s) => s.id === "ground-truth" && s.ok)).toBe(true);
    expect(summary.steps.some((s) => s.id === "bench-snapshot" && s.ok)).toBe(true);
    expect(summary.rating).toBeGreaterThanOrEqual(70);
    expect(formatCloseLoopStatus(summary)).toContain("bench-snapshot=ok");
  });
});