// @see https://bun.com/docs/runtime/image#platform-backends — Bun.Image.backend
// @released Bun.Image.backend · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/Image/Format — Bun.Image.Format
// @released Bun.Image.Format · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/Image/height — Bun.Image.height
// @released Bun.Image.height · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.png
// @released Bun.Image.png · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.ResizeOptions
// @released Bun.Image.ResizeOptions · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/Image/width — Bun.Image.width
// @released Bun.Image.width · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @updated Bun.revision · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.revision · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-revision
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, expectTypeOf, test } from 'bun:test';
import {
  BUN_IMAGE_ERROR_CODES,
  BUN_IMAGE_FORMATS,
  BUN_IMAGE_DOCS,
  BUN_IMAGE_METADATA_DOCS,
  DEFAULT_THUMB_MAX_HEIGHT,
  DEFAULT_THUMB_MAX_WIDTH,
  extractImageEvidenceMeta,
  imageEvidenceHeaders,
  imageMetaChecksPassed,
  isBunImageError,
  isBunImageFormat,
  isImageEvidenceMeta,
  parseImageEvidenceMeta,
  resizeScreenshotPng,
  verifyImageEvidenceMeta,
  type BunImageByteInput,
  type BunImageBackend,
  type BunImageJpegOptions,
  type BunImagePngOptions,
  type BunImageWebpOptions,
  type ImageEvidenceMeta,
  type ResizeScreenshotOptions,
} from '../lib/image-metadata.ts';
import {
  TEST_003,
  buildScreenshotEvidenceRecord,
  isScreenshotEvidenceRecord,
  parseScreenshotEvidenceRecord,
  remediateScreenshotCapture,
  runTest003,
  screenshotEvidenceEqual,
  type ScreenshotEvidenceRecord,
} from '../lib/screenshot-remediation.ts';
import { mintEvidenceIdAt } from '../lib/time.ts';
import { unbrand } from '../lib/types/branded.ts';

/** 10×10 PNG fixture. */
const PNG_10 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC',
  'base64',
);

describe('lib/image-metadata', () => {
  test('public contracts derive from Bun.Image namespace types', () => {
    expectTypeOf<ImageEvidenceMeta['format']>().toEqualTypeOf<Bun.Image.Format>();
    expectTypeOf<ResizeScreenshotOptions>().toMatchTypeOf<Bun.Image.ResizeOptions>();
    expectTypeOf<Parameters<typeof extractImageEvidenceMeta>[0]>().toEqualTypeOf<BunImageByteInput>();
    expectTypeOf<BunImageBackend>().toEqualTypeOf<typeof Bun.Image.backend>();
    expectTypeOf<BunImageJpegOptions>().toEqualTypeOf<
      NonNullable<Parameters<Bun.Image['jpeg']>[0]>
    >();
    expectTypeOf<BunImagePngOptions>().toEqualTypeOf<
      NonNullable<Parameters<Bun.Image['png']>[0]>
    >();
    expectTypeOf<BunImageWebpOptions>().toEqualTypeOf<
      NonNullable<Parameters<Bun.Image['webp']>[0]>
    >();
    expect(Object.keys(BUN_IMAGE_FORMATS)).toEqual([
      'jpeg',
      'png',
      'webp',
      'heic',
      'avif',
      'bmp',
      'tiff',
      'gif',
    ]);
    expect(Object.keys(BUN_IMAGE_ERROR_CODES)).toHaveLength(6);
  });

  test('canonical docs URLs point at Bun.Image anchors', () => {
    expect(BUN_IMAGE_DOCS).toBe('https://bun.com/docs/runtime/image#input');
    expect(BUN_IMAGE_METADATA_DOCS).toBe('https://bun.com/docs/runtime/image#metadata');
  });

  test('extractImageEvidenceMeta reads Bun.Image dimensions/format/size/digest', async () => {
    const meta = await extractImageEvidenceMeta(PNG_10);
    expect(meta.width).toBe(10);
    expect(meta.height).toBe(10);
    expect(meta.format).toBe('png');
    expect(meta.size).toBe(PNG_10.byteLength);
    expect(meta.algorithm).toBe('sha256');
    expect(meta.digest).toHaveLength(64);
  });

  test('pipeline dimensions move from pending sentinel to output geometry', async () => {
    const image = new Bun.Image(PNG_10).resize(4, 3).png();
    expect([image.width, image.height]).toEqual([-1, -1]);
    await image.bytes();
    expect([image.width, image.height]).toEqual([4, 3]);
  });

  test('extractImageEvidenceMeta supports sha3-256', async () => {
    const meta = await extractImageEvidenceMeta(PNG_10, { algorithm: 'sha3-256' });
    expect(meta.algorithm).toBe('sha3-256');
    expect(meta.digest).toHaveLength(64);
  });

  test('extractImageEvidenceMeta rejects empty bytes', async () => {
    expect(extractImageEvidenceMeta(new Uint8Array())).rejects.toThrow(/empty/);
  });

  test('resizeScreenshotPng keeps inside default thumb bounds', async () => {
    const { bytes, meta } = await resizeScreenshotPng(PNG_10, {
      fit: 'inside',
      filter: 'nearest',
      withoutEnlargement: true,
      image: { autoOrient: false, maxPixels: 100 },
      png: { compressionLevel: 6 },
    });
    expect(meta.format).toBe('png');
    expect(meta.width).toBeLessThanOrEqual(DEFAULT_THUMB_MAX_WIDTH);
    expect(meta.height).toBeLessThanOrEqual(DEFAULT_THUMB_MAX_HEIGHT);
    expect(bytes.byteLength).toBe(meta.size);
  });

  test('verifyImageEvidenceMeta fails oversized dimensions', () => {
    const checks = verifyImageEvidenceMeta(
      {
        width: 800,
        height: 600,
        format: 'png',
        size: 100,
        algorithm: 'sha256',
        digest: 'a'.repeat(64),
      },
      { maxWidth: 400, maxHeight: 300 },
    );
    expect(checks.find(c => c.id === 'dimensions')?.ok).toBe(false);
    expect(imageMetaChecksPassed(checks)).toBe(false);
  });

  test('isImageEvidenceMeta / parseImageEvidenceMeta guard wire payloads', async () => {
    const meta = await extractImageEvidenceMeta(PNG_10);
    expect(isImageEvidenceMeta(meta)).toBe(true);
    expect(parseImageEvidenceMeta(meta)).toEqual(meta);
    expect(isImageEvidenceMeta({ width: 0, height: 10 })).toBe(false);
    expect(isImageEvidenceMeta({ ...meta, format: 'jpg' })).toBe(false);
    expect(() => parseImageEvidenceMeta({ width: 10 })).toThrow(/Invalid ImageEvidenceMeta/);
  });

  test('Bun Image format and terminal-error guards stay closed', () => {
    expect(isBunImageFormat('gif')).toBe(true);
    expect(isBunImageFormat('jpg')).toBe(false);
    expect(
      isBunImageError(Object.assign(new Error('decode failed'), { code: 'ERR_IMAGE_DECODE_FAILED' }))
    ).toBe(true);
    expect(isBunImageError(Object.assign(new Error('missing'), { code: 'ENOENT' }))).toBe(false);
  });

  test('parseImageEvidenceMeta rejects bad algorithm, short digest, non-object', () => {
    const base = {
      width: 10,
      height: 10,
      format: 'png',
      size: 84,
      algorithm: 'sha256',
      digest: 'a'.repeat(64),
    };
    expect(isImageEvidenceMeta({ ...base, algorithm: 'md5' })).toBe(false);
    expect(isImageEvidenceMeta({ ...base, digest: 'abc' })).toBe(false);
    expect(isImageEvidenceMeta(null)).toBe(false);
    expect(isImageEvidenceMeta('png')).toBe(false);
    expect(() => parseImageEvidenceMeta({ ...base, algorithm: 'md5' })).toThrow(
      /Invalid ImageEvidenceMeta/,
    );
    expect(() => parseImageEvidenceMeta({ ...base, digest: 'short' })).toThrow(
      /Invalid ImageEvidenceMeta/,
    );
  });

  test('imageEvidenceHeaders emits X-Image-* keys', async () => {
    const meta = await extractImageEvidenceMeta(PNG_10);
    const headers = imageEvidenceHeaders(meta);
    expect(headers['X-Image-Width']).toBe('10');
    expect(headers['X-Image-Height']).toBe('10');
    expect(headers['X-Image-Format']).toBe('png');
    expect(headers['X-Image-Size']).toBe(String(meta.size));
    expect(headers['X-Image-Digest']).toBe(`sha256:${meta.digest}`);
  });
});

describe('lib/screenshot-remediation TEST-003', () => {
  test('buildScreenshotEvidenceRecord + runTest003 passes for small PNG', async () => {
    const { record, elapsedMs } = await buildScreenshotEvidenceRecord(PNG_10, { subject: 'demo' });
    expect(record.testId).toBe(TEST_003);
    expect(record.subject).toBe('demo');
    expect(record.evidenceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(record.source.format).toBe('png');
    expect(record.thumbnail.format).toBe('png');
    expect(elapsedMs).toBeGreaterThanOrEqual(0);

    const result = runTest003(record, undefined, { elapsedMs });
    expect(result.code).toBe(TEST_003);
    expect(result.status).toBe('pass');
    expect(result.ok).toBe(true);
    expect(result.unchanged).toBe(false);
    expect(result.elapsedMs).toBe(elapsedMs);
    expect(result.timing.ok).toBe(true);
    expect(result.runtime.version).toBe(Bun.version);
    expect(result.runtime.revision).toBe(Bun.revision);
    expect(result.remediation.action).toBe('accept');
  });

  test('runTest003 fails with resize_fix when thumbnail dims too large', () => {
    const capturedAt = new Date().toISOString();
    const record: ScreenshotEvidenceRecord = {
      kind: 'ScreenshotEvidence',
      testId: TEST_003,
      capturedAt,
      evidenceId: mintEvidenceIdAt(new Date(capturedAt)),
      source: {
        width: 1280,
        height: 800,
        format: 'png',
        size: 1000,
        algorithm: 'sha256',
        digest: 'b'.repeat(64),
      },
      thumbnail: {
        width: 800,
        height: 600,
        format: 'png',
        size: 500,
        algorithm: 'sha256',
        digest: 'c'.repeat(64),
      },
    };
    const result = runTest003(record);
    expect(result.ok).toBe(false);
    expect(result.status).toBe('fail');
    expect(result.timing.ok).toBe(true);
    expect(result.remediation.action).toBe('resize_fix');
    expect(result.remediation.command).toContain('resize(400, 300');
  });

  test('runTest003 custom 320×240 expectations put resize(320, 240 in remediation command', () => {
    const capturedAt = new Date().toISOString();
    const record: ScreenshotEvidenceRecord = {
      kind: 'ScreenshotEvidence',
      testId: TEST_003,
      capturedAt,
      evidenceId: mintEvidenceIdAt(new Date(capturedAt)),
      source: {
        width: 1280,
        height: 800,
        format: 'png',
        size: 1000,
        algorithm: 'sha256',
        digest: 'd'.repeat(64),
      },
      thumbnail: {
        width: 400,
        height: 300,
        format: 'png',
        size: 500,
        algorithm: 'sha256',
        digest: 'e'.repeat(64),
      },
    };
    const result = runTest003(record, {
      formats: ['png'],
      maxWidth: 320,
      maxHeight: 240,
      minSize: 32,
    });
    expect(result.ok).toBe(false);
    expect(result.remediation.action).toBe('resize_fix');
    expect(result.remediation.command).toContain('resize(320, 240');
  });

  test('runTest003 rejects when evidenceId timestamp drifts from capturedAt', async () => {
    const { record } = await buildScreenshotEvidenceRecord(PNG_10, {
      capturedAt: '2026-07-22T12:00:00.000Z',
      // Exact historical stamp (mintEvidenceId would clamp under Bun monotonic watermark).
      evidenceId: mintEvidenceIdAt(new Date('2026-01-01T00:00:00.000Z')),
    });
    const result = runTest003(record);
    expect(result.ok).toBe(false);
    expect(result.timing.ok).toBe(false);
    expect(result.remediation.action).toBe('reject');
    expect(result.remediation.message).toContain('Evidence timing failed');
  });

  test('remediateScreenshotCapture returns thumbnail bytes and pass status', async () => {
    const result = await remediateScreenshotCapture(PNG_10, { team: 'man-city' });
    expect(result.status).toBe('pass');
    expect(result.ok).toBe(true);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.evidence.evidenceId.length).toBeGreaterThan(0);
    expect(result.thumbnailBytes.byteLength).toBeGreaterThan(0);
    expect(result.evidence.thumbnail.width).toBeLessThanOrEqual(DEFAULT_THUMB_MAX_WIDTH);
  });

  test('remediateScreenshotCapture honors dashboard 320×240 thumb bounds', async () => {
    const result = await remediateScreenshotCapture(PNG_10, {
      subject: 'dashboard',
      thumbMaxWidth: 320,
      thumbMaxHeight: 240,
    });
    expect(result.ok).toBe(true);
    expect(result.remediation.message).toContain('320×240');
    expect(result.evidence.thumbnail.width).toBeLessThanOrEqual(320);
    expect(result.evidence.thumbnail.height).toBeLessThanOrEqual(240);
  });

  test('screenshotEvidenceEqual uses Bun.deepEquals on source+thumbnail metas', async () => {
    const a = await buildScreenshotEvidenceRecord(PNG_10, {
      subject: 'eq',
      capturedAt: '2026-07-22T00:00:00.000Z',
    });
    const b = await buildScreenshotEvidenceRecord(PNG_10, {
      subject: 'other',
      capturedAt: '2026-07-22T12:00:00.000Z',
    });
    // subject + capturedAt ignored — metas match
    expect(screenshotEvidenceEqual(a.record, b.record)).toBe(true);
    expect(
      screenshotEvidenceEqual(a.record, {
        ...b.record,
        thumbnail: { ...b.record.thumbnail, width: b.record.thumbnail.width + 1 },
      }),
    ).toBe(false);
  });

  test('remediateScreenshotCapture marks unchanged when previous deepEquals', async () => {
    const first = await remediateScreenshotCapture(PNG_10, { subject: 'skip' });
    expect(first.unchanged).toBe(false);
    const second = await remediateScreenshotCapture(PNG_10, {
      subject: 'skip-again',
      previous: first.evidence,
    });
    expect(second.ok).toBe(true);
    expect(second.unchanged).toBe(true);
    expect(second.remediation.message).toContain('Bun.deepEquals');
  });

  test('isScreenshotEvidenceRecord / parseScreenshotEvidenceRecord rebrand EvidenceId', async () => {
    const { record } = await buildScreenshotEvidenceRecord(PNG_10, { subject: 'wire' });
    const wire = {
      ...record,
      evidenceId: unbrand(record.evidenceId),
    };
    expect(isScreenshotEvidenceRecord(wire)).toBe(true);
    const parsed = parseScreenshotEvidenceRecord(wire);
    expect(unbrand(parsed.evidenceId)).toBe(unbrand(record.evidenceId));
    expect(parsed.source).toEqual(record.source);

    const sidecar = {
      code: TEST_003,
      evidence: wire,
      observation: { ok: true },
    };
    const fromSidecar = parseScreenshotEvidenceRecord(sidecar);
    expect(unbrand(fromSidecar.evidenceId)).toBe(unbrand(record.evidenceId));

    expect(isScreenshotEvidenceRecord({ kind: 'ScreenshotEvidence' })).toBe(false);
    expect(() => parseScreenshotEvidenceRecord({ kind: 'nope' })).toThrow(
      /Invalid ScreenshotEvidenceRecord/
    );
  });

  test('isScreenshotEvidenceRecord rejects crop with NaN or negative extents', async () => {
    const { record } = await buildScreenshotEvidenceRecord(PNG_10, { subject: 'crop' });
    const base = {
      ...record,
      evidenceId: unbrand(record.evidenceId),
      crop: { x: 0, y: 0, w: 10, h: 10 },
    };
    expect(isScreenshotEvidenceRecord(base)).toBe(true);

    expect(isScreenshotEvidenceRecord({ ...base, crop: { x: NaN, y: 0, w: 10, h: 10 } })).toBe(
      false
    );
    expect(isScreenshotEvidenceRecord({ ...base, crop: { x: 0, y: Infinity, w: 10, h: 10 } })).toBe(
      false
    );
    expect(isScreenshotEvidenceRecord({ ...base, crop: { x: -1, y: 0, w: 10, h: 10 } })).toBe(
      false
    );
    expect(isScreenshotEvidenceRecord({ ...base, crop: { x: 0, y: 0, w: -5, h: 10 } })).toBe(
      false
    );
    expect(() =>
      parseScreenshotEvidenceRecord({ ...base, crop: { x: NaN, y: 0, w: 10, h: 10 } })
    ).toThrow(/Invalid ScreenshotEvidenceRecord/);
  });
});
