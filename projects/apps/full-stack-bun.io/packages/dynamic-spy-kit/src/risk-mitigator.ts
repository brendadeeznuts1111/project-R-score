/**
 * @dynamic-spy/kit v4.2 - Risk Mitigator
 * 
 * Risk mitigation thresholds for fuzzy confidence
 */

export interface RiskLevel {
	level: 'DEPLOY' | 'PAPER_TRADE' | 'MONITOR' | 'DISCARD';
	threshold: number;
	action: string;
	description: string;
}

export class RiskMitigator {
	private readonly thresholds: RiskLevel[] = [
		{
			level: 'DEPLOY',
			threshold: 0.90,
			action: 'Deploy immediately',
			description: 'High confidence - model is replicable'
		},
		{
			level: 'PAPER_TRADE',
			threshold: 0.80,
			action: 'Paper trade 100 plays',
			description: 'Good confidence - validate before deploying'
		},
		{
			level: 'MONITOR',
			threshold: 0.70,
			action: 'Monitor only',
			description: 'Low confidence - watch for patterns'
		},
		{
			level: 'DISCARD',
			threshold: 0.0,
			action: 'Discard',
			description: 'Too low confidence - risk of chasing ghosts'
		}
	];

	/**
	 * Get risk level for a confidence score
	 * 
	 * @param confidence - Confidence score (0-1)
	 * @returns Risk level
	 */
	getRiskLevel(confidence: number): RiskLevel {
		for (const threshold of this.thresholds) {
			if (confidence >= threshold.threshold) {
				return threshold;
			}
		}

		return this.thresholds[this.thresholds.length - 1]; // DISCARD
	}

	/**
	 * Check if confidence is safe to deploy
	 * 
	 * @param confidence - Confidence score
	 * @returns True if safe to deploy
	 */
	isSafeToDeploy(confidence: number): boolean {
		return confidence >= 0.90;
	}

	/**
	 * Get recommended action for confidence
	 * 
	 * @param confidence - Confidence score
	 * @returns Recommended action
	 */
	getRecommendedAction(confidence: number): string {
		const riskLevel = this.getRiskLevel(confidence);
		return riskLevel.action;
	}

	/**
	 * Validate pattern before deployment
	 * 
	 * @param replicationScore - Replication score
	 * @param hitRate - Hit rate
	 * @returns True if pattern is valid
	 */
	validatePattern(replicationScore: number, hitRate: number): boolean {
		// Must have >80% replication score and >75% hit rate
		return replicationScore >= 0.80 && hitRate >= 0.75;
	}
}



