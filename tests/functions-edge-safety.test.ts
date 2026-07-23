// @see https://bun.com/docs/test/index#run-tests
/**
 * Edge-safety guard — `functions/` is deployed to Cloudflare Pages (edge).
 * Bun-only APIs belong in `functions-bun-only/` (see 6ff0514). This guard
 * fails if Bun-only imports or globals ever land back in `functions/`,
 * which is what broke Pages builds earlier today.
 */
import { describe, expect, test } from "bun:test";

const BUN_ONLY_PATTERNS = [
  /from\s+['"]bun:sqlite['"]/,
  /from\s+['"]bun:ffi['"]/,
  /from\s+['"]bun:jsc['"]/,
  /from\s+['"]node:fs['"]/,
  /from\s+['"]node:crypto['"]/,
  /new\s+Bun\.S3Client/,
  /new\s+Bun\.WebView/,
  /new\s+Database\s*\(/,
];

describe("functions/ edge safety", () => {
  test("no Bun-only APIs in edge functions", async () => {
    const violations: string[] = [];
    for await (const file of new Bun.Glob("**/*.ts").scan("functions")) {
      const text = await Bun.file(`functions/${file}`).text();
      for (const pattern of BUN_ONLY_PATTERNS) {
        if (pattern.test(text)) {
          violations.push(`${file}: ${pattern.source}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("functions-bun-only exists as the Bun runtime home", async () => {
    expect(await Bun.file("functions-bun-only/api/dod/index.ts").exists()).toBe(true);
  });
});
