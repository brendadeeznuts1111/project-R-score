import { describe, it, expect } from "bun:test";
import {
  strip,
  wrap,
  width,
  truncate,
  padEnd,
  padStart,
  center,
  COL_WIDTH,
  assertCol89,
  enforceCol89,
  escapeHtml,
  indexOfLine,
} from "../src/core/str.ts";

describe("str", () => {
  describe("BN-025: strip/wrap/width", () => {
    it("should strip ANSI codes", () => {
      expect(strip("\x1b[31mhello\x1b[0m")).toBe("hello");
    });

    it("should return plain text unchanged from strip", () => {
      expect(strip("hello")).toBe("hello");
    });

    it("should calculate visual width of plain text", () => {
      expect(width("hello")).toBe(5);
    });

    it("should calculate width ignoring ANSI codes", () => {
      expect(width("\x1b[31mhello\x1b[0m")).toBe(5);
    });

    it("should wrap text to specified columns", () => {
      const long = "a".repeat(200);
      const wrapped = wrap(long, 40);
      for (const line of wrapped.split("\n")) {
        expect(Bun.stringWidth(line)).toBeLessThanOrEqual(40);
      }
    });

    it("should default wrap to 89 columns", () => {
      const long = "word ".repeat(40);
      const wrapped = wrap(long);
      for (const line of wrapped.split("\n")) {
        expect(Bun.stringWidth(line)).toBeLessThanOrEqual(89);
      }
    });
  });

  describe("BN-026: truncate", () => {
    it("should not truncate short strings", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    it("should truncate long strings with ellipsis", () => {
      const long = "abcdefghijklmnop";
      const result = truncate(long, 10);
      expect(Bun.stringWidth(result)).toBeLessThanOrEqual(10);
      expect(result.endsWith("\u2026")).toBe(true);
    });

    it("should use custom ellipsis", () => {
      const result = truncate("abcdefghijklmnop", 10, "...");
      expect(Bun.stringWidth(result)).toBeLessThanOrEqual(10);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should handle emoji correctly", () => {
      const emoji = "Hello \u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}";
      const result = truncate(emoji, 10);
      expect(Bun.stringWidth(result)).toBeLessThanOrEqual(10);
    });
  });

  describe("BN-027: pad/align", () => {
    it("should pad end to target width", () => {
      const result = padEnd("hi", 10);
      expect(width(result)).toBe(10);
      expect(result).toBe("hi        ");
    });

    it("should pad start to target width", () => {
      const result = padStart("hi", 10);
      expect(width(result)).toBe(10);
      expect(result).toBe("        hi");
    });

    it("should center text", () => {
      const result = center("hi", 10);
      expect(width(result)).toBe(10);
      expect(result).toBe("    hi    ");
    });

    it("should not pad when already at or over target", () => {
      expect(padEnd("hello", 3)).toBe("hello");
      expect(padStart("hello", 3)).toBe("hello");
      expect(center("hello", 3)).toBe("hello");
    });

    it("should use custom fill character", () => {
      expect(padEnd("hi", 6, "-")).toBe("hi----");
      expect(padStart("hi", 6, "-")).toBe("----hi");
    });
  });

  describe("BN-028: Col-89 guard", () => {
    it("should export COL_WIDTH as 89", () => {
      expect(COL_WIDTH).toBe(89);
    });

    it("should return true for text within 89 cols", () => {
      expect(assertCol89("a".repeat(89))).toBe(true);
    });

    it("should return false for text over 89 cols", () => {
      expect(assertCol89("a".repeat(90), "test")).toBe(false);
    });

    it("should enforce col-89 by wrapping", () => {
      const long = "a".repeat(200);
      const result = enforceCol89(long);
      for (const line of result.split("\n")) {
        expect(Bun.stringWidth(line)).toBeLessThanOrEqual(89);
      }
    });
  });

  describe("BN-029: escapeHtml", () => {
    it("should escape HTML entities", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).not.toContain("<script>");
    });

    it("should escape ampersands and quotes", () => {
      const result = escapeHtml('a & "b" < c');
      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
    });

    it("should return plain text unchanged", () => {
      expect(escapeHtml("hello")).toBe("hello");
    });
  });

  describe("BN-029b: indexOfLine", () => {
    it("should find first newline from offset 0", () => {
      const buf = new TextEncoder().encode("hello\nworld\n");
      expect(indexOfLine(buf, 0)).toBe(5);
    });

    it("should find next newline from a given offset", () => {
      const buf = new TextEncoder().encode("abc\ndef\nghi\n");
      expect(indexOfLine(buf, 4)).toBe(7);
    });

    it("should return -1 when no newline exists", () => {
      const buf = new TextEncoder().encode("hello");
      expect(indexOfLine(buf)).toBe(-1);
    });

    it("should return -1 when past last newline", () => {
      const buf = new TextEncoder().encode("abc\n");
      expect(indexOfLine(buf, 4)).toBe(-1);
    });
  });
});
