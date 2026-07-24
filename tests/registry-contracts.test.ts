// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from "bun:test";
import {
  validateArtifact,
  validateDodRegistry,
  validateDodRegistryEntry,
  validateOpsSummary,
} from "../lib/registry/contracts.ts";

describe("registry contracts — live artifacts", () => {
  test("public/registry/ops-summary.json satisfies the portal contract", async () => {
    const artifact = await Bun.file("public/registry/ops-summary.json").json();
    const result = validateOpsSummary(artifact);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("public/registry/dod-registry.json satisfies the portal contract", async () => {
    const artifact = await Bun.file("public/registry/dod-registry.json").json();
    const result = validateDodRegistry(artifact);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("registry contracts — negative cases", () => {
  test("ops-summary rejects wrong shapes", () => {
    expect(validateOpsSummary(null).ok).toBe(false);
    expect(validateOpsSummary({ source: "snapshot" }).ok).toBe(false);
    expect(
      validateArtifact("ops-summary", {
        source: "snapshot",
        generated: "2026-07-23T00:00:00Z",
        liquidity: { total: 0 },
        experts: [],
        tree: { partners: 0, agents: 0, subAgents: 0, downstreamLiquidity: 0 },
        plays: [],
        rails: [],
        phones: { inventory: 0, issued: 0, returned: 0 },
        experiments: { byStatus: {}, active: 0, recent: [] },
        prediction: { coverage: { mae: 0, rmse: 0 } },
        growth: {},
        bunUtils: {},
        routing: {},
      }).ok,
    ).toBe(true);
    // Missing writer-always-emits sections must fail
    expect(
      validateArtifact("ops-summary", {
        source: "snapshot",
        generated: "2026-07-23T00:00:00Z",
        liquidity: { total: 0 },
        experts: [],
        tree: { partners: 0, agents: 0, subAgents: 0, downstreamLiquidity: 0 },
        plays: [],
        rails: [],
        phones: { inventory: 0, issued: 0, returned: 0 },
        experiments: { byStatus: {}, active: 0, recent: [] },
        prediction: { coverage: { mae: 0, rmse: 0 } },
      }).ok,
    ).toBe(false);
  });

  test("registry-index enforces the versions↔releases invariant", async () => {
    const { validateRegistryIndex } = await import("../lib/registry/contracts.ts");
    expect(
      validateRegistryIndex({ packages: { a: { versions: ["1.0.0"], releases: { "1.0.0": {} } } } }).ok,
    ).toBe(true);
    // Phantom version: listed but no release
    const phantom = validateRegistryIndex({
      packages: { a: { versions: ["1.0.0", "2.0.0"], releases: { "1.0.0": {} } } },
    });
    expect(phantom.ok).toBe(false);
    expect(phantom.errors[0]).toContain("2.0.0");
  });

  test("dod-registry entry validation", () => {
    const good = {
      id: "a",
      agentId: "b",
      type: "slip",
      status: "pending",
      tamperScore: 20,
      submittedAt: "2026-07-23T00:00:00Z",
      processedAt: "2026-07-23T00:00:01Z",
      processingMs: 42,
      signature: "0".repeat(64),
    };
    expect(validateDodRegistryEntry(good, 0).ok).toBe(true);
    expect(validateDodRegistryEntry({ ...good, type: "bogus" }, 0).ok).toBe(false);
    expect(validateDodRegistryEntry({ ...good, tamperScore: 101 }, 0).ok).toBe(false);
    expect(validateDodRegistryEntry({ ...good, signature: "not-hex" }, 0).ok).toBe(false);
    expect(validateDodRegistry({ entries: [good, { bad: true }] }).ok).toBe(false);
  });
});
