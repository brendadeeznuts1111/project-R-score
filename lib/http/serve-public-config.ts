// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @updated Bun.TOML.parse · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.TOML.parse · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.TOML.parse · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/toml#bun-toml-parse
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/toml — Bun.TOML.parse
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — port precedence
/**
 * Optional `config/serve-public.toml` merged with Bun env for bind preferences.
 *
 * Env/CLI port chain wins over TOML (Bun.serve omits `port` so runtime reads env).
 * TOML `[server] port` applies only when BUN_PORT, PORT, NODE_PORT, and `--port` are all unset.
 */
import {
  BUN_SERVE_DEFAULT_PORT_ENV,
  parseBunPortFlag,
  resolveBunServeDefaultPort,
} from './bun-serve-shape.ts';

export type ServePublicToml = {
  metadata?: { version?: number; description?: string };
  server?: { port?: number; host?: string };
  dev?: { development?: boolean; hmr?: boolean };
};

export type ServePublicPortSource = 'bun-env' | 'toml' | 'bun-default';

export type ServePublicBindPrefs = {
  /** Passed to Bun.serve when TOML pins port; undefined → omit (Bun env/default). */
  port?: number;
  portSource: ServePublicPortSource;
  /** For busy-port probe and manifest.requestedDefaultPort. */
  requestedPort: number;
  hostname?: string;
  hostnameSource: 'env' | 'toml' | 'bun-default';
  toml: ServePublicToml;
};

export async function loadServePublicToml(
  path = 'config/serve-public.toml'
): Promise<ServePublicToml> {
  if (typeof Bun === 'undefined') return {};
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  return Bun.TOML.parse(await file.text()) as ServePublicToml;
}

function envPortExplicit(env: Record<string, string | undefined>): number | undefined {
  for (const key of BUN_SERVE_DEFAULT_PORT_ENV) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    const port = Number(raw);
    if (Number.isInteger(port) && port >= 1 && port <= 65535) return port;
  }
  return undefined;
}

/** True when Bun's env/CLI port chain is active (TOML port must not override bind). */
export function isBunEnvPortChainActive(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>,
  argv: string[] = Bun.argv
): boolean {
  return parseBunPortFlag(argv) !== undefined || envPortExplicit(env) !== undefined;
}

/**
 * Resolve bind prefs from an optional TOML object plus runtime env.
 */
export function resolveServePublicBindPrefs(
  toml: ServePublicToml = {},
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>,
  argv: string[] = Bun.argv
): ServePublicBindPrefs {
  const envHost = (env.HOST || env.BIND_HOST)?.trim() || undefined;
  const tomlHost = toml.server?.host?.trim() || undefined;
  const hostname = envHost ?? tomlHost;
  const hostnameSource: ServePublicBindPrefs['hostnameSource'] = envHost
    ? 'env'
    : tomlHost
      ? 'toml'
      : 'bun-default';

  if (isBunEnvPortChainActive(env, argv)) {
    return {
      port: undefined,
      portSource: 'bun-env',
      requestedPort: resolveBunServeDefaultPort(env, argv),
      hostname,
      hostnameSource,
      toml,
    };
  }

  const tomlPort = toml.server?.port;
  if (tomlPort !== undefined && Number.isInteger(tomlPort) && tomlPort >= 0 && tomlPort <= 65535) {
    return {
      port: tomlPort,
      portSource: 'toml',
      requestedPort: tomlPort,
      hostname,
      hostnameSource,
      toml,
    };
  }

  return {
    port: undefined,
    portSource: 'bun-default',
    requestedPort: resolveBunServeDefaultPort(env, argv),
    hostname,
    hostnameSource,
    toml,
  };
}
