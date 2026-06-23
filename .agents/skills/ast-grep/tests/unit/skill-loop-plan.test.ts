import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  buildFullPlan,
  buildRunPlan,
  buildSnapshotBenchPlan,
  filterSkillsByOnly,
  formatLoopPlanText,
  LOOP_CLI_FLAGS_HELP,
} from "../../scripts/scan/transpiler/skill-loop-plan.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("skill-loop plan", () => {
  test("LOOP_CLI_FLAGS_HELP documents dry-run and explain", () => {
    expect(LOOP_CLI_FLAGS_HELP).toContain("--dry-run");
    expect(LOOP_CLI_FLAGS_HELP).toContain("--explain");
    expect(LOOP_CLI_FLAGS_HELP).toContain("--only");
  });

  test("filterSkillsByOnly matches substring", () => {
    expect(filterSkillsByOnly(["ast-grep", "partner-profile-os"], "profile")).toEqual([
      "partner-profile-os",
    ]);
  });

  test("buildFullPlan dry-run lists matrix and deep steps", async () => {
    const plan = await buildFullPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      presetName: "full",
      flags: { dryRun: true, explain: true },
    });
    expect(plan.action).toBe("full");
    expect(plan.matrixSkills.length).toBeGreaterThanOrEqual(10);
    expect(plan.steps.some((s) => s.skillId === "ast-grep" && s.phase === "test")).toBe(true);
    expect(plan.artifacts.length).toBe(1);
    const text = formatLoopPlanText(plan);
    expect(text).toContain("dry-run");
    expect(text).toContain("cmd:");
  });

  test("buildRunPlan includes test command when explain", async () => {
    const plan = await buildRunPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      skillId: "ast-grep",
      phases: ["test", "rate"],
      flags: { dryRun: true, explain: true, skipPreflight: true },
    });
    const testStep = plan.steps.find((s) => s.phase === "test");
    expect(testStep?.command?.[0]).toBe("bun");
    expect(testStep?.command).toContain("test");
  });

  test("buildSnapshotBenchPlan explain shows per-iteration pipeline substeps", async () => {
    const plan = await buildSnapshotBenchPlan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      domain: "sports-terminal-os",
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      iterations: 3,
      targetMs: 1500,
      groundTruth: true,
      failOnNetworkDrift: false,
      flags: { dryRun: true, explain: true },
    });
    const step = plan.steps[0];
    expect(plan.action).toBe("bench-snapshot");
    expect(step?.substeps?.length).toBeGreaterThanOrEqual(5);
    expect(step?.command).toContain("--ground-truth");
    expect(step?.command).toContain("--target-ms");
    const text = formatLoopPlanText(plan);
    expect(text).toContain("per-iteration pipeline:");
    expect(text).toContain("validateSnapshotFull");
    expect(text).toContain("validateNetworkGroundTruth");
    expect(text).toContain("repeat: 3×");
  });

  test("buildFullPlan close-loop preset resolves to closed-loop pipeline", async () => {
    const plan = await buildFullPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      presetName: "close-loop",
      flags: { dryRun: true, explain: true },
    });
    expect(plan.preset).toBe("close-loop");
    const text = formatLoopPlanText(plan);
    expect(text).toContain("close-loop");
    expect(text).toContain("writeLoopBaseline");
  });

  test("buildFullPlan snapshot-bench preset resolves to bench-snapshot pipeline", async () => {
    const plan = await buildFullPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      presetName: "snapshot-bench",
      flags: { dryRun: true, explain: true },
    });
    expect(plan.preset).toBe("snapshot-bench");
    expect(plan.steps[0]?.substeps?.length).toBeGreaterThanOrEqual(5);
    const text = formatLoopPlanText(plan);
    expect(text).toContain("bench-snapshot");
    expect(text).toContain("validateNetworkGroundTruth");
  });
});