/**
 * TEST-003 — screenshot image-metadata evidence remediation.
 *
 * When a screenshot is captured, Bun.Image metadata becomes part of the
 * evidence chain. Failures produce a self-remediating response with the
 * failed checks and a next action.
 *
 * @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
 * @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
 * @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
 * @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
 * @see ./image-metadata.ts
 */

import { deepEquals } from './deep-equals.ts';
import {
  DEFAULT_THUMB_MAX_HEIGHT,
  DEFAULT_THUMB_MAX_WIDTH,
  extractImageEvidenceMeta,
  imageEvidenceMetaEqual,
  imageMetaChecksPassed,
  isImageEvidenceMeta,
  parseImageEvidenceMeta,
  resizeScreenshotPng,
  verifyImageEvidenceMeta,
  type ImageDigestAlgorithm,
  type ImageEvidenceMeta,
  type ImageMetaCheck,
  type ImageMetaExpectations,
} from './image-metadata.ts';
import { awaitAllSettled } from './peek-settle.ts';
import {
  bunRuntimeFingerprint,
  checkEvidenceTiming,
  mintEvidenceId,
  timedAsync,
  uuidV7Date,
  type BunRuntimeFingerprint,
  type EvidenceTimingCheck,
} from './time.ts';
import { parseEvidenceId, unbrand, type EvidenceId } from './types/branded.ts';

/** Stable remediation / claim id for screenshot metadata evidence. */
export const TEST_003 = 'TEST-003' as const;

export type ScreenshotEvidenceRecord = {
  kind: 'ScreenshotEvidence';
  testId: typeof TEST_003;
  /** ISO-8601 capture instant (wall clock). */
  capturedAt: string;
  /** Monotonic UUID v7 (timestamp-encoded) for this evidence row. */
  evidenceId: EvidenceId;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isCrop(value: unknown): value is { x: number; y: number; w: number; h: number } {
  if (!isRecord(value)) return false;
  const { x, y, w, h } = value;
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof w === 'number' &&
    typeof h === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(w) &&
    Number.isFinite(h) &&
    x >= 0 &&
    y >= 0 &&
    w >= 0 &&
    h >= 0
  );
}

/** Type guard for wire `ScreenshotEvidence` rows (rebrands `EvidenceId`). */
export function isScreenshotEvidenceRecord(value: unknown): value is ScreenshotEvidenceRecord {
  if (!isRecord(value)) return false;
  if (value.kind !== 'ScreenshotEvidence') return false;
  if (value.testId !== TEST_003) return false;
  if (typeof value.capturedAt !== 'string' || !value.capturedAt) return false;
  if (typeof value.evidenceId !== 'string' || !value.evidenceId) return false;
  try {
    parseEvidenceId(value.evidenceId);
  } catch {
    return false;
  }
  if (!isImageEvidenceMeta(value.source) || !isImageEvidenceMeta(value.thumbnail)) return false;
  if (value.subject != null && typeof value.subject !== 'string') return false;
  if (value.team != null && typeof value.team !== 'string') return false;
  if (value.crop != null && !isCrop(value.crop)) return false;
  return true;
}

/**
 * Parse wire `unknown` → {@link ScreenshotEvidenceRecord}.
 * Accepts a bare evidence row or a TEST-003 sidecar that nests `evidence`.
 */
export function parseScreenshotEvidenceRecord(value: unknown): ScreenshotEvidenceRecord {
  const candidate =
    isRecord(value) && isRecord(value.evidence) && value.evidence.kind === 'ScreenshotEvidence'
      ? value.evidence
      : value;
  if (!isScreenshotEvidenceRecord(candidate)) {
    throw new Error('Invalid ScreenshotEvidenceRecord: structural validation failed');
  }
  return {
    kind: 'ScreenshotEvidence',
    testId: TEST_003,
    capturedAt: candidate.capturedAt,
    evidenceId: parseEvidenceId(String(candidate.evidenceId)),
    subject: candidate.subject,
    team: candidate.team,
    source: parseImageEvidenceMeta(candidate.source),
    thumbnail: parseImageEvidenceMeta(candidate.thumbnail),
    crop: candidate.crop,
  };
}

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
  /** True when `previous` matched via Bun.deepEquals (source+thumbnail+crop). */
  unchanged: boolean;
  /** Wall-clock build duration via Bun.nanoseconds (ms). */
  elapsedMs: number;
  /** UUID v7 timestamp vs capturedAt coherence. */
  timing: EvidenceTimingCheck;
  /** Bun.version / Bun.revision at verify time. */
  runtime: BunRuntimeFingerprint;
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
  /** Override UUID v7 (default: Bun.randomUUIDv7 at capture time). */
  evidenceId?: EvidenceId;
  /** Digest algorithm for source + thumbnail metadata. */
  algorithm?: ImageDigestAlgorithm;
  /** Thumbnail resize bounds (default 400×300). */
  thumbMaxWidth?: number;
  thumbMaxHeight?: number;
  /** Override TEST-003 verify expectations (defaults match thumb bounds + PNG). */
  expectations?: ImageMetaExpectations;
  /**
   * Prior evidence record — when source/thumbnail/crop deepEquals the new capture,
   * remediation reports `unchanged: true` (skip re-persist noise).
   */
  previous?: ScreenshotEvidenceRecord;
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
 * Source metadata + thumbnail resize run in parallel via {@link awaitAllSettled}.
 */
export async function buildScreenshotEvidenceRecord(
  screenshotBytes: Uint8Array,
  options: BuildScreenshotEvidenceOptions = {}
): Promise<{
  record: ScreenshotEvidenceRecord;
  thumbnailBytes: Uint8Array;
  elapsedMs: number;
}> {
  const subject = options.subject ?? options.team;
  const algorithm = options.algorithm;
  const thumbMaxWidth = options.thumbMaxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const thumbMaxHeight = options.thumbMaxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  // Prefer mint-then-derive so capturedAt matches UUID v7 ms (avoids skew from
  // ISO round-trip). When only capturedAt is set, mint with that stamp (Bun may
  // clamp upward if a later watermark already exists in-process).
  let evidenceId: EvidenceId;
  let capturedAt: string;
  if (options.evidenceId !== undefined) {
    evidenceId = options.evidenceId;
    capturedAt = options.capturedAt ?? uuidV7Date(unbrand(evidenceId)).toISOString();
  } else if (options.capturedAt !== undefined) {
    capturedAt = options.capturedAt;
    evidenceId = mintEvidenceId(new Date(capturedAt));
  } else {
    evidenceId = mintEvidenceId();
    capturedAt = uuidV7Date(unbrand(evidenceId)).toISOString();
  }

  const {
    value: [source, resized],
    elapsedMs,
  } = await timedAsync(() =>
    awaitAllSettled([
      extractImageEvidenceMeta(screenshotBytes, { algorithm }),
      resizeScreenshotPng(screenshotBytes, {
        algorithm,
        width: thumbMaxWidth,
        height: thumbMaxHeight,
      }),
    ] as const)
  );

  const record: ScreenshotEvidenceRecord = {
    kind: 'ScreenshotEvidence',
    testId: TEST_003,
    capturedAt,
    evidenceId,
    subject,
    team: options.team ?? subject,
    source,
    thumbnail: resized.meta,
    crop: options.crop,
  };

  return { record, thumbnailBytes: resized.bytes, elapsedMs };
}

/**
 * True when two evidence records match on source+thumbnail metas (Bun.deepEquals).
 * Ignores `capturedAt` / `evidenceId` / `subject` / `team` so recapture noise does not force writes.
 */
export function screenshotEvidenceEqual(
  a: ScreenshotEvidenceRecord,
  b: ScreenshotEvidenceRecord
): boolean {
  return (
    a.kind === b.kind &&
    a.testId === b.testId &&
    imageEvidenceMetaEqual(a.source, b.source) &&
    imageEvidenceMetaEqual(a.thumbnail, b.thumbnail) &&
    deepEquals(a.crop, b.crop, true)
  );
}

/**
 * Run TEST-003 verification against an evidence record (thumbnail bounds/format).
 * Also gates UUID v7 timestamp vs `capturedAt` coherence via {@link checkEvidenceTiming}.
 */
export function runTest003(
  record: ScreenshotEvidenceRecord,
  expectations?: ImageMetaExpectations,
  options: { unchanged?: boolean; elapsedMs?: number } = {}
): Test003Response {
  const maxW = expectations?.maxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const maxH = expectations?.maxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  const resolved = expectations ?? defaultExpectations(maxW, maxH);
  const checks = verifyImageEvidenceMeta(record.thumbnail, resolved);
  const timing = checkEvidenceTiming(record.capturedAt, record.evidenceId);
  const imageOk = imageMetaChecksPassed(checks);
  const ok = imageOk && timing.ok;
  const status = ok ? 'pass' : 'fail';
  const failed = checks.filter(c => !c.ok);
  const cmd = resizeCommand(maxW, maxH);
  const unchanged = options.unchanged === true;
  const elapsedMs = options.elapsedMs ?? 0;
  const runtime = bunRuntimeFingerprint();

  let remediation: Test003Remediation;
  if (ok && unchanged) {
    remediation = {
      action: 'accept',
      message: `Unchanged screenshot evidence (Bun.deepEquals on source+thumbnail) — within TEST-003 bounds (≤${maxW}×${maxH} PNG); ${timing.message}.`,
    };
  } else if (ok) {
    remediation = {
      action: 'accept',
      message: `Screenshot thumbnail metadata within TEST-003 bounds (≤${maxW}×${maxH} PNG); ${timing.message}.`,
    };
  } else if (!timing.ok && imageOk) {
    remediation = {
      action: 'reject',
      message: `Evidence timing failed: ${timing.message}. Remint with mintEvidenceId(new Date(capturedAt)).`,
      command: 'import { mintEvidenceId } from "../lib/time.ts"',
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
    unchanged,
    elapsedMs,
    timing,
    runtime,
    checks,
    evidence: record,
    remediation,
  };
}

/**
 * End-to-end: build evidence from screenshot bytes and return TEST-003 response.
 * Pass `previous` to detect unchanged captures via Bun.deepEquals.
 */
export async function remediateScreenshotCapture(
  screenshotBytes: Uint8Array,
  options: BuildScreenshotEvidenceOptions = {}
): Promise<Test003Response & { thumbnailBytes: Uint8Array }> {
  const thumbMaxWidth = options.thumbMaxWidth ?? DEFAULT_THUMB_MAX_WIDTH;
  const thumbMaxHeight = options.thumbMaxHeight ?? DEFAULT_THUMB_MAX_HEIGHT;
  const { record, thumbnailBytes, elapsedMs } = await buildScreenshotEvidenceRecord(
    screenshotBytes,
    options
  );
  const expectations = options.expectations ?? defaultExpectations(thumbMaxWidth, thumbMaxHeight);
  const unchanged = Boolean(options.previous && screenshotEvidenceEqual(record, options.previous));
  const result = runTest003(record, expectations, { unchanged, elapsedMs });
  return { ...result, thumbnailBytes };
}
