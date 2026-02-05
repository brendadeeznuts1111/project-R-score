// Component #42: Pattern Ingestion Service
// Streaming interface for backtester-to-live-engine pattern transfer

import { LiveExecutionEngine, ValidatedArbitragePattern } from './LiveExecutionEngine';
import { nanoseconds } from 'bun';

// =============================================================================
// PATTERN INGESTION SERVICE
// =============================================================================

/// Pattern ingestion configuration
export const INGESTION_CONFIG = {
  MAX_CONCURRENT_STREAMS: 10,
  PATTERN_BUFFER_SIZE: 10000,
  STREAM_TIMEOUT_MS: 30000,
  HEALTH_CHECK_INTERVAL: 5000,
};

/// Streaming pattern batch
export interface PatternBatch {
  batch_id: string;
  timestamp_ns: bigint;
  patterns: ValidatedArbitragePattern[];
  metadata: {
    source_backtester_version: string;
    validation_timestamp_ns: bigint;
    batch_sequence: number;
    total_patterns_in_session: number;
  };
}

/// Ingestion statistics
export interface IngestionStats {
  total_patterns_received: number;
  total_batches_processed: number;
  active_streams: number;
  patterns_per_second: number;
  average_batch_size: number;
  last_batch_timestamp: bigint;
  stream_uptime_seconds: number;
}

/// Pattern ingestion service
export class PatternIngestionService {
  private live_engine: LiveExecutionEngine;
  private active_streams: Map<string, StreamSession>;
  private ingestion_stats: IngestionStats;
  private stream_start_time: bigint;

  constructor(liveEngine: LiveExecutionEngine) {
    this.live_engine = liveEngine;
    this.active_streams = new Map();
    this.stream_start_time = nanoseconds();

    this.ingestion_stats = {
      total_patterns_received: 0,
      total_batches_processed: 0,
      active_streams: 0,
      patterns_per_second: 0,
      average_batch_size: 0,
      last_batch_timestamp: 0n,
      stream_uptime_seconds: 0
    };

    this.startHealthMonitoring();
  }

  /// Create new streaming session
  createStreamSession(sessionId: string, backtesterInfo: { version: string }): StreamSession {
    if (this.active_streams.size >= INGESTION_CONFIG.MAX_CONCURRENT_STREAMS) {
      throw new Error(`Maximum concurrent streams exceeded: ${INGESTION_CONFIG.MAX_CONCURRENT_STREAMS}`);
    }

    const session = new StreamSession(sessionId, backtesterInfo, this);
    this.active_streams.set(sessionId, session);
    this.ingestion_stats.active_streams++;

    console.log(`[INGESTION] Created stream session ${sessionId} (${this.active_streams.size} active)`);
    return session;
  }

  /// Close streaming session
  closeStreamSession(sessionId: string): void {
    const session = this.active_streams.get(sessionId);
    if (session) {
      session.close();
      this.active_streams.delete(sessionId);
      this.ingestion_stats.active_streams--;
      console.log(`[INGESTION] Closed stream session ${sessionId} (${this.active_streams.size} active)`);
    }
  }

  /// Ingest pattern batch from stream
  async ingestPatternBatch(sessionId: string, batch: PatternBatch): Promise<void> {
    const session = this.active_streams.get(sessionId);
    if (!session) {
      throw new Error(`Unknown stream session: ${sessionId}`);
    }

    // Validate batch
    if (!this.validateBatch(batch)) {
      throw new Error(`Invalid batch from session ${sessionId}`);
    }

    // Update session stats
    session.updateBatchStats(batch);

    // Convert batch to readable stream for live engine
    const patternStream = this.createPatternStream(batch.patterns);

    // Ingest patterns
    await this.live_engine.ingestValidatedPatterns(patternStream);

    // Update global stats
    this.ingestion_stats.total_batches_processed++;
    this.ingestion_stats.total_patterns_received += batch.patterns.length;
    this.ingestion_stats.last_batch_timestamp = batch.timestamp_ns;

    // Recalculate metrics
    this.updateIngestionMetrics();

    console.log(`[INGESTION] Processed batch ${batch.batch_id}: ${batch.patterns.length} patterns from session ${sessionId}`);
  }

  /// Validate pattern batch
  private validateBatch(batch: PatternBatch): boolean {
    if (!batch.patterns || !Array.isArray(batch.patterns)) {
      return false;
    }

    if (batch.patterns.length === 0) {
      return false;
    }

    if (batch.patterns.length > INGESTION_CONFIG.PATTERN_BUFFER_SIZE) {
      return false;
    }

    // Validate each pattern
    for (const pattern of batch.patterns) {
      if (!this.validatePattern(pattern)) {
        return false;
      }
    }

    return true;
  }

  /// Validate individual pattern
  private validatePattern(pattern: ValidatedArbitragePattern): boolean {
    // Basic structure validation
    if (!pattern.pattern_id || typeof pattern.pattern_id !== 'number') {
      return false;
    }

    if (!pattern.timestamp_ns || typeof pattern.timestamp_ns !== 'bigint') {
      return false;
    }

    if (!['latency', 'statistical', 'structural'].includes(pattern.arb_type)) {
      return false;
    }

    // Market data validation
    if (!pattern.kalshi_market?.ticker || !pattern.polymarket_market?.token_id) {
      return false;
    }

    // Edge validation
    if (pattern.expected_edge <= 0) {
      return false;
    }

    return true;
  }

  /// Create readable stream from pattern array
  private createPatternStream(patterns: ValidatedArbitragePattern[]): ReadableStream<ValidatedArbitragePattern> {
    return new ReadableStream({
      start(controller) {
        for (const pattern of patterns) {
          controller.enqueue(pattern);
        }
        controller.close();
      }
    });
  }

  /// Update ingestion performance metrics
  private updateIngestionMetrics(): void {
    const uptime_ns = nanoseconds() - this.stream_start_time;
    this.ingestion_stats.stream_uptime_seconds = Number(uptime_ns) / 1_000_000_000;

    if (this.ingestion_stats.stream_uptime_seconds > 0) {
      this.ingestion_stats.patterns_per_second =
        this.ingestion_stats.total_patterns_received / this.ingestion_stats.stream_uptime_seconds;
    }

    if (this.ingestion_stats.total_batches_processed > 0) {
      this.ingestion_stats.average_batch_size =
        this.ingestion_stats.total_patterns_received / this.ingestion_stats.total_batches_processed;
    }
  }

  /// Start health monitoring
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, INGESTION_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  /// Perform health check on active streams
  private performHealthCheck(): void {
    const now = nanoseconds();
    const timeout_ns = BigInt(INGESTION_CONFIG.STREAM_TIMEOUT_MS * 1_000_000);

    for (const [sessionId, session] of this.active_streams) {
      if (now - session.lastActivity > timeout_ns) {
        console.warn(`[INGESTION] Stream session ${sessionId} timed out`);
        this.closeStreamSession(sessionId);
      }
    }
  }

  /// Get ingestion statistics
  getIngestionStats(): IngestionStats {
    return { ...this.ingestion_stats };
  }

  /// Get active stream sessions
  getActiveStreams(): string[] {
    return Array.from(this.active_streams.keys());
  }
}

/// Stream session for backtester connection
export class StreamSession {
  public session_id: string;
  public backtester_version: string;
  public created_at: bigint;
  public last_activity: bigint;
  public batches_received: number;
  public patterns_received: number;

  private ingestion_service: PatternIngestionService;
  private closed: boolean = false;

  constructor(
    sessionId: string,
    backtesterInfo: { version: string },
    ingestionService: PatternIngestionService
  ) {
    this.session_id = sessionId;
    this.backtester_version = backtesterInfo.version;
    this.created_at = nanoseconds();
    this.last_activity = this.created_at;
    this.batches_received = 0;
    this.patterns_received = 0;
    this.ingestion_service = ingestionService;
  }

  /// Update session with batch statistics
  updateBatchStats(batch: PatternBatch): void {
    this.last_activity = nanoseconds();
    this.batches_received++;
    this.patterns_received += batch.patterns.length;
  }

  /// Check if session is active
  isActive(): boolean {
    return !this.closed;
  }

  /// Close session
  close(): void {
    this.closed = true;
  }

  /// Get session info
  getSessionInfo() {
    return {
      session_id: this.session_id,
      backtester_version: this.backtester_version,
      created_at: this.created_at,
      last_activity: this.last_activity,
      batches_received: this.batches_received,
      patterns_received: this.patterns_received,
      active: this.isActive()
    };
  }
}

// =============================================================================
// REST API INTERFACE
// =============================================================================

/// HTTP API handlers for pattern ingestion
export class PatternIngestionAPI {
  private ingestion_service: PatternIngestionService;

  constructor(ingestionService: PatternIngestionService) {
    this.ingestion_service = ingestionService;
  }

  /// Handle pattern batch ingestion via HTTP
  async handleIngestBatch(request: Request): Promise<Response> {
    try {
      const session_id = new URL(request.url).searchParams.get('session_id');
      if (!session_id) {
        return new Response(JSON.stringify({ error: 'Missing session_id parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const batch: PatternBatch = await request.json();

      await this.ingestion_service.ingestPatternBatch(session_id, batch);

      return new Response(JSON.stringify({
        status: 'success',
        batch_id: batch.batch_id,
        patterns_processed: batch.patterns.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[INGESTION-API] Error processing batch:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /// Create new stream session
  async handleCreateSession(request: Request): Promise<Response> {
    try {
      const { backtester_version } = await request.json();

      if (!backtester_version) {
        return new Response(JSON.stringify({ error: 'Missing backtester_version' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = this.ingestion_service.createStreamSession(session_id, { version: backtester_version });

      return new Response(JSON.stringify({
        status: 'success',
        session_id: session.session_id,
        created_at: session.created_at
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[INGESTION-API] Error creating session:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /// Close stream session
  async handleCloseSession(request: Request): Promise<Response> {
    try {
      const session_id = new URL(request.url).searchParams.get('session_id');
      if (!session_id) {
        return new Response(JSON.stringify({ error: 'Missing session_id parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.ingestion_service.closeStreamSession(session_id);

      return new Response(JSON.stringify({ status: 'success' }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[INGESTION-API] Error closing session:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /// Get ingestion statistics
  async handleGetStats(): Promise<Response> {
    const stats = this.ingestion_service.getIngestionStats();
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Health check endpoint
  async handleHealthCheck(): Promise<Response> {
    const active_streams = this.ingestion_service.getActiveStreams();
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: nanoseconds(),
      active_streams: active_streams.length,
      stream_ids: active_streams
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { PatternBatch, IngestionStats };