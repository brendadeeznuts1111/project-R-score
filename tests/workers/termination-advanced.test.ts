import { test, describe, expect, beforeEach, afterEach } from "bun:test";

function inlineWorker(code: string, opts?: { ref?: boolean }): Worker {
  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { ref: opts?.ref });
  // Revoke after worker loads — immediate revoke prevents script from loading
  worker.addEventListener("open", () => URL.revokeObjectURL(url));
  return worker;
}

function safeTerminate(worker: Worker) {
  try {
    worker.terminate();
  } catch {
    // Already terminated
  }
}

describe("Worker Termination", () => {
  let workerPool: Worker[] = [];

  beforeEach(() => {
    workerPool = Array.from({ length: 3 }, (_, i) =>
      inlineWorker(`
        let count = 0;
        self.onmessage = (e) => {
          if (e.data === "SHUTDOWN") {
            postMessage({ type: "shutting_down", count });
          } else {
            count++;
            postMessage({ count, workerId: ${i} });
          }
        };
      `),
    );
  });

  afterEach(() => {
    workerPool.forEach(safeTerminate);
    workerPool = [];
  });

  test("Graceful termination with cleanup", async () => {
    const worker = workerPool[0];

    const messages: any[] = [];
    const done = new Promise<void>((resolve) => {
      worker.addEventListener("message", (e) => {
        messages.push(e.data);
        if (e.data.type === "shutting_down") resolve();
      });
    });

    worker.postMessage("work");
    worker.postMessage("SHUTDOWN");

    await done;

    expect(messages).toHaveLength(2);
    expect(messages[0].count).toBe(1);
    expect(messages[1].type).toBe("shutting_down");
    expect(messages[1].count).toBe(1);

    worker.terminate();
  });

  test("Termination timeout handling", async () => {
    const worker = inlineWorker(`
      self.onmessage = async (e) => {
        if (e.data === "longTask") {
          await new Promise(r => setTimeout(r, 3000));
          postMessage("done");
        }
      };
    `);
    workerPool.push(worker);

    const startTime = Date.now();

    // Start long task
    worker.postMessage("longTask");

    // Terminate after 500ms — doesn't wait for task to finish
    setTimeout(() => worker.terminate(), 500);

    // Wait for close event
    await new Promise<void>((resolve) =>
      worker.addEventListener("close", () => resolve(), { once: true }),
    );

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });

  test("Unref doesn't prevent immediate termination", async () => {
    const worker = inlineWorker(
      `setInterval(() => {}, 1000);`,
      { ref: false },
    );
    workerPool.push(worker);

    worker.terminate();

    await new Promise<void>((resolve) => {
      worker.addEventListener("close", () => {
        expect(true).toBe(true);
        resolve();
      });
    });
  });
});
