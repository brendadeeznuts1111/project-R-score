#!/usr/bin/env bun
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
 *   bun run surfaces:bake -- --check
 */
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
} from '../lib/types/branded.ts';
import { resolvePath } from './lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CHECK = Bun.argv.includes('--check');
const TOML = `${ROOT}/config/surfaces.toml`;

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
    source: 'config/surfaces.toml (dig+curl verified 2026-07-28)',
    surfaces,
    publishLanes: lanes,
    crossCheck: { ok: issues.length === 0, issues },
    summary: {
      ...summary,
      crossCheckOk: issues.length === 0,
    },
  };

  await Bun.write(
    `${ROOT}/public/registry/surfaces-state.json`,
    JSON.stringify(state, null, 2) + '\n'
  );
  console.log('→ public/registry/surfaces-state.json');
  console.log(
    `surfaces-state  total=${summary.total}  apexes=${summary.apexes.length}  backend=${JSON.stringify(summary.byBackendCode)}  accessDomains=${summary.accessDomains.length}  crossCheck=${issues.length === 0 ? 'ok' : 'DRIFT'}`
  );
  for (const i of issues) console.log(`  ✗ ${i}`);
  if (CHECK && issues.length > 0) process.exit(1);
}

if (import.meta.main) await main();
