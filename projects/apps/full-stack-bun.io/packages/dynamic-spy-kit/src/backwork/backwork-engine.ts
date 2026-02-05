/**
 * @dynamic-spy/kit v4.2 - Backwork Engine
 * 
 * Full reverse engineering pipeline for winning models
 */

import { ModelReverseEngineer, WinningPlay, FuzzyMatch, TickDataExtended } from "./fuzzy-matcher";
import { AsiaSpikeDetector, SpikeSignal } from "./asia-spike";

export interface PatternAnalysis {
	edge: string;
	leadTime: string;
	successRate: number;
	replicationScore: number;
}

export interface ModelFingerprint {
	edge: string;
	leadTime: string;
	successRate: string;
	replicationScore: number;
	signals: string[];
}

export interface BackworkResult {
	winningPlay: WinningPlay;
	topMatch: FuzzyMatch | null;
	asiaSignals: SpikeSignal[];
	patterns: PatternAnalysis;
	modelFingerprint: ModelFingerprint;
}

export class BackworkEngine {
	private modelReverse: ModelReverseEngineer;
	private asiaDetector: AsiaSpikeDetector;

	constructor(ticks: Map<string, TickDataExtended[]>) {
		this.modelReverse = new ModelReverseEngineer(ticks);
		this.asiaDetector = new AsiaSpikeDetector(ticks);
	}

	/**
	 * Reverse engineer a winning play
	 * 
	 * @param winningPlay - Winning play to analyze
	 * @returns Complete backwork analysis
	 */
	async reverseEngineer(winningPlay: WinningPlay): Promise<BackworkResult> {
		console.log('🔍 BACKWORKING WINNING PLAY:\n%j', winningPlay);

		// 1. Fuzzy search tick data
		const matches = this.modelReverse.fuzzySearchWinningPlay(winningPlay);
		const topMatch = matches.length > 0 ? matches[0] : null;

		// 2. Asia spike detection
		const asiaSignals = this.asiaDetector.detectPrePinnacleSignals(winningPlay);

		// 3. Pattern analysis
		const patterns = this.analyzePatterns(matches, asiaSignals, winningPlay);

		// 4. Model reconstruction
		const modelFingerprint = this.buildModelFingerprint(patterns, asiaSignals, topMatch);

		console.log('🎯 MODEL FINGERPRINT:\n%j', modelFingerprint);

		return {
			winningPlay,
			topMatch,
			asiaSignals,
			patterns,
			modelFingerprint
		};
	}

	/**
	 * Analyze patterns from matches and signals
	 */
	private analyzePatterns(
		matches: FuzzyMatch[],
		asiaSignals: SpikeSignal[],
		play: WinningPlay
	): PatternAnalysis {
		const topMatch = matches.length > 0 ? matches[0] : null;
		
		// Calculate average lead time from Asia signals
		let avgLeadTime = 0;
		if (asiaSignals.length > 0) {
			const leadTimes = asiaSignals.map(s => {
				const match = s.leadTime.match(/(\d+)s/);
				return match ? parseInt(match[1]) : 0;
			});
			avgLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
		}

		// Determine edge pattern
		let edge = 'Unknown pattern';
		if (asiaSignals.length > 0 && topMatch) {
			edge = `Asia volume spikes → ${topMatch.bookie} sharp action`;
		} else if (topMatch) {
			edge = `${topMatch.bookie} ${topMatch.pattern}`;
		}

		// Calculate success rate (simplified - would use historical data)
		const successRate = topMatch && topMatch.confidence > 0.9 ? 0.92 : 0.75;

		// Calculate replication score
		const replicationScore = this.calculateReplicationScore(matches, asiaSignals, topMatch);

		return {
			edge,
			leadTime: `${Math.floor(avgLeadTime / 60)}m${Math.floor(avgLeadTime % 60)}s`,
			successRate,
			replicationScore
		};
	}

	/**
	 * Build model fingerprint
	 */
	private buildModelFingerprint(
		patterns: PatternAnalysis,
		asiaSignals: SpikeSignal[],
		topMatch: FuzzyMatch | null
	): ModelFingerprint {
		const signals: string[] = [];

		if (asiaSignals.length > 0) {
			signals.push(`Bet Asia spikes ${asiaSignals[0].volume / 1000000}x volume`);
			signals.push(`Wait ${patterns.leadTime} for ${topMatch?.bookie || 'Pinnacle'} confirmation`);
		}

		if (topMatch) {
			signals.push(`Home line ${topMatch.lineMatch.toFixed(2)} → Sharp action detected`);
		}

		return {
			edge: patterns.edge,
			leadTime: patterns.leadTime,
			successRate: `${(patterns.successRate * 100).toFixed(0)}%`,
			replicationScore: patterns.replicationScore,
			signals
		};
	}

	/**
	 * Calculate replication score
	 */
	private calculateReplicationScore(
		matches: FuzzyMatch[],
		asiaSignals: SpikeSignal[],
		topMatch: FuzzyMatch | null
	): number {
		let score = 0;

		// Top match confidence (50%)
		if (topMatch) {
			score += 0.5 * topMatch.confidence;
		}

		// Asia signals presence (30%)
		if (asiaSignals.length > 0) {
			score += 0.3 * Math.min(asiaSignals.length / 3, 1);
		}

		// Pattern consistency (20%)
		if (topMatch && topMatch.pattern === 'sharp-action') {
			score += 0.2;
		}

		return Math.max(0, Math.min(1, score));
	}
}

