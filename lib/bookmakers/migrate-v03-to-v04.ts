/**
 * Migrate bookmakers catalog v0.3 → v0.4 public + ops split.
 *
 * @see lib/bookmakers/v04-types.ts
 */

import {
  BOOK_ENRICHMENT,
  type BookFetcher,
  type BookRegion,
  type LifecycleMode,
  type OpsBookmakerV04,
  type OpsBookmakersBakeV04,
  type PublicBookmakerV04,
  type PublicBookmakersBakeV04,
} from './v04-types.ts';

const OPS_PRIVATE_KEYS = [
  'restBaseUrl',
  'restProtocol',
  'apiKeyEnv',
  'envVars',
] as const;

export function isPublicSecretKey(key: string): boolean {
  return (OPS_PRIVATE_KEYS as readonly string[]).includes(key);
}

function asFetcher(raw: unknown): BookFetcher {
  const s = String(raw ?? '');
  if (s === 'rest' || s === 'webview' || s === 'seat') return s;
  return 'seat';
}

function normalizeWebUrl(domain: unknown, existing?: unknown): string | null {
  if (typeof existing === 'string' && existing.startsWith('http')) return existing;
  if (typeof domain !== 'string' || !domain.trim()) return null;
  const d = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return d ? `https://${d}` : null;
}

function normalizeRegions(raw: unknown): BookRegion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(r => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object') {
      const o = r as { country?: string; stateCode?: string; state?: string };
      const country = o.country ? String(o.country) : '';
      const stateCode = o.stateCode ?? o.state;
      if (country && stateCode) return { country, stateCode: String(stateCode) };
      if (country) return { country };
    }
    return String(r);
  });
}

function defaultLifecycle(fetcher: BookFetcher): LifecycleMode[] {
  if (fetcher === 'seat') return ['pre_match'];
  return ['pre_match', 'live'];
}

/** Split one v0.3 book row into public + ops. */
export function migrateBookV03(
  key: string,
  raw: Record<string, unknown>
): { public: PublicBookmakerV04; ops: OpsBookmakerV04 } {
  const id = String(raw.id || key);
  const slug = String(raw.slug || id);
  const fetcher = asFetcher(raw.fetcher ?? raw.fetcherType);
  const enrich = BOOK_ENRICHMENT[id] ?? BOOK_ENRICHMENT[slug] ?? {};
  const sports = Array.isArray(raw.sports)
    ? raw.sports.map(String)
    : Array.isArray(raw.supportedSports)
      ? (raw.supportedSports as unknown[]).map(String)
      : [];

  const domain = raw.domain ?? (raw.urls as { web?: string } | undefined)?.web;
  const restBase =
    typeof raw.restBaseUrl === 'string'
      ? raw.restBaseUrl
      : typeof (raw.urls as { api?: string } | undefined)?.api === 'string'
        ? (raw.urls as { api: string }).api
        : undefined;

  const pub: PublicBookmakerV04 = {
    id,
    slug,
    label: String(raw.label || id),
    urls: {
      web: normalizeWebUrl(domain, (raw.urls as { web?: string } | undefined)?.web),
      api: restBase && fetcher === 'rest' ? restBase : null,
      limitsPage:
        typeof (raw.urls as { limitsPage?: string } | undefined)?.limitsPage === 'string'
          ? (raw.urls as { limitsPage: string }).limitsPage
          : null,
      termsPage:
        typeof (raw.urls as { termsPage?: string } | undefined)?.termsPage === 'string'
          ? (raw.urls as { termsPage: string }).termsPage
          : null,
    },
    fetcher,
    lifecycle: enrich.lifecycle ?? defaultLifecycle(fetcher),
    sports,
    regions: normalizeRegions(raw.regions),
    limits: {
      minBetUsd:
        typeof (raw.limits as { minBetUsd?: number } | undefined)?.minBetUsd === 'number'
          ? (raw.limits as { minBetUsd: number }).minBetUsd
          : null,
      maxBetUsd:
        typeof (raw.limits as { maxBetUsd?: number } | undefined)?.maxBetUsd === 'number'
          ? (raw.limits as { maxBetUsd: number }).maxBetUsd
          : null,
      liquidityTier: enrich.liquidityTier ?? 'unknown',
    },
  };

  if (enrich.skin) pub.skin = enrich.skin;
  else if (typeof raw.skin === 'string') pub.skin = raw.skin;
  if (enrich.brandGroup) pub.brandGroup = enrich.brandGroup;
  else if (typeof raw.brandGroup === 'string') pub.brandGroup = raw.brandGroup;
  if (typeof raw.color === 'string') pub.color = raw.color;
  if (raw.webViewConfig && typeof raw.webViewConfig === 'object') {
    pub.webViewConfig = raw.webViewConfig as Record<string, unknown>;
  }
  if (typeof raw.note === 'string') pub.note = raw.note;

  const ops: OpsBookmakerV04 = {
    id,
    slug,
    balance: { currency: 'USD', amount: null, asOf: null },
    health: { status: 'unknown', checkedAt: null },
    contact: enrich.contact ?? {
      supportEmail: null,
      telegram: null,
      opsDesk: null,
    },
  };
  if (typeof raw.restBaseUrl === 'string') ops.restBaseUrl = raw.restBaseUrl;
  if (typeof raw.restProtocol === 'string') ops.restProtocol = raw.restProtocol;
  if (typeof raw.apiKeyEnv === 'string') ops.apiKeyEnv = raw.apiKeyEnv;
  if (Array.isArray(raw.envVars)) ops.envVars = raw.envVars.map(String);

  return { public: pub, ops };
}

export function auditPublicCatalog(
  bookmakers: Record<string, PublicBookmakerV04>
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const [key, b] of Object.entries(bookmakers)) {
    if (!b.id) issues.push(`${key}: missing id`);
    if (!b.slug) issues.push(`${key}: missing slug`);
    if (b.id && b.slug && b.id !== b.slug) {
      issues.push(`${key}: id !== slug (v0.4 mode A requires id === slug)`);
    }
    if (key !== b.id && key !== b.slug) {
      issues.push(`${key}: map key should equal id/slug`);
    }
    if (!b.label) issues.push(`${key}: missing label`);
    if (!b.fetcher || !['rest', 'webview', 'seat'].includes(b.fetcher)) {
      issues.push(`${key}: invalid fetcher`);
    }
    if (!b.urls?.web) issues.push(`${key}: missing urls.web`);
    if (!Array.isArray(b.sports) || b.sports.length === 0) {
      issues.push(`${key}: missing sports`);
    }
    if (!Array.isArray(b.lifecycle) || b.lifecycle.length === 0) {
      issues.push(`${key}: missing lifecycle`);
    }
    if (!b.brandGroup) issues.push(`${key}: missing brandGroup`);
    // skin optional for pure brands like pinnacle
    for (const k of Object.keys(b)) {
      if (isPublicSecretKey(k)) issues.push(`${key}: secret field leaked to public: ${k}`);
    }
    if ('balance' in b || 'health' in b) {
      issues.push(`${key}: balance/health must not appear on public catalog`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function summarizePublic(
  bookmakers: Record<string, PublicBookmakerV04>
): PublicBookmakersBakeV04['summary'] {
  const entries = Object.values(bookmakers);
  const sports = new Set<string>();
  for (const b of entries) for (const s of b.sports) sports.add(s);
  return {
    count: entries.length,
    webview: entries.filter(b => b.fetcher === 'webview').length,
    rest: entries.filter(b => b.fetcher === 'rest').length,
    seat: entries.filter(b => b.fetcher === 'seat').length,
    sports: [...sports].sort(),
  };
}

export function migrateCatalogV03ToV04(
  v03: {
    bookmakers?: Record<string, unknown>;
    artifact?: { name?: string; version?: string; checksum?: string; source?: string };
    generatedAt?: string;
  },
  opts: { version?: string; generatedAt?: string } = {}
): { public: PublicBookmakersBakeV04; ops: OpsBookmakersBakeV04 } {
  const rawMap = (v03.bookmakers ?? {}) as Record<string, Record<string, unknown>>;
  const publicMap: Record<string, PublicBookmakerV04> = {};
  const opsMap: Record<string, OpsBookmakerV04> = {};
  for (const [key, raw] of Object.entries(rawMap)) {
    const row = migrateBookV03(key, raw ?? {});
    publicMap[row.public.id] = row.public;
    opsMap[row.ops.id] = row.ops;
  }
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  const version = opts.version ?? '0.4.0';
  const audit = auditPublicCatalog(publicMap);
  const publicBake: PublicBookmakersBakeV04 = {
    schemaVersion: 2,
    generatedAt,
    artifact: {
      name: v03.artifact?.name ?? '@factorywager/bookmakers',
      version,
      checksum: v03.artifact?.checksum,
      source: 'migrated-v0.3-to-v0.4',
    },
    bookmakers: publicMap,
    audit,
    summary: summarizePublic(publicMap),
  };
  const opsBake: OpsBookmakersBakeV04 = {
    schemaVersion: 2,
    generatedAt,
    artifact: {
      name: '@factorywager/bookmakers-ops',
      version,
      source: 'migrated-v0.3-to-v0.4',
    },
    bookmakers: opsMap,
    note: 'Operator-private desk — never deploy under public/ or Pages. restBaseUrl/apiKeyEnv live here; balance/health placeholders until live feed.',
  };
  return { public: publicBake, ops: opsBake };
}
