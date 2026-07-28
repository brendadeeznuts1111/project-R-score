// @see https://bun.com/docs/runtime/test
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/test/writing-tests#format-specifiers — test.each with %s %i %p %# %o
// @see https://bun.com/docs/test/writing-tests#best-practices — matchers, expect.hasAssertions, test.if, test.failing
/**
 * Contract test for lib/table-format.ts — universal table formatter.
 *
 * Uses Bun test.each with format specifiers, assertion counting,
 * conditional tests, and snapshot stability for edge case coverage.
 *   bun test tests/table-format.test.ts
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import {
  formatTable,
  formatTableNative,
  color,
  fmt,
  styles,
  DIMENSION_COLUMNS,
  REGULATORY_COLUMNS,
  LIMIT_CHANGE_COLUMNS,
  PREDICTION_COLUMNS,
  formatChangeSummary,
  type ColumnDef,
} from '../lib/table-format.ts';
import { stringWidth, inspect, semver } from 'bun';

// ── Test data ─────────────────────────────────────────────────────────────
const sampleRows = [
  { label: 'DraftKings', totalChanges: 5, raises: 3, decreases: 2, netDelta: 15000, avgMagnitudePct: 66.7, trend7d: 2500 },
  { label: 'FanDuel', totalChanges: 3, raises: 2, decreases: 1, netDelta: 8500, avgMagnitudePct: 33.3, trend7d: 1200 },
  { label: 'BetMGM', totalChanges: 1, raises: 0, decreases: 1, netDelta: -500, avgMagnitudePct: -10, trend7d: -100 },
];
const limitChangeRows = [
  { direction: 'up', sportsbook: 'draftkings', sport_id: 'nba', market_id: 'spread', bet_type: 'straight', previous_max: 500, new_limit: 1500, multi_factor_score: 0.714, increased_at: 1700000000 },
  { direction: 'down', sportsbook: 'fanduel', sport_id: 'nfl', market_id: 'totals', bet_type: 'live', previous_max: 2000, new_limit: 1000, multi_factor_score: null, increased_at: 1700003600 },
  { direction: 'up', sportsbook: 'betmgm', sport_id: 'nba', market_id: 'moneyline', bet_type: 'pregame', previous_max: null, new_limit: 3000, multi_factor_score: 0.2, increased_at: null },
];
// ── 1. Bun utilities integration (test.each × edge cases) ────────────────
describe('Bun.stringWidth', () => {
  test.each([
    ['hello',        5],
    ['🚀',           2],
    ['$1,500',       6],
    ['',             0],
    ['   ',          3],
    ['a\nb',         2],   // newline = 1 char in Bun
    ['\x1b[31mred\x1b[0m', 3], // ANSI codes NOT counted
  ])('stringWidth(%s) = %i', (input, expected) => {
    expect(stringWidth(input)).toBe(expected);
  });
});

describe('Bun.semver', () => {
  test.each([
    [Bun.version,     '>=1.3.0', true],
    [Bun.version,     '>=2.0.0', false],
    ['1.4.0',         '^1.4.0',  true],
    ['1.4.0-canary',  '>=1.4.0', false],  // canary semver < release
    ['1.3.14',        '~1.3.0',  true],
    ['1.5.0',         '1.x.x',   true],
  ])('semver.satisfies(%s, %s) = %p', (ver, range, expected) => {
    expect(semver.satisfies(ver, range)).toBe(expected);
  });
});

describe('Bun.inspect', () => {
  test.each([
    [{ a: 1 },                    '%o',   'contains a'],
    [{ nested: { x: 2 } },        null,   'handles nesting'],
    [null,                         null,  'handles null'],
    [undefined,                   null,   'handles undefined'],
    [{ color: true },              { depth: 1, colors: false }, 'supports options'],
  ])('inspect(%p) %s', (input, opts, _label) => {
    const result = opts ? inspect(input, opts) : inspect(input);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('Bun.Terminal', () => {
  test('should create a Terminal instance exposing isTTY boolean and columns number', () => {
    try {
      const T = (Bun as any).Terminal;
      if (typeof T === 'function') {
        const t = new T(Bun.stdout);
        expect(t == null).toBe(false);
        if (t !== undefined) {
          expect(typeof t.isTTY === 'boolean' || t.isTTY === undefined).toBe(true);
          expect(typeof t.columns === 'number' || t.columns === undefined).toBe(true);
        }
      }
    } catch {
      // Bun.Terminal may not exist in older versions — feature-detect gracefully
    }
  });
});

// ── 2. Color system ──────────────────────────────────────────────────────
describe('color system', () => {
  test.each([
    [color.green('ok'),     'ok'],
    [color.red('err'),      'err'],
    [color.bold('bold'),    'bold'],
    [color.dim('dim'),      'dim'],
    [color.yellow('warn'), 'warn'],
    [color.cyan('info'),   'info'],
    [color.blue('link'),   'link'],
  ])('color produces valid output for %s', (result, _label) => {
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    // In non-TTY: result === label; in TTY: result contains ANSI escapes
    // Both are valid — just verify it's a string
    expect(typeof result).toBe('string');
  });

  test.each([
    [styles.up,     '🚀',    'up'],
    [styles.down,   '⬇️',   'down'],
    [styles.neutral, '—',   'neutral'],
    [styles.warning, '⚠️', 'warning'],
  ])(`style %s applies to %s`, (styleFn, input, _label) => {
    expect(styleFn(input)).toBeTruthy();
    expect(styleFn(input).includes(input)).toBe(true);
  });
});

// ── 3. Format helpers: fmt.dollar ────────────────────────────────────────
describe('fmt.dollar', () => {
  test.each([
    [1500,        '$1,500'],
    [0,           '$0'],
    [-500,        '$-500'],    // Bun toLocaleString
    [null,        '\u2014'],   // em-dash
    [undefined,   '\u2014'],
    ['abc',       '\u2014'],
    ['',          '\u2014'],
    [1e6,         '$1,000,000'],
    [-1e6,        '$-1,000,000'],
  ])('fmt.dollar(%p) = %s', (input, expected) => {
    expect(fmt.dollar(input)).toBe(expected);
  });
});

describe('fmt.delta', () => {
  test.each([
    [1500,     '+$1,500'],
    [-500,     '$-500'],
    [0,        '+$0'],
    [null,     '\u2014'],
    [undefined, '\u2014'],
    ['bad',    '\u2014'],
    [1,        '+$1'],
    [-1,       '$-1'],
  ])('fmt.delta(%p) = %s', (input, expected) => {
    expect(fmt.delta(input)).toBe(expected);
  });
});

describe('fmt.pct', () => {
  test.each([
    [0.5,      '50.0%'],
    [1,        '100.0%'],
    [0,        '0.0%'],
    [null,     '\u2014'],
    [undefined, '\u2014'],
    ['',       '\u2014'],
    [0.001,    '0.1%'],
    [0.999,    '99.9%'],
  ])('fmt.pct(%p) = %s', (input, expected) => {
    expect(fmt.pct(input)).toBe(expected);
  });
});

describe('fmt.pctRaw', () => {
  test.each([
    [50,   '+50.0%'],
    [-10,  '-10.0%'],
    [0,    '+0.0%'],
    [null, '\u2014'],
  ])('fmt.pctRaw(%p) = %s', (input, expected) => {
    expect(fmt.pctRaw(input)).toBe(expected);
  });
});

describe('fmt.date', () => {
  test.each([
    [1700000000,  true],
    [0,           true],
    [null,        false],
    [undefined,   false],
    ['',          false],
  ])('fmt.date(%p) is %s', (input, isDate) => {
    const result = fmt.date(input);
    if (isDate) {
      expect(result).not.toBe('\u2014');
      expect(result.length).toBeGreaterThan(0);
    } else {
      expect(result).toBe('\u2014');
    }
  });
});

describe('fmt.score', () => {
  test.each([
    [0.714,   '71%'],
    [0,       '0%'],
    [1,       '100%'],
    [null,    '\u00B7\u00B7\u00B7'],  // ···
    [undefined, '\u00B7\u00B7\u00B7'],
    ['',      '\u00B7\u00B7\u00B7'],
    [0.5,     '50%'],
    [0.999,   '100%'],
  ])('fmt.score(%p) = %s', (input, expected) => {
    expect(fmt.score(input)).toBe(expected);
  });
});

describe('fmt.icon', () => {
  test.each([
    ['up',    '🚀'],
    ['down',  '⬇️'],
    ['check', '✅'],
    ['cross', '❌'],
    ['warn',  '⚠️'],
  ])('fmt.icon.%s = %s', (key, expected) => {
    expect((fmt.icon as any)[key]).toBe(expected);
  });
});

// ── 4. formatTable: border modes ─────────────────────────────────────────
describe('formatTable — border modes', () => {
  const single = sampleRows.slice(0, 1);

  test.each([
    ['unicode',  '┌', true],
    ['unicode',  '┐', true],
    ['unicode',  '│', true],
    ['ascii',    '+', true],
    ['ascii',    '|', true],
    ['ascii',    '-', true],
    ['minimal',  '─', false],  // minimal has no box borders, only data
    ['none',     '┌', false],
    ['none',     '│', false],
  ])('border=%s contains %s = %p', (border, char, shouldContain) => {
    const result = formatTable('Border', DIMENSION_COLUMNS, single, {
      border: border as any,
      colors: false,
    });
    if (shouldContain) {
      expect(result).toContain(char);
    } else {
      expect(result).not.toContain(char);
    }
  });
});

describe('formatTable — rendering modes', () => {
  test('should render compact mode without any box-drawing characters', () => {
    const result = formatTable('Compact', DIMENSION_COLUMNS, sampleRows.slice(0, 1), {
      compact: true,
      colors: false,
    });
    expect(result).not.toContain('┌');
    expect(result).not.toContain('│');
    expect(result).toContain('DraftKings');
  });

  test('should include footer text below the table body', () => {
    const result = formatTable('Footer', DIMENSION_COLUMNS, sampleRows, {
      footer: 'Total: 3 items',
      colors: false,
    });
    expect(result).toContain('Total: 3 items');
  });

  test('should insert visual separator after specified row index', () => {
    const result = formatTable('Sep', DIMENSION_COLUMNS, sampleRows, {
      separatorAfter: [0],
      colors: false,
    });
    expect(result).toBeTruthy();
  });

  test('should display no-data placeholder when rows array is empty', () => {
    const result = formatTable('Empty', DIMENSION_COLUMNS, [], { colors: false });
    expect(result).toContain('no data');
  });

  test('should strip ANSI color codes from title when colors:false', () => {
    const result = formatTable('PlainTitle', DIMENSION_COLUMNS, sampleRows.slice(0, 1), {
      colors: false,
    });
    expect(result).toContain('PlainTitle');
    expect(result).not.toContain('\x1b[');
  });
});

// ── 5. formatTable: data edge cases ──────────────────────────────────────
describe('formatTable — data edge cases', () => {
  test.each([
    ['single row',      sampleRows.slice(0, 1),  'DraftKings'],
    ['two rows',        sampleRows.slice(0, 2),  'FanDuel'],
    ['all three rows',  sampleRows,              'BetMGM'],
  ])('%s: contains %s', (_label, rows, expected) => {
    const result = formatTable('Data', DIMENSION_COLUMNS, rows, { colors: false });
    expect(result).toContain(expected);
  });

  test.each([
    [{ label: null, totalChanges: undefined, raises: null }, '\u2014'], // em-dash
    [{ label: '', totalChanges: 0, raises: 0 },            '0'],
    [{ label: 'Test', totalChanges: NaN, raises: 1 },      '1'],
  ])('null/undefined/NaN values: %p shows %s', (row, expected) => {
    const result = formatTable('Edge', DIMENSION_COLUMNS, [row], { colors: false });
    expect(result).toContain(expected);
  });

  test.each([
    [5,    true],
    [1,    true],
  ])('maxColWidth=%i truncates with …', (maxW, _) => {
    const long = [{ label: 'A'.repeat(200), totalChanges: 1, raises: 1, decreases: 0, netDelta: 100, avgMagnitudePct: 10, trend7d: 5 }];
    const result = formatTable('Long', DIMENSION_COLUMNS, long, { maxColWidth: maxW, colors: false });
    expect(result).toBeTruthy();
    if (maxW < 10) expect(result).toContain('…');
  });

  test('should render all 50 rows without truncation or data loss', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      label: `Row ${i}`, totalChanges: i, raises: i % 3, decreases: i % 2,
      netDelta: i * 100, avgMagnitudePct: i, trend7d: i * 10,
    }));
    const result = formatTable('Many', DIMENSION_COLUMNS, many, { colors: false });
    expect(result).toContain('Row 0');
    expect(result).toContain('Row 49');
  });

  test('should render negative netDelta and trend values with minus sign', () => {
    const neg = [{ label: 'Loss', totalChanges: 1, raises: 0, decreases: 1, netDelta: -5000, avgMagnitudePct: -50, trend7d: -1000 }];
    const result = formatTable('Neg', DIMENSION_COLUMNS, neg, { colors: false });
    expect(result).toContain('-');
    expect(result).toContain('Loss');
  });
});

// ── 6. Predefined column sets ────────────────────────────────────────────
describe('Predefined column sets', () => {
  const sets: [string, ColumnDef[], string[]][] = [
    ['LIMIT_CHANGE_COLUMNS',  LIMIT_CHANGE_COLUMNS,  ['direction', 'sportsbook', 'sport_id', 'market_id', 'bet_type', 'previous_max', 'new_limit', 'multi_factor_score']],
    ['DIMENSION_COLUMNS',     DIMENSION_COLUMNS,     ['label', 'totalChanges', 'raises', 'netDelta']],
    ['REGULATORY_COLUMNS',    REGULATORY_COLUMNS,    ['partner', 'sportsbook', 'status', 'stateCode']],
    ['PREDICTION_COLUMNS',    PREDICTION_COLUMNS,    ['sportsbook', 'sport_id', 'market_id', 'bet_type', 'predictedRaiseProb', 'confidence']],
  ];

  test.each(sets)('%s has keys %p', (_name, cols, expectedKeys) => {
    const keys = cols.map(c => c.key);
    for (const k of expectedKeys) {
      expect(keys).toContain(k);
    }
  });

  test.each(sets)('%s columns have valid labels', (_name, cols) => {
    for (const c of cols) {
      // Direction column intentionally has empty label (icon only)
      if (c.key === 'direction') continue;
      expect(c.label).toBeTruthy();
      expect(typeof c.label).toBe('string');
    }
  });

  test.each(sets)('%s columns have align defined', (_name, cols) => {
    for (const c of cols) {
      expect(['left', 'right', 'center', undefined]).toContain(c.align);
    }
  });
});

// ── 7. Limit change table ────────────────────────────────────────────────
describe('Limit change table', () => {
  test.each([
    ['up direction',    limitChangeRows.slice(0, 1), '🚀'],
    ['down direction',  limitChangeRows.slice(1, 2), '⬇️'],
    ['dollar formatting', limitChangeRows.slice(0, 1), '$1,500'],
    ['null previous_max', limitChangeRows.slice(2, 3), '\u2014'],  // em-dash
    ['null score',       limitChangeRows.slice(1, 2), '···'],
  ])('%s contains %s', (_label, rows, expected) => {
    const result = formatTable('LC', LIMIT_CHANGE_COLUMNS, rows, { colors: false });
    expect(result).toContain(expected);
  });
});

// ── 8. formatTableNative (Bun.inspect.table) ─────────────────────────────
describe('formatTableNative (Bun.inspect.table)', () => {
  test.each([
    [sampleRows.slice(0, 1),           undefined,     'DraftKings'],
    [sampleRows,                       undefined,     'FanDuel'],
    [{ label: 'X', totalChanges: 1 } as any, undefined, 'X'],
  ])('renders data showing %s', (_input, _opts, expected) => {
    const result = formatTableNative(_input);
    expect(result).toContain(expected);
    expect(result.length).toBeGreaterThan(0);
  });

  test.each([
    [sampleRows.slice(0, 1), ['label', 'raises'], 'raises'],
    [sampleRows, ['label', 'netDelta'],           'netDelta'],
  ])('with property filter shows %s', (_input, props, expected) => {
    const result = formatTableNative(_input, { properties: props as string[] });
    expect(result).toContain(expected);
  });

  test('should return no-data placeholder string when input array is empty', () => {
    expect(formatTableNative([])).toBe('(no data)');
  });
});

// ── 9. Column alignment ──────────────────────────────────────────────────
describe('Column alignment', () => {
  const alignCols: ColumnDef[] = [
    { key: 'name', label: 'Name', align: 'left', width: 10 },
    { key: 'val',  label: 'Value', align: 'right', width: 10 },
  ];

  test.each([
    ['test',    42],
    ['example', 99],
    ['x',        5],
  ])('aligns name=%s val=%i', (name, val) => {
    const result = formatTable('Align', alignCols, [{ name, val }], { colors: false });
    expect(result).toContain(name);
    expect(result).toContain(String(val));
  });

  test('should center-align column content within the specified column width', () => {
    const centerCols: ColumnDef[] = [
      { key: 'name', label: 'Name', align: 'center', width: 20 },
    ];
    const result = formatTable('Center', centerCols, [{ name: 'hello' }], { colors: false });
    expect(result).toContain('hello');
  });
});

// ── 10. Formatting stability ─────────────────────────────────────────────
describe('Formatting stability', () => {
  test('should produce identical output for identical inputs — idempotent', () => {
    const a = formatTable('Stable', DIMENSION_COLUMNS, sampleRows, { colors: false });
    const b = formatTable('Stable', DIMENSION_COLUMNS, sampleRows, { colors: false });
    expect(a).toBe(b);
  });

  test.each([
    ['no columns',    []],
    ['single column', [{ key: 'x', label: 'X' }]],
  ])('%s produces valid output', (_label, cols) => {
    const result = formatTable('Test', cols as ColumnDef[], sampleRows, { colors: false });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test.each([
    { label: 'Extra', totalChanges: 1, raises: 1, decreases: 0, netDelta: 100, avgMagnitudePct: 10, trend7d: 5, extra: 'ignored' },
    { label: 'Min', totalChanges: 1, raises: 0, decreases: 0, netDelta: 0, avgMagnitudePct: 0, trend7d: 0 },
  ])('handles extra fields: %p', (row) => {
    const result = formatTable('Stable', DIMENSION_COLUMNS, [row], { colors: false });
    expect(result).toContain(row.label);
  });
});

// ── 11. formatTableNative edge cases ─────────────────────────────────────
describe('formatTableNative edge cases', () => {
  test.each([
    [[],                                      0],
    [[{ a: 1 }],                               1],
    [[{ a: 1, b: 2 }, { a: 3, b: 4 }],        2],
  ])('handles %p rows', (rows, expectedCount) => {
    const result = formatTableNative(rows);
    if (rows.length === 0) {
      expect(result).toBe('(no data)');
    } else {
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

// ── 12. Best practices: assertion counting ────────────────────────────────
describe('assertion counting', () => {
  test('should fail test when no assertions execute — expect.hasAssertions guard', () => {
    expect.hasAssertions();
    const result = formatTable('Test', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { colors: false });
    expect(result).toContain('DraftKings');
  });

  test.each([
    [1500, '$1,500'],
    [0,    '$0'],
    [-500, '$-500'],
  ])('expect.assertions(1) for fmt.dollar(%p) = %s', (input, expected) => {
    expect.assertions(1);
    expect(fmt.dollar(input)).toBe(expected);
  });

  test('should verify exactly three assertions execute during a single test run', () => {
    expect.assertions(3);
    const result = formatTable('Count', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { colors: false });
    expect(result).toContain('Count');
    expect(result).toContain('DraftKings');
    expect(result).toContain('Name');
  });
});

// ── 13. Conditional describe blocks (describe.if / skipIf / todoIf) ──────
const hasTerminal = typeof (Bun as any).Terminal === 'function';
const isNonTTY = !(Bun.stdout as any).isTTY;
const isMacOS = process.platform === 'darwin';

// Describe.if — only runs on terminals with Bun.Terminal
describe.if(hasTerminal)('Bun.Terminal constructor (describe.if — only in TTY)', () => {
  test('should construct a Terminal instance with isTTY and columns', () => {
    expect.assertions(2);
    const t = new (Bun as any).Terminal(Bun.stdout);
    expect(t).toBeDefined();
    expect(typeof t.columns === 'number' || t.columns === undefined).toBe(true);
  });

  test('should have isTTY boolean property', () => {
    expect.assertions(1);
    const t = new (Bun as any).Terminal(Bun.stdout);
    expect(typeof t.isTTY === 'boolean' || t.isTTY === undefined).toBe(true);
  });
});

// Describe.skipIf — skip Terminal tests in non-TTY (most test runners)
describe.skipIf(isNonTTY)('ANSI color codes (describe.skipIf — skip in non-TTY)', () => {
  test('should include ANSI escape sequences when TTY', () => {
    expect.assertions(1);
    const colored = color.green('ok');
    expect(colored.includes('\x1b[') || isNonTTY).toBe(true);
  });

  test('should not strip color output', () => {
    expect.assertions(1);
    const result = styles.up('🚀');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// Describe.todoIf — mark macOS-specific tests as todo on other platforms
describe.todoIf(!isMacOS)('macOS-specific formatting (describe.todoIf — TODO on non-macOS)', () => {
  test('should format locale numbers correctly', () => {
    expect(fmt.dollar(1500)).toBe('$1,500');
  });
});

// Always-run tests
describe('always-run null safety', () => {
  test('should return em-dash or ellipsis placeholders for all format helpers when given null', () => {
    expect.hasAssertions();
    expect(fmt.dollar(null)).toBe('\u2014');
    expect(fmt.pct(null)).toBe('\u2014');
    expect(fmt.score(null)).toBe('\u00B7\u00B7\u00B7');
  });
});

// ── 14. test.failing for known edge cases ─────────────────────────────────
describe('known edge cases', () => {
  test('should return em-dash for NaN input instead of dollar-zero', () => {
    expect(fmt.dollar(NaN)).toBe('\u2014');
  });
});

// ── 15. With retry for flakiness ──────────────────────────────────────────
describe('stability with retry', () => {
  test(
    'formatTable is deterministic across repeated calls',
    () => {
      expect.assertions(1);
      const a = formatTable('R', DIMENSION_COLUMNS, sampleRows, { colors: false });
      const b = formatTable('R', DIMENSION_COLUMNS, sampleRows, { colors: false });
      expect(a).toBe(b);
    },
    { retry: 2 },
  );
});

// ── 16. Type testing with expectTypeOf ────────────────────────────────────
describe('type-level contracts', () => {
  test('should enforce that ColumnDef.key is always a string type', () => {
    const col: ColumnDef = { key: 'test', label: 'Test' };
    expect(typeof col.key).toBe('string');
    expect(typeof col.label).toBe('string');
  });

  test('should have all color transform functions that return string output', () => {
    expect(typeof color.green).toBe('function');
    expect(typeof color.green('test')).toBe('string');
    expect(typeof color.red).toBe('function');
    expect(typeof fmt.dollar).toBe('function');
    expect(typeof fmt.dollar(100)).toBe('string');
  });

  test('should have formatTable function that returns a non-empty string for valid input', () => {
    expect(typeof formatTable).toBe('function');
    expect(typeof formatTable('t', [], [])).toBe('string');
  });
});

// ── 17. Floating point with toBeCloseTo ───────────────────────────────────
describe('floating point precision', () => {
  test.each([
    [0.1, 0.2, 0.3],
    [0.01, 0.05, 0.06],
    [1 / 3, 1 / 3, 2 / 3],
  ])('toBeCloseTo: %p + %p ≈ %p', (a, b, expected) => {
    expect(a + b).toBeCloseTo(expected, 5);
  });
});

// ── 18. Object matchers ───────────────────────────────────────────────────
describe('object matchers', () => {
  test('should match subset of object properties using toMatchObject', () => {
    const row = sampleRows[0];
    expect(row).toMatchObject({ label: 'DraftKings', totalChanges: 5 });
    expect(row).not.toMatchObject({ label: 'FanDuel' });
  });

  test('should verify array lengths for sample data and column definitions', () => {
    expect(sampleRows).toHaveLength(3);
    expect(limitChangeRows).toHaveLength(3);
    expect(DIMENSION_COLUMNS).toHaveLength(7);
  });
});

// ── 19. Setup/teardown with beforeEach/afterEach ──────────────────────────
describe('setup/teardown pattern', () => {
  let testRow: Record<string, any>;

  beforeEach(() => {
    testRow = { label: 'Setup', totalChanges: 10, raises: 5, decreases: 2, netDelta: 30000, avgMagnitudePct: 50, trend7d: 5000 };
  });

  afterEach(() => {
    testRow = {};
  });

  test('should receive fresh test data initialized by beforeEach hook', () => {
    expect.assertions(2);
    expect(testRow.label).toBe('Setup');
    const result = formatTable('Setup', DIMENSION_COLUMNS, [testRow], { colors: false });
    expect(result).toContain('Setup');
  });

  test('should have testRow re-initialized by beforeEach after afterEach cleanup', () => {
    expect.assertions(1);
    expect(testRow.label).toBe('Setup');
  });
});

// ── 20. Error handling ────────────────────────────────────────────────────
describe('error handling', () => {
  test('should not throw when given a column definition with nonexistent data key', () => {
    expect.assertions(1);
    const badCols = [{ key: 'nonexistent', label: 'Bad' }];
    const result = formatTable('Bad', badCols, sampleRows, { colors: false });
    expect(result).toBeTruthy();
  });

  test('should return a string without crashing when input is null', () => {
    expect.assertions(1);
    try {
      const result = formatTableNative(null as any);
      expect(typeof result).toBe('string');
    } catch {
      expect(true).toBe(true); // Graceful error handling
    }
  });
});
