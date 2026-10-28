import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun.ts';
import {
  prepareGuardedLocalBunPm,
  type GuardedLocalPmArgv,
} from '../scripts/lib/guarded-bun-pm.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('guarded local Bun PM probes', () => {
  test('prepares only the exact reviewed argv, root cwd, and declared environment', () => {
    const prepared = prepareGuardedLocalBunPm(
      ['pm', 'cache'],
      { HOME: '/tmp/factory-pm-home' },
      ROOT
    );
    expect(prepared.cmd.slice(1)).toEqual(['pm', 'cache']);
    expect(prepared.cwd).toBe(ROOT);
    expect(prepared.env).toEqual({ HOME: '/tmp/factory-pm-home' });
  });

  test('denies registry, connect, optimization, require, and experimental transit', () => {
    for (const injected of [
      '--registry=https://evil.invalid',
      '--connect=evil.invalid',
      '-O',
      '-R',
      '--experimental-http2-fetch',
      '--experimental-http3-fetch',
      '--preload=./inject.ts',
      '--require=./inject.ts',
    ]) {
      expect(() =>
        prepareGuardedLocalBunPm(
          ['pm', 'cache', injected] as unknown as GuardedLocalPmArgv,
          {},
          ROOT
        )
      ).toThrow('Unreviewed local Bun PM argv');
    }
  });

  test('denies alternate cwd and ambient proxy or registry environment', () => {
    expect(() => prepareGuardedLocalBunPm(['pm', 'cache'], {}, '/tmp')).toThrow(
      'restricted'
    );
    expect(() =>
      prepareGuardedLocalBunPm(
        ['pm', 'cache'],
        { HTTPS_PROXY: 'https://evil.invalid' } as never,
        ROOT
      )
    ).toThrow('Unsupported authority-bearing child environment');
  });
});
