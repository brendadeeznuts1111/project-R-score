import { describe, test, expect } from 'bun:test';
import { StringUtils } from '../lib/utils/index';

// Mirror the helpers used in production code so we test the same logic
function swPad(str: string, width: number, char = ' '): string {
  const diff = width - Bun.stringWidth(str);
  return diff > 0 ? str + char.repeat(diff) : str;
}

function swPadStart(str: string, width: number, char = ' '): string {
  const diff = width - Bun.stringWidth(str);
  return diff > 0 ? char.repeat(diff) + str : str;
}

describe('Bun.stringWidth', () => {
  describe('core width measurement', () => {
    test('should count ASCII characters as width 1', () => {
      expect(Bun.stringWidth('hello')).toBe(5);
      expect(Bun.stringWidth('')).toBe(0);
      expect(Bun.stringWidth('abc123')).toBe(6);
    });

    test('should count emoji as width 2', () => {
      expect(Bun.stringWidth('✅')).toBe(2);
      expect(Bun.stringWidth('❌')).toBe(2);
      expect(Bun.stringWidth('🚀')).toBe(2);
    });

    test('should count CJK characters as width 2', () => {
      expect(Bun.stringWidth('中')).toBe(2);
      expect(Bun.stringWidth('日本語')).toBe(6);
    });

    test('should ignore ANSI escape codes', () => {
      const red = '\x1b[31mhello\x1b[0m';
      expect(Bun.stringWidth(red)).toBe(5);
    });

    test('should handle mixed ASCII and emoji', () => {
      // "Status" (6) + " " (1) + "✅" (2) = 9
      expect(Bun.stringWidth('Status ✅')).toBe(9);
    });

    test('should treat flag emoji as width 2 (was: 1)', () => {
      expect(Bun.stringWidth('🇺🇸')).toBe(2);
      expect(Bun.stringWidth('🇯🇵')).toBe(2);
    });

    test('should treat emoji with skin tone modifier as width 2 (was: 4)', () => {
      expect(Bun.stringWidth('👋🏽')).toBe(2);
      expect(Bun.stringWidth('👍🏿')).toBe(2);
    });

    test('should treat ZWJ family sequences as width 2 (was: 8)', () => {
      expect(Bun.stringWidth('👨‍👩‍👧')).toBe(2);
      expect(Bun.stringWidth('👩‍💻')).toBe(2);
    });

    test('should treat zero-width characters as width 0 (was: 1)', () => {
      expect(Bun.stringWidth('\u2060')).toBe(0); // word joiner
      expect(Bun.stringWidth('\u200B')).toBe(0); // zero-width space
      expect(Bun.stringWidth('\uFEFF')).toBe(0); // BOM / zero-width no-break space
    });

    test('should ignore variation selectors', () => {
      // VS16 (U+FE0F) forces emoji presentation — should not add width
      expect(Bun.stringWidth('☺\uFE0F')).toBe(2); // text char + VS16 = emoji width
      // VS15 (U+FE0E) forces text presentation
      expect(Bun.stringWidth('☺\uFE0E')).toBe(1); // text presentation = width 1
    });

    test('should handle combining diacritical marks as width 0', () => {
      // e + combining acute accent = single grapheme "é"
      expect(Bun.stringWidth('e\u0301')).toBe(1);
      // n + combining tilde = "ñ"
      expect(Bun.stringWidth('n\u0303')).toBe(1);
    });

    test('should handle keycap sequences as width 2', () => {
      // digit + VS16 + combining enclosing keycap
      expect(Bun.stringWidth('1\uFE0F\u20E3')).toBe(2);
      expect(Bun.stringWidth('#\uFE0F\u20E3')).toBe(2);
    });
  });

  describe('swPad (left-aligned)', () => {
    test('should pad ASCII string to target width', () => {
      const result = swPad('hello', 10);
      expect(result).toBe('hello     ');
      expect(Bun.stringWidth(result)).toBe(10);
    });

    test('should pad emoji-containing string correctly', () => {
      const result = swPad('✅', 6);
      // ✅ is width 2, so needs 4 spaces
      expect(result).toBe('✅    ');
      expect(Bun.stringWidth(result)).toBe(6);
    });

    test('should not truncate when string is already wider than target', () => {
      const result = swPad('hello world', 5);
      expect(result).toBe('hello world');
    });

    test('should return original string when exact width', () => {
      const result = swPad('hi', 2);
      expect(result).toBe('hi');
    });

    test('should support custom pad character', () => {
      const result = swPad('ok', 6, '.');
      expect(result).toBe('ok....');
      expect(Bun.stringWidth(result)).toBe(6);
    });

    test('should produce equal visual widths for mixed content', () => {
      const col1 = swPad('Status', 12);
      const col2 = swPad('✅ done', 12);
      const col3 = swPad('❌ fail', 12);

      expect(Bun.stringWidth(col1)).toBe(12);
      expect(Bun.stringWidth(col2)).toBe(12);
      expect(Bun.stringWidth(col3)).toBe(12);
    });
  });

  describe('swPadStart (right-aligned)', () => {
    test('should right-pad ASCII string to target width', () => {
      const result = swPadStart('42', 6);
      expect(result).toBe('    42');
      expect(Bun.stringWidth(result)).toBe(6);
    });

    test('should right-pad emoji-containing string correctly', () => {
      const result = swPadStart('🚀', 6);
      // 🚀 is width 2, so needs 4 leading spaces
      expect(result).toBe('    🚀');
      expect(Bun.stringWidth(result)).toBe(6);
    });

    test('should not truncate when string is already wider than target', () => {
      const result = swPadStart('hello world', 5);
      expect(result).toBe('hello world');
    });
  });

  describe('StringUtils.pad', () => {
    test('should use visual width instead of .length', () => {
      const result = StringUtils.pad('✅', 6);
      expect(Bun.stringWidth(result)).toBe(6);
      // .length-based padEnd would produce width 7 (1 char + 5 spaces)
      // stringWidth-based pad produces width 6 (2 visual + 4 spaces)
      expect(result).toBe('✅    ');
    });

    test('should handle plain ASCII identically to padEnd', () => {
      expect(StringUtils.pad('abc', 8)).toBe('abc'.padEnd(8));
    });

    test('should support custom pad character', () => {
      const result = StringUtils.pad('hi', 6, '-');
      expect(result).toBe('hi----');
    });
  });

  describe('StringUtils.truncate', () => {
    test('should not truncate short strings', () => {
      expect(StringUtils.truncate('hi', 10)).toBe('hi');
    });

    test('should truncate long ASCII strings with ellipsis', () => {
      const result = StringUtils.truncate('hello world!', 8);
      expect(result.endsWith('...')).toBe(true);
      expect(Bun.stringWidth(result)).toBeLessThanOrEqual(8);
    });

    test('should measure emoji width when deciding to truncate', () => {
      // 5 emoji = visual width 10, should be truncated at maxLength 8
      const fiveEmoji = '🔴🟢🔵🟡🟣';
      const result = StringUtils.truncate(fiveEmoji, 8);
      expect(result.endsWith('...')).toBe(true);
      expect(Bun.stringWidth(result)).toBeLessThanOrEqual(8);
    });

    test('should not truncate emoji string that fits', () => {
      // 2 emoji = visual width 4
      expect(StringUtils.truncate('🔴🟢', 10)).toBe('🔴🟢');
    });
  });

  describe('table column alignment', () => {
    test.each([
      ['ASCII only', ['Name', 'Status', 'v1.0']],
      ['with emoji', ['scanner', '✅', 'v4.5']],
      ['with CJK', ['日本語', 'OK', '1.0']],
      ['with ANSI', ['\x1b[32mgreen\x1b[0m', 'ok', '2.0']],
    ])('should produce consistent column widths for %s rows', (_label, row) => {
      const targetWidth = 15;
      const padded = row.map(cell => swPad(cell, targetWidth));

      for (const cell of padded) {
        expect(Bun.stringWidth(cell)).toBeGreaterThanOrEqual(targetWidth);
      }
    });
  });
});
