/**
 * Cosine similarity calculation with precision handling
 */

import { DRIFT_TOLERANCE } from "../constants.js";
import type { SharpVector } from "../types/game.js";
import { vectorMagnitude, dotProduct, isZeroVector } from "./vector.js";

/**
 * Calculate cosine similarity between two SharpVectors
 * 
 * Returns a value between -1 and 1, where:
 * - 1 indicates identical direction (perfect similarity)
 * - 0 indicates orthogonal vectors (no similarity)
 * - -1 indicates opposite direction (perfect dissimilarity)
 * 
 * Uses Float64 precision for all calculations to avoid drift.
 * Handles edge cases including zero vectors, invalid values, and floating-point errors.
 * 
 * @param vec1 - First vector (14-dimensional SharpVector)
 * @param vec2 - Second vector (14-dimensional SharpVector)
 * @returns Cosine similarity value between -1 and 1, or 0 for invalid inputs
 * 
 * @example
 * ```ts
 * const similarity = cosineSimilarity(game1.vector, game2.vector);
 * if (similarity > 0.7) {
 *   console.log("High similarity detected");
 * }
 * ```
 */
export function cosineSimilarity(vec1: SharpVector, vec2: SharpVector): number {
  // Handle edge cases
  if (isZeroVector(vec1) || isZeroVector(vec2)) {
    return 0; // Zero vectors have undefined similarity
  }

  // Check for invalid vectors
  for (let i = 0; i < vec1.length; i++) {
    if (!isFinite(vec1[i]) || !isFinite(vec2[i])) {
      return 0; // Invalid vectors return 0 similarity
    }
  }

  // Calculate dot product
  const dot = dotProduct(vec1, vec2);

  // Calculate magnitudes
  const mag1 = vectorMagnitude(vec1);
  const mag2 = vectorMagnitude(vec2);

  // Handle division by zero
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  // Calculate cosine similarity
  const similarity = dot / (mag1 * mag2);

  // Clamp to [-1, 1] to handle floating-point errors
  const clamped = Math.max(-1, Math.min(1, similarity));

  // Check for NaN or Infinity
  if (!isFinite(clamped)) {
    return 0;
  }

  return clamped;
}

/**
 * Calculate cosine similarity with statistical context
 * Returns similarity along with magnitude information
 */
export function cosineSimilarityWithStats(
  vec1: SharpVector,
  vec2: SharpVector
): {
  similarity: number;
  magnitude1: number;
  magnitude2: number;
  dotProduct: number;
} {
  const mag1 = vectorMagnitude(vec1);
  const mag2 = vectorMagnitude(vec2);
  const dot = dotProduct(vec1, vec2);
  const similarity = cosineSimilarity(vec1, vec2);

  return {
    similarity,
    magnitude1: mag1,
    magnitude2: mag2,
    dotProduct: dot,
  };
}

/**
 * Check if two vectors are similar above threshold
 */
export function isSimilar(
  vec1: SharpVector,
  vec2: SharpVector,
  threshold: number
): boolean {
  const similarity = cosineSimilarity(vec1, vec2);
  return similarity >= threshold;
}

/**
 * Calculate similarity with drift detection
 * Compares stored similarity with recalculated value
 */
export function cosineSimilarityWithDriftCheck(
  vec1: SharpVector,
  vec2: SharpVector,
  storedSimilarity: number
): {
  similarity: number;
  drifted: boolean;
  driftAmount: number;
} {
  const recalculated = cosineSimilarity(vec1, vec2);
  const driftAmount = Math.abs(storedSimilarity - recalculated);
  const drifted = driftAmount > DRIFT_TOLERANCE;

  return {
    similarity: recalculated,
    drifted,
    driftAmount,
  };
}

/**
 * Batch calculate cosine similarities
 * Optimized for processing multiple pairs
 */
export function batchCosineSimilarity(
  vectors: SharpVector[],
  pairs: Array<[number, number]>
): Array<{ i: number; j: number; similarity: number }> {
  const results: Array<{ i: number; j: number; similarity: number }> = [];

  for (const [i, j] of pairs) {
    if (i >= vectors.length || j >= vectors.length) {
      continue; // Skip invalid indices
    }

    const similarity = cosineSimilarity(vectors[i], vectors[j]);
    results.push({ i, j, similarity });
  }

  return results;
}

/**
 * Find most similar vectors to a target vector
 */
export function findMostSimilar(
  target: SharpVector,
  candidates: SharpVector[],
  topK: number = 10
): Array<{ index: number; similarity: number }> {
  const similarities: Array<{ index: number; similarity: number }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const similarity = cosineSimilarity(target, candidates[i]);
    similarities.push({ index: i, similarity });
  }

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return similarities.slice(0, topK);
}

