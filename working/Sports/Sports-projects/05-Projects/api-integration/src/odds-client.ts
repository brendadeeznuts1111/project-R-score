// API Integration - Odds API HTTP Client
//
// Fetches odds data from https://api.odds.com
// Polling-based updates
//
// Flow:
// 1. GET /odds?gameId=xxx
// 2. Parse response → OddsData
// 3. Cache results
// 4. Emit updates to handlers

import type { OddsData, EventHandler, ApiConfig } from "./types";

export class OddsClient {
  private config: ApiConfig["odds"];
  private handlers: Set<EventHandler<OddsData>> = new Set();
  private cache: Map<string, OddsData> = new Map();
  private pollInterval: Timer | null = null;
  private polling = false;

  constructor(config: ApiConfig["odds"]) {
    this.config = config;
  }

  async fetchOdds(gameId: string): Promise<OddsData> {
    const url = new URL(`${this.config.url}/odds`);
    url.searchParams.set("gameId", gameId);
    url.searchParams.set("api_key", this.config.apiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`Failed to fetch odds: ${res.status}`);
    }

    const data = await res.json();
    const odds = this.parseOdds(gameId, data);

    // Update cache
    const previous = this.cache.get(gameId);
    this.cache.set(gameId, odds);

    // Emit if changed
    if (!previous || this.hasChanged(previous, odds)) {
      this.emit(odds);
    }

    return odds;
  }

  async fetchAllOdds(gameIds: string[]): Promise<OddsData[]> {
    const results = await Promise.all(
      gameIds.map((id) => this.fetchOdds(id).catch(() => null))
    );
    return results.filter((r): r is OddsData => r !== null);
  }

  startPolling(gameIds: string[], intervalMs: number = 5000): void {
    if (this.polling) return;

    this.polling = true;
    this.pollInterval = setInterval(async () => {
      await this.fetchAllOdds(gameIds);
    }, intervalMs);

    // Initial fetch
    this.fetchAllOdds(gameIds);
  }

  stopPolling(): void {
    this.polling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  isPolling(): boolean {
    return this.polling;
  }

  onUpdate(handler: EventHandler<OddsData>): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(odds: OddsData): void {
    for (const handler of this.handlers) {
      try {
        handler(odds);
      } catch {
        // Ignore handler errors
      }
    }
  }

  getCached(gameId: string): OddsData | undefined {
    return this.cache.get(gameId);
  }

  getAllCached(): OddsData[] {
    return Array.from(this.cache.values());
  }

  clearCache(): void {
    this.cache.clear();
  }

  private parseOdds(gameId: string, data: unknown): OddsData {
    const raw = data as Record<string, unknown>;
    return {
      gameId,
      market: String(raw.market || "moneyline"),
      homeOdds: Number(raw.home_odds ?? raw.homeOdds ?? 0),
      awayOdds: Number(raw.away_odds ?? raw.awayOdds ?? 0),
      spread: raw.spread !== undefined ? Number(raw.spread) : undefined,
      overUnder: raw.over_under !== undefined ? Number(raw.over_under) : undefined,
      timestamp: Number(raw.timestamp || Date.now()),
    };
  }

  private hasChanged(a: OddsData, b: OddsData): boolean {
    return (
      a.homeOdds !== b.homeOdds ||
      a.awayOdds !== b.awayOdds ||
      a.spread !== b.spread ||
      a.overUnder !== b.overUnder
    );
  }
}
