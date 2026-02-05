import { describe, it, expect } from "bun:test";
import { html, render, parseMdTable, parseMdListItems } from "../src/core/markdown.ts";
import type { MarkdownOptions } from "../src/core/markdown.ts";

describe("markdown", () => {
  describe("BN-103: Markdown to HTML", () => {
    it("should convert heading", () => {
      const result = html("# Hello");
      expect(result).not.toBeNull();
      expect(result).toContain("<h1>");
      expect(result).toContain("Hello");
    });

    it("should convert bold text", () => {
      const result = html("**bold**");
      expect(result).toContain("<strong>");
    });

    it("should convert italic text", () => {
      const result = html("*italic*");
      expect(result).toContain("<em>");
    });

    it("should convert links", () => {
      const result = html("[link](https://example.com)");
      expect(result).toContain("href=");
      expect(result).toContain("example.com");
    });

    it("should convert code blocks", () => {
      const result = html("```\ncode\n```");
      expect(result).toContain("<code>");
    });

    it("should convert lists", () => {
      const result = html("- one\n- two\n- three");
      expect(result).toContain("<li>");
    });

    it("should render without callbacks matches html", () => {
      const r = render("# Test");
      expect(r).not.toBeNull();
      expect(typeof r).toBe("string");
    });

    it("should handle empty string", () => {
      const result = html("");
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
    });

    it("should handle complex markdown", () => {
      const md = "# Title\n\n> blockquote\n\n| col1 | col2 |\n|------|------|\n| a | b |\n";
      const result = html(md);
      expect(result).not.toBeNull();
      expect(result).toContain("Title");
    });

    it("should return null for non-string input", () => {
      expect(html(null as any)).toBeNull();
    });
  });

  describe("BN-126: Markdown Render with Callbacks", () => {
    it("should render with a heading callback", () => {
      const result = render("# Hello", {
        heading(tag: string, attrs: { level: number }) {
          return `<h${attrs.level} class="custom">${tag}</h${attrs.level}>`;
        },
      });
      expect(result).not.toBeNull();
      expect(result).toContain("custom");
      expect(result).toContain("Hello");
    });

    it("should render without callbacks", () => {
      const result = render("**bold** text");
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
    });

    it("should render with empty callbacks", () => {
      const result = render("# Title\n\nParagraph", {});
      expect(result).not.toBeNull();
    });

    it("should accept options parameter", () => {
      const result = render("| a | b |\n|---|---|\n| 1 | 2 |", {}, {
        tables: true,
      });
      expect(result).not.toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(render(null as any)).toBeNull();
    });

    it("should handle multiple callback types", () => {
      let headingCalled = false;
      const result = render("# Title\n\nText", {
        heading(tag: string, attrs: { level: number }) {
          headingCalled = true;
          return `<h${attrs.level}>${tag}</h${attrs.level}>`;
        },
      });
      expect(result).not.toBeNull();
      expect(headingCalled).toBe(true);
    });
  });

  describe("BN-103b: parseMdTable / parseMdListItems", () => {
    const sampleMd = `# Report

## Bundle Summary
| Metric | Value | Notes |
|--------|-------|-------|
| Total Size | 4,510 B | Minified |
| Entry Points | 1 | ./index.ts |

## Outputs
| Path | Size | Kind |
|------|------|------|
| index.jsc | 4,510 B | entry-point |

## Composition Breakdown
- Core: 1,950 B (43%)
- Crypto: 1,080 B (24%)
`;

    it("should parse table under section heading", () => {
      const summary = parseMdTable(sampleMd, "Bundle Summary");
      expect(summary.length).toBe(2);
      expect(summary[0].Metric).toBe("Total Size");
      expect(summary[0].Value).toBe("4,510 B");
      expect(summary[1].Metric).toBe("Entry Points");
    });

    it("should parse Outputs table", () => {
      const outputs = parseMdTable(sampleMd, "Outputs");
      expect(outputs.length).toBe(1);
      expect(outputs[0].Path).toBe("index.jsc");
      expect(outputs[0].Kind).toBe("entry-point");
    });

    it("should return empty array for missing section", () => {
      expect(parseMdTable(sampleMd, "Missing Section")).toEqual([]);
    });

    it("should parse list items under section heading", () => {
      const items = parseMdListItems(sampleMd, "Composition Breakdown");
      expect(items.length).toBe(2);
      expect(items[0]).toContain("Core");
      expect(items[1]).toContain("Crypto");
    });

    it("should return empty array for missing list section", () => {
      expect(parseMdListItems(sampleMd, "Missing List")).toEqual([]);
    });
  });
});
