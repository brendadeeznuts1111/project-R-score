/**
 * Isolated enrich worker — Bun.spawn IPC child.
 * WebView crashes here do not take down the dashboard / CLI parent.
 */
import { enrichOne } from './enrich.ts';
import type { SeedDomain } from './types.ts';

type Incoming = {
  type: 'enrich';
  taskId: string; // brand-ok — opaque research/wire id
  workerId: string; // brand-ok — opaque research/wire id
  seed: SeedDomain;
  options: {
    screenshot: boolean;
    fixtureFallback: boolean;
    store: boolean;
  };
};

declare const process: {
  on: (event: string, cb: (msg: unknown) => void) => void;
  send?: (msg: unknown) => void;
};

// eslint-disable-next-line harness/no-unknown-function-param -- worker IPC wire before type guard
process.on('message', async (message: unknown) => {
  const msg = message as Incoming;
  if (!msg || msg.type !== 'enrich') return;
  try {
    const result = await enrichOne(msg.seed, {
      taskId: msg.taskId,
      workerId: msg.workerId,
      screenshot: msg.options.screenshot,
      fixtureFallback: msg.options.fixtureFallback,
      store: msg.options.store,
    });
    process.send?.({ type: 'result', result });
  } catch (err) {
    process.send?.({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    process.exit(0);
  }
});
