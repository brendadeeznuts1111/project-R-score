// @see https://bun.com/docs/test/writing-tests
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
import { afterEach, describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import {
  formatServePublicBindLines,
  isListenPortBusy,
  probeDefaultPortBusy,
  readServePublicBindManifest,
  resolveServePublicVerifyBase,
  writeServePublicBindManifest,
  type ServePublicBindManifest,
} from '../lib/http/serve-public-bind.ts';
import { serveBindSnapshot } from '../lib/http/bun-server.ts';
import { resolveBunServeDefaultPort } from '../lib/http/bun-serve-shape.ts';

describe('lib/http/serve-public-bind', () => {
  const servers: ReturnType<typeof Bun.serve>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(s => s.stop(true)));
  });

  function track(server: ReturnType<typeof Bun.serve>) {
    servers.push(server);
    return server;
  }

  test('isListenPortBusy recognizes EADDRINUSE messages', () => {
    expect(isListenPortBusy(new Error('Failed to start server. Is port 3000 in use?'))).toBe(true);
    expect(isListenPortBusy(new Error('EADDRINUSE'))).toBe(true);
    expect(isListenPortBusy(new Error('other'))).toBe(false);
  });

  test('probeDefaultPortBusy is true when port is listening', async () => {
    const server = track(
      Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        fetch: () => new Response('ok'),
      })
    );
    expect(await probeDefaultPortBusy({ port: server.port, connectHost: '127.0.0.1' })).toBe(true);
  });

  test('probeDefaultPortBusy is false for port 0 shortcut', async () => {
    expect(await probeDefaultPortBusy({ port: 0 })).toBe(false);
  });

  test('formatServePublicBindLines includes dbPath and ephemeral hint', () => {
    const snap = serveBindSnapshot(
      track(
        Bun.serve({
          port: 0,
          hostname: '127.0.0.1',
          fetch: () => new Response('ok'),
        })
      )
    );
    const manifest: ServePublicBindManifest = {
      ...snap,
      schemaVersion: 1,
      ephemeralFallback: true,
      requestedDefaultPort: 3000,
      boundAt: '2026-01-01T00:00:00.000Z',
    };
    const lines = formatServePublicBindLines(manifest, { dbPath: '/tmp/ops.db' });
    // Docs dual shape first (live Server when attached)
    expect(lines[0]).toBe(`server.port = ${snap.port}`);
    expect(lines[1]).toBe(`server.url  = ${snap.server.url.href}`);
    expect(lines.some(l => l.includes('DB: /tmp/ops.db'))).toBe(true);
    expect(lines.some(l => l.includes('ephemeral port'))).toBe(true);
    expect(lines.some(l => l.startsWith('Bind:'))).toBe(true);
    expect(lines.some(l => l.includes('BIND IDENTITY'))).toBe(true);
    expect(lines.some(l => l.includes('INDEX'))).toBe(true);
    expect(lines.some(l => l.includes(String(snap.port)))).toBe(true);
  });

  test('write/read bind manifest round-trip', async () => {
    const path = joinPath(import.meta.dir, '.tmp-bind-test.json');
    const snap = serveBindSnapshot(
      track(
        Bun.serve({
          port: 0,
          hostname: '127.0.0.1',
          fetch: () => new Response('ok'),
        })
      )
    );
    const manifest: ServePublicBindManifest = {
      ...snap,
      schemaVersion: 1,
      ephemeralFallback: false,
      requestedDefaultPort: 3000,
      boundAt: '2026-01-01T00:00:00.000Z',
    };
    await writeServePublicBindManifest(manifest, path);
    const readJson = await readServePublicBindManifest(path);
    expect(readJson?.loopbackOrigin).toBe(manifest.loopbackOrigin);
    const tomlPath = path.replace(/\.json$/, '.toml');
    expect(await Bun.file(tomlPath).exists()).toBe(true);
    const readToml = await readServePublicBindManifest(tomlPath);
    expect(readToml?.port).toBe(manifest.port);
    await Bun.write(path, '');
    await Bun.write(tomlPath, '');
  });

  test('resolveServePublicVerifyBase prefers PORTAL_VERIFY_BASE', async () => {
    const base = await resolveServePublicVerifyBase(
      { PORTAL_VERIFY_BASE: 'http://127.0.0.1:3999' },
      ['bun', 'tools/verify-portal.ts']
    );
    expect(base).toBe('http://127.0.0.1:3999');
  });

  test('resolveServePublicVerifyBase falls back to default port env chain', async () => {
    const missingBind = joinPath(import.meta.dir, '.tmp-missing-bind.json');
    const base = await resolveServePublicVerifyBase(
      { BUN_PORT: '3011' },
      ['bun', 'tools/verify-portal.ts'],
      missingBind
    );
    expect(base).toBe('http://127.0.0.1:3011');
    expect(resolveBunServeDefaultPort({ BUN_PORT: '3011' }, ['bun', 'tools/verify-portal.ts'])).toBe(
      3011
    );
  });

  test('resolveServePublicVerifyBase prefers bind manifest over default port', async () => {
    const path = joinPath(import.meta.dir, '.tmp-verify-bind.json');
    await writeServePublicBindManifest(
      {
        ...serveBindSnapshot(
          track(
            Bun.serve({
              port: 0,
              hostname: '127.0.0.1',
              fetch: () => new Response('ok'),
            })
          )
        ),
        schemaVersion: 1,
        ephemeralFallback: true,
        requestedDefaultPort: 3000,
        boundAt: '2026-01-01T00:00:00.000Z',
      },
      path
    );
    const base = await resolveServePublicVerifyBase({}, ['bun', 'tools/verify-portal.ts'], path);
    const manifest = await readServePublicBindManifest(path);
    expect(base).toBe(manifest?.loopbackOrigin);
    await Bun.write(path, '');
  });
});
