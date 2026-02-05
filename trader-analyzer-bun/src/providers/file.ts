import type { Order, Result, Trade, WalletTransaction } from "../types";
import { err, ok } from "../types";
import { BaseProvider, safeAsync } from "./base";

interface FileConfig {
	tradesPath?: string;
	ordersPath?: string;
	walletPath?: string;
}

/**
 * File-based provider for importing CSV/JSON trade data
 * Supports common export formats from various exchanges
 */
export class FileProvider extends BaseProvider {
	name = "file";
	private config: FileConfig;
	private trades: Trade[] = [];
	private orders: Order[] = [];
	private wallet: WalletTransaction[] = [];

	constructor(config: FileConfig) {
		super();
		this.config = config;
	}

	async connect(): Promise<Result<void>> {
		return safeAsync(async () => {
			// Load trades if path provided
			if (this.config.tradesPath) {
				const result = await this.loadTradesFile(this.config.tradesPath);
				if (!result.ok) throw new Error(result.error.message);
				this.trades = result.data;
			}

			// Load orders if path provided
			if (this.config.ordersPath) {
				const result = await this.loadOrdersFile(this.config.ordersPath);
				if (!result.ok) throw new Error(result.error.message);
				this.orders = result.data;
			}

			// Load wallet if path provided
			if (this.config.walletPath) {
				const result = await this.loadWalletFile(this.config.walletPath);
				if (!result.ok) throw new Error(result.error.message);
				this.wallet = result.data;
			}

			this.connected = true;
		}, "Failed to load files");
	}

	async fetchTrades(): Promise<Result<Trade[]>> {
		return ok(this.trades);
	}

	async fetchAllTrades(): Promise<Result<Trade[]>> {
		return ok(this.trades);
	}

	async fetchOrders(): Promise<Result<Order[]>> {
		return ok(this.orders);
	}

	getWallet(): WalletTransaction[] {
		return this.wallet;
	}

	// ============ File Loading ============

	private async loadTradesFile(path: string): Promise<Result<Trade[]>> {
		return safeAsync(async () => {
			const file = Bun.file(path);
			if (!(await file.exists())) {
				throw new Error(`File not found: ${path}`);
			}

			const ext = path.split(".").pop()?.toLowerCase();

			if (ext === "json") {
				return this.parseTradesJSON(await file.json());
			} else if (ext === "csv") {
				return this.parseTradesCSV(await file.text());
			} else {
				throw new Error(`Unsupported file format: ${ext}`);
			}
		}, "Failed to load trades");
	}

	private async loadOrdersFile(path: string): Promise<Result<Order[]>> {
		return safeAsync(async () => {
			const file = Bun.file(path);
			if (!(await file.exists())) {
				throw new Error(`File not found: ${path}`);
			}

			const ext = path.split(".").pop()?.toLowerCase();

			if (ext === "json") {
				return this.parseOrdersJSON(await file.json());
			} else if (ext === "csv") {
				return this.parseOrdersCSV(await file.text());
			} else {
				throw new Error(`Unsupported file format: ${ext}`);
			}
		}, "Failed to load orders");
	}

	private async loadWalletFile(
		path: string,
	): Promise<Result<WalletTransaction[]>> {
		return safeAsync(async () => {
			const file = Bun.file(path);
			if (!(await file.exists())) {
				throw new Error(`File not found: ${path}`);
			}

			const ext = path.split(".").pop()?.toLowerCase();

			if (ext === "json") {
				return this.parseWalletJSON(await file.json());
			} else if (ext === "csv") {
				return this.parseWalletCSV(await file.text());
			} else {
				throw new Error(`Unsupported file format: ${ext}`);
			}
		}, "Failed to load wallet");
	}

	// ============ CSV Parsing ============

	private parseCSV(content: string): Record<string, string>[] {
		const lines = content.trim().split("\n");
		if (lines.length < 2) return [];

		// Parse header
		const headers = this.parseCSVLine(lines[0]);

		// Parse rows
		return lines.slice(1).map((line) => {
			const values = this.parseCSVLine(line);
			const row: Record<string, string> = {};
			headers.forEach((h, i) => {
				row[h.trim()] = values[i]?.trim() || "";
			});
			return row;
		});
	}

	private parseCSVLine(line: string): string[] {
		const result: string[] = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				result.push(current);
				current = "";
			} else {
				current += char;
			}
		}
		result.push(current);
		return result;
	}

	// ============ Trade Parsing ============

	private parseTradesJSON(data: any): Trade[] {
		// Handle array directly or nested structure
		const records = Array.isArray(data) ? data : data.trades || data.data || [];

		return records.map((r: any, i: number) => this.mapToTrade(r, i));
	}

	private parseTradesCSV(content: string): Trade[] {
		const records = this.parseCSV(content);
		return records.map((r, i) => this.mapToTrade(r, i));
	}

	private mapToTrade(r: any, index: number): Trade {
		// Flexible field mapping - supports common exchange formats
		return {
			id: r.id || r.execID || r.tradeId || r.trade_id || `trade-${index}`,
			datetime: this.parseDate(
				r.datetime ||
					r.timestamp ||
					r.time ||
					r.date ||
					r.transactTime ||
					new Date().toISOString(),
			),
			symbol: this.normalizeSymbol(
				r.symbol || r.pair || r.market || r.instrument || "BTC/USD",
			),
			side: this.normalizeSide(r.side || r.type || r.direction || "buy"),
			price: this.parseNumber(
				r.price || r.lastPx || r.avgPrice || r.fill_price || 0,
			),
			amount: this.parseNumber(
				r.amount || r.qty || r.quantity || r.size || r.lastQty || r.filled || 0,
			),
			cost: this.parseNumber(r.cost || r.total || r.value || r.notional || 0),
			fee: this.parseNumber(r.fee || r.commission || r.execComm || r.fees || 0),
			orderID: r.orderID || r.orderId || r.order_id || r.order || undefined,
			ordType: r.ordType || r.orderType || r.type || undefined,
		};
	}

	// ============ Order Parsing ============

	private parseOrdersJSON(data: any): Order[] {
		const records = Array.isArray(data) ? data : data.orders || data.data || [];
		return records.map((r: any, i: number) => this.mapToOrder(r, i));
	}

	private parseOrdersCSV(content: string): Order[] {
		const records = this.parseCSV(content);
		return records.map((r, i) => this.mapToOrder(r, i));
	}

	private mapToOrder(r: any, index: number): Order {
		return {
			orderID: r.orderID || r.orderId || r.order_id || r.id || `order-${index}`,
			symbol: this.normalizeSymbol(r.symbol || r.pair || r.market || "BTC/USD"),
			side: this.normalizeSide(r.side || r.type || "buy"),
			ordType: this.mapOrderType(r.ordType || r.orderType || r.type || "limit"),
			orderQty: this.parseNumber(
				r.orderQty || r.qty || r.quantity || r.amount || r.size || 0,
			),
			price: r.price ? this.parseNumber(r.price) : null,
			avgPx:
				r.avgPx || r.avgPrice ? this.parseNumber(r.avgPx || r.avgPrice) : null,
			cumQty: this.parseNumber(r.cumQty || r.filled || r.filledQty || 0),
			status: this.mapOrderStatus(r.ordStatus || r.status || r.state || "open"),
			timestamp: this.parseDate(
				r.timestamp || r.time || r.datetime || new Date().toISOString(),
			),
		};
	}

	// ============ Wallet Parsing ============

	private parseWalletJSON(data: any): WalletTransaction[] {
		const records = Array.isArray(data)
			? data
			: data.transactions || data.wallet || data.data || [];
		return records.map((r: any, i: number) => this.mapToWalletTx(r, i));
	}

	private parseWalletCSV(content: string): WalletTransaction[] {
		const records = this.parseCSV(content);
		return records.map((r, i) => this.mapToWalletTx(r, i));
	}

	private mapToWalletTx(r: any, index: number): WalletTransaction {
		return {
			id: r.transactID || r.id || r.txId || `tx-${index}`,
			type: this.mapTxType(r.transactType || r.type || r.category || "pnl"),
			amount: this.parseNumber(r.amount || r.value || 0),
			fee: this.parseNumber(r.fee || r.commission || 0),
			timestamp: this.parseDate(
				r.timestamp || r.time || r.datetime || new Date().toISOString(),
			),
			balance: this.parseNumber(r.walletBalance || r.balance || r.total || 0),
			currency: r.currency || r.asset || r.coin || "BTC",
		};
	}

	// ============ Utilities ============

	private parseNumber(value: any): number {
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const cleaned = value.replace(/[,$]/g, "");
			return parseFloat(cleaned) || 0;
		}
		return 0;
	}

	private mapOrderType(type: string): Order["ordType"] {
		const t = type.toLowerCase();
		if (t.includes("market")) return "market";
		if (t.includes("stop") && t.includes("limit")) return "stop_limit";
		if (t.includes("stop")) return "stop";
		return "limit";
	}

	private mapOrderStatus(status: string): Order["status"] {
		const s = status.toLowerCase();
		if (s.includes("fill")) return "filled";
		if (s.includes("cancel")) return "canceled";
		if (s.includes("reject")) return "rejected";
		if (s.includes("partial")) return "partial";
		return "open";
	}

	private mapTxType(type: string): WalletTransaction["type"] {
		const t = type.toLowerCase();
		if (t.includes("pnl") || t.includes("realised") || t.includes("profit"))
			return "pnl";
		if (t.includes("fund")) return "funding";
		if (t.includes("deposit")) return "deposit";
		if (t.includes("withdraw")) return "withdrawal";
		if (t.includes("transfer")) return "transfer";
		if (t.includes("fee") || t.includes("commission")) return "fee";
		return "pnl";
	}
}

// ============ Convenience Functions ============

/**
 * Quick load trades from a file
 */
export async function loadTradesFromFile(
	path: string,
): Promise<Result<Trade[]>> {
	const provider = new FileProvider({ tradesPath: path });
	const connectResult = await provider.connect();
	if (!connectResult.ok) return connectResult;
	return provider.fetchTrades();
}

/**
 * Quick load all data from multiple files
 */
export async function loadDataFromFiles(config: FileConfig): Promise<
	Result<{
		trades: Trade[];
		orders: Order[];
		wallet: WalletTransaction[];
	}>
> {
	const provider = new FileProvider(config);
	const connectResult = await provider.connect();
	if (!connectResult.ok) return err(connectResult.error);

	const tradesResult = await provider.fetchTrades();
	if (!tradesResult.ok) return err(tradesResult.error);

	const ordersResult = await provider.fetchOrders();
	if (!ordersResult.ok) return err(ordersResult.error);

	return ok({
		trades: tradesResult.data,
		orders: ordersResult.data,
		wallet: provider.getWallet(),
	});
}
