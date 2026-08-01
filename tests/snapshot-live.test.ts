import { describe, expect, test } from 'bun:test';
import {
  assertGlossaryEnhancements,
  getImageMetadata,
  mapPortalUrlToGitPath,
  markersPresent,
  PORTAL_PROBES,
  sha256Hex,
} from '../tools/snapshot-live.ts';

describe('snapshot-live helpers', () => {
  test('sha256Hex is stable', () => {
    expect(sha256Hex('factorywager')).toBe(sha256Hex('factorywager'));
    expect(sha256Hex('a')).not.toBe(sha256Hex('b'));
    expect(sha256Hex('x')).toHaveLength(64);
  });

  test('markersPresent requires every substring', () => {
    expect(markersPresent('aa bb cc', ['aa', 'cc'])).toBe(true);
    expect(markersPresent('aa bb', ['aa', 'zz'])).toBe(false);
  });

  test('mapPortalUrlToGitPath covers probes', () => {
    expect(mapPortalUrlToGitPath('/portal/components/glossary-ux.js')).toBe(
      'public/portal/components/glossary-ux.js'
    );
    expect(mapPortalUrlToGitPath('/nope')).toBeNull();
    expect(PORTAL_PROBES.length).toBeGreaterThanOrEqual(5);
  });

  test('assertGlossaryEnhancements accepts v3 surface shapes', () => {
    const ok = assertGlossaryEnhancements({
      schemaVersion: 3,
      surfaces: [
        {
          path: '/portal/account/',
          sections: [{ hash: 'identity', domId: 'ad-section-identity' }],
        },
        {
          path: '/portal/partners/',
          sections: [{ hash: 'onboard', domId: 'section:onboard' }],
        },
        {
          path: '/portal/limits/',
          sections: [{ hash: 'account-control', domId: 'account-control' }],
        },
        {
          path: '/portal/partner-history/',
          sections: [{ hash: 'opening-baseline', domId: 'opening-baseline' }],
        },
      ],
    });
    expect(ok.ok).toBe(true);
    expect(assertGlossaryEnhancements({ schemaVersion: 2, surfaces: [] }).ok).toBe(false);
  });

  test('getImageMetadata uses Bun.file().image() and optional thumb write', async () => {
    const dir = `${import.meta.dir}/../artifacts/snapshots`;
    await Bun.write(`${dir}/.keep`, '');
    const pngPath = `${dir}/unit-1x1.png`;
    await Bun.write(
      pngPath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmLIQAAAABJRU5ErkJggg==',
        'base64'
      )
    );
    const meta = await getImageMetadata(pngPath, { thumb: true, thumbMax: 2 });
    expect(meta.ok).toBe(true);
    if (meta.ok) {
      expect(meta.format).toBe('png');
      expect(meta.width).toBe(1);
      expect(meta.height).toBe(1);
      expect(meta.thumbPath).toBeTruthy();
      expect(await Bun.file(meta.thumbPath!).exists()).toBe(true);
    }
    const missing = await getImageMetadata(`${dir}/does-not-exist.png`);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe('ENOENT');
  });

  test('tool ships Bun.Image pipeline and Access header wiring', async () => {
    const src = await Bun.file('tools/snapshot-live.ts').text();
    expect(src).toContain('file.image()');
    expect(src).toContain('.metadata()');
    expect(src).toContain('ERR_IMAGE_FORMAT_UNSUPPORTED');
    expect(src).toContain('CF-Access-Client-Id');
    expect(src).toContain('runSnapshot');
    expect(src).toContain('logTable');
    expect(src).toContain('Bun.write');
    expect(src).toContain('bun-v1.3.14');
  });
});
