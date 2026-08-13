import { beforeEach, afterEach, describe, expect, test } from 'bun:test';
import {
  AUTO_TERMINAL_COLOR_FORMAT,
  formatTerminal,
  getCallCount,
  hello,
  resetCallCount,
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
    expect(formatTerminal('ready', 'not-a-color')).toBe('ready');
  });
});
