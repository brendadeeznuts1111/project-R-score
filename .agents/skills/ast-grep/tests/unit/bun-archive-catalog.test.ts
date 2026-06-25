import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ARCHIVE_GLOB_RULES,
  BUN_ARCHIVE_CATALOG,
  BUN_ARCHIVE_GLOB_DOC,
  filterArchivePaths,
  formatArchiveCatalogMarkdown,
  matchArchiveGlob,
  normalizeArchivePath,
} from "../../scripts/scan/transpiler/bun-archive-catalog.ts";

const SAMPLE_PATHS = [
  "src/index.ts",
  "src/utils.test.ts",
  "lib/foo.js",
  "node_modules/lodash/index.js",
  "package.json",
] as const;

describe("Bun.Archive glob catalog", () => {
  test("catalog links to bun.com archive glob docs", () => {
    expect(BUN_ARCHIVE_GLOB_DOC).toBe(
      "https://bun.com/docs/runtime/archive#filtering-with-glob-patterns",
    );
    expect(BUN_ARCHIVE_CATALOG.methods.some((m) => m.name === "files" && m.glob)).toBe(true);
    expect(ARCHIVE_GLOB_RULES.some((r) => r.id === "exclude-node-modules")).toBe(true);
  });

  test("formatArchiveCatalogMarkdown includes glob recipes", () => {
    const md = formatArchiveCatalogMarkdown();
    expect(md).toContain("Bun.Archive");
    expect(md).toContain("exclude-node-modules");
    expect(md).toContain("!node_modules/**");
  });

  test("normalizeArchivePath uses forward slashes", () => {
    expect(normalizeArchivePath("src\\index.ts")).toBe("src/index.ts");
  });

  test("matchArchiveGlob positive and negative patterns", () => {
    expect(matchArchiveGlob("src/index.ts", "**/*.ts")).toBe(true);
    expect(matchArchiveGlob("lib/foo.js", "**/*.ts")).toBe(false);
    expect(matchArchiveGlob("node_modules/x/index.js", ["**", "!node_modules/**"])).toBe(false);
    expect(matchArchiveGlob("src/index.ts", ["**", "!node_modules/**"])).toBe(true);
    expect(matchArchiveGlob("src/index.ts", ["!node_modules/**"])).toBe(false);
  });

  test("filterArchivePaths matches catalog recipes", () => {
    const noTests = filterArchivePaths(SAMPLE_PATHS, ["src/**", "!**/*.test.ts"]);
    expect(noTests).toEqual(["src/index.ts"]);
    const noModules = filterArchivePaths(SAMPLE_PATHS, ["**", "!node_modules/**"]);
    expect(noModules).not.toContain("node_modules/lodash/index.js");
    expect(noModules).toContain("package.json");
  });
});

describe("Bun.Archive runtime glob", () => {
  test("files() filters TypeScript entries", async () => {
    const archive = new Bun.Archive({
      "src/index.ts": "export {}",
      "src/index.test.ts": "test",
      "node_modules/pkg/index.js": "x",
    });
    const bytes = await archive.bytes();
    const read = new Bun.Archive(bytes);
    const ts = await read.files("**/*.ts");
    expect([...ts.keys()].sort()).toEqual(["src/index.test.ts", "src/index.ts"]);
  });

  test("files() exclude node_modules with positive **", async () => {
    const archive = new Bun.Archive({
      "src/a.ts": "a",
      "node_modules/b/index.js": "b",
    });
    const read = new Bun.Archive(await archive.bytes());
    const filtered = await read.files(["**", "!node_modules/**"]);
    expect([...filtered.keys()]).toEqual(["src/a.ts"]);
  });

  test("extract() respects glob and skips test files", async () => {
    const archive = new Bun.Archive({
      "src/a.ts": "a",
      "src/b.test.ts": "b",
    });
    const read = new Bun.Archive(await archive.bytes());
    const dir = await mkdtemp(join(tmpdir(), "bun-archive-"));
    try {
      const count = await read.extract(dir, { glob: ["src/**", "!**/*.test.ts"] });
      expect(count).toBeGreaterThanOrEqual(1);
      const text = await readFile(join(dir, "src/a.ts"), "utf8");
      expect(text).toBe("a");
      expect(await Bun.file(join(dir, "src/b.test.ts")).exists()).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("files() returns empty Map for non-matching glob", async () => {
    const archive = new Bun.Archive({ "hello.txt": "hi" });
    const read = new Bun.Archive(await archive.bytes());
    const empty = await read.files("*.nonexistent");
    expect(empty.size).toBe(0);
  });
});