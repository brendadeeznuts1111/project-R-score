#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
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
import { inspectCloudflareSecurityHeaders } from '../lib/http/cloudflare-security-headers.ts';
import { isCloudflareAccessEnforced } from '../lib/verification/cloudflare-access-live.ts';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';

const BASE = Bun.env.PAGES_VERIFY_BASE?.trim() || `https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`;
const TAXONOMY = Bun.argv.includes('--taxonomy');

type Check = { name: string; ok: boolean; detail: string; tier: 'core' | 'taxonomy' };

type ProofRow = { subsystem?: string };
type SemanticTags = { subsystems?: string[] };
type SummaryRollup = { bySubsystem?: Record<string, unknown> };
type DefaultsCoverage = { passed?: boolean };

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

export async function expectJs(path: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${BASE}${path}`, { redirect: 'manual' });
  if (isCloudflareAccessEnforced(res.status, res.headers)) {
    return `${path} ${res.status} Access`;
  }
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

export async function expectPortalPage(path: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${BASE}${path}`, { redirect: 'manual' });
  if (isCloudflareAccessEnforced(res.status, res.headers)) {
    return `${path} ${res.status} Access`;
  }
  const html = await res.text();
  if (!res.ok) throw new Error(String(res.status));
  if (!html.includes('/portal/data.js')) throw new Error('missing data.js script tag');
  if (!html.includes('/portal/topbar.js')) throw new Error('missing topbar.js script tag');
  return 'includes shared portal scripts';
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

async function expectSecurityHeaders(path: string, responseKind: 'static' | 'function') {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const issues = inspectCloudflareSecurityHeaders(res.headers);
  if (issues.length > 0) {
    throw new Error(
      `${path} → ${issues.map(issue => `${issue.name}=${issue.actual ?? 'missing'}`).join(', ')}`
    );
  }
  return `${responseKind} · shared contract`;
}

interface CfDeployment {
  environment?: string;
  url?: string;
  latest_stage?: { name?: string; status?: string };
  deployment_trigger?: { metadata?: { commit_hash?: string } };
}

/** Immutable origins can 404 for a minute or two right after `deploy:success`. */
async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let res = await fetch(url);
  for (let i = 1; !res.ok && i < attempts; i++) {
    await Bun.sleep(5000);
    res = await fetch(url);
  }
  return res;
}

/**
 * Content proof for the Access-gated portal plane. The alias hostname sits
 * behind Cloudflare Access (302), but the immutable per-deploy origin is
 * Access-free — so the deployed portal code is provable without a service
 * token. Degrades to an ok-skip when no CF API token is in the environment.
 */
async function expectImmutableDeployProof() {
  const token = Bun.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) return 'skipped (CLOUDFLARE_API_TOKEN not set)';
  const account = Bun.env.CLOUDFLARE_ACCOUNT_ID?.trim() || CLOUDFLARE_DEFAULTS.accountId;
  const project = CLOUDFLARE_DEFAULTS.pages.project;
  const api = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}/deployments?per_page=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!api.ok) throw new Error(`deployments API → ${api.status}`);
  const payload = (await api.json()) as { success?: boolean; result?: CfDeployment[] };
  const prod = (payload.result ?? []).find(
    d =>
      d.environment === 'production' &&
      d.latest_stage?.name === 'deploy' &&
      d.latest_stage?.status === 'success'
  );
  if (!prod?.url) throw new Error('no successful production deployment');
  const commit = prod.deployment_trigger?.metadata?.commit_hash?.slice(0, 9) ?? '?';

  const js = await fetchWithRetry(`${prod.url}/portal/components/glossary-ux.js`);
  if (!js.ok) throw new Error(`glossary-ux.js → ${js.status}`);
  const body = await js.text();
  const markers = ['getElementByIdInRoot', 'applySectionTitles', 'sectionTitleFromSurface'];
  const missing = markers.filter(m => !body.includes(m));
  if (missing.length) throw new Error(`P1 markers missing: ${missing.join(', ')}`);

  const reg = await fetchWithRetry(`${prod.url}/registry/domain-glossary.json`);
  if (!reg.ok) throw new Error(`domain-glossary.json → ${reg.status}`);
  const glossary = (await reg.json()) as {
    surfaces?: Array<{ sections?: Array<{ title?: string }> }>;
  };
  let sections = 0;
  let titled = 0;
  for (const surf of glossary.surfaces ?? []) {
    for (const row of surf.sections ?? []) {
      sections++;
      if (typeof row.title === 'string' && row.title.trim()) titled++;
    }
  }
  if (sections === 0 || titled !== sections) {
    throw new Error(`sections titled ${titled}/${sections}`);
  }
  const deployId = prod.url.split('//')[1]?.split('.')[0] ?? '?';
  return `deploy ${deployId} @ ${commit} · P1 markers ok · sections ${titled}/${sections}`;
}

// ── Weave consistency (--weave) ─────────────────────────────────────────────

interface WeavePayload {
  summary?: Record<string, number>;
  surfaces?: Array<{ id?: string; href?: string }>; // brand-ok — opaque wire DTO id
  artifacts?: Array<{ id?: string; href?: string }>; // brand-ok — opaque wire DTO id
  components?: Array<{ id?: string; path?: string }>; // brand-ok — opaque wire DTO id
  wiki?: Array<{ id?: string; href?: string }>; // brand-ok — opaque wire DTO id
  scripts?: Array<{ id?: string; label?: string; doc?: string }>; // brand-ok — opaque wire DTO id
}

const REPO_ROOT = new URL('..', import.meta.url).pathname;

/** 200 public or 302 Access — never 404 / SPA fallback. */
async function probeEdgeHref(href: string): Promise<string> {
  const res = await fetch(`${BASE}${href}`, { redirect: 'manual' });
  const access =
    res.status === 302 && (res.headers.get('location') ?? '').includes('cloudflareaccess');
  if (!res.ok && !access) throw new Error(`${href} → ${res.status}`);
  return `${href} ${access ? '302 Access' : res.status}`;
}

async function weaveChecks(): Promise<Check[]> {
  const res = await fetch(`${BASE}/registry/portal-weave.json`);
  if (!res.ok) throw new Error(`portal-weave.json → ${res.status}`);
  const weave = (await res.json()) as WeavePayload;
  const out: Check[] = [];

  const probeGroup = async (
    hrefs: Array<string | undefined>,
    jsonParse = false
  ): Promise<string> => {
    const fails: string[] = [];
    for (const href of hrefs) {
      if (!href) continue;
      try {
        await probeEdgeHref(href);
        if (jsonParse) {
          const r = await fetch(`${BASE}${href}`);
          await r.json();
        }
      } catch (e) {
        fails.push(e instanceof Error ? e.message : String(e));
      }
    }
    if (fails.length) throw new Error(fails.slice(0, 4).join(' · '));
    const total = hrefs.filter(Boolean).length;
    return `${total}/${total} reachable`;
  };

  out.push(
    await check('weave surfaces', 'core', () => probeGroup((weave.surfaces ?? []).map(s => s.href)))
  );
  out.push(
    await check('weave artifacts', 'core', () =>
      probeGroup(
        (weave.artifacts ?? []).map(a => a.href),
        true
      )
    )
  );
  out.push(
    await check('weave components', 'core', () =>
      probeGroup((weave.components ?? []).map(c => c.path))
    )
  );
  out.push(
    await check('weave script docs', 'core', async () => {
      const missing: string[] = [];
      for (const s of weave.scripts ?? []) {
        if (!s.doc) continue;
        if (!(await Bun.file(`${REPO_ROOT}${s.doc}`).exists())) {
          missing.push(`${s.label ?? s.id}→${s.doc}`);
        }
      }
      if (missing.length) throw new Error(missing.slice(0, 4).join(' · '));
      const total = (weave.scripts ?? []).filter(s => s.doc).length;
      return `${total}/${total} doc paths exist`;
    })
  );
  out.push(
    await check('weave meta counts', 'core', async () => {
      const s = weave.summary ?? {};
      const actual: Record<string, number> = {
        surfaces: weave.surfaces?.length ?? 0,
        artifacts: weave.artifacts?.length ?? 0,
        components: weave.components?.length ?? 0,
        wiki: weave.wiki?.length ?? 0,
        scripts: weave.scripts?.length ?? 0,
      };
      const mismatched = Object.entries(actual).filter(
        ([k, v]) => s[k] !== undefined && s[k] !== v
      );
      if (mismatched.length) {
        throw new Error(mismatched.map(([k, v]) => `${k}: summary ${s[k]}≠${v}`).join(' · '));
      }
      return Object.entries(actual)
        .map(([k, v]) => `${k}=${v}`)
        .join(' · ');
    })
  );
  // Orphans: artifacts nothing in the weave links to (warning only, never fails).
  const linked = new Set([
    ...(weave.surfaces ?? []).map(s => s.href),
    ...(weave.wiki ?? []).map(w => w.href),
    ...(weave.components ?? []).map(c => c.path),
    ...Object.values((weave as { related?: Record<string, string> }).related ?? {}),
  ]);
  const orphans = (weave.artifacts ?? []).filter(a => a.href && !linked.has(a.href));
  out.push({
    name: 'weave orphans',
    ok: true,
    detail: orphans.length
      ? `${orphans.length} unlinked (warn): ${orphans
          .slice(0, 4)
          .map(o => o.href)
          .join(', ')}`
      : 'all artifacts linked',
    tier: 'core',
  });
  return out;
}

async function weaveMain() {
  console.log(`Pages weave verify → ${BASE}/registry/portal-weave.json`);
  const checks = await weaveChecks();
  for (const c of checks)
    console.log(c.ok ? `✓ ${c.name}: ${c.detail}` : `✗ ${c.name}: ${c.detail}`);
  const failed = checks.filter(c => !c.ok);
  if (failed.length) {
    console.error(`\n❌ ${failed.length} weave check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ Weave verify passed');
}

async function main() {
  console.log(`Pages edge verify → ${BASE}${TAXONOMY ? ' (--taxonomy)' : ''}`);
  const checks = await Promise.all([
    check('portal/data.js', 'core', () => expectJs('/portal/data.js')),
    check('portal/topbar.js', 'core', () => expectJs('/portal/topbar.js')),
    check('static security headers', 'core', () =>
      expectSecurityHeaders('/site.webmanifest', 'static')
    ),
    check('Function security headers', 'core', () =>
      expectSecurityHeaders('/api/health', 'function')
    ),
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
    check('/portal/env/ page', 'core', () => expectPortalPage('/portal/env/')),
    check('immutable deploy proof', 'core', () => expectImmutableDeployProof()),
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
  const entry = Bun.argv.includes('--weave') ? weaveMain : main;
  entry().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
