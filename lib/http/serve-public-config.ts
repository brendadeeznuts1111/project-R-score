// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/toml — import TOML / Bun.TOML.parse
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — port precedence
/**
 * Optional `config/serve-public.toml` merged with Bun env for bind preferences.
 *
 * Env/CLI port chain wins over TOML (Bun.serve omits `port` so runtime reads env).
 * TOML `[server] port` applies only when BUN_PORT, PORT, NODE_PORT, and `--port` are all unset.
 */
import servePublicToml from '../../config/serve-public.toml';
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
 * Resolve bind prefs from committed TOML + runtime env.
 * Default import is `config/serve-public.toml` (hot-reloads under `bun --hot`).
 */
export function resolveServePublicBindPrefs(
  toml: ServePublicToml = servePublicToml as ServePublicToml,
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
