// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
// @see https://bun.com/docs/runtime/http/server#idletimeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Bun.serve defaults, exposed properties, and env port precedence.
 *
 * Docs: when `port` is omitted, Bun uses $BUN_PORT → $PORT → $NODE_PORT → 3000.
 * Env is resolved at process start — in-process Bun.env mutation does not change
 * the default, so precedence tests spawn a child Bun process.
 */
import { afterEach, describe, expect, test } from 'bun:test';

type ServeOpts = Parameters<typeof Bun.serve>[0];

let server: ReturnType<typeof Bun.serve> | null = null;

function createTestServer(options: ServeOpts = {}): ReturnType<typeof Bun.serve> {
  // Default port 0 avoids colliding with local serve-public on :3000.
  const s = Bun.serve({
    port: 0,
    fetch: () => new Response('OK'),
    ...options,
  });
  server = s;
  return s;
}

async function stopServer(s: ReturnType<typeof Bun.serve> | null = server): Promise<void> {
  if (!s) return;
  await s.stop(true);
  if (server === s) server = null;
}

afterEach(async () => {
  await stopServer();
});

/**
 * Run Bun.serve with no explicit port in a child process so env defaults apply.
 * Returns bound port (or throws with stderr).
 */
async function boundPortWithEnv(
  env: Record<string, string | undefined>
): Promise<{ port: number; href: string }> {
  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'PORT' && k !== 'BUN_PORT' && k !== 'NODE_PORT') {
      childEnv[k] = v;
    }
  }
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) childEnv[k] = v;
  }

  const proc = Bun.spawn({
    cmd: [
      'bun',
      '-e',
      `
const s = Bun.serve({ fetch: () => new Response('OK') });
console.log(JSON.stringify({ port: s.port, href: s.url.href }));
await s.stop(true);
`,
    ],
    env: childEnv,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || `child exit ${code}`);
  }
  const line = stdout.trim().split('\n').filter(Boolean).pop()!;
  return JSON.parse(line) as { port: number; href: string };
}

describe('Bun.serve — options and properties', () => {
  test('port: 0 binds a random available port', () => {
    const s = createTestServer({ port: 0 });
    expect(s.port).toBeGreaterThan(0);
    expect(s.url.port).toBe(String(s.port));
  });

  test('respects explicit port and hostname', () => {
    const s = createTestServer({ port: 18080, hostname: '127.0.0.1' });
    expect(s.port).toBe(18080);
    expect(s.hostname).toBe('127.0.0.1');
    expect(s.url.href).toBe('http://127.0.0.1:18080/');
  });

  test('exposes server.url matching port after start', () => {
    const s = createTestServer({ port: 18081 });
    expect(s.port).toBe(18081);
    expect(s.url.href).toBe('http://localhost:18081/');
    expect(s.url.hostname).toBe('localhost');
  });

  test('server.fetch routes to the handler', async () => {
    const s = createTestServer({
      port: 0,
      fetch: () => new Response('hello-serve'),
    });
    const res = await s.fetch(new Request(`http://127.0.0.1:${s.port}/`));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello-serve');
  });

  test('accepts idleTimeout option (docs default is 10 seconds)', () => {
    const s = createTestServer({ port: 0, idleTimeout: 30 });
    expect(s.port).toBeGreaterThan(0);
  });

  test('development can be forced false', () => {
    const off = createTestServer({ port: 0, development: false });
    expect(off.development).toBe(false);
  });

  test('development defaults to true in this runtime when unset', () => {
    const def = createTestServer({ port: 0 });
    expect(def.development).toBe(true);
  });

  test('pendingRequests starts at 0', () => {
    const s = createTestServer({ port: 0 });
    expect(s.pendingRequests).toBe(0);
  });

  test('server.timeout(req, seconds) is callable without error', async () => {
    const s = createTestServer({
      port: 0,
      fetch(req) {
        // Prefer the outer Server instance — s.fetch() may not pass server as 2nd arg.
        s.timeout(req, 5);
        return new Response('timed');
      },
    });
    const res = await s.fetch(new Request(`http://127.0.0.1:${s.port}/`));
    expect(await res.text()).toBe('timed');
  });
});

describe('Bun.serve — default port and env precedence (child process)', () => {
  test('uses PORT when no port option and BUN_PORT unset', async () => {
    const { port, href } = await boundPortWithEnv({ PORT: '19101' });
    expect(port).toBe(19101);
    expect(href).toContain(':19101');
  });

  test('BUN_PORT overrides PORT when port option omitted', async () => {
    const { port } = await boundPortWithEnv({ PORT: '19102', BUN_PORT: '19103' });
    expect(port).toBe(19103);
  });

  test('uses NODE_PORT when PORT and BUN_PORT unset', async () => {
    const { port } = await boundPortWithEnv({ NODE_PORT: '19104' });
    expect(port).toBe(19104);
  });

  test('falls back to port 3000 when no port option and no env (or EADDRINUSE proves attempt)', async () => {
    try {
      const { port, href } = await boundPortWithEnv({});
      expect(port).toBe(3000);
      expect(href).toMatch(/:3000\/?$/);
    } catch (e) {
      // Local serve-public often holds 3000 — still proves default bind target.
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/port 3000|EADDRINUSE/i);
    }
  });
});

describe('serve-public config contract', () => {
  test('monorepo PORT convention is numeric with fallback 3000', () => {
    const port = Number(Bun.env.PORT || 3000);
    expect(Number.isFinite(port)).toBe(true);
    expect(port).toBeGreaterThan(0);
  });
});
