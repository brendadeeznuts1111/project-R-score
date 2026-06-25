/**
 * @dynamic-spy/kit v4.2 - ROI Calculator
 * 
 * Calculate ROI for reverse engineered models
 */

import { ExtractedPattern } from "./pattern-extractor";

export interface ROICalculation {
	originalModel: {
		stake: number;
		edge: number;
		monthlyProfit: number;
	};
	replicas: Array<{
		name: string;
		stake: number;
		edge: number;
		monthlyProfit: number;
		replicationScore: number;
	}>;
	totalMonthlyProfit: number;
	roi: number;
}

export class ROICalculator {
	/**
	 * Calculate ROI for reverse engineered models
	 * 
	 * @param originalStake - Original model stake
	 * @param originalEdge - Original model edge (%)
	 * @param patterns - Extracted patterns
	 * @returns ROI calculation
	 */
	calculateROI(
		originalStake: number,
		originalEdge: number,
		patterns: ExtractedPattern[]
	): ROICalculation {
		const originalMonthlyProfit = (originalStake * originalEdge) / 100;

		const replicas = patterns.map(pattern => {
			// Scale stake based on replication score
			const replicaStake = originalStake * pattern.replicationScore * 0.9; // 90% of original
			
			// Scale edge based on replication score
			const replicaEdge = (originalEdge * pattern.replicationScore) / 100;
			
			const monthlyProfit = (replicaStake * replicaEdge) / 100;

			return {
				name: pattern.name,
				stake: replicaStake,
				edge: replicaEdge,
				monthlyProfit,
				replicationScore: pattern.replicationScore
			};
		});

		const totalMonthlyProfit = replicas.reduce((sum, r) => sum + r.monthlyProfit, 0);
		const roi = (totalMonthlyProfit / originalMonthlyProfit) * 100;

		return {
			originalModel: {
				stake: originalStake,
				edge: originalEdge,
				monthlyProfit: originalMonthlyProfit
			},
			replicas,
			totalMonthlyProfit,
			roi
		};
	}

	/**
	 * Format ROI calculation for display
	 * 
	 * @param calculation - ROI calculation
	 * @returns Formatted string
	 */
	formatROI(calculation: ROICalculation): string {
		const lines: string[] = [];

		lines.push(`ORIGINAL MODEL: $${(calculation.originalModel.stake / 1000000).toFixed(1)}M stake → ${calculation.originalModel.edge.toFixed(2)}% edge → $${(calculation.originalModel.monthlyProfit / 1000).toFixed(0)}K/mo profit`);
		lines.push('');
		lines.push('YOUR REPLICAS:');

		calculation.replicas.forEach((replica, i) => {
			lines.push(`${i + 1}. ${replica.name}: $${(replica.stake / 1000000).toFixed(1)}M stake → ${replica.edge.toFixed(2)}% → $${(replica.monthlyProfit / 1000).toFixed(0)}K/mo`);
		});

		lines.push('');
		lines.push(`TOTAL: $${(calculation.totalMonthlyProfit / 1000).toFixed(0)}K/mo → ${calculation.roi.toFixed(0)}% ROI on reverse engineering!`);

		return lines.join('\n');
	}
}



