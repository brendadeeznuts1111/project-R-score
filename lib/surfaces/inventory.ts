// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
/**
 * Surface inventory — parse-once loader for config/surfaces.toml.
 *
 * Domain brands (HostId · ApexDomainId · SubdomainId · SurfaceId · AccessDomainId)
 * are minted at the TOML boundary. Interior consumers import this module instead
 * of re-parsing hosts.
 *
 * SSOT: config/surfaces.toml · bake: scripts/bake-surfaces.ts
 * Brands: lib/types/branded/surfaces.ts
 */
import {
  accessDomainFromHost,
  asHostId,
  asSurfaceAccessCode,
  asSurfaceId,
  asSurfaceStatusCode,
  splitHostId,
  tryPagesProjectIdFromBackend,
  type AccessDomainId,
  type ApexDomainId,
  type HostId,
  type PagesProjectId,
  type SubdomainId,
  type SurfaceAccessCode,
  type SurfaceId,
  type SurfaceStatusCode,
} from '../types/branded.ts';

/** @deprecated use SurfaceStatusCode */
export type SurfaceStatus = SurfaceStatusCode;
/** @deprecated use SurfaceAccessCode */
export type SurfaceAccess = SurfaceAccessCode;

export type SurfaceAccessSubpath = {
  path: string;
  access: Extract<SurfaceAccessCode, 'applied' | 'staged'>;
};

/** Wire shape of one [surfaces.*] table before branding. */
export type SurfaceWire = {
  host: string;
  backend: string;
  status: string;
  protocol: string;
  access: string;
  note: string;
  accessSubpaths?: Array<{ path: string; access: string }>;
};

/** Interior surface record — ids, hosts, and type codes are branded. */
export type SurfaceRecord = {
  id: SurfaceId;
  host: HostId;
  backend: string;
  /** Pages project shortcode when backend is cloudflare-pages:… */
  pagesProject?: PagesProjectId;
  status: SurfaceStatusCode;
  protocol: string;
  access: SurfaceAccessCode;
  note: string;
  accessSubpaths?: SurfaceAccessSubpath[];
};

export type PublishLane = {
  lane: string;
  protocol: string;
  entry: string;
  auth: string;
  note: string;
};

export type SurfacesInventory = {
  surfaces: readonly SurfaceRecord[];
  publishLanes: readonly PublishLane[];
  byId: ReadonlyMap<SurfaceId, SurfaceRecord>;
  byHost: ReadonlyMap<HostId, SurfaceRecord>;
};

type SurfacesToml = {
  surfaces: Record<string, SurfaceWire>;
  publish?: Record<string, PublishLane>;
};

export function parseSurfaceRecord(rawKey: string, wire: SurfaceWire): SurfaceRecord {
  const accessSubpaths = wire.accessSubpaths?.map(sp => ({
    path: sp.path,
    access: asSurfaceAccessCode(sp.access) as Extract<SurfaceAccessCode, 'applied' | 'staged'>,
  }));
  // Subpath access must be applied|staged only
  for (const sp of accessSubpaths ?? []) {
    if (sp.access !== 'applied' && sp.access !== 'staged') {
      throw new Error(
        `surfaces.toml [${rawKey}]: accessSubpaths.access must be applied|staged (got ${sp.access})`
      );
    }
  }
  return {
    id: asSurfaceId(rawKey),
    host: asHostId(wire.host),
    backend: wire.backend,
    pagesProject: tryPagesProjectIdFromBackend(wire.backend),
    status: asSurfaceStatusCode(wire.status),
    protocol: wire.protocol,
    access: asSurfaceAccessCode(wire.access),
    note: wire.note,
    accessSubpaths,
  };
}

/** Access domains declared for a surface (whole-host + path-scoped subpaths). */
export function accessDomainsForSurface(surface: SurfaceRecord): AccessDomainId[] {
  const out: AccessDomainId[] = [];
  if (surface.access === 'applied' || surface.access === 'staged') {
    out.push(accessDomainFromHost(surface.host));
  }
  for (const sp of surface.accessSubpaths ?? []) {
    if (sp.access === 'applied' || sp.access === 'staged') {
      out.push(accessDomainFromHost(surface.host, sp.path));
    }
  }
  return out;
}

/** Only *applied* Access domains (policy-as-code / live must cover these). */
export function appliedAccessDomains(surface: SurfaceRecord): AccessDomainId[] {
  const out: AccessDomainId[] = [];
  if (surface.access === 'applied') {
    out.push(accessDomainFromHost(surface.host));
  }
  for (const sp of surface.accessSubpaths ?? []) {
    if (sp.access === 'applied') {
      out.push(accessDomainFromHost(surface.host, sp.path));
    }
  }
  return out;
}

/** All Access domains the inventory claims (applied + staged). */
export function declaredAccessDomains(inventory: SurfacesInventory): AccessDomainId[] {
  const seen = new Set<string>();
  const out: AccessDomainId[] = [];
  for (const s of inventory.surfaces) {
    for (const d of accessDomainsForSurface(s)) {
      const key = String(d);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(d);
    }
  }
  return out;
}

export function findSurfaceById(
  inventory: SurfacesInventory,
  id: SurfaceId
): SurfaceRecord | undefined {
  return inventory.byId.get(id);
}

export function findSurfaceByHost(
  inventory: SurfacesInventory,
  host: HostId
): SurfaceRecord | undefined {
  return inventory.byHost.get(host);
}

/** Derive apex + DNS subdomain labels from a surface's HostId. */
export function hostPartsForSurface(surface: SurfaceRecord): {
  apex: ApexDomainId;
  subdomain: SubdomainId;
} {
  return splitHostId(surface.host);
}

export function parseSurfacesToml(text: string): SurfacesInventory {
  const inv = Bun.TOML.parse(text) as SurfacesToml;
  if (!inv?.surfaces || typeof inv.surfaces !== 'object') {
    throw new Error('surfaces.toml: missing [surfaces.*] tables');
  }
  const surfaces = Object.entries(inv.surfaces).map(([key, wire]) => parseSurfaceRecord(key, wire));
  const publishLanes = inv.publish ? Object.values(inv.publish) : [];
  const byId = new Map<SurfaceId, SurfaceRecord>();
  const byHost = new Map<HostId, SurfaceRecord>();
  for (const s of surfaces) {
    byId.set(s.id, s);
    byHost.set(s.host, s);
  }
  return { surfaces, publishLanes, byId, byHost };
}

export async function loadSurfacesInventory(tomlPath: string): Promise<SurfacesInventory> {
  const text = await Bun.file(tomlPath).text();
  return parseSurfacesToml(text);
}
