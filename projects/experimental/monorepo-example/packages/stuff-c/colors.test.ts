import { test, expect } from 'bun:test';
import { green, red, yellow, cyan, bold, dim, setStripColors } from './colors';

test('green() wraps text with Bun.color truecolor ANSI', () => {
  setStripColors(false);
  const result = green('OK');
  // Bun.color("green","ansi-16m") produces truecolor ESC[38;2;... sequences
  expect(result).toContain('OK');
  expect(result).toContain('\x1b[');
  expect(result).toEndWith('\x1b[0m');
});

test('NO_COLOR=1 returns plain text', () => {
  setStripColors(true);
  expect(green('OK')).toBe('OK');
  setStripColors(false);
});

test('all color functions produce ANSI output', () => {
  setStripColors(false);
  for (const fn of [red, yellow, cyan]) {
    const out = fn('test');
    expect(out).toContain('test');
    expect(out).toContain('\x1b[');
    expect(out).toEndWith('\x1b[0m');
  }
  expect(bold('title')).toBe('\x1b[1mtitle\x1b[0m');
  expect(dim('note')).toBe('\x1b[2mnote\x1b[0m');
});

test('all color functions strip when disabled', () => {
  setStripColors(true);
  expect(red('err')).toBe('err');
  expect(yellow('warn')).toBe('warn');
  expect(cyan('info')).toBe('info');
  expect(bold('title')).toBe('title');
  expect(dim('note')).toBe('note');
  setStripColors(false);
});

test('Bun.color-based green wraps with truecolor ANSI', () => {
  setStripColors(false);
  const result = green('hello');
  // Should contain ESC[38;2; prefix for truecolor
  expect(result).toMatch(/\x1b\[38;2;\d+;\d+;\d+m/);
  expect(result).toContain('hello');
});

test('bold still uses manual ANSI code (not Bun.color)', () => {
  setStripColors(false);
  // bold should use exact \x1b[1m prefix, not truecolor
  expect(bold('hi')).toBe('\x1b[1mhi\x1b[0m');
});
