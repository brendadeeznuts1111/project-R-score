#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Post-deploy smoke for Cloudflare Pages (production or preview URL).
 *
 *   bun tools/verify-pages-edge.ts
 *   PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun tools/verify-pages-edge.ts
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 */

const BASE = Bun.env.PAGES_VERIFY_BASE || 'https://score.factory-wager.com';

type Check = { name: string; ok: boolean; detail: string };

async function check(name: string, fn: () => Promise<string | void>): Promise<Check> {
  try {
    const detail = (await fn()) ?? 'ok';
    return { name, ok: true, detail };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function expectJs(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  const ct = res.headers.get('content-type') ?? '';
  const head = (await res.text()).slice(0, 40);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  if (ct.includes('text/html'))
    throw new Error(`${path} → HTML shell (stale deploy or SPA fallback)`);
  if (!ct.includes('javascript') && !head.includes('function') && !head.includes('export')) {
    throw new Error(`${path} → unexpected body: ${head}`);
  }
  return `${path} ${ct.split(';')[0]}`;
}

async function expectJson(path: string, assert: (j: Record<string, unknown>) => void) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  if (ct.includes('text/html'))
    throw new Error(`${path} → HTML (missing Function or SPA fallback)`);
  const j = (await res.json()) as Record<string, unknown>;
  assert(j);
  return `${path} ok`;
}

async function main() {
  console.log(`Pages edge verify → ${BASE}`);
  const checks = await Promise.all([
    check('portal/data.js', () => expectJs('/portal/data.js')),
    check('portal/topbar.js', () => expectJs('/portal/topbar.js')),
    check('/api/health schemaVersion', () =>
      expectJson('/api/health', j => {
        if (j.schemaVersion !== 1) throw new Error(`schemaVersion=${j.schemaVersion}`);
      })
    ),
    check('/api/env contract', () =>
      expectJson('/api/env', j => {
        if (!j.summary || !Array.isArray(j.table)) throw new Error('missing summary/table');
      })
    ),
    check('/api/content-type', () =>
      expectJson('/api/content-type', j => {
        if (!Array.isArray(j.rows)) throw new Error('missing rows');
      })
    ),
    check('/portal/env/ page', async () => {
      const res = await fetch(`${BASE}/portal/env/`, { redirect: 'follow' });
      const html = await res.text();
      if (!res.ok) throw new Error(String(res.status));
      if (!html.includes('/portal/data.js')) throw new Error('missing data.js script tag');
      if (!html.includes('/portal/topbar.js')) throw new Error('missing topbar.js script tag');
      return 'includes shared portal scripts';
    }),
  ]);

  for (const c of checks) {
    console.log(c.ok ? `✓ ${c.name}: ${c.detail}` : `✗ ${c.name}: ${c.detail}`);
  }
  const failed = checks.filter(c => !c.ok);
  if (failed.length) {
    console.error(`\n❌ ${failed.length} edge check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ Pages edge verify passed');
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
