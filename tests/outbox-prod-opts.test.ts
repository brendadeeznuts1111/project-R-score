/**
 * Production outbox opts — channel registry bucket pin + requireR2 fail-closed.
 */
import { describe, expect, test } from 'bun:test';
import { factoryRegistryBucketFromEnv, r2BucketFromEnv } from '../config/r2-env.ts';
import { resolveProductionOutboxOpts } from '../lib/channels/outbox-prod-opts.ts';
import { resolveChannelR2BridgeConfig } from '../scripts/lib/r2-bridge.ts';

describe('resolveProductionOutboxOpts', () => {
  test('surfaces projectorBackend r2 or memory without throwing by default', () => {
    const opts = resolveProductionOutboxOpts({ deliver: false });
    expect(opts.projectorBackend === 'r2' || opts.projectorBackend === 'memory').toBe(true);
    if (opts.projectorBackend === 'r2') {
      expect(opts.r2Store).toBeDefined();
      expect(opts.r2Error).toBeUndefined();
      expect(opts.projectorBucket).toBe(factoryRegistryBucketFromEnv());
    } else {
      expect(opts.r2Store).toBeUndefined();
      expect(typeof opts.r2Error).toBe('string');
    }
  });

  test('channel bridge pin ignores bench cascade bucket', () => {
    const channel = resolveChannelR2BridgeConfig();
    expect(channel.bucket).toBe(factoryRegistryBucketFromEnv());
    // Live hosts often set R2_BUCKET_NAME=bun-secrets for bench — channel must not follow it.
    const bench = r2BucketFromEnv();
    if (bench && bench !== factoryRegistryBucketFromEnv()) {
      expect(channel.bucket).not.toBe(bench);
    }
  });

  test('requireR2 throws when R2 unavailable', () => {
    const probe = resolveProductionOutboxOpts({ deliver: false });
    if (probe.projectorBackend === 'r2') {
      const opts = resolveProductionOutboxOpts({ deliver: false, requireR2: true });
      expect(opts.projectorBackend).toBe('r2');
      expect(opts.projectorBucket).toBe(factoryRegistryBucketFromEnv());
      return;
    }
    expect(() => resolveProductionOutboxOpts({ deliver: false, requireR2: true })).toThrow(
      /R2 outbox required/
    );
  });
});
