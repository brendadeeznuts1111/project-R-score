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
} from '../lib/surfaces/inventory.ts';
import {
  asApexDomainId,
  asHostId,
  asSubdomainId,
  asSurfaceId,
  FACTORY_WAGER_APEX,
  hostIdFromAccessDomain,
  hostIdFromParts,
  isPathScopedAccessDomain,
  splitHostId,
} from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const TOML = `${ROOT}/config/surfaces.toml`;

describe('lib/surfaces/inventory', () => {
  test('loadSurfacesInventory mints SurfaceId and HostId at the TOML boundary', async () => {
    const inv = await loadSurfacesInventory(TOML);
    expect(inv.surfaces.length).toBeGreaterThanOrEqual(10);

    const ledger = findSurfaceById(inv, asSurfaceId('ledger'));
    expect(ledger?.access).toBe('applied');
    expect(ledger?.host).toBe(asHostId('ledger.factory-wager.com'));
    expect(findSurfaceByHost(inv, asHostId('ledger.factory-wager.com'))?.id).toBe(
      asSurfaceId('ledger')
    );

    const score = findSurfaceById(inv, asSurfaceId('score'));
    expect(score?.access).toBe('public');
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
    // staged reasonix is declared but not applied
    expect(applied).not.toContain('reasonix.factory-wager.com');
    const declared = declaredAccessDomains(inv).map(String);
    expect(declared).toContain('reasonix.factory-wager.com');
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
  });
});
