/**
 * Input validation and sanitization utilities
 */

import {
  ValidationError,
  VectorDimensionError,
} from "../types/errors.js";
import { SHARP_VECTOR_DIMENSIONS, MAX_VECTOR_VALUE, MIN_VECTOR_VALUE, MIN_VOLUME } from "../constants.js";
import type { Game, SharpVector } from "../types/game.js";

/**
 * Validate and sanitize a SharpVector
 */
export function validateVector(vector: readonly number[]): SharpVector {
  if (!Array.isArray(vector)) {
    throw new ValidationError("Vector must be an array");
  }

  if (vector.length !== SHARP_VECTOR_DIMENSIONS) {
    throw new VectorDimensionError(
      `Vector must have exactly ${SHARP_VECTOR_DIMENSIONS} dimensions`,
      SHARP_VECTOR_DIMENSIONS,
      vector.length
    );
  }

  // Validate and sanitize each dimension
  const sanitized: number[] = [];
  for (let i = 0; i < vector.length; i++) {
    const value = vector[i];

    if (typeof value !== "number") {
      throw new ValidationError(`Vector dimension ${i} must be a number`);
    }

    if (isNaN(value) || !isFinite(value)) {
      throw new ValidationError(`Vector dimension ${i} must be a finite number`);
    }

    // Clamp values to reasonable range
    const clamped = Math.max(MIN_VECTOR_VALUE, Math.min(MAX_VECTOR_VALUE, value));
    sanitized.push(clamped);
  }

  return sanitized as SharpVector;
}

/**
 * Validate a Game object
 */
export function validateGame(game: unknown): Game {
  if (!game || typeof game !== "object") {
    throw new ValidationError("Game must be an object");
  }

  const g = game as Record<string, unknown>;

  // Required fields
  if (typeof g.id !== "string" || !g.id) {
    throw new ValidationError("Game must have a valid id string");
  }

  if (typeof g.homeTeam !== "string" || !g.homeTeam) {
    throw new ValidationError("Game must have a valid homeTeam string");
  }

  if (typeof g.awayTeam !== "string" || !g.awayTeam) {
    throw new ValidationError("Game must have a valid awayTeam string");
  }

  if (typeof g.timestamp !== "number" || !isFinite(g.timestamp)) {
    throw new ValidationError("Game must have a valid timestamp number");
  }

  if (typeof g.volume !== "number" || !isFinite(g.volume) || g.volume < MIN_VOLUME) {
    throw new ValidationError(`Game volume must be a finite number >= ${MIN_VOLUME}`);
  }

  if (!Array.isArray(g.vector)) {
    throw new ValidationError("Game must have a vector array");
  }

  const vector = validateVector(g.vector);

  return {
    id: g.id,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    timestamp: g.timestamp,
    volume: g.volume,
    vector,
    metadata: g.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Validate an array of games
 */
export function validateGames(games: unknown[]): Game[] {
  if (!Array.isArray(games)) {
    throw new ValidationError("Games must be an array");
  }

  const validated: Game[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < games.length; i++) {
    try {
      const game = validateGame(games[i]);

      if (seenIds.has(game.id)) {
        throw new ValidationError(`Duplicate game ID: ${game.id}`);
      }

      seenIds.add(game.id);
      validated.push(game);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof VectorDimensionError) {
        throw new ValidationError(`Invalid game at index ${i}: ${error.message}`);
      }
      throw error;
    }
  }

  return validated;
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (typeof value !== "number" || !isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a finite number`);
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}, got ${value}`
    );
  }

  return value;
}

/**
 * Validate similarity threshold
 */
export function validateSimilarityThreshold(threshold: number): number {
  return validateRange(threshold, 0, 1, "Similarity threshold");
}

/**
 * Validate weight threshold
 */
export function validateWeightThreshold(threshold: number): number {
  return validateRange(threshold, 0, Number.MAX_SAFE_INTEGER, "Weight threshold");
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.slice(0, maxLength).trim();
}

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value);
}

