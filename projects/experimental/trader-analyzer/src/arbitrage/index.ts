/**
 * @fileoverview NEXUS Arbitrage Detection Module
 * @description Cross-market arbitrage detection for prediction markets
 * @module arbitrage
 */

export type { AlertMessage, AlertSubscription, AlertType } from "./alerts";
// Alert Server
export {
	ArbitrageAlertServer,
	createAlertServer,
	getAlertServer,
	setAlertServer,
} from "./alerts";
export type {
	CryptoArbitrageOpportunity,
	CryptoTarget,
	DeribitQuote,
} from "./crypto-matcher";
// Crypto Matcher - Cross-asset arbitrage (Options vs Prediction Markets)
export {
	CryptoMatcher,
	createCryptoMatcher,
	globalCryptoMatcher,
} from "./crypto-matcher";
// Arbitrage Detector
export {
	ArbitrageDetector,
	createArbitrageDetector,
	globalDetector,
} from "./detector";
export type {
	ExecutionResult,
	ExecutorCallbacks,
	ExecutorConfig,
	OrderResult,
} from "./executor";
// Trade Executor - Execute arbitrage trades
export {
	ArbitrageExecutor,
	createExecutor,
} from "./executor";
// Event Matcher
export {
	createEventMatcher,
	EventMatcher,
	globalMatcher,
} from "./matcher";
export type { ScannerCallbacks } from "./scanner";
// Scanner Service
export {
	ArbitrageScanner,
	createArbitrageScanner,
	globalScanner,
} from "./scanner";
// Types
export type {
	ArbitrageOpportunity,
	ArbitrageScannerConfig,
	CryptoVenue,
	MarketCategory,
	MatchCriteria,
	MatchedEvent,
	PredictionVenue,
	ScanResult,
	SportsBettingVenue,
	Venue,
	VenueQuote,
} from "./types";
