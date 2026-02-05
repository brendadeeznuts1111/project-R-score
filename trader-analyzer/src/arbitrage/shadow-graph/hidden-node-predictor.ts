/**
 * @fileoverview Hidden Node Predictor for Shadow-Graph System
 * @description Machine learning model to predict where hidden nodes might exist
 * @module arbitrage/shadow-graph/hidden-node-predictor
 */

import { Database } from "bun:sqlite";
import type { ShadowNode } from "./types";

/**
 * Training example for hidden node prediction
 */
export interface HiddenNodeTrainingExample {
	eventId: string;
	bookmaker: string;
	marketType: string;
	period: string;
	hiddenNodeExists: boolean;
	features: HiddenNodeFeatures;
}

/**
 * Features used for prediction
 */
export interface HiddenNodeFeatures {
	eventType: string; // e.g., "nfl", "nba"
	bookmaker: string;
	marketType: string; // e.g., "total", "spread", "moneyline"
	period: string; // e.g., "q1", "q2", "full", "live"
	timeUntilGame: number; // milliseconds until game start
	hasVisibleCounterpart: boolean;
	visibleNodeLiquidity: number;
	historicalHiddenNodeRate: number; // Rate of hidden nodes for this (bookmaker, marketType) combo
	bookmakerDarkMarketTendency: number; // Bookmaker's tendency to have dark markets
	marketComplexity: number; // Complexity score (e.g., prop markets = higher)
}

/**
 * Hidden Node Predictor
 *
 * Uses machine learning to predict the probability of hidden nodes
 * existing for given (event, bookmaker, market) combinations
 */
export class HiddenNodePredictor {
	private model: SimpleLogisticRegression | null = null;
	private isTrained: boolean = false;

	constructor(private db: Database) {}

	/**
	 * Train the predictor using historical data
	 *
	 * Extracts training examples from historical shadow graph snapshots
	 */
	async train(trainingData?: HiddenNodeTrainingExample[]): Promise<void> {
		console.log("🧠 Training hidden node predictor...");

		// If no training data provided, extract from historical data
		if (!trainingData) {
			trainingData = await this.extractTrainingDataFromHistory();
		}

		if (trainingData.length === 0) {
			console.warn("⚠️  No training data available. Using default model.");
			this.model = new SimpleLogisticRegression();
			this.isTrained = false;
			return;
		}

		// Extract features and labels
		const features = trainingData.map((example) =>
			this.featuresToVector(example.features),
		);
		const labels = trainingData.map((example) =>
			example.hiddenNodeExists ? 1 : 0,
		);

		// Train model
		this.model = new SimpleLogisticRegression();
		this.model.train(features, labels, {
			iterations: 1000,
			learningRate: 0.01,
		});

		this.isTrained = true;
		console.log(`✅ Predictor trained on ${trainingData.length} examples`);
	}

	/**
	 * Predict probability of hidden node existing
	 *
	 * @param eventId - Event ID
	 * @param bookmaker - Bookmaker name
	 * @param marketType - Market type (e.g., "total", "spread")
	 * @param period - Period (e.g., "q1", "full")
	 * @returns Probability (0-1) of hidden node existing
	 */
	async predict(
		eventId: string,
		bookmaker: string,
		marketType: string,
		period: string,
	): Promise<number> {
		if (!this.isTrained || !this.model) {
			// Return default probability based on bookmaker tendencies
			return this.getDefaultProbability(bookmaker, marketType);
		}

		const features = await this.extractFeaturesForPrediction(
			eventId,
			bookmaker,
			marketType,
			period,
		);
		const featureVector = this.featuresToVector(features);

		const probability = this.model.predict(featureVector);
		return Math.max(0, Math.min(1, probability)); // Clamp to [0, 1]
	}

	/**
	 * Save prediction to database
	 */
	async savePrediction(
		eventId: string,
		bookmaker: string,
		marketType: string,
		period: string,
		probability: number,
	): Promise<number> {
		const features = await this.extractFeaturesForPrediction(
			eventId,
			bookmaker,
			marketType,
			period,
		);

		const result = this.db
			.prepare(
				`INSERT INTO hidden_node_predictions 
				 (event_id, bookmaker, market_type, period, predicted_probability, features, predicted_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				eventId,
				bookmaker,
				marketType,
				period,
				probability,
				JSON.stringify(features),
				Date.now(),
			);

		return result.lastInsertRowId as number;
	}

	/**
	 * Verify a prediction by probing
	 *
	 * Updates the prediction record with verification results
	 */
	async verifyPrediction(
		predictionId: number,
		found: boolean,
		nodeId?: string,
	): Promise<void> {
		this.db
			.prepare(
				`UPDATE hidden_node_predictions 
				 SET verified = TRUE, verification_result = ?, verification_timestamp = ?, node_id = ?
				 WHERE prediction_id = ?`,
			)
			.run(found ? 1 : 0, Date.now(), nodeId ?? null, predictionId);
	}

	/**
	 * Get unverified predictions ordered by probability
	 */
	getUnverifiedPredictions(limit: number = 100): Array<{
		prediction_id: number;
		event_id: string;
		bookmaker: string;
		market_type: string;
		period: string;
		predicted_probability: number;
		predicted_at: number;
	}> {
		return this.db
			.query<
				{
					prediction_id: number;
					event_id: string;
					bookmaker: string;
					market_type: string;
					period: string;
					predicted_probability: number;
					predicted_at: number;
				},
				[number]
			>(
				`SELECT prediction_id, event_id, bookmaker, market_type, period, 
				        predicted_probability, predicted_at
				 FROM hidden_node_predictions
				 WHERE verified = FALSE
				 ORDER BY predicted_probability DESC
				 LIMIT ?1`,
			)
			.all(limit);
	}

	/**
	 * Extract training data from historical snapshots
	 */
	private async extractTrainingDataFromHistory(): Promise<
		HiddenNodeTrainingExample[]
	> {
		// Get all unique (event, bookmaker, market, period) combinations from history
		const combinations = this.db
			.query<
				{
					event_id: string;
					bookmaker: string;
					market_id: string;
					period: string;
					has_hidden: boolean;
				},
				[]
			>(
				`SELECT DISTINCT 
					event_id, bookmaker, market_id, 
					CASE 
						WHEN node_id LIKE '%:q1:%' THEN 'q1'
						WHEN node_id LIKE '%:q2:%' THEN 'q2'
						WHEN node_id LIKE '%:q3:%' THEN 'q3'
						WHEN node_id LIKE '%:q4:%' THEN 'q4'
						WHEN node_id LIKE '%:full:%' THEN 'full'
						ELSE 'live'
					END as period,
					MAX(CASE WHEN visibility IN ('dark', 'api_only') THEN 1 ELSE 0 END) as has_hidden
				 FROM shadow_nodes_history
				 GROUP BY event_id, bookmaker, market_id, period`,
			)
			.all();

		const examples: HiddenNodeTrainingExample[] = [];

		for (const combo of combinations) {
			const features = await this.extractFeaturesForPrediction(
				combo.event_id,
				combo.bookmaker,
				combo.market_id,
				combo.period,
			);

			examples.push({
				eventId: combo.event_id,
				bookmaker: combo.bookmaker,
				marketType: combo.market_id,
				period: combo.period,
				hiddenNodeExists: combo.has_hidden === 1,
				features,
			});
		}

		return examples;
	}

	/**
	 * Extract features for prediction
	 */
	private async extractFeaturesForPrediction(
		eventId: string,
		bookmaker: string,
		marketType: string,
		period: string,
	): Promise<HiddenNodeFeatures> {
		// Get event info
		const event = this.db
			.query<{ sport: string; start_time: number }, [string]>(
				`SELECT sport, start_time FROM events WHERE id = ?1`,
			)
			.get(eventId);

		const timeUntilGame = event
			? Math.max(0, event.start_time - Date.now())
			: Infinity;

		// Check for visible counterpart
		const visibleNode = this.db
			.query<
				{ node_id: string; displayed_liquidity: number },
				[string, string, string, string]
			>(
				`SELECT node_id, displayed_liquidity 
				 FROM shadow_nodes 
				 WHERE event_id = ?1 AND bookmaker = ?2 AND market_id = ?3 
				   AND visibility = 'display' AND node_id LIKE ?4`,
			)
			.get(eventId, bookmaker, marketType, `%:${period}:%`);

		// Calculate historical hidden node rate
		const historicalRate = this.db
			.query<{ rate: number }, [string, string]>(
				`SELECT 
					CAST(COUNT(CASE WHEN visibility IN ('dark', 'api_only') THEN 1 END) AS REAL) / 
					NULLIF(COUNT(*), 0) as rate
				 FROM shadow_nodes_history
				 WHERE bookmaker = ?1 AND market_id LIKE ?2`,
			)
			.get(bookmaker, `${marketType}%`);

		// Bookmaker dark market tendency
		const bookmakerTendency = this.db
			.query<{ tendency: number }, [string]>(
				`SELECT 
					CAST(COUNT(CASE WHEN visibility IN ('dark', 'api_only') THEN 1 END) AS REAL) / 
					NULLIF(COUNT(*), 0) as tendency
				 FROM shadow_nodes_history
				 WHERE bookmaker = ?1`,
			)
			.get(bookmaker);

		// Market complexity (simplified: prop markets = higher complexity)
		const marketComplexity =
			marketType.includes("prop") || marketType.includes("player")
				? 0.8
				: marketType.includes("total") || marketType.includes("spread")
					? 0.5
					: 0.3;

		return {
			eventType: event?.sport || "unknown",
			bookmaker,
			marketType,
			period,
			timeUntilGame,
			hasVisibleCounterpart: !!visibleNode,
			visibleNodeLiquidity: visibleNode?.displayed_liquidity || 0,
			historicalHiddenNodeRate: historicalRate?.rate || 0,
			bookmakerDarkMarketTendency: bookmakerTendency?.tendency || 0,
			marketComplexity,
		};
	}

	/**
	 * Convert features to feature vector
	 */
	private featuresToVector(features: HiddenNodeFeatures): number[] {
		// One-hot encode bookmaker (simplified: use hash)
		const bookmakerHash = (this.hashString(features.bookmaker) % 100) / 100;

		// One-hot encode market type
		const marketTypeHash = (this.hashString(features.marketType) % 100) / 100;

		// One-hot encode period
		const periodHash = (this.hashString(features.period) % 100) / 100;

		// Normalize time until game (log scale, max 7 days)
		const normalizedTimeUntilGame = Math.min(
			1,
			Math.log10(Math.max(1, features.timeUntilGame / 1000 / 60)) /
				Math.log10(7 * 24 * 60),
		);

		return [
			bookmakerHash,
			marketTypeHash,
			periodHash,
			normalizedTimeUntilGame,
			features.hasVisibleCounterpart ? 1 : 0,
			Math.min(1, features.visibleNodeLiquidity / 100000), // Normalize liquidity
			features.historicalHiddenNodeRate,
			features.bookmakerDarkMarketTendency,
			features.marketComplexity,
		];
	}

	/**
	 * Get default probability based on bookmaker tendencies
	 */
	private getDefaultProbability(bookmaker: string, marketType: string): number {
		// Default probabilities based on known bookmaker behavior
		const bookmakerDefaults: Record<string, number> = {
			draftkings: 0.3,
			fanduel: 0.25,
			betmgm: 0.35,
			caesars: 0.2,
			pinnacle: 0.4,
		};

		const baseProb = bookmakerDefaults[bookmaker.toLowerCase()] || 0.25;

		// Adjust for market type
		if (marketType.includes("prop") || marketType.includes("player")) {
			return baseProb * 1.2; // Props more likely to have hidden markets
		}

		return baseProb;
	}

	/**
	 * Simple string hash
	 */
	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}
}

/**
 * Simple Logistic Regression implementation
 *
 * For production, consider using TensorFlow.js or a more sophisticated ML library
 */
class SimpleLogisticRegression {
	private weights: number[] = [];
	private bias: number = 0;

	train(
		features: number[][],
		labels: number[],
		options: { iterations: number; learningRate: number } = {
			iterations: 1000,
			learningRate: 0.01,
		},
	): void {
		if (features.length === 0) return;

		const numFeatures = features[0].length;
		this.weights = new Array(numFeatures).fill(0);
		this.bias = 0;

		for (let iter = 0; iter < options.iterations; iter++) {
			for (let i = 0; i < features.length; i++) {
				const prediction = this.sigmoid(
					this.dotProduct(features[i], this.weights) + this.bias,
				);
				const error = labels[i] - prediction;

				// Update weights
				for (let j = 0; j < numFeatures; j++) {
					this.weights[j] += options.learningRate * error * features[i][j];
				}
				this.bias += options.learningRate * error;
			}
		}
	}

	predict(features: number[]): number {
		return this.sigmoid(this.dotProduct(features, this.weights) + this.bias);
	}

	private sigmoid(x: number): number {
		return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); // Clamp to avoid overflow
	}

	private dotProduct(a: number[], b: number[]): number {
		let sum = 0;
		for (let i = 0; i < Math.min(a.length, b.length); i++) {
			sum += a[i] * b[i];
		}
		return sum;
	}
}
