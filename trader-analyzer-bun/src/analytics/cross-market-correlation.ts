// [DoD][DOMAIN:CrossMarket][SCOPE:CorrelationEngine][TYPE:AdvancedAnalytics][CLASS:MissionCritical]

import { Database } from "bun:sqlite";
import { DoDMultiLayerCorrelationGraph } from "./correlation-engine";

export interface CrossMarketCorrelation {
  sourceMarket: string;
  targetMarket: string;
  correlationStrength: number;
  confidence: number;
  timeWindow: number;
  sharedEntities: string[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  timestamp: number;
}

export interface ArbitrageOpportunity {
  source: MarketPosition;
  target: MarketPosition;
  expectedProfit: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  expiryTime: number;
}

export interface MarketPosition {
  market: string;
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

export class CrossMarketCorrelationEngine {
  private db: Database;
  private baseEngine: DoDMultiLayerCorrelationGraph;

  constructor(db: Database) {
    this.db = db;
    this.baseEngine = new DoDMultiLayerCorrelationGraph(db);
    this.initializeCrossMarketSchema();
  }

  private initializeCrossMarketSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cross_market_correlations (
        id INTEGER PRIMARY KEY,
        source_market TEXT NOT NULL,
        target_market TEXT NOT NULL,
        correlation_strength REAL NOT NULL,
        confidence REAL NOT NULL,
        time_window INTEGER NOT NULL,
        shared_entities TEXT NOT NULL, -- JSON array
        arbitrage_opportunities TEXT, -- JSON array
        detected_at INTEGER NOT NULL,
        INDEX idx_markets_time (source_market, target_market, detected_at)
      );

      CREATE TABLE IF NOT EXISTS market_data_cache (
        market TEXT NOT NULL,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        volume REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (market, symbol),
        INDEX idx_market_timestamp (market, timestamp)
      );
    `);
  }

  async analyzeCrossMarketCorrelations(
    markets: string[] = ['CRYPTO', 'SPORTS', 'PREDICTION'],
    timeWindow: number = 3600000 // 1 hour
  ): Promise<CrossMarketCorrelation[]> {
    const correlations: CrossMarketCorrelation[] = [];

    // Analyze all market pairs
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const sourceMarket = markets[i];
        const targetMarket = markets[j];

        const correlation = await this.computeMarketPairCorrelation(
          sourceMarket,
          targetMarket,
          timeWindow
        );

        if (correlation) {
          correlations.push(correlation);
        }
      }
    }

    // Persist results
    await this.persistCorrelations(correlations);

    return correlations;
  }

  private async computeMarketPairCorrelation(
    sourceMarket: string,
    targetMarket: string,
    timeWindow: number
  ): Promise<CrossMarketCorrelation | null> {
    const cutoffTime = Date.now() - timeWindow;

    // Get market data for both markets
    const sourceData = this.getMarketData(sourceMarket, cutoffTime);
    const targetData = this.getMarketData(targetMarket, cutoffTime);

    if (sourceData.length < 10 || targetData.length < 10) {
      return null; // Insufficient data
    }

    // Find shared entities (teams, events, symbols)
    const sharedEntities = this.findSharedEntities(sourceMarket, targetMarket);

    // Compute correlation strength
    const correlationStrength = this.computeCorrelationCoefficient(sourceData, targetData);

    // Assess confidence based on data quality and sample size
    const confidence = this.assessCorrelationConfidence(sourceData, targetData, sharedEntities);

    // Detect arbitrage opportunities
    const arbitrageOpportunities = await this.detectArbitrageOpportunities(
      sourceMarket,
      targetMarket,
      sharedEntities
    );

    return {
      sourceMarket,
      targetMarket,
      correlationStrength,
      confidence,
      timeWindow,
      sharedEntities,
      arbitrageOpportunities,
      timestamp: Date.now()
    };
  }

  private getMarketData(market: string, cutoffTime: number): Array<{price: number, timestamp: number}> {
    const query = this.db.prepare(`
      SELECT price, timestamp FROM market_data_cache
      WHERE market = ? AND timestamp > ?
      ORDER BY timestamp DESC
    `);

    return query.all(market, cutoffTime) as Array<{price: number, timestamp: number}>;
  }

  private findSharedEntities(sourceMarket: string, targetMarket: string): string[] {
    // Map market types to entity finding strategies
    const entityFinders = {
      'CRYPTO-SPORTS': () => this.findCryptoSportsEntities(),
      'CRYPTO-PREDICTION': () => this.findCryptoPredictionEntities(),
      'SPORTS-PREDICTION': () => this.findSportsPredictionEntities(),
    };

    const key = `${sourceMarket}-${targetMarket}` as keyof typeof entityFinders;
    return entityFinders[key]?.() || [];
  }

  private findCryptoSportsEntities(): string[] {
    // Find correlations between crypto volatility and sports betting volumes
    // e.g., BTC price movements correlating with major sports event betting
    return ['BTC_VOLATILITY', 'ETH_VOLATILITY', 'MAJOR_EVENTS'];
  }

  private findCryptoPredictionEntities(): string[] {
    // Find correlations between crypto prices and prediction market probabilities
    return ['BTC_PRICE', 'ETH_PRICE', 'POLICY_EVENTS', 'ECONOMIC_INDICATORS'];
  }

  private findSportsPredictionEntities(): string[] {
    // Find correlations between sports betting odds and prediction market probabilities
    return ['NFL_GAMES', 'NBA_GAMES', 'ELECTION_OUTCOMES', 'WEATHER_EVENTS'];
  }

  private computeCorrelationCoefficient(
    data1: Array<{price: number, timestamp: number}>,
    data2: Array<{price: number, timestamp: number}>
  ): number {
    // Align data by timestamp (simple nearest neighbor approach)
    const alignedData = this.alignTimeSeries(data1, data2);

    if (alignedData.length < 5) return 0;

    // Compute Pearson correlation coefficient
    const n = alignedData.length;
    const sum1 = alignedData.reduce((sum, d) => sum + d.val1, 0);
    const sum2 = alignedData.reduce((sum, d) => sum + d.val2, 0);
    const sum1Sq = alignedData.reduce((sum, d) => sum + d.val1 * d.val1, 0);
    const sum2Sq = alignedData.reduce((sum, d) => sum + d.val2 * d.val2, 0);
    const sum12 = alignedData.reduce((sum, d) => sum + d.val1 * d.val2, 0);

    const numerator = n * sum12 - sum1 * sum2;
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private alignTimeSeries(
    data1: Array<{price: number, timestamp: number}>,
    data2: Array<{price: number, timestamp: number}>
  ): Array<{val1: number, val2: number}> {
    const result: Array<{val1: number, val2: number}> = [];

    for (const d1 of data1) {
      // Find closest timestamp in data2
      let closest = data2[0];
      let minDiff = Math.abs(d1.timestamp - closest.timestamp);

      for (const d2 of data2) {
        const diff = Math.abs(d1.timestamp - d2.timestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d2;
        }
      }

      // Only include if within 5 minutes
      if (minDiff < 300000) {
        result.push({ val1: d1.price, val2: closest.price });
      }
    }

    return result;
  }

  private assessCorrelationConfidence(
    data1: Array<{price: number, timestamp: number}>,
    data2: Array<{price: number, timestamp: number}>,
    sharedEntities: string[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Sample size factor
    const sampleSize = Math.min(data1.length, data2.length);
    confidence += Math.min(sampleSize / 100, 0.2); // Up to 0.2 for large samples

    // Shared entities factor
    confidence += Math.min(sharedEntities.length / 10, 0.2); // Up to 0.2 for many shared entities

    // Data quality factor (time distribution)
    const timeSpan = Math.max(...data1.map(d => d.timestamp)) - Math.min(...data1.map(d => d.timestamp));
    const expectedIntervals = timeSpan / 60000; // Expected 1-minute intervals
    const actualIntervals = data1.length;
    const coverage = actualIntervals / expectedIntervals;
    confidence += Math.min(coverage * 0.1, 0.1); // Up to 0.1 for good coverage

    return Math.min(confidence, 1.0);
  }

  private async detectArbitrageOpportunities(
    sourceMarket: string,
    targetMarket: string,
    sharedEntities: string[]
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    // This would integrate with actual market data APIs
    // For now, return mock opportunities based on correlation strength

    for (const entity of sharedEntities.slice(0, 3)) {
      // Mock arbitrage detection logic
      const mockOpportunity: ArbitrageOpportunity = {
        source: {
          market: sourceMarket,
          symbol: `${entity}_SOURCE`,
          price: 100 + Math.random() * 50,
          volume: 1000 + Math.random() * 5000,
          timestamp: Date.now()
        },
        target: {
          market: targetMarket,
          symbol: `${entity}_TARGET`,
          price: 95 + Math.random() * 45,
          volume: 800 + Math.random() * 4000,
          timestamp: Date.now()
        },
        expectedProfit: Math.random() * 10,
        riskLevel: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
        confidence: 0.5 + Math.random() * 0.4,
        expiryTime: Date.now() + 3600000 // 1 hour
      };

      opportunities.push(mockOpportunity);
    }

    return opportunities;
  }

  private async persistCorrelations(correlations: CrossMarketCorrelation[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO cross_market_correlations
      (source_market, target_market, correlation_strength, confidence, time_window,
       shared_entities, arbitrage_opportunities, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const corr of correlations) {
      stmt.run(
        corr.sourceMarket,
        corr.targetMarket,
        corr.correlationStrength,
        corr.confidence,
        corr.timeWindow,
        JSON.stringify(corr.sharedEntities),
        JSON.stringify(corr.arbitrageOpportunities),
        corr.timestamp
      );
    }
  }

  async getCorrelationHistory(
    sourceMarket: string,
    targetMarket: string,
    limit: number = 100
  ): Promise<CrossMarketCorrelation[]> {
    const query = this.db.prepare(`
      SELECT * FROM cross_market_correlations
      WHERE source_market = ? AND target_market = ?
      ORDER BY detected_at DESC
      LIMIT ?
    `);

    const rows = query.all(sourceMarket, targetMarket, limit) as any[];

    return rows.map(row => ({
      sourceMarket: row.source_market,
      targetMarket: row.target_market,
      correlationStrength: row.correlation_strength,
      confidence: row.confidence,
      timeWindow: row.time_window,
      sharedEntities: JSON.parse(row.shared_entities),
      arbitrageOpportunities: JSON.parse(row.arbitrage_opportunities || '[]'),
      timestamp: row.detected_at
    }));
  }

  async updateMarketData(market: string, symbol: string, price: number, volume: number): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO market_data_cache (market, symbol, price, volume, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(market, symbol, price, volume, Date.now());
  }
}