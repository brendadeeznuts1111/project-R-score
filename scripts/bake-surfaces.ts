#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bake-surfaces.ts — bake the FactoryWager surface inventory → surfaces-state.json
 *
 * SSOT: config/surfaces.toml (verified via dig + curl; see header).
 * Cross-checks the inventory against the other three sources of truth:
 *   .cloudflare-access.yml  (Access apps ↔ surface access status)
 *   wrangler.toml           (R2 bucket binding ↔ registry surface backend)
 *   config/r2-env.ts        (registryHost SSOT ↔ registry surface host)
 *
 * Domain types (parse once via lib/surfaces/inventory.ts):
 *   SurfaceId · HostId · AccessDomainId
 *
 *   bun run surfaces:bake            # write public/registry/surfaces-state.json
 *   bun run surfaces:bake -- --check # fail on cross-check drift
 *
 * Offline: no DNS/HTTP probing — statuses in the TOML carry a verified-on date.
 */
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import {
  appliedAccessDomains,
  declaredAccessDomains,
  findSurfaceByHost,
  findSurfaceById,
  loadSurfacesInventory,
} from '../lib/surfaces/inventory.ts';
import {
  asAccessDomainId,
  asHostId,
  asSurfaceId,
  hostIdFromAccessDomain,
  pathFromAccessDomain,
  type AccessDomainId,
} from '../lib/types/branded.ts';
import { resolvePath } from './lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CHECK = Bun.argv.includes('--check');
const TOML = `${ROOT}/config/surfaces.toml`;

async function main(): Promise<void> {
  const inventory = await loadSurfacesInventory(TOML);
  const { surfaces, publishLanes: lanes } = inventory;

  // ── Cross-checks ──────────────────────────────────────────────────
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
  // applied Access domains must appear in policy-as-code
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

  const byStatus = new Map<string, number>();
  for (const s of surfaces) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
  const byAccess = new Map<string, number>();
  for (const s of surfaces) byAccess.set(s.access, (byAccess.get(s.access) ?? 0) + 1);

  const accessDomainList = declaredAccessDomains(inventory).map(String).sort();

  const state = {
    schemaVersion: 1,
    kind: 'surfaces-state',
    generatedAt: new Date().toISOString(),
    source: 'config/surfaces.toml (dig+curl verified 2026-07-28)',
    surfaces,
    publishLanes: lanes,
    crossCheck: { ok: issues.length === 0, issues },
    summary: {
      total: surfaces.length,
      byStatus: Object.fromEntries(byStatus),
      byAccess: Object.fromEntries(byAccess),
      lanes: lanes.length,
      accessDomains: accessDomainList,
    },
  };

  await Bun.write(
    `${ROOT}/public/registry/surfaces-state.json`,
    JSON.stringify(state, null, 2) + '\n'
  );
  console.log('→ public/registry/surfaces-state.json');
  console.log(
    `surfaces-state  total=${surfaces.length}  byStatus=${JSON.stringify(state.summary.byStatus)}  accessDomains=${accessDomainList.length}  crossCheck=${issues.length === 0 ? 'ok' : 'DRIFT'}`
  );
  for (const i of issues) console.log(`  ✗ ${i}`);
  if (CHECK && issues.length > 0) process.exit(1);
}

if (import.meta.main) await main();
