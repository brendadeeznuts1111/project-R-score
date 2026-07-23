#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — Bun.serve port env
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Print Bun.serve defaults + options as colored CLI tables.
 *
 *   bun tools/bun-serve-defaults-table.ts
 *   bunx --bun bun-serve-defaults-table
 */
const colors = !Bun.env.NO_COLOR && Bun.env.FORCE_COLOR !== '0';

function table(rows: Record<string, string | number | boolean>[], properties?: string[]): string {
  return Bun.inspect.table(rows, properties, { colors });
}

/** Live probe of one ephemeral server (exact property values). */
function probeLive(): {
  port: number;
  hostname: string;
  development: boolean;
  href: string;
  pendingRequests: number;
  pendingWebSockets: number;
} {
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
    pendingRequests: s.pendingRequests,
    pendingWebSockets: s.pendingWebSockets,
  };
  void s.stop(true);
  return snap;
}

const live = probeLive();

const portPrecedence = [
  { priority: 1, source: 'BUN_PORT', example: 'BUN_PORT=4002', result: 'binds 4002' },
  { priority: 2, source: 'PORT', example: 'PORT=4002', result: 'binds 4002' },
  { priority: 3, source: 'NODE_PORT', example: 'NODE_PORT=4002', result: 'binds 4002' },
  { priority: 4, source: '(default)', example: '(unset)', result: 'binds 3000' },
];

const options = [
  {
    option: 'port',
    default: 'BUN_PORT → PORT → NODE_PORT → 3000',
    example: 'port: 0 | 8080',
    exposed: 'server.port',
  },
  {
    option: 'hostname',
    default: '0.0.0.0 (docs); property often localhost',
    example: 'hostname: "127.0.0.1"',
    exposed: 'server.hostname',
  },
  {
    option: 'development',
    default: 'true (this runtime when unset)',
    example: 'development: false',
    exposed: 'server.development',
  },
  {
    option: 'idleTimeout',
    default: '10 seconds (0 = off, max 255)',
    example: 'idleTimeout: 30',
    exposed: '(not a public field)',
  },
  {
    option: 'fetch',
    default: '(required unless routes)',
    example: 'fetch: () => new Response("OK")',
    exposed: 'server.fetch(Request)',
  },
];

const properties = [
  { property: 'server.port', meaning: 'Bound TCP port', live: live.port },
  { property: 'server.hostname', meaning: 'Reported bind host', live: live.hostname },
  { property: 'server.url.href', meaning: 'Full server URL', live: live.href },
  { property: 'server.development', meaning: 'Dev mode flag', live: live.development },
  { property: 'server.pendingRequests', meaning: 'In-flight HTTP', live: live.pendingRequests },
  {
    property: 'server.pendingWebSockets',
    meaning: 'Active WebSockets',
    live: live.pendingWebSockets,
  },
];

const envNow = [
  { var: 'BUN_PORT', value: Bun.env.BUN_PORT ?? '(unset)' },
  { var: 'PORT', value: Bun.env.PORT ?? '(unset)' },
  { var: 'NODE_PORT', value: Bun.env.NODE_PORT ?? '(unset)' },
  {
    var: 'resolved fallback',
    value: String(Number(Bun.env.BUN_PORT || Bun.env.PORT || Bun.env.NODE_PORT || 3000)),
  },
];

/** Custom inspect object — Bun.inspect uses Bun.inspect.custom */
const report = {
  title: 'Bun.serve defaults + options',
  bun: Bun.version,
  [Bun.inspect.custom](_depth?: number, _opts?: object): string {
    const sections = [
      `Bun.serve defaults · ${Bun.version}`,
      '',
      'Port precedence (when options.port omitted)',
      table(portPrecedence),
      '',
      'Options',
      table(options, ['option', 'default', 'example', 'exposed']),
      '',
      'Server properties (live probe: port 0, hostname 127.0.0.1, development false)',
      table(properties, ['property', 'meaning', 'live']),
      '',
      'This process env',
      table(envNow, ['var', 'value']),
    ];
    return sections.join('\n');
  },
};

// Prefer custom inspect path so CLI output goes through Bun.inspect.custom → tables
console.log(Bun.inspect(report, { colors, depth: 4 }));
