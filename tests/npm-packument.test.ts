// @see https://bun.com/docs/test/index#run-tests
/**
 * npm packument bake + Pages Function contract — keeps the pm publish-plane
 * probes (`bun run verify:pm`) honest once the edge route is deployed.
 */
import { describe, expect, test } from 'bun:test';
import {
  npmPrefixJsonError,
  onRequest as npmPrefixOnRequest,
  parseNpmPrefixPackage,
  type NpmPrefixPagesContext,
} from '../functions/api/npm/[[path]].ts';
import {
  npmJsonError,
  onRequest,
  parseNpmPackageSegment,
  type NpmPackumentPagesContext,
} from '../functions/@factorywager/[pkg].ts';
import {
  isNpmPackageRequestPath,
  parseNpmPackageRequestPath,
} from '../lib/registry/npm-package-path.ts';

const PACKUMENT_SHAPE_KEYS = ['name', 'dist-tags', 'versions', 'time'] as const;

describe('serve-public npm package request paths', () => {
  test('accepts unscoped, plain scoped, and npm-encoded scoped package paths', () => {
    expect(isNpmPackageRequestPath('/registry-client')).toBe(true);
    expect(isNpmPackageRequestPath('/@factorywager/registry-client')).toBe(true);
    expect(isNpmPackageRequestPath('/@factorywager%2fregistry-client')).toBe(true);
    expect(isNpmPackageRequestPath('/@factorywager%2Fregistry-client')).toBe(true);
  });

  test('rejects roots, incomplete scopes, and nested paths', () => {
    expect(isNpmPackageRequestPath('/')).toBe(false);
    expect(isNpmPackageRequestPath('/@factorywager')).toBe(false);
    expect(isNpmPackageRequestPath('/@factorywager/')).toBe(false);
    expect(isNpmPackageRequestPath('/@factorywager/pkg/extra')).toBe(false);
  });

  test('decodes valid names and rejects malformed percent escapes without throwing', () => {
    expect(parseNpmPackageRequestPath('/registry-client')).toBe('registry-client');
    expect(parseNpmPackageRequestPath('/@factorywager/registry-client')).toBe(
      '@factorywager/registry-client'
    );
    expect(parseNpmPackageRequestPath('/@factorywager%2Fregistry-client')).toBe(
      '@factorywager/registry-client'
    );
    expect(parseNpmPackageRequestPath('/bad%escape')).toBeNull();
  });

  test('serve-public applies the shared predicate to GET metadata and PUT publish', async () => {
    const source = await Bun.file(`${import.meta.dir}/../scripts/serve-public.ts`).text();
    expect(source).toContain('const npmPackageName = parseNpmPackageRequestPath(path)');
    expect(source).toContain("req.method === 'GET' && npmPackageName");
    expect(source).toContain("req.method === 'PUT' && npmPackageName");
  });
});

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

describe('npm prefix catch-all (/api/npm/*)', () => {
  function ctx(path: string | string[] | undefined, body = '{}', ok = true): NpmPrefixPagesContext {
    return {
      request: new Request('https://registry.factory-wager.com/api/npm/@factorywager%2fregistry-client'),
      env: {
        ASSETS: {
          fetch: async () =>
            new Response(body, {
              status: ok ? 200 : 404,
              headers: { 'Content-Type': 'application/json' },
            }),
        },
      },
      params: { path },
    };
  }

  test('parseNpmPrefixPackage decodes the npm %2f form (single segment)', () => {
    expect(parseNpmPrefixPackage('@factorywager%2fregistry-client')).toBe('registry-client');
    expect(parseNpmPrefixPackage('@factorywager%2Fbookmakers')).toBe('bookmakers');
  });

  test('parseNpmPrefixPackage accepts the plain two-segment form', () => {
    expect(parseNpmPrefixPackage(['@factorywager', 'registry-client'])).toBe('registry-client');
  });

  test('parseNpmPrefixPackage rejects wrong scope, traversal, subpaths', () => {
    expect(parseNpmPrefixPackage('@other%2fregistry-client')).toBeNull();
    expect(parseNpmPrefixPackage(['@factorywager', 'a', 'b'])).toBeNull();
    expect(parseNpmPrefixPackage('..%2f..%2fetc')).toBeNull();
    expect(parseNpmPrefixPackage(undefined)).toBeNull();
    expect(parseNpmPrefixPackage('')).toBeNull();
  });

  test('serves baked packument with JSON content type', async () => {
    const res = await npmPrefixOnRequest(ctx('@factorywager%2fregistry-client', '{"name":"x"}'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('json');
    expect(await res.json()).toEqual({ name: 'x' });
  });

  test('JSON 404 when no packument is baked', async () => {
    const res = await npmPrefixOnRequest(ctx('@factorywager%2fnope', '{}', false));
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('json');
  });

  test('JSON 400 for wrong scope', async () => {
    const res = await npmPrefixOnRequest(ctx('@other%2fnope'));
    expect(res.status).toBe(400);
  });

  test('rejects non-GET methods with JSON 405', async () => {
    const c = ctx('@factorywager%2fregistry-client');
    c.request = new Request(c.request.url, { method: 'PUT' });
    const res = await npmPrefixOnRequest(c);
    expect(res.status).toBe(405);
  });

  test('npmPrefixJsonError shape', async () => {
    const res = npmPrefixJsonError(400, 'bad');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad' });
  });
});
