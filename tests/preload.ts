// @see https://bun.com/docs/test
// @see https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/preload.ts
/**
 * Test preload — runs before every test file.
 *
 * Kept minimal following Bun's pattern: just env sync + shared global setup.
 * Utility functions live in tests/harness.ts for explicit imports.
 */
// Sync Bun.env → process.env so both stay consistent (matches Bun's preload)
for (const key of Object.keys(Bun.env)) {
  if (key === 'TZ') continue;
  if (Bun.env[key] !== undefined && !(key in process.env)) {
    (process.env as Record<string, string>)[key] = Bun.env[key]!;
  }
}
