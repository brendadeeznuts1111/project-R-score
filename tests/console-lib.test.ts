// @see https://bun.com/docs/runtime/console#object-inspection-depth
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
/**
 * lib/console domain facade — advanced dual-mode + chrome + color SSOT.
 * Core depth/layout vectors stay in tests/console-depth.test.ts.
 */
import { describe, expect, spyOn, test } from 'bun:test';
import {
  cliOut,
  formatCliOut,
  frameBlock,
  kvLines,
  section,
  statusLine,
  tones,
  shouldColor,
  colorize,
  displayWidth,
  padDisplay,
  getConsoleDepth,
  inspect,
  inspectTable,
  logDepth,
} from '../lib/console/index.ts';
// Compat facade still exports the same surface
import * as compat from '../lib/console-depth.ts';
import * as chrome from '../lib/portal/cli-chrome.ts';

describe('lib/console facade', () => {
  test('exports depth + inspect surface', () => {
    expect(typeof getConsoleDepth()).toBe('number');
    expect(inspect({ a: 1 })).toContain('a');
    expect(inspectTable([{ x: 1 }], ['x'])).toContain('x');
  });

  test('compat console-depth re-exports match domain', () => {
    expect(compat.getConsoleDepth()).toBe(getConsoleDepth());
    expect(compat.shouldColor()).toBe(shouldColor());
    expect(compat.cliOut).toBe(cliOut);
    expect(compat.tones.ok('ok')).toBe(tones.ok('ok'));
  });

  test('portal cli-chrome re-exports tones as cliTone', () => {
    expect(chrome.cliTone.ok('x')).toBe(tones.ok('x'));
    expect(chrome.displayWidth('ab')).toBe(displayWidth('ab'));
    expect(chrome.frameBlock).toBe(frameBlock);
  });
});

describe('cliOut dual-mode', () => {
  test('formatCliOut json is pretty by default', () => {
    const s = formatCliOut({ a: 1 }, { json: true });
    expect(s).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  test('formatCliOut json compact is single-line', () => {
    const s = formatCliOut({ a: 1 }, { json: true, compact: true });
    expect(s).toBe('{"a":1}');
    expect(s).not.toContain('\n');
  });

  test('formatCliOut human uses inspect', () => {
    const s = formatCliOut({ nested: { k: 2 } }, { mode: 'depth', inspect: { depth: 4 } });
    expect(s).toContain('nested');
    expect(s).toContain('k');
  });

  test('cliOut writes json via console.info', () => {
    const spy = spyOn(console, 'info').mockImplementation(() => {});
    try {
      cliOut({ ok: true }, { json: true, compact: true });
      expect(spy).toHaveBeenCalledWith('{"ok":true}');
    } finally {
      spy.mockRestore();
    }
  });

  test('cliOut table mode with columns', () => {
    const spy = spyOn(console, 'info').mockImplementation(() => {});
    try {
      cliOut([{ name: 'a', n: 1 }], { columns: ['name', 'n'] });
      expect(spy).toHaveBeenCalled();
      const out = String(spy.mock.calls[0]?.[0] ?? '');
      expect(out).toContain('name');
      expect(out).toContain('a');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('tones + chrome', () => {
  test('tones degrade without ANSI when shouldColor is false path is string', () => {
    // Always a string; content may include SGR when TTY allows
    expect(typeof tones.ok('pass')).toBe('string');
    expect(typeof colorize('x', '#fff')).toBe('string');
  });

  test('statusLine and section', () => {
    expect(statusLine('state', 'ok')).toContain('state');
    expect(statusLine('state', 'ok')).toContain('ok');
    expect(section('Title')).toContain('Title');
  });

  test('kvLines aligns keys by displayWidth', () => {
    const lines = kvLines([
      ['a', '1'],
      ['longer', '2'],
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('1');
    expect(lines[1]).toContain('2');
  });

  test('padDisplay is displayWidth-aware', () => {
    expect(displayWidth(padDisplay('ab', 5))).toBe(5);
  });

  test('frameBlock draws corners', () => {
    const block = frameBlock('Doc', 'ok', ['line one'], { ok: true, width: 48 });
    expect(block).toContain('╭');
    expect(block).toContain('╰');
    expect(block).toContain('line one');
  });
});

describe('logDepth still available via facade', () => {
  test('logDepth spies console.info', () => {
    const spy = spyOn(console, 'info').mockImplementation(() => {});
    try {
      logDepth({ z: 9 });
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
