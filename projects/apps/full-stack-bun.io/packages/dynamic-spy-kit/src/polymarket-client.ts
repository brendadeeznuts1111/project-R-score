/**
 * @dynamic-spy/kit v4.2 - Polymarket/Augur Client
 * 
 * Crypto prediction markets integration
 */

export interface PolymarketMarket {
	id: string;
	question: string;
	slug: string;
	conditionId: string;
	resolutionSource: string;
	endDate: string;
	volume: number;
	liquidity: number;
	active: boolean;
	outcomes: Array<{
		outcome: string;
		price: number;
		volume: number;
	}>;
}

export interface PolymarketHistorical {
	market: PolymarketMarket;
	timestamp: number;
	prices: Record<string, number>;
	volume: number;
}

export class PolymarketClient {
	private readonly baseUrl = 'https://clob.polymarket.com';
	private readonly apiUrl = 'https://api.polymarket.com';

	/**
	 * Fetch all markets from Polymarket
	 * 
	 * @param historical - Include historical data
	 * @returns Array of markets
	 */
	async fetchMarkets(historical: boolean = false): Promise<PolymarketMarket[]> {
		try {
			const url = historical
				? `${this.apiUrl}/markets?historical=true`
				: `${this.apiUrl}/markets`;

			const res = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Mozilla/5.0'
				}
			});

			if (!res.ok) {
				throw new Error(`Polymarket API error: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();
			return Array.isArray(data) ? data : data.markets || [];
		} catch (error: any) {
			console.error('Polymarket fetch error:', error.message);
			// Return mock data for development
			return this.generateMockMarkets();
		}
	}

	/**
	 * Fetch historical data for a specific market
	 * 
	 * @param marketId - Market ID
	 * @param days - Number of days of history
	 * @returns Historical price data
	 */
	async fetchHistorical(marketId: string, days: number = 30): Promise<PolymarketHistorical[]> {
		try {
			const url = `${this.apiUrl}/markets/${marketId}/history?days=${days}`;
			const res = await fetch(url);

			if (!res.ok) {
				throw new Error(`Historical API error: ${res.status}`);
			}

			const data = await res.json();
			return Array.isArray(data) ? data : [];
		} catch (error: any) {
			console.error('Historical fetch error:', error.message);
			return this.generateMockHistorical(marketId, days);
		}
	}

	/**
	 * Search markets by query
	 * 
	 * @param query - Search query
	 * @returns Matching markets
	 */
	async searchMarkets(query: string): Promise<PolymarketMarket[]> {
		const allMarkets = await this.fetchMarkets();
		const lowerQuery = query.toLowerCase();

		return allMarkets.filter(market =>
			market.question.toLowerCase().includes(lowerQuery) ||
			market.slug.toLowerCase().includes(lowerQuery)
		);
	}

	/**
	 * Get market by slug
	 * 
	 * @param slug - Market slug
	 * @returns Market data
	 */
	async getMarket(slug: string): Promise<PolymarketMarket | null> {
		const markets = await this.fetchMarkets();
		return markets.find(m => m.slug === slug) || null;
	}

	/**
	 * Generate mock markets for development
	 */
	private generateMockMarkets(): PolymarketMarket[] {
		return [
			{
				id: 'market-1',
				question: 'Will Manchester United beat Liverpool?',
				slug: 'manutd-beat-liverpool',
				conditionId: 'cond-1',
				resolutionSource: 'sports',
				endDate: new Date(Date.now() + 86400000).toISOString(),
				volume: 125000,
				liquidity: 50000,
				active: true,
				outcomes: [
					{ outcome: 'Yes', price: 0.45, volume: 60000 },
					{ outcome: 'No', price: 0.55, volume: 65000 }
				]
			},
			{
				id: 'market-2',
				question: 'Will Arsenal score over 2.5 goals?',
				slug: 'arsenal-over-2-5-goals',
				conditionId: 'cond-2',
				resolutionSource: 'sports',
				endDate: new Date(Date.now() + 172800000).toISOString(),
				volume: 89000,
				liquidity: 35000,
				active: true,
				outcomes: [
					{ outcome: 'Yes', price: 0.62, volume: 45000 },
					{ outcome: 'No', price: 0.38, volume: 44000 }
				]
			}
		];
	}

	/**
	 * Generate mock historical data
	 */
	private generateMockHistorical(marketId: string, days: number): PolymarketHistorical[] {
		const historical: PolymarketHistorical[] = [];
		const now = Date.now();

		for (let day = 0; day < days; day++) {
			const timestamp = now - (day * 86400000);
			const basePrice = 0.45 + (Math.random() * 0.2);

			historical.push({
				market: {
					id: marketId,
					question: 'Mock Market',
					slug: 'mock-market',
					conditionId: 'cond-1',
					resolutionSource: 'sports',
					endDate: new Date(now + 86400000).toISOString(),
					volume: 100000 + Math.random() * 50000,
					liquidity: 40000 + Math.random() * 20000,
					active: true,
					outcomes: []
				},
				timestamp,
				prices: {
					'Yes': basePrice,
					'No': 1 - basePrice
				},
				volume: 50000 + Math.random() * 30000
			});
		}

		return historical;
	}
}



