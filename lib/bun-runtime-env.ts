// @see https://bun.com/docs/runtime/environment-variables#configuring-bun
// @see https://bun.com/docs/runtime/debugger#print-fetch-nodehttp-requests-as-curl-commands — BUN_CONFIG_VERBOSE_FETCH
// @see https://bun.com/docs/runtime/networking/fetch#debugging — fetch({ verbose })
/**
 * Bun/runtime control-plane environment variables.
 *
 * These keys configure the runtime or host process. They are ambient inputs,
 * not application configuration and never valid vault-autofill destinations.
 */
export const BUN_RUNTIME_ENV_CONTROLS = [
  {
    name: 'NODE_TLS_REJECT_UNAUTHORIZED',
    scope: 'security',
    effect: 'Controls TLS certificate verification; 0 disables verification.',
  },
  {
    name: 'BUN_CONFIG_VERBOSE_FETCH',
    scope: 'network',
    // Debugger plane docs: true|false|curl. Bun also accepts 1≡true and 0≡false
    // (assessor + runtime smoke). Per-request plane is fetch({ verbose }) — not this env.
    effect:
      'Fetch/node:http diagnostics: true|1=headers, curl=copy-pasteable curl, false|0=off (1/0 Bun aliases).',
  },
  {
    name: 'BUN_RUNTIME_TRANSPILER_CACHE_PATH',
    scope: 'cache',
    effect: 'Overrides the runtime transpiler cache path; empty or 0 disables it.',
  },
  {
    name: 'TMPDIR',
    scope: 'host',
    effect: 'Overrides the host temporary directory.',
  },
  {
    name: 'NO_COLOR',
    scope: 'output',
    effect: 'Disables ANSI color output.',
  },
  {
    name: 'FORCE_COLOR',
    scope: 'output',
    effect: 'Forces ANSI color output and takes precedence over NO_COLOR.',
  },
  {
    name: 'BUN_CONFIG_MAX_HTTP_REQUESTS',
    scope: 'network',
    effect: 'Sets the maximum number of concurrent HTTP requests.',
  },
  {
    name: 'BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD',
    scope: 'output',
    effect: 'Keeps terminal output visible during watch-mode reloads.',
  },
  {
    name: 'DO_NOT_TRACK',
    scope: 'privacy',
    effect: 'Disables Bun crash-report uploads and telemetry.',
  },
  {
    name: 'BUN_OPTIONS',
    scope: 'execution',
    effect: 'Prepends arguments to every Bun invocation.',
  },
] as const;

export type BunRuntimeEnvName = (typeof BUN_RUNTIME_ENV_CONTROLS)[number]['name'];

export const BUN_RUNTIME_ENV_NAMES: readonly BunRuntimeEnvName[] = BUN_RUNTIME_ENV_CONTROLS.map(
  control => control.name
);

const BUN_RUNTIME_ENV_NAME_SET = new Set<string>(BUN_RUNTIME_ENV_NAMES);

export function isBunRuntimeEnvName(name: string): name is BunRuntimeEnvName {
  return BUN_RUNTIME_ENV_NAME_SET.has(name);
}

export type BunRuntimeEnvIssueSeverity = 'fatal' | 'warn';

export type BunRuntimeEnvIssueCode =
  | 'tls-verification-disabled'
  | 'invalid-max-http-requests'
  | 'invalid-verbose-fetch'
  | 'invalid-no-clear-terminal'
  | 'invalid-do-not-track'
  | 'invalid-no-color'
  | 'invalid-force-color';

export type BunRuntimeEnvIssue = {
  code: BunRuntimeEnvIssueCode;
  name: BunRuntimeEnvName;
  severity: BunRuntimeEnvIssueSeverity;
  message: string;
};

export type BunRuntimeEnvEffectiveState = {
  tlsVerification: 'enabled' | 'disabled';
  verboseFetch: 'off' | 'headers' | 'curl' | 'invalid';
  transpilerCache: 'platform' | 'disabled' | 'custom';
  tempDirectory: 'platform' | 'custom';
  color: 'auto' | 'disabled' | 'forced';
  maxHttpRequests: number | 'invalid';
  clearTerminalOnReload: 'default' | 'preserved';
  crashReports: 'default' | 'disabled';
  bunOptions: 'unset' | 'configured';
};

export type BunRuntimeEnvAssessment = {
  configured: BunRuntimeEnvName[];
  issues: BunRuntimeEnvIssue[];
  effective: BunRuntimeEnvEffectiveState;
};

export const BUN_DEFAULT_MAX_HTTP_REQUESTS = 256;

function issue(
  code: BunRuntimeEnvIssueCode,
  name: BunRuntimeEnvName,
  severity: BunRuntimeEnvIssueSeverity,
  message: string
): BunRuntimeEnvIssue {
  return { code, name, severity, message };
}

/**
 * Interpret Bun's runtime controls without returning their raw values.
 *
 * `BUN_OPTIONS` is deliberately reduced to configured/unset so doctor and
 * registry output can never echo operator-supplied command arguments.
 */
export function assessBunRuntimeEnv(
  env: Readonly<Record<string, string | undefined>>
): BunRuntimeEnvAssessment {
  const issues: BunRuntimeEnvIssue[] = [];
  const configured = BUN_RUNTIME_ENV_NAMES.filter(name => env[name] !== undefined);

  const tlsVerification =
    env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? ('disabled' as const) : ('enabled' as const);
  if (tlsVerification === 'disabled') {
    issues.push(
      issue(
        'tls-verification-disabled',
        'NODE_TLS_REJECT_UNAUTHORIZED',
        'fatal',
        'TLS certificate verification is disabled.'
      )
    );
  }

  // Debugger docs: true | curl | false. Compat: 1≡true, 0≡false, unset/''≡off.
  const verboseRaw = env.BUN_CONFIG_VERBOSE_FETCH;
  const verboseFetch =
    verboseRaw === undefined || verboseRaw === '' || verboseRaw === 'false' || verboseRaw === '0'
      ? ('off' as const)
      : verboseRaw === 'true' || verboseRaw === '1'
        ? ('headers' as const)
        : verboseRaw === 'curl'
          ? ('curl' as const)
          : ('invalid' as const);
  if (verboseFetch === 'invalid') {
    issues.push(
      issue(
        'invalid-verbose-fetch',
        'BUN_CONFIG_VERBOSE_FETCH',
        'warn',
        'BUN_CONFIG_VERBOSE_FETCH must be unset, true, false, curl (or 1/0).'
      )
    );
  }

  const cacheRaw = env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  const transpilerCache =
    cacheRaw === undefined
      ? ('platform' as const)
      : cacheRaw === '' || cacheRaw === '0'
        ? ('disabled' as const)
        : ('custom' as const);

  const tempDirectory = env.TMPDIR ? ('custom' as const) : ('platform' as const);

  const noColorRaw = env.NO_COLOR;
  if (noColorRaw !== undefined && noColorRaw !== '' && noColorRaw !== '0' && noColorRaw !== '1') {
    issues.push(issue('invalid-no-color', 'NO_COLOR', 'warn', 'NO_COLOR must be unset, 0, or 1.'));
  }
  const forceColorRaw = env.FORCE_COLOR;
  if (
    forceColorRaw !== undefined &&
    forceColorRaw !== '' &&
    forceColorRaw !== '0' &&
    forceColorRaw !== '1'
  ) {
    issues.push(
      issue('invalid-force-color', 'FORCE_COLOR', 'warn', 'FORCE_COLOR must be unset, 0, or 1.')
    );
  }
  const color =
    forceColorRaw === '1'
      ? ('forced' as const)
      : noColorRaw === '1'
        ? ('disabled' as const)
        : ('auto' as const);

  const maxHttpRaw = env.BUN_CONFIG_MAX_HTTP_REQUESTS;
  let maxHttpRequests: number | 'invalid' = BUN_DEFAULT_MAX_HTTP_REQUESTS;
  if (maxHttpRaw !== undefined) {
    const parsed = Number(maxHttpRaw);
    if (!/^[1-9]\d*$/.test(maxHttpRaw) || !Number.isSafeInteger(parsed) || parsed <= 0) {
      maxHttpRequests = 'invalid';
      issues.push(
        issue(
          'invalid-max-http-requests',
          'BUN_CONFIG_MAX_HTTP_REQUESTS',
          'warn',
          'Maximum HTTP requests must be a positive safe integer.'
        )
      );
    } else {
      maxHttpRequests = parsed;
    }
  }

  const noClearRaw = env.BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD;
  if (
    noClearRaw !== undefined &&
    noClearRaw !== '' &&
    noClearRaw !== 'false' &&
    noClearRaw !== '0' &&
    noClearRaw !== 'true'
  ) {
    issues.push(
      issue(
        'invalid-no-clear-terminal',
        'BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD',
        'warn',
        'No-clear-terminal must be unset, false, 0, or true.'
      )
    );
  }
  const clearTerminalOnReload =
    noClearRaw === 'true' ? ('preserved' as const) : ('default' as const);

  const doNotTrackRaw = env.DO_NOT_TRACK;
  if (
    doNotTrackRaw !== undefined &&
    doNotTrackRaw !== '' &&
    doNotTrackRaw !== '0' &&
    doNotTrackRaw !== '1'
  ) {
    issues.push(
      issue('invalid-do-not-track', 'DO_NOT_TRACK', 'warn', 'DO_NOT_TRACK must be unset, 0, or 1.')
    );
  }
  const crashReports = doNotTrackRaw === '1' ? ('disabled' as const) : ('default' as const);

  return {
    configured,
    issues,
    effective: {
      tlsVerification,
      verboseFetch,
      transpilerCache,
      tempDirectory,
      color,
      maxHttpRequests,
      clearTerminalOnReload,
      crashReports,
      bunOptions: env.BUN_OPTIONS ? 'configured' : 'unset',
    },
  };
}
