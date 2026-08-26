import { describe, expect, test } from 'bun:test';

import {
  CONTROL_POLICY,
  bunHelpControlDrift,
  controlPolicySchemaIssues,
  evaluateControlPolicy,
} from '../lib/security/control-policy.ts';

describe('control-policy schema', () => {
  test('is machine-readable, internally consistent, and composes with the CLI SSOT', () => {
    expect(controlPolicySchemaIssues()).toEqual([]);
    expect(CONTROL_POLICY.map(spec => spec.id)).toEqual([
      'registry',
      'fetch-preconnect',
      'preload',
      'experimental-http2-fetch',
      'experimental-http3-fetch',
      'config',
      'env-file',
      'cwd',
      'request-proxy',
      'request-unix',
      'request-tls',
      'request-protocol',
    ]);
    expect(CONTROL_POLICY.every(spec => spec.securityDenial)).toBe(true);
  });

  test('matches representative aliases in the pinned Bun help surface', () => {
    const runtime = Bun.spawnSync({
      cmd: [process.execPath, '--help'],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const install = Bun.spawnSync({
      cmd: [process.execPath, 'install', '--help'],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(runtime.exitCode).toBe(0);
    expect(install.exitCode).toBe(0);
    expect(bunHelpControlDrift(runtime.stdout.toString(), install.stdout.toString())).toEqual([]);
  });
});

describe('control-policy CLI boundary', () => {
  test('canonicalizes exact preload aliases and accepts both value forms', () => {
    const evaluated = evaluateControlPolicy({
      profile: 'test',
      command: 'runtime',
      argv: [
        '-r',
        './first.ts',
        '--preload=./second.ts',
        '--require',
        './third.ts',
        '--import=./fourth.ts',
        'app.ts',
      ],
    });

    expect(evaluated.ok).toBe(true);
    expect(evaluated.effective.map(item => [item.control, item.spelling, item.value])).toEqual([
      ['preload', '-r', './first.ts'],
      ['preload', '--preload', './second.ts'],
      ['preload', '--require', './third.ts'],
      ['preload', '--import', './fourth.ts'],
    ]);
    expect(evaluated.applicationArgv).toEqual(['app.ts']);
  });

  test('is case-sensitive and rejects unknown short controls by default', () => {
    for (const flag of ['--Preload', '-O', '-R', '-o']) {
      const evaluated = evaluateControlPolicy({
        profile: 'development',
        command: 'runtime',
        argv: [flag],
      });
      expect(evaluated.ok).toBe(false);
      expect(evaluated.rejected).toContainEqual(
        expect.objectContaining({ code: 'unknown-control', spelling: flag, source: 'cli' })
      );
    }
  });

  test('validates boolean and required-value forms', () => {
    const evaluated = evaluateControlPolicy({
      profile: 'test',
      command: 'runtime',
      argv: [
        '--experimental-http2-fetch=true',
        '--fetch-preconnect',
        '--experimental-http2-fetch',
      ],
    });

    expect(evaluated.ok).toBe(false);
    expect(evaluated.rejected.map(item => item.code)).toEqual(['unexpected-value', 'missing-value']);
    expect(evaluated.effective).toContainEqual(
      expect.objectContaining({ control: 'experimental-http2-fetch', value: true })
    );
  });

  test('stops interpreting controls at the entrypoint and the -- terminator', () => {
    const entrypoint = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      argv: ['app.ts', '--experimental-http3-fetch', '-O'],
    });
    expect(entrypoint.ok).toBe(true);
    expect(entrypoint.effective).toEqual([]);
    expect(entrypoint.applicationArgv).toEqual(['app.ts', '--experimental-http3-fetch', '-O']);

    const terminated = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      argv: ['--', '--experimental-http3-fetch'],
    });
    expect(terminated.ok).toBe(true);
    expect(terminated.applicationArgv).toEqual(['--', '--experimental-http3-fetch']);
  });

  test('enforces command ownership for registry and config controls', () => {
    const wrongCommand = evaluateControlPolicy({
      profile: 'development',
      command: 'runtime',
      argv: ['--registry', 'https://registry.example.test'],
    });
    expect(wrongCommand.rejected).toContainEqual(
      expect.objectContaining({ code: 'wrong-command', control: 'registry' })
    );

    const install = evaluateControlPolicy({
      profile: 'release',
      command: 'install',
      argv: [
        '-c',
        './bunfig.release.toml',
        '--cwd=/workspace',
        '--registry=https://registry.example.test',
        'pkg',
      ],
    });
    expect(install.ok).toBe(true);
    expect(install.effective.map(item => item.control)).toEqual(['registry', 'config', 'cwd']);
    expect(install.applicationArgv).toEqual(['pkg']);

    const registryAfterPackage = evaluateControlPolicy({
      profile: 'release',
      command: 'publish',
      argv: ['pkg', '--registry', 'https://publish.example.test'],
    });
    expect(registryAfterPackage.ok).toBe(true);
    expect(registryAfterPackage.effective).toContainEqual(
      expect.objectContaining({ control: 'registry', value: 'https://publish.example.test' })
    );
    expect(registryAfterPackage.applicationArgv).toEqual(['pkg']);
  });
});

describe('control-policy composition', () => {
  test('applies bunfig < environment < CLI precedence and redacts registry credentials', () => {
    const evaluated = evaluateControlPolicy({
      profile: 'development',
      command: 'install',
      argv: ['--registry=https://cli-user:cli-pass@cli.example.test', 'pkg'],
      environment: { BUN_CONFIG_REGISTRY: 'https://env.example.test' },
      bunfig: { 'install.registry': 'https://config.example.test' },
    });

    expect(evaluated.ok).toBe(true);
    expect(evaluated.effective).toContainEqual(
      expect.objectContaining({
        control: 'registry',
        source: 'cli',
        value: 'https://cli-user:cli-pass@cli.example.test',
        redactedValue: 'https://%3Credacted%3E:%3Credacted%3E@cli.example.test/',
      })
    );
    expect(evaluated.shadowed.map(item => item.source)).toEqual(['bunfig', 'environment']);
  });

  test('treats experimental environment equivalents exactly like CLI grants', () => {
    const h2 = evaluateControlPolicy({
      profile: 'ci',
      command: 'runtime',
      environment: { BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT: '1' },
    });
    expect(h2.ok).toBe(true);
    expect(h2.effective).toContainEqual(
      expect.objectContaining({ control: 'experimental-http2-fetch', value: true })
    );

    const malformed = evaluateControlPolicy({
      profile: 'ci',
      command: 'runtime',
      environment: { BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT: 'yes' },
    });
    expect(malformed.rejected).toContainEqual(
      expect.objectContaining({ code: 'invalid-value', control: 'experimental-http2-fetch' })
    );

    const explicitlyDisabled = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      environment: { BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT: '0' },
    });
    expect(explicitlyDisabled.ok).toBe(true);
    expect(explicitlyDisabled.effective).toContainEqual(
      expect.objectContaining({ control: 'experimental-http2-fetch', value: false })
    );
  });

  test('does not allow an override to loosen production or offline security denials', () => {
    const production = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      argv: ['--experimental-http2-fetch'],
      overrides: [
        { control: 'experimental-http2-fetch', decision: 'allow', reason: 'caller requested it' },
      ],
    });
    expect(production.rejected).toContainEqual(
      expect.objectContaining({ code: 'security-denial-non-overridable' })
    );

    const offline = evaluateControlPolicy({
      profile: 'offline',
      command: 'runtime',
      argv: ['--fetch-preconnect=https://example.test'],
      overrides: [
        { control: 'fetch-preconnect', decision: 'allow', reason: 'caller requested it' },
      ],
    });
    expect(offline.rejected).toContainEqual(
      expect.objectContaining({ code: 'security-denial-non-overridable' })
    );
  });

  test('permits overrides to tighten an allowed profile', () => {
    const evaluated = evaluateControlPolicy({
      profile: 'canary',
      command: 'runtime',
      argv: ['--experimental-http3-fetch'],
      overrides: [
        { control: 'experimental-http3-fetch', decision: 'deny', reason: 'tenant disabled it' },
      ],
    });
    expect(evaluated.rejected).toContainEqual(
      expect.objectContaining({ code: 'profile-denied', control: 'experimental-http3-fetch' })
    );
  });
});

describe('request override controls', () => {
  test('accepts declared proxy and H2 controls while exposing forwarding policy', () => {
    const evaluated = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      request: {
        proxy: 'https://proxy-user:proxy-pass@proxy.example.test',
        protocol: 'h2',
      },
    });

    expect(evaluated.ok).toBe(true);
    expect(evaluated.effective).toContainEqual(
      expect.objectContaining({ control: 'request-proxy', forwarding: 'sanitized' })
    );
    expect(evaluated.effective).toContainEqual(
      expect.objectContaining({ control: 'request-protocol', value: 'h2' })
    );
  });

  test('denies custom TLS, H3 outside canary, unix sockets outside local profiles, and unknowns', () => {
    const evaluated = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      request: {
        tls: { rejectUnauthorized: false },
        unix: '/var/run/service.sock',
        protocol: 'h3',
        surprise: true,
      },
    });

    expect(evaluated.ok).toBe(false);
    expect(evaluated.rejected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'profile-denied', control: 'request-tls' }),
        expect.objectContaining({ code: 'profile-denied', control: 'request-unix' }),
        expect.objectContaining({ code: 'value-denied', control: 'request-protocol' }),
        expect.objectContaining({ code: 'unknown-control', spelling: 'surprise' }),
      ])
    );
    expect(evaluated.rejected.find(item => item.control === 'request-tls')?.redactedValue).toBe(
      '<redacted>'
    );
  });

  test('allows H3 only in canary and never allows request controls offline', () => {
    const canary = evaluateControlPolicy({
      profile: 'canary',
      command: 'runtime',
      request: { protocol: 'h3' },
    });
    expect(canary.ok).toBe(true);

    const offline = evaluateControlPolicy({
      profile: 'offline',
      command: 'runtime',
      request: { proxy: 'https://proxy.example.test', protocol: 'http/1.1' },
    });
    expect(offline.rejected.map(item => item.code)).toEqual(['profile-denied', 'profile-denied']);
  });
});
