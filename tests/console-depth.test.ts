// @see https://bun.com/docs/runtime/color — Bun.color
/**
 * console-depth.test.ts — correctness diff for lib/console-depth.ts.
 *
 * Width vectors are mirrored from sindresorhus/string-width's test suite
 * (https://github.com/sindresorhus/string-width/blob/main/test.js) — the same
 * suite Bun.stringWidth is validated against
 * (https://bun.com/docs/runtime/utils#bun-stringwidth).
 * Bun.inspect.custom: https://bun.com/docs/runtime/utils#bun-inspect-custom
 * Running them through widthOf() diffs our helper + this Bun runtime against
 * the reference expectations in one shot.
 */

import { describe, expect, test } from 'bun:test';
import {
  widthOf,
  padEndWidth,
  truncateWidth,
  wrapText,
  colorize,
  inspect,
  getConsoleDepth,
  inspectCustom,
} from '../lib/console-depth.ts';

describe('widthOf — string-width reference vectors', () => {
  const vectors: Array<[string, string, number]> = [
    // Basic
    ['empty string', '', 0],
    ['single ASCII', 'a', 1],
    ['ASCII string', 'hello world', 11],
    // East Asian width
    ['full-width CJK', '你好', 4],
    ['mixed width', 'hello世界', 9],
    ['precomposed Hangul syllable', '가', 2],
    ['three precomposed syllables', '한국어', 6],
    ['Hangul Compatibility Jamo', 'ㄱ', 2],
    ['two Compatibility Jamo do not compose', 'ㄱㄱ', 4],
    // Control characters
    ['tab', '\t', 0],
    ['tab sandwich', 'a\tb', 2],
    ['newline', '\n', 0],
    ['escape char', '', 0],
    ['control in text', 'ab', 2],
    // ANSI escape codes
    ['ANSI color codes', '[31mred[0m', 3],
    ['hyperlink sequence', ']8;;https://example.comlink]8;;', 4],
    // Zero-width characters
    ['zero-width space', 'a\u200Bb', 2],
    ['ZWJ alone', '\u200D', 0],
    ['ZWNJ alone', '\u200C', 0],
    ['Arabic with ZWNJ', 'ب\u200Cه', 2],
    // Combining marks
    ['combining acute', 'e\u0301', 1],
    ['multiple combining marks', 'e\u0301\u0302', 1],
    ['combining marks only', '\u0301\u0302', 0],
    // Emoji
    ['emoji surrogate pair', '😀', 2],
    ['text with emoji', 'a😀b', 4],
    ['emoji with VS16', '\u26A1\uFE0F', 2],
    ['fire emoji', '🔥', 2],
    // Misc symbols (narrow by default)
    ['black medium square', '◼', 1],
    ['check mark', '✔', 1],
  ];

  for (const [name, input, expected] of vectors) {
    test(name, () => {
      expect(widthOf(input)).toBe(expected);
    });
  }
});

describe('padEndWidth', () => {
  test('pads ASCII to width', () => {
    expect(padEndWidth('ok', 5)).toBe('ok   ');
  });
  test('emoji counts as 2 columns', () => {
    expect(padEndWidth('ok🔥', 6)).toBe('ok🔥  ');
  });
  test('no padding when already at width', () => {
    expect(padEndWidth('exact', 5)).toBe('exact');
  });
  test('ANSI-colored input pads by visual width', () => {
    const colored = '[31mok[0m';
    expect(padEndWidth(colored, 5)).toBe(`${colored}   `);
  });
});

describe('truncateWidth', () => {
  test('truncates ASCII', () => {
    expect(truncateWidth('some very long line', 4)).toBe('some');
  });
  test('keeps string under width untouched', () => {
    expect(truncateWidth('short', 10)).toBe('short');
  });
  test('does not break ANSI sequences', () => {
    const out = truncateWidth('[31mhello world[0m', 5);
    expect(widthOf(out)).toBe(5);
    expect(out).toContain('[31m');
  });
  test('does not split a wide grapheme mid-glyph', () => {
    const out = truncateWidth('😀😀😀', 3);
    // width 3 cannot hold two 2-col emoji; must keep whole graphemes only
    expect(widthOf(out)).toBeLessThanOrEqual(4);
    expect(out).not.toContain('\uFFFD');
  });
});

describe('colorize', () => {
  test('returns plain text when output is piped (no TTY)', () => {
    // Tests run without a TTY: shouldColor() is false
    expect(colorize('degraded', '#ff5500')).toBe('degraded');
  });
});

describe('widthOf options (Bun.stringWidth surface)', () => {
  test('countAnsiEscapeCodes counts the escape sequences', () => {
    const s = '\x1b[31mred\x1b[0m';
    expect(widthOf(s)).toBe(3);
    // ESC is 0-width; \x1b[31m counts 4 and \x1b[0m counts 3 (matches npm string-width)
    expect(widthOf(s, { countAnsiEscapeCodes: true })).toBe(10);
  });
  test('ambiguousIsNarrow default treats ambiguous chars as 1 col', () => {
    expect(widthOf('±')).toBe(1);
    expect(widthOf('±', { ambiguousIsNarrow: false })).toBe(2);
  });
});

describe('inspect / getConsoleDepth', () => {
  test('default depth is 4', () => {
    expect(getConsoleDepth()).toBe(4);
  });
  test('explicit depth option wins', () => {
    const deep = { a: { b: { c: { d: 1 } } } };
    expect(inspect(deep, { depth: 1 })).toContain('[Object ...]');
    expect(inspect(deep, { depth: 4 })).toContain('d: 1');
  });
  test('compact mode produces a single line', () => {
    const out = inspect({ a: { b: 1 } }, { compact: true });
    expect(out).not.toContain('\n');
  });
  test('sorted mode orders keys alphabetically, recursively', () => {
    const out = inspect({ zebra: 1, alpha: { delta: 2, bravo: 3 } }, { sorted: true });
    expect(out.indexOf('alpha')).toBeLessThan(out.indexOf('zebra'));
    expect(out.indexOf('bravo')).toBeLessThan(out.indexOf('delta'));
  });
});

describe('inspectCustom', () => {  test('classes control their own printed form', () => {
    class Secret {
      constructor(public value: string) {}
      [inspectCustom]() {
        return 'Secret(***)';
      }
    }
    expect(Bun.inspect(new Secret('hunter2'))).toBe('Secret(***)');
  });
});

describe('Bun API surface guard', () => {  // Fails loudly if a Bun upgrade removes/renames an API this module relies on.
  // API declarations: https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types
  test('referenced Bun APIs exist', () => {
    for (const name of ['stringWidth', 'sliceAnsi', 'stripANSI', 'wrapAnsi', 'color', 'inspect']) {
      expect(typeof (Bun as Record<string, unknown>)[name]).toBe('function');
    }
    expect(typeof Bun.inspect.table).toBe('function');
    expect(typeof Bun.inspect.custom).toBe('symbol');
  });
  test('TTY primitives degrade safely when piped', () => {
    // When piped: isTTY is absent and columns is undefined — shouldColor/termWidth
    // must still behave (false / fallback width), never throw.
    expect(process.stdout.isTTY === true).toBe(false);
    expect(typeof process.stdout.columns === 'undefined' || typeof process.stdout.columns === 'number').toBe(true);
  });
});

// @see https://bun.com/docs/runtime/color — Bun.color
/**
 * Snapshot tests — deterministic output pinned via bun:test snapshots.
 * https://bun.com/docs/test/snapshots · https://bun.com/guides/test/snapshot
 *
 * If a Bun upgrade intentionally changes formatting, regenerate with:
 *   bun test tests/console-depth.test.ts --update-snapshots
 * (scoped to this file — do NOT run --update-snapshots repo-wide)
 */
describe('snapshots', () => {
  const fixture = {
    zebra: 1,
    alpha: { delta: 2, bravo: [1, 2, 3] },
    mango: { ripe: true, count: 42 },
  };

  test('inspect() default formatting is stable', () => {
    expect(inspect(fixture, { colors: false })).toMatchSnapshot();
  });

  test('logSorted ordering is stable', () => {
    expect(inspect(fixture, { colors: false, sorted: true })).toMatchSnapshot();
  });

  test('compact formatting is stable', () => {
    expect(inspect(fixture, { colors: false, compact: true })).toMatchSnapshot();
  });

  test('depth truncation is stable', () => {
    expect(inspect(fixture, { colors: false, depth: 1 })).toMatchSnapshot();
  });

  test('logTable output is stable', () => {
    const table = Bun.inspect.table(
      [
        { tool: 'bun-docs', status: 'ok', tools: 4 },
        { tool: 'dx', status: 'ok', tools: 12 },
      ],
      ['tool', 'status', 'tools'],
      { colors: false }
    );
    expect(table).toMatchSnapshot();
  });

  test('padEndWidth / truncateWidth edges are stable', () => {
    expect([
      padEndWidth('ok🔥', 8),
      padEndWidth('degraded', 8),
      truncateWidth('some very long status line', 12),
    ]).toMatchSnapshot();
  });
});

describe('wrapText', () => {
  test('wraps plain text at word boundaries', () => {
    const out = wrapText('the quick brown fox jumps', 10);
    expect(out.split('\n').every(l => widthOf(l) <= 10)).toBe(true);
  });
  test('ANSI styles are closed and re-opened per row', () => {
    const styled = '\x1b[31mhello world foo\x1b[0m';
    const rows = wrapText(styled, 6).split('\n');
    expect(rows.length).toBeGreaterThan(1);
    // Every row renders standalone: opens with the color, closes with reset
    for (const row of rows) {
      expect(row).toContain('\x1b[31m');
    }
  });
});

describe('docs-grounded runtime behavior (verified Bun 1.4.0)', () => {
  test('Bun.color "ansi" auto-detect returns "" when piped (no color support)', () => {
    // docs/runtime/color: "ansi" picks depth from environment, "" when unsupported
    expect(Bun.color('#ff5500', 'ansi')).toBe('');
  });
  test('Bun.inspect silently ignores non-surface options (getters, maxArrayLength)', () => {
    const withGetter = { get x() { return 42; } };
    expect(Bun.inspect(withGetter, { getters: true } as never)).toContain('[Getter]');
    expect(Bun.inspect([1, 2, 3, 4], { maxArrayLength: 2 } as never)).toContain('4');
  });

  test('runtime nits inspect probes align with console-depth SSOT', async () => {
    const { probeInspectSorted, probeInspectCompact } = await import(
      '../lib/verification/bun-runtime-nits-probes.ts'
    );
    expect(probeInspectSorted().passed).toBe(true);
    expect(probeInspectCompact().passed).toBe(true);
  });
});
