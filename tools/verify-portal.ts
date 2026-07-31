#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Portal foundation verification — static anti-patterns + optional live probes.
 *
 *   bun run verify:portal:static   # no server
 *   bun run verify:portal          # static + live (serve-public on PORT)
 *
 * @see docs/portal-foundation.md
 */
import { joinPath } from '../lib/path-bun.ts';
import { resolveServePublicVerifyBase } from '../lib/http/serve-public-bind.ts';
import { collectPortalStaticViolations, PORTAL_ROOT_REL } from '../lib/portal-static-checks.ts';
import {
  PORTAL_MARKDOWN_SLUGS,
  PORTAL_NAV_PROBE_PATHS,
  PORTAL_TRAILING_SLASH_SOURCES,
} from '../lib/http/portal-route-manifest.ts';

const PORTAL_ROOT = joinPath(import.meta.dir, '../public/portal');
const BASE = await resolveServePublicVerifyBase();

const NAV_PATHS = [...PORTAL_NAV_PROBE_PATHS];

async function walkPortalFiles(): Promise<string[]> {
  const out: string[] = [];
  const glob = new Bun.Glob('**/*.{html,js}');
  for await (const rel of glob.scan({ cwd: PORTAL_ROOT, onlyFiles: true })) {
    out.push(rel);
  }
  return out.sort();
}

async function readPortalFile(rel: string): Promise<string> {
  return Bun.file(joinPath(PORTAL_ROOT, rel)).text();
}

async function checkPortalStaticContract() {
  const violations = await collectPortalStaticViolations();
  if (violations.length > 0) {
    const first = violations[0]!;
    throw new Error(`${first.file}: ${first.message}`);
  }
  console.log(
    `✓ portal static contract (${PORTAL_ROOT_REL}: chrome · inline-health · process.env · ts-leak)`
  );
}

async function checkFoundationDoc() {
  const doc = Bun.file('docs/portal-foundation.md');
  if (!(await doc.exists())) throw new Error('docs/portal-foundation.md missing');
  const template = Bun.file('public/portal/_page-template.html');
  if (!(await template.exists())) throw new Error('public/portal/_page-template.html missing');
  console.log('✓ portal-foundation.md + page template present');
}

async function checkClientContract() {
  const dataJs = await readPortalFile('data.js');
  if (!dataJs.includes('startDataService')) throw new Error('data.js missing startDataService');
  if (!dataJs.includes('portal:data')) throw new Error('data.js missing portal:data event');
  const navigationJs = await readPortalFile('navigation.js');
  if (!navigationJs.includes('markCurrentNavigation')) {
    throw new Error('navigation.js missing current-page href signal');
  }
  const topbarJs = await readPortalFile('topbar.js');
  if (!topbarJs.includes('portal:data')) throw new Error('topbar.js missing portal:data listener');
  if (!topbarJs.includes('portal:navigation')) {
    throw new Error('topbar.js missing portal:navigation signal');
  }
  if (!topbarJs.includes('portal:health-signal')) {
    throw new Error('topbar.js missing portal:health-signal event');
  }
  console.log('✓ data.js + navigation.js + topbar.js contract');
}

async function checkPortalStyles() {
  const assets = [
    '/portal/style.css',
    '/portal/theme-tokens.css',
    '/portal/topbar.js',
    '/portal/data.js',
    '/portal/navigation.js',
  ];
  const failures: string[] = [];
  for (const path of assets) {
    const res = await fetch(`${BASE}${path}`);
    const ct = res.headers.get('content-type') ?? '';
    if (!res.ok) {
      failures.push(`${path} → ${res.status}`);
      continue;
    }
    if (path.endsWith('.css') && !ct.includes('text/css')) {
      failures.push(`${path} → expected text/css, got ${ct || 'unknown'}`);
      continue;
    }
    if (path.endsWith('.js') && !ct.includes('javascript')) {
      failures.push(`${path} → expected javascript, got ${ct || 'unknown'}`);
      continue;
    }
    console.log(`✓ ${path} → ${res.status} (${ct.split(';')[0]})`);
  }
  if (failures.length) {
    throw new Error(
      `Portal style assets failed (REGISTRY_SECRET gate? restart serve-public after fix):\n${failures.join('\n')}`
    );
  }
}

async function checkNav() {
  const failures: string[] = [];
  for (const p of NAV_PATHS) {
    const res = await fetch(`${BASE}${p}`, { redirect: 'follow' });
    if (!res.ok) {
      failures.push(`${p} → ${res.status}`);
      continue;
    }
    if (p === '/') {
      const ct = res.headers.get('content-type') ?? '';
      const body = await res.text();
      if (!ct.includes('text/html')) {
        failures.push(`${p} → expected text/html, got ${ct || 'unknown'}`);
      } else if (body.includes('"Package not found"')) {
        failures.push(
          `${p} → npm matcher stole Home (stale serve-public?) — restart: lsof -ti :3000 | xargs kill -9; bun run serve:public`
        );
      }
    }
    console.log(`✓ ${p} → ${res.status}`);
  }
  if (failures.length) throw new Error(`Nav failures:\n${failures.join('\n')}`);
}

async function checkApiHealth() {
  const res = await fetch(`${BASE}/api/health`);
  if (!res.ok) throw new Error(`/api/health → ${res.status}`);
  const j = (await res.json()) as Record<string, unknown>;
  if (typeof j.status !== 'string') throw new Error('/api/health missing status');
  if (j.schemaVersion !== 1) {
    throw new Error(`/api/health schemaVersion ${j.schemaVersion} — expected 1`);
  }
  console.log(`✓ /api/health status=${j.status} schemaVersion=1`);
}

async function checkApiEnv() {
  const res = await fetch(`${BASE}/api/env`);
  if (!res.ok) throw new Error(`/api/env → ${res.status}`);
  const j = (await res.json()) as Record<string, unknown>;
  if (!j.summary || !Array.isArray(j.table)) throw new Error('/api/env missing summary/table');
  console.log(`✓ /api/env table=${(j.table as unknown[]).length} rows`);
}

async function checkRegistryHealth() {
  const res = await fetch(`${BASE}/api/registry/health`);
  if (!res.ok) throw new Error(`/api/registry/health → ${res.status}`);
  console.log('✓ /api/registry/health');
}

async function checkVerificationTaxonomyChrome() {
  const dash = await readPortalFile('operations-dashboard.js');
  if (!dash.includes('releasePreviewRows')) {
    throw new Error('operations-dashboard.js missing releasePreviewRows (install-platform dedupe)');
  }
  if (!dash.includes('proof-taxonomy-audit.json')) {
    throw new Error('operations-dashboard.js missing proof-taxonomy-audit panel');
  }
  const filter = await readPortalFile('channel-filter.js');
  if (!filter.includes('data-filter="subsystem"')) {
    throw new Error('channel-filter.js missing subsystem filter fieldset');
  }
  if (!filter.includes('data-subsystem')) {
    throw new Error('channel-filter.js should filter cards by data-subsystem (see applyFilter)');
  }
  console.log('✓ verification taxonomy portal chrome (subsystem filter + dedupe + audit panel)');
}

async function checkPortalRouteWiring() {
  const redirects = await Bun.file('public/_redirects').text();
  const missingRedirects = PORTAL_TRAILING_SLASH_SOURCES.filter(
    src => !redirects.includes(`${src} `) && !redirects.includes(`${src}\t`)
  );
  if (missingRedirects.length) {
    throw new Error(
      `public/_redirects missing trailing-slash rules: ${missingRedirects.join(', ')}`
    );
  }

  for (const slug of PORTAL_MARKDOWN_SLUGS) {
    const rel =
      slug === 'index'
        ? 'public/portal/index.md'
        : slug === 'monitoring'
          ? 'public/portal/monitoring.md'
          : `public/portal/${slug}.md`;
    if (!(await Bun.file(rel).exists())) {
      throw new Error(`missing portal markdown stub: ${rel}`);
    }
  }

  const indexHtml = await Bun.file('public/portal/index.html').text();
  if (!indexHtml.includes('href="/portal/style.css"')) {
    throw new Error('portal/index.html must use absolute /portal/style.css');
  }
  if (!indexHtml.includes('src="/portal/app.js"')) {
    throw new Error('portal/index.html must use absolute /portal/app.js');
  }

  console.log(
    `✓ portal route wiring (${PORTAL_TRAILING_SLASH_SOURCES.length} redirects · ${PORTAL_MARKDOWN_SLUGS.length} markdown stubs)`
  );
}

async function runStatic() {
  await checkFoundationDoc();
  await checkPortalRouteWiring();
  await checkPortalStaticContract();
  await checkClientContract();
  await checkVerificationTaxonomyChrome();
}

async function runLive() {
  console.log(`Live probes → ${BASE}`);
  await checkNav();
  await checkPortalStyles();
  await checkApiHealth();
  await checkApiEnv();
  await checkRegistryHealth();
}

async function main() {
  const staticOnly = Bun.argv.includes('--static-only');
  const liveOnly = Bun.argv.includes('--live-only');

  if (!liveOnly) {
    console.log('Portal static verify');
    await runStatic();
  }

  if (!staticOnly) {
    if (liveOnly) console.log('Portal live verify');
    else console.log('Portal live verify');
    try {
      await runLive();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Unable to connect') || msg.includes('ECONNREFUSED')) {
        console.warn('⚠ live probes skipped (no server) — run: bun run serve:public');
        if (liveOnly) throw e;
      } else {
        throw e;
      }
    }
  }

  console.log('✅ portal verify passed');
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
