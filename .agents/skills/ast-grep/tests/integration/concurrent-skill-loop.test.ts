import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  loadSkillLoopRegistry,
  runSkillLoopMatrix,
  runSkillLoopOnce,
} from "../../scripts/scan/transpiler/skill-loop.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("skill-loop integration", () => {
  test("repo-map anchors resolve from a warning-safe symbol index", async () => {
    const runAnchors = async () => {
      const proc = Bun.spawn(
        [
          "python3",
          resolve(SKILL_ROOT, "scripts/ast_grep_helper.py"),
          "anchors",
          "--zone",
          "agents",
          "--fail-on",
        ],
        {
          cwd: REPO_ROOT,
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { stdout, stderr, code };
    };

    const first = await runAnchors();
    expect(first.code, first.stderr).toBe(0);
    expect(first.stdout).toContain("anchors: 4 checked, 0 missing");

    const cached = await runAnchors();
    expect(cached.code, cached.stderr).toBe(0);
    expect(cached.stdout).toContain("anchors: 4 checked, 0 missing");
    expect(cached.stderr).not.toContain("[ast-grep-helper] exec:");
  });

  test("matrix doctor+rate across registry skills", async () => {
    const registry = await loadSkillLoopRegistry(SKILL_ROOT);
    const ids = Object.keys(registry.skills).slice(0, 4);
    const ticks = await runSkillLoopMatrix({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      skillIds: ids,
      phases: ["doctor", "rate"],
      onTick: () => {},
    });
    expect(ticks.length).toBe(ids.length);
    for (const t of ticks) {
      expect(t.rating).toBeGreaterThanOrEqual(0);
      expect(t.phases.some((p) => p.phase === "doctor")).toBe(true);
      expect(t.phases.some((p) => p.phase === "rate")).toBe(true);
    }
  });

  test("ast-grep doctor phase passes (SKILL.md, no smoke)", async () => {
    const tick = await runSkillLoopOnce({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      skillId: "ast-grep",
      phases: ["doctor", "rate"],
      onTick: () => {},
    });
    const doctor = tick.phases.find((p) => p.phase === "doctor");
    expect(doctor?.ok).toBe(true);
    expect(tick.rating).toBeGreaterThanOrEqual(70);
  });
});
