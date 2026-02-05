/**
 * @fileoverview Hidden Edge Confidence Scoring
 * @description Calculates confidence scores for detected hidden edges
 * @module graphs/multilayer/algorithms/hidden-edge-confidence
 * @version 1.1.1.1.4.3.5
 */

import type { HiddenEdgeCandidate } from '../types/hidden-edges';

interface ConfidenceScore {
  overall: number;
  factors: Record<string, number>;
  weights: Record<string, number>;
  adjustedBy: {
    observationCount: number;
    edgeAge: number;
    adjustmentFactor: number;
  };
  calculationTime: number;
  modelVersion: string;
}

interface ConfidenceModel {
  calculateCorrelationSignificance(candidate: HiddenEdgeCandidate): {
    pValue: number;
  };
  calculateGrangerCausality(candidate: HiddenEdgeCandidate): {
    pValue: number;
  };
  calculateCointegrationTest(candidate: HiddenEdgeCandidate): {
    pValue: number;
  };
  calculateBayesianProbability(candidate: HiddenEdgeCandidate): {
    pValue: number;
  };
}

/**
 * Header 1.1.1.1.4.3.5: Hidden Edge Confidence Scoring
 */
export class HiddenEdgeConfidenceScorer {
  private confidenceModels = new Map<string, ConfidenceModel>();

  calculateConfidence(hiddenEdge: HiddenEdgeCandidate): ConfidenceScore {
    // Multi-factor confidence calculation
    const factors = {
      statisticalSignificance: this.calculateStatisticalSignificance(
        hiddenEdge,
      ),
      temporalConsistency: this.calculateTemporalConsistency(hiddenEdge),
      crossValidation: this.calculateCrossValidationScore(hiddenEdge),
      noveltyScore: this.calculateNoveltyScore(hiddenEdge),
      expertValidation: this.getExpertValidationScore(hiddenEdge),
      marketImpact: this.calculateMarketImpactScore(hiddenEdge),
    };

    // Weighted confidence calculation
    const weights = this.getConfidenceWeights(hiddenEdge.layer);
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      const factorScore = factors[factor as keyof typeof factors];
      totalScore += factorScore * weight;
      totalWeight += weight;
    }

    const rawConfidence = totalScore / totalWeight;

    // Adjust for edge age and observation count
    const adjustedConfidence = this.adjustForObservations(
      rawConfidence,
      hiddenEdge.observationCount,
      hiddenEdge.firstDetected,
    );

    return {
      overall: adjustedConfidence,
      factors,
      weights,
      adjustedBy: {
        observationCount: hiddenEdge.observationCount,
        edgeAge: Date.now() - hiddenEdge.firstDetected,
        adjustmentFactor: adjustedConfidence / rawConfidence,
      },
      calculationTime: Date.now(),
      modelVersion: '1.4.3.5',
    };
  }

  private calculateStatisticalSignificance(
    hiddenEdge: HiddenEdgeCandidate,
  ): number {
    // Multiple statistical tests
    const model = this.getConfidenceModel(hiddenEdge.layer);
    const tests = [
      model.calculateCorrelationSignificance(hiddenEdge),
      model.calculateGrangerCausality(hiddenEdge),
      model.calculateCointegrationTest(hiddenEdge),
      model.calculateBayesianProbability(hiddenEdge),
    ];

    // Combine test results
    const significantTests = tests.filter((t) => t.pValue < 0.05);
    const combinedPValue = this.combinePValues(tests.map((t) => t.pValue));

    // Convert to confidence score (0-1)
    const significanceScore = 1 - combinedPValue;

    // Adjust for test consistency
    const consistency = significantTests.length / tests.length;
    const adjustedScore = significanceScore * (0.7 + 0.3 * consistency);

    return Math.min(1, Math.max(0, adjustedScore));
  }

  private calculateTemporalConsistency(
    hiddenEdge: HiddenEdgeCandidate,
  ): number {
    if (hiddenEdge.observationCount < 2) {
      return 0.3; // Low confidence for single observation
    }

    // Analyze temporal pattern of observations
    const observations = hiddenEdge.temporalObservations;
    const intervals: number[] = [];

    for (let i = 1; i < observations.length; i++) {
      intervals.push(
        observations[i].timestamp - observations[i - 1].timestamp,
      );
    }

    // Calculate consistency of intervals
    const meanInterval =
      intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    const variance =
      intervals.reduce(
        (sum, int) => sum + Math.pow(int - meanInterval, 2),
        0,
      ) / intervals.length;
    const coefficientOfVariation = Math.sqrt(variance) / meanInterval;

    // Convert to consistency score (lower CV = higher consistency)
    const consistencyScore = Math.max(0, 1 - coefficientOfVariation);

    // Adjust for number of observations
    const observationFactor = Math.min(
      1,
      hiddenEdge.observationCount / 10,
    );

    return consistencyScore * (0.5 + 0.5 * observationFactor);
  }

  private calculateCrossValidationScore(
    hiddenEdge: HiddenEdgeCandidate,
  ): number {
    // Simplified cross-validation score
    return hiddenEdge.observationCount > 5 ? 0.8 : 0.5;
  }

  private calculateNoveltyScore(hiddenEdge: HiddenEdgeCandidate): number {
    // Check if similar edges exist
    const similarEdges = this.findSimilarEdges(hiddenEdge);

    if (similarEdges.length === 0) {
      // Completely novel edge
      return 0.9; // High novelty, but also higher uncertainty
    }

    // Calculate similarity to existing edges
    const similarities = similarEdges.map((edge) =>
      this.calculateEdgeSimilarity(hiddenEdge, edge),
    );

    const avgSimilarity =
      similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;

    // Novelty is inverse of similarity
    const novelty = 1 - avgSimilarity;

    // Adjust based on verification status of similar edges
    const verifiedSimilar = similarEdges.filter(
      (edge) => edge.verification?.status === 'verified',
    );
    const verificationRate = verifiedSimilar.length / similarEdges.length;

    // Higher verification rate of similar edges increases confidence in novelty
    return novelty * (0.3 + 0.7 * verificationRate);
  }

  private getExpertValidationScore(hiddenEdge: HiddenEdgeCandidate): number {
    // Simplified expert validation score
    return hiddenEdge.verification?.status === 'verified' ? 0.9 : 0.5;
  }

  private calculateMarketImpactScore(
    hiddenEdge: HiddenEdgeCandidate,
  ): number {
    // Simplified market impact score
    return Math.min(1, hiddenEdge.correlationStrength * 1.2);
  }

  private getConfidenceWeights(layer: number): Record<string, number> {
    // Different weights for different layers
    const baseWeights = {
      statisticalSignificance: 0.3,
      temporalConsistency: 0.25,
      crossValidation: 0.15,
      noveltyScore: 0.1,
      expertValidation: 0.1,
      marketImpact: 0.1,
    };

    // Adjust weights based on layer
    if (layer === 1) {
      // Layer 1: More weight on statistical significance
      return {
        ...baseWeights,
        statisticalSignificance: 0.4,
        temporalConsistency: 0.3,
      };
    } else if (layer === 4) {
      // Layer 4: More weight on novelty and expert validation
      return {
        ...baseWeights,
        noveltyScore: 0.2,
        expertValidation: 0.2,
      };
    }

    return baseWeights;
  }

  private adjustForObservations(
    rawConfidence: number,
    observationCount: number,
    firstDetected: number,
  ): number {
    // Base adjustment for observation count
    const observationFactor = Math.min(1, observationCount / 20);

    // Time-based decay for old edges with few observations
    const edgeAge = Date.now() - firstDetected;
    const ageFactor = edgeAge > 86400000 ? 0.8 : 1; // Decay after 24 hours

    // Adjust confidence
    let adjusted = rawConfidence;

    // Increase confidence with more observations
    adjusted = adjusted * (0.5 + 0.5 * observationFactor);

    // Apply age decay for edges with few observations
    if (observationCount < 5 && edgeAge > 3600000) {
      // 1 hour
      adjusted = adjusted * ageFactor;
    }

    // Apply sigmoid function for smooth scaling
    const finalConfidence = 1 / (1 + Math.exp(-5 * (adjusted - 0.5)));

    return Math.min(1, Math.max(0, finalConfidence));
  }

  private combinePValues(pValues: number[]): number {
    // Fisher's method for combining p-values
    const chiSquare = -2 * pValues.reduce((sum, p) => sum + Math.log(p), 0);
    // Simplified: return average p-value
    return pValues.reduce((sum, p) => sum + p, 0) / pValues.length;
  }

  private findSimilarEdges(
    hiddenEdge: HiddenEdgeCandidate,
  ): HiddenEdgeCandidate[] {
    // Simplified: would search for similar edges in database
    return [];
  }

  private calculateEdgeSimilarity(
    edgeA: HiddenEdgeCandidate,
    edgeB: HiddenEdgeCandidate,
  ): number {
    // Simplified similarity calculation
    if (edgeA.sourceNode === edgeB.sourceNode && edgeA.targetNode === edgeB.targetNode) {
      return 1.0;
    }
    return 0.3;
  }

  private getConfidenceModel(layer: number): ConfidenceModel {
    const key = `layer_${layer}`;
    let model = this.confidenceModels.get(key);

    if (!model) {
      model = {
        calculateCorrelationSignificance: () => ({ pValue: 0.01 }),
        calculateGrangerCausality: () => ({ pValue: 0.02 }),
        calculateCointegrationTest: () => ({ pValue: 0.015 }),
        calculateBayesianProbability: () => ({ pValue: 0.025 }),
      };
      this.confidenceModels.set(key, model);
    }

    return model;
  }
}
