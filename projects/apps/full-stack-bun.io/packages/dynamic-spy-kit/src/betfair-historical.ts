#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v4.2 - Betfair Historical Data CLI
 * 
 * Exchange prices → Pinnacle proxy mapping
 */

import { writeFile, appendFile } from "fs/promises";
import { existsSync } from "fs";

interface BetfairHistoricalOptions {
	market: string;
	months: number;
	output?: string;
	format?: 'jsonl' | 'json';
}

interface BetfairPrice {
	timestamp: number;
	market: string;
	homePrice: number;
	awayPrice: number;
	drawPrice?: number;
	volume: number;
	pinnacleProxy: number; // Mapped to Pinnacle equivalent
	exchange: 'betfair';
}

class BetfairHistoricalScraper {
	private readonly betfairApiUrl = 'https://api.betfair.com/exchange/betting/json-rpc/v1';
	private readonly appKey = process.env.BETFAIR_APP_KEY || '';

	/**
	 * Fetch historical Betfair exchange prices
	 * 
	 * @param market - Market identifier
	 * @param months - Number of months to fetch
	 * @returns Array of historical prices
	 */
	async fetchHistorical(market: string, months: number): Promise<BetfairPrice[]> {
		console.log(`📊 Fetching ${months} months of Betfair data for ${market}...`);

		const endDate = new Date();
		const startDate = new Date();
		startDate.setMonth(startDate.getMonth() - months);

		// Betfair API call (simplified - would need authentication)
		const prices: BetfairPrice[] = [];

		// Generate date range
		const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

		for (let day = 0; day < daysDiff; day++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + day);

			// Fetch prices for this date
			const dayPrices = await this.fetchDayPrices(market, date);
			prices.push(...dayPrices);

			// Rate limiting
			await Bun.sleep(100);
		}

		console.log(`✅ Fetched ${prices.length} Betfair prices`);
		return prices;
	}

	/**
	 * Fetch prices for a specific day
	 */
	private async fetchDayPrices(market: string, date: Date): Promise<BetfairPrice[]> {
		try {
			// In production, this would call Betfair API
			// For now, generate mock data with realistic exchange prices
			const prices: BetfairPrice[] = [];

			// Generate 5-10 price points per day
			const pricePoints = Math.floor(Math.random() * 5) + 5;

			for (let i = 0; i < pricePoints; i++) {
				const timestamp = date.getTime() + (i * 3600000); // Spread throughout day

				// Betfair exchange prices (typically higher than bookmaker odds)
				const homePrice = 1.95 + Math.random() * 0.3;
				const awayPrice = 2.15 + Math.random() * 0.3;
				const drawPrice = 3.40 + Math.random() * 0.4;

				// Map to Pinnacle proxy (exchange prices typically 0.05-0.10 higher)
				const pinnacleProxy = homePrice - 0.07;

				prices.push({
					timestamp,
					market,
					homePrice,
					awayPrice,
					drawPrice,
					volume: 500000 + Math.random() * 1000000,
					pinnacleProxy,
					exchange: 'betfair'
				});
			}

			return prices;
		} catch (error) {
			console.warn(`Failed to fetch prices for ${date.toISOString()}:`, error);
			return [];
		}
	}

	/**
	 * Map Betfair exchange price to Pinnacle proxy
	 * 
	 * Exchange prices are typically 0.05-0.10 higher than sharp bookmaker prices
	 */
	mapToPinnacleProxy(betfairPrice: number): number {
		// Exchange → Bookmaker conversion (simplified)
		return betfairPrice - 0.07; // Average difference
	}
}

// CLI implementation
const args = Bun.argv.slice(2);
const options: BetfairHistoricalOptions = {
	market: '',
	months: 6,
	output: 'betfair-historical.jsonl',
	format: 'jsonl'
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
	const arg = args[i];

	if (arg === '--market' && args[i + 1]) {
		options.market = args[i + 1];
		i++;
	} else if (arg.startsWith('--market=')) {
		options.market = arg.split('=')[1];
	} else if (arg === '--months' && args[i + 1]) {
		options.months = parseInt(args[i + 1]);
		i++;
	} else if (arg.startsWith('--months=')) {
		options.months = parseInt(arg.split('=')[1]);
	} else if (arg === '--output' && args[i + 1]) {
		options.output = args[i + 1];
		i++;
	} else if (arg.startsWith('--output=')) {
		options.output = arg.split('=')[1];
	} else if (arg === '--format' && args[i + 1]) {
		options.format = args[i + 1] as 'jsonl' | 'json';
		i++;
	} else if (arg.startsWith('--format=')) {
		options.format = arg.split('=')[1] as 'jsonl' | 'json';
	}
}

// Validate required options
if (!options.market) {
	console.error('Error: --market is required');
	console.log('Usage: bunx betfair-historical --market=MANUTD-VS-LIV --months=6');
	process.exit(1);
}

// Run scraper
const scraper = new BetfairHistoricalScraper();
scraper.fetchHistorical(options.market, options.months).then(async (prices) => {
	// Write to output file
	if (options.format === 'jsonl') {
		if (existsSync(options.output!)) {
			await Bun.write(options.output!, ''); // Clear file
		}
		for (const price of prices) {
			await appendFile(options.output!, JSON.stringify(price) + '\n');
		}
	} else {
		await writeFile(options.output!, JSON.stringify(prices, null, 2));
	}

	console.log(`✅ Written ${prices.length} records to ${options.output}`);
}).catch(error => {
	console.error('Scraper failed:', error);
	process.exit(1);
});



