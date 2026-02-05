/**
 * T3-Lattice Orchestrator
 * Production orchestrator for NBA games with live tick analysis
 */

import { HiddenLatticeFinder } from './persona/lattice-finder';
import { MarketDataIngestor, DEC_29_GAMES } from './ingestion/market-ingestor';
import { FractalEngine } from './engines/fractal-engine';
import type { LatticeEdge, BlackSwanAlert, MarketFeed } from './types';

interface OrchestratorConfig {
  games?: MarketFeed[];
  source?: 'odds_shark' | 'vegas_insider' | 'demo';
  verbose?: boolean;
}

interface AnalysisResult {
  edges: LatticeEdge[];
  alerts: BlackSwanAlert[];
  stats: {
    gamesProcessed: number;
    edgesDetected: number;
    blackSwans: number;
    hitRate: string;
    latencyMs: number;
    p99LatencyMs: number;
  };
}

export class T3LatticeOrchestrator {
  private persona: HiddenLatticeFinder;
  private ingestor: MarketDataIngestor;
  private fractalEngine: FractalEngine;
  private verbose: boolean;

  private latencies: number[] = [];

  constructor(config: OrchestratorConfig = {}) {
    this.persona = new HiddenLatticeFinder();
    this.ingestor = new MarketDataIngestor({
      source: config.source || 'demo',
    });
    this.fractalEngine = new FractalEngine();
    this.verbose = config.verbose ?? true;
  }

  /**
   * Run analysis on all games
   */
  async run(games: MarketFeed[] = DEC_29_GAMES): Promise<AnalysisResult> {
    const personaInfo = this.persona.getInfo();
    const sessionInfo = this.ingestor.getSessionInfo();

    if (this.verbose) {
      console.log(`\n[PERSONA] T3-Lattice Finder ${personaInfo.id} initialized`);
      console.log(`[PERSONA] FD threshold: ${personaInfo.config.fdThreshold}, Confidence min: ${personaInfo.config.confidenceMin}`);
      console.log(`[INGEST] Session: ${sessionInfo.id.slice(0, 8)}, Source: ${sessionInfo.source}`);
      console.log(`[PERSONA] Processing ${games.length} NBA games...\n`);
    }

    const startTime = Bun.nanoseconds();
    const edges: LatticeEdge[] = [];
    const alerts: BlackSwanAlert[] = [];

    // Process games
    const marketStream = this.ingestor.streamMarketTicks(games);

    for await (const tickBatch of marketStream) {
      const gameStart = Bun.nanoseconds();

      const { gameId, ticks } = tickBatch;

      // Compute fractal metrics
      const { fd: fdResult, hurst: hurstResult } = await this.fractalEngine.analyze(ticks);

      // Detect edge
      const edge = await this.persona.detectEdge(tickBatch, fdResult, hurstResult);

      const gameLatency = (Bun.nanoseconds() - gameStart) / 1_000_000;
      this.latencies.push(gameLatency);

      if (edge) {
        edges.push(edge);

        // Log edge
        if (this.verbose) {
          const icon = edge.type === 'BLACK_SWAN' ? '🚨' : '🎯';
          console.log(
            `${icon} Game ${edge.market}: FD=${edge.fd.toFixed(2)}, Glyph=${edge.glyph}, ` +
            `Confidence=${(edge.confidence * 100).toFixed(1)}%, Edge=${edge.type}`
          );
        }

        // Create alert for black swans
        if (edge.requiresReview) {
          const alert: BlackSwanAlert = {
            id: crypto.randomUUID(),
            gameId,
            fd: edge.fd,
            cause: edge.description,
            requiresReview: true,
            timestamp: Date.now(),
          };
          alerts.push(alert);

          if (this.verbose) {
            console.log(`🚨 BLACK_SWAN: Game ${gameId} (FD=${edge.fd.toFixed(2)}), Operator notified`);
          }
        }
      } else if (this.verbose) {
        console.log(`⚪ Game ${gameId}: No edge detected (FD=${fdResult.fd.toFixed(2)})`);
      }
    }

    const totalLatency = (Bun.nanoseconds() - startTime) / 1_000_000;
    const personaStats = this.persona.getStats();

    // Calculate P99 latency
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    const p99Latency = sortedLatencies[p99Index] || sortedLatencies[sortedLatencies.length - 1] || 0;

    const hitRate = games.length > 0
      ? ((edges.length / games.length) * 100).toFixed(1)
      : '0.0';

    if (this.verbose) {
      console.log(`\n[PERSONA] Completed ${games.length} games in ${totalLatency.toFixed(0)}ms (P99: ${p99Latency.toFixed(1)}ms)`);
      console.log(`[PERSONA] Edges detected: ${edges.length} (${hitRate}% hit rate)`);
      console.log(`[PERSONA] Black swans: ${alerts.length} (${games.length > 0 ? ((alerts.length / games.length) * 100).toFixed(1) : 0}% of games)`);
      console.log(`[PERSONA] Avg confidence: ${(personaStats.avgConfidence * 100).toFixed(1)}%`);
      console.log(`[PERSONA] ✅ Analysis complete`);
    }

    return {
      edges,
      alerts,
      stats: {
        gamesProcessed: games.length,
        edgesDetected: edges.length,
        blackSwans: alerts.length,
        hitRate: hitRate + '%',
        latencyMs: totalLatency,
        p99LatencyMs: p99Latency,
      },
    };
  }

  /**
   * Get persona instance
   */
  getPersona(): HiddenLatticeFinder {
    return this.persona;
  }
}

/**
 * Run December 29 analysis
 */
export async function runDec29Analysis(): Promise<AnalysisResult> {
  const orchestrator = new T3LatticeOrchestrator({
    source: 'demo',
    verbose: true,
  });

  return orchestrator.run(DEC_29_GAMES);
}

// Entry point
if (import.meta.main) {
  runDec29Analysis()
    .then(result => {
      console.log('\n📊 Final Report:');
      console.log(JSON.stringify(result.stats, null, 2));
    })
    .catch(console.error);
}
