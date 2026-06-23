/** Sequential unit tests — autofix helpers; keep in tests/unit/ (not concurrentTestGlob). */
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { applyRuleToSource } from "../../scripts/scan/transpiler/autofix.ts";
import { collectWatchPaths } from "../../scripts/scan/transpiler/watch.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");

describe("supply-chain watch + autofix", () => {
  test("applyRuleToSource strips zero-width chars", () => {
    const bad = "const x = '\u200Bhello\uFEFF';";
    const rule = {
      id: "zero-width-char",
      description: "strip",
      pattern: "[\\u200B-\\u200D\\uFEFF]",
      replacement: "",
    };
    const { next, changed } = applyRuleToSource(bad, rule, new Set(["zero-width-char"]));
    expect(changed).toBe(true);
    expect(next).toBe("const x = 'hello';");
  });

  test("applyRuleToSource replaces hardcoded-secret with env", () => {
    const bad = "const api_key = 'abcdefghijklmnop';";
    const rule = {
      id: "hardcoded-secret",
      description: "env",
      pattern: "((api[_-]?key|token|secret|password)\\s*[:=]\\s*)['\"][a-zA-Z0-9_\\-]{8,}['\"]",
      replacement: "",
    };
    const { next, changed } = applyRuleToSource(bad, rule, new Set(["hardcoded-secret"]));
    expect(changed).toBe(true);
    expect(next).toContain("process.env.");
    expect(next).not.toContain("abcdefghijklmnop");
  });

  test("collectWatchPaths includes transpiler scripts", async () => {
    const repo = resolve(SKILL_ROOT, "../../..");
    const paths = await collectWatchPaths({
      repo,
      watchPath: ".agents/skills/ast-grep/scripts",
    });
    expect(paths.some((p) => p.endsWith("scan-packages.ts"))).toBe(true);
  });
});