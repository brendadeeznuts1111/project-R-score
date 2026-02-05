/**
 * Market Data Ingestor
 * Live odds ingestion with simulated/live modes
 */

import type { MarketFeed, OddsTick, TickBatch } from '../types';

export interface IngestorConfig {
  source: 'odds_shark' | 'vegas_insider' | 'demo';
  apiKey?: string;
  rateLimit?: number;
}

// December 29, 2025 NBA Schedule
export const DEC_29_GAMES: MarketFeed[] = [
  { id: 'MIL@CHA', tipoff: '18:00', opening: { spread: -2.5, ml: -130, total: 226.5 } },
  { id: 'PHX@WAS', tipoff: '18:00', opening: { spread: -11, ml: -600, total: 240 } },
  { id: 'GSW@BKN', tipoff: '18:30', opening: { spread: -10.5, ml: -550, total: 225.5 } },
  { id: 'DEN@MIA', tipoff: '18:30', opening: { spread: -4, ml: -180, total: 244.5 } },
  { id: 'ORL@TOR', tipoff: '18:30', opening: { spread: -1.5, ml: -115, total: 222.5 } },
  { id: 'MIN@CHI', tipoff: '19:00', opening: { spread: -4.5, ml: -190, total: 238.5 } },
  { id: 'IND@HOU', tipoff: '19:00', opening: { spread: +14.5, ml: +550, total: 221.5 } },
  { id: 'NYK@NOP', tipoff: '19:00', opening: { spread: -8.5, ml: -400, total: 240.5 } },
  { id: 'ATL@OKC', tipoff: '19:00', opening: { spread: +14, ml: +520, total: 236 } },
  { id: 'CLE@SAS', tipoff: '19:00', opening: { spread: +5, ml: +180, total: 242.5 } },
  { id: 'DAL@POR', tipoff: '21:30', opening: { spread: +2.5, ml: +115, total: 236.5 } },
];

export class MarketDataIngestor {
  private config: IngestorConfig;
  private sessionId: string;

  constructor(config: IngestorConfig) {
    this.config = {
      rateLimit: 100,
      ...config,
    };
    this.sessionId = crypto.randomUUID();
  }

  /**
   * Stream market ticks for all games
   */
  async *streamMarketTicks(games: MarketFeed[]): AsyncGenerator<TickBatch> {
    console.log(`[INGEST] Session ${this.sessionId.slice(0, 8)} started`);
    console.log(`[INGEST] Source: ${this.config.source}, Games: ${games.length}`);

    for (const game of games) {
      const ticks = await this.fetchTicks(game);

      yield {
        gameId: game.id,
        timestamp: Date.now(),
        ticks,
      };

      // Rate limiting
      await Bun.sleep(this.config.rateLimit || 100);
    }
  }

  /**
   * Fetch ticks for a single game
   */
  private async fetchTicks(game: MarketFeed): Promise<OddsTick[]> {
    if (this.config.source === 'demo') {
      return this.generateDemoTicks(game);
    }

    // Live API fetch
    try {
      const url = `https://api.${this.config.source}.com/v1/ticks/${game.id}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey || Bun.env.ODDS_API_KEY}`,
          'X-Session-ID': this.sessionId,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[INGEST] API error for ${game.id}: ${response.status}`);
        return this.generateDemoTicks(game);
      }

      const data = await response.json();
      return this.normalizeTicks(data, game.opening);
    } catch (error) {
      console.warn(`[INGEST] Fetch failed for ${game.id}, using demo data`);
      return this.generateDemoTicks(game);
    }
  }

  /**
   * Generate simulated tick data
   */
  private generateDemoTicks(game: MarketFeed): OddsTick[] {
    const ticks: OddsTick[] = [];
    const numTicks = 20 + Math.floor(Math.random() * 30);

    let spread = game.opening.spread;
    let total = game.opening.total;
    let ml = game.opening.ml;

    for (let i = 0; i < numTicks; i++) {
      // Simulate realistic line movement
      const spreadDrift = (Math.random() - 0.5) * 0.5;
      const totalDrift = (Math.random() - 0.5) * 1.0;
      const volumeSpike = Math.random() > 0.9;

      spread += spreadDrift;
      total += totalDrift;

      // Occasional sharp moves (black swan candidates)
      if (Math.random() > 0.95) {
        spread += (Math.random() - 0.5) * 2;
        total += (Math.random() - 0.5) * 3;
      }

      ticks.push({
        time: Date.now() - (numTicks - i) * 60000,
        spread: Math.round(spread * 2) / 2, // Round to 0.5
        ml,
        total: Math.round(total * 2) / 2,
        volume: volumeSpike ? 50000 + Math.random() * 100000 : 5000 + Math.random() * 20000,
      });
    }

    return ticks;
  }

  /**
   * Normalize external API ticks
   */
  private normalizeTicks(data: any[], opening: MarketFeed['opening']): OddsTick[] {
    return data.map((tick: any) => ({
      time: tick.timestamp || Date.now(),
      spread: tick.spread ?? opening.spread,
      ml: tick.ml ?? opening.ml,
      total: tick.total ?? opening.total,
      volume: tick.volume || 0,
    }));
  }

  /**
   * Get session info
   */
  getSessionInfo(): { id: string; source: string } {
    return {
      id: this.sessionId,
      source: this.config.source,
    };
  }
}
