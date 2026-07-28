// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
import { describe, expect, test } from 'bun:test';
import {
  cliTone,
  columnTable,
  displayWidth,
  frameBlock,
  padDisplay,
  truncateDisplay,
} from '../lib/portal/cli-chrome.ts';
import {
  doctorUsesPlainFormat,
  formatPortalDoctorPlain,
  formatPortalDoctorPretty,
} from '../tools/lib/portal-cli-doctor.ts';

describe('cli-chrome · Bun.stringWidth layout', () => {
  test('cliTone is plain when NO_COLOR (shouldColor false)', () => {
    const prev = Bun.env.NO_COLOR;
    const prevForce = Bun.env.FORCE_COLOR;
    Bun.env.NO_COLOR = '1';
    delete Bun.env.FORCE_COLOR;
    try {
      expect(cliTone.ok('OK')).toBe('OK');
      expect(cliTone.ok('OK')).not.toContain('\x1b[');
    } finally {
      if (prev === undefined) delete Bun.env.NO_COLOR;
      else Bun.env.NO_COLOR = prev;
      if (prevForce === undefined) delete Bun.env.FORCE_COLOR;
      else Bun.env.FORCE_COLOR = prevForce;
    }
  });

  test('doctor plain vs pretty format selection', () => {
    expect(doctorUsesPlainFormat({ PORTAL_DOCTOR_FORMAT: 'plain' })).toBe(true);
    expect(doctorUsesPlainFormat({ PORTAL_DOCTOR_FORMAT: 'pretty' })).toBe(false);
    expect(doctorUsesPlainFormat({ CI: 'true' })).toBe(true);
  });

  test('displayWidth ignores ANSI escape codes', () => {
    expect(displayWidth('OK')).toBe(2);
    expect(displayWidth('\u001b[31mOK\u001b[0m')).toBe(2);
    expect(displayWidth('🚀')).toBe(2); // wide emoji
  });

  test('padDisplay aligns by visible width not string length', () => {
    const a = padDisplay('\u001b[32mOK\u001b[0m', 6);
    const b = padDisplay('OK', 6);
    expect(displayWidth(a)).toBe(6);
    expect(displayWidth(b)).toBe(6);
  });

  test('truncateDisplay respects max columns', () => {
    expect(truncateDisplay('hello world', 8)).toBe('hello w…');
    expect(displayWidth(truncateDisplay('hello world', 8))).toBeLessThanOrEqual(8);
    expect(truncateDisplay('short', 10)).toBe('short');
  });

  test('truncateDisplay preserves ANSI via Bun.sliceAnsi', () => {
    const colored = '\u001b[31mhello world\u001b[0m';
    const out = truncateDisplay(colored, 8);
    expect(displayWidth(out)).toBeLessThanOrEqual(8);
    expect(out).toContain('\u001b[31m');
    expect(out).toContain('…');
  });

  test('columnTable aligns columns by stringWidth', () => {
    const lines = columnTable(
      ['name', 'ver'],
      [
        ['Vault inject', '2.2.0'],
        ['Pack', '1.4.0'],
      ],
      { maxWidths: [14, 6], gap: 2 }
    );
    expect(lines.length).toBe(4); // header + rule + 2 rows
    // each data line same display width
    const w0 = displayWidth(lines[0]!);
    const w2 = displayWidth(lines[2]!);
    expect(w0).toBe(w2);
  });

  test('frameBlock box is consistent width', () => {
    const block = frameBlock('title', 'OK', ['  key   value', 'short'], { width: 40, ok: true });
    const lines = block.split('\n');
    const widths = lines.map(l => displayWidth(l));
    expect(new Set(widths).size).toBe(1);
  });
});

describe('Bun.deepEquals strict mode (bake SSOT)', () => {
  test('strict treats missing vs undefined as unequal', () => {
    expect(Bun.deepEquals({ a: 1 }, { a: 1, b: undefined }, false)).toBe(true);
    expect(Bun.deepEquals({ a: 1 }, { a: 1, b: undefined }, true)).toBe(false);
  });

  test('deepEquals matches equal row shapes', () => {
    const a = { capability: 'Sleep', minBun: '1.0.0', api: 'Bun.sleep' };
    const b = { capability: 'Sleep', minBun: '1.0.0', api: 'Bun.sleep' };
    expect(Bun.deepEquals(a, b, true)).toBe(true);
    expect(Bun.deepEquals(a, { ...b, minBun: '1.4.0' }, true)).toBe(false);
  });
});
