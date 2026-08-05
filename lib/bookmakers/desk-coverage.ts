/**
 * Seat-capital desk book labels ↔ public bookmakers registry coverage.
 *
 * Desk rows use free-text `book` (label / domain / placeholder). Registry uses
 * id === slug. This module classifies each distinct desk book string.
 *
 * @see public/registry/seat-capital-desk.json
 * @see public/registry/bookmakers.json
 */

import { bookmakerHost, type BookmakerRegistryEntry } from './resolve.ts';

/** Desk book strings that are not sportsbook entities. */
export const DESK_BOOK_PLACEHOLDERS = new Set([
  'partner book tbd',
  'southfl pph desk',
  '—',
  '-',
  'n/a',
  'tbd',
]);

export type DeskBookClass = 'matched' | 'placeholder' | 'unmatched';

export interface DeskBookHit {
  deskBook: string;
  class: DeskBookClass;
  registryId?: string;
  /** Parsed max bet dollars when desk shows a number (not "—"). */
  maxBetUsd?: number;
  samples: number;
}

export interface DeskCoverageReport {
  generatedAt: string;
  deskBooks: number;
  matched: number;
  placeholder: number;
  unmatched: number;
  hits: DeskBookHit[];
  /** registry ids never seen on desk (coverage gap the other way) */
  registryUnused: string[];
}

function parseMaxBet(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s || s === '—' || s === '-') return undefined;
  const n = Number(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Collect distinct desk `book` labels with sample counts + max bets. */
export function collectDeskBooks(desk: unknown): Map<string, { count: number; maxBets: number[] }> {
  const map = new Map<string, { count: number; maxBets: number[] }>();
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) {
      for (const x of o) walk(x);
      return;
    }
    if (!o || typeof o !== 'object') return;
    const rec = o as Record<string, unknown>;
    if (typeof rec.book === 'string' && rec.book.trim()) {
      const key = rec.book.trim();
      const cur = map.get(key) ?? { count: 0, maxBets: [] };
      cur.count += 1;
      const mb = parseMaxBet(rec.maxBet);
      if (mb != null) cur.maxBets.push(mb);
      map.set(key, cur);
    }
    for (const v of Object.values(rec)) walk(v);
  };
  walk(desk);
  return map;
}

/** Match a free-text desk book to a registry id (or null). */
export function matchDeskBookToRegistry(
  deskBook: string,
  registry: Record<string, BookmakerRegistryEntry>
): string | undefined {
  const q = deskBook.trim().toLowerCase();
  if (!q) return undefined;
  if (DESK_BOOK_PLACEHOLDERS.has(q)) return undefined;

  // exact id / slug
  if (registry[q]) return registry[q]!.id;
  const values = Object.values(registry);

  const byId = values.find(
    b => b.id.toLowerCase() === q || (b.slug && String(b.slug).toLowerCase() === q)
  );
  if (byId) return byId.id;

  // domain-like: parlay21.com ↔ parlay21-com
  const asSlug = q.replace(/\./g, '-');
  if (registry[asSlug]) return registry[asSlug]!.id;

  // label / skin / host
  for (const b of values) {
    const host = bookmakerHost(b).toLowerCase();
    const hostBare = host.replace(/^www\./, '');
    if (
      b.label?.toLowerCase() === q ||
      b.skin?.toLowerCase() === q ||
      host === q ||
      hostBare === q ||
      hostBare === q.replace(/^www\./, '')
    ) {
      return b.id;
    }
  }

  // partial id/label (Hard Rock Florida → hard-rock-florida via label)
  for (const b of values) {
    if (b.label && q.includes(b.label.toLowerCase())) return b.id;
    if (b.label && b.label.toLowerCase().includes(q) && q.length >= 4) return b.id;
    if (b.id.replace(/-/g, ' ') === q.replace(/-/g, ' ')) return b.id;
  }

  return undefined;
}

export function classifyDeskBook(
  deskBook: string,
  registry: Record<string, BookmakerRegistryEntry>
): { class: DeskBookClass; registryId?: string } {
  const q = deskBook.trim().toLowerCase();
  if (!q || DESK_BOOK_PLACEHOLDERS.has(q)) return { class: 'placeholder' };
  const id = matchDeskBookToRegistry(deskBook, registry);
  if (id) return { class: 'matched', registryId: id };
  return { class: 'unmatched' };
}

export function buildDeskCoverageReport(
  desk: unknown,
  registry: Record<string, BookmakerRegistryEntry>,
  generatedAt = new Date().toISOString()
): DeskCoverageReport {
  const collected = collectDeskBooks(desk);
  const hits: DeskBookHit[] = [];
  const usedIds = new Set<string>();

  for (const [deskBook, { count, maxBets }] of [...collected.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const { class: cls, registryId } = classifyDeskBook(deskBook, registry);
    if (registryId) usedIds.add(registryId);
    const maxBetUsd =
      maxBets.length > 0 ? Math.max(...maxBets) : undefined;
    hits.push({
      deskBook,
      class: cls,
      registryId,
      maxBetUsd,
      samples: count,
    });
  }

  const matched = hits.filter(h => h.class === 'matched').length;
  const placeholder = hits.filter(h => h.class === 'placeholder').length;
  const unmatched = hits.filter(h => h.class === 'unmatched').length;

  return {
    generatedAt,
    deskBooks: hits.length,
    matched,
    placeholder,
    unmatched,
    hits,
    registryUnused: Object.keys(registry)
      .filter(id => !usedIds.has(id))
      .sort(),
  };
}

/** Apply desk-observed maxBetUsd onto public catalog limits when missing. */
export function applyDeskMaxBetsToCatalog(
  bookmakers: Record<string, { limits?: { maxBetUsd?: number | null; [k: string]: unknown }; [k: string]: unknown }>,
  report: DeskCoverageReport
): number {
  let applied = 0;
  for (const hit of report.hits) {
    if (hit.class !== 'matched' || !hit.registryId || hit.maxBetUsd == null) continue;
    const row = bookmakers[hit.registryId];
    if (!row) continue;
    const limits = (row.limits ?? {}) as { maxBetUsd?: number | null };
    if (limits.maxBetUsd != null) continue;
    row.limits = { ...limits, maxBetUsd: hit.maxBetUsd };
    applied += 1;
  }
  return applied;
}
