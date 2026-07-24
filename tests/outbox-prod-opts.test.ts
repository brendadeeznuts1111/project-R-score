/**
 * Production outbox opts — projectorBackend honesty + requireR2 fail-closed.
 */
import { describe, expect, test } from 'bun:test';
import { resolveProductionOutboxOpts } from '../lib/channels/outbox-prod-opts.ts';

describe('resolveProductionOutboxOpts', () => {
  test('surfaces projectorBackend r2 or memory without throwing by default', () => {
    const opts = resolveProductionOutboxOpts({ deliver: false });
    expect(opts.projectorBackend === 'r2' || opts.projectorBackend === 'memory').toBe(true);
    if (opts.projectorBackend === 'r2') {
      expect(opts.r2Store).toBeDefined();
      expect(opts.r2Error).toBeUndefined();
    } else {
      expect(opts.r2Store).toBeUndefined();
      expect(typeof opts.r2Error).toBe('string');
    }
  });

  test('requireR2 throws when R2 unavailable', () => {
    const probe = resolveProductionOutboxOpts({ deliver: false });
    if (probe.projectorBackend === 'r2') {
      // Environment has valid R2 — requireR2 must succeed.
      const opts = resolveProductionOutboxOpts({ deliver: false, requireR2: true });
      expect(opts.projectorBackend).toBe('r2');
      return;
    }
    expect(() => resolveProductionOutboxOpts({ deliver: false, requireR2: true })).toThrow(
      /R2 outbox required/
    );
  });
});
