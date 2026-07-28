// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
/**
 * Surface inventory — parse-once loader for config/surfaces.toml.
 *
 * Domain brands minted at the TOML boundary (never bare host/status strings interior):
 *   HostId · ApexDomainId · SubdomainId · SurfaceId · PagesProjectId
 *   PublishLaneId · AccessDomainId · SurfaceStatusCode · SurfaceAccessCode · SurfaceBackendCode
 *
 * SSOT: config/surfaces.toml · bake: scripts/bake-surfaces.ts
 * Brands: lib/types/branded/surfaces.ts
 */
import {
  accessDomainFromHost,
  asHostId,
  asPublishLaneId,
  asSurfaceAccessCode,
  asSurfaceId,
  asSurfaceStatusCode,
  splitHostId,
  surfaceBackendCodeFromBackend,
  tryPagesProjectIdFromBackend,
  type AccessDomainId,
  type ApexDomainId,
  type HostId,
  type PagesProjectId,
  type PublishLaneId,
  type SubdomainId,
  type SurfaceAccessCode,
  type SurfaceBackendCode,
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

/** Interior surface record — fully branded + derived shortcodes. */
export type SurfaceRecord = {
  id: SurfaceId;
  host: HostId;
  /** Zone apex split from host (e.g. factory-wager.com or pages.dev). */
  apex: ApexDomainId;
  /** DNS labels under apex (`score`, `@`, `project-r-score` for pages.dev). */
  subdomain: SubdomainId;
  backend: string;
  backendCode: SurfaceBackendCode;
  /** Pages project shortcode when backend is cloudflare-pages:… */
  pagesProject?: PagesProjectId;
  status: SurfaceStatusCode;
  protocol: string;
  access: SurfaceAccessCode;
  note: string;
  accessSubpaths?: SurfaceAccessSubpath[];
};

export type PublishLaneWire = {
  lane: string;
  protocol: string;
  entry: string;
  auth: string;
  note: string;
};

export type PublishLaneRecord = {
  id: PublishLaneId;
  protocol: string;
  entry: string;
  auth: string;
  note: string;
};

export type SurfacesInventory = {
  surfaces: readonly SurfaceRecord[];
  publishLanes: readonly PublishLaneRecord[];
  byId: ReadonlyMap<SurfaceId, SurfaceRecord>;
  byHost: ReadonlyMap<HostId, SurfaceRecord>;
  /** First surface for each DNS subdomain label (under any apex). */
  bySubdomain: ReadonlyMap<SubdomainId, readonly SurfaceRecord[]>;
  byPagesProject: ReadonlyMap<PagesProjectId, readonly SurfaceRecord[]>;
  byStatus: ReadonlyMap<SurfaceStatusCode, readonly SurfaceRecord[]>;
  byAccess: ReadonlyMap<SurfaceAccessCode, readonly SurfaceRecord[]>;
  byBackendCode: ReadonlyMap<SurfaceBackendCode, readonly SurfaceRecord[]>;
};

type SurfacesToml = {
  surfaces: Record<string, SurfaceWire>;
  publish?: Record<string, PublishLaneWire>;
};

function groupBy<K, V>(items: readonly V[], keyOf: (v: V) => K | undefined): Map<K, V[]> {
  const m = new Map<K, V[]>();
  for (const item of items) {
    const k = keyOf(item);
    if (k === undefined) continue;
    const arr = m.get(k);
    if (arr) arr.push(item);
    else m.set(k, [item]);
  }
  return m;
}

export function parseSurfaceRecord(rawKey: string, wire: SurfaceWire): SurfaceRecord {
  const accessSubpaths = wire.accessSubpaths?.map(sp => ({
    path: sp.path,
    access: asSurfaceAccessCode(sp.access) as Extract<SurfaceAccessCode, 'applied' | 'staged'>,
  }));
  for (const sp of accessSubpaths ?? []) {
    if (sp.access !== 'applied' && sp.access !== 'staged') {
      throw new Error(
        `surfaces.toml [${rawKey}]: accessSubpaths.access must be applied|staged (got ${sp.access})`
      );
    }
  }
  const host = asHostId(wire.host);
  const { apex, subdomain } = splitHostId(host);
  const backendCode = surfaceBackendCodeFromBackend(wire.backend);
  return {
    id: asSurfaceId(rawKey),
    host,
    apex,
    subdomain,
    backend: wire.backend,
    backendCode,
    pagesProject: tryPagesProjectIdFromBackend(wire.backend),
    status: asSurfaceStatusCode(wire.status),
    protocol: wire.protocol,
    access: asSurfaceAccessCode(wire.access),
    note: wire.note,
    accessSubpaths,
  };
}

export function parsePublishLane(wire: PublishLaneWire): PublishLaneRecord {
  return {
    id: asPublishLaneId(wire.lane),
    protocol: wire.protocol,
    entry: wire.entry,
    auth: wire.auth,
    note: wire.note,
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

export function surfacesForSubdomain(
  inventory: SurfacesInventory,
  subdomain: SubdomainId
): readonly SurfaceRecord[] {
  return inventory.bySubdomain.get(subdomain) ?? [];
}

export function surfacesForPagesProject(
  inventory: SurfacesInventory,
  project: PagesProjectId
): readonly SurfaceRecord[] {
  return inventory.byPagesProject.get(project) ?? [];
}

export function surfacesForStatus(
  inventory: SurfacesInventory,
  status: SurfaceStatusCode
): readonly SurfaceRecord[] {
  return inventory.byStatus.get(status) ?? [];
}

export function surfacesForAccess(
  inventory: SurfacesInventory,
  access: SurfaceAccessCode
): readonly SurfaceRecord[] {
  return inventory.byAccess.get(access) ?? [];
}

export function surfacesForBackendCode(
  inventory: SurfacesInventory,
  kind: SurfaceBackendCode
): readonly SurfaceRecord[] {
  return inventory.byBackendCode.get(kind) ?? [];
}

/** Derive apex + DNS subdomain labels from a surface's HostId. */
export function hostPartsForSurface(surface: SurfaceRecord): {
  apex: ApexDomainId;
  subdomain: SubdomainId;
} {
  return { apex: surface.apex, subdomain: surface.subdomain };
}

export type SurfacesInventorySummary = {
  total: number;
  lanes: number;
  byStatus: Record<string, number>;
  byAccess: Record<string, number>;
  byBackendCode: Record<string, number>;
  accessDomains: string[];
  pagesProjects: string[];
  apexes: string[];
};

export function summarizeInventory(inventory: SurfacesInventory): SurfacesInventorySummary {
  const byStatus: Record<string, number> = {};
  const byAccess: Record<string, number> = {};
  const byBackendCode: Record<string, number> = {};
  for (const [k, rows] of inventory.byStatus) byStatus[String(k)] = rows.length;
  for (const [k, rows] of inventory.byAccess) byAccess[String(k)] = rows.length;
  for (const [k, rows] of inventory.byBackendCode) byBackendCode[String(k)] = rows.length;
  return {
    total: inventory.surfaces.length,
    lanes: inventory.publishLanes.length,
    byStatus,
    byAccess,
    byBackendCode,
    accessDomains: declaredAccessDomains(inventory).map(String).sort(),
    pagesProjects: [...inventory.byPagesProject.keys()].map(String).sort(),
    apexes: [...new Set(inventory.surfaces.map(s => String(s.apex)))].sort(),
  };
}

export function parseSurfacesToml(text: string): SurfacesInventory {
  const inv = Bun.TOML.parse(text) as SurfacesToml;
  if (!inv?.surfaces || typeof inv.surfaces !== 'object') {
    throw new Error('surfaces.toml: missing [surfaces.*] tables');
  }
  const surfaces = Object.entries(inv.surfaces).map(([key, wire]) => parseSurfaceRecord(key, wire));
  const publishLanes = inv.publish
    ? Object.values(inv.publish).map(wire => parsePublishLane(wire))
    : [];
  const byId = new Map<SurfaceId, SurfaceRecord>();
  const byHost = new Map<HostId, SurfaceRecord>();
  for (const s of surfaces) {
    byId.set(s.id, s);
    byHost.set(s.host, s);
  }
  return {
    surfaces,
    publishLanes,
    byId,
    byHost,
    bySubdomain: groupBy(surfaces, s => s.subdomain),
    byPagesProject: groupBy(surfaces, s => s.pagesProject),
    byStatus: groupBy(surfaces, s => s.status),
    byAccess: groupBy(surfaces, s => s.access),
    byBackendCode: groupBy(surfaces, s => s.backendCode),
  };
}

export async function loadSurfacesInventory(tomlPath: string): Promise<SurfacesInventory> {
  const text = await Bun.file(tomlPath).text();
  return parseSurfacesToml(text);
}
