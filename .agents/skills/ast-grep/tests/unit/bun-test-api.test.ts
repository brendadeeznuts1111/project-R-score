import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { resolve } from "node:path";
import {
  BUN_TEST_API_CATALOG,
  BUN_TEST_API_REF,
  formatApiCatalogMarkdown,
  listMatcherNames,
} from "../../scripts/scan/transpiler/bun-test-api-catalog.ts";
import { MINIMAL_SCAN_REPORT } from "../fixtures/minimal-scan-report.ts";
import { buildTestIndex } from "../../scripts/scan/transpiler/test-runner.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");

describe("bun:test API catalog", () => {
  test("reference URL matches bun.com", () => {
    expect(BUN_TEST_API_REF).toBe("https://bun.com/reference/bun/test");
    expect(BUN_TEST_API_CATALOG.ref).toEndWith("/bun/test");
  });

  test("catalog lists core exports and object matchers", () => {
    expect(BUN_TEST_API_CATALOG.exports.map((e) => e.name)).toContainEqual("expect");
    expect(BUN_TEST_API_CATALOG.exports.map((e) => e.name)).toContainEqual("describe");
    expect(BUN_TEST_API_CATALOG.hooks.map((e) => e.name)).toContainEqual("beforeEach");
    expect(BUN_TEST_API_CATALOG.matcherGroups.object.map((m) => m.name)).toContainEqual("toContainAllKeys");
    expect(listMatcherNames()).toContain("toEqual");
  });

  test("every entry links to bun.com/reference", () => {
    const all = [
      ...BUN_TEST_API_CATALOG.exports,
      ...BUN_TEST_API_CATALOG.hooks,
      ...BUN_TEST_API_CATALOG.asymmetric,
      ...Object.values(BUN_TEST_API_CATALOG.matcherGroups).flat(),
    ];
    for (const e of all) {
      expect(e.ref).toStartWith("https://bun.com/reference/bun/test");
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeGreaterThan(0);
    }
  });

  test("formatApiCatalogMarkdown includes matcher groups", () => {
    const md = formatApiCatalogMarkdown();
    expect(md).toContain("bun:test API");
    expect(md).toContain("toContainAllKeys");
    expect(md).toContain("expect.objectContaining");
  });

  test("buildTestIndex embeds api catalog", async () => {
    const index = await buildTestIndex(SKILL_ROOT);
    expect(index.api.ref).toBe(BUN_TEST_API_REF);
    expect(index.api.skillUsage.length).toBeGreaterThan(0);
  });
});

describe("asymmetric matchers on scan report", () => {
  test("expect.objectContaining partial BundleScanReport", () => {
    expect(MINIMAL_SCAN_REPORT).toEqual(expect.objectContaining({
      profile: "supply-chain-pillars",
      layer: "4.5",
      summary: expect.objectContaining({ findings: 1 }),
      targets: expect.arrayContaining([
        expect.objectContaining({ id: "t", files_scanned: 1 }),
      ]),
    }));
  });

  test("expect.stringContaining on markdown paths", () => {
    expect(BUN_TEST_API_CATALOG.skillUsage.join(" ")).toEqual(
      expect.stringContaining("expect.objectContaining"),
    );
  });
});

describe("lifecycle hooks from bun:test", () => {
  let hookRan = false;
  beforeEach(() => { hookRan = true; });
  afterEach(() => { hookRan = false; });

  test("beforeEach ran", () => {
    expect(hookRan).toBe(true);
  });
});