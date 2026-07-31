/**
 * Tier 4 scrape agent registry — one line per book.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import type { BookScrapeAgent } from '../book-scrape-agent.ts';
import type { SportsbookId } from '../domain.ts';
import { DRAFTKINGS_SPORTSBOOK, scrape as scrapeDraftKings } from './draftkings.ts';
import { FANDUEL_SPORTSBOOK, scrape as scrapeFanDuel } from './fanduel.ts';
import { ESPNBET_SPORTSBOOK, scrape as scrapeEspnBet } from './espnbet.ts';
import { BET365_SPORTSBOOK, scrape as scrapeBet365 } from './bet365.ts';
import { BETMGM_SPORTSBOOK, scrape as scrapeBetMgm } from './betmgm.ts';
import { CAESARS_SPORTSBOOK, scrape as scrapeCaesars } from './caesars.ts';

/** Register each book once. Order = health status order. */
export const BOOK_SCRAPE_AGENTS: readonly BookScrapeAgent[] = [
  { bookId: DRAFTKINGS_SPORTSBOOK, scrape: scrapeDraftKings },
  { bookId: FANDUEL_SPORTSBOOK, scrape: scrapeFanDuel },
  { bookId: BET365_SPORTSBOOK, scrape: scrapeBet365 },
  { bookId: ESPNBET_SPORTSBOOK, scrape: scrapeEspnBet },
  { bookId: BETMGM_SPORTSBOOK, scrape: scrapeBetMgm },
  { bookId: CAESARS_SPORTSBOOK, scrape: scrapeCaesars },
];

export function trackedScrapeBooks(): readonly SportsbookId[] {
  return BOOK_SCRAPE_AGENTS.map(agent => agent.bookId);
}

export function getBookScrapeAgent(bookId: SportsbookId): BookScrapeAgent {
  const agent = BOOK_SCRAPE_AGENTS.find(entry => entry.bookId === bookId);
  if (!agent) {
    throw new Error(
      `Unknown scrape bookId "${bookId}". Registered: ${trackedScrapeBooks().join(', ')}`
    );
  }
  return agent;
}
