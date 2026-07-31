import { describe, expect, test } from 'bun:test';
import {
  BUN_RUNTIME_ENV_CONTROLS,
  BUN_RUNTIME_ENV_NAMES,
  isBunRuntimeEnvName,
} from '../lib/bun-runtime-env.ts';
import { classifyEnvVar } from '../scripts/lib/env-defaults-scan.ts';
import { isReservedEnvKey } from '../tools/portal-secret.ts';

describe('Bun runtime environment control plane', () => {
  test('catalogs the documented configuring-Bun variables exactly once', () => {
    expect(BUN_RUNTIME_ENV_NAMES).toEqual([
      'NODE_TLS_REJECT_UNAUTHORIZED',
      'BUN_CONFIG_VERBOSE_FETCH',
      'BUN_RUNTIME_TRANSPILER_CACHE_PATH',
      'TMPDIR',
      'NO_COLOR',
      'FORCE_COLOR',
      'BUN_CONFIG_MAX_HTTP_REQUESTS',
      'BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD',
      'DO_NOT_TRACK',
      'BUN_OPTIONS',
    ]);
    expect(new Set(BUN_RUNTIME_ENV_NAMES).size).toBe(BUN_RUNTIME_ENV_CONTROLS.length);
  });

  test('recognizes controls without treating app configuration as runtime state', () => {
    for (const name of BUN_RUNTIME_ENV_NAMES) {
      expect(isBunRuntimeEnvName(name)).toBe(true);
      expect(classifyEnvVar(name)).toBe('ambient');
      expect(isReservedEnvKey(name)).toBe(true);
    }
    expect(isBunRuntimeEnvName('CLOUDFLARE_API_TOKEN')).toBe(false);
    expect(isBunRuntimeEnvName('SNAPSHOT_PHASE')).toBe(false);
  });
});
