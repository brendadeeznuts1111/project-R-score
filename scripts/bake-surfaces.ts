#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bake-surfaces.ts — bake the FactoryWager surface inventory → surfaces-state.json
 *
 * SSOT: config/surfaces.toml
 * Cross-checks:
 *   .cloudflare-access.yml  (Access apps ↔ surface access status)
 *   wrangler.toml           (R2 bucket binding ↔ registry surface backend)
 *   config/r2-env.ts        (registryHost SSOT ↔ registry surface host)
 *
 * Domain types (parse once via lib/surfaces/inventory.ts) — HostId, ApexDomainId,
 * SubdomainId, SurfaceId, PagesProjectId, PublishLaneId, AccessDomainId,
 * SurfaceStatusCode, SurfaceAccessCode, SurfaceBackendCode.
 *
 *   bun run surfaces:bake
 *   bun run surfaces:bake -- --check          # read-only artifact drift check
 *   bun run surfaces:bake -- --probe          # live DNS+HTTP re-verification (opt-in)
 *   bun run surfaces:bake -- --probe --check  # fail on live drift vs TOML status
 *   bun run surfaces:bake -- --zone-check     # CF API: TOML dnsTarget/mail vs live zone
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import {
  appliedAccessDomains,
  findSurfaceByHost,
  findSurfaceById,
  loadSurfacesInventory,
  summarizeInventory,
} from '../lib/surfaces/inventory.ts';
import {
  asAccessDomainId,
  asHostId,
  asSurfaceId,
  hostIdFromAccessDomain,
  pathFromAccessDomain,
  type AccessDomainId,
  type HostId,
  type SurfaceStatusCode,
} from '../lib/types/branded.ts';
import { resolvePath } from './lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CHECK = Bun.argv.includes('--check');
const PROBE = Bun.argv.includes('--probe');
const ZONE_CHECK = Bun.argv.includes('--zone-check');
const TOML = `${ROOT}/config/surfaces.toml`;
const STATE_PATH = `${ROOT}/public/registry/surfaces-state.json`;

const GENERATED_AT_LINE = /^(\s*"generatedAt":\s*)"[^"]+"(,?)$/m;

/** Compare a freshly rendered artifact while treating its bake timestamp as metadata. */
export function surfaceStateArtifactDrift(expectedText: string, persistedText: string): boolean {
  const persistedTimestamp = persistedText.match(GENERATED_AT_LINE)?.[0];
  if (!persistedTimestamp) return true;
  return expectedText.replace(GENERATED_AT_LINE, persistedTimestamp) !== persistedText;
}

// ── Zone check (opt-in, CF API) ───────────────────────────────────────
// Compares TOML dnsTarget / mail records against the live zone. Token from
// CLOUDFLARE_DNS_API_TOKEN ?? CLOUDFLARE_API_TOKEN — never logged.

export type ZoneRecord = { type: string; name: string; content: string };

export function zoneDrift(
  surfaces: ReadonlyArray<{ id: unknown; host: unknown; dnsTarget?: string }>,
  mail: { mx?: Array<{ host: string; target: string; priority: number }> },
  live: readonly ZoneRecord[]
): string[] {
  const issues: string[] = [];
  for (const s of surfaces) {
    const host = String(s.host);
    const expected = s.dnsTarget ?? '';
    const cname = live.find(r => r.type === 'CNAME' && r.name === host);
    if (expected) {
      if (!cname) {
        issues.push(`${String(s.id)}: expected CNAME ${host} → ${expected} — no live record`);
      } else if (cname.content !== expected) {
        issues.push(`${String(s.id)}: CNAME target drift — toml=${expected} live=${cname.content}`);
      }
    } else if (cname) {
      issues.push(`${String(s.id)}: live CNAME ${host} → ${cname.content} but TOML expects none`);
    }
  }
  for (const mx of mail.mx ?? []) {
    const found = live.some(r => r.type === 'MX' && r.name === mx.host && r.content === mx.target);
    if (!found) issues.push(`mail: expected MX ${mx.host} → ${mx.target} (${mx.priority})`);
  }
  return issues;
}

// ── Live probe (opt-in) ────────────────────────────────────────────────
// Drift rules per status: retired/placeholder must NOT resolve; broken/dangling
// must resolve AND 5xx; live/vanity/external must resolve; staged = no expectation.

export function probeDriftFor(
  status: SurfaceStatusCode,
  resolves: boolean,
  httpStatus: number | null
): string | null {
  switch (status) {
    case 'retired':
    case 'placeholder':
      return resolves ? `resolves but marked ${status}` : null;
    case 'staged':
      return null;
    case 'broken':
    case 'dangling':
      if (!resolves) return `NXDOMAIN but marked ${status}`;
      if (httpStatus != null && httpStatus < 500)
        return `HTTP ${httpStatus} (<500) but marked ${status}`;
      return null;
    case 'live':
    case 'vanity':
    case 'external':
      return resolves ? null : `NXDOMAIN but marked ${status}`;
    default:
      return null;
  }
}

async function dnsResolves(host: HostId): Promise<boolean> {
  try {
    const { resolve4 } = await import('node:dns/promises');
    const result = await Promise.race([
      resolve4(host)
        .then(() => true)
        .catch(() => false),
      Bun.sleep(3000).then(() => false),
    ]);
    return result;
  } catch {
    return false;
  }
}

async function httpStatusOf(host: HostId): Promise<number | null> {
  try {
    const res = await fetch(`https://${host}/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    return res.status;
  } catch {
    return null;
  }
}

type ProbeRow = {
  id: string; // brand-ok — surfaces.toml inventory key in probe output
  host: string;
  status: string;
  resolves: boolean;
  http: number | null;
  drift: string | null;
};

async function main(): Promise<void> {
  const inventory = await loadSurfacesInventory(TOML);
  const { surfaces, publishLanes: lanes } = inventory;
  const summary = summarizeInventory(inventory);

  const issues: string[] = [];

  // 1. Access apps (.cloudflare-access.yml) ↔ surface access fields
  const accessYml = await Bun.file(`${ROOT}/.cloudflare-access.yml`).text();
  const appDomains: AccessDomainId[] = [...accessYml.matchAll(/domain:\s*(\S+)/g)].map(m =>
    asAccessDomainId(m[1]!)
  );
  for (const domain of appDomains) {
    const host = hostIdFromAccessDomain(domain);
    const subpath = pathFromAccessDomain(domain) ?? null;
    const s = findSurfaceByHost(inventory, host);
    if (!s) {
      issues.push(`access app "${domain}" has no surface entry in config/surfaces.toml`);
    } else if (subpath) {
      const sp = s.accessSubpaths?.find(x => x.path === subpath);
      if (!sp) {
        issues.push(
          `access app "${domain}" but surface "${s.id}" has no accessSubpaths entry for ${subpath}`
        );
      }
    } else if (s.access !== 'applied' && s.access !== 'staged') {
      issues.push(`access app "${domain}" but surface "${s.id}" marked access=${s.access}`);
    }
  }
  for (const s of surfaces) {
    for (const domain of appliedAccessDomains(s)) {
      if (!appDomains.some(d => d === domain)) {
        issues.push(
          `surface "${s.id}" applied Access domain "${domain}" missing from .cloudflare-access.yml`
        );
      }
    }
  }

  // 2. wrangler R2 bucket ↔ registry surface backend
  const wrangler = await Bun.file(`${ROOT}/wrangler.toml`).text();
  const bucket = wrangler.match(/bucket_name\s*=\s*"([^"]+)"/)?.[1];
  const reg = findSurfaceById(inventory, asSurfaceId('registry'));
  if (bucket && reg && !reg.backend.includes(bucket)) {
    issues.push(`wrangler bucket "${bucket}" not reflected in registry surface backend`);
  }

  // 3. r2-env registryHost ↔ registry surface host
  if (reg && reg.host !== asHostId(CLOUDFLARE_DEFAULTS.registryHost)) {
    issues.push(
      `registry surface host "${reg.host}" ≠ r2-env registryHost "${CLOUDFLARE_DEFAULTS.registryHost}"`
    );
  }

  // 4. Pages project shortcode ↔ r2-env pages.project
  const pagesDefault = CLOUDFLARE_DEFAULTS.pages.project;
  for (const s of surfaces) {
    if (s.pagesProject && String(s.pagesProject) !== pagesDefault) {
      issues.push(
        `surface "${s.id}" pagesProject="${s.pagesProject}" ≠ r2-env pages.project "${pagesDefault}"`
      );
    }
  }

  const state = {
    schemaVersion: 2,
    kind: 'surfaces-state',
    generatedAt: new Date().toISOString(),
    source: 'config/surfaces.toml (dig+curl verified 2026-08-04)',
    surfaces,
    publishLanes: lanes,
    mail: inventory.mail,
    crossCheck: { ok: issues.length === 0, issues },
    summary: {
      ...summary,
      crossCheckOk: issues.length === 0,
    },
  };

  // Opt-in live probe — re-verify every surface against DNS + HTTP.
  let probeRows: ProbeRow[] = [];
  if (PROBE) {
    probeRows = await Promise.all(
      surfaces.map(async s => {
        const resolves = await dnsResolves(s.host);
        const http = resolves ? await httpStatusOf(s.host) : null;
        return {
          id: String(s.id),
          host: String(s.host),
          status: String(s.status),
          resolves,
          http,
          drift: probeDriftFor(s.status, resolves, http),
        };
      })
    );
    const { logTable } = await import('../lib/console-depth.ts');
    console.log('\n── live probe (dig + HTTPS) ──');
    logTable(
      probeRows.map(r => ({
        surface: r.id,
        resolves: r.resolves ? 'y' : 'n',
        http: r.http ?? '—',
        drift: r.drift ?? '',
      })),
      ['surface', 'resolves', 'http', 'drift']
    );
    (state as { probe?: { at: string; results: ProbeRow[] } }).probe = {
      at: state.generatedAt,
      results: probeRows,
    };
  }

  // Opt-in zone check — TOML dnsTarget/mail vs live zone via CF API.
  let zoneIssues: string[] = [];
  if (ZONE_CHECK) {
    const token = Bun.env.CLOUDFLARE_DNS_API_TOKEN?.trim() || Bun.env.CLOUDFLARE_API_TOKEN?.trim();
    if (!token) {
      console.warn('⚠ --zone-check: no CLOUDFLARE_DNS_API_TOKEN / CLOUDFLARE_API_TOKEN — skipped');
    } else {
      const zoneId = CLOUDFLARE_DEFAULTS.zones.factoryWager.id;
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = (await res.json()) as {
        success: boolean;
        errors?: Array<{ message: string }>;
        result?: ZoneRecord[];
      };
      if (!body.success) {
        zoneIssues.push(`zone API error: ${body.errors?.[0]?.message ?? res.status}`);
      } else {
        zoneIssues = zoneDrift(surfaces, inventory.mail, body.result ?? []);
        (state as { zoneCheck?: { ok: boolean; issues: string[] } }).zoneCheck = {
          ok: zoneIssues.length === 0,
          issues: zoneIssues,
        };
      }
    }
  }

  const renderedState = JSON.stringify(state, null, 2) + '\n';
  const artifactIssues: string[] = [];
  if (CHECK) {
    if (!PROBE && !ZONE_CHECK) {
      const stateFile = Bun.file(STATE_PATH);
      if (!(await stateFile.exists())) {
        artifactIssues.push('public/registry/surfaces-state.json is missing');
      } else if (surfaceStateArtifactDrift(renderedState, await stateFile.text())) {
        artifactIssues.push(
          'public/registry/surfaces-state.json is stale; run bun run surfaces:bake'
        );
      }
    }
    console.log('✓ checked public/registry/surfaces-state.json (unchanged)');
  } else {
    await Bun.write(STATE_PATH, renderedState);
    console.log('→ public/registry/surfaces-state.json');
  }
  console.log(
    `surfaces-state  total=${summary.total}  apexes=${summary.apexes.length}  backend=${JSON.stringify(summary.byBackendCode)}  accessDomains=${summary.accessDomains.length}  crossCheck=${issues.length === 0 ? 'ok' : 'DRIFT'}`
  );
  for (const i of issues) console.log(`  ✗ ${i}`);
  const probeDrift = probeRows.filter(r => r.drift);
  if (PROBE) {
    console.log(
      `probe: ${probeRows.length - probeDrift.length}/${probeRows.length} surfaces match live state${probeDrift.length ? ` — ${probeDrift.length} DRIFT` : ''}`
    );
  }
  if (ZONE_CHECK && zoneIssues.length === 0) {
    console.log('zone-check: ok — TOML dnsTarget/mail matches live zone');
  }
  for (const i of zoneIssues) console.log(`  ✗ ${i}`);
  for (const i of artifactIssues) console.log(`  ✗ ${i}`);

  if (
    CHECK &&
    (issues.length > 0 ||
      probeDrift.length > 0 ||
      zoneIssues.length > 0 ||
      artifactIssues.length > 0)
  ) {
    process.exit(1);
  }
}

if (isModuleEntrypoint(import.meta)) await main();
