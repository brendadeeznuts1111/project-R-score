// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_IMAGE_DOCS,
  BUN_IMAGE_METADATA_DOCS,
  DEFAULT_THUMB_MAX_HEIGHT,
  DEFAULT_THUMB_MAX_WIDTH,
  extractImageEvidenceMeta,
  imageEvidenceHeaders,
  imageMetaChecksPassed,
  isImageEvidenceMeta,
  parseImageEvidenceMeta,
  resizeScreenshotPng,
  verifyImageEvidenceMeta,
} from '../lib/image-metadata.ts';
import {
  TEST_003,
  buildScreenshotEvidenceRecord,
  remediateScreenshotCapture,
  runTest003,
  type ScreenshotEvidenceRecord,
} from '../lib/screenshot-remediation.ts';

/** 10×10 PNG fixture. */
const PNG_10 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC',
  'base64',
);

describe('lib/image-metadata', () => {
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

  test('extractImageEvidenceMeta supports sha3-256', async () => {
    const meta = await extractImageEvidenceMeta(PNG_10, { algorithm: 'sha3-256' });
    expect(meta.algorithm).toBe('sha3-256');
    expect(meta.digest).toHaveLength(64);
  });

  test('extractImageEvidenceMeta rejects empty bytes', async () => {
    expect(extractImageEvidenceMeta(new Uint8Array())).rejects.toThrow(/empty/);
  });

  test('resizeScreenshotPng keeps inside default thumb bounds', async () => {
    const { bytes, meta } = await resizeScreenshotPng(PNG_10);
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
    expect(() => parseImageEvidenceMeta({ width: 10 })).toThrow(/Invalid ImageEvidenceMeta/);
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
    const { record } = await buildScreenshotEvidenceRecord(PNG_10, { subject: 'demo' });
    expect(record.testId).toBe(TEST_003);
    expect(record.subject).toBe('demo');
    expect(record.source.format).toBe('png');
    expect(record.thumbnail.format).toBe('png');

    const result = runTest003(record);
    expect(result.code).toBe(TEST_003);
    expect(result.status).toBe('pass');
    expect(result.ok).toBe(true);
    expect(result.remediation.action).toBe('accept');
  });

  test('runTest003 fails with resize_fix when thumbnail dims too large', () => {
    const record: ScreenshotEvidenceRecord = {
      kind: 'ScreenshotEvidence',
      testId: TEST_003,
      capturedAt: new Date().toISOString(),
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
    expect(result.remediation.action).toBe('resize_fix');
    expect(result.remediation.command).toContain('resize(400, 300');
  });

  test('runTest003 custom 320×240 expectations put resize(320, 240 in remediation command', () => {
    const record: ScreenshotEvidenceRecord = {
      kind: 'ScreenshotEvidence',
      testId: TEST_003,
      capturedAt: new Date().toISOString(),
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

  test('remediateScreenshotCapture returns thumbnail bytes and pass status', async () => {
    const result = await remediateScreenshotCapture(PNG_10, { team: 'man-city' });
    expect(result.status).toBe('pass');
    expect(result.ok).toBe(true);
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
});
