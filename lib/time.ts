/**
 * Bun utils — date / time / high-res number helpers.
 *
 * Tokens from [runtime/utils](https://bun.com/docs/runtime/utils):
 * - {@link Bun.nanoseconds} — ns since process start (`number`)
 * - {@link Bun.sleep} / {@link Bun.sleepSync} — ms or `Date` deadline
 * - {@link Bun.randomUUIDv7} — monotonic UUID with embedded timestamp
 * - {@link Bun.version} / {@link Bun.revision} — runtime fingerprint strings
 *
 * Related guide: [timezone](https://bun.com/docs/guides/runtime/timezone) (`Bun.env.TZ`).
 *
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
 * @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
 * @see https://bun.com/docs/runtime/utils#bun-sleepsync — Bun.sleepSync
 * @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
 * @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
 * @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
 * @see https://bun.com/docs/guides/runtime/timezone — TZ
 */

import { bunDocs } from './docs/bun-site-url.ts';
import { asEvidenceId, unbrand, type EvidenceId } from './types/branded.ts';

export const BUN_NANOSECONDS_DOCS = bunDocs('runtime/utils', 'bun-nanoseconds');
export const BUN_SLEEP_DOCS = bunDocs('runtime/utils', 'bun-sleep');
export const BUN_SLEEP_SYNC_DOCS = bunDocs('runtime/utils', 'bun-sleepsync');
export const BUN_RANDOM_UUID_V7_DOCS = bunDocs('runtime/utils', 'bun-randomuuidv7');
export const BUN_VERSION_DOCS = bunDocs('runtime/utils', 'bun-version');
export const BUN_REVISION_DOCS = bunDocs('runtime/utils', 'bun-revision');
/** Guide — set process timezone via `Bun.env.TZ`. */
export const BUN_TIMEZONE_DOCS = 'https://bun.com/docs/guides/runtime/timezone';

const NS_PER_MS = 1_000_000;
const UUID_V7_HEX_RE = /^[0-9a-f]{12}7[0-9a-f]{3}[89ab][0-9a-f]{15}$/;

/** High-resolution monotonic clock: nanoseconds since process start. */
export function nanoseconds(): number {
  return Bun.nanoseconds();
}

/** Elapsed milliseconds since a {@link nanoseconds} mark. */
export function elapsedMs(startNs: number): number {
  return (Bun.nanoseconds() - startNs) / NS_PER_MS;
}

/** Elapsed nanoseconds since a {@link nanoseconds} mark. */
export function elapsedNs(startNs: number): number {
  return Bun.nanoseconds() - startNs;
}

/** `Date` deadline `ms` from now (for `Bun.sleep(date)`). */
export function deadlineFromNow(ms: number): Date {
  return new Date(Date.now() + ms);
}

/**
 * Async sleep — milliseconds, or until a {@link Date} deadline
 * (`Bun.sleep(date)` on the utils page).
 */
export function sleep(msOrDate: number | Date): Promise<void> {
  return Bun.sleep(msOrDate);
}

/** Blocking sleep (milliseconds). Prefer {@link sleep} off the hot path. */
export function sleepSync(ms: number): void {
  Bun.sleepSync(ms);
}

export type RandomUuidV7Encoding = 'hex' | 'base64' | 'base64url' | 'buffer';

/**
 * Monotonic UUID v7. Optional timestamp (`number` ms or `Date`) embeds that
 * instant; default uses `Date.now()` with Bun's monotonic counter.
 */
export function randomUUIDv7(timestamp?: number | Date): string;
export function randomUUIDv7(
  encoding: Exclude<RandomUuidV7Encoding, 'buffer'>,
  timestamp?: number | Date,
): string;
export function randomUUIDv7(encoding: 'buffer', timestamp?: number | Date): Buffer;
export function randomUUIDv7(
  encodingOrTs?: RandomUuidV7Encoding | number | Date,
  timestamp?: number | Date,
): string | Buffer {
  const toMs = (t: number | Date | undefined): number | undefined => {
    if (t === undefined) return undefined;
    return t instanceof Date ? t.getTime() : t;
  };

  if (encodingOrTs === undefined) return Bun.randomUUIDv7();
  // Always pass encoding when a timestamp is set — Bun's first-arg overload is encoding.
  if (typeof encodingOrTs === 'number' || encodingOrTs instanceof Date) {
    return Bun.randomUUIDv7('hex', toMs(encodingOrTs));
  }
  if (encodingOrTs === 'buffer') {
    return Bun.randomUUIDv7('buffer', toMs(timestamp));
  }
  return Bun.randomUUIDv7(encodingOrTs, toMs(timestamp));
}

/** True when `id` is a canonical UUID v7 hex string (with or without dashes). */
export function isUuidV7(id: string): boolean {
  const hex = id.replace(/-/g, '').toLowerCase();
  return hex.length === 32 && UUID_V7_HEX_RE.test(hex);
}

/**
 * Unix timestamp (ms) encoded in a UUID v7 (top 48 bits).
 * @see https://bun.com/docs/runtime/utils#bun-randomuuidv7
 */
export function uuidV7TimestampMs(id: string): number {
  const hex = id.replace(/-/g, '').toLowerCase();
  if (!isUuidV7(hex) && !isUuidV7(id)) {
    throw new Error(`uuidV7TimestampMs: not a UUID v7 (${id})`);
  }
  const normalized = hex.length === 32 ? hex : id.replace(/-/g, '').toLowerCase();
  return Number(BigInt(`0x${normalized.slice(0, 12)}`));
}

/** {@link uuidV7TimestampMs} as a `Date`. */
export function uuidV7Date(id: string): Date {
  return new Date(uuidV7TimestampMs(id));
}

/**
 * Build a UUID v7 string with an exact Unix-ms timestamp by splicing into a
 * Bun-generated v7 (entropy + variant preserved). Use when tests or wire
 * fixtures need a timestamp that must not follow process-wide monotonic clamp
 * from {@link Bun.randomUUIDv7}.
 */
export function uuidV7WithTimestamp(ms: number | Date): string {
  const t = ms instanceof Date ? ms.getTime() : ms;
  if (!Number.isFinite(t) || t < 0 || t > Number(0xffffffffffffn)) {
    throw new Error(`uuidV7WithTimestamp: ms out of 48-bit range (${ms})`);
  }
  const base = Bun.randomUUIDv7().replace(/-/g, '').toLowerCase();
  const time = Math.floor(t).toString(16).padStart(12, '0');
  const hex = time + base.slice(12);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Mint a branded {@link EvidenceId} via {@link Bun.randomUUIDv7}.
 * Optional timestamp is best-effort: Bun keeps a process-wide monotonic watermark,
 * so a stamp older than a prior mint may be clamped upward (timing skew).
 * For exact historical stamps (fixtures), use {@link uuidV7WithTimestamp} + {@link asEvidenceId}.
 */
export function mintEvidenceId(at?: number | Date): EvidenceId {
  return asEvidenceId(randomUUIDv7(at));
}

/** Exact-timestamp evidence id (no monotonic clamp on the embedded ms). */
export function mintEvidenceIdAt(at: number | Date): EvidenceId {
  return asEvidenceId(uuidV7WithTimestamp(at));
}

export type EvidenceTimingCheck = {
  ok: boolean;
  capturedAtMs: number;
  evidenceIdMs: number;
  skewMs: number;
  maxSkewMs: number;
  message: string;
};

/** Default skew tolerance when UUID v7 was minted from `capturedAt`. */
export const DEFAULT_EVIDENCE_TIMING_SKEW_MS = 2_000;

/**
 * Coherence: UUID v7 timestamp vs ISO `capturedAt` within `maxSkewMs`.
 * Pass the branded id or raw UUID string.
 */
export function checkEvidenceTiming(
  capturedAt: string,
  evidenceId: EvidenceId | string,
  maxSkewMs = DEFAULT_EVIDENCE_TIMING_SKEW_MS,
): EvidenceTimingCheck {
  const capturedAtMs = Date.parse(capturedAt);
  if (!Number.isFinite(capturedAtMs)) {
    return {
      ok: false,
      capturedAtMs: NaN,
      evidenceIdMs: NaN,
      skewMs: NaN,
      maxSkewMs,
      message: `invalid capturedAt ISO: ${capturedAt}`,
    };
  }
  const raw = typeof evidenceId === 'string' ? evidenceId : unbrand(evidenceId);
  let evidenceIdMs: number;
  try {
    evidenceIdMs = uuidV7TimestampMs(raw);
  } catch (err) {
    return {
      ok: false,
      capturedAtMs,
      evidenceIdMs: NaN,
      skewMs: NaN,
      maxSkewMs,
      message: err instanceof Error ? err.message : String(err),
    };
  }
  const skewMs = Math.abs(evidenceIdMs - capturedAtMs);
  const ok = skewMs <= maxSkewMs;
  return {
    ok,
    capturedAtMs,
    evidenceIdMs,
    skewMs,
    maxSkewMs,
    message: ok
      ? `evidenceId timestamp within ${maxSkewMs}ms of capturedAt (skew=${skewMs}ms)`
      : `evidenceId timestamp skew ${skewMs}ms exceeds ${maxSkewMs}ms (capturedAt=${capturedAtMs}, uuid=${evidenceIdMs})`,
  };
}

/** Runtime fingerprint from utils page (`Bun.version` / `Bun.revision`). */
export type BunRuntimeFingerprint = {
  version: string;
  revision: string;
};

export function bunRuntimeFingerprint(): BunRuntimeFingerprint {
  return {
    version: Bun.version,
    revision: Bun.revision,
  };
}

/** Current timezone id from `Bun.env.TZ` (unset → empty / platform default). */
export function timezoneId(): string {
  return Bun.env.TZ ?? '';
}

/** Time an async function with {@link Bun.nanoseconds}. */
export async function timedAsync<T>(
  fn: () => Promise<T> | T,
): Promise<{ value: T; elapsedMs: number; elapsedNs: number }> {
  const start = Bun.nanoseconds();
  const value = await fn();
  const end = Bun.nanoseconds();
  return {
    value,
    elapsedNs: end - start,
    elapsedMs: (end - start) / NS_PER_MS,
  };
}

/** Time a sync function with {@link Bun.nanoseconds}. */
export function timedSync<T>(fn: () => T): { value: T; elapsedMs: number; elapsedNs: number } {
  const start = Bun.nanoseconds();
  const value = fn();
  const end = Bun.nanoseconds();
  return {
    value,
    elapsedNs: end - start,
    elapsedMs: (end - start) / NS_PER_MS,
  };
}
