// RSS feed integration for Bun Matrix

import type { BunMatrixStore } from "./store";
import { CACHE_TTL_5MIN_MS } from "../tension-field/constants";

export async function updateFromRSS(store: BunMatrixStore, feedUrl: string): Promise<void> {
  const rssCache = store.getRssCache();
  const now = new Date();
  const cached = rssCache.get(feedUrl);

  if (cached && (now.getTime() - cached.lastFetch.getTime()) < CACHE_TTL_5MIN_MS) {
    return;
  }

  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();
    const entries = parseRSS(xml);

    for (const entry of entries) {
      const matrixEntry = store.get(entry.term);
      if (matrixEntry) {
        matrixEntry.lastUpdated = entry.lastUpdated;
        store.set(matrixEntry);
      }
    }

    rssCache.set(feedUrl, { lastFetch: now, entries: entries.length });
  } catch (error) {
    console.error(`Failed to fetch RSS from ${feedUrl}:`, error);
  }
}

export function parseRSS(xml: string): Array<{ term: string; lastUpdated: Date }> {
  const items = xml.match(/<item>(.*?)<\/item>/gs) || [];
  return items.map(item => {
    const termMatch = item.match(/<title>(.*?)<\/title>/);
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

    return {
      term: termMatch?.[1] || "unknown",
      lastUpdated: dateMatch ? new Date(dateMatch[1]) : new Date(),
    };
  });
}
