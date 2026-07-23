// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
// @see https://bun.com/docs/runtime/http/server#idletimeout
// @see https://bun.com/docs/runtime/http/server#server-timeout-request-seconds
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Bun.serve — defaults, Server properties, and env port precedence.
 *
 * Port when `port` is omitted (docs + this runtime):
 *   $BUN_PORT → $PORT → $NODE_PORT → 3000
 *
 * Env is fixed at process start; in-process mutation does not change the
 * default bind. Precedence cases spawn a child `bun -e` process.
 */
import { afterEach, describe, expect, test } from 'bun:test';

type ServeOpts = Parameters<typeof Bun.serve>[0];
type Server = ReturnType<typeof Bun.serve>;

let active: Server | null = null;

const ok = (): Response => new Response('OK');

function serve(options: ServeOpts = {}): Server {
  // Prefer ephemeral ports in-process so local serve-public on :3000 cannot flake tests.
  const server = Bun.serve({
    port: 0,
    fetch: ok,
    ...options,
  });
  active = server;
  return server;
}

async function stop(server: Server | null = active): Promise<void> {
  if (!server) return;
  await server.stop(true);
  if (active === server) active = null;
}

afterEach(async () => {
  await stop();
});

/** Child process: Bun.serve with no `port` option so env defaults apply. */
async function serveWithEnvDefaults(
  env: Partial<Record<'PORT' | 'BUN_PORT' | 'NODE_PORT', string>>
): Promise<{ port: number; href: string; hostname: string; development: boolean }> {
  const childEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (key === 'PORT' || key === 'BUN_PORT' || key === 'NODE_PORT') continue;
    childEnv[key] = value;
  }
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) childEnv[key] = value;
  }

  const proc = Bun.spawn({
    cmd: [
      'bun',
      '-e',
      `
const s = Bun.serve({ fetch: () => new Response("OK") });
console.log(JSON.stringify({
  port: s.port,
  href: s.url.href,
  hostname: s.hostname,
  development: s.development,
}));
await s.stop(true);
`,
    ],
    env: childEnv,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || `child exited ${exitCode}`);
  }

  const line = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .at(-1);
  if (!line) throw new Error(`empty child stdout: ${JSON.stringify(stdout)}`);
  return JSON.parse(line) as {
    port: number;
    href: string;
    hostname: string;
    development: boolean;
  };
}

describe('Bun.serve', () => {
  describe('options.port', () => {
    test('when port is 0, binds an ephemeral port and url.port equals String(server.port)', () => {
      const server = serve({ port: 0 });
      expect(server.port).toBeGreaterThan(0);
      expect(server.port).toBeLessThan(65536);
      expect(server.url.port).toBe(String(server.port));
      expect(server.url.protocol).toBe('http:');
    });

    test('when port is 18080, server.port is exactly 18080', () => {
      const server = serve({ port: 18080 });
      expect(server.port).toBe(18080);
    });

    test('when port is 18081 and hostname is 127.0.0.1, url.href is exactly http://127.0.0.1:18081/', () => {
      const server = serve({ port: 18081, hostname: '127.0.0.1' });
      expect(server.port).toBe(18081);
      expect(server.hostname).toBe('127.0.0.1');
      expect(server.url.href).toBe('http://127.0.0.1:18081/');
      expect(server.url.host).toBe('127.0.0.1:18081');
      expect(server.url.hostname).toBe('127.0.0.1');
      expect(server.url.port).toBe('18081');
      expect(server.url.protocol).toBe('http:');
      expect(server.url.pathname).toBe('/');
    });

    test('when port is 18082 without hostname, url.href is exactly http://localhost:18082/', () => {
      const server = serve({ port: 18082 });
      expect(server.port).toBe(18082);
      expect(server.hostname).toBe('localhost');
      expect(server.url.href).toBe('http://localhost:18082/');
      expect(server.url.host).toBe('localhost:18082');
    });
  });

  describe('options.hostname', () => {
    test('when hostname is 127.0.0.1, server.hostname is exactly 127.0.0.1', () => {
      const server = serve({ port: 0, hostname: '127.0.0.1' });
      expect(server.hostname).toBe('127.0.0.1');
      expect(server.url.hostname).toBe('127.0.0.1');
    });

    test('when hostname is omitted, server.hostname is exactly localhost on this runtime', () => {
      const server = serve({ port: 0 });
      expect(server.hostname).toBe('localhost');
      expect(server.url.hostname).toBe('localhost');
    });
  });

  describe('options.development', () => {
    test('when development is false, server.development is exactly false', () => {
      const server = serve({ port: 0, development: false });
      expect(server.development).toBe(false);
    });

    test('when development is true, server.development is exactly true', () => {
      const server = serve({ port: 0, development: true });
      expect(server.development).toBe(true);
    });

    test('when development is omitted, server.development is exactly true on this runtime', () => {
      const server = serve({ port: 0 });
      expect(server.development).toBe(true);
    });
  });

  describe('options.idleTimeout', () => {
    test('when idleTimeout is 30, server starts and port is a number > 0', () => {
      const server = serve({ port: 0, idleTimeout: 30 });
      expect(typeof server.port).toBe('number');
      expect(server.port).toBeGreaterThan(0);
    });

    test('when idleTimeout is 0, server starts (timeout disabled per docs)', () => {
      const server = serve({ port: 0, idleTimeout: 0 });
      expect(server.port).toBeGreaterThan(0);
    });
  });

  describe('Server properties after start', () => {
    test('pendingRequests is exactly 0 with no in-flight traffic', () => {
      const server = serve({ port: 0 });
      expect(server.pendingRequests).toBe(0);
    });

    test('pendingWebSockets is exactly 0 with no upgrades', () => {
      const server = serve({ port: 0 });
      expect(server.pendingWebSockets).toBe(0);
    });

    test('url is a URL instance with http protocol', () => {
      const server = serve({ port: 18083 });
      expect(server.url).toBeInstanceOf(URL);
      expect(server.url.protocol).toBe('http:');
      expect(server.url.href).toBe('http://localhost:18083/');
    });
  });

  describe('Server.fetch', () => {
    test('returns status 200 and exact body from fetch handler', async () => {
      const server = serve({
        port: 0,
        fetch: () => new Response('hello-serve', { status: 200 }),
      });
      const res = await server.fetch(new Request(`http://127.0.0.1:${server.port}/`));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('hello-serve');
    });

    test('returns status 404 when handler responds 404', async () => {
      const server = serve({
        port: 0,
        fetch: () => new Response('missing', { status: 404 }),
      });
      const res = await server.fetch(new Request(`http://127.0.0.1:${server.port}/nope`));
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('missing');
    });
  });

  describe('Server.timeout', () => {
    test('timeout(req, 5) does not alter a completed response body', async () => {
      const server = serve({
        port: 0,
        fetch(req) {
          server.timeout(req, 5);
          return new Response('timed');
        },
      });
      const res = await server.fetch(new Request(`http://127.0.0.1:${server.port}/`));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('timed');
    });
  });

  describe('default port when options.port is omitted (child process)', () => {
    test('when only PORT=19101 is set, binds exactly 19101 and href is http://localhost:19101/', async () => {
      const result = await serveWithEnvDefaults({ PORT: '19101' });
      expect(result.port).toBe(19101);
      expect(result.href).toBe('http://localhost:19101/');
    });

    test('when PORT=19102 and BUN_PORT=19103, binds exactly 19103 (BUN_PORT wins)', async () => {
      const result = await serveWithEnvDefaults({ PORT: '19102', BUN_PORT: '19103' });
      expect(result.port).toBe(19103);
      expect(result.href).toBe('http://localhost:19103/');
    });

    test('when only BUN_PORT=19105 is set, binds exactly 19105', async () => {
      const result = await serveWithEnvDefaults({ BUN_PORT: '19105' });
      expect(result.port).toBe(19105);
      expect(result.href).toBe('http://localhost:19105/');
    });

    test('when only NODE_PORT=19104 is set, binds exactly 19104', async () => {
      const result = await serveWithEnvDefaults({ NODE_PORT: '19104' });
      expect(result.port).toBe(19104);
      expect(result.href).toBe('http://localhost:19104/');
    });

    test('when no port env is set, binds exactly 3000 or fails with exact EADDRINUSE on 3000', async () => {
      try {
        const result = await serveWithEnvDefaults({});
        expect(result.port).toBe(3000);
        expect(result.href).toBe('http://localhost:3000/');
      } catch (error) {
        // Default bind target is still 3000; local serve-public may already own it.
        // Child stderr includes stack frames — assert exact diagnostic substrings.
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toContain('Failed to start server. Is port 3000 in use?');
        expect(message).toContain('syscall: "listen"');
        expect(message).toContain('code: "EADDRINUSE"');
      }
    });
  });

  describe('FactoryWager monorepo convention', () => {
    test('Bun.env.PORT || 3000 is a finite integer >= 1 (serve-public default)', () => {
      const port = Number(Bun.env.PORT || 3000);
      expect(Number.isInteger(port)).toBe(true);
      expect(port).toBeGreaterThanOrEqual(1);
      expect(port).toBeLessThanOrEqual(65535);
      if (Bun.env.PORT === undefined || Bun.env.PORT === '') {
        expect(port).toBe(3000);
      } else {
        expect(port).toBe(Number(Bun.env.PORT));
      }
    });
  });
});
