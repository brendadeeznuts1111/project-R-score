// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { unbrand } from '../lib/types/branded.ts';
import {
  BUN_NANOSECONDS_DOCS,
  BUN_RANDOM_UUID_V7_DOCS,
  BUN_REVISION_DOCS,
  BUN_SLEEP_DOCS,
  BUN_SLEEP_SYNC_DOCS,
  BUN_TIMEZONE_DOCS,
  BUN_VERSION_DOCS,
  bunRuntimeFingerprint,
  checkEvidenceTiming,
  deadlineFromNow,
  elapsedMs,
  elapsedNs,
  isUuidV7,
  mintEvidenceId,
  mintEvidenceIdAt,
  nanoseconds,
  randomUUIDv7,
  sleep,
  timedAsync,
  timedSync,
  uuidV7Date,
  uuidV7TimestampMs,
  uuidV7WithTimestamp,
} from '../lib/time.ts';

describe('lib/time (Bun utils date/time/number tokens)', () => {
  test('canonical docs URLs point at runtime/utils anchors', () => {
    expect(BUN_NANOSECONDS_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-nanoseconds');
    expect(BUN_SLEEP_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-sleep');
    expect(BUN_SLEEP_SYNC_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-sleepsync');
    expect(BUN_RANDOM_UUID_V7_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-randomuuidv7');
    expect(BUN_VERSION_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-version');
    expect(BUN_REVISION_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-revision');
    expect(BUN_TIMEZONE_DOCS).toBe('https://bun.com/docs/guides/runtime/timezone');
  });

  test('nanoseconds / elapsedMs / elapsedNs are numbers that advance', async () => {
    const start = nanoseconds();
    expect(typeof start).toBe('number');
    expect(start).toBeGreaterThan(0);
    await sleep(2);
    expect(elapsedNs(start)).toBeGreaterThan(0);
    expect(elapsedMs(start)).toBeGreaterThan(0);
  });

  test('sleep accepts Date deadline via deadlineFromNow', async () => {
    const start = nanoseconds();
    await sleep(deadlineFromNow(3));
    expect(elapsedMs(start)).toBeGreaterThanOrEqual(2);
  });

  test('randomUUIDv7 is version-7 and embeds a future timestamp', () => {
    // Use a future stamp so Bun's process-wide monotonic watermark cannot clamp it.
    const at = Date.now() + 60_000;
    const a = randomUUIDv7();
    const b = randomUUIDv7(at);
    const c = randomUUIDv7(new Date(at + 1));
    expect(isUuidV7(a)).toBe(true);
    expect(isUuidV7(b)).toBe(true);
    expect(isUuidV7(c)).toBe(true);
    expect(uuidV7TimestampMs(b)).toBe(at);
    expect(uuidV7TimestampMs(c)).toBe(at + 1);
    expect(uuidV7Date(b).getTime()).toBe(at);
  });

  test('randomUUIDv7 buffer encoding returns 16 bytes', () => {
    const buf = randomUUIDv7('buffer');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBe(16);
  });

  test('uuidV7WithTimestamp / mintEvidenceIdAt ignore monotonic clamp', () => {
    const past = Date.parse('2020-01-01T00:00:00.000Z');
    const id = uuidV7WithTimestamp(past);
    expect(isUuidV7(id)).toBe(true);
    expect(uuidV7TimestampMs(id)).toBe(past);
    const branded = mintEvidenceIdAt(past);
    expect(uuidV7TimestampMs(unbrand(branded))).toBe(past);
  });

  test('mintEvidenceId brands UUID v7; checkEvidenceTiming passes for matching capturedAt', () => {
    const at = Date.now() + 120_000;
    const id = mintEvidenceId(at);
    expect(isUuidV7(unbrand(id))).toBe(true);
    const timing = checkEvidenceTiming(new Date(at).toISOString(), id);
    expect(timing.ok).toBe(true);
    expect(timing.skewMs).toBe(0);
  });

  test('checkEvidenceTiming fails when UUID timestamp drifts', () => {
    const id = mintEvidenceIdAt(new Date('2026-01-01T00:00:00.000Z'));
    const timing = checkEvidenceTiming('2026-07-22T00:00:00.000Z', id, 1_000);
    expect(timing.ok).toBe(false);
    expect(timing.skewMs).toBeGreaterThan(1_000);
  });

  test('bunRuntimeFingerprint exposes Bun.version / Bun.revision', () => {
    const fp = bunRuntimeFingerprint();
    expect(fp.version).toBe(Bun.version);
    expect(fp.revision).toBe(Bun.revision);
    expect(fp.version.length).toBeGreaterThan(0);
    expect(fp.revision.length).toBeGreaterThan(0);
  });

  test('timedAsync / timedSync report elapsed via Bun.nanoseconds', async () => {
    const asyncTimed = await timedAsync(async () => {
      await sleep(2);
      return 42;
    });
    expect(asyncTimed.value).toBe(42);
    expect(asyncTimed.elapsedNs).toBeGreaterThan(0);

    const syncTimed = timedSync(() => 7);
    expect(syncTimed.value).toBe(7);
    expect(syncTimed.elapsedNs).toBeGreaterThanOrEqual(0);
  });
});
