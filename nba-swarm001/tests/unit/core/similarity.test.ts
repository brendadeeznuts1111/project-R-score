/**
 * Unit tests for cosine similarity
 */

import { describe, test, expect } from "bun:test";
import { cosineSimilarity, cosineSimilarityWithDriftCheck } from "../../../src/core/similarity.js";
import { createZeroVector, arrayToVector } from "../../../src/core/vector.js";

describe("Cosine Similarity", () => {
  test("identical vectors should have similarity of 1", () => {
    const vec1 = arrayToVector([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const vec2 = arrayToVector([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBeCloseTo(1.0, 10);
  });

  test("orthogonal vectors should have similarity of 0", () => {
    const vec1 = arrayToVector([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const vec2 = arrayToVector([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBeCloseTo(0.0, 10);
  });

  test("opposite vectors should have similarity of -1", () => {
    const vec1 = arrayToVector([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const vec2 = arrayToVector([-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14]);
    
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBeCloseTo(-1.0, 10);
  });

  test("zero vectors should return 0", () => {
    const vec1 = createZeroVector();
    const vec2 = createZeroVector();
    
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBe(0);
  });

  test("similarity should be clamped to [-1, 1]", () => {
    const vec1 = arrayToVector([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6]);
    const vec2 = arrayToVector([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5]);
    
    const sim = cosineSimilarity(vec1, vec2);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  test("drift detection should detect significant changes", () => {
    const vec1 = arrayToVector([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const vec2 = arrayToVector([0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6]);
    
    // Calculate actual similarity first
    const actualSimilarity = cosineSimilarity(vec1, vec2);
    // Use a stored value that's very different
    const stored = 0.0; // Completely different
    
    const result = cosineSimilarityWithDriftCheck(vec1, vec2, stored);
    
    // Vectors are similar but stored value is very different, so drift should be detected
    expect(result.drifted).toBe(true);
    expect(result.driftAmount).toBeGreaterThan(0.9); // Large drift expected
  });
});

