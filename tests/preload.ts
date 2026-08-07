// @see https://bun.com/docs/test
// @see https://bun.com/docs/test/configuration#environment-variables — .env.test · NODE_ENV=test
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/preload.ts
/**
 * Test preload — runs before every test file.
 *
 * Kept minimal following Bun's pattern: just env sync + shared global setup.
 * Utility functions live in tests/harness.ts for explicit imports.
 *
 * Bun loads `.env.test` when `NODE_ENV=test` / under `bun test`. Template:
 * `.env.test.example`. Hook/scratch children set `NODE_ENV=test` via
 * `scripts/bun-test-changed-staged.ts` `testRunEnv()`.
 */
// Operator shells sometimes export NODE_ENV=production; vault/partner tests
// then hit fail-closed requireSecret. Coerce to Bun's documented test value.
if (Bun.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
  Bun.env.NODE_ENV = 'test';
  process.env.NODE_ENV = 'test';
}
// Sync Bun.env → process.env so both stay consistent (matches Bun's preload)
for (const key of Object.keys(Bun.env)) {
  if (key === 'TZ') continue;
  if (Bun.env[key] !== undefined && !(key in process.env)) {
    (process.env as Record<string, string>)[key] = Bun.env[key]!;
  }
}
