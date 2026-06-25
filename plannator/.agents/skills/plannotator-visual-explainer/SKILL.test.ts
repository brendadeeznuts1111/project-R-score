import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const skill = readFileSync(join(import.meta.dir, "SKILL.md"), "utf-8");

describe("plannotator-visual-explainer skill", () => {
  test("routes by content type", () => {
    expect(skill).toContain("## Plan path");
    expect(skill).toContain("## PR path");
    expect(skill).toContain("## Visual explainer path");
  });

  test("delivers via Plannotator annotate command", () => {
    expect(skill).toContain("plannotator annotate");
    expect(skill).toContain("--gate");
  });

  test("reads Plannotator design references", () => {
    expect(skill).toContain("references/design-system.md");
    expect(skill).toContain("references/svg-patterns.md");
    expect(skill).toContain("references/pr-components.md");
  });

  test("delegates general visual content to visual-explainer", () => {
    expect(skill).toContain("nicobailon/visual-explainer");
    expect(skill).toContain("references/theme-override.md");
  });

  test("prescribes no time estimates", () => {
    expect(skill).toContain("No time estimates");
  });

  test("bundles required reference files", () => {
    expect(existsSync(join(import.meta.dir, "references/design-system.md"))).toBe(true);
    expect(existsSync(join(import.meta.dir, "references/svg-patterns.md"))).toBe(true);
    expect(existsSync(join(import.meta.dir, "references/pr-components.md"))).toBe(true);
    expect(existsSync(join(import.meta.dir, "references/theme-override.md"))).toBe(true);
  });
});
