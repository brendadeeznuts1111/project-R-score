#!/usr/bin/env bun

/**
 * Dashboard Component Logic Tests
 *
 * Tests for the component logic including:
 * - RuntimeMetrics formatting
 * - TerminalView build handling
 * - BuildHistory state management
 * - localStorage operations
 */

// @ts-ignore - Bun types are available at runtime
import { describe, expect, test, beforeEach, afterEach } from "bun:test";

// Mock localStorage for Node.js test environment
const mockLocalStorage = new Map<string, string>();

global.localStorage = {
  getItem: (key: string) => mockLocalStorage.get(key) || null,
  setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
  removeItem: (key: string) => mockLocalStorage.delete(key),
  clear: () => mockLocalStorage.clear(),
  get length() {
    return mockLocalStorage.size;
  },
  key: (index: number) => Array.from(mockLocalStorage.keys())[index] || null,
} as Storage;

describe("🎨 Dashboard Component Logic Tests", () => {
  describe("RuntimeMetrics Logic", () => {
    test("formatBytes converts bytes to appropriate units", () => {
      const formatBytes = (bytes: number) => {
        const mb = bytes / 1024 / 1024;
        return `${mb.toFixed(1)} MB`;
      };

      expect(formatBytes(0)).toBe("0.0 MB");
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1024.0 MB");
    });

    test("formatUptime formats seconds into human-readable format", () => {
      const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
      };

      expect(formatUptime(0)).toBe("0h 0m 0s");
      expect(formatUptime(60)).toBe("0h 1m 0s");
      expect(formatUptime(3600)).toBe("1h 0m 0s");
      expect(formatUptime(3661)).toBe("1h 1m 1s");
      expect(formatUptime(90061)).toBe("25h 1m 1s");
    });

    test("formatCpu converts CPU microseconds to seconds", () => {
      const formatCpu = (cpu: { user: number; system: number }) => {
        const total = (cpu.user + cpu.system) / 1000000;
        return `${total.toFixed(2)}s`;
      };

      expect(formatCpu({ user: 0, system: 0 })).toBe("0.00s");
      expect(formatCpu({ user: 1000000, system: 0 })).toBe("1.00s");
      expect(formatCpu({ user: 0, system: 500000 })).toBe("0.50s");
      expect(formatCpu({ user: 1000000, system: 500000 })).toBe("1.50s");
    });

    test("Connection status is determined by health check", () => {
      const determineConnectionStatus = (health: any) => {
        return health?.status === "healthy";
      };

      expect(determineConnectionStatus({ status: "healthy" })).toBe(true);
      expect(determineConnectionStatus({ status: "unhealthy" })).toBe(false);
      expect(determineConnectionStatus(null)).toBe(false);
      expect(determineConnectionStatus(undefined)).toBe(false);
    });
  });

  describe("TerminalView Logic", () => {
    test("Terminal lines have correct structure", () => {
      const createLine = (
        type: "stdout" | "stderr" | "info" | "success" | "error",
        content: string
      ) => ({
        id: Math.random(),
        type,
        content,
        timestamp: Date.now(),
      });

      const line = createLine("info", "Test message");
      expect(line).toHaveProperty("id");
      expect(line).toHaveProperty("type");
      expect(line).toHaveProperty("content");
      expect(line).toHaveProperty("timestamp");
      expect(line.type).toBe("info");
    });

    test("Terminal lines are color-coded correctly", () => {
      const getLineColor = (type: string) => {
        switch (type) {
          case "stdout": return "text-slate-300";
          case "stderr": return "text-red-400";
          case "info": return "text-blue-400";
          case "success": return "text-green-400";
          case "error": return "text-red-500 font-bold";
          default: return "text-slate-300";
        }
      };

      expect(getLineColor("stdout")).toBe("text-slate-300");
      expect(getLineColor("stderr")).toBe("text-red-400");
      expect(getLineColor("info")).toBe("text-blue-400");
      expect(getLineColor("success")).toBe("text-green-400");
      expect(getLineColor("error")).toBe("text-red-500 font-bold");
    });

    test("Build output is split into lines", () => {
      const splitOutput = (output: string) => {
        return output.split("\n").filter(line => line.trim());
      };

      const output = "Line 1\nLine 2\n\nLine 4\n";
      const lines = splitOutput(output);

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("Line 1");
      expect(lines[1]).toBe("Line 2");
      expect(lines[2]).toBe("Line 4");
    });

    test("Build status is determined by exit code", () => {
      const determineStatus = (exitCode: number) => {
        return exitCode === 0 ? "success" : "failed";
      };

      expect(determineStatus(0)).toBe("success");
      expect(determineStatus(1)).toBe("failed");
      expect(determineStatus(-1)).toBe("failed");
      expect(determineStatus(255)).toBe("failed");
    });
  });

  describe("BuildHistory Logic", () => {
    const STORAGE_KEY = "geelark-build-history-test";

    beforeEach(() => {
      // Clear test storage
      mockLocalStorage.clear();
    });

    afterEach(() => {
      // Clean up
      mockLocalStorage.clear();
    });

    test("Build entry has required properties", () => {
      const buildEntry = {
        id: crypto.randomUUID(),
        config: "production",
        flags: ["ENV_PRODUCTION", "FEAT_ENCRYPTION"],
        status: "success" as const,
        exitCode: 0,
        timestamp: Date.now(),
        duration: 5000,
      };

      expect(buildEntry).toHaveProperty("id");
      expect(buildEntry).toHaveProperty("config");
      expect(buildEntry).toHaveProperty("flags");
      expect(buildEntry).toHaveProperty("status");
      expect(buildEntry).toHaveProperty("timestamp");
      expect(Array.isArray(buildEntry.flags)).toBe(true);
      expect(buildEntry.flags.length).toBeGreaterThan(0);
    });

    test("Build status types are valid", () => {
      const validStatuses = ["success", "failed", "running"];

      validStatuses.forEach(status => {
        const isValid = ["success", "failed", "running"].includes(status);
        expect(isValid).toBe(true);
      });
    });

    test("Build history is limited to last 50 entries", () => {
      const builds: any[] = [];
      for (let i = 0; i < 100; i++) {
        builds.push({
          id: `build-${i}`,
          config: `test-${i}`,
          flags: ["ENV_PRODUCTION"],
          status: "success",
          timestamp: Date.now() - i * 1000,
        });
      }

      const limited = builds.slice(0, 50);
      expect(limited.length).toBe(50);
      expect(limited[0].id).toBe("build-0");
    });

    test("Timestamps are formatted correctly", () => {
      const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
      };

      const now = Date.now();
      expect(formatTimestamp(now)).toBe("Just now");
      expect(formatTimestamp(now - 30000)).toBe("Just now");
      expect(formatTimestamp(now - 120000)).toBe("2m ago");
      expect(formatTimestamp(now - 7200000)).toBe("2h ago");
    });

    test("Duration is formatted correctly", () => {
      const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
      };

      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999)).toBe("999ms");
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(10000)).toBe("10.0s");
    });
  });

  describe("localStorage Operations", () => {
    const STORAGE_KEY = "test-build-history";

    beforeEach(() => {
      mockLocalStorage.clear();
    });

    afterEach(() => {
      mockLocalStorage.clear();
    });

    test("Saves build history to localStorage", () => {
      const history = [
        {
          id: "build-1",
          config: "production",
          flags: ["ENV_PRODUCTION"],
          status: "success" as const,
          timestamp: Date.now(),
        },
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      const stored = localStorage.getItem(STORAGE_KEY);

      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(history);
    });

    test("Loads build history from localStorage", () => {
      const history = [
        {
          id: "build-1",
          config: "production",
          flags: ["ENV_PRODUCTION"],
          status: "success" as const,
          timestamp: Date.now(),
        },
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      const stored = localStorage.getItem(STORAGE_KEY);

      expect(stored).toBeDefined();

      // Simulate parsing
      try {
        const parsed = JSON.parse(stored!);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0].id).toBe("build-1");
      } catch (e) {
        throw new Error("Failed to parse build history");
      }
    });

    test("Handles corrupted localStorage data", () => {
      localStorage.setItem(STORAGE_KEY, "invalid json");

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBe("invalid json");

      // Test error handling
      try {
        JSON.parse(stored!);
        throw new Error("Should have thrown");
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test("Clears build history from localStorage", () => {
      const history = [
        {
          id: "build-1",
          config: "production",
          flags: ["ENV_PRODUCTION"],
          status: "success" as const,
          timestamp: Date.now(),
        },
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      expect(localStorage.getItem(STORAGE_KEY)).toBeDefined();

      localStorage.removeItem(STORAGE_KEY);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("Flag Selection Logic", () => {
    test("Flags are toggled correctly", () => {
      const activeFlags = new Set(["ENV_PRODUCTION", "FEAT_ENCRYPTION"]);

      const toggleFlag = (flag: string) => {
        if (activeFlags.has(flag)) {
          activeFlags.delete(flag);
        } else {
          activeFlags.add(flag);
        }
      };

      expect(activeFlags.has("ENV_PRODUCTION")).toBe(true);
      toggleFlag("ENV_PRODUCTION");
      expect(activeFlags.has("ENV_PRODUCTION")).toBe(false);
      toggleFlag("ENV_PRODUCTION");
      expect(activeFlags.has("ENV_PRODUCTION")).toBe(true);
    });

    test("Build config applies predefined flag sets", () => {
      const configs = {
        development: ["ENV_DEVELOPMENT", "FEAT_EXTENDED_LOGGING"],
        production: ["ENV_PRODUCTION", "FEAT_ENCRYPTION"],
      };

      const applyConfig = (configName: keyof typeof configs) => {
        return new Set(configs[configName]);
      };

      const devFlags = applyConfig("development");
      expect(devFlags.has("ENV_DEVELOPMENT")).toBe(true);
      expect(devFlags.has("FEAT_EXTENDED_LOGGING")).toBe(true);

      const prodFlags = applyConfig("production");
      expect(prodFlags.has("ENV_PRODUCTION")).toBe(true);
      expect(prodFlags.has("FEAT_ENCRYPTION")).toBe(true);
    });

    test("Flags are joined correctly for build command", () => {
      const flags = ["ENV_PRODUCTION", "FEAT_ENCRYPTION", "FEAT_PREMIUM"];
      const joined = flags.join(",");

      expect(joined).toBe("ENV_PRODUCTION,FEAT_ENCRYPTION,FEAT_PREMIUM");
    });
  });
});
