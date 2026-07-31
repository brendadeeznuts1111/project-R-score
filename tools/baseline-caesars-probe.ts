#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Deep probe Caesars / American Wagering endpoints from the committed catalog.
 *
 * Default: probe public + limit_candidate (reports WAF). Does not place bets.
 *
 *   bun run baseline:caesars:probe
 *   bun run baseline:caesars:probe -- --location=co --json
 *   CAESARS_SCRAPE_COOKIE='...' bun run baseline:caesars:probe -- --live
 *
 * @see lib/operations/scrapers/catalogs/caesars-americanwagering.ts
 */
import { jsonOut } from '../lib/console-depth.ts';
import {
  CAESARS_BROWSER_HEADERS,
  CAESARS_ENDPOINT_CATALOG,
  resolveCaesarsEndpointTemplate,
  summarizeCaesarsEndpointCatalog,
  type CaesarsEndpointEntry,
} from '../lib/operations/scrapers/catalogs/caesars-americanwagering.ts';
import { fetchCaesarsBetsConfiguration } from '../lib/operations/scrapers/books/caesars.ts';
import {
  isCaesarsWafHtmlBody,
  parseCaesarsBetsConfiguration,
} from '../lib/operations/scrapers/books/caesars-parse.ts';
import { asStateCode } from '../lib/types/branded.ts';

const args = Bun.argv.slice(2);
const asJson = args.includes('--json');
const tryLive = args.includes('--live');
const bake = args.includes('--bake');
const locationArg = args.find(a => a.startsWith('--location='))?.slice('--location='.length);
const location = (locationArg ?? Bun.env.CAESARS_SCRAPE_LOCATION ?? 'nj').trim().toLowerCase();
const BAKE_PATH = new URL('../public/registry/caesars-scrape-endpoints.json', import.meta.url);

type ProbeRow = {
  id: string; // brand-ok — opaque catalog endpoint key (not a domain *Id)
  role: string;
  gate: string;
  url: string;
  status: number | null;
  kind: string;
  bytes: number;
  detail: string | null;
  parsedLimitRows?: number;
};

async function probeEntry(entry: CaesarsEndpointEntry): Promise<ProbeRow> {
  const url = resolveCaesarsEndpointTemplate(entry.template, { location });
  // Skip templates that still contain unsubstituted placeholders beyond location/brand
  if (url.includes('{')) {
    return {
      id: entry.id,
      role: entry.role,
      gate: entry.gate,
      url,
      status: null,
      kind: 'skipped_template',
      bytes: 0,
      detail: 'unresolved placeholders (sport/competitionId) — capture-only',
    };
  }
  if (url.startsWith('wss://')) {
    return {
      id: entry.id,
      role: entry.role,
      gate: entry.gate,
      url,
      status: null,
      kind: 'skipped_wss',
      bytes: 0,
      detail: 'websocket — not probed',
    };
  }

  const headers: Record<string, string> = { ...CAESARS_BROWSER_HEADERS };
  const cookie = Bun.env.CAESARS_SCRAPE_COOKIE?.trim();
  if (cookie) headers.Cookie = cookie;
  const waf = Bun.env.CAESARS_WAF_TOKEN?.trim();
  if (waf) headers['x-aws-waf-token'] = waf;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) });
    const text = await res.text();
    let kind = 'ok';
    if (res.status === 403 || isCaesarsWafHtmlBody(text)) kind = 'waf';
    else if (!res.ok) kind = 'http_error';
    else if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) kind = 'non_json';

    let parsedLimitRows: number | undefined;
    if (entry.role === 'limit_candidate' && kind === 'ok') {
      try {
        const data: unknown = JSON.parse(text);
        parsedLimitRows = parseCaesarsBetsConfiguration(data, {
          jurisdiction: asStateCode(location.toUpperCase()),
          referenceUrl: url,
        }).length;
      } catch {
        parsedLimitRows = 0;
      }
    }

    return {
      id: entry.id,
      role: entry.role,
      gate: entry.gate,
      url,
      status: res.status,
      kind,
      bytes: text.length,
      detail: entry.notes.slice(0, 120),
      parsedLimitRows,
    };
  } catch (error) {
    return {
      id: entry.id,
      role: entry.role,
      gate: entry.gate,
      url,
      status: null,
      kind: 'network',
      bytes: 0,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const summary = summarizeCaesarsEndpointCatalog();

  if (bake) {
    const artifact = {
      kind: 'caesars-scrape-endpoints',
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      host: {
        americanWagering: 'https://api.americanwagering.com',
        sportsbook: 'https://sportsbook.caesars.com',
        brand: 'czr',
      },
      primaryLiveUrl: caesarsLimitCandidateUrlFromCatalog(),
      summary,
      endpoints: CAESARS_ENDPOINT_CATALOG,
      captureNote:
        'Derived from sportsbook.caesars.com CO network capture 2026-07-31. Opening max USD not on public config; bets/configuration is WAF-gated.',
    };
    await Bun.write(BAKE_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
    console.info(`✅ wrote /registry/caesars-scrape-endpoints.json (${summary.total} endpoints)`);
    if (!tryLive && !asJson) return;
  }

  const probeRoles = new Set(['limit_candidate', 'feature_flags', 'region_config', 'odds_board']);
  const entries = CAESARS_ENDPOINT_CATALOG.filter(e => probeRoles.has(e.role));

  const rows: ProbeRow[] = [];
  for (const entry of entries) {
    rows.push(await probeEntry(entry));
  }

  let live: Awaited<ReturnType<typeof fetchCaesarsBetsConfiguration>> | null = null;
  if (tryLive) {
    live = await fetchCaesarsBetsConfiguration({ location });
  }

  const report = {
    location,
    catalog: summary,
    cookieConfigured: Boolean(Bun.env.CAESARS_SCRAPE_COOKIE?.trim()),
    wafTokenConfigured: Boolean(Bun.env.CAESARS_WAF_TOKEN?.trim()),
    probes: rows,
    live,
  };

  if (asJson) {
    jsonOut(report);
  } else {
    console.info(`Caesars AW probe · location=${location} · catalog=${summary.total} endpoints`);
    console.info(
      `  cookie=${report.cookieConfigured} wafToken=${report.wafTokenConfigured} liveFlag=${tryLive}`
    );
    for (const row of rows) {
      const extra = row.parsedLimitRows != null ? ` limits=${row.parsedLimitRows}` : '';
      console.info(
        `  [${row.kind}] ${row.status ?? '-'} ${row.id} (${row.role}/${row.gate}) ${row.bytes}b${extra}`
      );
      console.info(`       ${row.url}`);
    }
    if (live) {
      console.info(`  live bets/configuration → kind=${live.kind} status=${live.status}`);
    }
  }
}

function caesarsLimitCandidateUrlFromCatalog(): string {
  const entry = CAESARS_ENDPOINT_CATALOG.find(e => e.role === 'limit_candidate');
  return resolveCaesarsEndpointTemplate(entry!.template, { location: 'nj' });
}

if (import.meta.main) {
  await main();
}
