/**
 * Merge public bookmakers catalog + ops desk into one in-memory registry.
 *
 * Public: liquidityTier, limits, label, skin, urls (Pages-safe).
 * Ops: balance, health, rest credentials/env (never bake to Pages).
 * Derived: status for desk / agent dashboards.
 *
 * @see lib/bookmakers/v04-types.ts
 * @see artifact-registry/bookmakers/v0.4.0/ops/books.json
 */

// Sync catalog load at process boot — Bun.file is async-only for text
// eslint-disable-next-line no-restricted-imports -- sync registry merge path
import { readFileSync } from 'node:fs';
import { joinPath } from '../path-bun.ts';
import type {
  LiquidityTier,
  OpsBookmakerV04,
  OpsBookmakersBakeV04,
  PublicBookmakerV04,
  PublicBookmakersBakeV04,
} from './v04-types.ts';
import { bookmakerHost } from './resolve.ts';

const ROOT = joinPath(import.meta.dir, '../..');

export const DEFAULT_PUBLIC_BOOKS = joinPath(ROOT, 'public/registry/bookmakers.json');
export const DEFAULT_OPS_BOOKS = joinPath(
  ROOT,
  'artifact-registry/bookmakers/v0.4.0/ops/books.json'
);

/** Extended liquidity including illiquid (desk / arb filters). */
export type MergedLiquidityTier = LiquidityTier | 'illiquid';

export type DerivedPartnerStatus = 'active' | 'low_balance' | 'critical' | 'degraded' | 'offline';

export type MergedBook = PublicBookmakerV04 & {
  liquidityTier: MergedLiquidityTier;
  balance: OpsBookmakerV04['balance'];
  health: OpsBookmakerV04['health'];
  contact: (OpsBookmakerV04['contact'] & { telegramHandle?: string | null }) | undefined;
  restBaseUrl?: string;
  restProtocol?: string;
  apiKeyEnv?: string;
  envVars?: string[];
  /** Derived operational status for UI / arb filters. */
  status: DerivedPartnerStatus;
  /** Registrable domain (eTLD+1) from urls.web / domain. */
  etldPlusOne: string;
  /** Ops bake timestamps when present. */
  balanceAsOf: string | null;
  healthCheckedAt: string | null;
};

export type MergedRegistry = {
  books: Record<string, MergedBook>;
  count: number;
  publicGeneratedAt: string | null;
  opsGeneratedAt: string | null;
  generatedAt: string;
};
// brand-ok — opaque research/wire id
export type PartnerHealthRow = {
  id: string; // brand-ok — opaque research/wire id
  slug: string;
  label: string;
  skin?: string;
  brandGroup?: string;
  status: DerivedPartnerStatus;
  balance: { currency: string; amount: number | null; asOf: string | null };
  /** Flat convenience fields for older dashboard chips */
  balanceAmount: number | null;
  balanceCurrency: string;
  balanceAsOf: string | null;
  latencyMs: number | null;
  errorRate: number | null;
  uptime24h: number | null;
  limits: PublicBookmakerV04['limits'];
  liquidityTier: MergedLiquidityTier;
  maxBetUsd: number | null;
  minBetUsd: number | null;
  lastProbe: string | null;
  urls: PublicBookmakerV04['urls'];
  etldPlusOne: string;
  /** Catalog regions for geo/state alert filters + portal chips. */
  regions: PublicBookmakerV04['regions'];
  contact: {
    supportEmail: string | null;
    accountManager: string | null;
    telegramHandle: string | null;
    telegram: string | null;
    opsDesk: string | null;
  };
  paymentMethods: string[];
  providerType: string;
  health: OpsBookmakerV04['health'];
  fetcher: PublicBookmakerV04['fetcher'];
};

export type PartnerHealthPayload = {
  ok: true;
  health: PartnerHealthRow[];
  /** Alias for portal UIs that still read `partners`. */
  partners: PartnerHealthRow[];
  /** Alias for portal UIs that still read `count`. */
  count: number;
  summary: {
    total: number;
    online: number;
    degraded: number;
    offline: number;
    lowBalance: number;
    critical: number;
    byLiquidity: Record<string, number>;
  };
  opsGeneratedAt: string | null;
  publicGeneratedAt: string | null;
  generatedAt: string;
  /** Alias of generatedAt for dashboard clients */
  lastUpdated: string;
};

const MULTI_PART_TLDS = new Set(['co.uk', 'com.au', 'com.br', 'co.nz', 'co.jp', 'com.mx', 'co.za']);

/** Best-effort eTLD+1 (no PSL dependency). */
export function extractEtldPlusOne(hostname: string): string {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^www\./, '');
  if (!host) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host;
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;
  const last2 = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(last2) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return last2;
}

export function hostFromUrlOrHost(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return '';
  try {
    if (s.includes('://')) return new URL(s).hostname.toLowerCase();
  } catch {
    /* fall through */
  }
  return s.replace(/^https?:\/\//, '').split('/')[0] ?? s;
}

const DEFAULT_WARN_USD = 500;
const DEFAULT_CRITICAL_USD = 100;

export function derivePartnerStatus(input: {
  healthStatus?: OpsBookmakerV04['health'] extends infer H
    ? H extends { status?: infer S }
      ? S
      : never
    : never;
  balanceAmount?: number | null;
  thresholdWarning?: number;
  thresholdCritical?: number;
}): DerivedPartnerStatus {
  const hs = input.healthStatus ?? 'unknown';
  if (hs === 'down') return 'offline';
  if (hs === 'degraded') return 'degraded';

  const amount = input.balanceAmount;
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    const critical = input.thresholdCritical ?? DEFAULT_CRITICAL_USD;
    const warn = input.thresholdWarning ?? DEFAULT_WARN_USD;
    if (amount < critical) return 'critical';
    if (amount < warn) return 'low_balance';
  }
  return 'active';
}

function defaultProviderType(pub: PublicBookmakerV04): string {
  if (pub.providerType) return pub.providerType;
  if (pub.fetcher === 'seat') return 'pph';
  if (pub.fetcher === 'rest') return 'fiat';
  return 'unknown';
}

function defaultPaymentMethods(pub: PublicBookmakerV04): string[] {
  if (Array.isArray(pub.paymentMethods) && pub.paymentMethods.length > 0) {
    return pub.paymentMethods.map(String);
  }
  if (pub.fetcher === 'seat') return ['seat', 'p2p'];
  if (pub.fetcher === 'rest') return ['bank_wire', 'credit_card'];
  return [];
}

function mergeOne(pub: PublicBookmakerV04, ops?: OpsBookmakerV04): MergedBook {
  const host = bookmakerHost(pub) || hostFromUrlOrHost(pub.urls?.web ?? '');
  const etld = extractEtldPlusOne(host);
  const balance = ops?.balance ?? { currency: 'USD', amount: null, asOf: null };
  const health = ops?.health ?? { status: 'unknown', checkedAt: null };
  const telegram = ops?.contact?.telegram ?? null;
  const contact = ops?.contact ? { ...ops.contact, telegramHandle: telegram } : undefined;

  const liquidityTier = (pub.limits?.liquidityTier ?? 'unknown') as MergedLiquidityTier;
  const status = derivePartnerStatus({
    healthStatus: health.status,
    balanceAmount: balance.amount ?? null,
    thresholdWarning: pub.limits?.maxBetUsd ?? DEFAULT_WARN_USD,
    thresholdCritical: DEFAULT_CRITICAL_USD,
  });

  return {
    ...pub,
    paymentMethods: defaultPaymentMethods(pub),
    providerType: defaultProviderType(pub),
    liquidityTier,
    balance,
    health,
    contact,
    restBaseUrl: ops?.restBaseUrl,
    restProtocol: ops?.restProtocol,
    apiKeyEnv: ops?.apiKeyEnv,
    envVars: ops?.envVars,
    status,
    etldPlusOne: etld,
    balanceAsOf: balance.asOf ?? null,
    healthCheckedAt: health.checkedAt ?? null,
  };
}

export type LoadMergedRegistryOpts = {
  publicPath?: string;
  opsPath?: string;
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Load + merge public/ops catalogs (sync — safe for CLI + route handlers). */
export function loadMergedRegistry(opts: LoadMergedRegistryOpts = {}): MergedRegistry {
  const publicPath = opts.publicPath ?? DEFAULT_PUBLIC_BOOKS;
  const opsPath = opts.opsPath ?? DEFAULT_OPS_BOOKS;

  const publicBake = readJsonFile<PublicBookmakersBakeV04>(publicPath);
  let opsBake: OpsBookmakersBakeV04 | null = null;
  try {
    opsBake = readJsonFile<OpsBookmakersBakeV04>(opsPath);
  } catch {
    opsBake = null;
  }

  const books: Record<string, MergedBook> = {};
  for (const [id, pub] of Object.entries(publicBake.bookmakers ?? {})) {
    books[id] = mergeOne(pub, opsBake?.bookmakers?.[id]);
  }

  // Ops-only rows (should be rare) — surface with minimal public shell.
  if (opsBake?.bookmakers) {
    for (const [id, ops] of Object.entries(opsBake.bookmakers)) {
      if (books[id]) continue;
      const shell: PublicBookmakerV04 = {
        id,
        slug: ops.slug || id,
        label: id,
        urls: { web: null, api: null, limitsPage: null, termsPage: null },
        fetcher: 'seat',
        lifecycle: ['pre_match'],
        sports: [],
        regions: [],
        limits: { minBetUsd: null, maxBetUsd: null, liquidityTier: 'unknown' },
      };
      books[id] = mergeOne(shell, ops);
    }
  }

  return {
    books,
    count: Object.keys(books).length,
    publicGeneratedAt: publicBake.generatedAt ?? null,
    opsGeneratedAt: opsBake?.generatedAt ?? null,
    generatedAt: new Date().toISOString(),
  };
}

/** etld+1 → book id (first wins; prefer longer host matches via exact etld). */
export function buildEtldIndex(registry: MergedRegistry): Record<string, string> {
  const map: Record<string, string> = {};
  for (const book of Object.values(registry.books)) {
    if (book.etldPlusOne && !map[book.etldPlusOne]) {
      map[book.etldPlusOne] = book.id;
    }
  }
  return map;
}

export function lookupBookByHost(
  registry: MergedRegistry,
  hostOrUrl: string
): MergedBook | undefined {
  const host = hostFromUrlOrHost(hostOrUrl);
  const etld = extractEtldPlusOne(host);
  if (!etld) return undefined;
  const byEtld = Object.values(registry.books).find(b => b.etldPlusOne === etld);
  if (byEtld) return byEtld;
  // Substring fallback: hardrock.bet inside hardrockfl.sportsbook.hardrock.bet already covered by etld.
  return Object.values(registry.books).find(b => {
    const h = bookmakerHost(b).toLowerCase();
    return h === host || h.endsWith(`.${etld}`) || extractEtldPlusOne(h) === etld;
  });
}

export function toPartnerHealthRow(book: MergedBook): PartnerHealthRow {
  const amount = typeof book.balance?.amount === 'number' ? book.balance.amount : null;
  const telegram = book.contact?.telegramHandle ?? book.contact?.telegram ?? null;
  const healthExtra = book.health as
    | { latencyMs?: number | null; errorRate?: number | null; uptime24h?: number | null }
    | undefined;
  const latencyMs =
    typeof healthExtra?.latencyMs === 'number' && Number.isFinite(healthExtra.latencyMs)
      ? healthExtra.latencyMs
      : null;
  return {
    id: book.id,
    slug: book.slug,
    label: book.label,
    skin: book.skin,
    brandGroup: book.brandGroup,
    status: book.status,
    balance: {
      currency: book.balance?.currency ?? 'USD',
      amount,
      asOf: book.balanceAsOf,
    },
    balanceAmount: amount,
    balanceCurrency: book.balance?.currency ?? 'USD',
    balanceAsOf: book.balanceAsOf,
    latencyMs,
    errorRate:
      typeof healthExtra?.errorRate === 'number' && Number.isFinite(healthExtra.errorRate)
        ? healthExtra.errorRate
        : null,
    uptime24h:
      typeof healthExtra?.uptime24h === 'number' && Number.isFinite(healthExtra.uptime24h)
        ? healthExtra.uptime24h
        : null,
    limits: book.limits,
    liquidityTier: book.liquidityTier,
    maxBetUsd: book.limits?.maxBetUsd ?? null,
    minBetUsd: book.limits?.minBetUsd ?? null,
    lastProbe: book.healthCheckedAt,
    urls: book.urls,
    etldPlusOne: book.etldPlusOne,
    regions: Array.isArray(book.regions) ? book.regions : [],
    contact: {
      supportEmail: book.contact?.supportEmail ?? null,
      accountManager:
        (book.contact as { accountManager?: string | null } | undefined)?.accountManager ?? null,
      telegramHandle: telegram,
      telegram,
      opsDesk: book.contact?.opsDesk ?? null,
    },
    paymentMethods: Array.isArray(book.paymentMethods) ? book.paymentMethods.map(String) : [],
    providerType: String(book.providerType ?? 'unknown'),
    health: book.health,
    fetcher: book.fetcher,
  };
}

export type BuildPartnerHealthOpts = {
  registry?: MergedRegistry;
  /** Optional book-id → display telegram (partners-ops chatId). */
  telegramByBookId?: Record<string, string>;
};

export function buildPartnerHealthPayload(
  registryOrOpts: MergedRegistry | BuildPartnerHealthOpts = {}
): PartnerHealthPayload {
  const opts: BuildPartnerHealthOpts =
    registryOrOpts && 'books' in registryOrOpts
      ? { registry: registryOrOpts }
      : (registryOrOpts as BuildPartnerHealthOpts);
  const registry = opts.registry ?? loadMergedRegistry();
  const telegramByBookId = opts.telegramByBookId ?? {};

  const health = Object.values(registry.books)
    .map(book => {
      const row = toPartnerHealthRow(book);
      const fromOps = telegramByBookId[book.id] ?? telegramByBookId[book.slug] ?? null;
      if (!row.contact.telegramHandle && fromOps) {
        row.contact.telegramHandle = fromOps;
        row.contact.telegram = fromOps;
      }
      return row;
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const byLiquidity: Record<string, number> = {};
  let online = 0;
  let degraded = 0;
  let offline = 0;
  let lowBalance = 0;
  let critical = 0;
  for (const row of health) {
    byLiquidity[row.liquidityTier] = (byLiquidity[row.liquidityTier] ?? 0) + 1;
    if (row.status === 'active' || row.status === 'low_balance') online += 1;
    if (row.status === 'degraded') degraded += 1;
    if (row.status === 'offline') offline += 1;
    if (row.status === 'low_balance') lowBalance += 1;
    if (row.status === 'critical') critical += 1;
  }

  return {
    ok: true,
    health,
    partners: health,
    count: health.length,
    summary: {
      total: health.length,
      online,
      degraded,
      offline,
      lowBalance,
      critical,
      byLiquidity,
    },
    opsGeneratedAt: registry.opsGeneratedAt,
    publicGeneratedAt: registry.publicGeneratedAt,
    generatedAt: registry.generatedAt,
    lastUpdated: registry.generatedAt,
  };
}

/** Arb eligibility: exclude illiquid / offline / degraded / critically low balance. */
export function isArbEligible(
  book: Pick<MergedBook, 'liquidityTier' | 'status' | 'balance'>,
  minBalanceUsd = DEFAULT_CRITICAL_USD
): boolean {
  if (book.liquidityTier === 'illiquid') return false;
  if (book.status === 'offline' || book.status === 'degraded' || book.status === 'critical') {
    return false;
  }
  const amount = book.balance?.amount;
  if (typeof amount === 'number' && amount < minBalanceUsd) return false;
  return true;
}
