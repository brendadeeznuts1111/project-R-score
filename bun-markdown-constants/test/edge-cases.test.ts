/**
 * Edge Cases and Stress Tests
 * 
 * Tests for unusual inputs, boundary conditions, and stress scenarios
 */

import { describe, test, expect } from "bun:test";
import { 
  MarkdownPresets, 
  MARKDOWN_SECURITY,
  validateMarkdown,
  securityScan,
  extractText,
  truncateMarkdown
} from "../src/index";

describe("Edge Cases and Stress Tests", () => {
  
  describe("Empty and Minimal Inputs", () => {
    test("handles empty string", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const result = render('');
      // Empty string should return empty string or valid HTML
      expect(typeof result).toBe('string');
    });

    test("handles whitespace only", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const result = render('   \n\n   ');
      expect(typeof result).toBe('string');
    });

    test("handles single character", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const result = render('x');
      expect(result).toContain('x');
    });
  });

  describe("Special Characters", () => {
    test("handles all HTML entities", () => {
      const render = MarkdownPresets.html('GFM', 'STRICT');
      const special = '& < > " \' / = - _ * ` [ ] ( ) { } # ! | ~ ^ @ $ %';
      const result = render(special);
      
      // Should escape dangerous characters
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    test("handles Unicode characters", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const unicode = '🎉 Emoji test: 你好世界 مرحبا 🚀日本語 한국어';
      const result = render(unicode);
      expect(result).toContain('🎉');
      expect(result).toContain('你好世界');
    });

    test("handles RTL languages", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const rtl = '# عربي\n\nنص تجريبي';
      const result = render(rtl);
      expect(result).toContain('عربي');
    });

    test("handles combining characters", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      // é can be either U+00E9 or U+0065 U+0301
      const combined = 'café café'; // Both forms
      const result = render(combined);
      expect(result).toContain('caf');
    });
  });

  describe("Nested Structures", () => {
    test("handles deeply nested lists", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      let nested = '- Level 1';
      for (let i = 2; i <= 10; i++) {
        nested += '\n' + '  '.repeat(i - 1) + '- Level ' + i;
      }
      
      const result = render(nested);
      expect(result).toContain('Level 1');
      expect(result).toContain('Level 10');
    });

    test("handles nested emphasis", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const nested = '***bold italic*** and **_also_** and *__this__*';
      const result = render(nested);
      expect(result).toBeTruthy();
    });

    test("handles nested quotes", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const nested = `> Level 1
> > Level 2
> > > Level 3
> > > > Level 4`;
      
      const result = render(nested);
      expect(result).toContain('Level 1');
      expect(result).toContain('Level 4');
    });
  });

  describe("Large Documents", () => {
    test("handles very long lines", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const longLine = 'word '.repeat(10000);
      const result = render(longLine);
      expect(result.length).toBeGreaterThan(10000);
    });

    test("handles many headings", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const manyHeadings = Array.from({ length: 100 }, (_, i) => 
        `# Heading ${i + 1}`
      ).join('\n\n');
      
      const result = render(manyHeadings);
      expect(result.match(/<h1>/g)?.length).toBe(100);
    });

    test("handles large tables", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      let table = '| Col1 | Col2 | Col3 |\n|------|------|------|\n';
      for (let i = 0; i < 100; i++) {
        table += `| A${i} | B${i} | C${i} |\n`;
      }
      
      const result = render(table);
      expect(result.match(/<tr>/g)?.length).toBe(101); // header + 100 rows
    });
  });

  describe("Security Edge Cases", () => {
    test("handles null bytes", () => {
      const render = MarkdownPresets.html('GFM', 'STRICT');
      const withNull = 'Hello\x00World<script>alert(1)</script>';
      const result = render(withNull);
      expect(result).not.toContain('<script>');
    });

    test("handles control characters", () => {
      const render = MarkdownPresets.html('GFM', 'STRICT');
      const withControl = 'Hello\x01\x02\x03\x1F\x7FWorld';
      const result = render(withControl);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    test("handles mixed case XSS attempts", () => {
      const render = MarkdownPresets.html('GFM', 'STRICT');
      const xssAttempts = [
        '<ScRiPt>alert(1)</ScRiPt>',
        '<script >alert(1)</script >',
        '<script\t>alert(1)</script>',
        '<script\n>alert(1)</script>',
        '<sCrIpT/src=//evil.com/x.js>',
      ];
      
      for (const attempt of xssAttempts) {
        const result = render(attempt);
        const scan = securityScan(result);
        // Result should be safe or the script should be escaped
        expect(scan.safe || !result.includes('<script')).toBe(true);
      }
    });

    test("handles data URI attacks", () => {
      const scan = securityScan("<a href='data:text/html,<script>alert(1)</script>'>click</a>");
      expect(scan.safe).toBe(false);
      expect(scan.issues.some(i => i.type === 'blacklisted_pattern')).toBe(true);
    });

    test("handles javascript pseudo-protocol", () => {
      const scan = securityScan("<a href='javascript:alert(1)'>click</a>");
      expect(scan.safe).toBe(false);
    });
  });

  describe("Malformed Markdown", () => {
    test("handles unclosed emphasis", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const unclosed = '**bold but never closed';
      const result = render(unclosed);
      expect(result).toBeTruthy();
    });

    test("handles mismatched brackets", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const mismatched = '[link text](http://example.com';
      const result = render(mismatched);
      expect(result).toBeTruthy();
    });

    test("handles invalid HTML in markdown", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const invalid = '<div><span>unclosed div';
      const result = render(invalid);
      expect(result).toBeTruthy();
    });

    test("handles broken table syntax", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const broken = `| Col1 | Col2 |
| no separator
| A | B | C | D |`;
      
      const result = render(broken);
      expect(result).toBeTruthy();
    });
  });

  describe("Unicode Edge Cases", () => {
    test("handles zero-width characters", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const zwc = 'Hello\u200BWorld\uFEFF!'; // Zero-width space and BOM
      const result = render(zwc);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    test("handles emoji variations", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const emojis = '👨‍👩‍👧‍👦 👨🏻‍💻 🏳️‍🌈'; // Family, technologist, pride flag
      const result = render(emojis);
      expect(result).toContain('👨');
    });

    test("handles right-to-left override", () => {
      const render = MarkdownPresets.html('GFM', 'STRICT');
      const rlo = '\u202Eevil\u202C'; // RLO and PDF characters
      const result = render(rlo);
      // Should handle or sanitize bidirectional override characters
      expect(result).toBeTruthy();
    });
  });

  describe("Bun-specific Features", () => {
    test("handles Thai stringWidth correctly", () => {
      // Testing Thai spacing vowels (fixed in Bun v1.3.7)
      // SARA AA (U+0E32) and SARA AM (U+0E33) should have width 1
      const thaiTests = [
        { text: 'คำ', expected: 2 }, // ka + sara am (spacing vowel)
        { text: 'กำ', expected: 2 }, // ko kai + sara am
        { text: 'มาก', expected: 3 }, // mo ma + sara aa + ko kai
        // Note: 'ที่' has combining marks (width 0) so total is 1
      ];

      for (const { text, expected } of thaiTests) {
        const width = Bun.stringWidth(text);
        expect(width).toBe(expected);
      }
    });

    test("handles Lao stringWidth correctly", () => {
      const laoTests = [
        { text: 'ກຳ', expected: 2 },
        { text: 'ຄຳ', expected: 2 },
      ];

      for (const { text, expected } of laoTests) {
        const width = Bun.stringWidth(text);
        expect(width).toBe(expected);
      }
    });

    test("handles wide characters", () => {
      const wideChars = [
        { text: '中文', expected: 4 }, // Chinese is wide
        { text: '日本語', expected: 6 }, // Japanese is wide
        { text: '한국어', expected: 6 }, // Korean is wide
      ];

      for (const { text, expected } of wideChars) {
        const width = Bun.stringWidth(text);
        expect(width).toBe(expected);
      }
    });
  });

  describe("Performance Edge Cases", () => {
    test("handles rapid successive renders", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const content = '# Test';
      
      // Render 10000 times rapidly
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        render(content);
      }
      const duration = performance.now() - start;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    test("handles memory efficiently with large docs", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const largeDoc = '# Title\n\n'.repeat(1000) + 'Content. '.repeat(10000);
      
      const before = process.memoryUsage().heapUsed;
      
      // Render multiple times
      for (let i = 0; i < 10; i++) {
        render(largeDoc);
      }
      
      const after = process.memoryUsage().heapUsed;
      const increase = (after - before) / 1024 / 1024;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(increase).toBeLessThan(100);
    });
  });
});

console.log('\n🔬 Edge Cases and Stress Tests\n');
