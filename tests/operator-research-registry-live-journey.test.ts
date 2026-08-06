/**
 * Journey: live packument over a real HTTP server (ephemeral).
 * Optional soft probe against serve-public :3000 when already running.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import {
  REGISTRY_PRESETS,
  resolveRegistryPackage,
} from '../lib/operator-research/registry-desk.ts';

const PACKUMENT = {
  name: 'journey-live-pkg',
  'dist-tags': { latest: '3.1.0' },
  versions: {
    '3.1.0': {
      description: 'ephemeral packument',
      readme: '# Journey\n\nLive packument body.',
      readmeFilename: 'README.md',
    },
  },
  time: { '3.1.0': '2026-05-01T00:00:00.000Z' },
};

const server = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/-/ping') return new Response('ok');
    if (url.pathname === '/journey-live-pkg') {
      return Response.json(PACKUMENT);
    }
    return new Response('not found', { status: 404 });
  },
});

afterAll(() => {
  server.stop(true);
});

describe('registry live packument journey', () => {
  test('resolveRegistryPackage hits ephemeral npm-compat server → source live', async () => {
    const base = `http://127.0.0.1:${server.port}/`;
    const detail = await resolveRegistryPackage('journey-live-pkg', {
      live: true,
      preset: 'local',
      registryBaseUrl: base,
      timeoutMs: 2000,
    });
    expect(detail).not.toBeNull();
    expect(detail!.liveError).toBeUndefined();
    expect(detail!.source).toBe('live');
    expect(detail!.latest).toBe('3.1.0');
    expect(detail!.readme).toContain('Live packument');
    expect(detail!.readmeHtml).toBeTruthy();
    expect(detail!.preset).toBe('local');
  });

  test('soft probe: serve-public :3000 when up (skip if down)', async () => {
    let pingOk = false;
    try {
      const res = await fetch(new URL('/-/ping', REGISTRY_PRESETS.local.url), {
        signal: AbortSignal.timeout(800),
      });
      pingOk = res.ok;
    } catch {
      pingOk = false;
    }
    if (!pingOk) {
      // Soft skip — CI/local without serve:public. Ephemeral journey above is the hard proof.
      return;
    }

    const detail = await resolveRegistryPackage('event-store', {
      live: true,
      preset: 'local',
      timeoutMs: 3000,
    });
    expect(detail).not.toBeNull();
    if (detail!.liveError) {
      // Registry up but package missing is still an exercised live path
      expect(detail!.source).toBe('snapshot');
      expect(detail!.liveError.length).toBeGreaterThan(0);
      return;
    }
    expect(detail!.source === 'live' || detail!.source === 'live+snapshot').toBe(true);
    expect(detail!.name).toBe('event-store');
  });
});
