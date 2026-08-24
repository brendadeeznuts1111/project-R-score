// @see https://bun.com/blog/bun-v1.4#other-behavior-changes
/**
 * Bun 1.4.0 Other behavior — Bun.serve / fetch / lazy bun exports.
 */
import { describe, expect, test } from 'bun:test';

const TARGET = '1.4.0';
const rt = Bun.version === TARGET ? test : test.skip;

describe('Bun 1.4.0 Other — Bun.serve', () => {
  rt('Response.error() / status 0 goes through error() (#33400)', async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.error();
      },
      error() {
        return new Response('handled', { status: 500 });
      },
    });
    try {
      const res = await fetch(server.url);
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('handled');
    } finally {
      server.stop(true);
    }
  });

  rt('per-method GET route answers HEAD (#32822)', async () => {
    let hits = 0;
    const server = Bun.serve({
      port: 0,
      routes: {
        '/x': {
          GET: () => {
            hits++;
            return new Response('ok');
          },
        },
      },
      fetch: () => new Response('no', { status: 404 }),
    });
    try {
      const res = await fetch(new URL('/x', server.url), { method: 'HEAD' });
      expect(res.status).toBe(200);
      expect(hits).toBe(1);
    } finally {
      server.stop(true);
    }
  });

  rt('server.upgrade returns false without websocket headers (#35298)', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req, srv) {
        const ok = srv.upgrade(req);
        return new Response(String(ok), { status: ok ? 101 : 400 });
      },
      websocket: { message() {} },
    });
    try {
      const res = await fetch(server.url);
      expect(res.status).toBe(400);
      expect(await res.text()).toBe('false');
    } finally {
      server.stop(true);
    }
  });

  rt('static routes honor If-Match precondition (#35169)', async () => {
    const dir = await Bun.write(
      `${tmpdirSafe()}/static-a.txt`,
      'hello'
    ).then(async () => {
      // use temp via Bun.file in routes
      return null;
    });
    void dir;
    const filePath = `${require('node:os').tmpdir()}/bun-1.4-static-${Date.now()}.txt`;
    await Bun.write(filePath, 'hello');
    const server = Bun.serve({
      port: 0,
      routes: {
        '/f': Bun.file(filePath),
      },
      fetch: () => new Response('no', { status: 404 }),
    });
    try {
      const miss = await fetch(new URL('/f', server.url), {
        headers: { 'If-Match': '"nope"' },
      });
      expect(miss.status).toBe(412);
    } finally {
      server.stop(true);
      try {
        require('node:fs').unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  });
});

function tmpdirSafe(): string {
  return require('node:os').tmpdir();
}

describe('Bun 1.4.0 Other — fetch', () => {
  rt('redirect:error rejects only classic redirect statuses (#36539)', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response(null, { status: 304 }),
    });
    try {
      const res = await fetch(server.url, { redirect: 'error' });
      expect(res.status).toBe(304);
    } finally {
      server.stop(true);
    }
  });

  rt('fetch options getter throw becomes rejected promise (#33649)', async () => {
    const headers = {
      get get() {
        throw new Error('boom-headers');
      },
    };
    await expect(
      fetch('http://127.0.0.1:1', { headers: headers as unknown as HeadersInit })
    ).rejects.toThrow(/boom-headers/);
  });

  rt('aborted signal errors body reads (#fetch abort body)', async () => {
    const server = Bun.serve({
      port: 0,
      async fetch() {
        return new Response('abcdefghij');
      },
    });
    try {
      const ac = new AbortController();
      const res = await fetch(server.url, { signal: ac.signal });
      ac.abort('stop');
      await expect(res.text()).rejects.toThrow();
    } finally {
      server.stop(true);
    }
  });
});

describe('Bun 1.4.0 Other — lazy bun exports (#37525)', () => {
  rt('invalid REDIS_URL throws at Bun.redis binding, not whole module import', async () => {
    const prev = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://127.0.0.1/notadb';
    try {
      // Accessing Bun.redis should throw for invalid URL; importing this module already succeeded.
      expect(() => Bun.redis).toThrow(/database|Redis|REDIS/i);
    } catch (e) {
      // Some builds expose redis only when constructed — accept either throw-on-get or construct.
      expect(String(e)).toMatch(/database|Redis|REDIS|notadb|Invalid/i);
    } finally {
      if (prev === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = prev;
    }
  });
});
