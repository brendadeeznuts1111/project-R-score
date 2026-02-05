import { describe, it, expect } from "bun:test";
import { json, json5, toml, jsonl, jsonlChunk, loadFile, toJsonl, json5Stringify, yaml, jsonc, loadFileV2 } from "../src/core/parse.ts";

describe("parse", () => {
  describe("BN-030: json", () => {
    it("should parse valid JSON", () => {
      expect(json<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
    });

    it("should return null for invalid JSON", () => {
      expect(json("not json")).toBeNull();
    });

    it("should parse arrays", () => {
      expect(json<number[]>("[1,2,3]")).toEqual([1, 2, 3]);
    });
  });

  describe("BN-030: json5", () => {
    it("should parse JSON5 with comments", () => {
      const input = '{ "a": 1, /* comment */ "b": 2 }';
      expect(json5<{ a: number; b: number }>(input)).toEqual({ a: 1, b: 2 });
    });

    it("should parse JSON5 with trailing commas", () => {
      expect(json5<{ a: number }>('{ "a": 1, }')).toEqual({ a: 1 });
    });

    it("should return null for invalid input", () => {
      expect(json5(":::")).toBeNull();
    });
  });

  describe("BN-030: toml", () => {
    it("should parse valid TOML", () => {
      const input = '[section]\nkey = "value"';
      expect(toml<{ section: { key: string } }>(input)).toEqual({
        section: { key: "value" },
      });
    });

    it("should parse TOML numbers", () => {
      expect(toml<{ port: number }>("port = 3000")).toEqual({ port: 3000 });
    });

    it("should return null for invalid TOML", () => {
      expect(toml("= = = invalid")).toBeNull();
    });
  });

  describe("BN-030: jsonl", () => {
    it("should parse newline-delimited JSON", () => {
      const input = '{"a":1}\n{"a":2}\n';
      expect(jsonl<{ a: number }>(input)).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it("should return null for invalid JSONL", () => {
      expect(jsonl("not\nvalid\njsonl")).toBeNull();
    });
  });

  describe("BN-030: jsonlChunk", () => {
    it("should parse a chunk of JSONL", () => {
      const chunk = '{"x":1}\n{"x":2}\n';
      const result = jsonlChunk<{ x: number }>(chunk);
      expect(result.values.length).toBe(2);
      expect(result.values[0]).toEqual({ x: 1 });
      expect(result.done).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("BN-031: loadFile", () => {
    it("should return null for nonexistent file", async () => {
      expect(await loadFile("/nonexistent/file.json")).toBeNull();
    });

    it("should return null for unsupported extension", async () => {
      const tmpPath = "/tmp/test-parse-unsupported.txt";
      await Bun.write(tmpPath, "hello");
      expect(await loadFile(tmpPath)).toBeNull();
    });

    it("should load and parse a JSON file", async () => {
      const tmpPath = "/tmp/test-parse-load.json";
      await Bun.write(tmpPath, '{"loaded": true}');
      const result = await loadFile<{ loaded: boolean }>(tmpPath);
      expect(result).toEqual({ loaded: true });
    });

    it("should load and parse a TOML file", async () => {
      const tmpPath = "/tmp/test-parse-load.toml";
      await Bun.write(tmpPath, 'name = "test"');
      const result = await loadFile<{ name: string }>(tmpPath);
      expect(result).toEqual({ name: "test" });
    });

    it("should return null for corrupted JSON file", async () => {
      const tmpPath = "/tmp/test-parse-corrupted.json";
      await Bun.write(tmpPath, "{{{{not json at all}}}}");
      expect(await loadFile(tmpPath)).toBeNull();
    });
  });

  describe("BN-033: yaml", () => {
    it("should parse valid YAML", () => {
      const input = "name: test\nport: 3000\n";
      const result = yaml<{ name: string; port: number }>(input);
      expect(result).toEqual({ name: "test", port: 3000 });
    });

    it("should parse YAML arrays", () => {
      const input = "- one\n- two\n- three\n";
      expect(yaml<string[]>(input)).toEqual(["one", "two", "three"]);
    });

    it("should return null for invalid YAML", () => {
      expect(yaml("key: [unclosed bracket")).toBeNull();
    });
  });

  describe("BN-033: jsonc", () => {
    it("should parse JSON with comments", () => {
      const input = '{ "a": 1 /* comment */ }';
      expect(jsonc<{ a: number }>(input)).toEqual({ a: 1 });
    });

    it("should parse JSON with line comments", () => {
      const input = '{\n  // comment\n  "b": 2\n}';
      expect(jsonc<{ b: number }>(input)).toEqual({ b: 2 });
    });

    it("should return null for invalid input", () => {
      expect(jsonc("not valid json at all {{{")).toBeNull();
    });
  });

  describe("BN-034: loadFileV2", () => {
    it("should load YAML file", async () => {
      const path = "/tmp/test-parse-v2.yaml";
      await Bun.write(path, "name: yaml-test\n");
      const result = await loadFileV2<{ name: string }>(path);
      expect(result).toEqual({ name: "yaml-test" });
    });

    it("should load JSONC file", async () => {
      const path = "/tmp/test-parse-v2.jsonc";
      await Bun.write(path, '{ "c": 3 /* comment */ }');
      const result = await loadFileV2<{ c: number }>(path);
      expect(result).toEqual({ c: 3 });
    });

    it("should fall back to base parsers for JSON", async () => {
      const path = "/tmp/test-parse-v2-json.json";
      await Bun.write(path, '{"v2": true}');
      const result = await loadFileV2<{ v2: boolean }>(path);
      expect(result).toEqual({ v2: true });
    });
  });

  describe("BN-032: toJsonl", () => {
    it("should serialize array to newline-delimited JSON", () => {
      const result = toJsonl([{ a: 1 }, { a: 2 }]);
      expect(result).toBe('{"a":1}\n{"a":2}\n');
    });

    it("should handle empty array", () => {
      expect(toJsonl([])).toBe("\n");
    });

    it("should handle mixed types", () => {
      const result = toJsonl([1, "two", true]);
      expect(result).toBe('1\n"two"\ntrue\n');
    });
  });

  describe("BN-032: json5Stringify", () => {
    it("should stringify object to JSON5", () => {
      const out = json5Stringify({ a: 1, b: 2 });
      expect(out).toContain("a");
      expect(out).toContain("b");
      expect(json5(out)).toEqual({ a: 1, b: 2 });
    });

    it("should round-trip with json5 parse", () => {
      const obj = { name: "test", port: 3000 };
      expect(json5(json5Stringify(obj))).toEqual(obj);
    });
  });
});
