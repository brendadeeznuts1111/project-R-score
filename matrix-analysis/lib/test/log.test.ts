import { describe, it, expect, spyOn } from "bun:test";
import {
  createLogger,
  debug,
  info,
  warn,
  error,
  setLevel,
  measure,
  measureSafe,
  type Logger,
  type LogLevel,
} from "../src/core/log.ts";

describe("log", () => {
  describe("BN-087: Logger Instance", () => {
    it("should create logger with default level", () => {
      const log = createLogger();
      expect(typeof log.info).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.error).toBe("function");
      expect(typeof log.debug).toBe("function");
    });

    it("should filter messages below level", () => {
      const spy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "warn" });
      log.info("should not appear");
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should emit messages at or above level", () => {
      const spy = spyOn(console, "warn").mockImplementation(() => {});
      const log = createLogger({ level: "warn" });
      log.warn("should appear");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should route error to console.error", () => {
      const spy = spyOn(console, "error").mockImplementation(() => {});
      const log = createLogger({ level: "error" });
      log.error("bad thing");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should change level dynamically", () => {
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "error" });
      log.info("hidden");
      expect(logSpy).not.toHaveBeenCalled();
      log.setLevel("debug");
      log.info("visible");
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("should create child logger with prefix", () => {
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "info", prefix: "app" });
      const child = log.child("db");
      child.info("connected");
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("should support timestamps option", () => {
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "info", timestamps: false });
      log.info("no time");
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("should create child of child with compound prefix", () => {
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "debug", prefix: "app" });
      const child = log.child("db");
      const grandchild = child.child("pool");
      grandchild.debug("connected");
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("should emit debug when level is debug", () => {
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "debug" });
      log.debug("trace message");
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe("BN-088: Default Logger", () => {
    it("should export convenience functions", () => {
      expect(typeof debug).toBe("function");
      expect(typeof info).toBe("function");
      expect(typeof warn).toBe("function");
      expect(typeof error).toBe("function");
      expect(typeof setLevel).toBe("function");
    });
  });

  describe("BN-089: measure", () => {
    it("should return result and log timing", async () => {
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      const log = createLogger({ level: "info" });
      const result = await measure("test-op", async () => {
        await Bun.sleep(5);
        return 42;
      }, log);
      expect(result).toBe(42);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("should log error on failure", async () => {
      const errSpy = spyOn(console, "error").mockImplementation(() => {});
      const log = createLogger({ level: "info" });
      await expect(
        measure("fail-op", async () => { throw new Error("boom"); }, log)
      ).rejects.toThrow("boom");
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("measureSafe should return null on failure", async () => {
      const errSpy = spyOn(console, "error").mockImplementation(() => {});
      const result = await measureSafe("safe-fail", async () => { throw new Error("boom"); });
      expect(result).toBeNull();
      errSpy.mockRestore();
    });
  });
});
