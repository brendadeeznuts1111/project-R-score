// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  accessDomainsForSurface,
  appliedAccessDomains,
  declaredAccessDomains,
  findSurfaceByHost,
  findSurfaceById,
  hostPartsForSurface,
  loadSurfacesInventory,
  parseSurfacesToml,
  summarizeInventory,
  surfacesForBackendCode,
  surfacesForStatus,
  surfacesForSubdomain,
} from '../lib/surfaces/inventory.ts';
import {
  asApexDomainId,
  asHostId,
  asSubdomainId,
  asSurfaceBackendCode,
  asSurfaceId,
  asSurfaceStatusCode,
  FACTORY_WAGER_APEX,
  hostIdFromAccessDomain,
  hostIdFromParts,
  isPathScopedAccessDomain,
  PROJECT_R_SCORE_PAGES,
  splitHostId,
} from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const TOML = `${ROOT}/config/surfaces.toml`;

describe('lib/surfaces/inventory', () => {
  test('loadSurfacesInventory mints SurfaceId, HostId, and type codes at the TOML boundary', async () => {
    const inv = await loadSurfacesInventory(TOML);
    expect(inv.surfaces.length).toBeGreaterThanOrEqual(10);

    const ledger = findSurfaceById(inv, asSurfaceId('ledger'));
    expect(ledger?.access).toBe('applied');
    expect(ledger?.status).toBe('live');
    expect(ledger?.host).toBe(asHostId('ledger.factory-wager.com'));
    expect(findSurfaceByHost(inv, asHostId('ledger.factory-wager.com'))?.id).toBe(
      asSurfaceId('ledger')
    );

    const score = findSurfaceById(inv, asSurfaceId('score'));
    expect(score?.access).toBe('public');
    expect(score?.pagesProject).toBe('project-r-score');
    const applied = appliedAccessDomains(score!);
    expect(applied.map(String)).toContain('score.factory-wager.com/portal');
    expect(applied.every(d => isPathScopedAccessDomain(d) || d === score!.host)).toBeTrue();
  });

  test('applied Access domains include pages.dev portal and ledger whole-host', async () => {
    const inv = await loadSurfacesInventory(TOML);
    const applied = inv.surfaces.flatMap(appliedAccessDomains).map(String).sort();
    expect(applied).toContain('ledger.factory-wager.com');
    expect(applied).toContain('score.factory-wager.com/portal');
    expect(applied).toContain('project-r-score.pages.dev/portal');
    // Decommissioned reasonix is retained as retired inventory only; it owns no Access domain.
    expect(applied).not.toContain('reasonix.factory-wager.com');
    const declared = declaredAccessDomains(inv).map(String);
    expect(declared).not.toContain('reasonix.factory-wager.com');
  });

  test('accessDomainsForSurface keeps HostId out of path-bearing values', async () => {
    const inv = await loadSurfacesInventory(TOML);
    const pages = findSurfaceById(inv, asSurfaceId('pages_dev'))!;
    const domains = accessDomainsForSurface(pages);
    for (const d of domains) {
      if (isPathScopedAccessDomain(d)) {
        expect(hostIdFromAccessDomain(d)).toBe(pages.host);
      }
    }
  });

  test('parseSurfacesToml rejects empty inventory', () => {
    expect(() => parseSurfacesToml('')).toThrow(/missing/);
  });

  test('splitHostId / hostIdFromParts round-trip apex and subdomain', () => {
    const ledger = asHostId('ledger.factory-wager.com');
    const parts = splitHostId(ledger);
    expect(parts.apex).toBe(FACTORY_WAGER_APEX);
    expect(parts.subdomain).toBe(asSubdomainId('ledger'));
    expect(hostIdFromParts(parts.apex, parts.subdomain)).toBe(ledger);

    const apexHost = asHostId('factory-wager.com');
    const apexParts = splitHostId(apexHost);
    expect(apexParts.apex).toBe(asApexDomainId('factory-wager.com'));
    expect(apexParts.subdomain).toBe(asSubdomainId('@'));
    expect(hostIdFromParts(apexParts.apex, apexParts.subdomain)).toBe(apexHost);

    const pages = asHostId('project-r-score.pages.dev');
    const pagesParts = splitHostId(pages);
    expect(String(pagesParts.apex)).toBe('pages.dev');
    expect(String(pagesParts.subdomain)).toBe('project-r-score');
    expect(hostIdFromParts(pagesParts.apex, pagesParts.subdomain)).toBe(pages);
  });

  test('hostPartsForSurface derives apex/subdomain from inventory HostId', async () => {
    const inv = await loadSurfacesInventory(TOML);
    const ledger = findSurfaceById(inv, asSurfaceId('ledger'))!;
    const parts = hostPartsForSurface(ledger);
    expect(parts.apex).toBe(FACTORY_WAGER_APEX);
    expect(parts.subdomain).toBe(asSubdomainId('ledger'));
    expect(ledger.apex).toBe(parts.apex);
    expect(ledger.subdomain).toBe(parts.subdomain);
    expect(ledger.backendCode).toBe('cloudflared');
  });

  test('indexes: subdomain · status · backend · pages project · publish lanes', async () => {
    const inv = await loadSurfacesInventory(TOML);
    const scoreRows = surfacesForSubdomain(inv, asSubdomainId('score'));
    expect(scoreRows.some(s => s.id === asSurfaceId('score'))).toBeTrue();

    const live = surfacesForStatus(inv, asSurfaceStatusCode('live'));
    expect(live.length).toBeGreaterThanOrEqual(5);

    const pagesBacked = surfacesForBackendCode(inv, asSurfaceBackendCode('cloudflare-pages'));
    expect(pagesBacked.every(s => s.backendCode === 'cloudflare-pages')).toBeTrue();
    expect(pagesBacked.some(s => s.pagesProject === PROJECT_R_SCORE_PAGES)).toBeTrue();

    expect(inv.publishLanes.map(l => String(l.id)).sort()).toEqual([
      'local-gateway',
      'local-npm',
      'prod-write',
    ]);

    const summary = summarizeInventory(inv);
    expect(summary.total).toBe(inv.surfaces.length);
    expect(summary.apexes).toContain('factory-wager.com');
    expect(summary.apexes).toContain('pages.dev');
    expect(summary.pagesProjects).toContain('project-r-score');
    expect(summary.accessDomains).toContain('score.factory-wager.com/portal');
    expect(summary.byBackendCode['cloudflare-pages']).toBeGreaterThan(0);
  });
});
