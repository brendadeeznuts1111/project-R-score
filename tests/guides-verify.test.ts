// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout — AbortSignal.timeout
import { describe, expect, test } from "bun:test";
import { buildGuidesProof, runGuideChecks } from "../tools/verify-guides.ts";

/** Live bun.com probes only — skip when offline (install dry-runs still run). */
async function bunGuidesReachable(): Promise<boolean> {
  try {
    const r = await fetch("https://bun.com/guides", {
      signal: AbortSignal.timeout(1500),
    });
    return r.status > 0;
  } catch {
    return false;
  }
}

const online = await bunGuidesReachable();

describe("official guides verification", () => {
  test.skipIf(!online)(
    "guides index, install guide, and /get all return 200",
    async () => {
      const results = await runGuideChecks();
      const urls = results.filter(r => !r.name.startsWith("install guide:"));
      expect(urls).toHaveLength(3);
      for (const r of urls) {
        expect(r.passed).toBe(true);
        expect(r.actual).toContain("200");
      }
    },
    { timeout: 30_000 }
  );

  test(
    "install guide commands dry-run cleanly",
    async () => {
      // Offline-safe: dry-run only (avoid 3× HEAD waits when bun.com is unreachable).
      const dry = Bun.spawnSync(["bun", "install", "--dry-run"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(dry.exitCode).toBe(0);

      const prod = Bun.spawnSync(["bun", "install", "--production", "--dry-run"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(prod.exitCode).toBe(0);
    },
    { timeout: 60_000 }
  );

  test.skipIf(!online)(
    "proof has hash and pass status",
    async () => {
      const proof = await buildGuidesProof();
      expect(proof.summary.status).toBe("pass");
      expect(proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
    },
    { timeout: 30_000 }
  );
});
