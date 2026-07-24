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
  /from\s+['"]bun['"]/, // `import { ... } from 'bun'` — unresolvable on Workers
  /from\s+['"]node:fs['"]/,
  /from\s+['"]node:crypto['"]/,
  /\bBun\.(file|version|env|CryptoHasher|Glob|WebView|S3Client|sqlite)\b/, // bare Bun globals (incl. transitive)
  /new\s+Database\s*\(/,
];

describe("functions/ edge safety", () => {
  test("no Bun-only APIs in edge functions", async () => {
    const violations: string[] = [];
    for await (const file of new Bun.Glob("**/*.ts").scan("functions")) {
      const raw = await Bun.file(`functions/${file}`).text();
      // Strip comments so doc mentions (e.g. "no Bun.file") don't false-positive.
      // Line comments: only when // is not part of a URL scheme (https://).
      const text = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
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

  test("r2-env Pages Functions boundary — no Bun-only transitive imports", async () => {
    const text = await Bun.file("config/r2-env.ts").text();
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const forbidden = [
      [/lib\/verification\/cloudflare-token-scope/, "cloudflare-token-scope import"],
      [/from\s+['"]\.\.\/lib\/types\/branded/, "branded types import (Bun at module load)"],
      [/await import\([^)]*cloudflare-token-scope/, "dynamic cloudflare-token-scope import"],
      [/from\s+['"]bun['"]/, "bare bun import"],
    ] as const;
    const hits = forbidden.filter(([re]) => re.test(stripped)).map(([, label]) => label);
    expect(hits).toEqual([]);
  });
});
