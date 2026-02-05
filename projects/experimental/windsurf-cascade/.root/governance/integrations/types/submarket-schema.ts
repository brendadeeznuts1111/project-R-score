/**
 * @fileoverview Shared type definitions for Submarket Analysis
 */

export interface SubmarketNodes {
  primaryMarket: {
    nodeId: string;
    marketDepth: number;
    liquidityScore: number;
    competitionLevel: number;
    efficiency: number;
  };
  secondaryMarkets: Array<{
    nodeId: string;
    marketDepth: number;
    liquidityScore: number;
    correlationStrength: number;
  }>;
  crossMarketEdges: {
    totalEdges: number;
    strongestCorrelation: number;
    arbitragePaths: string[];
  };
}

export interface ArbitragePath {
  pathId: string;
  pathType?: 'direct' | 'multi-hop';
  estimatedProfit: number;
  executionComplexity?: number;
  riskScore?: number;
  liquidityRequirement?: number;
  timeToExecution?: 'instant' | 'seconds' | 'minutes' | 'hours';
}
