import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const skill = readFileSync(join(import.meta.dir, "SKILL.md"), "utf-8");

describe("plannotator-compound skill", () => {
  test("uses Plannotator data directory as the first-class source", () => {
    expect(skill).toContain("$PLANNOTATOR_DATA_DIR");
    expect(skill).toContain("~/.plannotator");
    expect(skill).toContain("*-denied.md");
  });

  test("defines a multi-phase research workflow", () => {
    expect(skill).toContain("## Phase 0:");
    expect(skill).toContain("## Phase 1: Inventory");
    expect(skill).toContain("## Phase 2: Map");
    expect(skill).toContain("## Phase 3: Reduce");
    expect(skill).toContain("## Phase 4: Generate the HTML Dashboard");
    expect(skill).toContain("## Phase 5: Summary");
    expect(skill).toContain("## Phase 6: Improvement Hook");
  });

  test("requires reading every denied file without skipping", () => {
    expect(skill).toContain("read EVERY");
    expect(skill).toContain("Do NOT skip any files");
  });

  test("produces a versioned HTML report", () => {
    expect(skill).toContain("compound-planning-report.html");
    expect(skill).toContain("compound-planning-report-v2.html");
  });

  test("supports an improvement hook for EnterPlanMode", () => {
    expect(skill).toContain("enterplanmode-improve-hook.txt");
    expect(skill).toContain("hooks/compound/");
  });

  test("bundles required reference files and assets", () => {
    expect(existsSync(join(import.meta.dir, "assets/report-template.html"))).toBe(true);
    expect(existsSync(join(import.meta.dir, "references/claude-code-fallback.md"))).toBe(true);
    expect(existsSync(join(import.meta.dir, "scripts/extract_exit_plan_mode_outcomes.py"))).toBe(true);
  });
});
