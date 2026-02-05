/**
 * @dynamic-spy/kit v4.2 - Asia Spike Detector
 * 
 * Pre-Pinnacle signal detection from Asia bookies
 */

import { TickDataExtended } from "./model-reverse";
import { WinningPlay } from "./model-reverse";

export interface SpikeSignal {
	bookie: string;
	spikeTime: number;
	volume: number;
	lineBeforePlay: { home: number; away: number };
	leadTime: string;
	confidence: number;
}

export class AsiaSpikeDetector {
	private ticks: Map<string, TickDataExtended[]>;
	private avgVolume: number = 1000000;

	constructor(ticks: Map<string, TickDataExtended[]>) {
		this.ticks = ticks;
		this.calculateAvgVolume();
	}

	/**
	 * Calculate average volume across all ticks
	 */
	private calculateAvgVolume(): void {
		let total = 0;
		let count = 0;

		this.ticks.forEach(ticks => {
			ticks.forEach(tick => {
				total += tick.volume;
				count++;
			});
		});

		if (count > 0) {
			this.avgVolume = total / count;
		}
	}

	/**
	 * Detect pre-Pinnacle signals from Asia bookies
	 * 
	 * @param play - Winning play to analyze
	 * @returns Array of spike signals from Asia bookies
	 */
	detectPrePinnacleSignals(play: WinningPlay): SpikeSignal[] {
		const asiaTicks = this.getAsiaTicks(play.market);

		// Calculate market-specific average volume
		const marketAvgVolume = this.getMarketAvgVolume(play.market);
		const threshold = marketAvgVolume * 3.2;

		return asiaTicks
			.filter(tick =>
				tick.region === 'ASIA' &&
				tick.timestamp < play.timestamp && // Before Pinnacle play
				tick.volume > threshold // 3.2x spike
			)
			.map(tick => ({
				bookie: tick.bookie, // SBOBET, Fonbet
				spikeTime: tick.timestamp,
				volume: tick.volume,
				lineBeforePlay: tick.currentLine,
				leadTime: `${Math.floor((play.timestamp - tick.timestamp) / 1000)}s`,
				confidence: this.spikeConfidence(tick)
			}))
			.sort((a, b) => a.spikeTime - b.spikeTime); // Earliest first
	}

	/**
	 * Get Asia ticks for a market
	 */
	private getAsiaTicks(market: string): TickDataExtended[] {
		const asiaTicks: TickDataExtended[] = [];

		this.ticks.forEach((ticks, key) => {
			ticks.forEach(tick => {
				if (tick.market === market && tick.region === 'ASIA') {
					asiaTicks.push(tick);
				}
			});
		});

		return asiaTicks;
	}

	/**
	 * Get market-specific average volume
	 */
	private getMarketAvgVolume(market: string): number {
		const marketTicks: TickDataExtended[] = [];
		this.ticks.forEach(ticks => {
			ticks.forEach(tick => {
				if (tick.market === market) {
					marketTicks.push(tick);
				}
			});
		});

		if (marketTicks.length === 0) return this.avgVolume;

		const total = marketTicks.reduce((sum, t) => sum + t.volume, 0);
		return total / marketTicks.length;
	}

	/**
	 * Calculate spike confidence
	 */
	private spikeConfidence(tick: TickDataExtended): number {
		const marketAvg = this.getMarketAvgVolume(tick.market);
		const volumeRatio = tick.volume / marketAvg;
		
		// Higher volume spike = higher confidence
		if (volumeRatio > 4) return 0.95;
		if (volumeRatio > 3.5) return 0.90;
		if (volumeRatio > 3.2) return 0.87;
		return 0.75;
	}
}

