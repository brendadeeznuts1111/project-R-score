import { test, expect } from 'bun:test';

test('green() wraps text with ANSI codes', async () => {
  // Import fresh module without NO_COLOR
  const { green, setStripColors } = await import('./colors');
  setStripColors(false);
  const result = green('OK');
  expect(result).toBe('\x1b[32mOK\x1b[0m');
});

test('NO_COLOR=1 returns plain text', async () => {
  const { green, setStripColors } = await import('./colors');
  setStripColors(true);
  const result = green('OK');
  expect(result).toBe('OK');
  // Restore
  setStripColors(false);
});
