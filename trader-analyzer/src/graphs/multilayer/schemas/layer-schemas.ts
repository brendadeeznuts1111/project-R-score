/**
 * @fileoverview Layer Schema Definitions
 * @description Detailed schemas for each correlation layer
 * @module graphs/multilayer/schemas/layer-schemas
 * @version 1.1.1.1.4.1.2-5
 */

export type SportType =
  | 'basketball'
  | 'soccer'
  | 'baseball'
  | 'football'
  | 'hockey'
  | 'tennis'
  | 'golf'
  | 'esports'
  | 'chess'
  | 'winter_sports';

export type MarketType =
  | 'moneyline'
  | 'spread'
  | 'over_under'
  | 'total'
  | 'futures'
  | 'props';

/**
 * Header 1.1.1.1.4.1.2: Layer4 Cross-Sport Correlation Schema
 */
export interface CrossSportCorrelationSchema {
  // Core correlation data
  sportPair: {
    sportA: SportType;
    sportB: SportType;
  };

  // Correlation metrics
  correlationStrength: number; // -1 to 1
  confidenceScore: number; // 0 to 1
  historicalMatches: number; // Number of correlated events

  // Temporal properties
  correlationWindow: {
    startTime: number;
    endTime: number;
    decayRate: number; // How quickly correlation weakens over time
  };

  // Derived patterns
  anomalyPatterns: Array<{
    patternType: 'volume_spike' | 'odds_flip' | 'market_suspension';
    detectionTime: number;
    sportTrigger: SportType;
    affectedSport: SportType;
    propagationDelay: number; // Time between anomalies
  }>;

  // Validation metrics
  validation: {
    isVerified: boolean;
    verificationSource: 'manual' | 'algorithmic' | 'third_party';
    lastVerified: number;
    falsePositiveRate: number;
  };
}

export interface CrossSportCorrelation {
  sportA: SportType;
  sportB: SportType;
  strength: number;
  confidence: number;
  historicalMatches: number;
  sharedEntity?: string;
  sport1Market?: string;
  sport2Market?: string;
  latency?: number;
  lastUpdate?: number;
}

/**
 * Header 1.1.1.1.4.1.3: Layer3 Cross-Event Correlation Schema
 */
export interface CrossEventCorrelationSchema {
  eventPair: {
    eventA: {
      id: string;
      sport: SportType;
      league: string;
      teams: [string, string];
      startTime: number;
    };
    eventB: {
      id: string;
      sport: SportType;
      league: string;
      teams: [string, string];
      startTime: number;
    };
  };

  // Correlation analysis
  correlationType: 'temporal' | 'market' | 'volume' | 'odds_movement';
  correlationScore: number;
  lagTime: number; // Time between correlated events

  // Market impact
  marketImpact: {
    oddsChangeCorrelation: number;
    volumeSpikeCorrelation: number;
    arbitrageOpportunities: number;
  };

  // Network properties
  networkMetrics: {
    degreeCentrality: number;
    betweennessCentrality: number;
    clusteringCoefficient: number;
  };
}

export interface CrossEventCorrelation {
  eventAId: string;
  eventBId: string;
  correlationType: 'temporal' | 'market' | 'volume' | 'odds_movement';
  strength: number;
  lagTime: number;
  entity?: string;
  temporalDistance?: number;
  expectedPropagation?: number;
}

/**
 * Header 1.1.1.1.4.1.4: Layer2 Cross-Market Correlation Schema
 */
export interface CrossMarketCorrelationSchema {
  marketPair: {
    marketA: {
      eventId: string;
      marketType: MarketType;
      selection: string;
    };
    marketB: {
      eventId: string;
      marketType: MarketType;
      selection: string;
    };
  };

  // Price-based correlations
  priceCorrelation: {
    oddsMovement: number; // Correlation in odds changes
    impliedProbability: number; // Correlation in implied probabilities
    marketEfficiency: number; // How efficiently correlated
  };

  // Volume-based correlations
  volumeCorrelation: {
    volumeSpikeTiming: number; // Timing correlation between volume spikes
    volumeRatio: number; // Ratio of volumes between markets
    abnormalVolumeDetection: boolean;
  };

  // Risk metrics
  riskMetrics: {
    maxCorrelatedExposure: number; // Maximum exposure if both markets move together
    hedgeEfficiency: number; // How well markets can hedge each other
    tailRiskCorrelation: number; // Correlation in extreme market moves
  };
}

export interface CrossMarketCorrelation {
  market1: string;
  market2: string;
  baseCorrelation: number;
  currentDeviation: number;
  correlationBreak: boolean;
  breakMagnitude: number;
  eventId?: string;
}

/**
 * Header 1.1.1.1.4.1.5: Layer1 Direct Correlation Schema
 */
export interface DirectCorrelationSchema {
  selectionPair: {
    selectionA: {
      eventId: string;
      marketId: string;
      selectionId: string;
      currentOdds: number;
    };
    selectionB: {
      eventId: string;
      marketId: string;
      selectionId: string;
      currentOdds: number;
    };
  };

  // Mathematical correlation
  correlationMetrics: {
    pearsonCorrelation: number;
    spearmanCorrelation: number;
    kendallTau: number;
    covariance: number;
  };

  // Time-series properties
  timeSeriesAnalysis: {
    cointegration: boolean;
    grangerCausality: {
      aCausesB: boolean;
      bCausesA: boolean;
      fStatistic: number;
    };
    stationarity: {
      isStationary: boolean;
      differencingRequired: number;
    };
  };

  // Trading signals
  tradingSignals: {
    arbitrageOpportunity: boolean;
    spreadTradingSignal: 'buy' | 'sell' | 'hold';
    convergenceLikelihood: number;
  };
}

export interface DirectCorrelation {
  parentNode: string;
  childNode: string;
  expectedRatio: number;
  actualRatio: number;
  latency: number;
  deviation: number;
  isAnomaly: boolean;
  eventId?: string;
}
