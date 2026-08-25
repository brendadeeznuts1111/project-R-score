#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @updated Bun.stripANSI · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.stripANSI · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.stripANSI · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.stripANSI · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-stripansi
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/** Fail CI if a verification step changed Pages artifacts under public/. */
export function publicTreeIsClean(statusOutput: string): boolean {
  return statusOutput.trim() === '';
}

if (import.meta.main) {
  const result = Bun.spawnSync(
    ['git', 'status', '--porcelain', '--untracked-files=all', '--', 'public/'],
    {
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );
  if (result.exitCode !== 0) {
    console.error(Bun.stripANSI(result.stderr.toString()).trim());
    process.exit(result.exitCode ?? 1);
  }
  const status = result.stdout.toString();
  if (!publicTreeIsClean(status)) {
    console.error(`public/ changed during verification:\n${status.trimEnd()}`);
    process.exit(1);
  }
  console.info('✓ public artifact tree unchanged');
}
