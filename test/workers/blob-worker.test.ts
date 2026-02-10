import { test, expect, afterAll } from "bun:test";
import { ProWorkerFactory } from "../../workers/factory-pro";

afterAll(() => {
  ProWorkerFactory._reset();
});

test("blob URL workers", async () => {
  const factory = ProWorkerFactory.getInstance();

  const worker = factory.create({
    taskType: "inline",
    inlineCode: `
      self.onmessage = (e) => {
        postMessage(\`Processed: \${e.data}\`);
      };
    `,
    name: "blob-worker-test",
  });

  const message = await new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage("test");
  });

  expect(message).toBe("Processed: test");
  worker.terminate();
});

test("blob URL worker echoes structured data", async () => {
  const factory = ProWorkerFactory.getInstance();

  const worker = factory.create({
    taskType: "inline",
    inlineCode: `
      self.onmessage = (e) => {
        postMessage({ received: e.data, ts: Date.now() });
      };
    `,
    name: "blob-structured-test",
  });

  const response = await new Promise<any>((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage({ hello: "world" });
  });

  expect(response.received).toEqual({ hello: "world" });
  expect(typeof response.ts).toBe("number");
  worker.terminate();
});

test("inline taskType requires inlineCode", () => {
  const factory = ProWorkerFactory.getInstance();

  expect(() => {
    factory.create({ taskType: "inline" });
  }).toThrow("inline taskType requires inlineCode");
});
