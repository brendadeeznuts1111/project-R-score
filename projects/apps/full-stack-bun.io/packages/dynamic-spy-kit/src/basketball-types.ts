/**
 * @dynamic-spy/kit v9.0 - Production Basketball Types
 * 
 * TypeScript perfection for basketball markets
 */

import type { Loader, BasketballMarket, BunLockFile } from './types/bun-types';

/**
 * Basketball Market Configuration
 */
export interface BasketballMarketConfig {
	league: Loader;           // ✅ jsonc support!
	odds: Record<string, number>;
	css?: string;             // ✅ CSS loader!
	format: 'json' | 'jsonc' | 'yaml';
}

/**
 * Basketball Market Data
 */
export interface BasketballMarketData extends BasketballMarket {
	config: BasketballMarketConfig;
	lockfile?: BunLockFile;
}

/**
 * Production Basketball Market
 */
export class ProductionBasketballMarket implements BasketballMarketData {
	market: string;
	odds: { home: number; away: number };
	timestamp: number;
	config: BasketballMarketConfig;
	lockfile?: BunLockFile;

	constructor(market: string, odds: { home: number; away: number }) {
		this.market = market;
		this.odds = odds;
		this.timestamp = Date.now();
		this.config = {
			league: 'jsonc',  // ✅ jsonc loader
			odds: { home: odds.home, away: odds.away },
			format: 'jsonc'
		};
		this.lockfile = {
			configVersion: 1,  // ✅ Documented!
			modules: {}
		};
	}

	/**
	 * Get market as JSONC
	 */
	toJSONC(): string {
		return JSON.stringify(this, null, 2);
	}

	/**
	 * Get market CSS (if configured)
	 */
	getCSS(): string {
		return this.config.css || '';
	}
}

/**
 * Lockfile helper with documented configVersion
 */
export function createLockfile(modules?: Record<string, any>): BunLockFile {
	return {
		configVersion: 1,  // ✅ Documented - increment when breaking changes
		modules: modules || {}
	};
}

/**
 * Loader type guard
 */
export function isValidLoader(loader: string): loader is Loader {
	const validLoaders: Loader[] = [
		'js', 'jsx', 'ts', 'tsx',
		'json', 'jsonc',
		'css',
		'yaml', 'yml',
		'html',
		'file', 'text', 'napi'
	];
	return validLoaders.includes(loader as Loader);
}



