import { describe, expect, test } from "bun:test";
import {
  captureLoopBaseline,
  diffLoopBaseline,
  formatLoopSummary,
  tickToBaselineEntry,
} from "../../scripts/scan/transpiler/skill-loop-baseline.ts";
import { listLoopPresets, loadSkillLoopRegistry, resolveLoopPreset } from "../../scripts/scan/transpiler/skill-loop.ts";
import { resolve } from "node:path";

const SKILL_ROOT = resolve(import.meta.dir, "../..");

describe("skill-loop baseline", () => {
  test("diffLoopBaseline tolerates rating-only variance within band", () => {
    const before = tickToBaselineEntry({
      skillId: "ast-grep",
      reason: "initial",
      rating: 100,
      grade: "A",
      at: Date.now(),
      phases: [
        { phase: "snapshot", ok: true, rating: 100 },
        { phase: "rate", ok: true, rating: 100 },
      ],
    });
    const after = tickToBaselineEntry({
      skillId: "ast-grep",
      reason: "initial",
      rating: 85,
      grade: "B",
      at: Date.now(),
      phases: [
        { phase: "snapshot", ok: true, rating: 85 },
        { phase: "rate", ok: true, rating: 85 },
      ],
    });
    const tolerant = diffLoopBaseline(after, before, { ratingDriftTolerance: 15 });
    expect(tolerant.drift).toBe(false);
    const strict = diffLoopBaseline(after, before, { strict: true });
    expect(strict.drift).toBe(true);
  });

  test("tickToBaselineEntry captures snapshot bench metrics", () => {
    const entry = tickToBaselineEntry({
      skillId: "ast-grep",
      reason: "initial",
      rating: 100,
      grade: "A",
      at: Date.now(),
      phases: [],
      snapshotBench: {
        schemaVersion: 1,
        tool: "skill-loop-bench-snapshot",
        domain: "sports-terminal-os",
        iterations: 3,
        runs: [],
        passRate: 1,
        p50Ms: 120,
        p95Ms: 200,
        rating: 100,
        grade: "A",
        snapshotPath: "baselines/sports-terminal-os/snapshot.json",
        liveNetwork: true,
        groundTruth: true,
        phaseP50: { loadP50Ms: 1, validateP50Ms: 2, networkP50Ms: 100 },
      },
    });
    expect(entry.bench?.passRate).toBe(1);
    expect(entry.bench?.p50Ms).toBe(120);
    expect(entry.bench?.phaseP50?.networkP50Ms).toBe(100);
  });

  test("diffLoopBaseline detects phase drift", () => {
    const before = tickToBaselineEntry({
      skillId: "ast-grep",
      reason: "initial",
      rating: 100,
      grade: "A",
      at: Date.now(),
      phases: [
        { phase: "test", ok: true, rating: 100 },
        { phase: "bench", ok: true, rating: 100 },
      ],
    });
    const after = tickToBaselineEntry({
      skillId: "ast-grep",
      reason: "initial",
      rating: 85,
      grade: "B",
      at: Date.now(),
      phases: [
        { phase: "test", ok: true, rating: 100 },
        { phase: "bench", ok: false, rating: 70 },
      ],
    });
    const delta = diffLoopBaseline(after, before);
    expect(delta.drift).toBe(true);
    expect(delta.phases_changed).toContain("bench");
    expect(delta.rating_delta).toBe(-15);
  });

  test("formatLoopSummary sorts by rating", () => {
    const text = formatLoopSummary([
      { skillId: "a", reason: "initial", rating: 50, grade: "D", at: 0, phases: [] },
      { skillId: "b", reason: "initial", rating: 100, grade: "A", at: 0, phases: [] },
    ]);
    expect(text.indexOf("b")).toBeLessThan(text.indexOf("average"));
    expect(text).toContain("average rating: 75");
  });

  test("captureLoopBaseline indexes by skillId", () => {
    const baseline = captureLoopBaseline([
      { skillId: "x", reason: "initial", rating: 90, grade: "A", at: 0, phases: [] },
    ]);
    expect(baseline.skills.x.rating).toBe(90);
  });
});

describe("skill-loop presets", () => {
  test("registry v2 exposes full and ci presets", async () => {
    const registry = await loadSkillLoopRegistry(SKILL_ROOT);
    expect(registry.version).toBe(2);
    expect(listLoopPresets(registry)).toContain("full");
    expect(listLoopPresets(registry)).toContain("ci");
    const full = resolveLoopPreset(registry, "full");
    expect(full.preset.matrix).toBe(true);
    expect(full.runPhases).toContain("snapshot");
    expect(full.skillId).toBe("ast-grep");
  });

  test("close-loop preset uses closeLoop not phase pipeline", async () => {
    const registry = await loadSkillLoopRegistry(SKILL_ROOT);
    expect(listLoopPresets(registry)).toContain("close-loop");
    const cl = resolveLoopPreset(registry, "close-loop");
    expect(cl.runPhases).toEqual([]);
    expect(cl.closeLoop?.baselineWrite).toBe(true);
    expect(cl.closeLoop?.ratingDriftTolerance).toBe(15);
  });

  test("snapshot-bench preset uses benchSnapshot not phase pipeline", async () => {
    const registry = await loadSkillLoopRegistry(SKILL_ROOT);
    expect(listLoopPresets(registry)).toContain("snapshot-bench");
    const snap = resolveLoopPreset(registry, "snapshot-bench");
    expect(snap.runPhases).toEqual([]);
    expect(snap.benchSnapshot?.domain).toBe("sports-terminal-os");
    expect(snap.benchSnapshot?.groundTruth).toBe(true);
  });
});