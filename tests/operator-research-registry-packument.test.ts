import { describe, expect, test } from 'bun:test';
import {
  buildPackumentUrl,
  detailFromPackument,
  REGISTRY_PRESETS,
  resolveRegistryPackage,
} from '../lib/operator-research/registry-desk.ts';

describe('registry packument (Phase 1 live)', () => {
  test('buildPackumentUrl encodes scoped names', () => {
    expect(buildPackumentUrl('http://localhost:3000/', '@factorywager/registry-client')).toBe(
      'http://localhost:3000/@factorywager%2Fregistry-client'
    );
    expect(buildPackumentUrl(REGISTRY_PRESETS.local.url, 'event-store')).toBe(
      'http://localhost:3000/event-store'
    );
  });

  test('detailFromPackument maps versions dist-tags readme', () => {
    const detail = detailFromPackument('demo-pkg', {
      name: 'demo-pkg',
      'dist-tags': { latest: '2.0.0' },
      versions: {
        '1.0.0': { description: 'old', readme: '# v1' },
        '2.0.0': {
          description: 'new',
          readme: '# Hello\n\n<script>alert(1)</script>',
          readmeFilename: 'README.md',
        },
      },
      time: { '2.0.0': '2026-01-02T00:00:00.000Z' },
    });
    expect(detail).not.toBeNull();
    expect(detail!.latest).toBe('2.0.0');
    expect(detail!.selectedVersion).toBe('2.0.0');
    expect(detail!.description).toBe('new');
    expect(detail!.readme).toContain('Hello');
    expect(detail!.readmeHtml).toBeTruthy();
    expect(detail!.readmeHtml!.toLowerCase()).not.toContain('<script');
    expect(detail!.source).toBe('live');
    expect(detail!.publishedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  test('detailFromPackument honors version pick', () => {
    const detail = detailFromPackument(
      'demo-pkg',
      {
        'dist-tags': { latest: '2.0.0' },
        versions: {
          '1.0.0': { description: 'old', readme: '# v1' },
          '2.0.0': { description: 'new', readme: '# v2' },
        },
      },
      '1.0.0'
    );
    expect(detail!.selectedVersion).toBe('1.0.0');
    expect(detail!.readme).toContain('v1');
  });

  test('resolveRegistryPackage live success prefers packument', async () => {
    const packument = {
      name: 'live-only-pkg',
      'dist-tags': { latest: '9.9.9' },
      versions: {
        '9.9.9': { description: 'from live', readme: '# Live\n\nbody' },
      },
    };
    const fetchImpl = (async () =>
      new Response(JSON.stringify(packument), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;

    const detail = await resolveRegistryPackage('live-only-pkg', {
      live: true,
      preset: 'local',
      fetchImpl,
    });
    expect(detail).not.toBeNull();
    expect(detail!.source).toBe('live');
    expect(detail!.latest).toBe('9.9.9');
    expect(detail!.description).toBe('from live');
    expect(detail!.preset).toBe('local');
  });

  test('resolveRegistryPackage live failure falls back to snapshot', async () => {
    const fetchImpl = (async () => {
      throw new Error('connection refused');
    }) as unknown as typeof fetch;

    const snap = await resolveRegistryPackage('event-store', { live: false });
    if (!snap) return;

    const detail = await resolveRegistryPackage('event-store', {
      live: true,
      preset: 'local',
      fetchImpl,
      version: snap.selectedVersion,
    });
    expect(detail).not.toBeNull();
    expect(detail!.source).toBe('snapshot');
    expect(detail!.liveError).toMatch(/connection refused/i);
    expect(detail!.name).toBe('event-store');
  });
});
