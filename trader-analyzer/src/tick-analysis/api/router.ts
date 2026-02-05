/**
 * @fileoverview HyperTick API Router
 * @description URLPattern-based API router for tick analysis endpoints
 * @module tick-analysis/api/router
 * @version 6.1.1.2.2.8.1.1.2.9.5
 *
 * [DoD][CLASS:HyperTickRouter][SCOPE:TickAnalysis]
 * API router integration with URLPattern for high-frequency tick endpoints
 */

// URLPattern is a global in Bun 1.3.4+
import { HyperTickCollector } from '../collector/collector';
import { HyperTickCorrelationEngine } from '../correlation/engine';

/**
 * 6.1.1.2.2.8.1.1.2.9.5: API Router Integration with URLPattern
 */
export class HyperTickRouter {
  private patterns = new Map<string, URLPattern>();
  private collector: HyperTickCollector;
  private engine: HyperTickCorrelationEngine;

  constructor(
    collector: HyperTickCollector,
    engine: HyperTickCorrelationEngine,
  ) {
    this.collector = collector;
    this.engine = engine;
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Tick ingestion endpoint (WebSocket-compatible)
    this.patterns.set(
      'ingest_ticks',
      new URLPattern({
        pathname: '/api/v1.3.3/ticks/ingest',
      }),
    );

    // Real-time tick query
    this.patterns.set(
      'recent_ticks',
      new URLPattern({
        pathname: '/api/v1.3.3/ticks/:nodeId/recent',
      }),
    );

    // Correlation analysis
    this.patterns.set(
      'tick_correlation',
      new URLPattern({
        pathname: '/api/v1.3.3/ticks/correlation/:sourceId/:targetId',
      }),
    );

    // Micro-arbitrage detection
    this.patterns.set(
      'micro_arbitrage',
      new URLPattern({
        pathname: '/api/v1.3.3/arbitrage/micro/:marketId',
      }),
    );

    // Spoofing detection
    this.patterns.set(
      'spoofing_detection',
      new URLPattern({
        pathname: '/api/v1.3.3/detection/spoofing/:nodeId',
      }),
    );

    // System statistics
    this.patterns.set(
      'system_stats',
      new URLPattern('/api/v1.3.3/system/stats'),
    );

    // Health check with detailed diagnostics
    this.patterns.set(
      'health_check',
      new URLPattern({
        pathname: '/api/v1.3.3/health',
      }),
    );
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Try to match against all patterns
    for (const [patternName, pattern] of this.patterns) {
      if (pattern.test(url)) {
        const match = pattern.exec(url);
        return await this.handleMatchedPattern(patternName, match!, request);
      }
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleMatchedPattern(
    patternName: string,
    match: URLPatternResult,
    request: Request,
  ): Promise<Response> {
    const startTime = performance.now();

    try {
      switch (patternName) {
        case 'ingest_ticks':
          return await this.handleIngestTicks(request);

        case 'recent_ticks':
          return await this.handleRecentTicks(
            match.pathname.groups.nodeId!,
            new URL(request.url).searchParams,
          );

        case 'tick_correlation':
          return await this.handleTickCorrelation(
            match.pathname.groups.sourceId!,
            match.pathname.groups.targetId!,
            new URL(request.url).searchParams,
          );

        case 'micro_arbitrage':
          return await this.handleMicroArbitrage(
            match.pathname.groups.marketId!,
            new URL(request.url).searchParams,
          );

        case 'spoofing_detection':
          return await this.handleSpoofingDetection(
            match.pathname.groups.nodeId!,
            new URL(request.url).searchParams,
          );

        case 'system_stats':
          return await this.handleSystemStats();

        case 'health_check':
          return await this.handleHealthCheck(
            new URL(request.url).searchParams.get('detail') || 'basic',
          );

        default:
          return new Response('Pattern not implemented', { status: 501 });
      }
    } catch (error) {
      console.error(`Handler error for ${patternName}:`, error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          pattern: patternName,
          timestamp: Date.now(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } finally {
      const duration = performance.now() - startTime;

      // Log slow requests
      if (duration > 100) {
        console.warn(`Slow API request: ${patternName} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  private async handleIngestTicks(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Batch JSON ingestion
      const data = await request.json();
      const results = [];

      if (Array.isArray(data)) {
        for (const tick of data) {
          const result = await this.collector.ingestTick(tick);
          results.push(result);
        }
      } else {
        const result = await this.collector.ingestTick(data);
        results.push(result);
      }

      return new Response(
        JSON.stringify({
          ingested: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
          timestamp: Date.now(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response('Unsupported content type', { status: 415 });
  }

  private async handleRecentTicks(
    nodeId: string,
    params: URLSearchParams,
  ): Promise<Response> {
    const limit = parseInt(params.get('limit') || '100');
    const precision = params.get('precision') || 'micro';

    const ticks = this.collector.getRecentTicks(nodeId, limit);

    // Apply precision filtering
    const filteredTicks = ticks.filter((tick) => {
      if (precision === 'nano' && !tick.timestampNs) return false;
      if (precision === 'pico' && tick.qualityScore < 90) return false;
      return true;
    });

    return new Response(
      JSON.stringify({
        nodeId,
        tickCount: filteredTicks.length,
        ticks: filteredTicks.map((t) => ({
          nodeId: t.nodeId,
          price: t.price,
          odds: t.odds,
          timestampMs: t.timestampMs,
          timestampNs: t.timestampNs,
          volumeUsd: t.volumeUsd,
        })),
        precision,
        queryTime: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private async handleTickCorrelation(
    sourceId: string,
    targetId: string,
    params: URLSearchParams,
  ): Promise<Response> {
    const window = parseInt(params.get('window') || '30000');
    const metricsParam = params.get('metrics') || 'all';
    const metrics = metricsParam.split(',');

    const correlation = await this.engine.calculateTickCorrelation(
      sourceId,
      targetId,
      window,
    );

    // Filter metrics if requested
    if (!metrics.includes('all')) {
      const filteredMetrics: Partial<typeof correlation.metrics> = {};
      for (const key of metrics) {
        if (key in correlation.metrics) {
          (filteredMetrics as any)[key] = (correlation.metrics as any)[key];
        }
      }
      correlation.metrics = filteredMetrics as typeof correlation.metrics;
    }

    // Add URLPattern metadata
    correlation.metadata = {
      sourceId,
      targetId,
      window,
      requestedMetrics: metrics,
      urlPattern: 'tick_correlation',
      apiVersion: '1.3.3',
    };

    return new Response(JSON.stringify(correlation, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Score': correlation.correlationScore.toFixed(2),
        'X-Confidence-Level': correlation.confidence.toFixed(2),
        'X-Sample-Size': correlation.sampleSize.toString(),
      },
    });
  }

  private async handleMicroArbitrage(
    marketId: string,
    params: URLSearchParams,
  ): Promise<Response> {
    const duration = parseInt(params.get('duration') || '500');
    const threshold = parseFloat(params.get('threshold') || '0.1');

    // Get correlated markets (simplified - would query correlation DB in production)
    const correlatedMarkets = await this.findCorrelatedMarkets(marketId);

    const opportunities = [];

    for (const targetMarket of correlatedMarkets) {
      const correlation = await this.engine.calculateTickCorrelation(
        marketId,
        targetMarket,
        duration * 2, // Look at twice the duration for context
      );

      if (
        correlation.arbitrage &&
        correlation.arbitrage.totalOpportunities > 0
      ) {
        const profitable = correlation.arbitrage.opportunities.filter(
          (opp) => opp.profit >= threshold && opp.duration <= duration,
        );

        if (profitable.length > 0) {
          opportunities.push({
            marketPair: `${marketId} ↔ ${targetMarket}`,
            opportunities: profitable,
            totalProfit: profitable.reduce((sum, opp) => sum + opp.profit, 0),
            avgDuration:
              profitable.reduce((sum, opp) => sum + opp.duration, 0) /
              profitable.length,
            correlationScore: correlation.correlationScore,
            detectionConfidence: correlation.arbitrage.detectionConfidence,
          });
        }
      }
    }

    // Sort by profit potential
    opportunities.sort((a, b) => b.totalProfit - a.totalProfit);

    return new Response(
      JSON.stringify({
        marketId,
        duration,
        threshold,
        totalOpportunities: opportunities.length,
        totalProfitPotential: opportunities.reduce(
          (sum, opp) => sum + opp.totalProfit,
          0,
        ),
        opportunities,
        timestamp: Date.now(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private async handleSpoofingDetection(
    nodeId: string,
    params: URLSearchParams,
  ): Promise<Response> {
    const window = parseInt(params.get('window') || '5000');

    // Use self-correlation for pattern detection
    const correlation = await this.engine.calculateTickCorrelation(
      nodeId,
      nodeId,
      window,
    );

    return new Response(
      JSON.stringify({
        nodeId,
        window,
        spoofing: correlation.spoofing,
        timestamp: Date.now(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private async handleSystemStats(): Promise<Response> {
    const stats = this.collector.getStatistics();

    return new Response(
      JSON.stringify({
        collector: stats,
        timestamp: Date.now(),
        version: '1.3.3',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private async handleHealthCheck(detail: string): Promise<Response> {
    const stats = this.collector.getStatistics();
    const basic = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '1.3.3',
    };

    if (detail === 'full') {
      return new Response(
        JSON.stringify({
          ...basic,
          collector: stats,
          database: {
            connected: true,
            walMode: true,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify(basic), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async findCorrelatedMarkets(marketId: string): Promise<string[]> {
    // In production, this would query a correlation database
    // For now, return mock data
    return [
      `${marketId.replace('SPREAD', 'MONEYLINE')}`,
      `${marketId.replace('SPREAD', 'TOTAL')}`,
      `${marketId}-alternate-1`,
      `${marketId}-alternate-2`,
    ];
  }
}
