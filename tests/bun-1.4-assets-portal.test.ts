// @see https://bun.com/blog/bun-v1.4 — release source and media inventory
import { describe, expect, test } from 'bun:test';
import { PORTAL_HTML_ROUTES } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { normalizeManifest } from '../public/portal/bun-1.4/bun-1.4-assets.js';
import {
  normalizeCapabilityRegistry,
  normalizeReleaseChapters,
} from '../public/portal/bun-1.4/bun-1.4-capabilities.js';

const ROOT = resolvePath(import.meta.dir, '..');

async function readJson(path: string): Promise<Record<string, unknown>> {
  return (await Bun.file(joinPath(ROOT, path)).json()) as Record<string, unknown>;
}

describe('Bun 1.4 asset gallery', () => {
  test('committed manifest is the complete external-source inventory', async () => {
    const manifest = await readJson('public/registry/bun-1.4-assets.json');
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const counts = manifest.counts as Record<string, unknown>;

    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.release).toBe('Bun 1.4');
    expect(manifest.version).toBe('1.4.0');
    expect(manifest.publishedAt).toBe('2026-08-20T00:53:44.000Z');
    expect(manifest.rightsStatus).toBe('pending');
    expect(manifest.rights).toEqual({
      scope: 'bun-1.4-release-blog-media',
      status: 'pending',
      delivery: 'external-only',
      evidence: null,
      boundaries: {
        softwareLicense: {
          classification: 'out-of-scope',
          sourceUrl: 'https://bun.com/docs/project/license',
        },
        pressKit: {
          classification: 'separate-brand-assets',
          sourceUrl: 'https://bun.com/press-kit',
        },
        releaseBlogMedia: {
          classification: 'pending',
          sourceUrl: 'https://bun.com/blog/bun-v1.4',
          assetCount: 25,
        },
        youtubeEmbed: {
          classification: 'external-only',
          sourceUrl: 'https://www.youtube.com/embed/i38DgEuaJwM',
          assetCount: 1,
        },
      },
    });
    expect(counts).toEqual({ total: 26, image: 21, video: 4, embed: 1 });
    expect(assets).toHaveLength(26);

    const ids = new Set<string>();
    const sourceUrls = new Set<string>();
    const imageIds = new Set(
      assets.filter(asset => asset.kind === 'image').map(asset => String(asset.id))
    );

    for (const asset of assets) {
      const id = String(asset.id);
      const sourceUrl = String(asset.sourceUrl);
      expect(ids.has(id)).toBe(false);
      expect(sourceUrls.has(sourceUrl)).toBe(false);
      ids.add(id);
      sourceUrls.add(sourceUrl);

      expect(sourceUrl.startsWith('https://bun.com/')).toBe(
        asset.kind !== 'embed'
      );
      expect(asset.alt).toEqual(expect.any(String));
      expect(String(asset.alt).length).toBeGreaterThan(0);
      expect(asset.localUrl).toBeNull();
      expect(asset.publicUrl).toBe(asset.sourceUrl);
      if (asset.kind === 'embed') {
        expect(asset.byteSize).toBeNull();
        expect(asset.sha256).toBeNull();
      } else {
        expect(asset.byteSize).toEqual(expect.any(Number));
        expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      }

      if (asset.kind === 'video') {
        expect(imageIds.has(String(asset.posterId))).toBe(true);
        expect(asset.mimeType).toBe('video/mp4');
      }
    }
  });

  test('board is wired to shared portal chrome and safe media behavior', async () => {
    const html = await Bun.file(joinPath(ROOT, 'public/portal/bun-1.4/index.html')).text();
    const script = await Bun.file(
      joinPath(ROOT, 'public/portal/bun-1.4/bun-1.4-board.js')
    ).text();
    const capabilityScript = await Bun.file(
      joinPath(ROOT, 'public/portal/bun-1.4/bun-1.4-capabilities.js')
    ).text();
    const mediaScript = await Bun.file(
      joinPath(ROOT, 'public/portal/bun-1.4/bun-1.4-media.js')
    ).text();
    const styles = await Bun.file(
      joinPath(ROOT, 'public/portal/bun-1.4/bun-1.4.css')
    ).text();

    expect(PORTAL_HTML_ROUTES).toContain('/portal/bun-1.4/');
    expect(PORTAL_WEAVE_SURFACES).toContainEqual(
      expect.objectContaining({ id: 'bun-1-4-gallery', href: '/portal/bun-1.4/' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ id: 'bun-1-4-assets', href: '/registry/bun-1.4-assets.json' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({
        id: 'bun-1-4-capabilities',
        href: '/registry/bun-1.4-capabilities.json',
      })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({
        id: 'bun-1-4-channel-release',
        href: '/registry/bun-1.4-channel-release.json',
      })
    );
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/bun-1.4/bun-1.4-theme.css');
    expect(html).toContain('/registry/bun-1.4-assets.json');
    expect(html).toContain('/registry/bun-1.4-capabilities.json');
    expect(html).toContain('/registry/bun-1.4-channel-release.json');
    expect(html).toContain('/feeds/v1/all.xml');
    expect(html).toContain('/feeds/v1/images.xml');
    expect(html).toContain('/feeds/v1/videos.xml');
    expect(html).toContain('/feeds/v1/embeds.xml');
    expect(html).toContain('/registry/project-rss-channels.json');
    expect(html).toContain('/feeds/v1/projects/project-r-score/bun-1.4/all.xml');
    expect(html).toContain('id="bun-gallery"');
    expect(html).toContain('id="bun-capabilities"');
    expect(html).toContain('id="bun-chapters"');
    expect(html).toContain('id="bun-domain"');
    expect(html).toContain('id="bun-chapter"');
    expect(html).toContain('id="bun-capability"');
    expect(html).toContain('id="bun-breaking-changes"');
    expect(html).toContain('id="bun-upgrade-guide"');
    expect(script).toContain('CAPABILITIES_URL');
    expect(script).toContain('normalizeMigrationSources');
    expect(script).toContain('manifest.rightsDelivery');
    expect(capabilityScript).toContain('indexCapabilities');
    expect(capabilityScript).toContain('underConsiderationShipped !== false');
    expect(capabilityScript).toContain('normalizeReleaseChapters');
    expect(capabilityScript).toContain('Official chapter');
    expect(mediaScript).toContain('IntersectionObserver');
    expect(mediaScript).toContain("video.preload = 'none'");
    expect(mediaScript).toContain('youtube-nocookie.com');
    expect(mediaScript).toContain('localUrl');
    expect(mediaScript).toContain('prefers-reduced-motion');
    expect(mediaScript).toContain("const BUN_PUBLISHER = Object.freeze({ name: 'Bun'");
    expect(mediaScript).toContain('`Publisher: ${BUN_PUBLISHER.name} ↗`');
    expect(mediaScript).toContain("sourceLink('Official asset source ↗', officialSourceUrl(asset))");
    expect(mediaScript).toContain('asset.raw?.watchUrl || asset.raw?.sourcePage || asset.sourceUrl');
    expect(mediaScript).not.toContain('innerHTML');
    expect(styles).toContain('prefers-reduced-motion');
    expect(styles).toContain('var(--fw-bun-14-color-accent)');
    expect(styles).toContain('var(--fw-bun-14-color-focus-ring)');
    expect(styles).not.toMatch(
      /var\(--(?:bg|surface|border|text|text-dim|accent)\)/
    );
  });

  test('browser consumer rejects stale aliases and inconsistent rights before rendering', async () => {
    const manifest = await readJson('public/registry/bun-1.4-assets.json');
    expect(normalizeManifest(manifest).assets).toHaveLength(26);

    const staleSchema = structuredClone(manifest);
    staleSchema.schemaVersion = 1;
    expect(() => normalizeManifest(staleSchema)).toThrow('schema/release/version');

    const legacyAlias = structuredClone(manifest);
    legacyAlias.assets = undefined;
    legacyAlias.records = manifest.assets;
    expect(() => normalizeManifest(legacyAlias)).toThrow('exactly 26 assets');

    const mismatchedRights = structuredClone(manifest);
    (mismatchedRights.rights as Record<string, unknown>).delivery = 'vendor-approved';
    expect(() => normalizeManifest(mismatchedRights)).toThrow('rights contract');

    const missingPoster = structuredClone(manifest);
    const video = (missingPoster.assets as Array<Record<string, unknown>>).find(
      asset => asset.kind === 'video'
    );
    expect(video).toBeDefined();
    video!.posterId = 'missing-poster';
    expect(() => normalizeManifest(missingPoster)).toThrow('requires a manifest poster');
  });

  test('browser capability consumer rejects stale or partial registry projections', async () => {
    const registry = await readJson('public/registry/bun-1.4-capabilities.json');
    expect(normalizeCapabilityRegistry(registry)).toHaveLength(60);
    expect(normalizeReleaseChapters(registry)).toHaveLength(5);

    const staleSchema = structuredClone(registry);
    staleSchema.schemaVersion = 2;
    expect(() => normalizeCapabilityRegistry(staleSchema)).toThrow('contract is unsupported');

    const partial = structuredClone(registry);
    (partial.capabilities as unknown[]).pop();
    expect(() => normalizeCapabilityRegistry(partial)).toThrow('contract is unsupported');
  });
});
