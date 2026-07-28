// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/color#format-colors-as-ansi-for-terminals — Bun.color
import { describe, expect, test } from 'bun:test';
import { colorize } from '../lib/security/vault-map.ts';

/** Run fn with selected env vars overridden, then restored. */
function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    saved[k] = Bun.env[k];
    if (vars[k] === undefined) delete Bun.env[k];
    else Bun.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete Bun.env[k];
      else Bun.env[k] = saved[k];
    }
  }
}

describe('vault-map colorize (stderr-gated)', () => {
  test('plain text when stderr is piped (default in tests)', () => {
    // Test process stderr is not a TTY; FORCE_COLOR must be unset.
    const out = withEnv({ FORCE_COLOR: undefined, NO_COLOR: undefined }, () =>
      colorize('✓', '#2da44e')
    );
    expect(out).toBe('✓');
  });

  test('NO_COLOR yields plain text even with a color', () => {
    const out = withEnv({ NO_COLOR: '1', FORCE_COLOR: undefined }, () =>
      colorize('✓', '#2da44e')
    );
    expect(out).toBe('✓');
  });

  test('FORCE_COLOR=1 overrides NO_COLOR and emits codes', () => {
    const out = withEnv({ FORCE_COLOR: '1', NO_COLOR: '1' }, () => colorize('✓', '#2da44e'));
    expect(out).toContain('\x1b[');
    expect(out).toContain('✓');
    expect(out.endsWith('\x1b[0m')).toBe(true);
  });

  test('empty color or empty text passes through untouched', () => {
    expect(colorize('✓', null)).toBe('✓');
    expect(colorize('', '#fff')).toBe('');
  });
});
