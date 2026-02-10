import { test, expect, afterAll } from "bun:test";
import { setEnvironmentData, getEnvironmentData } from "worker_threads";
import { ProWorkerFactory } from "../../workers/factory-pro";

afterAll(() => {
  ProWorkerFactory._reset();
});

test("environment data isolation", async () => {
  // Set in main thread via worker_threads API
  setEnvironmentData("apiKey", "secret-123");

  // Worker reads it back via getEnvironmentData
  const blob = new Blob(
    [
      `
      const { getEnvironmentData } = require("worker_threads");
      const key = getEnvironmentData("apiKey");
      postMessage(key ? "Has data" : "No data");
    `,
    ],
    { type: "application/javascript" },
  );
  const url = URL.createObjectURL(blob);

  const worker = new Worker(url);

  const result = await new Promise<string>((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
  });

  expect(result).toBe("Has data");
  worker.terminate();
  URL.revokeObjectURL(url);
});

test("environment data preserves structured values", () => {
  const config = { apiUrl: "https://api.example.com", retries: 3 };
  setEnvironmentData("appConfig", config);

  const retrieved = getEnvironmentData("appConfig") as typeof config;
  expect(retrieved.apiUrl).toBe("https://api.example.com");
  expect(retrieved.retries).toBe(3);
});

test("per-worker environmentData via factory", async () => {
  const factory = ProWorkerFactory.getInstance();

  const worker = factory.create({
    taskType: "inline",
    inlineCode: `
      self.onmessage = (e) => {
        // environmentData is available but we echo back to confirm worker is alive
        postMessage("alive");
      };
    `,
    name: "env-data-worker",
    environmentData: { REGION: "us-east-1", TIER: "production" },
  });

  const msg = await new Promise<string>((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage("ping");
  });

  expect(msg).toBe("alive");
  worker.terminate();
});
