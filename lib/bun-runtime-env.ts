// @see https://bun.com/docs/runtime/environment-variables#configuring-bun
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
    effect: 'Enables fetch diagnostics; curl adds curl-style request output.',
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
