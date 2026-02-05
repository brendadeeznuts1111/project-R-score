#!/usr/bin/env bun

/**
 * Logger Performance Benchmarks
 * Following Bun's benchmarking best practices
 */

import { bench, describe, expect } from "bun:test";
import { Logger } from "../src/Logger";
import { LogType } from "../src/types";
import { measureNanoseconds } from "./utils";

describe("Logger Performance", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({
      level: "INFO",
      enableFileLogging: false,
      enableConsoleLogging: true,
    });
  });

  describe("Log Entry Creation", () => {
    bench("debug log", () => {
      logger.debug("Test debug message");
    }, {
      iterations: 1_000,
    });

    bench("info log", () => {
      logger.info("Test info message");
    }, {
      iterations: 1_000,
    });

    bench("warn log", () => {
      logger.warn("Test warn message");
    }, {
      iterations: 1_000,
    });

    bench("error log", () => {
      logger.error("Test error message");
    }, {
      iterations: 1_000,
    });

    bench("critical log", () => {
      logger.critical("Test critical message");
    }, {
      iterations: 1_000,
    });
  });

  describe("Structured Logging", () => {
    bench("log with metadata", () => {
      logger.info("Test message", {
        feature: "FEAT_PREMIUM",
        userId: "123",
        action: "enable",
      });
    }, {
      iterations: 1_000,
    });

    bench("log with log type", () => {
      logger.log(LogType.FEATURE_CHANGE, "Feature changed", {
        flag: "FEAT_PREMIUM",
        enabled: true,
      });
    }, {
      iterations: 1_000,
    });

    bench("feature change log", () => {
      logger.logFeatureChange("FEAT_PREMIUM", true);
    }, {
      iterations: 1_000,
    });

    bench("security event log", () => {
      logger.logSecurityEvent("Security event occurred", {
        type: "access_denied",
        userId: "123",
      });
    }, {
      iterations: 1_000,
    });
  });

  describe("Log Level Filtering", () => {
    bench("filtered log (below threshold)", () => {
      // Logger is set to INFO level, so DEBUG should be filtered
      logger.debug("Filtered message");
    }, {
      iterations: 10_000,
    });

    bench("allowed log (at threshold)", () => {
      logger.info("Allowed message");
    }, {
      iterations: 10_000,
    });

    bench("allowed log (above threshold)", () => {
      logger.error("Allowed message");
    }, {
      iterations: 10_000,
    });
  });

  describe("Audit Trail Operations", () => {
    bench("audit log entry", () => {
      logger.logAudit("Audit event", {
        action: "flag_changed",
        user: "admin",
        timestamp: Date.now(),
      });
    }, {
      iterations: 1_000,
    });

    bench("get audit logs", () => {
      // First add some logs
      for (let i = 0; i < 100; i++) {
        logger.logAudit(`Audit ${i}`, { index: i });
      }
      logger.getAuditLogs();
    }, {
      iterations: 100,
    });
  });

  describe("Log Formatting", () => {
    bench("format log entry", () => {
      const entry = logger.createLogEntry(LogType.FEATURE_CHANGE, "Test", {
        feature: "FEAT_PREMIUM",
      });
      // Access the formatted entry
      entry.message;
    }, {
      iterations: 1_000,
    });

    bench("format with timestamp", () => {
      logger.info("Message with timestamp");
    }, {
      iterations: 1_000,
    });
  });

  describe("Microbenchmarks with Nanosecond Precision", () => {
    it("should measure info log with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        logger.info("Test message");
      });
      expect(duration).toBeLessThan(1); // Should be less than 1ms
    });

    it("should measure structured log with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        logger.info("Test message", { key: "value" });
      });
      expect(duration).toBeLessThan(1); // Should be less than 1ms
    });
  });
});

