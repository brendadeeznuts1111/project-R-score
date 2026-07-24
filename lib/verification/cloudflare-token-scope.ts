// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
/**
 * Cloudflare token scope verification + MCP catalog parity (Layer 2 + Layer 5).
 *
 * Claim: `cloudflare-pages-env-ssot` · Tenant: docs/harness/tenants/cloudflare-pages.md
 */
import { CryptoHasher, revision, version } from 'bun';
import { asAccountId, asZoneId, type AccountId, type ZoneId } from '../types/branded.ts';
import { joinPath } from '../path-bun.ts';
import { buildSemanticTags } from './channels.ts';

async function r2Env() {
  return import('../../config/r2-env.ts');
}

export const CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH = '/registry/cloudflare-token-scope-proof.json';
export const CLOUDFLARE_WELL_KNOWN_MCP_PATH = '/.well-known/mcp.json';

export const CLOUDFLARE_MCP_HTTP_SERVERS = [
  { name: 'cloudflare', url: 'https://mcp.cloudflare.com/mcp' },
  { name: 'cloudflare-docs', url: 'https://docs.mcp.cloudflare.com/mcp' },
  { name: 'cloudflare-bindings', url: 'https://bindings.mcp.cloudflare.com/mcp' },
  { name: 'cloudflare-builds', url: 'https://builds.mcp.cloudflare.com/mcp' },
  { name: 'cloudflare-observability', url: 'https://observability.mcp.cloudflare.com/mcp' },
] as const;

export type CloudflareTokenTier = 'minimal' | 'mcp-full' | 'over-broad' | 'unknown';

export type CloudflareTokenScopeReport = {
  ok: boolean;
  tier: CloudflareTokenTier;
  tokenKind: 'user' | 'account';
  verify: { status: string; id?: string }; // brand-ok — Cloudflare verify API opaque token id
  permissions: string[];
  resources: string[];
  pins: {
    accountPinned: boolean;
    zonePinned: boolean;
    accountWildcard: boolean;
    zoneWildcard: boolean;
  };
  probes: {
    pages: { ok: boolean; project: string; status?: number };
    zone: { ok: boolean; name: string; status?: number };
  };
  warnings: string[];
  errors: string[];
};

export type McpCatalogParityRow = {
  name: string;
  repoUrl?: string;
  wellKnownUrl?: string;
  ok: boolean;
};

export type CloudflareTokenScopeProof = {
  type: 'CloudflareTokenScopeProof';
  version: '1.0.0';
  subsystem: 'other';
  timestamp: string;
  bunVersion: string;
  bunRevision: string;
  reportPath: typeof CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH;
  semanticTags: Awaited<ReturnType<typeof buildSemanticTags>> & { subsystems: ['other'] };
  pins: {
    accountId: AccountId;
    pagesProject: string;
    zoneName: string;
    zoneId: ZoneId;
    minimalPermissions: readonly { permission: string; resource: string }[];
  };
  mcpCatalog: {
    ok: boolean;
    serverCount: number;
    rows: McpCatalogParityRow[];
    wellKnownPath: typeof CLOUDFLARE_WELL_KNOWN_MCP_PATH;
    repoCatalog: '.mcp.json';
  };
  liveProbe: {
    available: boolean;
    ok?: boolean;
    tier?: CloudflareTokenTier;
    verify?: CloudflareTokenScopeReport['verify'];
    permissions?: string[];
    warnings?: string[];
    skippedReason?: string;
  };
  summary: {
    ok: boolean;
    status: 'pass' | 'fail' | 'partial';
    tier: CloudflareTokenTier;
    staticOk: boolean;
    liveOk: boolean | null;
  };
  proofHash: string;
  _links?: {
    self: typeof CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH;
    wellKnown: typeof CLOUDFLARE_WELL_KNOWN_MCP_PATH;
    tenant: '/docs/harness/tenants/cloudflare-pages.md';
  };
};

const MINIMAL_PERMISSION_ALIASES: Record<string, string[]> = {
  'Cloudflare Pages:Edit': ['cloudflare pages edit', 'pages edit'],
  'Cloudflare Pages:Read': ['cloudflare pages read', 'pages read'],
  'Zone:DNS:Edit': [
    'zone dns edit',
    'dns edit',
    'dns write',
    'zone dns settings write',
    'zone dns settings edit',
  ],
  'Zone:Read': ['zone read'],
};

type TokenVerifyPolicy = {
  effect?: string;
  resources?: Record<string, string>;
  permission_groups?: Array<{ id?: string; name?: string }>; // brand-ok — CF policy group opaque id
};

type TokenVerifyResult = {
  id?: string; // brand-ok — Cloudflare API opaque token id
  status?: string;
  policies?: TokenVerifyPolicy[];
};

function isAccountApiToken(token: string): boolean {
  return token.startsWith('cfat_');
}

/** User tokens → /user/tokens/verify; account tokens (cfat_) → /accounts/{id}/tokens/verify */
function tokenVerifyUrl(accountId: AccountId, token: string): string {
  if (isAccountApiToken(token)) {
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`;
  }
  return 'https://api.cloudflare.com/client/v4/user/tokens/verify';
}

async function verifyCloudflareToken(
  token: string,
  accountId: AccountId,
  authHeaders: Record<string, string>
): Promise<{ result: TokenVerifyResult; kind: 'user' | 'account' }> {
  const url = tokenVerifyUrl(accountId, token);
  const verifyRes = await fetch(url, { headers: authHeaders });
  if (!verifyRes.ok) {
    throw new Error(`Token verify ${verifyRes.status}: ${await verifyRes.text()}`);
  }
  const verifyBody = (await verifyRes.json()) as {
    success?: boolean;
    result?: TokenVerifyResult;
  };
  if (!verifyBody.success || !verifyBody.result) {
    throw new Error('Token verify returned unsuccessful payload');
  }
  return {
    result: verifyBody.result,
    kind: isAccountApiToken(token) ? 'account' : 'user',
  };
}

function normalizePermissionLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function permissionGroupMatches(required: string, actualNames: string[]): boolean {
  const aliases = MINIMAL_PERMISSION_ALIASES[required] ?? [normalizePermissionLabel(required)];
  return actualNames.some(n => {
    const norm = normalizePermissionLabel(n);
    return aliases.some(a => norm === a || norm.includes(a));
  });
}

function collectPermissionGroups(policies: TokenVerifyPolicy[]): string[] {
  const names = new Set<string>();
  for (const p of policies) {
    for (const g of p.permission_groups ?? []) {
      if (g.name) names.add(g.name);
    }
  }
  return [...names];
}

function collectResourceKeys(policies: TokenVerifyPolicy[]): string[] {
  const keys = new Set<string>();
  for (const p of policies) {
    for (const k of Object.keys(p.resources ?? {})) keys.add(k);
  }
  return [...keys];
}

export function classifyTokenTier(
  permissionNames: string[],
  warnings: string[],
  minimal: readonly { permission: string; resource: string }[]
): CloudflareTokenTier {
  const hasMinimal = minimal.every(({ permission }) =>
    permissionGroupMatches(permission, permissionNames)
  );
  if (!hasMinimal) return 'unknown';

  const hasUnexpected = warnings.some(w => w.startsWith('Unexpected permission group:'));
  const hasWildcard = warnings.some(w => w.includes('account-wide') || w.includes('all-zone'));
  if (hasUnexpected || hasWildcard) return 'over-broad';

  const mcpExtras = permissionNames.filter(name => {
    const isMinimal = minimal.some(({ permission }) => permissionGroupMatches(permission, [name]));
    return !isMinimal;
  });
  if (mcpExtras.length > 0) return 'mcp-full';
  return 'minimal';
}

export async function auditMcpCatalogParity(rootDir = process.cwd()): Promise<{
  ok: boolean;
  rows: McpCatalogParityRow[];
}> {
  const repoPath = joinPath(rootDir, '.mcp.json');
  const wellKnownPath = joinPath(rootDir, 'public/.well-known/mcp.json');
  const repo = JSON.parse(await Bun.file(repoPath).text()) as {
    mcpServers?: Record<string, { url?: string }>;
  };
  const wellKnown = JSON.parse(await Bun.file(wellKnownPath).text()) as {
    servers?: Array<{ name: string; url: string }>;
  };

  const rows: McpCatalogParityRow[] = [];
  for (const { name, url } of CLOUDFLARE_MCP_HTTP_SERVERS) {
    const repoUrl = repo.mcpServers?.[name]?.url;
    const wellKnownEntry = wellKnown.servers?.find(s => s.name === name);
    const wellKnownUrl = wellKnownEntry?.url;
    const ok = repoUrl === url && wellKnownUrl === url;
    rows.push({ name, repoUrl, wellKnownUrl, ok });
  }
  return { ok: rows.every(r => r.ok), rows };
}

/** Soft live probe — returns report without throwing (missing token → available:false). */
export async function tryCloudflareTokenScope(opts?: {
  strict?: boolean;
}): Promise<{ available: boolean; report?: CloudflareTokenScopeReport; error?: string }> {
  try {
    const report = await runCloudflareTokenScopeProbe(opts);
    return { available: true, report };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Missing CLOUDFLARE_API_TOKEN|no wrangler OAuth/i.test(msg)) {
      return { available: false, error: msg };
    }
    return { available: true, report: undefined, error: msg };
  }
}

/** Live Layer 2 probe — throws on hard failures. */
export async function runCloudflareTokenScopeProbe(opts?: {
  strict?: boolean;
}): Promise<CloudflareTokenScopeReport> {
  const {
    CLOUDFLARE_DEFAULTS,
    CLOUDFLARE_TOKEN_PERMISSIONS,
    CLOUDFLARE_ZONE,
    cloudflareAccountIdFromEnv,
    resolveCloudflareApiToken,
  } = await r2Env();
  const strict = opts?.strict ?? false;
  const errors: string[] = [];
  const warnings: string[] = [];
  const token = await resolveCloudflareApiToken();
  const account = asAccountId(cloudflareAccountIdFromEnv());
  const project = CLOUDFLARE_DEFAULTS.pages.project;
  const zoneId = asZoneId(CLOUDFLARE_ZONE.id);
  const zoneName = CLOUDFLARE_ZONE.name;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const { result, kind: tokenKind } = await verifyCloudflareToken(token, account, authHeaders);
  const status = result.status ?? 'unknown';
  if (status !== 'active') {
    errors.push(`Token status is ${status} (expected active)`);
  }

  const policies = result.policies ?? [];
  const permissionNames = collectPermissionGroups(policies);
  const resourceKeys = collectResourceKeys(policies);

  let accountPinned = resourceKeys.some(k => k.includes(account));
  let zonePinned = resourceKeys.some(k => k.includes(zoneId) || k.includes(zoneName));
  let zoneWildcard = resourceKeys.some(k => /zone\.\*/.test(k) || k.endsWith('zone.*'));
  let accountWildcard = resourceKeys.some(k => /account\.\*/.test(k));

  if (tokenKind === 'user') {
    for (const { permission } of CLOUDFLARE_TOKEN_PERMISSIONS.minimal) {
      if (!permissionGroupMatches(permission, permissionNames)) {
        errors.push(`Missing minimal permission: ${permission}`);
      }
    }

    if (!accountPinned && accountWildcard) {
      warnings.push(`Token grants account-wide access (not pinned to ${account})`);
    }
    if (!zonePinned && zoneWildcard) {
      warnings.push(`Token grants all-zone access (not pinned to ${zoneName})`);
    }

    const allowedNormalized = new Set<string>();
    for (const { permission } of CLOUDFLARE_TOKEN_PERMISSIONS.minimal) {
      for (const a of MINIMAL_PERMISSION_ALIASES[permission] ?? []) allowedNormalized.add(a);
    }
    for (const p of CLOUDFLARE_TOKEN_PERMISSIONS.mcpOptional) {
      allowedNormalized.add(normalizePermissionLabel(p));
    }
    for (const name of permissionNames) {
      const norm = normalizePermissionLabel(name);
      const known = [...allowedNormalized].some(a => norm === a || norm.includes(a));
      if (!known) {
        warnings.push(`Unexpected permission group: ${name}`);
      }
    }
  } else {
    accountPinned = true;
    zonePinned = true;
    zoneWildcard = false;
    accountWildcard = false;
  }

  const pagesRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`,
    { headers: authHeaders }
  );
  const pagesOk = pagesRes.ok;
  if (!pagesOk) {
    errors.push(`Pages probe failed ${pagesRes.status} for ${project}`);
  }

  const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
    headers: authHeaders,
  });
  const zoneOk = zoneRes.ok;
  if (!zoneOk) {
    errors.push(`Zone probe failed ${zoneRes.status} for ${zoneName}`);
  } else {
    const zoneBody = (await zoneRes.json()) as { result?: { name?: string } };
    if (zoneBody.result?.name && zoneBody.result.name !== zoneName) {
      errors.push(`Zone name mismatch: ${zoneBody.result.name} (expected ${zoneName})`);
    }
  }

  const tier =
    tokenKind === 'account' && permissionNames.length === 0
      ? pagesOk && zoneOk
        ? ('minimal' as CloudflareTokenTier)
        : ('unknown' as CloudflareTokenTier)
      : classifyTokenTier(permissionNames, warnings, CLOUDFLARE_TOKEN_PERMISSIONS.minimal);
  const report: CloudflareTokenScopeReport = {
    ok: errors.length === 0 && (!strict || warnings.length === 0),
    tier,
    tokenKind,
    verify: { status, id: result.id },
    permissions: permissionNames,
    resources: resourceKeys,
    pins: { accountPinned, zonePinned, accountWildcard, zoneWildcard },
    probes: {
      pages: { ok: pagesOk, project, status: pagesRes.status },
      zone: { ok: zoneOk, name: zoneName, status: zoneRes.status },
    },
    warnings,
    errors,
  };

  if (strict && warnings.length > 0) {
    errors.push(...warnings.map(w => `[strict] ${w}`));
    report.ok = errors.length === 0;
  }

  if (errors.length > 0) {
    throw new Error(
      `Cloudflare token scope check failed: ${errors.join('; ')}${warnings.length ? ` (warnings: ${warnings.join('; ')})` : ''}`
    );
  }

  return report;
}

export async function buildCloudflareTokenScopeProof(opts?: {
  rootDir?: string;
  strict?: boolean;
  live?: boolean;
}): Promise<CloudflareTokenScopeProof> {
  const { CLOUDFLARE_TOKEN_PERMISSIONS } = await r2Env();
  const rootDir = opts?.rootDir ?? process.cwd();
  const live = opts?.live ?? true;
  const catalog = await auditMcpCatalogParity(rootDir);
  const semanticTags = await buildSemanticTags('runtime');

  let liveProbe: CloudflareTokenScopeProof['liveProbe'] = {
    available: false,
    skippedReason: 'live probe disabled',
  };
  let liveOk: boolean | null = null;
  let tier: CloudflareTokenTier = catalog.ok ? 'minimal' : 'unknown';

  if (live) {
    const probe = await tryCloudflareTokenScope({ strict: opts?.strict });
    if (!probe.available) {
      liveProbe = { available: false, skippedReason: probe.error };
      liveOk = null;
    } else if (probe.report) {
      liveProbe = {
        available: true,
        ok: probe.report.ok,
        tier: probe.report.tier,
        verify: probe.report.verify,
        permissions: probe.report.permissions,
        warnings: probe.report.warnings,
      };
      liveOk = probe.report.ok;
      tier = probe.report.tier;
    } else {
      liveProbe = { available: true, ok: false, skippedReason: probe.error };
      liveOk = false;
      tier = 'unknown';
    }
  }

  const staticOk = catalog.ok;
  const summaryOk = staticOk && (liveOk === null || liveOk === true);
  const status: CloudflareTokenScopeProof['summary']['status'] = !staticOk
    ? 'fail'
    : liveOk === false
      ? 'partial'
      : summaryOk
        ? 'pass'
        : 'partial';

  const proof: Omit<CloudflareTokenScopeProof, 'proofHash'> = {
    type: 'CloudflareTokenScopeProof',
    version: '1.0.0',
    subsystem: 'other',
    timestamp: new Date().toISOString(),
    bunVersion: version,
    bunRevision: (revision || '').slice(0, 12) || 'unknown',
    reportPath: CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH,
    semanticTags: { ...semanticTags, subsystems: ['other'] },
    pins: {
      accountId: asAccountId(CLOUDFLARE_TOKEN_PERMISSIONS.accountId),
      pagesProject: CLOUDFLARE_TOKEN_PERMISSIONS.pagesProject,
      zoneName: CLOUDFLARE_TOKEN_PERMISSIONS.zoneName,
      zoneId: asZoneId(CLOUDFLARE_TOKEN_PERMISSIONS.zoneId),
      minimalPermissions: CLOUDFLARE_TOKEN_PERMISSIONS.minimal,
    },
    mcpCatalog: {
      ok: catalog.ok,
      serverCount: CLOUDFLARE_MCP_HTTP_SERVERS.length,
      rows: catalog.rows,
      wellKnownPath: CLOUDFLARE_WELL_KNOWN_MCP_PATH,
      repoCatalog: '.mcp.json',
    },
    liveProbe,
    summary: {
      ok: summaryOk,
      status,
      tier,
      staticOk,
      liveOk,
    },
    _links: {
      self: CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH,
      wellKnown: CLOUDFLARE_WELL_KNOWN_MCP_PATH,
      tenant: '/docs/harness/tenants/cloudflare-pages.md',
    },
  };

  const hasher = new CryptoHasher('sha256');
  hasher.update(JSON.stringify({ ...proof, proofHash: undefined }));
  return { ...proof, proofHash: hasher.digest('hex') };
}
