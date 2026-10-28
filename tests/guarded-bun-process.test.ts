import { describe, expect, test } from 'bun:test';
import {
  BunChildAuthorityError,
  prepareGuardedBunChild,
  type BunChildAuthority,
} from '../lib/security/guarded-bun-process.ts';

const cwd = process.cwd();
const executable = process.execPath;
const authority: BunChildAuthority = {
  executable,
  argv: ['--experimental-http2-fetch', 'worker.ts', '--registry=application-value'],
  cwd,
  environment: { PATH: ['/usr/bin:/bin'] },
  profile: 'test',
  command: 'runtime',
  controlGrants: [
    { control: 'experimental-http2-fetch', values: ['enabled'], reason: 'protocol test' },
  ],
  reason: 'hermetic worker test',
};

describe('guarded Bun child authority', () => {
  test('returns only exact declared environment and keeps post-entrypoint args application-owned', () => {
    expect(
      prepareGuardedBunChild({
        authority,
        executable,
        argv: authority.argv,
        cwd,
        environment: { PATH: '/usr/bin:/bin', BUN_OPTIONS: '   ' },
      })
    ).toEqual({
      cmd: [executable, ...authority.argv],
      cwd,
      env: { PATH: '/usr/bin:/bin' },
    });
  });

  test('denies executable, argv, cwd, and undeclared environment changes', () => {
    const common = { authority, executable, argv: authority.argv, cwd };
    expect(() => prepareGuardedBunChild({ ...common, executable: 'node' })).toThrow(
      BunChildAuthorityError
    );
    expect(() =>
      prepareGuardedBunChild({ ...common, argv: [...authority.argv, '--smuggled'] })
    ).toThrow('argv is not exactly authorized');
    expect(() => prepareGuardedBunChild({ ...common, cwd: `${cwd}/tests` })).toThrow(
      'cwd is not exactly authorized'
    );
    expect(() =>
      prepareGuardedBunChild({ ...common, environment: { HTTPS_PROXY: 'http://proxy.test' } })
    ).toThrow('authority-bearing child environment');

    const proxyAuthority = { ...authority, environment: { HTTPS_PROXY: ['http://proxy.test'] } };
    expect(() =>
      prepareGuardedBunChild({
        ...common,
        authority: proxyAuthority,
        environment: { HTTPS_PROXY: 'http://proxy.test' },
      })
    ).toThrow('Unsupported authority-bearing child environment');
  });

  test('shared control policy rejects composite and registry environment injection', () => {
    const bunOptionsAuthority = {
      ...authority,
      environment: { BUN_OPTIONS: ['--preload=evil.ts'] },
    };
    expect(() =>
      prepareGuardedBunChild({
        authority: bunOptionsAuthority,
        executable,
        argv: bunOptionsAuthority.argv,
        cwd,
        environment: { BUN_OPTIONS: '--preload=evil.ts' },
      })
    ).toThrow('BUN_OPTIONS: composite-source-denied');

    const registryAuthority = {
      ...authority,
      environment: { BUN_CONFIG_REGISTRY: ['https://user:secret@registry.test'] },
    };
    expect(() =>
      prepareGuardedBunChild({
        authority: registryAuthority,
        executable,
        argv: registryAuthority.argv,
        cwd,
        environment: { BUN_CONFIG_REGISTRY: 'https://user:secret@registry.test' },
      })
    ).toThrow('BUN_CONFIG_REGISTRY: invalid-value');
  });

  test('requires an exact registry grant for package-manager flags', () => {
    const installAuthority: BunChildAuthority = {
      executable,
      argv: ['install', '--registry=https://registry.example', 'demo'],
      cwd,
      environment: {},
      profile: 'ci',
      command: 'install',
      controlGrants: [
        { control: 'registry', values: ['https://registry.example'], reason: 'fixture registry' },
      ],
      reason: 'hermetic install fixture',
    };
    expect(
      prepareGuardedBunChild({
        authority: installAuthority,
        executable,
        argv: installAuthority.argv,
        cwd,
      }).cmd
    ).toEqual([executable, ...installAuthority.argv]);

    expect(() =>
      prepareGuardedBunChild({
        authority: { ...installAuthority, controlGrants: [] },
        executable,
        argv: installAuthority.argv,
        cwd,
      })
    ).toThrow('--registry: missing-grant');
  });

  test('denies production runtime auto-install controls', () => {
    for (const autoInstall of ['--install=fallback', '--install=force', '-i']) {
      const productionAuthority: BunChildAuthority = {
        executable,
        argv: [autoInstall, 'server.ts'],
        cwd,
        environment: {},
        profile: 'production',
        command: 'runtime',
        reason: 'production runtime fixture',
      };
      expect(() =>
        prepareGuardedBunChild({
          authority: productionAuthority,
          executable,
          argv: productionAuthority.argv,
          cwd,
        })
      ).toThrow(`${autoInstall.split('=')[0]}: unknown-control`);
    }
  });

  test('cannot transit registry, connect, proxy, preload, or experimental overrides implicitly', () => {
    const fixedAuthority: BunChildAuthority = {
      executable,
      argv: ['run', 'fixed-tool.ts'],
      cwd,
      environment: {},
      profile: 'ci',
      command: 'runtime',
      reason: 'fixed hermetic tool fixture',
    };
    const injected = [
      '--registry=https://registry.attacker.test',
      '--connect=https://connect.attacker.test',
      '-O=preload-attacker.ts',
      '-R=preload-attacker.ts',
      '--experimental-http2-fetch',
      '--experimental-http3-fetch',
    ];
    for (const control of injected) {
      expect(() =>
        prepareGuardedBunChild({
          authority: fixedAuthority,
          executable,
          argv: [control, ...fixedAuthority.argv],
          cwd,
        })
      ).toThrow('argv is not exactly authorized');
    }
    for (const [name, value] of [
      ['HTTPS_PROXY', 'http://proxy.attacker.test'],
      ['BUN_CONFIG_REGISTRY', 'https://registry.attacker.test'],
      ['BUN_OPTIONS', '--experimental-http2-fetch'],
    ] as const) {
      expect(() =>
        prepareGuardedBunChild({
          authority: fixedAuthority,
          executable,
          argv: fixedAuthority.argv,
          cwd,
          environment: { [name]: value },
        })
      ).toThrow();
    }
  });
});
