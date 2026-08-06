/**
 * Partner-aware filters for desk alert rules.
 * Uses the merged bookmakers registry (public + ops) for geo / limits / eligibility.
 */

import {
  isArbEligible,
  loadMergedRegistry,
  lookupBookByHost,
  type MergedBook,
  type MergedRegistry,
} from '../../bookmakers/merge.ts';
import type { BookRegion } from '../../bookmakers/v04-types.ts';
import type { AlertRule } from './alerts.ts';

export type PartnerContext = {
  partnerIds: string[];
  labels: string[];
  hosts: string[];
  books: MergedBook[];
};

function regionCountry(r: BookRegion): string {
  if (typeof r === 'string') return r.trim().toUpperCase();
  return String(r.country ?? '')
    .trim()
    .toUpperCase();
}

function regionState(r: BookRegion): string | null {
  if (typeof r === 'string') return null;
  const s = r.stateCode?.trim();
  return s ? s.toUpperCase() : null;
}

/** Resolve book rows from hostnames and/or explicit partner ids. */
export function resolvePartnerContext(
  opts: {
    hosts?: Array<string | null | undefined>;
    partnerIds?: Array<string | null | undefined>;
    bookmakerNames?: Array<string | null | undefined>;
  },
  registry: MergedRegistry = loadMergedRegistry()
): PartnerContext {
  const byId = new Map<string, MergedBook>();

  for (const host of opts.hosts ?? []) {
    if (!host) continue;
    const book = lookupBookByHost(registry, host);
    if (book) byId.set(book.id, book);
  }

  for (const pid of opts.partnerIds ?? []) {
    if (!pid) continue;
    const key = String(pid).trim();
    const book =
      registry.books[key] ??
      Object.values(registry.books).find(
        b => b.id === key || b.slug === key || b.label.toLowerCase() === key.toLowerCase()
      );
    if (book) byId.set(book.id, book);
  }

  for (const name of opts.bookmakerNames ?? []) {
    if (!name) continue;
    const n = String(name).trim().toLowerCase();
    const book = Object.values(registry.books).find(
      b => b.label.toLowerCase() === n || b.slug.toLowerCase() === n || b.id.toLowerCase() === n
    );
    if (book) byId.set(book.id, book);
  }

  const books = [...byId.values()];
  return {
    partnerIds: books.map(b => b.id),
    labels: books.map(b => b.label),
    hosts: books.map(b => b.etldPlusOne).filter(Boolean),
    books,
  };
}

/** Parse `fonbet_vs_betmgm` / `fonbet-vs-betmgm` into book id tokens. */
export function parseBookmakerComparison(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .trim()
    .toLowerCase()
    .split(/_vs_|-vs-|_versus_|-versus-|\s+vs\s+/i)
    .map(s => s.trim())
    .filter(Boolean);
}

function bookMatchesToken(book: MergedBook, token: string): boolean {
  const t = token.toLowerCase();
  return (
    book.id.toLowerCase() === t ||
    book.slug.toLowerCase() === t ||
    book.label.toLowerCase() === t ||
    book.etldPlusOne.toLowerCase().includes(t) ||
    book.id.toLowerCase().includes(t) ||
    book.slug.toLowerCase().includes(t)
  );
}

/**
 * True when the opportunity satisfies partner-scoped rule filters.
 * Missing registry data is treated leniently (does not block) except
 * explicit partner_ids / bookmaker_comparison mismatches.
 */
export function ruleMatchesPartners(
  rule: AlertRule,
  ctx: PartnerContext,
  opts: {
    marketCode?: string | null;
    latencyMs?: number | null;
    /** When true, require all resolved books to be arb-eligible. */
    requireArbEligible?: boolean;
  } = {}
): boolean {
  if (rule.partnerIds?.length) {
    const want = new Set(rule.partnerIds.map(p => p.toLowerCase()));
    const hit = ctx.books.some(b => want.has(b.id.toLowerCase()) || want.has(b.slug.toLowerCase()));
    if (!hit) return false;
  }

  const comparison = parseBookmakerComparison(rule.bookmakerComparison);
  if (comparison.length >= 2) {
    if (ctx.books.length < 2) return false;
    const matched = comparison.every(token => ctx.books.some(b => bookMatchesToken(b, token)));
    if (!matched) return false;
  }

  if (rule.marketType && rule.marketType !== 'all' && opts.marketCode) {
    if (String(opts.marketCode).toLowerCase() !== rule.marketType.toLowerCase()) {
      return false;
    }
  }

  if (rule.geo && rule.geo.toLowerCase() !== 'all' && ctx.books.length) {
    const geo = rule.geo.toUpperCase();
    const booksWithRegions = ctx.books.filter(b => (b.regions?.length ?? 0) > 0);
    if (booksWithRegions.length) {
      const geoOk = booksWithRegions.some(b =>
        (b.regions ?? []).some(r => regionCountry(r) === geo)
      );
      if (!geoOk) return false;
    }
  }

  if (rule.state && ctx.books.length) {
    const state = rule.state.toUpperCase();
    const booksWithState = ctx.books.filter(b =>
      (b.regions ?? []).some(r => regionState(r) === state)
    );
    // Only enforce when at least one book declares state codes
    const anyStateDeclared = ctx.books.some(b =>
      (b.regions ?? []).some(r => regionState(r) != null)
    );
    if (anyStateDeclared && booksWithState.length === 0) return false;
  }

  if (rule.limit && ctx.books.length) {
    const maxes = ctx.books
      .map(b => b.limits?.maxBetUsd)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    if (maxes.length) {
      const bestMax = Math.max(...maxes);
      if (rule.limit.min != null && bestMax + 1e-9 < rule.limit.min) return false;
      if (rule.limit.max != null && bestMax - 1e-9 > rule.limit.max * 50) {
        // Soft cap: only reject when desk max is wildly above rule max * 50
        // (rule.limit.max is intended stake band, not book maxBet). Skip hard reject.
      }
      // Prefer stake-band as "book must allow at least min"
      if (rule.limit.min != null) {
        const canStake = maxes.some(m => m >= rule.limit!.min!);
        if (!canStake) return false;
      }
    }
  }

  if (
    rule.latencyThreshold != null &&
    opts.latencyMs != null &&
    Number.isFinite(opts.latencyMs) &&
    opts.latencyMs > rule.latencyThreshold
  ) {
    return false;
  }

  if (opts.requireArbEligible && ctx.books.length) {
    if (ctx.books.some(b => !isArbEligible(b))) return false;
  }

  return true;
}

export function enrichAlertPartnerFields(ctx: PartnerContext): {
  partner_ids: string[];
  partners: Array<{
    id: string; // brand-ok — opaque research/wire id
    label: string;
    host: string;
    status: string;
    liquidityTier: string;
  }>;
} {
  return {
    partner_ids: ctx.partnerIds,
    partners: ctx.books.map(b => ({
      id: b.id,
      label: b.label,
      host: b.etldPlusOne,
      status: b.status,
      liquidityTier: b.liquidityTier,
    })),
  };
}
