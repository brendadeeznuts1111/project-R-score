// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from "bun:test";
import { buildGuidesProof, runGuideChecks } from "../tools/verify-guides.ts";

describe("official guides verification", () => {
  test("guides index, install guide, and /get all return 200", async () => {
    const results = await runGuideChecks();
    const urls = results.filter(r => !r.name.startsWith("install guide:"));
    expect(urls).toHaveLength(3);
    for (const r of urls) {
      expect(r.passed).toBe(true);
      expect(r.actual).toContain("200");
    }
  });

  test("install guide commands dry-run cleanly", async () => {
    const results = await runGuideChecks();
    const commands = results.filter(r => r.name.startsWith("install guide:"));
    expect(commands).toHaveLength(2);
    expect(commands.every(c => c.passed)).toBe(true);
  });

  test("proof has hash and pass status", async () => {
    const proof = await buildGuidesProof();
    expect(proof.summary.status).toBe("pass");
    expect(proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
