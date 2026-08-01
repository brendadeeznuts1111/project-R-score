// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * console-depth.test.ts — policy helpers in lib/console-depth.ts.
 *
 * Width vectors exercise Bun.stringWidth directly (natives are not re-exported).
 * Layout helpers (padEndWidth / truncateWidth / fitVisible) stay covered here.
 */

import { describe, expect, spyOn, test } from 'bun:test';
import { stringWidth, stripANSI, wrapAnsi } from 'bun';
import { STRING_WIDTH_V135_VECTORS } from '../lib/docs/bun-release-tracker.ts';
import {
  padEndWidth,
  fitVisible,
  truncateWidth,
  inspectTable,
  jsonOut,
  colorize,
  inspect,
  getConsoleDepth,
  inspectCustom,
  shouldColor,
} from '../lib/console-depth.ts';

describe('Bun.stringWidth — reference vectors', () => {
  const vectors: Array<[string, string, number]> = [
    ['empty string', '', 0],
    ['single ASCII', 'a', 1],
    ['ASCII string', 'hello world', 11],
    ['full-width CJK', '\u4F60\u597D', 4],
    ['mixed width', 'hello\u4E16\u754C', 9],
    ['precomposed Hangul syllable', '\uAC00', 2],
    ['three precomposed syllables', '\uD55C\uAD6D\uC5B4', 6],
    ['Hangul Compatibility Jamo', '\u3131', 2],
    ['two Compatibility Jamo do not compose', '\u3131\u3131', 4],
    ['tab', '\t', 0],
    ['tab sandwich', 'a\tb', 2],
    ['newline', '\n', 0],
    ['escape char', '\x1b', 0],
    ['control in text', 'a\x01b', 2],
    ['ANSI color codes', '\x1b[31mred\x1b[0m', 3],
    ['hyperlink sequence', '\x1b]8;;https://example.com\x07link\x1b]8;;\x07', 4],
    ['zero-width space', 'a\u200Bb', 2],
    ['ZWJ alone', '\u200D', 0],
    ['ZWNJ alone', '\u200C', 0],
    ['Arabic with ZWNJ', '\u0628\u200C\u0647', 2],
    ['combining acute', 'e\u0301', 1],
    ['multiple combining marks', 'e\u0301\u0302', 1],
    ['combining marks only', '\u0301\u0302', 0],
    ['emoji surrogate pair', '\u{1F600}', 2],
    ['text with emoji', 'a\u{1F600}b', 4],
    ['emoji with VS16', '\u26A1\uFE0F', 2],
    ['fire emoji', '\u{1F525}', 2],
    ['black medium square', '\u25FC', 1],
    ['check mark', '\u2714', 1],
  ];

  for (const [name, input, expected] of vectors) {
    test(name, () => {
      expect(stringWidth(input)).toBe(expected);
    });
  }
});

describe('v1.3.5 stringWidth accuracy', () => {
  for (const [text, expected] of STRING_WIDTH_V135_VECTORS) {
    test(`stringWidth ${JSON.stringify(text)} = ${expected}`, () => {
      expect(stringWidth(text)).toBe(expected);
    });
  }

  test('padEndWidth pads ZWJ family to visible cols', () => {
    const zwjFamily = STRING_WIDTH_V135_VECTORS[2]![0];
    const out = padEndWidth(zwjFamily, 4);
    expect(stringWidth(out)).toBe(4);
    expect(out.endsWith('  ')).toBe(true);
  });

  test('fitVisible keeps flag + label at exact column width', () => {
    const flag = STRING_WIDTH_V135_VECTORS[0]![0];
    const label = `${flag} ok`;
    expect(stringWidth(label)).toBe(5);
    expect(stringWidth(fitVisible(label, 8))).toBe(8);
  });

  test('CSI non-m sequences (cursor/erase) do not add width', () => {
    expect(stringWidth('\x1b[2J\x1b[Hhi')).toBe(2);
  });
});

describe('padEndWidth', () => {
  test('pads ASCII to width', () => {
    expect(padEndWidth('ok', 5)).toBe('ok   ');
  });
  test('emoji counts as 2 columns', () => {
    expect(padEndWidth('ok\u{1F525}', 6)).toBe('ok\u{1F525}  ');
  });
  test('no padding when already at width', () => {
    expect(padEndWidth('exact', 5)).toBe('exact');
  });
  test('ANSI-colored input pads by visual width', () => {
    const colored = '\x1b[31mok\x1b[0m';
    expect(padEndWidth(colored, 5)).toBe(`${colored}   `);
  });
});

describe('fitVisible', () => {
  test('pads short text', () => {
    expect(fitVisible('hi', 5)).toBe('hi   ');
  });
  test('truncates with ellipsis then pads to exact cols', () => {
    const out = fitVisible('Bun.escapeHTML performance', 20);
    expect(stringWidth(out)).toBe(20);
    expect(out).toContain('\u2026');
  });
  test('right align', () => {
    expect(fitVisible('ab', 5, { align: 'right' })).toBe('   ab');
  });
  test('center align', () => {
    expect(fitVisible('ok', 6, { align: 'center' })).toBe('  ok  ');
  });
  test('colored label keeps visible width', () => {
    const label = `${Bun.color('red', 'ansi') ?? ''}gaps=3\x1b[0m`;
    expect(stringWidth(fitVisible(label, 12, { align: 'right' }))).toBe(12);
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
    const out = truncateWidth('\x1b[31mhello world\x1b[0m', 5);
    expect(stringWidth(out)).toBe(5);
    expect(out).toContain('\x1b[31m');
  });
  test('does not split a wide grapheme mid-glyph', () => {
    const twoWide = '\uFF21\uFF22';
    expect(stringWidth(twoWide)).toBe(4);
    const out = truncateWidth(twoWide, 2);
    expect(stringWidth(out)).toBe(2);
    expect(out).toBe('\uFF21');
    expect(out).not.toContain('\uFFFD');
  });
  test('ellipsis option uses sliceAnsi', () => {
    const out = truncateWidth('abcdefghij', 5, { ellipsis: '\u2026' });
    expect(stringWidth(out)).toBe(5);
    expect(out).toContain('\u2026');
  });
});

describe('colorize / shouldColor', () => {
  test('returns plain text when output is piped (no TTY)', () => {
    expect(colorize('degraded', '#ff5500')).toBe('degraded');
  });
  test('shouldColor tracks Bun.enableANSIColors assignment', () => {
    const prev = Bun.enableANSIColors;
    try {
      Bun.enableANSIColors = true;
      expect(shouldColor()).toBe(true);
      Bun.enableANSIColors = false;
      expect(shouldColor()).toBe(false);
    } finally {
      Bun.enableANSIColors = prev;
    }
  });
});

describe('stringWidth options', () => {
  test('countAnsiEscapeCodes counts the escape sequences', () => {
    const s = '\x1b[31mred\x1b[0m';
    expect(stringWidth(s)).toBe(3);
    expect(stringWidth(s, { countAnsiEscapeCodes: true })).toBe(10);
  });
  test('ambiguousIsNarrow default treats ambiguous chars as 1 col', () => {
    expect(stringWidth('\u00B1')).toBe(1);
    expect(stringWidth('\u00B1', { ambiguousIsNarrow: false })).toBe(2);
  });
});

describe('inspect / getConsoleDepth', () => {
  test('bunfig [console] depth (6) is the default when env is unset', () => {
    const prev = Bun.env.BUN_CONSOLE_DEPTH;
    delete Bun.env.BUN_CONSOLE_DEPTH;
    try {
      expect(getConsoleDepth()).toBe(6);
    } finally {
      if (prev === undefined) delete Bun.env.BUN_CONSOLE_DEPTH;
      else Bun.env.BUN_CONSOLE_DEPTH = prev;
    }
  });
  test('BUN_CONSOLE_DEPTH env overrides bunfig default', () => {
    const prev = Bun.env.BUN_CONSOLE_DEPTH;
    Bun.env.BUN_CONSOLE_DEPTH = '2';
    try {
      expect(getConsoleDepth()).toBe(2);
    } finally {
      if (prev === undefined) delete Bun.env.BUN_CONSOLE_DEPTH;
      else Bun.env.BUN_CONSOLE_DEPTH = prev;
    }
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

describe('inspectCustom', () => {
  test('classes control their own printed form', () => {
    class Secret {
      constructor(public value: string) {}
      [inspectCustom]() {
        return 'Secret(***)';
      }
    }
    expect(Bun.inspect(new Secret('hunter2'))).toBe('Secret(***)');
  });
});

describe('Bun API surface guard', () => {
  test('referenced Bun APIs exist', () => {
    for (const name of ['stringWidth', 'sliceAnsi', 'stripANSI', 'wrapAnsi', 'color', 'inspect']) {
      expect(typeof (Bun as Record<string, unknown>)[name]).toBe('function');
    }
    expect(typeof Bun.inspect.table).toBe('function');
    expect(typeof Bun.inspect.custom).toBe('symbol');
    expect(typeof Bun.enableANSIColors).toBe('boolean');
  });
  test('TTY primitives degrade safely when piped', () => {
    expect(process.stdout.isTTY === true).toBe(false);
    expect(typeof process.stdout.columns === 'undefined' || typeof process.stdout.columns === 'number').toBe(true);
    expect(Bun.enableANSIColors).toBe(false);
    expect(shouldColor()).toBe(false);
  });
});

describe('snapshots', () => {
  const fixture = {
    zebra: 1,
    alpha: { delta: 2, bravo: [1, 2, 3] },
    mango: { ripe: true, count: 42 },
  };

  test('inspect() default formatting is stable', () => {
    expect(inspect(fixture, { colors: false })).toMatchSnapshot();
  });

  test('sorted inspect ordering is stable', () => {
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
      padEndWidth('ok\u{1F525}', 8),
      padEndWidth('degraded', 8),
      truncateWidth('some very long status line', 12),
    ]).toMatchSnapshot();
  });
});

describe('Bun.wrapAnsi / Bun.stripANSI (natives)', () => {
  test('wrapAnsi wraps at word boundaries', () => {
    const out = wrapAnsi('the quick brown fox jumps', 10);
    expect(out.split('\n').every(l => stringWidth(l) <= 10)).toBe(true);
  });
  test('stripANSI strips SGR and OSC 8', () => {
    expect(stripANSI('\x1b[1m\x1b[31mbold red\x1b[0m')).toBe('bold red');
    expect(stripANSI('plain')).toBe('plain');
    expect(stripANSI('\x1b]8;;https://bun.com\x07link\x1b]8;;\x07')).toBe('link');
  });
});

describe('inspectTable', () => {
  const rows = [
    { tool: 'bun-docs', status: 'ok' },
    { tool: 'dx', status: 'ok' },
  ];
  test('returns the same string as Bun.inspect.table (both overloads)', () => {
    expect(inspectTable(rows, ['tool', 'status'], { colors: false })).toBe(
      Bun.inspect.table(rows, ['tool', 'status'], { colors: false })
    );
    expect(inspectTable(rows, undefined, { colors: false })).toBe(
      Bun.inspect.table(rows, { colors: false })
    );
  });
  test('never passes undefined properties to the 3-arg overload', () => {
    expect(() => inspectTable(rows, undefined, { colors: false })).not.toThrow();
  });
  test('wraps non-array data into a single row', () => {
    expect(inspectTable({ a: 1 }, ['a'], { colors: false })).toContain('a');
  });
});

describe('jsonOut', () => {
  test('stdout bytes are identical to console.log(JSON.stringify(v, null, 2))', () => {
    const value = { status: 'ok', rows: [1, 2, { deep: true }] };
    using spy = spyOn(console, 'info').mockImplementation(() => {});
    jsonOut(value);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBe(JSON.stringify(value, null, 2));
  });
  test('compact mode is byte-identical to console.log(JSON.stringify(v))', () => {
    const value = { status: 'ok', rows: [1, 2] };
    using spy = spyOn(console, 'info').mockImplementation(() => {});
    jsonOut(value, { compact: true });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBe(JSON.stringify(value));
  });
});

describe('docs-grounded runtime behavior (verified Bun 1.4.0)', () => {
  test('Bun.color "ansi" auto-detect returns "" when piped (no color support)', () => {
    expect(Bun.color('#ff5500', 'ansi')).toBe('');
  });
  test('Bun.inspect silently ignores non-surface options (getters, maxArrayLength)', () => {
    const withGetter = {
      get x() {
        return 42;
      },
    };
    expect(Bun.inspect(withGetter, { getters: true } as never)).toContain('[Getter]');
    expect(Bun.inspect([1, 2, 3, 4], { maxArrayLength: 2 } as never)).toContain('4');
  });
  test('Bun.inspect silently ignores maxStringLength / showProxy / numericSeparator', () => {
    expect(Bun.inspect('x'.repeat(50), { maxStringLength: 5 } as never)).toContain('x'.repeat(50));
    expect(Bun.inspect(1234567, { numericSeparator: true } as never)).not.toContain('_');
    expect(Bun.inspect(new Proxy({ a: 1 }, {}), { showProxy: true } as never)).not.toContain(
      'Proxy'
    );
  });

  test('runtime nits inspect probes align with console-depth SSOT', async () => {
    const { probeInspectSorted, probeInspectCompact } = await import(
      '../lib/verification/bun-runtime-nits-probes.ts'
    );
    expect(probeInspectSorted().passed).toBe(true);
    expect(probeInspectCompact().passed).toBe(true);
  });
});
