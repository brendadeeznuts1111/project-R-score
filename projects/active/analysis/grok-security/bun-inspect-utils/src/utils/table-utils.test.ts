/**
 * [TEST][TABLE-UTILS][UNIT]{BUN-NATIVE}
 * Tests for table utility functions
 */

import { describe, it, expect } from "bun:test";
import {
  enforceTable,
  aiSuggestColumns,
  aiSuggestCommonColumns,
  unicodeSafeWidth,
  computeColumnWidths,
  toHTMLTable,
  validateTableData,
  compareTableData,
  calculateColumnWidths,
  type TableRow,
  type EnforceTableOptions,
} from "./table-utils";

describe("table-utils", () => {
  const sampleData = [
    {
      id: "1",
      name: "Alice",
      email: "alice@example.com",
      status: "active",
      createdAt: "2024-01-01",
      owner: "admin",
    },
    {
      id: "2",
      name: "Bob",
      email: "bob@example.com",
      status: "inactive",
      createdAt: "2024-01-02",
      owner: "user",
    },
  ];

  describe("enforceTable", () => {
    it("should format table with valid columns", () => {
      const columns = ["id", "name", "email", "status", "createdAt", "owner"];
      const result = enforceTable(sampleData, columns);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should throw error when columns < 6", () => {
      const columns = ["id", "name"];
      expect(() => enforceTable(sampleData, columns)).toThrow("≥6 columns");
    });

    it("should handle empty data", () => {
      const columns = ["id", "name", "email", "status", "createdAt", "owner"];
      const result = enforceTable([], columns);
      expect(result).toBeTruthy();
    });

    it("should detect row structure mismatch (strict)", () => {
      const inconsistentData: TableRow[] = [
        { id: "1", name: "Alice", email: "a@a.com", status: "active", date: "2024", owner: "admin" },
        { id: "2", name: "Bob", email: "b@b.com", status: "active", extra: "field", owner: "user" },
      ];
      const columns = ["id", "name", "email", "status", "date", "owner"];
      expect(() => enforceTable(inconsistentData, columns)).toThrow("mismatch");
    });

    it("should accept options with sortByWidth", () => {
      const columns = ["id", "name", "email", "status", "createdAt", "owner"];
      const options: EnforceTableOptions = { sortByWidth: false, colors: false };
      const result = enforceTable(sampleData, columns, options);
      expect(result).toBeTruthy();
    });
  });

  describe("aiSuggestColumns", () => {
    it("should suggest columns from object", () => {
      const sample = {
        id: "1",
        name: "Test",
        email: "test@example.com",
        status: "active",
        timestamp: "2024-01-01",
        owner: "admin",
      };
      const suggested = aiSuggestColumns(sample);
      expect(suggested.length).toBeGreaterThan(0);
      expect(suggested).toContain("id");
      expect(suggested).toContain("name");
    });

    it("should include semantic extras", () => {
      const sample = {
        randomField: "value",
        id: "1",
        name: "Test",
        email: "test@example.com",
      };
      const suggested = aiSuggestColumns(sample);
      // Should include default extras
      expect(suggested).toContain("timestamp");
      expect(suggested).toContain("owner");
      expect(suggested).toContain("metrics");
      expect(suggested).toContain("tags");
    });

    it("should allow custom extras", () => {
      const sample = { id: "1", name: "Test" };
      const suggested = aiSuggestColumns(sample, ["custom1", "custom2"]);
      expect(suggested).toContain("custom1");
      expect(suggested).toContain("custom2");
    });

    it("should return extras for non-objects", () => {
      const defaultExtras = ["timestamp", "owner", "metrics", "tags"];
      expect(aiSuggestColumns(null)).toEqual(defaultExtras);
      expect(aiSuggestColumns("string")).toEqual(defaultExtras);
      expect(aiSuggestColumns(123)).toEqual(defaultExtras);
    });
  });

  describe("aiSuggestCommonColumns", () => {
    it("should find common columns across rows", () => {
      const diverseData: TableRow[] = [
        { id: "1", name: "Alice", score: 95, status: "active" },
        { id: "2", name: "Bob", score: 87 }, // No status
        { id: "3", name: "Charlie", score: 99 },
      ];
      const common = aiSuggestCommonColumns(diverseData);
      // Only id, name, score are common
      expect(common).toContain("id");
      expect(common).toContain("name");
      expect(common).toContain("score");
      expect(common).not.toContain("status"); // Not in all rows
    });

    it("should include extras", () => {
      const data: TableRow[] = [{ id: "1" }, { id: "2" }];
      const common = aiSuggestCommonColumns(data);
      expect(common).toContain("timestamp");
      expect(common).toContain("owner");
    });

    it("should return only extras for empty data", () => {
      const common = aiSuggestCommonColumns([]);
      expect(common).toEqual(["timestamp", "owner", "metrics", "tags"]);
    });
  });

  describe("unicodeSafeWidth", () => {
    it("should measure ASCII correctly", () => {
      expect(unicodeSafeWidth("hello")).toBe(5);
    });

    it("should measure emoji correctly", () => {
      expect(unicodeSafeWidth("🇺🇸")).toBe(2); // Flag emoji
      expect(unicodeSafeWidth("👨‍👩‍👧")).toBe(2); // ZWJ sequence
      expect(unicodeSafeWidth("👋🏽")).toBe(2); // Skin tone modifier
    });

    it("should handle zero-width characters", () => {
      expect(unicodeSafeWidth("hello\u2060world")).toBe(10); // Word joiner
      expect(unicodeSafeWidth("hello\u00ADworld")).toBe(10); // Soft hyphen
    });
  });

  describe("validateTableData", () => {
    it("should validate proper table data", () => {
      expect(validateTableData(sampleData)).toBe(true);
    });

    it("should reject empty arrays", () => {
      expect(validateTableData([])).toBe(false);
    });

    it("should reject non-arrays", () => {
      expect(validateTableData(null as unknown as unknown[])).toBe(false);
    });

    it("should reject data with < 3 columns", () => {
      const data = [{ id: "1", name: "Test" }];
      expect(validateTableData(data)).toBe(false);
    });
  });

  describe("compareTableData", () => {
    it("should detect equal data", () => {
      const data1 = [{ id: "1", name: "Test" }];
      const data2 = [{ id: "1", name: "Test" }];
      expect(compareTableData(data1, data2)).toBe(true);
    });

    it("should detect different data", () => {
      const data1 = [{ id: "1", name: "Test" }];
      const data2 = [{ id: "2", name: "Test" }];
      expect(compareTableData(data1, data2)).toBe(false);
    });
  });

  describe("calculateColumnWidths", () => {
    it("should calculate widths for columns", () => {
      const columns = ["id", "name", "email"];
      const widths = calculateColumnWidths(sampleData, columns);
      expect(widths.has("id")).toBe(true);
      expect(widths.has("name")).toBe(true);
      expect(widths.has("email")).toBe(true);
    });

    it("should account for header width", () => {
      const columns = ["id"];
      const widths = calculateColumnWidths(sampleData, columns);
      expect(widths.get("id")).toBeGreaterThanOrEqual(2); // "id" header width
    });

    // Bun 1.3+ improvements: Unicode and emoji support
    it("should handle emoji in column data correctly", () => {
      const emojiData = [
        { id: "1", status: "✅ Active", emoji: "🇺🇸" },
        { id: "2", status: "❌ Inactive", emoji: "🇬🇧" },
      ];
      const columns = ["id", "status", "emoji"];
      const widths = calculateColumnWidths(emojiData, columns);

      // Emoji should be measured correctly (2 width each)
      expect(widths.get("emoji")).toBeGreaterThan(0);
      expect(widths.get("status")).toBeGreaterThan(0);
    });

    it("should handle zero-width characters in data", () => {
      const zeroWidthData = [
        { id: "1", name: "hello\u2060world" }, // word joiner
        { id: "2", name: "test\u00ADword" }, // soft hyphen
      ];
      const columns = ["id", "name"];
      const widths = calculateColumnWidths(zeroWidthData, columns);

      // Should correctly measure despite zero-width chars
      expect(widths.get("name")).toBeGreaterThan(0);
    });
  });

  // [1.2.2.0] computeColumnWidths tests
  describe("computeColumnWidths", () => {
    it("should return number[] array of widths", () => {
      const columns = ["id", "name", "email"];
      const widths = computeColumnWidths(sampleData, columns);
      expect(Array.isArray(widths)).toBe(true);
      expect(widths.length).toBe(3);
      expect(typeof widths[0]).toBe("number");
    });

    it("should calculate max width per column", () => {
      const data: TableRow[] = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Christopher" },
      ];
      const widths = computeColumnWidths(data, ["id", "name"]);
      expect(widths[1]).toBeGreaterThan(widths[0]); // "Christopher" > "1"
    });
  });

  // [1.3.1.0] toHTMLTable tests
  describe("toHTMLTable", () => {
    it("should generate valid HTML table", () => {
      const columns = ["id", "name", "status"];
      const html = toHTMLTable(sampleData, columns);
      expect(html).toContain("<table");
      expect(html).toContain("<thead>");
      expect(html).toContain("<tbody>");
      expect(html).toContain("</table>");
    });

    it("should apply dark mode styling by default", () => {
      const columns = ["id", "name"];
      const html = toHTMLTable(sampleData, columns);
      expect(html).toContain("background:#1a1a1a");
      expect(html).toContain("color:#e0e0e0");
    });

    it("should allow custom className", () => {
      const columns = ["id", "name"];
      const html = toHTMLTable(sampleData, columns, { className: "custom-table" });
      expect(html).toContain('class="custom-table"');
    });

    it("should disable dark mode when specified", () => {
      const columns = ["id", "name"];
      const html = toHTMLTable(sampleData, columns, { darkMode: false });
      expect(html).not.toContain("background:#1a1a1a");
    });

    it("should escape HTML in data (XSS protection)", () => {
      const xssData: TableRow[] = [
        { id: "1", name: "<script>alert('xss')</script>" },
      ];
      const html = toHTMLTable(xssData, ["id", "name"]);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });
});

