// @see https://bun.com/docs/runtime/debugger#print-fetch-nodehttp-requests-as-curl-commands — BUN_CONFIG_VERBOSE_FETCH
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { describe, expect, test } from 'bun:test';
import {
  BUN_DEFAULT_MAX_HTTP_REQUESTS,
  BUN_RUNTIME_ENV_CONTROLS,
  BUN_RUNTIME_ENV_NAMES,
  assessBunRuntimeEnv,
  isBunRuntimeEnvName,
} from '../lib/bun-runtime-env.ts';
import { classifyEnvVar } from '../scripts/lib/env-defaults-scan.ts';
import { isReservedEnvKey } from '../tools/portal-secret.ts';

/** Child Bun process: local serve + fetch under BUN_CONFIG_VERBOSE_FETCH (no external net). */
async function verboseFetchChildOutput(mode: string): Promise<string> {
  const proc = Bun.spawn({
    cmd: [
      'bun',
      '-e',
      `
const s = Bun.serve({ port: 0, fetch() { return new Response("ok"); } });
await fetch("http://127.0.0.1:" + s.port + "/");
s.stop(true);
`,
    ],
    env: { ...Bun.env, BUN_CONFIG_VERBOSE_FETCH: mode },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out =
    (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
  const code = await proc.exited;
  expect(code).toBe(0);
  return out;
}

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

  test('resolves documented defaults and precedence', () => {
    const defaults = assessBunRuntimeEnv({});
    expect(defaults.issues).toEqual([]);
    expect(defaults.effective).toEqual({
      tlsVerification: 'enabled',
      verboseFetch: 'off',
      transpilerCache: 'platform',
      tempDirectory: 'platform',
      color: 'auto',
      maxHttpRequests: BUN_DEFAULT_MAX_HTTP_REQUESTS,
      clearTerminalOnReload: 'default',
      crashReports: 'default',
      bunOptions: 'unset',
    });

    const configured = assessBunRuntimeEnv({
      FORCE_COLOR: '1',
      NO_COLOR: '1',
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0',
      BUN_CONFIG_MAX_HTTP_REQUESTS: '64',
      BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD: 'true',
      DO_NOT_TRACK: '1',
      TMPDIR: '/private/tmp/custom',
    });
    expect(configured.issues).toEqual([]);
    expect(configured.effective.color).toBe('forced');
    expect(configured.effective.transpilerCache).toBe('disabled');
    expect(configured.effective.maxHttpRequests).toBe(64);
    expect(configured.effective.clearTerminalOnReload).toBe('preserved');
    expect(configured.effective.crashReports).toBe('disabled');
    expect(configured.effective.tempDirectory).toBe('custom');
  });

  test('finds unsafe or ineffective controls without exposing BUN_OPTIONS', () => {
    const secretishOptions = '--preload=pass://vault/private-item/password';
    const assessment = assessBunRuntimeEnv({
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
      BUN_CONFIG_MAX_HTTP_REQUESTS: '-1',
      BUN_CONFIG_VERBOSE_FETCH: 'yes',
      BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD: 'yes',
      DO_NOT_TRACK: 'yes',
      NO_COLOR: 'sometimes',
      FORCE_COLOR: 'always',
      BUN_OPTIONS: secretishOptions,
    });
    expect(assessment.issues.map(item => item.code)).toEqual([
      'tls-verification-disabled',
      'invalid-verbose-fetch',
      'invalid-no-color',
      'invalid-force-color',
      'invalid-max-http-requests',
      'invalid-no-clear-terminal',
      'invalid-do-not-track',
    ]);
    expect(assessment.effective.bunOptions).toBe('configured');
    expect(JSON.stringify(assessment)).not.toContain(secretishOptions);
  });

  test('BUN_CONFIG_VERBOSE_FETCH matches debugger plane (true|false|curl; 1/0 compat)', () => {
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: 'true' }).effective.verboseFetch).toBe(
      'headers'
    );
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: '1' }).effective.verboseFetch).toBe(
      'headers'
    );
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: 'curl' }).effective.verboseFetch).toBe(
      'curl'
    );
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: 'false' }).effective.verboseFetch).toBe(
      'off'
    );
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: '0' }).effective.verboseFetch).toBe(
      'off'
    );
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: 'true' }).issues).toEqual([]);
    expect(assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: 'false' }).issues).toEqual([]);
    const bad = assessBunRuntimeEnv({ BUN_CONFIG_VERBOSE_FETCH: 'yes' });
    expect(bad.effective.verboseFetch).toBe('invalid');
    expect(bad.issues.some(i => i.code === 'invalid-verbose-fetch')).toBe(true);
  });

  test('smoke: BUN_CONFIG_VERBOSE_FETCH child fetch matches debugger plane (incl. 1/0)', async () => {
    const curlOut = await verboseFetchChildOutput('curl');
    expect(curlOut).toMatch(/curl --http/);
    expect(curlOut).toMatch(/HTTP\/1\.1 GET/);
    expect(curlOut).toMatch(/200/);

    const trueOut = await verboseFetchChildOutput('true');
    expect(trueOut).not.toMatch(/curl --http/);
    expect(trueOut).toMatch(/HTTP\/1\.1 GET/);

    const oneOut = await verboseFetchChildOutput('1');
    expect(oneOut).not.toMatch(/curl --http/);
    expect(oneOut).toMatch(/HTTP\/1\.1 GET/);

    expect(await verboseFetchChildOutput('false')).toBe('');
    expect(await verboseFetchChildOutput('0')).toBe('');
  });
});
