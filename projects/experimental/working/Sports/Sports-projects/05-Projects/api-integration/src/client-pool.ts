// API Integration - Unified Client Pool
//
// Single connection pool managing all API clients
// Provides unified interface for games and odds data

import type { ApiConfig, GameEvent, OddsData, ConnectionStatus } from "./types";
import { SportradarClient } from "./sportradar-client";
import { OddsClient } from "./odds-client";
import { loadConfig, validateConfig } from "./config";

export class ClientPool {
  private sportradar: SportradarClient;
  private odds: OddsClient;
  private config: ApiConfig;
  private games: Map<string, GameEvent> = new Map();

  constructor(config?: ApiConfig) {
    this.config = config || loadConfig();
    this.sportradar = new SportradarClient(this.config.sportradar);
    this.odds = new OddsClient(this.config.odds);

    // Wire up game events to internal store
    this.sportradar.onEvent((event) => {
      this.games.set(event.id, event);
    });
  }

  validate(): { valid: boolean; errors: string[] } {
    return validateConfig(this.config);
  }

  async connect(): Promise<void> {
    await this.sportradar.connect();
    // Subscribe to configured sports
    for (const sport of this.config.sportradar.sports) {
      this.sportradar.subscribe(sport);
    }
  }

  async disconnect(): Promise<void> {
    await this.sportradar.disconnect();
    this.odds.stopPolling();
  }

  getStatus(): ConnectionStatus {
    return {
      sportradar: this.sportradar.getState() === "connected" ? "connected" : "disconnected",
      odds: this.odds.isPolling() ? "connected" : "disconnected",
      lastUpdate: Date.now(),
    };
  }

  // Game methods
  onGameEvent(handler: (event: GameEvent) => void): () => void {
    return this.sportradar.onEvent(handler);
  }

  getGame(id: string): GameEvent | undefined {
    return this.games.get(id);
  }

  getAllGames(): GameEvent[] {
    return Array.from(this.games.values());
  }

  getGameIds(): string[] {
    return Array.from(this.games.keys());
  }

  // Odds methods
  async fetchOdds(gameId: string): Promise<OddsData> {
    return this.odds.fetchOdds(gameId);
  }

  async fetchAllOdds(): Promise<OddsData[]> {
    const gameIds = this.getGameIds();
    return this.odds.fetchAllOdds(gameIds);
  }

  onOddsUpdate(handler: (odds: OddsData) => void): () => void {
    return this.odds.onUpdate(handler);
  }

  startOddsPolling(intervalMs: number = 5000): void {
    const gameIds = this.getGameIds();
    if (gameIds.length > 0) {
      this.odds.startPolling(gameIds, intervalMs);
    }
  }

  stopOddsPolling(): void {
    this.odds.stopPolling();
  }

  getCachedOdds(gameId: string): OddsData | undefined {
    return this.odds.getCached(gameId);
  }

  // Expose underlying clients for advanced usage
  getSportradarClient(): SportradarClient {
    return this.sportradar;
  }

  getOddsClient(): OddsClient {
    return this.odds;
  }
}

// Singleton instance
let poolInstance: ClientPool | null = null;

export function getPool(config?: ApiConfig): ClientPool {
  if (!poolInstance) {
    poolInstance = new ClientPool(config);
  }
  return poolInstance;
}

export function resetPool(): void {
  if (poolInstance) {
    poolInstance.disconnect();
    poolInstance = null;
  }
}
