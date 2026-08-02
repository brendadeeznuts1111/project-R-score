// @see https://bun.com/docs/test/index#run-tests
/**
 * npm packument bake + Pages Function contract — keeps the pm publish-plane
 * probes (`bun run verify:pm`) honest once the edge route is deployed.
 */
import { describe, expect, test } from 'bun:test';
import {
  decodeScopedPackagePath,
  onRequest as middlewareOnRequest,
} from '../functions/_middleware.ts';
import {
  npmJsonError,
  onRequest,
  parseNpmPackageSegment,
  type NpmPackumentPagesContext,
} from '../functions/@factorywager/[pkg].ts';

const PACKUMENT_SHAPE_KEYS = ['name', 'dist-tags', 'versions', 'time'] as const;

describe('bake-npm-packument output', () => {
  test('baked packument matches packages/registry-client manifest', async () => {
    // The bake stamps `time` with wall-clock now — snapshot and restore the
    // committed artifact so a test run never dirties the tree.
    const outPath = `${import.meta.dir}/../public/registry/npm/@factorywager/registry-client.json`;
    const before = await Bun.file(outPath).bytes();
    try {
      const proc = Bun.spawnSync({
        cmd: ['bun', 'scripts/bake-npm-packument.ts'],
        cwd: `${import.meta.dir}/..`,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);

      const baked = (await Bun.file(outPath).json()) as Record<string, unknown>;
      const manifest = (await Bun.file(
        `${import.meta.dir}/../packages/registry-client/package.json`
      ).json()) as { name: string; version: string };

      for (const key of PACKUMENT_SHAPE_KEYS) expect(baked).toHaveProperty(key);
      expect(baked.name).toBe(manifest.name);
      expect((baked['dist-tags'] as { latest: string }).latest).toBe(manifest.version);

      const entry = (baked.versions as Record<string, Record<string, unknown>>)[
        manifest.version
      ];
      expect(entry).toBeDefined();
      expect(entry.name).toBe(manifest.name);
      expect(typeof entry.readme).toBe('string');
      expect((entry.readme as string).length).toBeGreaterThan(0);
      expect(entry.readmeFilename).toBe('README.md');
      expect(typeof (entry.dist as { tarball: string }).tarball).toBe('string');
    } finally {
      await Bun.write(outPath, before);
    }
  });
});

describe('npm packument Pages Function', () => {
  function ctx(pkg: string | undefined, body = '{}', ok = true): NpmPackumentPagesContext {
    return {
      request: new Request(`https://registry.factory-wager.com/@factorywager/${pkg ?? ''}`),
      env: {
        ASSETS: {
          fetch: async () =>
            new Response(body, {
              status: ok ? 200 : 404,
              headers: { 'Content-Type': 'application/json' },
            }),
        },
      },
      params: { pkg },
    };
  }

  test('parseNpmPackageSegment accepts bare names, rejects traversal/subpaths', () => {
    expect(parseNpmPackageSegment('registry-client')).toBe('registry-client');
    expect(parseNpmPackageSegment('bookmakers')).toBe('bookmakers');
    expect(parseNpmPackageSegment('../etc')).toBeNull();
    expect(parseNpmPackageSegment('a/b')).toBeNull();
    expect(parseNpmPackageSegment('UPPER')).toBeNull();
    expect(parseNpmPackageSegment(undefined)).toBeNull();
  });

  test('serves baked packument with JSON content type', async () => {
    const res = await onRequest(ctx('registry-client', '{"name":"x"}'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('json');
    expect(await res.json()).toEqual({ name: 'x' });
  });

  test('JSON 404 when no packument is baked', async () => {
    const res = await onRequest(ctx('nope', '{}', false));
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('json');
  });

  test('rejects non-GET methods with JSON 405', async () => {
    const c = ctx('registry-client');
    c.request = new Request(c.request.url, { method: 'PUT' });
    const res = await onRequest(c);
    expect(res.status).toBe(405);
  });

  test('npmJsonError shape', async () => {
    const res = npmJsonError(400, 'bad');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad' });
  });
});

describe('middleware scoped-package decode', () => {
  test('decodeScopedPackagePath rewrites npm %2f scope encoding', () => {
    expect(decodeScopedPackagePath('/@factorywager%2fregistry-client')).toBe(
      '/@factorywager/registry-client'
    );
    expect(decodeScopedPackagePath('/@factorywager%2Fbookmakers')).toBe(
      '/@factorywager/bookmakers'
    );
    expect(decodeScopedPackagePath('/@factorywager%2fregistry-client/')).toBe(
      '/@factorywager/registry-client'
    );
  });

  test('decodeScopedPackagePath leaves everything else alone', () => {
    expect(decodeScopedPackagePath('/@factorywager/registry-client')).toBeNull();
    expect(decodeScopedPackagePath('/portal/packages/')).toBeNull();
    expect(decodeScopedPackagePath('/%2f')).toBeNull();
    expect(decodeScopedPackagePath('/api/registry/health')).toBeNull();
  });

  test('middleware rewrites encoded scope before routing, keeps security headers', async () => {
    const seen: string[] = [];
    const res = await middlewareOnRequest({
      request: new Request('https://registry.factory-wager.com/@factorywager%2fregistry-client'),
      next: async input => {
        seen.push(String(input instanceof Request ? new URL(input.url).pathname : input));
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      },
    });
    expect(seen[0]).toBe('/@factorywager/registry-client');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  test('middleware passes plain paths through untouched', async () => {
    const seen: string[] = [];
    await middlewareOnRequest({
      request: new Request('https://registry.factory-wager.com/portal/packages/'),
      next: async input => {
        seen.push(input === undefined ? '(none)' : String(input));
        return new Response('ok');
      },
    });
    expect(seen[0]).toBe('(none)');
  });
});
