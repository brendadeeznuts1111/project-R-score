// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port/hostname
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port · BUN_PORT · PORT · NODE_PORT
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
 * Server/URL property defaults: lib/http/bun-serve-shape.ts · BUN_SERVE_SHAPE_MATRIX
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
  /** Canonical property / brand / helper. */
  property: string;
  /** TypeScript / brand type. */
  type: string;
  /** Allowed or typical values. */
  values: string;
  /** When option omitted or brand not minted — pre-bind / config default. */
  defaultWhen: string;
  /** Resolution chain, twin field, or busy-port / compose fallback. */
  fallback: string;
  /**
   * Legacy combined column (`property (type)`) for older consumers.
   * Prefer `property` + `type`.
   */
  typeOrField: string;
  /** Short example for dense tables. */
  example: string;
  /** Where the value is owned. */
  ssot: string;
  /** One-line "is / is not". */
  note: string;
};

function row(partial: Omit<HostPlaneRow, 'typeOrField'> & { typeOrField?: string }): HostPlaneRow {
  return {
    ...partial,
    typeOrField: partial.typeOrField ?? `${partial.property} (${partial.type})`,
  };
}

/**
 * Cross-plane vocabulary — keep bind hostname out of HostId columns.
 * Order: bind → dns → access → pages (local listen before public edge).
 */
export const HOST_PLANE_MAP: readonly HostPlaneRow[] = [
  row({
    id: 'bind.port',
    plane: 'bind',
    concept: 'listen port',
    property: 'server.port',
    type: 'number | undefined',
    values: '1–65535 · undefined on unix',
    defaultWhen: 'omit → --port → BUN_PORT → PORT → NODE_PORT → 3000',
    fallback: 'port:0 ephemeral · EADDRINUSE → retry 0 · read after bind',
    example: '3000',
    ssot: 'Bun.serve · resolveBunServeDefaultPort · bind.json',
    note: 'Not a brand. Bun recommend: read server.port / server.url after bind.',
  }),
  row({
    id: 'bind.url',
    plane: 'bind',
    concept: 'listen URL',
    property: 'server.url',
    type: 'URL',
    values: 'http(s)://host:port/',
    defaultWhen: 'derived after bind (not an option)',
    fallback: '0.0.0.0 → prefer loopbackOrigin for browsers',
    example: 'http://localhost:3000/',
    ssot: 'Bun.serve return · serveBindSnapshot',
    note: 'Docs: Server running at ${server.url}. Still not a public HostId.',
  }),
  row({
    id: 'bind.urlPort',
    plane: 'bind',
    concept: 'URL port string',
    property: 'server.url.port',
    type: 'string',
    values: '"3000" · "" on 80/443',
    defaultWhen: 'n/a — mirror of listen',
    fallback: 'empty ≠ missing; twin of server.port',
    example: '3000',
    ssot: 'URL.port · ServerIdentity.urlPort',
    note: 'String twin of server.port — do not Number("") for defaults.',
  }),
  row({
    id: 'bind.hostname',
    plane: 'bind',
    concept: 'listen hostname',
    property: 'server.hostname',
    type: 'string | undefined',
    values: '0.0.0.0 · localhost · 127.0.0.1',
    defaultWhen: 'docs 0.0.0.0 · canary often localhost when omitted',
    fallback: 'undefined on unix · HOST/BIND_HOST · serve-public.toml',
    example: '0.0.0.0 | localhost',
    ssot: 'Bun.serve({ hostname }) · HOST / BIND_HOST',
    note: 'OS bind address. NOT HostId.',
  }),
  row({
    id: 'bind.protocol',
    plane: 'bind',
    concept: 'wire protocol',
    property: 'server.protocol',
    type: '"http" | "https" | null',
    values: 'http · https · null',
    defaultWhen: 'plain TCP → http · tls → https',
    fallback: 'null on unix · missing from published #reference',
    example: 'http | https',
    ssot: 'Bun.serve TLS · bun-server.ts',
    note: 'Bare scheme, no colon. Not part of HostId.',
  }),
  row({
    id: 'bind.urlProtocol',
    plane: 'bind',
    concept: 'URL scheme',
    property: 'server.url.protocol',
    type: 'string',
    values: 'http: · https:',
    defaultWhen: 'n/a — `${server.protocol}:` on TCP',
    fallback: 'always trailing colon',
    example: 'http: | https:',
    ssot: 'server.url · URL.protocol',
    note: 'Must match `${server.protocol}:` on TCP.',
  }),
  row({
    id: 'bind.loopback',
    plane: 'bind',
    concept: 'loopback origin',
    property: 'loopbackOrigin',
    type: 'string (URL origin)',
    values: 'http://127.0.0.1:PORT',
    defaultWhen: 'after bind from server + hostname rewrite',
    fallback: 'maps 0.0.0.0 → 127.0.0.1 · bind.json',
    example: 'http://127.0.0.1:3000',
    ssot: 'lib/http/bun-server.ts · .serve-public/bind.json',
    note: 'scheme://loopback:port. Still not a public FQDN.',
  }),
  row({
    id: 'dns.host',
    plane: 'dns',
    concept: 'public FQDN',
    property: 'HostId',
    type: 'HostId',
    values: 'labels.apex (no scheme/path)',
    defaultWhen: 'surfaces.toml host required',
    fallback: 'hostIdFromParts · hostIdFromUrl (strip scheme)',
    example: 'score.factory-wager.com',
    ssot: 'config/surfaces.toml · lib/types/branded/surfaces.ts',
    note: 'DNS name only. Compose https via httpsUrlForHost(host).',
  }),
  row({
    id: 'dns.probeUrl',
    plane: 'dns',
    concept: 'probe HTTPS URL',
    property: 'httpsUrlForHost',
    type: 'string (URL)',
    values: 'https://host/…',
    defaultWhen: 'path default /',
    fallback: 'httpsUrlForAccessDomain for path-scoped Access',
    example: 'https://score.factory-wager.com/',
    ssot: 'httpsUrlForHost / httpsUrlForAccessDomain',
    note: 'Scheme lives on the URL helper, never inside HostId.',
  }),
  row({
    id: 'dns.apex',
    plane: 'dns',
    concept: 'zone apex',
    property: 'ApexDomainId',
    type: 'ApexDomainId',
    values: 'factory-wager.com · pages.dev · …',
    defaultWhen: 'FACTORY_WAGER_APEX for known zone',
    fallback: 'splitHostId public-suffix heuristic',
    example: 'factory-wager.com',
    ssot: 'FACTORY_WAGER_APEX · splitHostId',
    note: 'Zone root. Distinct from bind hostname and SurfaceId.',
  }),
  row({
    id: 'dns.subdomain',
    plane: 'dns',
    concept: 'DNS left labels',
    property: 'SubdomainId',
    type: 'SubdomainId',
    values: 'score · @ (bare apex)',
    defaultWhen: 'n/a — from split',
    fallback: 'hostIdFromParts(apex, sub)',
    example: 'score | @',
    ssot: 'splitHostId · hostIdFromParts',
    note: '@ = bare apex. Not SurfaceId (pages_dev ≠ project-r-score).',
  }),
  row({
    id: 'dns.surface',
    plane: 'dns',
    concept: 'inventory key',
    property: 'SurfaceId',
    type: 'SurfaceId',
    values: 'score · pages_dev · ledger',
    defaultWhen: 'surfaces.toml [surfaces.*] key',
    fallback: 'may ≠ DNS SubdomainId',
    example: 'score | pages_dev | ledger',
    ssot: 'config/surfaces.toml [surfaces.*] key',
    note: 'Config key — may differ from DNS SubdomainId.',
  }),
  row({
    id: 'access.domain',
    plane: 'access',
    concept: 'Access app domain',
    property: 'AccessDomainId',
    type: 'AccessDomainId',
    values: 'host · host/path',
    defaultWhen: 'accessSubpaths in surfaces.toml',
    fallback: 'accessDomainFromHost · hostIdFromAccessDomain',
    example: 'score.factory-wager.com/portal',
    ssot: 'surfaces.toml accessSubpaths · Cloudflare Access',
    note: 'Host or host/path. Never assign to HostId.',
  }),
  row({
    id: 'pages.project',
    plane: 'pages',
    concept: 'Pages project',
    property: 'PagesProjectId',
    type: 'PagesProjectId',
    values: 'project-r-score · …',
    defaultWhen: 'CLOUDFLARE_DEFAULTS.pages.project',
    fallback: 'pagesDevHostForProject → HostId',
    example: 'project-r-score',
    ssot: 'CLOUDFLARE_DEFAULTS.pages.project · surfaces backend',
    note: 'CF Pages project slug — not operations ProjectId.',
  }),
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
  /** Include SSOT column. */
  includeSsot?: boolean;
  /** Include property · type · values · default · fallback (verbose bind view). */
  includeDefaults?: boolean;
};

/** Compact CLI/table rows. */
export function hostPlaneTableRows(opts?: HostPlane | HostPlaneTableOpts): Array<{
  plane: HostPlane;
  concept: string;
  property?: string;
  type?: string;
  typeOrField: string;
  values?: string;
  default?: string;
  fallback?: string;
  example: string;
  note: string;
  ssot?: string;
}> {
  const normalized: HostPlaneTableOpts =
    typeof opts === 'string' || opts === undefined ? { plane: opts } : opts;
  return hostPlaneRows(normalized.plane).map(r => {
    const base = {
      plane: r.plane,
      concept: r.concept,
      typeOrField: r.typeOrField,
      example: r.example,
      note: r.note,
    };
    const withSsot = normalized.includeSsot ? { ...base, ssot: r.ssot } : base;
    if (!normalized.includeDefaults) return withSsot;
    return {
      ...withSsot,
      property: r.property,
      type: r.type,
      values: r.values,
      default: r.defaultWhen,
      fallback: r.fallback,
    };
  });
}
