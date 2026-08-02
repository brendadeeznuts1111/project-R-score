// @see https://bun.com/docs/test/index#run-tests
/**
 * npm packument bake + Pages Function contract — keeps the pm publish-plane
 * probes (`bun run verify:pm`) honest once the edge route is deployed.
 */
import { describe, expect, test } from 'bun:test';
import {
  npmJsonError,
  onRequest,
  parseNpmPackageSegment,
  type NpmPackumentPagesContext,
} from '../functions/@factorywager/[pkg].ts';

const PACKUMENT_SHAPE_KEYS = ['name', 'dist-tags', 'versions', 'time'] as const;

describe('bake-npm-packument output', () => {
  test('baked packument matches packages/registry-client manifest', async () => {
    const proc = Bun.spawnSync({
      cmd: ['bun', 'scripts/bake-npm-packument.ts'],
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);

    const baked = (await Bun.file(
      `${import.meta.dir}/../public/registry/npm/@factorywager/registry-client.json`
    ).json()) as Record<string, unknown>;
    const manifest = (await Bun.file(
      `${import.meta.dir}/../packages/registry-client/package.json`
    ).json()) as { name: string; version: string };

    for (const key of PACKUMENT_SHAPE_KEYS) expect(baked).toHaveProperty(key);
    expect(baked.name).toBe(manifest.name);
    expect((baked['dist-tags'] as { latest: string }).latest).toBe(manifest.version);

    const entry = (baked.versions as Record<string, Record<string, unknown>>)[manifest.version];
    expect(entry).toBeDefined();
    expect(entry.name).toBe(manifest.name);
    expect(typeof entry.readme).toBe('string');
    expect((entry.readme as string).length).toBeGreaterThan(0);
    expect(entry.readmeFilename).toBe('README.md');
    expect(typeof (entry.dist as { tarball: string }).tarball).toBe('string');
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
