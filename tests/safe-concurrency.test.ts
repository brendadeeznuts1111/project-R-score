import { describe, test, expect } from 'bun:test';
import { Mutex, Semaphore, OperationQueue, ConcurrencyManagers, safeConcurrent } from '../lib/core/safe-concurrency';

describe('Mutex', () => {
  test('withLock provides exclusive access', async () => {
    const mutex = new Mutex();
    const log: string[] = [];

    const task = (id: string) => mutex.withLock(async () => {
      log.push(`${id}:start`);
      await Bun.sleep(10);
      log.push(`${id}:end`);
    });

    await Promise.all([task('a'), task('b'), task('c')]);

    // Each task must fully complete before the next starts
    for (let i = 0; i < log.length; i += 2) {
      const id = log[i].split(':')[0];
      expect(log[i]).toBe(`${id}:start`);
      expect(log[i + 1]).toBe(`${id}:end`);
    }
  });

  test('withLock releases on error', async () => {
    const mutex = new Mutex();

    await expect(
      mutex.withLock(async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    // Mutex should be released — next withLock should succeed immediately
    const result = await mutex.withLock(async () => 'ok');
    expect(result).toBe('ok');
  });

  test('acquire/release manual usage', async () => {
    const mutex = new Mutex();
    await mutex.acquire();

    let resolved = false;
    const pending = mutex.acquire().then(() => { resolved = true; });

    await Bun.sleep(5);
    expect(resolved).toBe(false);

    mutex.release();
    await pending;
    expect(resolved).toBe(true);
    mutex.release();
  });
});

describe('Semaphore', () => {
  test('limits concurrency to permit count', async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let maxRunning = 0;

    const tasks = Array.from({ length: 5 }, () =>
      sem.withPermit(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await Bun.sleep(10);
        running--;
      })
    );

    await Promise.all(tasks);
    expect(maxRunning).toBe(2);
  });

  test('withPermit releases on error', async () => {
    const sem = new Semaphore(1);

    await expect(
      sem.withPermit(async () => { throw new Error('fail'); })
    ).rejects.toThrow('fail');

    // Permit should be released
    const result = await sem.withPermit(async () => 'recovered');
    expect(result).toBe('recovered');
  });
});

describe('OperationQueue', () => {
  test('respects maxConcurrency', async () => {
    const queue = new OperationQueue(2);
    let running = 0;
    let maxRunning = 0;

    const tasks = Array.from({ length: 4 }, () =>
      queue.add(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await Bun.sleep(10);
        running--;
        return 'done';
      })
    );

    const results = await Promise.all(tasks);
    expect(maxRunning).toBeLessThanOrEqual(2);
    expect(results).toEqual(['done', 'done', 'done', 'done']);
  });
});

describe('ConcurrencyManagers', () => {
  test('exports expected managers', () => {
    expect(ConcurrencyManagers.keychain).toBeInstanceOf(Mutex);
    expect(ConcurrencyManagers.secretResolution).toBeInstanceOf(Mutex);
    expect(ConcurrencyManagers.fileOperations).toBeInstanceOf(Mutex);
    expect(ConcurrencyManagers.networkRequests).toBeInstanceOf(Semaphore);
  });
});

describe('safeConcurrent', () => {
  test('returns success results for resolved operations', async () => {
    const ops = [
      async () => 1,
      async () => 2,
      async () => 3,
    ];

    const results = await safeConcurrent(ops);
    expect(results).toEqual([
      { success: true, data: 1 },
      { success: true, data: 2 },
      { success: true, data: 3 },
    ]);
  });

  test('captures errors without failing other operations', async () => {
    const ops = [
      async () => 'ok',
      async () => { throw new Error('bad'); },
      async () => 'also ok',
    ];

    const results = await safeConcurrent(ops);
    expect(results[0]).toEqual({ success: true, data: 'ok' });
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe('bad');
    expect(results[2]).toEqual({ success: true, data: 'also ok' });
  });

  test('respects maxConcurrency parameter', async () => {
    let running = 0;
    let maxRunning = 0;

    const ops = Array.from({ length: 6 }, () => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await Bun.sleep(10);
      running--;
      return true;
    });

    await safeConcurrent(ops, 2);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });
});
