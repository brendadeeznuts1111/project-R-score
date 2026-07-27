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
  /** Verified on Bun 1.4.0 canary unless noted. */
  runtimeNote: string;
  /** Mapped in lib/http/bun-server.ts ServerIdentity. */
  factoryField: string;
};

/**
 * Known drift between published docs, bun-types, and runtime.
 * `server.protocol` is in bun-types + runtime but absent from published #reference (2026-07-22).
 */
export const BUN_SERVE_SHAPE_MATRIX: readonly BunServeShapeRow[] = [
  {
    field: 'server.port',
    docsReference: 'documented',
    bunTypes: 'number | undefined (undefined on unix)',
    runtimeNote: 'number when TCP; matches ephemeral pick for port:0',
    factoryField: 'port',
  },
  {
    field: 'server.url.port',
    docsReference: 'via-url-only',
    bunTypes: 'URL.port (string)',
    runtimeNote: 'String(server.port) for non-default ports; empty for 80/443',
    factoryField: 'urlPort',
  },
  {
    field: 'server.hostname',
    docsReference: 'documented',
    bunTypes: 'string | undefined',
    runtimeNote:
      'Omitted → localhost on 1.4.0 canary (docs example says 0.0.0.0 for options default)',
    factoryField: 'hostname',
  },
  {
    field: 'server.protocol',
    docsReference: 'missing',
    bunTypes: '"http" | "https" | null',
    runtimeNote: '"http" on plain TCP; "https" with tls; null on unix',
    factoryField: 'protocol',
  },
  {
    field: 'server.url.protocol',
    docsReference: 'via-url-only',
    bunTypes: 'URL.protocol',
    runtimeNote: 'Always includes colon; http: / https:',
    factoryField: 'urlProtocol',
  },
  {
    field: 'server.url.origin',
    docsReference: 'via-url-only',
    bunTypes: 'URL.origin',
    runtimeNote: 'scheme + host + port; use for loopback base URLs',
    factoryField: 'origin',
  },
  {
    field: 'server.url.href',
    docsReference: 'documented',
    bunTypes: 'URL.href',
    runtimeNote: 'Trailing slash on root',
    factoryField: 'url',
  },
  {
    field: 'server.development',
    docsReference: 'documented',
    bunTypes: 'boolean',
    runtimeNote: 'Omitted → false when NODE_ENV=production on 1.4.0 canary',
    factoryField: 'development',
  },
  {
    field: 'server.id',
    docsReference: 'documented',
    bunTypes: 'string',
    runtimeNote: 'May be empty string unless configured',
    factoryField: 'id',
  },
  {
    field: 'server.pendingRequests',
    docsReference: 'documented',
    bunTypes: 'number',
    runtimeNote: '0 with no in-flight traffic',
    factoryField: 'pendingRequests',
  },
  {
    field: 'server.pendingWebSockets',
    docsReference: 'documented',
    bunTypes: 'number',
    runtimeNote: '0 without upgrades',
    factoryField: 'pendingWebSockets',
  },
] as const;

/** Default port env precedence when `port` option omitted — docs order. */
export const BUN_SERVE_DEFAULT_PORT_ENV = ['BUN_PORT', 'PORT', 'NODE_PORT'] as const;

export const BUN_SERVE_DEFAULT_PORT_FALLBACK = 3000;

/**
 * Resolve bind port from env only (BUN_PORT → PORT → NODE_PORT → 3000).
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
    '| Field | Docs #reference | bun-types | Runtime (1.4) | FactoryWager |\n|---|---|---|---|---|';
  const rows = BUN_SERVE_SHAPE_MATRIX.map(
    r =>
      `| \`${r.field}\` | ${r.docsReference} | ${r.bunTypes} | ${r.runtimeNote} | \`${r.factoryField}\` |`
  );
  return [header, ...rows].join('\n');
}
