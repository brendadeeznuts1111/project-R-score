/**
 * @fileoverview 1.1.1.1.2.7.0: Behavioral Pattern Classifier
 * @description Classifies betting patterns as bot vs human, detects evasion patterns
 * @module arbitrage/shadow-graph/behavioral-pattern-classifier
 */

import { Database } from "bun:sqlite";

/**
 * Bet classification result
 */
export interface BetClassification {
	isBot: boolean;
	confidence: number;
	signature: "sharp_bot" | "retail_bot" | "human" | "unknown";
	features: {
		isRoundSize: boolean;
		isFast: boolean;
		isConsistentIP: boolean;
		isBotUserAgent: boolean;
	};
}

/**
 * Behavioral edge score
 */
export interface BehavioralEdgeScore {
	score: number; // 0-1, higher = more likely bot/sharp
	signature: string;
	recommendations: string[];
}

/**
 * 1.1.1.1.2.7.1: Behavioral Pattern Classifier
 *
 * Classifies betting patterns to identify:
 * - Sharp bots (1.1.1.1.2.7.2: Bot-vs-Human Signature)
 * - Rate limit triggers (1.1.1.1.2.7.3: Rate-Limit Trigger Pattern)
 * - Bet sizing patterns (1.1.1.1.2.7.4: Bet Sizing Distribution)
 * - Session fingerprints (1.1.1.1.2.7.5: Session Fingerprinting)
 */
export class BehavioralPatternClassifier {
	private readonly ROUND_SIZE_THRESHOLD = 100; // Round number threshold
	private readonly FAST_EXECUTION_THRESHOLD = 100; // ms
	private readonly LARGE_SIZE_THRESHOLD = 5000; // USD

	constructor(private db: Database) {}

	/**
	 * Classify a bet as bot or human
	 */
	classifyBet(bet: {
		size: number;
		timestamp: number;
		executionTime: number;
		ipHash: string;
		userAgent: string;
	}): BetClassification {
		const features = {
			isRoundSize: bet.size % this.ROUND_SIZE_THRESHOLD === 0,
			isFast: bet.executionTime < this.FAST_EXECUTION_THRESHOLD,
			isConsistentIP: this.isConsistentIP(bet.ipHash),
			isBotUserAgent: /bot|python|curl|scraper/i.test(bet.userAgent),
		};

		// 1.1.1.1.2.7.2: Bot-vs-Human Signature
		let botScore = 0;

		// Round size + fast execution = likely bot
		if (features.isRoundSize && features.isFast) {
			botScore += 0.4;
		}

		// Consistent IP + bot user agent = likely bot
		if (features.isConsistentIP && features.isBotUserAgent) {
			botScore += 0.3;
		}

		// Large size = likely sharp
		if (bet.size > this.LARGE_SIZE_THRESHOLD) {
			botScore += 0.3;
		}

		// Determine signature
		let signature: "sharp_bot" | "retail_bot" | "human" | "unknown" = "unknown";

		if (botScore > 0.8) {
			signature = "sharp_bot";
		} else if (botScore > 0.5) {
			signature = "retail_bot";
		} else if (botScore < 0.3) {
			signature = "human";
		}

		return {
			isBot: botScore > 0.6,
			confidence: botScore,
			signature,
			features,
		};
	}

	/**
	 * 1.1.1.1.2.7.3: Rate-Limit Trigger Pattern
	 *
	 * Detects patterns that trigger rate limiting
	 */
	async detectRateLimitPatterns(
		ipHash: string,
		windowMs: number = 60000,
	): Promise<{
		triggered: boolean;
		requestCount: number;
		pattern: string;
	}> {
		const cutoffTime = Date.now() - windowMs;

		const requests = this.db
			.query<{ timestamp: number }, [string, number]>(
				`SELECT timestamp 
				 FROM bet_requests 
				 WHERE ip_hash = ?1 AND timestamp > ?2`,
			)
			.all(ipHash, cutoffTime);

		const requestCount = requests.length;
		const triggered = requestCount > 100; // Threshold: 100 requests per minute

		let pattern = "normal";
		if (requestCount > 200) {
			pattern = "aggressive";
		} else if (requestCount > 100) {
			pattern = "moderate";
		}

		return { triggered, requestCount, pattern };
	}

	/**
	 * 1.1.1.1.2.7.4: Bet Sizing Distribution
	 *
	 * Analyzes bet sizing patterns
	 */
	async analyzeBetSizingDistribution(
		nodeId: string,
		windowMs: number = 3600000,
	): Promise<{
		mean: number;
		stdDev: number;
		skewness: number;
		hasSharpPattern: boolean;
	}> {
		const bets = this.db
			.query<{ bet_size: number }, [string, number]>(
				`SELECT bet_size 
				 FROM line_movements 
				 WHERE node_id = ?1 
				   AND timestamp > ?2 
				   AND bet_size IS NOT NULL`,
			)
			.all(nodeId, Date.now() - windowMs);

		if (bets.length === 0) {
			return { mean: 0, stdDev: 0, skewness: 0, hasSharpPattern: false };
		}

		const sizes = bets.map((b) => b.bet_size);
		const mean = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;

		const variance =
			sizes.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sizes.length;
		const stdDev = Math.sqrt(variance);

		// Calculate skewness (third moment)
		const skewness =
			sizes.reduce((sum, s) => sum + Math.pow((s - mean) / stdDev, 3), 0) /
			sizes.length;

		// Sharp pattern: high mean, low std dev (consistent large bets)
		const hasSharpPattern =
			mean > this.LARGE_SIZE_THRESHOLD && stdDev < mean * 0.3;

		return { mean, stdDev, skewness, hasSharpPattern };
	}

	/**
	 * 1.1.1.1.2.7.5: Session Fingerprinting
	 *
	 * Creates fingerprint for betting session
	 */
	createSessionFingerprint(
		bets: Array<{
			size: number;
			timestamp: number;
			executionTime: number;
		}>,
	): string {
		// Create hash from bet patterns
		const features = [
			bets.length,
			bets.reduce((sum, b) => sum + b.size, 0) / bets.length, // Avg size
			bets.reduce((sum, b) => sum + b.executionTime, 0) / bets.length, // Avg execution time
			bets.filter((b) => b.size % 100 === 0).length / bets.length, // Round size ratio
		];

		// Simple hash
		const hash = features.map((f) => Math.round(f * 100)).join("-");

		return hash;
	}

	/**
	 * 1.1.1.1.2.7.6: Bookmaker Bot-Detection Evasion
	 *
	 * Recommends evasion strategies
	 */
	generateEvasionRecommendations(classification: BetClassification): string[] {
		const recommendations: string[] = [];

		if (classification.features.isRoundSize) {
			recommendations.push("Vary bet sizes (avoid round numbers)");
		}

		if (classification.features.isFast) {
			recommendations.push("Add random delays (100-500ms)");
		}

		if (classification.features.isConsistentIP) {
			recommendations.push("Rotate IP addresses");
		}

		if (classification.features.isBotUserAgent) {
			recommendations.push("Use realistic user agents");
		}

		if (classification.isBot && classification.confidence > 0.8) {
			recommendations.push("Consider human-in-the-loop verification");
		}

		return recommendations;
	}

	/**
	 * 1.1.1.1.2.7.7: Behavioral Edge Scoring
	 *
	 * Scores behavioral patterns for trading edge
	 */
	calculateBehavioralEdgeScore(
		classifications: BetClassification[],
	): BehavioralEdgeScore {
		if (classifications.length === 0) {
			return { score: 0, signature: "unknown", recommendations: [] };
		}

		// Count signatures
		const signatureCounts = new Map<string, number>();
		let totalBotConfidence = 0;

		for (const classification of classifications) {
			const count = signatureCounts.get(classification.signature) || 0;
			signatureCounts.set(classification.signature, count + 1);
			totalBotConfidence += classification.confidence;
		}

		// Find dominant signature
		let dominantSignature = "unknown";
		let maxCount = 0;

		for (const [signature, count] of signatureCounts) {
			if (count > maxCount) {
				maxCount = count;
				dominantSignature = signature;
			}
		}

		// Calculate edge score
		const avgBotConfidence = totalBotConfidence / classifications.length;
		const sharpBotRatio =
			(signatureCounts.get("sharp_bot") || 0) / classifications.length;

		const score = avgBotConfidence * 0.6 + sharpBotRatio * 0.4;

		const recommendations: string[] = [];

		if (sharpBotRatio > 0.5) {
			recommendations.push("High sharp bot activity - monitor closely");
		}

		if (avgBotConfidence > 0.7) {
			recommendations.push("Consider adjusting detection thresholds");
		}

		return {
			score,
			signature: dominantSignature,
			recommendations,
		};
	}

	/**
	 * Check if IP is consistent (same IP used repeatedly)
	 */
	private isConsistentIP(ipHash: string): boolean {
		// Check if this IP has been seen frequently
		const recentCount = this.db
			.query<{ count: number }, [string, number]>(
				`SELECT COUNT(*) as count 
				 FROM bet_requests 
				 WHERE ip_hash = ?1 AND timestamp > ?2`,
			)
			.get(ipHash, Date.now() - 24 * 60 * 60 * 1000);

		return (recentCount?.count || 0) > 50; // More than 50 requests in 24h
	}
}
