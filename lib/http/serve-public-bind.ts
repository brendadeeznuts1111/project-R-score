// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/toml — Bun.TOML.stringify for bind manifest
// @see https://bun.com/docs/runtime/environment-variables — .env auto-load, Bun.env
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — BUN_PORT / PORT / NODE_PORT
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port: 0 ephemeral
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect probe
/**
 * serve-public bind policy — port precedence, busy-port fallback, loopback URLs, verify base.
 *
 * **Runtime SSOT (Bun docs):** omit `port` on `Bun.serve` → Bun reads `--port` / env internally;
 * after bind read `server.port` / `server.url`. Env values come from `Bun.env` (alias of
 * `process.env`), which Bun populates from shell + auto-loaded `.env` files before this module runs.
 *
 * **This module does not parse `.env` files.** Probes use `resolveBunServeDefaultPort(Bun.env, Bun.argv)`
 * only to predict the port *before* bind or when the server is down. See Bun env docs:
 * https://bun.com/docs/runtime/environment-variables
 *
 * Harness extensions (not in Bun server docs):
 * - connect probe before bind (SO_REUSEPORT can share without EADDRINUSE)
 * - one retry with `port: 0` when default port is busy
 * - bind manifest at `.serve-public/bind.json` for verify tools
 *
 * Operator doc: docs/harness/tenants/serve-public-bind.md
 */
import { formatBindIdentityStartup } from './bind-identity-card.ts';
import type { BunServer } from './bun-server.ts';
import { serveBindSnapshot, type ServeBindSnapshot } from './bun-server.ts';
import { resolveBunServeDefaultPort } from './bun-serve-shape.ts';

export const SERVE_PUBLIC_BIND_DIR = '.serve-public';
export const SERVE_PUBLIC_BIND_FILE = `${SERVE_PUBLIC_BIND_DIR}/bind.json`;
export const SERVE_PUBLIC_BIND_TOML_FILE = `${SERVE_PUBLIC_BIND_DIR}/bind.toml`;
export const SERVE_PUBLIC_BIND_SCHEMA_VERSION = 1 as const;

/** Written on startup; consumed by verify-portal and agent probes. */
export type ServePublicBindManifest = ServeBindSnapshot & {
  schemaVersion: typeof SERVE_PUBLIC_BIND_SCHEMA_VERSION;
  ephemeralFallback: boolean;
  /** Port from resolveBunServeDefaultPort() at bind time (before ephemeral retry). */
  requestedDefaultPort: number;
  boundAt: string;
};

export function isListenPortBusy(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('EADDRINUSE') || /port \d+ in use/i.test(msg);
}

export type ProbeDefaultPortBusyOpts = {
  port?: number;
  /** Connect target when hostname omitted from bind (loopback probe). */
  connectHost?: string;
};

/**
 * Probe whether something already listens on the resolved default port.
 * Bun may use SO_REUSEPORT — a second bind can succeed while traffic round-robins.
 */
export async function probeDefaultPortBusy(opts: ProbeDefaultPortBusyOpts = {}): Promise<boolean> {
  const port = opts.port ?? resolveBunServeDefaultPort();
  if (port === 0) return false;
  const host = opts.connectHost ?? '127.0.0.1';
  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        data() {},
        open(s) {
          s.end();
        },
        error() {},
      },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

export type BindServePublicPortOpts = {
  hostOverride?: string;
  /** Expected port for busy probe + manifest (env chain, TOML, or 3000). */
  requestedPort?: number;
  /** Primary bind: set from TOML; omit for Bun env/default chain. Ephemeral retry always uses 0. */
  initialPort?: number;
  createServer: (options: { port?: number; hostname?: string }) => BunServer;
};

/**
 * Bind with Bun-native default port, falling back once to `port: 0` when busy.
 */
export async function bindServePublicPort(
  opts: BindServePublicPortOpts
): Promise<ServePublicBindManifest> {
  const requestedDefaultPort = opts.requestedPort ?? resolveBunServeDefaultPort();
  const connectHost =
    opts.hostOverride === '0.0.0.0' ? '127.0.0.1' : (opts.hostOverride ?? '127.0.0.1');

  const primaryBindOpts =
    opts.initialPort !== undefined ? { port: opts.initialPort } : ({} as { port?: number });

  if (await probeDefaultPortBusy({ port: requestedDefaultPort, connectHost })) {
    console.warn(
      `[serve] default port ${requestedDefaultPort} already listening — binding ephemeral port instead`
    );
    return manifestFromSnapshot(serveBindSnapshot(opts.createServer({ port: 0 })), {
      ephemeralFallback: true,
      requestedDefaultPort,
    });
  }

  let lastErr: unknown;
  try {
    return manifestFromSnapshot(serveBindSnapshot(opts.createServer(primaryBindOpts)), {
      ephemeralFallback: false,
      requestedDefaultPort,
    });
  } catch (e) {
    lastErr = e;
    if (!isListenPortBusy(e)) throw e;
  }

  try {
    console.warn(
      `[serve] default port ${requestedDefaultPort} busy — retrying with port: 0 (ephemeral)`
    );
    return manifestFromSnapshot(serveBindSnapshot(opts.createServer({ port: 0 })), {
      ephemeralFallback: true,
      requestedDefaultPort,
    });
  } catch (e) {
    lastErr = e;
  }

  console.error(`
Failed to bind serve-public on ${opts.hostOverride ?? '(Bun default hostname)'} port ${requestedDefaultPort}.

  # Free the default port, then re-run (Bun resolves --port → BUN_PORT → PORT → NODE_PORT → 3000):
  lsof -nP -iTCP:${requestedDefaultPort} -sTCP:LISTEN
  kill <PID>

  bun --port=3010 scripts/serve-public.ts
  BUN_PORT=3010 bun scripts/serve-public.ts
  HOST=0.0.0.0 bun scripts/serve-public.ts
`);
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function manifestFromSnapshot(
  snap: ServeBindSnapshot,
  meta: { ephemeralFallback: boolean; requestedDefaultPort: number }
): ServePublicBindManifest {
  return {
    ...snap,
    schemaVersion: SERVE_PUBLIC_BIND_SCHEMA_VERSION,
    ephemeralFallback: meta.ephemeralFallback,
    requestedDefaultPort: meta.requestedDefaultPort,
    boundAt: new Date().toISOString(),
  };
}

/** Persist bind manifest for verify tools (best-effort). Writes JSON + TOML. */
export async function writeServePublicBindManifest(
  manifest: ServePublicBindManifest,
  path = SERVE_PUBLIC_BIND_FILE
): Promise<void> {
  const { server: _server, ...serializable } = manifest;
  await Bun.write(path, `${JSON.stringify(serializable, null, 2)}\n`);
  const tomlPath = path.endsWith('.json')
    ? path.replace(/\.json$/, '.toml')
    : SERVE_PUBLIC_BIND_TOML_FILE;
  await Bun.write(tomlPath, `${Bun.TOML.stringify(serializable)}\n`);
}

/** Read last bind manifest; prefers `.toml` then `.json`. */
export async function readServePublicBindManifest(
  path = SERVE_PUBLIC_BIND_FILE
): Promise<Omit<ServePublicBindManifest, 'server'> | null> {
  const tomlPath = path.endsWith('.json')
    ? path.replace(/\.json$/, '.toml')
    : path.endsWith('.toml')
      ? path
      : SERVE_PUBLIC_BIND_TOML_FILE;
  const tomlFile = Bun.file(tomlPath);
  if (await tomlFile.exists()) {
    try {
      const raw = (await tomlFile.text()) as string;
      const parsed = Bun.TOML.parse(raw) as Partial<ServePublicBindManifest>;
      if (parsed.schemaVersion === SERVE_PUBLIC_BIND_SCHEMA_VERSION && parsed.loopbackOrigin) {
        return parsed as Omit<ServePublicBindManifest, 'server'>;
      }
    } catch {
      /* fall through to JSON */
    }
  }

  const file = Bun.file(path.endsWith('.toml') ? SERVE_PUBLIC_BIND_FILE : path);
  if (!(await file.exists())) return null;
  try {
    const raw = (await file.json()) as Partial<ServePublicBindManifest>;
    if (raw.schemaVersion !== SERVE_PUBLIC_BIND_SCHEMA_VERSION) return null;
    if (typeof raw.loopbackOrigin !== 'string' || typeof raw.port !== 'number') return null;
    return raw as Omit<ServePublicBindManifest, 'server'>;
  } catch {
    return null;
  }
}

/**
 * Base URL for live verify probes.
 * Precedence: PORTAL_VERIFY_BASE → `.serve-public/bind.json` → resolveBunServeDefaultPort().
 */
export async function resolveServePublicVerifyBase(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>,
  argv: string[] = Bun.argv,
  bindFilePath = SERVE_PUBLIC_BIND_FILE
): Promise<string> {
  const explicit = env.PORTAL_VERIFY_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const manifest = await readServePublicBindManifest(bindFilePath);
  if (manifest?.loopbackOrigin) return manifest.loopbackOrigin;

  return `http://127.0.0.1:${resolveBunServeDefaultPort(env, argv)}`;
}

/** Startup log lines after bind (console only). */
export function formatServePublicBindLines(
  manifest: ServePublicBindManifest,
  opts: { dbPath?: string } = {}
): string[] {
  const dbSuffix = opts.dbPath ? `  DB: ${opts.dbPath}` : '';
  const urlPortLabel = manifest.urlPort || 'default (empty · 80/443)';
  // Prefer live Server when still attached; fall back to snapshot fields.
  const docsLines =
    manifest.server != null
      ? [`server.port = ${manifest.server.port}`, `server.url  = ${manifest.server.url.href}`]
      : [`server.port = ${manifest.port}`, `server.url  = ${manifest.url}`];
  const lines = [
    ...docsLines,
    `Bind: ${manifest.protocol}://${manifest.hostname}:${manifest.port} (url.port=${urlPortLabel})${dbSuffix}`,
    `Serve: development=${manifest.development} · protocol=${manifest.protocol} · origin=${manifest.origin} · loopback=${manifest.loopbackOrigin} · routes=SIMD+static · fetch=unmatched`,
    // INDEX + full bind-identity cards (chosen listen after Bun.serve)
    ...formatBindIdentityStartup(manifest).split('\n'),
  ];
  if (manifest.ephemeralFallback) {
    lines.push(
      `(default port busy — bound ephemeral port ${manifest.port}; set BUN_PORT/PORT or bun --port=…)`
    );
  }
  return lines;
}
