import { describe, expect, test } from 'bun:test';
import {
  assertGlossaryEnhancements,
  assertHtmlStructure,
  colorStatus,
  getImageMetadata,
  gitShowText,
  glossaryShapeForEquals,
  mapPortalUrlToGitPath,
  markersPresent,
  PORTAL_PROBES,
  sha256Hex,
  validateImageHealth,
  VERDICT_STATUS_PALETTE,
} from '../tools/snapshot-live.ts';
import { PORTAL_KERNEL_PALETTE } from '../lib/portal/portal-kernel-palette.ts';
import { deepEquals } from '../lib/deep-equals.ts';

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
      expect(meta.healthy).toBe(true);
      expect(meta.thumbPath).toBeTruthy();
      expect(await Bun.file(meta.thumbPath!).exists()).toBe(true);
    }
    const missing = await getImageMetadata(`${dir}/does-not-exist.png`);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe('ENOENT');
  });

  test('validateImageHealth rejects undersized non-probe images', () => {
    expect(validateImageHealth({ width: 1, height: 1, format: 'png' }, { allowTiny: true }).ok).toBe(
      true
    );
    expect(
      validateImageHealth(
        { width: 50, height: 50, format: 'png' },
        { allowTiny: false, minWidth: 100, minHeight: 100 }
      ).ok
    ).toBe(false);
  });

  test('assertHtmlStructure finds section ids and glossary concepts', async () => {
    const html = `
      <main>
        <div id="section:onboard" data-glossary-concept="section.partnersOnboard"></div>
        <div id="account-glossary-crumbs"></div>
      </main>`;
    const ok = await assertHtmlStructure(html, {
      domIds: ['section:onboard', 'account-glossary-crumbs'],
      glossaryConcepts: ['section.partnersOnboard'],
    });
    expect(ok.ok).toBe(true);
    expect(ok.foundIds).toContain('section:onboard');
    const bad = await assertHtmlStructure(html, { domIds: ['missing-mount'] });
    expect(bad.ok).toBe(false);
    expect(bad.missing).toContain('id:missing-mount');
  });

  test('gitShowText reads origin/main glossary via Bun.$', async () => {
    const text = await gitShowText('origin/main:public/registry/domain-glossary.json');
    const json = JSON.parse(text) as { schemaVersion?: number };
    expect(json.schemaVersion).toBe(3);
  });

  test('verdict colors come from portal kernel palette', () => {
    expect(VERDICT_STATUS_PALETTE.LIVE).toBe(PORTAL_KERNEL_PALETTE.green);
    expect(VERDICT_STATUS_PALETTE.STALE).toBe(PORTAL_KERNEL_PALETTE.red);
    expect(VERDICT_STATUS_PALETTE.ACCESS_SKIP).toBe(PORTAL_KERNEL_PALETTE.yellow);
    // colorStatus returns plain text under NO_COLOR / non-TTY
    expect(colorStatus('LIVE')).toContain('LIVE');
  });

  test('glossaryShapeForEquals is deepEquals-stable', () => {
    const a = {
      schemaVersion: 3,
      surfaces: [{ path: '/portal/account/', sections: [{ hash: 'identity', domId: 'ad-section-identity' }] }],
      extraBakeNoise: Date.now(),
    };
    const b = {
      schemaVersion: 3,
      surfaces: [{ path: '/portal/account/', sections: [{ hash: 'identity', domId: 'ad-section-identity' }] }],
      extraBakeNoise: 0,
    };
    expect(deepEquals(glossaryShapeForEquals(a), glossaryShapeForEquals(b))).toBe(true);
  });

  test('tool ships Bun.Image · HTMLRewriter · Bun.$ · colorize wiring', async () => {
    const src = await Bun.file('tools/snapshot-live.ts').text();
    expect(src).toContain('file.image()');
    expect(src).toContain('.metadata()');
    expect(src).toContain('HTMLRewriter');
    expect(src).toContain("import { $, Glob } from 'bun'");
    expect(src).toContain('PORTAL_KERNEL_PALETTE');
    expect(src).toContain('colorize');
    expect(src).toContain('deepEquals');
    expect(src).toContain('probeAccessProtection');
    expect(src).toContain('--quick');
    expect(src).toContain('ERR_IMAGE_FORMAT_UNSUPPORTED');
    expect(src).toContain('CF-Access-Client-Id');
    expect(src).toContain('runSnapshot');
    expect(src).toContain('logTable');
    expect(src).toContain('Bun.write');
    expect(src).toContain('bun-v1.3.14');
  });
});
