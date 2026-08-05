/**
 * Merge public bookmakers registry + partners-ops for agent-odds / health UI.
 *
 * Public: id, label, urls, limits.liquidityTier, sports
 * Ops: out readiness per book slug (derived status)
 *
 * Policy: reads baked registry JSON only (Pages/agent local) — no D1.
 *
 * @see public/registry/bookmakers.json
 * @see public/registry/partners-ops.json
 * @see lib/bookmakers/resolve.ts
 */
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file

import { joinPath } from '../path-bun.ts';
import { parseSportsbookId, trySportsbookId, type SportsbookId } from '../types/branded.ts';
import { bookmakerHost, type BookmakerRegistryEntry } from './resolve.ts';

export type LiquidityTier = 'high' | 'medium' | 'low' | 'illiquid' | 'unknown';

export type PartnerHealthStatus =
  | 'active'
  | 'low_balance'
  | 'critical'
  | 'degraded'
  | 'offline'
  | 'deferred';

export type MergedPartnerHealth = {
  id: SportsbookId;
  label: string;
  status: PartnerHealthStatus;
  balance: number | null;
  balanceAsOf: string | null;
  latencyMs: number | null;
  errorRate: number | null;
  uptime24h: number | null;
  liquidityTier: LiquidityTier;
  maxBetUsd: number | null;
  minBetUsd: number | null;
  lastProbe: string | null;
  urls: { web: string | null; api: string | null };
  fetcher: string | null;
  sports: string[];
  /** eTLD+1 style host keys for odds join */
  hosts: string[];
  outsReady: number;
  outsTotal: number;
  skin: string | null;
};

export type MergedRegistry = {
  generatedAt: string;
  source: {
    bookmakers: string;
    partnersOps: string | null;
  };
  health: MergedPartnerHealth[];
  /** host (no www) → bookmaker id */
  hostIndex: Record<string, SportsbookId>;
};

/**
 * Best-effort public-suffix-ish host key (not full PSL).
 * Strips leading www. and lowercases — good enough for catalog urls.web join.
 */
export function extractEtldPlusOne(hostname: string): string {
  const h = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!h) return '';
  const noWww = h.startsWith('www.') ? h.slice(4) : h;
  // multi-label sportsbook hosts: hardrockfl.sportsbook.hardrock.bet → hardrock.bet
  // keep last two labels for common cases; if ends with .co.uk keep three (not needed here)
  const parts = noWww.split('.').filter(Boolean);
  if (parts.length <= 2) return noWww;
  // known compound: *.hardrock.bet, *.pinnacle.com
  return parts.slice(-2).join('.');
}

function parseLiquidity(raw: unknown): LiquidityTier {
  const s = String(raw ?? 'unknown').toLowerCase();
  if (s === 'high' || s === 'medium' || s === 'low' || s === 'illiquid') return s;
  return 'unknown';
}

function hostKeysForEntry(entry: BookmakerRegistryEntry): string[] {
  const keys = new Set<string>();
  const host = bookmakerHost(entry);
  if (host) {
    keys.add(host.toLowerCase());
    keys.add(host.toLowerCase().replace(/^www\./, ''));
    keys.add(extractEtldPlusOne(host));
  }
  // slug as host-like: hard-rock-florida not a host; hardrock.bet from urls
  if (entry.id) keys.add(String(entry.id).toLowerCase());
  if (entry.slug) keys.add(String(entry.slug).toLowerCase());
  return [...keys].filter(Boolean);
}

type OpsOut = {
  status?: string;
  incomplete?: boolean;
  maxBet?: string | number;
  /** Raw baked-registry fields; parsed once by parseOpsSportsbookId. */
  book?: { id?: unknown; slug?: unknown; name?: string };
};

type OpsPartner = {
  code?: string;
  outs?: OpsOut[];
};

function parseOpsSportsbookId(book: OpsOut['book']): SportsbookId | undefined {
  const rawSlug = typeof book?.slug === 'string' ? book.slug : undefined;
  const rawId = typeof book?.id === 'string' ? book.id.replace(/^book-/, '') : undefined;
  return trySportsbookId(rawSlug || rawId);
}

function deriveStatus(args: { outsReady: number; outsTotal: number }): PartnerHealthStatus {
  if (args.outsTotal === 0) {
    // Catalog presence is not health evidence. Keep the row visible without
    // claiming the partner is online until an ops out is registered.
    return 'deferred';
  }
  if (args.outsReady === 0) return 'offline';
  if (args.outsReady < args.outsTotal) return 'degraded';
  return 'active';
}

/**
 * Pure merge for tests — pass already-parsed registry objects.
 */
export function mergeBookmakersWithOps(
  bookmakers: Record<string, BookmakerRegistryEntry>,
  partnersOps: { partners?: OpsPartner[]; generatedAt?: string } | null,
  opts?: { now?: string }
): MergedRegistry {
  const generatedAt = opts?.now ?? new Date().toISOString();
  const outsByBookSlug = new Map<SportsbookId, { ready: number; total: number }>();

  for (const partner of partnersOps?.partners ?? []) {
    for (const out of partner.outs ?? []) {
      const slug = parseOpsSportsbookId(out.book);
      if (!slug) continue;
      const cur = outsByBookSlug.get(slug) ?? { ready: 0, total: 0 };
      cur.total += 1;
      const st = String(out.status ?? '').toLowerCase();
      if (st === 'ready' || st === 'funded' || st === 'active' || st === 'warmed') {
        cur.ready += 1;
      }
      outsByBookSlug.set(slug, cur);
    }
  }

  const health: MergedPartnerHealth[] = [];
  const hostIndex: Record<string, SportsbookId> = {};

  for (const [key, entry] of Object.entries(bookmakers)) {
    const id = parseSportsbookId(entry.id || key);
    const limits = (entry as { limits?: Record<string, unknown> }).limits ?? {};
    const liquidityTier = parseLiquidity(limits.liquidityTier);
    const maxBetUsd =
      typeof limits.maxBetUsd === 'number'
        ? limits.maxBetUsd
        : limits.maxBetUsd == null
          ? null
          : Number(limits.maxBetUsd);
    const minBetUsd =
      typeof limits.minBetUsd === 'number'
        ? limits.minBetUsd
        : limits.minBetUsd == null
          ? null
          : Number(limits.minBetUsd);

    const slug = parseSportsbookId(entry.slug || id);
    const outs = outsByBookSlug.get(slug) ?? outsByBookSlug.get(id) ?? { ready: 0, total: 0 };

    const status = deriveStatus({
      outsReady: outs.ready,
      outsTotal: outs.total,
    });

    const urls = {
      web: entry.urls?.web ? String(entry.urls.web) : null,
      api: entry.urls?.api ? String(entry.urls.api) : null,
    };

    const hosts = hostKeysForEntry(entry);
    for (const h of hosts) {
      if (!hostIndex[h]) hostIndex[h] = id;
    }
    // also index etld of web url
    if (urls.web) {
      try {
        const etld = extractEtldPlusOne(new URL(urls.web).hostname);
        if (etld) hostIndex[etld] = id;
      } catch {
        /* ignore */
      }
    }

    health.push({
      id,
      label: String(entry.label || id),
      status,
      balance: null, // ops plane soft balance not in partners-ops bake yet
      balanceAsOf: null,
      latencyMs: null,
      errorRate: null,
      uptime24h: null,
      liquidityTier,
      maxBetUsd: Number.isFinite(maxBetUsd as number) ? (maxBetUsd as number) : null,
      minBetUsd: Number.isFinite(minBetUsd as number) ? (minBetUsd as number) : null,
      lastProbe: partnersOps?.generatedAt ?? null,
      urls,
      fetcher: entry.fetcher ? String(entry.fetcher) : null,
      sports: Array.isArray(entry.sports) ? entry.sports.map(String) : [],
      hosts,
      outsReady: outs.ready,
      outsTotal: outs.total,
      skin: entry.skin ? String(entry.skin) : null,
    });
  }

  health.sort((a, b) => a.label.localeCompare(b.label));

  return {
    generatedAt,
    source: {
      bookmakers: 'public/registry/bookmakers.json',
      partnersOps: partnersOps ? 'public/registry/partners-ops.json' : null,
    },
    health,
    hostIndex,
  };
}

export async function loadMergedRegistry(
  root = joinPath(import.meta.dir, '../..')
): Promise<MergedRegistry> {
  const bmPath = joinPath(root, 'public/registry/bookmakers.json');
  const opsPath = joinPath(root, 'public/registry/partners-ops.json');

  const bmRaw = JSON.parse(await Bun.file(bmPath).text()) as {
    bookmakers?: Record<string, BookmakerRegistryEntry>;
  };
  const bookmakers = bmRaw.bookmakers ?? {};

  let partnersOps: { partners?: OpsPartner[]; generatedAt?: string } | null = null;
  try {
    if (await Bun.file(opsPath).exists()) {
      partnersOps = JSON.parse(await Bun.file(opsPath).text()) as {
        partners?: OpsPartner[];
        generatedAt?: string;
      };
    }
  } catch {
    partnersOps = null;
  }

  return mergeBookmakersWithOps(bookmakers, partnersOps);
}

/** Join an odds host string to merged partner id via hostIndex. */
export function resolvePartnerForHost(
  hostIndex: Record<string, SportsbookId>,
  host: string
): SportsbookId | undefined {
  const raw =
    host
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0] ?? '';
  const noWww = raw.replace(/^www\./, '');
  const etld = extractEtldPlusOne(noWww);
  return (
    hostIndex[raw] || hostIndex[noWww] || hostIndex[etld] || hostIndex[noWww.replace(/\./g, '-')]
  );
}
