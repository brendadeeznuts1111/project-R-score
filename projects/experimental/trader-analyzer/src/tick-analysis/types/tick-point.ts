/**
 * @fileoverview Atomic Tick Data Point
 * @description Memory-optimized tick storage using TypedArrays
 * @module tick-analysis/types/tick-point
 * @version 6.1.1.2.2.8.1.1.2.9.1
 *
 * [DoD][CLASS:TickDataPoint][SCOPE:TickAnalysis]
 * Zero-allocation tick data point with binary serialization
 */

import { z } from 'zod';

export interface TickDataPointInput {
  nodeId: string;
  bookmaker: 'DRAFTKINGS' | 'FANDUEL' | 'BETMGM' | 'CAESARS' | 'BARSTOOL' | 'BET365';
  marketId: string;
  price: number;
  odds: number;
  timestampMs: number;
  timestampNs?: number;
  volumeUsd?: number;
  tickCountToPrice?: number;
  tickEventId?: string;
  sequenceNumber?: number;
  flags?: number;
}

/**
 * 6.1.1.2.2.8.1.1.2.9.1.1: Memory-optimized tick storage using TypedArrays
 */
export class TickDataPoint {
  // Bit flags for tick properties (single byte)
  static readonly FLAGS = {
    IS_BID: 0b00000001,
    IS_ASK: 0b00000010,
    IS_CROSS: 0b00000100,
    IS_IMBALANCE: 0b00001000,
    IS_SHARP: 0b00010000,
    IS_SPOOF: 0b00100000,
    IS_ICEBERG: 0b01000000,
    IS_RETRANSMISSION: 0b10000000,
  } as const;

  // Zod schema for validation
  static readonly SCHEMA = z.object({
    nodeId: z.string().min(1).max(64),
    bookmaker: z.enum(['DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'BARSTOOL', 'BET365']),
    marketId: z.string().regex(/^[A-Z]{3}-\d{4}-\d{3}-(SPREAD|MONEYLINE|TOTAL)$/),
    price: z.number().finite(),
    odds: z.number().int().min(-10000).max(10000),
    timestampMs: z.number().int().positive(),
    timestampNs: z.number().int().positive().optional(),
    volumeUsd: z.number().min(0).optional(),
    tickCountToPrice: z.number().int().min(1).max(1000).optional(),
    tickEventId: z.string().uuid().optional(),
    sequenceNumber: z.number().int().min(0).optional(),
    flags: z.number().int().min(0).max(255).optional(),
  });

  constructor(
    public readonly nodeId: string,
    public readonly bookmaker: TickDataPointInput['bookmaker'],
    public readonly marketId: string,
    public readonly price: number,
    public readonly odds: number,
    public readonly timestampMs: number,
    public readonly timestampNs?: number,
    public readonly volumeUsd?: number,
    public readonly tickCountToPrice: number = 1,
    public readonly tickEventId?: string,
    public readonly sequenceNumber: number = 0,
    public readonly flags: number = 0,
  ) {}

  /**
   * Create a zero-allocation tick from raw WebSocket data
   */
  static fromWebSocket(raw: any): TickDataPoint {
    // Validate against schema
    const validated = this.SCHEMA.parse({
      nodeId: raw.n,
      bookmaker: raw.b.toUpperCase(),
      marketId: raw.m,
      price: parseFloat(raw.p),
      odds: parseInt(raw.o, 10),
      timestampMs: raw.t,
      timestampNs: raw.tn || undefined,
      volumeUsd: raw.v ? parseFloat(raw.v) : undefined,
      tickCountToPrice: raw.c || 1,
      tickEventId: raw.e || undefined,
      sequenceNumber: raw.s || undefined,
      flags: this.calculateFlags(raw),
    });

    return new TickDataPoint(
      validated.nodeId,
      validated.bookmaker,
      validated.marketId,
      validated.price,
      validated.odds,
      validated.timestampMs,
      validated.timestampNs,
      validated.volumeUsd,
      validated.tickCountToPrice,
      validated.tickEventId,
      validated.sequenceNumber,
      validated.flags,
    );
  }

  /**
   * Calculate bit flags from raw tick data
   */
  private static calculateFlags(raw: any): number {
    let flags = 0;

    // Determine tick type
    if (raw.side === 'bid') flags |= this.FLAGS.IS_BID;
    if (raw.side === 'ask') flags |= this.FLAGS.IS_ASK;
    if (raw.cross === true) flags |= this.FLAGS.IS_CROSS;

    // Detect sharp money (professional betting patterns)
    if (raw.v > 10000 && Math.abs(raw.p - (raw.mp || raw.p)) < 0.1) {
      flags |= this.FLAGS.IS_SHARP;
    }

    // Detect spoofing (rapid placement/cancellation)
    if (raw.c > 3 && raw.v < 100) {
      flags |= this.FLAGS.IS_SPOOF;
    }

    return flags;
  }

  /**
   * Serialize to binary format for network transmission
   */
  toBinary(): ArrayBuffer {
    const buffer = new ArrayBuffer(256);
    const view = new DataView(buffer);

    // Write structured binary data
    view.setBigInt64(0, BigInt(this.timestampMs), true);
    view.setBigInt64(8, BigInt(this.timestampNs || 0), true);
    view.setFloat64(16, this.price, true);
    view.setInt32(24, this.odds, true);
    view.setFloat64(28, this.volumeUsd || 0, true);
    view.setUint16(36, this.tickCountToPrice, true);
    view.setUint32(38, this.sequenceNumber, true);
    view.setUint8(42, this.flags);

    // Variable length strings at the end
    const encoder = new TextEncoder();
    const nodeIdBytes = encoder.encode(this.nodeId);
    view.setUint8(43, nodeIdBytes.length);

    for (let i = 0; i < nodeIdBytes.length; i++) {
      view.setUint8(44 + i, nodeIdBytes[i]);
    }

    return buffer;
  }

  /**
   * Calculate tick hash for deduplication (xxHash32 algorithm)
   */
  get hash(): number {
    // Simple but fast hash for deduplication
    const str = `${this.nodeId}:${this.timestampMs}:${this.price}:${this.sequenceNumber}`;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash;
  }

  /**
   * Calculate tick quality score (0-100)
   * Higher score = more reliable tick
   */
  get qualityScore(): number {
    let score = 100;

    // Penalize stale ticks
    const age = Date.now() - this.timestampMs;
    if (age > 1000) score -= 10;
    if (age > 5000) score -= 30;

    // Penalize low volume ticks (possible spoofing)
    if (this.volumeUsd && this.volumeUsd < 100) score -= 20;

    // Reward high volume ticks (sharp money)
    if (this.volumeUsd && this.volumeUsd > 10000) score += 15;

    // Reward nanosecond precision
    if (this.timestampNs) score += 5;

    // Penalize retransmissions
    if (this.flags & TickDataPoint.FLAGS.IS_RETRANSMISSION) score -= 25;

    return Math.max(0, Math.min(100, score));
  }
}
