// @see https://github.com/tc39/proposal-explicit-resource-management — Explicit Resource Management
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using — using
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/await_using — await using
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron Disposable
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Spine smoke: TC39 Explicit Resource Management in JSC/Bun.
 *
 *   using x = disposable;       → [Symbol.dispose]() on scope exit
 *   await using x = asyncDisp;  → await [Symbol.asyncDispose]()
 *   Bun.cron(...)               → CronJob extends Disposable (using job = …)
 *
 *   bun test tests/bun-explicit-resource.test.ts
 */
import { describe, expect, test } from 'bun:test';

describe('Explicit Resource Management (using / await using)', () => {
  test('using calls Symbol.dispose on block exit', () => {
    const order: string[] = [];
    {
      using _res = {
        [Symbol.dispose]() {
          order.push('dispose');
        },
      };
      order.push('body');
    }
    expect(order).toEqual(['body', 'dispose']);
  });

  test('await using awaits Symbol.asyncDispose on block exit', async () => {
    const order: string[] = [];
    {
      await using _res = {
        async [Symbol.asyncDispose]() {
          await Promise.resolve();
          order.push('asyncDispose');
        },
      };
      order.push('body');
    }
    expect(order).toEqual(['body', 'asyncDispose']);
  });

  test('DisposableStack disposes in reverse registration order', () => {
    const order: number[] = [];
    {
      using stack = new DisposableStack();
      stack.defer(() => order.push(1));
      stack.defer(() => order.push(2));
    }
    expect(order).toEqual([2, 1]);
  });

  test('using Bun.cron job stops the scheduler on scope exit', async () => {
    let ticks = 0;
    {
      using job = Bun.cron('* * * * *', () => {
        ticks += 1;
      });
      expect(typeof job[Symbol.dispose]).toBe('function');
      expect(typeof job.stop).toBe('function');
      // Dispose immediately — must not throw; job must not keep process alive.
    }
    // Give the event loop a turn; disposed cron must not fire.
    await Bun.sleep(5);
    expect(ticks).toBe(0);
  });
});
