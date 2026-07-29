#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Post-deploy smoke for Cloudflare Pages (production or preview URL).
 *
 *   bun tools/verify-pages-edge.ts
 *   bun tools/verify-pages-edge.ts --taxonomy   # also gate proof subsystem fields
 *   PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun tools/verify-pages-edge.ts
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 */
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';

const BASE = Bun.env.PAGES_VERIFY_BASE?.trim() || `https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`;
const TAXONOMY = Bun.argv.includes('--taxonomy');

type Check = { name: string; ok: boolean; detail: string; tier: 'core' | 'taxonomy' };

type ProofRow = { subsystem?: string };
type SemanticTags = { subsystems?: string[] };
type SummaryRollup = { bySubsystem?: Record<string, unknown> };
type DefaultsCoverage = { passed?: boolean };

export function isCloudflareAccessRedirect(response: Response): boolean {
  if (response.status !== 302) return false;
  const location = response.headers.get('location');
  if (!location) return false;
  try {
    const target = new URL(location);
    return (
      target.hostname.endsWith('.cloudflareaccess.com') &&
      target.pathname.startsWith('/cdn-cgi/access/login/')
    );
  } catch {
    return false;
  }
}

async function check(
  name: string,
  tier: Check['tier'],
  fn: () => Promise<string | void>
): Promise<Check> {
  try {
    const detail = (await fn()) ?? 'ok';
    return { name, ok: true, detail, tier };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e), tier };
  }
}

async function expectJs(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  if (isCloudflareAccessRedirect(res)) return `${path} Cloudflare Access enforced`;
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
    throw new Error(`${path} → HTML (missing static file or SPA fallback)`);
  const j = (await res.json()) as Record<string, unknown>;
  assert(j);
  return `${path} ok`;
}

async function main() {
  console.log(`Pages edge verify → ${BASE}${TAXONOMY ? ' (--taxonomy)' : ''}`);
  const checks = await Promise.all([
    check('portal/data.js', 'core', () => expectJs('/portal/data.js')),
    check('portal/topbar.js', 'core', () => expectJs('/portal/topbar.js')),
    check('/api/health schemaVersion', 'core', () =>
      expectJson('/api/health', j => {
        if (j.schemaVersion !== 1) throw new Error(`schemaVersion=${j.schemaVersion}`);
      })
    ),
    check('/api/env contract', 'core', () =>
      expectJson('/api/env', j => {
        if (!j.summary || !Array.isArray(j.table)) throw new Error('missing summary/table');
      })
    ),
    check('/api/content-type', 'core', () =>
      expectJson('/api/content-type', j => {
        if (!Array.isArray(j.rows)) throw new Error('missing rows');
      })
    ),
    check('/portal/env/ page', 'core', async () => {
      const res = await fetch(`${BASE}/portal/env/`, { redirect: 'manual' });
      if (isCloudflareAccessRedirect(res)) return 'Cloudflare Access enforced';
      const html = await res.text();
      if (!res.ok) throw new Error(String(res.status));
      if (!html.includes('/portal/data.js')) throw new Error('missing data.js script tag');
      if (!html.includes('/portal/topbar.js')) throw new Error('missing topbar.js script tag');
      return 'includes shared portal scripts';
    }),
    check('well-known/mcp.json', 'core', () =>
      expectJson('/.well-known/mcp.json', j => {
        if (!Array.isArray(j.servers) || j.servers.length < 5) throw new Error('missing servers[]');
        const names = (j.servers as Array<{ name: string }>).map(s => s.name);
        if (!names.includes('cloudflare') || !names.includes('cloudflare-docs')) {
          throw new Error(`unexpected servers: ${names.join(', ')}`);
        }
        const auth = j.auth as { type?: string; env?: string } | undefined;
        if (auth?.type !== 'bearer' || auth?.env !== 'CLOUDFLARE_API_TOKEN') {
          throw new Error(`auth mismatch: ${JSON.stringify(auth)}`);
        }
      })
    ),
    check('cloudflare-pages-preflight.json', 'core', () =>
      expectJson('/registry/cloudflare-pages-preflight.json', j => {
        if (j.type !== 'CloudflarePagesPreflightReport') throw new Error(`type=${j.type}`);
        if (j.ok !== true) throw new Error('preflight ok is false');
        const steps = j.steps as Array<{ id?: string; ok?: boolean }> | undefined; // brand-ok — preflight step key
        if (!Array.isArray(steps) || steps.length < 5) {
          throw new Error(`expected ≥5 steps, got ${steps?.length ?? 0}`);
        }
        const failed = steps.filter(s => !s.ok);
        if (failed.length) {
          throw new Error(`failed steps: ${failed.map(s => s.id).join(', ')}`);
        }
      })
    ),
    check('cloudflare-token-scope-proof.json', 'core', () =>
      expectJson('/registry/cloudflare-token-scope-proof.json', j => {
        if (j.type !== 'CloudflareTokenScopeProof') throw new Error(`type=${j.type}`);
        const catalog = j.mcpCatalog as { ok?: boolean; serverCount?: number } | undefined;
        if (!catalog?.ok || (catalog.serverCount ?? 0) < 5) {
          throw new Error('mcpCatalog incomplete');
        }
      })
    ),
    check('/api/skills JSON', 'core', () =>
      expectJson('/api/skills', j => {
        if (!Array.isArray(j.skills)) throw new Error('missing skills[]');
        if (typeof j.count !== 'number') throw new Error('missing count');
      })
    ),
    check('proof-taxonomy-audit.json', 'taxonomy', () =>
      expectJson('/registry/proof-taxonomy-audit.json', j => {
        if (j.type !== 'ProofTaxonomyAuditReport') throw new Error(`type=${j.type}`);
        if (!Array.isArray(j.audits)) throw new Error('missing audits[]');
        if (j.audits.length !== PROOF_TAXONOMY_CONTRACT_COUNT) {
          throw new Error(
            `expected ${PROOF_TAXONOMY_CONTRACT_COUNT} contracts, got ${j.audits.length}`
          );
        }
        if (!Array.isArray(j.consistency)) throw new Error('missing consistency[]');
        const bad = (j.consistency as Array<{ id?: string; ok?: boolean }>).filter(c => !c.ok); // brand-ok — consistency row id
        if (bad.length) {
          throw new Error(
            `${bad.length} consistency row(s) failed: ${bad.map(c => c.id).join(', ')}`
          );
        }
        if (j.ok !== true) throw new Error('report ok is false');
      })
    ),
    check('docs-coverage-proof.json subsystem', 'taxonomy', () =>
      expectJson('/registry/docs-coverage-proof.json', j => {
        if (j.subsystem !== 'other') throw new Error(`subsystem=${j.subsystem}`);
        if (!Array.isArray(j.lanes) || (j.lanes as unknown[]).length < 5) {
          throw new Error('missing lanes[]');
        }
        const tags = j.semanticTags as SemanticTags | undefined;
        if (!tags?.subsystems?.includes('other')) throw new Error('missing semanticTags');
      })
    ),
    check('registry-client-proof.json taxonomy', 'taxonomy', () =>
      expectJson('/registry/registry-client-proof.json', j => {
        const results = j.results as ProofRow[] | undefined;
        if (!results?.every(r => r.subsystem === 'package-manager')) {
          throw new Error('registry-client rows not package-manager');
        }
        const tags = j.semanticTags as SemanticTags | undefined;
        if (!tags?.subsystems?.includes('package-manager')) {
          throw new Error('missing package-manager semanticTags');
        }
        const summary = j.summary as SummaryRollup | undefined;
        if (!summary?.bySubsystem?.['package-manager']) {
          throw new Error('missing summary.bySubsystem');
        }
      })
    ),
    check('doc-index.json taxonomy', 'taxonomy', () =>
      expectJson('/registry/doc-index.json', j => {
        if (j.subsystem !== 'other') throw new Error(`subsystem=${j.subsystem}`);
        const dc = j.defaultsCoverage as DefaultsCoverage | undefined;
        if (!dc?.passed) throw new Error('defaultsCoverage not passed');
      })
    ),
  ]);

  const active = TAXONOMY ? checks : checks.filter(c => c.tier === 'core');
  for (const c of active) {
    console.log(c.ok ? `✓ ${c.name}: ${c.detail}` : `✗ ${c.name}: ${c.detail}`);
  }
  const failed = active.filter(c => !c.ok);
  if (failed.length) {
    console.error(`\n❌ ${failed.length} edge check(s) failed`);
    if (!TAXONOMY) {
      const skipped = checks.filter(c => c.tier === 'taxonomy').length;
      console.error(
        `   (${skipped} taxonomy checks skipped — run with --taxonomy after ops:snapshot deploy)`
      );
    }
    process.exit(1);
  }
  if (!TAXONOMY) {
    console.log(
      `\nℹ️  taxonomy checks skipped (use --taxonomy for full ${PROOF_TAXONOMY_CONTRACT_COUNT}-contract gate)`
    );
  }
  console.log('\n✅ Pages edge verify passed');
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
