import { describe, expect, test } from "bun:test";
import {
  assembleWorkspaceRunCommand,
  BUN_RUNTIME_FILTER_DOC,
  BUN_WORKSPACE_FILTER_CATALOG,
  filterWorkspacePackages,
  formatWorkspaceFilterMarkdown,
  isPathFilterPattern,
  matchPackageNameFilter,
  matchPackagePathFilter,
  WORKSPACE_FILTER_RULES,
} from "../../scripts/scan/transpiler/bun-workspace-filter-catalog.ts";

const SAMPLE_PACKAGES = [
  { name: "foo", path: "packages/foo" },
  { name: "bar", path: "packages/bar" },
  { name: "baz", path: "packages/baz" },
  { name: "@projects/ast-grep-skill", path: ".agents/skills/ast-grep" },
] as const;

describe("bun workspace --filter catalog", () => {
  test("links to runtime filtering anchor", () => {
    expect(BUN_RUNTIME_FILTER_DOC).toBe("https://bun.com/docs/runtime#filtering");
    expect(BUN_WORKSPACE_FILTER_CATALOG.commands).toContainEqual(
      "bun run --filter <pattern> <script>",
    );
    expect(WORKSPACE_FILTER_RULES.some((r) => r.id === "name-prefix")).toBe(true);
  });

  test("formatWorkspaceFilterMarkdown includes parallel flag", () => {
    const md = formatWorkspaceFilterMarkdown();
    expect(md).toContain("--parallel");
    expect(md).toContain("name-prefix");
  });

  test("matchPackageNameFilter follows ba* example from docs", () => {
    expect(matchPackageNameFilter("ba*", "bar")).toBe(true);
    expect(matchPackageNameFilter("ba*", "baz")).toBe(true);
    expect(matchPackageNameFilter("ba*", "foo")).toBe(false);
    expect(matchPackageNameFilter("*", "anything")).toBe(true);
  });

  test("matchPackagePathFilter uses ./ prefix", () => {
    expect(isPathFilterPattern("./packages/*")).toBe(true);
    expect(isPathFilterPattern("pkg-*")).toBe(false);
    expect(matchPackagePathFilter("./packages/*", "packages/foo")).toBe(true);
    expect(matchPackagePathFilter("./packages/*", ".agents/skills/ast-grep")).toBe(false);
    expect(matchPackagePathFilter("./.agents/skills/*", ".agents/skills/ast-grep")).toBe(true);
  });

  test("filterWorkspacePackages supports negation", () => {
    const filtered = filterWorkspacePackages(SAMPLE_PACKAGES, ["*", "!foo"]);
    expect(filtered.map((p) => p.name)).not.toContain("foo");
    expect(filtered.length).toBe(3);
    expect(filtered.map((p) => p.name)).toContain("@projects/ast-grep-skill");
  });

  test("assembleWorkspaceRunCommand places flags before run", () => {
    const parallel = assembleWorkspaceRunCommand({
      script: "test",
      filter: "*",
      parallel: true,
    });
    expect(parallel.command).toEqual(["bun", "--parallel", "run", "--filter", "*", "test"]);

    const seq = assembleWorkspaceRunCommand({
      script: "build",
      workspaces: true,
      sequential: true,
      ifPresent: true,
    });
    expect(seq.command).toEqual([
      "bun", "--sequential", "run", "--if-present", "--workspaces", "build",
    ]);

    const shorthand = assembleWorkspaceRunCommand({
      script: "dev",
      filter: "*",
      shorthand: true,
    });
    expect(shorthand.command).toEqual(["bun", "--filter", "*", "dev"]);
  });
});