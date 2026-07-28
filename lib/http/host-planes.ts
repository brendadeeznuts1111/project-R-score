// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port/hostname
/**
 * Host planes — stop conflating Bun.serve bind hostname with DNS HostId.
 *
 * Two planes share English words ("host", "hostname", "domain") but different
 * types, defaults, and SSOTs. This matrix is the data map for CLI/docs.
 *
 * Bind plane:  Bun.serve({ port, hostname }) · serve-public · bind.json
 * DNS plane:   HostId / ApexDomainId / SubdomainId · config/surfaces.toml
 *
 * Operator: docs/harness/tenants/serve-public-bind.md
 * Brands:   lib/types/branded/surfaces.ts · bun run brand:status
 */

export type HostPlane = 'bind' | 'dns' | 'access' | 'pages';

export type HostPlaneRow = {
  /** Stable row id for tables / agents. */
  id: string; // brand-ok — opaque plane-map row key
  plane: HostPlane;
  /** Human label in CLI tables. */
  concept: string;
  /** Type or Bun field (not always a brand). */
  typeOrField: string;
  /** Example wire/runtime value. */
  example: string;
  /** Where the value is owned. */
  ssot: string;
  /** One-line "is / is not". */
  note: string;
};

/**
 * Cross-plane vocabulary — keep bind hostname out of HostId columns.
 * Order: bind → dns → access → pages (local listen before public edge).
 */
export const HOST_PLANE_MAP: readonly HostPlaneRow[] = [
  {
    id: 'bind.port',
    plane: 'bind',
    concept: 'listen port',
    typeOrField: 'server.port (number)',
    example: '3000',
    ssot: 'Bun.serve omit port → BUN_PORT→PORT→NODE_PORT→3000',
    note: 'Not a brand. After bind read server.port / bind.json — never guess.',
  },
  {
    id: 'bind.hostname',
    plane: 'bind',
    concept: 'listen hostname',
    typeOrField: 'server.hostname (string)',
    example: '0.0.0.0 | localhost | 127.0.0.1',
    ssot: 'Bun.serve({ hostname }) · HOST / BIND_HOST · serve-public.toml',
    note: 'OS bind address. NOT HostId. Docs default 0.0.0.0; macOS canary often localhost.',
  },
  {
    id: 'bind.loopback',
    plane: 'bind',
    concept: 'loopback origin',
    typeOrField: 'loopbackOrigin (URL string)',
    example: 'http://127.0.0.1:3000',
    ssot: 'lib/http/bun-server.ts serverLoopbackOrigin · .serve-public/bind.json',
    note: 'Maps 0.0.0.0 → 127.0.0.1 for browser/verify. Still not a public FQDN.',
  },
  {
    id: 'dns.host',
    plane: 'dns',
    concept: 'public FQDN',
    typeOrField: 'HostId',
    example: 'score.factory-wager.com',
    ssot: 'config/surfaces.toml host · lib/types/branded/surfaces.ts',
    note: 'DNS name only — no scheme/path. Never pass Access host/path here.',
  },
  {
    id: 'dns.apex',
    plane: 'dns',
    concept: 'zone apex',
    typeOrField: 'ApexDomainId',
    example: 'factory-wager.com',
    ssot: 'FACTORY_WAGER_APEX · splitHostId',
    note: 'Zone root. Distinct from bind hostname and from SurfaceId.',
  },
  {
    id: 'dns.subdomain',
    plane: 'dns',
    concept: 'DNS left labels',
    typeOrField: 'SubdomainId',
    example: 'score | @',
    ssot: 'splitHostId · hostIdFromParts',
    note: '@ = bare apex. Not SurfaceId (pages_dev ≠ project-r-score).',
  },
  {
    id: 'dns.surface',
    plane: 'dns',
    concept: 'inventory key',
    typeOrField: 'SurfaceId',
    example: 'score | pages_dev | ledger',
    ssot: 'config/surfaces.toml [surfaces.*] key',
    note: 'Config key — may differ from DNS SubdomainId.',
  },
  {
    id: 'access.domain',
    plane: 'access',
    concept: 'Access app domain',
    typeOrField: 'AccessDomainId',
    example: 'score.factory-wager.com/portal',
    ssot: 'surfaces.toml accessSubpaths · Cloudflare Access',
    note: 'Host or host/path. Never assign to HostId.',
  },
  {
    id: 'pages.project',
    plane: 'pages',
    concept: 'Pages project',
    typeOrField: 'PagesProjectId',
    example: 'project-r-score',
    ssot: 'CLOUDFLARE_DEFAULTS.pages.project · surfaces backend field',
    note: 'CF Pages project slug — not operations ProjectId.',
  },
] as const;

/** Planes in display order. */
export const HOST_PLANES: readonly HostPlane[] = ['bind', 'dns', 'access', 'pages'] as const;

export function hostPlaneRows(plane?: HostPlane): readonly HostPlaneRow[] {
  if (!plane) return HOST_PLANE_MAP;
  return HOST_PLANE_MAP.filter(r => r.plane === plane);
}

/** Compact CLI/table rows (concept · type · example · plane). */
export function hostPlaneTableRows(plane?: HostPlane): Array<{
  plane: HostPlane;
  concept: string;
  typeOrField: string;
  example: string;
  note: string;
}> {
  return hostPlaneRows(plane).map(r => ({
    plane: r.plane,
    concept: r.concept,
    typeOrField: r.typeOrField,
    example: r.example,
    note: r.note,
  }));
}
