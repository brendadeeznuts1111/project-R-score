#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Pre-deploy gate — static checks before Cloudflare Pages push (no live token required).
 *
 *   bun tools/cloudflare-pages-preflight.ts
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 */

const steps: Array<{ name: string; cmd: string[] }> = [
  { name: 'well-known MCP parity', cmd: ['bun', 'tools/sync-well-known-mcp.ts', '--check'] },
  {
    name: 'cloudflare token proof (static)',
    cmd: ['bun', 'tools/verify-cloudflare-token.ts', '--no-live', '--save'],
  },
  { name: 'functions edge safety', cmd: ['bun', 'test', 'tests/functions-edge-safety.test.ts'] },
];

async function main() {
  console.log('Cloudflare Pages preflight');
  for (const step of steps) {
    process.stdout.write(`  ${step.name}… `);
    const proc = Bun.spawn({
      cmd: step.cmd,
      cwd: import.meta.dir + '/..',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    if (code !== 0) {
      console.log('FAIL');
      const err = await new Response(proc.stderr).text();
      console.error(err.trim() || `exit ${code}`);
      process.exit(1);
    }
    console.log('OK');
  }
  console.log('\n✅ Preflight passed — commit refreshed public/registry/* then deploy');
  console.log('   bun run cloudflare:deploy:verify');
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
