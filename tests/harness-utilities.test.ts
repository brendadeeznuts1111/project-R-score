// @see https://bun.com/docs/runtime/utils#bun-env
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import {
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
});
