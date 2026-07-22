/**
 * TEST-003 — screenshot image-metadata evidence remediation.
 *
 * When a screenshot is captured, Bun.Image metadata becomes part of the
 * evidence chain. Failures produce a self-remediating response with the
 * failed checks and a next action.
 *
 * @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
 * @see ./image-metadata.ts
 */

import {
  DEFAULT_THUMB_MAX_HEIGHT,
  DEFAULT_THUMB_MAX_WIDTH,
  extractImageEvidenceMeta,
  imageMetaChecksPassed,
  resizeScreenshotPng,
  verifyImageEvidenceMeta,
  type ImageDigestAlgorithm,
  type ImageEvidenceMeta,
  type ImageMetaCheck,
  type ImageMetaExpectations,
} from './image-metadata.ts';

/** Stable remediation / claim id for screenshot metadata evidence. */
export const TEST_003 = 'TEST-003' as const;

export type ScreenshotEvidenceRecord = {
  kind: 'ScreenshotEvidence';
  testId: typeof TEST_003;
  capturedAt: string;
  /** Optional subject label (team, site, market slug, …). */
  subject?: string;
  /** @deprecated prefer `subject` — kept for sports-terminal wire compatibility */
  team?: string;
  /** Metadata for the raw WebView screenshot. */
  source: ImageEvidenceMeta;
  /** Metadata for the resized evidence image (≤ thumb max PNG). */
  thumbnail: ImageEvidenceMeta;
  crop?: { x: number; y: number; w: number; h: number };
};

export type Test003Remediation = {
  action: 'accept' | 'recapture' | 'resize_fix' | 'reject';
  message: string;
  command?: string;
};

export type Test003Response = {
  code: typeof TEST_003;
  title: string;
  status: 'pass' | 'fail';
  ok: boolean;
  checks: ImageMetaCheck[];
  evidence: ScreenshotEvidenceRecord;
  remediation: Test003Remediation;
};

export type BuildScreenshotEvidenceOptions = {
  subject?: string;
  /** Alias for `subject` (sports-terminal team key). */
  team?: string;
  crop?: { x: number; y: number; w: number; h: number };
  capturedAt?: string;
  /** Digest algorithm for source + thumbnail metadata. */
  algorithm?: ImageDigestAlgorithm;
  /** Thumbnail resize bounds (default 400×300). */
  thumbMaxWidth?: number;
  thumbMaxHeight?: number;
  /** Override TEST-003 verify expectations (defaults match thumb bounds + PNG). */
  expectations?: ImageMetaExpectations;
};

function defaultExpectations(thumbMaxWidth: number, thumbMaxHeight: number): ImageMetaExpectations {
  return {
    formats: ['png'],
    maxWidth: thumbMaxWidth,
    maxHeight: thumbMaxHeight,
    minSize: 32,
  };
}

function resizeCommand(thumbMaxWidth: number, thumbMaxHeight: number): string {
  return `new Bun.Image(screenshot).resize(${thumbMaxWidth}, ${thumbMaxHeight}, { fit: "inside", withoutEnlargement: true }).png()`;
}

/**
 * Build a screenshot evidence record from raw capture bytes.
 * Computes Bun.Image metadata for source + resized PNG thumbnail.
 */
export async function buildScreenshotEvidenceRecord(
  screenshotBytes: Uint8Array | Buffer,
  options: BuildScreenshotEvidenceOptions = {}
): Promise<{ record: ScreenshotEvidenceRecord; thumbnailBytes: Uint8Array }> {
  const subject = options.subject ?? options.team;
  const algorithm = options.algorithm;
  const thumbMaxWidth = options.thumbMaxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const thumbMaxHeight = options.thumbMaxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  const source = await extractImageEvidenceMeta(screenshotBytes, { algorithm });
  const { bytes: thumbnailBytes, meta: thumbnail } = await resizeScreenshotPng(screenshotBytes, {
    algorithm,
    width: thumbMaxWidth,
    height: thumbMaxHeight,
  });

  const record: ScreenshotEvidenceRecord = {
    kind: 'ScreenshotEvidence',
    testId: TEST_003,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    subject,
    team: options.team ?? subject,
    source,
    thumbnail,
    crop: options.crop,
  };

  return { record, thumbnailBytes };
}

/**
 * Run TEST-003 verification against an evidence record (thumbnail bounds/format).
 */
export function runTest003(
  record: ScreenshotEvidenceRecord,
  expectations?: ImageMetaExpectations
): Test003Response {
  const maxW = expectations?.maxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const maxH = expectations?.maxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  const resolved = expectations ?? defaultExpectations(maxW, maxH);
  const checks = verifyImageEvidenceMeta(record.thumbnail, resolved);
  const ok = imageMetaChecksPassed(checks);
  const status = ok ? 'pass' : 'fail';
  const failed = checks.filter(c => !c.ok);
  const cmd = resizeCommand(maxW, maxH);

  let remediation: Test003Remediation;
  if (ok) {
    remediation = {
      action: 'accept',
      message: `Screenshot thumbnail metadata within TEST-003 bounds (≤${maxW}×${maxH} PNG).`,
    };
  } else if (failed.some(c => c.id === 'dimensions')) {
    remediation = {
      action: 'resize_fix',
      message: `Thumbnail dimensions out of bounds (${record.thumbnail.width}×${record.thumbnail.height}). Re-encode with resize(${maxW}, ${maxH}, { fit: "inside", withoutEnlargement: true }).`,
      command: cmd,
    };
  } else if (failed.some(c => c.id === 'format')) {
    remediation = {
      action: 'recapture',
      message: `Expected PNG evidence, got ${record.thumbnail.format}. Re-run capture through .png() encode.`,
      command: `await ${cmd}.bytes()`,
    };
  } else {
    remediation = {
      action: 'reject',
      message: failed.map(c => c.message).join('; '),
      command: 'bun tools/bun-doc-refs.ts suggest "Bun.Image"',
    };
  }

  return {
    code: TEST_003,
    title: 'Screenshot image metadata evidence',
    status,
    ok,
    checks,
    evidence: record,
    remediation,
  };
}

/**
 * End-to-end: build evidence from screenshot bytes and return TEST-003 response.
 */
export async function remediateScreenshotCapture(
  screenshotBytes: Uint8Array | Buffer,
  options: BuildScreenshotEvidenceOptions = {}
): Promise<Test003Response & { thumbnailBytes: Uint8Array }> {
  const thumbMaxWidth = options.thumbMaxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const thumbMaxHeight = options.thumbMaxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  const { record, thumbnailBytes } = await buildScreenshotEvidenceRecord(screenshotBytes, options);
  const expectations = options.expectations ?? defaultExpectations(thumbMaxWidth, thumbMaxHeight);
  const result = runTest003(record, expectations);
  return { ...result, thumbnailBytes };
}
