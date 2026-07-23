#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port / hostname
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — BUN_PORT / PORT / NODE_PORT / --port
// @see https://bun.com/docs/runtime/http/server#idletimeout — idleTimeout
// @see https://bun.com/docs/runtime/http/server#server-timeout-request-seconds — server.timeout
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — NO_COLOR / FORCE_COLOR
/**
 * Ground Bun.serve defaults/options in official docs, print via Bun.inspect.table.
 *
 *   bun tools/bun-serve-defaults-table.ts
 *
 * Tables distinguish:
 *   - docs: canonical default from bun.com/docs
 *   - live: this process runtime probe (Bun.version)
 */
const colors = Bun.env.NO_COLOR === undefined && Bun.env.FORCE_COLOR !== '0';

function table(rows: Record<string, string | number | boolean>[], properties?: string[]): string {
  // @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
  return Bun.inspect.table(rows, properties, { colors });
}

/** Docs anchors (SSOT) — keep in sync with bun-doc-refs suggest output. */
const DOCS = {
  serve: 'https://bun.com/docs/runtime/http/server#basic-setup',
  portHostname: 'https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname',
  defaultPort: 'https://bun.com/docs/runtime/http/server#configuring-a-default-port',
  idleTimeout: 'https://bun.com/docs/runtime/http/server#idletimeout',
  timeout: 'https://bun.com/docs/runtime/http/server#server-timeout-request-seconds',
  inspectTable:
    'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options',
  inspectCustom: 'https://bun.com/docs/runtime/utils#bun-inspect-custom',
  env: 'https://bun.com/docs/runtime/utils#bun-env',
} as const;

/**
 * Live probe — docs: port 0 = random available port;
 * hostname "127.0.0.1" for loopback; development false for prod-like flag.
 */
function probeLive(): {
  port: number;
  hostname: string;
  development: boolean;
  href: string;
  protocol: string;
  pendingRequests: number;
  pendingWebSockets: number;
} {
  // @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
  const s = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    development: false,
    fetch: () => new Response('ok'),
  });
  const snap = {
    port: s.port,
    hostname: s.hostname,
    development: s.development,
    href: s.url.href,
    protocol: s.url.protocol,
    pendingRequests: s.pendingRequests,
    pendingWebSockets: s.pendingWebSockets,
  };
  void s.stop(true);
  return snap;
}

const live = probeLive();

/** Docs order: BUN_PORT, PORT, NODE_PORT, else 3000 (+ CLI --port). */
const portPrecedence = [
  {
    priority: 1,
    source: '--port',
    example: 'bun --port=4002 server.ts',
    docs: 'CLI flag',
    canonical: DOCS.defaultPort,
  },
  {
    priority: 2,
    source: 'BUN_PORT',
    example: 'BUN_PORT=4002 bun server.ts',
    docs: 'env (highest env)',
    canonical: DOCS.defaultPort,
  },
  {
    priority: 3,
    source: 'PORT',
    example: 'PORT=4002 bun server.ts',
    docs: 'env',
    canonical: DOCS.defaultPort,
  },
  {
    priority: 4,
    source: 'NODE_PORT',
    example: 'NODE_PORT=4002 bun server.ts',
    docs: 'env (lowest env)',
    canonical: DOCS.defaultPort,
  },
  {
    priority: 5,
    source: '(fallback)',
    example: '(none set)',
    docs: 'default 3000',
    canonical: DOCS.defaultPort,
  },
];

const options = [
  {
    option: 'port',
    docs_default: '$BUN_PORT, $PORT, $NODE_PORT, else 3000; 0 = random',
    example: 'port: 8080  |  port: 0',
    server_field: 'server.port / server.url',
    docs: DOCS.portHostname,
  },
  {
    option: 'hostname',
    docs_default: '"0.0.0.0"',
    example: 'hostname: "mydomain.com"',
    server_field: 'server.hostname / server.url',
    docs: DOCS.portHostname,
  },
  {
    option: 'fetch',
    docs_default: 'required if no routes (or use export default)',
    example: 'fetch(req) { return new Response("404!") }',
    server_field: 'server.fetch(Request)',
    docs: DOCS.serve,
  },
  {
    option: 'routes',
    docs_default: 'optional (Bun ≥1.2.3)',
    example: 'routes: { "/api/status": new Response("OK") }',
    server_field: '(via fetch/routes)',
    docs: DOCS.serve,
  },
  {
    option: 'idleTimeout',
    docs_default: '10 (seconds); max 255; 0 disables',
    example: 'idleTimeout: 30',
    server_field: 'not a public Server field; use server.timeout(req, s)',
    docs: DOCS.idleTimeout,
  },
  {
    option: 'development',
    docs_default: '(runtime-dependent; not in port docs block)',
    example: 'development: true',
    server_field: 'server.development',
    docs: DOCS.serve,
  },
];

const serverProps = [
  {
    property: 'server.port',
    docs_meaning: 'Port server is listening on',
    live: live.port,
    docs: DOCS.portHostname,
  },
  {
    property: 'server.hostname',
    docs_meaning: 'Hostname server is bound to',
    live: live.hostname,
    docs: DOCS.portHostname,
  },
  {
    property: 'server.url',
    docs_meaning: 'Server URL including protocol, hostname and port',
    live: live.href,
    docs: DOCS.portHostname,
  },
  {
    property: 'server.development',
    docs_meaning: 'Whether server is in development mode',
    live: live.development,
    docs: DOCS.serve,
  },
  {
    property: 'server.pendingRequests',
    docs_meaning: 'Number of in-flight HTTP requests',
    live: live.pendingRequests,
    docs: DOCS.serve,
  },
  {
    property: 'server.pendingWebSockets',
    docs_meaning: 'Number of active WebSocket connections',
    live: live.pendingWebSockets,
    docs: DOCS.serve,
  },
];

const envNow = [
  { var: 'BUN_PORT', value: Bun.env.BUN_PORT ?? '(unset)', docs: DOCS.defaultPort },
  { var: 'PORT', value: Bun.env.PORT ?? '(unset)', docs: DOCS.defaultPort },
  { var: 'NODE_PORT', value: Bun.env.NODE_PORT ?? '(unset)', docs: DOCS.defaultPort },
  {
    var: 'resolved (same order as docs)',
    value: String(Number(Bun.env.BUN_PORT || Bun.env.PORT || Bun.env.NODE_PORT || 3000)),
    docs: DOCS.defaultPort,
  },
];

const canonicalIndex = [
  { topic: 'Bun.serve', url: DOCS.serve },
  { topic: 'port / hostname', url: DOCS.portHostname },
  { topic: 'default port env', url: DOCS.defaultPort },
  { topic: 'idleTimeout', url: DOCS.idleTimeout },
  { topic: 'server.timeout(req, s)', url: DOCS.timeout },
  { topic: 'Bun.inspect.table', url: DOCS.inspectTable },
  { topic: 'Bun.inspect.custom', url: DOCS.inspectCustom },
  { topic: 'Bun.env', url: DOCS.env },
];

/**
 * @see https://bun.com/docs/runtime/utils#bun-inspect-custom
 * Override how Bun.inspect prints this report (tables of docs-grounded rows).
 */
const report = {
  title: 'Bun.serve defaults + options (docs-grounded)',
  bun: Bun.version,
  [Bun.inspect.custom](): string {
    return [
      `Bun.serve · grounded in bun.com/docs · runtime ${Bun.version}`,
      '',
      'Canonical docs',
      table(canonicalIndex, ['topic', 'url']),
      '',
      'Default port when options.port is omitted',
      // docs: https://bun.com/docs/runtime/http/server#configuring-a-default-port
      table(portPrecedence, ['priority', 'source', 'example', 'docs', 'canonical']),
      '',
      'Serve options (docs defaults)',
      table(options, ['option', 'docs_default', 'example', 'server_field', 'docs']),
      '',
      'Server properties — live probe (port:0, hostname:127.0.0.1, development:false)',
      table(serverProps, ['property', 'docs_meaning', 'live', 'docs']),
      '',
      'This process env (Bun.env)',
      table(envNow, ['var', 'value', 'docs']),
      '',
      'Notes (docs vs runtime)',
      table(
        [
          {
            note: 'hostname default',
            docs: '0.0.0.0',
            observed: 'server.hostname often "localhost" / "127.0.0.1" when set',
          },
          {
            note: 'development default',
            docs: '(not specified in port section)',
            observed: 'true when unset on this canary',
          },
          {
            note: 'idleTimeout',
            docs: '10 seconds default',
            observed: 'option accepted; not re-read as Server field',
          },
          {
            note: 'env port resolution',
            docs: 'at process start',
            observed: 'in-process Bun.env mutation does not retarget default port',
          },
        ],
        ['note', 'docs', 'observed']
      ),
    ].join('\n');
  },
};

console.log(Bun.inspect(report, { colors, depth: 4 }));
