import { describe, it, expect } from "bun:test";
import {
  main,
  isMain,
  argv,
  cwd,
  version,
  revision,
  sleep,
  sleepSync,
  resolveSync,
  pathToFileURL,
  fileURLToPath,
  openInEditor,
  which,
} from "../src/core/runtime.ts";

describe("runtime", () => {
  describe("BN-090: Runtime Info", () => {
    it("should return main entry path", () => {
      expect(typeof main()).toBe("string");
      expect(main().length).toBeGreaterThan(0);
    });

    it("should check if module is main", () => {
      expect(typeof isMain(import.meta)).toBe("boolean");
    });

    it("should return argv array", () => {
      const args = argv();
      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
    });

    it("should return current working directory", () => {
      expect(typeof cwd()).toBe("string");
      expect(cwd().length).toBeGreaterThan(0);
    });

    it("should return Bun version string", () => {
      expect(version()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("should return Bun revision string", () => {
      expect(typeof revision()).toBe("string");
      expect(revision().length).toBeGreaterThan(0);
    });
  });

  describe("BN-091: Sleep", () => {
    it("should async sleep", async () => {
      const t0 = Bun.nanoseconds();
      await sleep(10);
      const elapsed = (Bun.nanoseconds() - t0) / 1e6;
      expect(elapsed).toBeGreaterThanOrEqual(5);
    });

    it("should sync sleep", () => {
      const t0 = Bun.nanoseconds();
      sleepSync(10);
      const elapsed = (Bun.nanoseconds() - t0) / 1e6;
      expect(elapsed).toBeGreaterThanOrEqual(5);
    });
  });

  describe("BN-092: Module Resolution", () => {
    it("should resolve bun:test", () => {
      const resolved = resolveSync("bun:test");
      expect(resolved).not.toBeNull();
    });

    it("should return null for nonexistent module", () => {
      expect(resolveSync("@nonexistent/fake-module-xyz")).toBeNull();
    });

    it("should convert path to file URL", () => {
      const url = pathToFileURL("/tmp/test.txt");
      expect(url.protocol).toBe("file:");
      expect(url.pathname).toBe("/tmp/test.txt");
    });

    it("should convert file URL to path", () => {
      const path = fileURLToPath("file:///tmp/test.txt");
      expect(path).toBe("/tmp/test.txt");
    });

    it("should roundtrip path <-> URL", () => {
      const original = "/Users/test/file.ts";
      const roundtripped = fileURLToPath(pathToFileURL(original));
      expect(roundtripped).toBe(original);
    });
  });

  describe("BN-093: System", () => {
    it("should find bun executable", () => {
      expect(which("bun")).not.toBeNull();
    });

    it("should return null for nonexistent command", () => {
      expect(which("nonexistent-command-xyz-123")).toBeNull();
    });

    it("should export openInEditor function", () => {
      expect(typeof openInEditor).toBe("function");
    });
  });
});
