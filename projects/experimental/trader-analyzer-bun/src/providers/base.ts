import type {
	Candle,
	DataProvider,
	Order,
	Result,
	Timeframe,
	Trade,
} from "../types";
import { err, ok } from "../types";

/**
 * Base class for data providers with common utilities
 */
export abstract class BaseProvider implements DataProvider {
	abstract name: string;
	protected connected = false;

	abstract connect(): Promise<Result<void>>;

	async disconnect(): Promise<void> {
		this.connected = false;
	}

	isConnected(): boolean {
		return this.connected;
	}

	abstract fetchTrades(
		symbol?: string,
		since?: number,
		limit?: number,
	): Promise<Result<Trade[]>>;

	abstract fetchAllTrades(
		symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>>;

	// Optional methods - default implementations return empty
	async fetchOrders(
		symbol?: string,
		since?: number,
		limit?: number,
	): Promise<Result<Order[]>> {
		return ok([]);
	}

	async fetchOHLCV(
		symbol: string,
		timeframe: Timeframe,
		since?: number,
		limit?: number,
	): Promise<Result<Candle[]>> {
		return ok([]);
	}

	async fetchBalance(): Promise<
		Result<{ total: number; available: number; currency: string }>
	> {
		return ok({ total: 0, available: 0, currency: "BTC" });
	}

	// Utility: normalize symbol across exchanges
	protected normalizeSymbol(symbol: string): string {
		return symbol
			.toUpperCase()
			.replace("XBT", "BTC")
			.replace(/[/:_-]/g, "")
			.replace("PERP", "")
			.replace("USD", "/USD")
			.replace("USDT", "/USDT");
	}

	// Utility: normalize side
	protected normalizeSide(side: string): "buy" | "sell" {
		const s = side.toLowerCase();
		return s === "buy" || s === "long" ? "buy" : "sell";
	}

	// Utility: parse flexible date formats
	protected parseDate(dateStr: string | number): string {
		if (typeof dateStr === "number") {
			return new Date(dateStr).toISOString();
		}
		// Try parsing as-is first
		const date = new Date(dateStr);
		if (!isNaN(date.getTime())) {
			return date.toISOString();
		}
		// Fallback: return as-is if it looks like ISO
		return dateStr;
	}
}

/**
 * Wrap async operations with error handling
 */
export async function safeAsync<T>(
	fn: () => Promise<T>,
	errorPrefix = "Operation failed",
): Promise<Result<T>> {
	try {
		const data = await fn();
		return ok(data);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return err(new Error(`${errorPrefix}: ${message}`));
	}
}
