// [DUOPLUS][TEST][INTEGRATION][FEAT][META:{real_data:true}] [BUN:6.1-NATIVE]

import { test, expect } from "bun:test";
import { inspectURL } from "../../cli/factorywager-inspector-enhanced";

test("CLI inspect performs real URL inspection", async () => {
  const originalFetch = globalThis.fetch;
  process.env.NODE_ENV = "dev";

  try {
    globalThis.fetch = async () => new Response("ok");

    const result = await inspectURL("http://localhost:3001", {
      standards: ["pci", "gdpr"],
      timeout: 1000,
      redact: true
    });

    expect(result.url).toBe("http://localhost:3001");
    expect(result.timing.response).toBeGreaterThanOrEqual(0);
    expect(result.tags).toContain("[SEC][COMPLIANCE]");
    expect(result.compliance.rules.length).toBeGreaterThan(0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // [TEST][CLI][INSPECT][INTEGRATION][#REF:TEST-CLI-001][BUN:6.1-NATIVE]
});
