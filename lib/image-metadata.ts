/**
 * Bun.Image metadata helpers for screenshot / evidence pipelines.
 *
 * Prefer this over ad-hoc `new Bun.Image(…).metadata()` so docs anchors stay annotated.
 *
 * @see https://bun.com/docs/runtime/image#input — Bun.Image
 * @see https://bun.com/docs/runtime/image#metadata — metadata()
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 * @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals (via imageEvidenceMetaEqual)
 * @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek (via awaitSettled)
 */

import { deepEquals } from './deep-equals.ts';
import { bunDocs } from './docs/bun-site-url.ts';
import { awaitSettled } from './peek-settle.ts';

/** Canonical docs locus for Bun.Image input. */
export const BUN_IMAGE_DOCS = bunDocs('runtime/image', 'input');

/** Metadata subsection. */
export const BUN_IMAGE_METADATA_DOCS = bunDocs('runtime/image', 'metadata');

export const DEFAULT_THUMB_MAX_WIDTH = 400;
export const DEFAULT_THUMB_MAX_HEIGHT = 300;

/** Digest algorithms supported for image evidence payloads. */
export type ImageDigestAlgorithm = 'sha256' | 'sha3-256';

export const DEFAULT_IMAGE_DIGEST_ALGORITHM: ImageDigestAlgorithm = 'sha256';

/** Wire shape for image evidence (dimensions, format, byte length, digest). */
export type ImageEvidenceMeta = {
  width: number;
  height: number;
  format: string;
  /** Encoded byte length of the image payload. */
  size: number;
  algorithm: ImageDigestAlgorithm;
  digest: string;
};

export type ExtractImageMetaOptions = {
  /** Content digest algorithm (default sha256; use sha3-256 for audit SSOT parity). */
  algorithm?: ImageDigestAlgorithm;
};

export type ImageMetaExpectations = {
  /** Allowed formats (lowercase), e.g. `["jpeg", "jpg", "png"]`. */
  formats?: readonly string[];
  /** Max width after resize (inclusive). */
  maxWidth?: number;
  /** Max height after resize (inclusive). */
  maxHeight?: number;
  /** Minimum encoded size in bytes. */
  minSize?: number;
  /** Exact digest when verifying a known fixture. */
  digest?: string;
};

export const IMAGE_META_CHECK_IDS = ['format', 'dimensions', 'size', 'digest'] as const;
export type ImageMetaCheckId = (typeof IMAGE_META_CHECK_IDS)[number];

export type ImageMetaCheck = {
  id: ImageMetaCheckId;
  ok: boolean;
  expected?: string;
  actual?: string;
  message: string;
};

export type ResizeScreenshotOptions = {
  width?: number;
  height?: number;
  algorithm?: ImageDigestAlgorithm;
};

const DIGEST_ALGORITHMS = new Set<ImageDigestAlgorithm>(['sha256', 'sha3-256']);

function toUint8(bytes: Uint8Array | Buffer | ArrayBuffer): Uint8Array {
  return bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Type guard for {@link ImageEvidenceMeta} wire payloads. */
export function isImageEvidenceMeta(value: unknown): value is ImageEvidenceMeta {
  if (!isRecord(value)) return false;
  if (typeof value.width !== 'number' || !(value.width > 0)) return false;
  if (typeof value.height !== 'number' || !(value.height > 0)) return false;
  if (typeof value.format !== 'string' || !value.format) return false;
  if (typeof value.size !== 'number' || !(value.size > 0)) return false;
  if (typeof value.digest !== 'string' || value.digest.length < 32) return false;
  if (
    typeof value.algorithm !== 'string' ||
    !DIGEST_ALGORITHMS.has(value.algorithm as ImageDigestAlgorithm)
  ) {
    return false;
  }
  return true;
}

/** Parse wire `unknown` → {@link ImageEvidenceMeta} or throw. */
export function parseImageEvidenceMeta(value: unknown): ImageEvidenceMeta {
  if (!isImageEvidenceMeta(value)) {
    throw new Error('Invalid ImageEvidenceMeta: structural validation failed');
  }
  return value;
}

/**
 * Read Bun.Image metadata for `bytes` and attach size + content digest.
 */
export async function extractImageEvidenceMeta(
  bytes: Uint8Array | Buffer | ArrayBuffer,
  options: ExtractImageMetaOptions = {}
): Promise<ImageEvidenceMeta> {
  const buf = toUint8(bytes);
  if (buf.byteLength === 0) {
    throw new Error('extractImageEvidenceMeta: empty image bytes');
  }

  const algorithm = options.algorithm ?? DEFAULT_IMAGE_DIGEST_ALGORITHM;
  const img = new Bun.Image(buf);
  const meta = await awaitSettled(img.metadata());
  if (!(meta.width > 0) || !(meta.height > 0)) {
    throw new Error(
      `extractImageEvidenceMeta: invalid dimensions ${meta.width}×${meta.height} (format=${meta.format})`
    );
  }

  const hasher = new Bun.CryptoHasher(algorithm);
  hasher.update(buf);
  return {
    width: meta.width,
    height: meta.height,
    format: String(meta.format),
    size: buf.byteLength,
    algorithm,
    digest: hasher.digest('hex') as string,
  };
}

/**
 * Resize screenshot to evidence thumbnail (400×300 inside) and return PNG bytes + metadata.
 * Matches `new Bun.Image(screenshot).resize(400, 300).png()`.
 */
export async function resizeScreenshotPng(
  screenshot: Uint8Array | Buffer,
  opts: ResizeScreenshotOptions = {}
): Promise<{ bytes: Uint8Array; meta: ImageEvidenceMeta }> {
  const width = opts.width ?? DEFAULT_THUMB_MAX_WIDTH;
  const height = opts.height ?? DEFAULT_THUMB_MAX_HEIGHT;
  const bytes = await awaitSettled(
    new Bun.Image(screenshot)
      .resize(width, height, { fit: 'inside', filter: 'mitchell', withoutEnlargement: true })
      .png()
      .bytes()
  );
  const meta = await extractImageEvidenceMeta(bytes, { algorithm: opts.algorithm });
  return { bytes, meta };
}

/**
 * True when two evidence metas are structurally equal (Bun.deepEquals, strict).
 * Prefer this over ad-hoc field compares when skipping re-encode / re-verify.
 */
export function imageEvidenceMetaEqual(
  a: ImageEvidenceMeta,
  b: ImageEvidenceMeta,
  strict = true
): boolean {
  return deepEquals(a, b, strict);
}

/** Alias for {@link imageEvidenceMetaEqual} with strict=true. */
export function sameImageEvidence(a: ImageEvidenceMeta, b: ImageEvidenceMeta): boolean {
  return imageEvidenceMetaEqual(a, b, true);
}

/** True when every check passed. */
export function imageMetaChecksPassed(checks: readonly ImageMetaCheck[]): boolean {
  return checks.length > 0 && checks.every(c => c.ok);
}

/**
 * Verify image evidence against size/format expectations (evidence chain gate).
 */
export function verifyImageEvidenceMeta(
  meta: ImageEvidenceMeta,
  expectations: ImageMetaExpectations = {}
): ImageMetaCheck[] {
  const formats = expectations.formats ?? ['png', 'jpeg', 'jpg', 'webp'];
  const maxWidth = expectations.maxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const maxHeight = expectations.maxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  const minSize = expectations.minSize ?? 1;

  const formatOk = formats.map(f => f.toLowerCase()).includes(meta.format.toLowerCase());
  const dimOk =
    meta.width > 0 && meta.height > 0 && meta.width <= maxWidth && meta.height <= maxHeight;
  const sizeOk = meta.size >= minSize;
  const digestOk = expectations.digest ? meta.digest === expectations.digest : true;

  const checks: ImageMetaCheck[] = [
    {
      id: 'format',
      ok: formatOk,
      expected: formats.join('|'),
      actual: meta.format,
      message: formatOk
        ? `format ${meta.format} allowed`
        : `format ${meta.format} not in ${formats.join('|')}`,
    },
    {
      id: 'dimensions',
      ok: dimOk,
      expected: `1..${maxWidth}×1..${maxHeight}`,
      actual: `${meta.width}×${meta.height}`,
      message: dimOk
        ? `dimensions ${meta.width}×${meta.height} within bounds`
        : `dimensions ${meta.width}×${meta.height} outside 1..${maxWidth}×1..${maxHeight}`,
    },
    {
      id: 'size',
      ok: sizeOk,
      expected: `>=${minSize}`,
      actual: String(meta.size),
      message: sizeOk ? `size ${meta.size}B` : `size ${meta.size}B below min ${minSize}`,
    },
    {
      id: 'digest',
      ok: digestOk,
      expected: expectations.digest,
      actual: meta.digest,
      message: digestOk ? 'digest ok' : 'digest mismatch',
    },
  ];
  return checks;
}

export function imageEvidenceHeaders(meta: ImageEvidenceMeta): Record<string, string> {
  return {
    'X-Image-Width': String(meta.width),
    'X-Image-Height': String(meta.height),
    'X-Image-Format': meta.format,
    'X-Image-Size': String(meta.size),
    'X-Image-Digest': `${meta.algorithm}:${meta.digest}`,
  };
}
