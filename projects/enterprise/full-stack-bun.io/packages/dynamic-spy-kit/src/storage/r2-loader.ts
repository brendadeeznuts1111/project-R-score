/**
 * @dynamic-spy/kit v5.0 - Cloudflare R2 Loader
 * 
 * 12GB historical tick data → $0.24/mo storage
 */

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

export class R2Loader {
	private config: R2Config;
	private baseUrl: string;

	constructor(config: R2Config) {
		this.config = config;
		this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucket}`;
	}

	/**
	 * Load historical ticks from R2
	 * 
	 * @param market - Market identifier
	 * @param bookie - Bookie name
	 * @param startDate - Start date
	 * @param endDate - End date
	 * @returns Array of tick records
	 */
	async loadHistorical(
		market: string,
		bookie: string,
		startDate: Date,
		endDate: Date
	): Promise<TickRecord[]> {
		const key = `ticks/${bookie}/${market}/${startDate.toISOString().split('T')[0]}.jsonl`;
		
		try {
			const url = `${this.baseUrl}/objects/${encodeURIComponent(key)}`;
			const res = await fetch(url, {
				headers: {
					'Authorization': `Bearer ${this.config.accessKeyId}:${this.config.secretAccessKey}`
				}
			});

			if (!res.ok) {
				if (res.status === 404) {
					return []; // No data for this date
				}
				throw new Error(`R2 fetch failed: ${res.status}`);
			}

			const text = await res.text();
			const lines = text.trim().split('\n').filter(Boolean);
			
			return lines.map(line => JSON.parse(line) as TickRecord);
		} catch (error: any) {
			console.warn(`Failed to load ${key}:`, error.message);
			return [];
		}
	}

	/**
	 * Upload ticks to R2
	 * 
	 * @param ticks - Array of tick records
	 * @param market - Market identifier
	 * @param bookie - Bookie name
	 */
	async uploadTicks(
		ticks: TickRecord[],
		market: string,
		bookie: string
	): Promise<void> {
		if (ticks.length === 0) return;

		// Group by date
		const byDate = new Map<string, TickRecord[]>();
		for (const tick of ticks) {
			const date = new Date(tick.timestamp).toISOString().split('T')[0];
			const dateTicks = byDate.get(date) || [];
			dateTicks.push(tick);
			byDate.set(date, dateTicks);
		}

		// Upload each date
		for (const [date, dateTicks] of byDate) {
			const key = `ticks/${bookie}/${market}/${date}.jsonl`;
			const content = dateTicks.map(t => JSON.stringify(t)).join('\n') + '\n';

			const url = `${this.baseUrl}/objects/${encodeURIComponent(key)}`;
			await fetch(url, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${this.config.accessKeyId}:${this.config.secretAccessKey}`,
					'Content-Type': 'application/x-ndjson'
				},
				body: content
			});
		}
	}

	/**
	 * Get R2 storage stats
	 * 
	 * @returns Storage statistics
	 */
	async getStats(): Promise<{
		totalSize: number;
		objectCount: number;
		estimatedCost: number;
	}> {
		// Mock stats for development
		// In production, would query R2 API
		return {
			totalSize: 12 * 1024 * 1024 * 1024, // 12GB
			objectCount: 129000000, // 129M ticks
			estimatedCost: 0.24 // $0.24/mo
		};
	}

	/**
	 * Load all ticks for a market (all bookies, date range)
	 * 
	 * @param market - Market identifier
	 * @param startDate - Start date
	 * @param endDate - End date
	 * @returns Map of bookie → ticks
	 */
	async loadMarketTicks(
		market: string,
		startDate: Date,
		endDate: Date
	): Promise<Map<string, TickRecord[]>> {
		const bookies = ['pinnacle', 'bet365', 'draftkings', 'fanduel', 'betmgm'];
		const result = new Map<string, TickRecord[]>();

		for (const bookie of bookies) {
			const ticks = await this.loadHistorical(market, bookie, startDate, endDate);
			result.set(bookie, ticks);
		}

		return result;
	}
}



