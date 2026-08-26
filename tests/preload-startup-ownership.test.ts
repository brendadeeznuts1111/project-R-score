// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  PRELOAD_STARTUP_CONCEPTS,
  discoverPreloadStartupSurfaceIds,
  preloadStartupOwnershipIssues,
  readPreloadStartupManifest,
} from '../lib/security/preload-startup-ownership.ts';
import {
  BunChildAuthorityError,
  prepareGuardedBunChild,
  spawnGuardedBunChild,
  type BunChildAuthority,
} from '../lib/security/guarded-bun-process.ts';

const ROOT = resolve(import.meta.dir, '..');
const ENTRYPOINT = resolve(import.meta.dir, 'fixtures/preload-startup-entrypoint.ts');
const BUN = Bun.which('bun')!;
let server: ReturnType<typeof Bun.serve>;
let target: string;
let requestCount = 0;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch() {
      requestCount++;
      return new Response('fixture-ok');
    },
  });
  target = `http://127.0.0.1:${server.port}/first`;
});

afterAll(async () => {
  await server.stop(true);
});

function authority(argv: readonly string[], profile: BunChildAuthority['profile']): BunChildAuthority {
  return {
    executable: BUN,
    argv,
    cwd: ROOT,
    environment: {},
    profile,
    command: 'runtime',
    controlGrants: [
      { control: 'fetch-preconnect', values: [`http://127.0.0.1:${server.port}`], reason: 'hermetic startup fixture' },
    ],
    reason: 'measure a checked-in entrypoint against an ephemeral loopback fixture',
  };
}

describe('preload/startup ownership', () => {
  test('keeps four meanings distinct and bidirectionally accounts for every surface', async () => {
    expect(PRELOAD_STARTUP_CONCEPTS).toEqual([
      'test-runner-preload',
      'runtime-module-preload',
      'fetch-preconnect',
      'browser-resource-preload',
    ]);
    expect(await preloadStartupOwnershipIssues(ROOT)).toEqual([]);
    const discovered = await discoverPreloadStartupSurfaceIds(ROOT);
    const manifest = await readPreloadStartupManifest(ROOT);
    expect(manifest.surfaces.map(item => item.id).sort()).toEqual([...discovered]);
  });

  test('promotes no application runtime preload and retains exact residuals', async () => {
    const manifest = await readPreloadStartupManifest(ROOT);
    const runtime = manifest.surfaces.filter(item => item.concept === 'runtime-module-preload');
    const missing = manifest.surfaces.filter(item => item.id.endsWith(':missing'));
    const reviewRequired = manifest.surfaces.filter(item => item.decision === 'review-required');
    expect(runtime).toEqual([]);
    expect(missing).toHaveLength(11);
    expect(missing.every(item => item.decision === 'deny')).toBe(true);
    expect(reviewRequired).toHaveLength(6);
  });

  test('runs a real entrypoint with exact loopback --fetch-preconnect authority', async () => {
    const origin = `http://127.0.0.1:${server.port}`;
    const argv = [`--fetch-preconnect=${origin}`, ENTRYPOINT, target];
    const child = spawnGuardedBunChild(
      { authority: authority(argv, 'development'), executable: BUN, argv, cwd: ROOT },
      { stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout) as { status: number; body: string; firstRequestMs: number };
    expect(result).toEqual({
      status: 200,
      body: 'fixture-ok',
      firstRequestMs: expect.any(Number),
    });
    expect(requestCount).toBeGreaterThan(0);
  });

  test('offline preconnect is rejected before process or socket creation', () => {
    const before = requestCount;
    const origin = `http://127.0.0.1:${server.port}`;
    const argv = [`--fetch-preconnect=${origin}`, ENTRYPOINT, target];
    expect(() =>
      prepareGuardedBunChild({
        authority: authority(argv, 'offline'),
        executable: BUN,
        argv,
        cwd: ROOT,
      })
    ).toThrow(BunChildAuthorityError);
    expect(requestCount).toBe(before);
  });
});
