// @see https://bun.com/docs/test/index#run-tests — bun:test

import { beforeEach, afterEach, describe, expect, test } from 'bun:test';
import {
  ANSI_RESET,
  AUTO_TERMINAL_COLOR_FORMAT,
  brandHex,
  brandRgb,
  colors,
  formatTerminal,
  getCallCount,
  hello,
  resetCallCount,
  TERMINAL_COLOR_FORMATS,
  terminalColorFormat,
  terminalColorOpen,
} from '../src/index';

describe('library entry point', () => {
  // ── Lifecycle ─────────────────────────────────────────────────────

  beforeEach(() => {
    resetCallCount();
  });

  afterEach(() => {
    // Cleanup after each test — no-op here, but demonstrates the pattern
  });

  // ── Tests ─────────────────────────────────────────────────────────

  test('hello returns greeting', () => {
    expect(hello()).toBe('Hello, world!');
    expect(getCallCount()).toBe(1);
  });

  test('hello greets named person', () => {
    expect(hello('Bun')).toBe('Hello, Bun!');
    expect(getCallCount()).toBe(1);
  });

  test('call count resets between tests via beforeEach', () => {
    hello('a');
    hello('b');
    expect(getCallCount()).toBe(2);
    // beforeEach ensures counter resets to 0 before each test
  });

  test('terminal formatting defines Bun.color ansi auto-detection', () => {
    expect(AUTO_TERMINAL_COLOR_FORMAT).toBe('ansi');
    expect(TERMINAL_COLOR_FORMATS).toEqual({
      auto: 'ansi',
      '16': 'ansi-16',
      '256': 'ansi-256',
      truecolor: 'ansi-16m',
    });
    expect(terminalColorFormat()).toBe('ansi');
    expect(terminalColorFormat('truecolor')).toBe('ansi-16m');
    expect(formatTerminal('ready', 'not-a-color')).toBe('ready');
  });

  test('fixed terminal depth produces a reset-balanced serialization', () => {
    const open = terminalColorOpen('#e06c75', 'truecolor');
    expect(open).toBe('\x1b[38;2;224;108;117m');
    expect(formatTerminal('ready', '#e06c75', 'truecolor')).toBe(`${open}ready${ANSI_RESET}`);
    expect(terminalColorOpen('#e06c75', '256')).toStartWith('\x1b[38;5;');
  });

  test('semantic colors share the brand manifest representations', () => {
    expect(brandHex).toBe('#7dd3c0');
    expect(brandRgb).toEqual({ r: 125, g: 211, b: 192 });
    expect(colors.brand('brand')).toBe(formatTerminal('brand', brandHex));
    expect(colors.green('ok')).toBe(formatTerminal('ok', '#00cc66'));
  });
});
