/**
 * Scrape-wire / sports / desk schema audit.
 *
 * Validates governance invariants:
 * 1. Every sport referenced by a league exists in the sport registry
 * 2. Every league used on the limits desk is in the league registry
 * 3. Desk sport / market / competition / phase values ⊆ scrape-wire registries
 * 4. Every US top-10 book has a vendor alias map with canonical targets
 * 5. Scrape-wire ↔ competition-catalog parity (sports, leagues)
 * 6. Color kernel covers every book / sport / league (Bun.color HEX wire on bake)
 *
 * Desk column values are passed in (from portal semantic vocabulary) so this
 * module does not import portal — wire boundary stays operations-owned.
 *
 * SSOT triad: scrape-wire taxonomy · domain glossary · portal semantic vocabulary.
 *
 * @see bun run schema:audit
 * @see docs/harness/tenants/partner-limits.md
 */

import {
  COMPETITIONS,
  COMPETITION_KEYS,
  LEAGUES,
  LEAGUE_KEYS,
  SPORTS,
  SPORT_KEYS,
  validateSportsTaxonomy,
} from '../sports-competition-catalog.ts';
import { listBookVendorAliasCoverage, SCRAPE_BOOK_VENDOR_ALIASES } from './book-vendor-aliases.ts';
import {
  SCRAPE_WIRE_BOOK_COLOR_KEYS,
  assertScrapeWireColorCoverage,
} from './scrape-wire-color-kernel.ts';
import {
  SCRAPE_BOOK_KEYS,
  SCRAPE_LEAGUE_KEYS,
  SCRAPE_LEAGUE_TO_SPORT,
  SCRAPE_MARKET_KEYS,
  SCRAPE_PHASE_KEYS,
  SCRAPE_SPORT_KEYS,
  SCRAPE_STATE_KEYS,
  buildScrapeWireTaxonomyArtifact,
} from './scrape-wire-taxonomy.ts';

export type SchemaAuditIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

/** Desk column value slices from portal semantic vocabulary (`ops.limits.*`). */
export type DeskColumnValues = {
  sports?: readonly string[];
  leagues?: readonly string[];
  competitions?: readonly string[];
  markets?: readonly string[];
  phases?: readonly string[];
};

export type SchemaAuditReport = {
  kind: 'scrape-wire-schema-audit';
  schemaVersion: 1;
  generatedAt: string;
  ok: boolean;
  summary: {
    errors: number;
    warnings: number;
    sports: number;
    leagues: number;
    competitions: number;
    books: number;
    deskLeagues: number;
    deskSports: number;
  };
  issues: SchemaAuditIssue[];
  bookVendorAliases: ReturnType<typeof listBookVendorAliasCoverage>;
};

function issue(
  code: string,
  message: string,
  path?: string,
  severity: 'error' | 'warning' = 'error'
): SchemaAuditIssue {
  return { code, severity, message, path };
}

/**
 * Run full scrape-wire + desk governance audit.
 * Does not throw — returns a report; CLI exits non-zero when `ok` is false.
 */
export function auditScrapeWireSchema(
  desk: DeskColumnValues = {},
  generatedAt: string = new Date().toISOString()
): SchemaAuditReport {
  const issues: SchemaAuditIssue[] = [];
  const deskLeagues = desk.leagues ?? [];
  const deskSports = desk.sports ?? [];
  const deskCompetitions = desk.competitions ?? [];
  const deskMarkets = desk.markets ?? [];
  const deskPhases = desk.phases ?? [];

  // ── 1. Competition taxonomy structural validate ──────────────────
  try {
    validateSportsTaxonomy();
  } catch (err) {
    issues.push(
      issue(
        'taxonomy.validate',
        err instanceof Error ? err.message : String(err),
        'lib/operations/sports-competition-catalog.ts'
      )
    );
  }

  // ── 2. Every league.sport exists in SPORT_KEYS ───────────────────
  const sportSet = new Set<string>(SPORT_KEYS);
  for (const league of LEAGUES) {
    if (!sportSet.has(league.sport)) {
      issues.push(
        issue(
          'league.unknown_sport',
          `League ${league.key} references unknown sport ${league.sport}`,
          `league.${league.key}`
        )
      );
    }
  }

  // ── 3. Scrape-wire league→sport parity ───────────────────────────
  for (const leagueKey of SCRAPE_LEAGUE_KEYS) {
    const sport = SCRAPE_LEAGUE_TO_SPORT[leagueKey];
    if (!sport || !sportSet.has(sport)) {
      issues.push(
        issue(
          'scrape.league_sport',
          `Scrape league ${leagueKey} maps to missing sport ${sport ?? '(none)'}`,
          `scrape.league.${leagueKey}`
        )
      );
    }
  }

  if (SCRAPE_SPORT_KEYS.length !== SPORT_KEYS.length) {
    issues.push(
      issue(
        'scrape.sport_parity',
        `SCRAPE_SPORT_KEYS (${SCRAPE_SPORT_KEYS.length}) ≠ SPORT_KEYS (${SPORT_KEYS.length})`,
        'scrape-wire-taxonomy'
      )
    );
  }
  if (SCRAPE_LEAGUE_KEYS.length !== LEAGUE_KEYS.length) {
    issues.push(
      issue(
        'scrape.league_parity',
        `SCRAPE_LEAGUE_KEYS (${SCRAPE_LEAGUE_KEYS.length}) ≠ LEAGUE_KEYS (${LEAGUE_KEYS.length})`,
        'scrape-wire-taxonomy'
      )
    );
  }

  // ── 4. Desk leagues ⊆ league registry ────────────────────────────
  const leagueSet = new Set<string>(LEAGUE_KEYS);
  for (const league of deskLeagues) {
    if (!leagueSet.has(league)) {
      issues.push(
        issue(
          'desk.league_missing',
          `Desk league "${league}" is not in the competition league registry`,
          'ops.limits.league'
        )
      );
    }
  }

  // ── 5. Desk sports ⊆ sport registry ──────────────────────────────
  for (const sport of deskSports) {
    if (!sportSet.has(sport)) {
      issues.push(
        issue(
          'desk.sport_missing',
          `Desk sport "${sport}" is not in the sport registry (SPORT_KEYS)`,
          'ops.limits.sport'
        )
      );
    }
  }

  // ── 6. Desk markets ⊆ scrape market keys ─────────────────────────
  const marketSet = new Set<string>(SCRAPE_MARKET_KEYS);
  for (const market of deskMarkets) {
    if (!marketSet.has(market)) {
      issues.push(
        issue(
          'desk.market_missing',
          `Desk market_type "${market}" is not in SCRAPE_MARKET_KEYS`,
          'ops.limits.market_type'
        )
      );
    }
  }

  // ── 7. Desk competitions ⊆ competition registry ──────────────────
  const competitionSet = new Set<string>(COMPETITION_KEYS);
  for (const competition of deskCompetitions) {
    if (!competitionSet.has(competition)) {
      issues.push(
        issue(
          'desk.competition_missing',
          `Desk competition "${competition}" is not in COMPETITION_KEYS`,
          'ops.limits.competition'
        )
      );
    }
  }

  // ── 8. Desk phases (pregame|live) ⊆ scrape phases; straight is structure ──
  const phaseSet = new Set<string>(SCRAPE_PHASE_KEYS);
  for (const phase of deskPhases) {
    if (phase === 'straight') {
      issues.push(
        issue(
          'desk.phase_structure_bleed',
          'ops.limits.market_phase includes "straight" (bet structure, not phase). Prefer ops.limits.multi_structure.',
          'ops.limits.market_phase',
          'warning'
        )
      );
      continue;
    }
    if (!phaseSet.has(phase)) {
      issues.push(
        issue(
          'desk.phase_missing',
          `Desk market_phase "${phase}" is not in SCRAPE_PHASE_KEYS (pregame|live)`,
          'ops.limits.market_phase'
        )
      );
    }
  }

  // ── 9. Per-book vendor alias maps cover the fleet ────────────────
  for (const bookId of SCRAPE_BOOK_KEYS) {
    const map = SCRAPE_BOOK_VENDOR_ALIASES[bookId];
    if (!map) {
      issues.push(
        issue(
          'book.alias_map_missing',
          `No vendor alias map for sportsbook ${bookId}`,
          `book-vendor-aliases.${bookId}`
        )
      );
      continue;
    }
    if (Object.keys(map.sports).length === 0 || Object.keys(map.markets).length === 0) {
      issues.push(
        issue(
          'book.alias_map_empty',
          `Vendor alias map for ${bookId} is missing sports or markets`,
          `book-vendor-aliases.${bookId}`
        )
      );
    }
    for (const [alias, sport] of Object.entries(map.sports)) {
      if (!sportSet.has(sport)) {
        issues.push(
          issue(
            'book.alias_bad_sport',
            `${bookId} sport alias "${alias}" → unknown ${sport}`,
            `book-vendor-aliases.${bookId}.sports`
          )
        );
      }
    }
    for (const [alias, market] of Object.entries(map.markets)) {
      if (!marketSet.has(market)) {
        issues.push(
          issue(
            'book.alias_bad_market',
            `${bookId} market alias "${alias}" → unknown ${market}`,
            `book-vendor-aliases.${bookId}.markets`
          )
        );
      }
    }
    for (const [alias, league] of Object.entries(map.leagues)) {
      if (!leagueSet.has(league)) {
        issues.push(
          issue(
            'book.alias_bad_league',
            `${bookId} league alias "${alias}" → unknown ${league}`,
            `book-vendor-aliases.${bookId}.leagues`
          )
        );
      }
    }
    for (const [alias, phase] of Object.entries(map.phases)) {
      if (!phaseSet.has(phase)) {
        issues.push(
          issue(
            'book.alias_bad_phase',
            `${bookId} phase alias "${alias}" → unknown ${phase}`,
            `book-vendor-aliases.${bookId}.phases`
          )
        );
      }
    }
  }

  // ── 10. State registry sanity ────────────────────────────────────
  if (SCRAPE_STATE_KEYS.length !== 51) {
    issues.push(
      issue(
        'scrape.state_count',
        `Expected 51 US jurisdictions (50 states + DC), found ${SCRAPE_STATE_KEYS.length}`,
        'scrape-wire-taxonomy.states'
      )
    );
  }

  // ── 11. Color kernel covers every book / sport / league ──────────
  try {
    assertScrapeWireColorCoverage();
    if (SCRAPE_WIRE_BOOK_COLOR_KEYS.length !== SCRAPE_BOOK_KEYS.length) {
      issues.push(
        issue(
          'color.book_parity',
          `SCRAPE_WIRE_BOOK_COLOR_KEYS (${SCRAPE_WIRE_BOOK_COLOR_KEYS.length}) ≠ SCRAPE_BOOK_KEYS (${SCRAPE_BOOK_KEYS.length})`,
          'scrape-wire-color-kernel'
        )
      );
    }
    for (const book of SCRAPE_BOOK_KEYS) {
      if (
        !SCRAPE_WIRE_BOOK_COLOR_KEYS.includes(book as (typeof SCRAPE_WIRE_BOOK_COLOR_KEYS)[number])
      ) {
        issues.push(
          issue(
            'color.book_missing',
            `Sportsbook ${book} has no color kernel role`,
            `scrape-wire-color-kernel.book.${book}`
          )
        );
      }
    }
    const artifact = buildScrapeWireTaxonomyArtifact(generatedAt);
    for (const row of artifact.bookRegistry) {
      if (!row.hex?.startsWith('#') || row.colorKey !== row.key) {
        issues.push(
          issue(
            'color.book_bake',
            `Book registry row ${row.key} missing valid color wire`,
            `scrape-wire-taxonomy.bookRegistry.${row.key}`
          )
        );
      }
    }
    for (const row of artifact.sportRegistry) {
      if (!row.hex?.startsWith('#') || row.colorKey !== row.key) {
        issues.push(
          issue(
            'color.sport_bake',
            `Sport registry row ${row.key} missing valid color wire`,
            `scrape-wire-taxonomy.sportRegistry.${row.key}`
          )
        );
      }
    }
    for (const row of artifact.leagueRegistry) {
      if (!row.hex?.startsWith('#') || row.colorKey !== row.key) {
        issues.push(
          issue(
            'color.league_bake',
            `League registry row ${row.key} missing valid color wire`,
            `scrape-wire-taxonomy.leagueRegistry.${row.key}`
          )
        );
      }
    }
  } catch (err) {
    issues.push(
      issue(
        'color.kernel',
        err instanceof Error ? err.message : String(err),
        'scrape-wire-color-kernel'
      )
    );
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return {
    kind: 'scrape-wire-schema-audit',
    schemaVersion: 1,
    generatedAt,
    ok: errors === 0,
    summary: {
      errors,
      warnings,
      sports: SPORTS.length,
      leagues: LEAGUES.length,
      competitions: COMPETITIONS.length,
      books: SCRAPE_BOOK_KEYS.length,
      deskLeagues: deskLeagues.length,
      deskSports: deskSports.length,
    },
    issues,
    bookVendorAliases: listBookVendorAliasCoverage(),
  };
}

/** Throw when audit has errors (for programmatic gates). */
export function assertScrapeWireSchema(desk: DeskColumnValues = {}): SchemaAuditReport {
  const report = auditScrapeWireSchema(desk);
  if (!report.ok) {
    const msgs = report.issues
      .filter(i => i.severity === 'error')
      .map(i => `${i.code}: ${i.message}`)
      .join('\n');
    throw new Error(`schema:audit failed (${report.summary.errors} errors)\n${msgs}`);
  }
  return report;
}
