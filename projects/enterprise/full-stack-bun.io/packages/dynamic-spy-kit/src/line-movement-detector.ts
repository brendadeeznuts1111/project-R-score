/**
 * @dynamic-spy/kit v4.1 - Line Movement Detector
 * 
 * Detects opening→buyback→closing patterns across regions
 */

import { LineMovement } from "./tick-monitor";

export interface MovementDetection {
	bookie: string;
	market: string;
	phase: 'OPENING' | 'BUYBACK' | 'CLOSING';
	movement: string; // percentage as string
	timestamp: number;
}

export class LineMovementDetector {
	private movements: Map<string, MovementDetection[]> = new Map();
	private openingPrices: Map<string, number> = new Map();

	/**
	 * Detect line movement for a bookie-market pair
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @param odds - Current odds (e.g., { home: 1.95 })
	 * @returns Movement detection result
	 */
	detectMovement(bookie: string, market: string, odds: { home: number }): MovementDetection {
		const key = `${bookie}:${market}`;
		const currentPrice = odds.home;

		// Get or set opening price
		if (!this.openingPrices.has(key)) {
			this.openingPrices.set(key, currentPrice);
		}

		const openingPrice = this.openingPrices.get(key)!;
		const movement = ((currentPrice - openingPrice) / openingPrice) * 100;

		// Determine phase
		let phase: MovementDetection['phase'] = 'OPENING';
		const movements = this.movements.get(key) || [];
		
		if (movements.length === 0) {
			phase = 'OPENING';
		} else if (movement > 2) {
			phase = 'BUYBACK';
		} else if (movement < -1) {
			phase = 'CLOSING';
		}

		const detection: MovementDetection = {
			bookie,
			market,
			phase,
			movement: `${movement.toFixed(2)}%`,
			timestamp: Date.now()
		};

		// Store movement
		movements.push(detection);
		if (movements.length > 1000) {
			movements.shift();
		}
		this.movements.set(key, movements);

		return detection;
	}

	/**
	 * Get movement history for a market
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @returns Array of movement detections
	 */
	getMovementHistory(bookie: string, market: string): MovementDetection[] {
		const key = `${bookie}:${market}`;
		return this.movements.get(key) || [];
	}

	/**
	 * Compare movements across bookies (sharp action detection)
	 * 
	 * @param market - Market identifier
	 * @param bookies - Array of bookie names
	 * @returns Comparison result
	 */
	compareMovements(market: string, bookies: string[]): {
		sharp: string | null;
		laggards: string[];
		movementDiff: number;
	} {
		const movements = bookies.map(bookie => {
			const history = this.getMovementHistory(bookie, market);
			const latest = history[history.length - 1];
			return {
				bookie,
				movement: latest ? parseFloat(latest.movement) : 0
			};
		});

		// Find sharp (moves first/strongest)
		const sorted = [...movements].sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));
		const sharp = sorted[0];
		const laggards = sorted.slice(1).map(m => m.bookie);

		return {
			sharp: sharp.bookie,
			laggards,
			movementDiff: Math.abs(sharp.movement) - Math.abs(sorted[sorted.length - 1]?.movement || 0)
		};
	}
}



