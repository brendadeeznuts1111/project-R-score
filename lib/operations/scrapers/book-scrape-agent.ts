/**
 * Tier 4 book scrape agent contract.
 *
 * To add a book:
 *   1. Implement scrape() → LimitObservation[] in books/{id}.ts
 *   2. Export bookId
 *   3. Register one line in books/registry.ts
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import type { LimitObservation } from './limit-observation-wire.ts';
import type { SportsbookId } from './domain.ts';

export type BookScrapeOptions = {
  live?: boolean;
  /**
   * HTML path — DraftKings uses fixture parse by default; live WebView when
   * combined with `live` / `OPERATOR_WEBVIEW_SCRAPE=1`. Other books may stub
   * fail-closed until a parser ships.
   */
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

export type BookScrapeAgent = {
  /** Sportsbook slug — also the health / JSONL key. */
  bookId: SportsbookId;
  /** Fetch + normalize observations for this book. */
  scrape: (opts?: BookScrapeOptions) => Promise<LimitObservation[]>;
};
