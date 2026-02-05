/**
 * @dynamic-spy/kit v3.3 - Bun-Native Streamer
 * 
 * Stream markets from private registry CLI using Bun.spawn
 */

import { spawn } from "bun";
import { SportsCache } from "./cache-layer";

export class BunStreamer {
	private cache: SportsCache;
	private stats = {
		marketsStreamed: 0,
		startTime: Date.now()
	};

	constructor(cache?: SportsCache) {
		this.cache = cache || new SportsCache();
	}

	/**
	 * Stream all markets from private registry CLI
	 */
	async streamAllMarkets(): Promise<void> {
		console.log('🌊 Starting market stream from private registry...');

		// Bun spawn → private registry CLI → streaming JSON
		const proc = spawn([
			'bunx', '@yourorg/sports-data',
			'stream', '--format', 'ndjson'
		], {
			stdout: 'pipe',
			stderr: 'pipe'
		});

		// Stream line-by-line (NDJSON)
		const reader = proc.stdout.getReader();
		let buffer = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += new TextDecoder().decode(value);
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.trim()) {
						try {
							const market = JSON.parse(line);
							await this.processMarket(market);
							this.stats.marketsStreamed++;
						} catch (error) {
							console.error('Error parsing market line:', error);
						}
					}
				}
			}
		} catch (error) {
			console.error('Streaming error:', error);
		} finally {
			reader.releaseLock();
		}

		const duration = (Date.now() - this.stats.startTime) / 1000;
		console.log(`✅ Streamed ${this.stats.marketsStreamed} markets in ${duration.toFixed(1)}s`);
	}

	/**
	 * Process a single market from stream
	 */
	private async processMarket(market: any) {
		const { sport, league, market: marketName, odds } = market;

		if (sport && league && marketName) {
			await this.cache.cacheOdds(sport, league, marketName, {
				bookies: odds?.bookies || [],
				odds_data: odds || {}
			});
		}
	}

	/**
	 * Stream specific sport
	 */
	async streamSport(sport: string): Promise<void> {
		const proc = spawn([
			'bunx', '@yourorg/sports-data',
			'stream', '--sport', sport, '--format', 'ndjson'
		], {
			stdout: 'pipe',
			stderr: 'pipe'
		});

		const reader = proc.stdout.getReader();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += new TextDecoder().decode(value);
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				if (line.trim()) {
					try {
						const market = JSON.parse(line);
						await this.processMarket(market);
					} catch (error) {
						console.error('Error parsing market:', error);
					}
				}
			}
		}
	}

	/**
	 * Get streaming statistics
	 */
	getStats() {
		const duration = (Date.now() - this.stats.startTime) / 1000;
		return {
			marketsStreamed: this.stats.marketsStreamed,
			duration: duration.toFixed(1) + 's',
			marketsPerSec: duration > 0 ? (this.stats.marketsStreamed / duration).toFixed(1) : '0'
		};
	}
}



