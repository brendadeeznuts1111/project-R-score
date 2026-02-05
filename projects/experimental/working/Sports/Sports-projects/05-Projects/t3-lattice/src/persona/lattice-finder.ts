/**
 * Hidden Lattice Finder Persona
 * Edge detection with glyph validation
 */

import type {
  TickBatch,
  FDResult,
  HurstResult,
  LatticeEdge,
  EdgeType,
  OddsTick,
  LatticeConfig,
  DEFAULT_CONFIG,
} from '../types';
import { findGlyphForFD, validateGlyph, getGlyphName } from '../constants/glyph-patterns';

export interface PersonaStats {
  edgesDetected: number;
  blackSwans: number;
  gamesProcessed: number;
  avgConfidence: number;
}

export class HiddenLatticeFinder {
  readonly personaId: string;
  readonly fdCriticalThreshold: number;
  readonly edgeConfidenceMinimum: number;

  private stats: PersonaStats = {
    edgesDetected: 0,
    blackSwans: 0,
    gamesProcessed: 0,
    avgConfidence: 0,
  };

  private auditLog: Array<{ timestamp: number; event: string; data: unknown }> = [];

  constructor(config: Partial<LatticeConfig> = {}) {
    this.personaId = `t3-lattice-finder-${crypto.randomUUID().slice(0, 8)}`;
    this.fdCriticalThreshold = config.fdCriticalThreshold || 2.5;
    this.edgeConfidenceMinimum = config.edgeConfidenceMinimum || 0.85;
  }

  /**
   * Detect hidden edge from market data
   */
  async detectEdge(
    tickBatch: TickBatch,
    fdResult: FDResult,
    hurstResult: HurstResult,
  ): Promise<LatticeEdge | null> {
    const { gameId, ticks } = tickBatch;
    const fd = fdResult.fd;
    const hurst = hurstResult.hurst;

    this.stats.gamesProcessed++;

    // Find matching glyph pattern
    const glyphPattern = findGlyphForFD(fd);
    const glyph = glyphPattern?.pattern || '⊟';

    // Validate glyph entropy
    if (!this.validateGlyphPattern(glyph, fd)) {
      this.log('GLYPH_MISMATCH', { gameId, fd, glyph });
      return null;
    }

    // Compute edge confidence
    const confidence = this.calculateConfidence(fd, hurst, ticks.length);

    if (confidence < this.edgeConfidenceMinimum) {
      this.log('LOW_CONFIDENCE', { gameId, confidence, threshold: this.edgeConfidenceMinimum });
      return null;
    }

    // Classify edge type
    const edgeType = this.classifyEdgeType(fd, hurst);

    // Check for black swan
    const isBlackSwan = fd > this.fdCriticalThreshold;
    if (isBlackSwan) {
      this.stats.blackSwans++;
    }

    // Build edge object
    const edge: LatticeEdge = {
      id: crypto.randomUUID(),
      market: gameId,
      type: edgeType,
      description: this.generateEdgeDescription(fd, glyph, ticks),
      confidence,
      fd,
      hurst,
      glyph,
      requiresReview: isBlackSwan,
      timestamp: Date.now(),
    };

    // Update stats
    this.stats.edgesDetected++;
    this.stats.avgConfidence =
      (this.stats.avgConfidence * (this.stats.edgesDetected - 1) + confidence) /
      this.stats.edgesDetected;

    this.log('EDGE_DETECTED', {
      gameId,
      type: edgeType,
      confidence,
      fd,
      hurst,
      glyph,
    });

    return edge;
  }

  /**
   * Validate glyph pattern against FD
   */
  private validateGlyphPattern(glyph: string, fd: number): boolean {
    // Special case: quantum rollback trigger for critical FD
    if (fd > this.fdCriticalThreshold && glyph === '⊟') {
      return true;
    }

    return validateGlyph(glyph, fd);
  }

  /**
   * Calculate edge confidence score
   */
  private calculateConfidence(fd: number, hurst: number, tickCount: number): number {
    // FD score: peak at 1.5 (fractal sweet spot)
    const fdScore = Math.max(0, 1 - Math.abs(fd - 1.5) / 1.5);

    // Hurst score: depends on FD regime
    let hurstScore: number;
    if (fd < 1.5) {
      // Trending regime: want higher Hurst
      hurstScore = Math.max(0, hurst - 0.3);
    } else {
      // Mean-reverting regime: want lower Hurst
      hurstScore = Math.max(0, 0.7 - hurst);
    }

    // Sample size score: more ticks = more confidence
    const sampleScore = Math.min(tickCount / 20, 1);

    // Weighted combination
    const confidence = fdScore * 0.4 + hurstScore * 0.4 + sampleScore * 0.2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Classify edge type based on fractal signature
   */
  private classifyEdgeType(fd: number, hurst: number): EdgeType {
    if (fd < 1.3) {
      return 'TREND_CONTINUATION';
    }
    if (fd > 2.3) {
      return 'BLACK_SWAN';
    }
    if (hurst > 0.6) {
      return 'MEAN_REVERSION';
    }
    return 'VOLATILITY_ARB';
  }

  /**
   * Generate human-readable edge description
   */
  private generateEdgeDescription(fd: number, glyph: string, ticks: OddsTick[]): string {
    if (ticks.length === 0) {
      return `FD=${fd.toFixed(2)} ${glyph} | No tick data`;
    }

    const lastTick = ticks[ticks.length - 1];
    const firstTick = ticks[0];
    const spreadChange = lastTick.spread - firstTick.spread;
    const direction = spreadChange > 0 ? '↑' : spreadChange < 0 ? '↓' : '→';

    const glyphName = getGlyphName(glyph);

    return `FD=${fd.toFixed(2)} ${glyph} (${glyphName}) | Spread ${direction}${Math.abs(spreadChange).toFixed(1)}pt | ${ticks.length} ticks`;
  }

  /**
   * Log event for audit trail
   */
  private log(event: string, data: unknown): void {
    this.auditLog.push({
      timestamp: Date.now(),
      event,
      data,
    });

    // Keep last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get persona statistics
   */
  getStats(): PersonaStats {
    return { ...this.stats };
  }

  /**
   * Get audit log
   */
  getAuditLog(): typeof this.auditLog {
    return [...this.auditLog];
  }

  /**
   * Get persona info
   */
  getInfo(): { id: string; config: { fdThreshold: number; confidenceMin: number } } {
    return {
      id: this.personaId,
      config: {
        fdThreshold: this.fdCriticalThreshold,
        confidenceMin: this.edgeConfidenceMinimum,
      },
    };
  }
}
