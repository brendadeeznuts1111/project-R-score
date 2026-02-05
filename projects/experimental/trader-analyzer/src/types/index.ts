/**
 * @fileoverview Type definitions for Trader Analyzer
 * @description Core types for trades, analytics, providers, and market data
 * @module types
 */

// ============ TMA (Telegram Mini App) Types ============
// Re-export TMA types for easy access
// Version: 9.1.1.11.2.0.0.0
export type {
	TMATradingDashboardData,        // 9.1.1.11.2.1.0.0.0
	TMAOpportunitySummary,          // 9.1.1.11.2.1.1.0.0.0
	TMABalanceOverview,             // 9.1.1.11.2.2.0.0.0
	TMABookmakerBalance,            // 9.1.1.11.2.2.0.3.0.0.0
	TMAAlertSummary,                // 9.1.1.11.2.3.0.0.0
	TMAAlertActionRequest,           // 9.1.1.11.2.3.3.0.0.0
	TMAAlertListResponse,           // 9.1.1.11.2.3.0.0.0 (legacy)
	TMAGraphData,                   // 9.1.1.11.2.4.0.0.0
	TMAGraphSeries,                 // 9.1.1.11.2.4.0.6.0.0.0
	TMAGraphOptions,                // 9.1.1.11.2.4.0.7.0.0.0
	TMATradeOrderRequest,           // 9.1.1.11.2.5.0.0.0
	TMATradeOrderResponse,          // 9.1.1.11.2.5.0.0.0
	TMATradeExecutionRequest,       // Legacy (deprecated)
	TMATradeExecutionResponse,      // Legacy (deprecated)
	TMARiskAssessment,              // 9.1.1.11.2.5.3.0.0.0
	TMAActionTriggerRequest,        // 9.1.1.11.2.6.0.0.0
	TMAActionTriggerResponse,
} from "./tma";

// ============ Core Result Type ============

/**
 * Discriminated union for handling success/error results
 * @template T - The success data type
 * @template E - The error type (defaults to Error)
 *
 * @example
 * const result: Result<Trade[]> = await provider.fetchTrades();
 * if (result.ok) {
 *   console.log(result.data); // Trade[]
 * } else {
 *   console.error(result.error); // Error
 * }
 */
export type Result<T, E = Error> =
	| { ok: true; data: T }
	| { ok: false; error: E };

/**
 * Create a successful Result
 * @template T - The data type
 * @param data - The success data
 * @returns A success Result
 *
 * @example
 * return ok(trades);
 */
export function ok<T>(data: T): Result<T, never> {
	return { ok: true, data };
}

/**
 * Create an error Result
 * @template E - The error type
 * @param error - The error value
 * @returns An error Result
 *
 * @example
 * return err(new Error('Connection failed'));
 */
export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

// ============ Data Source Types ============

/**
 * Type of data source
 * - `api`: Exchange or prediction market API
 * - `csv`: CSV file import
 * - `json`: JSON file import
 */
export type DataSourceType = "api" | "csv" | "json";

/**
 * Configuration for a data source
 */
export interface DataSourceConfig {
	/** Source type */
	type: DataSourceType;
	/** Exchange name (for API sources) */
	exchange?: string;
	/** API key (for API sources) */
	apiKey?: string;
	/** API secret (for API sources) */
	apiSecret?: string;
	/** Use testnet/sandbox (for API sources) */
	testnet?: boolean;
	/** File path (for file sources) */
	filePath?: string;
}

// ============ Trade & Execution Types ============

/**
 * A single trade execution
 *
 * @example
 * const trade: Trade = {
 *   id: 'trade-123',
 *   datetime: '2024-01-15T10:30:00Z',
 *   symbol: 'BTC/USD',
 *   side: 'buy',
 *   price: 42500.50,
 *   amount: 0.5,
 *   cost: 21250.25,
 *   fee: 10.62,
 * };
 */
export interface Trade {
	/** Unique trade identifier */
	id: string;
	/** ISO 8601 timestamp */
	datetime: string;
	/** Trading pair symbol (e.g., 'BTC/USD', 'BTCUSDT') */
	symbol: string;
	/** Trade direction */
	side: "buy" | "sell";
	/** Execution price */
	price: number;
	/** Quantity traded */
	amount: number;
	/** Total cost (price * amount) */
	cost: number;
	/** Trading fee paid */
	fee: number;
	/** Associated order ID */
	orderID?: string;
	/** Order type that generated this trade */
	ordType?: string;
	/** Leverage used (for derivatives) */
	leverage?: number;
}

/**
 * An order placed on an exchange
 */
export interface Order {
	/** Unique order identifier */
	orderID: string;
	/** Trading pair symbol */
	symbol: string;
	/** Order direction */
	side: "buy" | "sell";
	/** Order type */
	ordType: "limit" | "market" | "stop" | "stop_limit";
	/** Original order quantity */
	orderQty: number;
	/** Limit price (null for market orders) */
	price: number | null;
	/** Average fill price */
	avgPx: number | null;
	/** Cumulative filled quantity */
	cumQty: number;
	/** Current order status */
	status: "filled" | "canceled" | "rejected" | "open" | "partial";
	/** Order status (legacy alias for status) */
	ordStatus?: "Filled" | "Canceled" | "Rejected" | "New" | "PartiallyFilled";
	/** ISO 8601 timestamp */
	timestamp: string;
}

/**
 * Exchange credentials for API authentication
 */
export interface ExchangeCredentials {
	/** Exchange name (e.g., 'bitmex', 'binance') */
	exchange: string;
	/** API key */
	apiKey: string;
	/** API secret */
	apiSecret: string;
	/** Use testnet/sandbox environment */
	testnet?: boolean;
	/** API passphrase (required by some exchanges) */
	passphrase?: string;
}

/**
 * Trade execution record
 * @deprecated Use Trade instead - this type is kept for backward compatibility
 */
export interface Execution extends Trade {
	/** Execution ID (same as Trade.id) */
	execID: string;
	/** Execution timestamp (same as Trade.datetime) */
	execTimestamp: string;
}

// ============ Wallet Types ============

/**
 * A wallet/account transaction
 */
export interface WalletTransaction {
	/** Unique transaction identifier */
	id: string;
	/** Transaction type */
	type: "pnl" | "funding" | "deposit" | "withdrawal" | "transfer" | "fee";
	/** Transaction amount (positive or negative) */
	amount: number;
	/** Fee paid */
	fee: number;
	/** ISO 8601 timestamp */
	timestamp: string;
	/** Account balance after transaction */
	balance: number;
	/** Currency code (e.g., 'BTC', 'USD') */
	currency: string;
}

// ============ Position Session Types ============

/**
 * A trading session from position open to close
 *
 * Represents a complete trade cycle: opening a position,
 * optionally adding to it, and closing it.
 */
export interface PositionSession {
	/** Unique session identifier */
	id: string;
	/** Trading pair symbol */
	symbol: string;
	/** Position direction */
	side: "long" | "short";
	/** When position was opened (ISO 8601) */
	openTime: string;
	/** When position was closed (null if still open) */
	closeTime: string | null;
	/** Duration in milliseconds */
	durationMs: number;
	/** Maximum position size during session */
	maxSize: number;
	/** Average entry price */
	entryPrice: number;
	/** Average exit price (null if still open) */
	exitPrice: number | null;
	/** Realized profit/loss */
	realizedPnl: number;
	/** Unrealized profit/loss (for open positions) */
	unrealizedPnl: number;
	/** Total fees paid during session */
	totalFees: number;
	/** Number of trades in session */
	tradeCount: number;
	/** All trades in this session */
	trades: Trade[];
	/** Session status */
	status: "open" | "closed";
}

// ============ Analytics Types ============

/**
 * Comprehensive trading statistics
 *
 * @example
 * const stats = calculateStats(trades, orders);
 * console.log(`Win Rate: ${stats.winRate}%`);
 * console.log(`Profit Factor: ${stats.profitFactor}`);
 */
export interface TradingStats {
	// Volume metrics
	/** Total number of trades */
	totalTrades: number;
	/** Total volume traded (in base currency) */
	totalVolume: number;
	/** Average trade size */
	avgTradeSize: number;

	// Time metrics
	/** First trade timestamp (ISO 8601) */
	firstTrade: string | null;
	/** Last trade timestamp (ISO 8601) */
	lastTrade: string | null;
	/** Number of unique trading days */
	tradingDays: number;
	/** Average trades per day */
	avgTradesPerDay: number;

	// Performance metrics
	/** Number of winning trades */
	winningTrades: number;
	/** Number of losing trades */
	losingTrades: number;
	/** Win rate percentage (0-100) */
	winRate: number;
	/** Average winning trade profit */
	avgWin: number;
	/** Average losing trade loss */
	avgLoss: number;
	/** Largest single winning trade */
	largestWin: number;
	/** Largest single losing trade */
	largestLoss: number;
	/** Profit factor (gross profit / gross loss) */
	profitFactor: number;
	/** Expected value per trade */
	expectancy: number;

	// PnL metrics
	/** Total profit/loss before fees */
	totalPnl: number;
	/** Total fees paid */
	totalFees: number;
	/** Net profit/loss after fees */
	netPnl: number;

	// Order metrics (when order data available)
	/** Total orders placed */
	totalOrders: number;
	/** Order fill rate percentage (0-100) */
	fillRate: number;
	/** Order cancel rate percentage (0-100) */
	cancelRate: number;
	/** Percentage of limit orders (0-100) */
	limitOrderPercent: number;

	/** Monthly performance breakdown */
	monthlyPnl: MonthlyPnl[];
}

/**
 * Monthly performance summary
 */
export interface MonthlyPnl {
	/** Month in YYYY-MM format */
	month: string;
	/** Total PnL for the month */
	pnl: number;
	/** Number of trades */
	trades: number;
	/** Win rate for the month (0-100) */
	winRate: number;
}

// ============ Trader Profile Types ============

/**
 * Trading style classification
 * - `scalper`: Very short-term, high frequency (< 30 min holds)
 * - `day_trader`: Intraday, closes positions daily (< 24 hour holds)
 * - `swing_trader`: Multi-day holds (days to weeks)
 * - `position_trader`: Long-term holds (weeks to months)
 */
export type TradingStyle =
	| "scalper"
	| "day_trader"
	| "swing_trader"
	| "position_trader";

/**
 * Risk preference classification
 * - `aggressive`: High risk tolerance, larger drawdowns acceptable
 * - `moderate`: Balanced risk/reward approach
 * - `conservative`: Risk-averse, capital preservation focused
 */
export type RiskProfile = "aggressive" | "moderate" | "conservative";

/**
 * Strategy complexity level
 * - `beginner`: Simple strategies, fewer trades
 * - `intermediate`: Moderate complexity, developing edge
 * - `advanced`: Complex strategies, high frequency or sophisticated approach
 */
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

/**
 * Comprehensive trader profile analysis
 *
 * @example
 * const profile = analyzeTraderProfile(stats, trades, orders, sessions);
 * console.log(`Style: ${profile.style}`);
 * console.log(`Strengths: ${profile.insights.strengths.join(', ')}`);
 */
export interface TraderProfile {
	/** Identified trading style */
	style: TradingStyle;
	/** Risk preference classification */
	risk: RiskProfile;
	/** Strategy complexity level */
	difficulty: DifficultyLevel;
	/** Quantitative metrics */
	metrics: {
		/** Win rate percentage (0-100) */
		winRate: number;
		/** Profit factor (capped at 999 for display) */
		profitFactor: number;
		/** Average position holding time in minutes */
		avgHoldingMinutes: number;
		/** Average trades per week */
		tradesPerWeek: number;
		/** Discipline score (0-100) based on order types and consistency */
		disciplineScore: number;
		/** Consistency score (0-100) based on results variance */
		consistencyScore: number;
	};
	/** Qualitative insights */
	insights: {
		/** One-line profile summary */
		summary: string;
		/** Identified strengths */
		strengths: string[];
		/** Identified weaknesses */
		weaknesses: string[];
		/** Improvement recommendations */
		recommendations: string[];
	};
}

// ============ OHLCV Types ============

/**
 * OHLCV candlestick data point
 */
export interface Candle {
	/** Unix timestamp in seconds */
	time: number;
	/** Opening price */
	open: number;
	/** High price */
	high: number;
	/** Low price */
	low: number;
	/** Closing price */
	close: number;
	/** Volume traded */
	volume: number;
}

/**
 * Chart marker for highlighting points
 */
// TMA (Telegram Mini App) Types
// Version: 9.1.1.11.2.0.0.0
export type {
	TMATradingDashboardData,        // 9.1.1.11.2.1.0.0.0
	TMAOpportunitySummary,          // 9.1.1.11.2.1.1.0.0.0
	TMABalanceOverview,             // 9.1.1.11.2.2.0.0.0
	TMABookmakerBalance,            // 9.1.1.11.2.2.0.3.0.0.0
	TMAAlertSummary,                // 9.1.1.11.2.3.0.0.0
	TMAAlertActionRequest,           // 9.1.1.11.2.3.3.0.0.0
	TMAAlertListResponse,           // 9.1.1.11.2.3.0.0.0 (legacy)
	TMAGraphData,                   // 9.1.1.11.2.4.0.0.0
	TMAGraphSeries,                 // 9.1.1.11.2.4.0.6.0.0.0
	TMAGraphOptions,                // 9.1.1.11.2.4.0.7.0.0.0
	TMATradeOrderRequest,           // 9.1.1.11.2.5.0.0.0
	TMATradeOrderResponse,          // 9.1.1.11.2.5.0.0.0
	TMATradeExecutionRequest,       // Legacy (deprecated)
	TMATradeExecutionResponse,      // Legacy (deprecated)
	TMARiskAssessment,              // 9.1.1.11.2.5.3.0.0.0
	TMAActionTriggerRequest,        // 9.1.1.11.2.6.0.0.0
	TMAActionTriggerResponse,
} from "./tma";

export interface ChartMarker {
	/** Unix timestamp in seconds */
	time: number;
	/** Position relative to candle */
	position: "above" | "below";
	/** Marker color (CSS color string) */
	color: string;
	/** Marker shape */
	shape: "arrow" | "circle" | "square";
	/** Tooltip text */
	text: string;
}

/**
 * Supported chart timeframes
 */
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

// ============ Data Provider Interface ============

/**
 * Interface for data providers (exchanges, prediction markets, etc.)
 *
 * @example
 * class MyExchangeProvider implements DataProvider {
 *   name = 'my-exchange';
 *
 *   async connect() {
 *     // Connect to API
 *     return ok(undefined);
 *   }
 *
 *   async fetchTrades(symbol?: string) {
 *     // Fetch trades from API
 *     return ok(trades);
 *   }
 *   // ... implement other methods
 * }
 */
export interface DataProvider {
	/** Provider name identifier */
	name: string;

	/**
	 * Establish connection to the data source
	 * @returns Result indicating success or connection error
	 */
	connect(): Promise<Result<void>>;

	/**
	 * Close the connection
	 */
	disconnect(): Promise<void>;

	/**
	 * Check if currently connected
	 */
	isConnected(): boolean;

	/**
	 * Fetch trades with pagination
	 * @param symbol - Trading pair to filter by
	 * @param since - Fetch trades after this timestamp (ms)
	 * @param limit - Maximum number of trades to fetch
	 */
	fetchTrades(
		symbol?: string,
		since?: number,
		limit?: number,
	): Promise<Result<Trade[]>>;

	/**
	 * Fetch all available trades, handling pagination internally
	 * @param symbol - Trading pair to filter by
	 * @param onProgress - Callback for progress updates
	 */
	fetchAllTrades(
		symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>>;

	/**
	 * Fetch orders (optional)
	 * @param symbol - Trading pair to filter by
	 * @param since - Fetch orders after this timestamp (ms)
	 * @param limit - Maximum number of orders to fetch
	 */
	fetchOrders?(
		symbol?: string,
		since?: number,
		limit?: number,
	): Promise<Result<Order[]>>;

	/**
	 * Fetch OHLCV candlestick data (optional)
	 * @param symbol - Trading pair
	 * @param timeframe - Candle timeframe
	 * @param since - Fetch candles after this timestamp (ms)
	 * @param limit - Maximum number of candles to fetch
	 */
	fetchOHLCV?(
		symbol: string,
		timeframe: Timeframe,
		since?: number,
		limit?: number,
	): Promise<Result<Candle[]>>;

	/**
	 * Fetch account balance (optional)
	 */
	fetchBalance?(): Promise<
		Result<{ total: number; available: number; currency: string }>
	>;
}

// ============ Prediction Market Types ============

/**
 * Market type classification
 * - `perp`: Perpetual futures
 * - `spot`: Spot trading
 * - `prediction`: Prediction market
 * - `binary`: Binary options
 */
export type MarketType = "perp" | "spot" | "prediction" | "binary";

/**
 * A prediction market (Polymarket, Kalshi, etc.)
 *
 * @example
 * const market: PredictionMarket = {
 *   id: 'btc-100k-2025',
 *   question: 'Will Bitcoin reach $100k in 2025?',
 *   outcomes: [
 *     { id: 'yes', name: 'Yes', price: 0.65, volume: 1000000 },
 *     { id: 'no', name: 'No', price: 0.35, volume: 500000 },
 *   ],
 *   status: 'open',
 *   volume: 1500000,
 *   // ...
 * };
 */
export interface PredictionMarket {
	/** Unique market identifier */
	id: string;
	/** Market question */
	question: string;
	/** Alternative title (Polymarket uses this) */
	title?: string;
	/** Detailed description */
	description?: string;
	/** Available outcomes */
	outcomes: MarketOutcome[];
	/** Current market status */
	status: "open" | "closed" | "resolved";
	/** Resolution value (if resolved) */
	resolution?: string;
	/** Market end/expiration date (ISO 8601) */
	endDate?: string;
	/** Total volume traded */
	volume: number;
	/** Current liquidity */
	liquidity: number;
	/** Market category */
	category?: string;
	/** Associated tags */
	tags?: string[];

	// Polymarket-specific fields
	/** Outcome prices as JSON string or array (Polymarket format) */
	outcomePrices?: string | number[];

	// Kalshi-specific fields (prices in cents 0-100)
	/** Yes bid price in cents */
	yes_bid?: number;
	/** Yes ask price in cents */
	yes_ask?: number;
	/** No bid price in cents */
	no_bid?: number;
	/** No ask price in cents */
	no_ask?: number;
}

/**
 * An outcome option in a prediction market
 */
export interface MarketOutcome {
	/** Unique outcome identifier */
	id: string;
	/** Outcome name (e.g., 'Yes', 'No', 'Biden', 'Trump') */
	name: string;
	/** Current price/probability (0-1) */
	price: number;
	/** Volume traded on this outcome */
	volume: number;
}

/**
 * A trade on a prediction market
 * Extends Trade with prediction-specific fields
 */
export interface PredictionTrade extends Trade {
	/** Market identifier */
	marketId: string;
	/** Outcome identifier */
	outcomeId: string;
	/** Outcome name */
	outcome: string;
	/** Market type (binary or multi-outcome) */
	marketType: "binary" | "multi";
}

/**
 * A position in a prediction market
 */
export interface PredictionPosition {
	/** Market identifier */
	marketId: string;
	/** Market question/name */
	market: string;
	/** Outcome identifier */
	outcomeId: string;
	/** Outcome name */
	outcome: string;
	/** Position side */
	side: "yes" | "no";
	/** Number of contracts held */
	contracts: number;
	/** Average entry price (0-1) */
	avgPrice: number;
	/** Current market price (0-1) */
	currentPrice: number;
	/** Unrealized profit/loss */
	unrealizedPnl: number;
	/** Realized profit/loss */
	realizedPnl: number;
}

// ============ Market Making Types ============

/**
 * Market making performance statistics
 *
 * @example
 * const mmStats = calculateMMStats(trades, orders, quotes);
 * console.log(`Maker Ratio: ${(mmStats.makerRatio * 100).toFixed(1)}%`);
 * console.log(`Net PnL: ${mmStats.netPnl}`);
 */
export interface MarketMakingStats {
	// Volume & Activity
	/** Total trades executed */
	totalTrades: number;
	/** Trades as maker (providing liquidity) */
	makerTrades: number;
	/** Trades as taker (removing liquidity) */
	takerTrades: number;
	/** Maker trade ratio (0-1) */
	makerRatio: number;
	/** Total volume traded */
	totalVolume: number;

	// Spread Analysis
	/** Average quoted spread */
	avgSpread: number;
	/** Minimum spread observed */
	minSpread: number;
	/** Maximum spread observed */
	maxSpread: number;
	/** Percentage of spread captured (0-1) */
	spreadCapture: number;

	// Inventory Management
	/** Average absolute inventory */
	avgInventory: number;
	/** Maximum inventory reached */
	maxInventory: number;
	/** Inventory turnover rate */
	inventoryTurnover: number;
	/** Inventory skew (-1 to 1, negative = short heavy) */
	inventorySkew: number;

	// Performance
	/** Gross PnL before fees */
	grossPnl: number;
	/** Maker rebates earned */
	rebates: number;
	/** Fees paid */
	fees: number;
	/** Net PnL after fees and rebates */
	netPnl: number;
	/** Average PnL per trade */
	pnlPerTrade: number;

	// Fill Rates
	/** Bid order fill rate (0-1) */
	bidFillRate: number;
	/** Ask order fill rate (0-1) */
	askFillRate: number;
	/** Average time to fill (ms) */
	avgFillTime: number;

	// Risk Metrics
	/** Maximum drawdown */
	maxDrawdown: number;
	/** Annualized Sharpe ratio */
	sharpeRatio: number;
	/** Percentage of time with active quotes */
	uptimePercent: number;
}

/**
 * A snapshot of quoting activity at a point in time
 */
export interface QuoteSnapshot {
	/** ISO 8601 timestamp */
	timestamp: string;
	/** Trading pair symbol */
	symbol: string;
	/** Best bid price */
	bidPrice: number;
	/** Bid size */
	bidSize: number;
	/** Best ask price */
	askPrice: number;
	/** Ask size */
	askSize: number;
	/** Mid price ((bid + ask) / 2) */
	midPrice: number;
	/** Spread in price terms */
	spread: number;
	/** Spread in basis points */
	spreadBps: number;
	/** Current inventory position */
	inventory: number;
}

/**
 * A market making session
 */
export interface MMSession {
	/** Unique session identifier */
	id: string;
	/** Trading pair symbol */
	symbol: string;
	/** Session start time (ISO 8601) */
	startTime: string;
	/** Session end time (ISO 8601, null if ongoing) */
	endTime: string | null;
	/** Session duration in milliseconds */
	duration: number;
	/** Trades during this session */
	trades: Trade[];
	/** Quote snapshots during this session */
	quotes: QuoteSnapshot[];
	/** Aggregated session statistics */
	stats: MarketMakingStats;
}

// ============ Provider Types ============

/**
 * Supported exchange/platform types
 */
export type ExchangeType =
	| "bitmex"
	| "binance"
	| "bybit"
	| "okx" // Crypto derivatives
	| "polymarket"
	| "kalshi"
	| "manifold" // Prediction markets
	| "generic"; // File import

/**
 * Configuration for data providers
 */
export interface ProviderConfig {
	/** Provider type */
	type: ExchangeType;
	/** API key for authentication */
	apiKey?: string;
	/** API secret for authentication */
	apiSecret?: string;
	/** API passphrase (required by some exchanges) */
	passphrase?: string;
	/** Use testnet/sandbox environment */
	testnet?: boolean;
	/** Custom base URL override */
	baseUrl?: string;
}

// ============ App State ============

/**
 * Global application state
 */
export interface AppState {
	/** Current data source configuration */
	dataSource: DataSourceConfig | null;
	/** Loaded trades */
	trades: Trade[];
	/** Loaded orders */
	orders: Order[];
	/** Wallet transactions */
	wallet: WalletTransaction[];
	/** Last data update timestamp (ISO 8601) */
	lastUpdated: string | null;
}

// ============ ORCA Types ============

/**
 * Supported sports for ORCA normalization
 */
export type OrcaSport =
	| "NFL"
	| "NBA"
	| "MLB"
	| "NHL"
	| "NCAAF"
	| "NCAAB" // US Major
	| "EPL"
	| "LALIGA"
	| "BUNDESLIGA"
	| "SERIEA"
	| "LIGUE1"
	| "MLS" // Soccer
	| "UFC"
	| "BOXING" // Combat sports
	| "TENNIS"
	| "GOLF" // Individual sports
	| "ESPORTS";

/**
 * Supported bookmaker identifiers for ORCA
 */
export type OrcaBookmaker =
	// US Books
	| "draftkings"
	| "fanduel"
	| "betmgm"
	| "caesars"
	| "pointsbet"
	// Sharp Books
	| "pinnacle"
	| "ps3838"
	| "circa"
	| "bookmaker"
	| "betcris"
	// European Exchanges
	| "betfair"
	| "smarkets"
	| "matchbook";

/**
 * Market type classification for sports betting
 */
export type OrcaMarketType =
	| "moneyline" // Winner (H2H)
	| "spread" // Point spread / handicap
	| "total" // Over/under
	| "prop" // Player/team props
	| "future" // Futures/outrights
	| "live"; // In-play markets

/**
 * Game period for market context
 */
export type OrcaPeriod =
	| "full" // Full game
	| "h1"
	| "h2" // Halves
	| "q1"
	| "q2"
	| "q3"
	| "q4" // Quarters
	| "p1"
	| "p2"
	| "p3" // Periods (hockey)
	| "i1"
	| "i2"
	| "i3"
	| "i4"
	| "i5"
	| "i6"
	| "i7"
	| "i8"
	| "i9" // Innings
	| "set1"
	| "set2"
	| "set3"
	| "set4"
	| "set5"; // Tennis sets

/**
 * Canonical team/participant representation
 */
export interface OrcaTeam {
	/** Canonical team ID (UUIDv5) */
	id: string;
	/** Canonical name */
	name: string;
	/** Short abbreviation (e.g., 'LAL', 'NYY') */
	abbreviation: string;
	/** City/location */
	city?: string;
	/** Sport this team belongs to */
	sport: OrcaSport;
	/** League this team belongs to */
	league: string;
}

/**
 * Canonical league representation
 */
export interface OrcaLeague {
	/** Canonical league ID (UUIDv5) */
	id: string;
	/** Canonical name */
	name: string;
	/** Sport this league belongs to */
	sport: OrcaSport;
	/** Country/region */
	country?: string;
}

/**
 * Canonical event (game/match) representation
 */
export interface OrcaEvent {
	/** Deterministic event ID (UUIDv5) */
	id: string;
	/** Sport */
	sport: OrcaSport;
	/** League ID */
	leagueId: string;
	/** League name */
	leagueName: string;
	/** Home team ID */
	homeTeamId: string;
	/** Home team name */
	homeTeamName: string;
	/** Away team ID */
	awayTeamId: string;
	/** Away team name */
	awayTeamName: string;
	/** Event start time (ISO 8601) */
	startTime: string;
	/** Current event status */
	status: "scheduled" | "live" | "completed" | "postponed" | "canceled";
}

/**
 * Canonical market representation
 */
export interface OrcaMarket {
	/** Deterministic market ID (UUIDv5) */
	id: string;
	/** Parent event ID */
	eventId: string;
	/** Market type */
	type: OrcaMarketType;
	/** Period this market applies to */
	period: OrcaPeriod;
	/** Line value if applicable (e.g., spread line, total number) */
	line?: number;
}

/**
 * Canonical selection/outcome representation
 */
export interface OrcaSelection {
	/** Deterministic selection ID (UUIDv5) */
	id: string;
	/** Parent market ID */
	marketId: string;
	/** Selection name (e.g., team name, 'Over', 'Under') */
	name: string;
	/** Selection type */
	type: "home" | "away" | "draw" | "over" | "under" | "yes" | "no" | "other";
	/** Line value if applicable (e.g., -3.5 for spread) */
	line?: number;
}

/**
 * Raw bookmaker data input for normalization
 */
export interface OrcaRawInput {
	/** Source bookmaker */
	bookmaker: OrcaBookmaker;
	/** Raw sport name from bookmaker */
	sport: string;
	/** Raw league name from bookmaker */
	league: string;
	/** Raw home team name */
	homeTeam: string;
	/** Raw away team name */
	awayTeam: string;
	/** Event start time (ISO 8601) */
	startTime: string;
	/** Raw market type */
	marketType: string;
	/** Raw period */
	period?: string;
	/** Market line value */
	line?: number;
	/** Raw selection name */
	selection: string;
}

/**
 * Normalized output from ORCA
 */
export interface OrcaNormalizedOutput {
	/** Canonical event */
	event: OrcaEvent;
	/** Canonical market */
	market: OrcaMarket;
	/** Canonical selection */
	selection: OrcaSelection;
	/** Confidence score (0-1) */
	confidence: number;
	/** Warnings/issues encountered during normalization */
	warnings: string[];
}

// ============ ORCA Streaming Types ============

/**
 * Odds format for streaming
 */
export type OrcaOddsFormat = "decimal" | "american" | "fractional";

/**
 * Live odds update from a bookmaker
 */
export interface OrcaOddsUpdate {
	/** Canonical market ID (UUIDv5) */
	marketId: string;
	/** Canonical selection ID (UUIDv5) */
	selectionId: string;
	/** Canonical event ID (UUIDv5) */
	eventId: string;
	/** Source bookmaker */
	bookmaker: OrcaBookmaker;
	/** Decimal odds */
	odds: number;
	/** American odds (for reference) */
	americanOdds?: number;
	/** Line value if applicable */
	line?: number;
	/** Market type */
	marketType: OrcaMarketType;
	/** Timestamp of this update (ms since epoch) */
	timestamp: number;
	/** Is this market currently open */
	isOpen: boolean;
	/** Maximum stake in USD (if known) */
	maxStake?: number;
}

/**
 * Aggregated odds across bookmakers for a single selection
 */
export interface OrcaOddsComposite {
	/** Canonical market ID */
	marketId: string;
	/** Canonical selection ID */
	selectionId: string;
	/** Canonical event ID */
	eventId: string;
	/** Market type */
	marketType: OrcaMarketType;
	/** Line value */
	line?: number;
	/** Best available odds (highest for back, lowest for lay) */
	bestOdds: number;
	/** Bookmaker offering best odds */
	bestBookmaker: OrcaBookmaker;
	/** All bookmaker odds for comparison */
	allOdds: { bookmaker: OrcaBookmaker; odds: number; timestamp: number }[];
	/** Last update timestamp */
	lastUpdate: number;
}

/**
 * WebSocket message types for ORCA streaming
 */
export type OrcaWsMessageType =
	| "subscribe"
	| "unsubscribe"
	| "odds_update"
	| "odds_snapshot"
	| "event_update"
	| "error"
	| "heartbeat";

/**
 * WebSocket message envelope
 */
export interface OrcaWsMessage {
	type: OrcaWsMessageType;
	/** Topic/channel (e.g., 'global', 'NBA', specific eventId) */
	topic?: string;
	/** Payload data */
	data?: unknown;
	/** Timestamp */
	timestamp: number;
	/** Sequence number for ordering */
	seq?: number;
}

/**
 * Subscription request
 */
export interface OrcaSubscription {
	/** Topics to subscribe to */
	topics: string[];
	/** Sports filter */
	sports?: OrcaSport[];
	/** Bookmaker filter */
	bookmakers?: OrcaBookmaker[];
	/** Market type filter */
	marketTypes?: OrcaMarketType[];
}

/**
 * Bookmaker API configuration
 */
export interface OrcaBookmakerConfig {
	/** Base API URL */
	baseUrl: string;
	/** Authentication credentials */
	auth: {
		type: "basic" | "bearer" | "apikey" | "session";
		username?: string;
		password?: string;
		apiKey?: string;
		sessionToken?: string;
	};
	/** Rate limit (requests per second) */
	rateLimit?: number;
	/** Poll interval in ms */
	pollInterval?: number;
	/** Enabled sports */
	sports?: OrcaSport[];
}

/**
 * ORCA streaming server configuration
 */
export interface OrcaStreamConfig {
	/** WebSocket server port */
	port: number;
	/** TLS configuration */
	tls?: {
		cert: string;
		key: string;
	};
	/** Poll interval for odds in ms */
	pollInterval: number;
	/** Enabled bookmakers */
	bookmakers: OrcaBookmaker[];
	/** API key validation function */
	validateKey?: (key: string) => boolean | Promise<boolean>;
	/** Backpressure limit in bytes (default: 1MB) */
	backpressureLimit?: number;
	/** Close connections on backpressure limit (default: true) */
	closeOnBackpressureLimit?: boolean;
}

// ============ Covert Steam Types ============

export type {
	CovertSteamEventRecord,
	CovertSteamSeverityLevel,
	CovertSteamSeverityScore,
} from "./covert-steam";

export { isValidCovertSteamSeverityScore } from "./covert-steam";

export {
	InspectableCovertSteamAlert,
	InspectableCovertSteamSendResult,
	makeInspectable,
} from "./covert-steam-inspectable";
