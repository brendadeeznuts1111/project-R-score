/**
 * @dynamic-spy/kit v4.1 - Tick Monitor
 * 
 * 100ms resolution tick monitoring for arbitrage opportunities
 */

export interface TickData {
	bid: number;
	ask: number;
	volume: number;
	timestamp: number;
}

export interface LineMovement {
	opening: number;
	current: number;
	movement: number; // percentage
	phase: 'OPENING' | 'BUYBACK' | 'CLOSING';
}

export class TickMonitor {
	private ticks: Map<string, TickData[]> = new Map();

	/**
	 * Monitor a tick for a bookie-market pair
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @param data - Tick data
	 */
	monitorTick(bookie: string, market: string, data: Omit<TickData, 'timestamp'>): void {
		const key = `${bookie}:${market}`;
		const ticks = this.ticks.get(key) || [];

		ticks.push({
			...data,
			timestamp: Date.now()
		});

		// Keep last 10000 ticks per market
		if (ticks.length > 10000) {
			ticks.shift();
		}

		this.ticks.set(key, ticks);
	}

	/**
	 * Get all ticks for a bookie-market pair
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @returns Array of tick data
	 */
	getTicks(bookie: string, market: string): TickData[] {
		const key = `${bookie}:${market}`;
		return this.ticks.get(key) || [];
	}

	/**
	 * Calculate line movement for a market
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @returns Line movement data
	 */
	getLineMovement(bookie: string, market: string): LineMovement {
		const ticks = this.getTicks(bookie, market);
		
		if (ticks.length === 0) {
			return {
				opening: 0,
				current: 0,
				movement: 0,
				phase: 'OPENING'
			};
		}

		const opening = ticks[0].bid;
		const current = ticks[ticks.length - 1].bid;
		const movement = ((current - opening) / opening) * 100;

		// Determine phase based on movement
		let phase: LineMovement['phase'] = 'OPENING';
		if (ticks.length < 100) {
			phase = 'OPENING';
		} else if (movement > 2) {
			phase = 'BUYBACK';
		} else if (movement < -1) {
			phase = 'CLOSING';
		}

		return {
			opening,
			current,
			movement,
			phase
		};
	}

	/**
	 * Clear ticks for a market
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 */
	clearTicks(bookie: string, market: string): void {
		const key = `${bookie}:${market}`;
		this.ticks.delete(key);
	}

	/**
	 * Get total tick count
	 * 
	 * @returns Total number of ticks across all markets
	 */
	getTotalTickCount(): number {
		let total = 0;
		for (const ticks of this.ticks.values()) {
			total += ticks.length;
		}
		return total;
	}
}



