// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout — AbortSignal.timeout
import { describe, expect, test } from "bun:test";
import { CANONICAL_GUIDES_TOKENS } from '../tools/bun-doc-refs.ts';
import {
  buildGuidesProof,
  runGuideChecks,
  validateGuideResponse,
} from '../tools/verify-guides.ts';

/** Live bun.com probes only — skip when offline (install dry-runs still run). */
async function bunGuidesReachable(): Promise<boolean> {
  try {
    const r = await fetch('https://bun.com/docs/guides.md', {
      signal: AbortSignal.timeout(1500),
    });
    return r.status > 0;
  } catch {
    return false;
  }
}

const online = await bunGuidesReachable();

describe('official guides verification', () => {
  test('guides.md is a landing source and llms.txt is the complete discovery authority', () => {
    expect(CANONICAL_GUIDES_TOKENS['Bun Guides']?.url).toBe('https://bun.com/docs/guides');
    expect(CANONICAL_GUIDES_TOKENS['Bun Guides Markdown']?.discoveryRole).toBe('landing');
    expect(CANONICAL_GUIDES_TOKENS['Bun Docs Index']?.discoveryRole).toBe('complete-index');
    expect(CANONICAL_GUIDES_TOKENS['Bun Install Guide']?.url).toBe(
      'https://bun.com/docs/guides/install/from-npm-install-to-bun-install'
    );
  });

  test('markdown discovery validation fails closed on missing llms.txt routing', () => {
    const meta = CANONICAL_GUIDES_TOKENS['Bun Guides Markdown']!;
    expect(
      validateGuideResponse(meta, {
        status: 200,
        finalUrl: meta.url,
        contentType: 'text/markdown; charset=utf-8',
        body: '# Guides\n',
      })
    ).toEqual(
      expect.objectContaining({
        passed: false,
        actual: expect.stringContaining('https://bun.com/docs/llms.txt'),
      })
    );
  });

  test.skipIf(!online)(
    "guides index, install guide, and /get all return 200",
    async () => {
      const results = await runGuideChecks();
      const urls = results.filter(r => !r.name.startsWith("install guide:"));
      expect(urls).toHaveLength(5);
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
