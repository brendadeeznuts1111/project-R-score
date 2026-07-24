// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/blog/bun-v1.3.5#improved-bun-stringwidth-accuracy — v1.3.5 accuracy
// @see https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth — SIMD ship note
// @see https://github.com/oven-sh/bun/blob/main/test/js/bun/util/stringWidth.test.ts — full upstream suite
// @see https://github.com/oven-sh/bun/blob/main/bench/snippets/string-width.mjs — official bench
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Spine smoke: Bun.stripANSI / Bun.stringWidth (1.3.12+ SIMD path).
 *
 * Correctness focus: OSC-8 hyperlinks terminate with BEL, ESC \, or C1 ST (0x9C).
 * Blog: npm string-width only recognizes BEL; Bun handles all three.
 *
 *   bun test tests/bun-ansi-width.test.ts
 */
import { describe, expect, test } from 'bun:test';
import { STRING_WIDTH_V135_VECTORS } from '../lib/docs/bun-release-tracker.ts';

const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const OSC8_BEL = '\x1b]8;;https://example.com\x07link\x1b]8;;\x07';
const OSC8_ST_ESC = '\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\';
const OSC8_ST_C1 = '\x1b]8;;https://example.com\x9clink\x1b]8;;\x9c';

describe('Bun.stripANSI / Bun.stringWidth (Bun 1.3.12+)', () => {
  test('stripANSI removes SGR', () => {
    expect(Bun.stripANSI(`${RED}hello${RESET}`)).toBe('hello');
  });

  test('stringWidth ignores SGR by default', () => {
    expect(Bun.stringWidth(`${RED}hi${RESET}`)).toBe(2);
    expect(Bun.stringWidth('👋')).toBe(2);
  });

  test('v1.3.5 grapheme and zero-width vectors', () => {
    for (const [text, width] of STRING_WIDTH_V135_VECTORS) {
      expect(Bun.stringWidth(text)).toBe(width);
    }
  });

  test('OSC-8 hyperlink: BEL / ESC ST / C1 ST all strip and width as visible text', () => {
    for (const osc of [OSC8_BEL, OSC8_ST_ESC, OSC8_ST_C1]) {
      expect(Bun.stripANSI(osc)).toBe('link');
      expect(Bun.stringWidth(osc)).toBe(4);
    }
  });
});
