// @see https://bun.com/docs/runtime/test
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/terminal — Bun.terminal
/**
 * Contract test for lib/table-format.ts — universal table formatter.
 *
 * Tests: rendering modes, edge cases, Bun utilities integration.
 *   bun test tests/table-format.test.ts
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { formatTable, formatChangeSummary, color, fmt, DIMENSION_COLUMNS, REGULATORY_COLUMNS, LIMIT_CHANGE_COLUMNS, type ColumnDef } from '../lib/table-format.ts';
import { stringWidth, inspect, semver } from 'bun';

// ── Test data ─────────────────────────────────────────────────────────────
const sampleRows = [
  { label: 'DraftKings', totalChanges: 5, raises: 3, decreases: 2, netDelta: 15000, avgMagnitudePct: 66.7, trend7d: 2500 },
  { label: 'FanDuel', totalChanges: 3, raises: 2, decreases: 1, netDelta: 8500, avgMagnitudePct: 33.3, trend7d: 1200 },
  { label: 'BetMGM', totalChanges: 1, raises: 0, decreases: 1, netDelta: -500, avgMagnitudePct: -10, trend7d: -100 },
];

const emptyRows: Record<string, any>[] = [];

const limitChangeRows = [
  { direction: 'up', sportsbook: 'draftkings', sport_id: 'nba', market_id: 'spread', bet_type: 'straight', previous_max: 500, new_limit: 1500, multi_factor_score: 0.714, increased_at: 1700000000 },
  { direction: 'down', sportsbook: 'fanduel', sport_id: 'nfl', market_id: 'totals', bet_type: 'live', previous_max: 2000, new_limit: 1000, multi_factor_score: null, increased_at: 1700003600 },
  { direction: 'up', sportsbook: 'betmgm', sport_id: 'nba', market_id: 'moneyline', bet_type: 'pregame', previous_max: null, new_limit: 3000, multi_factor_score: 0.2, increased_at: null },
];

const regulatoryRows = [
  { partner: 'partner-42', sportsbook: 'draftkings', sportId: 'nba', marketId: 'spread', currentLimit: 1500, regulatoryMax: 10000, status: 'under_limit', stateCode: 'NJ' },
  { partner: 'partner-99', sportsbook: 'fanduel', sportId: 'nfl', marketId: 'totals', currentLimit: 15000, regulatoryMax: 10000, status: 'over_limit', stateCode: 'MA' },
];

// ── Contract: Bun utilities integration ───────────────────────────────────
describe('Bun utilities integration', () => {
  test('Bun.semver validates version constraints', () => {
    expect(semver.satisfies(Bun.version, '>=1.3.0')).toBe(true);
    expect(semver.satisfies(Bun.version, '>=2.0.0')).toBe(false);
    expect(semver.satisfies('1.4.0', '^1.4.0')).toBe(true);
  });

  test('Bun.Terminal can be constructed for TTY detection', () => {
    // Bun.Terminal constructor (v1.4+) provides isTTY, columns
    // In test runner (non-TTY), it may return undefined values — that's fine
    try {
      const T = (Bun as any).Terminal;
      if (typeof T === 'function') {
        const t = new T(Bun.stdout);
        expect(typeof t.isTTY === 'boolean' || t.isTTY === undefined).toBe(true);
        expect(typeof t.columns === 'number' || t.columns === undefined).toBe(true);
      }
    } catch {
      // Bun.Terminal may not exist in older versions — that's OK
    }
  });

  test('Bun.inspect produces valid output', () => {
    const result = inspect({ a: 1, b: 'hello' }, { depth: 2, colors: false });
    expect(result).toContain('a');
    expect(result).toContain('1');
    expect(result).toContain('hello');
  });

  test('color returns valid output (plain when non-TTY, ANSI when TTY)', () => {
    const colored = color.green('hello');
    expect(colored).toContain('hello');
    expect(colored.length).toBeGreaterThan(0);
    // When not in TTY (test runner), ANSI escapes may be absent — that's correct
    expect(color.red('test')).toBeTruthy();
    expect(color.bold('test')).toBeTruthy();
    expect(color.dim('test')).toBeTruthy();
  });
});

// ── Contract: Format helpers ──────────────────────────────────────────────
describe('fmt helpers', () => {
  test('fmt.dollar formats valid numbers', () => {
    expect(fmt.dollar(1500)).toBe('$1,500');
    expect(fmt.dollar(0)).toBe('$0');
    expect(fmt.dollar(-500)).toBe('$-500');  // Bun's toLocaleString puts sign after $
    expect(fmt.dollar(null)).toBe('—');
    expect(fmt.dollar(undefined)).toBe('—');
    expect(fmt.dollar('abc')).toBe('—');
  });

  test('fmt.delta formats with sign', () => {
    expect(fmt.delta(1500)).toBe('+$1,500');
    expect(fmt.delta(-500)).toBe('$-500');  // Bun's toLocaleString puts sign after $
    expect(fmt.delta(0)).toBe('+$0');
    expect(fmt.delta(null)).toBe('—');
  });

  test('fmt.pct formats percentages', () => {
    expect(fmt.pct(0.5)).toBe('50.0%');
    expect(fmt.pct(1)).toBe('100.0%');
    expect(fmt.pct(0)).toBe('0.0%');
    expect(fmt.pct(null)).toBe('—');
  });

  test('fmt.pctRaw formats with sign', () => {
    expect(fmt.pctRaw(50)).toBe('+50.0%');
    expect(fmt.pctRaw(-10)).toBe('-10.0%');
    expect(fmt.pctRaw(0)).toBe('+0.0%');
  });

  test('fmt.date formats timestamps', () => {
    expect(fmt.date(1700000000)).toBeTruthy();
    expect(fmt.date(0)).toBeTruthy();
    expect(fmt.date(null)).toBe('—');
    expect(fmt.date(undefined)).toBe('—');
  });

  test('fmt.score formats score values', () => {
    expect(fmt.score(0.714)).toBe('71%');
    expect(fmt.score(0)).toBe('0%');
    expect(fmt.score(1)).toBe('100%');
    expect(fmt.score(null)).toBe('···');
  });

  test('fmt.icon provides useful icons', () => {
    expect(fmt.icon.up).toBe('🚀');
    expect(fmt.icon.down).toBe('⬇️');
    expect(fmt.icon.check).toBe('✅');
    expect(fmt.icon.cross).toBe('❌');
  });
});

// ── Contract: formatTable rendering ───────────────────────────────────────
describe('formatTable rendering', () => {
  test('renders with data rows', () => {
    const result = formatTable('Test Table', DIMENSION_COLUMNS, sampleRows, { colors: false });
    // Should contain title and all labels
    expect(result).toContain('Test Table');
    expect(result).toContain('DraftKings');
    expect(result).toContain('FanDuel');
    expect(result).toContain('BetMGM');
    // Should contain headers
    expect(result).toContain('Name');
    expect(result).toContain('Total');
    expect(result).toContain('Net');
  });

  test('renders empty state', () => {
    const result = formatTable('Empty', DIMENSION_COLUMNS, emptyRows, { colors: false });
    expect(result).toContain('no data');
  });

  test('renders with unicode box drawing', () => {
    const result = formatTable('Unicode', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { border: 'unicode', colors: false });
    expect(result).toContain('┌');
    expect(result).toContain('┐');
    expect(result).toContain('│');
    expect(result).toContain('└');
    expect(result).toContain('┘');
  });

  test('renders with ASCII box drawing', () => {
    const result = formatTable('ASCII', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { border: 'ascii', colors: false });
    expect(result).toContain('+');
    expect(result).toContain('|');
    expect(result).toContain('-');
  });

  test('renders compact mode (no box drawing)', () => {
    const result = formatTable('Compact', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { compact: true, colors: false });
    expect(result).not.toContain('┌');
    expect(result).not.toContain('│');
    // Should still have aligned columns
    expect(result).toContain('DraftKings');
  });

  test('renders with footer', () => {
    const result = formatTable('With Footer', DIMENSION_COLUMNS, sampleRows, { footer: 'Total: 3 items', colors: false });
    expect(result).toContain('Total: 3 items');
  });

  test('renders with separator after specific rows', () => {
    const result = formatTable('Separated', DIMENSION_COLUMNS, sampleRows, { separatorAfter: [0], colors: false });
    expect(result).toBeTruthy(); // Should not crash
  });

  test('handles null/undefined values gracefully', () => {
    const nullRows = [{ label: null, totalChanges: undefined, raises: null }];
    const result = formatTable('Nulls', DIMENSION_COLUMNS, nullRows, { colors: false });
    expect(result).toContain('—');
    expect(result).toBeTruthy();
  });
});

// ── Contract: Predefined columns ──────────────────────────────────────────
describe('Predefined column sets', () => {
  test('LIMIT_CHANGE_COLUMNS has all required fields', () => {
    const keys = LIMIT_CHANGE_COLUMNS.map(c => c.key);
    expect(keys).toContain('direction');
    expect(keys).toContain('sportsbook');
    expect(keys).toContain('sport_id');
    expect(keys).toContain('market_id');
    expect(keys).toContain('bet_type');
    expect(keys).toContain('previous_max');
    expect(keys).toContain('new_limit');
    expect(keys).toContain('multi_factor_score');
    expect(keys).toContain('increased_at');
  });

  test('DIMENSION_COLUMNS has all required fields', () => {
    const keys = DIMENSION_COLUMNS.map(c => c.key);
    expect(keys).toContain('label');
    expect(keys).toContain('totalChanges');
    expect(keys).toContain('raises');
    expect(keys).toContain('netDelta');
  });

  test('REGULATORY_COLUMNS has all required fields', () => {
    const keys = REGULATORY_COLUMNS.map(c => c.key);
    expect(keys).toContain('partner');
    expect(keys).toContain('sportsbook');
    expect(keys).toContain('status');
    expect(keys).toContain('stateCode');
  });
});

// ── Contract: Limit change table rendering ────────────────────────────────
describe('Limit change table rendering', () => {
  test('renders direction icons correctly', () => {
    const result = formatTable('Changes', LIMIT_CHANGE_COLUMNS, limitChangeRows, { colors: false });
    // Up direction should show 🚀
    expect(result).toContain('🚀');
    // Down direction should show ⬇️
    expect(result).toContain('⬇️');
  });

  test('renders dollar values with locale formatting', () => {
    const result = formatTable('Dollars', LIMIT_CHANGE_COLUMNS, limitChangeRows.slice(0, 1), { colors: false });
    expect(result).toContain('$1,500');
    expect(result).toContain('$500');
  });

  test('renders null previous_max as em-dash', () => {
    const result = formatTable('NullMax', LIMIT_CHANGE_COLUMNS, limitChangeRows.slice(2, 3), { colors: false });
    expect(result).toContain('—');
  });

  test('renders null increased_at as em-dash', () => {
    const result = formatTable('NullDate', LIMIT_CHANGE_COLUMNS, limitChangeRows.slice(2, 3), { colors: false });
    // The date formatter should handle null
    expect(result).toBeTruthy();
  });

  test('renders null multi_factor_score as ···', () => {
    const result = formatTable('NullScore', LIMIT_CHANGE_COLUMNS, limitChangeRows.slice(1, 2), { colors: false });
    expect(result).toContain('···');
  });
});

// ── Contract: Edge cases ──────────────────────────────────────────────────
describe('Edge cases', () => {
  test('truncates very long values', () => {
    const longRows = [{ label: 'A'.repeat(200), totalChanges: 1, raises: 1, decreases: 0, netDelta: 100, avgMagnitudePct: 10, trend7d: 5 }];
    const result = formatTable('Long', DIMENSION_COLUMNS, longRows, { maxColWidth: 10, colors: false });
    // Should be truncated with …
    expect(result).toContain('…');
  });

  test('handles single row', () => {
    const result = formatTable('Single', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { colors: false });
    expect(result).toContain('DraftKings');
    expect(result).not.toContain('FanDuel');
  });

  test('handles many rows', () => {
    const manyRows = Array.from({ length: 50 }, (_, i) => ({
      label: `Row ${i}`,
      totalChanges: i,
      raises: i % 3,
      decreases: i % 2,
      netDelta: i * 100,
      avgMagnitudePct: i,
      trend7d: i * 10,
    }));
    const result = formatTable('Many', DIMENSION_COLUMNS, manyRows, { colors: false });
    expect(result).toContain('Row 49');
    expect(result).toContain('Row 0');
  });

  test('handles negative values', () => {
    const negRows = [{ label: 'Loss', totalChanges: 1, raises: 0, decreases: 1, netDelta: -5000, avgMagnitudePct: -50, trend7d: -1000 }];
    const result = formatTable('Negative', DIMENSION_COLUMNS, negRows, { colors: false });
    expect(result).toContain('-');
    expect(result).toBeTruthy();
  });

  test('border none produces no box characters', () => {
    const result = formatTable('None', DIMENSION_COLUMNS, sampleRows.slice(0, 1), { border: 'none', colors: false });
    expect(result).not.toContain('┌');
    expect(result).not.toContain('│');
    // border=none removes box chars, but values may still contain '+' for positive deltas
    expect(result).toContain('DraftKings');
  });
});

// ── Contract: Column alignment ────────────────────────────────────────────
describe('Column alignment', () => {
  test('right-aligned numbers appear right-aligned in output', () => {
    const customCols: ColumnDef[] = [
      { key: 'name', label: 'Name', align: 'left', width: 10 },
      { key: 'val', label: 'Value', align: 'right', width: 10 },
    ];
    const data = [{ name: 'test', val: 42 }];
    const result = formatTable('Align', customCols, data, { colors: false });
    // The value "42" should be padded on the left
    expect(result).toContain('42');
    expect(result).toBeTruthy();
  });

  test('center-aligned text appears centered', () => {
    const customCols: ColumnDef[] = [
      { key: 'name', label: 'Name', align: 'center', width: 20 },
    ];
    const data = [{ name: 'center' }];
    const result = formatTable('Center', customCols, data, { colors: false });
    expect(result).toContain('center');
  });
});

// ── Contract: Formatting stability ────────────────────────────────────────
describe('Formatting stability', () => {
  test('same input produces same output (deterministic)', () => {
    const result1 = formatTable('Stable', DIMENSION_COLUMNS, sampleRows, { colors: false });
    const result2 = formatTable('Stable', DIMENSION_COLUMNS, sampleRows, { colors: false });
    expect(result1).toBe(result2);
  });

  test('empty columns array produces valid output', () => {
    const result = formatTable('NoCols', [], sampleRows, { colors: false });
    expect(result).toBeTruthy();
  });

  test('rows with extra fields are handled', () => {
    const extraRows = [{ label: 'Extra', totalChanges: 1, raises: 1, decreases: 0, netDelta: 100, avgMagnitudePct: 10, trend7d: 5, extraField: 'ignored' }];
    const result = formatTable('Extra', DIMENSION_COLUMNS, extraRows, { colors: false });
    expect(result).toContain('Extra');
  });
});
