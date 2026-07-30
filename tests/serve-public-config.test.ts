// @see https://bun.com/docs/test/writing-tests
// @see https://bun.com/docs/runtime/toml
import { describe, expect, test } from 'bun:test';
import {
  isBunEnvPortChainActive,
  resolveServePublicBindPrefs,
  type ServePublicToml,
} from '../lib/http/serve-public-config.ts';

describe('lib/http/serve-public-config', () => {
  test('env/CLI port chain beats TOML port', () => {
    const toml: ServePublicToml = { server: { port: 4000, host: '127.0.0.1' } };
    const prefs = resolveServePublicBindPrefs(toml, { BUN_PORT: '3099' }, [
      'bun',
      'scripts/serve-public.ts',
    ]);
    expect(prefs.portSource).toBe('bun-env');
    expect(prefs.port).toBeUndefined();
    expect(prefs.requestedPort).toBe(3099);
  });

  test('--port flag activates bun-env source', () => {
    expect(
      isBunEnvPortChainActive({}, ['bun', '--port=3010', 'scripts/serve-public.ts'])
    ).toBe(true);
    const prefs = resolveServePublicBindPrefs({ server: { port: 4000 } }, {}, [
      'bun',
      '--port=3010',
      'scripts/serve-public.ts',
    ]);
    expect(prefs.portSource).toBe('bun-env');
    expect(prefs.requestedPort).toBe(3010);
  });

  test('TOML port used when env chain unset', () => {
    const prefs = resolveServePublicBindPrefs({ server: { port: 8787, host: '0.0.0.0' } }, {}, [
      'bun',
      'scripts/serve-public.ts',
    ]);
    expect(prefs.portSource).toBe('toml');
    expect(prefs.port).toBe(8787);
    expect(prefs.requestedPort).toBe(8787);
    expect(prefs.hostname).toBe('0.0.0.0');
    expect(prefs.hostnameSource).toBe('toml');
  });

  test('HOST env beats TOML host', () => {
    const prefs = resolveServePublicBindPrefs(
      { server: { host: '127.0.0.1' } },
      { HOST: '0.0.0.0' },
      ['bun', 'scripts/serve-public.ts']
    );
    expect(prefs.hostname).toBe('0.0.0.0');
    expect(prefs.hostnameSource).toBe('env');
  });

  test('bun-default when TOML has no server port', () => {
    const prefs = resolveServePublicBindPrefs({}, {}, ['bun', 'scripts/serve-public.ts']);
    expect(prefs.portSource).toBe('bun-default');
    expect(prefs.port).toBeUndefined();
    expect(prefs.requestedPort).toBe(3000);
  });
});
