// @see https://bun.com/docs/runtime/utils#bun-env
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import {
  EPHEMERAL_BIND_MAX_ATTEMPTS,
  bindEphemeralWithRetry,
  createEphemeralBoundServer,
  createEphemeralServe,
  createJsonTestServer,
  createTestWorkspace,
  withTestEnvironment,
} from './harness.ts';

describe('shared test harness utilities', () => {
  test('temporary workspace contains paths and cleans itself up', async () => {
    let root = '';

    {
      await using workspace = await createTestWorkspace('factorywager-harness-');
      root = workspace.root;
      const fixturePath = workspace.resolve('nested', '..', 'fixture.json');
      await writeFile(fixturePath, '{}');

      expect(existsSync(fixturePath)).toBe(true);
      expect(() => workspace.resolve('..', 'escaped.json')).toThrow('escapes root');
    }

    expect(existsSync(root)).toBe(false);
  });

  test('environment overrides restore Bun.env and process.env after a throw', async () => {
    const presentKey = 'FACTORYWAGER_HARNESS_PRESENT';
    const absentKey = 'FACTORYWAGER_HARNESS_ABSENT';
    const previousPresent = process.env[presentKey];
    const previousAbsent = process.env[absentKey];
    process.env[presentKey] = 'before';
    delete process.env[absentKey];
    const failure = new Error('fixture failure');

    try {
      await expect(
        withTestEnvironment(
          {
            [presentKey]: undefined,
            [absentKey]: 'created',
          },
          () => {
            expect(process.env[presentKey]).toBeUndefined();
            expect(Bun.env[presentKey]).toBeUndefined();
            expect(process.env[absentKey]).toBe('created');
            throw failure;
          }
        )
      ).rejects.toBe(failure);

      expect(process.env[presentKey]).toBe('before');
      expect(Bun.env[presentKey]).toBe('before');
      expect(process.env[absentKey]).toBeUndefined();
      expect(Bun.env[absentKey]).toBeUndefined();
    } finally {
      if (previousPresent === undefined) delete process.env[presentKey];
      else process.env[presentKey] = previousPresent;
      if (previousAbsent === undefined) delete process.env[absentKey];
      else process.env[absentKey] = previousAbsent;
    }
  });

  test('JSON server uses a port-0 allocation and exact pathname routes', async () => {
    let origin = '';

    {
      await using server = createJsonTestServer({
        '/registry.json': {
          body: { schemaVersion: 1, artifacts: ['portal', 'registry'] },
          headers: { 'x-fixture': 'registry' },
        },
      });
      origin = server.origin;

      expect(server.port).toBeGreaterThan(0);
      expect(() => server.url('//example.com/escaped')).toThrow('local absolute path');
      expect(() => server.url('relative.json')).toThrow('local absolute path');
      const response = await fetch(server.url('/registry.json?tenant=factory'));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/json; charset=utf-8'
      );
      expect(response.headers.get('x-fixture')).toBe('registry');
      expect(await response.json()).toEqual({
        schemaVersion: 1,
        artifacts: ['portal', 'registry'],
      });

      const missing = await fetch(server.url('/missing'));
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({
        error: 'not_found',
        path: '/missing',
      });
    }

    await expect(fetch(origin)).rejects.toBeDefined();
  });

  test('bindEphemeralWithRetry retries busy port:0 races then succeeds', () => {
    let attempts = 0;
    const value = bindEphemeralWithRetry(
      () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('EADDRINUSE: Failed to start server. Is port 0 in use?');
        }
        return { ok: true as const, attempts };
      },
      { maxAttempts: 4 }
    );
    expect(value).toEqual({ ok: true, attempts: 3 });
    expect(attempts).toBe(3);
  });

  test('bindEphemeralWithRetry rethrows non-busy failures immediately', () => {
    let attempts = 0;
    expect(() =>
      bindEphemeralWithRetry(() => {
        attempts += 1;
        throw new Error('permission denied');
      })
    ).toThrow('permission denied');
    expect(attempts).toBe(1);
  });

  test('bindEphemeralWithRetry exhausts maxAttempts on persistent busy', () => {
    let attempts = 0;
    expect(() =>
      bindEphemeralWithRetry(
        () => {
          attempts += 1;
          throw new Error('Failed to start server. Is port 0 in use?');
        },
        { maxAttempts: 3 }
      )
    ).toThrow(/port 0 in use/i);
    expect(attempts).toBe(3);
    expect(EPHEMERAL_BIND_MAX_ATTEMPTS).toBeGreaterThanOrEqual(3);
  });

  test('createEphemeralServe allocates distinct OS ports and cleans up', async () => {
    const ports = new Set<number>();
    {
      await using a = createEphemeralServe({
        fetch: () => new Response('a'),
      });
      await using b = createEphemeralServe({
        fetch: () => new Response('b'),
      });
      expect(a.port).toBeGreaterThan(0);
      expect(b.port).toBeGreaterThan(0);
      expect(a.port).not.toBe(b.port);
      ports.add(a.port);
      ports.add(b.port);
      expect(await (await fetch(a.origin)).text()).toBe('a');
      expect(await (await fetch(b.origin)).text()).toBe('b');
    }
    for (const port of ports) {
      await expect(fetch(`http://127.0.0.1:${port}/`)).rejects.toBeDefined();
    }
  });

  test('createEphemeralBoundServer stops the wrapped server on dispose', async () => {
    let origin = '';
    {
      await using bound = createEphemeralBoundServer(() =>
        Bun.serve({
          hostname: '127.0.0.1',
          port: 0,
          fetch: () => Response.json({ ok: true }),
        })
      );
      origin = bound.origin;
      expect(bound.port).toBeGreaterThan(0);
      expect(await (await fetch(`${origin}/`)).json()).toEqual({ ok: true });
    }
    await expect(fetch(origin)).rejects.toBeDefined();
  });

  test(
    'concurrent ephemeral serves survive parallel port:0 bind pressure (#235)',
    async () => {
      const concurrency = 24;
      const handles = await Promise.all(
        Array.from({ length: concurrency }, async () =>
          createEphemeralServe({
            fetch: () => new Response('ok'),
          })
        )
      );
      try {
        const ports = handles.map((h) => h.port);
        expect(new Set(ports).size).toBe(concurrency);
        const bodies = await Promise.all(
          handles.map(async (h) => (await fetch(h.origin)).text())
        );
        expect(bodies.every((body) => body === 'ok')).toBe(true);
      } finally {
        await Promise.all(handles.map((h) => h[Symbol.asyncDispose]()));
      }
    },
    { timeout: 30_000 }
  );
});
