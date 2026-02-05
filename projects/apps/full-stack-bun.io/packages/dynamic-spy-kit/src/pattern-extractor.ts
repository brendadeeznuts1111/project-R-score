/**
 * @dynamic-spy/kit v4.2 - Pattern Extractor
 * 
 * Extract common patterns from multiple winning plays
 */

import { BackworkResult } from "./backwork-engine";
import { FuzzyMatch } from "./model-reverse";
import { SpikeSignal } from "./asia-spike-detector";

export interface ExtractedPattern {
	name: string;
	plays: number;
	edge: number;
	signals: string[];
	entry: string;
	stake: string;
	hitRate: number;
	replicationScore: number;
}

export interface PatternCluster {
	pattern: ExtractedPattern;
	backworkResults: BackworkResult[];
}

export class PatternExtractor {
	/**
	 * Extract patterns from multiple backwork results
	 * 
	 * @param results - Array of backwork results
	 * @returns Array of extracted patterns
	 */
	extractPatterns(results: BackworkResult[]): ExtractedPattern[] {
		const clusters: PatternCluster[] = [];

		// Group results by similar patterns
		results.forEach(result => {
			const pattern = this.identifyPattern(result);
			const cluster = this.findOrCreateCluster(clusters, pattern);
			cluster.backworkResults.push(result);
		});

		// Convert clusters to patterns
		return clusters.map(cluster => this.clusterToPattern(cluster));
	}

	/**
	 * Identify pattern from backwork result
	 */
	private identifyPattern(result: BackworkResult): string {
		const signals: string[] = [];

		// Asia signals
		if (result.asiaSignals.length > 0) {
			const firstAsia = result.asiaSignals[0];
			signals.push(`${firstAsia.bookie} ${firstAsia.leadTime} before`);
		}

		// Top match pattern
		if (result.topMatch) {
			signals.push(`${result.topMatch.bookie} ${result.topMatch.pattern}`);
		}

		return signals.join(' → ');
	}

	/**
	 * Find or create cluster for pattern
	 */
	private findOrCreateCluster(clusters: PatternCluster[], patternName: string): PatternCluster {
		let cluster = clusters.find(c => c.pattern.name === patternName);
		
		if (!cluster) {
			cluster = {
				pattern: {
					name: patternName,
					plays: 0,
					edge: 0,
					signals: [],
					entry: '',
					stake: '',
					hitRate: 0,
					replicationScore: 0
				},
				backworkResults: []
			};
			clusters.push(cluster);
		}

		return cluster;
	}

	/**
	 * Convert cluster to pattern
	 */
	private clusterToPattern(cluster: PatternCluster): ExtractedPattern {
		const results = cluster.backworkResults;
		const plays = results.length;

		// Calculate average edge
		const edges = results.map(r => {
			// Estimate edge from profit/stake if available
			if (r.winningPlay.profit && r.winningPlay.stake) {
				return (r.winningPlay.profit / r.winningPlay.stake) * 100;
			}
			return 0;
		}).filter(e => e > 0);

		const avgEdge = edges.length > 0
			? edges.reduce((a, b) => a + b, 0) / edges.length
			: 0;

		// Extract common signals
		const signals = this.extractCommonSignals(results);

		// Calculate hit rate (based on replication scores)
		const hitRate = results.length > 0
			? results.reduce((sum, r) => sum + r.modelFingerprint.replicationScore, 0) / results.length
			: 0;

		// Average replication score
		const replicationScore = results.length > 0
			? results.reduce((sum, r) => sum + r.patterns.replicationScore, 0) / results.length
			: 0;

		// Determine entry criteria
		const entry = this.determineEntryCriteria(results);

		// Determine stake criteria
		const stake = this.determineStakeCriteria(results);

		return {
			name: cluster.pattern.name,
			plays,
			edge: avgEdge,
			signals,
			entry,
			stake,
			hitRate,
			replicationScore
		};
	}

	/**
	 * Extract common signals from results
	 */
	private extractCommonSignals(results: BackworkResult[]): string[] {
		const signalCounts = new Map<string, number>();

		results.forEach(result => {
			// Count Asia signals
			result.asiaSignals.forEach(signal => {
				const key = `${signal.bookie} volume ${(signal.volume / 1000000).toFixed(1)}x`;
				signalCounts.set(key, (signalCounts.get(key) || 0) + 1);
			});

			// Count top match patterns
			if (result.topMatch) {
				const key = `${result.topMatch.bookie} ${result.topMatch.pattern}`;
				signalCounts.set(key, (signalCounts.get(key) || 0) + 1);
			}
		});

		// Return most common signals (appear in >50% of plays)
		const threshold = results.length * 0.5;
		return Array.from(signalCounts.entries())
			.filter(([_, count]) => count >= threshold)
			.map(([signal]) => signal);
	}

	/**
	 * Determine entry criteria from results
	 */
	private determineEntryCriteria(results: BackworkResult[]): string {
		const lines = results
			.map(r => r.winningPlay.line)
			.filter(l => l > 0);

		if (lines.length === 0) return 'Unknown';

		const minLine = Math.min(...lines);
		const maxLine = Math.max(...lines);

		return `${minLine.toFixed(2)}-${maxLine.toFixed(2)}`;
	}

	/**
	 * Determine stake criteria from results
	 */
	private determineStakeCriteria(results: BackworkResult[]): string {
		const stakes = results
			.map(r => r.winningPlay.stake)
			.filter(s => s > 0);

		if (stakes.length === 0) return 'Unknown';

		const avgStake = stakes.reduce((a, b) => a + b, 0) / stakes.length;
		const minStake = Math.min(...stakes);

		if (avgStake > 1000000) {
			return `> $${(minStake / 1000000).toFixed(1)}M`;
		}

		return `> $${(minStake / 1000).toFixed(0)}K`;
	}
}



