// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
/**
 * Bun.serve Server bind-field cross-reference — docs, bun-types, runtime, FactoryWager.
 *
 * Operate loop sources (do not guess):
 * - Published docs: `bun tools/bun-doc-refs.ts suggest "Bun.serve reference"`
 * - bun-types: `packages/bun-types/serve.d.ts` on oven-sh/bun (pinned in package.json)
 * - RSS / releases: `bun tools/bun-docs-feeds.ts refresh` → tools/bun-docs-feeds.json
 * - Runtime: `probeServerShape()` on this machine
 *
 * @see https://bun.com/docs/runtime/http/server#reference — published Server interface
 * @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port env precedence
 * @see https://bun.com/docs/runtime/environment-variables — Bun.env / .env auto-load (PORT, BUN_PORT)
 * @see https://bun.com/docs/runtime/http/tls — protocol https when TLS enabled
 * @see https://github.com/oven-sh/bun/blob/main/packages/bun-types/serve.d.ts — bun-types SSOT
 * @see https://bun.com/rss.xml — release feed (indexed locally)
 */
type BunServer = ReturnType<typeof Bun.serve>;

/** Canonical cross-ref URLs for agents and drift audits. */
export const BUN_SERVE_CROSS_REF = {
  docsBasic: 'https://bun.com/docs/runtime/http/server#basic-setup',
  docsReference: 'https://bun.com/docs/runtime/http/server#reference',
  docsPortHostname: 'https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname',
  docsTls: 'https://bun.com/docs/runtime/http/tls',
  docsRouting: 'https://bun.com/docs/runtime/http/routing',
  bunTypesServe: 'https://github.com/oven-sh/bun/blob/main/packages/bun-types/serve.d.ts',
  rss: 'https://bun.com/rss.xml',
  releaseIndex: 'tools/bun-docs-feeds.json',
  catalogToken: 'Bun.serve',
} as const;

export type BunServeShapeDocsStatus = 'documented' | 'via-url-only' | 'missing';

/** One row of the bind-field drift matrix (static — refresh after docs:refresh). */
export type BunServeShapeRow = {
  field: string;
  /** Published #reference block (2026-07-22 scrape). */
  docsReference: BunServeShapeDocsStatus;
  /** Summary from bun-types serve.d.ts Server interface. */
  bunTypes: string;
  /** Typical / allowed runtime values. */
  values: string;
  /**
   * When the Bun.serve *option* is omitted (pre-bind attempt), or n/a for derived fields.
   * Not the same as “read after bind” — Bun recommends server.port / server.url for the chosen listen.
   */
  defaultWhen: string;
  /** Resolution chain, twin field, or busy-port / unix fallback. */
  fallback: string;
  /** Verified on Bun 1.4.0 canary unless noted. */
  runtimeNote: string;
  /** Mapped in lib/http/bun-server.ts ServerIdentity. */
  factoryField: string;
};

/**
 * Known drift between published docs, bun-types, and runtime.
 * `server.protocol` is in bun-types + runtime but absent from published #reference (2026-07-22).
 *
 * Bun recommend: after bind, read chosen listen from `server.port` / `server.url`
 * ([port + hostname](https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname)).
 */
export const BUN_SERVE_SHAPE_MATRIX: readonly BunServeShapeRow[] = [
  {
    field: 'server.port',
    docsReference: 'documented',
    bunTypes: 'number | undefined',
    values: '1–65535 TCP · undefined on unix',
    defaultWhen: 'omit option → --port → BUN_PORT → PORT → NODE_PORT → 3000',
    fallback: 'port:0 → OS ephemeral; EADDRINUSE → harness retry port:0; always re-read after bind',
    runtimeNote: 'Chosen listen — never guess from env after Bun.serve returns',
    factoryField: 'port',
  },
  {
    field: 'server.url',
    docsReference: 'documented',
    bunTypes: 'URL',
    values: 'http(s)://host:port/ …',
    defaultWhen: 'derived after bind (not a Bun.serve option)',
    fallback: 'unix → non-TCP URL shape; prefer loopbackOrigin when hostname is 0.0.0.0',
    runtimeNote: 'Docs startup: Server running at ${server.url}',
    factoryField: 'url',
  },
  {
    field: 'server.url.port',
    docsReference: 'via-url-only',
    bunTypes: 'string (URL.port)',
    values: '"3000" · "" on default 80/443',
    defaultWhen: 'n/a — mirror of listen',
    fallback: 'empty string ≠ missing; compare to String(server.port) except 80/443',
    runtimeNote: 'Twin of server.port — type is string',
    factoryField: 'urlPort',
  },
  {
    field: 'server.url.href',
    docsReference: 'documented',
    bunTypes: 'string (URL.href)',
    values: 'http://localhost:3000/',
    defaultWhen: 'n/a — derived',
    fallback: 'trailing slash on root path',
    runtimeNote: 'Full href; same plane as server.url',
    factoryField: 'url',
  },
  {
    field: 'server.url.origin',
    docsReference: 'via-url-only',
    bunTypes: 'string (URL.origin)',
    values: 'http://localhost:3000',
    defaultWhen: 'n/a — derived',
    fallback: 'scheme+host+port; use for absolute fetch bases',
    runtimeNote: 'No path — good loopback base',
    factoryField: 'origin',
  },
  {
    field: 'server.hostname',
    docsReference: 'documented',
    bunTypes: 'string | undefined',
    values: '0.0.0.0 · localhost · 127.0.0.1 · FQDN bind',
    defaultWhen: 'docs: 0.0.0.0 · 1.4 canary often localhost when omitted',
    fallback: 'undefined on unix · NOT a DNS HostId',
    runtimeNote: 'OS bind address only — never assign to HostId',
    factoryField: 'hostname',
  },
  {
    field: 'server.url.hostname',
    docsReference: 'via-url-only',
    bunTypes: 'string (URL.hostname)',
    values: 'localhost · 127.0.0.1 · …',
    defaultWhen: 'n/a — derived from listen',
    fallback: 'may differ from server.hostname when printing loopback',
    runtimeNote: 'Still bind plane — not surfaces.toml HostId',
    factoryField: 'hostname',
  },
  {
    field: 'server.protocol',
    docsReference: 'missing',
    bunTypes: '"http" | "https" | null',
    values: 'http · https · null (unix)',
    defaultWhen: 'plain TCP → http · tls → https',
    fallback: 'null on unix · not in published #reference (bun-types + runtime yes)',
    runtimeNote: 'Bare scheme — no colon',
    factoryField: 'protocol',
  },
  {
    field: 'server.url.protocol',
    docsReference: 'via-url-only',
    bunTypes: 'string (URL.protocol)',
    values: 'http: · https:',
    defaultWhen: 'n/a — `${server.protocol}:` on TCP',
    fallback: 'always trailing colon — distinct from server.protocol',
    runtimeNote: 'Must match `${server.protocol}:` on TCP',
    factoryField: 'urlProtocol',
  },
  {
    field: 'server.development',
    docsReference: 'documented',
    bunTypes: 'boolean',
    values: 'true · false',
    defaultWhen: 'omit → follows NODE_ENV (production → false on 1.4 canary)',
    fallback: 'dev error pages leak stacks — off in production',
    runtimeNote: 'Option + runtime flag',
    factoryField: 'development',
  },
  {
    field: 'server.id',
    docsReference: 'documented',
    bunTypes: 'string',
    values: 'opaque · often ""',
    defaultWhen: 'unused unless bun --hot',
    fallback: 'hot reload identity',
    runtimeNote: 'May be empty string',
    factoryField: 'id',
  },
  {
    field: 'server.pendingRequests',
    docsReference: 'documented',
    bunTypes: 'number',
    values: '≥ 0',
    defaultWhen: '0 idle',
    fallback: 'n/a',
    runtimeNote: 'In-flight HTTP count',
    factoryField: 'pendingRequests',
  },
  {
    field: 'server.pendingWebSockets',
    docsReference: 'documented',
    bunTypes: 'number',
    values: '≥ 0',
    defaultWhen: '0 without upgrades',
    fallback: 'n/a',
    runtimeNote: 'Active WS count',
    factoryField: 'pendingWebSockets',
  },
] as const;

/** Compact CLI/agent rows — property · type · values · default · fallback. */
export function bunServeShapeTableRows(): Array<{
  property: string;
  type: string;
  values: string;
  default: string;
  fallback: string;
  docs: BunServeShapeDocsStatus;
}> {
  return BUN_SERVE_SHAPE_MATRIX.map(r => ({
    property: r.field,
    type: r.bunTypes,
    values: r.values,
    default: r.defaultWhen,
    fallback: r.fallback,
    docs: r.docsReference,
  }));
}

/** Default port env precedence when `port` option omitted — docs order. */
export const BUN_SERVE_DEFAULT_PORT_ENV = ['BUN_PORT', 'PORT', 'NODE_PORT'] as const;

export const BUN_SERVE_DEFAULT_PORT_FALLBACK = 3000;

/**
 * Resolve bind port from env only (BUN_PORT → PORT → NODE_PORT → 3000).
 * Reads {@link Bun.env} by default — already merged with auto-loaded `.env` files by Bun
 * ([env docs](https://bun.com/docs/runtime/environment-variables)); does not re-parse `.env`.
 * Use {@link resolveBunServeDefaultPort} when `--port` CLI may apply (verify probes).
 * @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
 */
export function resolveServeDefaultPort(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): number {
  for (const key of BUN_SERVE_DEFAULT_PORT_ENV) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    const port = Number(raw);
    if (Number.isInteger(port) && port >= 1 && port <= 65535) return port;
  }
  return BUN_SERVE_DEFAULT_PORT_FALLBACK;
}

/** Parse `bun --port=N` / `bun --port N` from argv (docs precedence over env). */
export function parseBunPortFlag(argv: string[] = Bun.argv): number | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--port=')) {
      const port = Number(arg.slice('--port='.length));
      if (Number.isInteger(port) && port >= 0 && port <= 65535) return port;
      continue;
    }
    if (arg === '--port') {
      const port = Number(argv[i + 1]);
      if (Number.isInteger(port) && port >= 0 && port <= 65535) return port;
    }
  }
  return undefined;
}

/**
 * Expected default bind port when `port` is omitted from `Bun.serve` (matches Bun runtime).
 * Precedence: `--port` → `BUN_PORT` → `PORT` → `NODE_PORT` → `3000`.
 * @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
 * @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
 */
export function resolveBunServeDefaultPort(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>,
  argv: string[] = Bun.argv
): number {
  const fromFlag = parseBunPortFlag(argv);
  if (fromFlag !== undefined) return fromFlag;
  return resolveServeDefaultPort(env);
}

/** Live probe of Server bind fields (TCP servers only). */
export type ServerShapeProbe = {
  port: number;
  urlPort: string;
  hostname: string;
  protocol: 'http' | 'https';
  urlProtocol: 'http:' | 'https:';
  origin: string;
  href: string;
  development: boolean;
  id: string; // brand-ok — opaque serve-shape row key
  pendingRequests: number;
  pendingWebSockets: number;
  bunVersion: string;
  bunRevision: string;
};

/** True when Server has TCP bind fields (not unix abstract/domain socket). */
export function isTcpServer(
  server: Pick<BunServer, 'port' | 'hostname' | 'protocol'>
): server is BunServer & {
  port: number;
  hostname: string;
  protocol: 'http' | 'https';
} {
  return (
    typeof server.port === 'number' &&
    server.port > 0 &&
    typeof server.hostname === 'string' &&
    server.hostname.length > 0 &&
    (server.protocol === 'http' || server.protocol === 'https')
  );
}

/** Read bind fields from a running TCP server. Throws for unix-only listeners. */
export function probeServerShape(server: BunServer): ServerShapeProbe {
  if (!isTcpServer(server)) {
    throw new Error('probeServerShape requires a TCP listener (port/hostname/protocol set)');
  }
  return {
    port: server.port,
    urlPort: server.url.port,
    hostname: server.hostname,
    protocol: server.protocol,
    urlProtocol: server.url.protocol as 'http:' | 'https:',
    origin: server.url.origin,
    href: server.url.href,
    development: server.development,
    id: server.id,
    pendingRequests: server.pendingRequests,
    pendingWebSockets: server.pendingWebSockets,
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
  };
}

/**
 * Invariants we enforce in FactoryWager after cross-ref discovery.
 * Returns human-readable violation messages (empty = ok).
 */
export function serverShapeViolations(probe: ServerShapeProbe): string[] {
  const out: string[] = [];
  if (probe.urlPort !== '' && probe.urlPort !== String(probe.port)) {
    out.push(`url.port "${probe.urlPort}" !== String(port) "${probe.port}"`);
  }
  if (probe.urlPort === '' && probe.port !== 80 && probe.port !== 443) {
    out.push(`url.port empty but port is ${probe.port} (expected only for 80/443)`);
  }
  const expectedUrlProtocol = `${probe.protocol}:` as const;
  if (probe.urlProtocol !== expectedUrlProtocol) {
    out.push(`url.protocol ${probe.urlProtocol} !== ${expectedUrlProtocol} from protocol`);
  }
  if (!probe.origin.startsWith(probe.urlProtocol)) {
    out.push(`origin ${probe.origin} does not start with urlProtocol ${probe.urlProtocol}`);
  }
  if (probe.pendingRequests < 0 || probe.pendingWebSockets < 0) {
    out.push('pending counters must be non-negative');
  }
  return out;
}

/** Markdown table for portal / agent consumption. */
export function renderBunServeShapeMatrix(): string {
  const header =
    '| Property | Type | Values | Default (omit / pre-bind) | Fallback / after-bind | Docs #reference | FactoryWager |\n|---|---|---|---|---|---|---|';
  const rows = BUN_SERVE_SHAPE_MATRIX.map(
    r =>
      `| \`${r.field}\` | ${r.bunTypes} | ${r.values} | ${r.defaultWhen} | ${r.fallback} | ${r.docsReference} | \`${r.factoryField}\` |`
  );
  return [
    header,
    ...rows,
    '',
    '_Bun recommend: after `Bun.serve`, read chosen listen from `server.port` / `server.url` — not from env alone._',
  ].join('\n');
}
