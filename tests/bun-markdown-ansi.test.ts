// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils — Bun.stripANSI
// @see https://bun.com/blog/bun-v1.3.12 — bun ./file.md
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Spine smoke: Bun.markdown.ansi (no Factory wrapper).
 *
 *   bun test tests/bun-markdown-ansi.test.ts
 */
import { describe, expect, test } from 'bun:test';

const OSC8 = '\x1b]8;;';

describe('Bun.markdown.ansi', () => {
  test('colors: false yields no SGR escapes', () => {
    const out = Bun.markdown.ansi('# Hello', { colors: false });
    expect(Bun.stripANSI(out)).toBe(out);
    expect(out).not.toContain('\x1b[');
  });

  test('hyperlinks: true emits OSC 8', () => {
    const out = Bun.markdown.ansi('[x](https://bun.sh)', { hyperlinks: true });
    expect(out).toContain(OSC8);
    expect(out).toContain('https://bun.sh');
  });

  test('hyperlinks: false has no OSC 8', () => {
    const out = Bun.markdown.ansi('[x](https://bun.sh)', { hyperlinks: false });
    expect(out).not.toContain(OSC8);
  });

  test('columns wraps long paragraphs', () => {
    const long = `${'word '.repeat(40)}\n`;
    const narrow = Bun.markdown.ansi(long, { columns: 40, colors: false });
    const wide = Bun.markdown.ansi(long, { columns: 120, colors: false });
    const narrowMax = Math.max(...narrow.split('\n').map(l => Bun.stringWidth(l)));
    const wideMax = Math.max(...wide.split('\n').map(l => Bun.stringWidth(l)));
    expect(narrowMax).toBeLessThanOrEqual(40);
    expect(wideMax).toBeGreaterThan(narrowMax);
  });

  test('unicode GFM table renders; stringWidth stable', () => {
    const md = `| a | b |\n|---|---|\n| 日本語 | 👋 |\n`;
    const out = Bun.markdown.ansi(md, { colors: false, columns: 80 });
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('日本語');
    const plain = Bun.stripANSI(out).split('\n').find(l => l.includes('日本語'));
    expect(plain).toBeDefined();
    expect(Bun.stringWidth(plain!)).toBeGreaterThan(0);
  });
});
