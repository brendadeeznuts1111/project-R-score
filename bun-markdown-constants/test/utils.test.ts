/**
 * Utility Functions Tests
 */

import { describe, test, expect } from "bun:test";
import {
  validateMarkdown,
  securityScan,
  extractText,
  countWords,
  estimateReadingTime,
  truncateMarkdown,
  hashContent,
  escapeRegExp,
  slugify,
  stripHtml,
} from "../src/utils";

describe("Utility Functions", () => {
  
  describe("validateMarkdown", () => {
    test("validates content size", () => {
      const result = validateMarkdown("Hello", { maxSize: 100 });
      expect(result.valid).toBe(true);
      
      const result2 = validateMarkdown("A".repeat(101), { maxSize: 100 });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain("Content exceeds maximum size of 100 characters");
    });

    test("detects script tags", () => {
      const result = validateMarkdown("<script>alert('xss')</script>", { checkScripts: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Content contains script tags");
    });

    test("warns about event handlers", () => {
      const result = validateMarkdown("<div onclick='evil()'>click me</div>", { checkScripts: true });
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe("securityScan", () => {
    test("detects dangerous HTML", () => {
      const result = securityScan("<script>alert(1)</script>");
      expect(result.safe).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test("detects iframes", () => {
      const result = securityScan("<iframe src='evil.com'></iframe>");
      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.message.includes("Iframe"))).toBe(true);
    });

    test("detects javascript: protocol", () => {
      const result = securityScan("<a href='javascript:alert(1)'>click</a>");
      expect(result.safe).toBe(false);
    });

    test("returns safe for clean content", () => {
      const result = securityScan("# Hello\n\nThis is **bold** text.");
      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("extractText", () => {
    test("extracts plain text from markdown", () => {
      const markdown = "# Title\n\nThis is **bold** and *italic* text.";
      const text = extractText(markdown);
      expect(text).toContain("Title");
      expect(text).toContain("bold");
      expect(text).not.toContain("**");
    });

    test("removes code blocks", () => {
      const markdown = "Some text\n\n```js\nconst x = 1;\n```\n\nMore text";
      const text = extractText(markdown);
      expect(text).not.toContain("const x");
      expect(text).toContain("Some text");
      expect(text).toContain("More text");
    });

    test("removes images but keeps links", () => {
      const markdown = "![alt text](image.png) and [link text](http://example.com)";
      const text = extractText(markdown);
      expect(text).not.toContain("image.png");
      expect(text).toContain("link text");
    });
  });

  describe("countWords", () => {
    test("counts words correctly", () => {
      expect(countWords("Hello world")).toBe(2);
      expect(countWords("# Title\n\nParagraph here")).toBe(3);
    });

    test("ignores markdown syntax", () => {
      const markdown = "# **Bold** _italic_ text";
      expect(countWords(markdown)).toBe(3);
    });
  });

  describe("estimateReadingTime", () => {
    test("estimates reading time correctly", () => {
      const markdown = "Word ".repeat(400); // 400 words
      const result = estimateReadingTime(markdown, 200);
      
      expect(result.words).toBe(400);
      expect(result.minutes).toBe(2); // 400/200 = 2 minutes
    });

    test("includes extracted text", () => {
      const markdown = "# Title\n\nContent here.";
      const result = estimateReadingTime(markdown);
      
      expect(result.text).toContain("Title");
      expect(result.text).toContain("Content");
    });
  });

  describe("truncateMarkdown", () => {
    test("truncates to specified length", () => {
      const markdown = "This is a long piece of markdown content.";
      const truncated = truncateMarkdown(markdown, 20);
      
      expect(truncated.length).toBeLessThanOrEqual(20);
      expect(truncated).toContain("...");
    });

    test("does not truncate if content is shorter", () => {
      const markdown = "Short";
      const truncated = truncateMarkdown(markdown, 100);
      
      expect(truncated).toBe("Short");
    });
  });

  describe("hashContent", () => {
    test("generates consistent hashes", () => {
      const hash1 = hashContent("Hello");
      const hash2 = hashContent("Hello");
      
      expect(hash1).toBe(hash2);
    });

    test("generates different hashes for different content", () => {
      const hash1 = hashContent("Hello");
      const hash2 = hashContent("World");
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("escapeRegExp", () => {
    test("escapes special regex characters", () => {
      expect(escapeRegExp("hello.world")).toBe("hello\\.world");
      expect(escapeRegExp("a[b]c")).toBe("a\\[b\\]c");
      expect(escapeRegExp("a*b+c")).toBe("a\\*b\\+c");
    });
  });

  describe("slugify", () => {
    test("creates URL-friendly slugs", () => {
      expect(slugify("Hello World")).toBe("hello-world");
      expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
      expect(slugify("Special!@#Chars")).toBe("specialchars");
    });

    test("handles accented characters", () => {
      expect(slugify("Café")).toBe("cafe");
      expect(slugify("naïve")).toBe("naive");
    });
  });

  describe("stripHtml", () => {
    test("removes HTML tags", () => {
      expect(stripHtml("<p>Hello</p>")).toBe("Hello");
      expect(stripHtml("<div><span>Text</span></div>")).toBe("Text");
    });

    test("handles nested tags", () => {
      expect(stripHtml("<p><strong>Bold</strong> text</p>")).toBe("Bold text");
    });
  });
});
