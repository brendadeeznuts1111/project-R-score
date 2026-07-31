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
import { HARDROCK_SPORTSBOOK, scrape as scrapeHardRock } from './hardrock.ts';
import { FANATICS_SPORTSBOOK, scrape as scrapeFanatics } from './fanatics.ts';
import { BETRIVERS_SPORTSBOOK, scrape as scrapeBetRivers } from './betrivers.ts';
import { CIRCA_SPORTSBOOK, scrape as scrapeCirca } from './circa.ts';

/** Register each book once. Order = health status order. */
export const BOOK_SCRAPE_AGENTS: readonly BookScrapeAgent[] = [
  { bookId: DRAFTKINGS_SPORTSBOOK, scrape: scrapeDraftKings },
  { bookId: FANDUEL_SPORTSBOOK, scrape: scrapeFanDuel },
  { bookId: BET365_SPORTSBOOK, scrape: scrapeBet365 },
  { bookId: ESPNBET_SPORTSBOOK, scrape: scrapeEspnBet },
  { bookId: BETMGM_SPORTSBOOK, scrape: scrapeBetMgm },
  { bookId: CAESARS_SPORTSBOOK, scrape: scrapeCaesars },
  { bookId: HARDROCK_SPORTSBOOK, scrape: scrapeHardRock },
  { bookId: FANATICS_SPORTSBOOK, scrape: scrapeFanatics },
  { bookId: BETRIVERS_SPORTSBOOK, scrape: scrapeBetRivers },
  { bookId: CIRCA_SPORTSBOOK, scrape: scrapeCirca },
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
