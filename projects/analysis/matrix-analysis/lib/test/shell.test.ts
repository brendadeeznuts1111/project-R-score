import { describe, it, expect } from "bun:test";
import { run, sh, shQuiet, lines, jsonOut, which, spawn, spawnAndWait } from "../src/core/shell.ts";
import type { RunResult } from "../src/core/shell.ts";

describe("shell", () => {
  describe("BN-020: run", () => {
    it("should capture stdout from a successful command", async () => {
      const result: RunResult = await run(["echo", "hello"]);
      expect(result.stdout.trim()).toBe("hello");
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
      expect(result.ok).toBe(true);
    });

    it("should capture stderr and non-zero exit code", async () => {
      const result = await run(["ls", "/nonexistent-path-xyz-12345"]);
      expect(result.ok).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it("should not throw on invalid command", async () => {
      const result = await run(["__nonexistent_binary_xyz__"]);
      expect(result.ok).toBe(false);
    });
  });

  describe("BN-021: sh template", () => {
    it("should execute simple command", async () => {
      const result = await sh`echo hello`;
      expect(result).toBe("hello");
    });

    it("should interpolate single argument", async () => {
      const name = "world";
      const result = await sh`echo ${name}`;
      expect(result).toBe("world");
    });

    it("should interpolate multiple arguments", async () => {
      const a = "foo";
      const b = "bar";
      const result = await sh`echo ${a} ${b}`;
      expect(result).toBe("foo bar");
    });

    it("should work with shQuiet", async () => {
      const result = await shQuiet`echo quiet`;
      expect(result).toBe("quiet");
    });
  });

  describe("BN-022: lines", () => {
    it("should split output into non-empty trimmed lines", () => {
      const output = "  foo  \nbar\n\n  baz  \n";
      expect(lines(output)).toEqual(["foo", "bar", "baz"]);
    });

    it("should return empty array for empty string", () => {
      expect(lines("")).toEqual([]);
    });

    it("should handle single line without newline", () => {
      expect(lines("hello")).toEqual(["hello"]);
    });
  });

  describe("BN-022: jsonOut", () => {
    it("should parse valid JSON", () => {
      const result = jsonOut<{ a: number }>('{"a": 1}');
      expect(result).toEqual({ a: 1 });
    });

    it("should return null for invalid JSON", () => {
      expect(jsonOut("not json")).toBeNull();
    });

    it("should parse arrays", () => {
      expect(jsonOut<number[]>("[1,2,3]")).toEqual([1, 2, 3]);
    });
  });

  describe("BN-023: which", () => {
    it("should find a known binary", () => {
      const path = which("bun");
      expect(path).not.toBeNull();
      expect(typeof path).toBe("string");
    });

    it("should return null for unknown binary", () => {
      expect(which("__nonexistent_binary_xyz__")).toBeNull();
    });

    it("should return null for empty string binary", () => {
      expect(which("")).toBeNull();
    });
  });

  describe("BN-113: Spawn", () => {
    it("should spawn a process and wait for it", async () => {
      const result = await spawnAndWait(["echo", "spawned"]);
      expect(result.ok).toBe(true);
      expect(result.stdout.trim()).toBe("spawned");
    });

    it("should return subprocess from spawn", () => {
      const proc = spawn(["echo", "test"]);
      expect(proc).not.toBeNull();
    });

    it("should handle failed spawn gracefully", async () => {
      const result = await spawnAndWait(["__nonexistent__"]);
      expect(result.ok).toBe(false);
    });
  });
});
