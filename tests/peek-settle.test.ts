// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { BUN_PEEK_DOCS, awaitSettled, promiseStatus } from '../lib/peek-settle.ts';

describe('lib/peek-settle', () => {
  test('canonical docs URL points at Bun.peek anchor', () => {
    expect(BUN_PEEK_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-peek');
  });

  test('promiseStatus reports sync / fulfilled / pending / rejected', async () => {
    expect(promiseStatus(1)).toBe('sync');
    expect(promiseStatus(Promise.resolve(1))).toBe('fulfilled');
    expect(promiseStatus(new Promise(() => {}))).toBe('pending');
    const rejected = Promise.reject(new Error('peek-reject'));
    rejected.catch(() => {});
    expect(promiseStatus(rejected)).toBe('rejected');
  });

  test('awaitSettled returns sync values and fulfilled promises', async () => {
    expect(await awaitSettled(7)).toBe(7);
    expect(await awaitSettled(Promise.resolve('ok'))).toBe('ok');
  });

  test('awaitSettled rethrows rejected without unhandled rejection', async () => {
    const rejected = Promise.reject(new Error('settled-fail'));
    await expect(awaitSettled(rejected)).rejects.toThrow(/settled-fail/);
  });

  test('awaitSettled awaits pending promises', async () => {
    let resolve!: (v: string) => void;
    const pending = new Promise<string>(r => {
      resolve = r;
    });
    const done = awaitSettled(pending);
    expect(promiseStatus(pending)).toBe('pending');
    resolve('later');
    expect(await done).toBe('later');
  });
});
