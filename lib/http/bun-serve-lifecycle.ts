// @see https://bun.com/docs/runtime/http/websockets#start-a-websocket-server — ServerWebSocket
// @see https://bun.com/docs/runtime/http/server#reference — Server methods
// @see https://bun.com/docs/runtime/http/server#idletimeout — idleTimeout (default 10, max 255, 0 = off)
// @see https://bun.com/docs/runtime/http/server#server-timeout-request-seconds — server.timeout(request, seconds)
// @see https://bun.com/docs/runtime/http/tls — tls → server.protocol https
// @see https://github.com/oven-sh/bun/blob/main/packages/bun-types/serve.d.ts — bun-types SSOT
/**
 * Bun.serve Server method + option lifecycle matrix — grounded against bun-types serve.d.ts.
 *
 * Companion to bind-field shape in bun-serve-shape.ts (port/url/protocol after bind).
 * This file covers Server methods (stop/reload/timeout/…) and serve/WS options (idleTimeout…).
 */

/** One row of the Server method matrix. */
export type BunServeMethodRow = {
  property: string;
  kind: 'method';
  signature: string;
  values: string;
  defaultWhen: string;
  fallback: string;
  note: string;
};

/** One row of the Bun.serve / WebSocket option matrix. */
export type BunServeOptionRow = {
  property: string;
  kind: 'option';
  signature: string;
  values: string;
  defaultWhen: string;
  fallback: string;
  note: string;
};

/**
 * Server lifecycle methods from bun-types `interface Server`.
 * @see https://bun.com/docs/runtime/http/server#reference
 */
export const BUN_SERVE_METHOD_MATRIX: readonly BunServeMethodRow[] = [
  {
    property: 'server.stop',
    kind: 'method',
    signature: 'stop(closeActiveConnections?: boolean): Promise<void>',
    values: 'await · closeActiveConnections true|false',
    defaultWhen: 'closeActiveConnections omit → false (drain in-flight)',
    fallback: 'true → terminate requests/WS immediately',
    note: 'Stops accepting new connections; default waits for in-flight',
  },
  {
    property: 'server.reload',
    kind: 'method',
    signature: 'reload(options: Serve.Options): Server',
    values: 'fetch · error · routes · websocket handlers',
    defaultWhen: 'n/a — call to hot-swap handlers',
    fallback: 'port/hostname/tls in reload options are ignored',
    note: 'Update handlers without restart; bind options stay put',
  },
  {
    property: 'server.fetch',
    kind: 'method',
    signature: 'fetch(request: Request | string): Response | Promise<Response>',
    values: 'Response · Promise<Response>',
    defaultWhen: 'n/a — in-process mock of the fetch handler',
    fallback: 'not fully normalized vs real HTTP (bun-types caveat)',
    note: 'In-process request against the running server',
  },
  {
    property: 'server.upgrade',
    kind: 'method',
    signature: 'upgrade(request, options?): boolean',
    values: 'true upgraded · false failed',
    defaultWhen: 'requires websocket: handler on Bun.serve',
    fallback: 'false → return HTTP error Response from fetch',
    note: 'HTTP → ServerWebSocket; options.headers / options.data',
  },
  {
    property: 'server.publish',
    kind: 'method',
    signature: 'publish(topic, data, compress?): ServerWebSocketSendStatus',
    values: 'bytes sent · 0 dropped · -1 backpressure',
    defaultWhen: 'compress omit → false',
    fallback: 'no subscribers → 0',
    note: 'Pub/sub to all WS clients on topic',
  },
  {
    property: 'server.subscriberCount',
    kind: 'method',
    signature: 'subscriberCount(topic: string): number',
    values: '≥ 0',
    defaultWhen: '0 when topic empty / no WS',
    fallback: 'n/a',
    note: 'Count of connections subscribed to topic',
  },
  {
    property: 'server.requestIP',
    kind: 'method',
    signature: 'requestIP(request: Request): SocketAddress | null',
    values: '{ address, port, family } · null',
    defaultWhen: 'n/a — per request',
    fallback: 'null when closed or unix socket',
    note: 'Client IP/port; null on unix / closed request',
  },
  {
    property: 'server.timeout',
    kind: 'method',
    signature: 'timeout(request: Request, seconds: number): void',
    values: 'seconds ≥ 0 · 0 = disable for this request',
    defaultWhen: 'inherits serve idleTimeout (default 10s) until overridden',
    fallback: '0 for SSE / long streams without raising global idleTimeout',
    note: 'Per-request idle override — pairs with options.idleTimeout',
  },
  {
    property: 'server.ref',
    kind: 'method',
    signature: 'ref(): void',
    values: 'void',
    defaultWhen: 'server is ref’d at start (keeps process alive)',
    fallback: 'no-op if already ref’d or stopped',
    note: 'Undo unref — boolean toggle semantics',
  },
  {
    property: 'server.unref',
    kind: 'method',
    signature: 'unref(): void',
    values: 'void',
    defaultWhen: 'n/a — call to allow process exit',
    fallback: 'active connections may still keep process alive',
    note: 'Do not keep process alive if server is only handle left',
  },
] as const;

/**
 * Bun.serve / WebSocket option rows (pre-bind configuration).
 * HTTP idleTimeout: default 10, max 255, 0 = off (docs).
 * @see https://bun.com/docs/runtime/http/server#idletimeout
 */
export const BUN_SERVE_OPTION_MATRIX: readonly BunServeOptionRow[] = [
  {
    property: 'idleTimeout',
    kind: 'option',
    signature: 'idleTimeout?: number',
    values: '0–255 seconds · 0 = off',
    defaultWhen: 'omit → 10 seconds · max 255 · 0 = off',
    fallback: 'server.timeout(req, seconds) per-request override',
    note: 'HTTP inactivity close; streaming/SSE often needs timeout(req, 0)',
  },
  {
    property: 'port',
    kind: 'option',
    signature: 'port?: number | string',
    values: '0–65535 · 0 = ephemeral',
    defaultWhen: 'omit → --port → BUN_PORT → PORT → NODE_PORT → 3000',
    fallback: 'port:0 → OS ephemeral; re-read server.port after bind',
    note: 'Pre-bind attempt only — chosen listen is server.port / server.url',
  },
  {
    property: 'hostname',
    kind: 'option',
    signature: 'hostname?: string',
    values: '0.0.0.0 · localhost · 127.0.0.1 · FQDN bind',
    defaultWhen: 'docs: 0.0.0.0 · canary often localhost when omitted',
    fallback: 'undefined on unix · NOT a DNS HostId',
    note: 'OS bind address — never assign to HostId',
  },
  {
    property: 'tls',
    kind: 'option',
    signature: 'tls?: TLSOptions',
    values: 'cert · key · ca · …',
    defaultWhen: 'omit → plain TCP · server.protocol "http"',
    fallback: 'tls set → server.protocol "https" · url.protocol "https:"',
    note: 'TLS option drives protocol — not a separate protocol serve field',
  },
  {
    property: 'development',
    kind: 'option',
    signature: 'development?: boolean',
    values: 'true · false',
    defaultWhen: 'omit → follows NODE_ENV (production → false)',
    fallback: 'dev error pages leak stacks — off in production',
    note: 'Option + runtime server.development flag',
  },
  {
    property: 'unix',
    kind: 'option',
    signature: 'unix?: string',
    values: 'filesystem path · \\0abstract (Linux)',
    defaultWhen: 'omit → TCP hostname+port',
    fallback: 'XOR with hostname/port · protocol null · port undefined',
    note: 'Unix domain socket — cannot combine with hostname+port',
  },
  {
    property: 'websocket.idleTimeout (WS)',
    kind: 'option',
    signature: 'websocket.idleTimeout?: number',
    values: 'seconds · no messages/pings',
    defaultWhen: 'omit → 120 (bun-types WebSocketHandler)',
    fallback: 'distinct from HTTP idleTimeout (serve option)',
    note: 'WS: seconds before timeout due to no messages or pings',
  },
] as const;

/** Compact CLI/agent rows — property · kind · signature · values · default · fallback · note. */
export function bunServeMethodTableRows(): Array<{
  property: string;
  kind: 'method';
  signature: string;
  values: string;
  default: string;
  fallback: string;
  note: string;
}> {
  return BUN_SERVE_METHOD_MATRIX.map(r => ({
    property: r.property,
    kind: r.kind,
    signature: r.signature,
    values: r.values,
    default: r.defaultWhen,
    fallback: r.fallback,
    note: r.note,
  }));
}

/** Compact CLI/agent rows for serve / WS options. */
export function bunServeOptionTableRows(): Array<{
  property: string;
  kind: 'option';
  signature: string;
  values: string;
  default: string;
  fallback: string;
  note: string;
}> {
  return BUN_SERVE_OPTION_MATRIX.map(r => ({
    property: r.property,
    kind: r.kind,
    signature: r.signature,
    values: r.values,
    default: r.defaultWhen,
    fallback: r.fallback,
    note: r.note,
  }));
}
