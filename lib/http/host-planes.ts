// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port/hostname
// @see https://bun.com/docs/runtime/http/tls — protocol https when TLS enabled
/**
 * Host planes — stop conflating Bun.serve bind hostname with DNS HostId.
 *
 * Two planes share English words ("host", "hostname", "domain", "protocol") but
 * different types, defaults, and SSOTs. This matrix is the data map for CLI/docs.
 *
 * Bind plane:  Bun.serve({ port, hostname }) · server.protocol · serve-public · bind.json
 * DNS plane:   HostId / ApexDomainId / SubdomainId · config/surfaces.toml (no scheme)
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
    id: 'bind.protocol',
    plane: 'bind',
    concept: 'wire protocol',
    typeOrField: 'server.protocol ("http"|"https"|null)',
    example: 'http | https',
    ssot: 'Bun.serve TLS → https; plain TCP → http; unix → null · bun-server.ts',
    note: 'Bare scheme, no colon. Distinct from URL.protocol. Not part of HostId.',
  },
  {
    id: 'bind.urlProtocol',
    plane: 'bind',
    concept: 'URL scheme',
    typeOrField: 'server.url.protocol (string)',
    example: 'http: | https:',
    ssot: 'server.url · always trailing colon',
    note: 'URL shape of the same listen — must match `${server.protocol}:` on TCP.',
  },
  {
    id: 'bind.loopback',
    plane: 'bind',
    concept: 'loopback origin',
    typeOrField: 'loopbackOrigin (URL string)',
    example: 'http://127.0.0.1:3000',
    ssot: 'lib/http/bun-server.ts serverLoopbackOrigin · .serve-public/bind.json',
    note: 'scheme://loopback:port. Maps 0.0.0.0 → 127.0.0.1. Still not a public FQDN.',
  },
  {
    id: 'dns.host',
    plane: 'dns',
    concept: 'public FQDN',
    typeOrField: 'HostId',
    example: 'score.factory-wager.com',
    ssot: 'config/surfaces.toml host · lib/types/branded/surfaces.ts',
    note: 'DNS name only — no scheme/path. Compose https via httpsUrlForHost(host).',
  },
  {
    id: 'dns.probeUrl',
    plane: 'dns',
    concept: 'probe HTTPS URL',
    typeOrField: 'string (URL) from httpsUrlForHost',
    example: 'https://score.factory-wager.com/',
    ssot: 'httpsUrlForHost / httpsUrlForAccessDomain',
    note: 'Scheme lives on the URL helper, never inside HostId / ApexDomainId.',
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

export function isHostPlane(value: string): value is HostPlane {
  return (HOST_PLANES as readonly string[]).includes(value);
}

export function hostPlaneById(
  id: string /* brand-ok — plane-map row key */
): HostPlaneRow | undefined {
  return HOST_PLANE_MAP.find(r => r.id === id);
}

export function hostPlaneRows(plane?: HostPlane): readonly HostPlaneRow[] {
  if (!plane) return HOST_PLANE_MAP;
  return HOST_PLANE_MAP.filter(r => r.plane === plane);
}

export type HostPlaneTableOpts = {
  plane?: HostPlane;
  /** Include SSOT column (verbose / agent tables). */
  includeSsot?: boolean;
};

/** Compact CLI/table rows (concept · type · example · plane [· ssot]). */
export function hostPlaneTableRows(opts?: HostPlane | HostPlaneTableOpts): Array<{
  plane: HostPlane;
  concept: string;
  typeOrField: string;
  example: string;
  note: string;
  ssot?: string;
}> {
  const normalized: HostPlaneTableOpts =
    typeof opts === 'string' || opts === undefined ? { plane: opts } : opts;
  return hostPlaneRows(normalized.plane).map(r => {
    const row = {
      plane: r.plane,
      concept: r.concept,
      typeOrField: r.typeOrField,
      example: r.example,
      note: r.note,
    };
    return normalized.includeSsot ? { ...row, ssot: r.ssot } : row;
  });
}
