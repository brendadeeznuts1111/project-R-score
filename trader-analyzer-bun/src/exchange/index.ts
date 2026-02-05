import ccxt from "ccxt";
import type {
	Candle,
	ExchangeCredentials,
	Execution,
	Order,
	Timeframe,
	Trade,
	WalletTransaction,
} from "../types";

// Type definitions for ccxt (since @types/ccxt may not be available)
// Using any for now since ccxt namespace types aren't available in TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CcxtExchangeAny = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CcxtTradeAny = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CcxtOrderAny = any;
type CcxtOHLCV = [number, number, number, number, number, number];

// Exchange client singleton
let exchangeClient: CcxtExchangeAny | null = null;
let currentCredentials: ExchangeCredentials | null = null;

// Symbol mapping
const SYMBOL_MAP: Record<string, string> = {
	XBTUSD: "BTC/USD:BTC",
	BTCUSD: "BTC/USD:BTC",
	ETHUSD: "ETH/USD:ETH",
};

function mapSymbol(symbol: string): string {
	return SYMBOL_MAP[symbol] || symbol;
}

function normalizeSymbol(symbol: string): string {
	return symbol
		.replace("XBT", "BTC")
		.replace("/", "")
		.replace(":BTC", "")
		.replace(":ETH", "");
}

// Initialize exchange client
export function initExchange(
	credentials: ExchangeCredentials,
): CcxtExchangeAny {
	const { exchange, apiKey, apiSecret, testnet = false } = credentials;

	const ExchangeClass = (ccxt as any)[exchange] as new (config: any) => any;

	if (!ExchangeClass) {
		throw new Error(`Exchange ${exchange} not supported`);
	}

	exchangeClient = new ExchangeClass({
		apiKey,
		secret: apiSecret,
		enableRateLimit: true,
		options: {
			testnet,
		},
	});

	currentCredentials = credentials;
	return exchangeClient;
}

// Get current exchange client
export function getExchange(): CcxtExchangeAny {
	if (!exchangeClient) {
		throw new Error("Exchange not initialized. Call initExchange first.");
	}
	return exchangeClient;
}

// Test connection
export async function testConnection(
	credentials: ExchangeCredentials,
): Promise<{ success: boolean; error?: string; balance?: number }> {
	try {
		const exchange = initExchange(credentials);
		const balance = await exchange.fetchBalance();

		// Get BTC balance (or XBT for BitMEX)
		const btcBalance = balance.total?.BTC || balance.total?.XBT || 0;

		return { success: true, balance: btcBalance as number };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Fetch trade history
export async function fetchTrades(
	symbol: string = "BTC/USD:BTC",
	since?: number,
	limit: number = 500,
): Promise<Trade[]> {
	const exchange = getExchange();
	const mappedSymbol = mapSymbol(symbol);

	const trades = await exchange.fetchMyTrades(mappedSymbol, since, limit);

	return trades.map((t: CcxtTradeAny) => ({
		id: t.id,
		datetime: t.datetime || new Date(t.timestamp).toISOString(),
		symbol: normalizeSymbol(t.symbol),
		side: t.side as "buy" | "sell",
		price: t.price,
		amount: t.amount,
		cost: t.cost,
		fee: t.fee?.cost || 0,
		orderID: t.order || "",
	}));
}

// Fetch all trades (paginated)
export async function fetchAllTrades(
	symbol: string = "BTC/USD:BTC",
): Promise<Trade[]> {
	const exchange = getExchange();
	const mappedSymbol = mapSymbol(symbol);
	const allTrades: Trade[] = [];
	let since: number | undefined;

	console.log(`Fetching all trades for ${mappedSymbol}...`);

	while (true) {
		const trades: CcxtTradeAny[] = await exchange.fetchMyTrades(
			mappedSymbol,
			since,
			500,
		);

		if (trades.length === 0) break;

		const mapped = trades.map((t: CcxtTradeAny) => ({
			id: t.id,
			datetime: t.datetime || new Date(t.timestamp).toISOString(),
			symbol: normalizeSymbol(t.symbol),
			side: t.side as "buy" | "sell",
			price: t.price,
			amount: t.amount,
			cost: t.cost,
			fee: t.fee?.cost || 0,
			orderID: t.order || "",
		}));

		allTrades.push(...mapped);
		console.log(`Fetched ${allTrades.length} trades...`);

		// Get the last trade timestamp for pagination
		const lastTrade: CcxtTradeAny = trades[trades.length - 1];
		since = lastTrade.timestamp + 1;

		// Rate limiting
		await Bun.sleep(exchange.rateLimit || 1000);
	}

	return allTrades;
}

// Fetch order history
export async function fetchOrders(
	symbol: string = "BTC/USD:BTC",
	since?: number,
	limit: number = 500,
): Promise<Order[]> {
	const exchange = getExchange();
	const mappedSymbol = mapSymbol(symbol);

	const orders = await exchange.fetchOrders(mappedSymbol, since, limit);

	return orders.map((o: CcxtOrderAny) => ({
		orderID: o.id,
		symbol: normalizeSymbol(o.symbol),
		side: o.side === "buy" ? "buy" : "sell",
		ordType: mapOrderType(o.type),
		orderQty: o.amount,
		price: o.price,
		avgPx: o.average,
		cumQty: o.filled,
		status: mapOrderStatusToStatus(o.status),
		ordStatus: mapOrderStatus(o.status), // Legacy field
		timestamp: o.datetime || new Date(o.timestamp).toISOString(),
	}));
}

// Fetch OHLCV data
export async function fetchOHLCV(
	symbol: string = "BTC/USD:BTC",
	timeframe: Timeframe = "1d",
	since?: number,
	limit: number = 500,
): Promise<Candle[]> {
	const exchange = getExchange();
	const mappedSymbol = mapSymbol(symbol);

	const ohlcv: CcxtOHLCV[] = await exchange.fetchOHLCV(
		mappedSymbol,
		timeframe,
		since,
		limit,
	);

	return ohlcv.map(([time, open, high, low, close, volume]: CcxtOHLCV) => ({
		time: Math.floor(time / 1000),
		open: open,
		high: high,
		low: low,
		close: close,
		volume: volume,
	}));
}

// Fetch balance
export async function fetchBalance(): Promise<{
	total: number;
	available: number;
	currency: string;
}> {
	const exchange = getExchange();
	const balance = await exchange.fetchBalance();

	// BitMEX uses XBT, others use BTC
	const currency = currentCredentials?.exchange === "bitmex" ? "XBT" : "BTC";
	const total = balance.total?.[currency] || balance.total?.BTC || 0;
	const available = balance.free?.[currency] || balance.free?.BTC || 0;

	return {
		total: total as number,
		available: available as number,
		currency: "BTC",
	};
}

// Helper functions
function mapOrderType(type: string | undefined): Order["ordType"] {
	switch (type?.toLowerCase()) {
		case "limit":
			return "limit";
		case "market":
			return "market";
		case "stop":
			return "stop";
		case "stop_limit":
		case "stoplimit":
			return "stop_limit";
		default:
			return "limit";
	}
}

function mapOrderStatusToStatus(status: string | undefined): Order["status"] {
	switch (status?.toLowerCase()) {
		case "closed":
		case "filled":
			return "filled";
		case "canceled":
		case "cancelled":
			return "canceled";
		case "rejected":
			return "rejected";
		case "open":
		case "new":
			return "open";
		case "partially_filled":
			return "partial";
		default:
			return "open";
	}
}

function mapOrderStatus(status: string | undefined): Order["ordStatus"] {
	switch (status?.toLowerCase()) {
		case "closed":
		case "filled":
			return "Filled";
		case "canceled":
		case "cancelled":
			return "Canceled";
		case "rejected":
			return "Rejected";
		case "open":
		case "new":
			return "New";
		case "partially_filled":
			return "PartiallyFilled";
		default:
			return "New";
	}
}

// Export current credentials check
export function hasCredentials(): boolean {
	return currentCredentials !== null && exchangeClient !== null;
}

export function getCredentials(): ExchangeCredentials | null {
	return currentCredentials;
}
