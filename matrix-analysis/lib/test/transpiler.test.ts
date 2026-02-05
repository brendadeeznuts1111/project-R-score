import { describe, it, expect } from "bun:test";
import {
  transpile,
  transpileAsync,
  transpileRepl,
  transpileReplAsync,
  scanImports,
  scanExports,
} from "../src/core/transpiler.ts";

describe("transpiler", () => {
  describe("BN-106: Transpile", () => {
    it("should strip TypeScript types", () => {
      const result = transpile("const x: number = 1;", "ts");
      expect(result).not.toBeNull();
      expect(result).toContain("const x = 1");
      expect(result).not.toContain(": number");
    });

    it("should transpile TSX", () => {
      const code = 'const el = <div className="test">hello</div>;';
      const result = transpile(code, "tsx");
      expect(result).not.toBeNull();
    });

    it("should return null for invalid code", () => {
      const result = transpile("const {{{{{", "ts");
      expect(result).toBeNull();
    });

    it("should transpile async", async () => {
      const result = await transpileAsync("const x: string = 'hi';", "ts");
      expect(result).not.toBeNull();
      expect(result).toContain("const x = ");
    });

    it("should return null for invalid async transpile", async () => {
      expect(await transpileAsync("const {{{{{", "ts")).toBeNull();
    });

    it("should return null for non-string async transpile", async () => {
      expect(await transpileAsync(null as any, "ts")).toBeNull();
    });
  });

  describe("BN-106b: Import/Export Scanning", () => {
    it("should scan imports", () => {
      const code = 'import { foo } from "bar";\nimport "baz";';
      const imports = scanImports(code, "ts");
      expect(imports.length).toBe(2);
      expect(imports.map((i) => i.path)).toContain("bar");
      expect(imports.map((i) => i.path)).toContain("baz");
    });

    it("should return empty for no imports", () => {
      expect(scanImports("const x = 1;", "ts")).toEqual([]);
    });

    it("should return empty for invalid import scan", () => {
      expect(scanImports("const {{{{{", "ts")).toEqual([]);
    });

    it("should return empty for non-string import scan", () => {
      expect(scanImports(null as any, "ts")).toEqual([]);
    });

    it("should scan exports", () => {
      const code = "export const a = 1;\nexport function b() {}\n";
      const exports = scanExports(code, "ts");
      expect(exports).toContain("a");
      expect(exports).toContain("b");
    });
  });

  describe("BN-106c: Options and REPL mode", () => {
    it("should accept options object with loader", () => {
      const result = transpile("const x = 1;", { loader: "ts" });
      expect(result).not.toBeNull();
      expect(result).toContain("const x = 1");
    });

    it("should transpile with replMode via transpileRepl", () => {
      const result = transpileRepl("const x = 10;", "ts");
      expect(result).not.toBeNull();
      expect(result).toContain("x");
    });

    it("should transpileReplAsync return non-null for valid code", async () => {
      const result = await transpileReplAsync("var y = 2;", "ts");
      expect(result).not.toBeNull();
    });
  });
});
