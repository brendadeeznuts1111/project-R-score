// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_NANOSECONDS_DOCS,
  BUN_RANDOM_UUID_V7_DOCS,
  BUN_SLEEP_DOCS,
  BUN_SLEEP_SYNC_DOCS,
  elapsedMs,
  elapsedNs,
  nanoseconds,
  randomUUIDv7,
  sleep,
  timedAsync,
} from '../lib/time.ts';

describe('lib/time (Bun utils date/time/number tokens)', () => {
  test('canonical docs URLs point at runtime/utils anchors', () => {
    expect(BUN_NANOSECONDS_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-nanoseconds');
    expect(BUN_SLEEP_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-sleep');
    expect(BUN_SLEEP_SYNC_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-sleepsync');
    expect(BUN_RANDOM_UUID_V7_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-randomuuidv7');
  });

  test('nanoseconds / elapsedMs / elapsedNs are numbers that advance', async () => {
    const start = nanoseconds();
    expect(typeof start).toBe('number');
    expect(start).toBeGreaterThan(0);
    await sleep(2);
    expect(elapsedNs(start)).toBeGreaterThan(0);
    expect(elapsedMs(start)).toBeGreaterThan(0);
  });

  test('sleep accepts Date deadline', async () => {
    const start = nanoseconds();
    await sleep(new Date(Date.now() + 3));
    expect(elapsedMs(start)).toBeGreaterThanOrEqual(2);
  });

  test('randomUUIDv7 is version-7 and accepts Date / number timestamp', () => {
    const a = randomUUIDv7();
    const at = Date.now();
    const b = randomUUIDv7(at);
    const c = randomUUIDv7(new Date(at));
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(a).toMatch(re);
    expect(b).toMatch(re);
    expect(c).toMatch(re);
  });

  test('randomUUIDv7 buffer encoding returns 16 bytes', () => {
    const buf = randomUUIDv7('buffer');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBe(16);
  });

  test('timedAsync reports elapsed via Bun.nanoseconds', async () => {
    const { value, elapsedMs: ms, elapsedNs: ns } = await timedAsync(async () => {
      await sleep(2);
      return 42;
    });
    expect(value).toBe(42);
    expect(ns).toBeGreaterThan(0);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeCloseTo(ns / 1_000_000, 3);
  });
});
