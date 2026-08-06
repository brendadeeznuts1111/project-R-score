// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
/**
 * DraftKings HTML → LimitObservation[] (synthetic [data-fw-limit] contract).
 *
 * @see docs/WIRE_BOUNDARY.md
 * @see docs/harness/tenants/partner-limits.md
 */

import { asSportsbookId, asStateCode, tryStateCode } from '../domain.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';
import {
  normalizeScrapeMarket,
  normalizeScrapePhase,
  normalizeScrapeSport,
} from '../scrape-wire-taxonomy.ts';

export const DRAFTKINGS_HTML_SPORTSBOOK = asSportsbookId('draftkings');
export const DRAFTKINGS_HTML_AGENT = 'draftkings-agent' as const;

export type DraftKingsHtmlMode = Extract<LimitObservation['mode'], 'html_fixture' | 'html_live'>;

export type ParseDraftKingsHtmlOptions = {
  observedAt: string;
  mode: DraftKingsHtmlMode;
  referenceUrl?: string | null;
};

type RawLimitAttrs = {
  sport: string | null;
  market: string | null;
  jurisdiction: string | null;
  structure: string | null;
  phase: string | null;
  openingMax: string | null;
  openingMin: string | null;
  daily: string | null;
  weekly: string | null;
  vip: string | null;
  league: string | null;
  eventType: string | null;
};

function parsePositiveNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseOptionalNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function structureFromRaw(raw: string | null): LimitObservation['structure'] {
  if (raw == null) return 'straight';
  return /parlay|multi|sgp|byo/i.test(raw) || raw.toLowerCase() === 'parlay'
    ? 'parlay'
    : 'straight';
}

function attrsToObservation(
  attrs: RawLimitAttrs,
  options: ParseDraftKingsHtmlOptions
): LimitObservation | null {
  const openingMaxUsd = parsePositiveNumber(attrs.openingMax);
  if (openingMaxUsd == null) return null;
  if (!attrs.sport || !attrs.market) return null;

  const sport = normalizeScrapeSport(attrs.sport);
  const market = normalizeScrapeMarket(attrs.market);
  const jurisdiction = tryStateCode(attrs.jurisdiction ?? undefined) ?? asStateCode('NJ');
  const structure = structureFromRaw(attrs.structure);
  const phase = normalizeScrapePhase(attrs.phase);
  const stamp = options.observedAt.slice(0, 10);

  return {
    sportsbook: DRAFTKINGS_HTML_SPORTSBOOK,
    sport,
    market,
    jurisdiction,
    structure,
    phase,
    openingMaxUsd,
    openingMinUsd: parseOptionalNumber(attrs.openingMin),
    dailyLimitUsd: parseOptionalNumber(attrs.daily),
    weeklyLimitUsd: parseOptionalNumber(attrs.weekly),
    vipLimitUsd: parseOptionalNumber(attrs.vip),
    league: attrs.league && attrs.league.length > 0 ? attrs.league : null,
    eventType: attrs.eventType && attrs.eventType.length > 0 ? attrs.eventType : null,
    referenceUrl: options.referenceUrl ?? null,
    sourceRef: `scrape:html/draftkings-${jurisdiction.toLowerCase()}-${sport}-${market}-${structure}-${phase}-${stamp}`,
    observedAt: options.observedAt,
    agent: DRAFTKINGS_HTML_AGENT,
    mode: options.mode,
  };
}

/**
 * Parse synthetic DraftKings limits HTML at the wire boundary.
 * Empty / malicious input → empty array (fail closed; no throw of interior unknown).
 */
export async function parseDraftKingsHtml(
  html: string,
  options: ParseDraftKingsHtmlOptions
): Promise<LimitObservation[]> {
  if (typeof html !== 'string' || html.length === 0) return [];

  const collected: RawLimitAttrs[] = [];
  try {
    await new HTMLRewriter()
      .on('[data-fw-limit]', {
        element(el) {
          collected.push({
            sport: el.getAttribute('data-sport'),
            market: el.getAttribute('data-market'),
            jurisdiction: el.getAttribute('data-jurisdiction'),
            structure: el.getAttribute('data-structure'),
            phase: el.getAttribute('data-phase'),
            openingMax: el.getAttribute('data-opening-max'),
            openingMin: el.getAttribute('data-opening-min'),
            daily: el.getAttribute('data-daily'),
            weekly: el.getAttribute('data-weekly'),
            vip: el.getAttribute('data-vip'),
            league: el.getAttribute('data-league'),
            eventType: el.getAttribute('data-event-type'),
          });
        },
      })
      .transform(new Response(html))
      .arrayBuffer();
  } catch {
    return [];
  }

  const out: LimitObservation[] = [];
  for (const attrs of collected) {
    const row = attrsToObservation(attrs, options);
    if (row) out.push(row);
  }
  return out;
}
