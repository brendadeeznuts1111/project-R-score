/**
 * @fileoverview Data Types for Graph Construction
 * @description Input data types for building graphs
 * @module graphs/multilayer/types/data
 * @version 1.1.1.1.4.2
 */

import type { MarketType, SportType } from '../schemas/layer-schemas';

export interface EventData {
  id: string;
  sport: SportType;
  league: string;
  teams: [string, string];
  startTime: number;
  markets: MarketData[];
  volume24h?: number;
}

export interface MarketData {
  id: string;
  eventId: string;
  type: MarketType;
  selections: SelectionData[];
  oddsHistory?: OddsHistoryPoint[];
  lastUpdated: number;
  volume24h?: number;
  expiryTime?: number;
}

export interface SelectionData {
  id: string;
  name: string;
  currentOdds: number;
  volume24h?: number;
  lastPriceChange?: number;
  oddsHistory?: OddsHistoryPoint[];
}

export interface OddsHistoryPoint {
  timestamp: number;
  odds: number;
  volume?: number;
}

export interface HistoricalSportData {
  sport: SportType;
  timestamp: number;
  value: number;
  [key: string]: unknown;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export interface AlignedTimeSeries {
  timestamp: number;
  valueA: number;
  valueB: number;
}

export interface GraphConstructionConfig {
  initialData?: GraphInitializationData;
  autoUpdate?: boolean;
  updateInterval?: number;
}

export interface GraphInitializationData {
  layer1: Layer1Data[];
  layer2: Layer2Data[];
  layer3: Layer3Data[];
  layer4: Layer4Data[];
}

export interface Layer1Data {
  selectionA: SelectionData;
  selectionB: SelectionData;
  correlation: number;
}

export interface Layer2Data {
  marketA: MarketData;
  marketB: MarketData;
  correlation: number;
}

export interface Layer3Data {
  eventA: EventData;
  eventB: EventData;
  correlation: number;
}

export interface Layer4Data {
  sportA: SportType;
  sportB: SportType;
  correlation: number;
}

export interface EventGraphConfig {
  minCorrelationScore: number;
  temporalWindow?: number;
}

export interface AssemblyConfig {
  optimization?: {
    pruneWeakEdges?: boolean;
    mergeSimilarNodes?: boolean;
  };
}

export interface GraphDataSource {
  loadLayer1(): Promise<Layer1Data[]>;
  loadLayer2(): Promise<Layer2Data[]>;
  loadLayer3(): Promise<Layer3Data[]>;
  loadLayer4(): Promise<Layer4Data[]>;
}
