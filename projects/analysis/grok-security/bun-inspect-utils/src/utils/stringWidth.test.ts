/**
 * [TEST][STRINGWIDTH][UTILITY]{BUN-API}
 * Tests for Bun.stringWidth() utilities
 */

import { describe, it, expect } from "bun:test";
import {
  stringWidth,
  stringWidthDetailed,
  padToWidth,
  truncateToWidth,
  centerToWidth,
  alignColumns,
} from "./stringWidth";

describe("[UTILITY][STRINGWIDTH]", () => {
  describe("stringWidth()", () => {
    it("should measure ASCII strings", () => {
      expect(stringWidth("hello")).toBe(5);
      expect(stringWidth("test")).toBe(4);
    });

    it("should handle emoji", () => {
      const width = stringWidth("👋");
      expect(width).toBeGreaterThan(0);
    });

    it("should handle empty strings", () => {
      expect(stringWidth("")).toBe(0);
    });

    // Bun 1.3+ improvements: Zero-width character support
    it("should handle zero-width characters correctly", () => {
      // Soft hyphen (U+00AD)
      expect(stringWidth("hello\u00ADworld")).toBe(10); // 0-width hyphen
      // Word joiner (U+2060)
      expect(stringWidth("hello\u2060world")).toBe(10); // 0-width joiner
    });

    // Bun 1.3+ improvements: Grapheme-aware emoji width
    it("should handle flag emoji correctly", () => {
      // Flag emoji are 2 width
      expect(stringWidth("🇺🇸")).toBe(2); // US flag
      expect(stringWidth("🇬🇧")).toBe(2); // UK flag
    });

    it("should handle emoji with skin tone modifiers", () => {
      // Emoji + skin tone modifier = 2 width
      expect(stringWidth("👋🏽")).toBe(2); // Wave + medium skin tone
      expect(stringWidth("👍🏿")).toBe(2); // Thumbs up + dark skin tone
    });

    it("should handle ZWJ sequences correctly", () => {
      // Zero-width joiner sequences = 2 width
      expect(stringWidth("👨‍👩‍👧")).toBe(2); // Family: man, woman, girl
      expect(stringWidth("👨‍💻")).toBe(2); // Man technologist
    });

    it("should ignore ANSI escape codes by default", () => {
      const colored = "\u001b[31mhello\u001b[0m"; // Red "hello"
      expect(stringWidth(colored)).toBe(5); // Just "hello"
    });

    it("should count ANSI escape codes when option enabled", () => {
      const colored = "\u001b[31mhello\u001b[0m"; // Red "hello"
      expect(stringWidth(colored, { countAnsiEscapeCodes: true })).toBe(12); // Includes escape sequences
    });

    it("should handle complex ANSI sequences", () => {
      const complex = "\u001b[1;32mGreen Bold\u001b[0m"; // Bold green text
      expect(stringWidth(complex)).toBe(10); // Just "Green Bold"
      expect(
        stringWidth(complex, { countAnsiEscapeCodes: true }),
      ).toBeGreaterThan(10);
    });
  });

  describe("stringWidthDetailed()", () => {
    it("should return detailed metrics", () => {
      const result = stringWidthDetailed("hello");
      expect(result.width).toBe(5);
      expect(result.length).toBe(5);
      expect(result.hasAnsi).toBe(false);
      expect(result.hasEmoji).toBe(false);
    });

    it("should detect ANSI codes", () => {
      const colored = "\x1b[36mhello\x1b[0m";
      const result = stringWidthDetailed(colored);
      expect(result.hasAnsi).toBe(true);
    });

    it("should detect emoji", () => {
      const result = stringWidthDetailed("hello 👋");
      expect(result.hasEmoji).toBe(true);
    });

    it("should count ANSI codes when option enabled", () => {
      const colored = "\u001b[31mhello\u001b[0m";
      const result = stringWidthDetailed(colored, {
        countAnsiEscapeCodes: true,
      });
      expect(result.hasAnsi).toBe(true);
      expect(result.width).toBe(12); // ANSI codes counted
    });

    it("should ignore ANSI codes by default in detailed metrics", () => {
      const colored = "\u001b[31mhello\u001b[0m";
      const result = stringWidthDetailed(colored);
      expect(result.hasAnsi).toBe(true);
      expect(result.width).toBe(5); // ANSI ignored
    });
  });

  describe("padToWidth()", () => {
    it("should pad strings", () => {
      const result = padToWidth("hi", 5);
      expect(stringWidth(result)).toBe(5);
    });

    it("should use custom pad char", () => {
      const result = padToWidth("hi", 5, "-");
      expect(result).toContain("-");
    });

    it("should not pad if already wide enough", () => {
      const result = padToWidth("hello", 3);
      expect(result).toBe("hello");
    });
  });

  describe("truncateToWidth()", () => {
    it("should truncate long strings", () => {
      const result = truncateToWidth("hello world", 8);
      expect(stringWidth(result)).toBeLessThanOrEqual(8);
    });

    it("should use custom suffix", () => {
      const result = truncateToWidth("hello world", 8, "...");
      expect(result).toContain("...");
    });

    it("should not truncate short strings", () => {
      const result = truncateToWidth("hi", 10);
      expect(result).toBe("hi");
    });
  });

  describe("centerToWidth()", () => {
    it("should center strings", () => {
      const result = centerToWidth("hi", 5);
      expect(stringWidth(result)).toBe(5);
    });

    it("should use custom pad char", () => {
      const result = centerToWidth("hi", 5, "-");
      expect(result).toContain("-");
    });
  });

  describe("alignColumns()", () => {
    it("should align columns", () => {
      const rows = [
        ["a", "bb"],
        ["ccc", "d"],
      ];
      const result = alignColumns(rows);
      expect(result.length).toBe(2);
    });

    it("should handle empty rows", () => {
      const result = alignColumns([]);
      expect(result.length).toBe(0);
    });

    it("should support different alignments", () => {
      const rows = [["a", "b"]];
      const left = alignColumns(rows, "left");
      const right = alignColumns(rows, "right");
      expect(left).toBeDefined();
      expect(right).toBeDefined();
    });
  });
});
