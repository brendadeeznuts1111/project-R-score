// @see https://bun.com/docs/runtime/image#metadata — byte-sniffed image metadata
import { describe, expect, test } from 'bun:test';
import { asReleaseAssetId } from '../lib/types/branded.ts';
import { MAX_IMAGE_PIXELS, MAX_MP4_FTYP_BYTES } from '../tools/bun-blog-assets/constants.ts';
import { inspectAllAssets } from '../tools/bun-blog-assets/inspection.ts';
import { parseManifestShape } from '../tools/bun-blog-assets/manifest-validation.ts';
import {
  assertVendorSafeAsset,
  inspectRasterImage,
  inspectSvgDimensions,
  MAX_SVG_BYTES,
  validateMp4Container,
} from '../tools/bun-blog-assets/media-validation.ts';
import { fetchRemoteAssetBytes } from '../tools/bun-blog-assets/remote-asset.ts';
import { run } from '../tools/bun-blog-assets/run.ts';
import { buildMediaRights, parseRightsApprovalEvidence } from '../tools/bun-blog-assets/rights.ts';
import type { AssetDraft, CliOptions } from '../tools/bun-blog-assets/types.ts';

const pngBytes = new Uint8Array(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  )
);

function draft(overrides: Partial<AssetDraft> = {}): AssetDraft {
  return {
    id: asReleaseAssetId('fixture'),
    kind: 'image',
    sourceUrl: 'https://bun.com/fixture.png',
    path: '/fixture.png',
    alt: 'fixture',
    section: 'Fixture',
    width: null,
    height: null,
    lazyLoad: true,
    ...overrides,
  };
}

function bytesResponse(
  bytes: Uint8Array,
  status: number,
  headers: Record<string, string> = {}
): Response {
  return new Response(bytes, {
    status,
    headers: { 'content-length': String(bytes.byteLength), ...headers },
  });
}

describe('Bun 1.4 asset range validation', () => {
  test('reuses a complete 200 response when Range is ignored', async () => {
    const ranges: Array<string | null> = [];
    const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      ranges.push(new Headers(init?.headers).get('range'));
      return bytesResponse(new Uint8Array([1, 2, 3]), 200, {
        'content-type': 'image/png',
      });
    }) as typeof fetch;

    const result = await fetchRemoteAssetBytes(draft(), 10, 1_000, fetcher);
    expect(ranges).toEqual(['bytes=0-0']);
    expect(result.rangeProbe).toEqual({
      request: 'bytes=0-0',
      result: 'ignored',
      totalBytes: 3,
    });
  });

  test('accepts only exact 206 Content-Range before one full fetch', async () => {
    const ranges: Array<string | null> = [];
    const full = new Uint8Array([9, 8, 7, 6]);
    const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const range = new Headers(init?.headers).get('range');
      ranges.push(range);
      return range
        ? bytesResponse(full.slice(0, 1), 206, { 'content-range': 'bytes 0-0/4' })
        : bytesResponse(full, 200, { 'content-type': 'video/mp4' });
    }) as typeof fetch;

    const result = await fetchRemoteAssetBytes(draft(), 10, 1_000, fetcher);
    expect(ranges).toEqual(['bytes=0-0', null]);
    expect(result.rangeProbe.result).toBe('supported');
    expect(result.bytes).toEqual(full);
  });

  test('fails a malformed 206 without starting a full fetch', async () => {
    let requests = 0;
    const fetcher = (async () => {
      requests += 1;
      return bytesResponse(new Uint8Array([1]), 206, {
        'content-range': 'bytes 0-1/4',
      });
    }) as typeof fetch;

    await expect(fetchRemoteAssetBytes(draft(), 10, 1_000, fetcher)).rejects.toThrow(
      'invalid Content-Range'
    );
    expect(requests).toBe(1);
  });
});

describe('Bun 1.4 media signatures', () => {
  test('bounds MP4 validation to a small ftyp box', () => {
    const valid = new Uint8Array(24);
    const view = new DataView(valid.buffer);
    view.setUint32(0, valid.byteLength);
    valid.set(Buffer.from('ftypisom'), 4);
    valid.set(Buffer.from('isommp42'), 16);
    expect(() => validateMp4Container(draft({ kind: 'video' }), valid)).not.toThrow();
    valid.set(Buffer.from('nope'), 4);
    expect(() => validateMp4Container(draft({ kind: 'video' }), valid)).toThrow(
      'not an MP4 ftyp container'
    );

    const oversized = new Uint8Array(MAX_MP4_FTYP_BYTES + 4);
    new DataView(oversized.buffer).setUint32(0, oversized.byteLength);
    oversized.set(Buffer.from('ftypisom'), 4);
    expect(() => validateMp4Container(draft({ kind: 'video' }), oversized)).toThrow(
      'invalid or oversized MP4 ftyp box'
    );
  });

  test('matches the response MIME against Bun.Image sniffed bytes', async () => {
    const asset = draft({ path: '/fixture.jpg' });
    await expect(inspectRasterImage(asset, pngBytes, 'image/jpeg')).rejects.toThrow(
      'Bun.Image-sniffed image/png (png)'
    );
    expect(MAX_IMAGE_PIXELS).toBe(8 * 1024 * 1024);
  });
});

describe('Bun 1.4 SVG vendor policy', () => {
  const svg = draft({
    id: asReleaseAssetId('fixture-svg'),
    sourceUrl: 'https://bun.com/fixture.svg',
    path: '/fixture.svg',
  });

  const validSvg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><rect width="64" height="32"/></svg>'
  );

  test('validates and inspects SVG bytes in vendor mode without Bun.Image metadata', async () => {
    const dimensions = inspectSvgDimensions(svg, validSvg);
    expect(dimensions).toEqual({ width: 64, height: 32 });
    expect(() => assertVendorSafeAsset(svg, 'external')).not.toThrow();
    expect(() => assertVendorSafeAsset(svg, 'vendor')).not.toThrow();

    let requests = 0;
    const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests += 1;
      expect(new Headers(init?.headers).get('range')).toBe('bytes=0-0');
      return bytesResponse(validSvg, 200, { 'content-type': 'image/svg+xml; charset=utf-8' });
    }) as typeof fetch;
    const [result] = await inspectAllAssets([svg], 1_000, 'vendor', fetcher);
    expect(requests).toBe(1);
    expect(result?.asset.width).toBe(64);
    expect(result?.asset.height).toBe(32);
    expect(result?.mimeType).toBe('image/svg+xml');
    expect(result?.byteSize).toBe(validSvg.byteLength);
    expect(result?.sha256).toBe(
      new Bun.CryptoHasher('sha256').update(validSvg).digest('hex') as string
    );
    expect(result?.format).toBe('svg');
    expect(result?.metadataSource).toBe('remote-bytes');
  });

  test('rejects active SVG content, invalid XML, and oversized SVG bytes', () => {
    expect(() =>
      inspectSvgDimensions(
        svg,
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><script>bad()</script></svg>'
        )
      )
    ).toThrow('active or externally addressable element');
    expect(() =>
      inspectSvgDimensions(
        svg,
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><path onload="bad()"/></svg>'
        )
      )
    ).toThrow('active, style, or link attribute');
    expect(() =>
      inspectSvgDimensions(
        svg,
        new TextEncoder().encode(
          '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"/>'
        )
      )
    ).toThrow('must not contain a DTD');
    expect(() => inspectSvgDimensions(svg, new Uint8Array(MAX_SVG_BYTES + 1))).toThrow(
      'SVG byte size'
    );
  });

  test('rejects SVG MIME disagreement before accepting vendor bytes', async () => {
    const fetcher = (async () =>
      bytesResponse(validSvg, 200, { 'content-type': 'image/png' })) as typeof fetch;
    await expect(inspectAllAssets([svg], 1_000, 'vendor', fetcher)).rejects.toThrow(
      'content type image/png does not match image/svg+xml'
    );
  });

  test('requires explicit SVG metadata in the manifest boundary', async () => {
    const manifest = await Bun.file(
      `${import.meta.dir}/../public/registry/bun-1.4-assets.json`
    ).json();
    expect(() => parseManifestShape(manifest, 'fixture manifest')).not.toThrow();

    const invalid = structuredClone(manifest) as {
      assets: Array<Record<string, unknown>>;
    };
    const svgRecord = invalid.assets.find(asset => String(asset.path).endsWith('.svg'));
    expect(svgRecord).toBeDefined();
    svgRecord!.format = 'png';
    expect(() => parseManifestShape(invalid, 'fixture manifest')).toThrow(
      'requires the explicit remote-byte SVG metadata path'
    );
  });

  test('preserves the explicit rights gate before source access', async () => {
    const options: CliOptions = {
      check: false,
      vendor: true,
      confirmRights: false,
      mode: 'vendor',
      htmlPath: '/missing.html',
      markdownPath: '/missing.md',
      manifestPath: '/missing.json',
      vendorDir: '/missing-media',
      timeoutMs: 1_000,
    };
    await expect(run(options)).rejects.toThrow('--confirm-rights is supplied');
  });

  test('requires scoped durable evidence after rights acknowledgement', async () => {
    const options: CliOptions = {
      check: false,
      vendor: true,
      confirmRights: true,
      mode: 'vendor',
      htmlPath: '/missing.html',
      markdownPath: '/missing.md',
      manifestPath: '/missing.json',
      vendorDir: '/missing-media',
      timeoutMs: 1_000,
    };
    await expect(run(options)).rejects.toThrow('--rights-evidence PATH');
  });

  test('separates software, press-kit, blog-media, and embed rights scopes', () => {
    const approval = parseRightsApprovalEvidence({
      schemaVersion: 1,
      scope: 'bun-1.4-release-blog-media',
      status: 'approved',
      approvalId: 'approval-123',
      approvedBy: 'Publisher representative',
      approvedAt: '2026-08-25T00:00:00.000Z',
      evidenceUrl: 'https://example.com/evidence/approval-123',
      sourcePage: 'https://bun.com/blog/bun-v1.4',
    });
    const rights = buildMediaRights('approved', approval);
    expect(rights.delivery).toBe('vendor-approved');
    expect(rights.boundaries.softwareLicense.classification).toBe('out-of-scope');
    expect(rights.boundaries.pressKit.classification).toBe('separate-brand-assets');
    expect(rights.boundaries.releaseBlogMedia.assetCount).toBe(25);
    expect(rights.boundaries.youtubeEmbed.classification).toBe('external-only');
    expect(rights.evidence?.approvalId).toBe('approval-123');
  });

  test('rejects generic or non-durable rights claims', () => {
    expect(() =>
      parseRightsApprovalEvidence({
        schemaVersion: 1,
        scope: 'bun-assets',
        status: 'approved',
        approvalId: 'approval-123',
        approvedBy: 'Approver',
        approvedAt: '2026-08-25T00:00:00.000Z',
        evidenceUrl: 'http://example.com/evidence',
        sourcePage: 'https://bun.com/blog/bun-v1.4',
      })
    ).toThrow('exact Bun 1.4 release-blog media scope');
  });
});
