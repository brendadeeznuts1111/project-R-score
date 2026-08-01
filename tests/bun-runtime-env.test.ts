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

const VERBOSE_FETCH_SMOKE_TIMEOUT_MS = 5_000;

/**
 * Docs (debugger sample, UA Bun/1.3.3) label lines as `[fetch] $` / `[fetch] >` / `[fetch] <`.
 * Bun 1.4 may omit the `[fetch]` tag and the `$` before curl. Match both shapes.
 */
const FETCH_TAG = '(?:\\[fetch\\]\\s*)?';
const RE_CURL_LINE = new RegExp(`${FETCH_TAG}\\$?\\s*curl --http`);
const RE_REQUEST_LINE = new RegExp(`${FETCH_TAG}>?\\s*HTTP/1\\.1`);
const RE_RESPONSE_OK = new RegExp(`${FETCH_TAG}<?\\s*200`);

async function runChildFetchSmoke(
  label: string,
  opts: { envValue?: string | undefined; fetchVerbose?: true | 'curl' | undefined }
): Promise<{ out: string; exitCode: number }> {
  const env: Record<string, string | undefined> = { ...Bun.env };
  delete env.BUN_CONFIG_VERBOSE_FETCH;
  if (opts.envValue !== undefined) env.BUN_CONFIG_VERBOSE_FETCH = opts.envValue;

  const verboseArg =
    opts.fetchVerbose === undefined
      ? ''
      : opts.fetchVerbose === true
        ? ', verbose: true'
        : ', verbose: "curl"';

  const proc = Bun.spawn({
    cmd: [
      'bun',
      '-e',
      `
const s = Bun.serve({ port: 0, fetch() { return new Response("ok"); } });
await fetch("http://127.0.0.1:" + s.port + "/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ foo: "bar" })
  ${verboseArg}
});
s.stop(true);
`,
    ],
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const read = Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]).then(([stdout, stderr, exitCode]) => ({
    out: stdout + stderr,
    exitCode: exitCode ?? 1,
  }));

  const timed = Bun.sleep(VERBOSE_FETCH_SMOKE_TIMEOUT_MS).then(async () => {
    proc.kill();
    throw new Error(
      `verbose-fetch smoke timed out after ${VERBOSE_FETCH_SMOKE_TIMEOUT_MS}ms (${label})`
    );
  });

  return await Promise.race([read, timed]);
}

/** Env plane — `1`/`0` are Bun runtime aliases for true/false. */
const VERBOSE_FETCH_ENV_CASES = [
  {
    value: 'curl' as const,
    expectCurl: true,
    expectTraffic: true,
    expectEmpty: false,
  },
  {
    value: 'true' as const,
    expectCurl: false,
    expectTraffic: true,
    expectEmpty: false,
  },
  {
    value: '1' as const,
    expectCurl: false,
    expectTraffic: true,
    expectEmpty: false,
  },
  {
    value: 'false' as const,
    expectCurl: false,
    expectTraffic: false,
    expectEmpty: true,
  },
  {
    value: '0' as const,
    expectCurl: false,
    expectTraffic: false,
    expectEmpty: true,
  },
  {
    value: undefined,
    expectCurl: false,
    expectTraffic: false,
    expectEmpty: true,
  },
] as const;

function assertVerboseTraffic(
  out: string,
  opts: { expectCurl: boolean; expectTraffic: boolean; expectEmpty: boolean }
): void {
  if (opts.expectEmpty) {
    expect(out).toBe('');
    return;
  }
  if (opts.expectCurl) {
    expect(out).toMatch(RE_CURL_LINE);
  } else {
    expect(out).not.toMatch(RE_CURL_LINE);
  }
  if (opts.expectTraffic) {
    expect(out).toMatch(RE_REQUEST_LINE);
    expect(out).toMatch(RE_RESPONSE_OK);
  } else {
    expect(out).not.toMatch(RE_REQUEST_LINE);
  }
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

  test('smoke: BUN_CONFIG_VERBOSE_FETCH env plane (docs [fetch] tag optional; 1/0 aliases)', async () => {
    // HTTP loopback only — TLS uses the same logger; cert fixtures omitted.
    for (const c of VERBOSE_FETCH_ENV_CASES) {
      const { out, exitCode } = await runChildFetchSmoke(`env=${JSON.stringify(c.value)}`, {
        envValue: c.value,
      });
      expect(exitCode).toBe(0);
      assertVerboseTraffic(out, c);
    }
  });

  test('smoke: fetch({ verbose }) per-request plane (no env)', async () => {
    for (const verbose of [true, 'curl'] as const) {
      const { out, exitCode } = await runChildFetchSmoke(`fetchVerbose=${JSON.stringify(verbose)}`, {
        fetchVerbose: verbose,
      });
      expect(exitCode).toBe(0);
      assertVerboseTraffic(out, {
        expectCurl: verbose === 'curl',
        expectTraffic: true,
        expectEmpty: false,
      });
    }
  });
});
