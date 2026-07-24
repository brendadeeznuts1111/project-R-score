// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from "bun:test";
import { buildNitsProof, runNitProbes } from "../tools/verify-bun-runtime-nits.ts";

describe("bun runtime nits probes", () => {
  test("all 16 probes pass on this runtime", async () => {
    const results = await runNitProbes();
    expect(results).toHaveLength(16);
    const failures = results.filter(r => !r.passed);
    expect(failures.map(f => `${f.name}: expected=${f.expected} actual=${f.actual}`)).toEqual([]);
  });

  test("categories match docs/bun-runtime-nits.md inventory", async () => {
    const results = await runNitProbes();
    const counts = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ inspect: 7, streams: 2, url: 4, "file-io": 3 });
  });

  test("proof carries summary + sha256 hash", async () => {
    const proof = await buildNitsProof();
    expect(proof.summary.status).toBe("pass");
    expect(proof.summary.passed).toBe(proof.summary.total);
    expect(proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
    for (const r of proof.results) {
      expect(r.canonical).toMatch(/^https:\/\//);
    }
  });
});
