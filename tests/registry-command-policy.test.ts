import { describe, expect, test } from 'bun:test';
import {
  planBunInfo,
  planBunInstall,
  planBunPublish,
  resolveRegistryConfiguration,
  type RegistryPlaneGrant,
} from '../lib/registry/command-policy.ts';

const executable = process.execPath;
const cwd = process.cwd();
const readGrant: RegistryPlaneGrant = {
  operation: 'metadata-read',
  origins: ['https://cli.example'],
  access: 'read',
  reason: 'fixture metadata',
};

describe('registry configuration precedence', () => {
  test('uses CLI then allowed environment, bunfig, npmrc, and default for reads', () => {
    const all = {
      cli: 'https://cli.example',
      environment: { BUN_CONFIG_REGISTRY: 'https://env.example' },
      bunfig: 'https://bunfig.example',
      npmrc: 'https://npmrc.example',
      default: 'https://default.example',
    };
    expect(resolveRegistryConfiguration('metadata-read', all).source).toBe('cli');
    expect(resolveRegistryConfiguration('metadata-read', { ...all, cli: undefined }).source).toBe(
      'environment'
    );
    expect(
      resolveRegistryConfiguration('metadata-read', { ...all, cli: undefined, environment: {} })
        .source
    ).toBe('bunfig');
    expect(
      resolveRegistryConfiguration('metadata-read', { npmrc: all.npmrc, default: all.default })
        .source
    ).toBe('npmrc');
    expect(resolveRegistryConfiguration('artifact-read', { default: all.default }).source).toBe(
      'default'
    );
  });

  test('publishConfig is publish-only and implicit publish fallback is denied', () => {
    expect(
      resolveRegistryConfiguration('publish', {
        publishConfig: 'https://publish.example',
        bunfig: 'https://bunfig.example',
        default: 'https://default.example',
      })
    ).toMatchObject({ source: 'publishConfig', origin: 'https://publish.example' });
    expect(() =>
      resolveRegistryConfiguration('publish', { default: 'https://default.example' })
    ).toThrow('implicit publish fallback');
    expect(
      resolveRegistryConfiguration('install', {
        publishConfig: 'https://ignored.example',
        default: 'https://default.example',
      }).source
    ).toBe('default');
  });

  test('rejects ambiguous definitions and credential-bearing URLs', () => {
    expect(() =>
      resolveRegistryConfiguration('install', { cli: ['https://a.example', 'https://b.example'] })
    ).toThrow('exactly once');
    expect(() =>
      resolveRegistryConfiguration('install', {
        environment: {
          BUN_CONFIG_REGISTRY: 'https://a.example',
          NPM_CONFIG_REGISTRY: 'https://a.example',
        },
      })
    ).toThrow('ambiguous');
    expect(() =>
      resolveRegistryConfiguration('install', {
        environment: {
          BUN_CONFIG_REGISTRY: 'https://a.example',
          BUN_OPTIONS: '--preload=evil.ts',
        },
      })
    ).toThrow('rejects BUN_OPTIONS');
    expect(() =>
      resolveRegistryConfiguration('install', { cli: 'https://user:secret@registry.example' })
    ).toThrow('credentials');
  });
});

describe('guarded Bun package-manager planners', () => {
  test('plans info and install with exact grants and no ambient environment', () => {
    expect(
      planBunInfo({
        executable,
        cwd,
        profile: 'ci',
        registry: { cli: 'https://cli.example/' },
        grants: [readGrant],
        packageName: '@factorywager/registry-client',
        field: 'readme',
        json: true,
        environment: { PATH: '/usr/bin:/bin', CI: 'true' },
      })
    ).toMatchObject({
      argv: [
        'info',
        '@factorywager/registry-client',
        'readme',
        '--registry=https://cli.example',
        '--json',
      ],
      env: { PATH: '/usr/bin:/bin', CI: 'true' },
    });

    const installGrants: RegistryPlaneGrant[] = [
      {
        operation: 'metadata-read',
        origins: ['https://install.example'],
        access: 'read',
        reason: 'fixture install metadata',
      },
      {
        operation: 'artifact-read',
        origins: ['https://install.example'],
        access: 'read',
        reason: 'fixture install artifacts',
      },
    ];
    expect(
      planBunInstall({
        executable,
        cwd,
        profile: 'ci',
        registry: { bunfig: 'https://install.example' },
        grants: installGrants,
        dryRun: true,
        frozenLockfile: true,
        ignoreScripts: true,
      }).argv
    ).toEqual([
      'install',
      '--registry=https://install.example',
      '--dry-run',
      '--frozen-lockfile',
      '--ignore-scripts',
    ]);
    expect(() =>
      planBunInstall({
        executable,
        cwd,
        profile: 'ci',
        registry: { cli: 'https://install.example' },
        grants: [installGrants[0]!],
        dryRun: true,
      })
    ).toThrow('artifact-read');
  });

  test('denies proxy, composite, experimental, and registry environment injection', () => {
    for (const environment of [
      { BUN_OPTIONS: '--preload=evil.ts' },
      { HTTPS_PROXY: 'http://proxy.example' },
      { BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT: '1' },
      { BUN_CONFIG_REGISTRY: 'https://env.example' },
    ]) {
      expect(() =>
        planBunInfo({
          executable,
          cwd,
          profile: 'ci',
          registry: { cli: 'https://cli.example' },
          grants: [readGrant],
          packageName: 'react',
          environment,
        })
      ).toThrow('environment');
    }
  });

  test('requires write-plane authority and an explicit publish registry', () => {
    expect(() =>
      planBunPublish({
        executable,
        cwd,
        profile: 'release',
        registry: { default: 'https://publish.example' },
        grants: [],
        dryRun: true,
      })
    ).toThrow('implicit publish fallback');
    expect(() =>
      planBunPublish({
        executable,
        cwd,
        profile: 'release',
        registry: { cli: 'https://publish.example' },
        grants: [
          {
            operation: 'publish',
            origins: ['https://publish.example'],
            access: 'read',
            reason: 'wrong plane',
          },
        ],
        dryRun: true,
      })
    ).toThrow('write plane grant');
    expect(() =>
      planBunPublish({
        executable,
        cwd,
        profile: 'production',
        registry: { cli: 'https://publish.example' },
        grants: [
          {
            operation: 'publish',
            origins: ['https://publish.example'],
            access: 'write',
            reason: 'wrong profile',
          },
        ],
      })
    ).toThrow('release-profile only');
    expect(
      planBunPublish({
        executable,
        cwd,
        profile: 'release',
        registry: { cli: 'https://publish.example' },
        grants: [
          {
            operation: 'publish',
            origins: ['https://publish.example'],
            access: 'write',
            reason: 'release authority',
          },
        ],
        tarball: '/tmp/package.tgz',
        tag: 'canary',
        dryRun: true,
      }).argv
    ).toEqual([
      'publish',
      '/tmp/package.tgz',
      '--registry=https://publish.example',
      '--tag',
      'canary',
      '--dry-run',
    ]);
  });
});
