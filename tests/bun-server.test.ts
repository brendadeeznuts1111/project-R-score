// @see https://bun.com/docs/runtime/http/server#reference — Server interface
// @see https://bun.com/docs/runtime/http/server#server-reload — server.reload
// @see https://bun.com/docs/runtime/http/server#server-stop — server.stop
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom
import { describe, expect, test } from 'bun:test';
import { inspectCustom } from '../lib/console-depth.ts';
import {
  BUN_SERVER_REFERENCE_DOCS,
  buildServerProbeReport,
  loopbackFetch,
  probeServerPath,
  serverFetch,
  serverIdentity,
  stopServer,
  type BunServer,
} from '../lib/http/bun-server.ts';

describe('lib/http/bun-server — Server surface', () => {
  test('docs locus', () => {
    expect(BUN_SERVER_REFERENCE_DOCS).toContain('runtime/http/server#reference');
  });

  test('server.fetch hits fetch handler only; loopback hits routes', async () => {
    const server: BunServer = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      development: false,
      routes: {
        '/ready': new Response('Ready', { headers: { 'X-Ready': '1' } }),
        '/health': () =>
          Response.json({
            status: 'ok',
            routeStats: { staticRoutes: 1 },
          }),
      },
      fetch(req) {
        const p = new URL(req.url).pathname;
        if (p === '/from-fetch') return new Response('via-fetch');
        return new Response('fallback', { status: 404 });
      },
    });

    try {
      const id = serverIdentity(server);
      expect(id.port).toBeGreaterThan(0);
      expect(id.hostname).toBe('127.0.0.1');
      expect(id.url).toContain(`http://127.0.0.1:${id.port}`);
      expect(typeof id.id).toBe('string');
      expect(id.pendingWebSockets).toBe(0);

      // Runtime matrix: server.fetch does NOT match routes
      const viaServerFetch = await serverFetch(server, '/ready');
      expect(viaServerFetch.status).toBe(404);
      expect(await viaServerFetch.text()).toBe('fallback');

      // server.fetch does hit the fetch handler
      const fromFetch = await serverFetch(server, '/from-fetch');
      expect(fromFetch.status).toBe(200);
      expect(await fromFetch.text()).toBe('via-fetch');

      // Loopback TCP exercises routes
      const viaLoopback = await loopbackFetch(server, '/ready');
      expect(viaLoopback.status).toBe(200);
      expect(await viaLoopback.text()).toBe('Ready');

      const health = await probeServerPath(server, '/health', { mode: 'loopback' });
      expect(health.ok).toBe(true);
      expect(health.status).toBe(200);
      expect(health.mode).toBe('loopback');
      expect(health.bytes).toBeGreaterThan(0);

      const miss = await probeServerPath(server, '/nope', { mode: 'loopback' });
      expect(miss.status).toBe(404);

      const report = await buildServerProbeReport(
        server,
        ['/ready', '/health', '/from-fetch', '/nope'],
        { mode: 'loopback' }
      );
      // /from-fetch is only on fetch handler — still reachable via loopback fallback
      expect(report.summary().passed).toBe(3);
      expect(report.summary().failed).toBe(1);
      expect(typeof report[inspectCustom]).toBe('function');
      const printed = Bun.inspect(report, { colors: false });
      expect(printed).toContain('ServerProbeReport');
      expect(printed).toContain('SERVER IDENTITY');
      expect(printed).toContain('loopback');
      expect(printed).toContain('/ready');

      // Hot reload routes without restart
      server.reload({
        routes: {
          '/ready': new Response('Ready-v2'),
        },
        fetch() {
          return new Response('fallback', { status: 404 });
        },
      });
      const after = await loopbackFetch(server, '/ready');
      expect(await after.text()).toBe('Ready-v2');
    } finally {
      await stopServer(server, true);
    }
  });

  test('server-fetch mode probes fetch handler paths', async () => {
    const server: BunServer = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch(req) {
        const p = new URL(req.url).pathname;
        if (p === '/api/ok') return Response.json({ ok: true });
        return new Response('no', { status: 404 });
      },
    });
    try {
      const ok = await probeServerPath(server, '/api/ok', { mode: 'server-fetch' });
      expect(ok.mode).toBe('server-fetch');
      expect(ok.status).toBe(200);
      const report = await buildServerProbeReport(server, ['/api/ok', '/x'], {
        mode: 'server-fetch',
        label: 'fetch-handler-only',
      });
      expect(report.summary().passed).toBe(1);
      expect(report.summary().mode).toBe('server-fetch');
    } finally {
      await stopServer(server, true);
    }
  });

  test('server.fetch does not pass server as fetch 2nd arg; TCP does', async () => {
    const server: BunServer = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      development: false,
      fetch(req, srv) {
        return Response.json({
          hasServer: typeof srv?.requestIP === 'function',
          ip: typeof srv?.requestIP === 'function' ? srv.requestIP(req) : null,
        });
      },
    });
    try {
      const viaSf = (await (
        await serverFetch(server, new URL('/', server.url).href)
      ).json()) as { hasServer: boolean; ip: unknown };
      expect(viaSf.hasServer).toBe(false);
      expect(viaSf.ip).toBeNull();

      const viaTcp = (await (await loopbackFetch(server, '/')).json()) as {
        hasServer: boolean;
        ip: { address: string; family: string; port: number } | null;
      };
      expect(viaTcp.hasServer).toBe(true);
      expect(viaTcp.ip?.address).toBe('127.0.0.1');
      expect(viaTcp.ip?.family).toBe('IPv4');
    } finally {
      await stopServer(server, true);
    }
  });

  test('method routes work on loopback; unmatched methods fall to fetch', async () => {
    const server: BunServer = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      routes: {
        '/item': {
          GET: () => new Response('get'),
          POST: async (req: Request) => new Response(`post:${await req.text()}`),
        },
      },
      fetch: () => new Response('fb', { status: 404 }),
    });
    try {
      const g = await loopbackFetch(server, '/item');
      expect(await g.text()).toBe('get');
      const p = await loopbackFetch(server, '/item', { method: 'POST', body: 'x' });
      expect(await p.text()).toBe('post:x');
      const d = await loopbackFetch(server, '/item', { method: 'DELETE' });
      expect(d.status).toBe(404);
      // server.fetch never sees method routes
      const sf = await serverFetch(server, new URL('/item', server.url).href);
      expect(sf.status).toBe(404);
    } finally {
      await stopServer(server, true);
    }
  });

  test('routes-only server: server.fetch throws; TCP works', async () => {
    const server: BunServer = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      routes: { '/ready': new Response('R') },
    });
    try {
      await expect(serverFetch(server, new URL('/ready', server.url).href)).rejects.toThrow(
        /fetch handler/i
      );
      const tcp = await loopbackFetch(server, '/ready');
      expect(await tcp.text()).toBe('R');
    } finally {
      await stopServer(server, true);
    }
  });
});
