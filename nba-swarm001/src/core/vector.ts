/**
 * SharpVector operations and validation
 */

import { SHARP_VECTOR_DIMENSIONS } from "../constants.js";
import { validateVector } from "../utils/validation.js";
import type { SharpVector } from "../types/game.js";

/**
 * Create a zero vector (all dimensions set to 0)
 */
export function createZeroVector(): SharpVector {
  return new Array(SHARP_VECTOR_DIMENSIONS).fill(0) as SharpVector;
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: SharpVector): SharpVector {
  const magnitude = vectorMagnitude(vector);

  if (magnitude === 0) {
    return createZeroVector();
  }

  const normalized = vector.map((v) => v / magnitude) as SharpVector;
  return normalized;
}

/**
 * Calculate vector magnitude (L2 norm)
 */
export function vectorMagnitude(vector: SharpVector): number {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector[i] * vector[i];
  }
  return Math.sqrt(sumSquares);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(vec1: SharpVector, vec2: SharpVector): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }

  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    sum += vec1[i] * vec2[i];
  }
  return sum;
}

/**
 * Add two vectors
 */
export function addVectors(vec1: SharpVector, vec2: SharpVector): SharpVector {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }

  const result = new Array(SHARP_VECTOR_DIMENSIONS) as number[];
  for (let i = 0; i < vec1.length; i++) {
    result[i] = vec1[i] + vec2[i];
  }
  return result as SharpVector;
}

/**
 * Multiply vector by scalar
 */
export function scaleVector(vector: SharpVector, scalar: number): SharpVector {
  const result = new Array(SHARP_VECTOR_DIMENSIONS) as number[];
  for (let i = 0; i < vector.length; i++) {
    result[i] = vector[i] * scalar;
  }
  return result as SharpVector;
}

/**
 * Validate and sanitize vector from unknown input
 */
export function sanitizeVector(input: unknown): SharpVector {
  return validateVector(input as readonly number[]);
}

/**
 * Check if vector is zero vector
 */
export function isZeroVector(vector: SharpVector): boolean {
  return vector.every((v) => v === 0);
}

/**
 * Check if vector contains invalid values (NaN, Infinity)
 */
export function isValidVector(vector: SharpVector): boolean {
  return vector.every((v) => typeof v === "number" && isFinite(v));
}

/**
 * Convert vector to array (for serialization)
 */
export function vectorToArray(vector: SharpVector): number[] {
  return [...vector];
}

/**
 * Create vector from array (for deserialization)
 */
export function arrayToVector(array: number[]): SharpVector {
  return validateVector(array);
}

