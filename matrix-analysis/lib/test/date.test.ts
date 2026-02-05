import { describe, it, expect } from "bun:test";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatISO,
  formatTimestamp,
  formatMs,
  formatNs,
  formatDuration,
  formatRelative,
  parseTimestamp,
  isValidDate,
  toUnix,
  fromUnix,
  addMs,
  addSeconds,
  addMinutes,
  addHours,
  addDays,
  diffMs,
  isBefore,
  isAfter,
  isSameDay,
  now,
  today,
} from "../src/core/date.ts";

describe("date", () => {
  const fixed = new Date("2025-06-15T14:30:45.123Z");

  describe("BN-080: Core Formatters", () => {
    it("should format date as YYYY-MM-DD", () => {
      const result = formatDate(fixed);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should format time as HH:MM:SS", () => {
      const result = formatTime(fixed);
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("should format datetime", () => {
      const result = formatDateTime(fixed);
      expect(result).toContain(" ");
      expect(result.split(" ").length).toBe(2);
    });

    it("should format ISO string", () => {
      expect(formatISO(fixed)).toBe("2025-06-15T14:30:45.123Z");
    });

    it("should format timestamp without T", () => {
      const result = formatTimestamp(fixed);
      expect(result).toContain(" ");
      expect(result).not.toContain("T");
    });

    it("should accept number input", () => {
      expect(formatDate(fixed.getTime())).toBe(formatDate(fixed));
    });

    it("should default to now", () => {
      expect(formatDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("BN-081: Duration Formatting", () => {
    it("should format microseconds", () => {
      expect(formatMs(0.5)).toContain("\u00B5s");
    });

    it("should format milliseconds", () => {
      expect(formatMs(42)).toContain("ms");
    });

    it("should format seconds", () => {
      expect(formatMs(2500)).toContain("s");
    });

    it("should format minutes", () => {
      expect(formatMs(90000)).toContain("m");
    });

    it("should format nanoseconds", () => {
      expect(formatNs(500)).toContain("ns");
      expect(formatNs(5000000)).toContain("ms");
    });

    it("should format duration in seconds", () => {
      expect(formatDuration(45)).toBe("45s");
      expect(formatDuration(90)).toBe("1m 30s");
      expect(formatDuration(3661)).toBe("1h 1m 1s");
    });
  });

  describe("BN-082: Relative Time", () => {
    it("should say just now for recent", () => {
      expect(formatRelative(Date.now() - 2000)).toBe("just now");
    });

    it("should format seconds ago", () => {
      expect(formatRelative(Date.now() - 30000)).toContain("second");
    });

    it("should format minutes ago", () => {
      expect(formatRelative(Date.now() - 120000)).toContain("minute");
    });

    it("should format hours ago", () => {
      expect(formatRelative(Date.now() - 7200000)).toContain("hour");
    });

    it("should format future times", () => {
      expect(formatRelative(Date.now() + 60000)).toContain("in ");
    });

    it("should pluralize correctly", () => {
      expect(formatRelative(Date.now() - 60000)).toContain("minute ago");
      expect(formatRelative(Date.now() - 120000)).toContain("minutes ago");
    });
  });

  describe("BN-083: Parse & Validate", () => {
    it("should parse valid ISO string", () => {
      const d = parseTimestamp("2025-06-15T14:30:45.123Z");
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2025);
    });

    it("should return null for invalid input", () => {
      expect(parseTimestamp("not a date")).toBeNull();
    });

    it("should validate dates", () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date("invalid"))).toBe(false);
    });

    it("should convert to/from unix", () => {
      const unix = toUnix(fixed);
      expect(typeof unix).toBe("number");
      const back = fromUnix(unix);
      expect(Math.abs(back.getTime() - fixed.getTime())).toBeLessThan(1000);
    });
  });

  describe("BN-084: Arithmetic & Comparison", () => {
    it("should add time units", () => {
      const base = new Date("2025-01-01T00:00:00Z");
      expect(addSeconds(base, 30).getUTCSeconds()).toBe(30);
      expect(addMinutes(base, 5).getUTCMinutes()).toBe(5);
      expect(addHours(base, 2).getUTCHours()).toBe(2);
      expect(addDays(base, 1).getUTCDate()).toBe(2);
    });

    it("should compute diff", () => {
      const a = new Date("2025-01-02T00:00:00Z");
      const b = new Date("2025-01-01T00:00:00Z");
      expect(diffMs(a, b)).toBe(86400000);
    });

    it("should compare dates", () => {
      const a = new Date("2025-01-01");
      const b = new Date("2025-01-02");
      expect(isBefore(a, b)).toBe(true);
      expect(isAfter(b, a)).toBe(true);
    });

    it("should check same day", () => {
      const a = new Date("2025-06-15T10:00:00");
      const b = new Date("2025-06-15T22:00:00");
      const c = new Date("2025-06-16T10:00:00");
      expect(isSameDay(a, b)).toBe(true);
      expect(isSameDay(a, c)).toBe(false);
    });

    it("now() should return a Date", () => {
      expect(now()).toBeInstanceOf(Date);
    });

    it("today() should match formatDate()", () => {
      expect(today()).toBe(formatDate());
    });
  });

  describe("BN-081b: formatDuration edge cases", () => {
    it("should return '0s' for negative values", () => {
      expect(formatDuration(-100)).toBe("0s");
      expect(formatDuration(-1)).toBe("0s");
    });

    it("should return '0s' for NaN", () => {
      expect(formatDuration(NaN)).toBe("0s");
    });

    it("should return '0s' for Infinity", () => {
      expect(formatDuration(Infinity)).toBe("0s");
      expect(formatDuration(-Infinity)).toBe("0s");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0s");
    });
  });
});
