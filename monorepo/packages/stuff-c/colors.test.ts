import { test, expect } from 'bun:test';
import { green, red, yellow, cyan, bold, dim, setStripColors } from './colors';

test('green() wraps text with ANSI codes', () => {
  setStripColors(false);
  expect(green('OK')).toBe('\x1b[32mOK\x1b[0m');
});

test('NO_COLOR=1 returns plain text', () => {
  setStripColors(true);
  expect(green('OK')).toBe('OK');
  setStripColors(false);
});

test('all color functions produce ANSI output', () => {
  setStripColors(false);
  expect(red('err')).toBe('\x1b[31merr\x1b[0m');
  expect(yellow('warn')).toBe('\x1b[33mwarn\x1b[0m');
  expect(cyan('info')).toBe('\x1b[36minfo\x1b[0m');
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
