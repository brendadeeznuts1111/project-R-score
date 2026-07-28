// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
/**
 * Surface inventory — parse-once loader for config/surfaces.toml.
 *
 * Domain brands (HostId · SurfaceId · AccessDomainId) are minted at the TOML
 * boundary. Interior consumers import this module instead of re-parsing hosts.
 *
 * SSOT: config/surfaces.toml · bake: scripts/bake-surfaces.ts
 * Brands: lib/types/branded/surfaces.ts
 */
import {
  accessDomainFromHost,
  asHostId,
  asSurfaceId,
  type AccessDomainId,
  type HostId,
  type SurfaceId,
} from '../types/branded.ts';

export type SurfaceStatus =
  | 'live'
  | 'vanity'
  | 'broken'
  | 'dangling'
  | 'staged'
  | 'placeholder'
  | 'external';

export type SurfaceAccess =
  | 'public'
  | 'allowlist'
  | 'applied'
  | 'staged'
  | 'bearer (intended)'
  | 'external'
  | 'none';

export type SurfaceAccessSubpath = {
  path: string;
  access: 'applied' | 'staged';
};

/** Wire shape of one [surfaces.*] table before branding. */
export type SurfaceWire = {
  host: string;
  backend: string;
  status: SurfaceStatus;
  protocol: string;
  access: SurfaceAccess;
  note: string;
  accessSubpaths?: SurfaceAccessSubpath[];
};

/** Interior surface record — ids and hosts are branded. */
export type SurfaceRecord = {
  id: SurfaceId;
  host: HostId;
  backend: string;
  status: SurfaceStatus;
  protocol: string;
  access: SurfaceAccess;
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
  return {
    id: asSurfaceId(rawKey),
    host: asHostId(wire.host),
    backend: wire.backend,
    status: wire.status,
    protocol: wire.protocol,
    access: wire.access,
    note: wire.note,
    accessSubpaths: wire.accessSubpaths,
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
