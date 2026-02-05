/**
 * @dynamic-spy/kit v5.0 - Complete TypeScript Definitions
 */

// Core spy types
export * from '../core/urlpattern-spy';
export * from '../core/fuzzer-safe-spy';

// Tick monitoring types
export interface TickData {
	bid: number;
	ask: number;
	volume: number;
	timestamp: number;
	bookie: string;
	market: string;
	region?: 'ASIA' | 'EU' | 'US';
}

export interface TickDataExtended extends TickData {
	currentLine: number;
	lineBeforePlay?: number;
	confidence?: number;
}

export interface LineMovement {
	opening: number;
	current: number;
	movement: number;
	phase: 'OPENING' | 'BUYBACK' | 'CLOSING';
}

// Backwork types
export interface WinningPlay {
	bookie: string;
	market: string;
	line: number;
	timestamp: number;
	profit: number;
}

export interface FuzzyMatch {
	bookie: string;
	market: string;
	timestamp: number;
	lineMatch: number;
	timeMatch: number;
	confidence: number;
	pattern: string;
}

export interface SpikeSignal {
	bookie: string;
	spikeTime: number;
	volume: number;
	lineBeforePlay: number;
	leadTime: string;
	confidence: number;
}

export interface ModelFingerprint {
	edge: string;
	leadTime: string;
	successRate: string;
	replicationScore: number;
	signals: string[];
}

// Storage types
export interface R2Config {
	accountId: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
}

export interface TickRecord {
	timestamp: number;
	bookie: string;
	market: string;
	bid: number;
	ask: number;
	volume: number;
	region: 'ASIA' | 'EU' | 'US';
}

// Server types
export interface ArbOpportunity {
	league: string;
	market: string;
	profit_pct: number;
	value_usd: number;
	execute: boolean;
	bookie_a: string;
	bookie_b: string;
	odds_a: number;
	odds_b: number;
	timestamp: number;
}

export interface DashboardMetrics {
	totalArbs: number;
	avgProfit: number;
	totalValue: number;
	scansPerMin: number;
	bookies: number;
	markets: number;
}



