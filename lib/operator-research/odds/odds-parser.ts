// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
import { asHostId, tryHostId, trySportsbookId } from '../../types/branded.ts';
import type { HostId } from '../../types/branded.ts';
import type { SportsbookId } from '../../types/branded.ts';
import type { OddsLimits, OddsMarket, OddsSelection, OddsSnapshot } from './types.ts';

function contentHash(text: string): string {
  return Bun.hash(text).toString(16);
}

// eslint-disable-next-line harness/no-unknown-function-param -- parse helper at odds wire edge
function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseSelection(raw: unknown): OddsSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name ?? o.selection ?? o.label ?? '').trim();
  const price =
    asNumber(o.price) ?? asNumber(o.odds) ?? asNumber(o.decimal) ?? asNumber(o.american);
  if (!name || price === null) return null;
  const american = asNumber(o.american) ?? undefined;
  return { name, price, american };
}

function parseMarket(raw: unknown, index: number): OddsMarket | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? o.marketId ?? o.key ?? `m-${index}`);
  const name = String(o.name ?? o.market ?? o.title ?? id);
  const selRaw = o.selections ?? o.outcomes ?? o.runners ?? [];
  const selections: OddsSelection[] = [];
  if (Array.isArray(selRaw)) {
    for (const s of selRaw) {
      const parsed = parseSelection(s);
      if (parsed) selections.push(parsed);
    }
  }
  if (selections.length === 0) return null;
  return { id, name, selections };
}

function parseLimits(raw: unknown): OddsLimits {
  if (!raw || typeof raw !== 'object') {
    return { maxBet: null, minBet: null };
  }
  const o = raw as Record<string, unknown>;
  // Support both object and first-of-array (legacy sketch)
  const lim = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : o;
  if (!lim || typeof lim !== 'object') return { maxBet: null, minBet: null };
  return {
    maxBet: asNumber(lim.maxBet ?? lim.max ?? lim.limit),
    minBet: asNumber(lim.minBet ?? lim.min),
    currency: typeof lim.currency === 'string' ? lim.currency : undefined,
  };
}

/**
 * Parse a canonical odds snapshot JSON shape:
 * `{ host?, markets: [...], limits?, timestamp? }`
 * Also accepts a top-level markets array.
 */
export function parseOddsJson(
  text: string,
  opts: {
    host: HostId | string;
    sportsbookId?: SportsbookId | string | null;
    source?: OddsSnapshot['source'];
    timestamp?: number;
  }
): OddsSnapshot {
  const host =
    typeof opts.host === 'string' ? (tryHostId(opts.host) ?? asHostId(opts.host)) : opts.host;
  let sportsbookId: SportsbookId | null = null;
  if (opts.sportsbookId) {
    sportsbookId =
      typeof opts.sportsbookId === 'string'
        ? (trySportsbookId(opts.sportsbookId) ?? null)
        : opts.sportsbookId;
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    // Minimal HTML/JSON-LD fallback: no structured markets
    return {
      host,
      sportsbookId,
      timestamp: opts.timestamp ?? Date.now(),
      source: opts.source ?? 'live',
      markets: [],
      limits: { maxBet: null, minBet: null },
      contentHash: contentHash(text),
    };
  }

  let root: Record<string, unknown>;
  let marketsRaw: unknown[];
  if (Array.isArray(data)) {
    root = {};
    marketsRaw = data;
  } else if (data && typeof data === 'object') {
    root = data as Record<string, unknown>;
    const m = root.markets ?? root.events ?? root.data;
    marketsRaw = Array.isArray(m) ? m : [];
  } else {
    root = {};
    marketsRaw = [];
  }

  const markets: OddsMarket[] = [];
  for (let i = 0; i < marketsRaw.length; i++) {
    const m = parseMarket(marketsRaw[i], i);
    if (m) markets.push(m);
  }

  const hostFromPayload = typeof root.host === 'string' ? tryHostId(root.host) : undefined;
  const sbFromPayload =
    typeof root.sportsbookId === 'string' || typeof root.book === 'string'
      ? trySportsbookId(String(root.sportsbookId ?? root.book))
      : undefined;

  return {
    host: hostFromPayload ?? host,
    sportsbookId: sbFromPayload ?? sportsbookId,
    timestamp:
      asNumber(root.timestamp) ??
      (typeof root.fetchedAt === 'string' ? Date.parse(root.fetchedAt) || undefined : undefined) ??
      opts.timestamp ??
      Date.now(),
    source: opts.source ?? 'live',
    markets,
    limits: parseLimits(root.limits),
    contentHash: contentHash(text),
  };
}

/** Build a deterministic synthetic snapshot for tests / dry-run without network. */
export function syntheticSnapshot(
  host: string,
  markets: OddsMarket[],
  limits: OddsLimits = { maxBet: 500, minBet: 1 },
  timestamp = Date.now()
): OddsSnapshot {
  return {
    host: tryHostId(host) ?? asHostId(host),
    sportsbookId: trySportsbookId(host.split('.')[0] ?? '') ?? null,
    timestamp,
    source: 'synthetic',
    markets,
    limits,
    contentHash: contentHash(JSON.stringify({ host, markets, limits, timestamp })),
  };
}
