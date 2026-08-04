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
 *   bun tools/verify-pages-edge.ts --tournament # table-tennis series ownership on domain-glossary
 *   bun tools/verify-pages-edge.ts --pm         # package-manager publish-plane probes
 *   bun tools/verify-pages-edge.ts --pm --save  # write public/registry/pm-proof.json
 *   bun tools/verify-pages-edge.ts --pm --strict-pm  # promote pm skips to failures
 *   bun run verify:weave
 *   bun tools/verify-pages-edge.ts --weave [--retries N] [--backoff MS] [--output table|json] [--summary]
 *     [--correlation-id <id>] [--orphans=group|report|warn|off] [--columns path,group,httpStatus,…]
 *     [--subdomains-config <path>] [--no-subdomains] [--all]
 *     [--no-surfaces] [--no-artifacts] [--no-docs] [--no-meta] [--orphans=off]
 *   PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun tools/verify-pages-edge.ts
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 */
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import { inspectCloudflareSecurityHeaders } from '../lib/http/cloudflare-security-headers.ts';
import { isCloudflareAccessEnforced } from '../lib/verification/cloudflare-access-live.ts';
import {
  parseWeaveOptions,
  renderWeaveMatrix,
  runWeaveVerify,
  type WeaveProbeRow,
} from '../lib/verification/pages-edge-weave.ts';
import {
  buildPmProofReport,
  PM_PROOF_REL,
  runPmProbes,
} from '../lib/verification/pm-registry-probes.ts';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';
import {
  TOURNAMENT_OWNERSHIP_PROBE_SNAPS,
  TOURNAMENT_SERIES_GLOSSARY_IDS,
} from '../lib/glossary/tournament-series-glossary.ts';
import {
  parseTournamentSnap,
  verifyTournamentSnapOwnership,
} from '../lib/glossary/tournament-snap.ts';
import { joinPath } from '../lib/path-bun.ts';

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

// ── Weave consistency (--weave) → lib/verification/pages-edge-weave.ts ──

async function weaveMain() {
  const result = await runWeaveVerify(BASE, parseWeaveOptions());
  if (!result.ok) process.exit(1);
}

async function pmMain() {
  const strict = Bun.argv.includes('--strict-pm');
  const shouldSave = Bun.argv.includes('--save');
  console.log(`PM publish-plane verify${strict ? ' (--strict-pm)' : ''}`);
  const probes = await runPmProbes();
  const rows: WeaveProbeRow[] = probes.map(p => ({
    group: 'publish-plane',
    path: p.name,
    status: p.ok ? 'pass' : 'fail',
    latencyMs: 0,
    detail: p.detail,
  }));
  for (const p of probes) {
    const mark = p.ok ? (p.skipped ? '○' : '✓') : '✗';
    console.log(`${mark} ${p.name}: ${p.detail}`);
  }
  console.log(`\n📊 PM coverage (${rows.length} probes)`);
  console.log(renderWeaveMatrix(rows));
  const proof = buildPmProofReport(probes, { strict });
  if (shouldSave) {
    await Bun.write(PM_PROOF_REL, `${JSON.stringify(proof, null, 2)}\n`);
    console.log(`\n💾 Proof saved to ${PM_PROOF_REL}`);
  }
  const failed = probes.filter(p => !p.ok || (strict && p.skipped));
  if (failed.length) {
    console.error(
      `\n❌ ${failed.length} pm check(s) failed${strict ? ' (strict: skips count)' : ''}`
    );
    process.exit(1);
  }
  const skipped = probes.filter(p => p.skipped).length;
  console.log(`\n✅ PM verify passed${skipped > 0 ? ` (${skipped} skipped — fail-soft)` : ''}`);
}

// ── Tournament series ownership (--tournament) ──────────────────────────

/**
 * Prove table-tennis series leaves are on domain-glossary and warehouse snaps
 * resolve ownership to tournament.* (not region/gender editions).
 *
 * Modes:
 *   --tournament           live Pages + local snap parse
 *   --tournament --offline local bake only (no network)
 */
async function tournamentMain() {
  const offline = Bun.argv.includes('--offline');
  console.log(`Tournament series ownership verify${offline ? ' (--offline)' : ` → ${BASE}`}`);

  const issues: string[] = [];

  // 1) Local snap parse + ownership (always)
  for (const snap of TOURNAMENT_OWNERSHIP_PROBE_SNAPS) {
    const parts = parseTournamentSnap(snap);
    if (!parts) {
      issues.push(`unparseable probe snap: ${snap}`);
      continue;
    }
    const report = await verifyTournamentSnapOwnership(snap);
    if (!report.ok) {
      issues.push(
        `ownership fail ${snap} → ${parts.glossaryId}: ${report.issues.join('; ') || 'unknown'}`
      );
    } else {
      console.log(
        `✓ snap ${snap} → ${parts.glossaryId} region=${parts.region ?? '—'} gender=${parts.gender ?? '—'} · ${report.ownedBy?.source}`
      );
    }
  }

  // 2) Glossary leaf presence
  let glossaryIds: Set<string>;
  if (offline) {
    const path = joinPath(import.meta.dir, '..', 'public/registry/domain-glossary.json');
    const file = Bun.file(path);
    if (!(await file.exists())) {
      issues.push(`missing local ${path} — run bun run glossary:portal`);
      glossaryIds = new Set();
    } else {
      const j = (await file.json()) as { concepts?: Array<{ id?: string }> };
      glossaryIds = new Set(
        (j.concepts ?? []).map(c => c.id).filter((id): id is string => typeof id === 'string')
      );
      console.log(`✓ local domain-glossary · ${glossaryIds.size} concepts`);
    }
  } else {
    const res = await fetch(`${BASE}/registry/domain-glossary.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      issues.push(`domain-glossary.json → ${res.status} (try --offline against local bake)`);
      glossaryIds = new Set();
    } else {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('text/html')) {
        issues.push('domain-glossary.json → HTML shell (Access or SPA fallback)');
        glossaryIds = new Set();
      } else {
        const j = (await res.json()) as { concepts?: Array<{ id?: string }> };
        glossaryIds = new Set(
          (j.concepts ?? []).map(c => c.id).filter((id): id is string => typeof id === 'string')
        );
        console.log(`✓ live domain-glossary · ${glossaryIds.size} concepts`);
      }
    }
  }

  const required = [
    'sport.table_tennis',
    'league.wtt',
    'league.ittf',
    'tournament',
    ...TOURNAMENT_SERIES_GLOSSARY_IDS,
  ];
  const missing = required.filter(id => !glossaryIds.has(id));
  if (missing.length) {
    issues.push(`glossary missing series ids: ${missing.join(', ')}`);
  } else if (glossaryIds.size > 0) {
    console.log(`✓ series leaves present (${required.length} ids)`);
  }

  // 3) Live ownership prefers domain-glossary when remote bake is current
  if (!offline && glossaryIds.has('tournament.setka_cup')) {
    const tmp = joinPath(import.meta.dir, '..', 'tmp-tournament-edge-glossary.json');
    // Reconstruct minimal domain-glossary shape from required ids for local pin
    await Bun.write(
      tmp,
      JSON.stringify({
        concepts: required
          .filter(id => glossaryIds.has(id))
          .map(id => ({ id, label: id.replace(/^tournament\./, '').replace(/_/g, ' ') })),
      })
    );
    try {
      const report = await verifyTournamentSnapOwnership('setka_cup_ua_w', {
        domainGlossary: tmp,
        tennisHqColors: '',
      });
      if (!report.ok || report.ownedBy?.source !== 'domain-glossary') {
        issues.push(
          `pinned domain-glossary ownership expected domain-glossary, got ${report.ownedBy?.source ?? 'null'}`
        );
      } else {
        console.log('✓ setka_cup_ua_w owned by domain-glossary (pinned remote projection)');
      }
    } finally {
      Bun.spawnSync(['rm', '-f', tmp]);
    }
  }

  if (issues.length) {
    for (const issue of issues) console.error(`✗ ${issue}`);
    console.error(`\n❌ ${issues.length} tournament ownership check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ Tournament series ownership verify passed');
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
  const entry = Bun.argv.includes('--weave')
    ? weaveMain
    : Bun.argv.includes('--pm')
      ? pmMain
      : Bun.argv.includes('--tournament')
        ? tournamentMain
        : main;
  entry().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
