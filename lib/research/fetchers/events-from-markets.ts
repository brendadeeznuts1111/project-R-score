// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Derive PartnerEvent rows from ResearchMarket observations (fixture/live).
 */

import type {
  EventMarket,
  EventSession,
  FetchEventsOptions,
  PartnerEvent,
} from '../types/event.ts';
import type { ResearchMarket } from './types.ts';

function splitTeams(eventName: string): { home: string; away: string } {
  const raw = eventName.trim();
  // Strip trailing market suffixes so "NYY vs BOS Moneyline" → teams only
  const cleaned = raw
    .replace(/\s+(moneyline|ml|spread|total|over\/under|ou)\b.*$/i, '')
    .replace(/\s+Over\s+[\d.]+\s*$/i, '')
    .trim();
  const vs = cleaned.split(/\s+vs\.?\s+/i);
  if (vs.length >= 2) {
    return { home: vs[0]!.trim(), away: vs.slice(1).join(' vs ').trim() };
  }
  const at = cleaned.split(/\s+@\s+/);
  if (at.length >= 2) {
    return { home: at[1]!.trim(), away: at[0]!.trim() };
  }
  const dash = cleaned.split(/\s+[–—-]\s+/);
  if (dash.length >= 2) {
    return { home: dash[0]!.trim(), away: dash.slice(1).join(' - ').trim() };
  }
  return { home: cleaned || 'Home', away: 'Away' };
}

function inferSession(m: ResearchMarket): EventSession {
  if (m.session === 'live' || m.session === 'pregame') return m.session;
  const label = `${m.eventName ?? ''} ${m.label ?? ''}`.toLowerCase();
  if (label.includes('live') || label.includes('in-play') || label.includes('inplay')) {
    return 'live';
  }
  return 'pregame';
}

function resolveStartTime(rows: ResearchMarket[]): string {
  for (const r of rows) {
    if (r.startTime && !Number.isNaN(Date.parse(r.startTime))) return r.startTime;
  }
  return rows[0]?.observedAt || new Date().toISOString();
}

function eventGroupKey(m: ResearchMarket): string {
  const name = (m.eventName || m.label || m.marketId).trim().toLowerCase();
  // Group ML/spread/total for same matchup
  const baseName = name
    .replace(/\s+(moneyline|ml|spread|total|over\/under|ou)\b.*$/i, '')
    .replace(/\s+over\s+[\d.]+\s*$/i, '')
    .trim();
  return `${m.sport}|${m.league}|${baseName || name}`;
}

function toEventMarket(m: ResearchMarket): EventMarket {
  const maxStake = m.maxStakeUsd ?? m.maxStake ?? 0;
  const selections = (m.selections ?? []).map(s => ({
    label: s.label,
    price: s.price,
    maxStake,
  }));
  if (selections.length === 0) {
    selections.push({ label: m.label || m.marketType || 'line', price: 0, maxStake });
  }
  return { type: m.marketType || 'moneyline', selections };
}

/** Collapse market rows that share sport/league/eventName into PartnerEvents. */
export function partnerEventsFromMarkets(
  markets: ResearchMarket[],
  opts: FetchEventsOptions = {}
): PartnerEvent[] {
  const sessionFilter = opts.session ?? 'all';
  const sports = (opts.sports ?? []).map(s => s.toLowerCase());
  const groups = new Map<string, ResearchMarket[]>();

  for (const m of markets) {
    if (sports.length && !sports.includes(m.sport.toLowerCase())) continue;
    const session = inferSession(m);
    if (sessionFilter !== 'all' && session !== sessionFilter) continue;
    const key = eventGroupKey(m);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }

  const out: PartnerEvent[] = [];
  for (const rows of groups.values()) {
    const head = rows[0]!;
    const { home, away } = splitTeams(head.eventName || head.label || head.marketId);
    const session = rows.some(r => inferSession(r) === 'live') ? 'live' : inferSession(head);
    const marketsOut = rows.map(toEventMarket);
    const maxStakeUsd = Math.max(...rows.map(r => r.maxStakeUsd ?? r.maxStake ?? 0), 0);
    const id = head.marketId.includes('-')
      ? head.marketId.replace(/-(ml|spread|total|ou).*$/i, '') || head.marketId
      : `evt-${head.partnerId}-${new Bun.CryptoHasher('sha256').update(eventGroupKey(head)).digest('hex').slice(0, 10)}`;
    const startTime = resolveStartTime(rows);
    const lastUpdated = rows
      .map(r => r.observedAt)
      .sort()
      .at(-1)!;

    out.push({
      id,
      partnerId: head.partnerId,
      sport: head.sport,
      league: head.league,
      homeTeam: home,
      awayTeam: away,
      startTime,
      session,
      markets: marketsOut,
      lastUpdated,
      maxStakeUsd,
      source: head.source,
    });
  }
  return out;
}
