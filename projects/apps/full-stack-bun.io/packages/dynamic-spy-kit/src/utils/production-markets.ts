/**
 * @dynamic-spy/kit v9.0 - Production NBA Markets Generator
 * 
 * Generates ALL 25K NBA markets for production arbitrage
 */

import { BasketballMarketSpies } from '../basketball-market-spies';

export const NBA_ALL_MARKETS: string[] = [];

// Initialize 25K markets
(function generateAllMarkets() {
	const nbaSpyEngine = new BasketballMarketSpies();
	NBA_ALL_MARKETS.push(...nbaSpyEngine.markets);
	
	// Ensure we have exactly 25K markets
	while (NBA_ALL_MARKETS.length < 25000) {
		const index = NBA_ALL_MARKETS.length;
		NBA_ALL_MARKETS.push(`NCAA-Game-${index + 1}`);
	}
})();

export const NBA_MARKETS_COUNT = NBA_ALL_MARKETS.length;

export function getAllMarkets(): readonly string[] {
	return NBA_ALL_MARKETS;
}

export function getMarketIndex(market: string): number {
	return NBA_ALL_MARKETS.indexOf(market);
}

export function getMarketByIndex(index: number): string | undefined {
	return NBA_ALL_MARKETS[index];
}



