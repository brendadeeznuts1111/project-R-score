import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  formatSkillLoopStatus,
  listRegistrySkills,
  loadSkillLoopRegistry,
  resolveSkillPhases,
} from "../../scripts/scan/transpiler/skill-loop.ts";
import {
  fingerprintSkillLoopTick,
  formatSkillLoopHerdrTab,
  formatSkillLoopJson,
} from "../../scripts/scan/transpiler/skill-loop-herdr.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");

describe("skill-loop", () => {
  test("loadSkillLoopRegistry includes ast-grep with test+bench phases", async () => {
    const registry = await loadSkillLoopRegistry(SKILL_ROOT);
    expect(registry.version).toBe(2);
    const skills = listRegistrySkills(registry);
    expect(skills).toContain("ast-grep");
    expect(skills.length).toBeGreaterThanOrEqual(10);
    const entry = registry.skills["ast-grep"];
    expect(entry.phases.test?.enabled).toBe(true);
    expect(entry.phases.bench?.enabled).toBe(true);
    expect(entry.phases.rate?.enabled).toBe(true);
  });

  test("resolveSkillPhases filters disabled phases", () => {
    const entry = {
      path: ".agents/skills/foo",
      phases: {
        doctor: { enabled: true },
        test: { enabled: false },
        rate: { enabled: true },
      },
    };
    const phases = resolveSkillPhases(entry, ["doctor", "test", "rate"]);
    expect(phases).toEqual(["doctor", "rate"]);
  });

  test("formatSkillLoopStatus and herdr/json serializers", () => {
    const tick = {
      skillId: "ast-grep",
      reason: "initial" as const,
      phases: [
        { phase: "doctor" as const, ok: true, rating: 100, grade: "A" },
        { phase: "rate" as const, ok: true, rating: 95, grade: "A", detail: "overall rating=95 (A)" },
      ],
      rating: 95,
      grade: "A",
      at: Date.now(),
    };
    const status = formatSkillLoopStatus(tick);
    expect(status).toContain("skill=ast-grep");
    expect(status).toContain("rating=95");

    const herdr = formatSkillLoopHerdrTab(tick);
    expect(herdr.some((l) => l.includes("overall:"))).toBe(true);

    const json = JSON.parse(formatSkillLoopJson(tick));
    expect(json.tool).toBe("skill-loop");
    expect(json.summary.skillId).toBe("ast-grep");
    expect(fingerprintSkillLoopTick(tick)).toContain("ast-grep");
  });
});