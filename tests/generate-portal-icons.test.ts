// @see https://bun.com/docs/test/index#run-tests — bun:test
// @verified bun:test · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @released Bun.Image · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.webp
// @released Bun.Image.webp · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
/**
 * @see ../tools/generate-portal-icons.ts
 */
import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  generateAllPortalIcons,
  generateTenantIcons,
  letterMarkPng,
  PORTAL_ICON_TENANTS,
  solidPng,
  verifyPortalIcons,
} from '../tools/generate-portal-icons.ts';

describe('solidPng', () => {
  test('produces Bun.Image-readable PNG that resizes', async () => {
    const png = solidPng(59, 130, 246, 128);
    expect(png[0]).toBe(137);
    const meta = await new Bun.Image(png).metadata();
    expect(meta.width).toBe(128);
    expect(meta.height).toBe(128);
    expect(String(meta.format).toLowerCase()).toBe('png');
    const webp = await new Bun.Image(png).resize(32, 32, { fit: 'inside' }).webp({ quality: 85 }).bytes();
    expect(webp.byteLength).toBeGreaterThan(20);
  });
});

describe('generateTenantIcons', () => {
  test('writes webp + svg under outRoot', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portal-icons-'));
    const assets = join(dir, 'assets');
    const out = join(dir, 'out');
    try {
      await mkdir(assets, { recursive: true });
      await Bun.write(
        join(assets, 'factory.svg'),
        await Bun.file('assets/portal-icons/factory.svg').text()
      );
      const result = await generateTenantIcons(PORTAL_ICON_TENANTS[0]!, {
        outRoot: out,
        assetsRoot: assets,
      });
      expect(result.webp['32']).toBe('/icons/factory/mark-32.webp');
      expect(await Bun.file(join(out, 'factory/mark-32.webp')).exists()).toBe(true);
      expect(await Bun.file(join(out, 'factory/mark.svg')).exists()).toBe(true);
      expect(result.hashes['mark-32.webp']).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('letterMarkPng', () => {
  test('letter mark resizes to webp', async () => {
    const png = letterMarkPng(59, 130, 246, 'F', 128);
    const webp = await new Bun.Image(png).resize(32, 32, { fit: 'inside' }).webp({ quality: 85 }).bytes();
    expect(webp.byteLength).toBeGreaterThan(40);
  });
});

describe('generateAllPortalIcons', () => {
  test('manifest lists three tenants + verify', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portal-icons-all-'));
    const assets = join(dir, 'assets');
    const out = join(dir, 'out');
    try {
      await mkdir(assets, { recursive: true });
      for (const t of PORTAL_ICON_TENANTS) {
        await Bun.write(
          join(assets, `${t.id}.svg`),
          await Bun.file(`assets/portal-icons/${t.id}.svg`).text()
        );
      }
      const result = await generateAllPortalIcons({
        outRoot: out,
        assetsRoot: assets,
        updateTenantManifest: false,
      });
      expect(result.tenants.length).toBe(3);
      expect(result.tenants[0]?.srcset).toContain('32w');
      const man = (await Bun.file(join(out, 'manifest.json')).json()) as {
        tenants: Record<string, { webp: Record<string, string>; srcset: string }>;
      };
      expect(man.tenants.factory?.webp['32']).toContain('factory');
      expect(man.tenants.science?.webp['32']).toContain('science');
      expect(man.tenants.tennis?.webp['32']).toContain('tennis');
      const v = await verifyPortalIcons(out);
      expect(v.ok).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
