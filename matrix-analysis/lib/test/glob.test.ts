import { describe, it, expect } from "bun:test";
import { match, filter, some, matcher } from "../src/core/glob.ts";

describe("glob", () => {
  describe("BN-109: Pattern Matching", () => {
    it("should match simple patterns", () => {
      expect(match("*.ts", "app.ts")).toBe(true);
      expect(match("*.ts", "app.js")).toBe(false);
    });

    it("should match with wildcards", () => {
      expect(match("src/**/*.ts", "src/lib/utils.ts")).toBe(true);
      expect(match("src/**/*.ts", "test/utils.ts")).toBe(false);
    });

    it("should filter array of paths", () => {
      const files = ["a.ts", "b.js", "c.ts", "d.json"];
      const result = filter("*.ts", files);
      expect(result).toEqual(["a.ts", "c.ts"]);
    });

    it("should check if any match", () => {
      expect(some("*.ts", ["a.js", "b.ts"])).toBe(true);
      expect(some("*.ts", ["a.js", "b.json"])).toBe(false);
    });

    it("should create reusable matcher", () => {
      const isTs = matcher("*.ts");
      expect(isTs("app.ts")).toBe(true);
      expect(isTs("app.js")).toBe(false);
      expect(isTs("lib.ts")).toBe(true);
    });
  });
});
