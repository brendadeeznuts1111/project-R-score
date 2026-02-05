// src/types/index.ts

export interface Invoice {
  paymentHash: string;
  userId: string;
  amountSettled: number;
  metadata: {
    questId?: string;
    [key: string]: any;
  };
  timestamp?: Date;
}

export interface RoutingDecision {
  shouldRoute: boolean;
  destination: "green" | "lightning" | "split";
  amountToGreen: number;
  amountToLightning: number;
  reason: string;
  priceImpact: number;
}

export interface RouteMetrics {
  totalRouted: number;
  totalYieldProjected: number;
  averageRouteTime: number;
  successRate: number;
}

export interface GreenDepositParams {
  userId: string;
  amountUsd: number;
  source: string;
  questId?: string;
  traceId: string;
}

export interface GreenDepositResult {
  success: boolean;
  depositId: string;
  yieldProjection: number;
}

export interface GreenBalance {
  balance: number;
  yieldEarned: number;
  apy: number;
}

export interface DashboardStats {
  totalDeposited: number;
  totalYieldGenerated: number;
  activeFamilies: number;
  currentAPY: number;
  btcPrice: number;
  priceChange24h: number;
  pendingRoutes: number;
  totalRoutedToday: number;
  projectedMonthlyYield: number;
}

export interface PoolPerformance {
  poolId: string;
  poolName: string;
  balance: number;
  yieldGenerated: number;
  apy: number;
  lastDeposit: Date;
  growthRate: number;
}

export interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<any[]>;
  transaction: (callback: (trx: any) => Promise<void>) => Promise<void>;
}

export interface PriceData {
  btcUsd: number;
  timestamp: number;
  source: string;
}
