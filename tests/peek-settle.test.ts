// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_PEEK_DOCS,
  awaitAllSettled,
  awaitSettled,
  peekIfSettled,
  promiseStatus,
} from '../lib/peek-settle.ts';

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

  test('peekIfSettled returns undefined while pending and value when fulfilled', async () => {
    let resolve!: (v: number) => void;
    const pending = new Promise<number>(r => {
      resolve = r;
    });
    expect(peekIfSettled(pending)).toBeUndefined();
    resolve(9);
    await pending;
    expect(peekIfSettled(pending)).toBe(9);
  });

  test('peekIfSettled throws on rejected', async () => {
    const rejected = Promise.reject(new Error('peek-if-fail'));
    rejected.catch(() => {});
    expect(() => peekIfSettled(rejected)).toThrow(/peek-if-fail/);
  });

  test('awaitAllSettled peeks mixed sync/fulfilled/pending', async () => {
    const [a, b, c] = await awaitAllSettled([
      1,
      Promise.resolve(2),
      Promise.resolve(3).then(n => n),
    ] as const);
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });
});
